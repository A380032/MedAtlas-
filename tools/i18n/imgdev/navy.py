# navy.py — rasmlardagi to'q ko'k (o'zbekcha qalin) yozuv qatorlarini topadi -> navy/<name>.json
import sys, glob, os, json
import numpy as np, cv2
from PIL import Image
R = "/home/claude/medatlas-"
def detect(name):
    im = Image.open(f"{R}/data/img/ant/{name}.webp").convert("RGB")
    a = np.asarray(im).astype(int); H, W = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = ((b - r > 18) & (b - g > 10) & (r < 110) & (b < 200)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    gl = np.zeros_like(m)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if 2 <= h <= 22 and w <= 40 and area >= 3: gl[lab == i] = 1
    md = cv2.dilate(gl, cv2.getStructuringElement(cv2.MORPH_RECT, (9, 1)))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(md, 8)
    lines = []
    for i in range(1, n2):
        x, y, w, h, area = st2[i]
        ys, xs = np.nonzero((lab2[y:y+h, x:x+w] == i) & (gl[y:y+h, x:x+w] == 1))
        if len(xs) < 25: continue
        x0, x1, y0, y1 = x + xs.min(), x + xs.max(), y + ys.min(), y + ys.max()
        if x1 - x0 < 14 or y1 - y0 < 5: continue
        lines.append([int(x0), int(y0), int(x1), int(y1)])
    lines.sort(key=lambda l: (l[1], l[0]))
    return W, H, lines
if __name__ == "__main__":
    names = sys.argv[1:] or sorted(os.path.basename(p)[:-5] for p in glob.glob(f"{R}/data/img/ant/*.webp"))
    tot = 0
    for nm in names:
        W, H, L = detect(nm)
        json.dump({"W": W, "H": H, "lines": L}, open(f"navy/{nm}.json", "w"))
        if L: print(nm, W, H, len(L)); tot += len(L)
    print("TOTAL", tot)
