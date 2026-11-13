# python3 bl.py BOOK txtfile name... — blok koordinatalari + OCR matni ro'yxati
import json,re,sys
book,txt=sys.argv[1],open(sys.argv[2]).read()
cur=None; T={}
for l in txt.splitlines():
    if l.startswith("##"): cur=l.split()[1]; T[cur]={}
    else:
        m=re.match(r"\s*(\d+).*?\| (.*)",l)
        if m: T[cur][int(m.group(1))]=m.group(2)
for n in sys.argv[3:]:
    B=json.load(open(f"blk/{book}/{n}.json")); print("##",n,B["W"],B["H"])
    for b in B["blocks"]:
        t=T.get(n,{}).get(b["id"],"")
        if t or (b["tb"][2]-b["tb"][0]>25): print(f"  {b['id']:2d} {b['tb']} {t[:80]}")
