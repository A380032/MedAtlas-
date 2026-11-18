# ocrw.py — tesseract so'z qutilari; qoraligi va yozuviga ko'ra o'zbekcha qatorlarni yig'adi -> ow/<name>.json
import sys, os, json, subprocess, tempfile, re, glob
import numpy as np
from PIL import Image
R = "/home/claude/medatlas-"
os.makedirs("ow", exist_ok=True)
K = 3
DK = int(os.environ.get("DK", 30))
def words_of(im, psm):
    big = im.resize((im.width * K, im.height * K), Image.LANCZOS)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "a.png"); big.save(p)
        out = subprocess.run(["tesseract", p, "-", "--psm", psm, "-l", "eng+rus", "tsv"], capture_output=True, text=True).stdout
    ws = []
    for line in out.splitlines()[1:]:
        f = line.split("\t")
        if len(f) < 12 or not f[11].strip(): continue
        x, y, w, h = (int(v) / K for v in f[6:10])
        ws.append({"box": [int(x), int(y), int(round(x + w)), int(round(y + h))], "t": f[11], "conf": float(f[10])})
    return ws
def run(nm):
    im = Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")
    a = np.asarray(im).astype(int); H, W = a.shape[:2]
    luma = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    ws = words_of(im, "11")
    for w in ws:
        x0, y0, x1, y1 = w["box"]; reg = luma[max(0,y0):y1+1, max(0,x0):x1+1]
        ink = reg[reg < 175]
        w["dark"] = int(np.percentile(ink, 15)) if len(ink) > 6 else 255
        w["cyr"] = len(re.findall(r"[А-Яа-яЁё]", w["t"])); w["lat"] = len(re.findall(r"[A-Za-z‘’'ʻ]", w["t"]))
        w["h"] = y1 - y0
    uz = [w for w in ws if w["lat"] >= 2 and w["cyr"] == 0 and w["dark"] < DK and 5 <= w["h"] <= 24]
    uz.sort(key=lambda w: (w["box"][1], w["box"][0]))
    groups = []
    for w in sorted(uz, key=lambda w: w["box"][0]):
        for g in groups:
            b = g["box"]; ov = min(b[3], w["box"][3]) - max(b[1], w["box"][1])
            if ov >= 0.5 * min(b[3]-b[1], w["h"]) and -2 <= w["box"][0] - b[2] <= 16:
                g["ws"].append(w); g["box"] = [min(b[0], w["box"][0]), min(b[1], w["box"][1]), max(b[2], w["box"][2]), max(b[3], w["box"][3])]; break
        else:
            groups.append({"box": list(w["box"]), "ws": [w]})
    lines = [{"box": g["box"], "t": " ".join(x["t"] for x in g["ws"]), "dark": min(x["dark"] for x in g["ws"])} for g in groups]
    lines.sort(key=lambda l: (l["box"][1], l["box"][0]))
    json.dump({"W": W, "H": H, "lines": lines, "words": ws}, open(f"ow/{nm}.json", "w"), ensure_ascii=False)
    return lines
if __name__ == "__main__":
    names = sys.argv[1:]
    for nm in names:
        L = run(nm)
        print(nm, len(L))
