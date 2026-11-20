"""v118: a place you've left gives its graphics memory back after a while (LOADER.rest in app/loader.js).

Places loaded on demand (?lazy), with ?restms=3000 so a place rests 3 s after you leave it:
  - leave minigolf for the clubhouse, then hoops: after a few seconds minigolf's shapes and pictures are off the chip
    (three.js's own count drops by about what it added)
  - the place you're in, and the core, keep theirs (nothing where you are has to be put back)
  - the clubhouse never rests
  - go back to minigolf: it looks just as it did (a picture from the same spot), with no errors

    THREE_JS=/path/to/three.min.js python3 tests/v118.py
"""
import io, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

MEM = "(() => { const m = __fd.renderer.info.memory; return [m.geometries, m.textures]; })()"
def go(page, pid, wait=1500):
    i = page.evaluate(f"LEVEL_META.findIndex((m) => m.id === '{pid}')")
    page.evaluate(f"__fd.load({i}); __fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(wait)
    return i
def shot(page):
    from PIL import Image
    page.evaluate("document.querySelectorAll('#hud, #toast, #perf, #big-msg').forEach((e) => e.style.visibility = 'hidden')")
    img = Image.open(io.BytesIO(page.screenshot())).convert("RGB")
    page.evaluate("document.querySelectorAll('#hud, #toast, #perf, #big-msg').forEach((e) => e.style.visibility = '')")
    return img
def differ(a, b):
    pa, pb = a.load(), b.load(); n = 0
    for y in range(0, a.size[1], 2):
        for x in range(0, a.size[0], 2):
            if sum(abs(u - v) for u, v in zip(pa[x, y], pb[x, y])) > 40: n += 1
    return n / ((a.size[0] // 2) * (a.size[1] // 2))

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page = b.new_page(viewport={"width": 480, "height": 300})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test&lazy&still&restms=3000"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')"); page.wait_for_timeout(1500)
    m0 = page.evaluate(MEM)
    mg = go(page, "minigolf", 2500)
    # stand somewhere fixed, to compare pictures later
    page.evaluate(f"""(() => {{ const fd = __fd, L = fd.LEVELS[{mg}]; fd.dolly.position.set(0, 0, 4); fd.dolly.rotation.set(0, 0, 0); fd.state.yaw = 0; fd.state.pitch = -0.15; }})()""")
    page.wait_for_timeout(1200)
    before = shot(page)
    m1 = page.evaluate(MEM)
    print("memory at start, in minigolf:", m0, m1)
    hub = go(page, "hub", 500)
    go(page, "hoops", 500)
    page.wait_for_function(f"__fd.LOADER.REST.rested.has({mg})", timeout=15000)
    page.wait_for_timeout(600)
    m2 = page.evaluate(MEM)
    last = page.evaluate("__fd.LOADER.REST.last")
    print("after resting minigolf:", m2, last)
    check("minigolf's shapes and pictures come off the chip", last and last["geometries"] > 50 and last["textures"] > 10, last)
    check("three.js's count drops", m2[0] < m1[0] and m2[1] < m1[1], f"{m1} -> {m2}")
    # nothing where you are has to be put back: the count stays put as hoops is drawn
    page.wait_for_timeout(800)
    m3 = page.evaluate(MEM)
    check("the place you're in keeps its own", m3 == m2, f"{m2} -> {m3}")
    check("the clubhouse never rests", not page.evaluate(f"__fd.LOADER.REST.rested.has({hub})") and page.evaluate(f"__fd.LOADER.rest(__fd.LEVELS[{hub}])") is None)
    # back to minigolf
    go(page, "minigolf", 300)
    page.evaluate("""(() => { const fd = __fd; fd.dolly.position.set(0, 0, 4); fd.dolly.rotation.set(0, 0, 0); fd.state.yaw = 0; fd.state.pitch = -0.15; })()""")
    page.wait_for_timeout(1500)
    after = shot(page)
    d = differ(before, after)
    check("back in minigolf, it looks just as it did (but for the windmill and the cow, which move)", d < 0.06, f"{d * 100:.2f}% differ")
    check("its memory is back on the chip", page.evaluate(MEM)[1] > m2[1])
    check("not rested any more", not page.evaluate(f"__fd.LOADER.REST.rested.has({mg})"))
    page.wait_for_timeout(500)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
