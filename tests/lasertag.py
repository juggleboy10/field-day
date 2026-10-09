"""Neon laser tag's computer players.

- the picker sets the players per team; bots make up the numbers around the people
- left to play (simulated at 60 Hz), the bots move, shoot each other and you, and both teams score tags
- you can tag a bot: it's knocked out, and the tag counts for your team
- the practice drones only come out when nobody (person or bot) is on the other team

Usage: python tests/lasertag.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
D = os.environ.get("SHOTS")

PLAY = """([secs]) => {
  const fd = window.__fd, L = fd.LEVELS[4], I = L.ltInternals;
  let now = window.__ltNow || performance.now(), shots0 = I.LB.seq, iWasTagged = 0, wasT = false, moved = 0;
  const p0 = I.lbots.filter((b) => b.active).map((b) => [b.x, b.z]);
  L.paused = false;
  for (let f = 0; f < secs * 60; f++) {
    now += 1000 / 60;
    L.update(1 / 60, now);
    if (I.me.tagged && !wasT) iWasTagged++;
    wasT = I.me.tagged;
  }
  window.__ltNow = now; L.paused = true;
  const act = I.lbots.filter((b) => b.active);
  act.forEach((b, i) => { moved = Math.max(moved, Math.hypot(b.x - p0[i][0], b.z - p0[i][1])); });
  return { shots: I.LB.seq - shots0, scores: I.scores(), iWasTagged, moved: +moved.toFixed(1), insideABlock: act.some((b) => L.boxes.some((x) => b.x > x.min.x && b.x < x.max.x && b.z > x.min.z && b.z < x.max.z)) };
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
        page.evaluate("() => window.__fd.switchLevel(4)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(1500)
        page.evaluate("() => { window.__fd.LEVELS[4].paused = true; }")
        counts = {}
        for n in (3, 5, 1, 3):
            counts[n] = page.evaluate(f"""() => {{ const L = window.__fd.LEVELS[4], I = L.ltInternals; L.picker.set({n}); I.fillLtBots();
              const a = [0, 0]; for (const b of I.lbots) if (b.active) a[b.team]++; return {{ myTeam: I.me.team, bots: a }}; }}""")
        print("bots for each setting:", counts)
        mine = counts[3]["myTeam"]
        checks.append(("bots make up each team to the number picked", all(c["bots"][mine] == n - 1 and c["bots"][1 - mine] == n for n, c in counts.items())))
        # drones only when nobody's on the other side
        dr = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[4], I = L.ltInternals; const n0 = L.picker.n;
          L.picker.set(1); I.fillLtBots(); for (const b of I.lbots) b.active = false; L.update(1 / 60, 0);   /* (time 0: no bot top-up in between) */
          const alone = L.group.children.filter((m) => m.isMesh && m.geometry && m.geometry.type === 'IcosahedronGeometry' && m.visible).length;
          L.picker.set(n0); I.fillLtBots(); L.update(1 / 60, 0);
          const withBots = L.group.children.filter((m) => m.isMesh && m.geometry && m.geometry.type === 'IcosahedronGeometry' && m.visible).length;
          return { alone, withBots }; }""")
        print("practice drones:", dr)
        checks.append(("practice drones only when nobody's on the other team", dr["alone"] > 0 and dr["withBots"] == 0))
        # you tag a bot
        tag = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[4], I = L.ltInternals, st = fd.state;
          const b = I.lbots.find((x) => x.active && x.team !== I.me.team);
          b.x = 2; b.z = 0.0; b.x = -8; b.z = I.me.team === 0 ? 2 : -2; b.tagged = false; b.invUntil = 0;
          fd.dolly.position.set(-8, 0, I.me.team === 0 ? 6 : -6); fd.camera.position.set(0, 1.6, 0);
          const dx = b.x - fd.dolly.position.x, dz = b.z - fd.dolly.position.z, dy = 1.25 - 1.6;
          st.yaw = Math.atan2(-dx, -dz); st.pitch = Math.atan2(dy, Math.hypot(dx, dz)); fd.camera.rotation.set(st.pitch, st.yaw, 0, 'YXZ'); fd.camera.updateMatrixWorld(true);
          fd.LEVELS[4].me.cool = 0; fd.LEVELS[4].me.tagged = false;
          const t0 = I.me.tags, clear = I.clearLine(new THREE.Vector3(-8, 1.6, fd.dolly.position.z), new THREE.Vector3(b.x, 1.25, b.z));
          I.fire(performance.now() + 1e6);
          return { clear, tagged: b.tagged, myTags: I.me.tags - t0, team: I.scores()[I.me.team] }; }""")
        print("you shoot a bot:", tag)
        checks.append(("you can tag a bot, and it counts for your team", tag["tagged"] and tag["myTags"] == 1))
        if D:
            page.evaluate("() => { window.__fd.LEVELS[4].paused = false; }")
            page.wait_for_timeout(4000)
            page.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(-12, 0, 10); fd.state.yaw = -2.4; fd.state.pitch = -0.15; }")
            page.wait_for_timeout(1500)
            page.screenshot(path=f"{D}/lasertag-bots.png")
            page.evaluate("() => { window.__fd.LEVELS[4].paused = true; }")
        # let them play: you stand in the open on your own half
        page.evaluate("() => { const fd = window.__fd, I = fd.LEVELS[4].ltInternals; fd.dolly.position.set(-8.5, 0, I.me.team === 0 ? 3 : -3); }")
        r = page.evaluate(PLAY, [90])
        print("90 s of 3-a-side (you in the open on your half):", r)
        checks += [("the bots move about and shoot", r["moved"] > 3 and r["shots"] > 20),
                   ("both teams score tags", r["scores"][0] > 0 and r["scores"][1] > 0),
                   ("the bots tag you too", r["iWasTagged"] > 0),
                   ("no bot ends up inside a block", not r["insideABlock"])]
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nlaser tag checks passed" if ok else "\nlaser tag checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
