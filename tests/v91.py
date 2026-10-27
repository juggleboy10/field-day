"""v91: End game, for every game: two presses (the first asks), from the HUD or the watch; shared games end for everyone.

Usage: python tests/v91.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
# the places with no game to end: free play only
NONE = {"juggle", "strongman", "range"}


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
        go = lambda i: (page.evaluate(f"() => window.__fd.switchLevel({i})"), page.wait_for_timeout(1000))

        missing = page.evaluate("() => window.__fd.LEVELS.filter((L) => !L.endGame).map((L) => L.id)")
        print("no End game:", missing)
        check(set(missing) <= NONE, f"games without End game: {missing}")

        # every game's End game runs without an error (whether or not a game's going)
        bad = page.evaluate("""() => { const out = []; for (const L of window.__fd.LEVELS) { if (!L.endGame) continue; try { L.endGame.active(); } catch (e) { out.push(L.id + ' active: ' + e.message); } } return out; }""")
        check(not bad, f"End game active() errors {bad}")

        # volleyball: a match going; one press asks, the second ends it
        go(37)
        vb = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[37], I = L.vbInternals; I.startMatch(); const on = L.endGame.active(); const hud = L.endHud.show();
          L.endHud.run(); const afterOne = I.V.ph; const label = L.endHud.label(); L.endHud.run(); return { on, hud, afterOne, label, after: I.V.ph, still: L.endGame.active(), show: L.endHud.show() }; }""")
        print("volleyball:", vb)
        check(vb["on"] and vb["hud"] and vb["afterOne"] != "idle" and vb["label"] == "Press again to end" and vb["after"] == "idle" and not vb["still"] and not vb["show"], f"volleyball end {vb}")

        # the watch: an End game button while a game's going, and two presses end it
        wt = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[37], I = L.vbInternals; I.startMatch(); const ids = fd.watch.btns().map((b) => b.id);
          fd.watch.press('end'); const one = I.V.ph; const t = performance.now(); while (performance.now() - t < 750) {} fd.watch.press('end'); return { ids, one, after: I.V.ph, idsAfter: fd.watch.btns().map((b) => b.id) }; }""")
        print("watch:", wt)
        check(wt["ids"] == ["hub", "bots", "cam", "end"] and wt["one"] != "idle" and wt["after"] == "idle" and wt["idsAfter"] == ["hub", "bots", "cam"], f"watch end {wt}")

        # a few kinds of games: personal booths, races, study games, a table in the clubhouse
        cases = [
            (44, "duck shoot", "() => { const L = window.__fd.LEVELS[44]; L.onChargeStart && 0; return 0; }"),
        ]
        go(47)
        ls = page.evaluate("() => { const L = window.__fd.LEVELS[47], I = L.lightInternals; I.startRound(); const on = L.endGame.active(); L.endGame.end(); return [on, I.S.ph, I.S.lits.length]; }")
        check(ls == [True, "idle", 0], f"speed of light end {ls}")
        go(35)
        tb = page.evaluate("() => { const L = window.__fd.LEVELS[35], I = L.sledInternals; I.startRace(); const on = L.endGame.active(); L.endGame.end(); return [on, I.RACE.st]; }")
        check(tb == [True, "idle"], f"toboggan end {tb}")
        go(53)
        ms = page.evaluate("() => { const L = window.__fd.LEVELS[53]; L.mathInternals ? 0 : 0; const S = L.endGame; L.onEnter(); return S.active(); }")
        check(ms is False, f"math sprint at the menu isn't a game {ms}")
        go(7)
        bw = page.evaluate("() => { const L = window.__fd.LEVELS[7]; return [L.endGame.active()]; }")
        check(bw == [False], f"bowling: a fresh lane has nothing to end {bw}")

        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv91 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
