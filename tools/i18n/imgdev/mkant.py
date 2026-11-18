# mkant.py [name...] — bk/<name>.json bloklari + tr/ant_*.tsv tarjimalaridan img_en.json bandlarini yasaydi va chizadi.
# tr/ant_*.tsv: "uXXXX<TAB>English" ("-" = tegilmasin). tr/ant_x.py: X = {name: [qo'shimcha xom bandlar]}, SKIP = {name: {blok indekslari}}
import json, sys, os, glob, subprocess, statistics, importlib.util
import numpy as np
from PIL import Image, ImageDraw, ImageFont
R = "/home/claude/medatlas-"
FONT = os.environ.get("FONT", "dvcb")
FP = {"dvcb": "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf", "sansb": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"}[FONT]
import re, difflib
import blocks as BL
def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace("`", "'").replace("ʻ", "'").replace("|", "").replace("/", " ")
    s = re.sub(r"[^\w' ]", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()
D = json.load(open("trdict.json"))
D2 = {}
for p in sorted(glob.glob("tr2/*.tsv")):
    for line in open(p, encoding="utf8"):
        if "\t" in line and not line.startswith("#"):
            k, v = line.rstrip("\n").split("\t", 1); D2[k] = v
DKEYS = [k for k in D if "|" not in k]
T3 = {}
for p in sorted(glob.glob("tr3/*.tsv")):
    for line in open(p, encoding="utf8"):
        f = line.rstrip("\n").split("\t")
        if len(f) >= 3 and not line.startswith("#"): T3[f[0]] = (f[1], f[2])
from rowseg_frozen import prep as PREP
_NV = {}
_NM = {}
def NAVY(nm):
    if nm not in _NM:
        _NM.clear()
        a = np.asarray(Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")).astype(int)
        lu = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
        m = (a[..., 2] - a[..., 0] >= 16) & (lu < 150)
        # yakka nuqtalarni olib tashlash: kamida 2 qo'shni
        import cv2
        n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
        keep = np.zeros(n, bool); keep[1:] = st[1:, 4] >= 4
        _NM[nm] = keep[lab]
    return _NM[nm]
def navyblock(nm, b):
    if nm not in _NV:
        _NV.clear(); _NV[nm] = np.asarray(Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")).astype(int)
    a = _NV[nm]; H_, W_ = a.shape[:2]
    lu = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
    M = (a[..., 2] - a[..., 0] >= 11) & (lu < 160)
    x0, y0, x1, y1 = b
    # 1) ustunlar: urug' qutisi qatorlarida navy bor ustunlar, 15px dan kichik bo'shliq bilan kengaytirish
    def xext(ya, yb, xa, xb):
        col = M[ya:yb + 1].sum(axis=0) >= 1
        while xa > 0 and col[max(0, xa - 15):xa].any(): xa -= 1
        while xb < W_ - 1 and col[xb + 1:xb + 16].any(): xb += 1
        return xa, xb
    xa, xb = xext(y0, y1, x0, x1)
    X0, X1 = max(0, xa - 2), min(W_ - 1, xb + 2)
    Y0, Y1 = max(0, y0 - 40), min(H_ - 1, y1 + 40)
    cnt = M[Y0:Y1 + 1, X0:X1 + 1].sum(axis=1)
    pk = cnt[max(0, y0 - Y0 - 3):y1 - Y0 + 4].max() if y1 >= y0 else cnt.max()
    rows = cnt >= max(2, 0.2 * pk)
    bands = []; y = 0
    while y < len(rows):
        if rows[y]:
            a0 = y
            while y < len(rows) and rows[y]: y += 1
            bands.append([a0, y - 1])
        else: y += 1
    bands = [[Y0 + p, Y0 + q] for p, q in bands if q - p >= 3]
    if not bands: return b, 1
    cy = (y0 + y1) / 2
    k = min(range(len(bands)), key=lambda i: 0 if bands[i][0] <= cy <= bands[i][1] else min(abs(bands[i][0] - cy), abs(bands[i][1] - cy)))
    lo = hi = k
    while lo > 0 and bands[lo][0] - bands[lo - 1][1] <= 8: lo -= 1
    while hi < len(bands) - 1 and bands[hi + 1][0] - bands[hi][1] <= 8: hi += 1
    ya, yb = bands[lo][0], bands[hi][1]
    # har qator uchun x kengaytirish (ko'p qatorli yorliqlar)
    xs0, xs1 = [], []
    for p, q in bands[lo:hi + 1]:
        c = np.nonzero(M[p:q + 1, X0:X1 + 1].sum(axis=0) >= 1)[0]
        if len(c):
            u0, u1 = xext(p, q, X0 + int(c[0]), X0 + int(c[-1])); xs0.append(u0); xs1.append(u1)
    return [min(xs0), ya, max(xs1), yb], hi - lo + 1
def refine(nm, b, nl):
    a = PREP(nm)[1]; H_, W_ = a.shape
    x0, y0, x1, y1 = b
    Y0, Y1 = max(0, y0 - 8), min(H_ - 1, y1 + 8)
    reg = a[Y0:Y1 + 1, x0:x1 + 1]
    T = np.percentile(reg, 1) + 45
    cnt = (reg < T).sum(axis=1)
    on = cnt >= max(2, 0.12 * cnt.max())
    bands = []; y = 0
    while y < len(on):
        if on[y]:
            p = y
            while y < len(on) and on[y]: y += 1
            bands.append([Y0 + p, Y0 + y - 1])
        else: y += 1
    # yaqin (<=2px) bandlarni birlashtirish (diakritika)
    mg = []
    for bd in bands:
        if mg and bd[0] - mg[-1][1] <= 2: mg[-1][1] = bd[1]
        else: mg.append(list(bd))
    mg = [bd for bd in mg if bd[1] - bd[0] >= 4]
    if not mg: return b
    cy = (y0 + y1) / 2
    mg.sort(key=lambda bd: abs((bd[0] + bd[1]) / 2 - cy))
    sel = sorted(mg[:nl])
    ya, yb = sel[0][0], sel[-1][1]
    cols = np.nonzero((a[ya:yb + 1, max(0, x0 - 6):min(W_, x1 + 7)] < T).sum(axis=0) >= 1)[0]
    if len(cols): x0, x1 = max(0, x0 - 6) + int(cols[0]), max(0, x0 - 6) + int(cols[-1])
    return [int(x0), int(ya - 1), int(x1), int(yb + 1)]
def xexpand(nm, b):
    a = PREP(nm)[1]; H_, W_ = a.shape
    x0, y0, x1, y1 = b
    h = y1 - y0 + 1
    def col_ok(x):
        if x < 0 or x >= W_: return None
        c = a[y0:y1 + 1, x] < 150
        tall = (a[max(0, y0 - 4):min(H_, y1 + 5), x] < 150).sum() > h + 3   # bubble/vertikal chiziq
        if tall: return "stop"
        return c.sum() >= 1
    for step in (-1, 1):
        x = x0 if step == -1 else x1
        gap = 0; last = x
        for k in range(1, 16):
            r = col_ok(x + step * k)
            if r is None or r == "stop": break
            if r: last = x + step * k; gap = 0
            else:
                gap += 1
                if gap >= 4: break
        if step == -1: x0 = min(x0, last)
        else: x1 = max(x1, last)
    return [x0, y0, x1, y1]
MAN = {}; SKIPM = {}
for p_ in sorted(glob.glob("man/skip*.txt")):
    for line in open(p_):
        if line.strip() and not line.startswith("#"):
            a_, b_ = line.split()[:2]; SKIPM.setdefault(a_, set()).update(int(v) for v in b_.split(","))
for p_ in sorted(glob.glob("man/*.tsv")):
    for line in open(p_, encoding="utf8"):
        if line.startswith("#") or "\t" not in line: continue
        f = line.rstrip("\n").split("\t")
        nmm, bxs, al_, nl_, en_ = f[:5]; opt = f[5] if len(f) > 5 else ""
        if bxs.startswith("B"):
            bx_, nl_auto = navyblock(nmm, [int(v) for v in bxs[1:].split(",")])
            if nl_ == "0": nl_ = str(nl_auto)
        elif bxs.startswith("R"):
            RR_ = json.load(open(f"bk/{nmm}.json"))["rows"]
            qs_ = [RR_[int(v)]["box"] for v in bxs[1:].split("+")]
            bx_ = [min(q[0] for q in qs_), min(q[1] for q in qs_), max(q[2] for q in qs_), max(q[3] for q in qs_)]
        else:
            bx_ = [int(v) for v in bxs.split(",")]
        if "A" in opt: bx_ = refine(nmm, bx_, max(1, int(nl_)))
        if "Q" in opt: bx_ = xexpand(nmm, bx_)
        mb = {"uz": bx_, "nl": max(1, int(nl_)), "a": al_, "lat": None, "ru": bx_ if al_ == "c" else None, "forced": en_, "H": "H" in opt, "manual": True}
        if "N" in opt: mb["nosnap"] = True
        if "V" in opt: mb["navy"] = True; mb["nosnap"] = True
        if "I" in opt: mb["nocore"] = True; mb["nosnap"] = True
        if "G" in opt: mb["ring"] = True
        if "W" in opt: mb["strict"] = True
        if "F" in opt: mb["full"] = True
        if "Z" in opt: mb["fullt"] = True
        if "X" in opt: mb["noln"] = True
        if "Q" in opt: mb["soft"] = True
        if "D" in opt: mb["dl"] = int(re.findall(r"D(\d+)", opt)[0])
        if "#" in opt: mb["bgc"] = "#" + opt.split("#")[1][:6]
        if "S" in opt: mb["size"] = int(re.findall(r"S(\d+)", opt)[0])
        MAN.setdefault(nmm, []).append(mb)
SEGF = json.load(open("seg_frozen.json")) if os.path.exists("seg_frozen.json") else {}
def override(nm, i, b):
    rows, en = T3[f"{nm}#{i}"]
    if rows == "-": return None, "-"
    flags = "".join(ch for ch in rows if ch.isupper())
    if rows.startswith("U"):
        flags = "".join(ch for ch in rows.split(":")[-1] if ch.isupper()) if ":" in rows else ""
        rows = rows.split(":")[0]
        D_ = json.load(open(f"bk/{nm}.json"))
        if rows.startswith("UR"):
            ids = [int(q) for q in rows[2:].split("+") if q.strip().isdigit()]
            sel = [list(D_["rows"][k]["box"]) for k in ids]
        else:
            ids = [i] + [int(q) for q in rows[1:].split("+") if q.strip().isdigit()]
            sel = [list(D_["blocks"][k]["uz"]) for k in ids]
        sel.sort(key=lambda r: r[1])
        nb = dict(b)
        nb["uz"] = [min(r[0] for r in sel), min(r[1] for r in sel), max(r[2] for r in sel), max(r[3] for r in sel)]
        lines = []
        for r in sel:
            for ln in lines:
                if min(ln[3], r[3]) - max(ln[1], r[1]) > 0.5 * min(ln[3] - ln[1], r[3] - r[1]): ln[1] = min(ln[1], r[1]); ln[3] = max(ln[3], r[3]); break
            else: lines.append(list(r))
        nb["nl"] = len(lines)
        X0, Y0, X1, Y1 = nb["uz"]
        def near(above):
            best = None
            for r in D_["rows"]:
                q = r["box"]
                if min(q[2], X1) - max(q[0], X0) < 10: continue
                if above and q[3] <= Y0 + 2 and Y0 - q[3] < 14:
                    if best is None or q[3] > best[3]: best = q
                if not above and q[1] >= Y1 - 2 and q[1] - Y1 < 14:
                    if best is None or q[1] < best[1]: best = q
            return best
        nb["lat"], nb["ru"] = near(True), near(False)
        nbrs = [r for r in (nb["lat"], nb["ru"]) if r]
        if nbrs and all(abs(r[0] - X0) <= 5 for r in nbrs): nb["a"] = "l"
        elif nbrs and all(abs(r[2] - X1) <= 5 for r in nbrs): nb["a"] = "r"
        else: nb["a"] = "l" if "L" in flags else ("r" if "R" in flags else "c")
        if nb["a"] == "c": nb["ru"] = nb["ru"] or nb["uz"]
        nb["H"] = "H" in flags
        return nb, en
    if rows == "K": return dict(b), en
    if rows == "O":
        nb = dict(b)
        if b.get("lat") and b.get("ru"):
            nb["uz"] = [b["uz"][0], b["lat"][3] + 1, b["uz"][2], b["ru"][1] - 1]
        return nb, en
    S = SEGF[f"{nm}#{i}"]; idx = []; nl = 0
    for ch in rows:
        if ch.islower(): idx.append("abcdefghijklmnopqrstuvwxyz".index(ch)); nl += 1
        elif ch.isdigit(): nl += int(ch) - 1
    sel = [list(S[k]) for k in idx]
    if "W" in flags:
        from rowseg_frozen import segs as SEGS
        S2, _ = SEGS(nm, b, pad=170)
        if len(S2) == len(S): sel = [list(S2[k]) for k in idx]
    def gaps_of(r):
        _, luma_, tink_ = PREP(nm)
        col = tink_[r[1]:r[3] + 1, r[0]:r[2] + 1].sum(axis=0) >= 1
        xs = np.nonzero(col)[0]
        return xs, [(int(xs[j]), int(xs[j + 1])) for j in range(len(xs) - 1) if xs[j + 1] - xs[j] >= 4]
    if "L" in flags:
        for r in sel:
            xs, g = gaps_of(r)
            if g and g[0][0] < 45 and r[2] - (r[0] + g[0][1]) > 15: r[0] = r[0] + g[0][1]
    if "T" in flags:
        for r in sel:
            xs, g = gaps_of(r)
            if g and (r[2] - r[0]) - g[-1][1] < 45 and g[-1][0] > 15: r[2] = r[0] + g[-1][0]
    if "C" in flags:
        nbr = [b[k] for k in ("lat", "ru") if b.get(k)]
        if not nbr:
            nbr = [S[k] for k in (idx[0] - 1, idx[-1] + 1) if 0 <= k < len(S)]
            nbr = [q for q in nbr if q[2] - q[0] > 20]
        if nbr:
            lim = max(q[2] for q in nbr) + 14; lim0 = min(q[0] for q in nbr) - 14
            for r in sel:
                if min(r[2], lim) - max(r[0], lim0) > 15: r[2] = min(r[2], lim); r[0] = max(r[0], lim0)
    nb = dict(b)
    nb["uz"] = [min(r[0] for r in sel), min(r[1] for r in sel), max(r[2] for r in sel), max(r[3] for r in sel)]
    nb["nl"] = nl; nb["H"] = "H" in flags
    nb["lat"] = S[idx[0] - 1] if idx[0] > 0 else None
    nb["ru"] = S[idx[-1] + 1] if idx[-1] + 1 < len(S) else None
    nbrs = [r for r in (nb["lat"], nb["ru"]) if r] + sel
    if all(abs(r[0] - nbrs[0][0]) <= 4 for r in nbrs): nb["a"] = "l"
    elif all(abs(r[2] - nbrs[0][2]) <= 4 for r in nbrs): nb["a"] = "r"
    else: nb["a"] = "c"
    if nb["a"] == "c" and not nb["ru"]: nb["ru"] = nb["uz"]
    return nb, en
FZ = []
def lookup(nm, b):
    n = norm(b.get("uz_ocr", ""))
    for k in (nm + "|" + n, n):
        if k in D2: return D2[k]
    if nm + "|" + n in D: return D[nm + "|" + n]
    if n in D: return D[n]
    if len(n) >= 6:
        loc = [k.split("|", 1)[1] for k in D if k.startswith(nm + "|")]
        m = difflib.get_close_matches(n, loc, 1, 0.86)
        if m: FZ.append((nm, n, m[0], D[nm + "|" + m[0]])); return D[nm + "|" + m[0]]
        m = difflib.get_close_matches(n, DKEYS, 1, 0.93)
        if m: FZ.append((nm, n, m[0], D[m[0]])); return D[m[0]]
    return None
X, SKIP, FIX = {}, {}, {}
if os.path.exists("tr/ant_x.py"):
    spec = importlib.util.spec_from_file_location("x", "tr/ant_x.py"); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    X, SKIP, FIX = getattr(m, "X", {}), getattr(m, "SKIP", {}), getattr(m, "FIX", {})
d0 = Image.new("RGB", (10, 10)); dr = ImageDraw.Draw(d0)
def tw(t, s):
    f = ImageFont.truetype(FP, s); return max(dr.textlength(l, font=f) for l in t.split("\n"))
import itertools
def layout(text, aw, ah, s0):
    ws = text.replace("\\n", " ").replace("\n", " ").split()
    best = None
    for k in range(1, min(4, len(ws)) + 1):
        bw = None
        for cut in itertools.combinations(range(1, len(ws)), k - 1):
            cs = (0,) + cut + (len(ws),)
            lines = [" ".join(ws[cs[j]:cs[j + 1]]) for j in range(k)]
            w10 = max(tw(l, 20) for l in lines) / 2
            if bw is None or w10 < bw[0]: bw = (w10, lines)
        sw = 10 * aw / max(1, bw[0]); sh = (ah + 1) / ((k - 1) * 1.12 + 0.92)
        sk = min(s0, sw, sh)
        if best is None or sk > best[0] + 0.25: best = (sk, "\n".join(bw[1]))
    s = max(7, int(best[0]))
    while s > 7 and tw(best[1], s) > aw: s -= 1
    return best[1], s
import cv2
def find_bubbles(luma, x0, y0, x1, y1):
    H_, W_ = luma.shape
    wx0, wy0, wx1, wy1 = max(0, x0 - 90), max(0, y0 - 12), min(W_ - 1, x1 + 90), min(H_ - 1, y1 + 12)
    reg = luma[wy0:wy1 + 1, wx0:wx1 + 1]
    bg = np.median(reg)
    ink = (reg < bg - 28).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
    rh = y1 - y0 + 1; out = []
    for k in range(1, n):
        x, y, w, h, area = st[k]
        if h >= 13 and 18 <= w <= 48 and area < 0.55 * w * h and h <= 30:
            # ichi bo'sh ramka: chap va o'ng chekka ustunlari to'q
            sub = (lab[y:y + h, x:x + w] == k)
            if sub.any(axis=1).sum() >= 0.85 * h:
                sub2 = sub | np.roll(sub, 1, axis=1)
                cs = np.nonzero(sub2.sum(axis=0) >= 0.4 * h)[0]
                ok_ = len(cs) >= 2 and cs[-1] - cs[0] >= 13
                if ok_:
                    c0, c1 = int(cs[0]), int(cs[-1])
                    top = sub[:4, c0:c1 + 1].any(axis=0).mean(); bot = sub[-4:, c0:c1 + 1].any(axis=0).mean()
                    ok_ = top >= 0.6 and bot >= 0.6
                    mid = sub[h // 2]
                    runs_ = int(((mid[1:] > 0) & (mid[:-1] == 0)).sum() + (1 if mid[0] else 0))
                    ok_ = ok_ and runs_ == 2
                if ok_:
                    out.append([int(wx0 + x + cs[0]), int(wy0 + y), int(wx0 + x + cs[-1]), int(wy0 + y + h - 1)])
    return out
def trim_bubble(luma, x0, y0, x1, y1):
    cx = (x0 + x1) / 2
    bg = np.median(luma[max(0, y0 - 3):y1 + 4, x0:x1 + 1])
    def thin(x):
        c = (luma[y0:y1 + 1, x] < bg - 50).sum()
        return c <= 2
    for bx in find_bubbles(luma, x0, y0, x1, y1):
        if bx[3] < y0 or bx[1] > y1: continue
        if bx[0] > cx and bx[0] <= x1 + 12:
            x1 = min(x1, bx[0] - 2)
            k = min(x1, bx[0] - 6)
            while k > x0 and thin(k): k -= 1
            if x1 - k >= 3: x1 = k + 1
        elif bx[2] < cx and bx[2] >= x0 - 12:
            x0 = max(x0, bx[2] + 2)
            k = max(x0, bx[2] + 6)
            while k < x1 and thin(k): k += 1
            if k - x0 >= 3: x0 = k - 1
    return x0, x1
def snap(luma, TK, x0, y0, x1, y1, nl):
    # taxminiy quti (±8) atrofida eng to'q (qalin o'zbekcha) qator guruhlari; quti bilan eng ko'p kesishganlari
    H_, W_ = luma.shape
    X0, Y0, X1, Y1 = max(0, x0 - 3), max(0, y0 - 8), min(W_ - 1, x1 + 3), min(H_ - 1, y1 + 8)
    reg = luma[Y0:Y1 + 1, X0:X1 + 1]
    T = np.percentile(reg, 1.5) + 45
    dk = reg < T
    on = dk.sum(axis=1) >= 3
    grp = []; y = 0
    while y < len(on):
        if on[y]:
            a0 = y
            while y < len(on) and (on[y] or (y + 1 < len(on) and on[y + 1] and y - a0 < 3)): y += 1
            grp.append([Y0 + a0, Y0 + y - 1])
        else: y += 1
    grp = [g for g in grp if g[1] - g[0] >= 4]
    if not grp: return x0, y0, x1, y1
    ov = lambda g: min(g[1], y1) - max(g[0], y0)
    grp.sort(key=lambda g: -ov(g))
    sel = sorted(g for g in grp[:nl] if ov(g) >= 0.6 * (g[1] - g[0])) or sorted(grp[:1])
    ya, yb = sel[0][0], sel[-1][1]
    xs = np.nonzero(dk[ya - Y0:yb - Y0 + 1].sum(axis=0) >= 1)[0]
    return int(X0 + xs[0]), int(ya), int(X0 + xs[-1]), int(yb)
def trim_leader(luma, x0, y0, x1, y1):
    # yozuvdan keyin/oldin davom etgan ko'rsatkich chizig'ini (ingichka gorizontal) qutidan chiqarish
    bgv = np.median(luma[max(0, y0 - 3):y1 + 4, x0:x1 + 1])
    cnt = (luma[y0:y1 + 1, x0:x1 + 1] < bgv - 50).sum(axis=0)
    thin = cnt <= 3
    n = len(thin)
    def first_run(arr, L):
        r = 0
        for k, v in enumerate(arr):
            r = r + 1 if v else 0
            if r >= L: return k - L + 1
        return None
    line = (cnt >= 1) & thin
    st = first_run(line, 14)
    if st is not None and st > 10:
        x1 = x0 + st - 1
        while x1 > x0 and thin[x1 - x0]: x1 -= 1
    if n > 20 and line[:14].all():
        k = 0
        while k < n and thin[k]: k += 1
        if k < n: x0 = x0 + k
    return int(x0), int(x1)
def free(luma, bg, y0, y1, x, step, lim):
    # bo'sh ustunlar (faqat ingichka yo'naltiruvchi chiziq bo'lsa ham bo'sh hisoblanadi)
    n = 0; skip = 0
    while skip < 3 and 0 <= x + step * (skip + 1) < luma.shape[1] and (luma[y0 + 1:max(y0 + 2, y1), x + step * (skip + 1)] < bg - 35).sum() > 2: skip += 1
    x = x + step * skip
    while n < lim:
        xx = x + step * (n + 1)
        if xx < 0 or xx >= luma.shape[1]: break
        if (luma[y0 + 1:max(y0 + 2, y1), xx] < bg - 35).sum() > 2: break
        n += 1
    return n + skip if n else 0
p = f"{R}/tools/i18n/books/ant/img_en.json"
spec = json.load(open(p, encoding="utf8")) if os.path.exists(p) else {}
names = sys.argv[1:] or sorted(os.path.basename(q)[:-5] for q in glob.glob("bk/*.json"))
miss = []
for nm in names:
    _D = json.load(open(f"bk/{nm}.json")); B = _D["blocks"]; ROWS = _D.get("rows", [])
    NM_ = len(MAN.get(nm, [])); B = MAN.get(nm, []) + B
    im = Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")
    a = np.asarray(im).astype(int); luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    hs = [(b["uz"][3] - b["uz"][1] + 1) / b["nl"] for b in B] or [10]
    med = statistics.median(hs)
    rhs = [b["ru"][3] - b["ru"][1] + 1 for b in B if b.get("ru") and not b.get("manual")]
    if len(rhs) >= 3: med = min(med, statistics.median(rhs) * 1.05)
    items = []; kept = []
    for i, b in enumerate(B):
        i = i - NM_
        o_en = b.get("forced")
        if not o_en and f"{nm}#{i}" in T3:
            b0 = b
            b, o_en = override(nm, i, b)
            if o_en == "-": kept.append(b0["uz"]); continue
        bx = b["uz"]; ar = (bx[2] - bx[0] + 1) * (bx[3] - bx[1] + 1)
        dup = False
        for k in kept:
            iw = min(k[2], bx[2]) - max(k[0], bx[0]) + 1; ih = min(k[3], bx[3]) - max(k[1], bx[1]) + 1
            if iw > 0 and ih > 0 and iw * ih > 0.4 * ar: dup = True
        if dup and not b.get("manual"): continue
        kept.append(bx)
        if i in SKIP.get(nm, set()) or i in SKIPM.get(nm, set()): continue
        en = o_en or lookup(nm, b)
        if en is None: miss.append((nm, str(i), norm(b.get("uz_ocr", "")), b.get("lat_t", ""), b.get("uz_ocr", ""))); continue
        en = en.replace("\\n", "\n")
        if en in ("-", "?"): continue
        x0, y0, x1, y1 = b["uz"]
        if b.get("manual") and b.get("forced") and b.get("forced") != "@ERASE" and not b.get("nosnap"):
            x0, y0, x1, y1 = snap(luma, PREP(nm)[2], x0, y0, x1, y1, b["nl"]); b = dict(b); b["uz"] = [x0, y0, x1, y1]
        if x1 <= x0 + 2: print("BAD", nm, i, b["uz"]); continue
        if not o_en and ROWS:
            # bandga lotincha (yuqorida) yoki ruscha (pastda) qator kirib qolgan bo'lsa — chiqarib tashlash
            for r in sorted(ROWS, key=lambda r: r["box"][1]):
                q = r["box"]
                if q[1] < y0 - 8 or q[3] > y1 + 8 or min(q[2], x1) - max(q[0], x0) < 0.6 * (q[2] - q[0]): continue
                t = r["t"]
                if BL.latv(t) >= 1 and BL.uzv(t) == 0 and r["lat"] > r["cyr"] and q[1] <= y0 + 3 and y0 + 2 < q[3] < y1 - 6:
                    y0 = q[3] + 1; b = dict(b); b["lat"] = q; b["nl"] = max(1, b["nl"] - 1)
                elif r["cyr"] >= 3 and r["cyr"] > r["lat"] and q[3] >= y1 - 3 and y0 + 6 < q[1] < y1 - 2:
                    y1 = q[1] - 1; b = dict(b); b["ru"] = q; b["nl"] = max(1, b["nl"] - 1)
        # raqamli doiracha (bubble) qo'shilib qolgan bo'lsa — kesib tashlash
        _, _l, TK = PREP(nm)
        if not (b.get("manual") and b.get("forced")):
            x0, x1 = trim_bubble(luma, x0, y0, x1, y1)
            x0, x1 = trim_leader(luma, x0, y0, x1, y1)
        x0, x1 = int(x0), int(x1)
        if x1 <= x0 + 6: x0, x1 = b["uz"][0], b["uz"][2]
        BUBS = find_bubbles(luma, x0, y0, x1, y1)
        al = b["a"]
        if al == "c" and not b.get("manual"):
            rx0, ry0, rx1, ry1 = b["ru"]
            al = "l" if abs(x0 - rx0) <= 5 else ("r" if abs(x1 - rx1) <= 5 else "c")
        bg = int(np.median(np.concatenate([luma[max(0, y0 - 2), x0:x1 + 1], luma[min(luma.shape[0] - 1, y1 + 2), x0:x1 + 1]])))
        # qolgan harf qoldiqlari: o'ng/chapdagi yaqin to'q ustunlar
        def inkc(x):
            if x < 0 or x >= luma.shape[1]: return 0
            return int(TK[max(0, y0 - 1):y1 + 2, x].sum())
        X1T = x1
        while not (b.get("manual") and b.get("forced")):
            nxt = [inkc(x1 + k) for k in (1, 2, 3)]
            if nxt[0] >= 2 and nxt[0] <= y1 - y0 + 3: x1 += 1
            elif nxt[0] == 0 and (2 <= nxt[1] <= y1 - y0 + 3 or 2 <= nxt[2] <= y1 - y0 + 3) and x1 - X1T < 8: x1 += 2 if nxt[1] >= 2 else 3
            else: break
            if x1 - X1T > 9: break
            if any(q[0] - 4 <= x1 and q[1] <= y1 and q[3] >= y0 for q in BUBS): x1 -= 1; break
        # ko'k (o'zbekcha) piksellar o'ngda/chapda davom etsa — qutini kengaytirish (OCR kesib qoldirgan harflar)
        NVm = NAVY(nm)
        if not b.get("navy") and not b.get("manual"):
            xn = x1
            while xn + 1 < NVm.shape[1] and NVm[y0:y1 + 1, xn + 1:min(NVm.shape[1], xn + 10)].sum() >= 3 and xn - X1T < 50 and np.median(luma[max(0, y0 - 3):y1 + 4, xn + 1:xn + 10]) > 170:
                xn = xn + 1 + int(np.nonzero(NVm[y0:y1 + 1, xn + 1:xn + 10].any(axis=0))[0][-1])
            XN1 = xn
        else: XN1 = x1
        for _ in range(4):
            c = luma[max(0, y0 - 1):y1 + 2, x0 - 1]
            if (c < bg - 60).sum() >= 2 and al != "l" and not any(q[2] + 4 >= x0 - 1 and q[1] <= y1 and q[3] >= y0 for q in BUBS): x0 -= 1
            else: break
        fr = free(luma, bg, y0, y1, x1, 1, 70) if al in "lc" else 0
        fl = free(luma, bg, y0, y1, x0, -1, 70) if al in "rc" else 0
        for q in BUBS:
            if q[3] < y0 - 3 or q[1] > y1 + 3: continue
            if q[0] >= x1 - 4: fr = max(0, min(fr, q[0] - 4 - x1))
            elif q[2] <= x0 + 4: fl = max(0, min(fl, x0 - q[2] - 4))
        own = (y1 - y0 + 1) / b["nl"]
        hl = own if own > 1.4 * med else med
        s0 = max(7, int(round((hl if b.get("H") else min(hl, 1.2 * med)) * 1.02)))
        avail = (x1 - x0 + 1) + max(0, fr - 3) + max(0, fl - 3)
        band = None
        if b.get("lat") and b.get("ru"):
            sy0, sy1 = b["lat"][3], b["ru"][1]
            if sy1 - sy0 >= (y1 - y0) * 0.8 and sy1 - sy0 <= 2.6 * hl * b["nl"]: band = (sy0 + 1, sy1 - 1)
        hav = (band[1] - band[0] + 1) if band else (y1 - y0 + 3)
        if not band and b["nl"] == 1: hav = max(hav, med * 1.05)
        if b.get("manual") and b.get("forced"): hav = y1 - y0 + 3
        if b.get("navy") and not b.get("size"): s0 = max(8, int(round(max(own, 0.85 * med) * 1.0)))
        elif b.get("manual") and b.get("forced") and not b.get("size"): s0 = max(7, int(round(min(med, max(own, 0.8 * med)) * 0.95)))
        if b.get("size"): s0 = b["size"]
        if en == "@ERASE":
            if b.get("full"): items.append({"_m": 1, "box": [x0, y0, x1, y1], "bg": b.get("bgc") or "ring", "t": ""}); continue
            items.append({"_m": 1, "box": [x0, y0, x1, y1], "erase": "ink", "bg": b.get("bgc") or ("ring" if b.get("ring") else "local"), "ex": 0, "dl": b.get("dl", 30), "grow": 2 if b.get("dl") else 1, "t": ""}); continue
        if b.get("manual") and b.get("forced") and "\n" in en:
            s = s0; nlx = en.count("\n") + 1
            s = min(s, int(hav / ((nlx - 1) * 1.12 + 0.92)) if hav else s)
            while s > 7 and tw(en, s) > avail: s -= 1
        else:
            en, s = layout(en, avail, hav, s0)
        nl = en.count("\n") + 1
        w = int(tw(en, s)) + 3
        if al == "l": tx0, tx1 = x0 - 1, max(x1, x0 - 1 + w)
        elif al == "r": tx0, tx1 = min(x0, x1 + 1 - w), x1 + 1
        else:
            cx = (x0 + x1) / 2; tx0, tx1 = int(min(x0, cx - w / 2)), int(max(x1, cx + w / 2))
        lh = int(s * 1.12); th = nl * lh + 2
        cy = ((band[0] + band[1]) / 2 if band else (y0 + y1) / 2) + 0.5
        ty0 = int(round(cy - th / 2 - s * 0.12)); ty1 = ty0 + th
        if b.get("manual") and b.get("forced") and (nl >= 3 or (b.get("fullt") and nl >= 2)): ty0, ty1 = min(ty0, y0), max(ty1, y1)
        ex0, ex1 = min(x0, tx0) - 2, max(x1, tx1, XN1) + 2
        for q in BUBS:
            if q[3] < y0 - 3 or q[1] > y1 + 3: continue
            if q[0] >= x1 - 4: ex1 = min(ex1, q[0] - 2)
            elif q[2] <= x0 + 4: ex0 = max(ex0, q[2] + 2)
        ey0, ey1 = (y0 - 1, y1 + 1) if b.get("manual") and b.get("forced") else (y0 - 2, y1 + 2)
        reg = luma[y0:y1 + 1, x0:x1 + 1]; v = reg[reg < bg - 35]
        uzd = float(np.percentile(v, 15)) if len(v) > 5 else 40
        dl = 35
        LN = []
        tx1_, tx0_ = tx1, tx0
        if al == "l": tx0, tx1 = tx0_, tx0_ + w
        elif al == "r": tx0, tx1 = tx1_ - w, tx1_
        else: tx0, tx1 = int((tx0_ + tx1_) / 2 - w / 2), int((tx0_ + tx1_) / 2 + w / 2)
        for q in BUBS:
            if q[3] < y0 - 2 or q[1] > y1 + 2: continue
            side = 1 if q[0] > (x0 + x1) / 2 else -1
            cx_ = q[0] - 4 if side == 1 else q[2] + 4
            hq = q[3] - q[1]
            ya_, yb_ = q[1] + hq // 4, q[3] - hq // 4
            colv = luma[ya_:yb_ + 1, cx_]
            ys = [ya_ + k for k, v in enumerate(colv) if v < bg - 50]
            if not ys or len(ys) > 4: continue
            yl = sum(ys) / len(ys); wl = len(ys)
            pix = a[ys[0]:ys[-1] + 1, cx_]; col = "#%02x%02x%02x" % tuple(int(v) for v in np.median(pix, axis=0))
            if side == 1 and q[0] - tx1 > 5: LN.append([tx1 + 3, round(yl), q[0] - 1, round(yl), wl, col])
            if side == -1 and tx0 - q[2] > 5: LN.append([q[2] + 1, round(yl), tx0 - 3, round(yl), wl, col])
        # matn bilan davom etuvchi ko'rsatkich chizig'i (bubble'siz)
        def leader_at(xs_, side):
            for xx in xs_:
                if xx < 0 or xx >= luma.shape[1]: return None
                col = luma[y0 - 2:y1 + 3, xx]
                dk = np.nonzero(col < bg - 50)[0]
                if len(dk) == 0: continue
                if len(dk) <= 3 and dk[-1] - dk[0] <= 2:
                    # chiziq bir necha ustunda davom etadimi
                    yy = y0 - 2 + int(dk.mean())
                    run = 0
                    for k in range(1, 12):
                        x2 = xx + side * k
                        if 0 <= x2 < luma.shape[1] and (luma[yy - 1:yy + 2, x2] < bg - 50).any(): run += 1
                    if run >= 9:
                        pix = a[y0 - 2 + dk[0]:y0 - 2 + dk[-1] + 1, xx]
                        return xx, yy, len(dk), "#%02x%02x%02x" % tuple(int(v) for v in np.median(pix, axis=0))
                return None
            return None
        if not any(l_[2] > tx1 for l_ in LN):
            L_ = leader_at(range(max(x1, XN1) + 1, max(x1, XN1) + 15), 1)
            if L_ and L_[0] - tx1 > 4: LN.append([tx1 + 3, L_[1], L_[0], L_[1], L_[2], L_[3]])
        if not any(l_[0] < tx0 for l_ in LN):
            L_ = leader_at(range(x0 - 1, x0 - 15, -1), -1)
            if L_ and tx0 - L_[0] > 4: LN.append([L_[0], L_[1], tx0 - 3, L_[1], L_[2], L_[3]])
        def _navy(c):
            r_, g_, b_ = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
            return b_ - r_ >= 15
        LN = [l_ for l_ in LN if not _navy(l_[5])]
        if b.get("noln"): LN = [l_ for l_ in LN if l_[2] < b["uz"][0] + 2]
        if b.get("navy"):
            SO = b.get("soft")
            items.append({"_m": 1, "box": list(b["uz"]) if SO else [b["uz"][0] - 5, b["uz"][1], b["uz"][2] + 3, b["uz"][3]], "erase": "navy", "nb": 24 if b.get("strict") else (8 if SO else 10), "nl": 0 if b.get("strict") else (165 if SO else 150), "grow": 1, "bg": "local", "ex": 0 if SO else 3, "tbox": [tx0_, int(round(cy - th / 2 - s * 0.12)), tx1_, int(round(cy - th / 2 - s * 0.12)) + th], "t": en, "f": FONT, "s": s, "a": al, "pad": 1})
            continue
        items.append({**({"_m": 1} if b.get("manual") and b.get("forced") else {}), "box": [ex0, ey0, ex1, ey1], "erase": "ink", "bg": b.get("bgc") or ("ring" if b.get("ring") else "local"), "ex": 0, "dl": dl, **({"core": int(min(bg - 50, uzd + 75)), "cg": 2} if uzd < 100 and not b.get("nocore") else {}), "tbox": [tx0_, ty0, tx1_, ty1], **({} if b.get("manual") and b.get("forced") else {"keepx": [tx0 - 1, tx1 + 1]}), "t": en, "f": FONT, "s": s, "a": al, "pad": 1, **({"ln": LN} if LN else {})})
    MB = [it["box"] for it in items if it.get("_m")]
    def _ov(p, q):
        iw = min(p[2], q[2]) - max(p[0], q[0]); ih = min(p[3], q[3]) - max(p[1], q[1])
        return max(0, iw) * max(0, ih)
    items = [it for it in items if it.get("_m") or not any(_ov(it.get("tbox", it["box"]), q) > 0.3 * max(1, (it["box"][2] - it["box"][0]) * (it["box"][3] - it["box"][1])) for q in MB)]
    for it in items: it.pop("_m", None)
    items += X.get(nm, [])
    spec[nm + ".webp"] = {"items": items}
json.dump(spec, open(p + ".tmp", "w", encoding="utf8"), ensure_ascii=False, indent=1); os.replace(p + ".tmp", p)
if miss:
    with open("missing.tsv", "w") as f:
        for k in miss: f.write("\t".join(k) + "\n")
    print("tarjimasiz:", len(miss))
json.dump(FZ, open("fuzzy.json", "w"), ensure_ascii=False, indent=0)
if os.environ.get("DRY"): sys.exit(0)
r = subprocess.run(["python3", "-W", "ignore", f"{R}/tools/i18n/img_translate.py", "ant"] + [n + ".webp" for n in names], capture_output=True, text=True)
print(r.stdout.strip()[-200:], r.stderr.strip()[-800:])
