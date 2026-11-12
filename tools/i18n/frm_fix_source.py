"""python3 tools/i18n/frm_fix_source.py
Farmakologiya (frm) kitobidagi manba xatolarini tuzatadi (asl PDF bilan solishtirib topilgan). Faqat
data/subjects/frm.json (uz) tuzatiladi va tarjimadan OLDIN ishga tushiriladi. Qayta ishga tushirilsa hech
narsa o'zgarmaydi.

Tuzatiladigan xatolar:
 1) "Tezkor takrorlash jadvali" (har mavzu oxirida 4-5 ustunli jadval) ilovada kartochkalarga noto'g'ri
    aylantirilgan edi: ustunlar bitta matnga qo'shilib ketgan, tor ustundagi so'zlar bo'lingan
    ("Midriatikla r", "To‘rtlamch i Mblokatorlar"), sahifa chegarasidagi qatorlar yo'qolgan yoki ikkiga
    bo'lingan ("Atipik" | "neyroleptiklar"), pastki indekslar tushib qolgan (D2, GAMK-A). Jadvallar asl
    PDF dan katakma-katak qayta olingan (tools/i18n/books/frm/quick.json; pdfplumber, pastki indekslar
    ~...~) va kartochkalar shu jadvaldan tiklanadi: front = 1-ustun, cells = qolgan ustunlar,
    mavzuda cards_head (ustun nomlari) va cards_title (jadval nomi);
 2) ro'yxat bandiga yopishgan kichik sarlavhalar ("**Talaba bajara olishi kerak:**") alohida blokka
    chiqariladi; sahifa chegarasida ikkiga bo'lingan ro'yxatlar va gaplar birlashtiriladi;
 3) jadvallar: sahifada qolib ketgan qatorlar (3.1, 4.6, 13.1) va jadval nomining oxiri (9.5) tiklanadi;
 4) jadval kataklarida tor ustun sababli bo'linib qolgan so'zlar (Soniyala r, Glyukok ortikoidl ar),
    yo'qolgan chiziqchalar (H1blokator -> H1-blokator, Izosorbid-5mononitrat);
 5) chiziqcha atrofidagi ortiqcha bo'shliqlar (Henderson– Hasselbalch, 0,25– 0,5%), ikkitalik
    bo'shliqlar, ** ichidagi chetki bo'shliqlar;
 6) ketma-ket rasmlar raqam bo'yicha saralanadi.
"""
import json, os, re

PATH = "data/subjects/frm.json"
d = json.load(open(PATH, encoding="utf8"))
log = []
HERE = os.path.dirname(__file__)

# kitobdagi so'zlar lug'ati (jadval va kartochkalardan tashqari matndan) — bo'lingan so'zlarni tanish uchun
VOC = set()


def _voc(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k not in ("rows", "head", "cards"):
                _voc(v)
    elif isinstance(o, list):
        for v in o:
            _voc(v)
    elif isinstance(o, str):
        for w in re.findall(r"[A-Za-z‘’ʼ'-]+", o):
            VOC.add(w.lower().strip("-"))


for _t in d["topics"]:
    for _k in ("sections", "skills", "goals", "quiz", "cases", "questions"):
        _voc(_t.get(_k))


def remerge(s):
    """"Soniyala r" -> "Soniyalar", "Glyukok ortikoidl ar" -> "Glyukokortikoidlar" (lug'atda bor so'z bo'lsa)."""
    toks = s.split(" ")
    out, i = [], 0
    strip = lambda x: re.sub(r"^[(“\"]+|[),.;:”\"]+$", "", x).lower()
    while i < len(toks):
        done = False
        for n in (3, 2):
            if i + n <= len(toks) and toks[i + 1][:1].islower():
                cand = "".join(toks[i:i + n])
                if strip(cand) in VOC and not all(strip(x) in VOC for x in toks[i:i + n]):
                    out.append(cand); i += n; done = True
                    break
        if not done and i + 1 < len(toks) and re.fullmatch(r"(r|tam)[),.;]?", toks[i + 1]) and toks[i][-1:].isalpha():
            out.append(toks[i] + toks[i + 1]); i += 2; done = True
        if not done:
            out.append(toks[i]); i += 1
    return " ".join(out)


# ---------- 1) tezkor takrorlash jadvali -> kartochkalar ----------
def quick():
    q = json.load(open(os.path.join(HERE, "books", "frm", "quick.json"), encoding="utf8"))
    n = 0
    for t, tab in zip(d["topics"], q):
        if t.get("cards_head"):
            continue
        t["cards_title"] = tab["title"]
        t["cards_head"] = tab["head"]
        t["cards"] = [{"front": r[0], "cells": r[1:]} for r in tab["rows"]]
        n += 1
    return n


# ---------- 2) bo'lingan ro'yxatlar va gaplar ----------
def join_lists(bl, n):
    i = 0
    while i < len(bl):
        a = bl[i]
        if a["type"] == "box":
            n = join_lists(a["parts"], n)
        if i + 1 < len(bl) and a["type"] == "list" and bl[i + 1]["type"] == "list":
            b = bl[i + 1]
            same = a.get("ordered") == b.get("ordered")
            cont = not a.get("ordered") or b.get("start", 1) == a.get("start", 1) + len(a["items"])
            if same and cont:
                a["items"] += b["items"]
                del bl[i + 1]
                n += 1
                continue
        i += 1
    return n


def join_sentences(bl, n):
    """p + p: birinchisi gap belgisi bilan tugamagan, ikkinchisi kichik harf bilan boshlangan -> bitta p."""
    i = 0
    while i < len(bl):
        a = bl[i]
        if a["type"] == "box":
            n = join_sentences(a["parts"], n)
        if (i + 1 < len(bl) and a["type"] == "p" and bl[i + 1]["type"] == "p"
                and a["text"].rstrip().endswith("-**") and re.match(r"\*\*[a-z]", bl[i + 1]["text"])):
            # "... **Affektiv-**" | "**respirator xurujlar** — ..." — chiziqcha bilan bo'lingan so'z
            a["text"] = a["text"].rstrip()[:-2] + bl[i + 1]["text"][2:]
            del bl[i + 1]
            n += 1
            continue
        if (i + 1 < len(bl) and a["type"] == "p" and bl[i + 1]["type"] == "p"
                and a["text"].rstrip().endswith("**") and bl[i + 1]["text"].startswith("**va ")):
            # "... → **o‘ng qorincha gipertrofiyasi**" | "**va dilatatsiyasi** → ..." — bitta qalin ibora
            a["text"] = a["text"].rstrip()[:-2] + " " + bl[i + 1]["text"][2:]
            del bl[i + 1]
            n += 1
            continue
        if (i + 1 < len(bl) and a["type"] == "p" and bl[i + 1]["type"] == "p"
                and a["text"].rstrip().endswith(";") and re.match(r"[a-z‘]{3,}", bl[i + 1]["text"])):
            # "... ko‘p — sanab bo‘lmaydi);" | "shakli (aylana, oval ...)" — sanoq sahifa chegarasida uzilgan
            a["text"] = a["text"].rstrip() + " " + bl[i + 1]["text"].lstrip()
            del bl[i + 1]
            n += 1
            continue
        if (i + 1 < len(bl) and a["type"] == "p" and bl[i + 1]["type"] == "p"
                and re.search(r"\s(va|yoki|hamda)\s*$", a["text"])):
            # "... ikkinchi kesishuvi; IgG va" | "IgM kattalar darajasiga ..." — bog'lovchida uzilgan gap
            a["text"] = a["text"].rstrip() + " " + bl[i + 1]["text"].lstrip()
            del bl[i + 1]
            n += 1
            continue
        if (i + 1 < len(bl) and a["type"] == "p" and bl[i + 1]["type"] == "p"
                and (not re.search(r"[.:;!?)»”\"*]\s*$", a["text"]) and re.match(r"[a-z‘’(]", bl[i + 1]["text"])
                     # "... **bo‘g‘im og‘riqlari**" | "(revmatizm), ..."
                     or re.search(r"[^.:;!?]\*\*\s*$", a["text"]) and re.match(r"\([a-z]", bl[i + 1]["text"])
                     # "... (ko‘pincha uglevodli)" | "ovqatlanish. Bolalar ..."
                     or re.search(r"\)\s*$", a["text"]) and re.match(r"[a-z‘’]", bl[i + 1]["text"]))):
            a["text"] = a["text"].rstrip() + " " + bl[i + 1]["text"].lstrip()
            del bl[i + 1]
            n += 1
            continue
        i += 1
    return n



def glued_sub(bl, n):
    """Ro'yxatning oxirgi bandiga yopishgan kichik sarlavha ("... kamchiliklarini. **Talaba bajara olishi kerak:**",
    "... kamaytiradi. **Qo‘llanishi:**") alohida "sub" blokka chiqariladi."""
    i = 0
    while i < len(bl):
        b = bl[i]
        if b["type"] == "box":
            n = glued_sub(b["parts"], n)
        if b["type"] == "list":
            m = re.fullmatch(r"(.*\S)\s+\*\*([^*]{2,50}:)\*\*", b["items"][-1])
            if m:
                b["items"][-1] = m.group(1)
                bl.insert(i + 1, {"type": "sub", "text": m.group(2)})
                n += 1
        i += 1
    return n


def find_table(prefix):
    for t in d["topics"]:
        for s in t["sections"] + t["skills"]:
            for i, b in enumerate(s["blocks"]):
                if b["type"] == "table" and b.get("title", "").startswith(prefix):
                    return s["blocks"], i
    raise KeyError(prefix)


# ---------- 3) jadvallar ----------
def tables():
    n = 0
    # 3.1: sahifaning keyingi betidagi oxirgi qator (sarlavha takrori + qator) p bo'lib qolgan
    bl, i = find_table("Jadval 3.1.")
    if i + 2 < len(bl) and bl[i + 1].get("text") == "**Bo‘lim O‘rganadigan masalasi**":
        bl[i]["rows"].append(["Klinik farmakologiya", "Dorilarning bemor organizmidagi ta’siri, oqilona farmakoterapiya"])
        del bl[i + 1:i + 3]
        n += 1
    # 4.6: oxirgi katakning so'nggi so'zi ("falaji") keyingi betga tushib qolgan
    bl, i = find_table("Jadval 4.6.")
    if i + 2 < len(bl) and bl[i + 1].get("text") == "**Ta’sir Belgilar**" and bl[i + 2].get("text") == "falaji":
        bl[i]["rows"][-1][-1] += " falaji"
        del bl[i + 1:i + 3]
        n += 1
    # 13.1: keyingi betda sarlavha takrori (4 ta p) va oxirgi qatorning davomi
    bl, i = find_table("Jadval 13.1.")
    if bl[i + 1].get("text", "").startswith("**Filtrlangan Na+") and bl[i + 5].get("text") == "(suvning reabsorbsiyasi) akvaporin-2":
        r = bl[i]["rows"][-1]
        r[0] += " (suvning reabsorbsiyasi)"
        r[2] += " akvaporin-2"
        del bl[i + 1:i + 6]
        n += 1
    # 9.5: jadval nomining oxiri ("yo‘l)") jadvaldan oldin alohida p bo'lib qolgan
    bl, i = find_table("Jadval 9.5.")
    if bl[i]["title"].endswith("afzal") and bl[i - 1].get("text") == "yo‘l)":
        bl[i]["title"] += " yo‘l)"
        del bl[i - 1]
        n += 1
    # jadval kataklaridagi bo'lingan so'zlar
    for t in d["topics"]:
        for s in t["sections"] + t["skills"]:
            for b in s["blocks"]:
                if b["type"] == "table":
                    for row in [b["head"]] + b["rows"]:
                        for k, c in enumerate(row):
                            m = remerge(c)
                            if m != c:
                                row[k] = m; n += 1
    return n


def list_tail():
    """Ro'yxat bandi sahifada uzilib, davomi (keyingi bandlar va xatboshi bilan) bitta p ga tushib qolgan:
    "... bilak arteriyasida puls" | "saqlansin. ... 2. **Chimchilash simptomi.** ... 3. ... **Dermografizm** — ..." """
    n = 0
    for t in d["topics"]:
        for s in t["sections"]:
            bl = s["blocks"]
            for i in range(len(bl) - 1):
                a, b = bl[i], bl[i + 1]
                if a["type"] == "list" and a.get("ordered") and b["type"] == "p" and re.match(r"[a-z‘]", b["text"]) \
                        and not re.search(r"[.:;!?)]\s*$", a["items"][-1]):
                    head, _, rest = b["text"].partition(" **Dermografizm**")
                    k = a.get("start", 1) + len(a["items"])
                    parts, pos = [], 0
                    for m in re.finditer(r"\s(\d{1,2})\.\s(?=[A-ZО‘“*])", head):   # keyingi band raqami ketma-ket bo'lsa
                        if int(m.group(1)) == k + len(parts):
                            parts.append((pos, m.start(), m.end()))
                            pos = m.end()
                    cuts = [0] + [e for _, _, e in parts]
                    ends = [st for _, st, _ in parts] + [len(head)]
                    pieces = [head[c:e].strip() for c, e in zip(cuts, ends)]
                    a["items"][-1] += " " + pieces[0]
                    a["items"] += pieces[1:]
                    if rest:
                        b["text"] = "**Dermografizm**" + rest
                    else:
                        del bl[i + 1]
                    n += 1
                    break
    return n


def bullet_tail():
    """Belgili (•) ro'yxat bandi sahifada uzilib, davomi va keyingi bandlar bitta p ga tushib qolgan:
    "... himoya shilimshig‘ini ishlab" | "chiqaruvchi hujayralar kam. ... • Oshqozondan evakuatsiya: ..." """
    n = 0
    for t in d["topics"]:
        for s in t["sections"]:
            bl = s["blocks"]
            for i in range(len(bl) - 1):
                a, b = bl[i], bl[i + 1]
                if a["type"] == "list" and not a.get("ordered") and b["type"] == "p" \
                        and re.match(r"[a-z‘]", b["text"]) and not re.search(r"[.:;!?)]\s*$", a["items"][-1]):
                    pieces = [x.strip() for x in re.split(r"\s•\s", b["text"])]
                    a["items"][-1] = a["items"][-1].rstrip() + " " + pieces[0]
                    a["items"] += pieces[1:]
                    del bl[i + 1]
                    n += 1
                    break
    return n


def renumber():
    """Bo'lim ichidagi kichik sarlavhalar raqami bo'lim raqamiga moslanadi (9-bo'limda 10.1. -> 9.1.)."""
    n = 0
    for t in d["topics"]:
        for s in t["sections"]:
            m = re.match(r"(\d+)\.", s["title"])
            if not m:
                continue
            for b in s["blocks"]:
                if b["type"] in ("h", "sub"):
                    m2 = re.match(r"(\d+)\.(\d+)\.", b["text"])
                    if m2 and m2.group(1) != m.group(1):
                        b["text"] = m.group(1) + b["text"][len(m2.group(1)):]
                        n += 1
    return n



# ---------- 4) so'zlar ----------
WORDS = {"Glyukok ortikoidl ar": "Glyukokortikoidlar", "Sezilarl i kamaya di": "Sezilarli kamayadi",
         "5-HT3antagoni stlar": "5-HT3-antagonistlar", "D2antagoni stlar": "D2-antagonistlar",
         "5-HT3antagonist lar": "5-HT3-antagonistlar", "D2antagonist lar": "D2-antagonistlar",
         "H1blokatorl ar": "H1-blokatorlar", "H2blokatorla r": "H2-blokatorlar"}

# asl matndagi ma'no/imlo xatolari
TEXT = {
    "Izosorbid-5mononitrat": "Izosorbid-5-mononitrat",
    "Beta-1adrenomimetiklar": "Beta-1-adrenomimetiklar",
    "I1imidazolin": "I1-imidazolin",
    "H2gistamin": "H2-gistamin",
    "M1xolinoblokatorlar": "M1-xolinoblokatorlar",
    "D2antagonistlar": "D2-antagonistlar",
    "V2antagonistlari": "V2-antagonistlari",
    "H1blokator": "H1-blokator",
    "**mg/m2**": "**mg/m^2^**",
}


def stars(s):
    # "HLA-B*5701" (allel nomi) — yulduzcha saqlanadi
    return re.sub(r"\*+(?!\d)", lambda m: {1: "", 3: "**"}.get(len(m.group()), m.group()), s)


def bold_space(s):
    out, i = [], 0
    for m in re.finditer(r"\*\*(.+?)\*\*", s):
        out.append(s[i:m.start()])
        x = m.group(1)
        lead = " " if x[:1].isspace() else ""
        trail = " " if x[-1:].isspace() else ""
        out.append(f"{lead}**{x.strip()}**{trail}")
        i = m.end()
    out.append(s[i:])
    return "".join(out)


def clean(s):
    o = s
    for a, b in list(WORDS.items()) + list(TEXT.items()):
        s = s.replace(a, b)
    s = re.sub(r"\b([A-Z]{1,4})- (?!(?:va|yoki|hamda)\b)(?=\S)", r"\1-", s)       # T- limfotsitlar, (ST- T
    s = re.sub(r"(\d)- (?!(?:va|yoki|hamda)\b)(?=[a-z])", r"\1-", s)              # 2- barmoqlar, 7–10- kunga
    s = re.sub(r"(\d)– (?=\d)", r"\1–", s)                                         # 39– 40 °C, 25– 49%
    s = re.sub(r"(?<=[a-z])– (?=[A-Z][a-z])", "–", s)                              # Botkin– Erb, Shenleyn– Genox
    s = re.sub(r"\b([IVX]+)– (?=[IVX]+\b)", r"\1–", s)                              # II– III
    s = re.sub(r"(?<=\d)– (?=[A-Z]\d)", "–", s)                                     # C1– C4
    s = re.sub(r"(\d)(?=(?:kun|hafta|oy|yosh)[a-z‘]*\b)", r"\1-", s)               # 2haftada, 7–10kunga
    s = re.sub(r"(\d)- rasm\b", r"\1-rasm", s)                               # 9- rasm -> 9-rasm
    s = re.sub(r"\b([A-Z][a-z]+)- ([A-Z][a-z]+)", r"\1-\2", s)                # Obraztsov- Strajesko
    s = re.sub(r"([a-z‘’])- (?!(?:va|yoki|hamda)\b)([a-z])", r"\1-\2", s)   # olcha- qizil -> olcha-qizil
    if s.count("**") % 2 == 0:
        s = stars(s) if re.search(r"(?<!\*)\*(?![*\d])|\*\*\*", s) else s
        s = bold_space(s)
    s = re.sub(r"(?<=\S) {2,}(?=\S)", " ", s)
    s = re.sub(r"(\d)- (\d)", r"\1-\2", s)
    s = re.sub(r" +([,;])", r"\1", s)
    s = re.sub(r"\( +", "(", s)
    s = re.sub(r" +\)", ")", s)
    s = s.strip()
    return s, s != o


def walk(o, cnt):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("id", "type", "kind", "src"):
                continue
            if isinstance(v, str):
                o[k], ch = clean(v); cnt[0] += ch
            else:
                walk(v, cnt)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str):
                o[i], ch = clean(v); cnt[0] += ch
            else:
                walk(v, cnt)


def fig_order(bl, n):
    """Ketma-ket rasmlar (img) PDF dan noto'g'ri tartibda olingan (Rasm 4.3, 4.2, 4.5, 4.4 ...) — raqam bo'yicha saralanadi."""
    def num(b):
        m = re.search(r"(\d+)\.(\d+)", b.get("label", ""))
        return (int(m.group(1)), int(m.group(2))) if m else None
    i = 0
    while i < len(bl):
        if bl[i]["type"] != "img":
            if bl[i]["type"] == "box":
                n = fig_order(bl[i]["parts"], n)
            i += 1
            continue
        j = i
        while j < len(bl) and bl[j]["type"] == "img":
            j += 1
        run = bl[i:j]
        if None not in [num(b) for b in run]:
            srt = sorted(run, key=num)
            if srt != run:
                bl[i:j] = srt
                n += 1
        i = j
    return n



def walk(o, cnt):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("id", "type", "kind", "src"):
                continue
            if isinstance(v, str):
                o[k], ch = clean(v); cnt[0] += ch
            else:
                walk(v, cnt)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str):
                o[i], ch = clean(v); cnt[0] += ch
            else:
                walk(v, cnt)


def fig_order(bl, n):
    """Ketma-ket rasmlar (img) raqam bo'yicha saralanadi."""
    def num(b):
        m = re.search(r"(\d+)\.(\d+)", b.get("label", ""))
        return (int(m.group(1)), int(m.group(2))) if m else None
    i = 0
    while i < len(bl):
        if bl[i]["type"] != "img":
            if bl[i]["type"] == "box":
                n = fig_order(bl[i]["parts"], n)
            i += 1
            continue
        j = i
        while j < len(bl) and bl[j]["type"] == "img":
            j += 1
        run = bl[i:j]
        if None not in [num(b) for b in run]:
            srt = sorted(run, key=num)
            if srt != run:
                bl[i:j] = srt
                n += 1
        i = j
    return n


def every(fn):
    n = 0
    for t in d["topics"]:
        n = fn(t["goals"], n)
        for key in ("sections", "skills"):
            for s in t[key]:
                n = fn(s["blocks"], n)
    return n


log.append(f"{quick()} ta mavzuda tezkor takrorlash kartochkalari asl jadvaldan tiklandi")
log.append(f"{every(glued_sub)} ta ro'yxatga yopishgan kichik sarlavha ajratildi")
log.append(f"{every(join_lists)} ta bo'lingan ro'yxat birlashtirildi")
log.append(f"{every(join_sentences)} ta bo'lingan gap birlashtirildi")
log.append(f"{list_tail()} ta uzilgan ro'yxat bandi tiklandi")
log.append(f"{bullet_tail()} ta uzilgan belgili ro'yxat bandi tiklandi")
log.append(f"{tables()} ta jadval tuzatishi")
log.append(f"{every(fig_order)} ta rasm guruhi tartibi tiklandi")
log.append(f"{renumber()} ta kichik sarlavha raqami tuzatildi")
cnt = [0]
walk(d, cnt)
log.append(f"{cnt[0]} ta matn tozalandi")

with open(PATH, "w", encoding="utf8") as f:
    json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
print("\n".join(log))
