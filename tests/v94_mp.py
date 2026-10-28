"""v94 with two players on the Claude page (its database stood in for by a small fake shared between the two pages):

- Alice takes a photo: it's on Bob's "Everyone's photos" wall, with her name.
- Bob gives it a heart: Alice sees the heart, and it goes up on "Best of all time" for both.
- Alice takes a print of it off her wall and stands it up: Bob sees the print where she left it, with the picture on it.
- Alice takes it off everyone's wall: gone from Bob's wall, and her print there goes blank-less (hidden) for Bob.

Usage: python tests/v94_mp.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

# a tiny stand-in for the page database: each page keeps the documents in memory, and every change is sent to the
# other page over a BroadcastChannel (with the document itself), so its listeners hear it. (Both pages start together.)
FAKE_DB = """
(() => {
  const id = new URLSearchParams(location.search).get('peer') || 'px';
  const ch = new BroadcastChannel('fake-db'), subs = [], mem = new Map();
  const snapDoc = (path) => { const d = mem.get(path); return { id: path.split('/').pop(), exists: d !== undefined, data: () => (d === undefined ? undefined : JSON.parse(d)) }; };
  const listCol = (col) => {
    const n = col.split('/').length + 1, docs = [];
    for (const p of mem.keys()) if (p.split('/').length === n && p.startsWith(col + '/')) docs.push(snapDoc(p));
    docs.sort((a, b) => (a.id < b.id ? -1 : 1)); return { docs };
  };
  const fire = () => { for (const f of subs) { try { f(); } catch (e) { console.error('sub', e && e.stack); } } };
  ch.onmessage = (e) => { const m = e.data; if (m.v === null) mem.delete(m.path); else mem.set(m.path, m.v); fire(); };
  const write = (path, v) => { if (v === null) mem.delete(path); else mem.set(path, v); ch.postMessage({ path, v }); setTimeout(fire, 0); };
  const doc = (path) => ({ get: async () => snapDoc(path), set: async (d) => write(path, JSON.stringify(d)), delete: async () => write(path, null), collection: (c) => col(path + '/' + c) });
  const col = (path) => ({ doc: (d) => doc(path + '/' + d), onSnapshot: (next) => { const f = () => next(listCol(path)); subs.push(f); setTimeout(f, 0); return () => {}; } });
  const db = { doc, collection: col };
  const base = window.claude.use;
  const user = { me: async () => ({ name: id === 'pA' ? 'Alice' : 'Bob' }), id: async () => 'u' + id };
  window.claude = { use: async (name) => (name === 'db' ? db : name === 'user' ? user : name === 'downloads' ? null : base(name)) };
})();
"""


def main():
    port = free_port()
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    fails = []
    check = lambda ok, msg: (None if ok else fails.append(msg))
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
            ctx = browser.new_context(viewport={"width": 900, "height": 600})
            ctx.add_init_script(FAKE_ROOM)
            ctx.add_init_script(FAKE_DB)
            if THREE_JS:
                ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
            for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
                ctx.route(pat, lambda r: r.abort())
            errors = []
            pages = {}
            for who in ("pA", "pB"):
                pg = ctx.new_page()
                pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}")); pg.on("console", lambda m, who=who: print(who, m.text) if m.text.startswith("sub") else None)
                pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}")
                pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled && window.__fd.CAMERA.C.loaded", timeout=20000)
                pages[who] = pg
            A, B = pages["pA"], pages["pB"]
            for pg in (A, B):
                pg.locator("#btn-flat").click()
                pg.wait_for_function("() => window.__fd.PHOTOS.mode === 'db'", timeout=10000)
                pg.evaluate("() => window.__fd.switchLevel(8)")
            time.sleep(2.5)
            # (the two pages share this browser's photo store too: start them both with none of their own)
            for pg in (A, B):
                pg.evaluate("() => { const C = window.__fd.CAMERA; for (const p of C.mine.slice()) C.mine.splice(C.mine.indexOf(p), 1); }")

            # ---- Alice takes a photo
            A.evaluate("() => { const C = window.__fd.CAMERA; C.toggle(); C.snap(performance.now() + 5000); C.toggle(); }")
            A.wait_for_function("() => window.__fd.CAMERA.mine.some((p) => p.gid)", timeout=10000)
            gid = A.evaluate("() => window.__fd.CAMERA.mine[0].gid")
            B.wait_for_timeout(1500)
            B.wait_for_function(f"() => window.__fd.PHOTOS.has('{gid}')", timeout=10000)
            b_wall = B.evaluate("""() => { const W = window.__fd.CAMERA.WALLS.list.find((w) => w.kind === 'all'), s = W.slots[0];
              return { who: s.item && s.item.a, pic: !!(s.pm.map && s.pm.map.image && (s.pm.map.image.src || '').startsWith('data:image/jpeg')) }; }""")
            print("Bob's wall:", b_wall)
            check(b_wall == {"who": "Alice", "pic": True}, f"Bob sees Alice's photo {b_wall}")

            # ---- Bob gives it a heart
            B.evaluate(f"() => window.__fd.PHOTOS.heart('{gid}', true)")
            A.wait_for_function(f"() => window.__fd.PHOTOS.count('{gid}') === 1", timeout=10000)
            A.wait_for_timeout(800)
            best = [pg.evaluate("() => window.__fd.CAMERA.WALLS.list.find((w) => w.kind === 'best').slots.filter((s) => s.item).map((s) => s.item.a + ' ' + s.item.b)") for pg in (A, B)]
            print("best of all time:", best)
            check(best[0] == ["#1  Alice ♡ 1"] and best[1] == ["#1  Alice ♥ 1"], f"best wall {best}")

            # ---- Alice's print, stood up in the clubhouse
            A.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(0, 0, 6); fd.state.yaw = 0; fd.state.pitch = 0; const s = fd.CAMERA.WALLS.list.find((w) => w.kind === 'mine').slots[0]; s.btn.ready = true; s.btn.onPress(); }")
            A.wait_for_timeout(300)
            A.keyboard.press("KeyE")
            A.wait_for_timeout(300)
            a_print = A.evaluate("() => { const it = window.__fd.CAMERA.P.placed.slice(-1)[0]; return { gid: it.gid, x: it.pos.x, y: it.pos.y, z: it.pos.z, pres: JSON.stringify(window.__fd.CAMERA.pres()).length }; }")
            B.wait_for_timeout(2500)
            b_print = B.evaluate("""() => { const o = window.__fd.CAMERA.theirs.get('pA'); if (!o) return null; const m = o.placed.find((x) => x.visible);
              return m ? { x: m.position.x, y: m.position.y, z: m.position.z, pic: !!(m.userData.pm.map && m.userData.pm.map.image) } : 'none'; }""")
            print("Alice's print:", a_print, "as Bob sees it:", b_print)
            check(a_print["gid"] == gid and isinstance(b_print, dict) and abs(b_print["x"] - a_print["x"]) < 0.01 and abs(b_print["z"] - a_print["z"]) < 0.01 and b_print["pic"], f"Bob sees Alice's print {a_print} {b_print}")

            # ---- Alice takes it off everyone's wall
            A.evaluate("() => { const C = window.__fd.CAMERA; C.unshareOne(C.mine[0]); }")
            B.wait_for_function(f"() => !window.__fd.PHOTOS.has('{gid}')", timeout=10000)
            B.wait_for_timeout(1500)
            gone = B.evaluate("""() => { const W = window.__fd.CAMERA.WALLS.list.find((w) => w.kind === 'all'), o = window.__fd.CAMERA.theirs.get('pA');
              return { wall: W.slots.filter((s) => s.item).length, prints: o ? o.placed.filter((m) => m.visible).length : 0 }; }""")
            print("after taking it down:", gone)
            check(gone == {"wall": 0, "prints": 0}, f"taken down {gone}")
            check(not errors, f"page errors {errors}")
            browser.close()
    finally:
        server.terminate()
    print("\n".join(fails) if fails else "\nv94 two-player checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
