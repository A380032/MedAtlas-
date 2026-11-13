# python3 ens.py BOOK out.png [cols] name...  — inglizcha rasmlarni asl o'lchamda ustunlarga teradi
import sys
from PIL import Image, ImageDraw
R="/home/claude/medatlas-"
b,out=sys.argv[1],sys.argv[2]
a=sys.argv[3:]; cols=2
if a[0].isdigit(): cols=int(a[0]); a=a[1:]
src="data/en/img"
if b.startswith("uz:"): src="data/img"; b=b[3:]
ims=[(n,Image.open(f"{R}/{src}/{b}/{n if n.endswith('.webp') else n+'.webp'}").convert("RGB")) for n in a]
colh=[0]*cols; pos=[]
cw=max(i.width for _,i in ims)+8
for n,i in ims:
    c=colh.index(min(colh)); pos.append((c*cw,colh[c])); colh[c]+=i.height+20
S=Image.new("RGB",(cw*cols,max(colh)),(255,0,255)); d=ImageDraw.Draw(S)
for (n,i),(x,y) in zip(ims,pos):
    d.text((x+2,y+2),n,fill=(255,255,255)); S.paste(i,(x,y+14))
S.save(out); print(S.size)
