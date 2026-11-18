import sys, json, re
from multiprocessing import Pool
from PIL import Image
import blocks as B
R = "/home/claude/medatlas-"
UZX = re.compile(r"(o['’‘`]|g['’‘`]|ning\b|lari\b|dagi\b|chi\b|sh\b|qism|mushag|arteriya|venasi|boylam|suyag|tarmog|teshi|chuqurcha|bo['’‘`]lak|yo['’‘`]l)", re.I)
def one(nm):
    im = Image.open(f"{R}/data/en/img/ant/{nm}.webp").convert("RGB")
    rows = B.rows_of(B.words_of(im))
    out = []
    for r in rows:
        t = r["t"]
        if r["cyr"] >= 2: continue
        if len(UZX.findall(t)) >= 1 and B.latv(t) == 0:
            out.append((r["box"], t))
    return nm, out
if __name__ == "__main__":
    names = [l.strip() for l in open(sys.argv[1])]
    with Pool(2) as p:
        res = p.map(one, names)
    json.dump(dict(res), open("leftover.json", "w"), ensure_ascii=False)
    n = 0
    for nm, out in res:
        for bx, t in out: print(nm, bx, t); n += 1
    print("TOTAL", n)
