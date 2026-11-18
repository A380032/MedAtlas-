import sys, re, os
from PIL import Image, ImageDraw, ImageFont
R = "/home/claude/medatlas-/data"
L = []
for l in open(sys.argv[1]):
    m = re.match(r"(\S+) \[(\d+), (\d+), (\d+), (\d+)\] (.*)", l)
    if m and not re.search(r"opening|Caval|caput|bronchi$", m.group(6)): L.append((m.group(1), [int(m.group(i)) for i in range(2, 6)], m.group(6)))
out = sys.argv[2]; os.makedirs(out, exist_ok=True)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
cw, ch, per = 620, 120, 16
for si in range(0, len(L), per):
    S = Image.new("RGB", (2 * cw, (per // 2) * ch), (50, 50, 50)); d = ImageDraw.Draw(S)
    for j, (nm, b, t) in enumerate(L[si:si + per]):
        x0, y0, x1, y1 = b
        box = (max(0, x0 - 60), max(0, y0 - 28), x1 + 60, y1 + 28)
        o = Image.open(f"{R}/img/ant/{nm}.webp").convert("RGB").crop(box)
        e = Image.open(f"{R}/en/img/ant/{nm}.webp").convert("RGB").crop(box)
        k = min(1.6, (cw / 2 - 6) / o.width, (ch - 18) / o.height)
        o = o.resize((int(o.width * k), int(o.height * k))); e = e.resize((int(e.width * k), int(e.height * k)))
        X = (j % 2) * cw; Y = (j // 2) * ch
        d.text((X + 3, Y + 1), f"{si+j} {nm} {b}", fill=(255, 255, 0), font=font)
        S.paste(o, (X + 2, Y + 17)); S.paste(e, (X + cw // 2 + 1, Y + 17))
    S.save(f"{out}/l_{si // per + 1:02d}.png")
print(len(L))
