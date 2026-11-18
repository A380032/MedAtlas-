# flagsheet.py out.png nm [nm...] : crops of flagged boxes (EN) for given images, from unch.out
import sys
from PIL import Image, ImageDraw
R="/home/claude/medatlas-/data"
out=sys.argv[1]; names=set(sys.argv[2:])
rows=[l.split() for l in open("unch.out") if l.split()[0] in names]
tiles=[]
for r in rows:
    nm=r[0]; x0,y0,x1,y1=map(int,r[1:5])
    e=Image.open(f"{R}/en/img/ant/{nm}.webp").convert("RGB")
    b=(max(0,x0-30),max(0,y0-6),min(e.size[0],x1+30),min(e.size[1],y1+6))
    c=e.crop(b); sc=min(2.0, 520/c.size[0]); c=c.resize((int(c.size[0]*sc),int(c.size[1]*sc)))
    t=Image.new("RGB",(540,c.size[1]+14),"white"); t.paste(c,(0,14)); ImageDraw.Draw(t).text((2,1),f"{nm} {x0},{y0},{x1},{y1}",fill="red"); tiles.append(t)
H=sum(t.size[1] for t in tiles); W=540
cols=2 if H>1800 else 1
per=(len(tiles)+cols-1)//cols
colsH=[sum(t.size[1] for t in tiles[i*per:(i+1)*per]) for i in range(cols)]
im=Image.new("RGB",(W*cols+10*(cols-1),max(colsH) if colsH else 10),"#ccc")
for i in range(cols):
    y=0
    for t in tiles[i*per:(i+1)*per]: im.paste(t,(i*(W+10),y)); y+=t.size[1]
im.save(out); print(len(tiles), im.size)
