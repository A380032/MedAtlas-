# python3 lall.py BOOK — barcha yakka (atrofi toza) mayda glif komponentlari varaqlari (ko'rib tanlash uchun)
import sys, glob, os, json, re
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
R = "/home/claude/medatlas-"; book = sys.argv[1]
def key(p):
    m = re.search(r"p(\d+)_(\d+)", p); return (int(m.group(1)), int(m.group(2))) if m else (9999, 0)
res = []
for p in sorted(glob.glob(f"{R}/data/img/{book}/*.webp"), key=key):
    im = Image.open(p).convert("RGB"); a = np.asarray(im).astype(int)
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    H, W = luma.shape
    ink = (luma < 150).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if not (6 <= h <= 22 and 4 <= w <= 18 and area >= 10 and h >= 0.6 * w): continue
        m = 6
        x0, y0, x1, y1 = max(0, x - m), max(0, y - m), min(W, x + w + m), min(H, y + h + m)
        own = (lab[y0:y1, x0:x1] == i)
        bgpx = luma[y0:y1, x0:x1][~own]
        if (bgpx > 185).mean() < 0.97: continue
        res.append({"img": os.path.basename(p)[:-5], "box": [int(x), int(y), int(x + w - 1), int(y + h - 1)]})
json.dump(res, open(f"lall_{book}.json", "w"))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 10)
cols, cw, ch, per = 16, 82, 66, 160
for si in range(0, len(res), per):
    chunk = res[si:si + per]
    S = Image.new("RGB", (cols * cw, ((len(chunk) + cols - 1) // cols) * ch), (40, 40, 40)); d = ImageDraw.Draw(S)
    for j, r in enumerate(chunk):
        im = Image.open(f"{R}/data/img/{book}/{r['img']}.webp").convert("RGB"); x0, y0, x1, y1 = r["box"]
        c = im.crop((max(0, x0 - 8), max(0, y0 - 6), min(im.width, x1 + 9), min(im.height, y1 + 7)))
        k = min(3, 76 / c.width, 46 / c.height); c = c.resize((int(c.width * k), int(c.height * k)), Image.LANCZOS)
        X, Y = (j % cols) * cw, (j // cols) * ch
        S.paste(c, (X + 3, Y + 16)); d.text((X + 2, Y + 2), f"{si + j}:{r['img'][1:]}", fill=(255, 255, 0), font=font)
    S.save(f"lall_{book}_{si // per + 1:02d}.png")
print(book, len(res))
