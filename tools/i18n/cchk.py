"""python3 tools/i18n/cchk.py <id> <NN>
tools/i18n/books/<id>/uz_NN.tsv bilan en_NN.txt ni solishtiradi:
 - kalitlar to'plami va tartibi bir xilmi, har qatorda bitta kalit ("sNNNN matn"), bo'sh tarjima yo'qmi;
 - MARK: **, ~, ^ belgilar soni teng, ** juft, «» qolmagan (XATO — albatta tuzatiladi);
 - NUM: raqamlar yo'qolgan/ortgan (ogohlantirish — ko'pi zararsiz: "kuniga 1 marta" -> "once a day");
 - o'nli vergul qolmaganligi.
MARK yoki tuzilma xatosi bo'lsa chiqish kodi 1."""
import os, re, sys
from collections import Counter

NUM = re.compile(r"\d+(?:\.\d+)?")


def nums(s, src):
    s = re.sub(r"\b(\d),(\d)(?=[,\d]*-[A-Za-z])", r"\1.\2", s)
    if src:
        s = re.sub(r"(\d),(\d)", r"\1.\2", s)
        s = re.sub(r"(\d) (\d{3})\b", r"\1\2", s)
    else:
        s = re.sub(r"(\d),(\d{3})\b", r"\1\2", s)
    return Counter(NUM.findall(s))


def main():
    sid, nn = sys.argv[1], int(sys.argv[2])
    base = f"tools/i18n/books/{sid}"
    uz = [l.rstrip("\n").split("\t", 1) for l in open(f"{base}/uz_{nn:02d}.tsv", encoding="utf8")]
    path = f"{base}/en_{nn:02d}.txt"
    if not os.path.exists(path):
        sys.exit(f"{path} yo'q")
    en = []
    errs, warns = [], []
    for n, line in enumerate(open(path, encoding="utf8"), 1):
        line = line.rstrip("\n")
        if not line.strip():
            errs.append(f"KEY en:{n}: bo'sh qator")
            continue
        m = re.match(r"^(s\d{4}) (\S.*)$", line)
        if not m:
            errs.append(f"KEY en:{n}: noto'g'ri qator: {line[:80]}")
            continue
        en.append((m.group(1), m.group(2)))
    ku, ke = [k for k, _ in uz], [k for k, _ in en]
    if ku != ke:
        miss = [k for k in ku if k not in set(ke)]
        extra = [k for k in ke if k not in set(ku)]
        if miss:
            errs.append(f"KEY yetishmaydi ({len(miss)}): {miss[:12]}")
        if extra:
            errs.append(f"KEY ortiqcha ({len(extra)}): {extra[:12]}")
        if not miss and not extra:
            errs.append("KEY tartib yoki takror farq qiladi")
    emap = dict(en)
    for k, a in uz:
        b = emap.get(k)
        if b is None:
            continue
        for mark in ("**", "~", "^"):
            if a.count(mark) != b.count(mark):
                if mark == "**" and a.count(mark) % 2 and not b.count(mark) % 2:
                    warns.append(f"WARN {k}: asl matnda ** juft emas (manba xatosi)")
                    continue
                errs.append(f"MARK {k}: '{mark}' {a.count(mark)} != {b.count(mark)} | {b[:110]}")
        if b.count("**") % 2:
            errs.append(f"MARK {k}: ** juft emas")
        if re.search(r"[«»]", b):
            errs.append(f"MARK {k}: «» qolgan")
        if re.search(r"\d,\d", re.sub(r"\b\d(?:,\d)+-[A-Za-z]|\b\d{1,3}(?:,\d{3})+\b", "", b)):
            errs.append(f"MARK {k}: o'nli vergul qolgan | {b[:110]}")
        lost = nums(a, True) - nums(b, False)
        gain = nums(b, False) - nums(a, True)
        if lost or gain:
            warns.append(f"NUM {k}: yo'qolgan {dict(lost)} ortgan {dict(gain)} | {a[:70]} || {b[:70]}")
    print(f"{sid} {nn:02d}: uz={len(uz)} en={len(en)} | XATO {len(errs)} | NUM/OGOH {len(warns)}")
    for e in errs:
        print(e)
    for w in warns:
        print(w)
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
