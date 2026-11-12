"""python3 tools/i18n/sim_put.py <name> <startId>  < satrlar   (har satr = bitta tarjima, id tartibida) -> tools/i18n/sim/<name>.en.tsv ga qo'shadi"""
import sys,os
n,start=sys.argv[1],int(sys.argv[2])
fn=f'tools/i18n/sim/{n}.en.tsv'
have=0
if os.path.exists(fn):
    have=sum(1 for l in open(fn,encoding='utf8') if l.strip())
if have!=start: sys.exit(f'XATO: faylda {have} qator bor, start={start}')
lines=[l.rstrip('\n') for l in sys.stdin.read().split('\n')]
if lines and lines[-1]=='': lines.pop()
with open(fn,'a',encoding='utf8') as f:
    for k,l in enumerate(lines): f.write(f'{start+k}\t{l}\n')
print('qo\'shildi:',len(lines),'| jami',start+len(lines))
