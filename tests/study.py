"""The Study Hall games (v79) play properly. Each section is one game.

Usage: python tests/study.py [game ...]   (THREE_JS=/path/to/three.min.js to serve three.js locally)
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

        aim = """(p) => { const fd = window.__fd, h = new window.THREE.Vector3(); fd.camera.getWorldPosition(h);
              const d = new window.THREE.Vector3().subVectors(p, h); fd.state.yaw = Math.atan2(-d.x, -d.z); fd.state.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); }"""
        # ---- the clubhouse door and wing
        if want("hub"):
            go(8)
            page.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(0, 0, 0); const h = new window.THREE.Vector3(); fd.camera.getWorldPosition(h); fd.dolly.position.x -= h.x; fd.dolly.position.z += 3 - h.z; fd.state.yaw = 0; fd.state.pitch = 0.05; }")
            page.wait_for_timeout(1200)
            shot("hub_doors")
            page.evaluate("() => window.__fd.LEVELS[8].enterWing(8)")
            page.wait_for_timeout(1500)
            shot("hub_study")
            w = page.evaluate("() => { const L = window.__fd.LEVELS[8]; return { doors: L.doors.length, games: L.portals.filter((p) => p.kind === 'game' && p.ci === 8).map((p) => p.lv) }; }")
            check(w["doors"] == 9 and sorted(w["games"]) == [48, 49, 50, 51, 52, 53, 54], f"hub: study wing {w}")
        # ---- the A+ question bank
        if want("bank"):
            go(48)
            bk = page.evaluate("""() => { const A = window.__fd.APLUS, out = { n: A.Q.length, bad: [], per: {} };
              for (const q of A.Q) { out.per[q[0]] = (out.per[q[0]] || 0) + 1; if (!A.DOMAINS[q[0]] || q[2].length !== 4 || q[3] !== 0 || new Set(q[2]).size !== 4 || !q[4]) out.bad.push(q[1]); }
              const seen = new Set(); for (const q of A.Q) { if (seen.has(q[1])) out.bad.push('dup: ' + q[1]); seen.add(q[1]); }
              // the exam mix follows the domain weights roughly; weak spots lean to what you miss
              let r = 1; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
              const c = { c1: 0, c2: 0 }; for (let i = 0; i < 2000; i++) c[A.next('mix', rnd, []).d.slice(0, 2)]++;
              out.mix = c; const one = A.next('c1', rnd, []); out.c1 = one.d; out.right = one.a[one.c] !== undefined;
              return out; }""")
            print("A+ bank:", {k: bk[k] for k in ("n", "per", "mix", "c1")}, "bad:", bk["bad"][:5])
            check(not bk["bad"], f"bank: malformed questions {bk['bad'][:5]}")
            check(bk["n"] >= 100 and all(v >= 8 for v in bk["per"].values()) and len(bk["per"]) == 9, f"bank: too few questions {bk['per']}")
            check(800 < bk["mix"]["c1"] < 1200 and bk["c1"].startswith("c1"), f"bank: mode mix {bk}")
        # ---- Quiz Blaster
        if want("quiz"):
            go(48)
            shot("quiz_menu")
            # pick a mode by aiming at its card and clicking
            page.evaluate(f"() => ({aim})(window.__fd.LEVELS[48].qbInternals.deck.cards[0].grp.position)")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__fd.LEVELS[48].deskFire()")
            page.wait_for_timeout(600)
            qb = page.evaluate("() => { const S = window.__fd.LEVELS[48].qbInternals.S; return { ph: S.ph, mode: S.mode, n: S.n, d: S.q && S.q.d }; }")
            print("Quiz start:", qb)
            check(qb["ph"] == "ask" and qb["mode"] == "c1" and qb["d"].startswith("c1"), f"quiz: aiming at Core 1 didn't start it {qb}")
            shot("quiz_ask")
            # answer: right with the 1-4 keys, wrong by aiming
            r1 = page.evaluate("() => { const I = window.__fd.LEVELS[48].qbInternals; return I.S.q.c; }")
            page.keyboard.press(f"Digit{r1 + 1}")
            page.wait_for_timeout(400)
            shot("quiz_right")
            st = page.evaluate("() => { const S = window.__fd.LEVELS[48].qbInternals.S; return { ph: S.ph, score: S.score, right: S.right }; }")
            check(st["ph"] == "reveal" and st["right"] == 1 and st["score"] >= 100, f"quiz: right answer {st}")
            page.wait_for_timeout(900)
            page.evaluate("() => window.__fd.LEVELS[48].deskFire()")   # next question (aimed anywhere)
            page.wait_for_timeout(300)
            wrong = page.evaluate("() => { const I = window.__fd.LEVELS[48].qbInternals; return (I.S.q.c + 1) % 4; }")
            page.evaluate(f"() => ({aim})(window.__fd.LEVELS[48].qbInternals.deck.cards[{wrong}].grp.position)")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__fd.LEVELS[48].deskFire()")
            page.wait_for_timeout(500)
            shot("quiz_wrong")
            st = page.evaluate("() => { const S = window.__fd.LEVELS[48].qbInternals.S; return { ph: S.ph, n: S.n, right: S.right, pick: S.pick, streak: S.streak }; }")
            check(st["ph"] == "reveal" and st["right"] == 1 and st["pick"] == wrong and st["streak"] == 0, f"quiz: wrong answer {st}")
            # play out the round
            end = page.evaluate("""() => { const fd = window.__fd, I = fd.LEVELS[48].qbInternals, S = I.S;
              while (S.ph !== 'menu') { if (S.ph === 'reveal') I.nextQuestion(); else I.answer(S.q.c); }
              return { right: S.right, score: S.score, sum: S.summary, rec: fd.RECORDS ? JSON.stringify(fd.state && Object.keys(window.__fd.LEVELS[48].recDefs)) : '', log: JSON.stringify(window.__fd.APLUS.log().dom) }; }""")
            print("Quiz end:", end["right"], end["score"], end["log"])
            check(end["right"] == 11 and end["sum"]["right"] == 11, f"quiz: round end {end}")
            page.wait_for_timeout(800)
            shot("quiz_end")
            page.evaluate("() => { const fd = window.__fd; fd.dolly.position.set(0, 0, 0); fd.state.yaw = -Math.PI / 2; fd.state.pitch = 0; }")
            page.evaluate(f"() => ({aim})(new window.THREE.Vector3(5.9, 2.0, -1.4))")
            page.wait_for_timeout(800)
            shot("quiz_report")
        # ---- Port & Cable Sorter
        if want("sort"):
            go(49)
            shot("sort_menu")
            # browser: pick "Protocol -> port" by aiming at its bin label
            page.evaluate(f"() => ({aim})(window.__fd.LEVELS[49].sortInternals.deck.cards[1].grp.position)")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__fd.LEVELS[49].deskFire()")
            page.wait_for_timeout(1500)
            so = page.evaluate("() => { const I = window.__fd.LEVELS[49].sortInternals; return { ph: I.S.ph, mode: I.S.mode, item: I.C.item, st: I.C.st }; }")
            print("Sorter start:", so)
            check(so["ph"] == "play" and so["mode"] == "proto" and so["item"] and so["item"]["a"].startswith("Port"), f"sort: didn't start protocol->port {so}")
            shot("sort_play")
            # the right bin by key; then a thrown crate (VR-style) into a wrong bin
            page.keyboard.press(f"Digit{so['item']['c'] + 1}")
            page.wait_for_timeout(2000)
            so2 = page.evaluate("""() => { const I = window.__fd.LEVELS[49].sortInternals, S = I.S, C = I.C; const out = { score: S.score, st: C.st };
              const realU = window.__fd.LEVELS[49].update; window.__fd.LEVELS[49].update = () => {};
              if (C.st !== 'belt') I.newCrate();
              const w = (C.item.c + 1) % 4; const x = [-1.2, -0.4, 0.4, 1.2][w];
              C.st = 'fly'; C.p.set(x, 1.3, 0.9); C.v.set(0, 1.0, -1.2);
              for (let n = 0; n < 600 && C.st === 'fly'; n++) I.flyStep(0.004);
              out.after = { score: S.score, wrong: S.wrong, st: C.st }; window.__fd.LEVELS[49].update = realU; return out; }""")
            print("Sorter:", so2)
            check(so2["score"] == 1, f"sort: the right bin didn't score {so2}")
            check(so2["after"]["wrong"] == 1 and so2["after"]["st"] == "done", f"sort: a thrown crate didn't land in the bin {so2}")
            page.wait_for_timeout(1500)
            shot("sort_after")
            en = page.evaluate("() => { const I = window.__fd.LEVELS[49].sortInternals; I.endRound(); return { ph: I.S.ph, sum: I.S.summary }; }")
            check(en["ph"] == "menu" and en["sum"]["score"] == 1, f"sort: end {en}")
        # ---- PC Build Bench
        if want("pc"):
            go(50)
            shot("pc_idle")
            page.evaluate(f"() => ({aim})(window.__fd.LEVELS[50].pcInternals.deck.cards[0].grp.position)")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__fd.LEVELS[50].deskFire()")
            page.wait_for_timeout(300)
            pc = page.evaluate("() => { const I = window.__fd.LEVELS[50].pcInternals; return { ph: I.S.ph, mode: I.S.mode }; }")
            check(pc["ph"] == "build" and pc["mode"] == "guided", f"pc: the guided card didn't start a build {pc}")
            # browser: click the CPU before the strap -> a zap
            clickp = """(id) => { const fd = window.__fd, I = fd.LEVELS[50].pcInternals; ({aim})(I.P[id].mesh.position); }""".replace("{aim}", aim)
            clicks = """(id) => { const fd = window.__fd, I = fd.LEVELS[50].pcInternals; const s = I.SLOTS.find((x) => x.id === id); ({aim})(I.slotPos(s, new window.THREE.Vector3())); }""".replace("{aim}", aim)
            def click_part(pid):
                page.evaluate(f"({clickp})('{pid}')"); page.wait_for_timeout(250); page.evaluate("() => window.__fd.LEVELS[50].deskFire()"); page.wait_for_timeout(250)
            def click_slot(sid):
                page.evaluate(f"({clicks})('{sid}')"); page.wait_for_timeout(250); page.evaluate("() => window.__fd.LEVELS[50].deskFire()"); page.wait_for_timeout(250)
            click_part("cpu"); click_slot("socket")
            z = page.evaluate("() => { const S = window.__fd.LEVELS[50].pcInternals.S; return { m: S.mistakes, cpu: S.cpu, msg: S.msg }; }")
            check(z["m"] == 1 and not z["cpu"] and "strap" in z["msg"], f"pc: no strap should zap {z}")
            click_part("strap"); click_part("cpu")
            shot("pc_holding")
            click_slot("socket")
            # the wrong RAM, the cooler before paste, then the rest the right way round
            st = page.evaluate("""() => { const I = window.__fd.LEVELS[50].pcInternals, S = I.S, P = I.P; const out = { cpu: S.cpu };
              const bad = ['ramA', 'ramB', 'ramC'].find((k) => P[k].gen !== S.gen), good = ['ramA', 'ramB', 'ramC'].filter((k) => P[k].gen === S.gen);
              const L = window.__fd.LEVELS[50]; const m0 = S.mistakes; L.pickUp(bad); out.badFit = L.fit('dimm1'); out.badMsg = S.msg; out.dm = S.mistakes - m0;
              L.pickUp('cooler'); out.coolerFirst = window.__fd.LEVELS[50].fit('socket'); out.cm = S.mistakes - m0;
              const m1 = S.mistakes; I.powerOn(); out.powerMsg = S.msg; out.pm = S.mistakes - m1;
              for (const [p, s] of [['paste', 'socket'], ['cooler', 'socket'], [good[0], 'dimm1'], [good[1], 'dimm2'], ['ssd', 'm2'], ['gpu', 'pcie'], ['atx', 'atx']]) { L.pickUp(p); out[p + s] = L.fit(s); }
              I.powerOn(); out.noEps = S.msg;
              L.pickUp('eps'); out.eps = L.fit('eps');
              return out; }""")
            print("PC build:", st)
            check(st["cpu"] and st["dm"] == 1 and "DDR" in st["badMsg"], f"pc: the wrong RAM fitted {st}")
            check(st["cm"] == 2 and not st["coolerFirst"], f"pc: cooler before paste {st}")
            check("Nothing at all" in st["powerMsg"], f"pc: power with no 24-pin {st}")
            check(all(st[k] for k in ("pastesocket", "coolersocket", "ssdm2", "gpupcie", "atxatx", "eps")) and "8-pin" in st["noEps"], f"pc: fitting parts {st}")
            page.wait_for_timeout(500)
            shot("pc_built")
            # the power button, aimed and clicked
            page.evaluate(f"() => ({aim})(window.__fd.LEVELS[50].buttons.find((b) => b.label === 'Power').pos)")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__fd.LEVELS[50].deskFire()")
            page.wait_for_timeout(1200)
            done = page.evaluate("() => { const S = window.__fd.LEVELS[50].pcInternals.S; return { ph: S.ph, posted: S.posted, total: S.total, best: S.best }; }")
            print("PC done:", done)
            check(done["ph"] == "done" and done["posted"] and done["best"].get("guided"), f"pc: power on {done}")
            page.evaluate("() => window.__fd.LEVELS[50].spawn()")
            page.wait_for_timeout(600)
            shot("pc_post")
        # ---- Help Desk Tickets
        if want("desk"):
            go(51)
            shot("desk_idle")
            page.keyboard.press("Digit2")   # Core 1 only
            page.wait_for_timeout(300)
            page.evaluate("() => { const c = window.__fd.LEVELS[51].deskInternals.cust; c.x = 0.05; c.z = -1.0; }")
            page.wait_for_timeout(1200)
            hd = page.evaluate("() => { const S = window.__fd.LEVELS[51].deskInternals.S; return { ph: S.ph, kind: S.kind, d: S.tk && S.tk[0], opts: S.opts }; }")
            print("Desk:", {k: hd[k] for k in ("ph", "kind", "d")})
            check(hd["ph"] == "ask" and hd["kind"] == "c1" and hd["d"].startswith("c1"), f"desk: a Core 1 shift didn't reach a question {hd}")
            shot("desk_ask")
            # touch-style answer: aim at the right card and click
            page.evaluate(f"() => {{ const I = window.__fd.LEVELS[51].deskInternals; ({aim})(I.deck.cards[I.S.opts.c].grp.position); }}")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__fd.LEVELS[51].deskFire()")
            page.wait_for_timeout(300)
            r = page.evaluate("() => { const S = window.__fd.LEVELS[51].deskInternals.S; return { ph: S.ph, right: S.right, score: S.score }; }")
            check(r["ph"] == "reveal" and r["right"] == 1, f"desk: aimed right answer {r}")
            page.wait_for_timeout(900)
            page.keyboard.press("Digit1")   # carry on to the fix question
            page.wait_for_timeout(300)
            r2 = page.evaluate("() => { const S = window.__fd.LEVELS[51].deskInternals.S; return { ph: S.ph, step: S.step, prompt: S.opts.prompt }; }")
            check(r2["ph"] == "ask" and r2["step"] == 1, f"desk: didn't move to the fix question {r2}")
            page.evaluate("() => { const I = window.__fd.LEVELS[51].deskInternals; I.answer((I.S.opts.c + 1) % 4); }")
            page.wait_for_timeout(600)
            shot("desk_fix")
            end = page.evaluate("""() => { const I = window.__fd.LEVELS[51].deskInternals, S = I.S, c = I.cust; let n = 0;
              while (S.ph !== 'idle' && n++ < 200) { if (S.ph === 'ask') I.answer(S.opts.c); else if (S.ph === 'reveal') I.advance(); else { c.x = c.tx; c.z = c.tz; window.__fd.LEVELS[51].update(0.016, performance.now()); } }
              return { sum: S.summary, n: S.list.length, tk: I.TICKETS.length, bad: I.TICKETS.filter((t) => !window.__fd.APLUS.DOMAINS[t[0]] || t[2][1].length !== 4 || t[3][1].length !== 4 || !t[4]).length }; }""")
            print("Desk end:", end)
            check(end["sum"] and end["sum"]["right"] == end["n"] * 2 - 1 and end["bad"] == 0 and end["tk"] >= 20, f"desk: shift end {end}")
        # ---- Command Line Dojo
        if want("dojo"):
            go(52)
            shot("dojo_menu")
            page.keyboard.press("Digit3")   # both
            page.wait_for_timeout(2500)
            dj = page.evaluate("() => { const I = window.__fd.LEVELS[52].dojoInternals, S = I.S; return { ph: S.ph, mode: S.mode, c: S.c, task: S.task, opts: S.opts.map((o) => o[0] + ':' + o[2]), z: I.blk.map((b) => b.z), st: I.blk.map((b) => b.st) }; }")
            print("Dojo:", dj)
            check(dj["ph"] == "play" and dj["mode"] == "mix" and len(set(o.split(':')[0] for o in dj["opts"])) == 2, f"dojo: Both mode should offer both OSes {dj}")
            shot("dojo_play")
            page.evaluate(f"() => {{ const I = window.__fd.LEVELS[52].dojoInternals; ({aim})(I.deck.cards[I.S.c].grp.position); }}")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__fd.LEVELS[52].deskFire()")
            page.wait_for_timeout(500)
            shot("dojo_hit")
            r = page.evaluate("() => { const S = window.__fd.LEVELS[52].dojoInternals.S; return { score: S.score, strikes: S.strikes, lines: S.lines }; }")
            print("Dojo hit:", r)
            check(r["score"] == 1 and r["strikes"] == 0 and dj["task"][2] in r["lines"][-2], f"dojo: aimed strike {r}")
            # three wrong strikes end it
            end = page.evaluate("""() => { const I = window.__fd.LEVELS[52].dojoInternals, S = I.S, L = window.__fd.LEVELS[52]; let n = 0;
              while (S.ph !== 'menu' && n++ < 80) { if (S.ph === 'gap') { S.gap = 0; L.update(0.016, performance.now()); } else if (S.ph === 'play' && S.readT > 0) { S.readT = 0.001; L.update(0.016, performance.now()); } else if (S.ph === 'play') I.strike((S.c + 1) % 3); }
              return { sum: S.summary, belt: I.beltOf(31)[1], groups: I.CMDS.length }; }""")
            print("Dojo end:", end)
            check(end["sum"] and end["sum"]["score"] == 1 and end["belt"] == "Black" and end["groups"] >= 40, f"dojo: end {end}")
            # a miss when the timer runs out
            ms = page.evaluate("""() => { const I = window.__fd.LEVELS[52].dojoInternals, S = I.S; I.startRound('lin'); I.missed(); return { strikes: S.strikes, ph: S.ph, line: S.lines[S.lines.length - 1] }; }""")
            check(ms["strikes"] == 1 and ms["ph"] == "gap" and "Too slow" in ms["line"], f"dojo: miss {ms}")
        # ---- Math Sprint
        if want("math"):
            go(53)
            shot("math_menu")
            mp = page.evaluate("""() => { const I = window.__fd.LEVELS[53].mathInternals, out = { bad: [] };
              for (const m of ['add', 'times', 'mix', 'bin']) for (let i = 0; i < 300; i++) {
                const p = I.problem(m); const all = [p.a].concat(p.wrong);
                if (p.wrong.length !== 3 || new Set(all).size !== 4 || all.some((x) => x === '' || /NaN|undefined|-/.test(x))) out.bad.push(m + ': ' + p.q + ' ' + all.join(','));
                // check the answers really are right
                let v = null; const q = p.q.replace('\u2212', '-').replace('\u00D7', '*').replace('\u00F7', '/');
                if (/^\d+ [-+*/] \d+$/.test(q)) v = String(eval(q));
                else if (/^(\d+)\u00B2$/.test(q)) v = String(Number(q.slice(0, -1)) ** 2);
                else if (/% of/.test(q)) { const [a, b] = q.split('% of '); v = String(Number(a) * Number(b) / 100); }
                else if (/ in binary$/.test(q)) v = Number(q.split(' ')[0]).toString(2);
                else if (/\u2082 in decimal$/.test(q)) v = String(parseInt(q.split('\u2082')[0], 2));
                else if (/^0x/.test(q)) v = String(parseInt(q.split(' ')[0], 16));
                else if (/ in hex$/.test(q)) v = Number(q.split(' ')[0]).toString(16).toUpperCase();
                else if (/ of /.test(q)) { const [w, n] = q.split(' of '); v = String(Number(n) / { 'Half': 2, 'A third': 3, 'A quarter': 4, 'A fifth': 5 }[w]); }
                if (v === null || v !== p.a) out.bad.push('wrong answer: ' + p.q + ' = ' + p.a + ' (' + v + ')');
              }
              return out; }""")
            print("Math problems bad:", mp["bad"][:5])
            check(not mp["bad"], f"math: bad problems {mp['bad'][:5]}")
            page.keyboard.press("Digit2")
            page.wait_for_timeout(3600)   # (three seconds to get ready)
            shot("math_play")
            got = 0
            for _ in range(4):
                page.evaluate(f"() => {{ const I = window.__fd.LEVELS[53].mathInternals; ({aim})(I.deck.cards[I.S.c].grp.position); }}")
                page.wait_for_timeout(250)
                page.evaluate("() => window.__fd.LEVELS[53].deskFire()")
                page.wait_for_timeout(150)
            ms = page.evaluate("() => { const I = window.__fd.LEVELS[53].mathInternals, S = I.S; const out = { score: S.score, mode: S.mode }; I.answer((S.c + 1) % 4); out.lock = S.lock; out.wrong = S.wrong; return out; }")
            print("Math:", ms)
            check(ms["score"] == 4 and ms["mode"] == "times" and ms["lock"] > 1 and ms["wrong"] == 1, f"math: answering {ms}")
            page.wait_for_timeout(300)
            shot("math_wrong")
            en = page.evaluate("() => { const I = window.__fd.LEVELS[53].mathInternals; I.S.t0 -= 61000; window.__fd.LEVELS[53].update(0.016, performance.now()); return { ph: I.S.ph, sum: I.S.summary }; }")
            check(en["ph"] == "menu" and en["sum"]["score"] == 4, f"math: end {en}")
        # ---- Trigger Words
        if want("trig"):
            go(54)
            shot("trig_menu")
            tw = page.evaluate("""() => { const T = window.TRIGGERS || null; const L = window.__fd.LEVELS[54], I = L.trigInternals; const out = {};
              const all = I.pool(); out.n = all.length; const keys = new Set(all.map((t) => t[1])); out.dupes = all.length - keys.size;
              out.bad = all.filter((t) => t.length < 4 || !t[2] || (t[3] !== 'who' && t[3] !== 'what')).map((t) => t[1]);
              return out; }""")
            print("Triggers:", tw)
            check(tw["n"] >= 150 and tw["dupes"] == 0 and not tw["bad"], f"triggers: bank {tw}")
            page.keyboard.press("Digit1")   # buzz & recall
            page.wait_for_timeout(400)
            shot("trig_clue")
            page.keyboard.press("Space")   # buzz in
            page.wait_for_timeout(400)
            shot("trig_reveal")
            r = page.evaluate("() => { const S = window.__fd.LEVELS[54].trigInternals.S; return { ph: S.ph, buzzed: S.buzzed, key: S.t[1] }; }")
            check(r["ph"] == "reveal" and r["buzzed"], f"triggers: Space didn't buzz {r}")
            page.keyboard.press("Digit2")   # missed it
            page.wait_for_timeout(300)
            sr = page.evaluate("""(k) => { const I = window.__fd.LEVELS[54].trigInternals, m = I.mem(); const out = { box: m.c[k][0], n: m.n };
              // a missed one comes back within a few reviews; a known one goes quiet
              const seenAt = []; for (let i = 0; i < 12; i++) { if (I.S.ph !== 'clue') break; seenAt.push(I.S.t[1]); I.reveal(true); I.judge(I.S.t[1] !== k); }
              out.back = seenAt.indexOf(k, 1); out.seq = seenAt.length; out.boxAfter = m.c[k][0]; I.finish(); out.ph = I.S.ph; return out; }""", r["key"])
            print("Spaced repetition:", sr)
            check(sr["box"] == 1 and 0 < sr["back"] <= 6 and sr["ph"] == "menu", f"triggers: spaced repetition {sr}")
            page.keyboard.press("Digit2")   # rapid fire
            page.wait_for_timeout(300)
            shot("trig_rapid")
            rf = page.evaluate("() => { const I = window.__fd.LEVELS[54].trigInternals, S = I.S; for (let i = 0; i < 5; i++) I.onPick(S.c); const out = { score: S.score }; I.onPick((S.c + 1) % 4); out.lock = S.lock; S.t0 -= 61000; window.__fd.LEVELS[54].update(0.016, performance.now()); out.ph = S.ph; out.sum = S.summary; return out; }")
            print("Rapid:", rf)
            check(rf["score"] == 5 and rf["lock"] > 0 and rf["ph"] == "menu" and rf["sum"]["score"] == 5, f"triggers: rapid fire {rf}")
            page.keyboard.press("Digit3")   # change category
            page.wait_for_timeout(300)
            cat = page.evaluate("() => window.__fd.LEVELS[54].trigInternals.S.cat")
            check(cat == 0, f"triggers: category card {cat}")
            page.evaluate("() => { const fd = window.__fd; fd.state.yaw = -Math.PI / 2; fd.state.pitch = 0; }")
            page.wait_for_timeout(600)
            shot("trig_progress")
        if errors:
            fails.append("page errors: " + "; ".join(errors[:5]))
        browser.close()
    if fails:
        print("FAIL\n  " + "\n  ".join(fails))
        sys.exit(1)
    print("PASS")


if __name__ == "__main__":
    main()
