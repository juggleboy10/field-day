"""Skyline Sprint physics checks, run against index.html opened with ?test.

1. Stepping stones: jump at each of the starting stones from hundreds of takeoff points (a run-up from
   straight on, from the sides, short and long). A jump may land on the stone or miss it and fall, but it
   must never end up inside the stone.
2. Climbing walls (browser): grab the wall, hold W, and you should end up standing on top.
3. Climbing walls (VR): hanging from the top row of holds, pulling yourself up until your eyes clear the
   top climbs you over.

Usage: python tests/parkour.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

STONES = """
() => {
  const fd = window.__fd, L = fd.LEVELS[16], I = L.parkourInternals, P = L.P, dolly = fd.dolly, st = fd.state;
  const stones = I.SOL.filter((s) => !s.mover && Math.abs(s.x1 - s.x0 - 2.4) < 1e-6 && Math.abs(s.z1 - s.z0 - 2.4) < 1e-6).sort((a, b) => b.z0 - a.z0);
  const res = { jumps: 0, landed: 0, missed: 0, inside: 0, examples: [] };
  const dt = 1 / 60;
  for (let k = 0; k < stones.length; k++) {
    const B = stones[k], fromTop = k === 0 ? 0 : stones[k - 1].y1, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
    for (let lat = -1.7; lat <= 1.7001; lat += 0.1) {
      for (let d = 1.0; d <= 5.6001; d += 0.1) {
        for (const ang of [0, 0.35, -0.35]) {   // straight on, and coming in at an angle
          const yaw = ang, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
          const x0 = cx + lat - fx * d, z0 = B.z1 - fz * d;
          dolly.position.set(x0, fromTop, z0); dolly.rotation.y = 0; st.yaw = yaw;
          P.vel.set(fx * 5.6, 0, fz * 5.6); P.grounded = true; P.support = null; P.zone = null; P.slideT = 0; P.wasHang = false;
          P.fx.speed = P.fx.jump = P.fx.grip = 0; P.jumpPrev = false;
          let out = 'air', bad = null;
          for (let f = 0; f < 150; f++) {
            P.in.fwd = 1; P.in.side = 0; P.in.slide = false; P.in.jump = f === 0;
            I.step(dt, performance.now());
            const x = dolly.position.x, y = dolly.position.y, z = dolly.position.z;
            const inFoot = x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1;
            if (!bad && inFoot && y < B.y1 - 0.05 && y > B.y0) bad = { x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) };
            if (P.grounded && P.support && P.support.ref === B) { out = 'landed'; break; }
            if (y < B.y1 - 1.2) { out = 'missed'; break; }
          }
          res.jumps++;
          if (out === 'landed') res.landed++; else res.missed++;
          if (bad) { res.inside++; if (res.examples.length < 4) res.examples.push({ stone: k, lat: +lat.toFixed(1), d: +d.toFixed(1), ang, at: bad, end: out }); }
        }
      }
    }
  }
  return res;
}
"""

WALL_FLAT = """
() => {
  const fd = window.__fd, L = fd.LEVELS[16], I = L.parkourInternals, P = L.P, dolly = fd.dolly, st = fd.state;
  const out = [];
  for (const Z of I.ZONES.filter((z) => z.kind === 'wall')) {
    dolly.position.set(0, Z.y0 - 0.9, Z.z + 0.9); st.yaw = 0; st.pitch = 0;
    P.vel.set(0, 0, 0); P.grounded = true; P.zone = null; P.in.fwd = 0; P.in.side = 0; P.in.jump = false;
    fd.camera.position.set(0, 1.6, 0); fd.camera.rotation.set(0, 0, 0);
    const grabbed = I.grabFlat();
    let t = 0;
    while (t < 12 && (P.zone || !P.grounded)) { P.in.fwd = 1; I.step(1 / 60, performance.now()); t += 1 / 60; }
    out.push({ wallTop: Z.topY, grabbed, standing: P.grounded, y: +dolly.position.y.toFixed(2), z: +dolly.position.z.toFixed(2), behindWall: dolly.position.z < Z.z - 0.5, seconds: +t.toFixed(1) });
  }
  return out;
}
"""

WALL_VR = """
() => {
  const fd = window.__fd, L = fd.LEVELS[16], I = L.parkourInternals, P = L.P, dolly = fd.dolly;
  const out = [];
  for (const Z of I.ZONES.filter((z) => z.kind === 'wall')) {
    const top = I.HOLDS.filter((h) => h.wall === Z && !h.lip).reduce((m, h) => Math.max(m, h.a.y), -1e9);
    const hold = I.HOLDS.find((h) => h.wall === Z && !h.lip && h.a.y === top);
    const tries = [];
    // eyes 0.4 below the top edge: still hanging; eyes level with the top: over you go
    for (const headY of [Z.topY - 0.4, Z.topY - 0.05]) {
      dolly.position.set(hold.a.x, headY - 1.6, Z.z + 0.45); P.vel.set(0, 0, 0); P.grounded = false;
      P.hand.right.hold = { hold, anchor: hold.a.clone() }; P.hand.left.hold = null;
      const head = { x: hold.a.x, y: headY, z: Z.z + 0.45 };
      const did = I.tryMantle(head);
      tries.push({ headBelowTop: +(Z.topY - headY).toFixed(2), climbedOver: did, feetY: +dolly.position.y.toFixed(2), z: +dolly.position.z.toFixed(2) });
      P.hand.right.hold = null;
    }
    out.push({ wallTop: Z.topY, topRow: top, tries });
  }
  return out;
}
"""


def main():
    page_url = (ROOT / "index.html").as_uri() + "?test"
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1000, "height": 700})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(page_url)
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(16)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(500)

        s = page.evaluate(STONES)
        print(f"stepping stones: {s['jumps']} jumps, {s['landed']} landed, {s['missed']} missed, {s['inside']} ended up inside a stone")
        for e in s["examples"]:
            print("   inside:", e)
        if s["inside"]:
            ok = False

        has_mantle = page.evaluate("() => typeof window.__fd.LEVELS[16].parkourInternals.tryMantle === 'function'")
        for w in page.evaluate(WALL_FLAT):
            good = w["grabbed"] and w["standing"] and w["behindWall"] and abs(w["y"] - w["wallTop"]) < 0.05
            print(f"browser climb, wall top {w['wallTop']}: {'ok' if good else 'FAIL'} {w}")
            ok &= good
        if has_mantle:
            for w in page.evaluate(WALL_VR):
                low, high = w["tries"]
                good = (not low["climbedOver"]) and high["climbedOver"] and abs(high["feetY"] - w["wallTop"]) < 0.05
                print(f"VR climb over, wall top {w['wallTop']} (top row {w['topRow']:.2f}): {'ok' if good else 'FAIL'} {w['tries']}")
                ok &= good
        else:
            print("VR climb over: no tryMantle in this build")
            ok = False
        if errors:
            print("page errors:", errors[:3])
            ok = False
        browser.close()
    print("\nall parkour checks passed" if ok else "\nparkour checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
