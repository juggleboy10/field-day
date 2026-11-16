"""Measures what each place costs: how long its file takes to build at startup, and what it takes to draw.

It builds a copy of the game with a timer between every source file, opens it in a headless browser, then visits every
place and reads the renderer's counters (draw calls and triangles for one frame, from where you spawn) and counts the
meshes and materials in the place. Prints two tables and writes tools/measure.json.

The times are from this machine's CPU (a Quest is several times slower); use them to compare places, not as real waits.

Usage: THREE_JS=/path/to/three.min.js python3 tools/measure.py
"""
import json
import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")


def instrumented():
    out = []
    for line in (ROOT / "src" / "order.txt").read_text().splitlines():
        f = line.strip()
        if not f or f.startswith("#"):
            continue
        src = (ROOT / "src" / f).read_text()
        js = f.endswith(".js")
        if js and not f.endswith("core/setup.js"):
            out.append(f"\n;(window.__T=window.__T||[]).push(['{f}',performance.now()]);\n")
        out.append(src.replace("window.__fd = { LEVELS,", "window.__fd = { renderer, LEVELS,") if f.endswith("app/main.js") else src)
        if js and not f.endswith("app/main.js"):
            out.append(f"\n;(window.__T=window.__T||[]).push(['END {f}',performance.now()]);\n")
    d = Path(tempfile.mkdtemp())
    (d / "index.html").write_text("".join(out))
    return d / "index.html"


COUNT = """() => { const fd = window.__fd, L = fd.LEVELS[fd.state.level], R = fd.renderer; let meshes = 0, tris = 0; const mats = new Set();
  L.group.traverse((o) => { if (!o.isMesh) return; meshes++; mats.add(o.material); const g = o.geometry; tris += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0); });
  return { id: L.id, calls: R.info.render.calls, drawn: R.info.render.triangles, meshes, mats: mats.size, tris: Math.round(tris), textures: R.info.memory.textures, geometries: R.info.memory.geometries }; }"""


def main():
    page_file = instrumented()
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1000, "height": 640})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        page.goto(page_file.as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=60000)
        marks = page.evaluate("() => window.__T")
        start = {n: t for n, t in marks if not n.startswith("END ")}
        build = {n[4:]: round(t - start[n[4:]], 1) for n, t in marks if n.startswith("END ") and n[4:] in start}
        page.locator("#btn-flat").click()
        places = []
        for i in range(page.evaluate("() => window.__fd.LEVELS.length")):
            page.evaluate(f"() => window.__fd.switchLevel({i})")
            page.wait_for_timeout(1300)
            places.append(page.evaluate(COUNT))
        browser.close()
    games = sum(v for k, v in build.items() if "/games/" in k)
    print(f"Building at startup: {round(sum(build.values()))} ms in all, {round(games)} ms of it the games\n")
    print("Slowest files to build (ms):")
    for k, v in sorted(build.items(), key=lambda x: -x[1])[:15]:
        print(f"  {v:7.1f}  {k}")
    print("\nDraw cost by place (one frame from the spawn point), heaviest first:")
    print("  calls  drawn tris  meshes  materials  place")
    for r in sorted(places, key=lambda r: -r["calls"]):
        print(f"  {r['calls']:5d}  {r['drawn']:10d}  {r['meshes']:6d}  {r['mats']:9d}  {r['id']}")
    (ROOT / "tools" / "measure.json").write_text(json.dumps({"build_ms": build, "places": places}, indent=1))


if __name__ == "__main__":
    main()
