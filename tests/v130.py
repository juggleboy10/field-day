"""v130: College Park's way in and its white stripe; quicker walking off the court.

  - the path comes round the west side of the courts and turns left through a little opening into the north court
    (the one nearest the walkway); the rest of the fence is closed
  - the stripe is white, 0.254 m wide, raised a centimetre, straight across the centre of the middle court, fence to fence
  - a ball that lands on it bounces a touch higher (5-15%) and 1 to 3 degrees off line; off it, nothing
  - you walk about twice as fast when you're not in a game (to look round), at the usual pace in one
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v130.py
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
    page.goto(PAGE + "?test&park=college"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    i = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'pickleball')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(1000)
    L, I = f"__fd.LEVELS[{i}]", f"__fd.LEVELS[{i}].pb.internals"

    # the fence: the west side has one opening, at the north court; the others are closed
    fence = page.evaluate(f"""(() => {{ const g = {I}.PARKS[1].group, out = [];
      g.traverse((o) => {{ const p = o.geometry && o.geometry.parameters; if (o.isMesh && o.material.map && o.material.transparent && p && p.height === 3) out.push([+o.position.x.toFixed(2), +o.position.z.toFixed(2), +p.width.toFixed(2), +o.rotation.y.toFixed(2)]); }});
      return out; }})()""")
    west = sorted([f for f in fence if abs(f[0] + 11) < 0.01], key=lambda f: f[1])
    cover = [(f[1] - f[2] / 2, f[1] + f[2] / 2) for f in west]
    print("  west fence panels (z from, to):", [(round(a, 2), round(b2, 2)) for a, b2 in cover])
    gap = None
    for (a0, a1), (b0, b1) in zip(cover, cover[1:]):
        if b0 - a1 > 1: gap = (a1, b0)
    check("one opening in the west fence, at the north court", gap and gap[0] < -14.5 < gap[1] and len(cover) == 2, (cover, gap))
    east = [f for f in fence if abs(f[0] - 11) < 0.01]
    check("the east side is closed", len(east) == 1 and east[0][2] >= 43.9, east)

    # the stripe
    st = page.evaluate(f"""(() => {{ let s = null; {I}.PARKS[1].group.traverse((o) => {{ const p = o.geometry && o.geometry.parameters; if (o.isMesh && p && Math.abs(p.depth - 0.254) < 1e-6 && p.width > 20) s = {{ x: o.position.x, z: o.position.z, w: p.width, h: p.height, top: o.position.y + p.height / 2, col: o.material.color.getHex() }}; }}); return s; }})()""")
    check("the stripe: white, 10 inches wide, raised, across the middle court fence to fence", st and st["col"] > 0xe0e0e0 and abs(st["z"]) < 1e-6 and st["w"] >= 21.9 and st["top"] >= 0.011, st)
    k = page.evaluate(f"""(() => {{ const I = {I}, out = [];
      for (const x of [-9, -4, 2, 8]) {{ const b = {{ x, y: 0.03, z: 0.05, vx: 6, vy: 3, vz: 0.4 }}, a0 = Math.atan2(b.vz, b.vx), hit = I.stripeKick(b); out.push([hit, Math.abs(Math.atan2(b.vz, b.vx) - a0) * 180 / Math.PI, b.vy / 3]); }}
      const off = {{ x: 2, y: 0.03, z: 0.6, vx: 6, vy: 3, vz: 0.4 }};
      return {{ out, off: I.stripeKick(off) }}; }})()""")
    print("  bounces on the stripe (hit, degrees off, height x):", [(h, round(a, 1), round(v, 2)) for h, a, v in k["out"]])
    check("a ball that lands on the stripe bounces a touch higher and 1-3 degrees off", all(h and 0.8 < a < 3.2 and 1.04 < v < 1.16 for h, a, v in k["out"]), k)
    check("off the stripe, nothing", not k["off"], k)

    # walking: quicker off the court, the usual pace in a game
    ws0 = page.evaluate(f"{L}.walkSpeed")
    page.evaluate(f"(() => {{ const t = {I}.paddles[0]; __fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }})()")
    page.wait_for_timeout(600); page.keyboard.press("KeyE"); page.wait_for_timeout(800)
    ws1 = page.evaluate(f"{L}.walkSpeed")
    print("  walking speed off the court / in a game:", ws0, ws1)
    check("you walk about twice as fast when you're not in a game", ws0 >= 6 and ws1 <= 3.1, (ws0, ws1))
    page.keyboard.press("KeyE"); page.wait_for_timeout(600)
    page.evaluate(f"(() => {{ const PB = {L}.pb; if (PB.mySide >= 0) {I}.leaveCourt(); PB.ph = 'idle'; }})()")
    page.evaluate("__fd.dolly.position.set(-14.6, 0, -30); __fd.state.yaw = Math.PI; __fd.state.pitch = 0;"); page.wait_for_timeout(300)
    z0 = page.evaluate("__fd.dolly.position.z")
    page.keyboard.down("KeyW"); page.wait_for_timeout(1000); page.keyboard.up("KeyW")
    z1 = page.evaluate("__fd.dolly.position.z")
    print("  a second of W off the court:", round(z1 - z0, 2), "m")
    check("and it shows: a second of walking covers much more ground", abs(z1 - z0) > 3.5, z1 - z0)

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
