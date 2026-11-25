#!/usr/bin/env bash
# Cloudflare Pages uchun yig'ish: saytni dist/ ga ko'chiradi.
#  - tools/, supabase/, functions/ va .git saytga chiqmaydi.
#  - 25 MiB dan katta fayllar Pages'ga sig'maydi: ular 20 MiB li bo'laklarga ajratiladi va
#    functions/data/[[path]].js ularni AYNAN o'sha manzildan butun fayl qilib beradi.
#    Bunday fayllar ro'yxati: tools/large-files.txt
#  - Ro'yxatda yo'q katta fayl topilsa, yig'ish to'xtaydi (unutib qolmaslik uchun).
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=dist
LIMIT=$((25 * 1024 * 1024))
LIST=tools/large-files.txt
PART=$((20 * 1024 * 1024))

rm -rf "$OUT"
mkdir -p "$OUT"

# Katta fayllar ro'yxati (bo'sh qatorlar va # izohlar tashlanadi)
mapfile -t BIG < <(grep -v '^\s*#' "$LIST" | sed '/^\s*$/d')

is_big() { local f="$1"; for x in "${BIG[@]}"; do [[ "$x" == "$f" ]] && return 0; done; return 1; }

fail=0
while IFS= read -r -d '' f; do
  rel="${f#./}"
  case "$rel" in
    .git/*|tools/*|supabase/*|functions/*|dist/*|node_modules/*|.wrangler/*|.gitignore) continue ;;
  esac
  if is_big "$rel"; then continue; fi
  size=$(stat -c %s "$f")
  if (( size > LIMIT )); then
    echo "XATO: $rel ($((size / 1048576)) MiB) 25 MiB dan katta. Uni $LIST ga qo'shing." >&2
    fail=1
    continue
  fi
  mkdir -p "$OUT/$(dirname "$rel")"
  cp -p "$f" "$OUT/$rel"
done < <(find . -type f -print0)

(( fail == 0 )) || exit 1

# Katta fayllarni bo'laklash: <fayl>.part00, .part01 ... va <fayl>.parts.json (o'lcham, sha256, bo'laklar)
for rel in "${BIG[@]}"; do
  [[ -f "$rel" ]] || { echo "XATO: $rel topilmadi" >&2; exit 1; }
  mkdir -p "$OUT/$(dirname "$rel")"
  split -b "$PART" -d -a 2 "$rel" "$OUT/$rel.part"
  size=$(stat -c %s "$rel")
  sum=$(sha256sum "$rel" | cut -c1-32)
  {
    printf '{"size":%s,"etag":"%s","type":"application/pdf","parts":[' "$size" "$sum"
    sep=""
    for p in "$OUT/$rel".part[0-9][0-9]; do printf '%s{"name":"%s","size":%s}' "$sep" "$(basename "$p")" "$(stat -c %s "$p")"; sep=","; done
    printf ']}\n'
  } > "$OUT/$rel.parts.json"
done

# Pages Function faqat bo'laklangan katta fayllar uchun ishga tushadi, qolgan hammasi oddiy statik fayl.
{
  printf '{\n  "version": 1,\n  "include": ['
  if (( ${#BIG[@]} == 0 )); then printf '"/__none__"'; fi
  sep=""
  for x in "${BIG[@]}"; do printf '%s"/%s"' "$sep" "$x"; sep=", "; done
  printf '],\n  "exclude": []\n}\n'
} > "$OUT/_routes.json"

count=$(find "$OUT" -type f | wc -l)
echo "Tayyor: $count ta fayl ($(du -sh "$OUT" | cut -f1)), bo'laklangan: ${#BIG[@]} ta."
if (( count > 20000 )); then echo "XATO: Pages bepul rejasi 20 000 tagacha fayl." >&2; exit 1; fi
