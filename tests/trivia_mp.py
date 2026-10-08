"""Trivia Night with two players on one machine, through the same stand-in room as tests/multiplayer.py.

- both get podiums in the same game, with two bots
- the non-host's answer reaches the host: it shows as locked in, and is scored at the reveal
- both pages show the same scores
- when the host leaves, the other player takes over and the game carries on, scores kept

Usage: python tests/trivia_mp.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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
TI = "window.__fd.LEVELS[23].triviaInternals"
ST = f"() => {{ const t = {TI}, RS = t.RS; return {{ game: RS.game, ph: RS.ph, qn: RS.qn, qi: RS.qi, order: RS.order.slice(), scores: RS.scores.slice(), choices: RS.choices.slice(), right: t.rightSlot(), host: t.isHost() }}; }}"


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
                pg.evaluate("() => window.__fd.switchLevel(23)")
                pg.locator("#btn-flat").click()
                pg.evaluate(f"() => Object.assign({TI}.T, {{ INTRO: 4000, ASK: 14000, REVEAL: 2500, FINAL: 3000, AFTER_ALL: 600 }})")
            A, B = pages["pA"], pages["pB"]

            # a game with both of us in it (the host may have started one alone: wait for the next question)
            t_end = time.time() + 120
            while time.time() < t_end:
                a, b = A.evaluate(ST), B.evaluate(ST)
                if a["ph"] == "ask" and b["ph"] == "ask" and a["qn"] == b["qn"] and "pA" in a["order"] and "pB" in a["order"] and a["order"] == b["order"]:
                    break
                time.sleep(0.3)
            print("both at podiums:", a["order"], "game", a["game"], "question", a["qn"], "host pA:", a["host"])
            checks.append(("both players get podiums in the same game", "pA" in a["order"] and "pB" in a["order"] and a["order"] == b["order"]))
            checks.append(("pA hosts", a["host"] and not b["host"]))

            # pB answers right, pA answers wrong
            qn = a["qn"]
            B.keyboard.press(f"Digit{b['right'] + 1}")
            time.sleep(1.5)
            a_mid = A.evaluate(ST)
            kb = a_mid["order"].index("pB")
            checks.append(("the host sees the non-host lock in (answer hidden)", a_mid["choices"][kb] == 9))
            A.keyboard.press(f"Digit{(a['right'] + 1) % 4 + 1}")
            A.wait_for_function(f"() => {TI}.RS.ph === 'reveal' && {TI}.RS.qn === {qn}", timeout=40000)
            time.sleep(1.2)
            a, b = A.evaluate(ST), B.evaluate(ST)
            ka, kb = a["order"].index("pA"), a["order"].index("pB")
            print("reveal: pA sees", a["scores"], a["choices"], " pB sees", b["scores"], b["choices"])
            checks += [("the non-host's right answer is scored", a["choices"][kb] == a["right"] and a["scores"][kb] >= 100),
                       ("the host's wrong answer isn't", a["choices"][ka] not in (-1, 9, a["right"])),
                       ("both pages show the same scores", a["scores"] == b["scores"] and a["choices"] == b["choices"])]
            kept = a["scores"][kb]

            # the host leaves: pB takes over and carries on
            A.keyboard.press("Escape")
            B.wait_for_function(f"() => {TI}.isHost()", timeout=20000)
            B.wait_for_function(f"() => {TI}.RS.ph === 'ask' && {TI}.RS.qn === {qn + 1}", timeout=40000)
            b = B.evaluate(ST)
            print("after pA left: pB sees", b)
            checks += [("the other player takes over and the game carries on", b["host"] and b["qn"] == qn + 1),
                       ("their score is kept", b["scores"][b["order"].index("pB")] == kept),
                       ("the leaver's podium is freed", "pA" not in b["order"])]
            for name, good in checks:
                print(f"{'ok  ' if good else 'FAIL'}  {name}")
                ok &= bool(good)
            if errors:
                print("page errors:", errors[:4]); ok = False
            browser.close()
    finally:
        server.terminate()
    print("\ntrivia multiplayer checks passed" if ok else "\ntrivia multiplayer checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
