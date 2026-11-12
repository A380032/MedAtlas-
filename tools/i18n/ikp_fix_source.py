"""python3 tools/i18n/ikp_fix_source.py
Ichki kasalliklar propedevtikasi (ikp) kitobidagi manba xatolarini tuzatadi (asl PDF bilan solishtirib topilgan).
Faqat data/subjects/ikp.json (uz) tuzatiladi va tarjimadan OLDIN ishga tushiriladi. Qayta ishga tushirilsa
hech narsa o'zgarmaydi.

Tuzatiladigan xatolar:
 1) ro'yxatning oxirgi bandiga yopishib qolgan xatboshilar (PDF'da chap chetdan boshlanadi) alohida blokka
    chiqariladi; "**...:**" ko'rinishidagilari kichik sarlavha (sub) bo'ladi — jumladan har bir mavzu
    maqsadidagi "Talaba bajara olishi kerak:" sarlavhasi. Ro'yxat: tools/i18n/books/ikp/glued.json;
 2) 2-mavzu umumiy ko'rik tartibi: bitta bandga qo'shilib ketgan 10–12-bandlar ajratiladi;
 3) sahifa chegarasida ikkiga bo'lingan ro'yxatlar va qutidagi gaplar birlashtiriladi;
 4) sahifa chegarasida ikki qatorga bo'lingan 3 ta jadval qatori birlashtiriladi; 14.7-jadval ichiga
    tushib qolgan "Yodlash usuli" qutisi jadvaldan chiqariladi;
 5) jadval kataklarida bo'linib qolgan so'zlar (O‘zgarmag an, Tekshir uv), tushib qolgan chiziqchalar
    (astasekin, teztez), "tashhis" -> "tashxis" (o'zbek imlosi); 4.7- va 10.3-jadvallarning keyingi sahifaga
    o'tgan qatorlari jadvalga qaytariladi; bo'lim ichidagi kichik sarlavhalar raqami (9-bo'limda "10.1.")
    tuzatiladi; ma'no xatolari (TEXT: stepaj — kichik boldir nervi, bel/bo'ksa nisbati, zangsimon balg'am va b.);
 6) ** ichidagi chetki bo'shliqlar, ikkitalik bo'shliqlar, yolg'iz *.
Darajalar (sm^2^, kg/m^2^, 10^9^/l) tools/fix_powers.py bilan tiklanadi.
"""
import json, os, re

PATH = "data/subjects/ikp.json"
d = json.load(open(PATH, encoding="utf8"))
log = []


def blocks(ti, key, si):
    return d["topics"][ti][key][si]["blocks"]


# ---------- 1) yopishgan xatboshilar ----------
GLUED = json.load(open(os.path.join(os.path.dirname(__file__), "books", "ikp", "glued.json"), encoding="utf8"))


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
                and a["text"].rstrip().endswith("**") and bl[i + 1]["text"].startswith("**va ")):
            # "... → **o‘ng qorincha gipertrofiyasi**" | "**va dilatatsiyasi** → ..." — bitta qalin ibora
            a["text"] = a["text"].rstrip()[:-2] + " " + bl[i + 1]["text"][2:]
            del bl[i + 1]
            n += 1
            continue
        if (i + 1 < len(bl) and a["type"] == "p" and bl[i + 1]["type"] == "p"
                and (not re.search(r"[.:;!?)»”\"*]\s*$", a["text"]) and re.match(r"[a-z‘’(]", bl[i + 1]["text"])
                     # "... **bo‘g‘im og‘riqlari**" | "(revmatizm), ..."
                     or re.search(r"[^.:;!?]\*\*\s*$", a["text"]) and re.match(r"\([a-z]", bl[i + 1]["text"]))):
            a["text"] = a["text"].rstrip() + " " + bl[i + 1]["text"].lstrip()
            del bl[i + 1]
            n += 1
            continue
        i += 1
    return n


# ---------- 4) jadvallar ----------
ROWS = [  # (jadval nomi boshi, ikkinchi qatorning birinchi katagi, ustun qo'shuvchilari)
    ("Jadval 1.6.", "omillar", [" ", " ", " "]),               # Kuchaytiruvchi va kamaytiruvchi | omillar
    ("Jadval 7.15.", "qaytarligi", [" ", " ", " "]),           # Obstruksiyaning | qaytarligi
    ("Jadval 11.16.", "yetishmovchilik", [" ", " ", " ", " ", " ", ""]),  # Mitral | yetishmovchilik; O‘zgarmag | an
]


def find_table(prefix):
    for t in d["topics"]:
        for s in t["sections"]:
            for i, b in enumerate(s["blocks"]):
                if b["type"] == "table" and b.get("title", "").startswith(prefix):
                    return s["blocks"], i
    raise KeyError(prefix)


def tables():
    n = 0
    for prefix, first, js in ROWS:
        bl, i = find_table(prefix)
        rows = bl[i]["rows"]
        ri = next((r for r, row in enumerate(rows) if row[0] == first), None)
        if ri is None:
            continue
        a, b = rows[ri - 1], rows[ri]
        for c, jn in enumerate(js):
            if b[c].strip():
                a[c] = (a[c].rstrip() + jn + b[c].lstrip()).strip()
        del rows[ri]
        n += 1
    # 14.7-jadval: oxirgi 3 qator aslida jadvaldan keyingi "Yodlash usuli" qutisi
    bl, i = find_table("Jadval 14.7.")
    t = bl[i]
    if len(t["rows"]) > 3 and t["rows"][3][0] == "YODLASH USULI":
        text = " ".join(r[0].strip() for r in t["rows"][4:])
        del t["rows"][3:]
        bl.insert(i + 1, {"type": "box", "kind": "yodlash", "parts": [{"type": "p", "text": text}]})
        n += 1
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


def split_tables():
    """Keyingi sahifaga o'tgan jadval qatorlari (takrorlangan sarlavha qatori + oddiy xatboshilar) jadvalga qaytariladi."""
    n = 0
    bl, i = find_table("Jadval 4.7.")
    if bl[i + 1].get("text") == "**Nafas turi Ta’rifi Sabablari**":
        t = bl[i]
        t["rows"][-1][1] += " " + bl[i + 2]["text"]                 # ... uzoq pauzalar bilan | almashinadi
        t["rows"].append([bl[i + 3]["text"], bl[i + 4]["text"], bl[i + 5]["text"]])   # Grokk nafasi
        del bl[i + 1:i + 6]
        n += 1
    bl, i = find_table("Jadval 8.1.")
    if i > 0 and bl[i - 1].get("text") == "saqlangan)":          # jadval nomining oxiri jadvaldan oldin qolgan
        bl[i]["title"] += " saqlangan)"
        del bl[i - 1]
        n += 1
    bl, i = find_table("Jadval 10.3.")
    if bl[i + 1].get("text") == "**Sinf Ta’rifi**":
        m = re.match(r"(IV) (.+)", bl[i + 2]["text"])
        bl[i]["rows"].append([m.group(1), m.group(2)])
        del bl[i + 1:i + 3]
        n += 1
    bl, i = find_table("Jadval 12.15.")
    rows = bl[i]["rows"]
    for k in range(len(rows) - 1):
        if rows[k][0] == "Bo‘lmachalararo" and rows[k + 1][0] == "to‘siq nuqsoni":   # PDF qatori ikkiga bo'lingan
            a, b = rows[k], rows[k + 1]
            rows[k] = [a[0] + " " + b[0], a[1] + " " + b[1], a[2] + " " + b[2]]
            del rows[k + 1]
            n += 1
            break
    return n


# ---------- 5) so'zlar ----------
WORDS = {"O‘zgarmag an": "O‘zgarmagan", "yetishmovch ilik": "yetishmovchilik", "yetishmovchili k": "yetishmovchilik",
         "Tekshir uv": "Tekshiruv", "Balandl igi": "Balandligi", "pnevmoni ya": "pnevmoniya",
         "Boshlan ishi": "Boshlanishi", "Joylash uvi": "Joylashuvi", "anamne z": "anamnez",
         "Xususiy ati": "Xususiyati", "Tarqalis hi": "Tarqalishi", "Davomi yligi": "Davomiyligi",
         "Nitrogli tserin": "Nitroglitserin", "Yondos h": "Yondosh", "Konfigura tsiya": "Konfiguratsiya",
         "Splenome galiya": "Splenomegaliya", "Trapetsiya simon": "Trapetsiyasimon", "Emboliya lar": "Emboliyalar",
         "Normosteni k": "Normostenik", "Konussimo n": "Konussimon", "Inglizc ha": "Inglizcha",
         "irradiatsiyalanu vchi": "irradiatsiyalanuvchi", "To‘mtoqlashg an": "To‘mtoqlashgan",
         "kuchayg an": "kuchaygan", "Popov- Savelyev": "Popov-Savelyev", "Vilson- Konovalov": "Vilson-Konovalov",
         "NT- proBNP": "NT-proBNP", "astasekin": "asta-sekin", "Astasekin": "Asta-sekin", "teztez": "tez-tez",
         "Teztez": "Tez-tez", "to‘mtoqtimpanik": "to‘mtoq-timpanik", "To‘mtoqtimpanik": "To‘mtoq-timpanik",
         "qo‘loyoqlar": "qo‘l-oyoqlar", "Qo‘loyoqlar": "Qo‘l-oyoqlar", "qizilo‘ngachme’da": "qizilo‘ngach-me’da",
         "tashhis": "tashxis", "Tashhis": "Tashxis", "TASHHIS": "TASHXIS",
         "Mikroaspiratsi ya": "Mikroaspiratsiya", "Makroaspiratsi ya": "Makroaspiratsiya",
         "Kompressio n": "Kompression", "Balg‘a m": "Balg‘am", "cho‘qqiorqa": "cho‘qqi-orqa",
         "Joylashu vi": "Joylashuvi", "Bosgand a chuqurc ha": "Bosganda chuqurcha", "Chegar a": "Chegara",
         "(5– 25 yosh)": "(5–25 yosh)", "1– 2 sm": "1–2 sm", "0,02– 0,04 s": "0,02–0,04 s", "har 3– 4 haftada": "har 3–4 haftada"}


# asl matndagi ma'no/imlo xatolari (asl PDF va darsliklar bilan solishtirib topilgan)
TEXT = {
    "(“spat-poraspat”)": "(“spat — pora — spat”)",
    "Erta sistolik (izgish) toni": "Erta sistolik (haydash) toni",          # rus. "тон изгнания"
    "Past, g‘ichirlovchi, presistolada": "Past, g‘uvullovchi, presistolada",  # mitral stenoz shovqini — g'uvullovchi
    "o‘sishrivojlanish": "o‘sish-rivojlanish",
    "Grip epidemiyasi": "Gripp epidemiyasi",
    # bo'yin venasi: me'yor to'sh burchagidan 3 sm gacha (keyingi qutidagi bilan bir xil)
    "to‘sh burchagidan **4 sm dan yuqori** bo‘lsa, markaziy venoz bosim oshgan":
        "to‘sh burchagidan **3 sm dan yuqori** bo‘lsa, markaziy venoz bosim oshgan",
    "Katta boldir nervi falaji": "Kichik boldir nervi falaji",          # stepaj — n. peroneus
    "qo‘ziqorin yeganda og‘riq kuchayishi": "nordon ovqat yeganda og‘riq kuchayishi",   # so'lak bezi toshi
    "**O**’sma": "**O‘**sma",
    "Bel aylanasining son aylanasiga nisbati": "Bel aylanasining bo‘ksa aylanasiga nisbati",
    "IgAvaskulit": "IgA-vaskulit",
    "(Grave kasalligida)": "(Greyvs kasalligida)",
    "Rus va ingliz adabiyotlarida (Grebenev, Mukhin)": "Rus adabiyotida (Grebenev, Muxin)",
    "jigarrangqizg‘ish": "jigarrang-qizg‘ish",
    "(qizil va kulrang jigarlanish bosqichi)": "(qizil jigarlanish bosqichi)",   # zangsimon balg'am
    "5– 6 sm": "5–6 sm",
    "(G. Sokolov, F. Yanovskiy, M. Obraztsov)": "(G. Sokolov, F. Yanovskiy, V. Obraztsov)",   # V.P. Obraztsov
    "qiyosiy perkussiya o‘ng tomonda faqat III": "qiyosiy perkussiya faqat III",
    "O‘rtach a": "O‘rtacha",
    "Ekssudati v": "Ekssudativ",
    "Obstrukti v": "Obstruktiv",
    "Me’yor ga qaytadi": "Me’yorga qaytadi",
    # astma balg'ami mnemonikasi: "3E" yo'q, uchinchi harf Sh (Sharko)
    "**“3E + K + S”**: **E**ozinofillar, **K**urshman spirallari, **S**harko-Leyden":
        "**“E + K + Sh”**: **E**ozinofillar, **K**urshman spirallari, **Sh**arko-Leyden",
    "beta~2~- agonistlar": "beta~2~-agonistlar",
    "beta2agonistlar": "beta2-agonistlar",
    "(“pufflovchi” bemor)": "(“puflovchi” bemor)",
    "NChHH1/ O‘FHS": "NChHH1/O‘FHS",
    "FEV1/ FVC": "FEV1/FVC",
    "Asosiy ta’sirlovchi oqsil": "Asosiy ishqoriy oqsil",   # major basic protein
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
log.append(f"{split_tables()} ta sahifaga bo'lingan jadval tiklandi")
log.append(f"{renumber()} ta kichik sarlavha raqami tuzatildi")
cnt = [0]
walk(d, cnt)
log.append(f"{cnt[0]} ta matn tozalandi")

with open(PATH, "w", encoding="utf8") as f:
    json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
print("\n".join(log))
