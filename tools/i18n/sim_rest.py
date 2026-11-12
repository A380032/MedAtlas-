"""python3 tools/i18n/sim_rest.py <name> -> todo ga kirmagan, lekin harfli matnlar (qo'lda ko'rib chiqish uchun, extra.json ga qo'shiladi)"""
import json,re,sys
n=sys.argv[1]
todo=set(json.load(open(f'tools/i18n/sim/{n}.todo.json')))
def flat(L):
    for i in L:
        yield i
        for j in i.get('inner',[]): yield j
rest={}
for i in flat(json.load(open(f'tools/i18n/sim/{n}.uz.json'))):
    t=i['text'].strip()
    if t in todo or not re.search(r"[A-Za-z]{3}",t) or re.fullmatch(r"[#a-fA-F0-9]+",t) or len(t)>200: continue
    if re.search(r"[{};]|^(rgb|rgba|var|translate|rotate|scale|data:|http|--|\.|#|M\d|\d)",t): continue
    if re.search(r"[A-Z]+_[A-Z0-9_]+$|^[a-z]+[A-Z]",t): continue
    rest[t]=1
print(len(rest)); print(' | '.join(rest))
