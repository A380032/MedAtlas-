"""python3 tools/i18n/book_resync.py <id> [chunk_chars]
uz va en JSON qo'lda (masalan, manba xatolari tuzatilgandan keyin) o'zgarganda tools/i18n/books/<id>/
dagi uz_*.tsv, en_*.txt va paths.json ni ikkala faylning hozirgi holatidan qayta yasaydi.
Shundan keyin book_apply.py aynan shu en faylni qayta hosil qiladi (tekshiriladi)."""
import glob, json, os, subprocess, sys

sid = sys.argv[1]
size = sys.argv[2] if len(sys.argv) > 2 else "15000"
out = f"tools/i18n/books/{sid}"
for f in glob.glob(f"{out}/uz_*.tsv") + glob.glob(f"{out}/en_*.txt"):
    os.remove(f)
subprocess.run([sys.executable, "tools/i18n/book_extract.py", sid, size], check=True)
en = json.load(open(f"data/en/subjects/{sid}.json", encoding="utf8"))
paths = json.load(open(f"{out}/paths.json", encoding="utf8"))


def get(o, p):
    for k in p:
        o = o[k]
    return o


bad = 0
for f in sorted(glob.glob(f"{out}/uz_*.tsv")):
    lines = []
    for line in open(f, encoding="utf8"):
        k = line.split("\t", 1)[0]
        vals = sorted({get(en, p) for p in paths[k]})
        if len(vals) > 1:
            bad += 1
            print("ZIDDIYAT:", k, vals)
        lines.append(f"{k} {vals[0]}\n")
    open(f.replace("uz_", "en_").replace(".tsv", ".txt"), "w", encoding="utf8").write("".join(lines))
if bad:
    sys.exit(f"{bad} ta kalitda bir xil o'zbekcha matnga turli tarjima — qo'lda hal qiling")
before = open(f"data/en/subjects/{sid}.json", encoding="utf8").read()
subprocess.run([sys.executable, "tools/i18n/book_apply.py", sid], check=True)
after = open(f"data/en/subjects/{sid}.json", encoding="utf8").read()
print("OK: apply en faylni aynan qayta hosil qildi" if before == after else "XATO: apply natijasi farq qiladi")
sys.exit(0 if before == after else 1)
