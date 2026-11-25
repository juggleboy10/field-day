"""v133: in the headset, only the messages that matter: a new record or a best, and how a game ended.

  - an everyday message (a hit, a distance, whose turn it is) stays on the screen, not in the headset
  - a new record, "your best", "new best", and a game's end ("Time!", "Game over", "Finished 2nd", a final score) do show
  - the big banners: a result (win, lose, draw) shows in the headset; the countdown, GO and a boss's arrival don't
  - pickleball's point scores stay off it, as before
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v133.py
"""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page = b.new_page(viewport={"width": 640, "height": 400})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    # what reaches the headset panel: reset it to a marker, send a message, see if the panel took it
    probe = lambda t: page.evaluate("""((t) => { const T = __fd.VR_TOAST; T.reset ? T.reset() : 0; T.text = '-'; T.kind = ''; T.bigUntil = 0; showToast(t); return T.text === t; })""", t)
    everyday = ["Hit! 212 ft", "You're on Blue now", "Strike 2", "Ball 3: your turn", "That one went 34 m", "Nice catch!"]
    worthy = ["\U0001F3C6 New record! Longest drive: 312 ft", "Time! 24 points (your best!)", "Game over: 187, your best yet!",
              "Finished 2nd in 63.2 s", "Time! Final: 21 points, a new best! (5/8)", "Lap 1:02.3, new best!", "Round over: 88 points. Draw again"]
    ev = {t: probe(t) for t in everyday}; wo = {t: probe(t) for t in worthy}
    print("  everyday in the headset:", [t for t, v in ev.items() if v]); print("  important left out:", [t for t, v in wo.items() if not v])
    check("everyday messages stay on the screen, not in the headset", not any(ev.values()), ev)
    check("new records, bests and a game's end show in the headset", all(wo.values()), wo)
    check("a message can still ask for the headset outright", page.evaluate("(() => { __fd.VR_TOAST.text = '-'; showToast('Hello', { vr: true }); return __fd.VR_TOAST.text; })()") == "Hello")
    big = page.evaluate("""(() => { const A = __fd.ANNOUNCE, T = __fd.VR_TOAST, out = {}; const go = (k, f) => { T.bigUntil = 0; const was = T.text; f(); out[k] = T.text === was ? '-' : T.text; };
      A.reset(); go('count', () => A.count(3)); go('go', () => A.go()); go('boss', () => A.banner('THE WARDEN', 'Keeper of the Crypt', 'boss'));
      go('win', () => A.win('Blue wins!', 'win')); go('lose', () => A.win('Red wins!', 'lose')); return out; })()""")
    print("  banners in the headset:", big)
    check("the countdown, GO and a boss's arrival stay off the headset", big["count"] == "-" and big["go"] == "-" and big["boss"] == "-", big)
    check("a result (win or loss) shows in the headset", big["win"] == "Blue wins!" and big["lose"] == "Red wins!", big)
    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
