# python3 gs.py BOOK out.png cols name... — asl rasmlar, har 50px da chizg'ich belgisi (koordinata o'qish uchun)
import sys
from PIL import Image, ImageDraw, ImageFont
R="/home/claude/medatlas-"; b,out,cols=sys.argv[1],sys.argv[2],int(sys.argv[3]); names=sys.argv[4:]
f=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",9)
ims=[]
for n in names:
    im=Image.open(f"{R}/data/img/{b}/{n}.webp").convert("RGB"); d=ImageDraw.Draw(im)
    for x in range(0,im.width,50):
        d.line([(x,0),(x,6)],fill=(0,0,255)); d.line([(x,im.height-7),(x,im.height-1)],fill=(0,0,255))
        if x: d.text((x+1,0),str(x),fill=(0,0,255),font=f)
    for y in range(0,im.height,50):
        d.line([(0,y),(6,y)],fill=(0,0,255)); d.line([(im.width-7,y),(im.width-1,y)],fill=(0,0,255))
        if y: d.text((1,y+1),str(y),fill=(0,0,255),font=f)
    ims.append((n,im))
cw=max(i.width for _,i in ims)+8; colh=[0]*cols; pos=[]
for n,i in ims:
    c=colh.index(min(colh)); pos.append((c*cw,colh[c])); colh[c]+=i.height+16
S=Image.new("RGB",(cw*cols,max(colh)),(255,0,255)); d=ImageDraw.Draw(S)
for (n,i),(x,y) in zip(ims,pos):
    d.text((x+2,y+1),n,fill=(0,0,0)); S.paste(i,(x,y+12))
S.save(out); print(S.size)
import json; json.dump({n:[x,y+12] for (n,i),(x,y) in zip(ims,pos)},open(out+".pos.json","w"))
