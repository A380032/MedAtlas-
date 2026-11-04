import json,re,glob,os
R='/root/.claude/projects/-home-claude/15e37e7c-6376-59ad-93e7-dd1dced2eaa7/tool-results/'
files={}
for fn in glob.glob(R+'mcp-Google_Drive-search_files-*.txt'):
    try: d=json.load(open(fn))
    except Exception: continue
    for f in d.get('files',[]):
        if f.get('parentId')=='1erBu99iNDQ3jqoJGF-SwYosnesMQtn9w': files[f['id']]=f
extra={ # birinchi sahifadagi 5 ta fayl
 '1ImSnF5zbbgP4rrfaEDTjVjLjhva_wHoo':'Коротяев_А_И_Бабичев_С_А_Медицинская.djvu',
 '1GfUtjq12hDvGjtVM5b9aS6u7EnogLs12':'Патофиз_Лапасова.pdf',
 '1BkOrYtT1-9YoEDrNfV2-Loho_mbalyE6':'Хаитов Иммунология.pdf',
 '1b030Jr2baTmxlEF4Fh3bcUFELgyJG4fC':'В.В. Новицкий.pdf',
 '1gNvQzNG-osFWKhgDdyAnOXHQ9PVwjUej':'Haqberdiyev - Patologik fiziologiya.pdf'}
for i,t in extra.items():
    files.setdefault(i,{'id':i,'title':t,'viewUrl':f'https://drive.google.com/file/d/{i}/view?usp=drivesdk','fileSize':None})
import unicodedata
for f in files.values(): f['title']=unicodedata.normalize('NFC',f['title'])
print(len(files),'fayl')
lib=json.load(open('data/library.json'))
ORIG=set(['navruzova-geppe-2019','arziqulov-2017','qorakhojayev-2006','daminov-2012','gadayev-2012','kamolov-1991','abdullaxojayeva-1-2012','abdullaxojayeva-2-2012','strukov-uz-1973','strukov-ru-2015','robbins-pbd-9-2015','robbins-review-3-2010','kaplan-path-2016','pathoma-2011','mishra-notes','azizova-2006','xakimov-reseptura-2020','xususiy-farm-kirill'])
lib['books']=[b for b in lib['books'] if b['id'] in ORIG]
lib['groups']=[g for g in lib['groups'] if g['id'] in ('bkp','ikp','patanatomiya','farmakologiya')]
match={'navruzova-geppe-2019':'18Sxf5lxqy9_NtkXH3iPgNAGj8xHnR7fn','arziqulov-2017':'1OXc4mc2YZYGLUe2wQKNIkA5f7_Cur2WF','qorakhojayev-2006':'1GUjhPRnqaALb5i6ONoWSGaNVojxjAQ0N','daminov-2012':'1KfPi3kZsruy0W8Lx5w2aeH9vcYpONe9s','gadayev-2012':'1nDVDX2eqSGky09fAuJlHBhDAL52Apq16','kamolov-1991':'1yYTFtYeFWNSOdG5GEvmOtjfD5vjYDa-K','abdullaxojayeva-1-2012':'1Mbz9xlqlxsEZGiPzNl88g8SGnSzGC42x','abdullaxojayeva-2-2012':'1kpWYjc8ioiafNxCiL1pdF49qgKaZrHgE','strukov-uz-1973':'1jYeZew1YLjO4Nkux0ixEAj3nPG2FPA1D','strukov-ru-2015':'1Dtmq29_ycbm9IToVTRvnwmp-EYamluLo','robbins-pbd-9-2015':'1JSl5yVqht13ktTCUiSpjHI76umBRndKb','robbins-review-3-2010':'1QYiQm4Q9esP_2cBR9OSrVF1dMqfjFI4j','kaplan-path-2016':'1FI0DKvpaXFUf6R7Rl7OIzPAPPzF0aJWl','pathoma-2011':'1OwIUnxTVXsAXg07LDtkG0vspe_jYwicF','mishra-notes':'1fMlFjdZGLJy-MWPK3BpsZyOMKrbVcAq1','azizova-2006':'1M7oDzIaqkNRz1VnJ1pIChablvgcvXVl9','xakimov-reseptura-2020':'1coRg1aV1uDDS7zOT0cTH3hb7w9xmhrx4','xususiy-farm-kirill':'1KTpVQqmGyfW8PrWJWg6YEb4TGrXLUFYP'}
used=set(match.values())
for b in lib['books']:
    b['file']=files[match[b['id']]]['viewUrl']
groups=[g for g in lib['groups']]
have={g['id'] for g in groups}
newg=[('patfiz','Patologik fiziologiya','#8e5bd0','PFZ'),('anatomiya','Normal anatomiya','#c9a227','ANA'),('fiziologiya','Normal fiziologiya','#1f9cb0','FIZ'),('biokimyo','Biokimyo','#6b8e23','BIO'),('gistologiya','Gistologiya','#c2547a','GIS'),('mikrobio','Mikrobiologiya va immunologiya','#d0573a','MIK'),('gematologiya','Gematologiya va onkogematologiya','#b3322f','GEM'),('xirurgiya','Xirurgiya','#5b6f8e','XIR'),('pediatriya','Pediatriya (rus tilida)','#d9822b','PED'),('boshqa','Boshqa fanlar','#7a7f87','BSH')]
for i,n,c,a in newg:
    if i not in have: groups.append({'id':i,'name':n,'color':c,'abbr':a})
def has(t,*k): return any(x in t for x in k)
OV={'Жункейра':'gistologiya','Уткир лейкоз':'gematologiya','Радиология':'boshqa','Gadayev,Mirsharapov':'anatomiya','амалий машгулот':'gematologiya','Амалий машгулот':'gematologiya','Klinik laborator':'gematologiya','Klinik anftomiya':'anatomiya','N_H_Shomirzayev':'anatomiya','ункейра':'gistologiya','Майский':'farmakologiya','Коротяев':'mikrobio','Новицкий':'patfiz','Color_Atlas_of_Pha':'farmakologiya','Лапасова':'patfiz'}
def subj(t):
    for k,v in OV.items():
        if k in t: return v
    l=t.lower()
    if has(l,'гематол','лейкоз','анеми','gematol','oxta','okta','амалий машгулот','амалий машг','лабор'): return 'gematologiya'
    if has(l,'патофиз','патолог','patofiz','patologik fiz','патфиз') and not has(l,'анатом','anatom'): return 'patfiz'
    if has(l,'patologik anat','патологическая анат','pathoma','robbins','pathology','струков','strukov'): return 'patanatomiya'
    if has(l,'фармак','pharm','farmak','retseptura','харкевич','майский','katzung'): return 'farmakologiya'
    if has(l,'first aid'): return 'boshqa'
    if has(l,'гистол','histol','gistol','жункейра','junqueira','улумбеков','афанасьев','афнфсьев','ющканцева','tursunov','to\'xtayev','zufarov','мушкамбаров'): return 'gistologiya'
    if has(l,'микробиол','microbiol','mikrobiol','иммунол','immunol','вирусол','левинсон','борисов','зверев','хаитов','мухамедов','aliyev','medical biochem'.replace('biochem','xx')): return 'mikrobio'
    if has(l,'биохим','biochem','biokim','bioxim','biolog','harper','sobirova','sabirova','севери','severin','lippincott','nikolayev','essentials_of_medical','sobirova','биологик'): return 'biokimyo'
    if has(l,'физиол','physiol','fiziol','guyton','гайтон','khurana','sherwood','vander','boron','costanzo','brs. phys','бабский','alaviya','qodirov','алявия','косицкий','ткаченко','агаджян','судаков'): return 'fiziologiya'
    if has(l,'анатом','anatom','sobotta','netter','gray','гайворонский','синельников','билич','николенко','козлов','винцент','memorix','череп','цнс','сосуды','остеол','синдесм','миол','органы чувств','пищеварит','дыхательная','kaplan 2017_usmle step 1 anat'): return 'anatomiya'
    if has(l,'педиатр','pediatr','шабалов','shabalov','геппе','bkp','даминов','неотложная'): return 'pediatriya'
    if has(l,'ikp','ichki kass','kamolov','gadaev','gadoev'): return 'ikp'
    if has(l,'xirurg','хирург'): return 'xirurgiya'
    return 'boshqa'
CYR=re.compile('[а-яА-ЯёЎўҚқҒғҲҳ]')
UZCYR=('амалий','лейкоз','анемия','хусусий','асаб','рухият','мухамедов','китоб','радиология китоб')
def lang(t,sid):
    if 'Uchebnik' in t: return ('ru','lotin')
    if 'Gadaev. Ichki' in t or 'Severin' in t: return ('uz','lotin')
    if 'Gospital' in t: return ('uz','kirill')
    l=t.lower()
    if CYR.search(t):
        return ('uz','kirill') if has(l,*UZCYR) else ('ru','kirill')
    if has(l,'ikp','bkp','odam','anatomiya','fiziologiya','patologik','farmakologiya','gistologiya','mikrobiologiya','biokimyo','biologik','xirurgiya','gematologiya','klinik','umumiy','tibbiy','tibbiyot','jamoat','oxta','retseptura','atlas odam','to\'xtayev','tursunov','zufarov','aliyev','sobirova','sabirova','xudoyberdiyev','ahmedov','bahodirov','gadayev','nikolayev','qodirov','alaviya','azizova','haqberdiyev','abdullaxojayeva','shomirzayev','bazarbaev','hodjibekov','aripov','agzamov','dolimov','gabchenko','patofiziologiya','gospital','mikrobiologik','bioximiya','kamolov','oripov','qoraxo','arziqulov'): return ('uz','lotin')
    return ('en','lotin')
def clean(fn):
    t=re.sub(r'\.(pdf|PDF|docx|doc|djvu)$','',fn).replace('_',' ')
    t=re.sub(r'\s+',' ',t).strip(); t=re.sub(r'^@\w+\s+','',t); return t
kindmap={'anatomiya':'Anatomiya','gematologiya':'Gematologiya'}
existing={b['id'] for b in lib['books']}
for i,f in files.items():
    if i in used: continue
    t=f['title']; s=subj(t); lg,sc=lang(t,s)
    m=re.search(r'\.(pdf|docx|doc|djvu)$',t,re.I); fmt=m.group(1).upper() if m else 'PDF'
    sz=round(int(f['fileSize'])/1048576,1) if f.get('fileSize') else None
    bid=re.sub(r'[^a-z0-9]+','-',(i[:6]+'-'+clean(t)).lower())[:48]
    if lg=='uz' and sc=='lotin' and CYR.search(t): sc='kirill'
    lib['books'].append({'id':bid,'title':clean(t),'authors':'','year':None,'publisher':'','lang':lg,'script':sc,'subject':s,'kind':'Kitob','format':fmt,'sizeMB':sz,'pages':None,'cover':None,'file':f['viewUrl']})
# ---- 2-bosqich: toifalar (fundamental / klinik), pediatriya birlashtirish, qo'lda tuzatishlar
FIX_SUBJ={'OXTA':'oxta','Klinik anftomiya':'oxta','Klinik_anatomiya':'oxta','Klinik anatomiya':'oxta','Shomirzayev':'oxta','tibbiy genetika':'fund_umumiy','First Aid':'fund_umumiy','Kaplan USMLE Step 1 Lecture 2018':'fund_umumiy','Human Anatomy and Physiology':'fund_umumiy','Principles of anatomy and physiology':'fund_umumiy',
 'Мушкамбаров':'biokimyo','Klinik laborator':'klin_umumiy','radiolog':'radiologiya','Радиология':'radiologiya','PSIXOLOG':'psixologiya','РУХИЯТ':'psixologiya','Jamoat salomatligi':'jamoat'}
FIX_LANG={'Biologik kimyo':('uz','lotin'),'Бабский':('uz','kirill'),'Алявия':('uz','kirill')}
for b in lib['books']:
    for k,v in FIX_SUBJ.items():
        if k.lower() in b['title'].lower(): b['subject']=v
    for k,v in FIX_LANG.items():
        if k.lower() in b['title'].lower(): b['lang'],b['script']=v
    if b['subject'] in ('bkp',): b['subject']='pediatriya'
for b in lib['books']:
    if b['title'].startswith('Klinik anftomiya 2'): b.update(title='OXTA, 2-tom (Klinik anatomiya)',authors='N.H. Shomirzayev, Sh.M. Axmedov, I.D. Gulmanov',year=2020)
    if b['title'].startswith('N H Shomirzayev'): b.update(title='OXTA, 1-tom (Klinik anatomiya)',authors='N.H. Shomirzayev, Sh.M. Axmedov, I.D. Gulmanov')
    if b['title']=='OXTA Agzamov': b.update(title='OXTA',authors='Agzamov')
    if b['title']=='OXTA Dolimov': b.update(title='OXTA',authors='Dolimov')
    if b['title'].startswith('Gabchenko'): b.update(title='OXTA',authors='Gabchenko')
G={g['id']:g for g in groups}
G['pediatriya'].update(name='Pediatriya (bolalar kasalliklari)',abbr='PED')
def mk(i,n,c,a):
    if i not in G: G[i]={'id':i,'name':n,'color':c,'abbr':a}
mk('oxta','Operativ xirurgiya va topografik anatomiya (OXTA)','#8a5a3c','OXT'); mk('fund_umumiy','Fundamental fanlar (umumiy)','#7a7f87','FUN'); mk('klin_umumiy','Klinik fanlar (umumiy)','#7a7f87','KLN')
mk('radiologiya','Radiologiya','#4f7cac','RAD'); mk('psixologiya','Tibbiy psixologiya va nevrologiya','#9b6bb5','PSX'); mk('jamoat','Jamoat salomatligi','#3a9a6b','JSM')
FUND=['anatomiya','gistologiya','fiziologiya','biokimyo','mikrobio','farmakologiya','patanatomiya','patfiz','fund_umumiy']
KLIN=['pediatriya','ikp','xirurgiya','oxta','gematologiya','radiologiya','psixologiya','jamoat','klin_umumiy']
out=[]
for cat,ids in (('fund',FUND),('klin',KLIN)):
    for i in ids:
        G[i]['cat']=cat; out.append(G[i])
groups=out
lib['cats']=[{'id':'fund','name':'Fundamental fanlar'},{'id':'klin','name':'Klinik fanlar'}]
lib['groups']=groups
lib['version']=3
json.dump(lib,open('data/library.json','w'),ensure_ascii=False,indent=1)
from collections import Counter
print(Counter(b['subject'] for b in lib['books']));print(Counter(b['lang'] for b in lib['books']));print(len(lib['books']))
for b in lib['books']:
    if b['subject']=='boshqa': print('BOSHQA',b['title'])
