"""python3 tools/i18n/fzl_fix_source.py [--en data/en/subjects/fzl.json]
Normal fiziologiya (fzl) kitobidagi manba xatolarini tuzatadi (tools/i18n/books/fzl/pending_uz.txt asosida).

Tarjima paytida inglizcha matnda manbadagi buzilishlar (bo'lingan so'zlar, bold ichidagi bo'shliq, bo'lingan
xatboshilar) ataylab aynan takrorlangan — shuning uchun tuzatishlar --en berilsa inglizcha faylga ham
qo'llanadi:
 1) LIT_UZ / LIT_EN — har bir tilga xos matn almashtirishlar (bo'lingan so'zlar, yo'qolgan darajalar va
    indekslar: 10^9^, πr^4^, NH~4~^+^, I~f~ ...);
 2) ikkala tilda: chiziqcha/tire dan keyingi ortiqcha bo'shliq ("N- xolino", "0,6– 0,7"), ikkitalik
    bo'shliqlar, ** ichidagi chetki bo'shliqlar;
 3) ikkala tilda bir xil o'rinda: sahifa chegarasida bo'lingan xatboshi/ro'yxat bandlarini birlashtirish,
    bitta xatboshiga qo'shilib ketgan "3.", "5.", "•" bandlarini ajratish, jadvallarning bo'lingan
    qatorlari, jadval ostida qolgan takroriy sarlavhalar va jadvalga kirib qolgan xatboshi;
 4) mashg'ulot maqsadidagi "Talaba bajara olishi kerak:" sarlavhasini ajratish.
Shundan keyin: python3 tools/i18n/book_resync.py fzl. Qayta ishga tushirilsa hech narsa o'zgarmaydi."""
import json, re, sys

PATH = "data/subjects/fzl.json"
uz = json.load(open(PATH, encoding="utf8"))
en_path = sys.argv[sys.argv.index("--en") + 1] if "--en" in sys.argv else None
en = json.load(open(en_path, encoding="utf8")) if en_path else None
log = []
cnt = {}

# ---------- 1) matn almashtirishlar ----------
COMMON = [
    ("65 × 10 9/l", "65 × 10^9^/l"), ("πr4", "πr^4^"), ("1011–1012 /g", "10^11^–10^12^ /g"),
    ("10-11 g", "10^-11^ g"), ("NH~4~ +", "NH~4~^+^"), ("(Th10)", "(Th~10~)"),
    ("CO~2~ + H~2~O H ⇄ 2CO3", "CO~2~ + H~2~O ⇄ H~2~CO~3~"), ("I~K- ACh~", "I~K-ACh~"),
]
LIT_UZ = COMMON + [
    ("10-7 dan 10-5 mol/l", "10^-7^ dan 10^-5^ mol/l"),
    ("Qo‘zg‘aluvchanl ik", "Qo‘zg‘aluvchanlik"), ("Qo‘zg‘aluvch anlik", "Qo‘zg‘aluvchanlik"),
    ("ko‘ndalangtarg‘il", "ko‘ndalang-targ‘il"), ("oqsiltuz", "oqsil-tuz"), ("Zanjirla ri", "Zanjirlari"),
    ("Creaktiv", "C-reaktiv"), ("Davomiyli gi", "Davomiyligi"), ("(AVo‘tkazuvchanlik)", "(AV-o‘tkazuvchanlik)"),
    ("I (sistolik )", "I (sistolik)"), ("II (diastoli k)", "II (diastolik)"), ("AVtugunda", "AV-tugunda"),
    ("If (“g‘alati”)", "I~f~ (“g‘alati”)"), ("— If va", "— I~f~ va"), ("If tok", "I~f~ tok"),
    ("Adenogipofi z", "Adenogipofiz"), ("Chujayralari", "C-hujayralari"), ("Kamaytir adi", "Kamaytiradi"),
    ("Koptok chali", "Koptokchali"), ("To‘rsim on", "To‘rsimon"), ("(deskvamatsiy a)", "(deskvamatsiya)"),
    ("Retsept orlar", "Retseptorlar"), ("Markazi y", "Markaziy"), ("Periferi k", "Periferik"),
    ("Obstruk tiv", "Obstruktiv"), ("Restrikt iv", "Restriktiv"), ("Proporsion al", "Proporsional"),
    ("Proteoli tik", "Proteolitik"), ("Amiloli tik", "Amilolitik"), ("Lipoliti k", "Lipolitik"),
    ("Nukleol itik", "Nukleolitik"), ("murakkabreflektor", "murakkab reflektor"), ("Yo‘nali shi", "Yo‘nalishi"),
    ("Ko‘taril uvchi", "Ko‘tariluvchi"), ("Tushuv chi", "Tushuvchi"), ("mushakbo‘g‘im", "muskul-bo‘g‘im"),
    ("kollateraldari", "kollaterallari"), ("GAMKA", "GAMK~A~"),
    ("arximozjechok, paleomozjechok, neomozjechok", "arxitserebellum, paleotserebellum, neotserebellum"),
    ("Vestibulotserebellu m", "Vestibulotserebellum"), ("xulqatvori", "xulq-atvori"),
    ("ketmaketligi", "ketma-ketligi"), ("β~3~adrenoretseptorlar", "β~3~-adrenoretseptorlar"),
    ("Retsepto r", "Retseptor"), ("βhujayralari", "β-hujayralari"), ("Achchi q", "Achchiq"),
    ("**chrezteri elektr neyrostimulyatsiya (TENS)**", "**teri orqali (transkutan) elektr neyrostimulyatsiya (TENS)**"),
    ("Kkomplekslar", "K-komplekslar"), ("MNT siz", "MNTsiz"),
    ("**Doimiy pozitsion vertigo**", "**Xavfsiz (benign) pozitsion vertigo**"),
    ("18–19- maydonlar", "18–19-maydonlar"),
]
LIT_EN = COMMON + [
    ("from 10-7 to 10-5 mol/l", "from 10^-7^ to 10^-5^ mol/l"),
    ("Creactive", "C-reactive"), ("(AVconduction)", "(AV conduction)"), ("I (systolic )", "I (systolic)"),
    ("II (diastoli c)", "II (diastolic)"), ("AVnode", "AV node"),
    ("If (“funny”)", "I~f~ (“funny”)"), ("the If and", "the I~f~ and"), ("If current", "I~f~ current"),
    ("Adenohypophysi s", "Adenohypophysis"), ("Thyroid Ccells", "Thyroid C cells"), ("Decreas es", "Decreases"),
    ("Glomerul osa", "Glomerulosa"), ("Reticul aris", "Reticularis"), ("(desquamatio n)", "(desquamation)"),
    ("Recept ors", "Receptors"), ("Centra l", "Central"), ("Periphera l", "Peripheral"),
    ("Obstruc tive", "Obstructive"), ("Restric tive", "Restrictive"), ("Proportion ally", "Proportionally"),
    ("Proteoly tic", "Proteolytic"), ("Amyloly tic", "Amylolytic"), ("Lipolyti c", "Lipolytic"),
    ("Nucleol ytic", "Nucleolytic"), ("Directi on", "Direction"), ("Ascen ding", "Ascending"),
    ("Descen ding", "Descending"), ("Vestibulocerebellu m", "Vestibulocerebellum"),
    ("β~3~adrenergic", "β~3~-adrenergic"), ("Recepto r", "Receptor"), ("βcells", "β cells"),
    ("Bitte r", "Bitter"), ("Kcomplexes", "K-complexes"), ("GABAA", "GABA~A~"),
    ("(G- cells", "(G cells"), ("(ECL- cells", "(ECL cells"), ("in β- cells", "in β cells"),
    ("M- receptors", "M receptors"), ("3- tube — water only", "tube 3 — water only"),
    ("at the 1- minute after standing up", "1 minute after standing up"),
    ("areas 18–19- are", "areas 18–19 are"), ("tubulo- glomerular", "tubuloglomerular"),
]
# chiziqcha/tire dan keyingi ortiqcha bo'shliq ("α- va β-" kabi osma chiziqchalar bundan mustasno)
DASH = re.compile(r"(?<=[^\s(\"])([-–]) (?!(?:va|yoki|and|or|to)\b)(?=\S)")


def bold_spaces(s):
    """** ichidagi chetki bo'shliqlarni tashqariga chiqaradi (faqat ** juft bo'lsa)."""
    if "**" not in s or s.count("**") % 2:
        return s
    parts = s.split("**")
    for i in range(1, len(parts), 2):
        b = parts[i]
        lead, trail = len(b) - len(b.lstrip()), len(b) - len(b.rstrip())
        if lead or trail:
            parts[i] = b.strip()
            if lead:
                parts[i - 1] += " "
            if trail:
                parts[i + 1] = " " + parts[i + 1]
    return "**".join(parts)


def fix_text(s, lit):
    for a, b in lit:
        if a in s:
            cnt[a] = cnt.get(a, 0) + s.count(a)
            s = s.replace(a, b)
    t = DASH.sub(r"\1", s)
    t = bold_spaces(re.sub(r"(?<=\S)  +", " ", t))
    t = re.sub(r"(?<=\S)  +", " ", t)
    if t != s:
        cnt["bo'shliq/chiziqcha"] = cnt.get("bo'shliq/chiziqcha", 0) + 1
    return t


def walk(o, lit):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("id", "type", "kind", "src"):
                continue
            if isinstance(v, str):
                o[k] = fix_text(v, lit)
            else:
                walk(v, lit)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str):
                o[i] = fix_text(v, lit)
            else:
                walk(v, lit)


walk(uz, LIT_UZ)
if en is not None:
    walk(en, LIT_EN)

# ---------- 3) tuzilma ----------
# uya: ("b", massiv, i) — matnli blok (p/sub/h/quti qismi); ("i", items, j, massiv, i) — ro'yxat bandi


def slots(o, out=None):
    if out is None:
        out = []
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("blocks", "parts") and isinstance(v, list):
                for i, b in enumerate(v):
                    if isinstance(b, dict) and isinstance(b.get("text"), str):
                        out.append(("b", v, i))
                    elif isinstance(b, dict) and b.get("type") == "list":
                        for j in range(len(b["items"])):
                            out.append(("i", b["items"], j, v, i))
                    elif isinstance(b, dict) and b.get("type") == "box":
                        slots(b, out)
            elif isinstance(v, (dict, list)):
                slots(v, out)
    elif isinstance(o, list):
        for x in o:
            slots(x, out)
    return out


def get(s):
    return s[1][s[2]] if s[0] == "i" else s[1][s[2]]["text"]


def put(s, t):
    if s[0] == "i":
        s[1][s[2]] = t
    else:
        s[1][s[2]]["text"] = t


def delete(s):
    if s[0] == "i":
        s[1].pop(s[2])
        if not s[1]:
            s[3].pop(s[4])
    else:
        s[1].pop(s[2])


def glue(a, b):
    """Sahifa chegarasida bo'lingan ikki bo'lakni qo'shadi; bo'linish joyidagi ion zaryadini tiklaydi
    (HCO~3~ + "- ni" -> HCO~3~^-^ ni; H~2~PO~4~ + "-)." -> H~2~PO~4~^-^).)."""
    a, b = a.rstrip(), b.lstrip()
    if re.search(r"~\d+~$", a) and re.match(r"-(?=[\s).,;]|$)", b):
        a, b = a + "^-^", b[1:].lstrip()
    if not b:
        t = a
    elif a.endswith("-") and b[0].isdigit():
        t = a + b
    elif b[0] in ";,.)]":
        t = a + b
    else:
        t = a + " " + b
    return t.replace("** **", " ")


def find(doc_slots, prefixes):
    for i in range(len(doc_slots) - len(prefixes) + 1):
        if all(get(doc_slots[i + k]).startswith(p) for k, p in enumerate(prefixes)):
            return i
    return None


def both(fn, name):
    """fn(slots_list, i) ni uz va (bo'lsa) en hujjatga bir xil o'rinda qo'llaydi."""
    su = slots(uz)
    i = fn.locate(su)
    if i is None:
        return
    fn(su, i)
    if en is not None:
        fn(slots(en), i)
    log.append(name)


class merge:
    def __init__(self, prefixes):
        self.p = prefixes

    def locate(self, su):
        return find(su, self.p)

    def __call__(self, ss, i):
        t = get(ss[i])
        for k in range(1, len(self.p)):
            t = glue(t, get(ss[i + k]))
        put(ss[i], t)
        for k in range(len(self.p) - 1, 0, -1):
            delete(ss[i + k])


class split:
    """Ro'yxat bandidagi matnni sep (masalan, " 3. ") bo'yicha qo'shni bandlarga ajratadi."""

    def __init__(self, prefix, seps):
        self.p, self.seps = prefix, seps

    def locate(self, su):
        i = find(su, [self.p])
        return i if i is not None and su[i][0] == "i" and self.seps[0] in get(su[i]) else None

    def __call__(self, ss, i):
        s = ss[i]
        pieces = [get(s)]
        for sep in self.seps:
            last = pieces.pop()
            pieces += [x.strip() for x in last.split(sep, 1)]
        s[1][s[2]:s[2] + 1] = pieces


OPS = [
    (merge(["Har faza ostiga uning ion mexanizmini", "chiqishi). 5. Grafik ostida"]), "s0260+s0261"),
    (split("Har faza ostiga uning ion mexanizmini", [" 5. "]), "s0261 -> 5-band"),
    (merge(["**Akkomodatsiya** — sekin ortib boruvchi", "oqimi yuzaga kelmaydi."]), "s0482+s0483"),
    (merge(["**Miyelinli tolada** — **saltator", "bo‘g‘ilmadan keyingisiga"]), "s0740+s0741"),
    (merge(["N.Ye. Vvedenskiy (1901) nervning", "**parabioz** (“hayot yonida”)"]), "s0766+s0767"),
    (merge(["T-naychadagi potensialga sezgir", "kanallari) ochadi. 3."]), "s1048+s1049"),
    (split("T-naychadagi potensialga sezgir", [" 3. ", " 4. "]), "s1049 -> 3-, 4-band"),
    (merge(["Tetanusda qisqarish amplitudasi", "yuqori konsentratsiyada doimiy"]), "s1095+s1096"),
    (merge(["Qon pH i juda qattiq gomeostatik", "- ni qayta so‘rish)"]), "s1415+s1416"),
    (merge(["**AB0 tizimidan farqi:**", "odamda faqat Rh^+^"]), "s2701+s2702"),
    (merge(["**Ishchi kardiomiotsitlarda** harakat", "chiqadi); **4**"]), "s2908+s2909"),
    (merge(["Qo‘zg‘alish yurakda **kardiomiotsitlararo", "Purkinye tolalarida 2–4 m/s"]), "s2919+s2920"),
    (merge(["**Rid formulasi** — asosiy almashinuvning", "formula qalqonsimon bez"]), "s3809+s3810"),
    (merge(["**Gormonlarning umumiy xossalari:**", "12–10-6 mol/l"]), "s3868+s3869"),
    (merge(["**Temir** — o‘n ikki barmoq ichakda", "ni qaytaradi); gem temiri"]), "s5634+s5635"),
    (split("**Temir** — o‘n ikki barmoq ichakda", [" • ", " • "]), "s5635 -> B12, ADEK bandlari"),
    (merge(["Yo‘g‘on ichakda harakatlar sekin:", "**refleks**) — **kuchli"]), "s5657+s5658"),
    (merge(["**H^+^ sekretsiyasi** va uning **fosfat", "-). 3. **Ammoniogenez**"]), "s6206+s6207"),
    (split("**H^+^ sekretsiyasi** va uning **fosfat", [" 3. "]), "s6207 -> 3-band"),
    (merge(["**Tormozlovchi postsinaptik potensial (TPSP)**", "chiqishi); mediatorlar"]), "s6395+s6396"),
    (merge(["10–20 s dan keyin paydo bo‘lgan chiziq", "o‘tkazuvchanligining oshishi."]), "s7473+s7474"),
    (merge(["**Kinetoz (harakat kasalligi)**", "aylanishi) — otolitlar"]), "s7999+s8000"),
]
for op, name in OPS:
    both(op, name)
for doc in (uz, en):   # "10^-12^–10^-6^" — birlashtirilgandan keyin
    if doc is None:
        continue
    for s in slots(doc):
        t = get(s)
        if "— 10-12–10-6 mol/l" in t:
            put(s, t.replace("— 10-12–10-6 mol/l", "— 10^-12^–10^-6^ mol/l"))


# --- jadvallar: uz va en bloklar massivlari parallel ---
def block_lists(a, b):
    """uz va en hujjatlaridagi bir xil o'rindagi 'blocks' massivlari juftlari."""
    if isinstance(a, dict):
        for k, v in a.items():
            if k == "blocks" and isinstance(v, list):
                yield v, (b[k] if b is not None else None)
            if isinstance(v, (dict, list)):
                yield from block_lists(v, b[k] if b is not None else None)
    elif isinstance(a, list):
        for i, v in enumerate(a):
            yield from block_lists(v, b[i] if b is not None else None)


def tables(title_prefix):
    for L, M in block_lists(uz, en):
        for i, bl in enumerate(L):
            if bl.get("type") == "table" and bl.get("title", "").startswith(title_prefix):
                yield L, M, i


def join_cells(x, y):
    return [glue(p, q) if p and q else (p or q) for p, q in zip(x, y)]


def row_merge(title_prefix, first_cell):
    """first_cell bilan boshlanuvchi qatorga keyingi (davomi bo'lgan) qatorni kataklar bo'yicha qo'shadi."""
    for L, M, i in tables(title_prefix):
        rows = L[i]["rows"]
        for r in range(len(rows) - 1):
            if rows[r][0] == first_cell and sum(1 for c in rows[r + 1] if c) < len(rows[r + 1]):
                for D in (L, M):
                    if D is None:
                        continue
                    R = D[i]["rows"]
                    R[r] = join_cells(R[r], R[r + 1])
                    R.pop(r + 1)
                log.append(f"jadval qatori: {title_prefix} / {first_cell}")
                return


row_merge("Jadval 4.1.", "Ca^2+^ ni")
row_merge("Jadval 24.3.", "Statik — holat")

# Jadval 1.6: sarlavha davomi ("mmol/l)") jadval oldidagi alohida xatboshida
for L, M, i in tables("Jadval 1.6."):
    if i > 0 and L[i - 1].get("type") == "p" and L[i - 1]["text"] == "mmol/l)":
        for D in (L, M):
            if D is not None:
                D[i]["title"] = glue(D[i]["title"], D[i - 1]["text"])
                D.pop(i - 1)
        log.append("Jadval 1.6 sarlavhasi")

# Jadval 15.6: insulin haqidagi xatboshi jadval qatorlariga kirib qolgan -> jadvaldan keyin xatboshi
for L, M, i in tables("Jadval 15.6."):
    rows = L[i]["rows"]
    r0 = next((r for r, row in enumerate(rows) if row[0].startswith("Insulin — organizmdagi")), None)
    if r0 is not None:
        for D in (L, M):
            if D is None:
                continue
            tail = D[i]["rows"][r0:]
            del D[i]["rows"][r0:]
            text = ""
            for row in tail:
                for c in row:
                    if c:
                        text = glue(text, c) if text else c
            D.insert(i + 1, {"type": "p", "text": text})
        log.append("Jadval 15.6: insulin xatboshisi")

# Jadval 18.1: jadval ostida takrorlangan sarlavha
for L, M, i in tables("Jadval 18.1."):
    if i + 1 < len(L) and L[i + 1].get("text") == "**Vazifa Mazmuni**":
        for D in (L, M):
            if D is not None:
                D.pop(i + 1)
        log.append("Jadval 18.1 takroriy sarlavha")

# Jadval 26.2: takroriy sarlavha + oxirgi katakning davomi
for L, M, i in tables("Jadval 26.2."):
    if i + 2 < len(L) and L[i + 1].get("text", "").startswith("**Nerv Markaz Innervatsiya"):
        for D in (L, M):
            if D is not None:
                last = D[i]["rows"][-1]
                last[-1] = glue(last[-1], D[i + 2]["text"])
                del D[i + 1:i + 3]
        log.append("Jadval 26.2 oxirgi qator")

# Jadval 27.3: takroriy sarlavha + "Astigmatizm" qatori ikki xatboshiga yopishgan
for L, M, i in tables("Jadval 27.3."):
    if i + 3 < len(L) and L[i + 1].get("text", "").startswith("**Turi Mohiyati"):
        for D, w1, w2 in ((L, "Astigmatizm", "Bir nechta fokus"), (M, "Astigmatism", "Several foci")):
            if D is None:
                continue
            a, b = D[i + 2]["text"], D[i + 3]["text"]
            assert a.startswith(w1 + " ") and b.startswith(w2 + " "), (a, b)
            D[i]["rows"].append([w1, a[len(w1) + 1:], w2, b[len(w2) + 1:]])
            del D[i + 1:i + 4]
        log.append("Jadval 27.3 astigmatizm qatori")

# ---------- 4) maqsad: "... **Talaba bajara olishi kerak:**" birinchi ro'yxatning oxirgi bandiga yopishgan ----------
GSUB = re.compile(r"\s*\*\*([^*]+:)\*\*$")
for doc in (uz, en):
    if doc is None:
        continue
    k = 0
    for tp in doc["topics"]:
        g = tp.get("goals", [])
        for j in range(len(g) - 1):
            if g[j]["type"] == "list" and g[j + 1]["type"] == "list" and g[j]["items"]:
                m = GSUB.search(g[j]["items"][-1])
                if m:
                    g[j]["items"][-1] = g[j]["items"][-1][:m.start()]
                    g.insert(j + 1, {"type": "sub", "text": m.group(1)})
                    k += 1
                    break
    if k:
        log.append(f"maqsad: 'bajara olishi kerak' sarlavhasi ajratildi ({k})")

for doc, path in ((uz, PATH), (en, en_path)):
    if doc is None:
        continue
    raw = open(path, encoding="utf8").read()
    with open(path, "w", encoding="utf8") as f:
        if raw.startswith("{\n"):
            json.dump(doc, f, ensure_ascii=False, indent=1)
        else:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        if raw.endswith("\n"):
            f.write("\n")
print("matn:", cnt or "o'zgarish yo'q")
print("tuzilma:", log or "o'zgarish yo'q")
