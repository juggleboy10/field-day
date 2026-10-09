"""Checks for a batch of fixes from playing (October 2026).

- Recess Rush: past the finish there's a Race again button (it starts a new race from the start line) and a kiosk
- Soccer: the kiosk and settings are on a sideline strip off the pitch, reached only through a gap in the boards
- Pickleball: putting the paddle down and picking it up again carries on the same game (it used to restart it);
  in VR the paddle needs a long squeeze to put down
- Cornhole: a new game starting while you hold your bag no longer skips your first throw; bags spin in the air
- Pop-a-shot: a return ramp under the hoop rolls balls back to the tray
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
        # pickleball: spin bends the ball; aimed shots with spin still land on target; Daisy reacts late and moves at a human pace
        sp = page.evaluate("""() => { const PB = window.__fd.LEVELS[15].pb, I = PB.internals;
          const fly = (w) => { const p = { x: -5, y: 1, z: 0, vx: 10, vy: 2.5, vz: 0, wx: w[0], wy: w[1], wz: w[2] }; for (let k = 0; k < 1200 && p.y > 0.037; k++) { I.airStep(p, 1 / 240, Math.hypot(p.vx, p.vy, p.vz)); p.x += p.vx / 240; p.y += p.vy / 240; p.z += p.vz / 240; } return [+p.x.toFixed(2), +p.z.toFixed(2)]; };
          const land = (v) => { const p = { x: -5, y: 1, z: 0, ...v }; for (let k = 0; k < 1200 && p.y > 0.037; k++) { I.airStep(p, 1 / 240, Math.hypot(p.vx, p.vy, p.vz)); p.x += p.vx / 240; p.y += p.vy / 240; p.z += p.vz / 240; } return Math.hypot(p.x - 4.5, p.z - 1); };
          const err = [[0, 0, -0.8], [0, 0, 0.7], [0, 0.8, 0]].map((w) => +land(I.aimed({ x: -5, y: 1, z: 0 }, 4.5, 1, 10, w)).toFixed(2));
          return { flat: fly([0, 0, 0]), top: fly([0, 0, -0.8]), back: fly([0, 0, 0.7]), left: fly([0, 0.8, 0]), err }; }""")
        page.evaluate("() => { const fd = window.__fd, I = fd.LEVELS[15].pb.internals, t = I.paddles[0]; fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }")
        page.wait_for_timeout(500)
        page.keyboard.press("KeyE")
        page.wait_for_timeout(800)
        bot = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[15], PB = L.pb, I = PB.internals, bt = PB.bot;
          if (I.botSide() !== 1) return { side: I.botSide() };
          Object.assign(PB, { ph: 'rally', lastHit: 0, need: 1, hits: 3, bounced: false }); Object.assign(PB.b, { x: -3, y: 1, z: 0, vx: 9, vy: 2, vz: 2.5, wx: 0, wy: 0, wz: 0 });
          bt.x = I.HL * 0.85; bt.z = -2; bt.vx = bt.vz = 0; bt.hitKey = '';
          let t = 1e7, top = 0; const path = [];
          for (let f = 1; f <= 72; f++) { const x0 = bt.x, z0 = bt.z; t += 1000 / 60; I.botStep(1 / 60, t); top = Math.max(top, Math.hypot(bt.x - x0, bt.z - z0) * 60); if (f === 15 || f === 72) path.push(+Math.hypot(bt.x - I.HL * 0.85, bt.z + 2).toFixed(2)); }
          PB.ph = 'dead'; return { side: 1, at250ms: path[0], at1200ms: path[1], top: +top.toFixed(2) }; }""")
        pw = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[15], PB = L.pb, I = PB.internals;
          const shot = (holdMs) => { const now = performance.now();
            Object.assign(PB, { ph: 'rally', lastHit: 1, need: 0, hits: 4, bounced: true, auth: fd.state.myPeer });
            const h = window.__fd.camera.getWorldPosition(new THREE.Vector3()); Object.assign(PB.b, { x: h.x + 0.4, y: 1, z: h.z, vx: -1, vy: 0.5, vz: 0 });
            L.deskSwing(now - holdMs); L.deskRelease(now); I.deskHit(now);
            const v = Math.hypot(PB.b.vx, PB.b.vz); PB.ph = 'dead'; return +v.toFixed(1); };
          return { tap: shot(20), full: shot(1000), spin: I.SPINS.length, hud: L.hudActions[0].label() }; }""")
        print("pickleball spin:", sp, " Daisy:", bot, " power:", pw)
        checks += [("pickleball: topspin dips the ball short, backspin carries it long, slice curves it", sp["top"][0] < sp["flat"][0] - 0.5 and sp["back"][0] > sp["flat"][0] + 0.5 and sp["left"][1] < -0.5),
                   ("pickleball: spin shots still land where you aimed", max(sp["err"]) < 0.4),
                   ("pickleball: Daisy takes a moment to react to your shot", bot["side"] == 1 and bot["at250ms"] < 0.05 and bot["at1200ms"] > 1.0),
                   ("pickleball: Daisy moves at a human pace (3 m/s at most)", bot["top"] <= 3.05),
                   ("pickleball: in a browser, holding the swing longer hits harder", pw["full"] > pw["tap"] + 4 and pw["hud"].startswith("Shot:"))]

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
        # pop-a-shot: balls that drop in front of the backboard roll down the ramp and stop in the tray
        ramp = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[8], I = L.popInternals, c = L.pops[1];
          const starts = [[0, 1.7, c.rz, 0, -1, 0], [0.35, 1.8, 17.3, 0, -0.5, -0.5], [-0.6, 1.4, 17.2, 0.3, 0, 0]];
          let now = performance.now();
          starts.forEach((s, i) => { const b = c.balls[i]; b.held = null; b.owner = fd.state.myPeer; b.sleeping = false; b.pos.set(c.x + s[0], s[1], s[2]); b.vel.set(s[3], s[4], s[5]); });
          for (let f = 0; f < 60 * 6; f++) { now += 1000 / 60; I.physics(1 / 60, now); L.update(1 / 60, now); }
          return c.balls.slice(0, 3).map((b) => ({ z: +b.pos.z.toFixed(2), y: +b.pos.y.toFixed(2), x: +(b.pos.x - c.x).toFixed(2) })); }""")
        print("pop-a-shot balls dropped by the hoop end up at:", ramp)
        checks.append(("pop-a-shot: the ramp rolls balls back into the tray", all(16.0 < b["z"] < 16.55 and abs(b["y"] - 0.968) < 0.03 and abs(b["x"]) < 0.72 for b in ramp)))
        # ---------------------------------------------------------------- laser tag: bigger, start game, scoreboards, jump; its gun stays in laser tag
        page.evaluate("() => window.__fd.switchLevel(4)")
        page.wait_for_timeout(1500)
        lt = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[4], I = L.ltInternals, now = performance.now();
          const r0 = I.me.round; fd.dolly.position.set(0, 0, 0); L.startGame();
          const base = I.me.team === 0 ? I.BASE_Z : -I.BASE_Z, c = L.clampPlayer({ x: 0, z: 0 });
          const n0 = I.beams.length; I.me.cool = 0; I.fire(performance.now());
          const boards = L.group.children.filter((m) => m.isMesh && m.geometry.type === 'PlaneGeometry' && m.geometry.parameters.width === 8).length;
          return { w: I.AR.maxX - I.AR.minX, d: I.AR.maxZ - I.AR.minZ, round: I.me.round - r0, counting: I.counting(performance.now()), atBase: Math.abs(fd.dolly.position.z - base) < 2,
                   held: Math.abs(c[1]) > 5, firedInCount: I.beams.length > n0, boards, vrHop: !!L.vrHop, label: L.hudActions[0].label() }; }""")
        page.wait_for_timeout(3600)
        lt2 = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[4], I = L.ltInternals; const n0 = I.beams.length; I.me.cool = 0; I.me.tagged = false; I.fire(performance.now()); return { counting: I.counting(performance.now()), fired: I.beams.length > n0 }; }""")
        page.evaluate("() => window.__fd.switchLevel(0)")
        page.wait_for_timeout(800)
        gun = page.evaluate("() => { const L4 = window.__fd.LEVELS[4]; let v = true; L4.overlay.traverseAncestors((a) => { if (!a.visible) v = false; }); return { overlayShown: L4.overlay.visible, inOverlay: L4.overlay.children.length > 0 }; }")
        print("laser tag:", lt, lt2, "gun in another level:", gun)
        checks += [("laser tag: the arena is bigger (40 by 33 m)", lt["w"] >= 38 and lt["d"] >= 31),
                   ("laser tag: Start game begins a new game with everyone back at base", lt["label"] == "Start game" and lt["round"] == 1 and lt["counting"] and lt["atBase"] and lt["held"]),
                   ("laser tag: no shooting during the countdown, then you can", not lt["firedInCount"] and not lt2["counting"] and lt2["fired"]),
                   ("laser tag: two big scoreboards over the end walls", lt["boards"] == 2),
                   ("laser tag: you can jump in VR (A or X)", lt["vrHop"]),
                   ("the laser tag gun doesn't show up in other games", gun["inOverlay"] and not gun["overlayShown"])]

        # ---------------------------------------------------------------- cornhole in VR: the laser picks out your bag, not one lying on top of it
        page.evaluate("() => window.__fd.switchLevel(20)")
        page.wait_for_timeout(1200)
        ct = page.evaluate("""() => { const L = window.__fd.LEVELS[20], bags = L.bags; const s = bags.map((b) => b.slot.clone());
          let gap = 9; for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) if (Math.abs(s[i].x - s[j].x) < 0.01) gap = Math.min(gap, s[i].distanceTo(s[j]));
          return { same: bags.every((b) => L.canTarget(b) === L.canGrab(b)), gap: +gap.toFixed(2) }; }""")
        print("cornhole targeting:", ct)
        checks.append(("cornhole: in VR only a bag you can pick up is targeted, and tray bags are spread out", ct["same"] and ct["gap"] >= 0.19))

        # ---------------------------------------------------------------- recess in VR: grab the trick-shot ball from anywhere in the area
        page.evaluate("() => window.__fd.switchLevel(24)")
        page.wait_for_timeout(1200)
        rv = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[24], I = L.recessInternals, st = fd.state, v = I.vr(), m0 = st.mode;
          I.resetCourse(); L.paused = true; fd.dolly.position.set(0, 0, -81.4); I.P.vel.set(0, 0, 0);
          const h = v.vrHands.right, src0 = h.source, btn = [{ pressed: false }, { pressed: false }]; h.source = { gamepad: { buttons: btn } };
          let held = '';
          try { st.mode = 'vr'; v.myHead.pos.set(0, 1.6, -81.4); const mh = v.myHands.right; mh.ok = true; mh.pos.set(0.3, 1.1, -81.7);
            I.step(1 / 60); btn[1].pressed = true; v.myHead.pos.set(0, 1.6, -81.4); I.step(1 / 60); held = I.STN.holding; }
          finally { st.mode = m0; h.source = src0; I.STN.holding = ''; I.resetCourse(); L.paused = false; }
          return { held, dist: +I.TB.pos.distanceTo(new THREE.Vector3(0.3, 1.1, -81.7)).toFixed(2) }; }""")
        print("recess VR ball pick-up:", rv)
        checks.append(("recess: in VR, squeezing anywhere in the trick-shot area picks up the ball", rv["held"] == "ball"))

        # ---------------------------------------------------------------- trivia and hot potato: sit out to leave your spot
        page.evaluate("() => window.__fd.switchLevel(18)")
        page.wait_for_function("() => { const I = window.__fd.LEVELS[18].potatoInternals; return I.RS.ph !== 'idle' && I.RS.alive.includes(window.__fd.state.myPeer); }", timeout=20000)
        hp = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[18], I = L.potatoInternals, me = fd.state.myPeer;
          const pinned = L.clampPlayer({ x: 0, z: 0 }); L.sitOut.toggle(); I.hostStep(performance.now());
          const free = L.clampPlayer({ x: 0, z: 0 }); const r = { out: !I.RS.alive.includes(me), pinned: Math.hypot(...pinned) > 0.5, free: Math.hypot(...free) < 0.01, label: L.sitOut.hud.label() };
          L.sitOut.toggle(); return r; }""")
        page.evaluate("() => window.__fd.switchLevel(23)")
        page.wait_for_function("() => { const I = window.__fd.LEVELS[23].triviaInternals; return I.RS.ph !== 'idle' && I.mySeat() >= 0; }", timeout=30000)
        tv = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[23], I = L.triviaInternals;
          const far = (p) => { let m = 0; for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const q = { x: p.x + dx, z: p.z + dz }, c = L.clampPlayer(q); m = Math.max(m, Math.hypot(q.x + c[0] - p.x, q.z + c[1] - p.z)); } return m; };
          const p = { x: fd.dolly.position.x, z: fd.dolly.position.z }; const before = far(p);
          L.sitOut.toggle(); const after = far(p); const answered = I.answer(0);
          I.RS.ph = 'reveal'; I.H.phaseT = -1e9; I.hostStep(performance.now()); I.hostStep(performance.now());
          const r = { before: +before.toFixed(2), after: +after.toFixed(2), answered, seat: I.mySeat() }; L.sitOut.toggle(); return r; }""")
        print("sit out: hot potato", hp, " trivia", tv)
        checks += [("hot potato: Sit out takes you out of the round and lets you walk into the ring", hp["pinned"] and hp["out"] and hp["free"] and hp["label"] == "Join in"),
                   ("trivia: Sit out frees you from your podium (and you can't answer)", tv["before"] < 0.5 and tv["after"] > 1.0 and tv["answered"] is False)]
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
