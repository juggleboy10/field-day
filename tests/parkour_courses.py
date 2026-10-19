"""Parkour's new courses can be run start to finish, with the real movement code.

An autopilot plays Rooftop Rush and Crane Yard in the browser controls: running and jumping between rooftops,
bouncing off trampolines, climbing walls, sliding, hopping the crumbling tiles, swinging the monkey bars,
leaping between poles, riding the moving pallets, and reaching the finish. Also checks that a crumbling tile
really gives way a moment after you land on it, and that switching courses swaps the pieces.

Usage: python tests/parkour_courses.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

HELPERS = """
  const fd = window.__fd, L = fd.LEVELS[16], I = L.parkourInternals, P = L.P, dolly = fd.dolly, st = fd.state, cam = fd.camera;
  const dt = 1 / 60; let now = performance.now(); const log = [];
  // a game clock for the moving pallets and crumbling tiles, so they move in step with the autopilot
  const realDateNow = Date.now; let fakeT = realDateNow(); Date.now = () => fakeT;
  const tick = () => { now += 1000 / 60; fakeT += 1000 / 60; I.step(dt, now); };
  function waitFor(name, cond, maxT) { for (let t = 0; t < (maxT || 10); t += dt) { if (cond()) return; P.in.fwd = 0; P.in.jump = false; tick(); } throw new Error(`${name}: waited too long`); }
  const aimCam = () => { cam.position.set(0, 1.6, 0); cam.rotation.set(0, st.yaw, 0, 'YXZ'); dolly.updateMatrixWorld(true); };
  const fell = () => dolly.position.y < -5.5;
  function go(name, tf, ty, jz, maxT) {
    let jumped = jz === null;
    for (let t = 0; t < (maxT || 6); t += dt) {
      const [tx, tz] = tf(); const dx = tx - dolly.position.x, dz = tz - dolly.position.z;
      st.yaw = Math.atan2(-dx, -dz); P.in.fwd = Math.hypot(dx, dz) > 0.3 ? 1 : 0; P.in.side = 0; P.in.slide = false;
      P.in.jump = !jumped && dolly.position.z <= jz; if (P.in.jump) jumped = true;
      tick();
      if (P.grounded && Math.abs(dolly.position.y - ty) < 0.08 && Math.hypot(dx, dz) < 1.0) { log.push(name); return true; }
      if (fell()) break;
    }
    throw new Error(`${name}: ended at ${dolly.position.x.toFixed(2)}, ${dolly.position.y.toFixed(2)}, ${dolly.position.z.toFixed(2)}`);
  }
  function climb(name, endZ) {
    aimCam(); if (!I.grabFlat()) throw new Error(`${name}: couldn't grab`);
    for (let t = 0; t < 15 && (P.zone || !P.grounded); t += dt) { P.in.fwd = 1; P.in.jump = false; tick(); if (fell()) break; }
    if (!(P.grounded && dolly.position.z < endZ)) throw new Error(`${name}: ended at ${dolly.position.y.toFixed(2)}, ${dolly.position.z.toFixed(2)}`);
    log.push(name);
  }
  function poleRun(name, poles, land) {
    // jump at the first pole and grab it on the way; then leap from pole to pole; then onto the platform
    let target = 0;
    for (let t = 0; t < 30 && target <= poles.length; t += dt) {
      const [tx, tz] = target < poles.length ? poles[target] : [land[0], land[1]];
      const dx = tx - dolly.position.x, dz = tz - dolly.position.z;
      if (P.zone) {
        // on a pole: climb to a good height, face the next one, and leap
        st.yaw = Math.atan2(-dx, -dz); aimCam();
        P.in.fwd = dolly.position.y < land[2] + 0.3 ? 1 : 0; P.in.jump = false; tick();
        if (dolly.position.y >= land[2] + 0.3) { aimCam(); I.releaseFlat(true); }
        continue;
      }
      st.yaw = Math.atan2(-dx, -dz); P.in.fwd = 1; P.in.side = 0;
      P.in.jump = P.grounded && target < poles.length && Math.hypot(dx, dz) < 4.2; tick();
      if (target < poles.length && !P.grounded && Math.hypot(dx, dz) < 1.3) { aimCam(); if (I.grabFlat() && P.zone && P.zone.kind === 'pole') target++; }
      if (target === poles.length && P.grounded && Math.abs(dolly.position.y - land[2]) < 0.08 && dolly.position.z < land[1] + 2.5) { log.push(name); return; }
      if (fell()) break;
    }
    throw new Error(`${name}: stuck at pole ${target}, ${dolly.position.x.toFixed(2)}, ${dolly.position.y.toFixed(2)}, ${dolly.position.z.toFixed(2)}`);
  }
  function start(i) { I.useCourse(i); dolly.position.set(0, 0, 2); P.vel.set(0, 0, 0); P.grounded = true; P.zone = null; P.cpIdx = 0; P.fx.speed = P.fx.jump = P.fx.grip = 0; P.jumpPrev = false; }
  const finished = () => dolly.position.z < I.C.finishZ && dolly.position.y > I.C.finishY;
  const mx = (z) => { const s = I.SOL.find((q) => q.mover && Math.abs(q.mover.z - z) < 0.01); return (s.x0 + s.x1) / 2; };
"""

ROOFTOP = "() => {" + HELPERS + """
  try {
    start(1);
    go('roof A', () => [0, -12], 0.6, -7.7); go('roof B', () => [-1.5, -20.5], 1.2, -14.7);
    go('trampoline up to the high roof', () => [1.5, -33.5], 3.4, -22.7); go('to the wall', () => [1, -38.9], 3.4, null);
    climb('climb', -40.2); go('slide down', () => [1, -74], 1, null, 12);
    go('tile 1', () => [0, -81.5], 1, -77.7); go('tile 2', () => [2, -86], 1, -82.4); go('tile 3', () => [0, -90.5], 1, -86.9); go('tile 4', () => [2, -95], 1, -91.4);
    go('past the tiles', () => [0, -100.5], 1, -95.9); go('to the bars', () => [0, -105], 1, null);
    climb('monkey bars', -116);
    go('trampoline to the finish', () => [0, -135], 4.6, null, 8);
    return { ok: finished(), log };
  } catch (e) { return { ok: false, log, err: String(e.message || e) }; } finally { Date.now = realDateNow; }
}"""

CRANE = "() => {" + HELPERS + """
  try {
    start(2);
    go('beam', () => [0, -19], 0, null); go('yard', () => [0, -23.5], 0, null);
    const near = (z) => () => Math.abs(mx(z) - dolly.position.x) < 0.6;
    waitFor('wait for pallet 1', near(-27.3)); go('pallet 1', () => [mx(-27.3), -27.3], 0, -23.85);
    waitFor('wait for pallet 2', near(-31.8)); go('pallet 2', () => [mx(-31.8), -31.8], 0, -28.5);
    waitFor('wait for pallet 3', near(-36.3)); go('pallet 3', () => [mx(-36.3), -36.3], 0, -33.0);
    waitFor('wait to jump off', () => Math.abs(dolly.position.x) < 0.8); go('off the pallets', () => [0, -41], 0, -37.5); go('to the wall', () => [0, -43.5], 0, null);
    climb('climb', -44.8); go('to the edge', () => [0, -54], 7, null);
    poleRun('poles', [[1.3, -58.9], [-1.3, -63.4], [1.3, -67.9], [-1.3, -72.4]], [0, -78, 7]);
    go('plank 1', () => [-1.4, -85.5], 7, -81.7); go('plank 2', () => [1.4, -90], 7, -86.4); go('plank 3', () => [-1.4, -94.5], 7, -90.9); go('plank 4', () => [1.4, -99], 7, -95.4);
    go('past the planks', () => [0, -104], 7, -99.9);
    go('slide down', () => [0, -137], 0.2, null, 12);
    go('trampoline to the finish', () => [0, -150], 3.8, null, 8);
    return { ok: finished(), log };
  } catch (e) { return { ok: false, log, err: String(e.message || e) }; } finally { Date.now = realDateNow; }
}"""


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 900, "height": 560})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(16)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(1200)
        page.evaluate("() => { window.__fd.LEVELS[16].update = () => {}; }")   # keep the real frames out of the way
        names = page.evaluate("() => window.__fd.LEVELS[16].parkourInternals.COURSES.map((c) => c.name)")
        roof = page.evaluate(ROOFTOP)
        crane = page.evaluate(CRANE)
        # a crumbling tile gives way about two thirds of a second after you land on it, and comes back later
        page.evaluate("() => { const I = window.__fd.LEVELS[16].parkourInternals; I.useCourse(1); const s = I.SOL.find((q) => q.crumble); window.__tile = s; s.fallAt = Date.now() + 650; }")
        page.wait_for_timeout(1200)
        tile = page.evaluate("() => { const I = window.__fd.LEVELS[16].parkourInternals; I.step(1 / 60, performance.now()); return { down: !!window.__tile.down }; }")
        # switching course shows only that course's pieces
        vis = page.evaluate("() => { const I = window.__fd.LEVELS[16].parkourInternals; I.useCourse(2); return I.COURSES.map((c) => c.g.visible); }")
        browser.close()
    print("courses:", names)
    print("Rooftop Rush:", roof)
    print("Crane Yard:", crane)
    print("crumbling tile after a second:", tile, " visible groups on course 3:", vis)
    checks = [
        ("three courses", len(names) == 3),
        ("Rooftop Rush can be run start to finish", roof["ok"]),
        ("Crane Yard can be run start to finish", crane["ok"]),
        ("a crumbling tile gives way", tile["down"]),
        ("only the chosen course is shown", vis == [False, False, True]),
    ]
    ok = not errors
    for label, good in checks:
        print(("PASS " if good else "FAIL ") + label)
        ok = ok and good
    if errors:
        print("page errors:", errors[:5])
    print("parkour course checks passed" if ok else "parkour course checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
