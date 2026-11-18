import json, os
from PIL import Image, ImageDraw, ImageFont
R = "/home/claude/medatlas-"
L = json.load(open("miss_list.json"))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
cw, ch = 620, 128; cols = 2; per = 24
os.makedirs("ms", exist_ok=True)
cache = {}
for si in range(0, len(L), per):
    S = Image.new("RGB", (cols * cw, (per // cols) * ch), (50, 50, 50)); d = ImageDraw.Draw(S)
    for j, (nm, i, n, lat, uz) in enumerate(L[si:si + per]):
        b = json.load(open(f"bk/{nm}.json"))["blocks"][int(i)]
        x0, y0, x1, y1 = b["uz"]
        if nm not in cache: cache = {nm: Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")}
        im = cache[nm]
        cx0, cy0 = max(0, x0 - 45), max(0, y0 - 20)
        c = im.crop((cx0, cy0, min(im.width, x1 + 45), min(im.height, y1 + 20))).copy()
        dc = ImageDraw.Draw(c); dc.rectangle([x0 - cx0 - 1, y0 - cy0 - 1, x1 - cx0 + 1, y1 - cy0 + 1], outline=(0, 200, 0))
        k2 = min(2.0, (cw - 10) / c.width, (ch - 22) / c.height); c = c.resize((max(1, int(c.width * k2)), max(1, int(c.height * k2))), Image.LANCZOS)
        X = (j % cols) * cw; Y = (j // cols) * ch
        d.text((X + 4, Y + 2), f"{si + j} {nm}#{i}", fill=(255, 255, 0), font=font); S.paste(c, (X + 4, Y + 20))
    S.save(f"ms/m_{si // per + 1:02d}.png")
print((len(L) + per - 1) // per)
