"""The v73 games with two players (pA runs the game, pB joins in).

- Beach Volleyball: pB gets a spot on the other side; pB's touch of the ball reaches pA's device and counts
- Pillow Fight Castle: pB is in the round; pB's bonk on a bot counts on pA's device
- Rock-Paper-Scissors: pB is in the bracket and the throw pB picked is the one pA's device plays
- Haunted Mansion: pB sees pA's ghosts, and pB's flashlight beam counts on pA's device

Usage: python tests/newgames2_mp.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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

            # ---- volleyball
            both(37)
            V = "window.__fd.LEVELS[37].vbInternals"
            A.evaluate(f"() => {V}.startMatch()")
            B.wait_for_function(f"() => {V}.V.people.includes('pB') && {V}.V.ph !== 'idle'", timeout=20000)
            people = B.evaluate(f"() => {V}.V.people")
            print("volleyball spots:", people)
            checks.append(("volleyball: pB gets a spot on the other side", people[0] == "pA" and people[2] == "pB"))
            # pB stands back in the far corner (so the pass doesn't come straight back to them)
            B.evaluate("() => window.__fd.dolly.position.set(7, 0, 3.5)")
            time.sleep(1.0)
            # the ball comes to pB: pA's device has it in the air on pB's side; pB plays it
            A.evaluate(f"() => {{ const I = {V}, V = I.V; V.ph = 'rally'; V.lastTeam = 0; V.touches = 3; V.p.set(4, 2.5, 0); V.v.set(0, 0.5, 0); V.sinceHit = 0; window.__fd.LEVELS[37].update = () => {{}}; }}")
            time.sleep(1.0)
            B.evaluate(f"() => {{ const I = {V}; I.V.ph = 'rally'; I.V.lastTeam = 0; I.V.touches = 3; I.myTouch(1, null); }}")
            A.wait_for_function(f"() => {V}.V.lastSlot === 2", timeout=15000)
            time.sleep(0.3)
            hit = A.evaluate(f"() => ({{ slot: {V}.V.lastSlot, team: {V}.V.lastTeam, touches: {V}.V.touches, n: {V}.V.hitN }})")
            print("  pB seq", B.evaluate(f"() => [{V}.ME.seq, {V}.ME.claim]"))
            print("volleyball: pB's pass on pA's device:", hit)
            checks.append(("volleyball: pB's touch counts on the host", hit["slot"] == 2 and hit["team"] == 1 and hit["touches"] == 1))

            # ---- pillow fight
            both(38)
            P = "window.__fd.LEVELS[38].pfInternals"
            A.evaluate(f"() => {{ window.__fd.LEVELS[38].picker.set(4); {P}.startRound(); }}")
            B.wait_for_function(f"() => {P}.S.ids.includes('pB') && {P}.S.ph === 'fight'", timeout=20000)
            time.sleep(1.5)
            # a bot on the other team, right next to pB (as pA's device sees pB)
            k = A.evaluate(f"""() => {{ const I = {P}, S = I.S, fd = window.__fd; const tb = S.tm[S.ids.indexOf('pB')];
              const k = S.ids.findIndex((id, j) => id[0] === 'b' && S.tm[j] !== tb); const b = I.bots[Number(S.ids[k].slice(1))];
              const rec = fd.voice.remotes.get('pB'); b.x = rec.cur.h.pos.x + 0.5; b.z = rec.cur.h.pos.z; S.inv[k] = 0; window.__fd.LEVELS[38].update = () => {{}}; S.hp[k] = 3; return k; }}""")
            time.sleep(0.8)
            B.evaluate(f"() => {P}.myBonk({k})")
            A.wait_for_function(f"() => {P}.S.hp[{k}] === 2", timeout=15000)
            checks.append(("pillow fight: pB's bonk counts on the host", True))
            print("pillow fight: pB bonked", k)

            # ---- rock-paper-scissors
            both(41)
            R = "window.__fd.LEVELS[41].rpsInternals"
            A.evaluate(f"() => {R}.startTournament()")
            B.wait_for_function(f"() => {R}.S.ids.includes('pB') && {R}.S.mt.length === 4", timeout=20000)
            B.evaluate(f"() => {R}.pick(2)")
            A.evaluate(f"() => {R}.pick(0)")
            A.wait_for_function(f"() => {R}.S.ph === 'show'", timeout=30000)
            mt = A.evaluate(f"() => {R}.S.mt")
            mb = next(m for m in mt if "pB" in m[:2])
            ma = next(m for m in mt if "pA" in m[:2])
            pb_threw = mb[4] if mb[0] == "pB" else mb[5]
            pa_threw = ma[4] if ma[0] == "pA" else ma[5]
            print("rps: pB threw", pb_threw, "pA threw", pa_threw)
            checks.append(("rps: pB's pick is what pA's device played", pb_threw == 2 and pa_threw == 0))

            # ---- haunted mansion
            both(39)
            H = "window.__fd.LEVELS[39].hauntInternals"
            A.evaluate(f"() => {H}.startHunt()")
            B.wait_for_function(f"() => {H}.H.ph === 'hunt' && {H}.H.ghosts.length === 2", timeout=20000)
            nb = A.evaluate(f"() => {H}.beams().length")
            print("haunted: beams on pA's device:", nb)
            checks.append(("haunted: pB sees the ghosts and pB's beam counts", nb == 2))
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
