#!/usr/bin/env python3
"""Builds index.html from the files listed in src/order.txt, in that order.

The .html and .css files are joined as they are. Each .js file becomes its own <script>. They are ordinary scripts (not
modules), so the consts and functions at the top of one file can be used by every file after it: that shared top level
is how the whole game fits together. Each script starts in strict mode, and none of them runs once something has
already failed (window.__fdStop), so a broken file doesn't leave half a game running.

Only the core (and the clubhouse) runs when the page opens. Every other place's files go into the page as text
(<script type="text/plain" data-fd="...">), with the list of which place needs which files (src/manifest.json, from
tools/manifest.py) in #fd-manifest; js/app/loader.js runs a place's files the first time you go there.

Usage: python3 tools/build.py            (or ./build.sh)
       python3 tools/build.py --single   every file runs at startup, the old way (no manifest in the page)
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Before anything else: the first error while the game is starting up stops the scripts after it, and says so on the
# start screen.
GUARD = """<script>
window.addEventListener('error', function (e) {
  if (window.__fdReady || window.__fdStop || window.__fdLazy) return;
  window.__fdStop = (e && e.message) || 'error';
  var el = document.getElementById('load-error');
  if (el) { if (!el.textContent.trim()) el.textContent = 'Field Day couldn\\u2019t start. Try reloading the page.'; el.hidden = false; }
  ['btn-vr', 'btn-flat'].forEach(function (id) { var b = document.getElementById(id); if (b) b.disabled = true; });
});
</script>
"""
HEAD = "'use strict'; if (window.__fdStop) throw new Error('Field Day: not started (' + window.__fdStop + ')');\n"


def main():
    single = "--single" in sys.argv
    man = json.loads((ROOT / "src" / "manifest.json").read_text())
    core = set(man["core"])
    out, n, lazy = [], 0, 0
    for line in (ROOT / "src" / "order.txt").read_text().splitlines():
        f = line.strip()
        if not f or f.startswith("#"):
            continue
        path = ROOT / "src" / f
        if not path.is_file():
            sys.exit(f"missing: src/{f}")
        src = path.read_text()
        if f.endswith(".js"):
            if "</script" in src.lower():
                sys.exit(f"src/{f} contains '</script', which would end its script early")
            if n == 0:
                out.append(GUARD)
                if not single:
                    out.append('<script type="application/json" id="fd-manifest">' + json.dumps({"places": man["places"]}, separators=(",", ":")) + "</script>\n")
            if single or f in core:
                out.append(f"<script>{HEAD}{src.rstrip()}\n</script>\n")
            else:
                out.append(f'<script type="text/plain" data-fd="{f}">{HEAD}{src.rstrip()}\n</script>\n')
                lazy += 1
            n += 1
        else:
            out.append(src)
    html = "".join(out)
    tmp = ROOT / "index.html.tmp"
    tmp.write_text(html)
    tmp.replace(ROOT / "index.html")
    print(f"built index.html: {n} scripts ({lazy} of them run only when their place is first visited), {html.count(chr(10))} lines, {len(html.encode())} bytes")


if __name__ == "__main__":
    main()
