"""v128: walk round the pickleball parks; College Park laid out as you know it; the switches out of the way.

  - off the court (no game on) you can walk round the whole park; in a game you stay on your half of the court, as before
  - each park has its own walking area (College Park out to Rice Dr; the Senior Center out to the lot and the ball field)
  - College Park: walking in from the street, the courts are off to your right and the playground (half as big again)
    on your left; the basketball court is turned to run north-south; there's a gap in the court fence where the path ends
  - the park and season buttons stand back by the fence, out of the way of play
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v128.py
"""
import math, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page = b.new_page(viewport={"width": 640, "height": 400})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    i = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'pickleball')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(1000)
    L, I = f"__fd.LEVELS[{i}]", f"__fd.LEVELS[{i}].pb.internals"
    def walk_to(x, z):
        page.evaluate(f"(() => {{ __fd.dolly.position.set({x}, 0, {z}); }})()"); page.wait_for_timeout(500)
        return page.evaluate("[+__fd.dolly.position.x.toFixed(1), +__fd.dolly.position.z.toFixed(1)]")

    at = walk_to(20, 20)
    check("Sunny Courts: you can walk off the court", at == [20, 20], at)
    for park, name, spot in ((1, "College Park", (22, -78)), (2, "Senior Center", (-80, -40))):
        page.evaluate(f"{I}.setPark({park})"); page.wait_for_timeout(400)
        at = walk_to(*spot)
        check(f"{name}: you can walk out into the park", at == list(spot), at)
        far = walk_to(400, 400)
        B = page.evaluate(f"{L}.bounds")
        check(f"{name}: but not off the edge of the world", far[0] <= B["maxX"] and far[1] <= B["maxZ"] and far[0] > 50, (far, B))
    # in a game, you stay on your half
    page.evaluate(f"{I}.setPark(1)"); page.wait_for_timeout(300)
    page.evaluate(f"(() => {{ const t = {I}.paddles[0]; __fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }})()")
    page.wait_for_timeout(600); page.keyboard.press("KeyE"); page.wait_for_timeout(800)
    playing = page.evaluate(f"{L}.pb.mySide === 0 && ['serve', 'rally', 'dead'].includes({L}.pb.ph)")
    at = walk_to(30, 20)
    check("in a game you stay on your half of the court", playing and at[0] < 0 and abs(at[1]) <= 7, (playing, at))
    page.keyboard.press("KeyE"); page.wait_for_timeout(800)   # (put it back)
    page.evaluate(f"(() => {{ const PB = {L}.pb; if (PB.mySide >= 0) {I}.leaveCourt(); PB.ph = 'idle'; }})()"); page.wait_for_timeout(300)
    at = walk_to(30, 20)
    check("put the paddle back and you're free again", at == [30, 20], at)

    # College Park's layout
    lay = page.evaluate(f"""(() => {{ const g = {I}.PARKS[1].group; let pg = null, bb = null;
      g.traverse((o) => {{ if (o.isGroup && Math.abs(o.scale.x - 1.5) < 1e-6) pg = o; if (o.isGroup && Math.abs(o.rotation.y - Math.PI / 2) < 1e-6 && o.position.x > 15) bb = o; }});
      return {{ pg: pg && [pg.position.x, pg.position.z, pg.scale.x], bb: bb && [bb.position.x, bb.position.z, bb.rotation.y] }}; }})()""")
    print("  playground (x, z, scale) and basketball court (x, z, turn):", lay)
    # walking in from Rice Dr you face south (+z): your left is +x, your right is -x
    pathX = 8.5   # (the path's x where it passes the playground, about z -24)
    check("the playground is on your left as you walk in, half as big again", lay["pg"] and lay["pg"][0] > pathX + 10 and lay["pg"][2] == 1.5, lay)
    check("the basketball court is turned to run north-south", lay["bb"] and abs(lay["bb"][2] - math.pi / 2) < 1e-6, lay)

    # the buttons stand back by the fence
    bt = page.evaluate(f"""{L}.buttons.filter((b) => ['Change park', 'Spring', 'Summer', 'Fall', 'Winter'].includes(b.label)).map((b) => [b.label, +b.pos.z.toFixed(2)])""")
    check("the park and season buttons stand back by the fence", len(bt) == 5 and all(z >= 5 for _, z in bt), bt)

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
