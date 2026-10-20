"""The v73 games play properly. Each section is one game.

- Pub Darts: the board scores right; Dave plays a sensible 301 and finishes legs; a browser throw lands where you aim

Usage: python tests/newgames2.py [game ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
SHOTS=dir saves a screenshot of each game.
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
SHOTS = os.environ.get("SHOTS")
ONLY = set(sys.argv[1:])
want = lambda g: not ONLY or g in ONLY


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
        shot = lambda name: SHOTS and page.screenshot(path=f"{SHOTS}/{name}.png")

        # ---- Pub Darts
        if want("darts"):
            go(36)
            shot("darts")
            d = page.evaluate("""() => { const L = window.__fd.LEVELS[36], I = L.dartInternals, out = {};
              const sc = (x, y) => I.scoreAt(x, y).v;
              out.board = [sc(0, 0), sc(0.01, 0), sc(0, 0.103), sc(0, 0.166), sc(0, 0.13), sc(0, 0.2), ...[1, 5, 3, 19].map((n) => { const [x, y] = I.spotFor(n, 3); return sc(x, y); })];
              L.update = () => {};
              const throwAt = (p, x, y) => { const from = new window.THREE.Vector3(I.laneX(I.S.k), 1.7, 0.1); I.launch(p, from, I.velTo(from, x, y, 10)); let n = 0; while (I.F.on && n++ < 5000) I.flightStep(0.002); };
              // a perfect thrower checks out 301 in a few turns
              I.S.mode = 0; I.newLeg();
              const t0 = I.S.sc[0];
              throwAt(0, ...I.spotFor(20, 3)); out.afterT20 = I.S.sc[0]; out.t0 = t0;
              // Dave plays whole legs on his own
              let legs = 0, daveWins = 0, turns = 0;
              for (let g = 0; g < 4; g++) {
                I.S.mode = g % 2; I.newLeg(); I.S.turn = 'dave'; I.S.thrown = 0;
                let n = 0;
                while (I.S.phase === 'play' && n++ < 400) {
                  // whoever's turn it is, Dave throws for both (a stand-in for me)
                  const p = I.S.turn === 'me' ? 0 : 1; if (p === 1) I.daveThrow(); else throwAt(0, 0.5, 0.5);
                  let k = 0; while (I.F.on && k++ < 5000) I.flightStep(0.002);
                  if (I.S.thrown >= 3 || I.S.wait > 0) { I.S.wait = 0; if (I.S.phase === 'play') I.nextTurn(); turns++; }
                }
                legs++; if (I.S.phase === 'over' && I.S.sc[0] !== 0) daveWins++;
              }
              out.legs = legs; out.daveWins = daveWins; out.turns = turns;
              return out; }""")
            print("Darts:", d)
            check(d["board"][:6] == [50, 25, 60, 40, 20, 0], f"darts: board scoring {d['board']}")
            check(d["board"][6:] == [3, 15, 9, 57], f"darts: treble spots {d['board']}")
            check(d["afterT20"] == 241, f"darts: treble 20 from 301 left {d['afterT20']}")
            check(d["daveWins"] == 4, f"darts: Dave finished {d['daveWins']} of 4 legs ({d['turns']} turns)")
            check(d["turns"] < 200, f"darts: legs took {d['turns']} turns")
            # a browser throw (aim straight at the bull with a steady hand) lands near the bull
            page.evaluate("() => { const I = window.__fd.LEVELS[36].dartInternals; I.S.mode = 0; I.newLeg(); }")
            page.wait_for_timeout(500)
            fl = page.evaluate("""() => { const L = window.__fd.LEVELS[36], I = L.dartInternals; const p = I.aimPoint(performance.now()); L.kick(0.5); let n = 0; while (I.F.on && n++ < 5000) I.flightStep(0.002);
              const d = I.myDarts[0].position; return { aim: p, hit: [d.x - I.laneX(I.S.k), d.y - I.BY], left: I.S.sc[0] }; }""")
            print("  browser throw:", fl)
            check(abs(fl["hit"][0] - fl["aim"][0]) < 0.01 and abs(fl["hit"][1] - fl["aim"][1]) < 0.01, f"darts: browser throw missed its aim {fl}")
        # ---- Beach Volleyball
        if want("volleyball"):
            go(37)
            page.evaluate("() => { const L = window.__fd.LEVELS[37]; L.vbInternals.startMatch(); }")
            page.wait_for_timeout(1500)
            shot("volleyball")
            vb = page.evaluate("""() => { const L = window.__fd.LEVELS[37], I = L.vbInternals, V = I.V; window.__vbU = L.update; L.update = () => {};
              const out = { matches: [], touches: [0, 0, 0, 0, 0], spikes: 0, rallyHits: [] };
              const orig = I.applyHit; let hits = 0;
              for (let m = 0; m < 3; m++) {
                I.startMatch(); V.people = ['', '', '', '']; I.newServe(); V.lv = m % 2;
                let t = 0, pts = 0, lastSum = 0;
                while (V.ph !== 'over' && t < 1500) {
                  const before = V.touches, lt = V.lastTeam, ph = V.ph;
                  I.hostStep(1 / 60); t += 1 / 60;
                  if (V.ph === 'rally' && (V.touches !== before || V.lastTeam !== lt) && ph === 'rally') { out.touches[Math.min(4, V.touches)]++; hits++; if (V.v.length() > 11) out.spikes++; }
                  const sum = V.score[0] + V.score[1]; if (sum !== lastSum) { out.rallyHits.push(hits); hits = 0; lastSum = sum; }
                }
                out.matches.push({ score: V.score.slice(), ph: V.ph, secs: Math.round(t) });
              }
              out.meanHits = out.rallyHits.reduce((a, b) => a + b, 0) / out.rallyHits.length;
              return out; }""")
            print("Volleyball:", {k: v for k, v in vb.items() if k != 'rallyHits'})
            check(all(m["ph"] == "over" for m in vb["matches"]), f"volleyball: matches didn't finish {vb['matches']}")
            check(vb["touches"][2] > 20 and vb["touches"][3] > 10, f"volleyball: few sets/third touches {vb['touches']}")
            check(vb["spikes"] > 10, f"volleyball: only {vb['spikes']} spikes")
            check(1.5 < vb["meanHits"] < 12, f"volleyball: rallies average {vb['meanHits']} hits")
            # a person in a browser: the ball comes down by me and I play it to my setter
            me = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[37], I = L.vbInternals, V = I.V;
              L.update = window.__vbU; I.startMatch(); V.ph = 'rally'; V.lastTeam = 1; V.touches = 3;               const h = fd.myHead.pos; V.p.set(h.x + 0.3, 2.4, h.z); V.v.set(0, -1, 0);
              const slot = V.people.indexOf(fd.state.myPeer); L.myTouch && 0;
              return { slot, x: h.x }; }""")
            page.wait_for_timeout(600)
            me2 = page.evaluate("() => { const V = window.__fd.LEVELS[37].vbInternals.V; return { lastSlot: V.lastSlot, touches: V.touches, lastTeam: V.lastTeam, vy: V.v.y }; }")
            print("  browser touch:", me, me2)
            check(me2["lastSlot"] == me["slot"] and me2["touches"] == 1, f"volleyball: I didn't play the ball {me} {me2}")
            # a block: their spike comes over the net right at me, standing at the net
            page.evaluate("() => { const fd = window.__fd; fd.LEVELS[37].vbInternals.V.ph = 'idle'; fd.dolly.position.set(-0.7, 0, 0); }")
            page.wait_for_timeout(600)
            page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[37].vbInternals, V = I.V; V.ph = 'rally'; V.lastTeam = 1; V.touches = 3; V.lastKind = 3; I.ME.cool = 0;
              const h = fd.myHead.pos; V.p.set(0.2, h.y + 0.35, h.z); V.v.set(-3, -0.5, 0); }""")
            try:
                page.wait_for_function("() => window.__fd.LEVELS[37].vbInternals.V.lastKind === 5", timeout=5000)
            except Exception:
                pass
            blk = page.evaluate("() => { const V = window.__fd.LEVELS[37].vbInternals.V; return { kind: V.lastKind, team: V.lastTeam, vx: V.v.x }; }")
            print("  block:", blk)
            check(blk["kind"] == 5 and blk["team"] == 0, f"volleyball: no block at the net {blk}")
        # ---- Pillow Fight Castle
        if want("pillow"):
            go(38)
            page.evaluate("() => { const L = window.__fd.LEVELS[38]; L.picker.set(6); L.pfInternals.startRound(); }")
            page.wait_for_timeout(300)
            pf = page.evaluate("""() => { const L = window.__fd.LEVELS[38], I = L.pfInternals, S = I.S;
              const out = { n: S.ids.length, teams: S.tm.slice() };
              // I stand still and the bots fight round me: the round ends with a winner
              const realU = L.update; L.update = () => {};
              let t = 0; while (S.ph === 'fight' && t < 240) { I.hostStep(1 / 30); t += 1 / 30; }
              out.ph = S.ph; out.wt = S.wt; out.secs = Math.round(t); out.hp = S.hp.slice();
              L.update = realU; return out; }""")
            print("Pillow fight:", pf)
            check(pf["n"] == 6 and pf["teams"].count(0) == 3, f"pillow: teams {pf}")
            check(pf["ph"] == "done" and pf["wt"] in (0, 1) and pf["secs"] < 200, f"pillow: the round didn't end {pf}")
            # a browser swing at a bot right in front of me bonks it
            page.evaluate("() => { const fd = window.__fd, L = fd.LEVELS[38], I = L.pfInternals, S = I.S; I.startRound(); }")
            page.wait_for_timeout(1500)
            shot("pillow")
            sw = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[38], I = L.pfInternals, S = I.S, h = fd.myHead.pos;
              const mi = S.ids.indexOf(fd.state.myPeer), k = S.ids.findIndex((id, j) => S.tm[j] !== S.tm[mi] && id[0] === 'b');
              const b = I.bots[Number(S.ids[k].slice(1))]; const q = new window.THREE.Quaternion(); fd.camera.getWorldQuaternion(q); const f = new window.THREE.Vector3(0, 0, -1).applyQuaternion(q);
              b.x = h.x + f.x * 1.0; b.z = h.z + f.z * 1.0; L.update = () => {}; window.__pfK = k; S.inv[k] = 0; const before = S.hp[k]; I.deskSwing(); return { k, before }; }""")
            page.wait_for_timeout(500)
            after = page.evaluate("() => window.__fd.LEVELS[38].pfInternals.S.hp[window.__pfK]")
            print("  swing:", sw, after)
            check(after == sw["before"] - 1, f"pillow: my swing didn't bonk {sw} -> {after}")
        # ---- Haunted Mansion
        if want("haunted"):
            go(39)
            page.evaluate("() => window.__fd.LEVELS[39].hauntInternals.startHunt()")
            page.wait_for_timeout(1500)
            shot("haunted")
            # point my beam (the browser one: where I look) at each ghost in turn until the room's clear
            hm = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[39], I = L.hauntInternals, H = I.H; const realU = L.update; L.update = () => {};
              const out = { rooms: [] }; const V = window.THREE.Vector3, Q = window.THREE.Quaternion;
              const aimAt = (p) => { const d = new V().subVectors(p, fd.myHead.pos).normalize(); fd.myHead.quat.setFromUnitVectors(new V(0, 0, -1), d); };
              for (let room = 0; room < 5 && H.ph === 'hunt'; room++) {
                let t = 0;
                while (H.ph === 'hunt' && t < 120 && !(H.open.includes(room) || (room === 4 && H.ph !== 'hunt'))) {
                  const g = H.ghosts.find((x) => x.st < 2);
                  if (g) { // stand a few metres off and keep it in the beam
                    fd.myHead.pos.set(g.x * 0.3, 1.6, g.z + 3.5); aimAt(new V(g.x, g.y, g.z));
                  }
                  I.hostStep(1 / 30); t += 1 / 30;
                }
                out.rooms.push({ room, secs: Math.round(t), caught: H.caught, open: H.open.slice(), ph: H.ph, boss: H.bossHp });
                if (H.ph !== 'hunt') break;
                // walk into the next room
                fd.myHead.pos.set(0, 1.6, I.ROOMS[room + 1].z + 3); I.hostStep(1 / 30);
              }
              out.ph = H.ph; L.update = realU; return out; }""")
            print("Haunted:", hm)
            check(hm["ph"] == "won", f"haunted: the hunt didn't finish {hm}")
            check(all(r["secs"] < 100 for r in hm["rooms"]), f"haunted: a room took too long {hm}")
        # ---- Llama Derby
        if want("llama"):
            go(40)
            page.evaluate("() => window.__fd.LEVELS[40].llInternals.startRace()")
            page.wait_for_timeout(5000)
            shot("llama")
            ll = page.evaluate("""() => { const L = window.__fd.LEVELS[40], I = L.llInternals, K = I.K; const realU = L.update; L.update = () => {}; I.RACE.st = 'idle'; I.toGrid();
              // me: a giddy-up four times a second, jumping each bale a few metres out
              let t = 0, n = 0, stumbles = 0, vmax = 0;
              const tl = I.TLEN;
              while (t < 240 && !(K.done && I.BOTS.every((b) => b.done))) {
                const dt = 1 / 50; t += dt; n++;
                if (n % 12 === 0) I.giddy(K, 1.4);
                const sl = ((K.s % tl) + tl) % tl; for (const b of I.BALES) { const a = b.s - sl; if (a > 0 && a < 2.6) I.jump(K, false); }
                const st = K.stumble; I.llamaStep(K, dt, (0 - K.lat) * 0.5, false); if (K.stumble > 0 && st <= 0) stumbles++;
                for (const b of I.BOTS) I.botRide(b, dt);
                vmax = Math.max(vmax, K.v);
                if (!K.done && K.s >= I.FINISH) K.done = t;
                for (const b of I.BOTS) if (!b.done && b.s >= I.FINISH) b.done = t;
              }
              L.update = realU;
              return { me: Math.round(K.done), bots: I.BOTS.map((b) => Math.round(b.done)), stumbles, vmax: Math.round(vmax * 10) / 10, botStumbles: I.BOTS.map((b) => b.stumble) }; }""")
            print("Llama:", ll)
            check(40 < ll["me"] < 120, f"llama: my race took {ll['me']} s")
            check(all(40 < b < 140 for b in ll["bots"]), f"llama: bots took {ll['bots']}")
            check(ll["stumbles"] == 0, f"llama: I stumbled {ll['stumbles']} times jumping on time")
        # ---- Rock-Paper-Scissors Tournament
        if want("rps"):
            go(41)
            page.evaluate("() => window.__fd.LEVELS[41].rpsInternals.startTournament()")
            page.wait_for_timeout(1500)
            page.keyboard.press("KeyP")
            # play it out for real (the count is a few seconds a throw): I pick paper each time
            rounds = []
            me_id = page.evaluate("() => window.__fd.state.myPeer")
            for _ in range(150):
                st = page.evaluate("() => { const S = window.__fd.LEVELS[41].rpsInternals.S, fd = window.__fd; const m = S.mt.find((x) => x[0] === fd.state.myPeer || x[1] === fd.state.myPeer); return { ph: S.ph, rnd: S.rnd, champ: S.champ, mine: m ? m.slice() : null }; }")
                if st["ph"] == "show" and (not rounds or rounds[-1] != (st["rnd"], st["mine"])):
                    rounds.append((st["rnd"], st["mine"]))
                    if len(rounds) == 2:
                        shot("rps")
                if st["ph"] == "done":
                    break
                if st["ph"] == "count":
                    page.keyboard.press("KeyP")
                page.wait_for_timeout(700)
            fin = page.evaluate("() => { const S = window.__fd.LEVELS[41].rpsInternals.S; return { ph: S.ph, champ: S.champ, rnd: S.rnd, ids: S.ids.length }; }")
            mine = [r for r in rounds if r[1]]
            print("RPS:", fin, "my throws:", [(r[0], r[1][2:6]) for r in mine][:12])
            check(fin["ph"] == "done" and fin["champ"], f"rps: no champion {fin}")
            check(all((r[1][4] if r[1][0] == me_id else r[1][5]) in (1, -1) for r in mine), "rps: my pick wasn't thrown")
            # internals: the rules
            rules = page.evaluate("() => { const b = window.__fd.LEVELS[41].rpsInternals.beats; return [b(1, 0), b(2, 1), b(0, 2), b(0, 1), b(1, 1)]; }")
            check(rules == [True, True, True, False, False], f"rps: rules {rules}")
        # ---- Dance-Off
        if want("dance"):
            go(42)
            page.evaluate("() => window.__fd.LEVELS[42].danceInternals.start(1)")
            page.wait_for_timeout(9000)
            shot("dance")
            dn = page.evaluate("""() => { const L = window.__fd.LEVELS[42], I = L.danceInternals, D = I.D; const realU = L.update; L.update = () => {};
              I.start(0); const ch = I.chart, bl = I.beatLen(); let k = 0;
              // hit every move: the right key, right on the beat (and every fourth one a bit late, every tenth the wrong key)
              for (const n of ch) { k++; D.t0 = performance.now() - (n.b * bl + (k % 4 === 0 ? 0.1 : 0)) * 1000; I.flatPress(k % 10 === 0 ? (I.MOVES[n.m].key === 'up' ? 'down' : 'up') : I.MOVES[n.m].key); }
              D.t0 = performance.now() - (I.SONGS[0].beats + 2) * bl * 1000; I.step(0.016, 0);
              const out = { notes: ch.length, hits: D.hits.slice(), score: D.score, st: D.st, best: D.best.slice(), maxCombo: D.maxCombo };
              L.update = realU; return out; }""")
            print("Dance:", dn)
            check(dn["st"] == "done" and dn["notes"] > 20, f"dance: the song didn't finish {dn}")
            check(dn["hits"][3] == dn["notes"] // 10 and dn["hits"][0] > dn["notes"] * 0.6, f"dance: judging {dn}")
        if errors:
            fails.append("page errors: " + "; ".join(errors[:5]))
        browser.close()
    if fails:
        print("FAIL\n  " + "\n  ".join(fails))
        sys.exit(1)
    print("PASS")


if __name__ == "__main__":
    main()
