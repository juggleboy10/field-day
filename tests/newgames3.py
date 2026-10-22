"""The v83 games: Fruit Slash, the driving range, rock climbing, archery and gorilla tag.

Usage: python tests/newgames3.py [game ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
SHOTS=dir saves a screenshot of each game.
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
SHOTS = os.environ.get("SHOTS")
ONLY = set(sys.argv[1:])
want = lambda g: not ONLY or g in ONLY


def main():
    fails = []
    check = lambda ok, msg: (None if ok else fails.append(msg))
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
        page.locator("#btn-flat").click()
        go = lambda i: (page.evaluate(f"() => window.__fd.switchLevel({i})"), page.wait_for_timeout(1500))
        shot = lambda name: SHOTS and page.screenshot(path=f"{SHOTS}/{name}.png")

        aim = """(p) => { const fd = window.__fd, h = new window.THREE.Vector3(); fd.camera.getWorldPosition(h);
              const d = new window.THREE.Vector3().subVectors(p, h); fd.state.yaw = Math.atan2(-d.x, -d.z); fd.state.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); }"""
        # ---- Fruit Slash
        if want("fruit"):
            go(55)
            fr = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[55], I = L.fruitInternals, S = I.S, V = window.THREE.Vector3; const out = {};
              I.start('classic');
              // a fruit hanging in front of you, and a sword swept through it
              const it = I.launch(false, false); it.v.set(0, 0, 0); it.p.set(fd.dolly.position.x, 1.4, fd.dolly.position.z - 1.35);
              const E = I.edge.left; E.ok = true; E.speed = 5; E.pa.set(it.p.x - 0.5, 1.4, it.p.z + 0.6); E.pb.set(it.p.x - 0.5, 1.4, it.p.z - 0.3); E.a.set(it.p.x + 0.5, 1.4, it.p.z + 0.6); E.b.set(it.p.x + 0.5, 1.4, it.p.z - 0.3);
              const hit = I.sweepHit(E, it.p, it.kind.r + 0.03); out.hit = !!hit; if (hit) I.slice(it, 'left', hit); out.score = S.score; out.halves = it.halves[0].visible;
              // a dropped fruit costs a life
              const d = I.launch(false, false); d.p.y = -0.5; d.v.set(0, -1, 0); L.update(0.016, performance.now()); out.lives = S.lives;
              // a bomb ends classic
              const b = I.launch(true, false); I.slice(b, 'left', new V(1, 0, 0)); out.ph = S.ph;
              // arcade: a bomb costs 10
              I.start('arcade'); S.score = 15; const b2 = I.launch(true, false); I.slice(b2, 'left', new V(1, 0, 0)); out.arcade = [S.ph, S.score];
              return out; }""")
            print("Fruit:", fr)
            check(fr["hit"] and fr["score"] == 1 and fr["halves"] and fr["lives"] == 2 and fr["ph"] == "over" and fr["arcade"] == ["play", 5], f"fruit: {fr}")
            # the browser: a real mouse swipe through a fruit
            page.evaluate("() => { const fd = window.__fd, I = fd.LEVELS[55].fruitInternals; I.start('arcade'); I.S.next = 99; const it = I.launch(false, false); it.v.set(0, 0, 0); it.p.set(fd.dolly.position.x, 1.45, fd.dolly.position.z - 1.35); window.__fr = it; }")
            page.wait_for_timeout(300)
            page.mouse.move(200, 330)
            page.wait_for_timeout(200)
            for x in range(200, 720, 40):
                page.evaluate("() => { const fd = window.__fd, it = window.__fr; if (it.on) { it.v.set(0, 0, 0); it.p.set(fd.dolly.position.x, 1.45, fd.dolly.position.z - 1.35); } }")
                page.mouse.move(x, 300)
                page.wait_for_timeout(60)
            page.wait_for_timeout(150)
            shot("fruit")
            sw = page.evaluate("() => { const E = window.__fd.LEVELS[55].fruitInternals.edge.flat; return { cut: window.__fr.cut, score: window.__fd.LEVELS[55].fruitInternals.S.score, b: [E.b.x, E.b.y, E.b.z].map((v) => v.toFixed(2)), ok: E.ok, sp: E.speed.toFixed(1), fp: [window.__fr.p.x, window.__fr.p.y, window.__fr.p.z].map((v) => v.toFixed(2)) }; }")
            print("Fruit swipe:", sw)
            check(sw["cut"] and sw["score"] >= 1, f"fruit: a mouse swipe didn't cut {sw}")
            page.evaluate("() => { const I = window.__fd.LEVELS[55].fruitInternals; I.S.next = 0; }")
            page.wait_for_timeout(1500)
            shot("fruit2")
        # ---- the driving range at mini golf
        if want("range"):
            go(6)
            page.evaluate("() => window.__fd.LEVELS[6].rangeInternals.goRange()")
            page.wait_for_timeout(800)
            shot("range")
            rg = page.evaluate("""() => { const L = window.__fd.LEVELS[6], I = L.rangeInternals, R = I.R; const out = { on: L.onRange() };
              const fly = (sp, loft, dir) => { I.teeUp(); I.launch(sp, loft, dir); let n = 0; while (R.st === 'fly' && n++ < 20000) { I.flyStep(0.004); if (R.p.y < -1.25 && R.v.y < 0) I.land(); } return [R.last.yd, R.last.pts]; };
              out.carry = [20, 40, 60, 72].map((s) => fly(s, 0.22, 0)[0]);
              // aim at the 150-yard green: is it reachable and does landing on it score?
              const g = I.greens[2]; let hit = null;
              for (let s = 30; s <= 72 && !hit; s += 0.5) { const dir = Math.atan2(-(g.z - I.TEE.z), g.x - I.TEE.x); const r = fly(s, 0.22, dir); if (r[1] > 0) hit = { s, r }; }
              out.green = hit; return out; }""")
            print("Range:", rg)
            check(rg["on"] and 15 < rg["carry"][0] < 40 and 200 < rg["carry"][2] < 260 and rg["carry"][3] < 320 and rg["green"], f"range: {rg}")
            # the browser swing: hold Space and let go
            page.evaluate("() => window.__fd.LEVELS[6].rangeInternals.newBucket()")
            page.keyboard.down("Space"); page.wait_for_timeout(850); page.keyboard.up("Space")
            page.wait_for_timeout(500)
            shot("range_fly")
            fl = page.evaluate("() => { const R = window.__fd.LEVELS[6].rangeInternals.R; return { st: R.st, left: R.left }; }")
            check(fl["left"] == 9, f"range: Space didn't drive {fl}")
            page.wait_for_timeout(6000)
            ld = page.evaluate("() => { const R = window.__fd.LEVELS[6].rangeInternals.R; return { st: R.st, last: R.last }; }")
            print("Range drive:", ld)
            check(ld["last"] and ld["last"]["yd"] > 60, f"range: the browser drive {ld}")
            page.evaluate("() => window.__fd.LEVELS[6].spawn()")
            page.wait_for_timeout(600)
            back = page.evaluate("() => window.__fd.LEVELS[6].onRange()")
            check(not back, "range: couldn't get back to the course")
        # ---- Cliffside Climb
        if want("climb"):
            go(56)
            shot("climb_start")
            pick = """(lane) => { const fd = window.__fd, I = fd.LEVELS[56].climbInternals, h = new window.THREE.Vector3(); fd.camera.getWorldPosition(h);
              let best = -1, by = -1; I.HOLDS.forEach((x, i) => { if (x.gone || x.li !== lane) return; const d = x.p.distanceTo(h); if (d < 1.4 + (fd.LEVELS[56].climbP.flat.left || fd.LEVELS[56].climbP.flat.right ? 0 : 0.8) && x.p.y > by && !(x === fd.LEVELS[56].climbP.flat.left || x === fd.LEVELS[56].climbP.flat.right)) { by = x.p.y; best = i; } });
              if (best >= 0) { const p = I.HOLDS[best].p; const dv = new window.THREE.Vector3().subVectors(p, h); fd.state.yaw = Math.atan2(-dv.x, -dv.z); fd.state.pitch = Math.atan2(dv.y, Math.hypot(dv.x, dv.z)); }
              return best; }"""
            heights = []
            for i in range(80):
                b = page.evaluate(f"({pick})(1)")
                if b < 0:
                    break
                page.wait_for_timeout(120)
                page.evaluate("() => window.__fd.LEVELS[56].deskFire()")
                page.wait_for_timeout(450)
                y = page.evaluate("() => window.__fd.dolly.position.y")
                heights.append(round(y, 1))
                if i == 6:
                    shot("climb_wall")
                if y >= 23.9:
                    break
            print("Climb heights:", heights[::4], heights[-1:] if heights else None)
            check(heights and heights[-1] >= 23.9, f"climb: didn't reach the top in the browser {heights[-5:]}")
            page.evaluate("() => { const fd = window.__fd; fd.state.yaw = 0; fd.state.pitch = 0; }")
            page.wait_for_timeout(600)
            shot("climb_top")
            rb = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[56], I = L.climbInternals; const h = new window.THREE.Vector3(); fd.camera.getWorldPosition(h);
              const dv = new window.THREE.Vector3(0, 25.8, -3.5).sub(h); fd.state.yaw = Math.atan2(-dv.x, -dv.z); return { ph: I.P.ph }; }""")
            page.wait_for_timeout(300)
            page.keyboard.press("KeyE")
            page.wait_for_timeout(300)
            done = page.evaluate("() => { const P = window.__fd.LEVELS[56].climbInternals.P; return { ph: P.ph, time: P.time, best: P.best }; }")
            print("Climb done:", done)
            check(done["ph"] == "done" and done["time"] > 1, f"climb: the bell {done}")
            # let go part-way up: lowered to the tier below
            low = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[56], I = L.climbInternals; I.backToStart(); fd.dolly.position.set(0, 12, -1.15); L.update(0.016, performance.now());
              for (let i = 0; i < 400; i++) L.update(0.016, performance.now()); return fd.dolly.position.y; }""")
            check(abs(low - 8) < 0.05, f"climb: letting go should lower you to the 8 m tier ({low})")
            # a crumbly hold breaks
            cr = page.evaluate("() => { const I = window.__fd.LEVELS[56].climbInternals; const h = I.HOLDS.find((x) => x.crumbly); I.crumble(h); const r = h.gone; I.backToStart(); return [r, h.gone, I.HOLDS.filter((x) => x.crumbly).length]; }")
            check(cr[0] and not cr[1] and cr[2] > 2, f"climb: crumbly holds {cr}")
        # ---- Archery
        if want("arch"):
            go(57)
            ar = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[57], I = L.archInternals, S = I.S, V = window.THREE.Vector3; I.newRound(); const out = { hits: [] };
              // at each fixed target, full power: find the launch angle that hits the middle (it should be possible)
              for (const t of I.TG.filter((x) => !x.moving)) {
                const from = new V(0, 1.5, 0); let got = null;
                for (let el = -0.05; el < 0.3 && !got; el += 0.002) {
                  const dir = new V(t.g.position.x - from.x, 0, t.g.position.z - from.z).normalize(); dir.y = Math.tan(el); dir.normalize();
                  S.left = 12; const s0 = S.score; const a = I.loose(from.clone(), dir, 62); let n = 0; while (a.st === 'fly' && n++ < 3000) I.arrowStep(a, 0.004);
                  if (S.score - s0 >= 9) got = { d: t.dist, el: +el.toFixed(3), pts: S.score - s0 };
                }
                out.hits.push(got);
              }
              // a balloon
              const b = I.BAL[0], from = b.m.position.clone().add(new V(0, 0, 2)), dir = new V(0, 0, -1); S.left = 12; const s0 = S.score; const a = I.loose(from, dir, 62); let n = 0; while (a.st === 'fly' && n++ < 3000) I.arrowStep(a, 0.004); out.balloon = S.score - s0;
              return out; }""")
            print("Archery:", ar)
            check(all(ar["hits"]) and ar["balloon"] >= 10, f"archery: {ar}")
            # the browser: aim at the 10 m target and loose with Space
            page.evaluate("() => { const I = window.__fd.LEVELS[57].archInternals; I.newRound(); }")
            page.evaluate(f"() => ({aim})(new window.THREE.Vector3(-3, 1.55, -10))")
            page.wait_for_timeout(300)
            page.keyboard.down("Space"); page.wait_for_timeout(700)
            shot("arch_draw")
            page.keyboard.up("Space")
            page.wait_for_timeout(1500)
            shot("arch")
            fl = page.evaluate("() => { const S = window.__fd.LEVELS[57].archInternals.S; return { left: S.left, score: S.score, last: S.last }; }")
            print("Archery browser:", fl)
            check(fl["left"] == 11 and fl["last"] and fl["last"]["pts"] > 0, f"archery: a browser shot at 10 m {fl}")
        # ---- Gorilla Tag
        if want("gorilla"):
            go(58)
            mv = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[58], I = L.gtInternals, M = I.M, V = window.THREE.Vector3; const real = L.update; L.update = () => {};
              fd.dolly.position.set(5, 0, 5); M.vel.set(0, 0, 0); const H = fd.myHands, out = {};
              const rel = { left: new V(-0.25, 0.01, -0.2), right: new V(0.25, 0.01, -0.2) };
              const place = () => { for (const s of ['left', 'right']) { H[s].ok = true; H[s].pos.copy(fd.dolly.position).add(rel[s]); } };
              // both hands on the ground, then shove them down and back: you go up and forward
              place(); I.vrMove(1 / 60); out.on = [M.hand.left.on, M.hand.right.on];
              const z0 = fd.dolly.position.z, y0 = fd.dolly.position.y;
              for (let i = 0; i < 8; i++) { rel.left.y -= 0.02; rel.right.y -= 0.02; rel.left.z += 0.06; rel.right.z += 0.06; place(); I.vrMove(1 / 60); }
              out.moved = [+(fd.dolly.position.z - z0).toFixed(2), +(fd.dolly.position.y - y0).toFixed(2)];
              out.vel = [+M.vel.z.toFixed(1), +M.vel.y.toFixed(1)];
              // let go (hands up and away): you fly on and land
              for (const s of ['left', 'right']) { rel[s].y += 0.4; } place(); I.vrMove(1 / 60);
              for (const s of ['left', 'right']) H[s].ok = false;
              const zl = fd.dolly.position.z; let peak = 0;
              for (let i = 0; i < 120; i++) { I.vrMove(1 / 60); peak = Math.max(peak, fd.dolly.position.y); }
              out.flew = +(fd.dolly.position.z - zl).toFixed(2); out.peak = +peak.toFixed(2); out.landed = +fd.dolly.position.y.toFixed(2);
              L.update = real; return out; }""")
            print("Gorilla moves:", mv)
            check(mv["on"] == [True, True] and mv["moved"][0] < -0.3 and mv["moved"][1] > 0.1 and mv["flew"] < -0.5 and mv["landed"] == 0, f"gorilla: arm locomotion {mv}")
            tg = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[58], I = L.gtInternals, S = I.S; L.picker.n = 4; I.startRound(); const out = { n: S.ids.length };
              const me = S.ids.indexOf(fd.state.myPeer); S.inf = S.ids.map((_, k) => (k === me ? 1 : 0));
              // I'm lava: touch a bot
              const b = I.bots.find((x) => S.ids.includes(x.id)); b.x = fd.myHead.pos.x + 0.3; b.z = fd.myHead.pos.z; b.y = 0;
              I.myTags(); out.tagged = S.inf[S.ids.indexOf(b.id)];
              // a lava bot catches a survivor bot? (bots tag people; here, people tag bots and bots tag people)
              S.inf = S.ids.map((_, k) => (k === me ? 0 : 1)); const b2 = I.bots.find((x) => S.ids.includes(x.id)); b2.x = fd.myHead.pos.x + 0.2; b2.z = fd.myHead.pos.z; I.hostStep(0.016); out.me = S.inf[me];
              // all lava: the round ends
              out.ph = S.ph; return out; }""")
            print("Gorilla tags:", tg)
            check(tg["n"] == 4 and tg["tagged"] == 1 and tg["me"] == 1 and tg["ph"] == "done", f"gorilla: tagging {tg}")
            page.evaluate("() => { const I = window.__fd.LEVELS[58].gtInternals; window.__fd.LEVELS[58].picker.n = 6; I.startRound(); }")
            page.wait_for_timeout(1500)
            page.keyboard.press("Space")
            page.wait_for_timeout(250)
            jy = page.evaluate("() => window.__fd.dolly.position.y")
            shot("gorilla")
            page.wait_for_timeout(1500)
            check(jy > 0.2, f"gorilla: Space didn't leap ({jy})")
            sn = page.evaluate("() => { const I = window.__fd.LEVELS[58].gtInternals; return I.validSnap(JSON.parse(JSON.stringify(I.snapshot()))); }")
            check(sn, "gorilla: the snapshot doesn't validate")
            page.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(0, 0, 8); fd.state.yaw = 0; fd.state.pitch = 0.1; }")
            page.wait_for_timeout(1000)
            shot("gorilla2")
        if errors:
            fails.append("page errors: " + "; ".join(errors[:5]))
        browser.close()
    if fails:
        print("FAIL\n  " + "\n  ".join(fails))
        sys.exit(1)
    print("PASS")


if __name__ == "__main__":
    main()
