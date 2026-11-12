"""Offline uchun yuklab olinadigan fayllar ro'yxatini (data/precache.json) yangilaydi.
Yangi fan yoki rasm qo'shilgandan keyin ishga tushiring: python3 tools/build_precache.py"""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = []
for base, _, names in os.walk(os.path.join(root, "data")):
    for n in sorted(names):
        p = os.path.relpath(os.path.join(base, n), root).replace(os.sep, "/")
        if p != "data/precache.json" and "/books/" not in p:  # PDF kitoblar (data/books, data/<til>/books) oflayn ro'yxatga kirmaydi
            files.append(p)
for base, _, names in os.walk(os.path.join(root, "sim")):
    for n in sorted(names):
        files.append(os.path.relpath(os.path.join(base, n), root).replace(os.sep, "/"))
files.sort()
json.dump(files, open(os.path.join(root, "data", "precache.json"), "w"), indent=0)
print(len(files), "fayl")
