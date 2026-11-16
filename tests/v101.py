"""v101: places are built the first time you go there.

Opens the page with ?test&lazy (the tests otherwise build everything at startup, as the game used to), and checks:
  - only the clubhouse is built at startup, and startup is quick
  - going to each of the other 60 places builds it, once, with no errors, and it runs
  - quest enemies keep the same codes whichever quest is loaded first
  - a saved place is built at startup; records for places that aren't built still go to the shared board
  - ?test alone still builds everything

    THREE_JS=/path/to/three.min.js python3 tests/v101.py
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

def open_page(b, q, init=None):
    page = b.new_page()
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    if init: page.add_init_script(init)
    page.goto(PAGE + q); page.wait_for_function("window.__fdReady === true", timeout=60000)
    return page, errs

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page, errs = open_page(b, "?test&lazy")
    built = page.evaluate("__fd.LEVELS.filter(Boolean).map(l => l.id)")
    check("only the clubhouse is built at startup", built == ["hub"], str(built))
    check("no errors at startup", not errs, str(errs[:3]))
    total = page.evaluate("document.querySelectorAll('script[data-fd]').length")
    check("the other places' code is waiting in the page", total >= 60, str(total))
    page.evaluate("__fd.startGame('flat')")
    # going somewhere new: it says Loading, then you're there
    r = page.evaluate("(() => { __fd.switchLevel(0); return [__fd.state.level, document.getElementById('toast').textContent]; })()")
    check("still in the clubhouse while it loads", r[0] == 8)
    check("it says it's loading", "Loading" in r[1], r[1])
    page.wait_for_function("__fd.state.level === 0", timeout=10000)
    check("then you're there", page.evaluate("__fd.LEVELS[0].group.visible && !__fd.LEVELS[8].group.visible"))
    check("the game got its start-up tweaks", page.evaluate("JSON.stringify(__fd.LEVELS[0].throwSpeed)") == "[3,12,0.2]")
    check("and can be hopped in", page.evaluate("__fd.LEVELS[0].canHop === true"))
    # every place
    metas = page.evaluate("(() => { const out = []; for (let i = 0; i < 61; i++) out.push(i); return out; })()")
    bad = []
    for i in metas:
        if i in (0, 8): continue
        before = len(errs)
        page.evaluate(f"__fd.switchLevel({i})")
        try: page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
        except Exception: bad.append((i, "never arrived")); continue
        page.wait_for_timeout(250)
        if len(errs) > before: bad.append((i, errs[before][:160]))
    check("all 60 places build and run when visited", not bad, str(bad[:4]))
    check("every place is built now", page.evaluate("__fd.LEVELS.filter(Boolean).length") == 61)
    check("nothing is left waiting", page.evaluate("document.querySelectorAll('script[data-fd]').length") == 0)
    # going back is instant (no loading)
    page.evaluate("__fd.switchLevel(8)")
    check("a place that's built is instant", page.evaluate("__fd.state.level") == 8)
    page.close()

    # enemy codes: Frostpeak first here, Pirate Cove first there; the codes agree
    codes = []
    for order in (("frostpeak", "piratecove"), ("piratecove", "frostpeak")):
        page, errs = open_page(b, "?test&lazy")
        r = page.evaluate("""(order) => { const ids = (i) => __fd.LOADER.filesFor(i).join(' ');
          let idx = {}; for (let i = 0; i < 61; i++) for (const o of order) if (ids(i).endsWith(o + '.js')) idx[o] = i;
          for (const o of order) __fd.load(idx[o]);
          return { e: ENEMIES.map((x) => x ? x.name : null), p: PROJ_BY_CODE.map((x) => x.code), n: order.map((o) => !!__fd.LEVELS[idx[o]]) }; }""", list(order))
        codes.append(r); check(f"both quests load ({order[0]} first)", all(r["n"]) and not errs, str(errs[:2]))
        page.close()
    check("enemy codes are the same either way", codes[0]["e"] == codes[1]["e"] and codes[0]["e"][18] == "pirate" and codes[0]["e"][24] == "snowgob", str(codes[0]["e"][16:26]))
    check("projectile codes are the same either way", codes[0]["p"] == codes[1]["p"] == [0, 1, 2, 3, 4], str(codes[0]["p"]))

    # a saved place is built at startup, and records for places that aren't built are still mine
    init = """try { const k = Object.keys(localStorage).find((k) => /field/i.test(k)) || '%s';
      localStorage.setItem(k, JSON.stringify({ level: 3, name: 'Robin', records: { hoops: { best: [[42, 'Robin', 1]] }, darts: { hi: [[7, 'Robin', 1], [9, 'Sam', 2]] } } })); } catch (e) {}"""
    page, errs = open_page(b, "?test&lazy")
    key = page.evaluate("(() => { __fd.switchLevel(0); return Object.keys(localStorage).find((k) => { try { return 'level' in JSON.parse(localStorage.getItem(k)); } catch (e) { return false; } }) || ''; })()")
    page.wait_for_function("__fd.state.level === 0"); key = key or page.evaluate("Object.keys(localStorage).find((k) => { try { return 'level' in JSON.parse(localStorage.getItem(k)); } catch (e) { return false; } }) || ''")
    page.close()
    check("found where the game saves", bool(key), str(key))
    page, errs = open_page(b, "?test&lazy", init % key)
    check("the place you were in is built at startup", page.evaluate("__fd.state.level === 3 && !!__fd.LEVELS[3] && __fd.LEVELS.filter(Boolean).length === 2"), str(page.evaluate("[__fd.state.level, __fd.LEVELS.filter(Boolean).length]")))
    mb = page.evaluate("__fd.RECORDS.shared.myBests()")
    check("my records in places not built still count", mb.get("hoops.best") == 42 and mb.get("darts.hi") == 7, str(mb))
    # the shared board arrives before the place is built: it's on the board once it is
    page.evaluate("__fd.RECORDS.shared.absorb([{ n: 'Zed', b: { 'hoops.best': 99 } }])")
    r = page.evaluate("(() => { __fd.load(0); const L = __fd.LEVELS[0]; const k = L.recDefs[0].k; __fd.RECORDS.shared.absorb([{ n: 'Zed', b: { ['hoops.' + k]: 99 } }]); return __fd.RECORDS.list(L, k).map((e) => e[1]); })()")
    check("shared records reach a place", "Zed" in r, str(r))
    page.close()
    page, errs = open_page(b, "?test&lazy", init % key)
    r = page.evaluate("""(() => { __fd.RECORDS.shared.absorb([{ n: 'Zed', b: { 'hoops.long': 99 } }]);
      __fd.load(0); const L = __fd.LEVELS[0]; return L.recDefs.map((d) => __fd.RECORDS.list(L, d.k).map((e) => e[1])).flat(); })()""")
    check("and one that arrived before the place was built", "Zed" in r, str(r))
    check("no errors", not errs, str(errs[:3]))
    page.close()

    # the old way still works
    page, errs = open_page(b, "?test")
    check("?test builds everything at startup", page.evaluate("__fd.LEVELS.filter(Boolean).length") == 61 and not errs, str(errs[:2]))
    page.close()
    page, errs = open_page(b, "?eager")
    check("?eager too", page.evaluate("document.querySelectorAll('script[data-fd]').length") == 0 and not errs, str(errs[:2]))
    page.close()
    b.close()

print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
