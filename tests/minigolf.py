"""Mini golf's fun holes, run through the real ball physics (no rendering needed).

- the windmill: a putt through the door goes in when the blades are clear and bounces back when one is down
- Big Mouth: the little middle mouth drops you by the cup; the right one sends you back toward the tee
- the loop: hard enough goes round; too soft rolls back
- moles: one that's up is in the way, one that's down isn't
- the duck pond: a splash costs a stroke and puts you back where you putted from
- Shark Jump: a firm putt clears the pool, a soft one splashes
- Birdie Bea can play every new hole (and never putts into the water on purpose)

Usage: python tests/minigolf.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

# roll a ball from (lx, lz) on hole i with velocity (vx, vz), with a game clock starting at t0 (ms); report what happened
ROLL = """([i, lx, lz, vx, vz, t0, maxS]) => {
  const L = window.__fd.LEVELS[6], I = L.mgInternals, H = I.HOLES[i];
  const b = { x: H.x + lx, z: H.z + lz, vx, vz, lipped: false, sink: 0, fromX: H.x + lx, fromZ: H.z + lz, vis: null };
  let ev = 'moving', now = t0, minZ = 99, maxZ = -99, visKinds = [];
  const cb = { sink: () => { ev = 'sunk'; }, rest: () => { ev = 'rest'; }, water: () => { ev = 'water'; } };
  for (let k = 0; k < (maxS || 12) * 240 && ev === 'moving'; k++) {
    now += 1000 / 240; I.ballStep(1 / 240, now, b, H, cb);
    if (b.vis && !visKinds.includes(b.vis.k)) visKinds.push(b.vis.k);
    minZ = Math.min(minZ, b.z - H.z); maxZ = Math.max(maxZ, b.z - H.z);
  }
  return { ev, x: +(b.x - H.x).toFixed(2), z: +(b.z - H.z).toFixed(2), minZ: +minZ.toFixed(2), maxZ: +maxZ.toFixed(2), vis: visKinds,
           cup: +Math.hypot(b.x - H.x - H.cup[0], b.z - H.z - H.cup[1]).toFixed(2) };
}"""


def main():
    port = 8000 + os.getpid() % 1000
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    ok = True
    checks = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
            page = browser.new_page(viewport={"width": 900, "height": 600})
            if THREE_JS:
                page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
            for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
                page.route(pat, lambda r: r.abort())
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{port}/index.html?test")
            page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
            page.evaluate("() => window.__fd.switchLevel(6)")
            page.locator("#btn-flat").click()
            page.wait_for_timeout(1200)
            names = page.evaluate("() => window.__fd.LEVELS[6].mgInternals.HOLES.map((h) => h.name)")
            print("holes:", names)
            idx = {n: i for i, n in enumerate(names)}
            roll = lambda *a: page.evaluate(ROLL, list(a))

            # the windmill: find a moment with the door clear, and one with a blade down
            wm = idx["Windmill"]
            clear_t, block_t = page.evaluate("""(i) => { const I = window.__fd.LEVELS[6].mgInternals, f = I.HOLES[i].feats[0];
              let c = -1, b = -1; for (let t = 0; t < 20000 && (c < 0 || b < 0); t += 10) { if (I.millBlocked(f, t)) { if (b < 0) b = t; } else if (c < 0 && !I.millBlocked(f, t + 900)) c = t; } return [c, b]; }""", wm)
            # (the ball takes a moment to reach the door, so start the clock so it gets there at the chosen time)
            go = roll(wm, 0, 1.0, 0, -2.4, clear_t, 8)
            blocked = roll(wm, 0, 0.55, 0, -2.4, block_t - 90, 8)
            print("windmill, door clear:", go, " blade down:", blocked)
            checks += [("windmill: through the door when the blades are clear", go["minZ"] < -1.0),
                       ("windmill: a blade down at the door sends it back", blocked["minZ"] > -0.6 and blocked["z"] > 0.2)]

            # Big Mouth
            bm = idx["Big Mouth"]
            mid = roll(bm, 0, 2.5, 0, -2.5, 1000, 10)
            right = roll(bm, 0.85, 2.5, 0, -2.5, 1000, 10)
            print("Big Mouth, middle mouth:", mid, " right mouth:", right)
            checks += [("Big Mouth: the middle mouth drops you by the cup", "tube" in mid["vis"] and (mid["ev"] == "sunk" or mid["cup"] < 1.0)),
                       ("Big Mouth: the right mouth sends you back toward the tee", "tube" in right["vis"] and right["z"] > 2.0)]

            # the loop
            lp = idx["Loop-de-loop"]
            fast = roll(lp, 0, 2.6, 0, -3.6, 1000, 10)
            slow = roll(lp, 0, 1.6, 0, -1.4, 1000, 10)
            print("loop, firm:", fast, " soft:", slow)
            checks += [("loop: a firm putt goes round the loop and on down the hole", "loop" in fast["vis"] and fast["minZ"] < -1.0),
                       ("loop: a soft one rolls back", "loop" not in slow["vis"] and slow["minZ"] > 0.8 and slow["z"] > 0.9)]

            # moles
            mp = idx["Mole Patrol"]
            mole = page.evaluate("""(i) => { const I = window.__fd.LEVELS[6].mgInternals, f = I.HOLES[i].feats[1]; let up = -1, down = -1;
              for (let t = 0; t < 20000 && (up < 0 || down < 0); t += 10) { const u = I.moleUp(f, t) && I.moleUp(f, t + 600), d = !I.moleUp(f, t) && !I.moleUp(f, t + 600); if (u && up < 0) up = t; if (d && down < 0) down = t; } return { up, down, c: f.c }; }""", mp)
            hitUp = roll(mp, mole["c"][0], mole["c"][1] + 0.8, 0, -2.0, mole["up"], 3)
            hitDown = roll(mp, mole["c"][0], mole["c"][1] + 0.8, 0, -2.0, mole["down"], 3)
            print("mole up:", hitUp, " mole down:", hitDown)
            checks += [("moles: one that's up is in the way", hitUp["minZ"] > mole["c"][1] - 0.05),
                       ("moles: one that's down lets it roll over", hitDown["minZ"] < mole["c"][1] - 0.3)]

            # the duck pond, played as you (a penalty, back to where you putted from)
            pond = page.evaluate("""(i) => { const fd = window.__fd, L = fd.LEVELS[6], I = L.mgInternals; L.paused = true;
              I.goToHole(i); const H = I.HOLES[i], f = H.feats.find((q) => q.t === 'pond');
              I.B.x = H.x + f.c[0]; I.B.z = H.z + f.c[1] + 0.9; I.strike(0, -1, 2.2, performance.now());
              const from = [I.B.fromX, I.B.fromZ], s0 = I.me.strokes; let now = performance.now();
              for (let k = 0; k < 600 && I.me.phase === 'moving'; k++) { now += 1000 / 120; I.ballStep(1 / 120, now); }
              const r = { strokes: I.me.strokes - s0, back: Math.hypot(I.B.x - from[0], I.B.z - from[1]) < 0.01, phase: I.me.phase };
              I.goToHole(0); L.paused = false; return r; }""", mp)
            print("into the duck pond:", pond)
            checks.append(("duck pond: a splash costs one penalty stroke and puts you back where you putted from", pond["strokes"] == 1 and pond["back"]))

            # Shark Jump
            sj = idx["Shark Jump"]
            firm = roll(sj, 0, 3.6, 0, -5.6, 1000, 10)
            soft = roll(sj, 0, 3.6, 0, -4.1, 1000, 10)
            print("shark jump, firm:", firm, " soft:", soft)
            checks += [("Shark Jump: a firm putt flies the pool and lands beyond it", "jump" in firm["vis"] and firm["ev"] != "water" and firm["minZ"] < -0.5),
                       ("Shark Jump: a soft one splashes", soft["ev"] == "water")]

            # Birdie Bea plays each new hole with her planner and the same physics (with her usual human error)
            bea = page.evaluate("""(names) => { const L = window.__fd.LEVELS[6], I = L.mgInternals, P = L.beaInternals;
              const out = {};
              for (const n of names) {
                const i = I.HOLES.findIndex((h) => h.name === n), H = I.HOLES[i]; let strokes = 0, wet = 0, sunk = false, now = 5000;
                const b = { x: H.x + H.tee[0], z: H.z + H.tee[1], vx: 0, vz: 0, lipped: false, sink: 0, vis: null };
                const beaBall = L.bea.ball;
                while (!sunk && strokes < 6) {
                  Object.assign(beaBall, { x: b.x, z: b.z, vx: 0, vz: 0, lipped: false });
                  const p = P.planPutt(H, now); strokes++;
                  b.fromX = b.x; b.fromZ = b.z; b.vx = Math.cos(p.a) * p.sp; b.vz = Math.sin(p.a) * p.sp; b.vis = null;
                  let ev = '';
                  const cb = { sink: () => { ev = 'sunk'; }, rest: () => { ev = 'rest'; }, water: () => { ev = 'water'; } };
                  for (let k = 0; k < 3000 && !ev; k++) { now += 1000 / 240; I.ballStep(1 / 240, now, b, H, cb); }
                  if (ev === 'sunk') sunk = true; if (ev === 'water') { wet++; strokes++; b.x = b.fromX; b.z = b.fromZ; }
                  now += 3000;
                }
                out[n] = { strokes, sunk, wet };
              }
              return out; }""", ["Windmill", "Big Mouth", "Loop-de-loop", "Mole Patrol", "Shark Jump"])
            print("Birdie Bea (no human error):", bea)
            checks.append(("Birdie Bea can get round every new hole", all(r["sunk"] and r["strokes"] <= 5 for r in bea.values())))

            for name, good in checks:
                print(f"{'ok  ' if good else 'FAIL'}  {name}")
                ok &= bool(good)
            if errors:
                print("page errors:", errors[:3]); ok = False
            browser.close()
    finally:
        server.terminate()
    print("\nmini golf checks passed" if ok else "\nmini golf checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
