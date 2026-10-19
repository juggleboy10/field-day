"""Two-Minute Drill with two players: one is quarterback, the other plays a receiver, then defense.

- pA starts the drill; pB joins it automatically as a receiver, in place of a bot, and lines up
- pA throws to pB (standing where pB really is): pB catches it, and pB's own position is used for the tackle spot
- pB sees the result the quarterback's device decided
- pB switches to defense and takes over a defender's spot for the next play

Usage: python tests/football_mp.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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
I = "window.__fd.LEVELS[29].fbInternals"


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
                pg.evaluate("() => window.__fd.switchLevel(29)")
                pg.locator("#btn-flat").click()
            A, B = pages["pA"], pages["pB"]
            time.sleep(3)
            A.evaluate(f"() => {{ {I}.S.diff = 0; {I}.startGame(); }}")
            B.wait_for_function(f"() => {I}.MP.qb === 'pA' && {I}.MP.role === 1", timeout=20000)
            A.wait_for_function(f"() => {I}.REC.some((r) => r.human === 'pB')", timeout=20000)
            joined = B.evaluate(f"() => ({{ qb: {I}.MP.qb, role: {I}.MP.role, slot: {I}.MP.slot, x: +window.__fd.dolly.position.x.toFixed(1) }})")
            slotA = A.evaluate(f"() => {I}.REC.findIndex((r) => r.human === 'pB')")
            print("pB joined:", joined, " pA gave pB receiver spot", slotA)
            checks += [("pB joins pA's drive as a receiver", joined["qb"] == "pA" and joined["role"] == 1),
                       ("pA has pB in that receiver's spot", slotA == joined["slot"] and slotA >= 0)]
            # pB stands 9 yards downfield, wide open on the right; pA hikes, looks at pB and throws
            B.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(9, 0, -9); fd.state.yaw = Math.PI; }")
            time.sleep(1.5)
            A.evaluate(f"() => {{ const I = {I}; I.hike(); }}")
            time.sleep(0.8)
            A.evaluate(f"""() => {{ const fd = window.__fd, I = {I}, r = I.REC.find((q) => q.human === 'pB');
              fd.state.yaw = Math.atan2(-(r.x - fd.dolly.position.x), -(r.z - fd.dolly.position.z)); fd.state.pitch = 0; fd.camera.rotation.set(0, fd.state.yaw, 0, 'YXZ'); fd.dolly.updateMatrixWorld(true);
              I.throwFlat(0.3); }}""")
            A.wait_for_function(f"() => ['dead', 'pre'].includes({I}.S.phase)", timeout=30000)
            resA = A.evaluate(f"() => ({{ msg: {I}.S.msg, target: {I}.S.target ? {I}.S.target.human : null, ballOn: {I}.S.ballOn }})")
            time.sleep(1.5)
            resB = B.evaluate(f"() => ({{ seen: {I}.MP.seenMsg, ballOn: {I}.S.ballOn, phase: {I}.S.phase }})")
            print("pA's result:", resA, " pB sees:", resB)
            checks += [("the pass went to pB", resA["target"] == "pB"),
                       ("pB caught it and was tackled where pB was (about 9-10 yards)", "for" in resA["msg"] and 8 <= 75 - resA["ballOn"] <= 12),
                       ("pB sees the same spot", resB["ballOn"] == resA["ballOn"])]
            # pB switches to defense: next play pB covers a receiver
            B.evaluate(f"() => {{ {I}.cycleRole(); }}")
            A.wait_for_function(f"() => {I}.S.phase === 'pre' && {I}.COV.some((c) => c.human === 'pB')", timeout=30000)
            B.wait_for_function(f"() => {I}.MP.role === 2", timeout=20000)
            d = B.evaluate(f"() => ({{ role: {I}.MP.role, slot: {I}.MP.slot }})")
            print("pB on defense:", d)
            checks.append(("pB switches to defense and takes a defender's spot", d["role"] == 2))
            for name, good in checks:
                print(f"{'ok  ' if good else 'FAIL'}  {name}")
                ok &= bool(good)
            if errors:
                print("page errors:", errors[:4]); ok = False
            browser.close()
    finally:
        server.terminate()
    print("\nfootball multiplayer checks passed" if ok else "\nfootball multiplayer checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
