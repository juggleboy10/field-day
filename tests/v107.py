"""v107: one rule for who referees (core/referee.js), tested on a poor connection.

Two pages in Hot Potato (a game whose referee runs the rounds, the fuse and the bots), with 120 ms of delay each way
and 30 ms of jitter:
  - the first one there referees, and someone with a lower id joining later doesn't take over (no flicker)
  - the referee's connection drops (its page carries on alone): the other takes over within 2.5 seconds, the game
    carries on from where it was (same round, not reset), and the old referee gives way (a higher hand-over number)
  - when it reconnects it doesn't take the game back
  - the referee takes its headset off (away): the other takes over at once (well under a second)
  - both pages always agree on who the referee is, once things settle

    THREE_JS=/path/to/three.min.js python3 tests/v107.py
"""
import os, sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
LV = 18
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

REF = f"() => {{ const fd = window.__fd, L = fd.LEVELS[{LV}]; return fd.refereeOf(L); }}"
POT = f"""() => {{ const fd = window.__fd, I = fd.LEVELS[{LV}].potatoInternals, RS = I.RS;
  return {{ host: I.isHost(), round: RS.round, ph: RS.ph, holder: RS.holder, flying: !!RS.fl, heat: Math.round(RS.heat * 100), alive: RS.alive.length, ep: fd.LIVE.ep, ref: fd.LIVE.ref }}; }}"""

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
        def join(who):
            pg = ctx.new_page()
            pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
            pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}&lag=120&jitter=30")
            pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=30000)
            pg.evaluate(f"() => window.__fd.switchLevel({LV})")
            pg.locator("#btn-flat").click()
            pg.evaluate(f"() => {{ const F = window.__fd.LEVELS[{LV}].potatoInternals.FUSE; F[0] = 2500; F[1] = 3500; }}")
            return pg
        # B first, so it referees; then A, whose id is lower
        B = join("pB")
        B.wait_for_timeout(1500)
        check("alone, B referees", B.evaluate(REF) == "pB")
        A = join("pA")
        A.wait_for_timeout(4000)
        refs = (A.evaluate(REF), B.evaluate(REF))
        check("A joins (lower id): B stays referee, and both agree", refs == ("pB", "pB"), str(refs))
        check("only B runs the game", B.evaluate(POT)["host"] and not A.evaluate(POT)["host"])
        # let a round get going
        A.wait_for_timeout(5000)
        before = B.evaluate(POT)
        # B's connection drops; its page carries on
        B.evaluate("() => window.__netStop()")
        t0 = time.time()
        A.wait_for_function(f"() => window.__fd.LEVELS[{LV}].potatoInternals.isHost()", timeout=6000)
        took = time.time() - t0
        check(f"B's connection drops: A takes over ({took:.1f} s)", took < 2.6, f"{took:.1f} s")
        after = A.evaluate(POT)
        check("A carries on from where the game was (not reset)", after["round"] >= before["round"], f"{before} -> {after}")
        check("A took a higher hand-over number", after["ep"] > before["ep"], f"{before['ep']} -> {after['ep']}")
        B.wait_for_timeout(600)
        check("B (still cut off, but hearing A) gives way", not B.evaluate(POT)["host"] and B.evaluate(REF) == "pA", str(B.evaluate(POT)))
        # the game goes on under A
        r0 = A.evaluate(POT)
        A.wait_for_timeout(7000)
        r1 = A.evaluate(POT)
        # (the round, the phase, who holds it, the fuse's heat: something moves on within 7 seconds)
        check("the game goes on under A", (r1["round"], r1["ph"], r1["holder"], r1["heat"]) != (r0["round"], r0["ph"], r0["holder"], r0["heat"]), f"{r0} -> {r1}")
        # B reconnects: A keeps it
        B.evaluate("() => window.__netGo()")
        A.wait_for_timeout(2500)
        refs = (A.evaluate(REF), B.evaluate(REF))
        check("B reconnects: A stays referee, both agree", refs == ("pA", "pA"), str(refs))
        # A takes its headset off
        A.evaluate("() => window.__fd.setAway(true)")
        t0 = time.time()
        B.wait_for_function(f"() => window.__fd.LEVELS[{LV}].potatoInternals.isHost()", timeout=4000)
        took = time.time() - t0
        check(f"A takes its headset off: B takes over at once ({took:.1f} s)", took < 1.0, f"{took:.1f} s")
        A.evaluate("() => window.__fd.setAway(false)")
        A.wait_for_timeout(2500)
        refs = (A.evaluate(REF), B.evaluate(REF))
        check("A puts it back on: B stays referee, both agree", refs == ("pB", "pB"), str(refs))
        check("no errors", not errors, str(errors[:3]))
        browser.close()
finally:
    server.terminate()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
