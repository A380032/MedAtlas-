"""Test battle: Mikrobiologiya, virusologiya va immunologiya (2-kurs) savollari — ALVORA Med qo‘llanmasining 1–30 mavzulari asosida.
python3 tools/battle/mkb_gen.py [mavzular] > /tmp/mkb.sql   — tekshiradi va SQL chiqaradi.
Savollar tools/battle/mkb/tN.py fayllarida: (qiyinlik, to'g'ri javoblar soni, uz_q, [uz], en_q, [en], uz_izoh, en_izoh[, rasm]);
variantlarning birinchi n tasi — to'g'ri javob. Variantlar soni: 1→5, 2→4, 3→6, 4→8, 5→10.
rasm — qo'llanmadagi rasm nomi (masalan "p59_27" → data/img/mkb/p59_27.webp). Rasmli savollar --img-off bilan nofaol yuklanadi."""
import json, hashlib, sys, os, importlib.util, re
from collections import Counter

ADMIN = "c847585e-62c4-4719-a7e2-90d9067c9d96"
ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(ROOT))
NOPT = {1: 5, 2: 4, 3: 6, 4: 8, 5: 10}
# Har mavzuda (to'g'ri javoblar soni, qiyinlik) bo'yicha savollar soni — jami 40
PLAN = {(1, 1): 9, (1, 2): 5, (1, 3): 2, (2, 1): 3, (2, 2): 5, (2, 3): 2, (3, 1): 2, (3, 2): 3, (3, 3): 2,
        (4, 2): 2, (4, 3): 2, (5, 2): 1, (5, 3): 2}

uz = json.load(open(os.path.join(REPO, "data/subjects/mkb.json")))["topics"]
en = json.load(open(os.path.join(REPO, "data/en/subjects/mkb.json")))["topics"]

def load(n):
    spec = importlib.util.spec_from_file_location(f"t{n}", os.path.join(ROOT, "mkb", f"t{n}.py"))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m.Q

def img_path(k):
    return f"data/img/mkb/{k}.webp"

def lit(s):
    return "'" + s.replace("'", "''") + "'"

def check(n, Q):
    errs = []
    got = Counter((x[1], x[0]) for x in Q)
    if got != Counter(PLAN):
        errs.append(f"t{n}: taqsimot {dict(sorted(got.items()))} != {PLAN}")
    seen = set()
    for i, x in enumerate(Q, 1):
        if len(x) not in (8, 9): errs.append(f"t{n}#{i}: maydonlar soni {len(x)}"); continue
        d, na, uq, uo, eq, eo, ux, ex = x[:8]
        if len(x) == 9 and not os.path.exists(os.path.join(REPO, img_path(x[8]))): errs.append(f"t{n}#{i}: rasm yo'q {x[8]}")
        tag = f"t{n}#{i} «{uq[:50]}»"
        if d not in (1, 2, 3): errs.append(f"{tag}: qiyinlik {d}")
        if na not in NOPT: errs.append(f"{tag}: javoblar soni {na}"); continue
        if len(uo) != NOPT[na] or len(eo) != NOPT[na]: errs.append(f"{tag}: variantlar {len(uo)}/{len(eo)}, kerak {NOPT[na]}")
        if len(set(o.strip().lower() for o in uo)) != len(uo): errs.append(f"{tag}: uz variantlar takrorlangan")
        if len(set(o.strip().lower() for o in eo)) != len(eo): errs.append(f"{tag}: en variantlar takrorlangan")
        for s in [uq, eq, ux, ex] + list(uo) + list(eo):
            if not s or s != s.strip() or "  " in s: errs.append(f"{tag}: bo'sh joy muammosi: «{s[:40]}»")
            if re.search(r"[A-Za-z]'[a-z]", s): errs.append(f"{tag}: oddiy apostrof (‘ yoki ’ kerak): «{s[:50]}»")
        if len(uq) > 400 or len(eq) > 400: errs.append(f"{tag}: savol juda uzun")
        if any(len(o) > 160 for o in uo + eo): errs.append(f"{tag}: variant juda uzun")
        if uq in seen: errs.append(f"{tag}: savol takrorlangan")
        seen.add(uq)
    return errs

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    img_off = "--img-off" in sys.argv
    nums = [int(a) for a in args] or list(range(1, 31))
    rows, errs, stat = [], [], Counter()
    for n in nums:
        Q = load(n)
        errs += check(n, Q)
        tu, te = uz[n - 1]["title"], en[n - 1]["title"]
        for i, x in enumerate(Q, 1):
            d, na, uq, uo, eq, eo, ux, ex = x[:8]
            img = img_path(x[8]) if len(x) == 9 else None
            act = "false" if (img and img_off) else "true"
            ans = "{" + ",".join(str(k) for k in range(na)) + "}"
            pk = f"mkb-t{n}-{i}"
            stat[(na, d)] += 1; stat["img"] += bool(img)
            for lang, q, o, x, tn, sn, src in (("uz", uq, uo, ux, tu, "Mikrobiologiya, virusologiya va immunologiya", f"ALVORA Med qo‘llanmasi: Mikrobiologiya, virusologiya va immunologiya, {n}-mavzu"),
                                              ("en", eq, eo, ex, te, "Microbiology, virology and immunology", f"ALVORA Med manual: Microbiology, virology and immunology, topic {n}")):
                h = hashlib.sha1((lang + "|" + q + "|" + "|".join(o)).encode()).hexdigest()
                rows.append(f"({lit(lang)}, 2, 'mkb', {lit(sn)}, 't{n}', {lit(tn)}, {n}, {lit(q)}, {lit(json.dumps(o, ensure_ascii=False))}::jsonb, "
                            f"'{ans}'::smallint[], {lit(x)}, {d}, false, {lit(pk)}, {lit(src)}, {lit(h)}, '{ADMIN}', {lit(img) if img else 'null'}, {act})")
    if errs:
        print("\n".join(errs), file=sys.stderr); sys.exit(1)
    print("insert into public.bt_questions (lang, course, subject, subject_name, topic, topic_name, topic_ord, q, opts, ans, expl, diff, demo, pair_key, src, hash, created_by, img, active) values\n"
          + ",\n".join(rows) + "\non conflict (hash) do nothing;")
    print(f"-- OK: {len(rows)//2} juft, {len(rows)} qator, rasmli juft {stat['img']}; mavzular {nums}", file=sys.stderr)

if __name__ == "__main__":
    main()
