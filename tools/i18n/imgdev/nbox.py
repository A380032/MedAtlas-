# nbox.py nm x0 y0 x1 y1 : tight bbox of navy text rows (b-r>=12 among dark pixels per row avg>=14)
import sys, numpy as np
from PIL import Image
nm=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6])
a=np.asarray(Image.open(f'/home/claude/medatlas-/data/img/ant/{nm}.webp').convert('RGB')).astype(int)
lu=a[...,0]*.299+a[...,1]*.587+a[...,2]*.114; nv=a[...,2]-a[...,0]
ys=[];xs=[]
for y in range(y0,y1):
    m=(lu[y,x0:x1]<140)
    n=(m & (nv[y,x0:x1]>=12)).sum()
    if n>=3 and n>=0.3*m.sum():
        ys.append(y); xx=np.nonzero(m & (nv[y,x0:x1]>=12))[0]; xs+= [x0+xx[0], x0+xx[-1]]
print(nm, (min(xs),ys[0],max(xs),ys[-1]) if ys else None, ys)
