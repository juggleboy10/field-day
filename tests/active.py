"""The Get active games: Juggle Jam and Sunrise Workout, run headless with stand-in hands.

Juggling
- in VR, autopilot hands juggle a three-ball cascade (throw, catch, throw) at each speed with no drops
- a dropped ball breaks the streak, rolls back to the table, and the best streak is kept
- in a browser, pressing each hand as its ball lands keeps the cascade going; missing one drops it
Workout
- each session's plan has every move in it, and it lasts about as long as it says
- a body that does every move (punches with the right fists, squats, leans, reaches) scores them all and finishes
- a body that just stands there misses the lot; the wrong fist doesn't count
- calories add up as you go

Usage: python tests/active.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

JUGGLE_VR = """([sp, secs, dropOne]) => {
  const fd = window.__fd, L = fd.LEVELS[26], X = L.jgInternals, J = X.J, V = fd.voice ? null : null;
  const st = fd.state, m0 = st.mode; st.mode = 'vr';
  X.setCount(3); J.sp = sp; X.resetBalls();
  const s = X.SPEEDS[sp].s, A = { left: new THREE.Vector3(J.spotX - 0.22, 1.1, -0.35), right: new THREE.Vector3(J.spotX + 0.22, 1.1, -0.35) };
  const vh = window.__fd.vr || null;
  // stand-in hands: positions, a grip button each, and a motion history for the throw speed
  const H = window.__fd.LEVELS[26].__hands || (window.__fd.LEVELS[26].__hands = {});
  const btn = { left: [{ pressed: true }, { pressed: true }], right: [{ pressed: true }, { pressed: true }] };
  const keep = {};
  const vrH = X.__vr();
  for (const side of ['left', 'right']) { const mh = vrH.myHands[side], h = vrH.vrHands[side]; keep[side] = { src: h.source, hist: h.hist }; mh.ok = true; mh.pos.copy(A[side]); mh.quat.set(0, 0, 0, 1); h.source = { gamepad: { buttons: [btn[side][0], btn[side][1], {}, {}, { pressed: false }] } }; h.hist = []; }
  X.ballsToHands();
  const Fr = 0.62;                               // each throw's flight, in slowed time
  const dtau = Fr / 1.5;                         // a throw every so often, alternating hands (three balls, a cascade)
  const beat = dtau / s;                         // in real seconds
  let now = 1000, next = 0.2, from = 'right', dropped = false, drops = 0; const reopen = { left: 0, right: 0 };
  const dt = 1 / 90;
  for (let t = 0; t < secs; t += dt) {
    now += dt * 1000;
    // throw from the hand whose turn it is: open it, with the speed to land in the other hand
    let opened = null;
    if (t >= next) {
      const to = from === 'right' ? 'left' : 'right', a = A[from], b = A[to];
      const v = new THREE.Vector3().subVectors(b, a).multiplyScalar(1 / Fr); v.y += 9.8 * Fr / 2;
      if (dropOne && !dropped && t > secs / 2) { v.set(1.2, 0.5, 0.8); dropped = true; }
      const h = vrH.vrHands[from]; h.hist = [{ t: now - 50, p: a.clone().addScaledVector(v, -0.05) }, { t: now, p: a.clone() }];
      btn[from][0].pressed = btn[from][1].pressed = false; opened = from; reopen[from] = t + 0.12;
      from = to; next += beat;
    }
    // (the stand-in clock stands in for the real one, so the just-thrown rule sees real time pass)
    X.__clock(now);
    X.__step(dt);
    // close the hand again a moment later, ready for the next catch
    for (const sd of ['left', 'right']) if (reopen[sd] && t >= reopen[sd]) { reopen[sd] = 0; btn[sd][0].pressed = btn[sd][1].pressed = true; }
  }
  for (const side of ['left', 'right']) { vrH.vrHands[side].source = keep[side].src; vrH.vrHands[side].hist = keep[side].hist; }
  const r = { streak: J.streak, catches: J.catches, best: J.best[`3:${sp}`] || 0, rack: X.balls.slice(0, 3).map((b) => b.mode) };
  st.mode = m0; X.resetBalls(); J.catches = 0;
  return r;
}"""


def main():
    ok = True
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 900, "height": 600})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(26)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(1500)
        page.evaluate("() => { window.__fd.LEVELS[26].paused = true; }")

        # ------------------------------------------------ juggling in VR
        for sp in (0, 1, 2):
            r = page.evaluate(JUGGLE_VR, [sp, 20, False])
            print(f"VR cascade at speed {sp}:", r)
            checks.append((f"VR: autopilot hands juggle a three-ball cascade with no drops ({['slow-mo', 'steady', 'real speed'][sp]})", r["streak"] >= 15 and r["streak"] == r["catches"]))
        r = page.evaluate(JUGGLE_VR, [1, 24, True])
        print("VR cascade with one dropped on purpose:", r)
        checks.append(("VR: a drop breaks the streak; the best streak is kept", r["streak"] < r["catches"] and r["best"] >= r["streak"] and r["best"] > 0))
        back = page.evaluate("""() => { const X = window.__fd.LEVELS[26].jgInternals, b = X.balls[0]; X.resetBalls(); b.mode = 'air'; b.pos.set(0, 0.5, -0.5); b.vel.set(0, -2, 0); b.thrown = true;
          for (let i = 0; i < 200; i++) X.physics(1 / 60); return b.mode; }""")
        checks.append(("a dropped ball goes back to the table", back == "rack"))

        # ------------------------------------------------ juggling in a browser
        fl = page.evaluate("""() => { const X = window.__fd.LEVELS[26].jgInternals, J = X.J, FL = X.FL; X.setCount(3); J.sp = 1; X.resetBalls();
          let now = 100000; FL.restartAt = 0; X.flatStep(now);
          const dt = 1000 / 60;
          for (let i = 0; i < 60 * 25; i++) {
            now += dt;
            // press each hand as its ball lands
            for (const fb of FL.balls) { if (fb.state !== 'air') continue; const to = fb.from === 'right' ? 'left' : 'right'; if (Math.abs(now / 1000 - (fb.tThrow + FL.F)) < 0.01) X.flatPress(to, now); }
            X.flatStep(now);
          }
          const good = J.streak;
          // now stop pressing: the next ball is dropped
          for (let i = 0; i < 60 * 4; i++) { now += dt; X.flatStep(now); }
          return { good, after: J.streak, run: FL.run }; }""")
        print("browser cascade:", fl)
        checks += [("browser: pressing each hand as its ball lands keeps the cascade going", fl["good"] >= 30),
                   ("browser: miss one and it's dropped", fl["after"] < fl["good"])]
        page.evaluate("() => { window.__fd.LEVELS[26].paused = false; window.__fd.switchLevel(27); }")
        page.wait_for_timeout(1500)
        page.evaluate("() => { window.__fd.LEVELS[27].paused = true; }")

        # ------------------------------------------------ the workout
        plans = page.evaluate("""() => { const X = window.__fd.LEVELS[27].woInternals; return X.SESSIONS.map((S, si) => { const P = X.makePlan(si);
          const planned = S.rounds.reduce((n, r) => n + r[1], 0) + (S.rounds.length - 1) * 8;
          return { name: S.name, len: Math.round(P.len), planned, total: P.total, moves: [...new Set(P.rounds.map((r) => r.mv))] }; }); }""")
        for pl in plans:
            print("plan", pl)
        checks.append(("every session has its moves and lasts about as long as it says", all(abs(pl["len"] - pl["planned"]) < 8 and all(pl["total"][k] > 0 for k in ("pad",)) for pl in plans) and "reach" in plans[2]["moves"] and "squat" in plans[2]["moves"] and "dodge" in plans[2]["moves"]))

        WORK = """([si, mode]) => {
          const fd = window.__fd, L = fd.LEVELS[27], X = L.woInternals, W = X.W, st = fd.state, m0 = st.mode;
          const vrH = window.__fd.LEVELS[26].jgInternals.__vr();
          st.mode = 'vr'; let t = 0; W.si = si; X.start(); W.clock = () => t; W.H0 = 1.65;
          const keep = {}; for (const s of ['left', 'right']) { keep[s] = vrH.vrHands[s].hist; vrH.myHands[s].ok = true; }
          const P = W.plan, dt = 1 / 72; let nowMs = 5000;
          const baseX = fd.dolly.position.x;
          while (W.st === 'go' && t < P.len + 2) {
            t += dt; nowMs += dt * 1000;
            let headY = 1.65, headX = 0;
            const rest = (s) => { vrH.myHands[s].pos.set(W.spotX + (s === 'left' ? -0.3 : 0.3), 0.9, 0.1); vrH.vrHands[s].hist = []; };
            rest('left'); rest('right');
            if (mode === 'do') {
              for (const o of X.pads) { if (!o.e || Math.abs(t - o.e.t) > 0.03) continue; const s = (o.e.hand ? 'right' : 'left') ; const p = o.g.position.clone(), v = o.e.upper ? new THREE.Vector3(0, 3, 0) : new THREE.Vector3(0, 0, -3);
                vrH.myHands[s].pos.copy(p); vrH.vrHands[s].hist = [{ t: nowMs - 50, p: p.clone().addScaledVector(v, -0.05) }, { t: nowMs, p: p.clone() }]; }
              for (const o of X.bars) if (o.e && Math.abs(o.m.position.z) < 0.5) headY = 1.1;
              for (const o of X.walls) if (o.e && Math.abs(o.m.position.z) < 0.5) headX = o.e.side ? -0.35 : 0.35;
              for (const o of X.stars) if (o.e && Math.abs(t - o.e.t) < 0.2) vrH.myHands[o.side ? 'right' : 'left'].pos.copy(o.m.position);
            } else if (mode === 'wrongfist') {
              for (const o of X.pads) { if (!o.e || Math.abs(t - o.e.t) > 0.03) continue; const s = (o.e.hand ? 'left' : 'right'); const p = o.g.position.clone(), v = new THREE.Vector3(0, 0, -3);
                vrH.myHands[s].pos.copy(p); vrH.vrHands[s].hist = [{ t: nowMs - 50, p: p.clone().addScaledVector(v, -0.05) }, { t: nowMs, p: p.clone() }]; }
            }
            fd.dolly.position.x = baseX + headX; fd.camera.position.set(0, headY, 0); fd.camera.updateMatrixWorld(true);
            X.step(dt);
            if (mode === 'wrongfist' && t > 20) break;
          }
          const r = { st: W.st, result: W.result, hits: W.hits, misses: W.misses, reps: W.reps, kcal: +W.kcal.toFixed(1), total: P.total };
          X.stop('quit'); W.clock = null; st.mode = m0; fd.dolly.position.x = baseX; fd.camera.position.set(0, 1.6, 0);
          for (const s of ['left', 'right']) vrH.vrHands[s].hist = keep[s];
          return r;
        }"""
        full = page.evaluate(WORK, [2, "do"])
        print("doing every move (Full body):", {k: full[k] for k in ("hits", "misses", "reps", "kcal", "total")}, full["result"] and {k: full["result"][k] for k in ("score", "acc", "kcal")})
        checks += [("doing every move scores them all and finishes the workout", full["result"] is not None and full["misses"] == 0 and full["reps"]["punch"] == full["total"]["pad"] and full["reps"]["squat"] == full["total"]["bar"] and full["reps"]["dodge"] == full["total"]["wall"] and full["reps"]["reach"] == full["total"]["stars"]),
                   ("calories add up over a workout", full["kcal"] > 10)]
        idle = page.evaluate(WORK, [0, "idle"])
        print("standing still (Quick burn):", {k: idle[k] for k in ("hits", "misses", "reps")})
        checks.append(("standing still misses every move", idle["hits"] == 0 and idle["misses"] > 30))
        wrong = page.evaluate(WORK, [1, "wrongfist"])
        print("punching with the wrong fists:", {k: wrong[k] for k in ("hits", "misses")})
        checks.append(("the wrong fist doesn't count", wrong["reps"]["punch"] == 0 and wrong["misses"] > 0))
        page.evaluate("() => { window.__fd.LEVELS[27].paused = false; }")

        # ------------------------------------------------ Wall Rush
        page.evaluate("() => { window.__fd.LEVELS[27].paused = false; window.__fd.switchLevel(28); }")
        page.wait_for_timeout(1500)
        page.evaluate("() => { window.__fd.LEVELS[28].paused = true; }")
        WALLS = """([mi, mode]) => {
          const fd = window.__fd, L = fd.LEVELS[28], X = L.wrInternals, R = X.R, st = fd.state, m0 = st.mode;
          const vrH = window.__fd.LEVELS[26].jgInternals.__vr();
          st.mode = mode === 'flat' ? 'flat' : 'vr'; let t = 0; R.mi = mi; X.start(); R.clock = () => t; R.H0 = 1.7;
          const baseX = fd.dolly.position.x, dt = 1 / 60, M = X.MODES[mi], speed = 22 / M.travel;
          const keys = st.keys;
          while (R.st === 'go' && t < R.run.len + 2) {
            t += dt;
            // the next wall to reach you
            const o = X.walls.filter((w) => w.w && !w.judged).sort((a, b) => a.w.t - b.w.t)[0];
            let head = { x: 0, y: 1.7 }, l = { x: -0.25, y: 0.9 }, r = { x: 0.25, y: 0.9 };
            for (const k of ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyF', 'KeyQ', 'KeyR']) keys[k] = false;
            if (o && mode !== 'idle' && o.w.t - t < 0.8) {
              const T = X.poseTargets(o.w.pose, R.H0);
              if (mode === 'flat') {
                const p = o.w.pose;
                if (p.stance === 'squat') keys.ArrowDown = true; if (p.stance === 'lungeL') keys.ArrowLeft = true; if (p.stance === 'lungeR') keys.ArrowRight = true;
                if (p.arms === 'Y') keys.ArrowUp = true; if (p.arms === 'T') keys.KeyF = true; if (p.arms === 'upL') keys.KeyQ = true; if (p.arms === 'upR') keys.KeyR = true;
                // (the browser body eases into the pose; hold it as the real thing would)
                R.flat.squat = keys.ArrowDown ? 1 : 0; R.flat.lean = keys.ArrowRight ? 1 : keys.ArrowLeft ? -1 : 0;
                R.flat.arms = keys.ArrowUp ? 'Y' : keys.KeyF ? 'T' : keys.KeyQ ? 'upL' : keys.KeyR ? 'upR' : 'down';
              } else {
                head = T.head; if (T.l) l = T.l; if (T.r) r = T.r;
              }
            } else if (mode === 'flat') { R.flat.squat = 0; R.flat.lean = 0; R.flat.arms = 'down'; }
            if (mode !== 'flat') {
              fd.dolly.position.x = baseX + head.x; fd.camera.position.set(0, head.y, 0); fd.camera.updateMatrixWorld(true);
              vrH.myHands.left.ok = vrH.myHands.right.ok = true;
              vrH.myHands.left.pos.set(R.spotX + l.x, l.y, -0.1); vrH.myHands.right.pos.set(R.spotX + r.x, r.y, -0.1);
            }
            X.step(dt);
          }
          const res = { st: R.st, fits: R.fits, crashes: R.crashes, walls: R.run.walls.length, score: R.score, result: R.result };
          X.stop('quit'); R.clock = null; st.mode = m0; fd.dolly.position.x = baseX; fd.camera.position.set(0, 1.6, 0);
          for (const k of ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyF', 'KeyQ', 'KeyR']) keys[k] = false;
          return res;
        }"""
        runs = page.evaluate("() => window.__fd.LEVELS[28].wrInternals.MODES.map((M, i) => { const r = window.__fd.LEVELS[28].makeRun(i); return { walls: r.walls.length, combos: r.walls.filter((w) => w.pose.stance !== 'stand' && w.pose.arms !== 'down').length, len: Math.round(r.len) }; })")
        print("wall rush runs:", runs)
        vr_ok = page.evaluate(WALLS, [1, "vr"])
        print("wall rush, striking every pose in VR (Classic):", {k: vr_ok[k] for k in ("fits", "crashes", "walls", "score")})
        idle = page.evaluate(WALLS, [0, "idle"])
        print("wall rush, standing still (Warm-up):", {k: idle[k] for k in ("fits", "crashes", "walls")})
        flat = page.evaluate(WALLS, [2, "flat"])
        print("wall rush, the right keys in a browser (Frenzy):", {k: flat[k] for k in ("fits", "crashes", "walls")})
        checks += [("Wall Rush: warm-up is one move at a time, frenzy is mostly combos, each run a couple of minutes", runs[0]["combos"] == 0 and runs[2]["combos"] > runs[2]["walls"] * 0.4 and all(60 < r["len"] < 200 for r in runs)),
                   ("Wall Rush: striking every pose in VR fits through every wall", vr_ok["fits"] == vr_ok["walls"] and vr_ok["crashes"] == 0),
                   ("Wall Rush: standing still crashes into them", idle["fits"] == 0 and idle["crashes"] == idle["walls"]),
                   ("Wall Rush: in a browser, the right keys fit every wall", flat["fits"] == flat["walls"])]
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nget active checks passed" if ok else "\nget active checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
