"""The player-count picker with two players on one machine (the same stand-in room as tests/multiplayer.py).

- whoever changes the number last wins: it shows on the other page too
- soccer: the bots the host runs show on the other page, the same ones in the same places
- laser tag: the other page sees the bots, and when it tags one the host knocks it out

Usage: python tests/players_mp.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")


def go(pages, lv):
    for pg in pages.values():
        pg.keyboard.press("Escape")
        pg.evaluate(f"() => window.__fd.switchLevel({lv})")
        pg.locator("#btn-flat").click()


def main():
    port = free_port()
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    ok = True
    checks = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
            ctx = browser.new_context(viewport={"width": 900, "height": 600})
            ctx.add_init_script(FAKE_ROOM)
            if THREE_JS:
                ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
            for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
                ctx.route(pat, lambda r: r.abort())
            errors = []
            pages = {}
            for who in ("pA", "pB"):
                pg = ctx.new_page()
                pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
                pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}")
                pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
                pages[who] = pg
            A, B = pages["pA"], pages["pB"]

            # ---------------------------------------------------------------- the number is shared
            for pg in pages.values():
                pg.evaluate("() => window.__fd.switchLevel(18)")
                pg.locator("#btn-flat").click()
            time.sleep(2)
            A.evaluate("() => window.__fd.LEVELS[18].picker.set(8)")
            B.wait_for_function("() => window.__fd.LEVELS[18].picker.n === 8", timeout=15000)
            time.sleep(0.5)
            B.evaluate("() => window.__fd.LEVELS[18].picker.set(3)")
            A.wait_for_function("() => window.__fd.LEVELS[18].picker.n === 3", timeout=15000)
            time.sleep(1.5)
            na, nb = A.evaluate("() => window.__fd.LEVELS[18].picker.n"), B.evaluate("() => window.__fd.LEVELS[18].picker.n")
            print(f"hot potato players after pA set 8 then pB set 3: pA {na}, pB {nb}")
            checks.append(("a change on either page shows on the other (the last one wins)", na == 3 and nb == 3))

            # ---------------------------------------------------------------- soccer bots on both pages
            go(pages, 5)
            time.sleep(3)
            A.evaluate("() => window.__fd.LEVELS[5].picker.set(4)")
            time.sleep(4)
            sa = A.evaluate("() => window.__fd.LEVELS[5].socInternals.sbots.filter((b) => b.active).map((b) => [b.k, Math.round(b.x), Math.round(b.z)])")
            sb = B.evaluate("() => window.__fd.LEVELS[5].socInternals.sbots.filter((b) => b.active).map((b) => [b.k, Math.round(b.x), Math.round(b.z)])")
            print("soccer bots on pA:", sa, " on pB:", sb)
            same = [k for k, _, _ in sa] == [k for k, _, _ in sb] and all(abs(a[1] - b[1]) <= 3 and abs(a[2] - b[2]) <= 3 for a, b in zip(sa, sb))
            checks.append(("soccer: 4 a side with two people means 6 bots, the same on both pages", len(sa) == 6 and same))

            # ---------------------------------------------------------------- laser tag: the other page tags a host's bot
            go(pages, 4)
            time.sleep(3)
            A.evaluate("() => window.__fd.LEVELS[4].picker.set(3)")
            time.sleep(3)
            tb = B.evaluate("() => window.__fd.LEVELS[4].me.team")
            k = B.evaluate(f"() => {{ const b = window.__fd.LEVELS[4].ltBots.find((x) => x.active && x.team !== {tb} && !x.tagged); if (!b) return -1; window.__fd.LEVELS[4].ltHitBot(b, performance.now()); return b.k; }}")
            time.sleep(1.5)
            tagged_on_host = A.evaluate(f"() => {k} >= 0 && window.__fd.LEVELS[4].ltBots[{k}].tagged") if k >= 0 else False
            nbots = B.evaluate("() => window.__fd.LEVELS[4].ltBots.filter((b) => b.active).length")
            print(f"laser tag: pB sees {nbots} bots; pB tagged bot {k}; knocked out on the host: {tagged_on_host}")
            checks += [("laser tag: the other page sees the bots", nbots == 4),
                       ("laser tag: when the other page tags a bot, the host knocks it out", tagged_on_host)]

            for name, good in checks:
                print(f"{'ok  ' if good else 'FAIL'}  {name}")
                ok &= bool(good)
            if errors:
                print("page errors:", errors[:4]); ok = False
            browser.close()
    finally:
        server.terminate()
    print("\nplayer picker multiplayer checks passed" if ok else "\nplayer picker multiplayer checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
