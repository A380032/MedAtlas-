# python3 bz.py BOOK out.png K name... — raqamlangan nusxalarni K marta kattalashtirib, chizg'ich bilan ustma-ust teradi
import sys
from PIL import Image, ImageDraw
b,out,k=sys.argv[1],sys.argv[2],int(sys.argv[3])
ims=[]
for n in sys.argv[4:]:
    i=Image.open(f"blk/{b}/{n}.png"); w,h=i.size
    i=i.resize((w*k,h*k),Image.LANCZOS)
    c=Image.new("RGB",(w*k+24,h*k+16),(255,255,255)); c.paste(i,(24,16)); d=ImageDraw.Draw(c)
    for x in range(0,w,10):
        d.line([(24+x*k,8 if x%50 else 0),(24+x*k,16)],fill=(0,0,200))
        if x%50==0: d.text((24+x*k+2,0),str(x),fill=(0,0,200))
    for y in range(0,h,10):
        d.line([(16 if y%50 else 4,16+y*k),(24,16+y*k)],fill=(0,0,200))
        if y%50==0: d.text((0,16+y*k-5),str(y),fill=(0,0,200))
    # ichki yordamchi to'r (har 50 px)
    for x in range(50,w,50): d.line([(24+x*k,16),(24+x*k,16+h*k)],fill=(200,200,255))
    ims.append(c)
S=Image.new("RGB",(max(i.width for i in ims),sum(i.height+10 for i in ims)),(255,0,255)); y=0
for i in ims: S.paste(i,(0,y)); y+=i.height+10
S.save(out); print(S.size)
