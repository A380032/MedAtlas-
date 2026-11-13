# snap(book, name, x, y, r=14) → yaqin atrofdagi to'q glif komponentining qutisi
import numpy as np, cv2
from PIL import Image
R="/home/claude/medatlas-"
def snap(book, name, x, y, r=14, thr=150):
    im=Image.open(f"{R}/data/img/{book}/{name}.webp").convert("RGB"); a=np.asarray(im).astype(int)
    l=(a[...,0]*299+a[...,1]*587+a[...,2]*114)//1000
    H,W=l.shape; x0,y0,x1,y1=max(0,x-r),max(0,y-r),min(W,x+r),min(H,y+r)
    ink=(l[y0:y1,x0:x1]<thr).astype(np.uint8)
    n,lab,st,cen=cv2.connectedComponentsWithStats(ink,8)
    best=None
    for i in range(1,n):
        xx,yy,w,h,ar=st[i]
        if ar<6 or h>30 or w>26: continue
        d=(cen[i][0]+x0-x)**2+(cen[i][1]+y0-y)**2
        if best is None or d<best[0]: best=(d,[x0+xx,y0+yy,x0+xx+w-1,y0+yy+h-1])
    return best[1] if best else None
def lbox(book, name, x, y, r=10, thr=170):
    """(x,y) atrofidagi r-oynada to'q piksellarning umumiy qutisi (bo'lingan harf uchun)"""
    im=Image.open(f"{R}/data/img/{book}/{name}.webp").convert("RGB"); a=np.asarray(im).astype(int)
    l=(a[...,0]*299+a[...,1]*587+a[...,2]*114)//1000
    H,W=l.shape; x0,y0,x1,y1=max(0,x-r),max(0,y-r),min(W,x+r+1),min(H,y+r+1)
    ys,xs=np.nonzero(l[y0:y1,x0:x1]<thr)
    if len(xs)==0: return None
    return [int(x0+xs.min()),int(y0+ys.min()),int(x0+xs.max()),int(y0+ys.max())]
