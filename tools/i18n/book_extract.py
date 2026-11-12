"""python3 tools/i18n/book_extract.py <id> [chunk_chars]
data/subjects/<id>.json dagi tarjima qilinadigan matnlarni ajratib oladi (asl faylga tegmaydi).
Natija: tools/i18n/books/<id>/uz_NN.tsv  (har qatori: kalit<TAB>o'zbekcha matn), hujjat tartibida, takrorlarsiz.
        tools/i18n/books/<id>/paths.json (kalit -> JSON yo'llari)
Tarjima qilinmaydigan kalitlar: id, type, kind, src, w, h, ordered, start, no, answer (raqam)."""
import json, os, re, sys

SKIP = {"id", "type", "kind", "src", "w", "h", "ordered", "start", "no"}
LETTER = re.compile(r"[A-Za-zА-Яа-яʻʼ‘’]")


def strings(o, p=()):
    """(yo'l, matn) juftlari — hujjat tartibida."""
    if isinstance(o, dict):
        for k, v in o.items():
            if k in SKIP or (k == "answer" and not isinstance(v, str)):
                continue
            yield from strings(v, p + (k,))
    elif isinstance(o, list):
        for i, x in enumerate(o):
            yield from strings(x, p + (i,))
    elif isinstance(o, str) and LETTER.search(o):
        yield p, o


def main():
    sid = sys.argv[1]
    size = int(sys.argv[2]) if len(sys.argv) > 2 else 16000
    d = json.load(open(f"data/subjects/{sid}.json", encoding="utf8"))
    out = f"tools/i18n/books/{sid}"
    os.makedirs(out, exist_ok=True)
    keys, paths = {}, {}
    for p, s in strings(d):
        if "\t" in s or "\n" in s:
            sys.exit(f"TAB/NEWLINE matnda: {p}")
        k = keys.get(s)
        if k is None:
            k = keys[s] = f"s{len(keys) + 1:04d}"
        paths.setdefault(k, []).append(list(p))
    json.dump(paths, open(f"{out}/paths.json", "w", encoding="utf8"), ensure_ascii=False)
    chunk, n, cur = [], 1, 0
    items = list(keys.items())
    for i, (s, k) in enumerate(items):
        chunk.append(f"{k}\t{s}\n")
        cur += len(s)
        if cur >= size or i == len(items) - 1:
            open(f"{out}/uz_{n:02d}.tsv", "w", encoding="utf8").write("".join(chunk))
            chunk, cur, n = [], 0, n + 1
    print(len(keys), "ta noyob matn,", n - 1, "bo'lak ->", out)


if __name__ == "__main__":
    main()
