# patch.py: img_en.json dagi matnlarni tuzatish.  P(book,name,old,new,**upd)  — old: to'liq yoki qism matn (count=hammasi)
import json,sys
R="/home/claude/medatlas-"
_c={}
def _load(b):
    if b not in _c: _c[b]=json.load(open(f"{R}/tools/i18n/books/{b}/img_en.json",encoding="utf8"))
    return _c[b]
def P(b,n,old,new,exact=False,**upd):
    d=_load(b); k=0
    for it in d[n+".webp"]["items"]:
        if (it["t"]==old) if exact else (old in it["t"]):
            it["t"]=it["t"].replace(old,new) if not exact else new
            for a,v in upd.items():
                if v is None: it.pop(a,None)
                else: it[a]=v
            k+=1
    if not k: print("!! topilmadi:",b,n,repr(old))
    return k
def save():
    for b,d in _c.items():
        json.dump(d,open(f"{R}/tools/i18n/books/{b}/img_en.json","w",encoding="utf8"),ensure_ascii=False,indent=1)
    print("saved",list(_c))
