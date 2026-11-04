"""Yangi qo'shilgan testlarda (har mavzuning 16-savolidan boshlab) to'g'ri javob o'rnini tekis taqsimlaydi.
Asl 15 ta savolga tegmaydi. Qayta ishga tushirish xavfsiz (natija aniq belgilangan urug'ga bog'liq)."""
import json,random
P='data/subjects/bkp.json'
d=json.load(open(P))
for t in d['topics']:
    rnd=random.Random(1000+t['no'])
    new=t['quiz'][15:]
    targets=[i%5 for i in range(len(new))]
    rnd.shuffle(targets)
    for q,pos in zip(new,targets):
        correct=q['options'][q['answer']]
        others=[o for i,o in enumerate(q['options']) if i!=q['answer']]
        rnd.shuffle(others)
        others.insert(pos,correct)
        q['options']=others; q['answer']=pos
json.dump(d,open(P,'w'),ensure_ascii=False,indent=1)
