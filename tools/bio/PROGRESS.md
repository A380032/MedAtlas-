# BIO (Tibbiy biologiya va genetika) qo'llanmasi — ish holati

Manba: KTP "Tibbiy biologiya va genetika" 2024–2025, Davolash ishi, 1-kurs, 1-semestr, 15 ta amaliy mashg'ulot mavzusi.
Asosiy darslik: Xolikov P.X. va boshq. Tibbiy biologiya va genetika, 2022 (rasmlarning asosiy qismi shundan);
qo'shimcha: Nishonboyev K.N., Hamidov J.H., 2005; kafedraning 1–15-mustaqil ish topshiriqlari (savollar, vaziyatli masalalar).
Ikki til birga yoziladi: tools/bio/src/uz/tNN.json va tools/bio/src/en/tNN.json.

Buyruqlar:
- python3 tools/bio/build.py --check [--lenient]  — ikki til mosligi (raqamlar, belgilar, rasm raqamlari)
- python3 tools/bio/build.py                      — data/subjects/bio.json, data/en/subjects/bio.json
- python3 tools/i18n/img_translate.py bio          — inglizcha rasmlar (spec: tools/i18n/books/bio/img_en.json) -> data/en/img/bio/
- python3 tools/bio/cover.py                      — PDF muqova kollaji (uz + en)
- python3 tools/book_pdf.py bio uz|en             — data/books/bio.pdf, data/en/books/bio.pdf

Holat:
- [x] t01–t15 yozildi (uz+en), 51 ta rasm (50 tasi darslikdan, mikroskop — Wikimedia Commons)
- [x] 41 ta rasmning inglizcha nusxasi (yozuvlar tarjima qilingan), 10 tasi tilga bog'liq emas
- [x] PDF (uz 158 bet, en 157 bet), muqova
- [x] catalog.json (biologiya: ready), lang-en.js, precache, en/manifest, sw.js v1.1.20
- [x] mahalliy sinov (uz/en: fan sahifasi, mavzu, kitob, inglizcha rasmlar)
- [ ] push — faqat egasi "push qil" desa

Kengaytirish (2026-11-20, foydalanuvchi so'rovi: "barcha mavzularni ko'rib chiq va kengaytir"):
- Ish skriptlari: /home/claude/chk/x/ (lib.py, apply.py, xNN.py — har mavzu uchun qo'shimchalar; apply.py NN git 3f68bfc dagi asl faylga qo'shib src ga yozadi, jadval/rasm raqamlarini qayta qo'yadi)
- Yangi rasmlar: /home/claude/chk/x/addimg.py (darslik tbimg -> data/img/bio/*.webp); inglizcha nusxalari (lang:true) oxirida img_en.json ga qo'shiladi
- [x] t01..t15 kengaytirildi (uz 317 -> 518 KB): yangi bo'limlar, jadvallar, yechimli masalalar, har mavzuga +3 vaziyatli masala, +5-6 test, +4-5 kartochka
- [x] 55 ta yangi rasm darslikdan (jami 106 ta), ulardan 30 tasining inglizcha nusxasi (img_en.json, jami 71)
- [x] PDF qayta yig'ildi: uz 244 bet, en 244 bet (oldin 158/157); precache, en/manifest yangilandi
