"""v93: the VR paddle can't be swung through the ball (pickleball and ping pong), and the 90s camera.

Usage: python tests/v93.py [paddle|camera]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
ONLY = set(sys.argv[1:])
want = lambda g: not ONLY or g in ONLY

# one frame: the ball goes from prev to now (fast, or a slow frame) straight through a paddle that's held still, or
# that's being swung, or that's moving with you. The blade is at bc, facing +x.
PB_HIT = """([b0x, b1x, p0x, p1x, dt]) => { const fd = window.__fd, L = fd.LEVELS[15], PB = L.pb, I = PB.internals, t = I.paddles[PB.mySlot];
  fd.state.mode = 'vr';
  const y = 1.0, z = 0.3, V = THREE.Vector3;
  t.quat.set(0, 0, 0, 1);
  const place = (x) => t.pos.set(x, y, z + 0.22);                 // (the blade's centre sits 0.22 m along -z from the grip)
  Object.assign(PB, { ph: 'rally', lastHit: 1, need: 0, hits: 4, bounced: true, auth: fd.state.myPeer });
  I.resetSwing(); place(p0x); I.vrPaddle(dt, 6, null);
  place(p1x); Object.assign(PB.b, { x: b1x, y, z, vx: (b1x - b0x) / dt, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 });
  const hits0 = PB.hits; I.vrPaddle(dt, 6, new V(b0x, y, z));
  const out = { hit: PB.hits > hits0 || PB.lastHit === PB.mySide, vx: +PB.b.vx.toFixed(1), x: +PB.b.x.toFixed(2) };
  PB.ph = 'dead'; fd.state.mode = 'flat'; return out; }"""


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

        if want("paddle"):
            go(15)
            page.evaluate("() => { const fd = window.__fd, t = fd.LEVELS[15].pb.internals.paddles[0]; fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }")
            page.wait_for_timeout(400)
            page.keyboard.press("KeyE")
            page.wait_for_timeout(600)
            page.evaluate("() => { window.__fd.LEVELS[15].update = () => {}; }")
            cases = {
                # a 21 m/s ball through a paddle held still: 0.35 m in one frame, more than the old check could see
                "still, fast ball": [-4.95, -5.30, -5.15, -5.15, 1 / 60],
                # a slow frame (30 fps) with a normal ball
                "slow frame": [-4.90, -5.30, -5.10, -5.10, 1 / 30],
                # swinging hard into it while walking forward
                "swing and step": [-5.00, -5.14, -5.45, -4.95, 1 / 72],
                # a miss is still a miss: the ball goes by well wide of the paddle
                "wide": [-4.95, -5.30, -5.15, -5.15, 1 / 60],
            }
            res = {}
            for k, a in cases.items():
                if k == "wide":
                    res[k] = page.evaluate(PB_HIT.replace("const y = 1.0, z = 0.3", "const y = 1.0, z = 0.3 + 0.0").replace("Object.assign(PB.b, { x: b1x, y, z,", "Object.assign(PB.b, { x: b1x, y: y + 0.6, z,").replace("new V(b0x, y, z)", "new V(b0x, y + 0.6, z)"), a)
                else:
                    res[k] = page.evaluate(PB_HIT, a)
            print("pickleball:", res)
            for k in ("still, fast ball", "slow frame", "swing and step"):
                check(res[k]["hit"] and res[k]["vx"] > 0 and res[k]["x"] > -5.45, f"pickleball {k}: {res[k]}")
            check(not res["wide"]["hit"], f"pickleball: a ball well wide isn't a hit {res['wide']}")

            # ping pong: the same, at the clubhouse table
            go(8)
            page.evaluate("() => { const fd = window.__fd, I = fd.LEVELS[8].pingpong.internals, s = I.STAND[0]; fd.dolly.position.set(s.x, 0, s.z); }")
            page.wait_for_timeout(500)
            page.keyboard.press("KeyE")
            page.wait_for_timeout(700)
            pp = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[8], PP = L.pingpong, I = PP.internals; if (PP.mySide < 0) return { side: -1 };
              const t = I.paddles.find((x) => x.held && x.held.peer === fd.state.myPeer); if (!t) return { held: false };
              fd.state.mode = 'vr'; const V = THREE.Vector3, C = I.C, y = I.Y + 0.25, z = C.z + 0.1, dt = 1 / 60, s = PP.mySide, sg = s === 0 ? -1 : 1;
              t.quat.set(0, 0, 0, 1);
              const u0 = sg * 1.35, u1 = sg * 1.62, pu = sg * 1.5;
              Object.assign(PP, { ph: 'rally', lastHit: 1 - s, need: s, bounced: true, auth: fd.state.myPeer });
              I.resetSwing(); t.pos.set(C.x + pu, y, z + 0.15); I.vrPaddle(dt, 6, null);
              Object.assign(PP.b, { u: u1, y, v: z - C.z, vu: (u1 - u0) / dt, vy: 0, vv: 0 });
              I.vrPaddle(dt, 6, new V(C.x + u0, y, z));
              const out = { hit: PP.lastHit === s, vu: +PP.b.vu.toFixed(1) }; PP.ph = 'dead'; fd.state.mode = 'flat'; return out; }""")
            print("ping pong:", pp)
            check(pp.get("hit") and pp["vu"] * (1 if pp else 1) != 0, f"ping pong fast ball through a still paddle {pp}")

        if want("camera"):
            go(37)
            page.evaluate("() => { try { localStorage.removeItem('fd_photos'); } catch (e) {} const C = window.__fd.CAMERA; for (const p of C.mine.slice()) C.removeMine(p); }")
            # browser: P, Space, V, Space
            page.keyboard.press("KeyO"); page.wait_for_timeout(300)
            on = page.evaluate("() => window.__fd.CAMERA.isOn()")
            page.keyboard.press("Space"); page.wait_for_timeout(900)
            page.keyboard.press("KeyV"); page.wait_for_timeout(300)
            selfie = page.evaluate("() => { const C = window.__fd.CAMERA; return { selfie: C.C.selfie, view: !!C.viewCam() }; }")
            page.keyboard.press("Space"); page.wait_for_timeout(900)
            fl = page.evaluate("() => { const C = window.__fd.CAMERA; return { n: C.photos.length, jpeg: C.photos.every((u) => u.startsWith('data:image/jpeg') && u.length > 20000), kept: C.mine.length }; }")
            page.keyboard.press("KeyO"); page.wait_for_timeout(300)
            off = page.evaluate("() => window.__fd.CAMERA.isOn()")
            print("browser camera:", on, selfie, fl, off)
            check(on and selfie == {"selfie": True, "view": True} and fl == {"n": 2, "jpeg": True, "kept": 2} and not off, f"browser camera {on} {selfie} {fl} {off}")
            # the same keys don't fire the game while the camera's out (Space didn't start a volleyball charge)
            # VR: the camera in the hand that pressed the watch; the trigger takes a picture; turned to face you, a selfie
            vr = page.evaluate("""() => { const fd = window.__fd, C = fd.CAMERA, h = fd.myHands.right, vh = fd.vrHands.right, src0 = vh.source;
              fd.state.mode = 'vr'; const head = fd.myHead.pos.clone();
              const ids = fd.watch.btns().map((b) => b.id); fd.watch.press('cam'); const hand = C.C.hand;
              const hh = fd.myHands[hand], vhh = fd.vrHands[hand], srcH = vhh.source; hh.ok = true;
              const btn = { pressed: false }; vhh.source = { gamepad: { buttons: [btn, { pressed: false }, {}, {}, { pressed: false }, { pressed: false }] } };
              // held out in front, the lens pointing away from me
              hh.pos.set(head.x, head.y - 0.2, head.z - 0.4); hh.quat.set(0, 0, 0, 1);
              let now = performance.now() + 2000; C.tick(1 / 72, now); now += 14; C.tick(1 / 72, now);
              btn.pressed = true; now += 14; C.tick(1 / 72, now); const n1 = C.photos.length, s1 = C.C.selfie;
              btn.pressed = false; now += 900; C.tick(1 / 72, now);
              // turned round to face me
              hh.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); now += 14; C.tick(1 / 72, now);
              btn.pressed = true; now += 14; C.tick(1 / 72, now); const n2 = C.photos.length, s2 = C.C.selfie;
              btn.pressed = false; C.toggle(); fd.state.mode = 'flat'; vh.source = src0; vhh.source = srcH;
              return { ids, hand, n1, s1, n2, s2 }; }""")
            print("VR camera:", vr)
            check("cam" in vr["ids"] and vr["n1"] == 3 and vr["s1"] is False and vr["n2"] == 4 and vr["s2"] is True, f"VR camera {vr}")
            # the photo wall in the clubhouse
            go(8)
            page.wait_for_timeout(800)
            wall = page.evaluate("() => { let n = 0; window.__fd.LEVELS[8].group.traverse((o) => { if (o.isMesh && o.material && o.material.map && o.material.map.image && o.material.map.image.src && o.material.map.image.src.startsWith('data:image/jpeg')) n++; }); return n; }")
            print("photo wall pictures:", wall)
            check(wall == 4, f"photo wall {wall}")

        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv93 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
