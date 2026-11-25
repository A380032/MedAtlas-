#!/usr/bin/env bash
# Cloudflare Pages uchun yig'ish: saytni dist/ ga ko'chiradi.
#  - tools/, supabase/, functions/ va .git saytga chiqmaydi.
#  - 25 MiB dan katta fayllar Pages'ga sig'maydi: ular R2'da turadi va
#    functions/data/[[path]].js orqali AYNAN o'sha manzildan beriladi.
#    Bunday fayllar ro'yxati: tools/r2-files.txt
#  - Ro'yxatda yo'q katta fayl topilsa, yig'ish to'xtaydi (unutib qolmaslik uchun).
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=dist
LIMIT=$((25 * 1024 * 1024))
LIST=tools/r2-files.txt

rm -rf "$OUT"
mkdir -p "$OUT"

# R2 ro'yxati (bo'sh qatorlar va # izohlar tashlanadi)
mapfile -t R2 < <(grep -v '^\s*#' "$LIST" | sed '/^\s*$/d')

is_r2() { local f="$1"; for x in "${R2[@]}"; do [[ "$x" == "$f" ]] && return 0; done; return 1; }

fail=0
while IFS= read -r -d '' f; do
  rel="${f#./}"
  case "$rel" in
    .git/*|tools/*|supabase/*|functions/*|dist/*|node_modules/*|.wrangler/*|.gitignore) continue ;;
  esac
  if is_r2 "$rel"; then continue; fi
  size=$(stat -c %s "$f")
  if (( size > LIMIT )); then
    echo "XATO: $rel ($((size / 1048576)) MiB) 25 MiB dan katta. Uni R2'ga yuklab, $LIST ga qo'shing." >&2
    fail=1
    continue
  fi
  mkdir -p "$OUT/$(dirname "$rel")"
  cp -p "$f" "$OUT/$rel"
done < <(find . -type f -print0)

(( fail == 0 )) || exit 1

# Pages Function faqat R2'dagi fayllar uchun ishga tushadi, qolgan hammasi oddiy statik fayl.
{
  printf '{\n  "version": 1,\n  "include": ['
  if (( ${#R2[@]} == 0 )); then printf '"/__none__"'; fi
  sep=""
  for x in "${R2[@]}"; do printf '%s"/%s"' "$sep" "$x"; sep=", "; done
  printf '],\n  "exclude": []\n}\n'
} > "$OUT/_routes.json"

count=$(find "$OUT" -type f | wc -l)
echo "Tayyor: $count ta fayl ($(du -sh "$OUT" | cut -f1)), R2'da: ${#R2[@]} ta."
if (( count > 20000 )); then echo "XATO: Pages bepul rejasi 20 000 tagacha fayl." >&2; exit 1; fi
