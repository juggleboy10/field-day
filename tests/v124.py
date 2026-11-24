"""v124: bigger boss fights in the five quests (Sunstone Keep, Skyline Siege, Hexwood Hollow, Pirate Cove, Frostpeak).

For each quest's boss:
  - it arrives with its name and title, big on screen and in the headset, and its health bar shows across the top
  - things come down on the arena on glowing circles that fill first: one lands where you stand, and hurts if you stay
  - at half health it stops to roar, goes red ("enraged!"), calls reinforcements, and then charges at you from range
  - everyone else is sent the hazards and the rage (so they see and dodge the same things)
  - when it falls: a big banner, the bar goes, and any circles still on the ground go away
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v124.py
"""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

QUESTS = ["dungeon", "siege", "hexwood", "pirate", "frostpeak"]

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page = b.new_page(viewport={"width": 800, "height": 500})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    for qid in QUESTS:
        i = page.evaluate(f"LEVEL_META.findIndex((m) => m.id === '{qid}')")
        page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
        page.wait_for_timeout(800)
        L = f"__fd.LEVELS[{i}]"
        # into the boss's arena: you stand near the south end, the boss spawns at the north
        info = page.evaluate(f"""(() => {{ const fd = __fd, L = {L};
          const br = L.ROOMS.findIndex((r) => r.waves.some((w) => w.some(([n]) => ENEMIES[ENEMY[n]].ai === 'boss')));
          const r = L.ROOMS[br]; Object.assign(L.q, {{ pg: br, spawned: 1, wave: 0 }});
          fd.dolly.position.set(r.cx, 0, r.z1 - 2); fd.state.yaw = 0; fd.state.pitch = -0.05; L.me.hp = 99; L.me.invT = 0;
          L.spawnWave(br, 0);
          const boss = Array.from(L.enemies.values()).find((e) => ENEMIES[e.type].ai === 'boss');
          for (const e of Array.from(L.enemies.values())) if (e !== boss) L.removeEnemy(e);    // (just the boss)
          boss.x = r.cx; boss.z = r.z0 + 2;
          return {{ br, id: boss.id, name: ENEMIES[boss.type].boss.name }}; }})()""")
        page.wait_for_timeout(500)
        arr = page.evaluate("""(() => { const A = __fd.ANNOUNCE.last, bar = document.getElementById('boss-bar');
          return { kind: A && A.kind, text: A && A.text, sub: A && A.sub, vr: __fd.VR_TOAST.text, bar: !!bar && !bar.hidden, barName: bar && bar.querySelector('.nm').textContent }; })()""")
        print(f"== {qid}: {info['name']}", arr)
        check(f"{qid}: the boss arrives with its name and title", arr["kind"] == "boss" and arr["text"] == info["name"].upper() and arr["sub"] and info["name"].upper() in arr["vr"].upper(), arr)
        check(f"{qid}: its health bar is across the top", arr["bar"] and arr["barName"] == info["name"], arr)

        # a hazard where you stand: it fills, then it lands and hurts
        page.evaluate(f"{L}.hostState.hzT = performance.now() + 100; {L}.me.hp = 99; {L}.me.invT = 0;")
        page.wait_for_function(f"{L}.hazards.size > 0", timeout=6000)
        hz = page.evaluate(f"""(() => {{ const L = {L}, me = __fd.myHead.pos; return Array.from(L.hazards.values()).map((h) => [Math.hypot(h.x - me.x, h.z - me.z), h.at - performance.now()]); }})()""")
        check(f"{qid}: a circle shows up where you stand, with a moment's warning", any(d < 1.4 for d, _ in hz) and all(0 < t <= 1300 for _, t in hz), hz)
        sent = page.evaluate(f"(() => {{ const dh = {L}.presence().dh; return {{ z: dh.z.length, e: dh.e[0].length }}; }})()")
        check(f"{qid}: the circles are sent to everyone else", sent["z"] >= 1, sent)
        page.wait_for_timeout(1700)
        check(f"{qid}: staying in it hurts", page.evaluate(f"{L}.me.hp") < 99)

        # half health: it roars and turns
        page.evaluate(f"(() => {{ const L = {L}, e = L.enemies.get({info['id']}); e.hp = Math.floor(e.hpMax / 2); L.me.hp = 99; }})()")
        page.wait_for_function(f"{L}.enemies.get({info['id']}).enr === 1", timeout=5000)
        page.wait_for_timeout(300)
        rage = page.evaluate(f"""(() => {{ const L = {L}, e = L.enemies.get({info['id']}), A = __fd.ANNOUNCE.last, bar = document.getElementById('boss-bar');
          return {{ st: e.st, kind: A.kind, text: A.text, barEnr: bar.classList.contains('enr'), sentEnr: L.presence().dh.e.find((a) => a[0] === e.id)[12] }}; }})()""")
        check(f"{qid}: at half health it stops to roar and is enraged", rage["st"] == 6 and rage["kind"] == "enrage" and "enraged" in rage["text"] and rage["barEnr"], rage)
        check(f"{qid}: the rage is sent to everyone else", rage["sentEnr"] == 1, rage)
        # then it charges at you from range (keep it at range, and keep you topped up)
        page.evaluate(f"""(() => {{ window.__sts = new Set(); const L = {L}, id = {info['id']};
          window.__keep = setInterval(() => {{ const e = L.enemies.get(id); if (!e) return; __sts.add(e.st); L.me.hp = 99; L.me.down = false;
            const r = L.ROOMS[{info['br']}]; if (e.st === 0 && Math.hypot(e.x - __fd.myHead.pos.x, e.z - __fd.myHead.pos.z) < 6) {{ e.z = r.z0 + 2; }} }}, 20); }})()""")
        page.wait_for_function("__sts.has(7) || __sts.has(4)", timeout=12000) if True else None
        sts = page.evaluate("Array.from(__sts)")
        check(f"{qid}: enraged, it charges at you", 7 in sts or 4 in sts, sts)
        page.evaluate("clearInterval(__keep)")

        # it falls
        page.evaluate(f"{L}.hostState.hzT = performance.now() + 50"); page.wait_for_timeout(300)
        page.evaluate(f"{L}.damageEnemy({info['id']}, 999)")
        page.wait_for_timeout(600)
        end = page.evaluate(f"""(() => {{ const A = __fd.ANNOUNCE.last, bar = document.getElementById('boss-bar'); return {{ kind: A.kind, text: A.text, bar: !bar.hidden, hz: {L}.hazards.size }}; }})()""")
        check(f"{qid}: when it falls, a big banner, the bar goes and the circles clear", end["kind"] == "win" and not end["bar"] and end["hz"] == 0, end)
        page.evaluate(f"(() => {{ const L = {L}; for (const e of Array.from(L.enemies.values())) L.removeEnemy(e); }})()")

    # leaving a quest mid-fight doesn't leave the bar on screen
    i = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'dungeon')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000); page.wait_for_timeout(500)
    page.evaluate(f"""(() => {{ const L = __fd.LEVELS[{i}], br = L.ROOMS.length - 2; Object.assign(L.q, {{ pg: br, spawned: 1, wave: 0 }}); L.spawnWave(br, 0); }})()""")
    page.wait_for_timeout(500)
    hub = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'hub')")
    page.evaluate(f"__fd.switchLevel({hub})"); page.wait_for_function(f"__fd.state.level === {hub}", timeout=20000); page.wait_for_timeout(500)
    check("leaving a quest mid-fight takes the boss bar away", page.evaluate("document.getElementById('boss-bar').hidden"))

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
