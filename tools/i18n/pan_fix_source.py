"""python3 tools/i18n/pan_fix_source.py
Patologik anatomiya (pan) kitobidagi manba xatolarini tuzatadi - bir xil amallar
data/subjects/pan.json (uz) va data/en/subjects/pan.json (en) ga qo'llanadi, shuning uchun
ikkala faylning tuzilmasi bir xil qoladi. Bir marta ishga tushiriladi (qayta ishga tushirilsa
hech narsa o'zgarmaydi - har bir amal oldin holatni tekshiradi).

Tuzatiladigan xatolar:
 1) sahifa chegarasida bo'linib qolgan gaplar (bir blok -> keyingi blok) birlashtiriladi;
 2) jadvaldan keyin takrorlangan sarlavha qatori (p) va jadvaldan "tushib qolgan" matn
    o'z katagiga qaytariladi;
 3) jadval kataklarida bo'linib qolgan so'zlar (Gemoside rin -> Gemosiderin);
 4) yolg'iz * (ilova kursivni ko'rsatmaydi, ekranda * bo'lib chiqadi) olib tashlanadi;
    juft bo'lmagan ** (9-mavzu, carcinoma in situ) tuzatiladi;
 6) ro'yxat bandiga yopishgan kichik sarlavhalar alohida blokka ajratiladi;
 5) ** ichidagi chetki bo'shliqlar, ikkitalik bo'shliqlar, "4- 11" kabi bo'shliqlar.
"""
import json, re

F = {"uz": "data/subjects/pan.json", "en": "data/en/subjects/pan.json"}
D = {k: json.load(open(v, encoding="utf8")) for k, v in F.items()}
log = []


def blocks(d, ti, key, si):
    return d["topics"][ti][key][si]["blocks"]


def first(b):
    return b["text"] if b["type"] == "p" else b["items"][0]


# ---------- 1) bo'lingan gaplar: (topic, key, section, [bloklar], {til: qo'shuvchi}) ----------
SP = {"uz": " ", "en": " "}
NO = {"uz": "", "en": ""}
MERGES = [
    (1, "sections", 1, [10, 11], NO),                    # (O2 | −)
    (1, "sections", 1, [14, 15], NO),                    # (O2 | − ni ...)
    (1, "sections", 1, [26, 27], {"uz": " ", "en": ""}),  # CCl3 | ga aylanadi / CCl3 | : lipids
    (1, "sections", 3, [39, 40, 41], SP),
    (1, "sections", 4, [4, 5], None),                    # ro'yxat davomi -> bitta ro'yxat
    (1, "sections", 7, [1, 2], SP),
    (3, "sections", 1, [12, 13], SP),
    (4, "sections", 4, [7, 8, 9], SP),
    (4, "sections", 7, [0, 1], SP),
    (5, "sections", 4, [3, 4], SP),
    (5, "sections", 4, [12, 13], SP),
    (5, "sections", 4, [21, 22], SP),
    (5, "skills", 1, [0, 1], SP),
    (6, "sections", 6, [0, 1], SP),
    (6, "sections", 7, [7, 8], SP),
    (7, "sections", 4, [9, 10], SP),
    (8, "sections", 1, [1, 2], SP),
    (8, "sections", 2, [1, 2], SP),
    (8, "sections", 5, [3, 4], SP),
    (8, "sections", 5, [12, 13], SP),
    (9, "sections", 2, [2, 3], None),
    (10, "sections", 2, [5, 6, 7, 8], SP),
    (10, "sections", 5, [18, 19], SP),
]
# 2) takrorlangan jadval sarlavhasi va tushib qolgan matn
TABLE_FIX = [
    # (topic, key, section, jadval, o'chiriladigan bloklar, (qator, ustun), {til: yangi katak matni yoki +qo'shimcha})
    (1, "sections", 3, 29, [30, 31], (3, 2), {
        "uz": "+ nekrozi",
        "en": "=Necrosis of the skin and soft tissues over bony prominences (sacrum, scapula, heel)"}),
    (3, "sections", 0, 1, [2, 3], (2, 1), {"uz": "+<3>", "en": "+<3>"}),   # Vilson- | Konovalov
]


def merge(lang, ti, key, si, ix, j):
    bl = blocks(D[lang], ti, key, si)
    a = bl[ix[0]]
    for i in ix[1:]:
        b = bl[i]
        if j is None:                       # ikki ro'yxat -> bitta
            assert a["type"] == b["type"] == "list"
            a["items"] += b["items"]
            continue
        tail = first(b)
        if a["type"] == "p":
            a["text"] = a["text"].rstrip() + j + tail.lstrip()
        elif a["type"] == "list":
            a["items"][-1] = a["items"][-1].rstrip() + j + tail.lstrip()
        else:
            raise ValueError(a["type"])
        if b["type"] == "list" and len(b["items"]) > 1:
            # ro'yxatning qolgan bandlari birinchi blokka qo'shiladi
            assert a["type"] == "list", (lang, ti, si, ix)
            a["items"] += b["items"][1:]
    for i in sorted(ix[1:], reverse=True):
        del bl[i]


def table_fix(lang, ti, key, si, tb, dels, rc, spec):
    bl = blocks(D[lang], ti, key, si)
    cell = bl[tb]["rows"][rc[0]]
    s = spec[lang]
    if s.startswith("="):
        cell[rc[1]] = s[1:]
    else:
        add = s[1:]
        m = re.fullmatch(r"<(\d+)>", add)
        if m:
            cell[rc[1]] = cell[rc[1]].rstrip() + bl[int(m.group(1))]["text"].strip()
        else:
            cell[rc[1]] = cell[rc[1]].rstrip() + add
    for i in sorted(dels, reverse=True):
        del bl[i]


def done():
    # birinchi amal bajarilganmi: 1-mavzu, 1-bo'lim, 10-blok "(O2−)" bilan tugaydimi
    return "O2−)" in blocks(D["uz"], 1, "sections", 1)[10]["text"]


if done():
    print("Tuzatishlar allaqachon qo'llangan - tuzilma o'zgartirilmadi.")
else:
    # bir bo'lim ichida indekslar siljimasligi uchun kattasidan boshlab
    ops = [("m", *m) for m in MERGES] + [("t", *t) for t in TABLE_FIX]
    ops.sort(key=lambda o: (o[1], o[2], o[3], -o[4][0] if o[0] == "m" else -o[4]), reverse=False)
    # har bir bo'lim uchun pastdan yuqoriga
    from itertools import groupby
    for _, grp in groupby(ops, key=lambda o: (o[1], o[2], o[3])):
        g = sorted(grp, key=lambda o: o[4][0] if o[0] == "m" else o[4], reverse=True)
        for o in g:
            for lang in D:
                if o[0] == "m":
                    _, ti, key, si, ix, j = o
                    merge(lang, ti, key, si, ix, None if j is None else j[lang])
                else:
                    _, ti, key, si, tb, dels, rc, spec = o
                    table_fix(lang, ti, key, si, tb, dels, rc, spec)
    log.append(f"{len(MERGES)} ta bo'lingan gap birlashtirildi, {len(TABLE_FIX)} ta jadval tiklandi")


# ---------- 1b) ro'yxat bandiga yopishib qolgan kichik sarlavha ("... oqibatlari. **Talaba bajara olishi kerak:**")
# -> band + alohida "sub" blok (uz va en bir xil joyda)
HEAD = re.compile(r"(?<=[.;)]) (\*\*([^*]{3,60}:)\*\*)$")


def split_heads(bl_uz, bl_en, where):
    n = 0
    i = 0
    while i < len(bl_uz):
        a, b = bl_uz[i], bl_en[i]
        if a["type"] == "box":
            n += split_heads(a["parts"], b["parts"], where)
        if a["type"] == "list" and i + 1 < len(bl_uz) and bl_uz[i + 1]["type"] == "list":
            mu, me = HEAD.search(a["items"][-1]), HEAD.search(b["items"][-1])
            if mu:
                assert me, (where, i, b["items"][-1][-80:])
                a["items"][-1] = a["items"][-1][:mu.start()]
                b["items"][-1] = b["items"][-1][:me.start()]
                bl_uz.insert(i + 1, {"type": "sub", "text": mu.group(2)})
                bl_en.insert(i + 1, {"type": "sub", "text": me.group(2)})
                n += 1
                i += 1
        i += 1
    return n


nh = 0
for ti, (tu, te) in enumerate(zip(D["uz"]["topics"], D["en"]["topics"])):
    nh += split_heads(tu["goals"], te["goals"], f"t{ti} goals")
    for key in ("sections", "skills"):
        for su, se in zip(tu[key], te[key]):
            nh += split_heads(su["blocks"], se["blocks"], f"t{ti} {key}")
if nh:
    log.append(f"{nh} ta yopishgan sarlavha alohida blokka ajratildi")

# ---------- 3) jadvaldagi bo'lingan so'zlar (faqat uz) ----------
WORDS = {"Gemoside rin": "Gemosiderin", "Gematoid in": "Gematoidin", "Gematinl ar": "Gematinlar",
         "Konyugatsiyal anmagan": "Konyugatsiyalanmagan", "Konyugatsiyal angan": "Konyugatsiyalangan",
         "Gemorrag ik": "Gemorragik", "rhinoscleroma tis": "rhinoscleromatis",
         "Gametopa tiyalar": "Gametopatiyalar", "Blastopati yalar": "Blastopatiyalar",
         "Embriopat iyalar": "Embriopatiyalar"}
# 4) juft bo'lmagan ** (faqat uz)
STARS = {"*Invaziyasiz saraton — carcinoma in situ***": "**Invaziyasiz saraton — carcinoma in situ**",
         "lekin** bazal membrana butun**": "lekin **bazal membrana butun**"}


def stars(s):
    # 3 ta yulduzcha -> 2 (kursiv olib tashlanadi), yolg'iz yulduzcha -> olib tashlanadi
    return re.sub(r"\*+", lambda m: {1: "", 3: "**"}.get(len(m.group()), m.group()), s)


def bold_space(s):
    out, i = [], 0
    for m in re.finditer(r"\*\*(.+?)\*\*", s):
        out.append(s[i:m.start()])
        x = m.group(1)
        lead = " " if x[:1].isspace() else ""
        trail = " " if x[-1:].isspace() else ""
        out.append(f"{lead}**{x.strip()}**{trail}")
        i = m.end()
    out.append(s[i:])
    return "".join(out)


def clean(s, lang):
    o = s
    if lang == "uz":
        for a, b in WORDS.items():
            s = s.replace(a, b)
        for a, b in STARS.items():
            s = s.replace(a, b)
    if s.count("**") % 2 == 0:
        s = stars(s) if re.search(r"(?<!\*)\*(?!\*)|\*\*\*", s) else s
        s = bold_space(s)
    s = re.sub(r"(?<=\S) {2,}(?=\S)", " ", s)
    s = re.sub(r"(\d)- (\d)", r"\1-\2", s)
    s = re.sub(r" +([,;])", r"\1", s)
    s = re.sub(r"\( +", "(", s)
    s = re.sub(r" +\)", ")", s)
    s = s.strip()
    return s, s != o


cnt = {"uz": 0, "en": 0}


def walk(o, lang):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("id", "type", "kind", "src"):
                continue
            if isinstance(v, str):
                o[k], ch = clean(v, lang); cnt[lang] += ch
            else:
                walk(v, lang)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str):
                o[i], ch = clean(v, lang); cnt[lang] += ch
            else:
                walk(v, lang)


for lang in D:
    walk(D[lang], lang)
log.append(f"matn tozalandi: uz {cnt['uz']} ta, en {cnt['en']} ta qator")

for lang, path in F.items():
    with open(path, "w", encoding="utf8") as f:
        json.dump(D[lang], f, ensure_ascii=False, separators=(",", ":"))
print("\n".join(log))
