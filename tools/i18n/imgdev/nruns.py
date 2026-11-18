# nruns.py nm x0 x1 y0 y1 [nb=13] : row-runs of navy text with x extent
import sys, numpy as np
from PIL import Image
nm=sys.argv[1]; x0,x1,y0,y1=map(int,sys.argv[2:6]); nb=int(sys.argv[6]) if len(sys.argv)>6 else 13
a=np.asarray(Image.open(f'/home/claude/medatlas-/data/img/ant/{nm}.webp').convert('RGB')).astype(int)
lu=a[...,0]*.299+a[...,1]*.587+a[...,2]*.114; nv=a[...,2]-a[...,0]
m=(lu<150)&(nv>=nb)
sub=m[y0:y1,x0:x1]; dk=(lu<150)[y0:y1,x0:x1]
rows=[]
for i in range(sub.shape[0]):
    n=sub[i].sum(); d=dk[i].sum()
    rows.append(n>=6 and n>=0.35*d)
i=0
while i<len(rows):
    if rows[i]:
        j=i
        while j+1<len(rows) and rows[j+1]: j+=1
        if j-i>=3:
            xs=np.nonzero(sub[i:j+1].any(0))[0]
            print(f'y {y0+i}-{y0+j}  x {x0+xs[0]}-{x0+xs[-1]}')
        i=j+1
    else: i+=1
