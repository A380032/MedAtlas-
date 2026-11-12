"""python3 tools/i18n/sim_todo.py <name>  -> sim/<name>.todo.json (yagona matnlar ro'yxati) va sim/<name>.risk.json"""
import json,sys,re
sys.path.insert(0,'tools/i18n')
from sim_filter import is_text
def flat(L):
    for i in L:
        yield i
        for j in i.get('inner',[]): yield j
n=sys.argv[1]
import os
SRC=open(f'sim/{n}.html',encoding='utf8').read()
CSSNAMES=set(re.findall(r'[.#]([A-Za-z][\w\-]*)',' '.join(re.findall(r'<style[^>]*>(.*?)</style>',SRC,flags=re.S))))|set(w for c in re.findall(r'class=["\']([^"\']+)["\']',SRC) for w in c.split())|set(re.findall(r'\bid=["\']([^"\']+)["\']',SRC))
L=[i for i in flat(json.load(open(f'tools/i18n/sim/{n}.uz.json'))) if is_text(i) and not (len(i['text'])>3000 and ' ' not in i['text'][:200])]
# kichik harfli yakka so'zlar: faqat shu fayldagi matnlarda uchraydigan o'zbekcha so'zlar bo'lsa qo'shiladi
lex=set()
for i in L:
    t=re.sub(r'⟦\d+⟧|<[^>]+>','',i['text'])
    if len(t.split())>=2 or re.search(r"[ʻ‘’']",t): lex|=set(re.findall(r"[a-zʻ‘’']{3,}",t.lower()))
extra=[]
for i in flat(json.load(open(f'tools/i18n/sim/{n}.uz.json'))):
    t=i['text'].strip()
    if i['kind']=='str' and re.fullmatch(r"[a-zʻ‘’']{3,}",t) and t in lex and t not in CSSNAMES and not is_text(i): extra.append(i)
L=L+extra
_xf=f'tools/i18n/sim/{n}.extra.json'     # qo'lda qo'shiladigan matnlar (filtr o'tkazib yuborganlari)
if os.path.exists(_xf):
    xs=set(json.load(open(_xf)))
    L=L+[i for i in flat(json.load(open(f'tools/i18n/sim/{n}.uz.json'))) if i['text'].strip() in xs and i not in L]
uniq={};risk={}
for i in L:
    t=i['text'].strip()
    if not t: continue
    uniq.setdefault(t,0)
    if i.get('risk'): risk.setdefault(t,set()).add(i['risk'])
todo=sorted(uniq,key=lambda t:(len(t)>0 and 0, t))   # barqaror tartib
# tartib: manba tartibida (o'qish oson)
order={};
for i in sorted(L,key=lambda x:x['start']):
    order.setdefault(i['text'].strip(),len(order))
todo=sorted(uniq,key=lambda t:order[t])
fn=f'tools/i18n/sim/{n}.todo.json'
if os.path.exists(fn):   # mavjud raqamlar o'zgarmasin: eski ro'yxat + yangilari oxiriga
    old=json.load(open(fn)); seen=set(old); todo=old+[t for t in todo if t not in seen]
json.dump(todo,open(f'tools/i18n/sim/{n}.todo.json','w'),ensure_ascii=False)
json.dump({t:sorted(v) for t,v in risk.items()},open(f'tools/i18n/sim/{n}.risk.json','w'),ensure_ascii=False,indent=0)
print(n,len(todo),'matn,',len(risk),'xavfli')
