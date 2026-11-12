"""python3 tools/book_pdf.py <id> <lang>
Kitob JSON faylidan (data/<lang>/subjects/<id>.json) asl PDF dizayniga o'xshash PDF yasaydi.
Kitobga kirmagan qismlar (muqova, annotatsiya, so'zboshi, adabiyotlar, yorliqlar) va chiqish yo'li:
tools/i18n/books/<id>/pdf_<lang>.json.

Tartib: muqova -> annotatsiya -> mundarija -> so'zboshi -> mavzular (maqsad, nazariy qism, amaliy
ko'nikmalar, nazorat savollari, testlar, vaziyatli masalalar, tezkor takrorlash, atamalar lug'ati)
-> test javoblari -> adabiyotlar.
Ikki bosqich: 1) PDF yasaladi va sarlavhalar qaysi sahifaga tushgani pdftotext bilan topiladi;
2) mundarija sahifa raqamlari bilan qayta yasaladi. Sahifa ustidagi yozuv va raqamlar reportlab
bilan qo'shiladi (muqova, annotatsiya va mundarija sahifalarida yo'q - asl kitobdagidek).
Kerak: playwright + Chrome (/usr/bin/google-chrome), pypdf, reportlab, pdftotext (poppler)."""
import html, io, json, os, re, subprocess, sys, tempfile, unicodedata

from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sid, lang = sys.argv[1], sys.argv[2]
CFG = json.load(open(f"{ROOT}/tools/i18n/books/{sid}/pdf_{lang}.json", encoding="utf8"))
src = f"{ROOT}/data/subjects/{sid}.json" if lang == "uz" else f"{ROOT}/data/{lang}/subjects/{sid}.json"
BOOK = json.load(open(src, encoding="utf8"))
L = CFG["labels"]
MM = 72 / 25.4
MARGIN = {"top": 20, "right": 18, "bottom": 18, "left": 20}   # mm

esc = lambda s: html.escape(str(s), quote=True)


def inline(s):
    s = esc(s)
    s = re.sub(r"\*\*\*(.+?)\*\*\*", r"<b><i>\1</i></b>", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![*\w])\*([^*\s](?:[^*]*?[^*\s])?)\*(?![*\w])", r"<i>\1</i>", s)   # *kursiv* (lotincha nomlar)
    s = re.sub(r"~([^~\s][^~]*?)~", r"<sub>\1</sub>", s)
    s = re.sub(r"\^([^\^\s][^\^]*?)\^", r"<sup>\1</sup>", s)
    return s


def split_label(t, word):
    """'Table 1.6. Types of ...' -> ('Table 1.6.', 'Types of ...')"""
    m = re.match(rf"({word} [\dA-Za-z]+\.\d+\.?)\s*(.*)$", t or "")
    return (m.group(1), m.group(2)) if m else ("", t or "")


TABLE_WORD = "Table" if lang == "en" else "Jadval"


IMG_CACHE = os.path.join(tempfile.gettempdir(), f"book_pdf_img_{sid}")


def jpg(src_rel, maxpx=1400):
    """webp/png rasmni JPEG ga o'giradi: Chrome webp ni siqilmagan holda joylaydi (PDF 10 barobar katta bo'ladi)."""
    from PIL import Image
    os.makedirs(IMG_CACHE, exist_ok=True)
    dst = os.path.join(IMG_CACHE, re.sub(r"[^\w.-]", "_", src_rel) + ".jpg")
    if not os.path.exists(dst):
        im = Image.open(os.path.join(ROOT, src_rel))
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = Image.new("RGB", im.size, "white")
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")
        im.thumbnail((maxpx, maxpx))
        im.save(dst, "JPEG", quality=84, optimize=True, progressive=False)
    return dst


def figure(b, single, cls=None):
    cap = f"<b>{esc(b.get('label', ''))}.</b> <i>{inline(b.get('caption', ''))}</i>" if b.get("label") else f"<i>{inline(b.get('caption', ''))}</i>"
    return (f'<figure class="{cls or ("one" if single else "two")}"><img src="file://{esc(jpg(b["src"]))}" alt="">'
            f"<figcaption>{cap}</figcaption></figure>")


def table(head, rows, title=""):
    lab, rest = split_label(title, TABLE_WORD)
    cap = f'<div class="tcap"><b>{inline(lab)}</b> <i>{inline(rest)}</i></div>' if title else ""
    th = "".join(f"<th>{inline(h)}</th>" for h in head)
    tr = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
    return f'{cap}<table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


RX_SIGNED = re.compile(r"(?:^|\s)(?:M\.)?D\.S\.|(?:^|\s)S\.\s")
RX_SPLIT = re.compile(r"\s+(?=#|Rp\.:|M\.f\.|M\.D\.S\.|D\.t\.d\.|D\.S\.|S\.\s)")
RX_ING = re.compile(r"(?<=\d)\s+(?=[A-Z][a-z]{2,})")


def rx_box(parts):
    """Retsept (asl kitobdagidek kulrang blok): sarlavha, "Rp.: ..." va har bir ko'rsatma alohida qatorda."""
    full = " ".join(parts)
    m = re.match(r"\*\*(.+?)\*\*\s*(.*)$", full)
    title, rest = (m.group(1), m.group(2)) if m else ("", full)
    lines = []
    for seg in RX_SPLIT.split(rest):
        if re.match(r"(?:#|Rp\.:|M\.f\.|M\.D\.S\.|D\.t\.d\.|D\.S\.|S\.\s)", seg) is None or seg.startswith(("Rp.:", "# Rp.:")):
            subs = RX_ING.split(seg)
        else:
            subs = [seg]
        for k, x in enumerate(subs):
            cls = "rl0" if x.startswith(("Rp.:", "#")) else "rl1"
            lines.append(f'<div class="{cls}">{inline(x)}</div>')
    return f'<div class="rx"><div class="rxt">{inline(title)}</div>{"".join(lines)}</div>'


def blocks(bl):
    out, i = [], 0
    while i < len(bl):
        b = bl[i]
        t = b["type"]
        if t == "img":
            j = i
            while j < len(bl) and bl[j]["type"] == "img":
                j += 1
            imgs = bl[i:j]
            # pdf_<lang>.json "fig_per_row" (standart 2): 3+ ta kichik rasm bir qatorda ko'pi bilan shuncha
            per = CFG.get("fig_per_row", 2)
            if per > 2 and len(imgs) >= 3 and all(x.get("w", 1) <= 1.7 * x.get("h", 1) for x in imgs):
                rows = -(-len(imgs) // per)
                size = -(-len(imgs) // rows)
                for k in range(0, len(imgs), size):
                    row = imgs[k:k + size]
                    out.append('<div class="figrow">' + "".join(figure(x, False, f"k{size}") for x in row) + "</div>")
                i = j
                continue
            for k in range(0, len(imgs), 2):
                row = imgs[k:k + 2]
                out.append('<div class="figrow">' + "".join(figure(x, len(row) == 1) for x in row) + "</div>")
            i = j
            continue
        if t == "p" and CFG.get("rx") and b["text"].startswith(tuple(CFG["rx"])):
            parts, j = [b["text"]], i + 1
            while (j < len(bl) and bl[j]["type"] == "p" and not bl[j]["text"].startswith("**") and len(parts) < 5
                   and (not RX_SIGNED.search(" ".join(parts)) or "# Rp.:" in parts[-1])):
                parts.append(bl[j]["text"])
                j += 1
            out.append(rx_box(parts))
            i = j
            continue
        if t == "p":
            out.append(f"<p>{inline(b['text'])}</p>")
        elif t == "h":
            out.append(f"<h3>{inline(b['text'])}</h3>")
        elif t == "sub":
            out.append(f'<h4>{inline(b["text"])}</h4>')
        elif t == "list":
            tag = "ol" if b.get("ordered") else "ul"
            st = f' start="{int(b.get("start", 1))}"' if b.get("ordered") and b.get("start", 1) != 1 else ""
            out.append(f"<{tag}{st}>" + "".join(f"<li>{inline(x)}</li>" for x in b["items"]) + f"</{tag}>")
        elif t == "table":
            out.append(table(b.get("head", []), b.get("rows", []), b.get("title", "")))
        elif t == "box":
            out.append(f'<div class="box box-{esc(b["kind"])}"><div class="blab">{esc(CFG["box"].get(b["kind"], ""))}</div>{blocks(b["parts"])}</div>')
        i += 1
    return "".join(out)


def build(pages=None):
    """pages: {kalit: sahifa} - mundarija uchun (1-bosqichda yo'q)."""
    toc, body = [], []
    num = lambda k: str(pages.get(k, "")) if pages else "000"

    def h(level, text, key, cls=""):
        toc.append((level, text, key))
        tag = "div" if level == 0 else f"h{level}"
        return f'<{tag} class="{cls}">{inline(text)}</{tag}>'

    # So'zboshi
    body.append('<section class="page">' + h(2, CFG["preface_title"], "preface", "ch") + blocks(CFG["preface"]) + "</section>")
    parts = {x["before"]: x for x in CFG.get("parts", [])}   # qism sahifalari (frm: I qism, II qism)
    for n, tp in enumerate(BOOK["topics"], 1):
        if n in parts:
            pt = parts[n]
            body.append('<section class="page partp"><div class="pban">' + h(0, pt["title"], f"p{n}", "pt") +
                        (f'<div class="ps">{inline(pt["sub"])}</div>' if pt.get("sub") else "") + "</div></section>")
        s = ['<section class="page topic">', f'<div class="tno">{esc(L["topic"].format(n=n))}</div>',
             h(1, tp["title"], f"t{n}")]
        NUMD = CFG.get("numbered", False)   # mkb: bo'limlar asl kitobdagidek "1. Mashg'ulot maqsadi", "2. ..." deb raqamlanadi, lug'at yo'q
        cnt = 1
        if NUMD:
            gl = tp.get("goals", [])
            gh = "".join(f"<li>{inline(g['text'])}</li>" for g in gl) if gl and all(g["type"] == "p" for g in gl) else None
            intro = f'<p>{inline(L["goals_intro"])}</p>' if L.get("goals_intro") else ""
            s.append(h(2, f'1. {L["goals"]}', f"t{n}g") + (intro + f"<ul>{gh}</ul>" if gh else blocks(gl)))
        else:
            s.append(f'<h2>{esc(L["goals"])}</h2>' + blocks(tp.get("goals", [])))
        secs = tp.get("sections", [])
        gloss = None if NUMD else (secs[-1] if secs and not re.match(r"\d+\.(\d+\.)?\s", secs[-1]["title"]) else None)
        flat = bool(secs) and all(re.match(r"\d+\.\s", x["title"]) for x in secs)   # pfz: "1. ...", "2. ..."
        for k, sec in enumerate(secs if gloss is None else secs[:-1]):
            if NUMD:
                cnt += 1
                s.append(h(2, f'{cnt}. {sec["title"]}', f"t{n}s{k}") + blocks(sec["blocks"]))
            else:
                s.append(h(2, sec["title"], f"t{n}s{k}") + blocks(sec["blocks"]))
        if tp.get("skills") and NUMD:
            for j, sk in enumerate(tp["skills"]):
                if n in CFG.get("skills_inline", []):   # asl kitobda alohida raqamli bo'lim emas, bo'lim ichidagi kichik sarlavha
                    s.append(f'<h3>{inline(sk["title"])}</h3>' + blocks(sk["blocks"]))
                    continue
                cnt += 1
                s.append(h(2, f'{cnt}. {sk["title"]}', f"t{n}sk{j}") + blocks(sk["blocks"]))
        elif tp.get("skills"):
            if flat and CFG.get("skills_numbered", True):   # asl kitobdagidek raqamli bo'lim va mundarijada: "11. Amaliy ko'nikmalar"
                s.append(h(2, f'{len(secs) + 1}. {L["skills"]}', f"t{n}sk"))
            else:
                s.append(f'<h2>{esc(L["skills"])}</h2>')
            for sk in tp["skills"]:
                s.append(f'<h3>{inline(sk["title"])}</h3>' + blocks(sk["blocks"]))
        if tp.get("questions"):
            cnt += 1
            qh = h(2, f'{cnt}. {L["questions"]}', f"t{n}q") if NUMD else f'<h2>{esc(L["questions"])}</h2>'
            s.append(qh + '<ol class="qs">' + "".join(f"<li>{inline(q)}</li>" for q in tp["questions"]) + "</ol>")
        if tp.get("quiz"):
            s.append(f'<h2>{esc(L["quiz"])}</h2><ol class="quiz">')
            for q in tp["quiz"]:
                opts = "".join(f"<div>{'ABCDEFG'[i]}) {inline(o)}</div>" for i, o in enumerate(q["options"]))
                s.append(f'<li><div class="qq">{inline(q["q"])}</div><div class="opts">{opts}</div></li>')
            s.append("</ol>")
        if tp.get("cases"):
            s.append(f'<h2>{esc(L["cases"])}</h2>')
            for c in tp["cases"]:
                s.append(f'<div class="case"><h3>{inline(c["title"])}</h3><p>{inline(c["text"])}</p>'
                         f'<p><b>{esc(L["ask"])}</b> {inline(c["ask"])}</p><p><b>{esc(L["answer"])}</b> {inline(c["answer"])}</p></div>')
        if tp.get("cards") and tp.get("cards_head"):
            # ko'p ustunli tezkor takrorlash jadvali (asl kitobdagidek)
            s.append(f'<h2>{esc(L["review"])}</h2>' + table(tp["cards_head"], [[c["front"]] + c["cells"] for c in tp["cards"]],
                                                         tp.get("cards_title", "")))
        elif tp.get("cards"):
            ntab = sum(1 for x in secs for b in x["blocks"] if b["type"] == "table" and b.get("title")) + \
                sum(1 for x in tp.get("skills", []) for b in x["blocks"] if b["type"] == "table" and b.get("title"))
            title = L["review_table"].format(n=n, m=ntab + 1) + " " + L["review_caption"].format(n=n)
            s.append(f'<h2>{esc(L["review"])}</h2>' + table([L["q"], L["a"]], [[c["front"], c["back"]] for c in tp["cards"]], title))
        if gloss:
            s.append(f'<h2>{inline(gloss["title"])}</h2>' + blocks(gloss["blocks"]))
        s.append("</section>")
        body.append("".join(s))
    # Test javoblari
    rows = []
    for n, tp in enumerate(BOOK["topics"], 1):
        ans = "; ".join(f"{i}-{'ABCDEFG'[q['answer']]}" for i, q in enumerate(tp.get("quiz", []), 1))
        rows.append(f'<p class="ans"><b>{esc(L["answers_row"].format(n=n))}</b> {ans}.</p>')
    body.append('<section class="page">' + h(2, L["answers"], "answers", "ch") + "".join(rows) + "</section>")
    # refs: satr yoki {"h": "guruh nomi"}; raqamlash guruhlar orasida davom etadi
    groups, k = [], 0
    for r in CFG["refs"]:
        if isinstance(r, dict):
            groups.append([r["h"], []])
        else:
            if not groups:
                groups.append([None, []])
            groups[-1][1].append(r)
    refs_html = ""
    for title, items in groups:
        if title:
            refs_html += f'<p class="refh"><b>{esc(title)}</b></p>'
        refs_html += f'<ol class="refs" start="{k + 1}">' + "".join(f"<li>{inline(r)}</li>" for r in items) + "</ol>"
        k += len(items)
    if CFG.get("refs_note"):   # ro'yxatdan keyingi izoh (mkb: "Rasmlar manbalari. ...")
        refs_html += f'<p class="refn">{inline(CFG["refs_note"])}</p>'
    body.append('<section class="page">' + h(2, L["refs"], "refs", "ch") + refs_html + "</section>")

    c = CFG["cover"]
    cover = (f'<section class="cover"><div class="ctop">{"".join(f"<div>{esc(x)}</div>" for x in c["top"])}</div>'
             f'<div class="cban"><div class="ct">{esc(c["title"])}</div>{f'<div class="cp">{esc(c["part"])}</div>' if c.get("part") else ""}'
             f'<div class="cs">{esc(c["sub"])}</div></div><div class="ck">{esc(c["kind"])}</div>'
             f'<img class="cimg" src="file://{ROOT}/{esc(c["image"])}" alt="">'
             f'<div class="cby">{esc(c["by_label"])} <b>{esc(c["by"])}</b><div><i>{esc(c["affil"])}</i></div></div>'
             f'<div class="ccity">{esc(c["city"])}</div></section>')
    imprint = '<section class="imprint">' + "".join(f"<p>{inline(p)}</p>" if p else '<div class="gap"></div>' for p in CFG["imprint"]) + "</section>"
    tl = []
    for level, text, key in toc:
        if level == 0:
            tl.append(f'<div class="te tpart"><span class="tt">{inline(text)}</span><span class="dots"></span><span class="tn">{num(key)}</span></div>')
        elif level == 1 or key in ("preface", "answers", "refs"):
            tl.append(f'<div class="te"><span class="tt">{inline(text)}</span><span class="dots"></span><span class="tn">{num(key)}</span></div>')
        else:
            cls = "te te2" if CFG.get("toc_indent") else "te"
            tl.append(f'<div class="{cls}"><span class="tt">{inline(text)}</span><span class="dots"></span><span class="tn">{num(key)}</span></div>')
    tocs = f'<section class="toc"><h2 class="toch">{esc(CFG["toc_title"])}</h2>{"".join(tl)}</section>'
    return f"<!DOCTYPE html><html lang=\"{lang}\"><head><meta charset=\"utf-8\"><style>{CSS}</style></head><body>{cover}{imprint}{tocs}{''.join(body)}</body></html>", toc


CSS = f"""
.refn {{ margin-top: 8pt; }}
@page {{ size: A4; margin: {MARGIN['top']}mm {MARGIN['right']}mm {MARGIN['bottom']}mm {MARGIN['left']}mm; }}
html {{ font-family: 'Liberation Serif', 'Times New Roman', serif; font-size: 12pt; color: #000; }}
body {{ margin: 0; line-height: 1.28; text-align: justify; hyphens: manual; }}
p {{ margin: 0 0 5pt; }}
b {{ font-weight: bold; }}
sub, sup {{ font-size: 70%; line-height: 0; }}
.page, .toc, .imprint {{ break-before: page; }}
h1 {{ font-size: 17pt; color: #1f3864; margin: 2pt 0 12pt; padding-bottom: 5pt; border-bottom: 1.5pt solid #1f3864; text-align: left; line-height: 1.2; }}
.tno {{ font-size: 11pt; font-weight: bold; color: #2e75b6; letter-spacing: .3pt; }}
h2 {{ font-size: 14pt; color: #2e75b6; margin: 14pt 0 6pt; text-align: left; break-after: avoid; }}
h2.ch {{ font-size: 16pt; color: #1f3864; margin-top: 0; padding-bottom: 5pt; border-bottom: 1.5pt solid #1f3864; }}
h3 {{ font-size: 13pt; font-style: italic; color: #1f3864; margin: 10pt 0 5pt; text-align: left; break-after: avoid; }}
h4 {{ font-size: 12pt; margin: 6pt 0 3pt; break-after: avoid; }}
ul, ol {{ margin: 0 0 6pt; padding-left: 22pt; }}
li {{ margin: 0 0 2.5pt; }}
.box {{ break-inside: avoid; margin: 6pt 0 9pt; padding: 4pt 8pt 3pt; border-left: 4pt solid; border-top: .6pt solid; border-right: .6pt solid; border-bottom: .6pt solid; font-size: 11pt; }}
.box p, .box li {{ margin-bottom: 2.5pt; }}
.blab {{ font-weight: bold; font-size: 10.5pt; letter-spacing: .2pt; margin-bottom: 1pt; }}
.box-eslab {{ background: #fff2cc; border-color: #bf9000; }} .box-eslab .blab {{ color: #b07f00; }}
.box-klinik {{ background: #deebf7; border-color: #2e75b6; }} .box-klinik .blab {{ color: #2e75b6; }}
.box-yodlash {{ background: #e2efda; border-color: #548235; }} .box-yodlash .blab {{ color: #548235; }}
.box-diqqat {{ background: #fbe5d6; border-color: #c55a11; }} .box-diqqat .blab {{ color: #c55a11; }}
.tcap {{ text-align: right; font-size: 11pt; margin: 8pt 0 3pt; break-after: avoid; }}
table {{ width: 100%; border-collapse: collapse; font-size: 10.5pt; margin: 0 0 9pt; text-align: left; line-height: 1.2; }}
th {{ background: #d9e2f3; font-weight: bold; text-align: center; }}
th, td {{ border: .6pt solid #8eaadb; padding: 3pt 5pt; vertical-align: middle; }}
tbody tr:nth-child(even) td {{ background: #f5f8fc; }}
tr {{ break-inside: avoid; }}
.figrow {{ display: flex; justify-content: center; gap: 7mm; margin: 8pt 0 10pt; break-inside: avoid; }}
figure {{ margin: 0; text-align: center; }}
figure.two {{ flex: 0 1 48%; }}
figure.one {{ flex: 0 1 78%; }}
figure img {{ display: block; margin: 0 auto 3pt; max-width: 100%; max-height: 82mm; object-fit: contain; }}
figure.one img {{ max-height: 98mm; }}
figure.k3 {{ flex: 0 1 31%; }}
figure.k4 {{ flex: 0 1 23%; }}
.figrow:has(figure.k3), .figrow:has(figure.k4) {{ gap: 4mm; }}
figure.k3 img {{ max-height: 62mm; }}
figure.k4 img {{ max-height: 50mm; }}
figure.k3 figcaption, figure.k4 figcaption {{ font-size: 9pt; }}
figcaption {{ font-size: 9.5pt; line-height: 1.2; text-align: center; }}
.quiz > li {{ break-inside: avoid; margin-bottom: 6pt; }}
.qq {{ font-weight: normal; }}
.opts {{ padding-left: 16pt; }}
.case {{ break-inside: auto; }}
.ans {{ margin-bottom: 7pt; text-align: left; }}
.refs li {{ margin-bottom: 4pt; }}
/* muqova */
.cover {{ height: 257mm; position: relative; text-align: center; }}
.ctop {{ font-size: 11pt; font-weight: bold; color: #333; line-height: 1.35; }}
.ctop div:last-child {{ font-size: 10pt; color: #555; }}
.cban {{ margin: 18mm 0 4mm; }}
.ct {{ background: #1f3864; color: #fff; font-size: 26pt; font-weight: bold; padding: 6pt 0 0; }}
.cp {{ background: #1f3864; color: #fff; font-size: 22pt; font-weight: bold; padding: 0 0 5pt; }}
.cs {{ background: #2e75b6; color: #fff; font-size: 17pt; font-style: italic; padding: 2pt 0 4pt; }}
.ck {{ color: #1f3864; font-weight: bold; font-size: 12pt; margin: 6mm 0 8mm; }}
.cimg {{ width: 100%; display: block; border: 1pt solid #1f3864; }}
.cby {{ text-align: right; margin-top: 22mm; font-size: 12pt; }}
.cby div {{ font-size: 11pt; margin-top: 2pt; }}
.ccity {{ position: absolute; bottom: 4mm; left: 0; right: 0; color: #1f3864; font-weight: bold; }}
.imprint {{ font-size: 11pt; }}
.imprint .gap {{ height: 10pt; }}
.toc {{ font-size: 11pt; }}
.rx {{ break-inside: avoid; background: #f2f2f2; border: .6pt solid #7f7f7f; padding: 3pt 8pt 4pt; margin: 6pt 0 8pt; font-size: 11.5pt; text-align: left; line-height: 1.25; }}
.rxt {{ font-weight: bold; font-size: 10.5pt; margin-bottom: 1pt; }}
.rl1 {{ padding-left: 9mm; }}
.te2 {{ padding-left: 6mm; }}
.tpart {{ font-weight: bold; color: #1f3864; margin-top: 4pt; }}
.partp .pban {{ margin-top: 70mm; text-align: center; }}
div.pt {{ display: block; background: #1f3864; color: #fff; font-size: 20pt; font-weight: bold; padding: 4pt 6pt 3pt; margin: 0; border: 0; line-height: 1.2; }}
.ps {{ background: #2e75b6; color: #fff; font-size: 13pt; font-style: italic; padding: 3pt 8pt 5pt; line-height: 1.25; }}
.toch {{ text-align: center; color: #1f3864; font-size: 14pt; margin: 0 0 10pt; }}
.te {{ display: flex; align-items: baseline; margin: 0 0 2.5pt; text-align: left; }}
.tt {{ flex: 0 1 auto; }}
.dots {{ flex: 1 0 8mm; border-bottom: 1pt dotted #444; margin: 0 3pt; transform: translateY(-3pt); }}
.tn {{ flex: 0 0 auto; min-width: 7mm; text-align: right; }}
"""


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[\*~\^\-‐]", "", s)   # pdftotext satr oxiridagi defisni olib tashlaydi ("Anti-\ninflammatory")
    return re.sub(r"[\s­]+", "", s).lower()


def render(html_text, out):
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf8") as f:
        f.write(html_text)
        path = f.name
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = b.new_page()
        pg.goto("file://" + path, wait_until="load")
        pg.wait_for_timeout(500)
        pg.pdf(path=out, prefer_css_page_size=True, print_background=True)
        b.close()
    os.unlink(path)


def page_texts(pdf):
    t = subprocess.run(["pdftotext", "-enc", "UTF-8", pdf, "-"], capture_output=True, text=True, check=True).stdout
    return [norm(x) for x in t.split("\f")]


def locate(pdf, toc):
    pages = page_texts(pdf)
    # mundarijadan keyingi sahifadan qidiramiz: birinchi "preface" sarlavhasi
    start = next(i for i, x in enumerate(pages) if i > 2 and x.startswith(norm(CFG["preface_title"])))
    res, cur = {}, start
    for level, text, key in toc:
        needle = norm(text)[:60]
        for i in range(cur, len(pages)):
            if needle in pages[i]:
                res[key] = i + 1
                cur = i
                break
        else:
            sys.exit(f"Sarlavha topilmadi: {text} (oxirgi: {list(res.items())[-4:]}, toc: {[t for _, t, _ in toc][max(0, len(res) - 4):len(res)]})")
    return res, start + 1


def stamp(pdf, out, first_numbered):
    pdfmetrics.registerFont(TTFont("LS", "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"))
    pdfmetrics.registerFont(TTFont("LSI", "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"))
    r = PdfReader(pdf)
    W, H = float(r.pages[0].mediabox.width), float(r.pages[0].mediabox.height)
    # bitta reportlab hujjati (barcha sahifalar) - shrift bir marta joylanadi
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(W, H))
    for i in range(1, len(r.pages) + 1):
        if i >= first_numbered:
            c.setFillColor(HexColor("#7f7f7f"))
            c.setFont("LSI", 9)
            c.drawRightString(W - MARGIN["right"] * MM, H - 12 * MM, CFG["running"])
            c.setStrokeColor(HexColor("#a6a6a6"))
            c.setLineWidth(.5)
            c.line(MARGIN["left"] * MM, H - 13.3 * MM, W - MARGIN["right"] * MM, H - 13.3 * MM)
            c.setFillColor(HexColor("#000000"))
            c.setFont("LS", 10)
            c.drawCentredString((MARGIN["left"] * MM + W - MARGIN["right"] * MM) / 2, 9 * MM, str(i))
        c.showPage()
    c.save()
    buf.seek(0)
    ov = PdfReader(buf)
    w = PdfWriter(clone_from=r)
    for i, page in enumerate(w.pages, 1):
        if i >= first_numbered:
            page.merge_page(ov.pages[i - 1])
            page.compress_content_streams()
    w.add_metadata({"/Title": CFG["pdf_title"], "/Author": CFG["author"], "/Creator": "ALVORA Med tools/book_pdf.py"})
    w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    with open(out, "wb") as f:
        w.write(f)


def main():
    out = f"{ROOT}/{CFG['out']}"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + ".tmp.pdf"
    h1, toc = build()
    render(h1, tmp)
    pages, first = locate(tmp, toc)
    h2, _ = build(pages)
    render(h2, tmp)
    pages2, first2 = locate(tmp, toc)
    if pages2 != pages or first2 != first:
        diff = {k: (pages[k], pages2.get(k)) for k in pages if pages[k] != pages2.get(k)}
        print("Ogohlantirish: 2-bosqichda sahifalar siljidi, 3-bosqich:", list(diff.items())[:5])
        h3, _ = build(pages2)
        render(h3, tmp)
        pages3, first3 = locate(tmp, toc)
        if pages3 != pages2:
            sys.exit("Mundarija sahifalari barqaror emas")
        pages, first = pages2, first2
    stamp(tmp, out, first)
    os.unlink(tmp)
    n = len(PdfReader(out).pages)
    print(f"{CFG['out']}: {n} sahifa, {os.path.getsize(out) / 1e6:.1f} MB; so'zboshi {first}-sahifada")


if __name__ == "__main__":
    main()
