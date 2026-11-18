# rr.py nm x0 x1 y0 y1 [thr=110] : dark rows with x extents
import sys, numpy as np
from PIL import Image
nm=sys.argv[1]; x0,x1,y0,y1=map(int,sys.argv[2:6]); t=int(sys.argv[6]) if len(sys.argv)>6 else 110
a=np.asarray(Image.open(f'/home/claude/medatlas-/data/img/ant/{nm}.webp').convert('RGB')).astype(int)
lu=a.mean(2); nv=a[...,2]-a[...,0]
out=[]
for y in range(y0,y1):
    m=lu[y,x0:x1]<t; r=np.nonzero(m)[0]
    if len(r)>2: out.append(f'{y}:{len(r)}:{x0+r[0]}-{x0+r[-1]}:{int(nv[y,x0:x1][m].mean())}')
print(' '.join(out))
