# rowseg.py — blok atrofidagi matn qatorlarini ajratadi (qo'lda tanlash uchun)
import json, numpy as np, cv2
from PIL import Image
R = "/home/claude/medatlas-"
_c = {}
def prep(nm):
    if nm in _c: return _c[nm]
    im = Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")
    a = np.asarray(im).astype(int)
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    sat = a.max(axis=2) - a.min(axis=2)
    ink = ((luma < 175) & (sat < 150)).astype(np.uint8)
    hl = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (22, 1)))
    vl = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 18)))
    tink = (ink & (1 - hl) & (1 - vl)).astype(bool)
    _c.clear(); _c[nm] = (im, luma, tink); return _c[nm]
def segs(nm, b, up=48, dn=48, pad=30):
    im, luma, tink = prep(nm); H, W = luma.shape
    bx = [b["uz"]] + [b[k] for k in ("lat", "ru") if b.get(k)]
    s0 = min(q[0] for q in bx); s1 = max(q[2] for q in bx)
    wx0, wx1 = max(0, s0 - pad), min(W - 1, s1 + pad)
    wy0, wy1 = max(0, b["uz"][1] - up), min(H - 1, b["uz"][3] + dn)
    m = tink[wy0:wy1 + 1, wx0:wx1 + 1]
    # faqat blok ustunida (s0..s1) siyoh bor qatorlar
    core = m[:, s0 - wx0:s1 - wx0 + 1]
    rs = core.sum(axis=1)
    lh = max(8, min([q[3] - q[1] + 1 for q in bx[1:]] or [(b["uz"][3] - b["uz"][1] + 1) / b["nl"]]))
    bands = []; y = 0
    while y < len(rs):
        if rs[y] > 0:
            a0 = y
            while y < len(rs) and rs[y] > 0: y += 1
            bands.append([a0, y - 1])
        else: y += 1
    sp = []
    def split(a0, a1):
        if a1 - a0 + 1 <= 1.55 * lh: sp.append([a0, a1]); return
        lo, hi = a0 + int(0.6 * lh), a1 - int(0.6 * lh)
        if hi <= lo: sp.append([a0, a1]); return
        yy = lo + int(np.argmin(rs[lo:hi + 1]))
        split(a0, yy); split(yy + 1, a1)
    for a0, a1 in bands: split(a0, a1)
    out = []
    for a0, a1 in sp:
        if a1 - a0 < 2: continue
        row = m[a0:a1 + 1].sum(axis=0) >= 3
        runs = []; x = 0
        while x < len(row):
            if row[x]:
                r0 = x
                while x < len(row) and row[x]: x += 1
                runs.append([r0, x - 1])
            else: x += 1
        mr = []
        for r in runs:
            if mr and r[0] - mr[-1][1] <= 9: mr[-1][1] = r[1]
            else: mr.append(list(r))
        sel = [r for r in mr if min(r[1], s1 - wx0) - max(r[0], s0 - wx0) >= 0]
        if not sel: continue
        x0 = wx0 + min(r[0] for r in sel); x1 = wx0 + max(r[1] for r in sel)
        sub = m[a0:a1 + 1, x0 - wx0:x1 - wx0 + 1]; ys = np.nonzero(sub.sum(axis=1))[0]
        out.append([x0, wy0 + a0 + int(ys.min()), x1, wy0 + a0 + int(ys.max())])
    # juda yaqin (1px) bo'lingan qatorlarni (diakritika) birlashtirish
    mg = []
    for r in out:
        if mg and r[1] - mg[-1][3] <= 1 and (r[3] - r[1] < 4 or mg[-1][3] - mg[-1][1] < 4):
            p = mg[-1]; mg[-1] = [min(p[0], r[0]), p[1], max(p[2], r[2]), r[3]]
        else: mg.append(r)
    return mg, (wx0, wy0, wx1, wy1)
