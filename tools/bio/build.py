"""Tibbiy biologiya va genetika (BIO) qo'llanmasini ikki tilda yig'adi va tekshiradi.

  python3 tools/bio/build.py          -> data/subjects/bio.json + data/en/subjects/bio.json
  python3 tools/bio/build.py --check  -> faqat tekshiradi, yozmaydi

Manba: tools/bio/src/uz/tNN.json va tools/bio/src/en/tNN.json (bir mavzu = bir fayl, ikki til).
Testlarda to'g'ri javob har doim birinchi variant (answer=0) yoziladi; skript ularni ikkala tilda
BIR XIL tartibda aralashtiradi (to'g'ri javob o'rni 0..4 bo'yicha tekis taqsimlanadi).

Ikki til mosligi tekshiruvi (xato bo'lsa yig'ilmaydi):
  * tuzilma: bo'limlar, bloklar, blok turlari, ro'yxat bandlari, jadval o'lchami, testlar, masalalar,
    kartochkalar, savollar soni bir xil;
  * rasmlar: src bir xil va fayl mavjud;
  * raqamlar: har blokdagi sonlar to'plami bir xil (o'nlik vergul nuqtaga keltiriladi);
  * belgilash: **qalin**, ~past~, ^yuqori^ juft-juft yopilgan.
"""
import json, os, random, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "tools", "bio", "src")
META = {
    "uz": {"id": "bio", "name": "Tibbiy biologiya va genetika",
           "description": "Mukammal qo‘llanma · 15 ta amaliy mashg‘ulot mavzusi",
           "source": "Asadbek Axmatkulov, 2026"},
    "en": {"id": "bio", "name": "Medical Biology and Genetics",
           "description": "Complete study manual · 15 practical class topics",
           "source": "Asadbek Axmatkulov, 2026"},
}
OUT = {"uz": "data/subjects/bio.json", "en": "data/en/subjects/bio.json"}

errors, warns = [], []


def err(m): errors.append(m)


NUM = re.compile(r"(?<![A-Za-z~^])\d+(?:[.,]\d+)?")


def nums(s):
    s = re.sub(r"(?<=\d)[  ](?=\d{3}\b)", "", s)          # 6 022 -> 6022
    out = []
    for n in NUM.findall(s):
        out.append(n.replace(",", "."))
    return Counter(out)


def texts(o):
    """Bloklar ichidagi barcha matnlar (ketma-ket)."""
    if isinstance(o, str): yield o
    elif isinstance(o, list):
        for x in o: yield from texts(x)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k in ("type", "kind", "src", "w", "h", "ordered", "start", "answer", "id", "no"): continue
            yield from texts(v)


def shape(o):
    if isinstance(o, dict):
        return {k: shape(v) for k, v in o.items()
                if k not in ("text", "title", "label", "caption", "q", "front", "back", "ask")} | (
            {"src": o["src"]} if "src" in o else {})
    if isinstance(o, list):
        return [shape(x) for x in o]
    if isinstance(o, str):
        return "s"
    return o


def markup(s, where):
    for a, b in (("**", "**"),):
        if s.count(a) % 2: err(f"{where}: '**' juft emas: {s[:80]}")
    for ch in "~^":
        if s.count(ch) % 2: err(f"{where}: '{ch}' juft emas: {s[:80]}")


def cmp_block(a, b, where):
    if shape(a) != shape(b):
        err(f"{where}: tuzilma farq qiladi\n   uz={json.dumps(shape(a))[:300]}\n   en={json.dumps(shape(b))[:300]}")
        return
    na = sum((nums(t) for t in texts(a)), Counter())
    nb = sum((nums(t) for t in texts(b)), Counter())
    if na != nb:
        d1, d2 = na - nb, nb - na
        err(f"{where}: sonlar farq qiladi uz-ortiq={dict(d1)} en-ortiq={dict(d2)}")
    for t in texts(a): markup(t, where + " uz")
    for t in texts(b): markup(t, where + " en")


def check_imgs(o, where):
    if isinstance(o, dict):
        if o.get("type") == "img":
            p = os.path.join(ROOT, o["src"])
            if not os.path.exists(p): err(f"{where}: rasm yo'q {o['src']}")
            else:
                from PIL import Image
                with Image.open(p) as im:
                    if min(im.size) < 100: err(f"{where}: rasm yo'q (vaqtinchalik o'rinbosar) {o['src']}")
            enp = os.path.join(ROOT, o["src"].replace("data/img/", "data/en/img/"))
            if o.get("lang") and not os.path.exists(enp): err(f"{where}: inglizcha rasm yo'q {enp}")
        for v in o.values(): check_imgs(v, where)
    elif isinstance(o, list):
        for v in o: check_imgs(v, where)


def fill_sizes(o):
    """img bloklarining w/h ni haqiqiy fayldan oladi."""
    from PIL import Image
    if isinstance(o, dict):
        if o.get("type") == "img":
            p = os.path.join(ROOT, o["src"])
            if os.path.exists(p):
                with Image.open(p) as im: o["w"], o["h"] = im.size
        for v in o.values(): fill_sizes(v)
    elif isinstance(o, list):
        for v in o: fill_sizes(v)


def shuffle_quiz(tu, te):
    rnd = random.Random(8000 + tu["no"])
    n = len(tu["quiz"])
    targets = [i % 5 for i in range(n)]
    rnd.shuffle(targets)
    for qu, qe, pos in zip(tu["quiz"], te["quiz"], targets):
        if qu.get("answer", 0) != 0 or qe.get("answer", 0) != 0:
            err(f"t{tu['no']:02d}: test manbasida to'g'ri javob birinchi bo'lishi kerak: {qu['q'][:50]}")
        k = len(qu["options"])
        pos = pos % k
        perm = list(range(1, k))
        rnd.shuffle(perm)
        perm.insert(pos, 0)
        qu["options"] = [qu["options"][i] for i in perm]
        qe["options"] = [qe["options"][i] for i in perm]
        qu["answer"] = qe["answer"] = pos


def main():
    only_check = "--check" in sys.argv
    files = sorted(f for f in os.listdir(os.path.join(SRC, "uz")) if f.endswith(".json"))
    books = {"uz": dict(META["uz"], topics=[]), "en": dict(META["en"], topics=[])}
    for f in files:
        pe = os.path.join(SRC, "en", f)
        tu = json.load(open(os.path.join(SRC, "uz", f), encoding="utf8"))
        if not os.path.exists(pe):
            err(f"{f}: inglizcha fayl yo'q"); continue
        te = json.load(open(pe, encoding="utf8"))
        w = f[:-5]
        fill_sizes(tu); fill_sizes(te)
        if tu["no"] != te["no"] or tu["id"] != te["id"]: err(f"{w}: no/id farq")
        for key in ("goals", "summary", "sections", "skills", "questions", "quiz", "cases", "cards"):
            A, B = tu.get(key, []), te.get(key, [])
            if len(A) != len(B):
                err(f"{w}.{key}: soni farq {len(A)} != {len(B)}"); continue
            for i, (a, b) in enumerate(zip(A, B)):
                cmp_block(a, b, f"{w}.{key}[{i}]" + (f" «{a.get('title', '')[:30]}»" if isinstance(a, dict) else ""))
        cmp_block({"t": tu["title"]}, {"t": te["title"]}, f"{w}.title")
        if len(tu["quiz"]) < 15: warns.append(f"{w}: testlar {len(tu['quiz'])} ta")
        for q in tu["quiz"] + te["quiz"]:
            if len(q["options"]) != 5: err(f"{w}: test 5 variantli emas: {q['q'][:50]}")
            if len(set(q["options"])) != len(q["options"]): err(f"{w}: takror variant: {q['q'][:50]}")
        check_imgs(tu, w)
        shuffle_quiz(tu, te)
        books["uz"]["topics"].append(tu)
        books["en"]["topics"].append(te)
    # rasm raqamlari (Rasm N.k) mavzu ichida ketma-ket
    for lang, word in (("uz", "Rasm"), ("en", "Figure")):
        for t in books[lang]["topics"]:
            labs = [b["label"] for s in t["sections"] + t.get("skills", []) for b in s["blocks"] if b["type"] == "img"]
            exp = [f"{word} {t['no']}.{i + 1}" for i in range(len(labs))]
            if labs != exp: err(f"t{t['no']:02d} {lang}: rasm yorliqlari {labs} != {exp}")
    for m in warns: print("OGOH:", m)
    if "--lenient" in sys.argv:        # vaqtincha: yetishmayotgan rasmlar ogohlantirish bo'ladi
        warns2 = [e for e in errors if "rasm yo'q" in e]
        errors[:] = [e for e in errors if "rasm yo'q" not in e]
        for m in warns2: print("OGOH:", m)
    if errors:
        print(f"\n{len(errors)} ta XATO:")
        for m in errors: print(" -", m)
        sys.exit(1)
    n = len(books["uz"]["topics"])
    print(f"OK: {n} ta mavzu, ikki til mos.",
          {l: f"{len(json.dumps(b, ensure_ascii=False)) // 1024} KB" for l, b in books.items()})
    if not only_check:
        for lang, b in books.items():
            json.dump(b, open(os.path.join(ROOT, OUT[lang]), "w", encoding="utf8"), ensure_ascii=False, indent=1)
        print("yozildi:", list(OUT.values()))


main()
