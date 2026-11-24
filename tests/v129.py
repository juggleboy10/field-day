"""v129: pick your court; College Park's three courts, the giant line and the crack.

  - College Park has three courts side by side in one fence, with gates in the north and south fences
  - the giant line, about 10 inches (0.254 m) wide, runs from gate to gate through all three courts
  - a ball that lands on the crack (in the middle court) kicks off 4 to 10 degrees to one side; off the crack, nothing
  - "Change court" (and the Court action on screen) moves you to the next court: the park slides so that court is where
    the game is, that court's own drawing hides, and where you can walk moves with it. The Senior Center has six
  - the court is sent with the park and season, so everyone plays on the same one
  - still under the draw-call budget on another court; baked scenery doesn't change; no errors

    THREE_JS=/path/to/three.min.js python3 tests/v129.py
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
    hud = lambda: page.evaluate(f"{L}.hudActions.filter((a) => !a.show || a.show()).map((a) => a.label()).find((t) => t.startsWith('Court')) || null")
    check("Sunny Courts has just the one court (no Court action)", hud() is None)
    btn = page.evaluate(f"{L}.buttons.some((b) => b.label === 'Change court')")
    check("a Change court button by the fence", btn)

    page.evaluate(f"{I}.setPark(1)"); page.wait_for_timeout(500)
    st = page.evaluate(f"""(() => {{ const P = {I}.PARKS[1]; let line = null, gates = 0;
      P.group.traverse((o) => {{ if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 1 && Math.abs(o.scale.x - 0.254) < 1e-6 && o.scale.z > 40) line = [o.position.x, o.scale.z]; }});
      return {{ courts: P.courts.length, at: P.courtAt, vis: P.courtGroups.map((g) => g.visible), line }}; }})()""")
    if st["line"] is None:   # (addBox may size the geometry rather than scale the mesh)
        st["line"] = page.evaluate(f"""(() => {{ let line = null; {I}.PARKS[1].group.traverse((o) => {{ const p = o.geometry && o.geometry.parameters; if (o.isMesh && p && Math.abs(p.width - 0.254) < 1e-6 && p.depth > 40) line = [o.position.x, p.depth]; }}); return line; }})()""")
    print("  College Park:", st, hud())
    check("College Park has three courts, you on the middle one", st["courts"] == 3 and st["at"] == 1 and st["vis"] == [True, False, True], st)
    check("the giant line runs gate to gate through all three (about 10 inches wide)", st["line"] and st["line"][1] >= 43, st)
    check("the Court action shows 2 of 3", hud() and "2 of 3" in hud(), hud())

    # the crack: a bounce on it turns the ball 4 to 10 degrees; off it, nothing
    kick = page.evaluate(f"""(() => {{ const I = {I}, C = I.PARKS[1].crack, out = [];
      const mid = (k) => [(C[k][0] + C[k + 1][0]) / 2, (C[k][1] + C[k + 1][1]) / 2];
      for (let k = 0; k < C.length - 1; k++) {{ const [x, z] = mid(k), b = {{ x, y: 0.03, z, vx: 6, vy: 3, vz: 0.5 }}, a0 = Math.atan2(b.vz, b.vx); const hit = I.crackKick(b); out.push([hit, Math.abs(Math.atan2(b.vz, b.vx) - a0) * 180 / Math.PI]); }}
      const off = {{ x: -3, y: 0.03, z: 1, vx: 6, vy: 3, vz: 0.5 }}; const offHit = I.crackKick(off);
      return {{ out, offHit }}; }})()""")
    angs = [a for h, a in kick["out"]]
    print("  kicks along the crack (degrees):", [round(a, 1) for a in angs])
    check("a ball landing on the crack kicks off 4 to 10 degrees to one side", all(h for h, _ in kick["out"]) and all(3.9 < a < 10.4 for a in angs), kick)
    check("off the crack, the bounce is left alone", not kick["offHit"], kick)

    # change court: to the next (south), then round to the north
    page.evaluate(f"{L}.hudActions.find((a) => a.label().startsWith('Court')).run()"); page.wait_for_timeout(400)
    s2 = page.evaluate(f"(() => {{ const P = {I}.PARKS[1]; return {{ at: P.courtAt, pos: [P.group.position.x, P.group.position.z], vis: P.courtGroups.map((g) => g.visible), off: {I}.courtOff.slice(), b: {L}.bounds }}; }})()")
    print("  after Change court:", s2)
    check("Change court goes to the next court: the park slides so it's where the game is", s2["at"] == 2 and s2["pos"] == [0, -14.5] and s2["vis"] == [True, True, False], s2)
    check("where you can walk moves with it", s2["b"]["maxZ"] == 58 - 14.5 and s2["b"]["minZ"] == -84 - 14.5, s2["b"])
    off = page.evaluate(f"""(() => {{ const I = {I}, C = I.PARKS[1].crack, x = (C[3][0] + C[4][0]) / 2, z = (C[3][1] + C[4][1]) / 2;
      const here = {{ x, y: 0.03, z, vx: 6, vy: 3, vz: 0.5 }}, there = {{ x, y: 0.03, z: z - 14.5, vx: 6, vy: 3, vz: 0.5 }};
      return [I.crackKick(here), I.crackKick(there)]; }})()""")
    check("the crack stays in the middle court (it isn't on this one)", off == [False, True], off)
    page.evaluate(f"{I}.setCourt(0)"); page.wait_for_timeout(400)
    calls = []
    for a in range(4):
        page.evaluate(f"(() => {{ const fd = __fd; fd.dolly.position.set(-3, 0, 0); fd.state.yaw = {a * math.pi / 2 + 0.3}; fd.state.pitch = -0.05; }})()")
        page.wait_for_timeout(300)
        calls.append(page.evaluate("__fd.renderer.info.render.calls"))
    check("on the north court, still under the draw-call budget", max(calls) < 150, calls)

    # everyone plays on the same court
    pk = page.evaluate(f"{L}.presence().pkp")
    check("the court is sent with the park and season", pk and len(pk) == 4 and pk[3] == 0, pk)
    page.evaluate(f"{L}.readPresence({{ peer: 'zz', name: 'Zed' }}, {{ pkp: [2, {pk[1]} + 2, -1, 4] }}, {{}})"); page.wait_for_timeout(400)
    s3 = page.evaluate(f"(() => {{ const P = {I}.PARKS[2]; return {{ park: {I}.park(), at: P.courtAt, pos: [P.group.position.x, P.group.position.z], n: P.courts.length }}; }})()")
    check("a friend's pick (Senior Center, court 5) is taken: the park slides to it", s3["park"] == 2 and s3["at"] == 4 and s3["pos"] == [-22, 0] and s3["n"] == 6, s3)
    calls = []
    for a in range(4):
        page.evaluate(f"(() => {{ const fd = __fd; fd.dolly.position.set(-3, 0, 0); fd.state.yaw = {a * math.pi / 2 + 0.3}; fd.state.pitch = -0.05; }})()")
        page.wait_for_timeout(300)
        calls.append(page.evaluate("__fd.renderer.info.render.calls"))
    check("Senior Center court 5, under the draw-call budget", max(calls) < 150, calls)
    page.wait_for_timeout(300)
    mc = page.evaluate("__fd.mergeCheck ? __fd.mergeCheck() : []")
    check("no baked scenery changed", not mc, mc[:3] if mc else mc)

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
