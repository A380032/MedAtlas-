# python3 lchar.py BOOK — rasmlardagi yakka kirill panel harflarini (б в г д е ж) topadi → lchar_BOOK.json + varaq
import sys, glob, os, json, re, subprocess, tempfile
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
R = "/home/claude/medatlas-"; book = sys.argv[1]
names = sys.argv[2:]
def key(p):
    m = re.search(r"p(\d+)_(\d+)", p); return (int(m.group(1)), int(m.group(2))) if m else (9999, 0)
paths = [f"{R}/data/img/{book}/{n}.webp" for n in names] if names else sorted(glob.glob(f"{R}/data/img/{book}/*.webp"), key=key)
WANT = set("бвгдежзБВГДЕЖ")
res = []
for p in paths:
    im = Image.open(p).convert("RGB"); a = np.asarray(im).astype(int)
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    H, W = luma.shape
    ink = (luma < 140).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if not (6 <= h <= 26 and 3 <= w <= 22 and area >= 8): continue
        m = 5
        x0, y0, x1, y1 = max(0, x - m), max(0, y - m), min(W, x + w + m), min(H, y + h + m)
        win = luma[y0:y1, x0:x1].copy()
        own = (lab[y0:y1, x0:x1] == i)
        bgpx = win[~own]
        if len(bgpx) == 0 or (bgpx > 175).mean() < 0.93: continue   # atrofi toza (yorug') bo'lsin
        c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * 5, (y1 - y0) * 5), Image.LANCZOS)
        with tempfile.NamedTemporaryFile(suffix=".png") as f:
            c.save(f.name)
            t = subprocess.run(["tesseract", f.name, "-", "--psm", "10", "-l", "rus"], capture_output=True, text=True).stdout.strip()
        if t[:1] in WANT and len(t) <= 2:
            res.append({"img": os.path.basename(p)[:-5], "box": [int(x), int(y), int(x + w - 1), int(y + h - 1)], "ch": t[:1].lower(), "bg": "#%02x%02x%02x" % tuple(int(v) for v in np.median(a[y0:y1, x0:x1][~own], axis=0))})
json.dump(res, open(f"lchar_{book}.json", "w"))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
cols, cw, ch = 12, 110, 80
S = Image.new("RGB", (cols * cw, max(1, (len(res) + cols - 1) // cols) * ch), (40, 40, 40)); d = ImageDraw.Draw(S)
for j, r in enumerate(res):
    im = Image.open(f"{R}/data/img/{book}/{r['img']}.webp").convert("RGB"); x0, y0, x1, y1 = r["box"]
    c = im.crop((max(0, x0 - 10), max(0, y0 - 10), min(im.width, x1 + 11), min(im.height, y1 + 11)))
    k = min(3, 100 / c.width, 56 / c.height); c = c.resize((int(c.width * k), int(c.height * k)), Image.LANCZOS)
    X, Y = (j % cols) * cw, (j // cols) * ch
    S.paste(c, (X + 4, Y + 18)); d.text((X + 3, Y + 2), f"{j}:{r['img'][1:]} {r['ch']}", fill=(255, 255, 0), font=font)
S.save(f"lchar_{book}.png"); print(book, len(res))
