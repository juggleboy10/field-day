"""Measures what each place costs: how long it takes to build the first time you go there, and what it takes to draw.

It opens the built index.html in a headless browser with only the clubhouse built (?test&lazy), then goes to every
place in turn: it times building the place (its first visit), waits a moment, and reads the renderer's counters for a few
frames from where you spawn (draw calls and triangles), and counts the place's meshes and materials. Prints a table and
writes tools/measure.json.

  --record   (two passes) also writes tests/budgets.json: each place's draw calls and triangles today, which tests/budgets.py then
             holds it to (the heaviest of the frames sampled; the check uses the lightest, so only a real increase
             fails it) (so nothing gets heavier without someone deciding it should). Run it again after making a
             place lighter, to lower its budget.

Times are from this machine's CPU (a Quest is several times slower): use them to compare places, not as real waits.

Usage: THREE_JS=/path/to/three.min.js python3 tools/measure.py [--record]
"""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
BUDGETS = ROOT / "tests" / "budgets.json"

# one frame's counters from the main render, and what's in the place
COUNT = """() => { const fd = window.__fd, L = fd.LEVELS[fd.state.level]; let meshes = 0, tris = 0; const mats = new Set();
  L.group.traverse((o) => { if (!o.isMesh) return; meshes++; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
    const g = o.geometry; tris += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0); });
  return { id: L.id, calls: fd.PERF.calls, drawn: fd.PERF.tris, meshes, mats: mats.size, tris: Math.round(tris) }; }"""


def open_page(browser, query):
    page = browser.new_page(viewport={"width": 1000, "height": 640})
    if THREE_JS:
        page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
    for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"):
        page.route(pat, lambda r: r.abort())
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto((ROOT / "index.html").as_uri() + query)
    page.wait_for_function("() => window.__fdReady === true", timeout=60000)
    return page, errors


def measure(browser):
    """Every place: [{id, build_ms, calls, drawn, meshes, mats, tris}], plus any page errors."""
    page, errors = open_page(browser, "?test&lazy")
    page.evaluate("() => window.__fd.startGame('flat')")
    n = page.evaluate("() => LEVEL_META.length")
    places = []
    for i in range(n):
        ms = page.evaluate(f"() => {{ const t = performance.now(); window.__fd.load({i}); return performance.now() - t; }}")
        page.evaluate(f"() => window.__fd.switchLevel({i})")
        page.wait_for_function(f"() => window.__fd.state.level === {i}", timeout=20000)
        page.wait_for_timeout(700)
        # a few frames apart: things that move come in and out of view, so keep the lightest and heaviest
        # (and from a few starts: some places put you somewhere random, like either end of the soccer pitch)
        samples = []
        for k in range(3):
            if k:
                page.evaluate(f"() => {{ const L = window.__fd.LEVELS[{i}]; if (L.spawn) L.spawn(); }}")
                page.wait_for_timeout(300)
            for _ in range(3):
                page.wait_for_timeout(200)
                samples.append(page.evaluate(COUNT))
        r = max(samples, key=lambda x: x["calls"])
        r["calls_min"] = min(x["calls"] for x in samples)
        r["drawn_min"] = min(x["drawn"] for x in samples)
        r["drawn"] = max(x["drawn"] for x in samples)
        r["idx"] = i
        r["build_ms"] = round(ms, 1) if i != 8 else 0.0   # (the clubhouse is built at startup)
        places.append(r)
    page.close()
    return places, errors


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        places, errors = measure(browser)
        if "--record" in sys.argv:
            # (some places put you somewhere random: a second pass, keeping each place's heavier result)
            again, more = measure(browser)
            errors += more
            for r, r2 in zip(places, again):
                r["calls"] = max(r["calls"], r2["calls"]); r["drawn"] = max(r["drawn"], r2["drawn"])
        browser.close()
    if errors:
        print("page errors:", errors[:5])
    print("Draw cost by place (one frame from the spawn point), heaviest first:")
    print("  calls  drawn tris  meshes  materials  build ms  place")
    for r in sorted(places, key=lambda r: -r["calls"]):
        print(f"  {r['calls']:5d}  {r['drawn']:10d}  {r['meshes']:6d}  {r['mats']:9d}  {r['build_ms']:8.1f}  {r['id']}")
    over = [r["id"] for r in places if r["calls"] > 150]
    print(f"\n{len(over)} of {len(places)} places draw more than 150 calls")
    (ROOT / "tools" / "measure.json").write_text(json.dumps({"places": places}, indent=1))
    if "--record" in sys.argv:
        BUDGETS.write_text(json.dumps({r["id"]: {"calls": r["calls"], "tris": r["drawn"]} for r in places}, indent=1, sort_keys=True) + "\n")
        print(f"wrote {BUDGETS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
