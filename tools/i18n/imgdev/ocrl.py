# ocrl.py — tesseract (eng+rus) bilan qatorlar; har qator uchun qoralik -> ocr/<name>.json
import sys, os, json, subprocess, tempfile, re
import numpy as np
from PIL import Image
R = "/home/claude/medatlas-"
os.makedirs("ocr", exist_ok=True)
K = 3
def run(nm, psm="3"):
    im = Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")
    a = np.asarray(im).astype(int)
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    big = im.resize((im.width * K, im.height * K), Image.LANCZOS)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "a.png"); big.save(p)
        out = subprocess.run(["tesseract", p, "-", "--psm", psm, "-l", "eng+rus", "tsv"], capture_output=True, text=True).stdout
    words = []
    for line in out.splitlines()[1:]:
        f = line.split("\t")
        if len(f) < 12 or not f[11].strip(): continue
        x, y, w, h = (int(v) // K for v in f[6:10])
        words.append({"k": (int(f[2]), int(f[3]), int(f[4])), "box": [x, y, x + w, y + h], "t": f[11], "conf": float(f[10])})
    lines = {}
    for w in words: lines.setdefault(w["k"], []).append(w)
    res = []
    for k, ws in lines.items():
        x0 = min(w["box"][0] for w in ws); y0 = min(w["box"][1] for w in ws); x1 = max(w["box"][2] for w in ws); y1 = max(w["box"][3] for w in ws)
        t = " ".join(w["t"] for w in ws)
        reg = luma[y0:y1, x0:x1]
        ink = reg[reg < 170]
        dark = int(np.percentile(ink, 15)) if len(ink) > 10 else 255
        cyr = len(re.findall(r"[А-Яа-яЁё]", t)); lat = len(re.findall(r"[A-Za-z]", t))
        res.append({"box": [x0, y0, x1, y1], "t": t, "dark": dark, "cyr": cyr, "lat": lat, "conf": round(sum(w["conf"] for w in ws) / len(ws))})
    res.sort(key=lambda r: (r["box"][1], r["box"][0]))
    json.dump({"W": im.width, "H": im.height, "lines": res}, open(f"ocr/{nm}.json", "w"), ensure_ascii=False)
    return res
if __name__ == "__main__":
    for nm in sys.argv[1:]:
        for r in run(nm): print(r["box"], r["dark"], r["cyr"], r["lat"], r["conf"], r["t"])
