# nb2.py nm x0 x1 y0 y1 : per-row navy pixel count where (b-r)>=bias+12 relative to local dark-pixel median
import sys, numpy as np
from PIL import Image
nm=sys.argv[1]; x0,x1,y0,y1=map(int,sys.argv[2:6])
a=np.asarray(Image.open(f'/home/claude/medatlas-/data/img/ant/{nm}.webp').convert('RGB')).astype(int)
sub=a[y0:y1,x0:x1]; lu=sub[...,0]*.299+sub[...,1]*.587+sub[...,2]*.114; nv=sub[...,2]-sub[...,0]
dk=lu<130; base=np.median(nv[dk])
for i in range(sub.shape[0]):
    m=dk[i]&(nv[i]>=base+10); xs=np.nonzero(m)[0]
    if m.sum()>=4: print(y0+i, m.sum(), x0+xs[0], x0+xs[-1])
print('base',base)
