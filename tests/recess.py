"""Recess Rush: each playground station works, nothing can be skipped, and a full race against the bots finishes.

The physics are driven directly (the level's step function at 60 Hz) by a little autopilot, so the test is quick
and doesn't depend on how fast the headless browser draws.

- hopscotch: the ribbon stays shut until all ten squares are lit; stepping on the lava sends you back
- tire run: the mud is slow, the tires aren't
- sack race: you can't run in a sack, but hopping gets you there
- ball pit: slow going; the balls get pushed about
- crawl tunnel: you get down low inside, and there's no way round the hill
- monkey bars (browser): grab, swing along, drop onto the far platform; let go over the lava and you go back
- the tower can't be walked round; up the stairs and down the slide crosses the finish
- a full race: the autopilot's time, against the bots'

Usage: python tests/recess.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
D = os.environ.get("SHOTS")

# the autopilot: walk (or hop) through a list of waypoints; returns where it got to
PILOT = """() => {
window.__pilot = (legs, maxT) => {
  const fd = window.__fd, L = fd.LEVELS[24], I = L.recessInternals, P = I.P, dolly = fd.dolly, st = fd.state;
  const dt = 1 / 60;
  let t = 0, flip = false, minSpd = 1e9;
  const log = [];
  for (const leg of legs) {
    const [x, z, how] = leg;
    let lt = 0;
    if (how === 'bars') {
      const ok = I.grabFlat();
      log.push({ leg: 'grab', ok });
      while (lt < 30 && (P.hang || !P.grounded)) { P.in.fwd = 1; P.in.side = 0; P.in.jump = false; I.step(dt); t += dt; lt += dt; }
      continue;
    }
    while (lt < (maxT || 40)) {
      const dx = x - dolly.position.x, dz = z - dolly.position.z, d = Math.hypot(dx, dz);
      if (d < (how === 'exact' ? 0.12 : 0.35)) break;
      st.yaw = Math.atan2(-dx, -dz); P.in.fwd = how === 'exact' && d < 0.5 ? Math.max(0.25, d * 2) : 1; P.in.side = 0;
      flip = !flip;
      P.in.jump = how === 'hop' ? flip : false;
      I.step(dt); t += dt; lt += dt;
    }
    log.push({ leg: [x, z, how], at: [+dolly.position.x.toFixed(2), +dolly.position.y.toFixed(2), +dolly.position.z.toFixed(2)], t: +t.toFixed(1) });
  }
  P.in.fwd = 0; P.in.jump = false;
  return { t: +t.toFixed(1), log, x: dolly.position.x, y: dolly.position.y, z: dolly.position.z };
};
}
"""

# VR, simulated: a fake headset and controllers, stepped by hand inside one evaluate (no real frames run meanwhile)
VR = """([what]) => {
  const fd = window.__fd, I = window.__fd.LEVELS[24].recessInternals, P = I.P, V = I.vr(), st = fd.state, cam = fd.camera, dolly = fd.dolly;
  const pad = () => ({ buttons: Array.from({ length: 6 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] });
  const saved = [V.vrHands.left.source, V.vrHands.right.source, st.mode];
  const L = { gamepad: pad() }, R = { gamepad: pad() };
  V.vrHands.left.source = L; V.vrHands.right.source = R; st.mode = 'vr';
  cam.position.set(0, 1.7, 0); cam.rotation.set(0, 0, 0); dolly.rotation.set(0, 0, 0);
  const head = () => V.myHead.pos.set(dolly.position.x + cam.position.x, dolly.position.y + cam.position.y, dolly.position.z + cam.position.z);
  const frame = () => { head(); I.step(1 / 60); head(); };
  const place = (x, y, z) => { dolly.position.set(x, y, z); P.vel.set(0, 0, 0); P.grounded = true; P.hang = false; P.duck = 0; P.headY = cam.position.y; P.headVy = 0; };
  const out = {};
  try {
    if (what === 'tunnel') {
      // standing up: the roof stops you
      place(0, 0, -57.4); L.gamepad.axes[3] = -1;
      for (let f = 0; f < 150; f++) frame();
      out.standingStopsAt = +dolly.position.z.toFixed(2);
      // holding B / Y: the view ducks, and through you go
      place(0, 0, -57.4); L.gamepad.buttons[5].pressed = true; let minY = 0, f = 0;
      for (; f < 1200 && dolly.position.z > -68.2; f++) { frame(); minY = Math.min(minY, dolly.position.y); }
      L.gamepad.buttons[5].pressed = false; for (let k = 0; k < 10; k++) frame();
      out.duckButton = { through: dolly.position.z < -68, seconds: +(f / 60).toFixed(1), viewDuckedBy: +(-minY).toFixed(2), afterY: +dolly.position.y.toFixed(2) };
      // really crouching
      place(0, 0, -57.4); cam.position.y = 0.9; f = 0;
      for (; f < 1200 && dolly.position.z > -68.2; f++) frame();
      out.realCrouch = { through: dolly.position.z < -68, seconds: +(f / 60).toFixed(1) };
      L.gamepad.axes[3] = 0; cam.position.y = 1.7;
    }
    if (what === 'sack') {
      // jumping for real: the head pops up 15 cm in a tenth of a second, about twice a second
      place(0, 0, -29.6); const z0 = dolly.position.z;
      for (let f = 0; f < 240; f++) { const ph = f % 30; cam.position.y = 1.7 + (ph < 6 ? ph * 0.025 : ph < 12 ? (12 - ph) * 0.025 : 0); frame(); }
      out.hopped = +(z0 - dolly.position.z).toFixed(2);
      place(0, 0, -29.6); cam.position.y = 1.7; const z1 = dolly.position.z;
      for (let f = 0; f < 240; f++) frame();
      out.standingStill = +(z1 - dolly.position.z).toFixed(2);
    }
    if (what === 'bars') {
      // hand over hand: grip the next bar with one hand, let go with the other, pull yourself half a metre along
      place(0, 0.7, -69.9); const lava0 = P.lavaN || 0;
      const bars = []; for (let z = I.Z.bars[0]; z >= I.Z.bars[1] - 0.01; z -= 0.5) bars.push(z);
      const local = { left: new THREE.Vector3(), right: new THREE.Vector3() };
      const setHand = (side, grip) => { const h = V.myHands[side]; h.ok = true; h.pos.copy(dolly.position).add(local[side]); (side === 'left' ? L : R).gamepad.buttons[1].pressed = grip; };
      let k = 0, maxDrop = 0;
      for (const bz of bars) {
        const side = k % 2 ? 'left' : 'right', other = k % 2 ? 'right' : 'left';
        local[side].set(side === 'left' ? -0.15 : 0.15, 2.55 - dolly.position.y, bz - dolly.position.z);
        setHand(side, true); setHand(other, true); frame();
        setHand(other, false);
        for (let f = 0; f < 20; f++) { local[side].z += 0.5 / 20; setHand(side, true); frame(); maxDrop = Math.max(maxDrop, 0.7 - dolly.position.y); }
        k++;
      }
      setHand('left', false); setHand('right', false);
      for (let f = 0; f < 60; f++) frame();
      out.bars = { y: +dolly.position.y.toFixed(2), z: +dolly.position.z.toFixed(2), headZ: +V.myHead.pos.z.toFixed(2), touchedLava: (P.lavaN || 0) > lava0, bars: bars.length };
      V.myHands.left.ok = V.myHands.right.ok = false;
    }
  } finally {
    V.vrHands.left.source = saved[0]; V.vrHands.right.source = saved[1]; st.mode = saved[2];
    cam.position.set(0, 1.6, 0); P.duck = 0; if (dolly.position.y < 0) dolly.position.y = 0;
  }
  return out;
}"""

PLACE = "([x, y, z]) => { const fd = window.__fd, P = fd.LEVELS[24].recessInternals.P; fd.dolly.position.set(x, y, z); P.vel.set(0, 0, 0); P.grounded = true; P.hang = false; fd.state.yaw = 0; }"
I = "window.__fd.LEVELS[24].recessInternals"
SQUARES = [[0, -4], [0, -5], [0, -6], [-0.475, -7], [0.475, -7], [0, -8], [-0.475, -9], [0.475, -9], [0, -10], [0, -11]]


def main():
    ok = True
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1100, "height": 650})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(24)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(800)
        page.evaluate(PILOT)
        page.evaluate("() => { window.__fd.LEVELS[24].paused = true; }")
        pilot = lambda legs, maxT=40: page.evaluate("([l, m]) => window.__pilot(l, m)", [legs, maxT])

        # ---------------------------------------------------------------- hopscotch
        page.evaluate(PLACE, [0, 0, 2])
        r = pilot([[0, -11, "exact"], [0, -14, "walk"]], 8)
        lit = page.evaluate(f"() => {I}.P.lit")
        print(f"hopscotch straight down the middle: {lit} lit, stopped at z {r['z']:.2f}")
        checks += [("walking straight down the middle misses some squares", lit < 10),
                   ("the ribbon stops you until they're all lit", r["z"] > -12.6)]
        page.evaluate(f"() => {I}.resetCourse()")
        page.evaluate(PLACE, [0, 0, 2])
        r = pilot([[x, z, "exact"] for x, z in SQUARES] + [[0, -13.6, "walk"]])
        lit = page.evaluate(f"() => {I}.P.lit")
        print(f"hopscotch square by square: {lit} lit, ended at z {r['z']:.2f}")
        checks += [("stepping on every square lights all ten", lit == 10), ("then the ribbon opens", r["z"] < -13.2)]
        page.evaluate(PLACE, [0, 0, -5.5])
        lv = page.evaluate(f"""() => {{ const fd = window.__fd, I = {I}, P = I.P, n0 = P.lavaN || 0; fd.state.yaw = -1.2;
          for (let f = 0; f < 120 && (P.lavaN || 0) === n0; f++) {{ P.in.fwd = 1; P.in.side = 0; P.in.jump = false; I.step(1 / 60); }}
          return {{ burnt: (P.lavaN || 0) > n0, z: +fd.dolly.position.z.toFixed(2) }}; }}""")
        print("stepping off the squares:", lv)
        checks.append(("the lava sends you back to the start of the hopscotch", lv["burnt"] and lv["z"] > -3.2))

        # ---------------------------------------------------------------- tires, sack, pit, tunnel: speeds
        speeds = page.evaluate(f"""() => {{ const fd = window.__fd, I = {I}, P = I.P, out = {{}};
          const run = (name, x, z, n) => {{ fd.dolly.position.set(x, 0, z); P.vel.set(0, 0, 0); P.grounded = true; fd.state.yaw = 0; const z0 = z;
            for (let f = 0; f < (n || 30); f++) {{ P.in.fwd = 1; P.in.side = 0; P.in.jump = false; I.step(1 / 60); }}
            out[name] = +((z0 - fd.dolly.position.z) / ((n || 30) / 60)).toFixed(2); }};
          run('open lane', 0, -33 + 20, 30); run('mud', 0, -15.0, 20); run('tire', -0.9, -15.3, 6);
          run('sack (walking)', 0, -33, 60); run('ball pit', 0, -50, 30); run('tunnel', 0, -60, 30);
          fd.dolly.position.set(0, 0, -62); I.step(1 / 60); out.crawling = P.crawl;
          return out; }}""")
        print("speeds (m/s):", speeds)
        checks += [("the mud is slow", speeds["mud"] < speeds["open lane"] * 0.5),
                   ("stepping in a tire isn't", speeds["tire"] > speeds["mud"] * 1.5),
                   ("you can't run in a sack", speeds["sack (walking)"] < 1.0),
                   ("the ball pit is slow going", speeds["ball pit"] < speeds["open lane"] * 0.6),
                   ("you crawl in the tunnel", speeds["crawling"] and speeds["tunnel"] < speeds["open lane"] * 0.5)]
        page.evaluate(PLACE, [0, 0, -28.5])
        r = pilot([[0, -45.5, "hop"]], 20)
        print(f"sack race hopping: {r['t']} s, reached z {r['z']:.2f}")
        checks.append(("hopping gets you through the sack race", r["z"] < -45.0 and r["t"] < 14))
        page.evaluate(PLACE, [0, 0, -46.8])
        page.evaluate(f"() => {{ const I = {I}; for (let i = 0; i < I.NB * 3; i++) I.ballOff[i] = 0; }}")
        page.evaluate("() => { window.__fd.LEVELS[24].paused = false; }")
        page.evaluate(PLACE, [0, 0, -51])
        page.wait_for_timeout(600)
        pushed = page.evaluate(f"() => {{ const I = {I}; let m = 0; for (let i = 0; i < I.NB; i++) m = Math.max(m, Math.hypot(I.ballOff[i * 3], I.ballOff[i * 3 + 2])); return +m.toFixed(2); }}")
        page.evaluate("() => { window.__fd.LEVELS[24].paused = true; }")
        print("ball pit: furthest a ball was pushed:", pushed)
        checks.append(("the balls get pushed about", pushed > 0.1))

        # ---------------------------------------------------------------- no way round
        page.evaluate(PLACE, [2.2, 0, -57.8])
        r = pilot([[2.2, -68, "walk"]], 5)
        page.evaluate(PLACE, [2.2, 0, -80.5])
        r2 = pilot([[2.2, -96, "walk"]], 6)
        print(f"walking round the tunnel hill stops at z {r['z']:.2f}; round the tower at z {r2['z']:.2f}")
        checks += [("no way round the tunnel hill", r["z"] > -59), ("no way round the tower", r2["z"] > -83.6)]

        # ---------------------------------------------------------------- monkey bars and the slide
        page.evaluate(PLACE, [0, 0.7, -69.6])
        r = pilot([[0, 0, "bars"]])
        print("monkey bars:", r["log"], f"ended at y {r['y']:.2f} z {r['z']:.2f}")
        checks.append(("swinging along the bars puts you on the far platform", abs(r["y"] - 0.7) < 0.05 and r["z"] < -77.8))
        page.evaluate(PLACE, [0, 0.7, -69.6])
        midway = page.evaluate(f"""() => {{ const fd = window.__fd, I = {I}, P = I.P; I.grabFlat();
          for (let f = 0; f < 120; f++) {{ P.in.fwd = 1; P.in.jump = false; I.step(1 / 60); }}
          const z = fd.dolly.position.z; P.in.fwd = 0; P.in.jump = true; I.step(1 / 60); P.in.jump = false;
          for (let f = 0; f < 90; f++) I.step(1 / 60);
          return {{ letGoAt: +z.toFixed(2), z: +fd.dolly.position.z.toFixed(2), y: +fd.dolly.position.y.toFixed(2) }}; }}""")
        print("letting go over the lava:", midway)
        checks.append(("letting go over the lava sends you back to the start of the bars", midway["letGoAt"] < -71 and midway["z"] > -70.4 and abs(midway["y"] - 0.7) < 0.05))
        page.evaluate(PLACE, [0, 0.35, -80.05])
        r = pilot([[0, -84.5, "walk"], [0, -99, "walk"]], 12)
        print("stairs and slide:", r["log"])
        top = r["log"][0]["at"][1]
        checks += [("the stairs take you up the tower", abs(top - 2.5) < 0.05), ("the slide takes you down past the finish", r["z"] < -97.5)]

        # ---------------------------------------------------------------- VR (simulated headset)
        t = page.evaluate(VR, ["tunnel"])
        print("VR tunnel:", t)
        checks += [("VR: standing up, the tunnel roof stops you", t["standingStopsAt"] > -58.7),
                   ("VR: holding B / Y ducks the view and gets you through", t["duckButton"]["through"] and t["duckButton"]["viewDuckedBy"] > 0.5 and t["duckButton"]["afterY"] >= -0.01),
                   ("VR: really crouching gets you through", t["realCrouch"]["through"])]
        sk = page.evaluate(VR, ["sack"])
        print("VR sack race:", sk)
        checks.append(("VR: really jumping hops you along in the sack", sk["hopped"] > 4 and sk["standingStill"] < 0.3))
        bv = page.evaluate(VR, ["bars"])
        print("VR monkey bars:", bv)
        checks.append(("VR: hand over hand along the bars, onto the far platform without touching the lava", not bv["bars"]["touchedLava"] and abs(bv["bars"]["y"] - 0.7) < 0.05 and bv["bars"]["headZ"] < -77.8))

        # ---------------------------------------------------------------- a full race against the bots
        page.evaluate(f"() => {{ const I = {I}; I.startRace(); I.RACE.startAt = Date.now() - 1; I.RACE.state = 'run'; }}")
        tires = page.evaluate(f"() => {I}.TIRES")
        legs = [[x, z, "exact"] for x, z in SQUARES] + [[0, -14.2, "walk"]]
        legs += [[tires[i * 2 + (i % 2)][0], tires[i * 2 + (i % 2)][1], "walk"] for i in range(12)]
        legs += [[0, -28.6, "walk"], [0, -45.4, "hop"], [0, -57.8, "walk"], [0, -68.2, "walk"], [0, -69.6, "walk"], [0, 0, "bars"],
                 [0, -80.2, "walk"], [0, -84.5, "walk"], [0, -99, "walk"]]
        page.evaluate(f"() => {{ window.__t0 = Date.now(); }}")
        r = pilot(legs)
        race = page.evaluate(f"() => ({{ state: {I}.RACE.state, mine: {I}.RACE.myFinish, bots: {I}.bots.map((b) => [b.name, +b.finishT.toFixed(1)]) }})")
        print(f"full run by the autopilot: {r['t']} s of play; race state {race['state']}; bots finish in {race['bots']}")
        stuck = [l for l in r["log"] if isinstance(l.get("leg"), list) and l["leg"][2] != "bars" and abs(l["at"][2] - l["leg"][1]) > 0.6]
        if stuck: print("legs that didn't arrive:", json.dumps(stuck)[:600])
        checks += [("the autopilot gets round the whole course", r["z"] < -97.5 and not stuck),
                   ("crossing the line finishes the race", race["state"] == "over"),
                   ("the bots are a fair race (slower than a perfect run, under 70 s)", all(r["t"] * 1.15 < t < 70 for _, t in race["bots"]))]

        if D:
            page.evaluate("() => { window.__fd.LEVELS[24].paused = false; }")
            page.evaluate(f"() => {{ const I = {I}; I.startRace(); I.RACE.startAt = Date.now() - 22000; I.RACE.state = 'run'; }}")
            for name, (x, y, z, yaw, pitch) in {"start": (0, 0, 3, 0, -0.15), "hop": (1.5, 0, -2, 0.35, -0.45), "sack": (0, 0, -27, 0, -0.2),
                                                "pit": (0.5, 0, -46, 0, -0.35), "tunnel": (0, 0, -56, 0, -0.1), "bars": (-1.6, 0.7, -68.8, -0.25, 0.05), "slide": (0, 2.5, -85.2, 0, -0.3)}.items():
                page.evaluate(f"() => {{ const fd = window.__fd, P = {I}.P; P.hang = false; fd.dolly.position.set({x}, {y}, {z}); P.vel.set(0, 0, 0); fd.state.yaw = {yaw}; fd.state.pitch = {pitch}; }}")
                page.wait_for_timeout(1500)
                page.screenshot(path=f"{D}/recess-{name}.png")

        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nrecess checks passed" if ok else "\nrecess checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
