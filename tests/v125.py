"""v125: pickleball bots serve lower, put spin on the ball, and a hard hit goes long sooner.

  - a bot's serve peaks around 2 m (not a 4 m lob) and still lands in the diagonal box nearly always
  - your own serve in a browser arcs about as high
  - bot shots carry spin: mostly topspin, some backspin, the odd slice; harder bots put more on
  - in VR, a hit over about 13 m/s off the paddle sails long; in a browser, holding Space well past half a second does
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v125.py
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

# fly the ball as it is now (with its spin) to its first bounce: the peak, where it lands, and the spin it had
FLY = """((I, b) => { const p = { ...b }; let top = p.y; for (let k = 0; k < 2000; k++) { const s = Math.hypot(p.vx, p.vy, p.vz);
  I.airStep(p, 1 / 240, s); p.x += p.vx / 240; p.y += p.vy / 240; p.z += p.vz / 240; top = Math.max(top, p.y); if (p.y < 0.037) break; }
  return { top, x: p.x, z: p.z, w: Math.hypot(b.wx || 0, b.wy || 0, b.wz || 0), ts: ((b.wx || 0) * Math.sign(b.vz || 0) * 0 + (-(b.wz || 0)) * Math.sign(b.vx)), side: Math.abs(b.wy || 0) }; })"""

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page = b.new_page(viewport={"width": 480, "height": 300})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    i = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'pickleball')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(1200)
    L = f"__fd.LEVELS[{i}]"
    for lv, nm in ((0, "easy"), (1, "medium"), (2, "hard")):
        r = page.evaluate(f"""(() => {{ const L = {L}, PB = L.pb, I = PB.internals, fly = {FLY}; BOTLV.set(L, {lv});
          const bt = I.BOTS.find((o) => o.sl === 2); const out = {{ tops: [], inBox: 0, n: 40, spin: 0, top: 0, back: 0, slice: 0, wsum: 0 }};
          for (let k = 0; k < out.n; k++) {{
            PB.server = 1; PB.score = [0, k % 2]; I.startServe(); const sv = PB.b; bt.x = sv.x; bt.z = sv.z;
            I.botHit(bt, true); const f = fly(I, PB.b); out.tops.push(f.top);
            const zSign = Math.sign(PB.serveFromZ || 1); if (f.x < -2.13 && f.x > -6.71 && Math.sign(f.z) === -zSign && Math.abs(f.z) < 3.05) out.inBox++;
            PB.ph = 'idle';
          }}
          for (let k = 0; k < 200; k++) {{
            Object.assign(PB, {{ ph: 'rally', lastHit: 0, need: 1, hits: 4, bounced: true }});
            Object.assign(PB.b, {{ x: 5, y: 0.9, z: (k % 5) - 2, vx: 3, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 }});
            I.botHit(bt, false); const b = PB.b, w = Math.hypot(b.wx, b.wy, b.wz);
            if (w > 0.05) out.spin++; out.wsum += w;
            const ts = -(b.wz) * Math.sign(b.vx);   // (+ topspin for a ball going along x)
            if (Math.abs(b.wy) > 0.05) out.slice++; else if (ts > 0.05) out.top++; else if (ts < -0.05) out.back++;
            PB.ph = 'idle';
          }}
          BOTLV.set(L, 1);
          return out; }})()""")
        tops = sorted(r["tops"]); med = tops[len(tops) // 2]
        print(f"  {nm}: serve peak median {med:.2f} m (max {tops[-1]:.2f}), in the box {r['inBox']}/{r['n']}; spin {r['spin']}/200 (top {r['top']}, back {r['back']}, slice {r['slice']}), mean {r['wsum'] / 200:.2f}")
        check(f"{nm} bot: the serve peaks around 2 m, not a lob", 1.4 < med < 2.6 and tops[-1] < 3.0, tops)
        check(f"{nm} bot: serves land in the box", r["inBox"] >= r["n"] * 0.9, r["inBox"])
        check(f"{nm} bot: shots carry spin, mostly topspin, some backspin, the odd slice", r["spin"] > 190 and r["top"] > r["back"] > r["slice"] > 5, r)
        if lv == 0: easyW = r["wsum"]
        if lv == 2: check("harder bots put more on", r["wsum"] > easyW * 1.4, (easyW, r["wsum"]))

    # your own serve in a browser
    page.evaluate(f"(() => {{ const t = {L}.pb.internals.paddles[0]; __fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }})()")
    page.wait_for_timeout(600); page.keyboard.press("KeyE"); page.wait_for_timeout(800)
    mine = page.evaluate(f"""(() => {{ const fd = __fd, PB = {L}.pb, I = PB.internals, fly = {FLY}; const tops = [];
      for (const ms of [200, 450, 700]) {{
        PB.server = 0; PB.score = [0, 0]; I.startServe(); fd.myHead.pos.set(PB.b.x - 0.4, 1.6, PB.b.z); fd.dolly.position.set(PB.b.x - 0.4, 0, PB.b.z);
        fd.camera.position.set(0, 1.6, 0); fd.camera.lookAt(PB.b.x + 11, 0, -PB.b.z); fd.camera.updateMatrixWorld(true);
        PB.auth = fd.state.myPeer; const now = performance.now(); Object.assign(PB, {{ swingFrom: now - ms, swingHeld: true, swingUntil: Infinity }});
        I.deskHit(now); PB.swingHeld = false; tops.push(PB.ph === 'rally' ? fly(I, PB.b).top : -1); PB.ph = 'idle';
      }} return tops; }})()""")
    print("  your serve's peak after 200 / 450 / 700 ms of Space:", [round(t, 2) for t in mine])
    check("your own serve isn't a lob either", all(0 < t < 2.8 for t in mine), mine)

    # hitting too hard
    vr = page.evaluate(f"(() => {{ const HL = {L}.pb.internals.HL; return [10, 12, 13.5, 15].map((sp) => HL * (0.18 + sp / 16)); }})()")
    check("VR: a firm hit stays in, past about 13 m/s it goes long", vr[0] < 6.4 and vr[1] < 6.5 and vr[2] > 6.71 and vr[3] > 7.2, vr)

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
