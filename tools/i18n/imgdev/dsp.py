# disp→img: python3 dsp.py sheet scale name dx dy ...  → snap qutilari
import sys, json
sys.path.insert(0, ".")
from snap import snap, lbox
sheet, k = sys.argv[1], float(sys.argv[2]); pos = json.load(open(sheet + ".pos.json"))
a = sys.argv[3:]
for i in range(0, len(a), 3):
    n, dx, dy = a[i], float(a[i + 1]), float(a[i + 2])
    ox, oy = pos[n]; x, y = int(dx * k - ox), int(dy * k - oy)
    print(n, (x, y), lbox("bkp", n, x, y, int(sys.argv[0] and 9)))
