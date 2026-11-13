"""python3 blk.py BOOK name [name...]  — diagramma rasmlaridagi matn bloklarini topadi.
Natija: blk/BOOK/name.json  {"W","H","smax","blocks":[{"id","tb":[matn qutisi],"box":[kengaytirilgan quti],"lh":qator bo'yi,"n":qatorlar}]}
        blk/BOOK/name.png  — raqamlangan nusxa (ko'rib tarjima yozish uchun)
Muhit: GH/GV — bloklarni birlashtirish oralig'i (px), INK — siyoh chegarasi (luma), SCALE — glif o'lchami ko'paytuvchisi"""
import sys, os, json
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
R = "/home/claude/medatlas-"
book = sys.argv[1]
GH = int(os.environ.get("GH", 9)); GV = int(os.environ.get("GV", 6)); INK = int(os.environ.get("INK", 150))
MAXH = int(os.environ.get("MAXH", 30)); GHK = float(os.environ.get("GHK", 0.8))
os.makedirs(f"blk/{book}", exist_ok=True)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)

def run(name):
    im = Image.open(f"{R}/data/img/{book}/{name}.webp").convert("RGB")
    a = np.asarray(im).astype(int); H, W = a.shape[:2]
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    sat = a.max(axis=2) - a.min(axis=2)
    ink = ((luma < INK) | ((sat > 90) & (luma < 170))).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
    glyph = np.zeros_like(ink)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if 2 <= h <= MAXH and w <= MAXH * 1.6 and area >= 2 and not (w > 3 * h and h <= 3):
            glyph[lab == i] = 1
    kx = max(5, int(MAXH * 0.3)) | 1
    merged = cv2.dilate(glyph, cv2.getStructuringElement(cv2.MORPH_RECT, (kx, 1)))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(merged, 8)
    lines = []
    for i in range(1, n2):
        x, y, w, h, area = st2[i]
        # haqiqiy glif chegarasi
        ys, xs = np.nonzero((lab2[y:y + h, x:x + w] == i) & (glyph[y:y + h, x:x + w] == 1))
        if len(xs) == 0: continue
        x0, x1, y0, y1 = x + xs.min(), x + xs.max(), y + ys.min(), y + ys.max()
        if x1 - x0 >= 6 and y1 - y0 >= 5 and len(xs) >= 14:
            lines.append([int(x0), int(y0), int(x1), int(y1)])
    # yopiq sohalar (tugun ichi): yorug' piksellarning bog'langan komponentlari
    LT = int(os.environ.get("LT", 200))
    light = (luma > LT).astype(np.uint8)
    nr, rlab, rst, _ = cv2.connectedComponentsWithStats(light, 4)
    def region(l):
        x0, y0, x1, y1 = l
        xs0, xs1, ys0, ys1 = max(0, x0 - 1), min(W - 1, x1 + 1), max(0, y0 - 1), min(H - 1, y1 + 1)
        ring = np.concatenate([rlab[ys0, xs0:xs1 + 1], rlab[ys1, xs0:xs1 + 1], rlab[ys0:ys1 + 1, xs0], rlab[ys0:ys1 + 1, xs1]])
        ring = ring[ring > 0]
        if len(ring) == 0: return 0
        r = int(np.bincount(ring).argmax())
        x, y, w, h, area = rst[r]
        closed = x > 0 and y > 0 and x + w < W and y + h < H and w * h < 0.45 * W * H and w < 0.97 * W
        return r if closed else 0
    groups = {}; opens = []
    for l in lines:
        r = region(l)
        if r: groups.setdefault(r, []).append(l)
        else: opens.append(l)
    bl = [[*l, [l], 0] for l in opens]
    ch = True
    while ch:
        ch = False
        for i in range(len(bl)):
            for j in range(i + 1, len(bl)):
                p, q = bl[i], bl[j]
                hh = min(max(l[3] - l[1] + 1 for l in p[4]), max(l[3] - l[1] + 1 for l in q[4]))
                gh = max(GH, int(hh * GHK)); gv = max(GV, int(hh * 0.55))
                vov = min(p[3], q[3]) - max(p[1], q[1]); hov = min(p[2], q[2]) - max(p[0], q[0])
                near_h = vov > 0.3 * hh and p[0] - gh <= q[2] and q[0] - gh <= p[2]
                near_v = hov > -gh and p[1] - gv <= q[3] and q[1] - gv <= p[3]
                if near_h or near_v:
                    bl[i] = [min(p[0], q[0]), min(p[1], q[1]), max(p[2], q[2]), max(p[3], q[3]), p[4] + q[4], 0]
                    del bl[j]; ch = True; break
            if ch: break
    for r, ls in groups.items():
        med = np.median(a[rlab == r], axis=0)
        bl.append([min(l[0] for l in ls), min(l[1] for l in ls), max(l[2] for l in ls), max(l[3] for l in ls), ls, r, "#%02x%02x%02x" % tuple(int(v) for v in med)])
    if os.environ.get("NODES") == "1":   # mayda diagrammalar: bloklar = yopiq rangli tugunlar (ramka ichi)
        bl = []
        nm = ((a.min(axis=2) < int(os.environ.get("NWH", 247))) & (luma > 190)).astype(np.uint8)
        nm = cv2.morphologyEx(nm, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
        nm = cv2.morphologyEx(nm, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (int(os.environ.get("NCX", 9)), int(os.environ.get("NCY", 7)))))
        nn, nlab, nst, _ = cv2.connectedComponentsWithStats(nm, 4)
        for r in range(1, nn):
            x, y, w, h, area = nst[r]
            if w < 25 or h < 9 or w > 0.9 * W: continue
            if area < 0.4 * w * h: continue
            lhh = max(6, min(h - 6, int(os.environ.get("NLH", 8))))
            med = np.median(a[nlab == r], axis=0)
            bl.append([int(x + 5), int(y + 1), int(x + w - 6), int(y + h - 2), [[int(x), int(y) + 3, int(x + w), int(y) + 3 + lhh]], -1, "#%02x%02x%02x" % tuple(int(v) for v in med)])
    bl.sort(key=lambda b: ((b[1] + b[3]) // 2 // 14, b[0]))
    out = []
    for k, b in enumerate(bl):
        x0, y0, x1, y1 = b[:4]
        # fon rangi: blok atrofidagi halqa medianasi
        ring = np.concatenate([a[max(0, y0 - 2), x0:x1 + 1], a[min(H - 1, y1 + 2), x0:x1 + 1]])
        bg = np.median(ring, axis=0)
        def clean(sl):
            px = a[sl].reshape(-1, 3)
            dv = np.abs(px - bg).max(axis=1)
            return (dv < 24).mean() > 0.995 and dv.max() < 70
        e = None
        if b[5] == -1:
            e = [x0, y0, x1, y1]
        elif b[5]:
            rx, ry, rw, rh, _ = rst[b[5]]
            ix, iy = (5, 3) if rh >= 30 else (3, 2)
            # matn balandligidagi haqiqiy kenglik
            rows = (rlab[max(ry, y0 - 2):min(ry + rh - 1, y1 + 2) + 1, rx:rx + rw] == b[5])
            cols = np.nonzero(rows.mean(axis=0) > 0.5)[0]
            cx0 = rx + int(cols.min()) if len(cols) else rx; cx1 = rx + int(cols.max()) if len(cols) else rx + rw - 1
            e = [min(cx0 + ix, x0 - 1), min(int(ry) + iy, y0 - 1), max(cx1 - ix, x1 + 1), max(int(ry + rh - 1) - iy, y1 + 1)]
        if e is None:   # ochiq yozuv (oq fonda): qat'iy toza kengaytirish, simmetrik, kichik
            up = dn = lf = rt = 0
            while up < 3 and y0 - up - 1 >= 0 and clean((y0 - up - 1, slice(x0, x1 + 1))): up += 1
            while dn < 3 and y1 + dn + 1 < H and clean((y1 + dn + 1, slice(x0, x1 + 1))): dn += 1
            while lf < 4 and x0 - lf - 3 >= 0 and clean((slice(y0, y1 + 1), x0 - lf - 3)): lf += 1
            while rt < 4 and x1 + rt + 3 < W and clean((slice(y0, y1 + 1), x1 + rt + 3)): rt += 1
            e = [x0 - lf - 2, y0 - up - 1, x1 + rt + 2, y1 + dn + 1]
        e = [int(max(0, e[0])), int(max(0, e[1])), int(min(W - 1, e[2])), int(min(H - 1, e[3]))]
        open_ = not b[5]
        lh = sorted(l[3] - l[1] + 1 for l in b[4])
        # qatorlar soni: y bo'yicha klaster
        ys = sorted(set((l[1] + l[3]) // 2 for l in b[4])); nl = 1
        for u, v in zip(ys, ys[1:]):
            if v - u > 6: nl += 1
        out.append({"id": k, "tb": [int(x0), int(y0), int(x1), int(y1)], "box": [int(v) for v in e], "lh": int(lh[len(lh) // 2]), "n": int(nl),
                    "bg": "#%02x%02x%02x" % tuple(int(v) for v in bg), "open": bool(open_), **({"nbg": b[6]} if len(b) > 6 else {})})
    hs = sorted(o["lh"] for o in out) or [12]
    smax = int(round(hs[min(len(hs) - 1, int(len(hs) * 0.85))] / 0.93))
    json.dump({"W": int(W), "H": int(H), "smax": int(smax), "blocks": out}, open(f"blk/{book}/{name}.json", "w"))
    g = im.copy(); d = ImageDraw.Draw(g)
    for o in out:
        d.rectangle(o["box"], outline=(0, 160, 255))
        x0, y0, x1, y1 = o["tb"]
        tx = max(0, x0 - 8 - 7 * len(str(o["id"]))); ty = max(0, y0 - 3)
        d.rectangle((tx - 1, ty, tx + 7 * len(str(o["id"])) + 1, ty + 12), fill=(255, 255, 0))
        d.text((tx, ty - 1), str(o["id"]), fill=(255, 0, 0), font=font)
    g.save(f"blk/{book}/{name}.png")
    print("##", name, f"{W}x{H}", len(out), "blok, smax", smax)
    if os.environ.get("OCR", "1") == "1":
        import subprocess, tempfile
        for o in out:
            x0, y0, x1, y1 = o["tb"]
            c = im.crop((max(0, x0 - 4), max(0, y0 - 4), min(W, x1 + 5), min(H, y1 + 5)))
            c = c.resize((c.width * 3, c.height * 3), Image.LANCZOS)
            with tempfile.NamedTemporaryFile(suffix=".png") as f:
                c.save(f.name)
                t = subprocess.run(["tesseract", f.name, "-", "--psm", "6", "-l", os.environ.get("OCRL", "eng")], capture_output=True, text=True).stdout.strip()
            print(f"  {o['id']:2d} {'o' if o['open'] else ' '} {o['box'][2]-o['box'][0]+1:3d}x{o['box'][3]-o['box'][1]+1:<3d} lh{o['lh']:2d} | " + t.replace("\n", " / "))

for nm in sys.argv[2:]:
    run(nm.replace(".webp", ""))
