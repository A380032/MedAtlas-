# lines.py — rasmdagi matn qatorlarini topadi, qoraligiga ko'ra tasniflaydi -> ln/<name>.json
import sys, glob, os, json
import numpy as np, cv2
from PIL import Image
R = "/home/claude/medatlas-"
os.makedirs("ln", exist_ok=True)
DK = int(os.environ.get("DK", 30))
def detect(name):
    im = Image.open(f"{R}/data/img/ant/{name}.webp").convert("RGB")
    a = np.asarray(im).astype(int); H, W = a.shape[:2]
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    sat = a.max(axis=2) - a.min(axis=2)
    ink = ((luma < 175) & (sat < 100)).astype(np.uint8)
    # yo'naltiruvchi chiziqlarni (uzun ingichka gorizontal/vertikal/qiya) olib tashlash
    hl = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (22, 1)))
    thick = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 3)))
    hl = hl & (1 - thick)
    vl = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 22)))
    ink = ink & (1 - hl) & (1 - vl)
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
    gl = np.zeros_like(ink)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if 2 <= h <= 20 and w <= 140 and area >= 2 and not (w > 5 * h and h <= 3): gl[lab == i] = 1
    md = cv2.dilate(gl, cv2.getStructuringElement(cv2.MORPH_RECT, (7, 1)))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(md, 8)
    segs = []
    for i in range(1, n2):
        x, y, w, h, area = st2[i]
        sub = (lab2[y:y+h, x:x+w] == i) & (gl[y:y+h, x:x+w] == 1)
        ys, xs = np.nonzero(sub)
        if len(xs) < 12: continue
        x0, x1, y0, y1 = x + xs.min(), x + xs.max(), y + ys.min(), y + ys.max()
        if y1 - y0 < 4 or y1 - y0 > 22: continue
        segs.append([x0, y0, x1, y1])
    # bir qatordagi so'zlarni birlashtirish
    segs.sort(key=lambda s: s[0])
    merged = []
    for s in segs:
        for m in merged:
            ov = min(m[3], s[3]) - max(m[1], s[1])
            if ov >= 0.5 * min(m[3]-m[1], s[3]-s[1]) and 0 <= s[0] - m[2] <= 14 and abs((m[3]-m[1]) - (s[3]-s[1])) <= 6:
                m[0] = min(m[0], s[0]); m[1] = min(m[1], s[1]); m[2] = max(m[2], s[2]); m[3] = max(m[3], s[3]); break
        else:
            merged.append(list(s))
    lines = []
    for x0, y0, x1, y1 in merged:
        if x1 - x0 < 10: continue
        reg = luma[y0:y1+1, x0:x1+1]; g = gl[y0:y1+1, x0:x1+1].astype(bool)
        vals = reg[g]
        if len(vals) < 15: continue
        X0, Y0, X1, Y1 = max(0, x0-3), max(0, y0-3), min(W-1, x1+3), min(H-1, y1+3)
        ring = np.concatenate([luma[Y0, X0:X1+1], luma[Y1, X0:X1+1], luma[Y0:Y1+1, X0], luma[Y0:Y1+1, X1]])
        dark = float(np.percentile(vals, 15))
        lines.append({"box": [int(x0), int(y0), int(x1), int(y1)], "dark": int(dark), "bg": int(np.median(ring)), "uz": bool(dark < DK and x1 - x0 >= 22)})
    lines.sort(key=lambda l: (l["box"][1], l["box"][0]))
    return W, H, lines
if __name__ == "__main__":
    names = sys.argv[1:] or sorted(os.path.basename(p)[:-5] for p in glob.glob(f"{R}/data/img/ant/*.webp"))
    for nm in names:
        W, H, L = detect(nm)
        json.dump({"W": W, "H": H, "lines": L}, open(f"ln/{nm}.json", "w"))
        print(nm, W, H, len(L), sum(l["uz"] for l in L))
