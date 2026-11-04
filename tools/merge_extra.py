"""tools/extra/tNN.json (NN = mavzu raqami) ichidagi yangi test va kartochkalarni bkp.json ga qo'shadi.
Takroriy savollar (matni bir xil) o'tkazib yuboriladi, shuning uchun qayta ishga tushirish xavfsiz."""
import json,glob,os
P='data/subjects/bkp.json'
d=json.load(open(P))
add_q=add_c=0
for f in sorted(glob.glob('tools/extra/t*.json')):
    n=int(os.path.basename(f)[1:3]); x=json.load(open(f)); t=d['topics'][n-1]
    have={q['q'] for q in t['quiz']}
    for q in x.get('quiz',[]):
        assert len(q['options'])==5 and 0<=q['answer']<5,(f,q['q'])
        if q['q'] not in have: t['quiz'].append(q); add_q+=1
    haveC={c['front'] for c in t['cards']}
    for c in x.get('cards',[]):
        if c['front'] not in haveC: t['cards'].append(c); add_c+=1
json.dump(d,open(P,'w'),ensure_ascii=False,indent=1)
print('qo‘shildi: test',add_q,'karta',add_c)
