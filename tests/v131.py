"""v131: shoot hoops at the parks (College Park's and the Senior Center's basketball courts).

  - each of those parks has three basketballs on its basketball court; only the park you're in has its balls out
  - every device makes the balls in the same order (so they match when shared)
  - a browser shot looking at a hoop with about the right power drops in (and counts); far too much misses
  - the backboard is solid: a ball thrown straight at it comes back
  - change court and the balls stay on their basketball court (they move with the park)
  - you can pick a ball up (E)
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v131.py
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

# shoot ball k of the current park from (x, z) at the nearest hoop with Space held for c (0-1); wait; did it go in?
SHOOT = """(async ([k, x, z, c, ms]) => { const fd = __fd, Lv = fd.LEVELS[fd.state.level], I = Lv.pb.internals, P = I.PARKS[I.park()], b = P.balls[k];
  const H = P.hoopsW.reduce((a, h) => (Math.hypot(h.rim.x - x, h.rim.z - z) < Math.hypot(a.rim.x - x, a.rim.z - z) ? h : a));
  fd.dolly.position.set(x, 0, z); fd.camera.position.set(0, 1.6, 0); fd.camera.lookAt(H.rim.x, H.rim.y, H.rim.z); fd.camera.updateMatrixWorld(true);
  b.pos.set(x, 1.9, z); b.prev.copy(b.pos); b.held = null; b.sleeping = false; b.owner = fd.state.myPeer; b.scored = false; b.idleT = 0; b.restT = 0;   // (as a real throw does)
  const d0 = Math.hypot(H.rim.x - x, H.rim.z - z); if (c < 0) c = 0.12 + d0 / 12 + (c + 1);   // (c below 0: "the right power for the distance", plus c + 1)
  const v = Lv.throwOverride(b, c); b.vel.copy(v); b.v += 1;
  const m0 = I.hoopsMade(); await new Promise((r) => setTimeout(r, ms));
  return { made: I.hoopsMade() - m0, d: Math.hypot(H.rim.x - x, H.rim.z - z) }; })"""

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
    vis = lambda: page.evaluate(f"{L}.bodies.map((b) => [b.parkIdx, b.mesh.visible])")
    v0 = vis()
    check("six basketballs, made in the same order on every device (College Park's three, then the Senior Center's)", [a for a, _ in v0] == [1, 1, 1, 2, 2, 2], v0)
    check("at Sunny Courts, none are out", not any(v for _, v in v0), v0)
    page.evaluate(f"{I}.setPark(1)"); page.wait_for_timeout(500)
    v1 = vis()
    check("at College Park, its three are out", [v for _, v in v1] == [True, True, True, False, False, False], v1)

    # shots from 4 m and 6 m with about the right power go in; far too much misses
    # (from about 3.6 m and 5.8 m: the right power, a little over, a little under)
    good = [page.evaluate(SHOOT, [k, *xz, c, 2600]) for k, xz, c in ((0, (25, 1.0), -1), (1, (23.5, 3.0), -0.96), (2, (25, 1.0), -1.04))]
    print("  good shots:", good)
    check("the right power (or a little either side) drops it in, and it counts", sum(g["made"] for g in good) >= 2, good)
    page.wait_for_timeout(600)
    bad = page.evaluate(SHOOT, [0, 25, 1.0, 1.0, 2600])
    print("  far too much power:", bad)
    check("far too much power misses", bad["made"] == 0, bad)

    # the backboard is solid
    bb = page.evaluate(f"""(async () => {{ const fd = __fd, I = {I}, P = I.PARKS[1], b = P.balls[0], H = P.hoopsW[0], c = (H.box.min.z + H.box.max.z) / 2, dir = Math.sign(H.rim.z - c);
      b.pos.set(H.rim.x, 3.4, c + dir * 1.5); b.prev.copy(b.pos); b.held = null; b.sleeping = false; b.owner = fd.state.myPeer; b.scored = true; b.vel.set(0, 0, -dir * 6); b.v += 1;
      await new Promise((r) => setTimeout(r, 700)); return {{ vz: b.vel.z, dir, z: b.pos.z, board: c }}; }})()""")
    check("the backboard is solid: a ball thrown at it comes back", bb["vz"] * bb["dir"] > 0 or (bb["z"] - bb["board"]) * bb["dir"] > 0, bb)

    # change court: the balls move with the park
    page.evaluate(f"(() => {{ for (const b of {I}.PARKS[1].balls) {{ b.held = null; b.vel.set(0, 0, 0); b.pos.copy(b.slot); b.prev.copy(b.pos); b.sleeping = true; }} }})()"); page.wait_for_timeout(300)
    s0 = page.evaluate(f"{I}.PARKS[1].balls.map((b) => [+b.pos.x.toFixed(2), +b.pos.z.toFixed(2)])")
    page.evaluate(f"{I}.setCourt(0)"); page.wait_for_timeout(400)
    s1 = page.evaluate(f"{I}.PARKS[1].balls.map((b) => [+b.pos.x.toFixed(2), +b.pos.z.toFixed(2)])")
    check("change court and the balls stay on their basketball court (they move with the park)", all(abs(b1[1] - b0[1] - 14.5) < 0.01 and abs(b1[0] - b0[0]) < 0.01 for b0, b1 in zip(s0, s1)), (s0, s1))
    # pick one up with E
    page.evaluate(f"""(() => {{ const fd = __fd, b = {I}.PARKS[1].balls[0]; fd.dolly.position.set(b.pos.x - 1.2, 0, b.pos.z); fd.camera.position.set(0, 1.6, 0); fd.camera.lookAt(b.pos.x, b.pos.y, b.pos.z); fd.camera.updateMatrixWorld(true); fd.state.yaw = -Math.PI / 2; fd.state.pitch = -0.9; }})()""")
    page.wait_for_timeout(400); page.keyboard.press("KeyE"); page.wait_for_timeout(400)
    held = page.evaluate("__fd.state.held && __fd.state.held.kind === 'body' && __fd.state.held.obj.parkIdx === 1")
    check("you can pick a ball up (E)", held)
    page.evaluate(f"{I}.setPark(2)"); page.wait_for_timeout(500)
    v2 = vis()
    check("at the Senior Center, its three are out (and College Park's are put away)", [v for _, v in v2] == [False, False, False, True, True, True], v2)
    good2 = page.evaluate(SHOOT, [0, *(page.evaluate(f"(() => {{ const H = {I}.PARKS[2].hoopsW[0]; return [H.rim.x + Math.sign(24 - H.rim.x) * 4, H.rim.z]; }})()")), -1, 2600])
    print("  a Senior Center shot:", good2)
    check("the Senior Center's hoops work too", good2["made"] == 1, good2)

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
