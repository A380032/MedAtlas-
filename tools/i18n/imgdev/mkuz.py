# mkuz.py — barcha bk/*.json dan noyob (lotin, o'zbek) juftlarini yig'adi -> uzlist.tsv (id, lat, uz)
import json, glob, re, os
def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace("`", "'").replace("ʻ", "'")
    s = re.sub(r"\s+", " ", s).strip(" -—–|.,;:!")
    return s
seen = {}; out = []
for p in sorted(glob.glob("bk/*.json")):
    nm = os.path.basename(p)[:-5]; d = json.load(open(p))
    for i, b in enumerate(d["blocks"]):
        uz = norm(b.get("uz_ocr", "")); lat = norm(b.get("lat_t", ""))
        k = (lat.lower(), uz.lower())
        if k not in seen:
            seen[k] = f"u{len(seen):04d}"; out.append((seen[k], lat, uz, nm))
        b["key"] = seen[k]
    json.dump(d, open(p, "w"), ensure_ascii=False)
with open("uzlist.tsv", "w") as f:
    for k, lat, uz, nm in out: f.write(f"{k}\t{nm}\t{lat}\t{uz}\n")
print(len(out))
