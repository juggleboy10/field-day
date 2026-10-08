"""Pirate Cove: the new quest builds, its crew spawn and fight, and the gunners and the Captain fire shot.

- every wave of every area spawns with no errors, and every new enemy type turns up
- standing among them, gunners fire lead shot at you, parrots fly, and you take damage
- Captain Saltbeard spawns with boss health

Usage: python tests/piratecove.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
D = os.environ.get("SHOTS")       # a folder to save screenshots into, if set


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1100, "height": 650})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(22)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(1000)
        info = page.evaluate("() => { const L = window.__fd.LEVELS[22]; return { rooms: L.ROOMS.map((r) => r.name), waves: L.ROOMS.map((r) => r.waves.length) }; }")
        print("areas:", info)
        if D:
            page.evaluate("() => { const fd = window.__fd; fd.state.yaw = 0; fd.state.pitch = -0.05; }")
            page.wait_for_timeout(800); page.screenshot(path=f"{D}/pirate-start.png")

        # every wave, one area at a time: they spawn, then we clear them away
        seen = set()
        for r, n in enumerate(info["waves"]):
            for w in range(n):
                types = page.evaluate(f"""() => {{ const L = window.__fd.LEVELS[22]; L.spawnWave({r}, {w});
                  const t = Array.from(L.enemies.values()).map((e) => ENEMIES_NAMES[e.type]); for (const e of Array.from(L.enemies.values())) L.removeEnemy(e); return t; }}""".replace("ENEMIES_NAMES[e.type]", "e.type"))
                seen.update(types)
        names = page.evaluate("(codes) => codes.map((c) => window.__fd.LEVELS[22].enemyName ? window.__fd.LEVELS[22].enemyName(c) : c)", sorted(seen))
        print("enemy types spawned (codes):", sorted(seen))
        checks = [("every wave spawns", len(seen) >= 6)]

        # stand in the shipwreck clearing with its second wave: they fight
        page.evaluate("""() => { const fd = window.__fd, L = L0 = fd.LEVELS[22], r = L.ROOMS[2];
          Object.assign(L.q, { pg: 2, spawned: 1, wave: 1 }); fd.dolly.position.set(r.cx, 0, r.cz + 5); fd.state.yaw = 0; fd.state.pitch = -0.05; L.me.hp = 99; L.spawnWave(2, 1); window.__shots = 0; window.__flyMax = 0; }""".replace("L = L0 =", "L ="))
        for _ in range(40):
            page.wait_for_timeout(500)
            page.evaluate("""() => { const L = window.__fd.LEVELS[22]; for (const p of L.projs.values()) if (p.ptype === 3 && !p.__n) { p.__n = 1; window.__shots++; }
              for (const e of L.enemies.values()) window.__flyMax = Math.max(window.__flyMax, e.y || 0); L.me.hp = Math.max(L.me.hp, 50); }""")
        fight = page.evaluate("() => ({ shots: window.__shots, flyMax: window.__flyMax, enemies: window.__fd.LEVELS[22].enemies.size, hp: window.__fd.LEVELS[22].me.hp })")
        print("in the shipwreck (you, hp topped up to 50+):", fight)
        if D: page.screenshot(path=f"{D}/pirate-wreck.png")
        checks += [("gunners fire lead shot", fight["shots"] >= 1), ("parrots fly", fight["flyMax"] > 1.0), ("the crew hurts you", fight["hp"] < 99)]
        page.evaluate("() => { const L = window.__fd.LEVELS[22]; for (const e of Array.from(L.enemies.values())) L.removeEnemy(e); }")

        # the Captain
        boss = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[22], r = L.ROOMS[5]; Object.assign(L.q, { pg: 5, spawned: 1, wave: 0 }); fd.dolly.position.set(r.cx, 0, r.cz + 6); L.spawnWave(5, 0);
          const b = Array.from(L.enemies.values()).sort((a, c) => c.hpMax - a.hpMax)[0]; return { hp: b.hpMax, count: L.enemies.size }; }""")
        page.wait_for_timeout(2500)
        if D:
            page.evaluate("() => { window.__fd.state.yaw = 0; window.__fd.state.pitch = 0.1; }"); page.wait_for_timeout(600)
            page.screenshot(path=f"{D}/pirate-captain.png")
        print("captain's deck:", boss)
        checks.append(("Captain Saltbeard spawns with boss health", boss["hp"] >= 22))
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\npirate cove checks passed" if ok else "\npirate cove checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
