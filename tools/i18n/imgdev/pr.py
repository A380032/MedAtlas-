# pr.py nm x0 y0 x1 y1 sc out — original (top) vs EN (bottom)
import sys
from PIL import Image
nm=sys.argv[1]; box=tuple(map(int,sys.argv[2:6])); sc=float(sys.argv[6]); fn=sys.argv[7]
a=Image.open(f'/home/claude/medatlas-/data/en/img/ant/{nm}.webp').convert('RGB'); o=Image.open(f'/home/claude/medatlas-/data/img/ant/{nm}.webp').convert('RGB')
c1=a.crop(box);c2=o.crop(box);W,H=c1.size;W2,H2=int(W*sc),int(H*sc)
im=Image.new('RGB',(W2*2+6,H2),'white');im.paste(c2.resize((W2,H2)),(0,0));im.paste(c1.resize((W2,H2)),(W2+6,0));im.save(fn)
