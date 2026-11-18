"""v110: dodgeball and snowball fight on a poor connection: the bots move smoothly on every screen, and the round's
clock carries on when the referee drops out.

For each game, two players, 120 ms of delay each way and 30 ms of jitter (A referees):
  - the timeline itself (fed snapshots for something at a steady speed, late, uneven and bunched; every 50 ms, and
    every 200 ms as from a struggling referee) draws it at that steady speed, never stalling
  - once the round is on, B's screen draws the bots moving, never far from where the referee has them
  - A's connection drops mid-round: B takes over, the round goes on (not ended), with about the time left it had

    THREE_JS=/path/to/three.min.js python3 tests/v110.py
"""
import os, sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
GAMES = [("dodgeball", "dbInternals"), ("snowball", "swInternals")]
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
        # ---- the timeline itself: something moving at a steady 5 m/s, its snapshots every 50 ms (or, from a struggling
        # referee, every 200 ms), arriving 120 ms late give or take 30, sometimes bunched together. Drawn at 72 frames a
        # second, it should move at a steady 5 m/s: no stops, no leaps.
        ctx0 = browser.new_context(); pg0 = ctx0.new_page()
        if THREE_JS: pg0.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**"): pg0.route(pat, lambda r: r.abort())
        pg0.goto((ROOT / "index.html").as_uri() + "?test"); pg0.wait_for_function("() => window.__fdReady === true", timeout=60000)
        for every in (50, 200):
            r = pg0.evaluate("""(every) => { const T = window.__fd.MATCH.timeline(100), out = [], arrivals = [];
              let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
              for (let rt = 0; rt < 6000; rt += every) arrivals.push([rt + 5000 + 120 + (rnd() * 2 - 1) * 30 + (rnd() < 0.1 ? 60 : 0), rt]);
              arrivals.sort((a, b) => a[0] - b[0]);
              let ai = 0, last = null, worst = 0, settled = 0, settledN = 0, slow = 0, n = 0;
              for (let now = 5000; now < 11000; now += 1000 / 72) {
                while (ai < arrivals.length && arrivals[ai][0] <= now) { const rt = arrivals[ai][1]; T.push(rt, [rt * 0.005], now); ai++; }
                if (!T.at(out, 4, now)) continue;
                if (last !== null && now > 6000) { const v = (out[0] - last) / (1 / 72); worst = Math.max(worst, Math.abs(v - 5)); if (now > 8000) { settledN = (settledN || 0) + 1; if (Math.abs(v - 5) > 0.6) settled++; } if (Math.abs(v) < 1) slow++; n++; }
                last = out[0];
              }
              return { worst, settled, settledN, slow, n, behind: T.behind() }; }""", every)
            # (while it settles, drawing may run up to 30% slow by design: 1.5 m/s off at 5; once settled, steady)
            check(f"timeline, snapshots every {every} ms: never stalls or leaps (worst {r['worst']:.2f} m/s off 5, {r['slow']} stalled frames of {r['n']})", r["worst"] <= 1.55 and r["slow"] == 0, str(r))
            check(f"timeline, snapshots every {every} ms: steady once settled ({r['settled']} of {r['settledN']} frames off speed; drawing {r['behind']:.0f} ms behind)", r["settled"] <= 0.05 * r["settledN"], str(r))
        ctx0.close()
        for gid, inter in GAMES:
            ctx = browser.new_context(viewport={"width": 700, "height": 450})
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
            B, _ = join("pB")
            I = f"window.__fd.LEVELS[{LV}].{inter}"
            # wait for the round to be on, on B's screen
            B.wait_for_function(f"() => {I}.RS.st === 'play'", timeout=20000)
            B.wait_for_timeout(1500)
            SAMPLE = f"""() => new Promise((res) => {{ const I = {I}, out = []; let n = 0;
              const tick = () => {{ out.push([performance.now(), I.bots.map((b) => [b.g.visible ? 1 : 0, b.g.position.x, b.g.position.z, b.x, b.z, b.out ? 1 : 0])]); if (++n < 150) requestAnimationFrame(tick); else res(out); }}; tick(); }})"""
            def speeds(frames):
                # the fastest a bot in play the whole time moves over any 100 ms (frames can land a millisecond apart)
                nb = len(frames[0][1])
                playing = [all(f[1][k][0] and not f[1][k][5] for f in frames) for k in range(nb)]
                worst, moved, off = 0, 0, 0
                for k in range(nb):
                    if not playing[k]: continue
                    for i0 in range(len(frames)):
                        t0, a = frames[i0]
                        for i1 in range(i0 + 1, len(frames)):
                            t1, b = frames[i1]
                            if t1 - t0 >= 100:
                                worst = max(worst, max(abs(b[k][1] - a[k][1]), abs(b[k][2] - a[k][2])) / ((t1 - t0) / 1000)); break
                    for (_, a), (_, b) in zip(frames, frames[1:]): moved += abs(b[k][1] - a[k][1]) + abs(b[k][2] - a[k][2])
                    for _, a in frames: off = max(off, abs(a[k][1] - a[k][3]), abs(a[k][2] - a[k][4]))
                return worst, moved, off
            _, moved, off = speeds(B.evaluate(SAMPLE))
            check(f"{gid}: bots move on B's screen (total {moved:.1f} m)", moved > 1, f"{moved}")
            # (drawn up to 0.4 s behind, at up to 6 m/s)
            check(f"{gid}: close to where the referee has them (at most {off:.2f} m off)", off < 2.6, f"{off}")
            # A's connection drops mid-round
            left0 = B.evaluate(f"() => {I}.RS.left")
            A.evaluate("() => window.__netStop()")
            B.wait_for_function(f"() => {I}.isHost()", timeout=6000)
            B.wait_for_timeout(1500)
            r = B.evaluate(f"() => ({{ st: {I}.RS.st, left: {I}.RS.left }})")
            check(f"{gid}: A drops out: the round goes on under B ({left0 / 1000:.0f} s -> {r['left'] / 1000:.0f} s left)", r["st"] == "play" and 0 < left0 - r["left"] < 8000, str((left0, r)))
            check(f"{gid}: no errors", not errors, str(errors[:3]))
            ctx.close()
        browser.close()
finally:
    server.terminate()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
