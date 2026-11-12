import json,re,sys
def is_text(it):
    t=it['text']; k=it['kind']
    s=re.sub(r'⟦\d+⟧','',t).strip()
    if not re.search(r'[A-Za-zʻ‘’А-Яа-я]',s): return False
    if k in('html','attr'): return True
    # kod / identifikatorlar
    if re.fullmatch(r'#?[0-9a-fA-F]{3,8}',s): return False
    if re.fullmatch(r'[a-z][A-Za-z0-9_\-]*(\.[A-Za-z0-9_\-]+)*',s) and ' ' not in s: return False       # id, class, kalit
    if re.fullmatch(r'[a-z\-]+(\s[a-z\-]+)?:.*',s) and re.search(r'[;:]\s*[\w#-]',s) and not re.search(r'[A-Z]',s[:1]) and not re.search(r"[a-z]{3,}\s+[a-z']{3,}\s+[a-z']{3,}",s) and not re.search(r"['ʻ‘’]| = ",s): return False  # css
    if re.match(r'^(M|L|C|Q|A|m|l|c|q|a|z|Z)[\s\d.\-,]+',s) and re.fullmatch(r'[MLCQAHVZmlcqahvz0-9\s.,\-]+',s): return False  # svg path
    if re.match(r'^(https?:|data:|rgba?\(|hsl|url\(|translate|rotate|scale|linear-gradient|var\()',s) or re.match(r'^\.{0,2}/[\w\-]+(/[\w\-.]+|\.\w+)',s): return False
    if re.fullmatch(r'[\W\d_]+',s): return False
    if s=='use strict' or re.fullmatch(r'(&\w+;)+',s): return False
    if re.match(r'^[.#][\w\-.#:\[\]=()>*,"\' ]+$',s) and not re.search(r'[A-Z]{2}|\s[a-z]{4,}\s',s): return False   # CSS selektor
    if re.search(r'\b\d+(\.\d+)?px\b',s) and re.search(r'(sans|serif|mono|IBM|Arial|Helvetica)',s): return False   # shrift
    if re.fullmatch(r'[a-z\-]+(\s[a-z\-]{1,5})+',s) and len(s)<22 and re.search(r'\b(card|btn|row|col|grid|flex|sm|pri|steps|jr|ok|bad|on|off|hide|show|active|wide|tab|chip)\b',s): return False  # class ro'yxati
    if re.search(r'\[[\w\-]+[=\]]',s) and not re.search(r'\s',s): return False  # atribut selektori
    if re.fullmatch(r'[a-z]+(-[a-z0-9]+)+',s): return False
    if re.fullmatch(r'[a-z]+[A-Z]\w*',s): return False
    if re.fullmatch(r'[a-z]{1,3}',s): return False
    if re.fullmatch(r'<[^>]+>',s) and not re.search(r'>[^<]*[A-Za-z]{3}',s): return False
    if re.search(r'(font|px|rem|em|%|stroke|fill)\b',s) and ':' in s and ';' in s and not re.search(r'[A-Za-z]{3,}',re.sub(r'<[^>]*>|⟦\d+⟧','',s)): return False
    return True
if __name__=='__main__':
    for n in sys.argv[1:]:
        L=json.load(open(f'tools/i18n/sim/{n}.uz.json'))
        T=[i for i in L if is_text(i)]
        w=sum(len(re.findall(r'\w+',re.sub(r'⟦\d+⟧','',i['text']))) for i in T)
        print(n,len(L),'->',len(T),'items, ~',w,'words')
