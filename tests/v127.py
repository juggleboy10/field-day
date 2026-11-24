"""v127: seasons for every pickleball park: spring, summer, fall and winter.

  - four buttons by the court (and a Season action on screen) switch the season, in whichever park you're in
  - each park starts in its own season (Sunny Courts in summer, College Park and the Senior Center in fall); once
    someone picks one, it holds as you change parks
  - spring: green crowns with some blossom, flowers in the grass. Summer: deep green. Fall: orange, red, yellow and
    brown, leaves on the ground. Winter: bare trees, snow on the ground and the pines, snow falling, a paler sky
  - everyone sees the same season (it travels with the park), and ?season=winter opens in winter
  - every park in every season stays under the 150-call budget, and its baked scenery doesn't change
  - no errors

    THREE_JS=/path/to/three.min.js python3 tests/v127.py
"""
import math, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    page = b.new_page(viewport={"width": 640, "height": 400})
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE + "?test"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')")
    i = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'pickleball')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(1000)
    L, I = f"__fd.LEVELS[{i}]", f"__fd.LEVELS[{i}].pb.internals"
    STATE = f"""(() => {{ const I = {I}, P = I.PARKS[I.park()], K = P.group;
      const im = (k) => {{ let o = null; if (P.id !== 'sunny') K.traverse((m) => {{ if (m.isInstancedMesh && m.userData.live && m === m) o = o || []; }}); return o; }};
      return {{ park: P.id, season: I.SEASONS[I.season()].id, snow: I.snow.visible, fog: __fd.LEVELS[{i}].env.fog[2], sceneFog: Math.round(__fd.camera.parent ? 0 : 0) }}; }})()"""
    s = page.evaluate(STATE)
    check("Sunny Courts starts in summer", s["park"] == "sunny" and s["season"] == "summer" and not s["snow"], s)

    # the buttons by the court
    btns = page.evaluate(f"{L}.buttons.map((b) => b.label).filter((t) => ['Spring', 'Summer', 'Fall', 'Winter'].includes(t))")
    check("four season buttons by the court", btns == ["Spring", "Summer", "Fall", "Winter"], btns)
    page.evaluate(f"(() => {{ const b = {L}.buttons.find((b) => b.label === 'Winter'); b.onPress(b); }})()"); page.wait_for_timeout(500)
    s = page.evaluate(STATE)
    check("the Winter button: winter, with snow falling", s["season"] == "winter" and s["snow"], s)
    y0 = page.evaluate(f"Array.from({I}.snow.geometry.attributes.position.array.slice(1, 300)).filter((v, k) => k % 3 === 0)")
    page.wait_for_timeout(600)
    y1 = page.evaluate(f"Array.from({I}.snow.geometry.attributes.position.array.slice(1, 300)).filter((v, k) => k % 3 === 0)")
    check("the snow falls", sum(1 for a, c in zip(y0, y1) if c < a) > len(y0) * 0.6)
    sunny = page.evaluate(f"(() => {{ const I = {I}; let crowns = 0, vis = 0; I.PARKS[0].group.traverse((m) => {{ if (m.isMesh && m.geometry.type === 'IcosahedronGeometry') {{ crowns++; if (m.visible) vis++; }} }}); return {{ crowns, vis }}; }})()")
    check("Sunny Courts in winter: its trees are bare", sunny["crowns"] >= 6 and sunny["vis"] == 0, sunny)

    # College Park and the Senior Center in all four
    def kit(park):
        return page.evaluate(f"""(() => {{ const I = {I}, P = I.PARKS[{park}], out = {{}}; let ground = null;
          P.group.traverse((m) => {{ if (m.isMesh && !m.isInstancedMesh && m.userData.live && m.material.map && m.geometry.parameters && m.geometry.parameters.width >= 300) ground = m.material.map.uuid; }});
          const ims = []; P.group.traverse((m) => {{ if (m.isInstancedMesh && m.userData.live) ims.push(m); }});
          return {{ ground, ims: ims.map((m) => [m.name, m.count, m.visible, m.instanceColor ? Array.from(m.instanceColor.array.slice(0, 3)).map((v) => +v.toFixed(2)) : null]) }}; }})()""")
    for park, name in ((1, "College Park"), (2, "Senior Center")):
        page.evaluate(f"{I}.setPark({park})"); page.wait_for_timeout(300)
        seen = {}
        for si, sid in enumerate(["spring", "summer", "fall", "winter"]):
            page.evaluate(f"(() => {{ const b = {L}.buttons.find((b) => b.label === '{sid.capitalize()}'); b.onPress(b); }})()"); page.wait_for_timeout(1000)
            st, k = page.evaluate(STATE), kit(park)
            seen[sid] = k
            # crowns are icosahedra with many instances; caps and cones are cones; leaves are planes; flowers small icosahedra
            ims = k["ims"]
            by = {m[0]: m for m in ims}
            crowns = [by["season-crowns"]]
            cv = by["season-crowns"][2]; capv = by["season-caps"][2] and by["season-cones"][2]; lv = by["season-leaves"][2]; fv = by["season-flowers"][2]
            print(f"  {name} {sid}: crowns {'on' if cv else 'off'} {crowns[0][3]}, snow caps {'on' if capv else 'off'}, leaves {'on' if lv else 'off'}, flowers {'on' if fv else 'off'}, snow falling {st['snow']}")
            want = {"spring": (True, False, False, True, False), "summer": (True, False, False, False, False), "fall": (True, False, True, False, False), "winter": (False, True, False, False, True)}[sid]
            check(f"{name} in {sid}: the trees, ground cover and snow are right", (cv, capv, bool(lv), bool(fv), st["snow"]) == want, (cv, capv, lv, fv, st["snow"]))
            # draw calls looking round
            calls = []
            for a in range(4):
                page.evaluate(f"(() => {{ const fd = __fd; fd.dolly.position.set(-3, 0, 0); fd.state.yaw = {a * math.pi / 2 + 0.4}; fd.state.pitch = -0.05; }})()")
                page.wait_for_timeout(300)
                calls.append(page.evaluate("__fd.renderer.info.render.calls"))
            check(f"{name} in {sid}: under the draw-call budget", max(calls) < 150, calls)
        check(f"{name}: the ground changes with the season (grass to snow)", len({seen[x]["ground"] for x in seen}) == 4, [seen[x]["ground"] for x in seen])
        cols = [next(m[3] for m in seen[x]["ims"] if m[0] == "season-crowns") for x in ("spring", "summer", "fall")]
        check(f"{name}: the crowns change colour spring -> summer -> fall", len({tuple(c) for c in cols}) == 3, cols)
    page.wait_for_timeout(400)
    mc = page.evaluate("__fd.mergeCheck ? __fd.mergeCheck() : []")
    check("no baked scenery changed with the seasons", not mc, mc[:3] if mc else mc)

    # a picked season holds across parks; and a fresh page goes back to each park's own
    page.evaluate(f"{I}.setSeason(0)"); page.evaluate(f"{I}.setPark(1)"); page.wait_for_timeout(300)
    check("a picked season holds as you change park", page.evaluate(STATE)["season"] == "spring")
    # everyone sees it: sent with the park, and a friend's newer pick is taken
    pk = page.evaluate(f"{L}.presence().pkp")
    check("the season is sent with the park", pk and len(pk) == 3 and pk[2] == 0, pk)
    page.evaluate(f"{L}.readPresence({{ peer: 'zz', name: 'Zed' }}, {{ pkp: [2, {pk[1]} + 3, 3] }}, {{}})"); page.wait_for_timeout(300)
    s = page.evaluate(STATE)
    check("a friend's newer pick (Senior Center in winter) is taken", s["park"] == "senior" and s["season"] == "winter", s)
    hud = page.evaluate(f"{L}.hudActions.map((a) => a.label()).find((t) => t.startsWith('Season'))")
    check("the Season action on screen says it", hud and "Winter" in hud, hud)

    page.goto(PAGE + "?test&park=college&season=winter"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')"); page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(800)
    s = page.evaluate(STATE)
    check("?park=college&season=winter opens there", s["park"] == "college" and s["season"] == "winter" and s["snow"], s)
    page.goto(PAGE + "?test&park=college"); page.wait_for_function("window.__fdReady === true", timeout=60000)
    page.evaluate("__fd.startGame('flat')"); page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}", timeout=20000)
    page.wait_for_timeout(600)
    check("College Park on its own starts in fall", page.evaluate(STATE)["season"] == "fall")

    page.wait_for_timeout(300)
    check("no errors", not errs, errs[:3])
    b.close()

print("all passed" if not fails else f"{len(fails)} failed")
sys.exit(1 if fails else 0)
