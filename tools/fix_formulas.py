"""Kitob matnlarida PDF dan olinganda yo'qolgan pastki/yuqori indekslarni tiklaydi:
CO2 -> CO~2~, H2O -> H~2~O, Ca2+ -> Ca^2+^, NAD+ -> NAD^+^, HCO3− -> HCO~3~^−^, B12 -> B~12~,
β2 -> β~2~, pO2 -> pO~2~, FEV1 -> FEV~1~, PGE2 -> PGE~2~, Th7–Th12 -> Th~7~–Th~12~ va h.k.

Qoidalar asl LibreOffice PDF lardagi (bkm, fzl, pan) haqiqiy indekslar ro'yxatidan olingan;
kontekstga bog'liq belgilar (M1 makrofag, C5–C9 komplement, T4 fag, O1 serogruppa, G1 o'sma darajasi,
Siklin D1, CYP1A2, H2A giston ...) tegilmaydi. Skript idempotent.

    python3 tools/fix_formulas.py            # data/subjects, data/en/subjects, data/tests + tools/i18n/books/*
    python3 tools/fix_formulas.py --dry      # faqat hisobot (o'zgarishlar namunasi)

Mavzu va vaziyatli masala sarlavhalari (ilovada esc() bilan chiqadi), nomlar, rasm yorliqlari o'zgartirilmaydi."""
import glob, json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = r"[\w~^‘’ʻʼ'`]"
L = rf"(?<!{W})"
R = rf"(?!{W})"
CHG_END = r"(?=[\s,.;:)\]/»”\"*]|$)"      # "-" zaryad bo'lishi uchun undan keyin keladigan belgi

# --- molekulalar (raqamlari pastki indeks) ---
MOL = """C6H12O6 C27H45OH NaH2PO4 Na2HPO4 KH2PO4 K2HPO4 H3PO4 H2PO4 HPO4 PO4 H2SO4 KHSO4 CuSO4 MgSO4 Na2SO4 ZnSO4 SO4
KMnO4 AgNO3 HNO3 NaHCO3 H2CO3 HCO3 CaCO3 Na2CO3 CaCl2 BaCl2 HgCl2 FeCl3 CCl4 CCl3 Cu2O Fe2O3 H2O2 H2O CO2 NO2 N2O SO2
NH4 NH3 NH2 CH4 CH3 CH2 H2S O2 N2 PIP2 FIF2 IP3 BH4 FADH2 FMNH2 NADFH2 NADPH2 NADH2 KoQH2 CoQH2 QH2 HbO2 HbCO2 KHbO2
HbA1c HbA1 HbA2""".split()
MOL.sort(key=len, reverse=True)


def subs(tok):
    """'HbA1c' -> 'HbA~1c~', 'C6H12O6' -> 'C~6~H~12~O~6~'."""
    if tok == "HbA1c":
        return "HbA~1c~"
    return re.sub(r"(?<=[A-Za-z\)])(\d+)", r"~\1~", tok)


def chg(s):
    return f"^{s}^" if s else ""


RULES = []   # (nom, kitoblar|None, istisno kitoblar, regex, almashtirish)


def rule(name, pat, rep, only=None, skip=()):
    RULES.append((name, only, set(skip), re.compile(pat), rep))


# 1) erkin radikallar va superoksid
rule("radikal", L + r"O2•[−-]" + R, "O~2~^•−^")
rule("radikal", L + r"O2−" + R, "O~2~^−^")
rule("radikal", L + r"O2 •[−-]" + R, "O~2~^•−^")
rule("radikal", r"(?<![\w^])•OH" + R, "^•^OH")
rule("radikal", L + r"OH•", "OH^•^")
# 2) fosfat ionlari probel bilan: "HPO4 2-", "H2PO4 -"
rule("ion", L + r"(H2PO4|HPO4|PO4|SO4|CO3|HCO3) (\d?[-−])" + CHG_END,
     lambda m: subs(m.group(1)) + chg(m.group(2)))
# 3) molekulalar (+ ixtiyoriy zaryad) — koeffitsiyent (2H2O) ruxsat
MOLRE = "|".join(re.escape(x) for x in MOL)
ANIONS = {"HCO3", "H2PO4", "HPO4", "PO4", "SO4"}
rule("molekula", rf"(?<!{W})(\d*½?)({MOLRE})(?:(\d?[+−])|(-){CHG_END})?" + R,
     lambda m: m.group(1) + subs(m.group(2)) + (chg(m.group(3)) if m.group(3) else
                                                chg("-") if m.group(4) and m.group(2) in ANIONS else (m.group(4) or "")))
rule("kalsitriol", r"\(OH\)2D3" + R, "(OH)~2~D~3~")
rule("I_f", L + r"I(f)(?= kanal)", r"I~\1~", only={"fzl"})
rule("K3[Fe(CN)6]", r"(?<![\w~^])K3\[Fe\(CN\)6\]", "K~3~[Fe(CN)~6~]")
# 4) qon gazlari: pO2, pCO2, PaO2, SpO2 ...
rule("gaz", rf"(?<!{W})(p|Pa|PA|Pv|Pet|Sp|Sa|Sv|Scv|Fi|Et)(C?O)2" + R, r"\1\2~2~")
# 5) metall/oddiy ionlar
rule("ion", rf"(?<!{W})(\d*)(Na|K|H|Li|Ag|Cu|NH4)\+" + R, r"\1\2^+^")
rule("ion", rf"(?<!{W})(\d*)(Ca|Mg|Fe|Cu|Zn|Mn|Hg|Pb|Co|Ni|Ba|Sr|Cd)(\d)\+" + R, r"\1\2^\3+^")
rule("ion", rf"(?<!{W})(Fe)(0)" + R, r"\1^\2^")
rule("ion", rf"(?<!{W})(\d*)(Cl|OH|COO|F|I)(−)" + R, r"\1\2^\3^")
rule("ion", rf"(?<!{W})(\d*)(Cl|OH|COO)(-){CHG_END}", r"\1\2^\3^")
rule("ion", r"(?<=[(/])(I)(-)(?=[)\s])", r"\1^\2^")
rule("ion", rf"(?<!{W})Cl--", "Cl^-^-")
rule("ion", rf"(?<!{W})(\d*)(NADP|NADF|NAD)\+" + R, r"\1\2^+^")
rule("ion", rf"(?<!{W})(CD\d+)\+" + R, r"\1^+^")
rule("ion", rf"(?<!{W})(Rh)([+−]|-{CHG_END})" + R, r"\1^\2^", only={"fzl"})
# 6) vitaminlar
rule("vitamin", rf"(?<![\w~^‘’ʻʼ'`-])B(12|1|2|3|5|6|7|9)" + R, r"B~\1~")
rule("vitamin", rf"(?<!{W})K([123])" + R + r"(?! N\d)", r"K~\1~", skip={"mkb"})
rule("vitamin", r"(?<!(?:iklin|yclin) )" + L + r"D([1-5])" + R, r"D~\1~")
# 7) yunon harfi + raqam: α1, β2, α2β2 (glikozid bog'i α1→4 va APOE ε4, β6 Glu tegilmaydi)
rule("yunon", r"(?<!→)(?<!APOE )(?<!apo E )([αβγδεζ])(\d{1,2})(?!\d|\s?→| Glu)", r"\1~\2~")
# 8) retseptorlar
rule("retseptor", L + r"H([12])" + R, r"H~\1~")
rule("retseptor", L + r"M([1-5])" + R + r"(?! izo| iso)", r"M~\1~", skip={"pan", "mkb"})
rule("retseptor", L + r"V([1-6])((?:[–-]\d)?)" + R, r"V~\1\2~")
rule("retseptor", r"(?<![\w~^])5-HT(\d[A-D]?)" + R, r"5-HT~\1~")
rule("retseptor", L + r"(CB|NK|AT|CCK)([12])" + R, r"\1~\2~")
rule("retseptor", L + r"P2Y12" + R, "P2Y~12~")
rule("retseptor", L + r"A(1|2A|2)" + R, r"A~\1~")
rule("retseptor", L + r"I1(?=-imidazol)", "I~1~")
rule("retseptor", L + r"N([NM])(?=[- ])", r"N~\1~", only={"frm", "fzl"})
rule("G-oqsil", L + r"G(s|i|q|olf)" + R, r"G~\1~")
# 9) eykozanoidlar
rule("eykozanoid", L + r"(PG[A-I]|TXA|TxA|LT[A-E])(\d)(α?)" + R, r"\1~\2\3~")
# 10) gormonlar, kinetika, nafas
rule("gormon", L + r"(r?T)([34])" + R + r"(?!-kolibakteriofag| coliphage)", r"\1~\2~", skip={"mkb"})
rule("kinetika", L + r"(K)(m)" + R, r"\1~\2~")
rule("kinetika", L + r"(V)(max)" + R, r"\1~\2~")
rule("fosfat", L + r"(PP|F)(n|i)" + R, r"\1~\2~", only={"bkm", "bio"})
rule("fosfat", L + r"(PP|P)(i)" + R, r"\1~\2~", only={"bkm", "bio"})
rule("nafas", L + r"(FEV|FNChH|FNCH)1" + R, r"\1~1~")
rule("nafas", L + r"P50" + R, "P~50~")
rule("farmakokinetika", L + r"C0" + R, "C~0~", only={"frm"})
rule("ATF-sintaza", L + r"F([o01])" + R, r"F~\1~", only={"bkm"})
rule("translyatsiya", L + r"IF([1-3])" + R, r"IF~\1~")   # bkm: initsiatsiya omili; uz: IF3 = IP3
rule("PDG", L + r"E([123])" + R + r"(?!/E)", r"E~\1~", only={"bkm"})
rule("hujayra sikli", L + r"G([012])" + R, r"G~\1~", only={"bkm"})
rule("hujayra sikli", L + r"G([012])(?= faza| phase)", r"G~\1~", only={"pan"})
rule("allel", L + r"((?:I[AB])+)(i?)" + R, lambda m: re.sub(r"I([AB])", r"I^\1^", m.group(1)) + m.group(2), only={"fzl"})
rule("umurtqa", L + r"(C|Th|L|S)(\d{1,2})(\s?[–-]\s?)(C|Th|L|S)(\d{1,2})" + R, r"\1~\2~\3\4~\5~", only={"fzl", "frm"})
rule("umurtqa", L + r"(Th)(\d{1,2})(?= segment)", r"\1~\2~", only={"fzl"})
rule("izotop", r"(?<![\w~^])(14C|13C|15N|32P|18F|131I|125I|99mTc)(?![\w~^])",
     lambda m: "^" + re.match(r"\d+m?", m.group(1)).group(0) + "^" + m.group(1)[len(re.match(r"\d+m?", m.group(1)).group(0)):])
rule("izotop", r"(?<=\^C, )3H(?=,)", "^3^H")
rule("eritish", r"(?<![\w~^])C([12])(?= × V)", r"C~\1~")

# kontekstlar
PROST = re.compile(r"(?:prostaglandin\w*|tromboksan\w*|thromboxane\w*|leykotri\w*|leukotri\w*|fosfolipaza\w*|phospholipase\w*|"
                   r"LT[B-E]~4~)[^;.)]{0,40}", re.I)
GCS = re.compile(r"GCS|GKSh")
GRADE = re.compile(r"differensial|differentiated")
SIKLIN = re.compile(r"(?:Siklin|Cyclin) D~1~")


def fix(s, book):
    if not s or not re.search(r"\d|[+−•]", s):
        return s, []
    hits = []
    gcs = bool(GCS.search(s))
    for name, only, skip, rx, rep in RULES:
        if (only and book not in only) or book in skip:
            continue
        if gcs and name in ("retseptor", "PDG", "vitamin"):
            continue
        if name == "hujayra sikli" and GRADE.search(s):
            continue
        if name == "PDG" and "E2/E2" in s:
            continue
        if name == "molekula" and re.search(r"\bN7\b", s):
            s2 = rx.sub(rep, s.replace("N2 atom", "N\x002 atom"))
            new = s2.replace("N\x002 atom", "N2 atom")
            if new != s:
                hits.append(name)
                s = new
            continue
        if name == "retseptor" and re.search(r"LD[GH]5 \(M4\)", s):
            continue
        if name == "gormon" and book == "pan":
            continue
        new = rx.sub(rep, s)
        if new != s:
            hits.append(name)
            s = new
    if book == "frm" and re.search(r"V~[12]~", s):
        s2 = re.sub(L + r"C([12])" + R, r"C~\1~", s)
        if s2 != s:
            hits.append("eritish")
            s = s2
    # eykozanoid kontekstidagi bitta harf + raqam: "prostaglandin E2", "LTC4, D4, E4", "fosfolipazalar (A1, A2"
    def pr(m):
        return re.sub(L + r"([A-I])(\d)(α?)" + R, r"\1~\2\3~", m.group(0))
    new = PROST.sub(pr, s)
    if new != s:
        hits.append("eykozanoid")
        s = new
    s2 = SIKLIN.sub(lambda m: m.group(0).replace("D~1~", "D1"), s)
    if s2 != s:
        s = s2
    return s, hits


SKIP_KEYS = {"id", "src", "kind", "type", "label", "name", "description", "source", "abbr", "color", "file", "pdf", "sid", "t"}


def skip_path(path):
    if not path:
        return False
    k = path[-1]
    if k in SKIP_KEYS:
        return True
    if k == "title" and (len(path) == 3 and path[0] == "topics" or "cases" in path or (len(path) >= 2 and path[-3:-2] == ["topics"])):
        return True
    return False


STAT = collections.Counter()
SAMPLES = collections.defaultdict(list)


def walk(o, book, path=()):
    if isinstance(o, dict):
        return {k: walk(v, book, path + (k,)) for k, v in o.items()}
    if isinstance(o, list):
        return [walk(v, book, path + (i,)) for i, v in enumerate(o)]
    if isinstance(o, str) and not skip_path(list(path)):
        n, hits = fix(o, book)
        for h in hits:
            STAT[(book, h)] += 1
            if len(SAMPLES[(book, h)]) < 4:
                SAMPLES[(book, h)].append(n[:160])
        return n
    return o


def book_of(path):
    b = os.path.basename(path)[:3]
    return "bio" if b == "bio" else b


def main():
    dry = "--dry" in sys.argv
    changed = 0
    files = sorted(glob.glob(f"{ROOT}/data/subjects/*.json") + glob.glob(f"{ROOT}/data/en/subjects/*.json")
                   + [f for f in glob.glob(f"{ROOT}/data/tests/*.json") if not f.endswith("index.json")])
    for f in files:
        raw = open(f, encoding="utf8").read()
        d = json.loads(raw)
        nd = walk(d, book_of(f))
        if nd != d:
            changed += 1
            if not dry:
                with open(f, "w", encoding="utf8") as fh:   # asl formatlash saqlanadi
                    if raw.startswith("{\n"):
                        json.dump(nd, fh, ensure_ascii=False, indent=1)
                    else:
                        json.dump(nd, fh, ensure_ascii=False, separators=(",", ":"))
                    if raw.endswith("\n"):
                        fh.write("\n")
    # tarjima bo'laklari (uz_*.tsv, en_*.txt) — JSON bilan bir xil bo'lib qolishi uchun
    for d in sorted(glob.glob(f"{ROOT}/tools/i18n/books/*/")):
        book = os.path.basename(d.rstrip("/"))
        pj = os.path.join(d, "paths.json")
        paths = json.load(open(pj, encoding="utf8")) if os.path.exists(pj) else {}
        for f in sorted(glob.glob(d + "uz_*.tsv") + glob.glob(d + "en_*.txt")):
            sep = "\t" if f.endswith(".tsv") else " "
            out, ch = [], False
            for line in open(f, encoding="utf8").read().split("\n"):
                if sep in line and re.match(r"s\d+", line):
                    k, t = line.split(sep, 1)
                    ps = paths.get(k, [])
                    if not ps or not all(skip_path(p) for p in ps):
                        n, _ = fix(t, book)
                        if n != t:
                            line, ch = k + sep + n, True
                out.append(line)
            if ch:
                changed += 1
                if not dry:
                    open(f, "w", encoding="utf8").write("\n".join(out))
    for (b, h), n in sorted(STAT.items()):
        print(f"{b:6} {h:16} {n}")
        if dry:
            for s in SAMPLES[(b, h)]:
                print("        ", s)
    print("o'zgargan fayllar:", changed)


if __name__ == "__main__":
    main()
