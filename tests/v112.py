"""v112: capture the flag, soccer and laser tag draw their bots smoothly on every screen (from the referee's snapshots,
a little in the past: core/match.js MATCH.follow).

For each game, two players, 120 ms of delay each way and 30 ms of jitter (A referees). Once bots are about:
  - B draws them from its timeline (it has the referee's stamped snapshots)
  - over 2 s they move on B's screen, and stay close to where the referee has them
(The smoothness of the timeline itself is tested directly in tests/v110.py.)

    THREE_JS=/path/to/three.min.js python3 tests/v112.py
"""
import os, sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
# (game id, its internals, the list of bots, how to start a game there if one isn't started by itself)
GAMES = [("ctf", "ctfInternals", "bots", ""), ("soccer", "socInternals", "sbots", ""), ("lasertag", "ltInternals", "lbots", "L.startGame && L.startGame()")]
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
        for gid, inter, lst, start in GAMES:
            ctx = browser.new_context(viewport={"width": 640, "height": 400})
            ctx.add_init_script(FAKE_ROOM)
            if THREE_JS: ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
            for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): ctx.route(pat, lambda r: r.abort())
            errors = []
            def join(who):
                pg = ctx.new_page()
                pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
                pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}&lag=120&jitter=30")
                pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=30000)
                i = pg.evaluate(f"() => LEVEL_META.findIndex((m) => m.id === '{gid}')")
                pg.evaluate(f"() => window.__fd.switchLevel({i})")
                pg.locator("#btn-flat").click()
                return pg, i
            A, LV = join("pA"); A.wait_for_timeout(1200)
            B, _ = join("pB"); B.wait_for_timeout(2500)
            if start: A.evaluate(f"() => {{ const L = window.__fd.LEVELS[{LV}]; {start}; }}")
            I = f"window.__fd.LEVELS[{LV}].{inter}"
            try:
                B.wait_for_function(f"() => {I}.{lst}.filter((b) => b.active).length > 0 && {I}.FOL.T.size() >= 3", timeout=25000)
            except Exception:
                pass
            B.wait_for_timeout(2500)
            frames = B.evaluate(f"""() => new Promise((res) => {{ const I = {I}, out = []; let n = 0;
              const tick = () => {{ out.push(I.{lst}.map((b) => [b.active ? 1 : 0, b.rx, b.rz, b.x, b.z])); if (++n < 60) requestAnimationFrame(tick); else res(out); }}; tick(); }})""")
            size = B.evaluate(f"() => {I}.FOL.T.size()")
            # (bots in play the whole time, and not sent back to base during it: a tagged bot jumps home, by design)
            act = [k for k in range(len(frames[0])) if all(f[k][0] for f in frames) and all(abs(b[k][3] - a[k][3]) + abs(b[k][4] - a[k][4]) < 4 for a, b in zip(frames, frames[1:]))]
            moved = sum(abs(b[k][1] - a[k][1]) + abs(b[k][2] - a[k][2]) for a, b in zip(frames, frames[1:]) for k in act)
            off = max([max(abs(f[k][1] - f[k][3]), abs(f[k][2] - f[k][4])) for f in frames for k in act] or [99])
            check(f"{gid}: B draws the bots from the referee's stamped snapshots ({size} in its timeline, {len(act)} bots)", size >= 2 and act, f"{size}, {act}")
            check(f"{gid}: they move on B's screen (total {moved:.1f} m)", moved > 0.5, f"{moved}")
            check(f"{gid}: close to where the referee has them (at most {off:.2f} m off)", off < 2.6, f"{off}")
            check(f"{gid}: no errors", not errors, str(errors[:3]))
            ctx.close()
        browser.close()
finally:
    server.terminate()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
