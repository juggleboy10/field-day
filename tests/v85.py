"""v85 fixes: the watch hand, archery play again, the baseball hot streak, football downs and NaN, cosmic bowling,
the hoops roof gate, help desk tickets.

Usage: python tests/v85.py [game ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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

        # ---- the watch hops hands when the right one is busy
        if want("watch"):
            go(57)
            w = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[57], S = L.archInternals.S; const out = {};
              S.bowHand = 'right'; out.lefty = [L.handBusy('right'), L.handBusy('left')];
              S.drawing = true; out.both = [L.handBusy('right'), L.handBusy('left')]; S.drawing = false; S.bowHand = 'left'; return out; }""")
            check(w["lefty"] == [True, False] and w["both"] == [True, True], f"watch: archery hands {w}")
        # ---- archery: play again after twelve
        if want("arch"):
            go(57)
            a = page.evaluate("""() => { const I = window.__fd.LEVELS[57].archInternals, S = I.S, V = window.THREE.Vector3; I.newRound(); S.left = 1;
              const ar = I.loose(new V(0, 1.5, 0), new V(0, -0.3, -1), 30); let n = 0; while (ar.st === 'fly' && n++ < 3000) I.arrowStep(ar, 0.004); I.endRound();
              const out = { ph: S.ph, left: S.left }; const b = window.__fd.LEVELS[57].buttons.find((x) => x.label === 'Play again'); b.onPress(b); out.after = [S.ph, S.left]; return out; }""")
            check(a["ph"] == "done" and a["after"] == ["play", 12], f"archery: play again {a}")
        # ---- baseball: a hot streak adds power
        if want("streak"):
            go(1)
            b = page.evaluate("""() => { const L = window.__fd.LEVELS[1]; const out = { b0: L.streakBoost() }; L.streak = 4; out.b4 = +L.streakBoost().toFixed(3); L.streak = 40; out.cap = +L.streakBoost().toFixed(3);
              const fake = { vel: new window.THREE.Vector3(0, 10, -40) }; L.streak = 4; L.onBatHit(fake, 30); out.v = +fake.vel.length().toFixed(2); L.streak = 0; window.__fd.state.dirtyBoard = true; return out; }""")
            print("Streak:", b)
            check(b["b0"] == 1 and b["b4"] == 1.14 and b["cap"] == 1.7 and abs(b["v"] - 41.231 * 1.14) < 0.1, f"baseball: streak boost {b}")
        # ---- football: no 5th down, no NaN when a defender sits on the catcher
        if want("football"):
            go(29)
            f = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[29], I = L.fbInternals, S = I.S; L.update = () => {}; const out = {};
              I.startGame(); S.down = 4; S.toGo = 8; I.choosePlay(0); I.hike(); I.endPlay('inc', { msg: 'Incomplete' }); out.down = S.down; out.pending = S.pending;
              I.startGame(); I.choosePlay(0); I.hike(); const r = I.REC[0]; S.catcher = r; S.phase = 'yac'; S.yacT = 2; r.caught = true;
              for (const d of I.COV) { d.x = r.x; d.z = r.z; } I.SAF.x = r.x; I.SAF.z = r.z; for (let i = 0; i < 30; i++) I.step(1 / 60);
              out.finite = [r.x, r.z, ...I.COV.map((d) => d.x)].every(Number.isFinite); out.msg = S.msg; return out; }""")
            print("Football:", f)
            check(f["down"] == 4 and f["pending"] == "turnover" and f["finite"] and "NaN" not in f["msg"], f"football: {f}")
        # ---- cosmic bowling
        if want("bowl"):
            go(7)
            page.evaluate("() => window.__fd.LEVELS[7].setCosmic(true)")
            page.wait_for_timeout(800)
            shot("cosmic")
            c = page.evaluate("() => { const L = window.__fd.LEVELS[7]; const on = L.cosmic.on; L.setCosmic(false); return [on, L.cosmic.on]; }")
            check(c == [True, False], f"bowling: cosmic switch {c}")
        # ---- hoops: out the back gate onto the roof, and a long shot over the fence
        if want("hoops"):
            go(0)
            h = page.evaluate("""() => { const L = window.__fd.LEVELS[0], V = window.THREE.Vector3; const out = {};
              out.gate = L.clampPlayer(new V(0, 1.6, 8)); out.wall = L.clampPlayer(new V(3, 1.6, 5.6)); out.roof = L.clampPlayer(new V(3, 1.6, 9));
              const b = L.bodies[0]; b.held = null; b.pos.set(0, 4.5, 6.5); b.prev.copy(b.pos); b.pos.z = 5.2; L.collide(b); out.over = +b.pos.z.toFixed(2);
              b.pos.set(3, 1.5, 6.0); b.prev.copy(b.pos); b.pos.z = 5.45; b.vel.set(0, 0, -3); L.collide(b); out.bounce = [+b.pos.z.toFixed(2), +b.vel.z.toFixed(2)]; return out; }""")
            print("Hoops:", h)
            check(h["gate"] == [0, 0] and h["wall"][1] > 0 and h["roof"] == [0, 0] and h["over"] == 5.2 and h["bounce"][0] > 5.5 and h["bounce"][1] > 0, f"hoops: roof gate {h}")
        # ---- help desk: more tickets
        if want("desk"):
            go(51)
            n = page.evaluate("() => window.__fd.LEVELS[51].deskInternals.TICKETS.filter((t) => t[2][1].length === 4 && t[3][1].length === 4 && t[4]).length")
            check(n >= 34, f"help desk: tickets {n}")
        if errors:
            fails.append("page errors: " + "; ".join(errors[:5]))
        browser.close()
    if fails:
        print("FAIL\n  " + "\n  ".join(fails))
        sys.exit(1)
    print("PASS")


if __name__ == "__main__":
    main()
