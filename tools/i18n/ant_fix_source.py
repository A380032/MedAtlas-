"""python3 tools/i18n/ant_fix_source.py
Odam anatomiyasi (ant) kitobidagi manba (o'zbekcha) xatolarini tuzatadi. Faqat data/subjects/ant.json (uz)
tuzatiladi; tarjima vaqtida topilgan xatolar (tools/i18n/books/ant/pending_uz.txt) asosida. Keyin
book_resync.py ant ishga tushiriladi. Qayta ishga tushirilsa hech narsa o'zgarmaydi.

Tuzatiladigan xatolar:
 1) "torayqan" -> "toraygan" (imlo);
 2) "sinish keyin tiklanadi" -> "sinishdan keyin tiklanadi" (grammatika);
 3) buyrak darvozasida arteriya "vena oldida, jom orqasida ... (venadan orqada)" deb o'zaro zid yozilgan;
    to'g'risi: vena orqasida, jom oldida (ular orasida).
"""
import json, re

PATH = "data/subjects/ant.json"
raw = open(PATH, encoding="utf8").read()
d = json.loads(raw)

SUBS = [
    (r"\btorayqan\b", "toraygan"),
    (r"sinish keyin tiklanadi", "sinishdan keyin tiklanadi"),
    (r"vena oldida, jom orqasida yotadi \(venadan orqada\)", "vena orqasida, jom oldida yotadi (ular orasida)"),
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
compact = not raw.lstrip().startswith("{\n")
with open(PATH, "w", encoding="utf8") as f:
    if compact:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    else:
        json.dump(d, f, ensure_ascii=False, indent=1)
print(cnt)
