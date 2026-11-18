# rows.py nm x0 y0 x1 y1 — OCR qatorlari (indeks bilan)
import sys, json
nm = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6])
D = json.load(open(f"bk/{nm}.json"))
for k, r in enumerate(D["rows"]):
    q = r["box"]
    if q[2] >= x0 and q[0] <= x1 and q[3] >= y0 and q[1] <= y1 and len(r["t"]) > 2: print(k, q, r["t"])
