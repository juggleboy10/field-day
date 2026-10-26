"""v89 with two players: the Bots level is shared by everyone in the game.

- Pickleball: pA takes the west singles paddle, pB the west doubles partner paddle: both devices go to doubles with
  bots in the two east spots. A ball coming down nearer pB is pB's to run (the auth moves to pB's device).
- Volleyball: pA (the host) switches to 1 v 1; pB's device follows (the smaller court), and pB gets the other side.

Usage: python tests/v88_mp.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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


def main():
    port = free_port()
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
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
            for pg in (A, B):
                pg.locator("#btn-flat").click()

            def both(lv):
                for pg in (A, B):
                    pg.evaluate(f"() => window.__fd.switchLevel({lv})")
                time.sleep(3)

            # ---- the Bots level: pA changes it, pB's device follows (and stays put after)
            both(8)
            B0 = B.evaluate("() => window.__fd.BOTLV.get(window.__fd.LEVELS[8])")
            A.evaluate("() => { const fd = window.__fd; fd.BOTLV.set(fd.LEVELS[8], 2); }")
            try:
                B.wait_for_function("() => window.__fd.BOTLV.get(window.__fd.LEVELS[8]) === 2", timeout=10000)
            except Exception:
                pass
            time.sleep(2)
            got = [A.evaluate("() => window.__fd.BOTLV.get(window.__fd.LEVELS[8])"), B.evaluate("() => window.__fd.BOTLV.get(window.__fd.LEVELS[8])")]
            print("bots level before", B0, "after pA set hard:", got)
            checks.append(("bots level: pA's change reaches pB", B0 == 1 and got == [2, 2]))
            # then pB changes it back to easy: pA follows
            B.evaluate("() => { const fd = window.__fd; fd.BOTLV.set(fd.LEVELS[8], 0); }")
            try:
                A.wait_for_function("() => window.__fd.BOTLV.get(window.__fd.LEVELS[8]) === 0", timeout=10000)
            except Exception:
                pass
            time.sleep(2)
            got2 = [A.evaluate("() => window.__fd.BOTLV.get(window.__fd.LEVELS[8])"), B.evaluate("() => window.__fd.BOTLV.get(window.__fd.LEVELS[8])")]
            print("after pB set easy:", got2)
            checks.append(("bots level: the latest change wins on both devices", got2 == [0, 0]))
            # a different game keeps its own level
            other = A.evaluate("() => window.__fd.BOTLV.get(window.__fd.LEVELS[15])")
            checks.append(("bots level: each game has its own", other == 1))
            if errors:
                checks.append(("no page errors: " + "; ".join(errors[:4]), False))
            browser.close()
    finally:
        server.terminate()
    bad = [c for c, ok in checks if not ok]
    for c, ok in checks:
        print(("ok    " if ok else "FAIL  ") + c)
    if bad:
        sys.exit(1)
    print("PASS")


if __name__ == "__main__":
    main()
