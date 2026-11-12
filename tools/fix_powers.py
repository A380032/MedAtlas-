"""PDF dan matn olinganda yo'qolgan darajalarni tiklaydi: "× 109/l" -> "× 10^9^/l".

Asl PDF larda 10⁹/l, 10¹²/l to'g'ri ko'rsatilgan; faqat ilova JSON larida
daraja belgisi tushib qolgan. Skript idempotent.

    python3 tools/fix_powers.py            # data/subjects va data/en/subjects
"""
import glob
import re
import sys

POW = re.compile(r"([×·]\s?)10(9|12)(/[lL])")


def main(paths):
    total = 0
    for p in paths:
        s = open(p, encoding="utf-8").read()
        t, n = POW.subn(r"\g<1>10^\2^\3", s)
        if n:
            open(p, "w", encoding="utf-8").write(t)
            print(f"{p}: {n}")
            total += n
    print("jami:", total)


if __name__ == "__main__":
    main(sys.argv[1:] or sorted(glob.glob("data/subjects/*.json") + glob.glob("data/en/subjects/*.json")))
