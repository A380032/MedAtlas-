// node tools/i18n/sim_apply.js <name>
// sim/<name>.html + tools/i18n/sim/<name>.uz.json + <name>.todo.json + <name>.en.tsv  ->  sim/en/<name>.html
// Tekshiruvlar: belgilar (⟦n⟧), teglar, entitilar, JS qayta tahlili. Xato bo'lsa chiqish kodi 1.
const fs=require('fs'),path=require('path');
const NM='/home/claude/tools-i18n/node_modules/';
const acorn=require(NM+'acorn'),parse5=require(NM+'parse5');
const name=process.argv[2];
const D='tools/i18n/sim/';
const src=fs.readFileSync(`sim/${name}.html`,'utf8');
const items=JSON.parse(fs.readFileSync(D+name+'.uz.json','utf8'));
const todo=JSON.parse(fs.readFileSync(D+name+'.todo.json','utf8'));
const en={};
for(const line of fs.readFileSync(D+name+'.en.tsv','utf8').split('\n')){ if(!line) continue; const i=line.indexOf('\t'); { let v=line.slice(i+1); if(v!=='=') v=v.replace(/\\n/g,'\n'); en[+line.slice(0,i)]=v; } }
const errors=[],warns=[];
const tr=new Map(); // uz(strip) -> en
todo.forEach((t,i)=>{ if(en[i]===undefined){ errors.push('tarjima yo\'q: #'+i+' '+t.slice(0,60)); return; } tr.set(t,en[i]); });
// ---- tekshiruv: matn darajasida
const mk=s=>(s.match(/⟦\d+⟧/g)||[]).sort().join(',');
const tags=s=>(s.match(/<\/?[A-Za-z][^>]*>/g)||[]).map(x=>x.replace(/\s+/g,' ')).sort().join('|');
const ents=s=>(s.match(/&[#A-Za-z0-9]+;/g)||[]).sort().join(',');
for(const [u,e] of tr){
  if(e==='=') continue;
  if(mk(u)!==mk(e)) errors.push('belgi mos emas: '+u.slice(0,50)+' => '+e.slice(0,50));
  if(tags(u)!==tags(e)) warns.push('teg farqi: '+u.slice(0,50)+' => '+e.slice(0,50));
  if(ents(u)!==ents(e)) warns.push('entiti farqi: '+u.slice(0,50)+' => '+e.slice(0,50));
  if(/[ʻ‘’]/.test(e)&&false) warns.push('ʻ: '+e);
  if(!e.trim()) errors.push('bo\'sh: '+u.slice(0,50));
}
// ---- elementlar daraxti
const all=[];(function f(L){for(const i of L){all.push(i); if(i.inner) f(i.inner);}})(items);
const uniq=[...new Map(all.map(i=>[i.start+':'+i.end+':'+i.kind,i])).values()];
const contains=(a,b)=>a.start<=b.start&&b.end<=a.end&&!(a.start===b.start&&a.end===b.end);
for(const i of uniq){ const inside=uniq.filter(j=>j!==i&&contains(i,j)); i.children=inside.filter(j=>!inside.some(k=>k!==j&&contains(k,j))); }
const top=uniq.filter(i=>!uniq.some(j=>j!==i&&contains(j,i)));
const escQ=(t,q)=>t.replace(/\\/g,'\\\\').replace(q==='"'?/"/g:/'/g,'\\'+q).replace(/\r?\n/g,'\\n');
const escT=t=>t.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
const escA=t=>t.replace(/"/g,'&quot;');
function lookup(it){ return tr.get(it.text.trim()); }
function keepWs(orig,newT){ const a=orig.match(/^\s*/)[0], b=orig.match(/\s*$/)[0]; return a+newT+(orig.trim()?b:''); }
function render(it){
  const t=lookup(it); const use=(t!==undefined&&t!=='=');
  if(it.kind==='str'){ if(!use) return src.slice(it.start,it.end); if(it.risk) warns.push('xavfli matn tarjima qilindi ('+it.risk+'): '+it.text.slice(0,40)); return it.q+escQ(keepWs(it.text,t),it.q)+it.q; }
  if(it.kind==='html'){ return use?keepWs(it.text,t):src.slice(it.start,it.end); }
  if(it.kind==='attr'){ const raw=src.slice(it.start,it.end); if(!use) return raw; const m=raw.match(/^([^=]+=)(["'])([\s\S]*)\2$/); if(m){ return m[1]+m[2]+(m[2]==='"'?escA(t):t.replace(/'/g,'&#39;'))+m[2]; } const k=raw.indexOf(it.text); if(k<0){ errors.push('attr matni topilmadi: '+it.text.slice(0,40)); return raw; } return raw.slice(0,k)+escA(t)+raw.slice(k+it.text.length); }
  if(it.kind==='tpl'){
    const node=acorn.parseExpressionAt(src.slice(it.start,it.end),0,{ecmaVersion:'latest'});
    node.expressions.forEach(e=>{e.start+=it.start;e.end+=it.start;});
    if(node.type!=='TemplateLiteral'){ errors.push('shablon qayta tahlil: '+it.text.slice(0,40)); return src.slice(it.start,it.end); }
    const exprs=node.expressions.map(e=>renderRange(e.start,e.end,it.children));
    if(!use){ let out='',pos=it.start; node.expressions.forEach((e,k)=>{ out+=src.slice(pos,e.start)+exprs[k]; pos=e.end; }); return out+src.slice(pos,it.end); }
    const parts=t.split(/(⟦\d+⟧)/); let out='`'; const order=[];
    for(const p of parts){ const m=p.match(/^⟦(\d+)⟧$/); if(m){ out+='${'+exprs[+m[1]]+'}'; order.push(+m[1]); } else out+=escT(p); }
    if(order.some((v,i)=>v!==i)) warns.push('ifoda tartibi o\'zgardi: '+t.slice(0,50));
    return out+'`';
  }
}
function renderRange(s,e,cands){
  const inside=cands.filter(c=>c.start>=s&&c.end<=e); const tops=inside.filter(c=>!inside.some(k=>k!==c&&contains(k,c))).sort((a,b)=>a.start-b.start);
  let out='',pos=s; for(const c of tops){ out+=src.slice(pos,c.start)+render(c); pos=c.end; } return out+src.slice(pos,e);
}
let out=renderRange(0,src.length,top);
// html lang
out=out.replace(/<html([^>]*?)\blang="uz"/,'<html$1lang="en"');
// ---- qo'lda tuzatishlar (patch): [[topiladigan, almashtiriladigan], ...], aniq 1 marta uchrashi shart
const pf=D+name+'.patch.json';
if(fs.existsSync(pf)){ for(const [a,b,cnt] of JSON.parse(fs.readFileSync(pf,'utf8'))){ const n=out.split(a).length-1; if(n!==(cnt||1)){ errors.push('patch '+n+' marta topildi (kutilgan '+(cnt||1)+'): '+a.slice(0,60)); continue; } out=out.split(a).join(b); } }
if(errors.length){ console.log('XATOLAR:\n'+errors.slice(0,40).join('\n')); process.exit(1); }
// ---- JS qayta tahlili
const doc=parse5.parse(out,{sourceCodeLocationInfo:true});
(function rec(n){ if(n.nodeName==='script'&&n.childNodes?.length){ const ty=(n.attrs.find(a=>a.name==='type')||{}).value||''; if(!ty||/javascript|module/.test(ty)){ try{ acorn.parse(n.childNodes[0].value,{ecmaVersion:'latest',allowReturnOutsideFunction:true}); }catch(e){ errors.push('JS xatosi: '+e.message); } } return; } (n.childNodes||[]).forEach(rec); if(n.content) rec(n.content); })(doc);
fs.mkdirSync('sim/en',{recursive:true});
if(errors.length){ console.log('XATOLAR:\n'+errors.join('\n')); process.exit(1); }
fs.writeFileSync(`sim/en/${name}.html`,out);
console.log(name,'-> sim/en/'+name+'.html','| ogohlantirish:',warns.length);
warns.slice(0,40).forEach(w=>console.log('  !',w));
