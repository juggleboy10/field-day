"""Sunday soccer's computer players.

- the picker sets the players per team; bots make up the numbers around the people
- left to play (simulated at 60 Hz), the bots chase, kick and score, at both ends
- a goal by a bot isn't counted as yours

Usage: python tests/soccer.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
S = "window.__fd.LEVELS[5].socInternals"

PLAY = """([secs]) => {
  const fd = window.__fd, L = fd.LEVELS[5], I = L.socInternals;
  let now = window.__socNow || performance.now(), last = I.SOC.lastTouch, kicks = 0, touchers = new Set(), goalsFor = [0, 0];
  const g0 = I.scores();
  // you stand out of the way on the touchline, so it's the bots' game
  fd.dolly.position.set(-I.HW + 0.6, 0, 0); fd.camera.position.set(0, 1.6, 0);
  for (let f = 0; f < secs * 60; f++) {
    now += 1000 / 60;
    window.__fd.camera.getWorldPosition(window.__fd.LEVELS[5].me.lastHead);
    I.physics(1 / 60, now);
    L.update(1 / 60, now);
    if (I.SOC.lastTouch !== last) { kicks++; last = I.SOC.lastTouch; touchers.add(last); }
  }
  window.__socNow = now;
  const g1 = I.scores();
  return { goals: [g1[0] - g0[0], g1[1] - g0[1]], scoredByMe: I.me.scoredBy, touches: kicks, touchers: touchers.size, ball: [+I.ball.pos.x.toFixed(1), +I.ball.pos.z.toFixed(1)] };
}"""


def main():
    ok = True
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1000, "height": 640})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(5)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(1500)
        page.evaluate("() => { window.__fd.LEVELS[5].paused = true; }")
        counts = {}
        for n in (3, 5, 1, 3):
            c = page.evaluate(f"""() => {{ const L = window.__fd.LEVELS[5], I = L.socInternals; L.picker.set({n}); I.fillSocBots();
              const t = L.me.team, a = [0, 0]; for (const b of I.sbots) if (b.active) a[b.team]++; return {{ myTeam: t, bots: a }}; }}""")
            counts[n] = c
        print("bots for each setting:", counts)
        mine = counts[3]["myTeam"]
        checks.append(("bots make up each team to the number picked", all(c["bots"][mine] == n - 1 and c["bots"][1 - mine] == n for n, c in counts.items())))
        page.evaluate("() => { window.__fd.LEVELS[5].paused = false; }")
        # play a stretch on each team; you stand on the touchline, so the all-bot side should score
        res = []
        for half in (0, 1):
            team = page.evaluate("() => window.__fd.LEVELS[5].me.team")
            r = page.evaluate(PLAY, [200])
            r["youOn"] = team
            res.append(r)
            print(f"200 s with you on {'red' if team == 0 else 'blue'} (on the touchline):", r)
            page.evaluate("() => { const L = window.__fd.LEVELS[5]; L.switchTeam(); L.socInternals.fillSocBots(); }")
        # goals[0] are goals scored by red (into the far goal), goals[1] by blue
        allbot = [r["goals"][1 - r["youOn"]] for r in res]
        checks += [("the bots touch and kick the ball, on both teams", all(r["touches"] > 30 and r["touchers"] >= 4 for r in res)),
                   ("the full team of bots scores, at either end", all(g >= 1 for g in allbot)),
                   ("a bot's goal isn't counted as yours", all(r["scoredByMe"] == 0 for r in res))]
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nsoccer checks passed" if ok else "\nsoccer checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
