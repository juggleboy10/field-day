"""v91 with two players: End game ends a shared game for everyone, and only your own personal game.

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

            # ---- a shared game: pB ends the volleyball match pA's page is running
            both(37)
            V = "window.__fd.LEVELS[37].vbInternals"
            A.evaluate(f"() => {V}.startMatch()")
            B.wait_for_function(f"() => {V}.V.ph !== 'idle' && {V}.V.people.includes('pB')", timeout=20000)
            time.sleep(1)
            B.evaluate("() => { const L = window.__fd.LEVELS[37]; L.endHud.run(); L.endHud.run(); }")
            try:
                A.wait_for_function(f"() => {V}.V.ph === 'idle'", timeout=10000)
            except Exception:
                pass
            time.sleep(1.5)
            ph = [A.evaluate(f"() => {V}.V.ph"), B.evaluate(f"() => {V}.V.ph")]
            print("volleyball after pB ended it:", ph)
            checks.append(("end game: pB ending a shared game ends it on the host's page too", ph == ["idle", "idle"]))
            # and it stays ended (no echo starting or ending it again), and a new match can start
            A.evaluate(f"() => {V}.startMatch()")
            time.sleep(2.5)
            ph2 = [A.evaluate(f"() => {V}.V.ph"), B.evaluate(f"() => {V}.V.ph")]
            print("after a new match:", ph2)
            checks.append(("end game: a new match starts fine afterwards", ph2[0] != "idle" and ph2[1] != "idle"))

            # ---- a personal game: pA ending their own lightspeed round leaves pB's alone
            both(47)
            for pg in (A, B):
                pg.evaluate("() => window.__fd.LEVELS[47].lightInternals.startRound()")
            time.sleep(0.5)
            A.evaluate("() => { const L = window.__fd.LEVELS[47]; L.endHud.run(); L.endHud.run(); }")
            time.sleep(2.5)
            ls = [A.evaluate("() => window.__fd.LEVELS[47].lightInternals.S.ph"), B.evaluate("() => window.__fd.LEVELS[47].lightInternals.S.ph")]
            print("speed of light, pA ended theirs:", ls)
            checks.append(("end game: a personal game only ends your own", ls == ["idle", "play"]))
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
