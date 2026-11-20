"""v119: pickleball, a bit more lively.

  - you can jump on the court (J, or A / X in VR), and in the air you reach a higher ball
  - in a browser, power matters: a tap drops it short, about half a second lands where you look, a full second sails long
  - in VR, a gentle push lands short and a smash goes long
  - the ball bounces a little higher; a slice curves a little more
  - the court bots take the ball out of the air when the rules allow (never from the kitchen)
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v119.py
"""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

# a browser shot from (-5, z 0) after holding the swing for `ms`, looking at a spot `look` m past the net; where it lands
SHOT = """(([ms, look, by]) => { const fd = __fd, L = fd.LEVELS[fd.state.level], PB = L.pb, I = PB.internals;
  fd.dolly.position.set(-5, by || 0, 0); fd.myHead.pos.set(-5, 1.6 + (by || 0), 0);
  fd.camera.position.set(0, 1.6, 0); fd.camera.lookAt(look, 0, 0); fd.camera.updateMatrixWorld(true);
  Object.assign(PB, { ph: 'rally', lastHit: 1, need: 0, hits: 4, bounced: true, auth: fd.state.myPeer, spinMode: 0 });
  Object.assign(PB.b, { x: -4.6, y: 1.0 + (by || 0) * 3.2, z: 0, vx: -2, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 });
  const now = performance.now(); Object.assign(PB, { swingFrom: now - ms, swingHeld: true, swingUntil: Infinity });
  I.deskHit(now);
  const hit = PB.lastHit === 0, f = I.flyTo(PB.b, PB.b);
  Object.assign(PB, { ph: 'idle', swingHeld: false }); fd.dolly.position.y = 0;
  return { hit, x: f.x, z: f.z }; })"""

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
    page.wait_for_timeout(1500)
    I = f"__fd.LEVELS[{i}].pb.internals"
    # pick up the west paddle
    page.evaluate(f"(() => {{ const t = {I}.paddles[0]; __fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }})()")
    page.wait_for_timeout(600); page.keyboard.press("KeyE"); page.wait_for_timeout(1000)
    check("holding a paddle on the west side", page.evaluate(f"__fd.LEVELS[{i}].pb.mySide") == 0)

    # ------------------------------------------------ jumping
    check("you can jump on the court", page.evaluate(f"!!__fd.LEVELS[{i}].canHop && !!__fd.LEVELS[{i}].vrHop"))
    page.evaluate("__fd.dolly.position.set(-5, 0, 0)"); page.wait_for_timeout(300)
    page.keyboard.down("KeyJ"); page.wait_for_timeout(120); page.keyboard.up("KeyJ")
    ys = [];
    for _ in range(6): ys.append(page.evaluate("__fd.dolly.position.y")); page.wait_for_timeout(60)
    check("J lifts you off the floor", max(ys) > 0.25, ys)
    page.wait_for_timeout(1500)
    check("and you come back down", abs(page.evaluate("__fd.dolly.position.y")) < 0.01)
    high = page.evaluate(SHOT, [450, 4.5, 0.5])
    grounded = page.evaluate("""(() => { const fd = __fd, PB = fd.LEVELS[fd.state.level].pb, I = PB.internals;
      fd.dolly.position.set(-5, 0, 0); fd.myHead.pos.set(-5, 1.6, 0);
      Object.assign(PB, { ph: 'rally', lastHit: 1, need: 0, hits: 4, bounced: true, auth: fd.state.myPeer });
      Object.assign(PB.b, { x: -4.6, y: 2.1 + 0.5, z: 0, vx: -2, vy: 0, vz: 0 });
      const now = performance.now(); Object.assign(PB, { swingFrom: now - 450, swingHeld: true, swingUntil: Infinity });
      I.deskHit(now); const hit = PB.lastHit === 0; Object.assign(PB, { ph: 'idle', swingHeld: false }); return hit; })()""")
    check("in the air you reach a ball you couldn't from the floor", high["hit"] and not grounded, f"{high} / {grounded}")

    # ------------------------------------------------ power in a browser
    soft, mid, hard = (page.evaluate(SHOT, [ms, 4.5, 0]) for ms in (40, 450, 900))
    print("  landings (m past the net) after 40 / 450 / 900 ms:", round(soft["x"], 2), round(mid["x"], 2), round(hard["x"], 2))
    check("all three hit", soft["hit"] and mid["hit"] and hard["hit"])
    check("a tap drops it short", soft["x"] < 3.0, soft)
    check("about half a second lands near where you look", 3.6 < mid["x"] < 5.5, mid)
    check("a full second sails long (past the baseline)", hard["x"] > 6.705 + 0.1, hard)
    deep = page.evaluate(SHOT, [900, 2.5, 0])
    check("a full swing at a short spot can still stay in", deep["x"] < 6.6, deep)

    # ------------------------------------------------ VR: the swing's pace
    vr = page.evaluate(f"""(() => {{ const I = {I}, HL = I.HL, out = [];
      for (const sp of [3.5, 9, 18]) {{ const deep = HL * (0.22 + sp / 19); out.push(deep); }} return out; }})()""")
    check("VR: a gentle push is short, a firm one in, a smash long", vr[0] < 3 and 3.5 < vr[1] < 6.4 and vr[2] > 6.8, vr)

    # ------------------------------------------------ bounce and curve
    r = page.evaluate(f"""(() => {{ const I = {I}; const b = {{ x: 2, y: 0.02, z: 0, vx: 5, vy: -5, vz: 0, wx: 0, wy: 0, wz: 0 }}; I.bounceSpin(b);
      const fl = (wy) => I.flyTo({{ x: -5, y: 1, z: 0 }}, {{ vx: 9, vy: 2.6, vz: 0, wx: 0, wy, wz: 0 }});
      return {{ up: b.vy, curve: Math.abs(fl(0.8).z - fl(0).z) }}; }})()""")
    print("  bounce up speed from 5 m/s down:", round(r["up"], 2), " slice curve over the flight:", round(r["curve"], 2), "m")
    check("the ball bounces a little higher (4 m/s up from 5 down)", 3.9 < r["up"] < 4.3, r)
    check("a slice curves a little more (but not wildly)", 0.25 < r["curve"] < 0.9, r)

    # ------------------------------------------------ the bots volley
    page.evaluate("""(() => { window.__vol = []; const fd = __fd, PB = fd.LEVELS[fd.state.level].pb; let prevB = PB.bounced, prevL = PB.lastHit;
      setInterval(() => { if (PB.lastHit === 1 && prevL !== 1 && PB.ph === 'rally') __vol.push({ bounced: prevB, x: PB.b.x }); prevB = PB.bounced; prevL = PB.lastHit; }, 4); })()""")
    faults = []
    for k in range(8):
        page.evaluate(f"""(() => {{ const fd = __fd, PB = fd.LEVELS[fd.state.level].pb, I = PB.internals;
          fd.dolly.position.set(-6, 0, 0);
          for (const bt of I.BOTS) if (bt.sl >= 2) {{ bt.x = 5.7; bt.z = {(-1) ** k * 0.6}; bt.vx = bt.vz = 0; }}
          Object.assign(PB, {{ ph: 'rally', lastHit: 0, need: 1, hits: 3, bounced: false, auth: fd.state.myPeer, pointSeq: PB.pointSeq + 1 }});
          Object.assign(PB.b, {{ x: -3, y: 1.0, z: 0, wx: 0, wy: 0, wz: 0 }});
          const v = I.aimed(PB.b, 6.0, {(-1) ** k * 0.8}, 8.5); Object.assign(PB.b, {{ vx: v.vx, vy: v.vy, vz: v.vz }}); PB.ver += 1; }})()""")
        page.wait_for_timeout(2200)
        why = page.evaluate("document.getElementById('toast').textContent")
        if "Kitchen" in why: faults.append(why)
    vol = page.evaluate("__vol")
    print("  bot returns:", [("air" if not v["bounced"] else "bounce", round(v["x"], 1)) for v in vol])
    check("the bots got balls back", len(vol) >= 4, vol)
    check("and took some out of the air", any(not v["bounced"] for v in vol), vol)
    check("never from the kitchen", not faults and all(v["bounced"] or abs(v["x"]) > 2.13 for v in vol), f"{faults} {vol}")

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
