# nvr.py nm x0 x1 y0 y1 — navy qatorlar oralig'i
import sys, numpy as np
from PIL import Image
nm = sys.argv[1]; x0, x1, y0, y1 = map(int, sys.argv[2:6])
a = np.asarray(Image.open(f"/home/claude/medatlas-/data/img/ant/{nm}.webp").convert("RGB")).astype(int)
lu = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
nv = ((a[..., 2] - a[..., 0] >= 12) & (lu < 150))[y0:y1, x0:x1]
c = nv.sum(axis=1); thr = max(3, 0.2 * c.max())
on = c >= thr; out = []; y = 0
while y < len(on):
    if on[y]:
        p = y
        while y < len(on) and on[y]: y += 1
        xs = np.nonzero(nv[p:y].sum(axis=0))[0]
        out.append((y0 + p, y0 + y - 1, x0 + int(xs[0]), x0 + int(xs[-1])))
    else: y += 1
print(nm, out)
