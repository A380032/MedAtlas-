# Rasm tarjimasi uchun yordamchi skriptlar (ish papkasi: /home/claude/imgwork)
- blk.py  — diagrammadagi matn bloklarini/tugunlarini topadi (NODES=1 — mayda diagrammalar), blk/<kitob>/<rasm>.json + raqamlangan .png
- mk.py   — tr/<kitob>.py dagi T lug'atidan tools/i18n/books/<kitob>/img_en.json ni yasaydi va img_translate.py ni ishga tushiradi
- cs.py / sbs.py / ens.py / zg.py / bz.py — ko'rib tekshirish uchun varaqlar (kontakt, asl|en, en, kattalashtirish, raqamli)
- patch.py — img_en.json dagi matnni nuqtali tuzatish; tabchk.py — uz/en jadvallarini solishtirish
- tr/<kitob>.py — tarjimalar (blok raqami → inglizcha matn); blk_<kitob>/ — shu raqamlar mos keladigan blok fayllari
