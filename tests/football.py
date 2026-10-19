"""Two-Minute Drill: the quarterback game plays out, with the real play code.

- throwing to an open receiver (browser aim) completes passes; drives move the chains and can score
- holding the ball too long gets you sacked
- incompletions stop the clock, completions in bounds keep it running; spikes and timeouts stop it
- field goals score 3 from close in, and are refused from too far
- a rough VR throw toward a receiver is guided to them
- the clock running out ends the game

Usage: python tests/football.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

SETUP = """() => { const fd = window.__fd, L = fd.LEVELS[29]; window.__fbUpdate = L.update; L.update = () => {}; return L.fbInternals.PLAYS.map((p) => p.name); }"""

# run plays: each throws to receiver `who` after `wait` seconds with charge c (0 = bullet, 1 = lob)
PLAYS = """([runs]) => {
  const fd = window.__fd, L = fd.LEVELS[29], I = L.fbInternals, S = I.S, out = [];
  const dt = 1 / 60;
  for (const [play, who, wait, c, ballOn] of runs) {
    I.startGame(); I.choosePlay(play); if (ballOn) { S.ballOn = ballOn; S.toGo = Math.min(10, ballOn); I.setFormation(); }
    const before = { ballOn: S.ballOn, clock: S.clock };
    I.hike();
    let t = 0;
    for (; t < wait && S.phase === 'live'; t += dt) I.step(dt);
    if (S.phase === 'live') {
      // aim: look straight at where the receiver will be
      const r = I.REC[who], p = I.routeAt(r, S.snapT + 0.5, [0, 0]);
      fd.state.yaw = Math.atan2(-(p[0] - fd.dolly.position.x), -(p[1] - fd.dolly.position.z));
      fd.camera.rotation.set(0, fd.state.yaw, 0, 'YXZ'); fd.dolly.updateMatrixWorld(true);
      I.throwFlat(c);
    }
    let guard = 0;
    while ((S.phase === 'live' || S.phase === 'air' || S.phase === 'yac') && guard++ < 1200) I.step(dt);
    out.push({ play, who, msg: S.msg, phase: S.phase, gain: before.ballOn - S.ballOn, running: S.running, score: S.score, down: S.down });
  }
  return out;
}"""


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 900, "height": 560})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(29)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(1500)
        names = page.evaluate(SETUP)
        page.evaluate("() => { window.__fd.LEVELS[29].fb.diff = 1; }")
        runs = [[pl, who, w, c, 0] for pl in range(4) for who in range(3) for (w, c) in ((1.0, 0.2), (1.6, 0.6), (2.2, 0.9))]
        res = page.evaluate(PLAYS, [runs])
        comp = [r for r in res if 'for' in r['msg'] or 'TOUCHDOWN' in r['msg']]
        inc = [r for r in res if r['msg'].startswith(('Incomplete', 'Broken', 'Dropped'))]
        ints = [r for r in res if 'Intercepted' in r['msg']]
        sacks = [r for r in res if 'Sacked' in r['msg']]
        print("plays:", names)
        print(f"{len(res)} throws: {len(comp)} complete, {len(inc)} incomplete, {len(ints)} picked, {len(sacks)} sacked")
        print("examples:", [r['msg'] for r in res[:8]])
        # goal to go from their 8: touchdowns happen
        tds = page.evaluate(PLAYS, [[[0, who, 1.0, 0.3, 8] for who in range(3)] * 3])
        print("from the 8:", [r['msg'] for r in tds])
        # holding it forever: sacked
        sack = page.evaluate(PLAYS, [[[3, 0, 9, 0.5, 0]]])[0]
        print("holding it:", sack['msg'])
        # the clock: incomplete stops it, a completion keeps it running
        clock = {"inc_running": [r['running'] for r in inc][:3], "comp_running": [r['running'] for r in comp if 'out of bounds' not in r['msg'] and 'TOUCHDOWN' not in r['msg'] and 'Turnover' not in r['msg']][:3]}
        print("clock running after:", clock)
        # spike and timeout stop it
        st = page.evaluate("""() => { const I = window.__fd.LEVELS[29].fbInternals, S = I.S; I.startGame(); S.running = true; I.spike(); const a = { running: S.running, down: S.down };
          S.running = true; I.timeout(); return { spike: a, timeout: { running: S.running, tos: S.tos } }; }""")
        print("spike / timeout:", st)
        # field goals
        fg = page.evaluate("""() => { const I = window.__fd.LEVELS[29].fbInternals, S = I.S, out = {};
          I.startGame(); I.fieldGoal(); out.far = S.phase;
          let good = 0, tries = 0;
          for (let k = 0; k < 6; k++) { I.startGame(); S.ballOn = 12; I.setFormation(); I.fieldGoal(); for (let i = 0; i < 400 && S.phase === 'kick'; i++) I.step(1 / 60); tries++; if (S.score === 3) good++; }
          out.good = good; out.tries = tries; return out; }""")
        print("field goals:", fg)
        # a rough VR throw toward the slot receiver gets guided there
        vr = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[29], I = L.fbInternals, S = I.S; I.startGame(); I.choosePlay(0); I.hike();
          for (let i = 0; i < 70; i++) I.step(1 / 60);
          const r = I.REC[1], p = I.passTo(r, S.bp, 15);
          const v = p.v.clone().multiplyScalar(1 / 1.9); v.x += 0.8; v.y -= 0.6;
          S.held = 'right'; L.onVRRelease({ side: 'right' }, v);
          const target = S.target ? S.target.i : -1;
          let guard = 0; while ((S.phase === 'air' || S.phase === 'yac') && guard++ < 1200) I.step(1 / 60);
          return { target, msg: S.msg }; }""")
        print("VR throw:", vr)
        # the clock runs out
        over = page.evaluate("""() => { const I = window.__fd.LEVELS[29].fbInternals, S = I.S; I.startGame(); S.clock = 1; S.running = true; for (let i = 0; i < 120; i++) I.step(1 / 60); return S.phase; }""")
        print("after the clock runs out:", over)
        browser.close()
    checks = [
        ("four plays", len(names) == 4),
        ("passes get completed", len(comp) >= len(res) * 0.35),
        ("but not every one (the defense plays)", len(comp) < len(res)),
        ("completions gain yards", all(r['gain'] != 0 or 'for 0' in r['msg'] for r in comp)),
        ("touchdowns from close in", any('TOUCHDOWN' in r['msg'] for r in tds)),
        ("holding the ball gets you sacked", 'Sacked' in sack['msg']),
        ("an incompletion stops the clock", clock["inc_running"] and not any(clock["inc_running"])),
        ("a completion in bounds keeps it running", clock["comp_running"] and all(clock["comp_running"])),
        ("a spike stops the clock and costs a down", not st["spike"]["running"] and st["spike"]["down"] == 2),
        ("a timeout stops the clock", not st["timeout"]["running"] and st["timeout"]["tos"] == 2),
        ("no field goal from your own 25", fg["far"] == 'pre'),
        ("short field goals are good", fg["good"] >= 5),
        ("a rough VR throw is guided to the receiver", vr["target"] == 1),
        ("the game ends when time runs out", over == 'over'),
    ]
    ok = not errors
    for label, good in checks:
        print(("PASS " if good else "FAIL ") + label)
        ok = ok and good
    if errors:
        print("page errors:", errors[:5])
    print("football checks passed" if ok else "football checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
