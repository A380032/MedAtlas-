import json, os, sys
from PIL import Image, ImageDraw, ImageFont
O = json.load(open("/tmp/old_spec.json")); N = json.load(open("/home/claude/medatlas-/tools/i18n/books/ant/img_en.json"))
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
ch = []
for k in N:
    if not os.path.exists(f"/tmp/oldimg/{k}"): continue
    oi = {json.dumps(it, sort_keys=True) for it in O.get(k, {}).get("items", [])}
    for it in N[k]["items"]:
        if json.dumps(it, sort_keys=True) not in oi and it.get("t") and "box" in it:
            ch.append((k, it))
print(len(ch))
os.makedirs("ds", exist_ok=True)
per = 12
for si in range(0, len(ch), per):
    S = Image.new("RGB", (1240, per * 70), (60, 60, 60)); d = ImageDraw.Draw(S)
    for j, (k, it) in enumerate(ch[si:si + per]):
        b = it.get("tbox", it["box"]); x0, y0, x1, y1 = b
        bb = (max(0, min(it["box"][0], x0) - 30), max(0, min(it["box"][1], y0) - 12), max(it["box"][2], x1) + 30, max(it["box"][3], y1) + 12)
        o = Image.open(f"/tmp/oldimg/{k}").convert("RGB").crop(bb); n = Image.open(f"/home/claude/medatlas-/data/en/img/ant/{k}").convert("RGB").crop(bb)
        kk = min(1.5, 600 / o.width, 54 / o.height)
        o = o.resize((int(o.width * kk), int(o.height * kk))); n = n.resize((int(n.width * kk), int(n.height * kk)))
        Y = j * 70; d.text((4, Y + 1), f"{si+j} {k[:-5]} {it['box']}", fill=(255, 255, 0), font=f)
        S.paste(o, (4, Y + 15)); S.paste(n, (620, Y + 15))
    S.save(f"ds/d_{si // per + 1:02d}.png")
