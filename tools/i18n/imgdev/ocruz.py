# ocruz.py — bk/<name>.json dagi o'zbekcha qutilarni alohida o'qiydi (eng), lotincha qatorni ham -> bk/<name>.json ga "uz_ocr"
import sys, os, json, subprocess, tempfile
from PIL import Image, ImageOps
R = "/home/claude/medatlas-"
def ocr(im, box, psm):
    x0, y0, x1, y1 = box
    c = im.crop((max(0, x0 - 3), max(0, y0 - 3), x1 + 4, y1 + 4)).convert("L")
    c = c.resize((c.width * 4, c.height * 4), Image.LANCZOS)
    c = ImageOps.expand(c, 20, fill=255)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "a.png"); c.save(p)
        return subprocess.run(["tesseract", p, "-", "--psm", psm, "-l", "eng"], capture_output=True, text=True).stdout.strip().replace("\n", " / ")
for nm in sys.argv[1:]:
    p = f"bk/{nm}.json"; d = json.load(open(p))
    im = Image.open(f"{R}/data/img/ant/{nm}.webp").convert("RGB")
    for b in d["blocks"]:
        b["uz_ocr"] = ocr(im, b["uz"], "7" if b["nl"] == 1 else "6")
    json.dump(d, open(p, "w"), ensure_ascii=False)
    print(nm, len(d["blocks"]))
