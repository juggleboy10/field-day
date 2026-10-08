"""Lakeside Cornhole: throws land where the power says, and real rounds against Corny Carl run and score.

- a weak throw falls short, a good one lands on the board, the middle of the power bar goes in the hole, too much goes long
- playing (E to pick up, hold Space and let go) runs turns, tallies rounds with cancellation, and switches ends
- a game ends when someone reaches 21

Usage: python tests/cornhole.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

TRIAL = """
(power) => {
  const fd = window.__fd, L = fd.LEVELS[20], I = L.cornholeInternals, b = I.bags[0];
  const from = new THREE.Vector3(-0.95, 1.35, 4.665);
  b.v += 1; b.owner = fd.state.myPeer; b.held = null; b.pos.copy(from); b.sleeping = false; b.restT = 0; b.data = { thrownAt: performance.now() };
  b.vel.copy(I.throwFor(from, 0, power, 0));
  return true;
}
"""

STATE = """
() => { const fd = window.__fd, I = fd.LEVELS[20].cornholeInternals, RS = I.RS;
  return { game: RS.game, round: RS.round, ph: RS.ph, end: RS.end, turn: RS.turn, score: RS.score.slice(), pts: RS.pts.slice(), winner: RS.winner, mine: I.myTurn(),
           held: !!(fd.state.held), me: [Math.round(fd.dolly.position.x * 10) / 10, Math.round(fd.dolly.position.z * 10) / 10] }; }
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
        page.evaluate("() => window.__fd.switchLevel(20)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(800)

        # ---- where throws land
        page.evaluate("() => { window.__fd.LEVELS[20].paused = true; }")
        results = {}
        for power in (0.3, 0.45, 0.6, 0.85):
            got = []
            for _ in range(4):
                page.evaluate(TRIAL, power)
                page.wait_for_function("() => window.__fd.LEVELS[20].bags[0].sleeping", timeout=90000)
                page.wait_for_timeout(200)
                got.append(page.evaluate("() => { const L = window.__fd.LEVELS[20]; return L.bagPoints(L.bags[0], 0); }"))
            results[power] = got
        print("points by power (4 throws each):", results)
        checks = [
            ("a weak throw falls short", sum(results[0.3]) <= 1),
            ("a decent throw stays on the board", sum(1 for x in results[0.45] if x >= 1) >= 3),
            ("the middle of the power bar mostly goes in", sum(1 for x in results[0.6] if x == 3) >= 2 and all(x >= 1 for x in results[0.6])),
            ("too much goes long", sum(results[0.85]) <= 1),
        ]

        # ---- real rounds against the bot
        page.evaluate("() => { const L = window.__fd.LEVELS[20]; L.paused = false; L.cornholeInternals.RS.ph = 'idle'; }")
        page.wait_for_timeout(1500)
        rounds, ends, my_throws, scores = set(), set(), 0, []
        t_end = time.time() + 420
        forced = False
        while time.time() < t_end:
            s = page.evaluate(STATE)
            rounds.add(s["round"]); ends.add(s["end"])
            if s["ph"] == "tally":
                scores.append((s["round"], tuple(s["pts"]), tuple(s["score"])))
            if s["mine"] and not s["held"]:
                page.keyboard.press("KeyE"); page.wait_for_timeout(250)
                if page.evaluate(STATE)["held"]:
                    page.keyboard.down("Space"); page.wait_for_timeout(600); page.keyboard.up("Space")
                    my_throws += 1
                    page.wait_for_timeout(500)
            if len(rounds) >= 3 and not forced:
                page.evaluate("() => { const RS = window.__fd.LEVELS[20].cornholeInternals.RS; RS.score = [20, 20]; }")
                forced = True
            if s["ph"] == "over":
                print(f"game over: winner {'Red' if s['winner'] == 0 else 'Blue'}, {s['score']}")
                break
            time.sleep(0.15)
        tallies = sorted(set(scores))
        print(f"rounds: {sorted(rounds)}, ends used: {sorted(ends)}, your throws: {my_throws}")
        for t in tallies[:6]: print("   tally:", t)
        final = page.evaluate(STATE)
        checks += [
            ("you get turns and your throws go", my_throws >= 6),
            ("rounds are tallied", len(tallies) >= 2),
            ("ends switch each round", ends == {0, 1}),
            ("the game ends at 21", final["ph"] == "over" and final["winner"] in (0, 1)),
        ]
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\ncornhole checks passed" if ok else "\ncornhole checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
