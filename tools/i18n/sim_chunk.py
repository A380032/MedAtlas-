"""python3 tools/i18n/sim_chunk.py <name> <from> <to>  — tarjima uchun bo'lakni chiqaradi (id|matn)"""
import json,sys
n,a,b=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
T=json.load(open(f'tools/i18n/sim/{n}.todo.json'))
R=json.load(open(f'tools/i18n/sim/{n}.risk.json'))
for i in range(a,min(b,len(T))):
    print(f"{i}|{'!' if T[i] in R else ''}{T[i]!r}"[:900] if False else f"{i}|{'!' if T[i] in R else ''}{T[i].replace(chr(10),'\\n')}")
