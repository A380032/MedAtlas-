// node sim_extract.js <sim/file.html>  ->  tools/i18n/sim/<name>.uz.json  (ajratilgan matnlar)
// Faqat inline <script> va HTML matn/atributlarini ajratadi. Hech narsani o'zgartirmaydi.
const fs=require('fs'),path=require('path');
const NM='/home/claude/tools-i18n/node_modules/';
const acorn=require(NM+'acorn'),walk=require(NM+'acorn-walk'),parse5=require(NM+'parse5');
const file=process.argv[2]; const src=fs.readFileSync(file,'utf8');
const name=path.basename(file,'.html');
const items=[];
const LETTER=/[A-Za-zА-Яа-яЁёʻ‘’]/;
const ATTRS=['title','placeholder','alt','aria-label','value','content'];
// ---- HTML (script/style tashqarisi) ----
const doc=parse5.parse(src,{sourceCodeLocationInfo:true});
const scripts=[];
(function rec(n){
  if(n.nodeName==='script'&&n.childNodes?.length){ const t=n.childNodes[0]; scripts.push({start:t.sourceCodeLocation.startOffset,end:t.sourceCodeLocation.endOffset,type:(n.attrs.find(a=>a.name==='type')||{}).value||''}); return; }
  if(n.nodeName==='style') return;
  if(n.nodeName==='#text'&&n.value.trim()&&LETTER.test(n.value)){ const l=n.sourceCodeLocation; items.push({kind:'html',start:l.startOffset,end:l.endOffset,text:src.slice(l.startOffset,l.endOffset)}); }
  if(n.attrs){ for(const a of n.attrs){ if((ATTRS.includes(a.name)||(/^data-/.test(a.name)&&/\S+\s+\S+\s+\S+/.test(a.value)))&&LETTER.test(a.value)&&!/^(utf-8|width=|#|[a-z\-]+\/[a-z\-]+)/i.test(a.value)&&!(n.nodeName==='meta'&&a.name==='content'&&!/description/.test((n.attrs.find(x=>x.name==='name')||{}).value||'')) && !(n.nodeName==='input'&&a.name==='value'&&!/\s/.test(a.value))){
      const loc=n.sourceCodeLocation.attrs[a.name]; const raw=src.slice(loc.startOffset,loc.endOffset); const m=raw.match(/^[^=]+=\s*(["'])([\s\S]*)\1$/); if(m) items.push({kind:'attr',attr:a.name,start:loc.startOffset+raw.indexOf(m[2],raw.indexOf('=')),end:loc.startOffset+raw.indexOf(m[2],raw.indexOf('='))+m[2].length,text:m[2]}); } } }
  (n.childNodes||[]).forEach(rec); if(n.content) rec(n.content);
})(doc);
// ---- JS ----
for(const s of scripts){
  if(s.type && !/javascript|module/.test(s.type)) continue;
  const code=src.slice(s.start,s.end);
  let ast; try{ ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true,locations:false}); }catch(e){ console.error('PARSE ERROR',e.message); process.exit(1); }
  const CMP=new Set(['===','==','!==','!=']);
  const NONDISP=/^(querySelector|querySelectorAll|getElementById|getElementsByClassName|addEventListener|removeEventListener|setAttribute|getAttribute|removeAttribute|hasAttribute|includes|indexOf|lastIndexOf|startsWith|endsWith|getItem|setItem|removeItem|add|remove|toggle|contains|createElement|createElementNS|matches|closest|dispatchEvent|emit|on|off|require|fetch|postMessage|test|match|split|join|padStart|padEnd|toFixed|toLocaleString|toLocaleDateString|Date|RegExp|parse|stringify|getContext|cloneNode)$/;
  walk.fullAncestor(ast,(node,_s,anc)=>{
    if(node.type==='Literal'&&typeof node.value==='string'){
      if(!LETTER.test(node.value)) return;
      const p=anc[anc.length-2]; let risk='';
      if(p){
        if(p.type==='BinaryExpression'&&CMP.has(p.operator)) risk='cmp';
        else if(p.type==='SwitchCase'&&p.test===node) risk='case';
        else if(p.type==='Property'&&p.key===node&&!p.computed) risk='key';
        else if(p.type==='MemberExpression'&&p.property===node&&p.computed) risk='member';
        else if(p.type==='BinaryExpression'&&p.operator==='in') risk='in';
        else if(p.type==='CallExpression'&&p.arguments.includes(node)){ const c=p.callee; const nm=c.type==='MemberExpression'?(c.property.name||''):(c.name||''); if(NONDISP.test(nm)) risk='call:'+nm; }
        else if(p.type==='NewExpression'&&p.arguments&&p.arguments.includes(node)) risk='new';
        else if(p.type==='AssignmentExpression'&&p.left!==node){ const l=p.left; if(l.type==='MemberExpression'&&/^(className|id|type|name|href|src|htmlFor|dataset|fillStyle|strokeStyle|font|textAlign|textBaseline|display|visibility|cursor|position|overflow)$/.test(l.property?.name||'')) risk='assign:'+l.property.name; }
        else if(p.type==='MemberExpression'&&p.object===node&&p.property&&['split','includes','indexOf','replace','match'].includes(p.property.name)) risk='method';
      }
      items.push({kind:'str',start:s.start+node.start,end:s.start+node.end,text:node.value,q:code[node.start],risk});
    } else if(node.type==='TemplateLiteral'){
      // butun shablon bitta birlik: ifodalar ⟦n⟧ bilan almashtiriladi
      let t='';const ex=[];
      node.quasis.forEach((q,i)=>{ t+=q.value.cooked??q.value.raw; if(i<node.expressions.length){ const e=node.expressions[i]; ex.push(code.slice(e.start,e.end)); t+='⟦'+(ex.length-1)+'⟧'; } });
      if(!LETTER.test(t.replace(/⟦\d+⟧/g,''))) return;
      items.push({kind:'tpl',start:s.start+node.start,end:s.start+node.end,text:t,ex});
    }
  });
}
// ichma-ich shablonlarni olib tashlash: tashqi shablon ichidagi ifodalarda joylashgan birliklarni alohida emas, tashqi birlik sifatida
items.sort((a,b)=>a.start-b.start||b.end-a.end);
const keep=[];
for(const it of items){ const outer=keep.find(k=>k.kind==='tpl'&&it.start>=k.start&&it.end<=k.end&&!(it.start===k.start&&it.end===k.end)); if(outer){ (outer.inner=outer.inner||[]).push(it); continue;} keep.push(it); }
keep.forEach((it,i)=>it.id=i);
const out=process.argv[3]||path.join(__dirname,'sim',name+'.uz.json'); fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(keep,null,0));
const byKind={}; keep.forEach(k=>byKind[k.kind]=(byKind[k.kind]||0)+1);
console.log(name,'items:',keep.length,byKind,'nested-in-template:',keep.reduce((a,k)=>a+(k.inner?.length||0),0));
