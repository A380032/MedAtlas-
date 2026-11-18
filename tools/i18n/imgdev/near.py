import sys, json, re
for l in open(sys.argv[1]):
    m = re.match(r"(\S+)\tB(\d+),(\d+),(\d+),(\d+)", l)
    if not m: continue
    nm = m.group(1); x0, y0, x1, y1 = map(int, m.groups()[1:])
    D = json.load(open(f"bk/{nm}.json"))
    print("##", l.strip().split("\t")[4], "|", nm, x0, y0, x1, y1)
    for k, r in enumerate(D["rows"]):
        q = r["box"]
        if q[3] >= y0 - 28 and q[1] <= y1 + 28 and q[2] >= x0 - 60 and q[0] <= x1 + 60 and len(r["t"]) > 3:
            print("   ", k, q, r["t"][:70])
