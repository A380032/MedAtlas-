# cs2.py out.png nm1 nm2 ... — EN rasmlarni 2 ustunli varaqqa (har biri 700px eni)
import sys
from PIL import Image
out = sys.argv[1]; names = sys.argv[2:]
W = 760; ims = []
for n in names:
    im = Image.open(f"/home/claude/medatlas-/data/en/img/ant/{n}.webp").convert("RGB")
    k = W / im.width; ims.append(im.resize((W, int(im.height * k)), Image.LANCZOS))
H = max(i.height for i in ims)
S = Image.new("RGB", (W * len(ims) + 10 * (len(ims) - 1), H), (60, 60, 60))
x = 0
for i in ims: S.paste(i, (x, 0)); x += W + 10
S.save(out)
