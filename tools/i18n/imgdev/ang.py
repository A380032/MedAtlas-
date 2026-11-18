# ang.py nm x0 y0 x1 y1 [nb] : fit slanted navy text line -> cbox, ang
import sys, numpy as np, math
from PIL import Image
nm=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); nb=int(sys.argv[6]) if len(sys.argv)>6 else 16
a=np.asarray(Image.open(f'/home/claude/medatlas-/data/img/ant/{nm}.webp').convert('RGB')).astype(int)
sub=a[y0:y1,x0:x1]; lu=sub[...,0]*.299+sub[...,1]*.587+sub[...,2]*.114; nv=sub[...,2]-sub[...,0]
m=(lu<150)&(nv>=nb)
ys,xs=np.nonzero(m); xs=xs+x0; ys=ys+y0
A=np.vstack([xs,np.ones_like(xs)]).T
k,b=np.linalg.lstsq(A,ys,rcond=None)[0]
ang=-math.degrees(math.atan(k))
# along / perp coords
ca,sa=math.cos(math.radians(ang)),math.sin(math.radians(ang))
cx0,cy0=xs.mean(),ys.mean()
u=(xs-cx0)*ca-(ys-cy0)*sa   # along
v=(xs-cx0)*sa+(ys-cy0)*ca   # perp (down)
ul,uh=np.percentile(u,0.5),np.percentile(u,99.5); vl,vh=np.percentile(v,1),np.percentile(v,99)
cu,cv=(ul+uh)/2,(vl+vh)/2
cx=cx0+cu*ca+cv*sa; cy=cy0-cu*sa+cv*ca
print(f'n={len(xs)} cbox=[{cx:.0f}, {cy:.0f}, {uh-ul+4:.0f}, {vh-vl+3:.0f}] ang={ang:.1f}')
