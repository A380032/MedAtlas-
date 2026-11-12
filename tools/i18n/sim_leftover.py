"""python3 tools/i18n/sim_leftover.py <name>  -> sim/en/<name>.html ichida qolgan o'zbekcha so'zlarni ko'rsatadi"""
import json,re,sys,subprocess
n=sys.argv[1]
subprocess.run(['node','tools/i18n/sim_extract.js',f'sim/en/{n}.html',f'/tmp/{n}-en.json'],check=True,capture_output=True)
todo=json.load(open(f'tools/i18n/sim/{n}.todo.json'))
W=lambda t:re.findall(r"[a-zA-Zʻ‘’']{4,}",re.sub(r'⟦\d+⟧|<[^>]+>|&\w+;','',t).lower())
uzw=set(w for t in todo for w in W(t))
en=[]
for l in open(f'tools/i18n/sim/{n}.en.tsv',encoding='utf8'):
    i,_,v=l.rstrip('\n').partition('\t'); en.append(v)
enw=set(w for t in en for w in W(t))
EN=set(open('/usr/share/dict/words').read().lower().split()) if __import__('os').path.exists('/usr/share/dict/words') else set()
sus=uzw-enw-EN
# o'zbekchaga xos belgilar bo'lmasa ham: faqat tarjimada UCHRAMAGAN so'zlar
def flat(L):
    for i in L:
        yield i
        for j in i.get('inner',[]): yield j
found={}
for i in flat(json.load(open(f'/tmp/{n}-en.json'))):
    for w in set(W(i['text'])):
        if w in sus: found.setdefault(w,[]).append(i['text'].strip()[:70])
for w,v in sorted(found.items()): print(w,'|',v[0])
print(len(found),'shubhali so\'z')
