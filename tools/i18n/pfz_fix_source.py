"""python3 tools/i18n/pfz_fix_source.py
Patologik fiziologiya (pfz) kitobidagi manba xatolarini tuzatadi (asl PDF bilan solishtirib topilgan).
Faqat data/subjects/pfz.json (uz) tuzatiladi va tarjimadan OLDIN ishga tushiriladi: inglizcha fayl
book_apply.py bilan shu tuzatilgan uz tuzilmasidan yasaladi. Qayta ishga tushirilsa hech narsa o'zgarmaydi.
Yopishgan xatboshilar ro'yxati: tools/i18n/books/pfz/glued.json (asl PDF bilan solishtirib topilgan).

Tuzatiladigan xatolar:
 1) sahifa chegarasida bo'linib qolgan gaplar va formulalar (HCO3 | −, O2 | −, NH4 | +) birlashtiriladi;
 2) 4 ta jadvaldan keyin takrorlangan sarlavha qatori olib tashlanadi, jadvaldan tushib qolgan
    qator/matn o'z joyiga qaytariladi; ikki qatorga bo'linib qolgan 6 ta jadval qatori birlashtiriladi;
 3) 11-mavzu maqsadlari: ro'yxatning siljib ketgan 1-bandi joyiga qo'yiladi, "•" bilan bir xatboshiga
    qo'shilib ketgan bandlar ro'yxatga qaytariladi (11- va 24-mavzu ham);
 4) sahifa chegarasida ikkiga bo'lingan ro'yxatlar birlashtiriladi (raqamlash davom etsa);
    ro'yxatning oxirgi bandiga yopishib qolgan xatboshilar (PDF'da chap chetdan boshlanadi) alohida
    blokka chiqariladi; "**...:**" ko'rinishidagilari kichik sarlavha (sub) bo'ladi;
 5) jadval kataklarida bo'linib qolgan so'zlar (Kompensatsi ya), tushib qolgan chiziqchalar
    (Tlimfotsitlar, olcha- qizil), "HCO3 −" kabi formulalar;
 6) ** ichidagi chetki bo'shliqlar, ikkitalik bo'shliqlar, yolg'iz *.
"""
import json, os, re

F = {"uz": "data/subjects/pfz.json"}
D = {k: json.load(open(v, encoding="utf8")) for k, v in F.items() if os.path.exists(v)}
log = []


def blocks(d, ti, key, si, box=None):
    bl = d["topics"][ti]["goals"] if key == "goals" else d["topics"][ti][key][si]["blocks"]
    return bl if box is None else bl[box]["parts"]


def done():
    return blocks(D["uz"], 3, "sections", 0)[2].get("text") != "**Bo‘g‘in Vazifasi**"


# ---------- 1) bo'lingan gaplar: (topic, key, section, box, [a, b], qo'shuvchi) ----------
# a blokning oxiriga (p matni yoki ro'yxatning oxirgi bandi) b blokning boshi qo'shiladi, b o'chiriladi.
MERGES = [
    (6, "sections", 2, None, [6, 7], ""),      # (O2 | −) hosil qiladi
    (9, "sections", 0, 2, [0, 1], " "),        # qutida: (kapillyar yoki venoz plazma) | ishlatilganiga
    (10, "sections", 0, None, [5, 6], ""),     # Me’yorda HCO3 | − va erigan CO2
    (10, "sections", 3, None, [2, 3], ""),     # HCO3 | − ko‘payadi
    (10, "sections", 4, None, [2, 3], ""),     # HCO3 | − ko‘proq chiqariladi
    (10, "sections", 4, None, [11, 12], ""),   # HCO3 | − kamaygan)
    (10, "skills", 0, None, [0, 1], ""),       # HCO3 | − kamaygan)
    (12, "sections", 1, None, [8, 9], ""),     # (O2 | −), gidroksil radikali
    (17, "sections", 1, None, [5, 6], " "),    # zardob temiri, | ferritin
    (20, "sections", 1, 5, [0, 1], " "),       # qutida: va | kalsiy almashinuvi
    (21, "sections", 5, None, [9, 10], " "),   # temir Fe3+ | holatiga o‘tadi
    (24, "sections", 6, 5, [0, 1], " "),       # qutida: (kanalcha ichidagi bosim oshib, | filtratsiya
]


def tail_of(b):
    return "text" if b["type"] == "p" else "items"


def merge(bl, a, b, j):
    A, B = bl[a], bl[b]
    assert B["type"] == "p", B
    if A["type"] == "p":
        A["text"] = A["text"].rstrip() + j + B["text"].lstrip()
    elif A["type"] == "list":
        A["items"][-1] = A["items"][-1].rstrip() + j + B["text"].lstrip()
    else:
        raise ValueError(A["type"])
    del bl[b]


def bullets(s):
    """'a; • b; • c' -> ['a;', 'b;', 'c']"""
    return [x.strip() for x in s.split(" • ")]


def special(d):
    # 11-mavzu maqsadlari: [p sub p(2-5 bandlar + "Talaba bajara...") list(1-band) list] -> to'g'ri tartib
    g = d["topics"][10]["goals"]
    p2, l3 = g[2], g[3]
    assert p2["type"] == "p" and l3["type"] == "list" and len(l3["items"]) == 1
    txt = p2["text"]
    m = re.search(r"\s*(\*\*[^*]+:\*\*)$", txt)
    assert m
    head = m.group(1).strip("*")
    rest = bullets(txt[:m.start()])
    first = l3["items"][0].rstrip() + rest[0]
    g[2:4] = [{"type": "list", "ordered": False, "items": [first] + rest[1:], "start": 1},
              {"type": "sub", "text": head}]
    # 11-mavzu, 2-bo'lim: ammoniy (NH4 | +) holida chiqaradi. 4. Bu jarayonlarda ...
    bl = blocks(d, 10, "sections", 1)
    lst, p = bl[9], bl[10]
    m = re.match(r"(.*?\.)\s*4\.\s*(.+)$", p["text"])
    lst["items"][-1] = lst["items"][-1].rstrip() + m.group(1)
    lst["items"].append(m.group(2))
    del bl[10]
    # 11-mavzu, 3-bo'lim: pCO2 va HCO3 | − | o‘zgargan; • **subkompensatsiyalangan ...**
    bl = blocks(d, 10, "sections", 2)
    lst = bl[2]
    parts = bullets(bl[3]["text"] + " " + bl[4]["text"])
    lst["items"][-1] = lst["items"][-1].rstrip() + parts[0]
    lst["items"] += parts[1:]
    del bl[3:5]
    # 11-mavzu, 6-bo'lim: (... H+ | ning bir qismi). | **Ammiakni aniqlash (formol titrlash usuli):**
    bl = blocks(d, 10, "sections", 5)
    m = re.match(r"(.*?\))\.?\s*(\*\*.+\*\*)$", bl[5]["text"])
    bl[4]["items"][-1] = bl[4]["items"][-1].rstrip() + " " + m.group(1) + "."
    bl[5] = {"type": "sub", "text": m.group(2).strip("*")}
    # 24-mavzu, 7-bo'lim: (chala | tug‘ilganlarda ... quyish. • **Irsiy ...** • **O‘t yo‘llari atreziyasi** ...
    bl = blocks(d, 23, "sections", 6)
    parts = bullets(bl[3]["text"])
    bl[2]["items"][-1] = bl[2]["items"][-1].rstrip() + " " + parts[0]
    bl[2]["items"] += parts[1:]
    del bl[3]


# ---------- 2) jadvallar ----------
# (topic, section, jadval, o'chiriladigan bloklar, amal)
TABLES = [
    (3, 0, 1, [2, 3], ("row", None)),            # Limfa kapillyarlari | To‘qimalararo ...
    (12, 0, 1, [2, 3], ("cell", " ")),           # ... yetishmovchiligi yoki | ortiqchaligi
    (13, 6, 1, [2, 3], ("cell", " ")),           # ... makrofaglar, | antitanalar, interferonlar, TNF
    (18, 4, 5, [6, 7], ("row4", None)),          # Kompensator pauza qatori
]
ROW_TEXT = {
    (3, 0): {"uz": ["Limfa kapillyarlari", "To‘qimalararo suyuqlik va oqsillarni olib ketadi"]},
    (18, 4): {"uz": ["Kompensator pauza", "To‘liq bo‘lmagan", "Ko‘pincha to‘liq bo‘lmagan", "To‘liq"]},
}
# ikki qatorga bo'lingan jadval qatorlari: (topic, section, jadval, qator, [har bir ustun qo'shuvchisi])
ROWS = [
    (2, 4, 2, 1, [" ", " ", " ", " "]),          # Kuchli, | muvozanatli, harakatchan
    (2, 7, 2, 1, [" ", " ", " "]),               # Gen (monogen) kasalliklari, | autosom-dominant
    (4, 2, 7, 1, [" ", " ", " "]),               # Oq | (agglyutinatsion)
    (8, 2, 0, 2, ["", " ", " ", " "]),           # Gipernatri | yemiya
    (12, 4, 1, 2, ["", " ", " "]),               # Giperplazi | ya
    (16, 5, 2, 4, [" ", " ", " "]),              # Orttirilgan (asosan tashqi | omil)
]


def tables(d, lang):
    for ti, si, tb, dels, (kind, j) in TABLES:
        bl = blocks(d, ti, "sections", si)
        t = bl[tb]
        if kind == "cell":
            t["rows"][-1][-1] = t["rows"][-1][-1].rstrip() + j + bl[dels[-1]]["text"].strip()
        else:
            t["rows"].append(list(ROW_TEXT[(ti, si)][lang]))
        for i in sorted(dels, reverse=True):
            del bl[i]
    for ti, si, tb, ri, js in ROWS:
        rows = blocks(d, ti, "sections", si)[tb]["rows"]
        a, b = rows[ri - 1], rows[ri]
        for c, jn in enumerate(js):
            if b[c].strip():
                a[c] = (a[c].rstrip() + jn + b[c].lstrip()).strip()
        del rows[ri]


# ---------- 4) yopishgan xatboshilar: ro'yxat oxirgi bandidagi xatboshi boshlanishi (PDF bilan topilgan) ----------
GLUED = json.load(open(os.path.join(os.path.dirname(__file__), "books", "pfz", "glued.json"), encoding="utf8"))


def split_glued(bl, n):
    """GLUED: "oldingi matn‖xatboshi boshi" - ajratish joyi aniq kontekst bilan belgilanadi."""
    i = 0
    while i < len(bl):
        b = bl[i]
        if b["type"] == "box":
            n = split_glued(b["parts"], n)
        if b["type"] == "list":
            x = b["items"][-1]
            cuts = set()
            for g in GLUED:
                pre, post = g.split("‖")
                k = x.find(pre + " " + post)
                if k >= 0:
                    cuts.add(k + len(pre))
            cuts = sorted(cuts)
            if cuts:
                pieces = [x[:cuts[0]]] + [x[a + 1:b2] for a, b2 in zip(cuts, cuts[1:] + [len(x)])]
                b["items"][-1] = pieces[0].rstrip()
                new = []
                for s in pieces[1:]:
                    s = s.strip()
                    m = re.fullmatch(r"\*\*([^*]+:)\*\*", s)
                    new.append({"type": "sub", "text": m.group(1)} if m else {"type": "p", "text": s})
                bl[i + 1:i + 1] = new
                n += len(new)
                i += len(new)
        i += 1
    return n


# ---------- 4b) sahifa chegarasida ikkiga bo'lingan ro'yxatlar (ketma-ket, raqamlash davom etadi) -> bitta ----------
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


# ---------- 5) so'zlar (faqat uz) ----------
WORDS = {"Kompensatsi ya": "Kompensatsiya", "Dekompensat siya": "Dekompensatsiya", "Reaktiv lik": "Reaktivlik",
         "Kombinatsiyalang an": "Kombinatsiyalangan", "Giponatriy emiya": "Giponatriyemiya",
         "Gipokaliye miya": "Gipokaliyemiya", "Giperkaliy emiya": "Giperkaliyemiya", "Membrano gen": "Membranogen",
         "Neyrogum oral": "Neyrogumoral", "osmolyarli gi": "osmolyarligi", "Mitoxondriyal ar": "Mitoxondriyalar",
         "Protoonkogenl ar": "Protoonkogenlar", "Qo‘zg‘aluvcha nlik": "Qo‘zg‘aluvchanlik",
         "O‘tkazuvchanl ik": "O‘tkazuvchanlik", "Qisqaruvchanl ik": "Qisqaruvchanlik", "Pasayad i": "Pasayadi",
         "temperamen ti": "temperamenti", "Giperkoagulyatsiy a": "Giperkoagulyatsiya", "Rivojlanish i": "Rivojlanishi",
         "Gipertrofiy a": "Gipertrofiya", "Metaplaziy a": "Metaplaziya", "Transplantatsi ya": "Transplantatsiya",
         "Implantatsio n": "Implantatsion", "Kanalikulya r": "Kanalikulyar", "yetishmovchil ik": "yetishmovchilik",
         "shartsharoitlar": "shart-sharoitlar", "irsiykonstitutsional": "irsiy-konstitutsional",
         "Lselektin": "L-selektin", "Tlimfotsitlar": "T-limfotsitlar", "qaramaqarshi": "qarama-qarshi",
         "Goqsil": "G-oqsil", "tayanchharakat": "tayanch-harakat"}


def stars(s):
    return re.sub(r"\*+", lambda m: {1: "", 3: "**"}.get(len(m.group()), m.group()), s)


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


def clean(s, lang):
    o = s
    if lang == "uz":
        for a, b in WORDS.items():
            s = s.replace(a, b)
        s = re.sub(r"([a-z‘’])- (?!(?:va|yoki|hamda)\b)([a-z])", r"\1-\2", s)   # olcha- qizil -> olcha-qizil
    s = re.sub(r"\b(HCO3|CO3|O2|NH4) ([−+])(?=[\s),.;:/]|$)", r"\1\2", s)          # HCO3 − -> HCO3−
    if s.count("**") % 2 == 0:
        s = stars(s) if re.search(r"(?<!\*)\*(?!\*)|\*\*\*", s) else s
        s = bold_space(s)
    s = re.sub(r"(?<=\S) {2,}(?=\S)", " ", s)
    s = re.sub(r"(\d)- (\d)", r"\1-\2", s)
    s = re.sub(r" +([,;])", r"\1", s)
    s = re.sub(r"\( +", "(", s)
    s = re.sub(r" +\)", ")", s)
    s = s.strip()
    return s, s != o


def walk(o, lang, cnt):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("id", "type", "kind", "src"):
                continue
            if isinstance(v, str):
                o[k], ch = clean(v, lang); cnt[0] += ch
            else:
                walk(v, lang, cnt)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str):
                o[i], ch = clean(v, lang); cnt[0] += ch
            else:
                walk(v, lang, cnt)


if done():
    print("Tuzilma tuzatishlari allaqachon qo'llangan.")
else:
    for lang, d in D.items():
        for ti, key, si, box, (a, b), j in sorted(MERGES, key=lambda m: (m[0], m[1], m[2], m[3] or -1, -m[4][0])):
            merge(blocks(d, ti, key, si, box), a, b, j)
        special(d)
        tables(d, lang)
    log.append(f"{len(MERGES) + 5} ta bo'lingan gap/formula tiklandi; {len(TABLES)} ta jadval va "
               f"{len(ROWS)} ta jadval qatori tiklandi; 11-mavzu maqsadlari tartibga keltirildi")

for lang, d in D.items():
    n = 0
    for t in d["topics"]:
        n = split_glued(t["goals"], n)
        for key in ("sections", "skills"):
            for s in t[key]:
                n = split_glued(s["blocks"], n)
    if n:
        log.append(f"{lang}: {n} ta yopishgan xatboshi alohida blokka chiqarildi")
    n = 0
    for t in d["topics"]:
        n = join_lists(t["goals"], n)
        for key in ("sections", "skills"):
            for s in t[key]:
                n = join_lists(s["blocks"], n)
    if n:
        log.append(f"{lang}: {n} ta bo'lingan ro'yxat birlashtirildi")
    cnt = [0]
    walk(d, lang, cnt)
    log.append(f"{lang}: {cnt[0]} ta matn tozalandi")

for lang, path in F.items():
    if lang in D:
        with open(path, "w", encoding="utf8") as f:
            json.dump(D[lang], f, ensure_ascii=False, separators=(",", ":"))
print("\n".join(log))
