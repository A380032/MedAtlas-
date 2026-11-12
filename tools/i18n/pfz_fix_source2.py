"""python3 tools/i18n/pfz_fix_source2.py
PFZ kitobidagi tarjima (en_15–en_45) paytida topilgan qo'shimcha manba xatolarini tuzatadi.
pfz_fix_source.py dan farqli o'laroq, tarjimadan KEYIN ishga tushiriladi va ikkala faylni birga tuzatadi:
data/subjects/pfz.json (uz) va data/en/subjects/pfz.json (en). Keyin bo'laklar qayta yasaladi:
    python3 tools/i18n/book_resync.py pfz
Qayta ishga tushirilsa hech narsa o'zgarmaydi.

Tuzatiladigan xatolar:
 1) 11-mavzu (KIM): sahifa chegarasida "HCO3 | −" bo'yicha bo'linib qolgan 3 ta gap birlashtiriladi
    (2 ta quti va ulardan keyingi xatboshi; 4-bo'limda ikki xatboshi teskari tartibda turgan).
    Mavzu xulosasidagi (summary) shu qutilar matni ham to'liq gapga almashtiriladi;
 2) 27-mavzu (krash-sindrom): qutidagi "(toksinlar tez so'rilishini | kamaytirish)" bo'lingan gapi;
 3) "× 109/l", "× 1012/l" — PDF'dan yo'qolgan daraja ko'rsatkichi: "× 10^9^/l", "× 10^12^/l";
 4) alohida matn xatolari (faqat uz; inglizcha tarjima to'g'ri yozilgan):
    - 11-mavzu vaziyatli masala: "HCO3− ni 34 mmol/l gacha oshirgan" bo'lagi gap oxiriga tushib qolgan;
    - 12-mavzu: bel aylanasi kindik emas, eng pastki qovurg'a va yonbosh suyagi qirrasi o'rtasida o'lchanadi;
    - 17-mavzu: "kalorimetrik" -> "kolorimetrik" (rang bo'yicha o'lchash);
    - 24-mavzu: yangi tug'ilganlar gemolitik kasalligida antitanachalar onaning emas, homilaning
      Rh-musbat (yoki AB0) antigenlariga qarshi;
    - 25-mavzu jadvali: "Psevdogipoaldosteroniz m" -> "Psevdogipoaldosteronizm".
"""
import json, os, re

F = {"uz": "data/subjects/pfz.json", "en": "data/en/subjects/pfz.json"}
D = {k: json.load(open(v, encoding="utf8")) for k, v in F.items() if os.path.exists(v)}
log = []


def secs(d, ti, si):
    return d["topics"][ti]["sections"][si]["blocks"]


def cont(s):
    return s.lstrip().startswith("−")


def fix_kim(d):
    t = d["topics"][10]
    n = 0
    # (bo'lim, quti, davomi) — davomi quti matniga qo'shiladi
    for si, box in ((4, 11), (1, 3)):
        bl = secs(d, 10, si)
        if bl[box]["type"] == "box" and box + 1 < len(bl) and bl[box + 1]["type"] == "p" and cont(bl[box + 1]["text"]):
            old = bl[box]["parts"][0]["text"]
            new = old.rstrip() + bl[box + 1]["text"].lstrip()
            bl[box]["parts"][0]["text"] = new
            del bl[box + 1]
            for s in t.get("summary", []):
                if s.get("text") == old:
                    s["text"] = new
            n += 1
    # 4-bo'lim (3-indeks): [8] "− sarflanadi)…" va [9] "**Kompensatsiya:** … (HCO3" — teskari tartib
    bl = secs(d, 10, 3)
    if len(bl) > 9 and bl[8]["type"] == bl[9]["type"] == "p" and cont(bl[8]["text"]) and bl[9]["text"].rstrip().endswith("HCO3"):
        bl[8]["text"] = bl[9]["text"].rstrip() + bl[8]["text"].lstrip()
        del bl[9]
        n += 1
    return n


def fix_crash(d, lang):
    bl = secs(d, 26, 4)
    parts = bl[4]["parts"]
    if len(parts) > 1 and parts[0]["text"].rstrip().endswith(("so‘rilishini", "toxins")):
        j = " " if lang == "uz" else ""
        parts[0]["text"] = parts[0]["text"].rstrip() + j + parts[1]["text"].lstrip()
        del parts[1]
        return 1
    return 0


POW = re.compile(r"(×\s?)10(9|12)(/[lL])")

UZ_TEXT = [
    ("kuchaytirib, HCO3−/CO2 nisbati", "kuchaytirib, HCO3− ni 34 mmol/l gacha oshirgan; HCO3−/CO2 nisbati"),
    ("past oqimda beriladi. − ni 34 mmol/l gacha oshirgan; HCO3", "past oqimda beriladi."),
    ("Bel aylanasini kindik va yonbosh suyagi qirrasi", "Bel aylanasini eng pastki qovurg‘a va yonbosh suyagi qirrasi"),
    ("kalorimetrik", "kolorimetrik"),
    ("onaning Rh-musbat (yoki AB0) antigenlariga", "onaning homila Rh-musbat (yoki AB0) antigenlariga"),
    ("Psevdogipoaldosteroniz m", "Psevdogipoaldosteronizm"),
]


def walk(o, fn, cnt):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("id", "type", "kind", "src"):
                continue
            if isinstance(v, str):
                nv = fn(v); cnt[0] += nv != v; o[k] = nv
            else:
                walk(v, fn, cnt)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str):
                nv = fn(v); cnt[0] += nv != v; o[i] = nv
            else:
                walk(v, fn, cnt)


for lang, d in D.items():
    a = fix_kim(d)
    b = fix_crash(d, lang)
    c = [0]
    walk(d, lambda s: POW.sub(r"\g<1>10^\2^\3", s), c)
    e = [0]
    if lang == "uz":
        def txt(s):
            for x, y in UZ_TEXT:
                if x in s:
                    s = s.replace(x, y)
            return s
        walk(d, txt, e)
    log.append(f"{lang}: {a} ta KIM gapi, {b} ta krash gapi birlashtirildi; {c[0]} ta matnda daraja (10^9, 10^12) "
               f"tiklandi; {e[0]} ta matn xatosi tuzatildi")

for lang, path in F.items():
    if lang in D:
        with open(path, "w", encoding="utf8") as f:
            json.dump(D[lang], f, ensure_ascii=False, separators=(",", ":"))
print("\n".join(log))
