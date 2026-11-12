"""python3 tools/i18n/book_check.py <id>
Asl data/subjects/<id>.json va data/en/subjects/<id>.json ni solishtiradi:
 1) tuzilma bir xil (kalitlar, ro'yxat uzunliklari, raqam/boolean qiymatlar, id/type/kind/src)
 2) har bir matn juftida: **, ~, ^ belgilar soni; qo'shtirnoqlar juftligi; raqamlar (o'nli vergul -> nuqta);
    o'nli vergul qolmaganligi; uzunlik nisbati
 3) inglizcha matnda qolib ketgan o'zbekcha so'zlar (wordfreq + o'zbekcha belgilar)
 4) test variantlari takrorlanmasligi
Xato bo'lsa chiqish kodi 1."""
import json, re, sys
from collections import Counter

sid = sys.argv[1]
uz = json.load(open(f"data/subjects/{sid}.json", encoding="utf8"))
en = json.load(open(f"data/en/subjects/{sid}.json", encoding="utf8"))
FIXED = {"id", "type", "kind", "src", "w", "h", "ordered", "start", "no"}
LETTER = re.compile(r"[A-Za-zА-Яа-яʻʼ‘’]")
errs, warns, pairs = [], [], []


def cmp(a, b, p):
    if type(a) is not type(b):
        errs.append(f"{p}: tur farq qiladi"); return
    if isinstance(a, dict):
        if list(a) != list(b):
            errs.append(f"{p}: kalitlar farq qiladi {list(a)} != {list(b)}"); return
        for k in a:
            if k in FIXED:
                if a[k] != b[k]:
                    errs.append(f"{p}/{k}: o'zgarmasligi kerak edi: {a[k]!r} -> {b[k]!r}")
            else:
                cmp(a[k], b[k], f"{p}/{k}")
    elif isinstance(a, list):
        if len(a) != len(b):
            errs.append(f"{p}: uzunlik {len(a)} != {len(b)}"); return
        for i, (x, y) in enumerate(zip(a, b)):
            cmp(x, y, f"{p}/{i}")
    elif isinstance(a, str):
        if LETTER.search(a):
            pairs.append((p, a, b))
        elif a != b:
            # raqamli matn: faqat o'nli vergul nuqtaga almashishi mumkin
            if re.sub(r"(\d),(\d)", r"\1.\2", a) != b:
                warns.append(f"{p}: harfsiz matn o'zgargan {a!r} -> {b!r}")
    elif a != b:
        errs.append(f"{p}: qiymat {a!r} != {b!r}")


cmp(uz, en, "")

NUM = re.compile(r"\d+(?:\.\d+)?")


def nums(s, src):
    s = re.sub(r"\b(\d),(\d)(?=[,\d]*-[A-Za-z])", r"\1.\2", s)  # kimyoviy lokantlar: 2,4-dinitrofenol
    if src:
        s = re.sub(r"(\d),(\d)", r"\1.\2", s)
        s = re.sub(r"(\d) (\d{3})\b", r"\1\2", s)       # 30 000 -> 30000
    else:
        s = re.sub(r"(\d),(\d{3})\b", r"\1\2", s)       # 30,000 -> 30000
    return Counter(NUM.findall(s))


UZ_CHARS = re.compile(r"[A-Za-z]*(?:o‘|g‘|oʻ|gʻ|o'|g')[a-z]", re.I)
UZ_WORDS = set("""va bilan uchun yoki ham esa bu shu u ular hamda lekin chunki agar emas bor yo‘q yoq qanday nima
kerak bo‘ladi bo‘lib qiladi hisoblanadi kuzatiladi uchraydi deyiladi ko‘ra orqali natijasida tufayli sababli
masalan ya’ni asosan juda ko‘p kam katta kichik oq qizil sariq kulrang jigarrang to‘q och qattiq yumshoq""".split())
uzwords = set()
for _, a, _b in pairs:
    uzwords |= set(w.lower() for w in re.findall(r"[A-Za-zʻ‘’']{3,}", a))
try:
    from wordfreq import zipf_frequency
except ImportError:
    zipf_frequency = None

susp = Counter()
for p, a, b in pairs:
    for mark in ("**", "~", "^"):
        if a.count(mark) != b.count(mark):
            if mark == "**" and a.count(mark) % 2 and not b.count(mark) % 2:
                # asl matndagi ** juft emas (manba xatosi) - tarjimada to'g'rilangan
                warns.append(f"{p}: asl matnda '**' juft emas (manba xatosi), tarjimada tuzatildi"); continue
            errs.append(f"{p}: '{mark}' soni {a.count(mark)} != {b.count(mark)} | {b[:120]}")
    if b.count("**") % 2:
        errs.append(f"{p}: ** juft emas")
    if b.count("“") != b.count("”"):
        warns.append(f"{p}: qo'shtirnoqlar juft emas | {b[:100]}")
    if re.search(r"[«»]", b):
        errs.append(f"{p}: «» qolgan")
    if re.search(r"\d,\d", re.sub(r"\b\d(?:,\d)+-[A-Za-z]|\b\d{1,3}(?:,\d{3})+\b", "", b)):
        errs.append(f"{p}: o'nli vergul qolgan | {b[:120]}")
    nu, ne = nums(a, True), nums(b, False)
    lost = nu - ne
    if lost:
        warns.append(f"{p}: raqamlar yo'qolgan {dict(lost)} | {a[:80]} || {b[:80]}")
    if len(a) > 60 and not (0.55 <= len(b) / len(a) <= 1.9):
        warns.append(f"{p}: uzunlik nisbati {len(b) / len(a):.2f}")
    if a == b and len(a) > 3 and not re.fullmatch(r"[A-Z0-9 .,;:()\-–—/+%]+", a):
        warns.append(f"{p}: tarjima qilinmagan? {a[:80]}")
    for w in re.findall(r"[A-Za-zʻ‘’']{2,}", b):
        lw = w.lower()
        if UZ_CHARS.search(w) or lw in UZ_WORDS:
            susp[w] += 1
        elif zipf_frequency and len(lw) >= 4 and lw in uzwords and zipf_frequency(lw, "en") == 0:
            susp[w] += 1

for p, a, b in pairs:
    if re.search(r"/quiz/\d+/options/\d+$", p):
        pass
for t_uz, t_en in zip(uz.get("topics", []), en.get("topics", [])):
    for i, (qa, qb) in enumerate(zip(t_uz.get("quiz", []), t_en.get("quiz", []))):
        if len(set(qa["options"])) == len(qa["options"]) and len(set(qb["options"])) != len(qb["options"]):
            errs.append(f"{t_en['id']}/quiz/{i}: inglizcha variantlar takrorlangan {qb['options']}")

print(f"Juftlar: {len(pairs)} | XATO: {len(errs)} | ogohlantirish: {len(warns)} | shubhali so'zlar: {len(susp)}")
for e in errs[:80]:
    print("XATO", e)
for w in warns[:200]:
    print("OGOH", w)
if susp:
    print("SHUBHALI:", ", ".join(f"{w}({n})" for w, n in susp.most_common(300)))
sys.exit(1 if errs else 0)
