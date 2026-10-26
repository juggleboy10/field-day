"""v88: doubles pickleball and 1 v 1 volleyball.

Usage: python tests/v88.py [pickle|volley]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
ONLY = set(sys.argv[1:])
want = lambda g: not ONLY or g in ONLY

# play on with the bots: I stand off the court, so my bot partner (doubles) has to cover
PLAY = """([secs]) => { const fd = window.__fd, L = fd.LEVELS[15], PB = L.pb, I = PB.internals;
  const swings = I.BOTS.map((b) => b.swingT), pts = [0, 0], servers = new Set();
  PB.server = 1; I.startServe(); let now = performance.now(), s0 = PB.score.slice(), seq = PB.pointSeq, maxHits = 0;
  for (let f = 0; f < secs * 60; f++) {
    fd.myHead.pos.set(-10, 1.6, 6.2);
    now += 1000 / 60; L.update(1 / 60, now);
    if (PB.ph === 'serve') servers.add(I.serverSlot());
    maxHits = Math.max(maxHits, PB.hits);
    if (PB.winner >= 0) break;
  }
  return { score: PB.score.slice(), swung: I.BOTS.map((b, i) => b.swingT !== swings[i]), servers: [...servers].sort(), maxHits, ph: PB.ph, bots: I.botSlots() }; }"""


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

        if want("pickle"):
            go(15)
            # pick up the west singles paddle (E at the rack)
            page.evaluate("() => { const fd = window.__fd, t = fd.LEVELS[15].pb.internals.paddles[0]; fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }")
            page.wait_for_timeout(500)
            page.keyboard.press("KeyE")
            page.wait_for_timeout(800)
            sg = page.evaluate("() => { const PB = window.__fd.LEVELS[15].pb, I = PB.internals; return { slot: PB.mySlot, dbl: PB.dbl, bots: I.botSlots(), ph: PB.ph }; }")
            print("singles:", sg)
            check(sg == {"slot": 0, "dbl": False, "bots": [2], "ph": "serve"}, f"pickleball singles {sg}")
            single = page.evaluate(PLAY, [25])
            print("singles play:", single)
            check(single["swung"][2] and not single["swung"][0] and not single["swung"][1] and not single["swung"][3], f"pickleball singles bots {single}")
            # doubles: my partner and two opponents are bots
            db = page.evaluate("() => { const L = window.__fd.LEVELS[15], PB = L.pb, I = PB.internals; L.setDoubles(true); return { dbl: PB.dbl, bots: I.botSlots(), score: PB.score.slice(), ph: PB.ph, homes: [0, 1, 2, 3].map(I.homeZ) }; }")
            print("doubles:", db)
            check(db["dbl"] and db["bots"] == [1, 2, 3] and db["score"] == [0, 0] and db["ph"] == "serve" and db["homes"] == [1.525, -1.525, -1.525, 1.525], f"pickleball doubles {db}")
            dplay = page.evaluate(PLAY, [150])
            print("doubles play:", dplay)
            check(dplay["swung"][1] and dplay["swung"][2] and dplay["swung"][3], f"pickleball doubles: every bot plays {dplay}")
            check(sum(dplay["score"]) >= 8 and dplay["maxHits"] >= 4, f"pickleball doubles: real rallies {dplay}")
            # who covers what: a ball landing on the left half of our side is my partner's (I'm far away), unless I'm right there
            rs = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[15].pb.internals, B = I.BOTS;
              B[1].x = -5; B[1].z = -1.5; fd.myHead.pos.set(-5, 1.6, 1.5);
              const a = I.responsible(0, { x: -5, z: -1.4 }), b = I.responsible(0, { x: -5, z: 1.2 }), c = I.responsible(0, { x: -5, z: 0.1 });
              return [a, b, c]; }""")
            print("who plays it:", rs)
            check(rs == [1, 0, 0], f"pickleball doubles: who covers what {rs}")
            # the serve rotation: on an odd score the left-half partner serves
            sv = page.evaluate("() => { const PB = window.__fd.LEVELS[15].pb, I = PB.internals; PB.server = 0; PB.score = [2, 0]; const a = I.serverSlot(); PB.score = [3, 0]; const b = I.serverSlot(); PB.server = 1; PB.score = [0, 5]; const c = I.serverSlot(); return [a, b, c]; }")
            check(sv == [0, 1, 3], f"pickleball doubles serve rotation {sv}")
            # back to singles
            back = page.evaluate("() => { const L = window.__fd.LEVELS[15], PB = L.pb, I = PB.internals; L.setDoubles(false); return { dbl: PB.dbl, bots: I.botSlots(), slot: PB.mySlot }; }")
            check(back == {"dbl": False, "bots": [2], "slot": 0}, f"pickleball back to singles {back}")
            # the doubles partner rack switches it on
            page.keyboard.press("KeyE")
            page.wait_for_timeout(400)
            page.evaluate("() => { const fd = window.__fd, t = fd.LEVELS[15].pb.internals.paddles[3]; fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z - 0.6); }")
            page.wait_for_timeout(500)
            page.keyboard.press("KeyE")
            page.wait_for_timeout(800)
            pr = page.evaluate("() => { const PB = window.__fd.LEVELS[15].pb, I = PB.internals; return { slot: PB.mySlot, side: PB.mySide, dbl: PB.dbl, bots: I.botSlots() }; }")
            print("partner rack:", pr)
            check(pr == {"slot": 3, "side": 1, "dbl": True, "bots": [0, 1, 2]}, f"pickleball partner rack {pr}")
            page.keyboard.press("KeyE")
            page.wait_for_timeout(300)

        if want("volley"):
            go(37)
            vb = page.evaluate("""() => { const L = window.__fd.LEVELS[37], I = L.vbInternals, V = I.V; L.update = () => {};
              I.setSolo(true);
              const out = { court: I.court(), people: V.people.slice(), slots: new Set(), matches: [], kinds: [0, 0, 0, 0, 0, 0, 0], maxTouches: 0, touch2: I.touchKind(2) };
              for (let m = 0; m < 2; m++) {
                I.startMatch(); V.people = ['', '', '', '']; I.newServe(); V.lv = m % 2;
                let t = 0, lastN = V.hitN;
                while (V.ph !== 'over' && t < 1500) { I.hostStep(1 / 60); t += 1 / 60;
                  if (V.hitN !== lastN) { lastN = V.hitN; out.slots.add(V.lastSlot); out.kinds[V.lastKind] += 1; out.maxTouches = Math.max(out.maxTouches, V.touches); } }
                out.matches.push({ score: V.score.slice(), ph: V.ph, secs: Math.round(t) });
              }
              out.slots = [...out.slots].sort(); out.inside = [I.V.p.x, I.V.p.z].map((x) => Math.abs(x) < 20);
              I.setSolo(false); out.back = I.court(); return out; }""")
            print("volleyball 1 v 1:", vb)
            check(vb["court"] == [6.5, 3] and vb["back"] == [8, 4], f"volleyball: court size {vb}")
            check(vb["people"][1] == "" and vb["people"][3] == "" and vb["people"][0] != "", f"volleyball 1 v 1: one a side {vb['people']}")
            check(all(m["ph"] == "over" for m in vb["matches"]), f"volleyball 1 v 1: matches finish {vb['matches']}")
            check(vb["slots"] == [0, 2], f"volleyball 1 v 1: only one player a side touches it {vb['slots']}")
            check(vb["kinds"][2] == 0 and vb["kinds"][1] > 20 and vb["kinds"][3] + vb["kinds"][4] > 20, f"volleyball 1 v 1: pass then over, no set {vb['kinds']}")
            check(vb["touch2"] == 4, f"volleyball 1 v 1: my second touch goes over {vb}")

        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv88 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
