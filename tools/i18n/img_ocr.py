"""python3 tools/i18n/img_ocr.py <id> [rasm_nomi ...]
Kitob rasmlaridagi yozuv qatorlarini (tesseract) quti koordinatalari bilan chiqaradi —
tools/i18n/books/<id>/img_en.json ni tuzishda yordamchi. Rasm 3 marta kattalashtirilib o'qiladi,
koordinatalar asl o'lchamda beriladi. Format: "x0,y0,x1,y1  matn"."""
import glob, os, subprocess, sys, tempfile

from PIL import Image

sid = sys.argv[1]
names = sys.argv[2:] or sorted(os.path.basename(p) for p in glob.glob(f"data/img/{sid}/*.webp"))
K = 3
for name in names:
    im = Image.open(f"data/img/{sid}/{name}").convert("RGB")
    big = im.resize((im.width * K, im.height * K), Image.LANCZOS)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "a.png")
        big.save(p)
        out = subprocess.run(["tesseract", p, "-", "--psm", "11", "-l", os.environ.get("OCR_LANG", "rus+eng"), "tsv"],
                             capture_output=True, text=True).stdout
    words = []
    for line in out.splitlines()[1:]:
        f = line.split("\t")
        if len(f) < 12 or not f[11].strip() or float(f[10]) < 30:
            continue
        x, y, w, h = (int(v) // K for v in f[6:10])
        words.append((int(f[2]), int(f[3]), int(f[4]), x, y, x + w, y + h, f[11]))
    lines = {}
    for b, pa, ln, x0, y0, x1, y1, t in words:
        lines.setdefault((b, pa, ln), []).append((x0, y0, x1, y1, t))
    print(f"== {name} {im.width}x{im.height} ({len(lines)} qator)")
    for ws in sorted(lines.values(), key=lambda ws: (min(w[1] for w in ws), min(w[0] for w in ws))):
        x0, y0 = min(w[0] for w in ws), min(w[1] for w in ws)
        x1, y1 = max(w[2] for w in ws), max(w[3] for w in ws)
        print(f"  {x0},{y0},{x1},{y1}  {' '.join(w[4] for w in ws)}")
