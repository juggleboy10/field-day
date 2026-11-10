"""v97: the Birdwatching Trail, and the camera's zoom and eyepiece.

Sections:
  level    the forest loads with birds about; every bird has somewhere to perch; the menu lists 60 places
  judge    a round: aim at a bird and take a picture: centred and zoomed in scores more than off to one side;
           a bird behind leaves scores nothing; film runs out at 24; the round ends after two minutes (or End game)
           and the Field Notes board counts your best photo of each bird; your life list grows
  kirtland the Kirtland's warbler: only in the jack pines, flies if you get close, and worth 500 when it's centred
  camera   the zoom (the wheel and + / -), the VR eyepiece (raise the camera to your eye), and the stick zooming
           while it's up (and not walking you about)

Usage: python tests/v97.py [section ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
ONLY = set(sys.argv[1:])
want = lambda s: not ONLY or s in ONLY

# look straight at a bird from where I'm standing (browser): the camera points where I look
LOOK = """(b) => { const fd = window.__fd, B = b.B; B.root.updateMatrixWorld(true);
  const c = new THREE.Vector3(0, B.center + B.height * 0.3, 0); B.body.localToWorld(c);
  const eye = new THREE.Vector3(); fd.camera.getWorldPosition(eye); const d = c.clone().sub(eye);
  fd.state.yaw = Math.atan2(-d.x, -d.z); fd.state.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); return d.length(); }"""


def main():
    fails = []
    check = lambda ok, msg: (None if ok else fails.append(msg))
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
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled && window.__fd.CAMERA.C.loaded", timeout=25000)
        page.locator("#btn-flat").click()
        page.evaluate("() => window.__fd.switchLevel(59)")
        page.wait_for_timeout(2500)
        # (a helper in the page: put a bird of this kind on a perch a set distance in front of me, sitting still)
        page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[59].birdInternals;
          window.__bird = (id, dist, kind) => { const sp = I.SP[id];
            for (const b of I.birds) if (!b.gone) { b.gone = true; fd.LEVELS[59].group.remove(b.B.root); if (b.perch) b.perch.taken = null; }
            I.birds.length = 0;
            const eye = new THREE.Vector3(); fd.camera.getWorldPosition(eye);
            const list = I.PERCH[kind || sp.hab[0]].filter((p) => !p.taken).sort((a, b) => Math.abs(a.pos.distanceTo(eye) - dist) - Math.abs(b.pos.distanceTo(eye) - dist));
            const b = I.spawn(sp, { perch: list[0], instant: true }); b.stay = 999; b.maxMoves = 0; return b; };
          window.__still = () => { const I2 = fd.LEVELS[59].birdInternals; for (const b of I2.birds) { b.stay = 999; } }; }""")

        if want("level"):
            r = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[59], I = L.birdInternals;
              const missing = I.SPECIES.filter((sp) => !sp.hab.some((k) => (I.PERCH[k] || []).length)).map((s) => s.id);
              return { name: L.meta.name, birds: I.birds.filter((b) => !b.gone).length, species: I.SPECIES.length, missing,
                kirtland: I.SP.kirtland.tier, habK: I.SP.kirtland.hab.join(','), michigan: I.SPECIES.map((s) => s.id).join(','),
                cam: fd.CAMERA.isOn(), ver: document.getElementById('version-note').textContent }; }""")
            print("level:", r)
            check(r["birds"] >= 5 and not r["missing"] and r["kirtland"] == "legend" and r["habK"] == "jack" and r["cam"], f"level {r}")
            check(r["ver"] == "Field Day version 97", f"version {r['ver']}")

        if want("judge"):
            page.evaluate("() => window.__fd.LEVELS[59].startRound()")
            page.wait_for_timeout(300)
            page.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(2, 0, 15); fd.CAMERA.setZoom(1); }")
            page.wait_for_timeout(300)
            # a cardinal at the feeder, about 5 m away: centred, then zoomed in, then off to one side
            b = page.evaluate_handle("() => window.__bird('cardinal', 5, 'feeder')")
            page.evaluate("() => { const fd = window.__fd; }")
            page.wait_for_timeout(300)
            shots = []
            for k, (name, zoom, yaw_off) in enumerate((("centred", 1, 0), ("zoomed", 4, 0), ("off to the side", 4, 0.06))):
                page.evaluate(LOOK, b)
                page.evaluate(f"() => {{ const fd = window.__fd; fd.CAMERA.setZoom({zoom}); fd.state.yaw += {yaw_off}; }}")
                page.wait_for_timeout(350)
                page.evaluate(f"() => window.__fd.CAMERA.snap(performance.now() + {(k + 1) * 1e6})")
                s = page.evaluate("() => { const R = window.__fd.LEVELS[59].birdInternals.R, s = R.shots[R.shots.length - 1]; return { sp: s.sp && s.sp.id, pts: s.pts, centre: +s.centre.toFixed(2), frac: +s.frac.toFixed(3), film: R.film }; }")
                shots.append((name, s))
            print("cardinal shots:", shots)
            c, z, o = shots[0][1], shots[1][1], shots[2][1]
            check(c["sp"] == "cardinal" and c["centre"] > 0.9 and z["pts"] > c["pts"] * 2 and o["sp"] == "cardinal" and o["pts"] < z["pts"] and o["film"] == 21, f"judging {shots}")
            # behind the leaves: a bird inside a tree's foliage, seen from the other side, doesn't count
            hid = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[59].birdInternals; const b = window.__bird('robin', 14, 'branch');
              return { pos: [b.pos.x, b.pos.y, b.pos.z] }; }""")
            j = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[59].birdInternals, b = I.birds.find((x) => !x.gone);
              // stand on the far side of its tree: the leaves are between us
              const p = b.perch.pos, back = new THREE.Vector3(p.x, 0, p.z).sub(new THREE.Vector3(fd.dolly.position.x, 0, fd.dolly.position.z)).normalize();
              const eye0 = new THREE.Vector3(); fd.camera.getWorldPosition(eye0); const off = eye0.y;
              let best = null;
              for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2, x = p.x + Math.cos(ang) * 7, z = p.z + Math.sin(ang) * 7;
                fd.dolly.position.set(x, 0, z); fd.dolly.updateMatrixWorld(true); fd.camera.updateMatrixWorld(true);
                const eye = new THREE.Vector3(); fd.camera.getWorldPosition(eye); const cam = fd.CAMERA.pcam; cam.position.copy(eye); cam.fov = 20; cam.aspect = 4 / 3; cam.lookAt(b.pos); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
                const r = I.judge(cam); if (r.hidden && !r.best) { best = { hidden: r.hidden, x, z }; break; } }
              return best; }""")
            print("behind the leaves:", j)
            check(j is not None and j["hidden"] >= 1, f"a bird behind leaves still scored {j}")
            # out of film: 24 then no more
            page.evaluate("() => { const R = window.__fd.LEVELS[59].birdInternals.R; R.film = 1; }")
            page.evaluate("() => window.__fd.CAMERA.snap(performance.now() + 3e7)")
            out = page.evaluate("() => { const C = window.__fd.CAMERA, R = window.__fd.LEVELS[59].birdInternals.R, n = R.shots.length; const took = C.snap(performance.now() + 4e7); return { took, n, after: R.shots.length, film: R.film }; }")
            print("out of film:", out)
            check(out["took"] is False and out["after"] == out["n"] and out["film"] == 0, f"film {out}")
            # the round ends: the best of each bird counts
            res = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[59].birdInternals, R = I.R; R.t0 -= 130000; fd.LEVELS[59].update(0.016, performance.now());
              const best = {}; for (const s of R.shots) if (s.sp) best[s.sp.id] = Math.max(best[s.sp.id] || 0, s.pts);
              return { ph: R.ph, total: R.results && R.results.total, want: Object.values(best).reduce((a, b) => a + b, 0), counted: R.shots.filter((s) => s.counts).length, kinds: Object.keys(best).length,
                life: I.life.has('cardinal'), album: fd.CAMERA.mine.length }; }""")
            print("round end:", res)
            check(res["ph"] == "done" and res["total"] == res["want"] and res["counted"] == res["kinds"] and res["life"], f"round end {res}")
            page.wait_for_timeout(600)
            page.evaluate("() => { const fd = window.__fd; fd.CAMERA.setZoom(1); }")
            page.wait_for_timeout(500)
            page.screenshot(path=str(ROOT / "tests" / "shots" / "birdwatch_results.png")) if (ROOT / "tests" / "shots").exists() else None

        if want("kirtland"):
            page.evaluate("() => { window.__fd.LEVELS[59].startRound(); window.__fd.dolly.position.set(9, 0, -16); }")
            page.wait_for_timeout(300)
            k = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[59].birdInternals;
              for (const b of I.birds) if (!b.gone) { b.gone = true; fd.LEVELS[59].group.remove(b.B.root); if (b.perch) b.perch.taken = null; } I.birds.length = 0;
              I.releaseSpecial({ id: 'kirtland' }); const b = I.birds.find((x) => x.sp.id === 'kirtland');
              return b ? { kind: b.perch.kind, y: +b.pos.y.toFixed(2), d: +b.pos.distanceTo(fd.myHead.pos).toFixed(1) } : null; }""")
            print("Kirtland's appears:", k)
            check(k is not None and k["kind"] == "jack" and k["y"] < 3 and k["d"] > 9, f"kirtland perch {k}")
            # a long lens on it, from where I am (moving to a spot with a clear view of it)
            shot = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[59].birdInternals, b = I.birds.find((x) => x.sp.id === 'kirtland'); b.stay = 999;
              let got = null;
              for (let a = 0; a < 24; a++) for (const r of [9.5, 11, 14]) { const ang = a / 24 * Math.PI * 2, x = b.pos.x + Math.cos(ang) * r, z = b.pos.z + Math.sin(ang) * r;
                fd.dolly.position.set(x, 0, z); fd.dolly.updateMatrixWorld(true); fd.camera.updateMatrixWorld(true);
                const eye = new THREE.Vector3(); fd.camera.getWorldPosition(eye); const cam = fd.CAMERA.pcam; cam.position.copy(eye); cam.fov = 56 / 6; cam.aspect = 4 / 3;
                const c = new THREE.Vector3(0, b.B.center + b.B.height * 0.3, 0); b.B.body.localToWorld(c); cam.lookAt(c); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
                const j = I.judge(cam); if (j.best && j.best.sp.id === 'kirtland' && j.best.seen === 3 && (!got || j.best.pts > got.pts)) got = { pts: j.best.pts, centre: +j.best.centre.toFixed(2), r }; }
              return got; }""")
            print("Kirtland's, zoomed and centred:", shot)
            check(shot is not None and shot["pts"] >= 300, f"kirtland score {shot}")
            # walk up close: it's off
            fl = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[59].birdInternals, b = I.birds.find((x) => x.sp.id === 'kirtland'); b.stay = 999;
              fd.dolly.position.set(b.pos.x + 3, 0, b.pos.z); fd.dolly.updateMatrixWorld(true); fd.camera.updateMatrixWorld(true); fd.myHead.pos.set(b.pos.x + 3, 1.6, b.pos.z);
              fd.LEVELS[59].update(0.016, performance.now()); return b.state; }""")
            print("Kirtland's when I get close:", fl)
            check(fl in ("fly", "leave"), f"kirtland didn't flush {fl}")

        if want("camera"):
            z = page.evaluate("""() => { const C = window.__fd.CAMERA; if (!C.isOn()) C.toggle(); C.setZoom(1); return C.C.zoom; }""")
            page.mouse.move(500, 300)
            page.mouse.wheel(0, -600)
            page.wait_for_timeout(200)
            zw = page.evaluate("() => window.__fd.CAMERA.C.zoom")
            page.keyboard.press("Minus")
            zm = page.evaluate("() => window.__fd.CAMERA.C.zoom")
            view = page.evaluate("() => { const C = window.__fd.CAMERA; const v = C.viewCam(); return v ? +v.fov.toFixed(1) : null; }")
            print("zoom:", z, zw, zm, view)
            check(z == 1 and zw > 1.5 and zm < zw and view is not None and view < 56, f"browser zoom {z} {zw} {zm} {view}")
            vr = page.evaluate("""() => { const fd = window.__fd, C = fd.CAMERA; C.setZoom(1); fd.state.mode = 'vr';
              const R = fd.myHands.right; R.ok = true; const stick = { axes: [0, 0, 0, 0], buttons: [{ pressed: false }, { pressed: false }] };
              const src = fd.vrHands.right.source; fd.vrHands.right.source = { gamepad: stick };
              C.C.hand = 'right'; C.C.trigPrev = false;
              // the camera held out in front: no eyepiece
              fd.myHead.pos.set(0, 1.6, 15); fd.myHead.quat.identity();
              R.pos.set(0.2, 1.2, 14.6); R.quat.identity(); C.tick(1 / 72, performance.now());
              const away = C.C.eye;
              // up to my eye: the eyepiece; the stick zooms and isn't for walking
              R.pos.set(0.01, 1.565, 14.99); C.tick(1 / 72, performance.now()); const up = C.C.eye, shown = C.eyeG.visible, busy = C.stickBusy('right');
              stick.axes[3] = -1; for (let i = 0; i < 72; i++) C.tick(1 / 72, performance.now()); const zoomed = C.C.zoom;
              stick.axes[3] = 0; R.pos.set(0.2, 1.2, 14.6); C.tick(1 / 72, performance.now()); const down = C.C.eye, hidden = !C.eyeG.visible;
              fd.vrHands.right.source = src; fd.state.mode = 'flat';
              return { away, up, shown, busy, zoomed: +zoomed.toFixed(2), down, hidden }; }""")
            print("VR eyepiece:", vr)
            check(vr["away"] is False and vr["up"] and vr["shown"] and vr["busy"] and vr["zoomed"] > 3 and vr["down"] is False and vr["hidden"], f"VR eyepiece {vr}")

        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv97 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
