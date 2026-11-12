"""python3 tools/i18n/splitchk.py <id> <boshlang'ich kalit, masalan s0000>
Manba (uz_*.tsv) dagi PDF'dan bo'linib tushgan so'zlarni qidiradi ("Tekshir uv", "O‘zgarmag an").
Usul: qo'shni ikki so'z (a b) birlashtirilganda (ab) korpusning boshqa joyida yaxlit so'z sifatida uchrasa
va a yoki b o'z holicha kam uchrasa — nomzod. Boshlang'ich kalitdan keyingi qatorlar tekshiriladi.
Natija qo'lda ko'riladi; topilgan haqiqiy xatolar tools/i18n/books/<id>/pending_uz.txt ga yoziladi."""
import glob, re, sys
from collections import Counter

TOK = re.compile(r"[A-Za-zʻ‘’'-]+")


def main():
    sid, start = sys.argv[1], sys.argv[2]
    rows = []
    for f in sorted(glob.glob(f"tools/i18n/books/{sid}/uz_*.tsv")):
        for line in open(f, encoding="utf8"):
            k, _, s = line.rstrip("\n").partition("\t")
            rows.append((k, s))
    vocab = Counter()
    for _, s in rows:
        for w in TOK.findall(s):
            vocab[w.lower()] += 1
    hits = 0
    for k, s in rows:
        if k < start:
            continue
        toks = [(m.group(), m.start(), m.end()) for m in TOK.finditer(s)]
        for (a, s1, e1), (b, s2, e2) in zip(toks, toks[1:]):
            if s2 - e1 != 1 or len(a) < 3 or len(b) < 2 or "-" in a + b:
                continue
            ab = (a + b).lower()
            if vocab[ab] and min(vocab[a.lower()], vocab[b.lower()]) <= 2:
                hits += 1
                print(f"{k}: {a} {b} -> {a + b} (korpusda {vocab[ab]}x)  | ...{s[max(0, s1 - 20):e2 + 20]}...")
    print(f"nomzodlar: {hits}")


if __name__ == "__main__":
    main()
