"""Beat Blades: charts, slicing, scoring, music, run headless.

- every song has a chart on each level, busier as the level goes up, every block on the sixteenth-note grid
- a hand never has to swing again sooner than its level allows (doubles aside); hands mostly alternate
- an autopilot blade that cuts every block the right way gets top marks and finishes the song
- cutting the wrong way, or with the wrong colour, is a miss; so is letting a block go past
- doing nothing runs out of energy and fails
- hitting a bomb costs energy
- the song's music plays (notes get booked on the audio clock)

Usage: python tests/beats.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
I = "window.__fd.LEVELS[25].bbInternals"

# play a song with a fake clock; the blade sweeps through each block (the right way, or as told)
PLAY = """([si, di, mode, upTo]) => {
  const fd = window.__fd, L = fd.LEVELS[25], X = L.bbInternals, BB = X.BB;
  let t = -2.6; BB.clock = () => t;
  BB.si = si; BB.di = di; X.start();
  const dt = 1 / 72, B = X.blade.flat;
  const out = { cut: 0, bombs: 0, frames: 0 };
  while (BB.st === 'play' && t < upTo) {
    t += dt; out.frames++;
    B.ok = true; B.was = true;
    // find the next block about to reach the line
    let target = null;
    for (const o of X.blocks) if (o.n && o.m.visible && Math.abs(o.m.position.z - X.HZ) < 0.12 && (!target || o.n.t < target.n.t)) target = o;
    if (target && mode !== 'idle') {
      const n = target.n, p = target.m.position;
      let d = X.DIRV[n.dir]; if (n.dir === 8) d = [0, -1];
      if (mode === 'wrong') d = [-d[0], -d[1]];
      const s = 0.32;
      B.pa.set(p.x - d[0] * s, p.y - d[1] * s, p.z + 0.5); B.pb.set(p.x - d[0] * s, p.y - d[1] * s, p.z - 0.5);
      B.a.set(p.x + d[0] * s, p.y + d[1] * s, p.z + 0.5); B.b.set(p.x + d[0] * s, p.y + d[1] * s, p.z - 0.5);
      out.cut++;
    } else {
      // rest the blade low and to the side, out of the way
      const y = -2; B.pa.set(0, y, 0); B.pb.set(0, y, -1); B.a.set(0, y, 0); B.b.set(0, y, -1);
    }
    X.stepSong(dt);
  }
  const r = { st: BB.st, score: BB.score, max: BB.chart.max, hits: BB.hits, misses: BB.misses, hp: +BB.hp.toFixed(2), result: BB.result, t: +t.toFixed(1), len: +X.SONGS[si].len.toFixed(1), booked: BB.nextStep };
  if (BB.st === 'play') X.stop('quit');
  BB.clock = null;
  return r;
}"""


def main():
    ok = True
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 900, "height": 600})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(25)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(1500)
        page.evaluate("() => { window.__fd.LEVELS[25].paused = true; }")

        charts = page.evaluate(f"""() => {{ const X = {I}; const out = [];
          X.SONGS.forEach((sg, si) => X.DIFFS.forEach((D, di) => {{
            const ch = X.makeChart(si, di, true), ns = ch.notes.filter((n) => n.kind === 'n');
            const offGrid = ch.notes.filter((n) => Math.abs(n.t / sg.step - Math.round(n.t / sg.step)) > 1e-6).length;
            // tightest same-hand gap (doubles share a moment, so look at singles)
            let tight = 99; const last = [-9, -9];
            for (const n of ns) {{ const gap = n.t - last[n.hand]; const dbl = ns.some((m) => m !== n && m.t === n.t); if (!dbl) tight = Math.min(tight, gap); last[n.hand] = n.t; }}
            const hands = [ns.filter((n) => n.hand === 0).length, ns.filter((n) => n.hand === 1).length];
            out.push({{ si, di, blocks: ns.length, bombs: ch.notes.filter((n) => n.kind === 'b').length, walls: ch.notes.filter((n) => n.kind === 'w').length,
              flatWalls: X.makeChart(si, di, false).notes.filter((n) => n.kind === 'w').length, offGrid, tight: +tight.toFixed(3), gap: D.gap, hands, len: +sg.len.toFixed(1) }});
          }}));
          return out; }}""")
        for c in charts:
            print("chart", c)
        by = {(c["si"], c["di"]): c for c in charts}
        checks += [("every song has a chart on each level, busier as the level goes up", all(by[(s, 0)]["blocks"] < by[(s, 1)]["blocks"] < by[(s, 2)]["blocks"] and by[(s, 0)]["blocks"] >= 25 for s in range(3))),
                   ("every block lands on the beat grid", all(c["offGrid"] == 0 for c in charts)),
                   ("a hand never has to swing again sooner than its level allows", all(c["tight"] >= c["gap"] - 1e-6 for c in charts)),
                   ("both hands get plenty to do", all(min(c["hands"]) >= 0.35 * c["blocks"] for c in charts)),
                   ("bombs on Normal and Hard only; walls only in VR on Normal and Hard", all((c["bombs"] == 0) == (c["di"] == 0) and (c["walls"] > 0) == (c["di"] > 0) and c["flatWalls"] == 0 for c in charts))]

        music = page.evaluate(f"""() => {{ const X = {I}, A = window.__fd.audio; A.ensureAudio(); const c = A.snd.ctx, out = c.createGain();
          let n = 0; X.SONGS.forEach((sg) => {{ for (let st = 0; st < sg.bars * 16; st++) {{ X.playStep(c, out, sg, st, c.currentTime + 1 + st * sg.step); n++; }} }});
          return n; }}""")
        print("music steps played through the sequencer:", music)
        checks.append(("every song's music plays through the sequencer without a hitch", music > 1500))
        perfect = page.evaluate(PLAY, [0, 1, "right", 200])
        print("autopilot, Neon Sunrise on Normal:", {k: v for k, v in perfect.items() if k != "result"}, perfect["result"])
        checks += [("cutting every block the right way finishes the song with top marks", perfect["st"] == "done" and perfect["misses"] == 0 and perfect["result"]["rank"] in ("SS", "S") and perfect["score"] >= 0.6 * perfect["max"]),
                   ]
        hard = page.evaluate(PLAY, [1, 2, "right", 200])
        print("autopilot, Pixel Rush on Hard:", {k: v for k, v in hard.items() if k != "result"})
        checks.append(("Hard is playable start to finish (bombs and all)", hard["st"] == "done" and hard["misses"] == 0))
        wrong = page.evaluate(PLAY, [2, 1, "wrong", 30])
        print("cutting the wrong way:", {k: v for k, v in wrong.items() if k != "result"})
        checks.append(("cutting the wrong way counts as a miss", wrong["hits"] == 0 and wrong["misses"] > 0))
        idle = page.evaluate(PLAY, [0, 2, "idle", 200])
        print("doing nothing:", {k: v for k, v in idle.items() if k != "result"})
        checks.append(("letting everything go past runs out of energy and fails", idle["st"] == "failed" and idle["hits"] == 0 and idle["t"] < idle["len"]))
        bomb = page.evaluate(f"""() => {{ const X = {I}, BB = X.BB; let t = -2.6; BB.clock = () => t; BB.si = 1; BB.di = 2; X.start();
          const b = BB.chart.notes.find((n) => n.kind === 'b'); BB.chart.notes = [b]; BB.i = 0; t = b.t - 0.01; X.stepSong(1/72);
          const o = X.bombs.find((q) => q.n === b), p = o.m.position, B = X.blade.flat, hp0 = BB.hp;
          B.pa.set(p.x - 0.3, p.y, p.z + 0.5); B.pb.set(p.x - 0.3, p.y, p.z - 0.5); B.a.set(p.x + 0.3, p.y, p.z + 0.5); B.b.set(p.x + 0.3, p.y, p.z - 0.5); B.ok = true;
          X.stepSong(1/72); const r = {{ lost: +(hp0 - BB.hp).toFixed(2), gone: !o.n }}; X.stop('quit'); BB.clock = null; return r; }}""")
        print("hitting a bomb:", bomb)
        checks.append(("hitting a bomb costs energy", bomb["lost"] >= 0.14 and bomb["gone"]))
        colour = page.evaluate(f"""() => {{ const fd = window.__fd, X = {I}, BB = X.BB; let t = -2.6; BB.clock = () => t; BB.si = 0; BB.di = 0; X.start();
          const n = BB.chart.notes.find((q) => q.kind === 'n' && q.dir !== 8); BB.chart.notes = [n]; BB.i = 0; t = n.t; fd.state.mode = 'vr'; X.stepSong(1/72);
          const o = X.blocks.find((q) => q.n === n), p = o.m.position, d = X.DIRV[n.dir], wrong = n.hand === 0 ? 'right' : 'left', B = X.blade[wrong];
          B.pa.set(p.x - d[0] * 0.3, p.y - d[1] * 0.3, p.z + 0.5); B.pb.set(p.x - d[0] * 0.3, p.y - d[1] * 0.3, p.z - 0.5); B.a.set(p.x + d[0] * 0.3, p.y + d[1] * 0.3, p.z + 0.5); B.b.set(p.x + d[0] * 0.3, p.y + d[1] * 0.3, p.z - 0.5); B.ok = true;
          X.blade[n.hand === 0 ? 'left' : 'right'].ok = false;
          X.stepSong(1/72); const r = {{ hits: BB.hits, misses: BB.misses }}; fd.state.mode = 'flat'; X.blade.left.ok = X.blade.right.ok = false; X.stop('quit'); BB.clock = null; return r; }}""")
        print("in VR, the wrong colour blade:", colour)
        checks.append(("in VR, cutting with the wrong colour blade is a miss", colour["hits"] == 0 and colour["misses"] == 1))
        vr = page.evaluate(f"""() => {{ const fd = window.__fd, X = {I}, BB = X.BB; let t = -2.6; BB.clock = () => t; fd.state.mode = 'vr';
          BB.si = 0; BB.di = 1; X.start(); const walls = BB.chart.notes.filter((n) => n.kind === 'w'), doubles = BB.chart.notes.filter((n, i, a) => n.kind === 'n' && a.some((m) => m !== n && m.kind === 'n' && m.t === n.t)).length;
          const dt = 1 / 72; let wallTime = 0, minHp = 1;
          while (BB.st === 'play' && t < 200) {{
            t += dt;
            for (const side of ['left', 'right']) {{ const B = X.blade[side]; B.ok = true; B.pa.set(side === 'left' ? -3 : 3, -2, 0); B.pb.set(side === 'left' ? -3 : 3, -2, -1); B.a.copy(B.pa); B.b.copy(B.pb); }}
            for (const o of X.blocks) {{
              if (!o.n || Math.abs(o.m.position.z - X.HZ) > 0.12) continue;
              const n = o.n, p = o.m.position, d = n.dir === 8 ? [0, -1] : X.DIRV[n.dir], B = X.blade[n.hand === 0 ? 'left' : 'right'];
              B.pa.set(p.x - d[0] * 0.32, p.y - d[1] * 0.32, p.z + 0.5); B.pb.set(p.x - d[0] * 0.32, p.y - d[1] * 0.32, p.z - 0.5);
              B.a.set(p.x + d[0] * 0.32, p.y + d[1] * 0.32, p.z + 0.5); B.b.set(p.x + d[0] * 0.32, p.y + d[1] * 0.32, p.z - 0.5);
            }}
            // lean away from a wall while it's passing
            const w = walls.find((n) => t > n.t - 0.4 && t < n.t + n.dur + 0.4);
            if (w) wallTime += dt;
            fd.dolly.position.x = BB.laneX + (w ? (w.side ? -0.35 : 0.35) : 0); fd.dolly.position.z = 0; fd.camera.position.set(0, 1.6, 0); fd.camera.updateMatrixWorld(true);
            X.stepSong(dt); minHp = Math.min(minHp, BB.hp);
          }}
          const r = {{ st: BB.st, misses: BB.misses, hits: BB.hits, walls: walls.length, doubles, wallTime: +wallTime.toFixed(1), minHp: +minHp.toFixed(2) }};
          // and standing in the middle as a wall comes through drains energy
          t = -2.6; X.start(); const w = BB.chart.notes.find((n) => n.kind === 'w'); BB.chart.notes = [w]; BB.i = 0; const hp0 = BB.hp;
          fd.dolly.position.x = BB.laneX; fd.camera.updateMatrixWorld(true);
          for (t = w.t - 0.5; t < w.t + 0.6; t += dt) X.stepSong(dt);
          r.drain = +(hp0 - BB.hp).toFixed(2);
          X.stop('quit'); fd.state.mode = 'flat'; X.blade.left.ok = X.blade.right.ok = false; BB.clock = null; return r; }}""")
        print("VR, both blades, doubles and walls:", vr)
        checks += [("in VR, two blades get through a whole song, doubles included, leaning out of the walls", vr["st"] == "done" and vr["misses"] == 0 and vr["doubles"] > 0 and vr["walls"] > 0 and vr["minHp"] >= 0.5),
                   ("standing in a wall's way drains energy", vr["drain"] > 0.1)]
        page.evaluate("() => { window.__fd.LEVELS[25].paused = false; }")
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nbeat blades checks passed" if ok else "\nbeat blades checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
