#!/usr/bin/env bash
# Builds index.html by joining the files listed in src/order.txt, in that order.
# Usage: ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

out=index.html
tmp="$out.tmp"
: > "$tmp"
while IFS= read -r f || [ -n "$f" ]; do
  f="${f%$'\r'}"
  case "$f" in ''|'#'*) continue ;; esac
  if [ ! -f "src/$f" ]; then echo "missing: src/$f" >&2; rm -f "$tmp"; exit 1; fi
  cat "src/$f" >> "$tmp"
done < src/order.txt
mv "$tmp" "$out"
echo "built $out: $(wc -l < "$out") lines, $(wc -c < "$out") bytes"
