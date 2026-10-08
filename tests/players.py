"""The player-count picker in every game that has one: picking a number changes how many bots play.

For each game: set the number, start whatever the game starts (a round, a race, a match), and count the bots.
The number is the total (per team in team games); you're the only person here, so bots make up the rest.
Also checks the HUD button cycles the number, and the setting is remembered after a reload.

Usage: python tests/players.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

# level -> (picker values to try, JS that starts the game and returns the bots now playing; `n` is the number)
GAMES = {
    0: ([2, 5, 8], "L.ltInternals.startLightning(performance.now()); return L.lt.order.filter((id) => id.startsWith('bot:')).length;", lambda n: n - 1),
    4: ([1, 3, 5], "L.ltInternals.fillLtBots(); return L.ltInternals.lbots.filter((b) => b.active).length;", lambda n: 2 * n - 1),
    5: ([1, 3, 5], "L.socInternals.fillSocBots(); return L.socInternals.sbots.filter((b) => b.active).length;", lambda n: 2 * n - 1),
    9: ([1, 4, 6], "L.update(1 / 60, performance.now()); return L.botKarts().length;", lambda n: n - 1),
    12: ([2, 5, 9], "L.hsInternals.startRound(2, window.__fd.state.myPeer); return Array.from(L.hsInternals.bots.keys()).length;", lambda n: n - 1),
    14: ([1, 3, 5], "L.pbInternals.fillBots(); return L.pbBots.filter((b) => b.active).length;", lambda n: 2 * n - 1),
    16: ([1, 4, 6], "L.parkourInternals.startRace(); return L.race.botsN;", lambda n: n - 1),
    17: ([1, 3, 5], "L.dbInternals.beginCount(performance.now()); return L.dbInternals.bots.filter((b) => b.active).length;", lambda n: 2 * n - 1),
    18: ([2, 6, 9], "const I = L.potatoInternals; I.RS.ph = 'idle'; I.hostStep(performance.now()); return I.RS.order.filter((id) => id.startsWith('bot:')).length;", lambda n: n - 1),
    19: ([1, 4, 6], "L.kayakInternals.startRace(); return L.race.botsN;", lambda n: n - 1),
    21: ([1, 4, 6], "L.ctfInternals.fillBots(); return L.ctfInternals.bots.filter((b) => b.active).length;", lambda n: 2 * n - 1),
    23: ([1, 4, 8], "const I = L.triviaInternals; I.RS.ph = 'idle'; I.hostStep(performance.now()); return I.RS.order.filter((id) => id.startsWith('bot:')).length;", lambda n: n - 1),
    24: ([1, 4, 6], "L.recessInternals.startRace(); return L.race.botsN;", lambda n: n - 1),
}


def main():
    ok = True
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1100, "height": 650})
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
        for lv, (values, js, expect) in GAMES.items():
            page.evaluate(f"() => window.__fd.switchLevel({lv})")
            page.wait_for_timeout(900)
            got = {}
            for n in values:
                got[n] = page.evaluate(f"() => {{ const L = window.__fd.LEVELS[{lv}]; L.paused = true; L.picker.set({n}); {js} }}")
            page.evaluate(f"() => {{ window.__fd.LEVELS[{lv}].paused = false; }}")
            name = page.evaluate(f"() => window.__fd.LEVELS[{lv}].meta.name")
            good = all(got[n] == expect(n) for n in values)
            print(f"{name}: bots for each number {got} (expected {[expect(n) for n in values]})")
            checks.append((f"{name}: the number sets how many bots play", good))

        # Charades and the adventures have no picker
        none = page.evaluate("() => [13, 3, 10, 11, 22].filter((i) => window.__fd.LEVELS[i].picker).length")
        checks.append(("no picker in Charades or the adventures", none == 0))

        # the HUD button cycles the number (wrapping round), and it's remembered after a reload
        page.evaluate("() => window.__fd.switchLevel(18)")
        page.wait_for_timeout(800)
        page.evaluate("() => window.__fd.LEVELS[18].picker.set(8)")
        page.wait_for_timeout(400)
        seq = []
        for _ in range(3):
            page.locator(".hud-btn", has_text="Players:").first.click()
            page.wait_for_timeout(250)
            seq.append(page.evaluate("() => window.__fd.LEVELS[18].picker.n"))
        print("HUD button from 8:", seq)
        checks.append(("the HUD button cycles the number and wraps round", seq == [9, 2, 3]))
        page.reload()
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        kept = page.evaluate("() => window.__fd.LEVELS[18].picker.n")
        print("after a reload:", kept)
        checks.append(("the number is remembered after a reload", kept == 3))

        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nplayer picker checks passed" if ok else "\nplayer picker checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
