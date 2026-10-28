"""v94: the photos (your own wall, everyone's wall with hearts, best of all time, prints you can carry and leave),
and a pickleball you can see spin.

Sections:
  ball    the pickleball has its holes, and turns with its spin (the right way round)
  store   your photos: the last 12 roll on, saved ones stay, they're still there after a reload (and v93's come over)
  walls   the three walls in the clubhouse; aiming at someone's photo and pressing E gives it a heart
  prints  a print from your wall: carried, stood up with E, picked up again, still there after a reload, binned
  vr      VR: grab the print sliding out of the camera with the other hand, let go to leave it; a hand resting on a
          print or a wall photo doesn't press it again
  album   the album's three tabs, picking several and saving them in the browser, a download
  php     your own website: photos.php (run with php -S) shares photos between two devices, with hearts

Usage: python tests/v94.py [section ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
ONLY = set(sys.argv[1:])
want = lambda s: not ONLY or s in ONLY


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close(); return port


def setup(ctx):
    if THREE_JS:
        ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
    for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
        ctx.route(pat, lambda r: r.abort())


def open_page(ctx, url, errors, who=""):
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"{who}{e}"))
    page.goto(url)
    page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled && window.__fd.CAMERA.C.loaded", timeout=25000)
    page.locator("#btn-flat").click()
    return page


SNAP = """(n) => { const fd = window.__fd, C = fd.CAMERA; if (!C.isOn()) C.toggle();
  let t = (C.C.lastShot || 0) + 1000; for (let i = 0; i < n; i++) { C.snap(t); t += 1000; } C.toggle(); return C.mine.length; }"""


def main():
    fails = []
    check = lambda ok, msg: (None if ok else fails.append(msg))
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 900, "height": 560}, accept_downloads=True)
        setup(ctx)
        errors = []
        url = (ROOT / "index.html").as_uri() + "?test"
        page = open_page(ctx, url, errors)
        go = lambda i: (page.evaluate(f"() => window.__fd.switchLevel({i})"), page.wait_for_timeout(1500))

        if want("ball"):
            go(15)
            r = page.evaluate("""() => { const fd = window.__fd, PB = fd.LEVELS[15].pb, I = PB.internals, m = I.ballMesh;
              const holes = !!(m.material.map && m.material.map.image && m.material.map.image.width === 256);
              PB.ph = 'serve'; Object.assign(PB.b, { vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 });
              m.quaternion.identity(); for (let i = 0; i < 3; i++) I.spinBall(1 / 60); const still = m.quaternion.angleTo(new THREE.Quaternion());
              // topspin for a ball going -z is a spin about -x... here just: spin about +x turns the top towards +z
              Object.assign(PB.b, { wx: 0.8 }); m.quaternion.identity(); for (let i = 0; i < 3; i++) I.spinBall(1 / 60);
              const ang = m.quaternion.angleTo(new THREE.Quaternion()), top = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion);
              Object.assign(PB.b, { wx: 0 }); PB.ph = 'idle';
              return { holes, still: +still.toFixed(4), ang: +ang.toFixed(3), topZ: +top.z.toFixed(3) }; }""")
            print("ball:", r)
            check(r["holes"] and r["still"] == 0 and abs(r["ang"] - 0.8 * 34 * 3 / 60) < 0.02 and r["topZ"] > 0.5, f"pickleball spin {r}")

        if want("store") or want("walls") or want("prints") or want("vr") or want("album"):
            go(8)
            page.evaluate("() => { const C = window.__fd.CAMERA; for (const p of C.mine.slice()) C.removeMine(p); }")

        if want("store"):
            n14 = page.evaluate(SNAP, 14)
            kept = page.evaluate("() => { const C = window.__fd.CAMERA, a = C.mine.slice(0, 2); for (const p of a) C.setKept(p, true); return a.map((p) => p.id); }")
            n17 = page.evaluate(SNAP, 3)
            still = page.evaluate(f"() => {kept}.every((id) => window.__fd.CAMERA.mine.some((p) => p.id === id && p.kept))")
            print("store: after 14:", n14, "after 2 saved and 3 more:", n17, "saved still there:", still)
            check(n14 == 12 and n17 == 14 and still, f"rolling store {n14} {n17} {still}")
            # one of v93's (in localStorage) to bring over, then a reload
            page.evaluate("() => { const C = window.__fd.CAMERA; localStorage.setItem('fd_photos', JSON.stringify([C.mine[C.mine.length - 1].src])); }")
            # (once this browser's store has them all)
            page.wait_for_function("""() => new Promise((res) => { const r = indexedDB.open('field-day', 1); r.onsuccess = () => { const q = r.result.transaction('photos', 'readonly').objectStore('photos').getAll(); q.onsuccess = () => res(q.result.length === 14 && q.result.filter((p) => p.kept).length === 2); }; })""", timeout=20000)
            page.reload()
            page.wait_for_function("() => window.__fd && window.__fd.CAMERA.C.loaded", timeout=25000)
            page.locator("#btn-flat").click()
            go(8)
            r = page.evaluate(f"""() => {{ const C = window.__fd.CAMERA; return {{ n: C.mine.length, kept: C.mine.filter((p) => p.kept).length, saved: {kept}.every((id) => C.mine.some((p) => p.id === id)),
              old: C.mine.some((p) => p.id.startsWith('old')), ls: localStorage.getItem('fd_photos'), jpeg: C.mine.every((p) => p.src.startsWith('data:image/jpeg')) }}; }}""")
            print("store after reload:", r)
            check(r == {"n": 14, "kept": 2, "saved": True, "old": True, "ls": None, "jpeg": True}, f"store after reload {r}")

        if want("walls") or want("prints") or want("vr") or want("album"):
            if page.evaluate("() => window.__fd.CAMERA.mine.length") < 5:
                page.evaluate(SNAP, 5)

        if want("walls"):
            page.evaluate("""() => { const fd = window.__fd, src = fd.CAMERA.mine.map((p) => p.src);
              ['Ava', 'Max', 'Zoe'].forEach((n, i) => fd.PHOTOS._add({ id: 'g' + i, n, t: Date.now() - i * 60000, src: src[i] }));
              fd.PHOTOS._hearts.set('g2', new Set(['a', 'b'])); }""")
            page.wait_for_timeout(700)
            r = page.evaluate("""() => { const fd = window.__fd, W = fd.CAMERA.WALLS, L = fd.LEVELS[8];
              const items = (k) => W.list.find((w) => w.kind === k).slots.filter((s) => s.item).map((s) => s.item.a);
              const pics = (k) => W.list.find((w) => w.kind === k).slots.filter((s) => s.pm.map && s.pm.map.image && s.pm.map.image.complete).length;
              return { walls: W.list.map((w) => w.kind + ':' + w.slots.length).join(' '), mine: items('mine').length, minePics: pics('mine'), all: items('all'), best: items('best'),
                buttons: L.buttons.filter((b) => b.away).length }; }""")
            print("walls:", r)
            check(r["walls"] == "mine:12 all:12 best:6" and r["mine"] == min(12, page.evaluate("() => window.__fd.CAMERA.mine.length")) and r["minePics"] == r["mine"]
                  and r["all"] == ["Ava", "Max", "Zoe"] and r["best"] == ["#1  Zoe"] and r["buttons"] >= 30, f"walls {r}")
            # aim at Max's photo (second on the top row of Everyone's) and press E: a heart
            page.evaluate("""() => { const fd = window.__fd, s = fd.CAMERA.WALLS.list.find((w) => w.kind === 'all').slots[1], b = s.btn.pos;
              fd.dolly.position.set(b.x + 2.2, 0, b.z); fd.state.yaw = Math.PI / 2; const eye = new THREE.Vector3(); fd.camera.getWorldPosition(eye);
              fd.state.pitch = Math.atan2(b.y - eye.y, 2.2); }""")
            page.wait_for_timeout(500)
            page.evaluate("() => { const fd = window.__fd, s = fd.CAMERA.WALLS.list.find((w) => w.kind === 'all').slots[1], b = s.btn.pos, eye = new THREE.Vector3(); fd.camera.getWorldPosition(eye); fd.state.pitch = Math.atan2(b.y - eye.y, Math.hypot(b.x - eye.x, b.z - eye.z)); }")
            page.wait_for_timeout(400)
            page.keyboard.press("KeyE"); page.wait_for_timeout(500)
            r2 = page.evaluate("() => window.__fd.PHOTOS.list().map((p) => `${p.n}:${p.hearts}${p.hearted ? '*' : ''}`).join(' ')")
            page.wait_for_timeout(300)
            best = page.evaluate("() => window.__fd.CAMERA.WALLS.list.find((w) => w.kind === 'best').slots.filter((s) => s.item).map((s) => s.item.a)")
            print("after E on Max's:", r2, best)
            check(r2 == "Ava:0 Max:1* Zoe:2" and best == ["#1  Zoe", "#2  Max"], f"heart by E {r2} {best}")

        if want("prints"):
            go(8)
            r = page.evaluate("""() => { const fd = window.__fd, C = fd.CAMERA, s = C.WALLS.list.find((w) => w.kind === 'mine').slots[0];
              s.btn.ready = true; s.btn.onPress(); const h = C.P.held;
              return { held: !!h, lid: h && h.lid === s.item.p.id, kept: s.item.p.kept, hud: fd.LEVELS[8].hudActions !== undefined }; }""")
            page.wait_for_timeout(300)
            hud = page.evaluate("() => Array.from(document.querySelectorAll('button')).map((b) => b.textContent).filter((t) => /print/i.test(t))")
            page.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(0, 0, 6); fd.state.yaw = 0; fd.state.pitch = 0; }")
            page.wait_for_timeout(300)
            page.keyboard.press("KeyE"); page.wait_for_timeout(400)
            put = page.evaluate("""() => { const fd = window.__fd, C = fd.CAMERA, it = C.P.placed[C.P.placed.length - 1], eye = new THREE.Vector3(); fd.camera.getWorldPosition(eye);
              return { held: !!C.P.held, n: C.P.placed.length, d: +Math.hypot(it.pos.x - eye.x, it.pos.z - eye.z).toFixed(2), pic: !!it.mesh.userData.pm.map, btn: fd.LEVELS[8].buttons.includes(it.btn), lv: it.lv }; }""")
            # look down at it and press E: picked up again; E again: down again
            page.evaluate("() => { const fd = window.__fd, C = fd.CAMERA, it = C.P.placed[C.P.placed.length - 1], eye = new THREE.Vector3(); fd.camera.getWorldPosition(eye); fd.state.pitch = Math.atan2(it.pos.y - eye.y, Math.hypot(it.pos.x - eye.x, it.pos.z - eye.z)); }")
            page.wait_for_timeout(400)
            page.keyboard.press("KeyE"); page.wait_for_timeout(1000)
            up = page.evaluate("() => ({ held: !!window.__fd.CAMERA.P.held, n: window.__fd.CAMERA.P.placed.length })")
            page.keyboard.press("KeyE"); page.wait_for_timeout(400)
            n_after = page.evaluate("() => window.__fd.CAMERA.P.placed.length")
            print("prints:", r, hud, put, up, n_after)
            check(r["held"] and r["lid"] and r["kept"] and "Put print down" in hud and "Bin print" in hud, f"print from wall {r} {hud}")
            check(not put["held"] and put["n"] >= 1 and 0.6 < put["d"] < 0.9 and put["pic"] and put["btn"] and put["lv"] == 8, f"print put down {put}")
            check(up["held"] and up["n"] == put["n"] - 1 and n_after == put["n"], f"print picked up and down {up} {n_after}")
            # a reload: it's still there
            page.reload()
            page.wait_for_function("() => window.__fd && window.__fd.CAMERA.C.loaded", timeout=25000)
            page.locator("#btn-flat").click()
            go(8)
            back = page.evaluate("() => { const C = window.__fd.CAMERA; return C.P.placed.map((it) => ({ lv: it.lv, pic: !!it.src, vis: it.mesh.visible })); }")
            print("prints after reload:", back)
            check(len(back) == n_after and all(b["lv"] == 8 and b["pic"] and b["vis"] for b in back), f"prints after reload {back}")
            binned = page.evaluate("() => { const C = window.__fd.CAMERA, s = C.WALLS.list.find((w) => w.kind === 'mine').slots[1]; s.btn.ready = true; s.btn.onPress(); const h = !!C.P.held; C.binHeld(); return [h, !!C.P.held]; }")
            check(binned == [True, False], f"bin print {binned}")

        if want("vr"):
            go(8)
            r = page.evaluate("""() => { const fd = window.__fd, C = fd.CAMERA, P = C.P, head = fd.myHead.pos.clone();
              fd.state.mode = 'vr'; if (C.P.held) C.binHeld();
              const R = fd.myHands.right, Lh = fd.myHands.left, srcR = fd.vrHands.right.source, srcL = fd.vrHands.left.source;
              const trig = { pressed: false }, gripL = { pressed: false };
              fd.vrHands.right.source = { gamepad: { buttons: [trig, { pressed: false }, {}, {}, {}, {}] } };
              fd.vrHands.left.source = { gamepad: { buttons: [{ pressed: false }, gripL, {}, {}, {}, {}] } };
              R.ok = Lh.ok = true; R.pos.set(head.x + 0.15, head.y - 0.25, head.z - 0.4); R.quat.set(0, 0, 0, 1); Lh.pos.set(head.x - 0.3, head.y - 0.5, head.z - 0.2); Lh.quat.set(0, 0, 0, 1);
              if (!C.isOn()) C.toggle('right');
              let now = performance.now() + 5000; C.tick(1 / 72, now); now += 14; C.tick(1 / 72, now);
              trig.pressed = true; now += 14; C.tick(1 / 72, now); trig.pressed = false;
              for (let i = 0; i < 40; i++) { now += 14; C.tick(1 / 72, now); }
              const sliding = C.print.visible, pw = C.print.getWorldPosition(new THREE.Vector3());
              const placed0 = P.placed.length;
              // the left hand to the print, squeeze
              Lh.pos.copy(pw); gripL.pressed = true; now += 14; C.tick(1 / 72, now);
              const held = !!P.held && P.held.side === 'left', gone = !C.print.visible;
              // carried somewhere, and let go
              Lh.pos.set(head.x - 0.4, head.y - 0.3, head.z - 0.5); now += 14; C.tick(1 / 72, now);
              const inHand = P.held && P.held.mesh.position.distanceTo(Lh.pos) < 0.12;
              gripL.pressed = false; now += 14; C.tick(1 / 72, now);
              const it = P.placed[P.placed.length - 1], left = !P.held && P.placed.length === placed0 + 1 && it.pos.distanceTo(Lh.pos) < 0.12;
              // the hand still on it: touching doesn't pick it straight back up
              const press1 = it.btn.onPress(), still = !P.held;
              // the hand comes away, then touches it: picked up into that hand
              Lh.pos.y += 0.6; now += 14; C.tick(1 / 72, now); const readyAgain = it.btn.ready;
              it.btn.onPress(); const again = !!P.held && P.held.side === 'left';
              if (P.held) { gripL.pressed = true; now += 14; C.tick(1 / 72, now); gripL.pressed = false; now += 14; C.tick(1 / 72, now); }
              C.toggle(); fd.state.mode = 'flat'; fd.vrHands.right.source = srcR; fd.vrHands.left.source = srcL;
              return { sliding, held, gone, inHand, left, still, readyAgain, again, placedEnd: P.placed.length - placed0 }; }""")
            print("VR prints:", r)
            check(all(r[k] for k in ("sliding", "held", "gone", "inHand", "left", "still", "readyAgain", "again")) and r["placedEnd"] == 1, f"VR prints {r}")

        if want("album"):
            go(8)
            page.evaluate("() => window.__fd.CAMERA.openAlbum('mine')")
            page.wait_for_timeout(400)
            n_cards = page.evaluate("() => document.querySelectorAll('div[style*=\"z-index: 40\"] img').length")
            mine_n = page.evaluate("() => window.__fd.CAMERA.mine.length")
            # pick two (tap their pictures), save them in the browser
            page.evaluate("() => { for (const k of [0, 1]) document.querySelectorAll('div[style*=\"z-index: 40\"] img')[k].click(); }")
            page.wait_for_timeout(300)
            bar = page.evaluate("() => Array.from(document.querySelectorAll('div[style*=\"z-index: 40\"] button')).map((b) => b.textContent).filter((t) => /picked|Save 2|Download 2/.test(t))")
            page.evaluate("() => { const b = Array.from(document.querySelectorAll('div[style*=\"z-index: 40\"] button')).find((x) => x.textContent.startsWith('★ Save 2')); b.click(); }")
            page.wait_for_timeout(300)
            newest_two_kept = page.evaluate("() => { const m = window.__fd.CAMERA.mine; return m.slice(-2).every((p) => p.kept); }")
            with page.expect_download(timeout=10000) as dl:
                page.evaluate("() => { const b = Array.from(document.querySelectorAll('div[style*=\"z-index: 40\"] button')).find((x) => x.textContent === 'Download'); b.click(); }")
            name = dl.value.suggested_filename
            tabs = []
            for t in ("all", "best"):
                page.evaluate(f"() => window.__fd.CAMERA.openAlbum('{t}')")
                page.wait_for_timeout(300)
                tabs.append(page.evaluate("() => document.querySelectorAll('div[style*=\"z-index: 40\"] img').length"))
            page.evaluate("() => window.__fd.CAMERA.closeAlbum()")
            print("album:", n_cards, mine_n, bar, newest_two_kept, name, tabs)
            check(n_cards == mine_n and len(bar) >= 2 and newest_two_kept and name.startswith("field-day-") and name.endswith(".jpg"), f"album {n_cards} {mine_n} {bar} {newest_two_kept} {name}")
            check(tabs == [len(page.evaluate("() => window.__fd.PHOTOS.list()")), len(page.evaluate("() => window.__fd.PHOTOS.best(12)"))], f"album tabs {tabs}")

        check(not errors, f"page errors {errors}")
        ctx.close()

        if want("php"):
            if not shutil.which("php"):
                print("php: no php here, skipped")
            else:
                d = Path(tempfile.mkdtemp())
                shutil.copy(ROOT / "index.html", d / "index.html")
                shutil.copy(ROOT / "server" / "photos.php", d / "photos.php")
                port = free_port()
                srv = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", str(d)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(0.8)
                try:
                    errs = []
                    cA = browser.new_context(viewport={"width": 800, "height": 500}); setup(cA)
                    cB = browser.new_context(viewport={"width": 800, "height": 500}); setup(cB)
                    A = open_page(cA, f"http://127.0.0.1:{port}/index.html?test", errs, "A: ")
                    B = open_page(cB, f"http://127.0.0.1:{port}/index.html?test", errs, "B: ")
                    A.wait_for_function("() => window.__fd.PHOTOS.mode === 'php'", timeout=10000)
                    B.wait_for_function("() => window.__fd.PHOTOS.mode === 'php'", timeout=10000)
                    A.evaluate("() => { window.__fd.state.name = 'Alice'; window.__fd.switchLevel(8); }")
                    A.wait_for_timeout(1200)
                    A.evaluate(SNAP, 1)
                    A.wait_for_function("() => window.__fd.CAMERA.mine.some((p) => p.gid)", timeout=10000)
                    B.evaluate("() => window.__fd.PHOTOS.pull()")
                    B.wait_for_function("() => window.__fd.PHOTOS.list().length === 1", timeout=10000)
                    seen = B.evaluate("""async () => { const P = window.__fd.PHOTOS, p = P.list()[0], u = await P.img(p.id), r = await fetch(u);
                      return { n: p.n, mine: p.mine, type: r.headers.get('content-type'), size: (await r.blob()).size }; }""")
                    B.evaluate("() => window.__fd.PHOTOS.heart(window.__fd.PHOTOS.list()[0].id)")
                    B.wait_for_timeout(600)
                    A.evaluate("() => window.__fd.PHOTOS.pull()")
                    A.wait_for_timeout(600)
                    a_view = A.evaluate("() => window.__fd.PHOTOS.list().map((p) => ({ mine: p.mine, hearts: p.hearts, hearted: p.hearted }))")
                    B.evaluate("() => window.__fd.PHOTOS.pull()")
                    B.wait_for_timeout(500)
                    b_view = B.evaluate("() => window.__fd.PHOTOS.list().map((p) => ({ mine: p.mine, hearts: p.hearts, hearted: p.hearted }))")
                    # each device keeps its newest 24; a picture that isn't a jpeg is turned away
                    cap = A.evaluate("""async () => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 64, 48);
                      const img = c.toDataURL('image/jpeg', 0.8), dev = window.__fd.state && JSON.parse(localStorage.getItem('fieldDayPrefs') || localStorage.getItem('fd_prefs') || '{}').deviceId;
                      const P = window.__fd.PHOTOS; const devId = P.S.dev;
                      for (let i = 0; i < 26; i++) await fetch('photos.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'add', dev: devId, n: 'Alice', img }) });
                      const bad = await fetch('photos.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'add', dev: devId, n: 'Alice', img: c.toDataURL('image/png') }) });
                      await P.pull(); return { mine: P.list().filter((p) => p.mine).length, bad: bad.status, hearted: P.list().some((p) => p.hearts > 0) }; }""")
                    # A takes theirs down: gone for B too
                    A.evaluate("() => { const P = window.__fd.PHOTOS; for (const p of P.list()) if (p.mine) P.unshare(p.id); }")
                    A.wait_for_timeout(1500)
                    B.evaluate("() => window.__fd.PHOTOS.pull()")
                    B.wait_for_timeout(600)
                    after = B.evaluate("() => window.__fd.PHOTOS.list().length")
                    print("php:", seen, a_view, b_view, cap, after)
                    check(seen["n"] == "Alice" and not seen["mine"] and seen["type"] == "image/jpeg" and seen["size"] > 5000, f"php shared photo {seen}")
                    check(a_view == [{"mine": True, "hearts": 1, "hearted": False}] and b_view == [{"mine": False, "hearts": 1, "hearted": True}], f"php hearts {a_view} {b_view}")
                    check(cap["mine"] == 24 and cap["bad"] == 400 and cap["hearted"], f"php limits {cap}")
                    check(after == 0, f"php take down {after}")
                    check(not errs, f"php page errors {errs}")
                    cA.close(); cB.close()
                finally:
                    srv.terminate()
                    shutil.rmtree(d, ignore_errors=True)
        browser.close()
    print("\n".join(fails) if fails else "\nv94 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
