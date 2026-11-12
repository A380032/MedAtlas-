"""tools/i18n/ui_extra_*.txt  ("uz ||| en", '5' = o'zgaruvchi) -> ui_en.tsv ga qo'shadi. Mavjud kalitga tegmaydi."""
import glob,re
def norm(s): return re.sub(r"[ʻʼ‘’`´]","'",re.sub(r"[“”«»]",'"',s)).strip()
ex=[l.rstrip('\n') for l in open('tools/i18n/ui_en.tsv',encoding='utf8') if '\t' in l]
have={norm(l.split('\t',1)[0]) for l in ex}
add=[]
def conv(uz,en):
    n=[0]
    def rep(m):
        v='{%d}'%n[0]; n[0]+=1; return v
    # faqat alohida turgan '5' belgilar o'zgaruvchi; ikkala tomonda ham bir xil tartib
    u=re.sub(r'5',rep,uz) ; k=[0]
    def rep2(m):
        v='{%d}'%k[0]; k[0]+=1; return v
    e=re.sub(r'5',rep2,en)
    return u,e
for f in sorted(glob.glob('tools/i18n/ui_extra_*.txt')):
    for l in open(f,encoding='utf8'):
        l=l.rstrip('\n')
        if ' ||| ' not in l: continue
        uz,en=l.split(' ||| ',1)
        cands=[]
        u,e=conv(uz,en)
        cands.append((u,e))
        # ikon (yoki bo'sh) bilan boshlansa/tugasa — ularsiz variantlar ham
        for (u2,e2) in list(cands):
            if u2.startswith('{0} ') and e2.startswith('{0} '):
                cands.append((u2[4:],e2[4:]))
            if u2.endswith('{0}') and e2.endswith('{0}') and not u2.startswith('{0}'):
                cands.append((u2[:-3].rstrip(),e2[:-3].rstrip()))
        # {0} bilan boshlansa-yu, ikonsiz qolgan variantda indekslarni qayta raqamlash
        out=[]
        for (u2,e2) in cands:
            if '{' in u2:
                idx=re.findall(r'\{(\d+)\}',u2)
                m={o:str(i) for i,o in enumerate(idx)}
                u2=re.sub(r'\{(\d+)\}',lambda x:'{'+m[x.group(1)]+'}',u2)
                e2=re.sub(r'\{(\d+)\}',lambda x:'{'+m.get(x.group(1),x.group(1))+'}',e2)
            out.append((u2,e2))
        for u2,e2 in out:
            if norm(u2) in have or not u2.strip(): continue
            if u2.strip() in ('{0}',): continue
            have.add(norm(u2)); add.append(f"{u2}\t{e2}")
open('tools/i18n/ui_en.tsv','a',encoding='utf8').write('\n'.join(add)+'\n')
print(len(add),'qo\'shildi')
