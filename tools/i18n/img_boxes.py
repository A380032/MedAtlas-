"""python3 tools/i18n/img_boxes.py <id> <rasm_nomi> [--grid out.png]
Rasmdagi yozuv qatorlarini (to'q rangli mayda belgilar guruhlari) quti sifatida topadi va
tesseract (rus+eng) bilan o'qishga urinadi. --grid berilsa, qutilar raqamlangan holda chizilgan
kattalashtirilgan nusxa saqlanadi (img_en.json uchun koordinata tanlashda yordam)."""
import os, subprocess, sys, tempfile

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sid, name = sys.argv[1], sys.argv[2]
grid = sys.argv[sys.argv.index("--grid") + 1] if "--grid" in sys.argv else None
im = Image.open(f"data/img/{sid}/{name}").convert("RGB")
a = np.asarray(im).astype(int)
luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
sat = a.max(axis=2) - a.min(axis=2)
ink = ((luma < 150) | ((sat > 90) & (luma < 120))).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
glyph = np.zeros_like(ink)
for i in range(1, n):
    x, y, w, h, area = st[i]
    if 2 <= h <= 26 and w <= 40 and area >= 2:   # belgi o'lchamidagi komponentlar
        glyph[lab == i] = 1
k = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 3))
merged = cv2.dilate(glyph, k)
n2, lab2, st2, _ = cv2.connectedComponentsWithStats(merged, 8)
boxes = []
for i in range(1, n2):
    x, y, w, h, area = st2[i]
    if w >= 8 and h >= 6:
        boxes.append((x + 3, y + 1, x + w - 4, y + h - 2))
boxes.sort(key=lambda b: (b[1] // 8, b[0]))


def ocr(b):
    x0, y0, x1, y1 = b
    crop = im.crop((max(0, x0 - 2), max(0, y0 - 2), x1 + 3, y1 + 3))
    crop = crop.resize((crop.width * 4, crop.height * 4), Image.LANCZOS)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "c.png")
        crop.save(p)
        return subprocess.run(["tesseract", p, "-", "--psm", "7", "-l", "rus+eng"],
                              capture_output=True, text=True).stdout.strip()


for j, b in enumerate(boxes):
    print(f"{j:3d} {b[0]},{b[1]},{b[2]},{b[3]}  {ocr(b)}")
if grid:
    K = 2
    g = im.resize((im.width * K, im.height * K), Image.LANCZOS)
    dr = ImageDraw.Draw(g)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
    for j, (x0, y0, x1, y1) in enumerate(boxes):
        dr.rectangle((x0 * K, y0 * K, x1 * K, y1 * K), outline=(255, 0, 0))
        dr.text((x0 * K, y0 * K - 14), str(j), fill=(255, 0, 0), font=f)
    g.save(grid)
