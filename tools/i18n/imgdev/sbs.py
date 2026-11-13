# python3 sbs.py BOOK out.png name [name...]  — asl | inglizcha yonma-yon (ustma-ust qatorlar)
import sys
from PIL import Image
R="/home/claude/medatlas-"
b,out=sys.argv[1],sys.argv[2]
rows=[]
for n in sys.argv[3:]:
    n=n if n.endswith(".webp") else n+".webp"
    a=Image.open(f"{R}/data/img/{b}/{n}").convert("RGB"); e=Image.open(f"{R}/data/en/img/{b}/{n}").convert("RGB")
    r=Image.new("RGB",(a.width+e.width+8,max(a.height,e.height)),(255,0,255)); r.paste(a,(0,0)); r.paste(e,(a.width+8,0)); rows.append(r)
W=max(r.width for r in rows); H=sum(r.height+8 for r in rows)
S=Image.new("RGB",(W,H),(255,0,255)); y=0
for r in rows: S.paste(r,(0,y)); y+=r.height+8
S.save(out); print(S.size)
