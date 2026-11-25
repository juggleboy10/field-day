"""v115: the game's messages show inside the headset (the toast is HTML, which a headset never shows).

  - a game's own message (dodgeball's "you're on Blue now") reaches the headset panel
  - on a screen, the panel stays hidden (the HTML toast is there)
  - in VR it fades in about 1.2 m along your gaze, a little below eye level, facing you
  - a glance (15 degrees) doesn't move it; turning round (90 degrees) brings it round in front of you
  - it fades away after a couple of seconds
  - a long message wraps rather than running off the panel
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v115.py
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

# run the panel for a while (synchronously, so the page's own frames can't step in), as if in the headset
SIM = """(([yaw, secs, from]) => {
  const fd = __fd, T = fd.VR_TOAST, was = fd.state.mode;
  fd.state.mode = 'vr';
  fd.myHead.pos.set(0, 1.6, 0); fd.myHead.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw * Math.PI / 180);
  const t0 = from === undefined ? performance.now() : from; let now = t0;
  for (let i = 0; i < secs * 60; i++) { now += 1000 / 60; T.tick(1 / 60, now); }
  fd.state.mode = was;
  const m = T.mesh, p = m.position, h = fd.myHead.pos;
  const face = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion), toEye = h.clone().sub(p).normalize();
  const ang = Math.atan2(-(p.x - h.x), -(p.z - h.z)) * 180 / Math.PI;     // where it is, as a yaw like the head's
  return { vis: m.visible, op: m.material.opacity, dist: Math.hypot(p.x - h.x, p.z - h.z), dy: p.y - h.y, faces: face.dot(toEye), ang, now };
})"""

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page = b.new_page(viewport={"width": 640, "height": 400})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    i = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'dodgeball')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(7000)     # (past dodgeball's own countdown and GO: a big message isn't covered by a small one)
    page.evaluate("""(() => { const L = __fd.LEVELS[__fd.state.level]; L.hudActions.find((a) => /team/i.test(a.label())).run(); })()""")
    txt = page.evaluate("__fd.VR_TOAST.text")
    # (since v133 only records, bests and results go to the headset: a team change stays on the screen)
    check("a game's everyday message stays off the headset panel", not ("on" in txt and "now" in txt), txt)
    page.wait_for_timeout(300)
    check("on a screen, the panel stays hidden", page.evaluate("!__fd.VR_TOAST.mesh || !__fd.VR_TOAST.mesh.visible"))

    page.evaluate("(() => { __fd.myHead.pos.set(0, 1.6, 0); __fd.myHead.quat.set(0, 0, 0, 1); __fd.VR_TOAST.show('GO! Grab a ball'); })()")
    r = page.evaluate(SIM, [0, 0.5])
    check("in VR it fades in", r["vis"] and r["op"] > 0.95, r)
    check("about 1.2 m along your gaze, a little below the eyes", 1.0 < r["dist"] < 1.35 and -0.35 < r["dy"] < -0.1 and abs(r["ang"]) < 5, r)
    check("it faces you", r["faces"] > 0.97, r)
    r2 = page.evaluate(SIM, [15, 0.5, r["now"]])
    check("a glance doesn't move it", abs(r2["ang"]) < 3, r2)
    r3 = page.evaluate(SIM, [90, 1.5, r2["now"]])
    check("turning round brings it in front of you", abs(r3["ang"] - 90) < 12 and r3["faces"] > 0.97, r3)
    r4 = page.evaluate(SIM, [90, 2.5, r3["now"]])
    check("it fades away after a couple of seconds", not r4["vis"], r4)

    page.evaluate("__fd.VR_TOAST.show('Timeout! Blue team gets the ball back, and the red team has to sit out for the rest of this round while the referee checks the replay')")
    rows = page.evaluate("""(() => { const g = __fd.VR_TOAST.mesh.material.map.image.getContext('2d'), d = g.getImageData(0, 0, 1024, 256).data;
      let edge = 0; for (let y = 0; y < 256; y++) for (const x of [0, 1, 2, 1021, 1022, 1023]) edge += d[(y * 1024 + x) * 4 + 3]; return edge; })()""")
    check("a long message wraps rather than running off the panel", rows == 0, rows)
    page.wait_for_timeout(500)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
