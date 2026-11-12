"""python3 tools/i18n/bkm_fix_source.py [--en data/en/subjects/bkm.json]
Biokimyo (bkm) kitobidagi manba (o'zbekcha) xatolarini tuzatadi. Xatolar tarjima paytida
tools/i18n/books/bkm/pending_uz.txt ga yozib borilgan; skript tarjima tugagach ishga tushiriladi.

Tuzatiladigan xatolar:
 1) jadval kataklarida bo'linib qolgan so'zlar ("Uglevodl ar", "Konyugatsiyal anmagan"), tushib qolgan
    chiziqchalar ("βoksidlanish", "6merkaptopurin"), chiziqchadan keyingi ortiqcha bo'shliq ("β- gidroksi",
    "L- DOFA"), yo'qolgan darajalar va indekslar (10^9^, 2^n^, ^13^C, B~1~, NH~4~^+^), allel belgilari
    (UGT1A1*28, ALDG2*2), imlo ("induktsiya" -> "induksiya");
 2) ** ichidagi chetki bo'shliqlar ("**Fruktozamin **" -> "**Fruktozamin**") va ikkitalik bo'shliqlar;
 3) sahifa chegarasida bo'linib qolgan xatboshilar, ro'yxat bandlari va qutilar birlashtiriladi; bo'linish
    joyidagi ion zaryadlari tiklanadi (HCO3 + "-" -> HCO~3~^−^); Genderson–Gasselbax, CO2 tashilishi va
    antioksidant himoya bo'limlarida aralashib ketgan tartib tiklanadi;
 4) bitta xatboshiga qo'shilib ketgan "•", "–" va raqamli ro'yxat bandlari alohida bandlarga ajratiladi.

--en berilsa, 3–4-banddagi tuzilma o'zgarishlari inglizcha JSON'ga ham aynan shu o'rinlarda qo'llanadi
(ikkala fayl tuzilmasi bir xil bo'lishi kerak) — shundan keyin tools/i18n/book_resync.py bkm 15000
tarjimalarni yangi kalitlarga ko'chiradi. 1–2-band faqat o'zbekcha matnga tegishli.
Qayta ishga tushirilsa hech narsa o'zgarmaydi.
"""
import json, re, sys

PATH = "data/subjects/bkm.json"
uz = json.load(open(PATH, encoding="utf8"))
en_path = sys.argv[sys.argv.index("--en") + 1] if "--en" in sys.argv else None
en = json.load(open(en_path, encoding="utf8")) if en_path else None
log = []

# ---------- 1) matn almashtirishlar (faqat uz) ----------
LIT = [
    # jadval kataklarida bo'lingan so'zlar
    ("Uglevodl ar", "Uglevodlar"), ("Kompl eks", "Kompleks"), ("Galaktotserebrozid aza", "Galaktotserebrozidaza"),
    ("Mitoxondri ya", "Mitoxondriya"), ("Karbamoilfosfatsint etaza", "Karbamoilfosfatsintetaza"),
    ("Ornitinkarbamoiltra nsferaza", "Ornitinkarbamoiltransferaza"),
    ("Argininosuktsinatsin tetaza", "Argininosuktsinatsintetaza"),
    ("Argininosuktsinatlia za", "Argininosuktsinatliaza"), ("Gemoxrom atoz", "Gemoxromatoz"),
    ("Konyugatsiyal anmagan", "Konyugatsiyalanmagan"), ("Konyugatsiyal angan", "Konyugatsiyalangan"),
    ("Bosqic h", "Bosqich"), ("Protonla r", "Protonlar"), ("Albumi n", "Albumin"), ("Sekinro q", "Sekinroq"),
    ("Cho‘qq i", "Cho‘qqi"), ("Prokarboksipepti dazalar", "Prokarboksipeptidazalar"),
    ("UDFglukuroniltransfera zalar", "UDF-glukuroniltransferazalar"), ("Xondroitinsulfat lar", "Xondroitinsulfatlar"),
    ("Neyropeptidla r", "Neyropeptidlar"), ("endokannabin oidlar", "endokannabinoidlar"),
    ("5’dezoksiadenozilkobalami n", "5’-dezoksiadenozilkobalamin"),
    # tushib qolgan chiziqchalar
    ("βoksidlanish", "β-oksidlanish"), ("αketoglutarat", "α-ketoglutarat"), ("glyukoza-6fosfat", "glyukoza-6-fosfat"),
    ("1,25digidroksi", "1,25-digidroksi"), ("NADH:KoQoksidoreduktaza", "NADH:KoQ-oksidoreduktaza"),
    ("sitoxrom coksidoreduktaza", "sitoxrom c-oksidoreduktaza"), ("ATFsintazani", "ATF-sintazani"),
    ("Suvelektrolit", "Suv-elektrolit"), ("ketmaketliklar", "ketma-ketliklar"), ("startkodondan", "start-kodondan"),
    ("burunhalqum", "burun-halqum"), ("α2makroglobulin", "α2-makroglobulin"), ("Mgradient", "M-gradient"),
    ("Xbog‘langan", "X-bog‘langan"), ("Natsetilglyukozamin", "N-atsetilglyukozamin"), ("αaktinin", "α-aktinin"),
    ("Lhujayralari", "L-hujayralari"), ("3holatlar", "3-holatlar"), ("5’nukleotidaza", "5’-nukleotidaza"),
    ("5’fosfosulfat", "5’-fosfosulfat"), ("Glutation-Stransferazalar", "Glutation-S-transferazalar"),
    ("Natsetiltransferazalar", "N-atsetiltransferazalar"), ("6merkaptopurin", "6-merkaptopurin"),
    ("nishonhujayralarga", "nishon hujayralarga"), ("βendorfin", "β-endorfin"), ("αhujayralar", "α-hujayralar"),
    ("G-6fosfataza", "G-6-fosfataza"), ("25gidroksillanish", "25-gidroksillanish"),
    ("1αgidroksillanish", "1α-gidroksillanish"), ("magniyammoniy-fosfat", "magniy-ammoniy-fosfat"),
    ("5gidroksitriptofan", "5-gidroksitriptofan"), ("GAMKtransaminaza", "GAMK-transaminaza"),
    # chiziqchadan keyingi ortiqcha bo'shliq
    ("atsetil- KoA", "atsetil-KoA"), ("Vernike– Korsakov", "Vernike–Korsakov"), ("o‘z- o‘zidan", "o‘z-o‘zidan"),
    ("Insulin– kontrinsulyar", "Insulin–kontrinsulyar"), ("β- gidroksibutirat", "β-gidroksibutirat"),
    ("3- sutkada", "3-sutkada"), ("RNK- polimeraza", "RNK-polimeraza"), ("BCR- ABL", "BCR-ABL"),
    ("ketma- ketligini", "ketma-ketligini"), ("A- fragmenti", "A-fragmenti"), ("γ- globin", "γ-globin"),
    ("Li– Fraumeni", "Li–Fraumeni"), ("E- kadgerin", "E-kadgerin"), ("Bens- Jons", "Bens-Jons"),
    ("P- glikoprotein", "P-glikoprotein"), ("(7– 13 %)", "(7–13 %)"), ("(8– 14 %)", "(8–14 %)"),
    ("(12– 22 %)", "(12–22 %)"), ("deoksi- Hb", "deoksi-Hb"), ("qizil- qo‘ng‘ir", "qizil-qo‘ng‘ir"),
    ("ALK- sintazani", "ALK-sintazani"), ("(45– 77 mkmol/l)", "(45–77 mkmol/l)"),
    ("autosom- dominant", "autosom-dominant"), ("autosom- retsessiv", "autosom-retsessiv"),
    ("2,0– 3,0", "2,0–3,0"), ("α- spiralga", "α-spiralga"), ("N- atsetilglyukozamin", "N-atsetilglyukozamin"),
    ("(– COO-", "(–COO-"), ("99- persentilidan", "99-persentilidan"), ("H2- retseptor", "H2-retseptor"),
    ("5- aminosalitsilatlar", "5-aminosalitsilatlar"), ("Krigler– Nayyar", "Krigler–Nayyar"),
    ("Jendrashik– Grof", "Jendrashik–Grof"), ("17- gidroksi", "17-gidroksi"), ("UDF- glukuroniltransferaza",
    "UDF-glukuroniltransferaza"), ("β- glukuronidaza", "β-glukuronidaza"), ("α- ketoglutarat", "α-ketoglutarat"),
    ("Test- chiziq", "Test-chiziq"), ("p- dimetilaminobenzaldegid", "p-dimetilaminobenzaldegid"),
    ("oziq- ovqat", "oziq-ovqat"), ("b5- reduktaza", "b5-reduktaza"), ("gliserol-3- fosfat", "gliserol-3-fosfat"),
    ("JAK- STAT", "JAK-STAT"), ("gormon- retseptor", "gormon-retseptor"), ("α- subbirligi", "α-subbirligi"),
    ("2- haftada", "2-haftada"), ("(23- mavzu)", "(23-mavzu)"), ("(14- mavzu)", "(14-mavzu)"),
    ("C- peptid", "C-peptid"), ("kislota- asos", "kislota-asos"), ("para- aminogippurat", "para-aminogippurat"),
    ("L- DOFA", "L-DOFA"), ("GAMK- A", "GAMK-A"), ("(M- xolinoblokator)", "(M-xolinoblokator)"),
    ("11-sis- retinal", "11-sis-retinal"), ("cGMF- fosfodiesteraza", "cGMF-fosfodiesteraza"),
    ("DOFA- dekarboksilaza", "DOFA-dekarboksilaza"), ("M- xolinoretseptorlar", "M-xolinoretseptorlar"),
    ("7,1– 15,9 mmol", "7,1–15,9 mmol"), ("120– 130 mmol/l", "120–130 mmol/l"), ("0,15– 0,45 g/l", "0,15–0,45 g/l"),
    ("Yuzlab– minglab", "Yuzlab–minglab"), ("Fe 2+", "Fe2+"),
    # imlo
    ("induktsiyalan", "induksiyalan"), ("Gemoxrom atoz", "Gemoxromatoz"),
    # darajalar, indekslar, ionlar
    ("108–1012 marta", "10^8^–10^12^ marta"), ("3,1 × 109", "3,1 × 10^9^"), ("10-9–10-10", "10^−9^–10^−10^"),
    ("≈ 2n marta", "≈ 2^n^ marta"), ("72 °C; Taq-polimeraza; 2n nusxa", "72 °C; Taq-polimeraza; 2^n^ nusxa"),
    ("β0-talassemiya", "β^0^-talassemiya"), ("β+-talassemiya", "β^+^-talassemiya"),
    ("O6-metilguanin", "O^6^-metilguanin"), ("aflatoksin B1", "aflatoksin B~1~"),
    ("18F-ftordezoksiglyukoza", "^18^F-ftordezoksiglyukoza"), ("13C-siydikchil", "^13^C-siydikchil"),
    ("(1014 hujayra)", "(10^14^ hujayra)"), ("(10-7 → 10-5 M)", "(10^−7^ → 10^−5^ M)"),
    ("(10-6–10-12 M)", "(10^−6^–10^−12^ M)"), ("1,25(OH)2D3", "1,25(OH)~2~D~3~"),
    ("PrPC ", "PrP^C^ "), ("PrPSc ", "PrP^Sc^ "), ("NH4 +", "NH~4~^+^"),
    # allellar (** juft emas edi)
    ("*UGT1A128**", "**UGT1A1*28**"), ("*ALDG22**", "**ALDG2*2**"), ("oshadi).** Disulfiram** ALDG ni",
    "oshadi). **Disulfiram** ALDG ni"),
]
RX = [
    (r"M-tipdagi izofermentlar \(LDG-$", "M-tipdagi izofermentlar (LDG-4, LDG-5)"),  # keyingi qator tushib qolgan
]
cnt = {}


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
    out = "**".join(parts)
    return re.sub(r"(?<=\S)  +", " ", out).strip()


def fix_text(s):
    for a, b in LIT:
        if a in s:
            cnt[a] = cnt.get(a, 0) + s.count(a)
            s = s.replace(a, b)
    for a, b in RX:
        s, n = re.subn(a, b, s)
        if n:
            cnt[a] = cnt.get(a, 0) + n
    t = bold_spaces(re.sub(r"(?<=\S)  +", " ", s))
    if t != s:
        cnt["bo'shliqlar"] = cnt.get("bo'shliqlar", 0) + 1
    return t


def walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("id", "type", "kind", "src"):
                continue
            if isinstance(v, str):
                o[k] = fix_text(v)
            else:
                walk(v)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str):
                o[i] = fix_text(v)
            else:
                walk(v)


walk(uz)

# ---------- 3–4) tuzilma: matn "uyalari" hujjat tartibida ----------
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


ION = re.compile(r"((?:\d*(?:[A-Z][a-z]?\d*)+))$")
CHG = re.compile(r"^(2-|2−|−|-|\+)(?=[\s),;\]]|$)")


def glue(a, b):
    """Ikki bo'lakni qo'shadi; bo'linish joyidagi ion zaryadini tiklaydi (HCO3 + '-' -> HCO~3~^−^)."""
    a, b = a.rstrip(), b.lstrip()
    m, c = ION.search(a), CHG.match(b)
    if m and c:
        f = re.sub(r"([A-Za-z])(\d+)", r"\1~\2~", m.group(1))
        ch = c.group(1).replace("-", "−")
        a = a[: m.start()] + f + "^" + ch + "^"
        b = b[c.end():].lstrip()
    if not b:
        return a
    return a + ("" if b[0] in ";,.)]" else " ") + b


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
    """i..i+n-1 uyalarni bitta matnga birlashtiradi (order — qo'shish tartibi)."""

    def __init__(self, prefixes, order=None):
        self.p, self.order = prefixes, order or list(range(len(prefixes)))

    def locate(self, su):
        return find(su, self.p)

    def __call__(self, ss, i):
        texts = [get(ss[i + k]) for k in range(len(self.p))]
        t = texts[self.order[0]]
        for k in self.order[1:]:
            t = glue(t, texts[k])
        put(ss[i], t)
        for k in range(len(self.p) - 1, 0, -1):
            delete(ss[i + k])


class split:
    """Uyadagi matnni sep bo'yicha bandlarga ajratadi: ro'yxat bandi bo'lsa — qo'shni bandlar;
    xatboshi bo'lsa — xatboshi (birinchi bo'lak) + yangi ro'yxat (head=False bo'lsa hammasi ro'yxat)."""

    def __init__(self, prefix, sep, head=True, lead=None):
        self.p, self.sep, self.head, self.lead = prefix, sep, head, lead

    def locate(self, su):
        i = find(su, [self.p])
        return i if i is not None and self.sep in get(su[i]) else None

    def __call__(self, ss, i):
        s = ss[i]
        t = get(s)
        if self.lead and t.startswith(self.lead):
            t = t[len(self.lead):]
        sep = self.sep.strip()
        pieces = [x.strip() for x in re.split(re.escape(self.sep), t)]
        keep = self.sep.startswith(" ") and not self.sep.strip().startswith(("•", "3."))
        if keep and sep != "–":   # " – **" kabi ajratgichda ** qismini bo'lakda qoldirish
            pieces = [pieces[0]] + [sep.replace("–", "").strip() + x for x in pieces[1:]]
        if s[0] == "i":
            s[1][s[2]:s[2] + 1] = pieces
        elif self.head:
            s[1][s[2]]["text"] = pieces[0]
            s[1].insert(s[2] + 1, {"type": "list", "ordered": False, "items": pieces[1:]})
        else:
            s[1][s[2]] = {"type": "list", "ordered": False, "items": pieces}


class antiox:
    """Antioksidant fermentlar ro'yxati: 'fermentlar: **superoksiddismutaza** (2O2' keyingi blokka tushgan."""

    def locate(self, su):
        return find(su, ["− + 2H+ → H2O2 + O2)", "fermentsiz antioksidantlar", "fermentlar: **superoksiddismutaza**"])

    def __call__(self, ss, i):
        put(ss[i], glue(get(ss[i + 2]), get(ss[i])))
        delete(ss[i + 2])


OPS = [
    (merge(["**Gipervitaminoz** asosan yog‘da", "gipervitaminozi — giperkalsiyemiya"]), "A/D gipervitaminozi qutisi"),
    (merge(["– **Raqobatli (kompetitiv)**", "substrat bilan raqobatlashadi", "konformatsiyasini o‘zgartiradi"]),
     "qaytar ingibitsiya turlari"),
    (split("– **Raqobatli (kompetitiv)**", " – **", head=False, lead="– "), "ingibitsiya turlari -> ro'yxat"),
    (merge(["**Oksigenazalar** — kislorod", "−), vodorod peroksid", "elektronlarning “sizib chiqishi”"]), "RKSh"),
    (antiox(), "antioksidant fermentlar"),
    (merge(["LDG-4, LDG-5 ulushining oshishiga", "ko‘payadi; limfoma va leykozlarda"]), "LDG izofermentlari"),
    (merge(["**Genderson–Gasselbax tenglamasi:**", "- ≈ 24 mmol/l", "-] / 0,03 × pCO2"], [0, 2, 1]),
     "Genderson–Gasselbax"),
    (merge(["**Kislota-ishqor holatining buzilishlari", "- ↓: ketoatsidoz", "- ↑: qusish", "-), me’yor 8–16"]),
     "kislota-ishqor buzilishlari"),
    (merge(["**CO~2~ tashilishi:**", "- plazmaga chiqib", "-; HCO3"], [0, 2, 1]), "CO2 tashilishi"),
    (merge(["**Usul asosi:** kislotali muhitda temir", "ga aylantiradi; Fe2+ ferrozin"]), "ferrozin usuli"),
    (merge(["**Glikozaminoglikanlar (GAG)**", "-) — Na+ va **suvni**"]), "GAG"),
    (merge(["**Miokard qisqarishining boshqarilishi:**", "kanallari va **fosfolamban**"]), "miokard"),
    (merge(["**Tarkibi:** suv (≈ 99,4 %)", "-, Cl-, **rodanidlar**"]), "so'lak tarkibi"),
    (merge(["Parietal hujayrada **karboangidraza**", "- bazolateral membrana"]), "HCl sekretsiyasi"),
    (merge(["**Me’da va o‘n ikki barmoq ichak yarasi**", "-, prostaglandinlar, qon aylanishi"]), "yara"),
    (merge(["- ≈ 120–140 mmol/l", "Sutkasiga 1,5–2 l; pH 7,8–8,4"], [1, 0]), "pankreas shirasi"),
    (merge(["**Tarkibi: o‘t kislotalari**", "-), dorilar va toksinlar"]), "o't tarkibi"),
    (merge(["**O‘t kislotalari:** jigarda", "**konyugatsiyalanadi**"]), "o't kislotalari"),
    (merge(["**Og‘iz orqali regidratatsiya eritmasi**", "va suv so‘rilishi saqlanganiga"]), "regidratatsiya"),
    (split("**Og‘iz orqali regidratatsiya eritmasi**", " • "), "diareya dorilari -> ro'yxat"),
    (merge(["Gipoglikemiya, elektrolit buzilishlari", "+ — so‘rilmaydi"]), "jigar komasi davosi"),
    (merge(["**ALDG2*2** (Glu487Lys)", "ingibirlab xuddi shunday"]), "ALDG2"),
    (merge(["**G-oqsil bilan bog‘langan retseptorlar**", "TTG, PTG, vazopressin (V2)", "retikulumdan Ca2+"]),
     "G-oqsil retseptorlari"),
    (split("**G-oqsil bilan bog‘langan retseptorlar**", " – **"), "G-oqsil -> bandlar"),
    (merge(["**Koptokchali zona: aldosteron**", "rag‘batlantiradi); • **tutamli zona"]), "buyrak usti zonalari"),
    (split("**Koptokchali zona: aldosteron**", " • "), "zonalar -> bandlar"),
    (merge(["Gorizontal tekis yuzaga qo‘ying", "juda erta, suyultirilgan siydik"]), "XGch testi"),
    (merge(["**Renin-angiotenzin-aldosteron tizimi:**", "reabsorbtsiyasi. **Aldosteron**"]), "RAAS"),
    (split("**Renin-angiotenzin-aldosteron tizimi:**", " • "), "RAAS -> bandlar"),
    (merge(["**proksimal kanalcha** — glyukoza", "- (≈ 80 %), K+, fosfat", "(furosemid nishoni)"]), "reabsorbtsiya"),
    (split("**proksimal kanalcha** — glyukoza", " • "), "nefron bo'limlari -> bandlar"),
    (merge(["Kanalcha hujayralarida **karboangidraza**", "- qonga o‘tadi"]), "H+ sekretsiyasi"),
    (merge(["**Titrlanadigan kislotalar**", "(sutkasiga ≈ 10–30 mmol)"]), "titrlanadigan kislotalar"),
    (split("**Titrlanadigan kislotalar**", " 3. "), "ammoniogenez -> 3-band"),
    (merge(["**Buyrak kanalchalari atsidozi:**", "- qayta so‘rilishi buzilgan"]), "kanalcha atsidozi"),
    (merge(["**Buyraklarning kalsiy, fosfor va bikarbonat", "+ chiqarilishi kamayadi"]), "SBK"),
    (merge(["**Gipoglikemiya** (< 2,8–3,0 mmol/l)", "oqimi, proteazalar, erkin radikallar"]), "eksaytotoksiklik"),
    (split("**Gipoglikemiya** (< 2,8–3,0 mmol/l)", " • "), "tiamin -> band"),
]
for op, name in OPS:
    both(op, name)

for doc, path in ((uz, PATH), (en, en_path)):
    if doc is None:
        continue
    with open(path, "w", encoding="utf8") as f:
        if doc is uz:
            json.dump(doc, f, ensure_ascii=False, indent=1)
            f.write("\n")
        else:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
print("matn:", cnt or "o'zgarish yo'q")
print("tuzilma:", log or "o'zgarish yo'q")
