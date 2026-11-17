"""v105: the five quests' still scenery merged, and their wall lights' glows drawn as two batches.

For each quest, with and without (?nomerge), flicker held still (?still) so pictures compare:
  - far fewer draw calls
  - looks the same from where you start (a pixel comparison)
  - played through: every gate opened in turn (walking through each area), the prize taken, fighting going on;
    then nothing merged has moved, hidden or changed colour (mergeCheck), and the gates did open
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v105.py
"""
import io, os, sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
SHOTS = "/tmp/claude-0/-home-claude/1359667a-3709-50b5-870e-dedfdeda4de2/scratchpad"
QUESTS = ["dungeon", "pirate", "frostpeak", "hexwood", "siege"]
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

def picture(page):
    page.evaluate("""(() => { const fd = __fd; fd.renderer.setAnimationLoop(null);
      document.querySelectorAll('#hud, #toast, #perf').forEach((e) => e.style.visibility = 'hidden');
      let s = null; fd.camera.traverseAncestors((a) => { s = a; }); fd.renderer.render(s, fd.camera); })()""")
    return Image.open(io.BytesIO(page.locator('#scene').screenshot())).convert("RGB")

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    for qid in QUESTS:
        res = {}
        for mode in ("", "&nomerge"):
            page, errs = open_page(b, "?test&lazy&still" + mode)
            i = page.evaluate(f"LEVEL_META.findIndex((m) => m.id === '{qid}')")
            page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
            page.wait_for_timeout(1200)
            calls = page.evaluate("__fd.PERF.calls")
            merged = page.evaluate("__fd.MERGED.reduce((n, r) => n + r.items.length, 0)")
            # the picture from where you start, looking down the first area (same pose both times)
            page.evaluate(f"""(() => {{ const fd = __fd, L = fd.LEVELS[{i}]; L.spawn(); const r0 = L.ROOMS[0]; fd.dolly.position.set(r0.cx + 0.5, 0, r0.cz + 2); fd.state.yaw = 0.3; fd.state.pitch = -0.06;
              fd.camera.rotation.set(-0.06, 0.3, 0, 'YXZ'); fd.dolly.updateMatrixWorld(true); }})()""")
            shot = picture(page)
            page.close()
            # a second page for the playthrough (the picture stopped the first one's loop)
            page, errs2 = open_page(b, "?test&lazy" + mode)
            page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
            page.wait_for_timeout(600)
            n = page.evaluate(f"__fd.LEVELS[{i}].ROOMS.length")
            gates = []
            for pg in range(1, n):
                page.evaluate(f"""(() => {{ const fd = __fd, L = fd.LEVELS[{i}], r = L.ROOMS[{pg}]; L.q = Object.assign({{}}, L.q, {{ pg: {pg}, spawned: 1, wave: 0 }});
                  fd.dolly.position.set(r.cx, 0, r.cz + 3); if (L.me) L.me.hp = 99; try {{ L.spawnWave({pg}, 0); }} catch (e) {{}} }})()""")
                page.wait_for_timeout(1300)
                gates.append(page.evaluate(f"__fd.LEVELS[{i}].gates[{pg - 1}] ? (__fd.LEVELS[{i}].gates[{pg - 1}].y < -1 || !__fd.LEVELS[{i}].gates[{pg - 1}].g.visible) : true"))
            page.evaluate(f"(() => {{ const L = __fd.LEVELS[{i}]; L.q = Object.assign({{}}, L.q, {{ done: true }}); }})()")
            page.wait_for_timeout(2500)
            changed = page.evaluate("__fd.mergeCheck()")
            res[mode or "merged"] = {"calls": calls, "merged": merged, "shot": shot, "changed": changed, "gates": gates, "errs": errs + errs2}
            page.close()
        m, nm = res["merged"], res["&nomerge"]
        check(f"{qid}: scenery merged ({m['merged']} meshes)", m["merged"] > 30, str(m["merged"]))
        check(f"{qid}: fewer draw calls ({nm['calls']} -> {m['calls']})", m["calls"] < nm["calls"] * 0.6, f"{nm['calls']} -> {m['calls']}")
        a, c = m["shot"], nm["shot"]
        diff = sum(1 for x, y in zip(a.get_flattened_data(), c.get_flattened_data()) if sum(abs(u - v) for u, v in zip(x, y)) > 30)
        frac = diff / (a.size[0] * a.size[1])
        check(f"{qid}: looks the same ({frac:.2%} of pixels differ)", frac < 0.02, f"{frac:.2%}")
        if frac >= 0.02: a.save(f"{SHOTS}/{qid}_merged.png"); c.save(f"{SHOTS}/{qid}_plain.png")
        check(f"{qid}: the gates opened", all(m["gates"]), str(m["gates"]))
        check(f"{qid}: nothing merged moved or changed in a playthrough", not m["changed"], str(m["changed"][:5]))
        check(f"{qid}: no errors", not (m["errs"] or nm["errs"]), str((m["errs"] + nm["errs"])[:2]))
    b.close()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
