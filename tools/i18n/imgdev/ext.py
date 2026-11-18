# ext.py nm x0 y0 x1 y1 — dark pixel extent in box, split by gaps>=8
import sys, numpy as np
from PIL import Image
nm=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6])
a=np.asarray(Image.open(f'/home/claude/medatlas-/data/img/ant/{nm}.webp').convert('RGB')).astype(int)
lu=a[...,0]*.299+a[...,1]*.587+a[...,2]*.114; nv=(a[...,2]-a[...,0])
m=(lu<130)[y0:y1,x0:x1]; c=m.sum(0); segs=[];x=0
while x<len(c):
    if c[x]:
        p=x; g=0
        while x<len(c) and g<8:
            g = 0 if c[x] else g+1; x+=1
        segs.append((x0+p,x0+x-g-1, round(float(nv[y0:y1,x0+p:x0+x-g][m[:,p:x-g]].mean()),1)))
    else: x+=1
ys=np.nonzero(m.sum(1))[0]
print(segs, (y0+ys[0], y0+ys[-1]) if len(ys) else None)
