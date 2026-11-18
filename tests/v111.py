"""v111: pickleball doubles when the player with the ball goes away.

Two partners on the west side (pA, pB), the court bots on the east, 120 ms of delay each way and 30 ms of jitter.
Mid-rally the ball is pA's to run; then pA's page goes silent (a headset taken off, a frozen browser):
  - within 2.5 s pB's court no longer counts pA (the court bot takes the spot) and pB takes on the ball
  - the game doesn't hang: the point is replayed and play carries on
  - when pA comes back, both pages agree again on who has the ball and what's happening

    THREE_JS=/path/to/three.min.js python3 tests/v111.py
"""
import os, sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
I, PB = "window.__fd.LEVELS[15].pb.internals", "window.__fd.LEVELS[15].pb"
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

ST = f"() => ({{ auth: {PB}.auth, ph: {PB}.ph, ver: {PB}.ver, slots: {I}.slots(), bots: {I}.botSlots() }})"
port = free_port()
server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 700, "height": 450})
        ctx.add_init_script(FAKE_ROOM)
        if THREE_JS: ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): ctx.route(pat, lambda r: r.abort())
        errors = []
        pages = {}
        for who in ("pA", "pB"):
            pg = ctx.new_page()
            pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
            pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}&lag=120&jitter=30")
            pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=30000)
            pages[who] = pg
        A, B = pages["pA"], pages["pB"]
        for pg in (A, B): pg.locator("#btn-flat").click(); pg.evaluate("() => window.__fd.switchLevel(15)")
        time.sleep(3)
        def grab(pg, k, dz):
            pg.evaluate(f"() => {{ const fd = window.__fd, t = {I}.paddles[{k}]; fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + {dz}); }}")
            time.sleep(0.6); pg.keyboard.press("KeyE"); time.sleep(0.8)
        grab(A, 0, 0.6); grab(B, 1, -0.6)
        time.sleep(2.5)
        a, b = A.evaluate(ST), B.evaluate(ST)
        check("partners on the west side, bots on the east", a["slots"][:2] == ["pA", "pB"] and b["slots"][:2] == ["pA", "pB"] and b["bots"] == [2, 3], f"{a} / {b}")
        # mid-rally, the ball pA's to run
        A.evaluate("() => window.__fd.dolly.position.set(-6, 0, 1.5)"); B.evaluate("() => window.__fd.dolly.position.set(-6, 0, -1.5)")
        time.sleep(1.0)
        A.evaluate(f"""() => {{ const PB = {PB}; Object.assign(PB, {{ ph: 'rally', lastHit: 0, need: 1, hits: 4, bounced: true, auth: 'pA' }});
          Object.assign(PB.b, {{ x: 1.0, y: 1.6, z: 0.5, vx: 6, vy: 2, vz: 0, wx: 0, wy: 0, wz: 0 }}); PB.ver += 5; }}""")
        time.sleep(0.6)
        # pA goes silent (its page carries on, alone)
        A.evaluate("() => window.__netStop()")
        t0 = time.time()
        B.wait_for_function(f"() => {PB}.auth === 'pB'", timeout=8000)
        took = time.time() - t0
        b = B.evaluate(ST)
        check(f"pA goes silent: pB takes on the ball ({took:.1f} s)", took < 3.0, f"{took:.1f} s")
        check("and pB's court no longer counts pA (the bot takes the spot)", b["slots"][0] is None and 0 in b["bots"], str(b))
        # the game carries on: the point replayed, then served and played
        seen = set()
        for _ in range(40):
            seen.add(B.evaluate(f"() => {PB}.ph")); time.sleep(0.25)
        check(f"play carries on (phases seen: {sorted(seen)})", "serve" in seen or "rally" in seen, str(seen))
        # pA comes back
        A.evaluate("() => window.__netGo()")
        time.sleep(3.5)
        a, b = A.evaluate(ST), B.evaluate(ST)
        check("pA back: both agree who has the ball", a["auth"] == b["auth"], f"{a['auth']} / {b['auth']}")
        check("and both count both partners again", a["slots"][:2] == ["pA", "pB"] and b["slots"][:2] == ["pA", "pB"], f"{a['slots']} / {b['slots']}")
        check("no errors", not errors, str(errors[:3]))
        browser.close()
finally:
    server.terminate()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
