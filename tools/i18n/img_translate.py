"""python3 tools/i18n/img_translate.py <id> [rasm_nomi ...]
Kitob rasmlaridagi o'zbekcha yozuvlarni tarjima qilingan nusxasini yasaydi.
Spetsifikatsiya: tools/i18n/books/<id>/img_en.json
  {"<nom>.webp": {"also": ["<dublikat>.webp"], "items": [
      {"box": [x0, y0, x1, y1], "t": "English text", ...ixtiyoriy...}, ...]}}
Bandning ixtiyoriy maydonlari:
  "f":  shrift — serif | serifb | serifi | sans | sansb | dv | dvb | dvi | dvc | dvs | dvsb (DejaVu)   (standart: serif)
  "s":  shrift o'lchami px (bo'lmasa qutiga sig'adigan eng kattasi tanlanadi)
  "smax": avtomatik tanlanadigan o'lchamning yuqori chegarasi px (asl yozuv o'lchamidan oshmasin)
  "a":  l | c | r — gorizontal tekislash (standart: c)
  "bg": "#rrggbb" | "ring" (quti cheti medianasi) | "none" (standart: qutidagi eng ko'p rang — fon)
  "c":  matn rangi (standart: qutidagi eng to'q piksellar rangi)
  "rot": 90 | 270 — vertikal yozuv (pastdan yuqoriga = 90)
  "pad": ichki chekinish px (standart 1)
  "keep": ["#rrggbb", ...] — shu ranglarga yaqin piksellar saqlanadi (yozuv ustidan o'tgan grafik chizig'i)
  "lines": [[x0, y0, x1, y1, "#rrggbb", qalinlik], ...] — fon to'ldirilgandan keyin qayta chiziladigan chiziqlar
  "ell": true — quti o'rniga unga ichki chizilgan ellips to'ldiriladi (doira ichidagi yozuv)
  "cbox"+"ang": qiya yozuv (markaz, eni, bo'yi, burchak)
  "src": [dx, dy] — fon sifatida (dx, dy) ga siljigan qo'shni sohadan nusxa olinadi (teksturali fon uchun)
Natija: data/en/img/<id>/<nom>.webp (asl o'lcham bilan). Ilova (js/app.js) va tools/book_pdf.py
inglizcha rejimda shu fayl bo'lsa uni ishlatadi, bo'lmasa asl rasmni."""
import json, os, statistics, sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS = {
    "serif": "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "serifb": "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "serifi": "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
    "sans": "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "sansb": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "dv": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",          # matplotlib/graphviz diagrammalari
    "dvb": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "dvi": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
    "dvc": "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
    "dvs": "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "dvsb": "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
}


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def ring_px(im, box):
    x0, y0, x1, y1 = box
    W, H = im.size
    px = []
    for x in range(max(0, x0 - 2), min(W, x1 + 3)):
        for y in (y0 - 2, y1 + 2):
            if 0 <= y < H:
                px.append(im.getpixel((x, y)))
    for y in range(max(0, y0 - 2), min(H, y1 + 3)):
        for x in (x0 - 2, x1 + 2):
            if 0 <= x < W:
                px.append(im.getpixel((x, y)))
    return px


def ring_color(im, box):
    px = ring_px(im, box)
    return tuple(int(statistics.median(p[i] for p in px)) for i in range(3))


def auto_bg(im, box):
    """atrof bir tekis bo'lsa — atrof medianasi, aks holda qutidagi eng ko'p rang."""
    px = ring_px(im, box)
    sd = max(statistics.pstdev(p[i] for p in px) for i in range(3))
    return ring_color(im, box) if sd < 10 else mode_color(im, box)


def mode_color(im, box):
    """qutidagi eng ko'p uchraydigan rang (fon) — kvantlangan rejim, so'ng shu piksellar o'rtachasi."""
    px = list(im.crop((box[0], box[1], box[2] + 1, box[3] + 1)).getdata())
    from collections import Counter
    q = Counter((p[0] // 12, p[1] // 12, p[2] // 12) for p in px)
    best = max(q, key=lambda k: q[k] + 0.5 * sum(q.get((k[0] + a, k[1] + b, k[2] + c), 0)
                                                for a in (-1, 0, 1) for b in (-1, 0, 1) for c in (-1, 0, 1)))
    sel = [p for p in px if (p[0] // 12, p[1] // 12, p[2] // 12) == best]
    return tuple(int(statistics.median(p[i] for p in sel)) for i in range(3))


def ink_color(im, box):
    px = sorted(im.crop(box).getdata(), key=lambda p: sum(p))
    dark = px[:max(1, len(px) // 25)]
    c = tuple(int(statistics.median(p[i] for p in dark)) for i in range(3))
    return c if sum(c) < 330 else (20, 20, 20)


def wrap(draw, text, font, width):
    lines = []
    for para in text.split("\n"):
        words, cur = para.split(" "), ""
        if "  " in para:   # ataylab qo'yilgan bo'shliqlar saqlansin (qisqartma + izoh)
            lines.append(para)
            continue
        for w in words:
            t = (cur + " " + w).strip()
            if cur and draw.textlength(t, font=font) > width:
                lines.append(cur)
                cur = w
            else:
                cur = t
        lines.append(cur)
    return lines


def layout(draw, text, fname, w, h, size=None, smax=None):
    sizes = [size] if size else range(max(6, int(min(h, smax or h))), 5, -1)
    for s in sizes:
        font = ImageFont.truetype(FONTS[fname], s)
        lines = wrap(draw, text, font, w) if not size else wrap(draw, text, font, w if "\n" not in text else 10 ** 6)
        lh = int(s * 1.12)
        if size or (len(lines) * lh <= h + 1 and all(draw.textlength(l, font=font) <= w + 0.5 for l in lines)):
            return font, lines, lh
    font = ImageFont.truetype(FONTS[fname], 6)
    return font, wrap(draw, text, font, w), 7


def grad_fill(im, box, m=3):
    x0, y0, x1, y1 = box
    W, H = im.size
    L, R, T, B = max(0, x0 - m), min(W - 1, x1 + m), max(0, y0 - m), min(H - 1, y1 + m)
    src = im.copy()
    px = im.load()
    sp = src.load()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            fx = (x - L) / max(1, R - L)
            fy = (y - T) / max(1, B - T)
            h = [sp[L, y][i] * (1 - fx) + sp[R, y][i] * fx for i in range(3)]
            v = [sp[x, T][i] * (1 - fy) + sp[x, B][i] * fy for i in range(3)]
            px[x, y] = tuple(int((h[i] + v[i]) / 2) for i in range(3))


def put_angled(im, it):
    """qiya yozuv: "cbox": [markaz_x, markaz_y, eni, bo'yi], "ang": soat strelkasiga teskari burchak (gradus)."""
    import math
    cx, cy, w, h = it["cbox"]
    a = math.radians(it["ang"])
    ca, sa = math.cos(a), math.sin(a)
    pts = [(cx + dx * ca + dy * sa, cy - dx * sa + dy * ca) for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    bb = (int(min(p[0] for p in pts)), int(min(p[1] for p in pts)), int(max(p[0] for p in pts)), int(max(p[1] for p in pts)))
    fill = hexrgb(it["bg"]) if it.get("bg") else mode_color(im, bb)
    col = hexrgb(it["c"]) if it.get("c") else ink_color(im, bb)
    ImageDraw.Draw(im).polygon(pts, fill=fill)
    layer = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    font, lines, lh = layout(d, it["t"], it.get("f", "serif"), w - 2, h - 2, it.get("s"))
    y = (h - len(lines) * lh) / 2 + (lh - font.size) * 0.3
    for l in lines:
        d.text(((w - d.textlength(l, font=font)) / 2, y), l, font=font, fill=col + (255,))
        y += lh
    layer = layer.rotate(it["ang"], expand=True, resample=Image.BICUBIC)
    im.paste(layer, (int(cx - layer.size[0] / 2), int(cy - layer.size[1] / 2)), layer)


def put(im, it):
    if "ang" in it:
        return put_angled(im, it)
    x0, y0, x1, y1 = it["box"]
    rot = it.get("rot", 0)
    pad = it.get("pad", 1)
    bg = it.get("bg")
    if it.get("src"):   # teksturali fon: qo'shni sohadan nusxa
        from PIL import ImageFilter
        dx, dy = it["src"]
        patch = im.crop((x0 + dx - 2, y0 + dy - 2, x1 + dx + 3, y1 + dy + 3))
        m = Image.new("L", patch.size, 0)
        ImageDraw.Draw(m).rectangle((2, 2, patch.size[0] - 3, patch.size[1] - 3), fill=255)
        im.paste(patch, (x0 - 2, y0 - 2), m.filter(ImageFilter.GaussianBlur(1.2)))
        fill = None
    elif bg == "grad":   # chetlardan chiziqli interpolyatsiya (gradiyentli fon uchun)
        grad_fill(im, (x0, y0, x1, y1))
        fill = None
    elif bg == "none":
        fill = None
    elif bg == "ring":
        fill = ring_color(im, (x0, y0, x1, y1))
    else:
        fill = hexrgb(bg) if bg else auto_bg(im, (x0, y0, x1, y1))
    col = hexrgb(it["c"]) if it.get("c") else ink_color(im, (x0, y0, x1, y1))
    if fill:   # yumshoq chetli to'ldirish — fon bilan chok ko'rinmasin
        from PIL import ImageFilter
        m = Image.new("L", im.size, 0)
        if it.get("ell"):   # doira/oval ichidagi yozuv — ellips bilan to'ldiriladi
            ImageDraw.Draw(m).ellipse((x0, y0, x1, y1), fill=255)
        else:
            ImageDraw.Draw(m).rectangle((x0, y0, x1, y1), fill=255)
        m = m.filter(ImageFilter.GaussianBlur(1.2))
        if it.get("keep"):   # shu ranglarga yaqin piksellar (grafik chiziqlari) o'chirilmaydi
            ks = [hexrgb(k) for k in it["keep"]]
            mp, px = m.load(), im.load()
            for yy in range(max(0, y0 - 3), min(im.size[1], y1 + 4)):
                for xx in range(max(0, x0 - 3), min(im.size[0], x1 + 4)):
                    p = px[xx, yy]
                    if max(p) - min(p) > 40 and any(sum((p[i] - k[i]) ** 2 for i in range(3)) < 70 ** 2 for k in ks):
                        mp[xx, yy] = 0
        im.paste(Image.new("RGB", im.size, fill), (0, 0), m)
    for ln in it.get("lines", []):   # o'chib ketgan grafik chizig'ini qayta chizish: [x0, y0, x1, y1, "#rang", qalinlik]
        ImageDraw.Draw(im).line(ln[:4], fill=hexrgb(ln[4]), width=ln[5])
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    if rot in (90, 270):
        bw, bh = bh, bw
    layer = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    font, lines, lh = layout(d, it["t"], it.get("f", "serif"), bw - 2 * pad, bh - 2 * pad, it.get("s"), it.get("smax"))
    total = len(lines) * lh
    y = (bh - total) / 2 + (lh - font.size) * 0.3
    for l in lines:
        tw = d.textlength(l, font=font)
        a = it.get("a", "c")
        x = pad if a == "l" else (bw - pad - tw if a == "r" else (bw - tw) / 2)
        d.text((x, y), l, font=font, fill=col + (255,))
        y += lh
    if rot:
        layer = layer.rotate(rot, expand=True)
    im.paste(layer, (x0, y0), layer)


def main():
    sid = sys.argv[1]
    only = set(sys.argv[2:])
    spec = json.load(open(f"{ROOT}/tools/i18n/books/{sid}/img_en.json", encoding="utf8"))
    out_dir = f"{ROOT}/data/en/img/{sid}"
    os.makedirs(out_dir, exist_ok=True)
    n = 0
    for name, sp in spec.items():
        if only and name not in only:
            continue
        im = Image.open(f"{ROOT}/data/img/{sid}/{name}").convert("RGB")
        for it in sp["items"]:
            put(im, it)
        for nm in [name] + sp.get("also", []):
            im.save(f"{out_dir}/{nm}", "WEBP", quality=88, method=6)
            n += 1
    print(f"{n} ta rasm -> data/en/img/{sid}/")


if __name__ == "__main__":
    main()
