"""python3 tools/i18n/build_manifest.py  -> data/en/manifest.json (sim/en/*.html va data/en/** fayllar ro'yxati)"""
import os,json
files=[]
for root in ('sim/en','data/en'):
    for dp,_,fs in os.walk(root):
        for f in fs:
            p=os.path.join(dp,f).replace(os.sep,'/')
            if p!='data/en/manifest.json': files.append(p)
files.sort()
json.dump({'files':files},open('data/en/manifest.json','w'),indent=1)
print(len(files),'fayl')
