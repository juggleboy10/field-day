"""The carnival games (v74) play properly and pay out tickets. Each section is one game.

Usage: python tests/newgames2.py [game ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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

        # ---- Strongman Bell
        if want("strongman"):
            go(43)
            sm = page.evaluate("""() => { const L = window.__fd.LEVELS[43], I = L.strongInternals, sk = window.__fd.LEVELS[31].skeeSave;
              const t0 = sk.tickets, out = { ratings: [0.1, 0.4, 0.6, 0.75, 0.9, 0.99, 1.05].map(I.rating), pay: [0.2, 0.55, 0.9, 1.0].map(I.payout) };
              const realU = L.update; L.update = () => {}; const T = I.towers[I.S.k]; const r0 = I.S.rings;
              const swing = (h) => { I.S.cool = 0; I.strike(h); let n = 0; while ((T.vy !== 0 || T.py > 0.35) && n++ < 2000) I.puckStep(T, 0.01); return T.rang ? 'bell' : Math.round(T.hit * 100); };
              out.swings = [0.3, 0.7, 1.05].map(swing); out.rings = I.S.rings - r0; out.tickets = sk.tickets - t0; L.update = realU; return out; }""")
            print("Strongman:", sm)
            check(sm["swings"][2] == "bell" and sm["rings"] == 1, f"strongman: a full swing didn't ring the bell {sm}")
            check(sm["tickets"] == 1 + 4 + 12, f"strongman: tickets {sm}")
            page.wait_for_timeout(2500)
            page.evaluate("() => { const fd = window.__fd, L = fd.LEVELS[43]; L.strongInternals.S.cool = 0; L.deskFire(performance.now()); }")
            page.wait_for_timeout(250)
            shot("strongman")
            page.wait_for_timeout(2500)
            page.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(3.4, 0, 0.7); fd.state.yaw = -Math.PI / 2; fd.state.pitch = -0.1; }")
            page.wait_for_timeout(1500)
            shot("prizes")
            # buy the duck at the stand (there are tickets by now)
            bought = page.evaluate("() => { const fd = window.__fd, L = fd.LEVELS[43]; const b = L.buttons.find((x) => /Rubber duck/.test(x.label)); const sk = fd.LEVELS[31].skeeSave; sk.owned = sk.owned.filter((x) => x !== 'duck'); sk.tickets = Math.max(sk.tickets, 50); b.onPress(b); return sk.owned.includes('duck'); }")
            check(bought, "strongman: the prize stand didn't sell the duck")
            sw = page.evaluate("() => window.__fd.LEVELS[43].strongInternals.S.swings")
            check(sw >= 4, f"strongman: a browser swing didn't strike ({sw})")
        # ---- Duck Shooting Gallery
        if want("duck"):
            go(44)
            dk = page.evaluate("""() => { const L = window.__fd.LEVELS[44], I = L.duckInternals, R = I.R, sk = window.__fd.LEVELS[31].skeeSave, V = window.THREE.Vector3;
              const realU = L.update; L.update = () => {}; I.startRound(); const t0 = sk.tickets; let shots = 0;
              // aim at plain ducks on the bottom row, leading them a little
              for (const d of I.booths[R.k].ducks) {
                if (d.ri !== 0 || d.type !== 0 || shots >= 8) continue;
                const p = I.duckPos(R.k, d, I.clock() + 0.13, new V()); if (Math.abs(p.x - (-3.6 + 3.6 * R.k)) > 1.1) continue;
                R.cool = 0; I.fire(new V(p.x, p.y + 0.05, 0.3), new V(0, 0.01, -1)); shots++;
                for (let n = 0; n < 400 && I.corks.some((c) => c.on); n++) for (const c of I.corks) I.corkStep(c, 0.002);
              }
              const out = { shots, hits: R.hits, score: R.score };
              I.endRound(); out.tickets = sk.tickets - t0; L.update = realU; return out; }""")
            print("Duck shoot:", dk)
            check(dk["shots"] >= 3 and dk["hits"] >= dk["shots"] - 1, f"duck: aimed corks missed {dk}")
            check(dk["tickets"] == -(-dk["score"] // 3), f"duck: tickets {dk}")
            page.evaluate("() => window.__fd.LEVELS[44].duckInternals.startRound()")
            page.wait_for_timeout(1500)
            shot("duck")
        # ---- Ring Toss
        if want("ring"):
            go(45)
            rt = page.evaluate("""() => { const L = window.__fd.LEVELS[45], I = L.ringInternals, T = I.T, sk = window.__fd.LEVELS[31].skeeSave, V = window.THREE.Vector3;
              const realU = L.update; L.update = () => {}; I.newGame(); const t0 = sk.tickets, out = { res: [] };
              const bs = I.bottles[T.k];
              const toss = (b, off) => { const from = new V(b.x - 0.1, 1.3, 0.2); I.launch(from, I.lobTo(from, new V(b.x + off, I.NECK_Y, b.z), 1.75)); const r = I.rings[T.thrown - 1]; for (let n = 0; n < 3000 && r.st === 'fly'; n++) I.ringStep(r, 0.002); out.res.push(r.st); };
              toss(bs[7], 0); toss(bs[6], 0.01); toss(bs[3], 0.07); toss(bs[0], 0.105);
              out.ringers = T.ringers; out.tickets = sk.tickets - t0; out.pay = T.tickets; L.update = realU; return out; }""")
            print("Ring toss:", rt)
            check(rt["res"][:2] == ["on", "on"] and rt["res"][2] == "down" and rt["ringers"] == 2, f"ring: ringers {rt}")
            check(rt["tickets"] == rt["pay"] and rt["pay"] > 0, f"ring: tickets {rt}")
            page.wait_for_timeout(1200)
            shot("ring")
        # ---- Whack-a-Mole
        if want("whack"):
            go(46)
            wm = page.evaluate("""() => { const L = window.__fd.LEVELS[46], I = L.whackInternals, W = I.W, sk = window.__fd.LEVELS[31].skeeSave;
              const realU = L.update; L.update = () => {}; I.startRound(); const t0 = sk.tickets; let ups = 0, misses = 0;
              // a quick player: bops every mole about a third of a second after it pops up (fake clock, 45 s)
              const start = performance.now(); let t = 0; const seen = new Map();
              W.t0 = start;
              while (W.ph === 'play' && t < 50) {
                t += 1 / 30; W.t0 = performance.now() - t * 1000; I.roundStep(1 / 30);
                I.moles[W.k].list.forEach((m, i) => { m.up = m.want ? 1 : 0; if (m.want) { const s = seen.get(m) || t; seen.set(m, s); if (t - s > 0.33) { I.bop(i); seen.delete(m); } } else seen.delete(m); });
              }
              const out = { score: W.score, hits: W.hits, ph: W.ph, tickets: sk.tickets - t0, wrong: I.bop(0) };
              L.update = realU; return out; }""")
            print("Whack:", wm)
            check(wm["ph"] == "over" and 35 < wm["hits"] < 90, f"whack: round {wm}")
            check(wm["tickets"] == -(-wm["score"] // 3), f"whack: tickets {wm}")
            page.evaluate("() => window.__fd.LEVELS[46].whackInternals.startRound()")
            page.wait_for_timeout(3000)
            page.keyboard.press("KeyS")
            shot("whack")
        # ---- Speed of Light
        if want("light"):
            go(47)
            page.evaluate("() => window.__fd.LEVELS[47].lightInternals.startRound()")
            page.wait_for_timeout(1200)
            shot("light")
            # aim the browser view at the lit button and click, a few times
            got = 0
            for _ in range(5):
                page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[47], I = L.lightInternals, S = I.S;
                  const p = I.panels[S.k].btns[S.lit].p, h = new window.THREE.Vector3(); fd.camera.getWorldPosition(h);
                  const d = new window.THREE.Vector3().subVectors(p, h); fd.state.yaw = Math.atan2(-d.x, -d.z); fd.state.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); }""")
                page.wait_for_timeout(250)
                page.evaluate("() => window.__fd.LEVELS[47].deskFire()")
            ls = page.evaluate("""() => { const L = window.__fd.LEVELS[47], I = L.lightInternals, S = I.S, sk = window.__fd.LEVELS[31].skeeSave; const out = { hits: S.hits };
              const t0 = sk.tickets; I.endRound(); out.tickets = sk.tickets - t0; out.wrong = I.press(S.lit === 0 ? 1 : 0); return out; }""")
            print("Speed of Light:", ls)
            check(ls["hits"] >= 4, f"light: aimed clicks didn't hit {ls}")
            check(ls["tickets"] == -(-ls["hits"] // 3), f"light: tickets {ls}")
        if errors:
            fails.append("page errors: " + "; ".join(errors[:5]))
        browser.close()
    if fails:
        print("FAIL\n  " + "\n  ".join(fails))
        sys.exit(1)
    print("PASS")


if __name__ == "__main__":
    main()
