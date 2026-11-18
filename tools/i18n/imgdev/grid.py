# grid.py nm x0 y0 x1 y1 sc out [en] — crop with 10px ticks, labels every 50
import sys
from PIL import Image, ImageDraw
nm=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]); fn=sys.argv[7]
src='en/img' if len(sys.argv)>8 else 'img'
a=Image.open(f'/home/claude/medatlas-/data/{src}/ant/{nm}.webp').convert('RGB').crop((x0,y0,x1,y1))
W,H=int((x1-x0)*sc),int((y1-y0)*sc); a=a.resize((W,H)); im=Image.new('RGB',(W+40,H+20),'white'); im.paste(a,(40,20)); d=ImageDraw.Draw(im)
for x in range((x0//10+1)*10,x1,10):
    X=40+(x-x0)*sc; d.line([(X,12 if x%50 else 0),(X,20)],fill='red')
    if x%50==0: d.text((X+2,0),str(x),fill='red')
    if x%50==0: d.line([(X,20),(X,H+20)],fill=(255,0,0,60))
for y in range((y0//10+1)*10,y1,10):
    Y=20+(y-y0)*sc; d.line([(32 if y%50 else 20,Y),(40,Y)],fill='blue')
    if y%50==0: d.text((0,Y-5),str(y),fill='blue')
im.save(fn)
