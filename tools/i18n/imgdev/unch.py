# unch.py names... : flag original navy text segments left unchanged in EN render
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
R="/home/claude/medatlas-/data"
def one(nm):
    o=np.asarray(Image.open(f"{R}/img/ant/{nm}.webp").convert("RGB")).astype(int)
    e=np.asarray(Image.open(f"{R}/en/img/ant/{nm}.webp").convert("RGB")).astype(int)
    lu=o[...,0]*.299+o[...,1]*.587+o[...,2]*.114
    bn=o[...,2]-o[...,0]
    dk=(lu<140)&(np.abs(o[...,0]-o[...,1])<40)
    base=np.median(bn[dk]) if dk.sum() else 0
    nv=(bn>=max(14,base+10))&(lu<140)
    # exclude strongly saturated (illustration) areas: require local bg light
    d=np.abs(o-e).sum(2)>60
    lab,n=ndi.label(ndi.binary_dilation(nv,structure=np.ones((3,9))))
    out=[]
    for i,sl in enumerate(ndi.find_objects(lab)):
        if sl is None: continue
        m=(lab[sl]==i+1)&nv[sl]
        cnt=m.sum()
        h=sl[0].stop-sl[0].start; w=sl[1].stop-sl[1].start
        if cnt<40 or h<6 or h>40 or w<20: continue
        # background lightness around
        bgl=np.median(lu[sl][~m])
        if bgl<170: continue
        ch=(d[sl]&m).sum()/cnt
        if ch<0.35: out.append((sl[1].start,sl[0].start,sl[1].stop,sl[0].stop,round(float(ch),2),int(cnt)))
    return out
for nm in sys.argv[1:]:
    r=one(nm)
    for b in r: print(nm,*b)
