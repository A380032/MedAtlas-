"""python3 mk.py BOOK [name...] — tr/BOOK.py dagi T lug'atidan img_en.json bandlarini yasaydi va rasmlarni chizadi.
T = {"p15_1": {0: "matn", (6,7): "birlashtirilgan", 3: {"t": "...", "s": 12, ...qo'shimcha maydonlar}, "x": [xom bandlar], "f": "dv", "smax": 14}}
Blok qiymati None bo'lsa — tegilmaydi. Ko'rsatilmagan bloklar haqida ogohlantiradi."""
import json, sys, os, subprocess, importlib.util
R = "/home/claude/medatlas-"
book = sys.argv[1]
spec = importlib.util.spec_from_file_location("tr", f"tr/{book}.py"); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
p = f"{R}/tools/i18n/books/{book}/img_en.json"
d = json.load(open(p, encoding="utf8")) if os.path.exists(p) else {}
names = sys.argv[2:] or list(m.T)
for name in names:
    tr = m.T[name]
    B = json.load(open(f"blk/{book}/{name}.json")) if os.path.exists(f"blk/{book}/{name}.json") else {"blocks": [], "smax": 14}
    bl = {b["id"]: b for b in B["blocks"]}
    font = tr.get("f", "dv"); gs = tr.get("smax", B["smax"])
    items = []; used = set()
    for k, v in tr.items():
        if k in ("x", "f", "smax", "also", "c", "s"): continue
        ids = k if isinstance(k, tuple) else (k,)
        used.update(ids)
        if v is None: continue
        bs = [bl[i] for i in ids]
        box = [min(b["box"][0] for b in bs), min(b["box"][1] for b in bs), max(b["box"][2] for b in bs), max(b["box"][3] for b in bs)]
        own = max(b["lh"] for b in bs) / 0.85
        sm = gs if own > gs * 0.8 else int(round(own))
        it = {"box": box, "t": v if isinstance(v, str) else v["t"], "f": font, "smax": sm}
        if len(bs) == 1 and bs[0].get("nbg"): it["bg"] = bs[0]["nbg"]
        if tr.get("c"): it["c"] = tr["c"]
        if isinstance(v, dict):
            for a, x in v.items():
                if a == "d":   # quti chetlarini siljitish [dx0, dy0, dx1, dy1]
                    it["box"] = [it["box"][i] + x[i] for i in range(4)]
                elif a != "t": it[a] = x
            if "s" in it: it.pop("smax", None)
        if tr.get("s") and "s" not in it:
            it["s"] = tr["s"]; it.pop("smax", None)
        items.append(it)
    items += tr.get("x", [])
    miss = sorted(set(bl) - used)
    if miss: print(f"  !! {name}: tarjimasiz bloklar {miss}")
    e = {"items": items}
    if tr.get("also"): e["also"] = tr["also"]
    d[name + ".webp"] = e
json.dump(d, open(p, "w", encoding="utf8"), ensure_ascii=False, indent=1)
r = subprocess.run(["python3", "-W", "ignore", f"{R}/tools/i18n/img_translate.py", book] + [n + ".webp" for n in names], capture_output=True, text=True)
print(r.stdout.strip()[-200:], r.stderr.strip()[-600:])
