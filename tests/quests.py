"""Adventure quests: treasure chests, champions and hidden relics, in all four quests.

- every fight area gets a chest; once the area is cleared it appears, and walking up to it opens it for a blessing
- from the second fight on, each wave has a champion with far more health
- three relics hide in corners; walking to one collects it, and all three give a bonus heart

Usage: python tests/quests.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
QUESTS = {3: "Sunstone Keep", 10: "Skyline Siege", 11: "Hexwood Hollow", 22: "Pirate Cove"}


def main():
    ok = True
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
        for idx, name in QUESTS.items():
            page.evaluate(f"() => window.__fd.switchLevel({idx})")
            page.wait_for_timeout(800)
            info = page.evaluate(f"""() => {{ const L = window.__fd.LEVELS[{idx}];
              return {{ fights: L.ROOMS.filter((r) => r.waves.length).length, chests: L.CHESTS.length, relics: L.RELICS.length }}; }}""")
            # a champion leads the second fight's waves
            champ = page.evaluate(f"""() => {{ const L = window.__fd.LEVELS[{idx}]; const i = L.ROOMS.findIndex((r, k) => k >= 2 && r.waves.length);
              L.spawnWave(i, 0); const list = Array.from(L.enemies.values()); const c = list.find((e) => e.champ);
              const out = c ? {{ hp: c.hpMax, base: L.enemiesHp ? 0 : null }} : null;
              for (const e of list) L.removeEnemy(e); return out; }}""")
            # clear the whole quest, then walk to the first chest
            page.evaluate(f"""() => {{ const fd = window.__fd, L = fd.LEVELS[{idx}]; Object.assign(L.q, {{ pg: L.ROOMS.length - 1, spawned: 0, wave: 0 }});
              L.me.hp = L.me.maxHp; const c = L.CHESTS[0]; fd.dolly.position.set(c.x, 0, c.z + 0.6); }}""")
            page.wait_for_timeout(900)
            chest = page.evaluate(f"""() => {{ const L = window.__fd.LEVELS[{idx}], m = L.me;
              return {{ opened: m.chests.size, coins: m.coins, blessed: m.might + (m.maxHp - 3) + m.ward + m.vamp + m.lucky, visible: L.CHESTS[0].g.visible }}; }}""")
            # walk to each relic
            for k in range(info["relics"]):
                page.evaluate(f"""() => {{ const fd = window.__fd, rl = fd.LEVELS[{idx}].RELICS[{k}]; fd.dolly.position.set(rl.x, 0, rl.z); }}""")
                page.wait_for_timeout(700)
            rel = page.evaluate(f"() => {{ const m = window.__fd.LEVELS[{idx}].me; return {{ relics: m.relics.size, maxHp: m.maxHp }}; }}")
            # a new run puts everything back
            page.evaluate(f"() => {{ const L = window.__fd.LEVELS[{idx}]; L.me.dr[1] = L.q.r; }}")
            page.wait_for_timeout(700)
            reset = page.evaluate(f"() => {{ const L = window.__fd.LEVELS[{idx}]; return {{ chests: L.me.chests.size, relics: L.me.relics.size, maxHp: L.me.maxHp, shown: L.CHESTS.filter((c) => c.g.visible).length }}; }}")
            print(name, info, "champion:", champ, "chest:", chest, "relics:", rel, "after reset:", reset)
            checks = [
                ("a chest for every fight", info["chests"] == info["fights"]),
                ("three relics", info["relics"] == 3),
                ("a champion with extra health", champ is not None and champ["hp"] >= 6),
                ("the chest opened and blessed you", chest["opened"] == 1 and chest["blessed"] >= 1 and chest["coins"] >= 3),
                ("all relics found, bonus heart", rel["relics"] == 3 and rel["maxHp"] >= 4),
                ("a new run resets them", reset["chests"] == 0 and reset["relics"] == 0 and reset["maxHp"] == 3 and reset["shown"] == 0),
            ]
            for label, good in checks:
                print(("  PASS " if good else "  FAIL ") + label)
                ok = ok and good
        if errors:
            print("page errors:", errors[:5])
            ok = False
        browser.close()
    print("ALL PASS" if ok else "SOME FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
