"""The six newest games play properly: Skee-Ball, Musical Chairs, Knockout Kid, Snowball Fight, Toboggan Run.
(Frostpeak Caverns is covered by tests/quests.py with the other quests.)

- Skee-Ball: slow rolls land low, harder ones climb the rings to the 50; nine balls end the game and pay tickets
- Musical Chairs: when the music stops, everyone dashes for a chair; one is left out each round until there's a winner
- Knockout Kid: dodging a punch leaves him open, a head shot then does triple damage; landing enough knocks him out
- Snowball Fight: the bots throw from cover and snowballs hit people (three hits and you're out)
- Toboggan Run: a sled left to gravity reaches the finish in a sensible time, as do the bots

Usage: python tests/newgames.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")


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
        page.locator("#btn-flat").click()
        go = lambda i: (page.evaluate(f"() => window.__fd.switchLevel({i})"), page.wait_for_timeout(1200))

        # ---- Skee-Ball
        go(31)
        skee = page.evaluate("""() => { const L = window.__fd.LEVELS[31], V = window.THREE.Vector3; L.update = () => {}; const B = L.skeeBall, out = {};
          const roll = (sp) => { L.launch(new V(-2.1 + 1.4 * L.skee.k, 0.65, -0.05), new V(0, 0, -sp)); let n = 0; const s0 = L.skee.score; while ((B.st === 'roll' || B.st === 'fly') && n++ < 20000) L.stepBall(0.002); out.states = (out.states || []).concat([B.st]); while (B.st !== 'tray' && n++ < 40000) L.stepBall(0.01); return L.skee.score - s0; };
          out.curve = [2.6, 3.0, 3.4, 3.8, 4.2, 4.6, 5.0, 5.5, 6.0];
          L.newGame(); const t0 = L.skeeSave.tickets;
          out.rolls = [3.4, 4.0, 4.2, 4.6, 5.1, 3.4, 3.4, 3.4, 3.4].map(roll);
          out.phase = L.skee.phase; out.score = L.skee.score; out.tickets = L.skeeSave.tickets - t0;
          return out; }""")
        print("Skee-Ball:", skee)

        # ---- Musical Chairs (solo, five bots)
        go(32)
        page.evaluate("() => { const fd = window.__fd, L = fd.LEVELS[32], I = L.mcInternals; window.__mcUpdate = L.update; L.update = () => {}; L.picker.set(6); I.startGame(); }")
        rounds = []
        for _ in range(8):
            if page.evaluate("() => window.__fd.LEVELS[32].mcInternals.S.ph") == 'won':
                break
            # the music stops, I step right up to chair 0 (a frame passes, so my head is there), and everyone dashes
            page.evaluate("() => { const fd = window.__fd, I = fd.LEVELS[32].mcInternals, S = I.S; S.stopAt = Date.now() - 1; I.hostStep(0.016); const c = I.chairPos(0, S.n); fd.dolly.position.set(c.x, 0, c.z); }")
            page.wait_for_timeout(400)
            rounds.append(page.evaluate("""() => { const I = window.__fd.LEVELS[32].mcInternals, S = I.S, n = S.n;
              for (let k = 0; k < 600 && S.ph === 'grab'; k++) I.hostStep(1 / 60);
              const r = { chairs: n, seated: S.seats.filter((x) => x).length, out: S.outName, ph: S.ph }; S.t = Date.now() - 4000; I.hostStep(0.016); return r; }"""))
        chairs = page.evaluate("() => { const S = window.__fd.LEVELS[32].mcInternals.S; return { ph: S.ph, winner: S.winner, me: window.__fd.state.myPeer }; }")
        chairs["rounds"] = rounds
        print("Musical Chairs:", chairs)

        # ---- Knockout Kid
        go(33)
        box = page.evaluate("""() => { const L = window.__fd.LEVELS[33], I = L.boxInternals, B = I.B, V = window.THREE.Vector3; L.update = () => {};
          B.lv = 0; I.startBout(); const out = {};
          // he throws a jab; I lean well aside before it lands
          I.throwPunch(); B.kind = 'jab'; B.head0.set(0, 1.6, 0.25);
          const realHead = I.resolvePunch;
          out.beforeHp = B.hp;
          B.head0.x -= 0.4;   // (as if my head had moved 0.4 m since the wind-up)
          I.resolvePunch(); out.afterDodge = B.st;
          I.myPunch('head', new V()); out.headShot = out.beforeHp - B.hp;
          // keep landing until he's down
          let n = 0; while (B.st !== 'down' && n++ < 50) { B.st = 'open'; I.myPunch('head', new V()); }
          out.ko = B.st; out.punches = n;
          // a punch I don't dodge or block takes a heart
          I.startBout(); I.throwPunch(); B.kind = 'jab'; const h0 = B.myHp; I.resolvePunch(); out.hurt = h0 - B.myHp;
          return out; }""")
        print("Knockout Kid:", box)

        # ---- Snowball Fight (real frames: the snowballs fly in the physics)
        go(34)
        page.evaluate("() => { const L = window.__fd.LEVELS[34]; L.picker.set(4); }")
        page.wait_for_timeout(25000)
        snow = page.evaluate("""() => { const L = window.__fd.LEVELS[34], I = L.swInternals; return { st: I.RS.st, round: I.RS.round, botsHit: I.bots.filter((b) => b.active && b.hp < 3).length, botsOut: I.bots.filter((b) => b.active && b.out).length, active: I.bots.filter((b) => b.active).length, me: { hp: I.me.hp, out: I.me.out } }; }""")
        print("Snowball Fight after 25 s:", snow)

        # ---- Toboggan Run
        go(35)
        sled = page.evaluate("""() => { const L = window.__fd.LEVELS[35], I = L.sledInternals, K = I.K, R = I.RACE; L.update = () => {};
          I.startRace(); R.startAt = Date.now() - 1; R.st = 'run'; K.v = 2.5; for (const b of I.BOTS) b.v = 2.2;
          let t = 0; const realNow = Date.now, t0 = realNow(); Date.now = () => t0 + t * 1000;
          try { while (t < 200 && (!K.done || I.BOTS.some((b) => !b.done))) { t += 0.02; I.sledStep(K, 0.02, Math.sin(t * 0.7) * 0.3, false, 0, true); for (const b of I.BOTS) I.botDrive(b, 0.02); } }
          finally { Date.now = realNow; }
          return { me: +K.done.toFixed(1), bots: I.BOTS.map((b) => +b.done.toFixed(1)), maxKmh: Math.round(K.v * 3.6) }; }""")
        print("Toboggan Run:", sled)
        browser.close()
    checks = [
        ("Skee-Ball: slow rolls score low, firm ones reach 40-50", skee["rolls"][0] == 10 and max(skee["rolls"][1:5]) >= 40),
        ("Skee-Ball: nine balls end the game and pay tickets", skee["phase"] == "over" and skee["tickets"] == skee["score"] // 10),
        ("Musical Chairs: every chair gets taken each round", all(r["seated"] == r["chairs"] for r in chairs["rounds"])),
        ("Musical Chairs: someone's out each round until a winner", chairs["ph"] == "won" and all(r["out"] for r in chairs["rounds"])),
        ("Musical Chairs: standing at a chair keeps me in to the end", chairs["winner"] == chairs["me"]),
        ("Knockout Kid: dodging leaves him open", box["afterDodge"] == "open"),
        ("Knockout Kid: a head shot while he's open does 3", box["headShot"] == 3),
        ("Knockout Kid: enough punches knock him out", box["ko"] == "down"),
        ("Knockout Kid: an undodged jab costs a heart", box["hurt"] == 1),
        ("Snowball Fight: a round is on and snowballs are hitting", snow["round"] >= 1 and (snow["botsHit"] + snow["botsOut"] > 0 or snow["me"]["hp"] < 3)),
        ("Toboggan Run: the sled reaches the finish in 30-90 s", 30 < sled["me"] < 90),
        ("Toboggan Run: the bots finish too", all(0 < b < 120 for b in sled["bots"])),
    ]
    ok = not errors
    for label, good in checks:
        print(("PASS " if good else "FAIL ") + label)
        ok = ok and good
    if errors:
        print("page errors:", errors[:5])
    print("new game checks passed" if ok else "new game checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
