"""PDF dan matn olinganda yo'qolgan darajalarni tiklaydi: "× 109/l" -> "× 10^9^/l", "sm2" -> "sm^2^".

Asl PDF larda 10⁹/l, 10¹²/l to'g'ri ko'rsatilgan; faqat ilova JSON larida
daraja belgisi tushib qolgan. Skript idempotent.

    python3 tools/fix_powers.py            # data/subjects va data/en/subjects
"""
import glob
import re
import sys

POW = re.compile(r"([×·]\s?)10(9|12)(/[lL])")
# yuza va hajm birliklari: sm2, kg/m2, 1,73 m2, g/sm3 -> sm^2^ ...; bo‘y2 / height2 (TVI formulasida)
UNIT = re.compile(r"(?<=[\s\d(/,–-])(sm|mm|cm|dm|mkm|m)([23])(?=[\s,.;:)/\"\]]|$)")
HEIGHT = re.compile(r"\b(bo‘y|height)2\b")
SQUARE = re.compile(r"(\((?:\d+[,.]\d+ ?m?|m)\))2(?![\d^])")   # (1,70 m)2, bo‘y (m)2


def main(paths):
    total = 0
    for p in paths:
        s = open(p, encoding="utf-8").read()
        t, n = POW.subn(r"\g<1>10^\2^\3", s)
        t, n2 = UNIT.subn(r"\1^\2^", t)
        t, n3 = HEIGHT.subn(r"\1^2^", t)
        t, n4 = SQUARE.subn(r"\1^2^", t)
        n += n2 + n3 + n4
        if n:
            open(p, "w", encoding="utf-8").write(t)
            print(f"{p}: {n}")
            total += n
    print("jami:", total)


if __name__ == "__main__":
    main(sys.argv[1:] or sorted(glob.glob("data/subjects/*.json") + glob.glob("data/en/subjects/*.json")))
