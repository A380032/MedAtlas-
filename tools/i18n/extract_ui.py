"""Kod ichidagi interfeys matn bo'laklarini ajratadi: tools/i18n/ui_uz.txt
Shablondagi ${...} -> {0},{1}.. ; teglar orasidagi matn alohida bo'lak."""
import re,sys
FILES=['index.html','js/app.js','js/tests.js','js/account.js','js/rooms.js','js/admin.js','privacy.html','terms.html']
def frags(x):
    n=[0]
    def ph(m):
        k=n[0]; n[0]+=1; return '\u0001%d\u0002'%k
    # nested braces: simple scan for ${ ... }
    out='';i=0
    while i<len(x):
        if x.startswith('${',i):
            d=1;j=i+2
            while j<len(x) and d:
                d+= (x[j]=='{') - (x[j]=='}'); j+=1
            out+=ph(None); i=j
        else: out+=x[i]; i+=1
    out=re.sub(r'<[^>]*>','\u0003',out)
    res=[]
    for p in out.split('\u0003'):
        p=re.sub(r'\u0001(\d+)\u0002',lambda m:'{%s}'%m.group(1),p)
        p=re.sub(r'\s+',' ',p).strip()
        if re.search(r'[A-Za-zʻ‘’]{3,}',re.sub(r'\{\d+\}','',p)): res.append(p)
    return res
seen={}
for f in FILES:
    s=open(f,encoding='utf8').read()
    if f.endswith('.html'):
        body=re.sub(r'<script.*?</script>|<style.*?</style>','',s,flags=re.S)
        for p in frags(body): seen.setdefault(p,f)
        for a in re.findall(r'(?:aria-label|title|placeholder|alt|content)="([^"]{3,})"',s): seen.setdefault(a,f)
        continue
    for m in re.finditer(r'"((?:[^"\\\n]|\\.){3,})"|`((?:[^`\\]|\\.)*)`|\'((?:[^\'\\\n]|\\.){3,})\'',s):
        x=m.group(1) or m.group(2) or m.group(3) or ''
        if re.search(r'=>|;\s*$|^\s*(function|return|const)\b|\.(js|css|png|json|html)\b|^[\w\-./#:?&=%]+$|querySelector|addEventListener',x) and '<' not in x: continue
        for p in frags(x): seen.setdefault(p,f)
# attributlar ichidagi matn (aria-label=... ) shablonlardan
for f in FILES[1:6]:
    s=open(f,encoding='utf8').read()
    for a in re.findall(r'(?:aria-label|title|placeholder|alt)="([^"$]{3,})"',s): seen.setdefault(a,f)
code=re.compile(r'^[a-z][\w]*(\.[\w]+)+|^[a-z]+[A-Z]|[{}()\[\];=]{2,}|^\W+$|^(div|span|svg|path|btn|sec|tab|row)\b')
keep=[k for k in seen if not code.search(k) and len(k)<400]
open('tools/i18n/ui_uz.txt','w',encoding='utf8').write('\n'.join(keep)+'\n')
print(len(keep),'fragment')
