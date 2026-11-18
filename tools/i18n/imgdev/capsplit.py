# capsplit.py nm x0 y0 x1 y1 — qatordagi so'zlar (x oralig'i bilan)
import sys
from PIL import Image
import blocks as BL
nm = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6])
im = Image.open(f"/home/claude/medatlas-/data/img/ant/{nm}.webp").convert("RGB").crop((x0, y0, x1, y1))
for w in BL.words_of(im):
    b = w["box"]; print(b[0] + x0, b[1] + y0, b[2] + x0, b[3] + y0, w["t"])
