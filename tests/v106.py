"""v106: still scenery merged in recess (the schoolyard), football (the field), the haunted house and minigolf.

(The same checks as tests/v104.py, for these places; things that move in them make the pictures differ a little.)

For each place that uses merged scenery, with and without merging (?nomerge):
  - it draws far fewer calls merged
  - it looks the same: a screenshot from the same spot, compared pixel by pixel
  - after a few seconds there (and starting a game where there's a start button), nothing that was merged has moved,
    hidden or changed colour (mergeCheck)
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v104.py
"""
import io, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
PLACES = ["recess", "football", "haunted", "minigolf"]
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

def open_page(b, q):
    page = b.new_page(viewport={"width": 640, "height": 400})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + q); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    return page, errs

# a still frame: the clock's hands and anything else that moves are stopped by freezing time and the main loop
def pixels(png):
    from PIL import Image
    return Image.open(io.BytesIO(png)).convert("RGB")

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    for pid in PLACES:
        res = {}
        for mode in ("", "&nomerge"):
            page, errs = open_page(b, "?test&lazy&still" + mode)
            i = page.evaluate(f"LEVEL_META.findIndex((m) => m.id === '{pid}')")
            page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
            page.wait_for_timeout(1500)
            calls = page.evaluate("__fd.PERF.calls")
            merged = page.evaluate("__fd.MERGED.reduce((n, r) => n + r.items.length, 0)")
            # play a little: press whatever start button there is, then let it run
            page.evaluate("""(() => { const L = __fd.LEVELS[__fd.state.level]; const b = (L.buttons || []).find((b) => /^(start|play|new game)/i.test(b.label || ''));
              if (b && b.onPress) try { b.onPress(); } catch (e) {} })()""")
            page.wait_for_timeout(3000)
            changed = page.evaluate("__fd.mergeCheck()")
            still = page.evaluate(f"__fd.state.level === {i}")
            # a still picture from the same spot
            page.evaluate("""(() => { const fd = __fd; fd.renderer.setAnimationLoop(null); fd.state.mode = 'menu';
              fd.dolly.position.set(0, 0, 3); fd.dolly.rotation.set(0, 0, 0); fd.camera.position.set(0, 1.6, 0); fd.camera.rotation.set(-0.08, 0.35, 0, 'YXZ');
              fd.CAMERA.C.on = false; })()""")
            page.evaluate("""(() => { let s = null; __fd.camera.traverseAncestors((a) => { s = a; }); __fd.renderer.render(s, __fd.camera); })()""")
            page.evaluate("document.querySelectorAll('#hud, #toast, #perf').forEach((e) => e.style.visibility = 'hidden')")
            shot = page.locator('#scene').screenshot()
            res[mode or "merged"] = {"still": still, "calls": calls, "merged": merged, "changed": changed, "shot": shot, "errs": list(errs)}
            page.close()
        m, n = res["merged"], res["&nomerge"]
        check(f"{pid}: still there after playing", m["still"] and n["still"])
        check(f"{pid}: scenery merged ({m['merged']} meshes)", m["merged"] > 40, str(m["merged"]))
        check(f"{pid}: fewer draw calls ({n['calls']} -> {m['calls']})", m["calls"] < n["calls"] * 0.7, f"{n['calls']} -> {m['calls']}")
        check(f"{pid}: nothing merged has moved or changed", not m["changed"], str(m["changed"][:5]))
        a, c = pixels(m["shot"]), pixels(n["shot"])
        diff = sum(1 for x, y in zip(a.get_flattened_data(), c.get_flattened_data()) if sum(abs(u - v) for u, v in zip(x, y)) > 30)
        frac = diff / (a.size[0] * a.size[1])
        check(f"{pid}: looks the same ({frac:.2%} of pixels differ)", frac < 0.04, f"{frac:.2%}")
        if frac >= 0.04:
            a.save(f"/tmp/claude-0/-home-claude/1359667a-3709-50b5-870e-dedfdeda4de2/scratchpad/{pid}_merged.png"); c.save(f"/tmp/claude-0/-home-claude/1359667a-3709-50b5-870e-dedfdeda4de2/scratchpad/{pid}_plain.png")
        check(f"{pid}: no errors", not (m["errs"] or n["errs"]), str((m["errs"] + n["errs"])[:2]))
    b.close()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
