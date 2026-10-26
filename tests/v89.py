"""v89: a Bots level (easy, normal, hard) for every game with bots.

Usage: python tests/v89.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

GAMES = ["baseball", "bowling", "chairs", "cornhole", "ctf", "discgolf", "dodgeball", "gorilla", "hideseek", "hoops", "potato", "karts", "kayak",
         "lasertag", "llama", "minigolf", "paintball", "parkour", "pickleball", "pillow", "recess", "rps", "snowball", "soccer", "toboggan", "trivia",
         "volleyball", "hub"]


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
        go = lambda i: (page.evaluate(f"() => window.__fd.switchLevel({i})"), page.wait_for_timeout(1200))

        # every game with bots has the setting (and only those)
        have = page.evaluate("() => window.__fd.LEVELS.filter((L) => L.botLv).map((L) => L.id).sort()")
        print("games with a Bots level:", len(have), have)
        check(sorted(GAMES) == have, f"Bots level games: missing {set(GAMES) - set(have)}, extra {set(have) - set(GAMES)}")

        # the button: Normal to start, cycles, and is remembered per game
        go(15)
        b = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[15], B = fd.BOTLV; const out = { start: B.get(L), label: L.botHud.label() };
          L.botHud.run(); out.after = B.get(L); out.saved = fd.state.prefs ? null : null; out.other = B.get(fd.LEVELS[7]);
          out.buttons = [...document.querySelectorAll('.hud-btn')].map((x) => x.textContent).filter((t) => t.startsWith('Bots'));
          return out; }""")
        page.wait_for_timeout(300)
        b["buttons"] = page.evaluate("() => [...document.querySelectorAll('.hud-btn')].map((x) => x.textContent).filter((t) => t.startsWith('Bots'))")
        print("button:", b)
        check(b["start"] == 1 and b["label"].startswith("Bots: Normal") and b["after"] == 2 and b["other"] == 1 and b["buttons"] == ["Bots: Hard ▸"], f"Bots button {b}")

        # the watch has a Bots button in a game with bots, and pressing it changes the level
        w = page.evaluate("() => { const fd = window.__fd, L = fd.LEVELS[15]; const ids = fd.watch.btns().map((x) => x.id); fd.watch.press('bots'); const after = fd.BOTLV.get(L); fd.switchLevel(48); const study = fd.watch.btns().map((x) => x.id); fd.switchLevel(15); return { ids, after, study }; }")
        page.wait_for_timeout(800)
        print("watch:", w)
        check(w["ids"] == ["hub", "bots"] and w["after"] == 0 and w["study"] == ["hub"], f"watch {w}")

        # pickleball bots move faster on hard
        go(15)
        page.evaluate("() => { const fd = window.__fd, t = fd.LEVELS[15].pb.internals.paddles[0]; fd.dolly.position.set(t.rackPos.x, 0, t.rackPos.z + 0.6); }")
        page.wait_for_timeout(400)
        page.keyboard.press("KeyE")
        page.wait_for_timeout(600)
        tops = []
        for lv in (0, 1, 2):
            tops.append(page.evaluate(f"""() => {{ const fd = window.__fd, L = fd.LEVELS[15], PB = L.pb, I = PB.internals, B = fd.BOTLV; B.set(L, {lv});
              const bt = I.BOTS[2]; Object.assign(PB, {{ ph: 'rally', lastHit: 0, need: 1, hits: 3, bounced: false }}); Object.assign(PB.b, {{ x: -3, y: 1, z: 0, vx: 9, vy: 2, vz: 2.5, wx: 0, wy: 0, wz: 0 }});
              bt.x = I.HL * 0.85; bt.z = -2; bt.vx = bt.vz = 0; bt.hitKey = ''; let t = 1e7, top = 0;
              for (let f = 1; f <= 72; f++) {{ const x0 = bt.x, z0 = bt.z; t += 1000 / 60; I.botStep(1 / 60, t); top = Math.max(top, Math.hypot(bt.x - x0, bt.z - z0) * 60); }}
              PB.ph = 'dead'; return +top.toFixed(2); }}"""))
        page.keyboard.press("KeyE")
        print("pickleball bot top speed (easy, normal, hard):", tops)
        check(tops[0] < tops[1] < tops[2] and abs(tops[1] - 3.5) < 0.1, f"pickleball speeds {tops}")

        # parkour bots finish sooner on hard
        go(16)
        pk = page.evaluate("() => { const fd = window.__fd, L = fd.LEVELS[16], b = L.pkBots[0]; return [0, 1, 2].map((v) => { fd.BOTLV.set(L, v); return +b.finishT.toFixed(1); }); }")
        print("parkour finish times:", pk)
        check(pk[0] > pk[1] > pk[2], f"parkour {pk}")

        # toboggan and llama: the bots get further in the same time on hard
        for idx, key, step in ((35, "sledInternals", "botDrive"), (40, "llInternals", "botRide")):
            go(idx)
            far = page.evaluate(f"""() => {{ const fd = window.__fd, L = fd.LEVELS[{idx}], I = L.{key}; L.update = () => {{}};
              return [0, 1, 2].map((v) => {{ fd.BOTLV.set(L, v); let tot = 0; for (let rep = 0; rep < 2; rep++) {{ I.toGrid(); for (const b of I.BOTS) {{ const s0 = b.s; for (let k = 0; k < 60 * 20; k++) I.{step}(b, 1 / 60); tot += b.s - s0; }} }} return +tot.toFixed(1); }}); }}""")
            print(key, "20 s of the bots (easy, normal, hard):", far)
            check(far[0] < far[1] < far[2], f"{key} {far}")

        # bowling: Strike Sally strikes more on hard (her first ball, over many frames)
        go(7)

        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv89 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
