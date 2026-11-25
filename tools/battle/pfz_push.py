"""Patologik fiziologiya savollarini bazaga yuklash (vaqtinchalik bt_tmp_load RPC orqali).
python3 tools/battle/pfz_push.py <secret> [--img-off] [mavzular...]
--img-off — rasmli savollar nofaol (active=false) yuklanadi: ilovaning rasm ko'rsatadigan versiyasi chiqquncha.
Faqat ishlab chiqish uchun; yuklashdan keyin RPC o'chiriladi."""
import json, hashlib, os, sys, urllib.request, importlib.util

URL = "https://tcyskjcdxgppdqnlkucc.supabase.co/rest/v1/rpc/bt_tmp_load"
KEY = "sb_publishable_CLa-jwgcIO3M2T31VO9UpQ_N1a0Rcds"
ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(ROOT))
gen = importlib.util.spec_from_file_location("pfz_gen", os.path.join(ROOT, "pfz_gen.py"))
G = importlib.util.module_from_spec(gen); gen.loader.exec_module(G)

uz = json.load(open(os.path.join(REPO, "data/subjects/pfz.json")))["topics"]
en = json.load(open(os.path.join(REPO, "data/en/subjects/pfz.json")))["topics"]

def rows_for(n, img_off):
    Q = G.load(n)
    errs = G.check(n, Q)
    if errs:
        print("\n".join(errs), file=sys.stderr); sys.exit(1)
    tu, te = uz[n - 1]["title"], en[n - 1]["title"]
    out = []
    for i, x in enumerate(Q, 1):
        d, na, uq, uo, eq, eo, ux, ex = x[:8]
        img = G.img_path(x[8]) if len(x) == 9 else None
        pk = f"pfz-t{n}-{i}"
        for lang, q, o, xp, tn, sn, src in (("uz", uq, uo, ux, tu, "Patologik fiziologiya", f"ALVORA Med qo‘llanmasi: Patologik fiziologiya, {n}-mavzu"),
                                            ("en", eq, eo, ex, te, "Pathological physiology", f"ALVORA Med manual: Pathological physiology, topic {n}")):
            h = hashlib.sha1((lang + "|" + q + "|" + "|".join(o)).encode()).hexdigest()
            out.append({"lang": lang, "course": 3, "subject": "pfz", "subject_name": sn, "topic": f"t{n}",
                        "topic_name": tn, "topic_ord": n, "q": q, "opts": o, "ans": list(range(na)), "expl": xp,
                        "diff": d, "pair_key": pk, "src": src, "hash": h, "img": img,
                        "active": not (img and img_off)})
    return out

def post(secret, rows):
    body = json.dumps({"p_secret": secret, "p_rows": rows}, ensure_ascii=False).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json", "apikey": KEY, "Authorization": "Bearer " + KEY})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode()

if __name__ == "__main__":
    secret = sys.argv[1]
    img_off = "--img-off" in sys.argv
    nums = [int(a) for a in sys.argv[2:] if not a.startswith("--")] or list(range(1, 28))
    total = 0
    for n in nums:
        rows = rows_for(n, img_off)
        res = post(secret, rows)
        print(f"t{n}: {len(rows)} qator yuborildi -> {res}")
        total += len(rows)
    print("jami:", total)
