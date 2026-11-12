"""python3 tools/i18n/fzl_fix_source.py [--en data/en/subjects/fzl.json]
data/subjects/fzl.json dagi manba xatolarini tuzatadi (tools/i18n/books/fzl/pending_uz.txt asosida).
--en berilsa, tuzilmaviy o'zgarishlar inglizcha faylga ham bir xil qo'llanadi. Idempotent."""
import json, re, sys

PATH = "data/subjects/fzl.json"
uz = json.load(open(PATH, encoding="utf8"))
en_path = sys.argv[sys.argv.index("--en") + 1] if "--en" in sys.argv else None
en = json.load(open(en_path, encoding="utf8")) if en_path else None
log = []

# Mashg'ulot maqsadi: "... **Talaba bajara olishi kerak:**" birinchi ro'yxatning oxirgi bandiga yopishib qolgan
GSUB = re.compile(r"\s*\*\*([^*]+:)\*\*$")
for doc in (uz, en):
    if doc is None:
        continue
    k = 0
    for tp in doc["topics"]:
        g = tp.get("goals", [])
        for j in range(len(g) - 1):
            if g[j]["type"] == "list" and g[j + 1]["type"] == "list" and g[j]["items"]:
                m = GSUB.search(g[j]["items"][-1])
                if m:
                    g[j]["items"][-1] = g[j]["items"][-1][:m.start()]
                    g.insert(j + 1, {"type": "sub", "text": m.group(1)})
                    k += 1
                    break
    if k:
        log.append(f"maqsad: 'bajara olishi kerak' sarlavhasi ajratildi ({k})")

for doc, path in ((uz, PATH), (en, en_path)):
    if doc is None:
        continue
    raw = open(path, encoding="utf8").read()
    with open(path, "w", encoding="utf8") as f:
        if raw.startswith("{\n"):
            json.dump(doc, f, ensure_ascii=False, indent=1)
        else:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        if raw.endswith("\n"):
            f.write("\n")
print("tuzilma:", log or "o'zgarish yo'q")
