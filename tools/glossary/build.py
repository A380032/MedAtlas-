"""Qo'shimcha atamalar bazasini yig'adi (qo'lda yozilgan, qo'llanmalarda bo'lmagan atamalar).
Manba: tools/glossary/src/*.txt   (qator:  uzAtama | uzTa'rif | enTerm | enDefinition ;  bo'lim:  ## UzToifa | EnCategory)
Natija: data/glossary/extra.json (uz) va data/en/glossary/extra.json (en) — [[atama, ta'rif, toifa], ...]
Ishga tushirish: python3 tools/glossary/build.py && python3 tools/i18n/build_manifest.py && python3 tools/build_precache.py"""
import glob, json, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
uz, en, seen, errs = [], [], {}, []
for f in sorted(glob.glob(os.path.join(root, "tools/glossary/src/*.txt"))):
    cu = ce = None
    for i, line in enumerate(open(f, encoding="utf-8"), 1):
        line = line.strip()
        if not line or line.startswith("#") and not line.startswith("##"): continue
        if line.startswith("##"):
            cu, ce = [x.strip() for x in line[2:].split("|")]; continue
        p = [x.strip() for x in line.split("|")]
        where = f"{os.path.basename(f)}:{i}"
        if len(p) != 4 or not all(p): errs.append(f"{where}: 4 ta maydon kerak"); continue
        if len(p[1]) < 30 or len(p[3]) < 30: errs.append(f"{where}: ta'rif juda qisqa ({p[0]})")
        k = re.sub(r"\s*\(.*?\)", "", p[0]).lower()
        if k in seen: errs.append(f"{where}: takror '{p[0]}' ({seen[k]})")
        seen[k] = where
        uz.append([p[0], p[1], cu]); en.append([p[2], p[3], ce])
if errs: print("\n".join(errs)); sys.exit(1)
for path, data in (("data/glossary/extra.json", uz), ("data/en/glossary/extra.json", en)):
    json.dump(data, open(os.path.join(root, path), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(uz), "ta atama")
