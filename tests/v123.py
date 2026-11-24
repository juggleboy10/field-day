"""v123: pickleball flies like a pickleball: quick off the paddle, then it slows (most of all at the bounce).

A drive from the baseline aimed 4.5 m past the net, flat, with topspin and with backspin:
  - it comes off the paddle much faster than it arrives, and loses a good share more at the bounce
  - topspin arcs and dips, kicks through the bounce keeping its pace; backspin floats, then checks up low and slow
  - every shot still lands where it was aimed
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v123.py
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
    page = b.new_page(viewport={"width": 480, "height": 300})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    i = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'pickleball')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(1500)
    r = page.evaluate(f"""(() => {{ const I=__fd.LEVELS[{i}].pb.internals, out={{}};
      for (const [name, w] of [['flat',[0,0,0]],['top',[1,0,0]],['back',[-0.9,0,0]]]) {{
        const from={{x:-6,y:0.9,z:0}}, v=I.aimed(from, 4.5, 0, 9, [w[0],w[1],-0*w[2]]);
        // (spin for a ball going +x: topspin is w along -z... use the game's own convention: wx*uz - wz*ux, ux=1 => -wz)
        const p={{...from, vx:v.vx, vy:v.vy, vz:v.vz, wx:0, wy:0, wz:-w[0]}}; const v0=Math.hypot(p.vx,p.vy,p.vz);
        if (name!=='flat') {{ const v2=I.aimed(from,4.5,0,9,[0,0,-w[0]]); Object.assign(p,{{vx:v2.vx,vy:v2.vy,vz:v2.vz}}); }}
        const s0=Math.hypot(p.vx,p.vy,p.vz); let atNet=0, land=0, after=0, apex=0, t=0, bounced=false, h=1/240, x2=null;
        for (let k=0;k<2000;k++) {{ const sp=Math.hypot(p.vx,p.vy,p.vz), px=p.x; I.airStep(p,h,sp); p.x+=p.vx*h; p.y+=p.vy*h; p.z+=p.vz*h; t+=h;
          if (px<0 && p.x>=0) atNet=sp;
          if (!bounced && p.y<0.037) {{ land=sp; I.bounceSpin(p); after=Math.hypot(p.vx,p.vy,p.vz); bounced=true; }}
          else if (bounced) {{ apex=Math.max(apex,p.y); if (p.y<0.037) {{ x2=p.x; break; }} }} }}
        out[name]={{offPaddle:+s0.toFixed(1), atNet:+atNet.toFixed(1), atBounce:+land.toFixed(1), afterBounce:+after.toFixed(1), bounceHeight:+apex.toFixed(2), secondBounceAt:x2 && +x2.toFixed(1)}};
      }} return out; }})()""")
    for k, v in r.items(): print("  " + k, v)
    fl, tp, bk = r["flat"], r["top"], r["back"]
    check("quick off the paddle, much slower by the bounce", fl["offPaddle"] > 1.8 * fl["atBounce"], fl)
    check("and the bounce takes a good share more off", fl["afterBounce"] < 0.78 * fl["atBounce"], fl)
    check("topspin keeps its pace through the bounce better than backspin", tp["afterBounce"] / tp["atBounce"] > bk["afterBounce"] / bk["atBounce"] + 0.1, f"{tp} {bk}")
    check("topspin arcs and kicks up; backspin stays low", tp["bounceHeight"] > fl["bounceHeight"] > bk["bounceHeight"], f"{tp} {fl} {bk}")
    check("topspin isn't just hit harder (within 25% of flat off the paddle)", tp["offPaddle"] < 1.25 * fl["offPaddle"], f"{tp} {fl}")
    # every shot still lands where it was aimed
    miss = page.evaluate(f"""(() => {{ const I = __fd.LEVELS[{i}].pb.internals; let worst = 0;
      for (const sp of [6, 9, 12]) for (const tx of [2.5, 4.5, 6]) for (const w of [[0,0,0],[0,0,-1],[0,0,0.9],[0,0.8,0],[0,-0.8,0]]) {{
        const from = {{ x: -6, y: 0.9, z: 0.5 }}, v = I.aimed(from, tx, -1, sp, w), f = I.flyTo(from, v);
        worst = Math.max(worst, Math.hypot(f.x - tx, f.z + 1)); }} return worst; }})()""")
    check("every shot still lands where it was aimed (within 0.3 m)", miss < 0.3, miss)
    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
