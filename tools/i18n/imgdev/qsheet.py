import json, glob, os, sys
from PIL import Image, ImageDraw, ImageFont
R = "/home/claude/medatlas-"
TR = {}
for p in sorted(glob.glob("tr/ant_*.tsv")):
    for l in open(p):
        if "\t" in l: k, v = l.rstrip("\n").split("\t", 1); TR[k] = v
want = [k for k, v in TR.items() if v == "?"]
occ = {}
for p in sorted(glob.glob("bk/*.json")):
    nm = os.path.basename(p)[:-5]
    for i, b in enumerate(json.load(open(p))["blocks"]):
        if b["key"] in want and b["key"] not in occ: occ[b["key"]] = (nm, b)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
cw, ch = 620, 130; cols = 2; per = 24
keys = sorted(occ)
os.makedirs("qs", exist_ok=True)
for si in range(0, len(keys), per):
    S = Image.new("RGB", (cols * cw, (per // cols) * ch), (50, 50, 50)); d = ImageDraw.Draw(S)
    for j, k in enumerate(keys[si:si + per]):
        nm, b = occ[k]; x0, y0, x1, y1 = b["uz"]
        im = Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")
        c = im.crop((max(0, x0 - 50), max(0, y0 - 22), min(im.width, x1 + 50), min(im.height, y1 + 22)))
        dc = ImageDraw.Draw(c); dc.rectangle([x0 - max(0, x0 - 50) - 1, y0 - max(0, y0 - 22) - 1, x1 - max(0, x0 - 50) + 1, y1 - max(0, y0 - 22) + 1], outline=(0, 200, 0))
        k2 = min(2.0, (cw - 10) / c.width, (ch - 22) / c.height); c = c.resize((int(c.width * k2), int(c.height * k2)), Image.LANCZOS)
        X = (j % cols) * cw; Y = (j // cols) * ch
        d.text((X + 4, Y + 2), f"{k} {nm}", fill=(255, 255, 0), font=font); S.paste(c, (X + 4, Y + 20))
    S.save(f"qs/q_{si // per + 1:02d}.png")
print(len(keys), (len(keys) + per - 1) // per)
