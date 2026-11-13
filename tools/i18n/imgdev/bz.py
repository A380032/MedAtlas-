# python3 bz.py BOOK out.png K name... — raqamlangan nusxalar, K marta katta; chizg'ich rasm ICHIDA (K=1 da piksel = koordinata)
import sys
from PIL import Image, ImageDraw
b,out,k=sys.argv[1],sys.argv[2],int(sys.argv[3])
ims=[]
for n in sys.argv[4:]:
    i=Image.open(f"blk/{b}/{n}.png").convert("RGB"); w,h=i.size
    c=i.resize((w*k,h*k),Image.LANCZOS); d=ImageDraw.Draw(c)
    for x in range(0,w,10):
        d.line([(x*k,0),(x*k,4 if x%50 else 9)],fill=(0,0,200))
        if x%100==0 and x: d.text((x*k+2,1),str(x),fill=(0,0,200))
    for y in range(0,h,10):
        d.line([(0,y*k),(4 if y%50 else 9,y*k)],fill=(0,0,200))
        if y%100==0 and y: d.text((1,y*k+1),str(y),fill=(0,0,200))
    ims.append(c)
S=Image.new("RGB",(max(i.width for i in ims),sum(i.height+10 for i in ims)),(255,0,255)); y=0
for i in ims: S.paste(i,(0,y)); print(sys.argv[4+ims.index(i)],"y0 =",y); y+=i.height+10
S.save(out); print(S.size)
