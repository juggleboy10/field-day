"""All-time records (high scores) for each game.

- every game with records has its board beside the kiosk (or its own spot) and a Records button
- a result goes on the board in order (higher-is-better and lower-is-better), top five kept, a new #1 is announced
- games report their results: a few played through their own code (Speed of Light, Strongman, the football long pass)
- a friend's best (sent with their presence) shows up on my board under their name, once
- records are still there after a reload

Usage: python tests/records.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")


def main():
    fails = []
    check = lambda ok, msg: (print(("ok    " if ok else "FAIL  ") + msg), None if ok else fails.append(msg))
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 900, "height": 560})
        page = ctx.new_page()
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        url = (ROOT / "index.html").as_uri() + "?test"
        page.goto(url)
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.locator("#btn-flat").click()

        info = page.evaluate("""() => { const fd = window.__fd; const withDefs = fd.LEVELS.filter((L) => L && L.recDefs);
          return { n: withDefs.length, noBoard: withDefs.filter((L) => !L.recBoard).map((L) => L.id), noButton: withDefs.filter((L) => !L.recHud).map((L) => L.id), ids: withDefs.map((L) => L.id) }; }""")
        print("games with records:", info["n"], info["ids"])
        check(info["n"] >= 35, f"{info['n']} games have records")
        check(not info["noBoard"], f"every game with records has a board ({info['noBoard']})")
        check(not info["noButton"], f"every game with records has a Records button ({info['noButton']})")

        # ordering, top five, low and high
        r = page.evaluate("""() => { const fd = window.__fd, R = fd.RECORDS, L = fd.LEVELS[36]; fd.state.name = 'Tester';
          for (const v of [30, 18, 25, 40, 22, 19, 60]) R.add(L, 'd301', v);
          const low = R.list(L, 'd301').map((e) => e[0]);
          const LS = fd.LEVELS[47]; for (const v of [12, 30, 25]) R.add(LS, 'hits', v);
          return { low, high: R.list(LS, 'hits').map((e) => e[0]) }; }""")
        print("darts fewest:", r["low"], " lights most:", r["high"])
        check(r["low"] == [18, 19, 22, 25, 30], "lower-is-better keeps the five lowest, in order")
        check(r["high"][:3] == [30, 25, 12], "higher-is-better keeps the highest first")

        # games report their own results
        page.evaluate("() => window.__fd.switchLevel(47)")
        page.wait_for_timeout(1200)
        g = page.evaluate("""() => { const fd = window.__fd, R = fd.RECORDS, out = {};
          const LS = fd.LEVELS[47], I = LS.lightInternals; I.startRound(); I.S.hits = 44; I.S.react = 44 * 0.41; I.endRound(); out.light = R.list(LS, 'hits')[0]; out.react = R.list(LS, 'react')[0];
          const SM = fd.LEVELS[43], J = SM.strongInternals, T = J.towers[J.S.k]; const run = (h) => { J.S.cool = 0; J.strike(h); let n = 0; while ((T.vy !== 0 || T.py > 0.35) && n++ < 3000) J.puckStep(T, 0.01); };
          run(1.05); run(1.05); run(1.05); run(0.4); out.bells = R.list(SM, 'streak')[0];
          const FB = fd.LEVELS[29], F = FB.fbInternals; F.startGame(); F.S.ballOn = 75; FB.endPlay('tackle', { z: -40 * 0.9144, name: 'Rex' }); out.pass = R.list(FB, 'pass')[0];
          return out; }""")
        print("results:", g)
        check(g["light"] and g["light"][0] == 44, "Speed of Light puts its score on the board")
        check(g["react"] and abs(g["react"][0] - 410) < 1, "and the quickest average reaction")
        check(g["bells"] and g["bells"][0] == 3, "Strongman: three bells in a row")
        check(g["pass"] and g["pass"][0] == 40, "Football: a 40-yard pass play")

        # the board shows them (drawn) and the browser panel lists them
        page.wait_for_timeout(600)
        page.screenshot(path=os.environ.get("SHOTS", "/tmp") + "/records-light.png") if os.environ.get("SHOTS") else None
        panel = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[47]; L.recHud.run(); const p = [...document.querySelectorAll('div')].find((d) => /Speed of Light records/.test(d.textContent)); return p ? p.textContent : ''; }""")
        check("44" in panel and "Most lights" in panel, "the Records button lists them")

        # a friend's best arrives with their presence: on my board under their name, once
        m = page.evaluate("""() => { const fd = window.__fd, R = fd.RECORDS, L = fd.LEVELS[47];
          R.merge(L, 'Pal', [['hits', 50]]); R.merge(L, 'Pal', [['hits', 50]]); R.merge(L, 'Pal', [['hits', 35]]);
          return R.list(L, 'hits').map((e) => [e[0], e[1]]); }""")
        print("after a friend:", m)
        check(m[0] == [50, "Pal"] and sum(1 for e in m if e[1] == "Pal") == 1, "a friend's record shows once, their best")

        # still there after a reload
        page.wait_for_timeout(500)
        page.reload()
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        kept = page.evaluate("() => window.__fd.RECORDS.list(window.__fd.LEVELS[47], 'hits').map((e) => e[0])")
        check(kept[:2] == [50, 44], f"records survive a reload ({kept})")
        if errors:
            check(False, "page errors: " + "; ".join(errors[:4]))
        browser.close()
    if fails:
        print("FAIL")
        sys.exit(1)
    print("records checks passed")


if __name__ == "__main__":
    main()
