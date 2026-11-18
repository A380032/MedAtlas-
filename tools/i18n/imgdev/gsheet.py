# gsheet.py out.png src(img|en) "nm x0 y0 x1 y1" ... — bir nechta koordinatali qirqim
import sys
from PIL import Image, ImageDraw, ImageFont
out, src = sys.argv[1], sys.argv[2]
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
panels = []
for spec in sys.argv[3:]:
    nm, *c = spec.split(); x0, y0, x1, y1 = map(int, c)
    im = Image.open(f"/home/claude/medatlas-/data/{'en/img' if src == 'en' else 'img'}/ant/{nm}.webp").convert("RGB").crop((x0, y0, x1, y1))
    k = min(3.0, 560 / im.width)
    im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    M = 30
    P = Image.new("RGB", (im.width + M, im.height + M + 14), (255, 255, 255)); P.paste(im, (M, M + 14))
    d = ImageDraw.Draw(P); d.text((2, 0), f"{nm} k={k:.2f}", fill=(0, 120, 0), font=fb)
    for x in range((x0 // 10 + 1) * 10, x1, 10):
        X = M + (x - x0) * k; d.line([(X, M + 14 - (8 if x % 50 == 0 else 3)), (X, M + 14)], fill=(255, 0, 0))
        if x % 50 == 0: d.text((X - 10, 14), str(x), fill=(255, 0, 0), font=f)
    for y in range((y0 // 10 + 1) * 10, y1, 10):
        Y = M + 14 + (y - y0) * k; d.line([(M - (8 if y % 50 == 0 else 3), Y), (M, Y)], fill=(0, 0, 255))
        if y % 50 == 0 or (y1 - y0) < 70: d.text((0, Y - 6), str(y), fill=(0, 0, 255), font=f)
        pass
    panels.append(P)
W = max(p.width for p in panels); H = sum(p.height + 6 for p in panels)
S = Image.new("RGB", (W, H), (80, 80, 80)); y = 0
for p in panels: S.paste(p, (0, y)); y += p.height + 6
S.save(out)
