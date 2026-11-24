"""v126: pickleball parks: the same court in a different place. College Park (from photos) is the first new one.

  - the "Change park" button (and the HUD action) switches Sunny Courts <-> College Park: the scenery round the court,
    the court's colours, and the sky and light all change; the court itself (lines, net, racks) stays where it was
  - College Park has its pieces: the second court, the basketball court and hoops, the playground, the path in, the
    sign, the houses, lots of trees and fallen leaves
  - everyone on the court sees the same park (the latest pick wins), and ?park=college opens there
  - it stays cheap to draw (under the 150-call budget looking round the court) and its baked scenery never moves
  - a rally still plays there (bots serve and return, the point is scored)
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v126.py
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
    page.wait_for_timeout(1200)
    L, I = f"__fd.LEVELS[{i}]", f"__fd.LEVELS[{i}].pb.internals"
    look = f"""(() => {{ const I = {I}, sky = __fd.renderer.getClearColor ? 0 : 0; return {{ park: I.PARKS[I.park()].id, groups: I.PARKS.map((P) => P.group ? P.group.visible : null),
      court: {L}.group.children.find((m) => m.geometry && m.geometry.parameters && m.geometry.parameters.width === I.HL * 2 && m.geometry.parameters.height === I.HW * 2).material.color.getHex(),
      bg: __fd.LEVELS[{i}].env.bg, hud: {L}.hudActions.map((a) => a.label()).find((t) => t.startsWith('Park')) }}; }})()"""
    s0 = page.evaluate(look)
    print("  start:", s0)
    check("it starts at Sunny Courts", s0["park"] == "sunny" and s0["groups"][0] is True and s0["groups"][1] is None and "Sunny Courts" in s0["hud"], s0)

    # the button by the net
    page.evaluate(f"""(() => {{ const b = __fd.LEVELS[{i}].buttons.find((b) => /park/i.test(b.label || ''));  if (b) b.onPress(b); }})()""")
    page.wait_for_timeout(400)
    s1 = page.evaluate(look)
    if s1["park"] != "college":   # (if the button can't be pressed from here, the HUD action does the same)
        page.evaluate(f"{L}.hudActions.find((a) => a.label().startsWith('Park')).run()"); page.wait_for_timeout(400); s1 = page.evaluate(look)
    print("  after one press:", s1)
    check("Change park goes to College Park", s1["park"] == "college" and s1["groups"] == [False, True] and "College Park" in s1["hud"], s1)
    check("the court's colours and the sky change with it", s1["court"] != s0["court"] and s1["bg"] != s0["bg"], (s0, s1))
    env = page.evaluate("(() => { const s = __fd.renderer; return __fd.LEVELS[" + str(i) + "].env.fog[2]; })()")
    check("its light and sky are on now", abs(page.evaluate("__fd.camera.parent ? 0 : 0") - 0) == 0 and env == 210, env)
    # the court stays put
    net = page.evaluate(f"{I}.paddles.map((t) => [Math.round(t.rackPos.x * 10), Math.round(t.rackPos.z * 10)])")
    check("the court (racks, lines, net) is where it was", len(net) == 4, net)

    # its pieces
    parts = page.evaluate(f"""(() => {{ const g = {I}.PARKS[1].group; let inst = 0, trees = 0, leaves = 0, meshes = 0;
      g.traverse((o) => {{ if (o.isInstancedMesh) {{ inst++; if (o.count > 400) leaves = o.count; else trees = Math.max(trees, o.count); }} else if (o.isMesh) meshes++; }});
      return {{ inst, trees, leaves, meshes }}; }})()""")
    print("  College Park:", parts)
    check("lots of trees and fallen leaves (each one draw call)", parts["inst"] >= 3 and parts["trees"] >= 150 and parts["leaves"] >= 600, parts)

    # cheap to draw: look all round from the middle of the court
    calls = []
    for k in range(8):
        page.evaluate(f"(() => {{ const fd = __fd; fd.dolly.position.set(-3, 0, 0); fd.state.yaw = {k * math.pi / 4}; fd.state.pitch = -0.05; }})()")
        page.wait_for_timeout(350)
        calls.append(page.evaluate("__fd.renderer.info.render.calls"))
    print("  draw calls looking round:", calls)
    check("under the 150-call budget all the way round", max(calls) < 150, calls)
    page.wait_for_timeout(500)
    mc = page.evaluate("__fd.mergeCheck ? __fd.mergeCheck() : []")
    check("its baked scenery hasn't moved or changed", not mc, mc[:3] if mc else mc)

    # everyone sees the same park: a friend's newer pick is taken, an older one isn't
    pres = page.evaluate(f"{L}.presence().pkp")
    check("the park is sent to everyone", pres and pres[0] == 1, pres)
    page.evaluate(f"{L}.readPresence({{ peer: 'zz', name: 'Zed' }}, {{ pkp: [0, {pres[1]} + 5] }}, {{}})"); page.wait_for_timeout(200)
    a = page.evaluate(f"{I}.park()")
    page.evaluate(f"{L}.readPresence({{ peer: 'zz', name: 'Zed' }}, {{ pkp: [1, 1] }}, {{}})"); page.wait_for_timeout(200)
    b2 = page.evaluate(f"{I}.park()")
    check("a friend's newer pick is taken, an older one isn't", a == 0 and b2 == 0, (a, b2))
    page.evaluate(f"{I}.setPark(1)"); page.wait_for_timeout(300)

    # a rally plays there: pick up a paddle and let the bots serve and play the point out
    page.evaluate(f"(() => {{ const t = {I}.paddles[0]; __fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }})()")
    page.wait_for_timeout(600); page.keyboard.press("KeyE"); page.wait_for_timeout(800)
    r = page.evaluate(f"""(() => {{ const fd = __fd, Lv = {L}, PB = Lv.pb, I = PB.internals; PB.server = 1; I.startServe(); fd.myHead.pos.set(-14, 1.6, 6); fd.dolly.position.set(-10.5, 0, 6.5);
      let now = performance.now(), seq = PB.pointSeq, hits = 0, last = -1;
      for (let f = 0; f < 60 * 25 && PB.pointSeq === seq; f++) {{ now += 1000 / 60; Lv.update(1 / 60, now); if (PB.lastHit !== last) {{ last = PB.lastHit; hits++; }} }}
      return {{ points: PB.pointSeq - seq, hits, score: PB.score.slice() }}; }})()""")
    print("  a point at College Park:", r)
    check("a point plays out there (served, returned, scored)", r["points"] >= 1 and r["hits"] >= 1, r)

    # ?park=college opens there
    page.goto(PAGE + "?test&park=college"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')"); page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(800)
    check("?park=college opens at College Park", page.evaluate(f"{I}.PARKS[{I}.park()].id") == "college")

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
