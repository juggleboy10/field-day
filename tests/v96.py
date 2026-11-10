"""v96: deleting photos from the clubhouse walls (and binning a print from the VR watch).

Sections:
  walls   a bin on each of my photos: the first press asks (the bin turns red), a second within 3 seconds deletes; it
          stops asking after 3 seconds; on everyone's wall the bin only shows on mine (or on all of them for the
          owner of the Claude page); in VR the hand has to come away between the two touches
  watch   holding a print, the watch has a Bin print button, and it bins the print
  owner   two players on the Claude page (its database stood in for): the owner takes down someone else's photo,
          it's gone for both, and it stays gone when that player shares another

Usage: python tests/v96.py [section ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402
from v94_mp import FAKE_DB  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
ONLY = set(sys.argv[1:])
want = lambda s: not ONLY or s in ONLY


def route(ctx):
    if THREE_JS:
        ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
    for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
        ctx.route(pat, lambda r: r.abort())


def main():
    fails = []
    check = lambda ok, msg: (None if ok else fails.append(msg))
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        if want("walls") or want("watch"):
            ctx = browser.new_context(viewport={"width": 900, "height": 560}); route(ctx)
            errors = []
            page = ctx.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto((ROOT / "index.html").as_uri() + "?test")
            page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled && window.__fd.CAMERA.C.loaded", timeout=25000)
            page.locator("#btn-flat").click()
            page.evaluate("() => window.__fd.switchLevel(8)")
            page.wait_for_timeout(1500)
            page.evaluate("""() => { const C = window.__fd.CAMERA; for (const p of C.mine.slice()) C.removeMine(p);
              C.toggle(); let t = performance.now() + 5000; for (let i = 0; i < 3; i++) { C.snap(t); t += 1000; } C.toggle(); }""")
            page.wait_for_timeout(500)

            if want("walls"):
                r = page.evaluate("""async () => { const fd = window.__fd, C = fd.CAMERA, W = (k) => C.WALLS.list.find((w) => w.kind === k);
                  const s = W('mine').slots[0], id0 = s.item.p.id, n0 = C.mine.length;
                  const shown = s.bin.visible && !s.del.off;
                  s.del.onPress(); const armed = s.binMat.color.getHex() === 0xff2d3d, stillThere = C.mine.length === n0;
                  s.del.onPress(); await new Promise((r) => setTimeout(r, 300));
                  const gone = C.mine.length === n0 - 1 && !C.mine.some((p) => p.id === id0), redAfter = s.binMat.color.getHex() === 0xff2d3d;
                  // one press, then wait past 3 seconds: it's stopped asking, so the next press asks again
                  const s2 = W('mine').slots[0], n1 = C.mine.length; s2.del.onPress(); await new Promise((r) => setTimeout(r, 3300));
                  const calmed = s2.binMat.color.getHex() !== 0xff2d3d; s2.del.onPress(); const askedAgain = C.mine.length === n1 && s2.binMat.color.getHex() === 0xff2d3d;
                  // everyone's wall: my own photo has a bin, someone else's doesn't (unless I run the page)
                  const src = C.mine[0].src;
                  fd.PHOTOS._add({ id: 'gmine', by: fd.PHOTOS.S.me, n: 'Me', t: Date.now(), src }); fd.PHOTOS._add({ id: 'gother', n: 'Ava', t: Date.now() - 1000, src });
                  await new Promise((r) => setTimeout(r, 300));
                  const all = W('all'), mineSlot = all.slots.find((x) => x.item && x.item.gid === 'gmine'), otherSlot = all.slots.find((x) => x.item && x.item.gid === 'gother');
                  const binMine = mineSlot.bin.visible, binOther = otherSlot.bin.visible;
                  fd.PHOTOS.S.admin = true; await new Promise((r) => setTimeout(r, 300)); const binOtherAdmin = otherSlot.bin.visible;
                  fd.PHOTOS.S.admin = false; await new Promise((r) => setTimeout(r, 300));
                  // taking mine off everyone's wall (two presses)
                  mineSlot.del.onPress(); mineSlot.del.onPress(); await new Promise((r) => setTimeout(r, 300));
                  const offWall = !fd.PHOTOS.has('gmine');
                  return { shown, armed, stillThere, gone, redAfter, calmed, askedAgain, binMine, binOther, binOtherAdmin, offWall }; }""")
                print("walls:", r)
                for k in ("shown", "armed", "stillThere", "gone", "calmed", "askedAgain", "binMine", "binOtherAdmin", "offWall"):
                    check(r[k], f"walls: {k} {r}")
                check(not r["redAfter"] and not r["binOther"], f"walls: bin colour / other's bin {r}")
                # VR: two touches need the hand to come away in between
                vr = page.evaluate("""async () => { const fd = window.__fd, C = fd.CAMERA, s = C.WALLS.list.find((w) => w.kind === 'mine').slots[0];
                  await new Promise((r) => setTimeout(r, 3300)); const n0 = C.mine.length;
                  fd.state.mode = 'vr'; const R = fd.myHands.right, L = fd.myHands.left; R.ok = L.ok = true; L.pos.set(0, -5, 0);
                  R.pos.copy(s.del.pos); s.del.ready = true;
                  s.del.onPress(); s.del.onPress(); const heldStill = C.mine.length === n0;
                  R.pos.y += 0.5; C.tick(1 / 72, performance.now()); R.pos.copy(s.del.pos); s.del.onPress();
                  await new Promise((r) => setTimeout(r, 300)); const deleted = C.mine.length === n0 - 1;
                  fd.state.mode = 'flat'; return { heldStill, deleted }; }""")
                print("VR bin:", vr)
                check(vr == {"heldStill": True, "deleted": True}, f"VR bin {vr}")

            if want("watch"):
                w = page.evaluate("""() => { const fd = window.__fd, C = fd.CAMERA;
                  const before = fd.watch.btns().map((b) => b.id);
                  C.takePrint({ lid: '', gid: '', src: C.mine[0].src }, 'right'); const holding = fd.watch.btns().map((b) => b.id);
                  fd.watch.press('bin'); const after = { held: !!C.P.held, ids: fd.watch.btns().map((b) => b.id) };
                  return { before, holding, after }; }""")
                print("watch:", w)
                check("bin" not in w["before"] and w["holding"] == w["before"] + ["bin"] and w["after"] == {"held": False, "ids": w["before"]}, f"watch bin {w}")
                ver = page.evaluate("() => document.getElementById('version-note').textContent")
                check(ver.startswith("Field Day version 9"), f"version {ver}")
            check(not errors, f"page errors {errors}")
            ctx.close()

        if want("owner"):
            port = free_port()
            server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(0.8)
            try:
                ctx = browser.new_context(viewport={"width": 900, "height": 600})
                ctx.add_init_script(FAKE_ROOM)
                # (Bob runs the page: his "user" says he's its owner)
                ctx.add_init_script(FAKE_DB.replace("const user = {", "const user = { isOwner: () => id === 'pB', "))
                route(ctx)
                errors = []
                pages = {}
                for who in ("pA", "pB"):
                    pg = ctx.new_page()
                    pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
                    pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}")
                    pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled && window.__fd.CAMERA.C.loaded", timeout=20000)
                    pages[who] = pg
                A, B = pages["pA"], pages["pB"]
                for pg in (A, B):
                    pg.locator("#btn-flat").click()
                    pg.wait_for_function("() => window.__fd.PHOTOS.mode === 'db'", timeout=10000)
                    pg.evaluate("() => window.__fd.switchLevel(8)")
                time.sleep(2.5)
                admins = [pg.evaluate("() => window.__fd.PHOTOS.admin") for pg in (A, B)]
                A.evaluate("() => { const C = window.__fd.CAMERA; C.mine.length = 0; C.toggle(); C.snap(performance.now() + 5000); C.toggle(); }")
                A.wait_for_function("() => window.__fd.CAMERA.mine.some((p) => p.gid)", timeout=10000)
                gid = A.evaluate("() => window.__fd.CAMERA.mine[0].gid")
                B.wait_for_function(f"() => window.__fd.PHOTOS.has('{gid}')", timeout=10000)
                B.wait_for_timeout(800)
                bin_b = B.evaluate(f"() => window.__fd.CAMERA.WALLS.list.find((w) => w.kind === 'all').slots.find((s) => s.item && s.item.gid === '{gid}').bin.visible")
                B.evaluate(f"() => window.__fd.PHOTOS.takeDown('{gid}')")
                A.wait_for_function(f"() => !window.__fd.PHOTOS.has('{gid}')", timeout=10000)
                # Alice shares another: the one taken down doesn't come back
                A.evaluate("() => { const C = window.__fd.CAMERA; C.toggle(); C.snap(performance.now() + 9000); C.toggle(); }")
                A.wait_for_function("() => window.__fd.CAMERA.mine.filter((p) => p.gid).length === 2", timeout=10000)
                B.wait_for_timeout(2000)
                b_list = B.evaluate("() => window.__fd.PHOTOS.list().map((p) => p.id)")
                print("owner:", admins, bin_b, b_list, gid)
                check(admins == [False, True] and bin_b, f"owner sees bins {admins} {bin_b}")
                check(len(b_list) == 1 and gid not in b_list, f"taken down stays down {b_list}")
                check(not errors, f"owner page errors {errors}")
                ctx.close()
            finally:
                server.terminate()
        browser.close()
    print("\n".join(fails) if fails else "\nv96 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
