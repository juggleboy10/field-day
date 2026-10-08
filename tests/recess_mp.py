"""Recess Rush with two players on one machine, through the same stand-in room as tests/multiplayer.py.

- one starts a race; the other joins the countdown, with the same start time and the same bots (making up the picker's number)
- each sees the other in the standings
- in the sack race, the other player is drawn in a sack

Usage: python tests/recess_mp.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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
I = "window.__fd.LEVELS[24].recessInternals"


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
            for pg in pages.values():
                pg.evaluate("() => window.__fd.switchLevel(24)")
                pg.locator("#btn-flat").click()
            A, B = pages["pA"], pages["pB"]
            time.sleep(3)
            A.evaluate("() => window.__fd.LEVELS[24].picker.set(4)")
            time.sleep(1.0)
            A.evaluate(f"() => {I}.startRace()")
            B.wait_for_function(f"() => {I}.RACE.state === 'count'", timeout=20000)
            ra = A.evaluate(f"() => ({{ id: {I}.RACE.id, startAt: {I}.RACE.startAt, bots: {I}.RACE.botsN }})")
            rb = B.evaluate(f"() => ({{ id: {I}.RACE.id, startAt: {I}.RACE.startAt, bots: {I}.RACE.botsN }})")
            print("race on pA:", ra, " on pB:", rb)
            checks += [("the other player joins the race", ra["id"] == rb["id"]), ("with the same start time", abs(ra["startAt"] - rb["startAt"]) < 150),
                       ("bots make up the numbers (two people, two bots for 4 racers), the same on both pages", ra["bots"] == 2 and rb["bots"] == 2)]
            # pB jumps ahead to the sack race and stands there
            B.wait_for_function(f"() => {I}.RACE.state === 'run'", timeout=20000)
            B.evaluate(f"() => {{ const fd = window.__fd; fd.LEVELS[24].paused = true; fd.dolly.position.set(0, 0, -36); {I}.P.vel.set(0, 0, 0); {I}.step(1 / 60); }}")
            time.sleep(4)
            seen = A.evaluate(f"""() => {{ const rows = {I}.standings(); return {{ names: rows.map((r) => r.name), progB: Math.max(...rows.filter((r) => !r.me).map((r) => r.prog)) }}; }}""")
            sackB = B.evaluate(f"() => {I}.P.sack")
            sackOnA = A.evaluate("() => window.__fd.LEVELS[24].group.children.filter((m) => m.isMesh && m.visible && m.geometry && m.geometry.type === 'CylinderGeometry' && m.geometry.parameters.radiusTop === 0.3 && m.geometry.parameters.openEnded && m.scale.x === 1).length")
            print("pA's standings:", seen, " pB in a sack:", sackB, " sacks pA can see:", sackOnA)
            checks += [("each sees the other (and the two bots) in the standings", len(seen["names"]) == 4 and seen["progB"] > 30),
                       ("the other player is drawn in a sack", sackB and sackOnA == 1)]
            for name, good in checks:
                print(f"{'ok  ' if good else 'FAIL'}  {name}")
                ok &= bool(good)
            if errors:
                print("page errors:", errors[:4]); ok = False
            browser.close()
    finally:
        server.terminate()
    print("\nrecess multiplayer checks passed" if ok else "\nrecess multiplayer checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
