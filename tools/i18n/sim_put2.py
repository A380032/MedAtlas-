import sys,re
name=sys.argv[1]
f=f'tools/i18n/sim/{name}.en.tsv'
try: L=[l for l in open(f,encoding='utf8').read().split('\n') if l!='']
except FileNotFoundError: L=[]
n=len(L); out=[]
for k,line in enumerate(sys.stdin.read().split('\n')):
    if line=='': continue
    m=re.match(r'^(\d+)\|(.*)$',line,re.S)
    if not m: sys.exit(f'format xato: {line[:60]}')
    i=int(m.group(1))
    if i!=n+len(out): sys.exit(f'id mos emas: kutilgan {n+len(out)}, kelgan {i}')
    out.append(f'{i}\t{m.group(2)}')
open(f,'a',encoding='utf8').write(''.join(o+'\n' for o in out))
print('qo\'shildi',len(out),'| jami',n+len(out))
