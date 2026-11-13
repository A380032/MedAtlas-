# python3 lbox.py BOOK — rasmlardagi "oq kvadrat ichidagi harf" belgilarini topadi → lbox_BOOK.json + lbox_BOOK_NN.png (kesmalar varag'i)
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
    wh = (luma > 215).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(wh, 4)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if not (8 <= w <= 34 and 8 <= h <= 34 and 0.7 <= w / h <= 1.45): continue
        if area < 0.5 * w * h: continue
        if x < 2 or y < 2 or x + w > W - 2 or y + h > H - 2: 
            pass
        # ichida to'q glif bormi
        inner = luma[y + 1:y + h - 1, x + 1:x + w - 1]
        dark = (inner < 110).sum()
        if dark < 5 or dark > 0.45 * inner.size: continue
        # atrofi (halqa) to'qroq bo'lsin: ramka yoki rasm
        x0, y0, x1, y1 = max(0, x - 2), max(0, y - 2), min(W - 1, x + w + 1), min(H - 1, y + h + 1)
        ring = np.concatenate([luma[y0, x0:x1 + 1], luma[y1, x0:x1 + 1], luma[y0:y1 + 1, x0], luma[y0:y1 + 1, x1]])
        if (ring < 200).mean() < 0.6: continue
        res.append({"img": os.path.basename(p)[:-5], "box": [int(x), int(y), int(x + w - 1), int(y + h - 1)]})
json.dump(res, open(f"lbox_{book}.json", "w"))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
per = 120; cols = 12; cw, ch = 110, 86
for si in range(0, len(res), per):
    chunk = res[si:si + per]
    S = Image.new("RGB", (cols * cw, ((len(chunk) + cols - 1) // cols) * ch), (40, 40, 40)); d = ImageDraw.Draw(S)
    for j, r in enumerate(chunk):
        im = Image.open(f"{R}/data/img/{book}/{r['img']}.webp").convert("RGB")
        x0, y0, x1, y1 = r["box"]
        c = im.crop((max(0, x0 - 8), max(0, y0 - 8), min(im.width, x1 + 9), min(im.height, y1 + 9)))
        k = min(3, 100 / c.width, 62 / c.height); c = c.resize((int(c.width * k), int(c.height * k)), Image.LANCZOS)
        X, Y = (j % cols) * cw, (j // cols) * ch
        S.paste(c, (X + 4, Y + 18)); d.text((X + 3, Y + 2), f"{si + j}:{r['img'][1:]}", fill=(255, 255, 0), font=font)
    S.save(f"lbox_{book}_{si // per + 1:02d}.png")
print(book, len(res))
