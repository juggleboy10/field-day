"""v114: musical chairs is fair on a poor connection: each player is timed from when the music stopped for them.

Two players, 120 ms of delay each way and 30 ms of jitter. A referees (and runs the bots). In a close race for one
chair, a bot sits beside it and reacts 0.4 s after the music stops on A's device; B gets to it a few hundredths of a
second after the music stops on B's device (which hears it about 0.12 s later):
  - B gets the chair: B was quicker, even though B's news reaches the referee after the bot's
    (it used to go to the bot: B's position reached the referee a quarter of a second late)
  - both screens agree on who has it
  - a player on its own gets a chair just by standing at one (nothing changed there)

    THREE_JS=/path/to/three.min.js python3 tests/v114.py
"""
import os, sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
LV = 32
I = f"window.__fd.LEVELS[{LV}].mcInternals"
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

port = free_port()
server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 320, "height": 200})
        ctx.add_init_script(FAKE_ROOM)
        if THREE_JS: ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): ctx.route(pat, lambda r: r.abort())
        errors = []
        def join(who):
            pg = ctx.new_page()
            pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
            pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}&lag=120&jitter=30")
            pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=30000)
            pg.evaluate(f"() => window.__fd.switchLevel({LV})"); pg.locator("#btn-flat").click()
            return pg
        A = join("pA"); A.wait_for_timeout(1200)
        B = join("pB"); B.wait_for_timeout(2500)
        # a game of four: A, B and two bots; the music stops in 3 s
        A.evaluate(f"() => {{ const L = window.__fd.LEVELS[{LV}]; L.picker.n = 4; {I}.startGame(); {I}.S.stopAt = Date.now() + 3000; forcePresence(); }}")
        B.wait_for_function(f"() => {I}.S.ph === 'walk' && {I}.S.ids.includes('pB')", timeout=8000)
        n = A.evaluate(f"() => {I}.S.n")
        # A walks off (it isn't racing); the quick bot waits beside chair 1, the other bot is slow
        A.evaluate(f"""() => {{ const I = {I}, S = I.S, n = S.n, q = I.chairPos(1, n);
          window.__fd.dolly.position.set(0, 0, 8);
          const ids = S.ids.filter((id) => id[0] === 'b' && id.length <= 2);
          const fast = I.bots[Number(ids[0].slice(1))], slow = I.bots[Number(ids[1].slice(1))];
          window.__race = {{ fast: fast.id, chair: 1 }};
          const hold = () => {{ if (S.ph !== 'walk') return; fast.ang = Math.atan2(q.z, q.x); slow.reactT = 30; requestAnimationFrame(hold); }}; hold();
          const arm = () => {{ if (S.ph === 'grab') {{ fast.x = q.x + 0.2; fast.z = q.z; fast.reactT = 0.4; slow.reactT = 30; }} else requestAnimationFrame(arm); }}; arm();
        }}""")
        # B: as soon as the music stops on B's screen, step to chair 1
        B.evaluate(f"""() => {{ const I = {I}; const go = () => {{ if (I.S.ph === 'grab') {{ const q = I.chairPos(1, I.S.n); window.__fd.dolly.position.set(q.x, 0, q.z); window.__fd.camera.position.set(0, 1.6, 0); }} else requestAnimationFrame(go); }}; go(); }}""")
        A.wait_for_function(f"() => {I}.S.seats[1]", timeout=10000)
        A.wait_for_timeout(300)
        who, claim = A.evaluate(f"() => {I}.S.seats[1]"), B.evaluate(f"() => {I}.CL.last")
        fast = A.evaluate("() => window.__race.fast")
        check(f"B was timed from its own music stopping ({claim and round(claim['react'])} ms)", bool(claim) and claim["react"] < 400, str(claim))
        check(f"B gets the chair, though B's news reached the referee after the bot got there (chair 1: {who}; the bot: {fast})", who == "pB", str(who))
        B.wait_for_timeout(1200)
        check("both screens agree", B.evaluate(f"() => {I}.S.seats[1]") == who)
        check("no errors", not errors, str(errors[:3]))
        browser.close()
finally:
    server.terminate()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
