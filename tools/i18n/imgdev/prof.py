# prof.py nm x0 x1 y0 y1 — qatorlar bo'yicha to'q (navy/qora) piksellar soni
import sys, numpy as np
from PIL import Image
nm = sys.argv[1]; x0, x1, y0, y1 = map(int, sys.argv[2:6])
a = np.asarray(Image.open(f"/home/claude/medatlas-/data/img/ant/{nm}.webp").convert("RGB")).astype(int)
lu = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
nv = (a[..., 2] - a[..., 0] >= 11) & (lu < 160)
out = []
for y in range(y0, y1):
    out.append(f"{y}:{int((lu[y, x0:x1] < 90).sum())}/{int(nv[y, x0:x1].sum())}")
print(" ".join(out))
