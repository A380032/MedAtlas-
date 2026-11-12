"""python3 tools/i18n/sim_render.py <name>  -> sim/en/<name>.html ni headless Chrome da ochadi: JS xatolari va qolgan o'zbekcha so'zlar.
Har bir kartochka (.case) ochiladi, bosqichlar bo'limi, daftar, natija bloklari matni tekshiriladi."""
import sys,re,json,subprocess,time
from playwright.sync_api import sync_playwright
n=sys.argv[1]; hashes=sys.argv[2:]
srv=subprocess.Popen(['python3','-m','http.server','8765'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
todo=json.load(open(f'tools/i18n/sim/{n}.todo.json'))
W=lambda t:re.findall(r"[a-zA-Zʻ‘’']{4,}",t.lower())
uzw=set(w for t in todo for w in W(re.sub(r'⟦\d+⟧|<[^>]+>','',t)))
en=[l.rstrip('\n').partition('\t')[2] for l in open(f'tools/i18n/sim/{n}.en.tsv',encoding='utf8')]
enw=set(w for t in en for w in W(re.sub(r'⟦\d+⟧|<[^>]+>','',t)))
sus=uzw-enw
errs=[];seen={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1100,'height':900},service_workers='block')
    pg.on('pageerror',lambda e:errs.append('pageerror: '+str(e)[:200]))
    pg.on('console',lambda m:errs.append('console.'+m.type+': '+m.text[:200]) if m.type in('error','warning') else None)
    pg.goto(f'http://localhost:8765/sim/en/{n}.html'); pg.wait_for_timeout(500)
    def scan(tag):
        t=pg.evaluate('document.body.innerText')
        for w in set(W(t)):
            if w in sus: seen.setdefault(w,tag)
    scan('home')
    cnt=pg.locator('.case').count(); print('kartochkalar:',cnt)
    for k in range(cnt):
        pg.goto(f'http://localhost:8765/sim/en/{n}.html'); pg.wait_for_timeout(200)
        pg.locator('.case').nth(k).click(); pg.wait_for_timeout(400)
        scan(f'case{k}')
        # barcha tugmalarni bir marta bosib ko'rish (xavfsiz: sahifa ichida)
        btns=pg.locator('.stage button, .stage .btn, .stage select, .stage input[type=button]')
        for j in range(min(btns.count(),40)):
            try: btns.nth(j).click(timeout=300,force=True)
            except Exception: pass
        pg.wait_for_timeout(200); scan(f'case{k}-after')
        for sel in pg.locator('.stage select').all()[:6]:
            try:
                for o in range(1,min(sel.locator('option').count(),6)):
                    sel.select_option(index=o); 
            except Exception: pass
        scan(f'case{k}-sel')
    b.close()
srv.terminate()
print('JS xatolari:',len(errs)); [print(' ',e) for e in errs[:15]]
print('qolgan shubhali so\'zlar:',len(seen)); [print(' ',w,'@',t) for w,t in sorted(seen.items())[:60]]
