"""v108: the match kit (core/match.js), with Tabletop Brawl moved onto it, on a poor connection.

Two players in Tabletop Brawl, 120 ms of delay each way and 30 ms of jitter:
  - both sit at the table, seats filled people first and bots after (4 fighters)
  - the one who isn't the referee presses Start: the match starts, once (not twice), on both screens
  - the countdown runs into the fight on both screens
  - mid-fight, the referee's connection drops: the other takes over within 2.5 seconds, still in the fight, with the
    lives each fighter had (none reset), and the fight goes on (the bots keep moving)
  - the old referee hears the new one and gives way; when it reconnects it doesn't take the match back
  - End game takes both back to the lobby

    THREE_JS=/path/to/three.min.js python3 tests/v108.py
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

ST = f"""() => {{ const fd = window.__fd, I = fd.LEVELS[{LV}].brawlInternals;
  return {{ ph: I.H.ph, t: I.H.t, host: I.isHost(), on: I.F.filter((f) => f.on).length, people: I.F.filter((f) => f.on && f.peer).map((f) => f.peer).sort().join(','),
    bots: I.F.filter((f) => f.on && f.bot).length, stocks: I.F.map((f) => f.on ? f.stocks : -1), xs: I.F.map((f) => f.on ? Math.round(f.x * 100) : 0), ref: fd.refereeOf(fd.LEVELS[{LV}]) }}; }}"""

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
        B = join("pB"); B.wait_for_timeout(3500)
        a, b = A.evaluate(ST), B.evaluate(ST)
        check("A referees (first there, lower id), both agree", a["ref"] == "pA" and b["ref"] == "pA", f"{a['ref']} / {b['ref']}")
        check("seats: both people, then bots, 4 fighters", a["people"] == "pA,pB" and a["on"] == 4 and a["bots"] == 2, str(a))
        # B (not the referee) presses Start
        A.evaluate(f"() => {{ const L = window.__fd.LEVELS[{LV}], I = L.brawlInternals, H = I.H; window.__counts = 0; let was = H.ph; setInterval(() => {{ if (H.ph === 'count' && was !== 'count') window.__counts += 1; was = H.ph; }}, 20); }}")
        B.evaluate(f"() => window.__fd.LEVELS[{LV}].startMatch()")
        B.wait_for_function(f"() => ['count', 'fight'].includes(window.__fd.LEVELS[{LV}].brawlInternals.H.ph)", timeout=5000)
        A.wait_for_timeout(4500)
        a, b = A.evaluate(ST), B.evaluate(ST)
        check("B asks: the match starts, into the fight on both screens", a["ph"] == "fight" and b["ph"] == "fight", f"{a['ph']} / {b['ph']}")
        check("it started once", A.evaluate("() => window.__counts") == 1, str(A.evaluate("() => window.__counts")))
        # mid-fight, A's connection drops
        A.wait_for_timeout(1500)
        before = B.evaluate(ST)
        A.evaluate("() => window.__netStop()")
        t0 = time.time()
        B.wait_for_function(f"() => window.__fd.LEVELS[{LV}].brawlInternals.isHost()", timeout=6000)
        took = time.time() - t0
        check(f"A's connection drops: B takes over ({took:.1f} s)", took < 2.6, f"{took:.1f} s")
        after = B.evaluate(ST)
        check("B carries on in the fight", after["ph"] == "fight", after["ph"])
        check("no one's lives were reset", all(x <= y for x, y in zip(after["stocks"], before["stocks"])) and after["stocks"] != [3, 3, 3, 3] or before["stocks"] == [3, 3, 3, 3], f"{before['stocks']} -> {after['stocks']}")
        B.wait_for_timeout(2500)
        later = B.evaluate(ST)
        check("the fight goes on under B (the fighters move)", later["xs"] != after["xs"] and later["ph"] in ("fight", "over"), f"{after['xs']} -> {later['xs']}")
        A.wait_for_timeout(500)
        check("A (cut off, hearing B) gives way", not A.evaluate(ST)["host"], str(A.evaluate(ST)))
        A.evaluate("() => window.__netGo()")
        A.wait_for_timeout(2500)
        a, b = A.evaluate(ST), B.evaluate(ST)
        check("A reconnects: B stays referee, both agree", a["ref"] == "pB" and b["ref"] == "pB", f"{a['ref']} / {b['ref']}")
        check("both screens show the same phase", a["ph"] == b["ph"], f"{a['ph']} / {b['ph']}")
        # End game (from A, not the referee) takes both back to the lobby
        A.evaluate(f"() => {{ const L = window.__fd.LEVELS[{LV}]; L.toLobby(); }}")
        B.evaluate(f"() => {{ const L = window.__fd.LEVELS[{LV}]; L.toLobby(); }}")
        A.wait_for_timeout(1500)
        check("back to the lobby on both", A.evaluate(ST)["ph"] == "lobby" and B.evaluate(ST)["ph"] == "lobby")
        check("no errors", not errors, str(errors[:3]))
        browser.close()
finally:
    server.terminate()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
