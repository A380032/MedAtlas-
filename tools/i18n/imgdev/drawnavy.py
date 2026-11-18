import sys, json
from PIL import Image, ImageDraw
R = "/home/claude/medatlas-"
for nm in sys.argv[1:]:
    im = Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB"); d = ImageDraw.Draw(im)
    for i, (x0, y0, x1, y1) in enumerate(json.load(open(f"navy/{nm}.json"))["lines"]):
        d.rectangle([x0 - 1, y0 - 1, x1 + 1, y1 + 1], outline=(0, 200, 0)); d.text((x1 + 3, y0 - 2), str(i), fill=(255, 0, 255))
    im.save(f"sh/nv_{nm}.png")
