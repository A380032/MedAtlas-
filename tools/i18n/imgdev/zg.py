# BOOK=xx [SRC=en] python3 zg.py name x0 y0 x1 y1 k out.png — kattalashtirilgan parcha + koordinata to'ri
import sys, os
from PIL import Image, ImageDraw
B=os.environ.get("BOOK","fzl"); src="data/en/img" if os.environ.get("SRC")=="en" else "data/img"
n,x0,y0,x1,y1,k=sys.argv[1],*map(int,sys.argv[2:7])
n=n if n.endswith(".webp") else n+".webp"
im=Image.open(f"/home/claude/medatlas-/{src}/{B}/{n}").convert("RGB")
x1=min(x1,im.width); y1=min(y1,im.height)
im=im.crop((x0,y0,x1,y1)); im=im.resize((im.width*k,im.height*k),Image.LANCZOS)
d=ImageDraw.Draw(im)
for gx in range((x0//20+1)*20,x1,20):
    X=(gx-x0)*k; d.line([(X,0),(X,6 if gx%100 else 14)],fill=(0,0,255))
    if gx%100==0: d.text((X+2,2),str(gx),fill=(0,0,255))
for gy in range((y0//20+1)*20,y1,20):
    Y=(gy-y0)*k; d.line([(0,Y),(6 if gy%100 else 14,Y)],fill=(0,0,255))
    if gy%100==0: d.text((2,Y+2),str(gy),fill=(0,0,255))
im.save(sys.argv[7])
