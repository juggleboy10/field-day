"""v121: pickleball, throwing your paddle at a ball you can't reach.

  - in a browser, J while holding Space flings the paddle where you look; in VR, jump (A / X) and the trigger together
  - your hand is empty and you can't swing for the rest of the point; the paddle flies, tumbles and lands on the court
  - other players are told where it is (so they see it fly)
  - it has to meet the ball; when it does it only sometimes goes over (a lucky angle), and a throw from out of reach
    at a passing ball comes off maybe one time in a hundred
  - at the next serve the paddle is back in your hand
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v121.py
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

RALLY = """(() => { const fd = __fd, PB = fd.LEVELS[fd.state.level].pb;
  Object.assign(PB, { ph: 'rally', lastHit: 1, need: 0, hits: 5, bounced: true, winner: -1, score: [0, 0], auth: fd.state.myPeer });
  Object.assign(PB.b, { x: 3, y: 1.2, z: 0, vx: -4, vy: 1, vz: 0, wx: 0, wy: 0, wz: 0 }); PB.ver += 1; })()"""

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
    L, I = f"__fd.LEVELS[{i}]", f"__fd.LEVELS[{i}].pb.internals"
    page.evaluate(f"(() => {{ const t = {I}.paddles[0]; __fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }})()")
    page.wait_for_timeout(600); page.keyboard.press("KeyE"); page.wait_for_timeout(1000)
    check("holding a paddle", page.evaluate(f"{L}.pb.mySide") == 0)

    # ------------------------------------------------ the browser throw
    page.evaluate("__fd.dolly.position.set(-5, 0, 0); __fd.state.yaw = -Math.PI / 2; __fd.state.pitch = 0;")
    page.wait_for_timeout(300)
    page.evaluate(RALLY)
    page.keyboard.down("Space"); page.wait_for_timeout(150)
    page.keyboard.down("KeyJ"); page.wait_for_timeout(100); page.keyboard.up("KeyJ"); page.keyboard.up("Space")
    page.wait_for_timeout(150)
    st = page.evaluate(f"""(() => {{ const I = {I}, t = I.paddles[0]; return {{ on: I.TH.on, flying: I.throwMesh.visible, held: t.g.visible,
      x: I.TH.p.x, pres: {L}.presence().pbt }}; }})()""")
    check("J while holding Space throws the paddle", st["on"] and st["flying"], st)
    check("your hand is empty", not st["held"], st)
    check("other players are told where it is", isinstance(st["pres"], list) and len(st["pres"]) == 7, st)
    # no swinging meanwhile
    sw = page.evaluate(f"""(() => {{ const fd = __fd, PB = {L}.pb, I = PB.internals;
      const keep = {{ ...PB.b }}; Object.assign(PB.b, {{ x: -4.7, y: 1, z: 0, vx: -2, vy: 0, vz: 0 }});
      fd.myHead.pos.set(-5, 1.6, 0); const now = performance.now(); Object.assign(PB, {{ swingFrom: now - 400, swingHeld: true, swingUntil: Infinity }});
      I.deskHit(now); const r = PB.lastHit; PB.swingHeld = false; Object.assign(PB.b, keep); return r; }})()""")
    check("you can't swing for the rest of the point", sw == 1, sw)
    page.wait_for_timeout(2500)
    st2 = page.evaluate(f"(() => {{ const I = {I}; return {{ x: I.TH.p.x, y: I.TH.p.y, landed: I.TH.landed, on: I.TH.on }}; }})()")
    check("it flies off the way you're looking and lands", st2["x"] > st["x"] + 2 and st2["y"] < 0.1 and st2["landed"], f"{st} -> {st2}")
    # the next serve: the paddle's back
    page.evaluate(f"{I}.onBounce(-4, 0)")     # (two bounces on my side: their point)
    page.wait_for_function(f"{L}.pb.ph === 'serve'", timeout=8000)
    page.wait_for_timeout(300)
    back = page.evaluate(f"(() => {{ const I = {I}; return {{ on: I.TH.on, flying: I.throwMesh.visible, held: I.paddles[0].g.visible }}; }})()")
    check("at the next serve it's back in your hand", not back["on"] and not back["flying"] and back["held"], back)

    # ------------------------------------------------ VR: jump and trigger together
    vr = page.evaluate(f"""(() => {{ const fd = __fd, Lv = {L}, PB = Lv.pb, I = PB.internals, t = I.paddles[0], side = t.held.side;
      Object.assign(PB, {{ ph: 'rally', lastHit: 1, need: 0, hits: 5, bounced: true, winner: -1, auth: fd.state.myPeer }});
      Object.assign(PB.b, {{ x: 3, y: 1.2, z: 0, vx: -4, vy: 1, vz: 0 }});
      const pad = (trig, jump) => ({{ gamepad: {{ buttons: [{{ pressed: trig }}, {{ pressed: false }}, {{ pressed: false }}, {{ pressed: false }}, {{ pressed: jump }}], axes: [0, 0, 0, 0] }} }});
      const keep = {{ l: fd.vrHands.left.source, r: fd.vrHands.right.source, mode: fd.state.mode }};
      fd.state.mode = 'vr'; fd.myHead.pos.set(-5, 1.6, 0); fd.myHead.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
      const run = (trig, jump) => {{ fd.vrHands[side].source = pad(trig, jump); fd.vrHands[side === 'left' ? 'right' : 'left'].source = pad(false, false); Lv.update(1 / 60, performance.now()); return I.TH.on; }};
      const out = {{ trigOnly: run(true, false) }}; run(false, false);
      out.jumpOnly = run(false, true); run(false, false);
      out.both = run(true, true);
      fd.vrHands.left.source = keep.l; fd.vrHands.right.source = keep.r; fd.state.mode = keep.mode;
      return out; }})()""")
    check("VR: the trigger alone or the jump alone doesn't throw", not vr["trigOnly"] and not vr["jumpOnly"], vr)
    check("VR: both together throws", vr["both"], vr)
    page.evaluate(f"(() => {{ const PB = {L}.pb; PB.ph = 'serve'; PB.pointSeq += 1; }})()"); page.wait_for_timeout(300)
    page.wait_for_timeout(2500)
    # before a serve too: it flies, lands, and comes straight back
    page.evaluate(f"(() => {{ const PB = {L}.pb; PB.ph = 'serve'; PB.server = 1; }})()")
    page.wait_for_timeout(200)
    page.keyboard.down("Space"); page.wait_for_timeout(100); page.keyboard.down("KeyJ"); page.wait_for_timeout(80); page.keyboard.up("KeyJ"); page.keyboard.up("Space")
    page.wait_for_timeout(150)
    s1 = page.evaluate(f"{I}.TH.on")
    page.wait_for_function(f"!{I}.TH.on", timeout=6000)
    check("before a serve it throws too, and comes back once it lands", s1 and page.evaluate(f"{I}.paddles[0].g.visible"), s1)

    # ------------------------------------------------ meeting the ball
    # straight into the ball: it's hit, and sometimes (not always) goes over
    r = page.evaluate(f"""(() => {{ const fd = __fd, PB = {L}.pb, I = PB.internals; let hits = 0, over = 0;
      for (let k = 0; k < 300; k++) {{
        Object.assign(PB, {{ ph: 'rally', lastHit: 1, need: 0, hits: 5, bounced: true, winner: -1, auth: fd.state.myPeer }});
        Object.assign(PB.b, {{ x: -3, y: 1.0, z: 0, vx: -5, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 }});
        Object.assign(I.TH, {{ on: true, hit: false, landed: false, seq: PB.pointSeq }}); I.TH.p.set(-3.05, 1.0, 0); I.TH.v.set(8, 1, 0);
        const b0 = new THREE.Vector3(-3, 1, 0); I.throwStep(1 / 60, b0, PB.b);
        if (PB.lastHit === 0 && PB.ph === 'rally') {{ hits++; const f = I.flyTo(PB.b, PB.b); if (f.x > 0 && f.x < I.HL && Math.abs(f.z) < I.HW && f.netY > I.NET_H) over++; }}
        else if (I.TH.hit) hits++;
      }}
      I.TH.on = false; I.throwMesh.visible = false; PB.ph = 'serve';
      return {{ hits, over }}; }})()""")
    print("  thrown straight into the ball, 300 times:", r)
    check("a paddle that meets the ball hits it", r["hits"] > 280, r)
    check("only sometimes over and in (a lucky angle)", 0.04 * 300 < r["over"] < 0.35 * 300, r)
    # a desperate throw: a ball going past out of reach, thrown roughly at it from 3-5 m away
    r2 = page.evaluate(f"""(() => {{ const fd = __fd, PB = {L}.pb, I = PB.internals; let over = 0, met = 0; const N = 1500;
      for (let k = 0; k < N; k++) {{
        Object.assign(PB, {{ ph: 'rally', lastHit: 1, need: 0, hits: 5, bounced: true, winner: -1, auth: fd.state.myPeer }});
        const bz = (Math.random() - 0.5) * 4; Object.assign(PB.b, {{ x: -1.5, y: 1.1, z: bz, vx: -6, vy: 1.2, vz: 0, wx: 0, wy: 0, wz: 0 }});
        const me = new THREE.Vector3(-5 + Math.random() * 2, 1.3, bz + (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 2));
        // aimed at where the ball is, give or take a human's aim
        const d = new THREE.Vector3(PB.b.x - 2.5 - me.x, PB.b.y - me.y + (Math.random() - 0.5) * 0.6, bz - me.z).normalize();
        d.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.35);
        Object.assign(I.TH, {{ on: true, hit: false, landed: false, seq: PB.pointSeq }}); I.TH.p.copy(me); I.TH.v.copy(d).multiplyScalar(10).add(new THREE.Vector3(0, 1.5, 0));
        for (let f = 0; f < 90 && PB.lastHit === 1 && !I.TH.landed; f++) {{
          const b0 = new THREE.Vector3(PB.b.x, PB.b.y, PB.b.z); for (let s = 0; s < 4; s++) I.stepBall(1 / 240); I.throwStep(1 / 60, b0, PB.b);
          if (PB.ph !== 'rally') break;
        }}
        if (I.TH.hit) met++;
        if (PB.lastHit === 0 && PB.ph === 'rally') {{ const f = I.flyTo(PB.b, PB.b); if (f.x > 0 && f.x < I.HL && Math.abs(f.z) < I.HW && f.netY > I.NET_H) over++; }}
        PB.ph = 'serve';
      }}
      I.TH.on = false; I.throwMesh.visible = false;
      return {{ N, met, over, rate: over / N }}; }})()""")
    print("  desperate throws at a passing ball:", r2)
    check("a desperate throw rarely saves the point (around 1 in 100)", 0.001 <= r2["rate"] < 0.025, r2)

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
