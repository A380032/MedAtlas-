# fl.py nm [pad] : crop sheet original|en for each unch.out flag of nm
import sys
from PIL import Image, ImageDraw
nm=sys.argv[1]; pad=int(sys.argv[2]) if len(sys.argv)>2 else 40
R='/home/claude/medatlas-/data'
o=Image.open(f'{R}/img/ant/{nm}.webp').convert('RGB'); e=Image.open(f'{R}/en/img/ant/{nm}.webp').convert('RGB')
rows=[l.split() for l in open('unch.out') if l.split()[0]==nm]
tiles=[]
for r in rows:
    x0,y0,x1,y1=map(int,r[1:5]); b=(max(0,x0-pad*3),max(0,y0-pad),min(o.size[0],x1+pad*3),min(o.size[1],y1+pad))
    a=o.crop(b); c=e.crop(b); W,H=a.size; sc=min(2, 380/W)
    a=a.resize((int(W*sc),int(H*sc))); c=c.resize((int(W*sc),int(H*sc)))
    t=Image.new('RGB',(a.size[0]*2+6,a.size[1]+12),'white'); t.paste(a,(0,12)); t.paste(c,(a.size[0]+6,12)); ImageDraw.Draw(t).text((2,0),f'{x0},{y0},{x1},{y1}',fill='red'); tiles.append(t)
W=max(t.size[0] for t in tiles); H=sum(t.size[1] for t in tiles)
im=Image.new('RGB',(W,H),'#ccc'); y=0
for t in tiles: im.paste(t,(0,y)); y+=t.size[1]
im.save('/tmp/f.png'); print(im.size)
