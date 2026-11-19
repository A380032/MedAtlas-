"""BIO PDF muqovasi uchun 6 ta kitob rasmidan kollaj (1600×825), ikki tilda.
  python3 tools/bio/cover.py -> tools/i18n/books/bio/pdf_cover_uz.jpg, pdf_cover.jpg"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "tools/i18n/books/bio")
ITEMS = [("t01_bakteriofag", "Bakteriofag", "Bacteriophage"),
         ("t03_sikl", "Hujayra sikli", "Cell cycle"),
         ("t06_transkripsiya", "Transkripsiya", "Transcription"),
         ("t07_viktoriya", "Gemofiliya shajarasi", "Haemophilia pedigree"),
         ("t11_bezgak_sikl", "Bezgak parazitining sikli", "Malaria parasite cycle"),
         ("t15_miya", "Bosh miya evolyutsiyasi", "Brain evolution")]
W, H, PAD, BAR = 1600, 825, 18, 54
NAVY = (31, 52, 84)


def main():
    os.makedirs(OUT, exist_ok=True)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    for lang, fname in (("uz", "pdf_cover_uz.jpg"), ("en", "pdf_cover.jpg")):
        can = Image.new("RGB", (W, H), (235, 240, 246))
        dr = ImageDraw.Draw(can)
        cw, ch = (W - PAD * 4) // 3, (H - PAD * 3) // 2
        for i, (name, uz, en) in enumerate(ITEMS):
            x = PAD + (i % 3) * (cw + PAD); y = PAD + (i // 3) * (ch + PAD)
            dr.rounded_rectangle((x, y, x + cw, y + ch), 14, fill="white", outline=(150, 170, 195), width=2)
            p = os.path.join(ROOT, "data/en/img/bio" if lang == "en" else "data/img/bio", name + ".webp")
            if not os.path.exists(p): p = os.path.join(ROOT, "data/img/bio", name + ".webp")
            im = Image.open(p).convert("RGB")
            im.thumbnail((cw - 24, ch - BAR - 20), Image.LANCZOS)
            can.paste(im, (x + (cw - im.width) // 2, y + 10 + (ch - BAR - 20 - im.height) // 2))
            dr.rounded_rectangle((x, y + ch - BAR, x + cw, y + ch), 14, fill=NAVY)
            dr.rectangle((x, y + ch - BAR, x + cw, y + ch - BAR + 14), fill=NAVY)
            t = uz if lang == "uz" else en
            tw = dr.textlength(t, font=font)
            dr.text((x + (cw - tw) / 2, y + ch - BAR + 12), t, fill="white", font=font)
        can.save(os.path.join(OUT, fname), "JPEG", quality=90)
        print(fname)


main()
