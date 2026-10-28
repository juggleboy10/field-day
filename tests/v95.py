"""v95: the floating classic body, the version number on the start screen and the watch, and in VR the save and
print buttons on each photo on the clubhouse walls.

The floating classic body: A friend's body turns a beat behind their head (never more than 45 degrees from
it), leans forward as they bend down, bobs as they walk and keeps still when they stand; they blink; their mouth
opens and closes with their voice (or with "talking" from their page when their voice isn't reaching you).

Usage: python tests/v95.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

BODY = """() => { const fd = window.__fd, V = fd.voice, rec = V.createRemote('tBody'), dt = 1 / 72;
  rec.inGame = false; rec.look = [0, 0, 0, 0];
  const h = rec.cur.h, Q = THREE.Quaternion, up = new THREE.Vector3(0, 1, 0);
  const yawOf = (q) => { const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q); return Math.atan2(-f.x, -f.z); };
  const upright = () => new THREE.Vector3(0, 1, 0).applyQuaternion(rec.body.quaternion).angleTo(up);
  h.pos.set(0, 1.6, 0); h.quat.identity(); for (let i = 0; i < 72; i++) V.bodyFollow(rec, dt);
  // turn the head 70 degrees: the body starts 45 behind, then catches up
  h.quat.setFromAxisAngle(up, 1.2); V.bodyFollow(rec, dt); const lag = yawOf(rec.body.quaternion);
  for (let i = 0; i < 144; i++) V.bodyFollow(rec, dt); const caught = yawOf(rec.body.quaternion);
  // standing still: no bob
  let lo = 9, hi = -9; for (let i = 0; i < 72; i++) { V.bodyFollow(rec, dt); lo = Math.min(lo, rec.body.position.y); hi = Math.max(hi, rec.body.position.y); } const still = hi - lo;
  // walking at 1.4 m/s: a bob
  lo = 9; hi = -9; for (let i = 0; i < 144; i++) { h.pos.z -= 1.4 * dt; V.bodyFollow(rec, dt); if (i > 40) { lo = Math.min(lo, rec.body.position.y); hi = Math.max(hi, rec.body.position.y); } } const walkBob = hi - lo;
  // bending down: the chest leans in
  const tilt0 = upright(); h.pos.y = 1.15; for (let i = 0; i < 30; i++) V.bodyFollow(rec, dt); const tilt1 = upright();
  h.pos.y = 1.6; for (let i = 0; i < 30; i++) V.bodyFollow(rec, dt);
  // talking (their page says so): the mouth moves; quiet: it closes
  rec.pres = { vt: 1 }; let open = 0; for (let i = 0; i < 72; i++) { V.bodyFollow(rec, dt); open = Math.max(open, rec.mouth.scale.y); }
  rec.pres = { vt: 0 }; for (let i = 0; i < 72; i++) V.bodyFollow(rec, dt); const shut = rec.mouth.scale.y;
  // their voice, loud: wide open
  V.VOICE.peers.set('tBody', { on: true, dead: false, lvl: 0.12 }); for (let i = 0; i < 20; i++) V.bodyFollow(rec, dt); const loud = rec.mouth.scale.y; V.VOICE.peers.delete('tBody');
  // blinking, now and then
  let blinks = 0, was = false; for (let i = 0; i < 72 * 8; i++) { V.bodyFollow(rec, dt); const b = rec.faceSlot.scale.y < 0.5; if (b && !was) blinks++; was = b; }
  // shades don't blink
  rec.look = [0, 2, 0, 0]; let shadeBlink = false; for (let i = 0; i < 72 * 8; i++) { V.bodyFollow(rec, dt); if (rec.faceSlot.scale.y < 0.5) shadeBlink = true; }
  V.remotes.delete('tBody'); for (const p of rec.parts) p.parent && p.parent.remove(p);
  return { lag: +lag.toFixed(2), caught: +caught.toFixed(2), still: +still.toFixed(4), walkBob: +walkBob.toFixed(3), tilt0: +tilt0.toFixed(2), tilt1: +tilt1.toFixed(2),
    open: +open.toFixed(2), shut: +shut.toFixed(2), loud: +loud.toFixed(2), blinks, shadeBlink }; }"""


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
        page.wait_for_timeout(800)
        r = page.evaluate(BODY)
        print("body:", r)
        check(abs(r["lag"] - 0.4) < 0.03 and abs(r["caught"] - 1.2) < 0.03, f"body turns a beat behind {r}")
        check(r["still"] < 0.001 and r["walkBob"] > 0.012, f"bob only when walking {r}")
        check(r["tilt0"] < 0.02 and r["tilt1"] > 0.15, f"leans when bending {r}")
        check(r["open"] > 0.5 and r["shut"] < 0.22 and r["loud"] > 0.8, f"mouth {r}")
        check(r["blinks"] >= 1 and not r["shadeBlink"], f"blinks {r}")
        # the version, on the start screen and on the watch
        ver = page.evaluate("() => document.getElementById('version-note').textContent")
        check(ver.startswith("Field Day version 9"), f"version note {ver}")
        # VR at the photo walls: the star saves a photo of mine, the corner button on someone else's gives me a print
        page.evaluate("() => window.__fd.switchLevel(8)")
        page.wait_for_timeout(1500)
        vr = page.evaluate("""async () => { const fd = window.__fd, C = fd.CAMERA;
          C.toggle(); C.snap(performance.now() + 5000); C.toggle();
          fd.PHOTOS._add({ id: 'gx', n: 'Ava', t: Date.now(), src: C.mine[C.mine.length - 1].src });
          await new Promise((r) => setTimeout(r, 400));
          fd.state.mode = 'vr'; fd.myHands.right.ok = true; fd.myHands.left.ok = true;
          const W = (k) => C.WALLS.list.find((w) => w.kind === k);
          const m = W('mine').slots[0], a = W('all').slots[0];
          const kept0 = m.item.p.kept; m.mini.ready = true; m.mini.onPress(); const kept1 = m.item.p.kept;
          const starPainted = m.badge.visible;
          fd.myHands.right.pos.copy(a.mini.pos); a.mini.ready = true; await a.mini.onPress();
          const h = C.P.held, print = { held: !!h, gid: h && h.gid, src: !!(h && h.src), side: h && h.side };
          C.binHeld();
          a.btn.ready = true; a.btn.onPress(); const hearted = fd.PHOTOS.list().find((p) => p.id === 'gx').hearted;
          // the hand still there: pressing again does nothing until it comes away
          a.btn.onPress(); const still = fd.PHOTOS.list().find((p) => p.id === 'gx').hearted;
          fd.state.mode = 'flat';
          return { kept0, kept1, starPainted, print, hearted, still, buttons: fd.LEVELS[8].buttons.filter((b) => b.away).length }; }""")
        print("VR walls:", vr)
        check(vr["kept0"] is False and vr["kept1"] is True and vr["starPainted"], f"VR star saves {vr}")
        check(vr["print"] == {"held": True, "gid": "gx", "src": True, "side": "right"}, f"VR print from everyone's wall {vr}")
        check(vr["hearted"] and vr["still"], f"VR heart {vr}")
        check(vr["buttons"] >= 60, f"wall buttons {vr}")
        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv95 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
