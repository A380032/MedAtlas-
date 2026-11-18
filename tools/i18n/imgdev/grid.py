# grid.py nm x0 y0 x1 y1 [k] — asl rasm qirqimi, koordinata to'ri bilan (/tmp/g.png)
import sys
from PIL import Image, ImageDraw, ImageFont
nm = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); k = float(sys.argv[6]) if len(sys.argv) > 6 else 2
src = sys.argv[7] if len(sys.argv) > 7 else "img"
im = Image.open(f"/home/claude/medatlas-/data/{'en/img' if src == 'en' else 'img'}/ant/{nm}.webp").convert("RGB").crop((x0, y0, x1, y1))
im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
M = 34
S = Image.new("RGB", (im.width + M, im.height + M), (255, 255, 255)); S.paste(im, (M, M))
d = ImageDraw.Draw(S); f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
for x in range((x0 // 10 + 1) * 10, x1, 10):
    X = M + (x - x0) * k
    d.line([(X, M - (8 if x % 50 == 0 else 3)), (X, M)], fill=(255, 0, 0))
    if x % 50 == 0: d.text((X - 10, 2), str(x), fill=(255, 0, 0), font=f); d.line([(X, M), (X, S.height)], fill=(255, 150, 150))
for y in range((y0 // 10 + 1) * 10, y1, 10):
    Y = M + (y - y0) * k
    d.line([(M - (8 if y % 50 == 0 else 3), Y), (M, Y)], fill=(0, 0, 255))
    if y % 50 == 0: d.text((0, Y - 6), str(y), fill=(0, 0, 255), font=f); d.line([(M, Y), (S.width, Y)], fill=(150, 150, 255))
S.save("/tmp/g.png")
