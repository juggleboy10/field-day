"""v109: Tabletop Brawl draws smoothly on a poor connection, and your own fighter moves the moment you press.

Two players, 120 ms of delay each way and 30 ms of jitter. B isn't the referee.
  - B holds Left (toward the middle): B's own fighter starts moving on B's screen at once (before the referee has even heard about it),
    where the referee's numbers for it haven't moved yet
  - B lets go: after a moment, where B's screen shows its fighter and where the referee has it agree (within 0.4)
  - a jump shows at once on B's screen too
  - other fighters on B's screen are drawn from the referee's snapshots a little in the past (the timeline has them),
    and move smoothly: no frame-to-frame jump bigger than they can really move
  - the referee's own screen is unchanged (it draws its own numbers)

    THREE_JS=/path/to/three.min.js python3 tests/v109.py
"""
import os, sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
LV = 60
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

MINE = f"""() => {{ const fd = window.__fd, I = fd.LEVELS[{LV}].brawlInternals, k = I.F.findIndex((f) => f.on && f.peer === fd.state.myPeer);
  return {{ k, drawn: k >= 0 ? I.view[k].x : null, drawnY: k >= 0 ? I.view[k].y : null, auth: k >= 0 ? I.F[k].x : null, pred: !!I.P.f, host: I.isHost(), tl: I.TL.size() }}; }}"""

port = free_port()
server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 800, "height": 500})
        ctx.add_init_script(FAKE_ROOM)
        if THREE_JS: ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): ctx.route(pat, lambda r: r.abort())
        errors = []
        def join(who):
            pg = ctx.new_page()
            pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
            pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}&lag=120&jitter=30")
            pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=30000)
            pg.evaluate(f"() => window.__fd.switchLevel({LV})")
            pg.locator("#btn-flat").click()
            return pg
        A = join("pA"); A.wait_for_timeout(1200)
        B = join("pB"); B.wait_for_timeout(4000)
        m = B.evaluate(MINE)
        check("B has a fighter and isn't the referee", m["k"] >= 0 and not m["host"], str(m))
        check("B predicts its own fighter", m["pred"], str(m))
        check("B has the referee's snapshots in its timeline", m["tl"] >= 2, str(m))
        # B holds Right (a practice in the lobby: the referee runs everyone there too)
        x0 = B.evaluate(MINE)
        B.keyboard.down("KeyA")
        B.wait_for_timeout(90)
        x1 = B.evaluate(MINE)
        check(f"B's fighter moves at once on B's screen ({x0['drawn']:.2f} -> {x1['drawn']:.2f} in 90 ms)", x0["drawn"] - x1["drawn"] > 0.15, str((x0, x1)))
        check("while the referee's numbers for it haven't moved yet", abs(x1["auth"] - x0["auth"]) < 0.05, str((x0["auth"], x1["auth"])))
        B.wait_for_timeout(300)
        B.keyboard.up("KeyA")
        B.wait_for_timeout(1500)
        e = B.evaluate(MINE)
        ref = A.evaluate(f"() => {{ const I = window.__fd.LEVELS[{LV}].brawlInternals; return I.F[{e['k']}].x; }}")
        check(f"after letting go, B's screen and the referee agree ({e['drawn']:.2f} vs {ref:.2f})", abs(e["drawn"] - ref) < 0.4, f"{e['drawn']} vs {ref}")
        check("and B really moved", x0["auth"] - ref > 1.0, f"{x0['auth']} -> {ref}")
        # a jump
        y0 = B.evaluate(MINE)["drawnY"]
        B.keyboard.press("KeyW")
        B.wait_for_timeout(100)
        y1 = B.evaluate(MINE)["drawnY"]
        check(f"a jump shows at once ({y0:.2f} -> {y1:.2f} in 100 ms)", y1 - y0 > 0.3, f"{y0} -> {y1}")
        # the others, drawn from the timeline: sample every frame for 1.5 s while bots move about
        A.evaluate(f"() => window.__fd.LEVELS[{LV}].startMatch()")
        B.wait_for_timeout(4200)
        frames = B.evaluate(f"""() => new Promise((res) => {{ const I = window.__fd.LEVELS[{LV}].brawlInternals, me = window.__fd.state.myPeer, out = [];
          const ks = I.F.map((f, k) => (f.on && f.bot ? k : -1)).filter((k) => k >= 0); let n = 0;
          const tick = () => {{ out.push([performance.now(), ks.map((k) => [I.view[k].x, I.view[k].y])]); if (++n < 120) requestAnimationFrame(tick); else res(out); }}; tick(); }})""")
        worst, jumps = 0, 0
        for (t0, a), (t1, b) in zip(frames, frames[1:]):
            dt = max(1, t1 - t0) / 1000
            for (x0_, y0_), (x1_, y1_) in zip(a, b):
                d = max(abs(x1_ - x0_), abs(y1_ - y0_))
                if d > 4: jumps += 1; continue          # (a knockout and respawn: meant to jump)
                worst = max(worst, d / dt)
        moved = sum(abs(b[i][0] - a[i][0]) for (_, a), (_, b) in zip(frames, frames[1:]) for i in range(len(a)))
        check(f"the bots move on B's screen (total {moved:.1f})", moved > 1.0, f"{moved}")
        # (the fastest anything really moves is a knockback: about 30 arena units a second)
        check(f"smoothly: the fastest drawn speed is {worst:.0f} units/s, with {jumps} respawn jumps", worst < 45, f"{worst}")
        a = A.evaluate(MINE)
        check("the referee draws its own numbers", a["host"] and abs(a["drawn"] - a["auth"]) < 1e-6, str(a))
        check("no errors", not errors, str(errors[:3]))
        browser.close()
finally:
    server.terminate()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
