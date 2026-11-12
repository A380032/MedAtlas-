"""tools/i18n/ui_en.tsv  ->  js/lang-en.js   (python3 tools/i18n/build_lang.py)"""
import json,re
rows=[]
for l in open('tools/i18n/ui_en.tsv',encoding='utf8'):
    l=l.rstrip('\n')
    if not l or '\t' not in l: continue
    a,b=l.split('\t',1); rows.append([a,b])
seen={}
for a,b in rows: seen[a]=b
js="/* English interfeys tarjimasi — avtomatik yaratilgan: tools/i18n/build_lang.py (manba: tools/i18n/ui_en.tsv).\n   Kalit — O'zbekcha matn; {0},{1} — o'zgaruvchan qism. */\nwindow.I18N.register(\"en\", "+json.dumps(seen,ensure_ascii=False,indent=0)+");\n"
open('js/lang-en.js','w',encoding='utf8').write(js)
print(len(seen),'entries')
