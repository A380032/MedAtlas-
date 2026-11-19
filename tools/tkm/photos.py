"""Haqiqiy fotosuratlarni Wikimedia Commons dan yuklab, data/img/tkm ga webp qilib yozadi.
Bitta rasm bir nechta fayldan (masalan, alanga ranglari) yonma-yon yig'ilishi mumkin; ular tilga
bog'liq matnsiz bo'ladi (faqat kimyoviy belgi), shuning uchun inglizcha nusxa kerak emas.

  python3 tools/tkm/photos.py            -> yo'q rasmlarni yuklaydi (bor bo'lsa o'tkazib yuboradi)
  python3 tools/tkm/photos.py --force t01_alanga

Commons so'rovlarni cheklaydi (429), shuning uchun har so'rov orasida kutiladi va qayta uriniladi.
Yuklangan asl fayllar keshi: /tmp/tkm_commons/. Litsenziya va muallif ma'lumoti PHOTOS dagi 'credit'
da va kitob oxiridagi "Rasmlar manbalari" ro'yxatiga kiradi."""
import io, os, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data/img/tkm")
CACHE = "/tmp/tkm_commons"
UA = "ALVORAMedStudyApp/1.0 (https://alvoramed.com; educational use)"

PHOTOS = {
    "t01_alanga": {"strip": [("Li", "Flammenfärbung Li.png", "FlammenfärbungLi.png"),
                             ("Na", "Flametest--Na.swn.jpg"),
                             ("K", "FlammenfärbungK.png", "Flammenfärbung K.png"),
                             ("Ca", "FlammenfärbungCa.png", "Flammenfärbung Ca.png"),
                             ("Sr", "FlammenfärbungSr.png", "Flammenfärbung Sr.png"),
                             ("Cu", "Flametest--Cu.swn.jpg")],
                   "credit": "Wikimedia Commons: Søren Wedel Nielsen (CC BY-SA 2.5); Flammenfärbung series (CC BY-SA 3.0)"},
    "t03_tosh": {"one": ["Kidney stone composed of calcium oxalate showing sharp edges.jpg", "Kidney stones.jpg", "Nierensteine.jpg"],
                 "credit": "Wikimedia Commons (CDC PHIL)"},
    "t04_phmetr": {"one": ["PH Meter.jpg", "PH-Meter.jpg", "Ph meter.jpg", "PH meter.jpg", "Digital pH meter.jpg"],
                   "credit": "Wikimedia Commons"},
    "t07_xromat": {"one": ["Chromatography of chlorophyll - Step 7.jpg", "Paper chromatography.jpg", "Chromatography tlc.jpg"],
                   "credit": "Wikimedia Commons"},
    "t02_byuretka": {"one": ["Acid and Base Titration.jpg", "School level titration demonstration.jpg"],
                     "credit": "Wikimedia Commons (CC BY-SA / CC BY 2.0)"},
}


def get(name, width=900):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name.replace("/", "_") + f".{width}")
    if os.path.exists(p) and os.path.getsize(p) > 5000:
        return open(p, "rb").read()
    if os.environ.get("CACHE_ONLY"): return None
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(name.replace(" ", "_")) + f"?width={width}"
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            data = urllib.request.urlopen(req, timeout=60).read()
            if data[:4] in (b"\x89PNG", b"\xff\xd8\xff\xe0", b"\xff\xd8\xff\xe1", b"\xff\xd8\xff\xdb") or data[:3] == b"\xff\xd8\xff":
                open(p, "wb").write(data)
                return data
            return None
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            wait = 20 * (attempt + 1)
            print(f"   {e.code} {name}: {wait}s kutiladi"); time.sleep(wait)
        except Exception as e:
            print("   xato", name, e); time.sleep(10)
    return None


def first(cands, width=960):
    for c in cands:
        d = get(c, width)
        time.sleep(6)
        if d: return Image.open(io.BytesIO(d)).convert("RGB")
    return None


def save(name, im):
    os.makedirs(OUT, exist_ok=True)
    if im.width > 1400: im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=86, method=6)
    print("yozildi", name, im.size)


def strip(items):
    tiles = []
    for sym, *cands in items:
        im = first(cands, 500)
        if im is None:
            print("   topilmadi, tashlab ketildi:", sym); continue
        h = 520; im = im.resize((round(im.width * h / im.height), h))
        w = 200; x = max(0, (im.width - w) // 2); im = im.crop((x, 0, x + w, h))
        tiles.append((sym, im))
    if len(tiles) < 3: return None
    print("   tasmada:", " ".join(t[0] for t in tiles))
    W = len(tiles) * 210 + 10
    can = Image.new("RGB", (W, 600), "white")
    dr = ImageDraw.Draw(can)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
    for i, (sym, im) in enumerate(tiles):
        can.paste(im, (10 + i * 210, 10))
        tw = dr.textlength(sym, font=font)
        dr.text((10 + i * 210 + (200 - tw) / 2, 545), sym, fill="#22313f", font=font)
    return can


def main():
    force = "--force" in sys.argv
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or list(PHOTOS)
    for n in names:
        if not force and os.path.exists(os.path.join(OUT, n + ".webp")): continue
        spec = PHOTOS[n]
        im = strip(spec["strip"]) if "strip" in spec else first(spec["one"])
        if im is None: print("BAJARILMADI:", n); continue
        save(n, im)


if __name__ == "__main__":
    main()
