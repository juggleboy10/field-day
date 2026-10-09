"""Checks for a batch of fixes from playing (October 2026).

- Recess Rush: past the finish there's a Race again button (it starts a new race from the start line) and a kiosk
- Soccer: the kiosk and settings are on a sideline strip off the pitch, reached only through a gap in the boards
- Pickleball: putting the paddle down and picking it up again carries on the same game (it used to restart it);
  in VR the paddle needs a long squeeze to put down
- Cornhole: a new game starting while you hold your bag no longer skips your first throw; bags spin in the air
- Soccer goals are bigger; laser tag beams run from the blaster to the hit (they were drawn backwards)

Usage: python tests/fixes.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")


def main():
    ok = True
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1000, "height": 640})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.locator("#btn-flat").click()
        page.wait_for_timeout(800)

        # ---------------------------------------------------------------- recess: race again from the finish
        page.evaluate("() => window.__fd.switchLevel(24)")
        page.wait_for_timeout(1200)
        r = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[24], I = L.recessInternals;
          const btn = L.buttons.find((b) => b.plate && b.label === 'Race again');
          const kiosks = L.buttons.filter((b) => b.label === 'Go back').map((b) => +b.pos.z.toFixed(1));
          fd.dolly.position.set(0, 0, -99); const id0 = I.RACE.id;
          I.RACE.state = 'over'; I.RACE.id -= 5;
          pressButton(btn, performance.now() + 1e7);
          return { found: !!btn, z: btn && +btn.pos.z.toFixed(1), kiosks, state: I.RACE.state, newRace: I.RACE.id > id0 - 5, backAt: +fd.dolly.position.z.toFixed(1) }; }""".replace("pressButton(btn", "btn.onPress(btn"))
        print("recess, past the finish:", r)
        checks += [("recess: a Race again button past the finish starts a new race from the start", r["found"] and r["z"] < -97.5 and r["state"] == "count" and r["backAt"] > 1),
                   ("recess: a clubhouse kiosk past the finish too", any(z < -97.5 for z in r["kiosks"]))]

        # ---------------------------------------------------------------- soccer: the sideline
        page.evaluate("() => window.__fd.switchLevel(5)")
        page.wait_for_timeout(1200)
        s = page.evaluate("""() => { const L = window.__fd.LEVELS[5];
          const walk = (x, z, tx, tz) => { let p = { x, z }; for (let i = 0; i < 600; i++) { const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d < 0.05) break; const s = Math.min(0.05, d); const q = { x: p.x + dx / d * s, z: p.z + dz / d * s }; const c = L.clampPlayer(q); p = { x: q.x + c[0], z: q.z + c[1] }; } return [+p.x.toFixed(2), +p.z.toFixed(2)]; };
          const onPitch = L.buttons.filter((b) => Math.abs(b.pos.x) < 13 && Math.abs(b.pos.z) < 20).map((b) => b.label);
          return { onPitch, throughBoards: walk(-10, 0, -14.5, 0), throughGap: walk(-10, 11.5, -14.5, 11.5), toKiosk: walk(-14.4, 11.5, -14.4, 14.5), backThroughBoards: walk(-14.4, 0, -10, 0) }; }""")
        print("soccer sideline:", s)
        checks += [("soccer: no buttons or kiosk on the pitch", not s["onPitch"]),
                   ("soccer: the boards stop you, both ways", s["throughBoards"][0] > -13 and s["backThroughBoards"][0] < -13),
                   ("soccer: the gap lets you out to the sideline and along to the kiosk", s["throughGap"][0] < -14 and s["toKiosk"][1] > 14)]

        # ---------------------------------------------------------------- pickleball: picking the paddle back up carries on
        page.evaluate("() => window.__fd.switchLevel(15)")
        page.wait_for_timeout(1200)
        pk = page.evaluate("""() => { const L = window.__fd.LEVELS[15], PB = L.pb, I = PB.internals;
          I.takeSide(0); PB.score = [4, 2]; PB.ph = 'dead';
          const before = PB.score.slice();
          I.leaveCourt(); I.takeSide(0);
          const kept = PB.score.slice();
          const long = I.paddles.every((t) => t.holdToDrop >= 500);
          // after a finished game, taking a side starts a fresh one
          PB.winner = 0; I.leaveCourt(); I.takeSide(0);
          return { before, kept, fresh: PB.score.slice(), long }; }""")
        print("pickleball:", pk)
        checks += [("pickleball: putting the paddle down and picking it up keeps the score", pk["kept"] == pk["before"]),
                   ("pickleball: after a finished game you get a fresh one", pk["fresh"] == [0, 0]),
                   ("pickleball: in VR the paddle needs a long squeeze to put down", pk["long"])]

        # ---------------------------------------------------------------- cornhole: first throw, and spin
        page.evaluate("() => window.__fd.switchLevel(20)")
        page.wait_for_function("() => window.__fd.LEVELS[20].ch.RS.ph === 'play'", timeout=20000)
        page.wait_for_timeout(1200)
        page.keyboard.press("KeyE")
        page.wait_for_timeout(600)
        g0 = page.evaluate("() => window.__fd.LEVELS[20].ch.RS.game")
        page.evaluate("() => { const c = window.__fd.LEVELS[20].ch; c.RS.ph = 'over'; c.H.phaseT = -1e9; }")
        page.wait_for_function(f"() => window.__fd.LEVELS[20].ch.RS.game > {g0}", timeout=20000)
        page.wait_for_timeout(1200)
        page.keyboard.press("KeyE")
        page.wait_for_timeout(600)
        first = page.evaluate("() => { const c = window.__fd.LEVELS[20].ch; return { turn: c.RS.turn, held: !!window.__fd.state.held }; }")
        print("cornhole, first throw of a game started while holding a bag:", first)
        checks.append(("cornhole: a game starting while you hold your bag doesn't skip your first throw", first["turn"] == 0 and first["held"]))
        # a bag in flight spins
        spin = page.evaluate("""() => { const L = window.__fd.LEVELS[20], b = L.bags[3];
          if (window.__fd.state.held) { const h = window.__fd.state.held.obj; h.held = null; window.__fd.state.held = null; }
          b.held = null; b.pos.set(0.5, 1.2, 3); b.vel.set(0, 3, -5); b.sleeping = false; b.data = { thrownAt: 1 };
          const yaws = []; const e = new THREE.Euler();
          for (let f = 0; f < 4; f++) { L.update(1 / 30, performance.now()); e.setFromQuaternion(b.mesh.quaternion, 'YXZ'); yaws.push(+e.y.toFixed(2)); b.pos.addScaledVector(b.vel, 1 / 30); }
          return yaws; }""")
        print("a thrown bag's heading over four frames:", spin)
        checks.append(("cornhole: bags spin in the air", len(set(spin)) == 4))

        # ---------------------------------------------------------------- soccer goals: bigger; laser tag: the beam goes where you shot
        page.evaluate("() => window.__fd.switchLevel(5)")
        page.wait_for_timeout(1000)
        gw = page.evaluate("() => window.__fd.LEVELS[5].socInternals.GW")
        checks.append(("soccer: the goals are wider (8 m or more)", 2 * gw >= 8))
        page.evaluate("() => window.__fd.switchLevel(4)")
        page.wait_for_timeout(1200)
        bm = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[4]; L.paused = true;
          fd.dolly.position.set(-4, 0, 9); fd.camera.rotation.set(-0.08, 0.25, 0, 'YXZ'); fd.state.yaw = 0.25; fd.state.pitch = -0.08; fd.camera.updateMatrixWorld(true);
          L.me.tagged = false; L.me.cool = 0; L.ltInternals.fire(performance.now());
          const b = L.ltInternals.beams[L.ltInternals.beams.length - 1], m = b.m; m.updateMatrixWorld(true); m.geometry.computeBoundingBox();
          const bb = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld), c = new THREE.Vector3(); bb.getCenter(c);
          const mid = m.position.clone().add(b.spark.position).multiplyScalar(0.5);
          L.paused = false; return { off: +c.distanceTo(mid).toFixed(2), len: +m.position.distanceTo(b.spark.position).toFixed(2) }; }""")
        print("laser tag beam: its middle is", bm["off"], "m from halfway between the muzzle and the hit; length", bm["len"])
        checks.append(("laser tag: the beam runs from the blaster to where it hits (not backwards)", bm["off"] < 0.1 and bm["len"] > 1))
        # ---------------------------------------------------------------- dodgeball reach; pop-a-shot walls
        page.evaluate("() => window.__fd.switchLevel(17)")
        page.wait_for_timeout(1500)
        page.evaluate("() => { const fd = window.__fd, L = fd.LEVELS[17]; fd.dolly.position.set(0, 0, L.me.team === 0 ? 5 : -5); }")
        page.wait_for_timeout(800)
        db = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[17], I = L.dbInternals; I.RS.st = 'play'; L.me.out = false;
          const b = I.balls[0]; b.held = null; b.dbCarrier = null;
          const head = new THREE.Vector3(); fd.camera.getWorldPosition(head);
          b.pos.set(head.x + 2.2, b.r, head.z); const far = L.autoGrab();
          b.pos.set(head.x + 0.7, b.r, head.z); const near = L.autoGrab();
          return { range: L.grabRange, far: !!far, near: !!near }; }""")
        print("dodgeball reach:", db)
        checks += [("dodgeball: a ball 2 m away can't be grabbed", db["range"] <= 1.6 and not db["far"]), ("dodgeball: one at your feet can", db["near"])]
        page.evaluate("() => window.__fd.switchLevel(8)")
        page.wait_for_timeout(1200)
        pop = page.evaluate("""() => { const L = window.__fd.LEVELS[8], I = L.popInternals, c = L.pops[0];
          const walk = (x, z, tx, tz) => { let p = { x, z }; for (let i = 0; i < 400; i++) { const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d < 0.05) break; const s = Math.min(0.05, d); const q = { x: p.x + dx / d * s, z: p.z + dz / d * s }; const cc = L.clampPlayer(q); p = { x: q.x + cc[0], z: q.z + cc[1] }; } return p.z; };
          const b = c.balls[0]; b.held = null; b.pos.set(c.x, 1.6, 16.6); b.vel.set(6, 0, 0); b.sleeping = false; let bounced = false;
          for (let f = 0; f < 20; f++) { I.popCollide(b, 1 / 60); b.pos.addScaledVector(b.vel, 1 / 60); if (b.vel.x < 0) bounced = true; }
          return { reached: +walk(c.x, 14.5, c.x, 17.2).toFixed(2), bounced, inside: Math.abs(b.pos.x - c.x) < I.WALL_X }; }""")
        print("pop-a-shot:", pop)
        checks += [("pop-a-shot: you can't walk up between the rack and the hoop", pop["reached"] <= 15.31),
                   ("pop-a-shot: the ball bounces off the side walls", pop["bounced"] and pop["inside"])]
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nfix checks passed" if ok else "\nfix checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
