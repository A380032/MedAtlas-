# imgdev — atlas rasmlaridagi yozuvlarni tarjima qilish uchun ishchi vositalar

Ishchi papka: /home/claude/imgwork (bu yerdagi fayllar uning nusxasi).
- mkant.py — bk/<nom>.json bloklari + tr3/man/tr2/trdict tarjimalaridan tools/i18n/books/ant/img_en.json ni yasaydi va img_translate.py ni chaqiradi.
- blocks.py — lotin/o'zbek/rus yorliq bloklarini topadi (bk/).
- man/*.tsv — qo'lda berilgan bandlar: nom, quti (x0,y0,x1,y1 | R<qator>+.. | B<urug'>), tekislash, qatorlar soni, matn, opsiyalar
  (N: snap yo'q, V: navy o'chirish, Q: yumshoq navy, I: core yo'q, S<n>: shrift, H: sarlavha, F: to'liq to'ldirish, #rrggbb: fon).
- man/skip*.txt — e'tiborsiz qoldiriladigan avtomatik bloklar.
- tr3/*.tsv — "nom#indeks<TAB>qatorlar<TAB>English" (qator harflari rsheet varaqlaridagi kabi).
- tr/ant_x.py — xom qo'shimcha bandlar (qiya yozuv, chiziq tiklash).
