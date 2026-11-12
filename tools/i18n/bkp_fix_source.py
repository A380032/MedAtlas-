"""python3 tools/i18n/bkp_fix_source.py
Bolalar kasalliklari propedevtikasi (bkp) kitobidagi manba xatolarini tuzatadi (asl PDF bilan solishtirib
topilgan). Faqat data/subjects/bkp.json (uz) tuzatiladi va tarjimadan OLDIN ishga tushiriladi. Qayta ishga
tushirilsa hech narsa o'zgarmaydi.

Tuzatiladigan xatolar:
 1) ro'yxatning oxirgi bandiga yopishib qolgan xatboshilar (PDF'da chap chetdan boshlanadi) alohida blokka
    chiqariladi; "**...:**" ko'rinishidagilari kichik sarlavha (sub) bo'ladi — jumladan har bir mavzu
    maqsadidagi "Talaba bajara olishi kerak:" sarlavhasi. Ro'yxat: tools/i18n/books/bkp/glued.json;
 2) bitta bandga qo'shilib ketgan raqamli bandlar ajratiladi ("... 11.** Epikriz** ...");
 3) sahifa chegarasida ikkiga bo'lingan ro'yxatlar va gaplar birlashtiriladi;
 4) jadvallar: 11.2-jadval (ustunlar qo'shilib ketgan) qayta tuziladi; uning ichiga tushib qolgan
    11.3-jadval alohida jadvalga chiqariladi; 11.4-jadval ichiga tushib qolgan 11.6-bo'lim
    ("Qon o'zgarishlari semiotikasi": matn va 11.5-jadval) tiklanadi; 7.14- va 13.9-jadvallarning
    ikkiga bo'lingan qatorlari birlashtiriladi;
 5) jadval kataklarida bo'linib qolgan so'zlar (Kuchay gan, Susayga n), chiziqcha oldidagi ortiqcha bo'shliqlar
    (T- limfotsitlar, 2- barmoqlar), ma'no xatolari (TEXT);
 6) ** ichidagi chetki bo'shliqlar, ikkitalik bo'shliqlar, yolg'iz *.
Darajalar (sm^2^, kg/m^2^, 10^9^/l) tools/fix_powers.py bilan tiklanadi.
"""
import json, os, re

PATH = "data/subjects/bkp.json"
d = json.load(open(PATH, encoding="utf8"))
log = []


def blocks(ti, key, si):
    return d["topics"][ti][key][si]["blocks"]


# ---------- 1) yopishgan xatboshilar ----------
GLUED = json.load(open(os.path.join(os.path.dirname(__file__), "books", "bkp", "glued.json"), encoding="utf8"))


def plain_map(s):
    """** belgilarisiz matn va har bir belgining asl matndagi o'rni."""
    out, idx, i = [], [], 0
    while i < len(s):
        if s.startswith("**", i):
            i += 2
            continue
        out.append(s[i]); idx.append(i); i += 1
    return "".join(out), idx


def split_item(x):
    p, idx = plain_map(x)
    cuts = set()
    for g in GLUED:
        pre, post = g.split("‖")
        k = p.find(pre + " " + post)
        if k >= 0:
            r = idx[k + len(pre) + 1]           # post boshlanishi (asl matnda)
            if x[r - 2:r] == "**":
                r -= 2
            cuts.add(r)
    if not cuts:
        return None
    cuts = sorted(cuts)
    pieces = [x[:cuts[0]]] + [x[a:b] for a, b in zip(cuts, cuts[1:] + [len(x)])]
    return [s.strip() for s in pieces]


def split_glued(bl, n):
    i = 0
    while i < len(bl):
        b = bl[i]
        if b["type"] == "box":
            n = split_glued(b["parts"], n)
        if b["type"] == "list":
            pieces = split_item(b["items"][-1])
            if pieces:
                b["items"][-1] = pieces[0]
                new = []
                for s in pieces[1:]:
                    m = re.fullmatch(r"\*\*([^*]+:)\*\*", s)
                    new.append({"type": "sub", "text": m.group(1)} if m else {"type": "p", "text": s})
                bl[i + 1:i + 1] = new
                n += len(new)
                i += len(new)
        i += 1
    return n


# ---------- 2) qo'shilib ketgan raqamli bandlar ----------
def numbered(bl):
    n = 0
    for b in bl:
        if b["type"] == "list" and b.get("ordered"):
            out = []
            for it in b["items"]:
                k = b.get("start", 1) + len(out)
                parts = re.split(r"\s(?=\d{1,2}\.\s?\*\*)", it)
                if len(parts) > 1 and all(re.match(rf"{k + j}\.", p) for j, p in enumerate(parts[1:], 1)):
                    out.append(parts[0])
                    for p in parts[1:]:
                        p = re.sub(r"^\d{1,2}\.\s?\*\*\s*", "**", p)
                        out.append(p); n += 1
                else:
                    out.append(it)
            b["items"] = out
    return n


# ---------- 3) bo'lingan ro'yxatlar va gaplar ----------
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


def find_table(prefix):
    for t in d["topics"]:
        for s in t["sections"]:
            for i, b in enumerate(s["blocks"]):
                if b["type"] == "table" and b.get("title", "").startswith(prefix):
                    return s["blocks"], i
    raise KeyError(prefix)


# ---------- 4) jadvallar ----------
ROWS = [  # (jadval nomi boshi, ikkinchi qatorning birinchi katagi) — sahifa/qator chegarasida ikkiga bo'lingan qator
    ("Jadval 7.14.", "plevrit)"),          # Suyuqlik (ekssudativ | plevrit)
    ("Jadval 13.9.", "peristaltika"),      # Ko‘rinadigan | peristaltika
]


def tables():
    n = 0
    for prefix, first in ROWS:
        bl, i = find_table(prefix)
        rows = bl[i]["rows"]
        ri = next((r for r, row in enumerate(rows) if row[0] == first), None)
        if ri is None:
            continue
        a, b = rows[ri - 1], rows[ri]
        for c in range(len(a)):
            if b[c].strip():
                a[c] = (a[c].rstrip() + " " + b[c].lstrip()).strip()
        del rows[ri]
        n += 1
    # 11.2: 7 ustun 5 ga qo'shilib ketgan; oxirgi qatorlar aslida 11.3-jadval
    bl, i = find_table("Jadval 11.2.")
    t = bl[i]
    if len(t["head"]) == 5:
        k = next(r for r, row in enumerate(t["rows"]) if row[3].startswith("Jadval 11.3."))
        old, rest = t["rows"][:k], t["rows"][k + 2:]
        t["head"] = ["Yosh", "Hb, g/l", "Eritrotsitlar, ×10^12^/l", "Retikulotsitlar, %", "Leykotsitlar, ×10^9^/l",
                     "Trombotsitlar, ×10^9^/l", "EChT, mm/soat"]
        rows = []
        for r in old:
            m = re.match(r"(\d+ \S+|>10 yosh) (.+)", r[0])
            e, rt = r[1].split(" ")
            rows.append([m.group(1), m.group(2), e, rt, r[2], r[3], r[4]])
        t["rows"] = rows
        IDX = [("MCV — eritrotsitning o‘rtacha hajmi", "Mikro-, normo-, makrotsitoz"),
               ("MCH — eritrotsitdagi o‘rtacha Hb miqdori", "Rang ko‘rsatkichining analogi"),
               ("MCHC — eritrotsitdagi o‘rtacha Hb konsentratsiyasi", "To‘yinganlik")]
        rows3 = []
        for r in rest:
            for a, b in IDX:
                if r[0] == a + " " + b:
                    r = [a, b, r[2], r[3], r[4]]
            rows3.append([r[0], r[1], r[3]])
        bl.insert(i + 1, {"type": "table", "title": "Jadval 11.3. Eritrotsitar indekslar",
                          "head": ["Ko‘rsatkich", "Ma’nosi", "Me’yor"], "rows": rows3})
        n += 1
    # 11.4: oxirida 11.6-bo'lim boshi va 11.5-jadval qo'shilib ketgan
    bl, i = find_table("Jadval 11.4.")
    t = bl[i]
    k = next((r for r, row in enumerate(t["rows"]) if row[0].startswith("11.6. ")), None)
    if k is not None:
        rows5 = [r for r in t["rows"][k + 8:] if r[0] != "Mezon"]
        del t["rows"][k:]
        assert [r[0] for r in rows5] == ["Og‘irlik darajasi", "Rang ko‘rsatkichi", "Eritrotsit o‘lchami (MCV)",
                                         "Regeneratsiya (retikulotsitlar)", "", "Kelib chiqishi", ""], rows5
        fixed = [list(r) for r in rows5[:4]] + [["Kelib chiqishi", " ".join(r[1] for r in rows5[4:])]]
        sec = {"title": "11.6. Qon o‘zgarishlari semiotikasi", "blocks": [
            {"type": "h", "text": "Eritrotsitlar o‘zgarishi"},
            {"type": "p", "text": "**Anemiya** — qon hajm birligida gemoglobin (ko‘pincha eritrotsitlar ham) miqdorining yosh "
                                  "me’yoridan kamayishi. Bolalarda eng ko‘p uchraydigan qon patologiyasi."},
            {"type": "p", "text": "**Anemiya chegarasi (JSST):** chaqaloqda Hb **<145 g/l**; **6 oy – 5 yosh — <110 g/l**; "
                                  "**5–11 yosh — <115 g/l**; **12 yoshdan katta — <120 g/l** (mahalliy amaliyotda 5 yoshdan "
                                  "katta bolalar uchun ko‘pincha <120 g/l olinadi)."},
        ]}
        sec["blocks"].append({"type": "table", "title": "Jadval 11.5. Anemiyalar tasnifi", "head": ["Mezon", "Turlari"],
                              "rows": fixed})
        # qolgan bloklar (11.6-jadval va undan keyingilar) ham 11.6-bo'limga tegishli
        sec["blocks"] += bl[i + 1:]
        del bl[i + 1:]
        secs = next(t["sections"] for t in d["topics"] if any(s["blocks"] is bl for s in t["sections"]))
        si = next(j for j, s in enumerate(secs) if s["blocks"] is bl)
        secs.insert(si + 1, sec)
        n += 1
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


# ---------- 5) so'zlar ----------
WORDS = {"Kuchay gan": "Kuchaygan", "Susayga n": "Susaygan", "Eshitilmayd i": "Eshitilmaydi", "O‘zgar magan": "O‘zgarmagan",
         "Bochkasim on": "Bochkasimon", "Kasallikla r": "Kasalliklar", "Perkussiy a": "Perkussiya",
         "Retikulotsitl ar": "Retikulotsitlar", "Rivojlanis h": "Rivojlanish", "chegarala ri": "chegaralari",
         "35– 45%": "35–45%", "Mun– Barde": "Mun–Barde", "qo‘loyoq": "qo‘l-oyoq", "Qo‘loyoq": "Qo‘l-oyoq", "39– 40 °C": "39–40 °C", "tashhis": "tashxis", "Tashhis": "Tashxis", "TASHHIS": "TASHXIS"}


# asl matndagi ma'no/imlo xatolari (asl PDF va darsliklar bilan solishtirib topilgan)
TEXT = {
    "(370–416 hafta)": "(37^0^–41^6^ hafta)",      # daraja belgisi yo'qolgan: 37 0/7 – 41 6/7 hafta
    "37–416 hafta": "37–41^6^ hafta",
    "(1faza)": "(1-faza)",
    "“tovonquloq”": "“tovon-quloq”",
    "Rahit": "Raxit",
    "Atakstik": "Ataktik",
    "qisqargantimpanik": "qisqargan-timpanik",
    "mikrotsirkulyatorgematoma": "mikrotsirkulyator-gematoma",
}


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
        s = stars(s) if re.search(r"(?<!\*)\*(?!\*)|\*\*\*", s) else s
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


def every(fn):
    n = 0
    for t in d["topics"]:
        n = fn(t["goals"], n)
        for key in ("sections", "skills"):
            for s in t[key]:
                n = fn(s["blocks"], n)
    return n


n = every(split_glued)
log.append(f"{n} ta yopishgan xatboshi/sarlavha alohida blokka chiqarildi")
n = sum(numbered(s["blocks"]) for t in d["topics"] for s in t["sections"])
log.append(f"{n} ta qo'shilib ketgan raqamli band ajratildi")
log.append(f"{every(join_lists)} ta bo'lingan ro'yxat birlashtirildi")
log.append(f"{every(join_sentences)} ta bo'lingan gap birlashtirildi")
log.append(f"{tables()} ta jadval tuzatildi")
log.append(f"{list_tail()} ta uzilgan ro'yxat bandi tiklandi")
log.append(f"{renumber()} ta kichik sarlavha raqami tuzatildi")
cnt = [0]
walk(d, cnt)
log.append(f"{cnt[0]} ta matn tozalandi")

with open(PATH, "w", encoding="utf8") as f:
    json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
print("\n".join(log))
