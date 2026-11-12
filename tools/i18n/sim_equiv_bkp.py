"""python3 tools/i18n/sim_equiv.py <name> [k1,k2,..] [steps]
Asl (sim/<name>.html) va inglizcha (sim/en/<name>.html) ni bir xil urug'li tasodifiylik, soxta soat va bir xil tasodifiy bosishlar bilan yuritadi.
1) DOM tuzilishi (teg+class, matnsiz) farq qilsa — mantiq buzilgan.  2) Inglizcha sahifada ko'ringan o'zbekcha so'zlar ro'yxati.  3) JS xatolari."""
import sys,subprocess,time,re,random,json,os
from collections import Counter
from playwright.sync_api import sync_playwright
n=sys.argv[1]
ks_arg=sys.argv[2] if len(sys.argv)>2 and sys.argv[2]!='-' else None
STEPS=int(sys.argv[3]) if len(sys.argv)>3 else 60
SEED="""(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};})();"""
srv=subprocess.Popen(['python3','-m','http.server','8765'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
SIG="""()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT);let e;while(e=w.nextNode()){let c=(e.getAttribute('class')||'').toString();if(/^phase[ iepr]*$/.test(c))c='phase';c=c.replace(/^(play(?: big)?) on$/,'$1');c=c.replace(/(^| )vib( |$)/,' ').trim();if(/^(SCRIPT|STYLE)$/.test(e.tagName)||c.includes('toast'))continue;o.push(e.tagName+'.'+c+(e.disabled?'!d':'')+(e.checked?'!c':'')+(e.getAttribute('aria-pressed')?'!p'+e.getAttribute('aria-pressed'):'')+(e.getAttribute('aria-selected')?'!s'+e.getAttribute('aria-selected'):'')+(e.tagName==='INPUT'&&e.value?'=v':''));}return o;}"""
todo=json.load(open(f'tools/i18n/sim/{n}.todo.json'))
W=lambda t:re.findall(r"[a-zA-Zʻ‘’']{4,}",t.lower())
cl=lambda t:re.sub(r'⟦\d+⟧|<[^>]+>|&\w+;','',t)
uzw=set(w for t in todo for w in W(cl(t)))
enw=set(w for l in open(f'tools/i18n/sim/{n}.en.tsv',encoding='utf8') for w in W(cl(l.rstrip('\n').partition('\t')[2])))
sus=uzw-enw
from wordfreq import zipf_frequency as _z
ALLOW=set()
_af=f'tools/i18n/sim/{n}.allow.txt'
if os.path.exists(_af): ALLOW=set(open(_af,encoding='utf8').read().split())
ALLOW|=set(open('tools/i18n/sim/ALLOW.txt',encoding='utf8').read().split()) if os.path.exists('tools/i18n/sim/ALLOW.txt') else set()
TX=[]
SEL_CASE='.pane button:not([disabled]), .pane input:not([type=hidden]), .pane [role=button], .stages button:not([disabled]), .side .fig-box [data-reg], .pane .hot, .pane .pt'
SEL_ALL='button:not([disabled]), select, input:not([type=hidden]), [role=tab], [role=button], [tabindex="0"], svg [id], summary, label'
def run(path,k):
    out=[];TX.clear()
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=b.new_context(viewport={'width':1100,'height':900},service_workers='block'); ctx.add_init_script(SEED)
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:120]))
        pg.clock.install(time=0)
        pg.goto('http://localhost:8765/'+path); pg.clock.run_for(300)
        if k is not None:
            pg.wait_for_selector('.case',timeout=5000)
            pg.locator('.case').nth(k).click(); pg.wait_for_selector('.case-view',timeout=5000); pg.clock.run_for(300)
        snap=lambda:(out.append(pg.evaluate(SIG)),TX.append(pg.evaluate('document.body.innerText')))
        snap()
        rnd=random.Random(7+(k or 0)); sel=SEL_CASE if k is not None else SEL_ALL
        for step in range(STEPS):
            els=pg.locator(sel); c=els.count()
            if c==0: break
            el=els.nth(rnd.randrange(c))
            try:
                tag=el.evaluate('e=>e.tagName+":"+(e.type||"")')
                if tag.startswith('SELECT'):
                    el.select_option(index=rnd.randrange(el.locator('option').count()),timeout=300)
                elif tag.startswith('INPUT:') and not re.search(r'radio|checkbox|button|range|submit',tag):
                    el.fill(str(rnd.choice([1,2,3,5,7,12,40,0.5,70,200])),timeout=300)
                else:
                    el.dispatch_event('click',timeout=300)
            except Exception: pass
            pg.clock.run_for(rnd.choice([60,400,3000]))
            snap()
        b.close()
    return out,errs
if ks_arg: ks=[int(x) for x in ks_arg.split(',')]
else:
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page(service_workers='block'); pg.goto(f'http://localhost:8765/sim/{n}.html'); pg.wait_for_timeout(400)
        cnt=pg.locator('.case').count(); b.close()
    ks=list(range(cnt)) if (cnt and not os.environ.get('GLOBAL')) else [None]
bad=0; seen={}; jserr=[]
for k in ks:
    a,ea=run(f'sim/{n}.html',k); TA=list(TX); e,ee=run(f'sim/en/{n}.html',k); TE=list(TX)
    for st,t in enumerate(TE):
        for w in set(W(t)):
            if w in ALLOW: continue
            if w in sus or _z(w.strip("'ʻ‘’"),'en')==0: seen.setdefault(w,f'case{k} step{st}')
    if a!=e:
        bad+=1; idx=next((i for i,(x,y) in enumerate(zip(a,e)) if x!=y),min(len(a),len(e)))
        print(f'case {k}: FARQ step {idx} (len {len(a)} vs {len(e)})')
        if idx<len(a) and idx<len(e):
            if os.environ.get('DBG'): print('--- UZ\n',TA[idx][-700:],'\n--- EN\n',TE[idx][-700:])
            ca,ce=Counter(a[idx]),Counter(e[idx]); print('   uz-only:',list((ca-ce).items())[:4],' en-only:',list((ce-ca).items())[:4])
    if ee!=ea: jserr.append((k,ea[:2],ee[:2]))
print('mos kelmagan:',bad,'/',len(ks)); print('JS xato farqlari:',jserr[:5])
print('ingliz sahifada ko\'ringan shubhali o\'zbekcha so\'zlar:',len(seen)); [print(' ',w,'@',t) for w,t in sorted(seen.items())[:400]]
srv.terminate()
