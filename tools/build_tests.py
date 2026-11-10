"""Test bankini (.docx yoki .txt: #savol, +to'g'ri, -xato) ilova formatiga o'giradi va
fan mavzulariga avtomatik taqsimlaydi.

Ishlatish:
  python3 tools/build_tests.py MANBA.docx --id biokimyo-3sem-2025 \
      --title "Biokimyo 3-semestr (2025)" --subject data/subjects/bkm.json --sid bkm
Natija: data/tests/<id>.json  va  tools/reports/<id>.txt (tekshiruv hisoboti)
"""
import argparse, json, math, os, re, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- 1. O'qish -------------------------------------------------------------
def read_lines(path):
    if path.lower().endswith(".docx"):
        import docx
        d = docx.Document(path)
        return [p.text.strip() for p in d.paragraphs]
    return [l.strip() for l in open(path, encoding="utf8")]

def parse(lines):
    qs, stray, cur = [], [], None
    for l in lines:
        if not l:
            continue
        if l.startswith("#"):
            cur = {"q": l.lstrip("#").strip(), "o": [], "c": []}
            qs.append(cur)
        elif l[0] in "+-" and cur is not None:
            cur["o"].append(l[1:].strip())
            if l[0] == "+":
                cur["c"].append(len(cur["o"]) - 1)
        else:
            stray.append((len(qs), l))
            if cur is not None:
                cur.setdefault("stray", []).append(l)
    return qs, stray

# --- 2. Tozalash -----------------------------------------------------------
def clean_text(s):
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([,;:?])", r"\1", s)
    return s

def clean_opt(s):
    s = clean_text(s)
    return re.sub(r"[;.,]+$", "", s).strip()

# Manba faylidagi aniqlangan nuqsonlar uchun qo'lda tuzatishlar (matn boshlanishi bo'yicha)
def manual_fixes(qs, report):
    out = []
    for q in qs:
        st = q.pop("stray", [])
        if q["q"].startswith("Qattiq ketogenik aminokislota") and len(q["o"]) == 11:
            a = {"q": q["q"], "o": q["o"][:5], "c": [0]}
            b = {"q": clean_text(st[0]).rstrip(" ,") + ":", "o": q["o"][5:9], "c": [0, 3]}
            report.append("Birlashib ketgan savol ikkiga bo'lindi: «Qattiq ketogenik aminokislota…» "
                          "va «Ichakdagi fenilalaninning chirishga…» (oxirgi 2 variant - boshqa savol qoldig'i, olib tashlandi). TEKSHIRING.")
            out += [a, b]
            continue
        if q["q"].startswith("Tug‘ma albinizmning") and st:
            # yo'qolgan "-" belgisi: so'nggi stray qator xato variant
            for s in st:
                q["o"].append(s)
            report.append("«Tug‘ma albinizm…» savolida belgisi yo'qolgan variant xato javob sifatida qo'shildi.")
        elif st:
            report.append("Belgisiz qator tashlab yuborildi (%s…): %s" % (q["q"][:40], "; ".join(st)[:80]))
        out.append(q)
    return out

PIN_RE = re.compile(
    r"(yuqorida|yuqoridagi|^(barchasi|hammasi|hamma(si)?|barcha javob\w*|barcha variant\w*|hech biri|hech qaysi|"
    r"javoblar (hammasi )?to.g.ri|to.g.ri javob yo.q|barcha(si)? (to.g.ri|noto.g.ri))( to.g.ri| noto.g.ri)?$|"
    r"^[a-e]\s*(va|hamda|,)\s*[a-e]( va [a-e])?$|^\d\s*va\s*\d$)", re.I)
def pinned(opts):
    """Boshqa variantlarga ishora qiluvchi variantlar (barchasi, yuqoridagilar, A va B) oxirida qoladi."""
    return [i for i, o in enumerate(opts) if len(o) < 60 and PIN_RE.search(o.strip())]

# --- 3. Mavzularga ajratish --------------------------------------------------
APOS = re.compile(r"[ʻʼ‘’`'´ʹ]")
def toks(s):
    s = APOS.sub("", s.lower())
    return [w[:5] for w in re.findall(r"[a-zа-я0-9]{3,}", s)]

def block_text(blocks):
    out = []
    for b in blocks or []:
        if isinstance(b, dict):
            for k in ("text", "title"):
                if b.get(k): out.append(b[k])
            for it in b.get("items", []) or []:
                out.append(it if isinstance(it, str) else json.dumps(it, ensure_ascii=False))
            for r in b.get("rows", []) or []:
                out.append(" ".join(map(str, r)))
        else:
            out.append(str(b))
    return " ".join(out)

def topic_docs(subject):
    docs, quiz = {}, {}
    for t in subject["topics"]:
        c = collections.Counter()
        def add(txt, w):
            for x in toks(txt): c[x] += w
        add(t["title"], 6)
        add(block_text(t.get("goals")), 2)
        for s in t.get("sections", []):
            add(s.get("title", ""), 3); add(block_text(s.get("blocks")), 1)
        for s in t.get("skills", []): add(block_text(s.get("blocks")), 1)
        for q in t.get("questions", []): add(q if isinstance(q, str) else "", 2)
        for k in t.get("cards", []): add(k.get("front", "") + " " + k.get("back", ""), 2)
        for cs in t.get("cases", []): add(cs.get("text", "") + " " + cs.get("ask", ""), 1)
        qz = []
        for q in t.get("quiz", []):
            txt = q["q"] + " " + " ".join(q["options"])
            qz.append(txt)
        docs[t["id"]] = c; quiz[t["id"]] = qz
    return docs, quiz

class Classifier:
    def __init__(self, subject, use_quiz=True, extra=None):
        docs, quiz = topic_docs(subject)
        self.ids = [t["id"] for t in subject["topics"]]
        self.docs = {k: collections.Counter(v) for k, v in docs.items()}
        if use_quiz:
            for k, qz in quiz.items():
                for txt in qz:
                    for x in toks(txt): self.docs[k][x] += 6
        for k, lst in (extra or {}).items():
            for txt in lst:
                for x in toks(txt): self.docs[k][x] += 4
        n = len(self.ids)
        df = collections.Counter()
        for c in self.docs.values():
            for w in c: df[w] += 1
        self.idf = {w: math.log((1 + n) / (1 + d)) + 1 for w, d in df.items()}
        self.vec = {}
        for k, c in self.docs.items():
            v = {w: (1 + math.log(f)) * self.idf[w] for w, f in c.items()}
            nrm = math.sqrt(sum(x * x for x in v.values())) or 1
            self.vec[k] = {w: x / nrm for w, x in v.items()}
    def score(self, text_q, text_correct, text_other):
        c = collections.Counter()
        for x in toks(text_q): c[x] += 3
        for x in toks(text_correct): c[x] += 2
        for x in toks(text_other): c[x] += 1
        v = {w: (1 + math.log(f)) * self.idf.get(w, 0) for w, f in c.items()}
        nrm = math.sqrt(sum(x * x for x in v.values())) or 1
        res = {}
        for k, tv in self.vec.items():
            res[k] = sum(x * tv.get(w, 0) for w, x in v.items()) / nrm
        return sorted(res.items(), key=lambda a: -a[1])
    def classify(self, q):
        corr = " ".join(q["o"][i] for i in q["c"])
        oth = " ".join(o for i, o in enumerate(q["o"]) if i not in q["c"])
        r = self.score(q["q"], corr, oth)
        return r[0][0], r[0][1], r[1][1]

def selftest(subject):
    """Mavjud 450 ta viktorinani (mavzusi ma'lum) mavzusiz o'qitilgan modelda tekshiradi."""
    cl = Classifier(subject, use_quiz=False)
    ok = tot = 0
    for t in subject["topics"]:
        for q in t.get("quiz", []):
            qq = {"q": q["q"], "o": q["options"], "c": [q["answer"]] if isinstance(q["answer"], int) else q["answer"]}
            tot += 1
            ok += cl.classify(qq)[0] == t["id"]
    return ok, tot

# --- 4. Asosiy ---------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("--id", required=True)
    ap.add_argument("--title", required=True); ap.add_argument("--subject", required=True)
    ap.add_argument("--sid", required=True)
    a = ap.parse_args()
    report = []
    qs, stray = parse(read_lines(a.src))
    n_raw = len(qs)
    qs = manual_fixes(qs, report)
    # tozalash
    for q in qs:
        q["q"] = clean_text(q["q"]); q["o"] = [clean_opt(o) for o in q["o"]]
    # bir xil takrorlar
    seen, uniq, dups = {}, [], 0
    for q in qs:
        key = (q["q"].lower(), tuple(sorted(q["o"][i].lower() for i in q["c"])), tuple(sorted(o.lower() for o in q["o"])))
        if key in seen:
            dups += 1; continue
        seen[key] = 1; uniq.append(q)
    qs = uniq
    bad = [q for q in qs if len(q["o"]) < 2 or not q["c"]]
    for q in bad: report.append("Yaroqsiz savol (variant<2 yoki to'g'ri javobsiz) olib tashlandi: " + q["q"][:80])
    qs = [q for q in qs if q not in bad]
    subject = json.load(open(os.path.join(ROOT, a.subject), encoding="utf8"))
    ok, tot = selftest(subject)
    cl = Classifier(subject)
    # o'z-o'zini o'qitish: ishonchli aniqlanganlar mavzu lug'atiga qo'shiladi, so'ng qayta aniqlanadi
    for _ in range(2):
        add = collections.defaultdict(list)
        for q in qs:
            t, s1, s2 = cl.classify(q)
            if s1 >= 0.12 and s1 >= s2 * 1.4:
                add[t].append(q["q"] + " " + " ".join(q["o"][i] for i in q["c"]))
        cl = Classifier(subject, extra=add)
    ovp = os.path.join(ROOT, "tools", "overrides", a.id + ".json")
    ov = json.load(open(ovp)) if os.path.exists(ovp) else {}
    out_q, low, cnt = [], [], collections.Counter()
    for i, q in enumerate(qs, 1):
        t, s1, s2 = cl.classify(q)
        if str(i) in ov: t, s1, s2 = ov[str(i)], 1, 0   # qo'lda tasdiqlangan
        cnt[t] += 1
        if s1 < 0.08 or s1 < s2 * 1.1: low.append((i, t, round(s1, 3), q["q"][:70]))
        d = {"n": i, "q": q["q"], "o": q["o"], "c": q["c"], "t": t}
        p = pinned(q["o"])
        if p: d["p"] = p
        out_q.append(d)
    data = {"id": a.id, "title": a.title, "sid": a.sid,
            "topics": [{"id": t["id"], "no": t.get("no"), "title": t["title"]} for t in subject["topics"]],
            "questions": out_q}
    os.makedirs(os.path.join(ROOT, "data", "tests"), exist_ok=True)
    json.dump(data, open(os.path.join(ROOT, "data", "tests", a.id + ".json"), "w", encoding="utf8"),
              ensure_ascii=False, separators=(",", ":"))
    ip = os.path.join(ROOT, "data", "tests", "index.json")
    idx = json.load(open(ip, encoding="utf8")) if os.path.exists(ip) else []
    idx = [e for e in idx if e["id"] != a.id] + [{"id": a.id, "title": a.title, "sid": a.sid, "count": len(out_q)}]
    json.dump(idx, open(ip, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(ROOT, "tools", "reports"), exist_ok=True)
    multi = sum(1 for q in out_q if len(q["c"]) > 1)
    lines = ["%s: manbada %d, olingan %d savol (bir xil takror: %d)" % (a.title, n_raw, len(out_q), dups),
             "Bir nechta to'g'ri javobli: %d; oxirida qoladigan variantli (barchasi/yuqoridagi...): %d" % (multi, sum(1 for q in out_q if q.get("p"))),
             "Mavzu aniqlash o'z-o'zini tekshirish: %d/%d (%.0f%%)" % (ok, tot, 100 * ok / tot), ""]
    lines += report + [""]
    lines.append("Mavzular bo'yicha savollar soni:")
    for t in subject["topics"]: lines.append("  %-4s %3d  %s" % (t["id"], cnt[t["id"]], t["title"][:60]))
    lines.append("\nIshonchi past (tekshirish kerak): %d" % len(low))
    for x in low: lines.append("  #%d -> %s (%.3f) %s" % x)
    open(os.path.join(ROOT, "tools", "reports", a.id + ".txt"), "w", encoding="utf8").write("\n".join(lines))
    print("\n".join(lines[:40]))

if __name__ == "__main__":
    main()
