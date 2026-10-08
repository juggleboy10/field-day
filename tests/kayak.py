"""Whitewater Rapids: checks the kayak physics and the race, against index.html opened with ?test.

- paddling (W) carries you downstream faster than drifting; A turns left and D turns right
- a VR blade dragged back through the water pushes the boat forward and turns it away from that side
- the boat never ends up inside a rock or past a bank, even driven straight at them
- an autopilot paddling the whole river gets to the finish, at a pace close to the bots'
- a race counts down, runs, and finishes with a time and a place; paddling through an arch goes to the clubhouse

Usage: python tests/kayak.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

SETUP = """
() => {
  const fd = window.__fd, L = fd.LEVELS[19], I = L.kayakInternals;
  window.__k = { fd, L, I, K: I.K, keys: fd.state.keys,
    run(sec, keys, each) {
      const dt = 1 / 60, K = this.K;
      for (const k in this.keys) this.keys[k] = false;
      Object.assign(this.keys, keys || {});
      let t = 0;
      for (; t < sec; t += dt) { if (each && each(t) === false) break; this.I.step(dt / 2, performance.now()); this.I.step(dt / 2, performance.now()); }
      for (const k in this.keys) this.keys[k] = false;
      return t;
    } };
  return true;
}
"""

PHYSICS = """
() => {
  const k = window.__k, K = k.K, I = k.I, R = k.L.river;
  const out = {};
  // drifting vs paddling, ten seconds from the same spot
  I.placeAt(40, 0); k.run(10); out.drift = +(K.s - 40).toFixed(1);
  I.placeAt(40, 0); k.run(10, { KeyW: true }); out.paddle = +(K.s - 40).toFixed(1);
  // turning
  I.placeAt(30, 0); const y0 = K.yaw; k.run(1, { KeyA: true }); out.turnA = +(K.yaw - y0).toFixed(2);
  I.placeAt(30, 0); const y1 = K.yaw; k.run(1, { KeyD: true }); out.turnD = +(K.yaw - y1).toFixed(2);
  // a VR blade: on your left, pulled back at 2 m/s, in the water
  I.placeAt(60, 0);
  const fx = -Math.sin(K.yaw), fz = -Math.cos(K.yaw), f = new THREE.Vector3(fx, 0, fz), r = new THREE.Vector3(-fz, 0, fx);
  const u = new THREE.Vector3(0, 0, 0), res = [0, 0, 0], dt = 1 / 60;
  const pos = new THREE.Vector3(K.x - r.x * 0.9, K.y - 0.1, K.z - r.z * 0.9), prev = pos.clone().addScaledVector(f, 2 * dt);
  const wet = I.bladeForce(pos, prev, dt, f, r, u, res);
  out.leftBlade = { wet, forward: +res[0].toFixed(2), turn: +res[2].toFixed(2) };
  const pos2 = new THREE.Vector3(K.x + r.x * 0.9, K.y - 0.1, K.z + r.z * 0.9), prev2 = pos2.clone().addScaledVector(f, 2 * dt);
  I.bladeForce(pos2, prev2, dt, f, r, u, res);
  out.rightBlade = { forward: +res[0].toFixed(2), turn: +res[2].toFixed(2) };
  const dry = new THREE.Vector3(pos.x, K.y + 0.4, pos.z);
  out.dryBlade = I.bladeForce(dry, prev, dt, f, r, u, res);
  // straight at every rock, paddling hard: how deep does the hull ever get?
  let worstRock = 0, worstBank = 0;
  for (const rock of I.ROCKS) {
    I.placeAt(rock.s - 9, rock.lat);
    k.run(6, { KeyW: true }, () => {
      const hx = -Math.sin(K.yaw), hz = -Math.cos(K.yaw);
      for (const off of [1.25, 0, -1.25]) { const d = Math.hypot(K.x + hx * off - rock.x, K.z + hz * off - rock.z); worstRock = Math.max(worstRock, rock.r + 0.36 - d); }
      const lim = R.W[K.i] / 2; worstBank = Math.max(worstBank, Math.abs(K.lat) - lim);
    });
  }
  out.rocks = I.ROCKS.length; out.deepestIntoRock = +worstRock.toFixed(2);
  // and into the banks, turning hard both ways
  for (const s of [50, 120, 180, 260, 330]) for (const key of ['KeyA', 'KeyD']) {
    I.placeAt(s, 0); k.run(5, { KeyW: true, [key]: true }, () => { worstBank = Math.max(worstBank, Math.abs(K.lat) - R.W[K.i] / 2); });
  }
  out.pastBank = +worstBank.toFixed(2);
  return out;
}
"""

COURSE = """
() => {
  // an autopilot that follows the first bot's line and paddles the whole way
  const k = window.__k, K = k.K, I = k.I, b = I.bots[0];
  I.placeAt(I.START_S - 3, 0);
  let stuck = 0, lastS = K.s, worstLag = 0;
  const t = k.run(400, {}, (t) => {
    const i = Math.min(b.line.length - 1, K.i + 6), want = b.line[i];
    const R = k.L.river, j = i, ty = Math.atan2(-R.T[j].x, -R.T[j].z);
    let dy = ty - K.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    const steer = Math.max(-1, Math.min(1, -dy * 2.2 + (K.lat - want) * 0.35));
    k.keys.KeyW = true; k.keys.KeyA = steer < -0.25; k.keys.KeyD = steer > 0.25;
    if (t > 1 && Math.floor(t * 60) % 120 === 0) { if (K.s - lastS < 0.5) stuck++; lastS = K.s; }
    return K.s < I.FINISH_S;
  });
  return { finished: K.s >= I.FINISH_S, seconds: +t.toFixed(1), stuckChecks: stuck, bots: I.bots.map((x) => +(x.finishT / 1000).toFixed(1)) };
}
"""


def main():
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
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(19)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(500)
        page.evaluate(SETUP)

        ph = page.evaluate(PHYSICS)
        print("physics:", ph)
        checks = [
            ("paddling beats drifting", ph["paddle"] > ph["drift"] * 1.4),
            ("A turns left, D turns right", ph["turnA"] > 0.3 and ph["turnD"] < -0.3),
            ("a left blade pulled back pushes forward and turns right", ph["leftBlade"]["wet"] and ph["leftBlade"]["forward"] > 1 and ph["leftBlade"]["turn"] < 0),
            ("a right blade turns left", ph["rightBlade"]["forward"] > 1 and ph["rightBlade"]["turn"] > 0),
            ("a blade out of the water does nothing", ph["dryBlade"] is False),
            ("never more than 5 cm into a rock", ph["deepestIntoRock"] < 0.05),
            ("never past a bank", ph["pastBank"] < 0.05),
        ]
        co = page.evaluate(COURSE)
        print("course:", co)
        checks += [
            ("an autopilot paddles to the finish", co["finished"]),
            ("it never gets stuck", co["stuckChecks"] == 0),
            ("its time is close to the bots'", 0.6 * min(co["bots"]) < co["seconds"] < 1.4 * max(co["bots"])),
        ]

        # a real race: countdown, run, finish
        page.evaluate("() => { const k = window.__k; k.I.startRace(); }")
        page.wait_for_timeout(4600)
        st = page.evaluate("() => window.__k.L.race.state")
        bots_vis = page.evaluate("() => window.__k.I.bots.filter((b) => b.kay.g.visible).length")
        fin = page.evaluate("""() => { const k = window.__k, I = k.I; I.placeAt(I.FINISH_S - 4, 0); k.run(10, { KeyW: true }, () => k.L.race.state !== 'over');
          const rows = I.standings(); return { state: k.L.race.state, finish: k.L.race.myFinish, place: rows.findIndex((r) => r.me) + 1, racers: rows.length }; }""")
        print(f"race: countdown -> {st}, {bots_vis} bots racing, then {fin}")
        checks += [("the race starts after the countdown", st == "run"), ("three bots race you", bots_vis == 3),
                   ("crossing the line finishes the race", fin["state"] == "over" and fin["finish"] > 0 and fin["racers"] == 4)]

        # paddle through the start pool's arch
        lv = page.evaluate("""() => { const k = window.__k, I = k.I; k.L.archCool = 0; I.placeAt(I.ARCHES[0].s + 1.2, I.ARCHES[0].lat); k.run(1, { KeyS: true }, () => window.__fd.state.level === 19); return window.__fd.state.level; }""")
        print("after paddling through the arch, level:", lv)
        checks.append(("the arch goes to the clubhouse", lv == 8))

        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nkayak checks passed" if ok else "\nkayak checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
