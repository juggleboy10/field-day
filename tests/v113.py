"""v113: hot potato: your throw leaves your hand at once on your own screen, even when you're not the referee.

Two players, 120 ms of delay each way and 30 ms of jitter. A referees; it hands the potato to B, and B throws it to A:
  - on B's screen the potato is in the air straight away (it used to wait for the referee's answer: a quarter of a
    second or more), and it never jumps back to B's hand
  - when the referee's own flight arrives, B's screen carries on (no hitch), and both agree that A has it after
  - a throw the referee refuses (the potato isn't B's any more) puts it right on B's screen within a moment

    THREE_JS=/path/to/three.min.js python3 tests/v113.py
"""
import os, sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import FAKE_ROOM, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
LV = 18
I = f"window.__fd.LEVELS[{LV}].potatoInternals"
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

port = free_port()
server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 640, "height": 400})
        ctx.add_init_script(FAKE_ROOM)
        if THREE_JS: ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): ctx.route(pat, lambda r: r.abort())
        errors = []
        def join(who):
            pg = ctx.new_page()
            pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
            pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}&lag=120&jitter=30")
            pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=30000)
            pg.evaluate(f"() => window.__fd.switchLevel({LV})"); pg.locator("#btn-flat").click()
            pg.evaluate(f"() => {{ const F = {I}.FUSE; F[0] = 60000; F[1] = 60000; }}")     # (a long fuse: no pops mid-test)
            return pg
        A = join("pA"); A.wait_for_timeout(1200)
        B = join("pB")
        A.wait_for_timeout(2500)
        # a fresh round with both of us in it (B arrived after the first one began)
        A.evaluate(f"() => {{ const I = {I}; I.RS.ph = 'idle'; I.hostStep(performance.now()); }}")
        A.wait_for_function(f"() => {I}.RS.ph === 'play' && {I}.RS.order.includes('pB')", timeout=20000)
        B.wait_for_function(f"() => {I}.RS.order.includes('pB')", timeout=8000)
        def give(to):
            A.evaluate(f"() => {{ const I = {I}, now = performance.now(); I.RS.fl = null; I.RS.holder = '{to}'; I.H.catchT = now - 1000; I.H.botHoldUntil = now + 60000; I.RS.fseq += 1; forcePresence(); }}")
        give("pB")
        B.wait_for_function(f"() => {I}.RS.holder === 'pB' && !{I}.RS.fl", timeout=5000)
        B.wait_for_timeout(400)
        # B throws to A, and watches the potato every frame for half a second
        r = B.evaluate(f"""() => new Promise((res) => {{ const I = {I}, h = I.handPos('pB', new THREE.Vector3()), out = [];
          I.me.catchT = 0; I.me.pendingUntil = 0;
          const ok = I.throwAt('pA'), t0 = performance.now();
          const tick = () => {{ const p = I.potato.position; out.push([performance.now() - t0, !!I.RS.fl, Math.hypot(p.x - h.x, p.y - h.y, p.z - h.z)]); if (performance.now() - t0 < 600) requestAnimationFrame(tick); else res({{ ok, out }}); }};
          requestAnimationFrame(tick); }})""")
        first = r["out"][0]
        check("B can throw it", r["ok"], str(r["ok"]))
        check(f"on B's screen it's in the air at once (first frame, {first[0]:.0f} ms after)", first[1], str(r["out"][:3]))
        backs = [(a, b) for a, b in zip(r["out"], r["out"][1:]) if b[2] < a[2] - 0.15]
        check("it never jumps back toward B's hand", not backs, str(backs[:3]))
        B.wait_for_timeout(2500)
        a_h, b_h = A.evaluate(f"() => {I}.RS.holder"), B.evaluate(f"() => {I}.RS.holder")
        check(f"both agree A has it after ({a_h} / {b_h})", a_h == "pA" and b_h == "pA", f"{a_h} / {b_h}")
        # a throw the referee refuses: B thinks it has the potato, but it's A's
        give("pA")
        B.wait_for_function(f"() => {I}.RS.holder === 'pA'", timeout=5000)
        B.evaluate(f"() => {{ const I = {I}; I.RS.holder = 'pB'; I.RS.fl = null; I.me.catchT = 0; I.me.pendingUntil = 0; I.throwAt('pA'); }}")
        B.wait_for_timeout(1500)
        b_h, fl = B.evaluate(f"() => [{I}.RS.holder, !!{I}.RS.fl]")
        check(f"a refused throw is put right on B's screen (A holds it: {b_h})", b_h == "pA" and not fl, f"{b_h}, flying {fl}")
        check("no errors", not errors, str(errors[:3]))
        browser.close()
finally:
    server.terminate()
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
