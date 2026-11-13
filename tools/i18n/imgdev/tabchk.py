import json,re,sys
R="/home/claude/medatlas-"
UZ=re.compile(r"[oOgG][‘’'ʻʼ`][a-z]|\b\w+(ning|larni|larda|lardan|larga|ligi|lishi|ishi|uvchi|dagi|siz|gan|digan|moqda|iladi|aydi|adi)\b|\b(va|yoki|bilan|uchun|ham|emas|bor|yo'q|qon|suv|kun|soat|yil|oy|hafta|katta|kichik|yuqori|past|kam|ko'p|me'yor|norma|oshgan|pasaygan|belgi|turi|tur|nomi|sabab|natija|davo|kasallik|holat|daraja|miqdor|ko'rsatkich)\b",re.I)
OKW=re.compile(r"^(organ|began|Morgan|Reagan|slogan|Michigan|pagan|vegan|Logan|Vulgaris|Hogan|normal?|bor|tur|oy|suv|kam|ham|past|va|orphan|Kazan|Okazaki|Hassan|Ryan|Afghan|Cardigan|toboggan|cardiologi|Fagan|Glasgow|Duncan|Mulligan|Brogan|Gilligan|Flanagan|McGregor|Dugan|Finnegan|loperamide|soat)$",re.I)
def tabs(o,out,topic=None):
    if isinstance(o,dict):
        if o.get("type")=="table": out.append(o)
        for v in o.values(): tabs(v,out)
    elif isinstance(o,list):
        for v in o: tabs(v,out)
def cells(t):
    yield ("title",t.get("title","") or "")
    for i,h in enumerate(t.get("head") or []): yield (f"h{i}",h)
    for r,row in enumerate(t.get("rows") or []):
        for c,x in enumerate(row): yield (f"r{r}c{c}",x)
    for k in t:
        if k not in ("type","title","head","rows"): yield (k,json.dumps(t[k],ensure_ascii=False))
tot=0
for b in sys.argv[1:] or ("bkm","mkb","fzl","frm","pfz","ikp","pan","bkp"):
    uz=[];en=[]
    tabs(json.load(open(f"{R}/data/subjects/{b}.json")),uz); tabs(json.load(open(f"{R}/data/en/subjects/{b}.json")),en)
    print(f"== {b}: uz {len(uz)} en {len(en)}")
    for i,(u,e) in enumerate(zip(uz,en)):
        ur=u.get("rows") or []; er=e.get("rows") or []
        if len(ur)!=len(er) or [len(r) for r in ur]!=[len(r) for r in er] or len(u.get("head") or [])!=len(e.get("head") or []):
            print(f"  STRUCT t{i} {e.get('title','')[:60]}: uz {len(ur)}x{[len(r) for r in ur][:3]} en {len(er)}x{[len(r) for r in er][:3]}")
        hd=len(e.get("head") or [])
        if hd and any(len(r)!=hd for r in er): print(f"  RAGGED t{i} {e.get('title','')[:60]} head {hd} rows {sorted(set(len(r) for r in er))}")
        uc=dict(cells(u)); 
        for k,x in cells(e):
            if not isinstance(x,str): x=str(x)
            if re.search(r"[А-Яа-яЁёЎўҚқҒғҲҳ]",x): print(f"  CYR t{i} {k}: {x[:90]}"); tot+=1
            m=[w.group(0) for w in UZ.finditer(x) if not OKW.match(w.group(0))]
            if m: print(f"  UZ? t{i} {k} {m[:4]}: {x[:110]}"); tot+=1
            ux=uc.get(k)
            if isinstance(ux,str) and ux==x and re.search(r"[a-z]{5,}",x) and len(x)>12: print(f"  SAME t{i} {k}: {x[:90]}"); tot+=1
            # sonlar farqi
            if isinstance(ux,str):
                nu=re.findall(r"\d+(?:[.,]\d+)?",ux); ne=re.findall(r"\d+(?:[.,]\d+)?",x)
                if sorted(n.replace(",",".") for n in nu)!=sorted(n.replace(",",".") for n in ne): print(f"  NUM t{i} {k}: UZ[{ux[:70]}] EN[{x[:70]}]"); tot+=1
print("jami",tot)
