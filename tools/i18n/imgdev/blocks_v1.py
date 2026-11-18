# blocks.py — yorliq bloklari (lotin / o'zbek / rus) ni topadi; o'zbekcha qator qutilari -> bk/<name>.json
import sys, os, json, subprocess, tempfile, re, glob
import numpy as np, cv2
from PIL import Image
R = "/home/claude/medatlas-"
os.makedirs("bk", exist_ok=True)
K = 3
CYR = re.compile(r"[А-Яа-яЁё]"); LAT = re.compile(r"[A-Za-z]")
def tess(img, psm, lang="eng+rus"):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "a.png"); img.save(p)
        return subprocess.run(["tesseract", p, "-", "--psm", psm, "-l", lang, "tsv"], capture_output=True, text=True).stdout
def words_of(im):
    big = im.resize((im.width * K, im.height * K), Image.LANCZOS)
    ws = []
    for line in tess(big, "11").splitlines()[1:]:
        f = line.split("\t")
        if len(f) < 12 or not f[11].strip(): continue
        x, y, w, h = (int(v) / K for v in f[6:10])
        t = f[11].strip()
        if float(f[10]) < 20: continue
        ws.append({"box": [int(x), int(y), int(round(x + w)), int(round(y + h))], "t": t, "conf": float(f[10])})
    return ws
def rows_of(ws):
    ws = sorted(ws, key=lambda w: w["box"][0]); rows = []
    for w in ws:
        h = w["box"][3] - w["box"][1]
        best = None
        for r in rows:
            b = r["box"]; rh = b[3] - b[1]
            ov = min(b[3], w["box"][3]) - max(b[1], w["box"][1])
            if ov >= 0.55 * min(rh, h) and -3 <= w["box"][0] - b[2] <= max(10, 1.3 * min(rh, h)):
                best = r; break
        if best:
            b = best["box"]; best["ws"].append(w)
            best["box"] = [min(b[0], w["box"][0]), min(b[1], w["box"][1]), max(b[2], w["box"][2]), max(b[3], w["box"][3])]
        else:
            rows.append({"box": list(w["box"]), "ws": [w]})
    for r in rows:
        r["t"] = " ".join(w["t"] for w in r["ws"])
        r["cyr"] = len(CYR.findall(r["t"])); r["lat"] = len(LAT.findall(r["t"]))
        del r["ws"]
    return rows
def run(nm):
    im = Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")
    a = np.asarray(im).astype(int); H, W = a.shape[:2]
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    sat = a.max(axis=2) - a.min(axis=2)
    ink = ((luma < 165) & (sat < 110)).astype(np.uint8)
    hl = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (16, 1)))
    vl = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 16)))
    tink = ink & (1 - hl) & (1 - vl)
    rows = rows_of(words_of(im))
    for r in rows:
        x0, y0, x1, y1 = r["box"]; reg = luma[y0:y1 + 1, x0:x1 + 1]; v = reg[reg < 165]
        r["dark"] = int(np.percentile(v, 15)) if len(v) > 8 else 255
    ru = [r for r in rows if r["cyr"] >= 3 and r["cyr"] > r["lat"]]
    lat = [r for r in rows if r["lat"] >= 2 and r["cyr"] <= 1]
    blocks = []
    used = set()
    for R_ in sorted(ru, key=lambda r: r["box"][1]):
        rx0, ry0, rx1, ry1 = R_["box"]; rh = max(6, ry1 - ry0)
        above = [l for l in lat if l["box"][3] <= ry0 + 3 and ry0 - l["box"][3] <= 3.4 * rh
                 and min(l["box"][2], rx1) - max(l["box"][0], rx0) > -15]
        above.sort(key=lambda l: -l["box"][3])
        uzr, latin = [], None
        for l in above:
            if l["dark"] < 0.72 * R_["dark"] and l["dark"] < 45 and (not uzr or uzr[-1]["box"][1] - l["box"][3] <= 1.0 * rh):
                uzr.append(l); continue
            if not uzr and l["box"][3] > ry0 - 0.3 * rh:
                continue
            latin = l; break
        # o'zbekcha bandi (y oralig'i)
        by0 = latin["box"][3] + 1 if latin else int(ry0 - (2.3 if not uzr else 1.2) * rh * max(1, len(uzr)))
        if uzr: by0 = min(by0, min(u["box"][1] for u in uzr) - 1) if not latin else by0
        by1 = ry0 - 1
        if by1 - by0 < 4: continue
        span0 = min([rx0] + ([latin["box"][0]] if latin else []))
        span1 = max([rx1] + ([latin["box"][2]] if latin else []))
        bl = luma[by0:by1 + 1]; bt = tink[by0:by1 + 1].astype(bool)
        if bt.sum() < 10: continue
        udk = float(np.percentile(bl[bt], 5))
        thr = 0.5 * (udk + R_["dark"]) if R_["dark"] < 200 else 110
        if R_["dark"] - udk < 12: thr = udk + 12
        m = (bt & (bl < thr)).astype(np.uint8)
        pass
        col = m.sum(axis=0) > 0
        runs = []; x = 0
        while x < W:
            if col[x]:
                s0 = x
                while x < W and col[x]: x += 1
                runs.append([s0, x - 1])
            else: x += 1
        mr = []
        for r_ in runs:
            if mr and r_[0] - mr[-1][1] <= 9: mr[-1][1] = r_[1]
            else: mr.append(list(r_))
        sel = [r_ for r_ in mr if min(r_[1], span1) - max(r_[0], span0) > 0 and r_[1] - r_[0] >= 4]
        if not sel: continue
        ux0 = min(r_[0] for r_ in sel); ux1 = max(r_[1] for r_ in sel)
        al = "c"
        if latin:
            if abs(latin["box"][0] - rx0) <= 4: al = "l"
            elif abs(latin["box"][2] - rx1) <= 4: al = "r"
        if al == "l": ux0 = max(ux0, span0 - 3)
        if al == "r": ux1 = min(ux1, span1 + 3)
        rowsum = m[:, ux0:ux1 + 1].sum(axis=1)
        ys = np.nonzero(rowsum > 0)[0]
        if len(ys) == 0: continue
        uy0, uy1 = by0 + int(ys.min()), by0 + int(ys.max())
        if uy1 - uy0 < 4 or ux1 - ux0 < 8: continue
        key = (ux0 // 4, uy0 // 4)
        if key in used: continue
        used.add(key)
        # qator(lar) soni: bo'sh qatorlar bo'yicha bo'lish
        segs = []; inrow = False
        for yy in range(uy0 - by0, uy1 - by0 + 1):
            if rowsum[yy] > 0 and not inrow: segs.append([yy, yy]); inrow = True
            elif rowsum[yy] > 0: segs[-1][1] = yy
            else: inrow = False
        segs = [s_ for s_ in segs if s_[1] - s_[0] >= 3]
        keep = []
        for s_ in segs:
            reg = luma[by0 + s_[0]:by0 + s_[1] + 1, ux0:ux1 + 1]; v = reg[reg < 165]
            p15 = np.percentile(v, 15) if len(v) > 5 else 255
            if p15 < 0.62 * R_["dark"] or p15 < udk + 14: keep.append(s_)
        if not keep: continue
        if len(keep) < len(segs):
            uy0, uy1 = by0 + keep[0][0], by0 + keep[-1][1]
            sub = m[keep[0][0]:keep[-1][1] + 1, ux0:ux1 + 1]
            xs = np.nonzero(sub.sum(axis=0) > 0)[0]
            if len(xs): ux0, ux1 = ux0 + int(xs.min()), ux0 + int(xs.max())
        segs = keep
        blocks.append({"ru": R_["box"], "ru_t": R_["t"], "lat": latin["box"] if latin else None, "lat_t": latin["t"] if latin else "",
                       "uz": [ux0, uy0, ux1, uy1], "nl": max(1, len(segs)), "uz_t": " / ".join(u["t"] for u in sorted(uzr, key=lambda u: u["box"][1])),
                       "a": al, "ru_dark": R_["dark"]})
    json.dump({"W": W, "H": H, "blocks": blocks, "rows": rows}, open(f"bk/{nm}.json", "w"), ensure_ascii=False)
    return blocks, rows
if __name__ == "__main__":
    for nm in sys.argv[1:]:
        B, rows = run(nm)
        print(f"== {nm}: {len(B)} blok, {len(rows)} qator")
        for i, b in enumerate(B): print(i, b["uz"], b["nl"], b["a"], "|", b["lat_t"], "|", b["uz_t"], "|", b["ru_t"])
