# rowsx.py nm x0 x1 y0 y1 : rows of dark(lu<130) with navy score
import sys, numpy as np
from PIL import Image
nm=sys.argv[1]; x0,x1,y0,y1=map(int,sys.argv[2:6])
a=np.asarray(Image.open(f'/home/claude/medatlas-/data/img/ant/{nm}.webp').convert('RGB')).astype(int)
lu=a[...,0]*.299+a[...,1]*.587+a[...,2]*.114; nv=a[...,2]-a[...,0]
for y in range(y0,y1):
    m=lu[y,x0:x1]<130; n=m.sum()
    xs=np.nonzero(m)[0]
    print(y,n, (x0+xs[0],x0+xs[-1]) if n else '', round(float(nv[y,x0:x1][m].mean()),1) if n else '')
