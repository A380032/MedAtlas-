"""python3 tools/i18n/book_apply.py <id>
tools/i18n/books/<id>/en_*.txt (qator: "sNNNN tarjima") dagi tarjimalarni asl data/subjects/<id>.json
tuzilmasiga qo'yib, data/en/subjects/<id>.json yozadi. Asl faylga tegmaydi.
Tarjimasi yo'q matn o'zbekcha qoladi va ro'yxati chiqariladi."""
import glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from book_extract import strings  # noqa: E402


def load_en(sid):
    en = {}
    for f in sorted(glob.glob(f"tools/i18n/books/{sid}/en_*.txt")):
        for n, line in enumerate(open(f, encoding="utf8"), 1):
            line = line.rstrip("\n")
            if not line.strip():
                continue
            m = re.match(r"^(s\d{4}) (.+)$", line)
            if not m:
                sys.exit(f"{f}:{n}: noto'g'ri qator: {line[:80]}")
            if m.group(1) in en:
                sys.exit(f"{f}:{n}: takror kalit {m.group(1)}")
            en[m.group(1)] = m.group(2).strip()
    return en


def uz_keys(sid):
    keys = {}
    for f in sorted(glob.glob(f"tools/i18n/books/{sid}/uz_*.tsv")):
        for line in open(f, encoding="utf8"):
            k, _, s = line.rstrip("\n").partition("\t")
            keys[s] = k
    return keys


def main():
    sid = sys.argv[1]
    d = json.load(open(f"data/subjects/{sid}.json", encoding="utf8"))
    keys, en = uz_keys(sid), load_en(sid)
    extra = set(en) - set(keys.values())
    if extra:
        sys.exit(f"uz faylida yo'q kalitlar: {sorted(extra)[:10]}")
    missing = []

    def put(o, path, val):
        for p in path[:-1]:
            o = o[p]
        o[path[-1]] = val

    for path, s in list(strings(d)):
        k = keys[s]
        if k in en:
            put(d, path, en[k])
        else:
            missing.append(k)
    os.makedirs("data/en/subjects", exist_ok=True)
    out = f"data/en/subjects/{sid}.json"
    json.dump(d, open(out, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    miss = sorted(set(missing))
    print(out, "yozildi.", len(en), "tarjima;", len(miss), "ta matn tarjimasiz", (miss[:5] if miss else ""))


if __name__ == "__main__":
    main()
