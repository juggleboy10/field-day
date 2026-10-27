"""v92: every quest's paths are clear end to end (Frostpeak's were blocked), and the VR putter plays like Walkabout:
always solid (the trigger ghosts it), a flat face, the ball goes where you swing, and you go to your ball afterwards.

Usage: python tests/v92.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
QUESTS = [3, 10, 11, 22, 30]

WALK = """(idx) => { const L = window.__fd.LEVELS[idx], out = []; const pg0 = L.q.pg; L.q.pg = 99;
  L.PATHS.forEach((P, i) => { const r = L.ROOMS[i], n = L.ROOMS[i + 1];
    const pts = [[r.cx, r.cz], [P.ax, r.z0 + 1], [P.ax, P.zm], [P.bx, P.zm], [P.bx, n.z1 - 1], [n.cx, n.cz]];
    let x = pts[0][0], z = pts[0][1], stuck = null;
    for (let k = 1; k < pts.length && !stuck; k++) { const [tx, tz] = pts[k]; for (let s = 0; s < 400; s++) { const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz); if (d < 0.1) break; const st = Math.min(0.08, d), nx = x + dx / d * st, nz = z + dz / d * st, c = L.clampPlayer({ x: nx, z: nz }), px = nx + c[0], pz = nz + c[1]; if (Math.hypot(px - x, pz - z) < 0.01) { stuck = [+px.toFixed(1), +pz.toFixed(1)]; break; } x = px; z = pz; } }
    if (stuck) out.push(`${r.name} -> ${n.name} at ${stuck}`); });
  L.q.pg = pg0; return out; }"""

# a VR swing: the putter hand moves at v m/s along (dx, dz), the shaft straight down, the face across the swing;
# the ball sits at (bx, bz) with the head passing `off` metres to one side along the face
SWING = """([v, ang, off, trig]) => { const fd = window.__fd, L = fd.LEVELS[6], B = L.ball, me = L.me, I = { H: null };
  const mh = fd.myHands[me.hand];
  const H = L.holes ? L.holes[me.hole] : null; void H;
  me.phase = 'rest'; B.vx = B.vz = 0; const bx = B.x, bz = B.z;
  const gy = L.ballY() - 0.034;
  const ux = Math.sin(ang), uz = -Math.cos(ang);                  // the swing direction
  // shaft down; the face's long side (the putter's local x) across the swing
  // shaft down (local -z), toe away across the swing (local y), so the face looks along the swing
  const zA = new THREE.Vector3(0, 1, 0), yA = new THREE.Vector3(-uz, 0, ux), xA = new THREE.Vector3().crossVectors(yA, zA);
  mh.quat.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA)); mh.ok = true;
  const face = new THREE.Vector3(0, 1, 0).applyQuaternion(mh.quat);
  const src = { gamepad: { buttons: [{ pressed: !!trig }, { pressed: true }, {}, {}, { pressed: false }, { pressed: false }] } };
  const h = window.__fd.voice && null; void h;
  const vrh = window.__fdVR || null; void vrh;
  const vh = fd.vrHands[me.hand], src0 = vh.source; vh.source = src;
  let now = performance.now() + 5000; const dt = 1 / 72, start = -0.35;
  for (let k = 0; k < 72; k++) {
    const s = start + v * k * dt;
    mh.pos.set(bx + ux * s + face.x * off, gy + 0.034 + 0.9, bz + uz * s + face.z * off);
    L.vrPutter(dt, now); now += 1000 / 72;
    if (me.phase === 'moving') break;
  }
  const sp = Math.hypot(B.vx, B.vz), out = { hit: me.phase === 'moving', sp: +sp.toFixed(2), dir: sp ? +(Math.atan2(B.vx, -B.vz) * 180 / Math.PI).toFixed(1) : null, swing: +(ang * 180 / Math.PI).toFixed(1) };
  vh.source = src0; me.phase = 'rest'; B.x = bx; B.z = bz; B.vx = B.vz = 0; me.strokes = 0; return out; }"""


def main():
    fails = []
    check = lambda ok, msg: (None if ok else fails.append(msg))
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
        page.locator("#btn-flat").click()
        go = lambda i: (page.evaluate(f"() => window.__fd.switchLevel({i})"), page.wait_for_timeout(1500))

        # ---- quests: walk every path, start to finish, as a player would
        for q in QUESTS:
            go(q)
            st = page.evaluate(WALK, q)
            print(f"quest {q} blocked:", st)
            check(not st, f"quest {q}: blocked {st}")

        # ---- mini golf, VR putter
        go(6)
        page.evaluate("() => { const fd = window.__fd, L = fd.LEVELS[6]; L.update = (() => {}); }")
        # the putter hand's controller: the trigger state comes from L.__src (patched in through vrHands)
        page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[6]; const hands = fd.vrHands || null; void hands; }""")
        has = page.evaluate("() => !!window.__fd.LEVELS[6].vrPutter")
        check(has, "vrPutter exposed")
        if has:
            # trigger state: patch the VR hand's gamepad for the putter hand
            page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[6]; const vh = fd.vrHandsForTests; void vh; }""")
            res = {}
            for name, args in (("straight", [1.5, 0.0, 0.0, False]), ("angled", [1.5, 0.52, 0.0, False]), ("toe", [1.5, 0.0, 0.045, False]), ("ghost", [1.5, 0.0, 0.0, True]), ("soft", [0.6, 0.0, 0.0, False])):
                res[name] = page.evaluate(SWING, args)
            print("putts:", res)
            s, a, t, g, so = res["straight"], res["angled"], res["toe"], res["ghost"], res["soft"]
            check(s["hit"] and abs(s["dir"] - 0) < 3 and 1.6 < s["sp"] < 2.3, f"straight putt {s}")
            check(a["hit"] and abs(a["dir"] - 29.8) < 5, f"the ball follows the swing {a}")
            check(t["hit"] and 1 < abs(t["dir"]) < 12, f"a toe hit still goes roughly where you swung {t}")
            check(not g["hit"], f"the trigger ghosts the putter {g}")
            check(so["hit"] and so["sp"] < s["sp"] * 0.55, f"a soft swing is a soft putt {so}")
            # going to the ball: behind it, on the line to the cup
            gb = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[6], B = L.ball; B.x += 0.6; L.goToBall(performance.now()); const c = new THREE.Vector3(); fd.camera.getWorldPosition(c);
              return { d: +Math.hypot(c.x - B.x, c.z - B.z).toFixed(2) }; }""")
            print("go to ball:", gb)
            check(abs(gb["d"] - 0.65) < 0.1, f"go to ball {gb}")

        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv92 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
