# bold.py — qalin to'q (o'zbekcha) yozuv qatorlarini topadi -> bd/<name>.json
import sys, glob, os, json
import numpy as np, cv2
from PIL import Image
R = "/home/claude/medatlas-"
os.makedirs("bd", exist_ok=True)
LT = int(os.environ.get("LT", 75)); OP = int(os.environ.get("OP", 2))
def detect(name):
    im = Image.open(f"{R}/data/img/ant/{name}.webp").convert("RGB")
    a = np.asarray(im).astype(int); H, W = a.shape[:2]
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    sat = a.max(axis=2) - a.min(axis=2)
    r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
    m = (((luma < LT) & (sat < 90)) | ((b_ - r_ >= 25) & (b_ - g_ >= 12) & (luma < 150))).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((OP, OP), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    gl = np.zeros_like(m)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if 3 <= h <= 18 and w <= 120 and area >= 4 and not (w > 6 * h and h <= 3): gl[lab == i] = 1
    md = cv2.dilate(gl, cv2.getStructuringElement(cv2.MORPH_RECT, (9, 1)))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(md, 8)
    lines = []
    for i in range(1, n2):
        x, y, w, h, area = st2[i]
        sub = (lab2[y:y+h, x:x+w] == i) & (gl[y:y+h, x:x+w] == 1)
        ys, xs = np.nonzero(sub)
        x0, x1, y0, y1 = x + xs.min(), x + xs.max(), y + ys.min(), y + ys.max()
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if bh < 5 or bh > 20 or bw < 2.2 * bh: continue
        # nechta glif
        ng = cv2.connectedComponents(sub.astype(np.uint8))[0] - 1
        if ng < 3: continue
        X0, Y0, X1, Y1 = max(0, x0-3), max(0, y0-3), min(W-1, x1+3), min(H-1, y1+3)
        ring = np.concatenate([luma[Y0, X0:X1+1], luma[Y1, X0:X1+1], luma[Y0:Y1+1, X0], luma[Y0:Y1+1, X1]])
        bg = int(np.median(ring))
        if bg < 180: continue
        lines.append({"box": [int(x0), int(y0), int(x1), int(y1)], "bg": bg, "ng": int(ng)})
    lines.sort(key=lambda l: (l["box"][1], l["box"][0]))
    return W, H, lines
if __name__ == "__main__":
    names = sys.argv[1:] or sorted(os.path.basename(p)[:-5] for p in glob.glob(f"{R}/data/img/ant/*.webp"))
    for nm in names:
        W, H, L = detect(nm)
        json.dump({"W": W, "H": H, "lines": L}, open(f"bd/{nm}.json", "w"))
        print(nm, W, H, len(L))
