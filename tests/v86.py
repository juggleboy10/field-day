"""v86: Speed of Light needs a real press, volleyball soft blocks, cornhole slide and throw gain,
archery points by distance, more kart ramps.

Usage: python tests/v86.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")


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

        # ---- Speed of Light: a push in counts, a swipe across doesn't
        go(47)
        ls = page.evaluate("""() => { const I = window.__fd.LEVELS[47].lightInternals, V = window.THREE.Vector3, p = I.panels[0].btns[7].p;
          const at = (dx, dz) => new V(p.x + dx, p.y, p.z + dz);
          return { push: I.pushed(at(0, 0.12), at(0.01, 0.02), p),          // straight in
                   swipe: I.pushed(at(-0.2, 0.03), at(0.0, 0.03), p),       // sideways, already close
                   slideIn: I.pushed(at(-0.2, 0.12), at(0, 0.02), p),       // came in from beside the button
                   shallow: I.pushed(at(0, 0.15), at(0, 0.07), p) }; }""")
        print("lightspeed:", ls)
        check(ls == {"push": True, "swipe": False, "slideIn": False, "shallow": False}, f"lightspeed press {ls}")

        # ---- volleyball: a soft block pops up on my side and gives my team three touches
        go(37)
        vb = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[37], I = L.vbInternals, V = I.V; I.startMatch(); V.ph = 'idle'; fd.dolly.position.set(-0.7, 0, 0); return 1; }""")
        page.wait_for_timeout(600)
        page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[37], I = L.vbInternals, V = I.V; L.blockRoll = 0.99; V.ph = 'rally'; V.lastTeam = 1; V.touches = 3; V.lastKind = 3; I.ME.cool = 0;
          const h = fd.myHead.pos; V.p.set(h.x + 0.3, h.y + 0.35, h.z); V.v.set(-3, 0.5, 0); }""")
        try:
            page.wait_for_function("() => window.__fd.LEVELS[37].vbInternals.V.lastKind >= 5", timeout=5000)
        except Exception:
            pass
        vb = page.evaluate("() => { const L = window.__fd.LEVELS[37], V = L.vbInternals.V; L.blockRoll = null; return { kind: V.lastKind, team: V.lastTeam, touches: V.touches, vx: V.v.x, vy: V.v.y }; }")
        print("volleyball soft block:", vb)
        check(vb["kind"] == 6 and vb["team"] == 0 and vb["touches"] == 0 and vb["vy"] > 0, f"volleyball soft block {vb}")

        # ---- archery: farther targets are worth more
        go(57)
        ar = page.evaluate("() => window.__fd.LEVELS[57].archInternals.TG.map((t) => [Math.round(t.dist), t.mult])")
        print("archery multipliers:", ar)
        check(sorted(ar) == [[10, 1], [20, 2], [25, 4], [30, 3], [50, 5]], f"archery multipliers {ar}")

        # ---- karts: four ramps, two of them off to the side
        go(9)
        kr = page.evaluate("() => window.__fd.LEVELS[9].extras.RAMPS.map((r) => r.off)")
        print("kart ramps:", kr)
        check(len(kr) == 4 and sum(1 for o in kr if o != 0) == 2, f"kart ramps {kr}")

        # ---- cornhole: a stronger VR toss
        go(20)
        cg = page.evaluate("() => window.__fd.LEVELS[20].throwGain")
        check(cg and cg > 1.12, f"cornhole throw gain {cg}")

        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv86 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
