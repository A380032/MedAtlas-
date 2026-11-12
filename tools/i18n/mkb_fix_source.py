"""python3 tools/i18n/mkb_fix_source.py
Mikrobiologiya, virusologiya va immunologiya (mkb) kitobidagi manba (o'zbekcha) imlo/ma'no xatolarini
tuzatadi. Faqat data/subjects/mkb.json (uz) tuzatiladi; tarjima tugagach (xato ro'yxati:
tools/i18n/books/mkb/pending_uz.txt) ishga tushiriladi va keyin kitob qayta ekstraksiya qilinadi.
Qayta ishga tushirilsa hech narsa o'zgarmaydi.

Tuzatiladigan xatolar:
 1) "Sil–Nelsen" -> "Sil–Nilsen" (Ziehl–Neelsen; kitobning boshqa joylaridagi imlo bilan bir xil);
 2) "Leffler" -> "Lyoffler" (Löffler), "Neyser" -> "Neysser" (Neisser);
 3) Kligler muhiti "uch qandli" deyilgan, aslida ikki qandli (glyukoza, laktoza) temirli agar;
 4) "chorlamchi ammoniy" -> "to‘rtlamchi ammoniy" (quaternary ammonium);
 5) "markyori" -> "markeri" (marker).
"""
import json, re

PATH = "data/subjects/mkb.json"
d = json.load(open(PATH, encoding="utf8"))

SUBS = [
    (r"Sil–Nelsen", "Sil–Nilsen"),
    (r"Sil-Nelsen", "Sil-Nilsen"),
    (r"\bLeffler\b", "Lyoffler"),
    (r"\bNeyser\b", "Neysser"),
    (r"\buch qandli\b", "ikki qandli"),
    (r"\bUch qandli\b", "Ikki qandli"),
    (r"\bchorlamchi\b", "to‘rtlamchi"),
    (r"\bmarkyori\b", "markeri"),
    (r"\bMarkyori\b", "Markeri"),
]
cnt = {}


def fix(s):
    for a, b in SUBS:
        s, n = re.subn(a, b, s)
        if n:
            cnt[a] = cnt.get(a, 0) + n
    return s


def walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("id", "type", "kind", "src"):
                continue
            if isinstance(v, str):
                o[k] = fix(v)
            else:
                walk(v)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str):
                o[i] = fix(v)
            else:
                walk(v)


walk(d)
with open(PATH, "w", encoding="utf8") as f:
    json.dump(d, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(cnt or "o'zgarish yo'q")
