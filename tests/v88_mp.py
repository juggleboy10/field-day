"""v88 with two players: doubles pickleball partners on one side, and 1 v 1 volleyball.

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

            # ---- pickleball doubles: partners
            both(15)
            I = "window.__fd.LEVELS[15].pb.internals"
            PB = "window.__fd.LEVELS[15].pb"

            def grab(pg, k, dz):
                pg.evaluate(f"() => {{ const fd = window.__fd, t = {I}.paddles[{k}]; fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + {dz}); }}")
                time.sleep(0.6)
                pg.keyboard.press("KeyE")
                time.sleep(0.8)
            grab(A, 0, 0.6)
            grab(B, 1, -0.6)
            time.sleep(2.0)
            sa = A.evaluate(f"() => ({{ dbl: {PB}.dbl, slots: {I}.slots(), bots: {I}.botSlots() }})")
            sb = B.evaluate(f"() => ({{ dbl: {PB}.dbl, slots: {I}.slots(), bots: {I}.botSlots(), mine: {PB}.mySlot }})")
            print("pickleball, pA sees:", sa, " pB sees:", sb)
            checks.append(("pickleball: both devices go to doubles, partners on the west side, bots in the east spots",
                           sa["dbl"] and sb["dbl"] and sa["slots"][:2] == ["pA", "pB"] and sb["slots"][:2] == ["pA", "pB"] and sa["bots"] == [2, 3] and sb["bots"] == [2, 3] and sb["mine"] == 1))
            # pA on the right half near the baseline, pB on the left; a ball coming down by pB is pB's to play
            A.evaluate("() => window.__fd.dolly.position.set(-6, 0, 1.5)")
            B.evaluate("() => window.__fd.dolly.position.set(-6, 0, -1.5)")
            time.sleep(1.5)
            A.evaluate(f"""() => {{ const PB = {PB}, fd = window.__fd; Object.assign(PB, {{ ph: 'rally', lastHit: 1, need: 0, hits: 4, bounced: true, auth: 'pA' }});
              Object.assign(PB.b, {{ x: -5.6, y: 1.0, z: -1.4, vx: -0.4, vy: 0.2, vz: 0, wx: 0, wy: 0, wz: 0 }}); PB.ver += 5; }}""")
            try:
                A.wait_for_function(f"() => {PB}.auth === 'pB'", timeout=8000)
            except Exception:
                pass
            auth = A.evaluate(f"() => {PB}.auth")
            print("pickleball: who runs a ball by pB:", auth)
            checks.append(("pickleball: a ball coming down by your partner is theirs to play", auth == "pB"))
            for pg in (A, B):
                pg.keyboard.press("KeyE")
            time.sleep(0.5)

            # ---- volleyball 1 v 1
            both(37)
            V = "window.__fd.LEVELS[37].vbInternals"
            A.evaluate(f"() => {{ {V}.setSolo(true); {V}.startMatch(); }}")
            B.wait_for_function(f"() => {V}.V.solo && {V}.V.people.includes('pB') && {V}.V.ph !== 'idle'", timeout=20000)
            vb = B.evaluate(f"() => ({{ people: {V}.V.people, court: {V}.court(), solo: {V}.V.solo }})")
            print("volleyball 1 v 1 on pB:", vb)
            checks.append(("volleyball: pB's device follows to 1 v 1, smaller court, one each side", vb["solo"] and vb["court"] == [6.5, 3] and vb["people"] == ["pA", "", "pB", ""]))
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
