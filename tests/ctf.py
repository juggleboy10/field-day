"""Capture the Flag: the rules, and the bots, against index.html opened with ?test.

- you can tag a raider on your half (they go back to base), but not on theirs
- walking onto their stand picks up their flag; reaching your base with it scores; a tagged carrier drops it
- a bot defender tags you when you're on its half
- left alone, the bots play: they move about, grab flags, tag each other
- a match ends at 3 captures

Usage: python tests/ctf.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

H = """
() => { const fd = window.__fd, L = fd.LEVELS[21], I = L.ctfInternals;
  window.__c = { fd, L, I,
    put(x, z) { fd.camera.getWorldPosition(window.__c.v = window.__c.v || new THREE.Vector3()); fd.dolly.position.x += x - window.__c.v.x; fd.dolly.position.z += z - window.__c.v.z; fd.camera.getWorldPosition(window.__c.v); fd.camera.updateMatrixWorld(); },
    head() { const p = new THREE.Vector3(); fd.camera.getWorldPosition(p); return p; },
    events() { return I.H.events.map((e) => [e[1], e[2], e[3]]); } };
  return { team: I.me.team, host: I.isHost(), ph: I.RS.ph };
}
"""


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1000, "height": 700})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(21)")
        page.locator("#btn-flat").click()
        info = page.evaluate(H)
        page.wait_for_function("() => window.__fd.LEVELS[21].ctfInternals.RS.ph === 'play'", timeout=30000)
        print("you:", info)
        checks = []

        # ---- the bots play on their own for a while
        start = page.evaluate("() => window.__c.I.bots.filter((b) => b.active).map((b) => [b.x, b.z])")
        page.evaluate("() => window.__c.put(-13, window.__c.I.me.team === 0 ? 23 : -23)")      # out of the way, in a corner of our half
        time.sleep(45)
        evs = page.evaluate("() => window.__c.events()")
        end = page.evaluate("() => window.__c.I.bots.filter((b) => b.active).map((b) => [b.x, b.z])")
        moved = sum(1 for a, b in zip(start, end) if abs(a[0] - b[0]) + abs(a[1] - b[1]) > 2)
        kinds = {e[0] for e in evs}
        print(f"bots: {len(end)} active, {moved} moved; events seen: {sorted(kinds)} {evs[-5:]}")
        checks.append(("seven bots fill the teams and move about", len(end) == 7 and moved >= 5))

        # ---- set up a clean round to test the rules
        page.evaluate("() => { const I = window.__c.I; I.startPlay(performance.now(), true); }")
        page.wait_for_function("() => window.__fd.LEVELS[21].ctfInternals.RS.ph === 'play'", timeout=30000)
        team = page.evaluate("() => window.__c.I.me.team")
        sgn = 1 if team == 0 else -1
        # an enemy bot on our half, right next to us: tag it
        r = page.evaluate(f"""() => {{ const c = window.__c, I = c.I, b = I.bots.find((x) => x.active && x.team !== I.me.team);
          for (const x of I.bots) if (x.active) {{ x.x = 12; x.z = {sgn} * -20; x.downUntil = performance.now() + 4000; }}
          c.put(0, {sgn} * 8); b.x = 0.6; b.z = {sgn} * 8; b.rx = b.x; b.rz = b.z; b.downUntil = performance.now() + 1500; return b.id; }}""")
        page.wait_for_timeout(600)
        r = page.evaluate(f"""() => {{ const c = window.__c, I = c.I, b = I.bots.find((x) => x.active && x.team !== I.me.team);
          b.x = 0.6; b.z = {sgn} * 8; I.me.tagCool = 0; I.requestTag(b.id);
          return {{ bot: b.id, events: c.events().slice(-1), botZ: b.z }}; }}""")
        print("tagging a raider on your half:", r)
        checks.append(("you can tag a raider on your half", r["events"] and r["events"][0][0] == 1 and r["events"][0][1] == r["bot"] and abs(r["botZ"]) > 15))
        # the same on THEIR half: no
        r2 = page.evaluate(f"""() => {{ const c = window.__c, I = c.I, b = I.bots.find((x) => x.active && x.team !== I.me.team);
          c.put(0, {sgn} * -8); b.x = 0.6; b.z = {sgn} * -8; b.downUntil = performance.now() + 1500; I.H.immune.clear(); }}""")
        page.wait_for_timeout(600)
        r2 = page.evaluate(f"""() => {{ const c = window.__c, I = c.I, b = I.bots.find((x) => x.active && x.team !== I.me.team);
          b.x = 0.6; b.z = {sgn} * -8;
          const n = I.H.events.length ? I.H.events[I.H.events.length - 1][0] : 0; I.me.tagCool = 0; I.requestTag(b.id);
          const m = I.H.events.length ? I.H.events[I.H.events.length - 1][0] : 0; return {{ newEvents: m - n }}; }}""")
        print("tagging on their half:", r2)
        checks.append(("you can't tag on their half", r2["newEvents"] == 0))
        # grab their flag, then run home: a capture
        page.evaluate(f"""() => {{ const c = window.__c, I = c.I; for (const x of I.bots) if (x.active) {{ x.x = 13; x.z = {sgn} * 2; x.downUntil = performance.now() + 60000; }} c.put(0, {sgn} * -20.5); }}""")
        page.wait_for_function("() => { const I = window.__c.I; return I.RS.carrier[1 - I.me.team] === window.__fd.state.myPeer; }", timeout=20000)
        score0 = page.evaluate("() => window.__c.I.RS.score.slice()")
        page.evaluate(f"() => window.__c.put(0, {sgn} * 20)")
        page.wait_for_function("() => { const I = window.__c.I; return I.RS.score[I.me.team] > 0; }", timeout=20000)
        score1 = page.evaluate("() => window.__c.I.RS.score.slice()")
        print(f"flag run: score {score0} -> {score1}")
        checks.append(("grabbing their flag and getting home scores", score1[team] == score0[team] + 1))
        # a bot defender on its half tags you, and you're sent home
        page.wait_for_function("() => window.__fd.LEVELS[21].ctfInternals.RS.ph === 'play'", timeout=30000)
        r3 = page.evaluate(f"""() => {{ const c = window.__c, I = c.I, b = I.bots.find((x) => x.active && x.team !== I.me.team);
          I.H.immune.clear(); c.put(3, {sgn} * -12); b.x = 3.3; b.z = {sgn} * -12; b.rx = b.x; b.rz = b.z; b.downUntil = 0; return b.id; }}""")
        page.wait_for_function(f"() => {{ const p = window.__c.head(); return Math.abs(p.z - {sgn} * 23) < 2; }}", timeout=20000)
        print("a defender tagged you and you were sent home")
        checks.append(("a bot defender tags you on its half", True))
        # a match ends at 3
        page.evaluate("() => { const I = window.__c.I; I.RS.score[I.me.team] = 2; }")
        page.wait_for_function("() => window.__fd.LEVELS[21].ctfInternals.RS.ph === 'play'", timeout=30000)
        page.evaluate(f"""() => {{ const c = window.__c, I = c.I; for (const x of I.bots) if (x.active) {{ x.x = 13; x.z = {sgn} * 2; x.downUntil = performance.now() + 60000; }} c.put(0, {sgn} * -20.5); }}""")
        page.wait_for_function("() => { const I = window.__c.I; return I.RS.carrier[1 - I.me.team] === window.__fd.state.myPeer; }", timeout=20000)
        page.evaluate(f"() => window.__c.put(0, {sgn} * 20)")
        page.wait_for_function("() => window.__fd.LEVELS[21].ctfInternals.RS.ph === 'over'", timeout=20000)
        w = page.evaluate("() => { const I = window.__c.I; return [I.RS.winner, I.me.team, I.RS.score.slice()]; }")
        print("match over:", w)
        checks.append(("a match ends at 3", w[0] == w[1] and w[2][w[1]] == 3))
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nflag checks passed" if ok else "\nflag checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
