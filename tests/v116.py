"""v116: the countdown and who won, the same in every game (ANNOUNCE in core/shared.js; MATCH calls it itself).

  - ANNOUNCE.count shows each number once ("3", "2", "1"), GO and the result show big on screen and in the headset
  - a small message doesn't cover a big one in the headset
  - Tabletop Brawl (on the match kit): 3, 2, 1, FIGHT!, then who won, with a win / lose / draw colour
  - a race (kayak): 3, 2, 1, GO!
  - dodgeball: the countdown and GO! from its own round code
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v116.py
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

# every big message shown, in order (text and colour class)
WATCH = """(() => { window.__big = []; const el = document.getElementById('big-msg');
  new MutationObserver(() => { const t = el.textContent, last = __big[__big.length - 1];
    if (!last || last[0] !== t || last[1] !== el.className.replace(' show', '')) __big.push([t, el.className.replace(' show', '').replace(' long', '')]); })
  .observe(el, { childList: true, characterData: true, subtree: true, attributes: true }); })()"""
texts = lambda page: [t for t, _ in page.evaluate("__big")]
def ordered(seq, want):
    i = 0
    for t in seq:
        if i < len(want) and t == want[i]: i += 1
    return i == len(want)

def go(page, pid):
    i = page.evaluate(f"LEVEL_META.findIndex((m) => m.id === '{pid}')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(1200)
    page.evaluate("__big.length = 0")
    return i

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page = b.new_page(viewport={"width": 640, "height": 400})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    page.evaluate(WATCH)

    # ------------------------------------------------ the announcer itself
    r = page.evaluate("""(() => { const A = __fd.ANNOUNCE; A.reset();
      const nums = []; for (const t of [3, 2.9, 2.5, 2, 1.7, 1.2, 0.6, 0.1]) { const was = A.last; A.count(t); if (A.last !== was) nums.push(A.last.text); }
      A.go(); const go = __fd.VR_TOAST.text;
      A.win('Blue wins!', 'win');
      const el = document.getElementById('big-msg');
      __fd.VR_TOAST.show('a small message');
      return { nums, go, shown: el.classList.contains('show'), cls: el.className, vr: __fd.VR_TOAST.text, kind: __fd.VR_TOAST.kind }; })()""")
    check("each number once: 3, 2, 1", r["nums"] == ["3", "2", "1"], r["nums"])
    check("GO reaches the headset panel too", r["go"] == "GO!", r)
    check("the result shows big, in the winner's colour", r["shown"] and "win" in r["cls"], r)
    check("a small message doesn't cover it in the headset", r["vr"] == "Blue wins!" and r["kind"] == "win", r)
    page.wait_for_timeout(3300)
    check("and it goes away", not page.evaluate("document.getElementById('big-msg').classList.contains('show')"))

    # ------------------------------------------------ Tabletop Brawl, on the match kit
    i = go(page, "brawl")
    page.evaluate(f"__fd.LEVELS[{i}].brawlInternals.startMatch()")
    page.wait_for_timeout(4500)
    seq = texts(page)
    check("Brawl: 3, 2, 1, FIGHT!", ordered(seq, ["3", "2", "1", "FIGHT!"]), seq)
    page.evaluate(f"""(() => {{ const I = __fd.LEVELS[{i}].brawlInternals; const f = I.F.find((f) => f.on && f.bot); I.H.winner = f ? f.slot : -1; I.M.over(); }})()""")
    page.wait_for_timeout(800)
    last = page.evaluate("__big[__big.length - 1]")
    check("Brawl: who won, as a loss when a bot wins", last and last[0].endswith("wins!") and last[1] in ("lose", "draw"), last)

    # ------------------------------------------------ a race
    i = go(page, "kayak")
    page.evaluate(f"__fd.LEVELS[{i}].kayakInternals.startRace()")
    page.wait_for_timeout(4800)
    seq = texts(page)
    check("kayak: 3, 2, 1, GO!", ordered(seq, ["3", "2", "1", "GO!"]), seq)

    # ------------------------------------------------ dodgeball's own round
    i = go(page, "dodgeball")
    page.evaluate(f"__fd.LEVELS[{i}].dbInternals.beginCount(performance.now())")
    page.wait_for_timeout(5500)
    seq = texts(page)
    check("dodgeball: a countdown, then GO!", ordered(seq, ["2", "1", "GO!"]), seq)

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
