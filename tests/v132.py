"""v132: wind on and off at College Park and the Senior Center.

  - a Wind button by the fence (and a Wind action on screen) at College Park and the Senior Center; not at Sunny Courts
  - on: a breeze from one direction, 1 to 3.6 m/s and gusting; the windsock swings downwind and lifts with it
  - it pushes the ball: the same shot lands well off where it would in still air (and exactly there with it off)
  - falling snow drifts with it
  - everyone at the court shares it (sent with the park, season and court)
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v132.py
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

# fly one shot as the real ball flies (with the wind as it is now), to its first bounce
FLY = """(() => { const I = __fd.LEVELS[__fd.state.level].pb.internals, p = { x: -6, y: 1, z: 0, wx: 0, wy: 0, wz: 0 }, v = I.aimed(p, 4.5, 0, 9); Object.assign(p, v);
  for (let k = 0; k < 2400; k++) { const sp = Math.hypot(p.vx, p.vy, p.vz); I.airStep(p, 1 / 240, sp, I.windNow()); p.x += p.vx / 240; p.y += p.vy / 240; p.z += p.vz / 240; if (p.y < 0.037) break; }
  return [p.x, p.z]; })()"""

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
    hud = lambda: page.evaluate(f"{L}.hudActions.filter((a) => !a.show || a.show()).map((a) => a.label()).find((t) => t.startsWith('Wind')) || null")
    sunny = page.evaluate(f"(() => {{ const I = {I}; I.toggleWind(); return {{ off: I.windBtn.off, w: I.windNow(), sock: I.sock.visible }}; }})()")
    page.wait_for_timeout(200)
    check("no wind at Sunny Courts: no button, no Wind action, no windsock", sunny["off"] and sunny["w"] is None and hud() is None, sunny)

    page.evaluate(f"{I}.setPark(1)"); page.wait_for_timeout(500)
    still = page.evaluate(FLY)
    check("College Park: the Wind button and action are there", not page.evaluate(f"{I}.windBtn.off") and hud() and "off" in hud(), hud())
    page.evaluate(f"{I}.setWind(true, Math.PI / 2)"); page.wait_for_timeout(400)     # (blowing toward +x: along the shot)
    w = page.evaluate(f"(() => {{ const W = {I}.windNow(); return [W.x, W.z]; }})()")
    sp = [page.evaluate(f"(() => {{ const W = {I}.windNow(); return Math.hypot(W.x, W.z); }})()") for _ in range(3)]
    check("on: a breeze of 1 to 3.6 m/s", all(1 <= s <= 3.6 for s in sp) and hud() and "on" in hud(), (sp, hud()))
    page.wait_for_timeout(600)
    sock = page.evaluate(f"(() => {{ const I = {I}; return {{ vis: I.sock.visible, lift: I.sockMesh.rotation.z + Math.PI / 2, yaw: I.sockHead.rotation.y }}; }})()")
    check("the windsock lifts and points downwind", sock["vis"] and sock["lift"] > 0.3 and abs(math.atan2(math.sin(sock["yaw"]), math.cos(sock["yaw"]))) < 0.5, sock)
    down = page.evaluate(FLY)
    page.evaluate(f"{I}.setWind(true, 0)"); page.wait_for_timeout(200)    # (blowing toward +z: across the shot)
    cross = page.evaluate(FLY)
    page.evaluate(f"{I}.setWind(false)"); page.wait_for_timeout(200)
    still2 = page.evaluate(FLY)
    print("  landings (x, z): still", [round(v, 2) for v in still], "downwind", [round(v, 2) for v in down], "crosswind", [round(v, 2) for v in cross], "off again", [round(v, 2) for v in still2])
    check("a following wind carries the ball further", down[0] > still[0] + 0.3, (still, down))
    check("a crosswind pushes it sideways", cross[1] > still[1] + 0.3, (still, cross))
    check("off, it flies exactly as in still air", abs(still2[0] - still[0]) < 1e-6 and abs(still2[1] - still[1]) < 1e-6, (still, still2))

    # snow drifts with it
    page.evaluate(f"{I}.setSeason(3); {I}.setWind(true, Math.PI / 2)"); page.wait_for_timeout(300)
    x0 = page.evaluate(f"Array.from({I}.snow.geometry.attributes.position.array).filter((v, k) => k % 3 === 0).slice(0, 200)")
    page.wait_for_timeout(800)
    x1 = page.evaluate(f"Array.from({I}.snow.geometry.attributes.position.array).filter((v, k) => k % 3 === 0).slice(0, 200)")
    moved = sum(1 for a, c in zip(x0, x1) if 0 < c - a < 3)
    check("falling snow drifts with it", moved > 120, moved)

    # shared
    pk = page.evaluate(f"{L}.presence().pkp")
    check("the wind is sent with the park", pk and len(pk) == 6 and pk[4] == 1, pk)
    page.evaluate(f"{L}.readPresence({{ peer: 'zz', name: 'Zed' }}, {{ pkp: [2, {pk[1]} + 2, -1, 1, 1, 3142] }}, {{}})"); page.wait_for_timeout(300)
    s = page.evaluate(f"(() => {{ const I = {I}; return {{ park: I.park(), wind: I.wind() }}; }})()")
    check("a friend's wind is taken", s["park"] == 2 and s["wind"]["on"] and abs(s["wind"]["dir"] - 3.142) < 1e-6, s)
    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
