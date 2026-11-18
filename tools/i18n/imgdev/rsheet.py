import json, os, sys
from PIL import Image, ImageDraw, ImageFont
from rowseg_frozen import segs, prep
L = json.load(open(sys.argv[1])); out = sys.argv[2]; PAD = int(sys.argv[3]) if len(sys.argv) > 3 else 30; os.makedirs(out, exist_ok=True)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
cw, ch = 620, 150; cols = 2; per = 16
COL = [(220, 0, 0), (0, 150, 0), (0, 0, 230), (200, 0, 200), (0, 160, 160), (230, 120, 0), (120, 70, 0), (90, 90, 90)]
SEG = {}
for si in range(0, len(L), per):
    S = Image.new("RGB", (cols * cw, (per // cols) * ch), (50, 50, 50)); d = ImageDraw.Draw(S)
    for j, it in enumerate(L[si:si + per]):
        nm, i = it[0], int(it[1])
        b = json.load(open(f"bk/{nm}.json"))["blocks"][i]
        rows, (wx0, wy0, wx1, wy1) = segs(nm, b, pad=PAD)
        SEG[f"{nm}#{i}"] = rows
        im = prep(nm)[0]
        c = im.crop((wx0, wy0, wx1 + 1, wy1 + 1))
        k = min(2.0, (cw - 26) / c.width, (ch - 20) / c.height)
        c = c.resize((max(1, int(c.width * k)), max(1, int(c.height * k))), Image.LANCZOS)
        dc = ImageDraw.Draw(c)
        for n, r in enumerate(rows):
            col = COL[n % len(COL)]
            dc.rectangle([(r[0] - wx0) * k - 1, (r[1] - wy0) * k - 1, (r[2] - wx0) * k + 1, (r[3] - wy0) * k + 1], outline=col)
        X = (j % cols) * cw; Y = (j // cols) * ch
        uy0, uy1 = b["uz"][1], b["uz"][3]
        d.text((X + 4, Y + 2), f"{si + j} {nm}#{i}", fill=(255, 255, 0), font=font)
        S.paste(c, (X + 24, Y + 18))
        for n, r in enumerate(rows):
            yy = Y + 18 + ((r[1] + r[3]) / 2 - wy0) * k - 7
            if Y + 16 < yy < Y + ch - 12:
                d.text((X + 6, yy), "abcdefghijklmnopqrstuvwxyz"[n], fill=COL[n % len(COL)] if n % len(COL) not in (2, 6, 7) else (150, 150, 255), font=font)
        d.rectangle([X + 18, Y + 18 + (uy0 - wy0) * k, X + 22, Y + 18 + (uy1 - wy0) * k], fill=(255, 255, 0))
    S.save(f"{out}/r_{si // per + 1:02d}.png")
json.dump(SEG, open(f"{out}/seg.json", "w"))
print((len(L) + per - 1) // per)
