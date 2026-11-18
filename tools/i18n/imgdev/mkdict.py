# mkdict.py — v1 kalitlari (uzlist.tsv) + tr/ant_*.tsv -> trdict.json {norm(uz): en, "nm|norm(uz)": en}
import json, glob, re
def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace("`", "'").replace("ʻ", "'").replace("|", "").replace("/", " ")
    s = re.sub(r"[^\w' ]", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()
TR = {}
for p in sorted(glob.glob("tr/ant_[0-9]*.tsv")):
    for l in open(p):
        if "\t" in l: k, v = l.rstrip("\n").split("\t", 1); TR[k] = v
D = {}
for l in open("uzlist.tsv"):
    k, nm, lat, uz = l.rstrip("\n").split("\t")
    v = TR.get(k)
    if not v or v in ("?", "-"): continue
    n = norm(uz)
    if len(n) < 3: continue
    D[nm + "|" + n] = v
    D.setdefault(n, v)
json.dump(D, open("trdict.json", "w"), ensure_ascii=False)
print(len(D))
