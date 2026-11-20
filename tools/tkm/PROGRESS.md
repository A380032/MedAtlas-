# TKM (Tibbiy va biologik kimyo) qo'llanmasi — ish holati

Manba: KTP "Tibbiy kimyo 2024-2025", 2-semestr, 15 ta amaliy/laboratoriya mavzusi.
Ikki til birga yoziladi: tools/tkm/src/uz/tNN.json va tools/tkm/src/en/tNN.json.

Buyruqlar:
- python3 tools/tkm/fig.py          — chizilgan rasmlar (uz + en)
- python3 tools/tkm/photos.py       — Commons fotosuratlari (429 bo'lsa keyin qayta)
- python3 tools/tkm/build.py --check — ikki til mosligi; build.py — data/subjects/tkm.json, data/en/subjects/tkm.json

Holat:
- [x] t01–t15 yozildi (uz+en), rasmlar chizildi
- [ ] fotosuratlar: t01_alanga, t03_tosh, t04_phmetr (Commons 429)
- [ ] t06–t15
- [ ] PDF (tools/i18n/books/tkm/pdf_uz.json, pdf_en.json, muqova), catalog.json, lang-en.js, manifest, precache, sw.js versiya
- [ ] to'liq tekshiruv, mahalliy sinov, keyin push uchun ruxsat so'rash (push faqat egasi "push qil" desa)

## Kengaytma (2026-11-20)
- [x] tools/tkm/ext/{uz,en}/t01–t15.json: har mavzuga 2–3 yangi bo'lim, mavjud bo'limlarga qo'shimchalar,
      +1 ko'nikma, +6 savol, +10 test (jami 25), +5 masala (jami 8), +5–6 kartochka
- [x] 3 ta yangi struktura rasmi: t10_keton, t11_alkaloid, t15_eikozanoid (uz + en)
- [x] PDF qayta yig'ildi, sw.js v1.1.20
