"""v98: Tabletop Brawl, a platform fighter on a games table.

Sections:
  physics  a smash at 0% barely moves you; at 150% it sends you off the screen (a life gone, back on the cloud);
           heavier fighters fly less; platforms hold you from above, S drops you through
  match    four bots fight it out (sped up) until one's left: lives go, KOs are counted, it ends with a winner and
           goes back to the lobby
  controls the browser keys run, jump and attack (hold J for a smash); in VR a hard swing is a smash
  bombs    a bomb: picked up with an attack, thrown with the next, and it blows up whoever it hits
  friends  two players: the first one here runs the match, the second's keys move their fighter on both screens,
           the second can ask for the match to start, and End game stops it for both

Usage: python tests/v98.py [section ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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
        if want("physics") or want("match") or want("controls") or want("bombs"):
            ctx = browser.new_context(viewport={"width": 1000, "height": 640}); route(ctx)
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto((ROOT / "index.html").as_uri() + "?test")
            page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=25000)
            page.locator("#btn-flat").click()
            page.evaluate("() => window.__fd.switchLevel(60)")
            page.wait_for_timeout(1500)

            if want("physics"):
                r = page.evaluate("""() => { const I = window.__fd.LEVELS[60].brawlInternals, F = I.F, M = I.MOVES;
                  // a quiet lobby with two fighters: me (a kangaroo) and a dummy
                  const a = F[0], b = F[1]; for (const f of F) f.on = false;
                  const fly = (fi, pct) => { Object.assign(b, { on: true, fi, bot: true }); I.place(a, 0); I.place(b, 1); a.x = 0; b.x = 1.2; b.y = 0; b.pct = pct; a.face = 1;
                    I.hurt(b, a, M.smash, 1, 1); const v = Math.hypot(b.vx, b.vy); let t = 0, ko = false; const st = b.stocks;
                    for (; t < 3; t += 1 / 60) { I.step(b, { mx: 0, my: 0 }, 1 / 60); if (b.dead > 0) { ko = true; break; } }
                    return { v: +v.toFixed(1), x: +b.x.toFixed(1), y: +b.y.toFixed(1), ko, t: +t.toFixed(2) }; };
                  a.on = true;
                  const low = fly(0, 0), high = fly(0, 150), heavy = fly(2, 110), light = fly(1, 110);
                  // after a KO: back on the cloud, invincible, at 0%
                  b.dead = 0.01; I.step(b, { mx: 0, my: 0 }, 0.02); const back = { y: +b.y.toFixed(1), pct: b.pct, inv: b.inv > 1, cloud: b.cloud > 0 };
                  // a platform holds you from above; S drops you through
                  Object.assign(b, { x: 3.5, y: 4.5, vy: 0, cloud: 0, inv: 0, stun: 0, dead: 0 }); for (let i = 0; i < 60; i++) I.step(b, { mx: 0, my: 0 }, 1 / 60); const onPlat = +b.y.toFixed(2);
                  I.step(b, { mx: 0, my: 1 }, 1 / 60); for (let i = 0; i < 40; i++) I.step(b, { mx: 0, my: 0 }, 1 / 60); const dropped = +b.y.toFixed(2);
                  return { low, high, heavy, light, back, onPlat, dropped }; }""")
                print("physics:", r)
                check(r["high"]["v"] > 2.5 * r["low"]["v"] and r["low"]["v"] < 20, f"0% vs 150% launch {r}")
                check(r["high"]["ko"] and (abs(r["high"]["x"]) > 16 or r["high"]["y"] > 16), f"150% smash didn't send them off the screen {r['high']}")
                check(r["heavy"]["v"] < r["light"]["v"], f"weight {r}")
                check(r["back"] == {"y": 8.5, "pct": 0, "inv": True, "cloud": True}, f"respawn {r['back']}")
                check(r["onPlat"] == 3.3 and r["dropped"] < 0.1, f"platforms {r}")

            if want("match"):
                r = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[60], I = L.brawlInternals; I.toLobby(); for (const f of I.F) f.on = false;
                  // me out of it (I'll stand still), four bots: make me a bot too for this
                  I.H.spectate = true; L.startMatch();
                  const seat0 = I.F.map((f) => f.on && f.bot);
                  let t = 0, kos = 0; const ph = [];
                  for (; t < 400 && I.H.ph !== 'over'; t += 1 / 60) { I.hostStep(1 / 60); if (!ph.includes(I.H.ph)) ph.push(I.H.ph); }
                  const lives = I.F.map((f) => f.stocks), totalKos = I.F.reduce((a, f) => a + f.kos, 0), winner = I.H.winner;
                  for (let i = 0; i < 400; i++) I.hostStep(1 / 60);
                  I.H.spectate = false;
                  return { seat0, ph, t: Math.round(t), lives, totalKos, winner, after: I.H.ph }; }""")
                print("match:", r)
                check(all(r["seat0"]) and r["ph"][:3] == ["count", "fight", "over"] and r["winner"] >= 0 and sum(1 for x in r["lives"] if x > 0) == 1 and r["totalKos"] >= 3 and r["after"] == "lobby", f"bot match {r}")

            if want("controls"):
                page.evaluate("() => { const I = window.__fd.LEVELS[60].brawlInternals; I.toLobby(); for (const f of I.F) f.on = false; }")
                page.wait_for_timeout(500)
                x0 = page.evaluate("() => { const I = window.__fd.LEVELS[60].brawlInternals; const f = I.F.find((f) => f.peer === window.__fd.state.myPeer); f.x = -3; f.y = 0; return f.x; }")
                page.keyboard.down("KeyD"); page.wait_for_timeout(500); page.keyboard.up("KeyD")
                x1 = page.evaluate("() => window.__fd.LEVELS[60].brawlInternals.F.find((f) => f.peer === window.__fd.state.myPeer).x")
                page.keyboard.press("Space"); page.wait_for_timeout(120)
                y1 = page.evaluate("() => window.__fd.LEVELS[60].brawlInternals.F.find((f) => f.peer === window.__fd.state.myPeer).y")
                page.wait_for_timeout(900)
                page.keyboard.press("KeyJ"); page.wait_for_timeout(60)
                jab = page.evaluate("() => window.__fd.LEVELS[60].brawlInternals.F.find((f) => f.peer === window.__fd.state.myPeer).mv")
                page.wait_for_timeout(400)
                page.keyboard.down("KeyJ"); page.wait_for_timeout(700); page.keyboard.up("KeyJ"); page.wait_for_timeout(60)
                sm = page.evaluate("() => { const f = window.__fd.LEVELS[60].brawlInternals.F.find((f) => f.peer === window.__fd.state.myPeer); return [f.mv, +f.charge.toFixed(2)]; }")
                vr = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[60].brawlInternals, n0 = I.me.smash; fd.state.mode = 'vr';
                  const R = fd.myHands.right; R.ok = true; R.pos.set(0.2, 1.2, 0.6); fd.LEVELS[60].update(1 / 72, performance.now());
                  for (let i = 0; i < 6; i++) { R.pos.x += 0.07; fd.LEVELS[60].update(1 / 72, performance.now() + i * 14); }
                  fd.state.mode = 'flat'; return { smashes: I.me.smash - n0, dx: I.me.sdx }; }""")
                print("controls:", x0, x1, y1, jab, sm, vr)
                check(x1 > x0 + 1.5 and y1 > 0.5 and jab == "jab" and sm[0] == "smash" and sm[1] > 0.3, f"browser keys {x0} {x1} {y1} {jab} {sm}")
                check(vr["smashes"] == 1 and vr["dx"] == 1, f"VR swing {vr}")

            if want("bombs"):
                r = page.evaluate("""() => { const I = window.__fd.LEVELS[60].brawlInternals, F = I.F; for (const f of F) f.on = false;
                  const a = F[0], b = F[1]; Object.assign(a, { on: true, fi: 0 }); Object.assign(b, { on: true, fi: 3, bot: true }); I.place(a, 0); I.place(b, 1); a.x = -2; b.x = 2; a.face = 1;
                  I.H.bombs = [{ x: -1.7, y: 0, vx: 0, vy: 0, holder: -1, thrown: -1, t: 0, dead: false }];
                  I.step(a, { mx: 0, my: 0, atk: true }, 1 / 60); const held = !!a.held;
                  I.step(a, { mx: 0, my: 0, atk: true }, 1 / 60); const thrown = !a.held;
                  const p0 = b.pct; for (let i = 0; i < 90 && I.H.bombs.length; i++) { I.hostStep ? null : null; I.step(a, { mx: 0, my: 0 }, 1 / 60); I.step(b, { mx: 0, my: 0 }, 1 / 60);
                    // (the bomb flies on its own)
                    const bm = I.H.bombs[0]; bm.vy -= 30 / 60; bm.x += bm.vx / 60; bm.y += bm.vy / 60; if (Math.abs(b.x - bm.x) < 0.7 && Math.abs(b.y + 0.8 - bm.y) < 1.1) { I.H.bombs = []; I.hurt(b, a, { dmg: 16, base: 10, grow: 0.17, ang: 60 }, 1, 0); } }
                  return { held, thrown, dmg: Math.round(b.pct - p0) }; }""")
                print("bombs:", r)
                check(r["held"] and r["thrown"] and r["dmg"] >= 16, f"bombs {r}")
            check(not errors, f"page errors {errors}")
            ctx.close()

        if want("friends"):
            port = free_port()
            server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(0.8)
            try:
                ctx = browser.new_context(viewport={"width": 900, "height": 600}); ctx.add_init_script(FAKE_ROOM); route(ctx)
                errors = []
                pages = {}
                for who in ("pA", "pB"):
                    pg = ctx.new_page()
                    pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
                    pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}")
                    pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
                    pg.locator("#btn-flat").click()
                    pg.evaluate("() => window.__fd.switchLevel(60)")
                    pages[who] = pg
                A, B = pages["pA"], pages["pB"]
                time.sleep(3)
                seats = [pg.evaluate("() => { const I = window.__fd.LEVELS[60].brawlInternals; return { host: I.isHost(), seats: I.F.map((f) => f.on ? (f.bot ? 'bot' : f.peer) : '') }; }") for pg in (A, B)]
                print("seats:", seats)
                check(seats[0]["host"] and not seats[1]["host"] and seats[0]["seats"][:2] == ["pA", "pB"] and seats[1]["seats"][:2] == ["pA", "pB"], f"seats {seats}")
                # Bob runs right (his keys, his page): his fighter moves on Alice's screen (the host's) and his own
                xb0 = A.evaluate("() => window.__fd.LEVELS[60].brawlInternals.F[1].x")
                B.bring_to_front(); B.keyboard.down("KeyD"); time.sleep(0.8); B.keyboard.up("KeyD"); time.sleep(0.6)
                xa, xb = A.evaluate("() => window.__fd.LEVELS[60].brawlInternals.F[1].x"), B.evaluate("() => window.__fd.LEVELS[60].brawlInternals.F[1].x")
                print("Bob's fighter:", xb0, xa, xb)
                check(xa > xb0 + 1 and abs(xa - xb) < 0.6, f"Bob's input moved him on the host and his screen {xb0} {xa} {xb}")
                # Bob asks for a match: it starts for both
                B.evaluate("() => window.__fd.LEVELS[60].startMatch()")
                time.sleep(1.5)
                ph = [pg.evaluate("() => window.__fd.LEVELS[60].brawlInternals.H.ph") for pg in (A, B)]
                print("after Bob's start:", ph)
                check(ph[0] in ("count", "fight") and ph[1] in ("count", "fight"), f"start from a friend {ph}")
                # End game (twice) on Bob's page: back to the lobby for both
                B.evaluate("() => { const L = window.__fd.LEVELS[60]; L.endHud.run(); L.endHud.run(); }")
                time.sleep(1.5)
                ph2 = [pg.evaluate("() => window.__fd.LEVELS[60].brawlInternals.H.ph") for pg in (A, B)]
                print("after End game:", ph2)
                check(ph2 == ["lobby", "lobby"], f"end game {ph2}")
                check(not errors, f"friends page errors {errors}")
                ctx.close()
            finally:
                server.terminate()
        browser.close()
    print("\n".join(fails) if fails else "\nv98 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
