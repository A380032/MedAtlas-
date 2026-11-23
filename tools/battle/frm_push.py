"""Savollarni bazaga yuklash (vaqtinchalik bt_tmp_load RPC orqali).
python3 tools/battle/frm_push.py <secret> [mavzular...]
Faqat ishlab chiqish uchun; yuklashdan keyin RPC o'chiriladi."""
import json, hashlib, os, sys, urllib.request, importlib.util

URL = "https://tcyskjcdxgppdqnlkucc.supabase.co/rest/v1/rpc/bt_tmp_load"
KEY = "sb_publishable_CLa-jwgcIO3M2T31VO9UpQ_N1a0Rcds"
ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(ROOT))
sys.path.insert(0, ROOT)
gen = importlib.util.spec_from_file_location("frm_gen", os.path.join(ROOT, "frm_gen.py"))
G = importlib.util.module_from_spec(gen); gen.loader.exec_module(G)

uz = json.load(open(os.path.join(REPO, "data/subjects/frm.json")))["topics"]
en = json.load(open(os.path.join(REPO, "data/en/subjects/frm.json")))["topics"]

def rows_for(n):
    Q = G.load(n)
    errs = G.check(n, Q)
    if errs:
        print("\n".join(errs), file=sys.stderr); sys.exit(1)
    tu, te = uz[n - 1]["title"], en[n - 1]["title"]
    out = []
    for i, (d, na, uq, uo, eq, eo, ux, ex) in enumerate(Q, 1):
        ans = list(range(na))
        pk = f"frm-t{n}-{i}"
        for lang, q, o, x, tn, sn, src in (("uz", uq, uo, ux, tu, "Farmakologiya", f"ALVORA Med qo‘llanmasi: Farmakologiya, {n}-mavzu"),
                                           ("en", eq, eo, ex, te, "Pharmacology", f"ALVORA Med manual: Pharmacology, topic {n}")):
            h = hashlib.sha1((lang + "|" + q + "|" + "|".join(o)).encode()).hexdigest()
            out.append({"lang": lang, "course": 3, "subject": "farmakologiya", "subject_name": sn, "topic": f"t{n}",
                        "topic_name": tn, "topic_ord": n, "q": q, "opts": o, "ans": ans, "expl": x,
                        "diff": d, "pair_key": pk, "src": src, "hash": h})
    return out

def post(secret, rows):
    body = json.dumps({"p_secret": secret, "p_rows": rows}, ensure_ascii=False).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json", "apikey": KEY, "Authorization": "Bearer " + KEY})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode()

if __name__ == "__main__":
    secret = sys.argv[1]
    nums = [int(a) for a in sys.argv[2:]] or list(range(1, 10))
    total = 0
    for n in nums:
        rows = rows_for(n)
        res = post(secret, rows)
        print(f"t{n}: {len(rows)} qator yuborildi -> {res}")
        total += len(rows)
    print("jami:", total)
