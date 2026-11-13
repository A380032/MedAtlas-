# python3 cs.py BOOK outprefix [cols] [cellw] [src=data/img]
import sys, glob, os, re
from PIL import Image, ImageDraw, ImageFont
book, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
cw = int(sys.argv[4]) if len(sys.argv) > 4 else 380
src = sys.argv[5] if len(sys.argv) > 5 else "data/img"
R = "/home/claude/medatlas-"
def key(p):
    m = re.search(r"p(\d+)_(\d+)", p); return (int(m.group(1)), int(m.group(2))) if m else (9999, 0)
names = sorted(glob.glob(f"{R}/{src}/{book}/*.webp"), key=key)
if len(sys.argv) > 6: names = [f"{R}/{src}/{book}/{n}" for n in sys.argv[6:]]
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
rows_per = int(__import__("os").environ.get("ROWS","5")); RH = int(__import__("os").environ.get("RH","300"))
per = cols * rows_per
for si in range(0, len(names), per):
    chunk = names[si:si + per]
    ims = []
    for p in chunk:
        im = Image.open(p).convert("RGB")
        k = min(cw / im.width, RH / im.height, 1.6)
        ims.append((os.path.basename(p)[:-5], im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS), im.size))
    ch = RH + 22
    S = Image.new("RGB", (cols * (cw + 6), ((len(ims) + cols - 1) // cols) * ch), (60, 60, 60))
    d = ImageDraw.Draw(S)
    for i, (n, im, sz) in enumerate(ims):
        x = (i % cols) * (cw + 6); y = (i // cols) * ch
        d.text((x + 3, y + 2), f"{n} {sz[0]}x{sz[1]}", fill=(255, 255, 0), font=font)
        S.paste(im, (x, y + 21))
    S.save(f"{out}_{si // per + 1:02d}.png")
    print(f"{out}_{si // per + 1:02d}.png", len(ims))
