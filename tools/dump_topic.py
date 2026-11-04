import json,sys,re
d=json.load(open('data/subjects/bkp.json'))
n=int(sys.argv[1]); t=d['topics'][n-1]
def blk(b):
    ty=b.get('type')
    if ty in('p','h','sub'):return b.get('text','')
    if ty=='list':return '\n'.join('- '+i if isinstance(i,str) else '- '+str(i) for i in b.get('items',[]))
    if ty=='table':
        rows=[b.get('head',[])]+b.get('rows',[])
        return '\n'.join(' | '.join(str(c) for c in r) for r in rows)
    if ty in('box','note'):return '['+str(b.get('kind',''))+'] '+(b.get('text') or ' '.join(blk(x) for x in b.get('blocks',[])))
    return ''
out=[t['title']]
for s in t['sections']+t.get('skills',[]):
    out.append('## '+s['title'])
    for b in s['blocks']:out.append(blk(b))
txt='\n'.join(out)
txt=re.sub(r'\*\*|~|\^','',txt)
print(txt)
print('--- EXISTING QUIZ Q:')
for q in t['quiz']:print('*',q['q'][:90])
print('--- EXISTING CARDS:',[c['front'][:30] for c in t['cards']])
