"""v87: run it yourself after a catch, prize powers, the mini golf ball, gorilla tag start buttons, duck eyes.

Usage: python tests/v87.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

CATCH = """([move]) => {
  const fd = window.__fd, L = fd.LEVELS[29], I = L.fbInternals, S = I.S, dt = 1 / 60;
  L.update = () => {}; S.runCatch = true;
  for (let tries = 0; tries < 12; tries++) {
    I.startGame(); I.choosePlay(2); fd.myHead.pos.set(fd.dolly.position.x, 1.6, fd.dolly.position.z); I.hike();
    for (let t = 0; t < 1.6 && S.phase === 'live'; t += dt) I.step(dt);
    const r = I.REC[1], p = I.routeAt(r, S.snapT + 0.5, [0, 0]);
    fd.state.yaw = Math.atan2(-(p[0] - fd.myHead.pos.x), -(p[1] - fd.myHead.pos.z));
    fd.camera.rotation.set(0, fd.state.yaw, 0, 'YXZ'); fd.dolly.updateMatrixWorld(true);
    I.throwFlat(0.2);
    let g = 0; while (S.phase === 'air' && g++ < 600) I.step(dt);
    if (S.phase !== 'yac') continue;
    const c = S.catcher, out = { self: !!c.self, at: [+c.x.toFixed(1), +c.z.toFixed(1)], head: [+fd.myHead.pos.x.toFixed(1), +fd.myHead.pos.z.toFixed(1)], hidden: !c.g.visible };
    const ballOn = S.ballOn;
    g = 0;
    while (S.phase === 'yac' && g++ < 1200) {
      if (move) { const sp = 9 * dt; fd.myHead.pos.z -= sp; fd.dolly.position.z -= sp; fd.myHead.pos.x += (0 - fd.myHead.pos.x) * 0.02; }
      I.step(dt);
    }
    out.msg = S.msg; out.gain = ballOn - S.ballOn + (S.msg.startsWith('TOUCHDOWN') ? 100 : 0);
    return out;
  }
  return null;
}"""


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

        # ---- football: I take over the receiver after the catch
        go(29)
        run = page.evaluate(CATCH, [True])
        print("football, running it myself:", run)
        check(run and run["self"] and abs(run["at"][0] - run["head"][0]) < 0.3 and abs(run["at"][1] - run["head"][1]) < 0.3, f"football: didn't take over the receiver {run}")
        check(run and run["gain"] > 12, f"football: running downfield didn't gain {run}")
        stand = page.evaluate(CATCH, [False])
        print("football, standing still:", stand)
        check(stand and stand["self"] and stand["msg"].startswith("You for") and stand["gain"] >= 2, f"football: standing still {stand}")

        # ---- prizes: switch them on, and they do things
        go(31)
        pz = page.evaluate("""() => { const fd = window.__fd, L = fd.LEVELS[31], S = L.skeeSave; S.tickets = 5000; S.owned = [];
          const presses = (id) => { const b = L.buttons.find((x) => x.label.toLowerCase().startsWith(id)); b.onPress(b); };
          ['rubber', 'teddy', 'toy', 'wind', 'golden'].forEach(presses);
          const on1 = window.__fd.prizeFx ? 1 : 0;
          const t0 = S.tickets; L.addTickets(8); const duckT = S.tickets - t0;
          presses('teddy'); const bearOff = !fd.prizeFx.isOn('bear'); presses('teddy');
          return { owned: S.owned.length, mask: fd.prizeFx.mask(), duckT, bearOff, tickets: S.tickets }; }""")
        page.wait_for_timeout(1500)
        pets = page.evaluate("() => { const M = window.__fd.prizeFx.mine; return { bear: !!(M.bear && M.bear.g.visible), robot: !!(M.robot && M.robot.g.visible), bubble: !!(M.bubble) }; }")
        print("prizes:", pz, pets)
        check(pz["owned"] == 5 and pz["mask"] == 31 and pz["duckT"] == 10 and pz["bearOff"], f"prizes {pz}")
        check(pets["bear"] and pets["robot"], f"prize pets {pets}")
        fw = page.evaluate("() => { const fd = window.__fd; fd.prizeFx.fireworks(); return fd.prizeFx.rockets(); }")
        check(fw == 3, f"fireworks {fw}")
        page.evaluate("() => { const fd = window.__fd, S = fd.LEVELS[31].skeeSave; S.owned = []; fd.prizeFx.IDS.forEach((id) => fd.prizeFx.setOn(id, false)); }")

        # ---- gorilla tag: the start buttons start a round
        go(58)
        gt = page.evaluate("() => { const L = window.__fd.LEVELS[58], bs = L.buttons.filter((b) => b.label === 'Start round'); bs[0].onPress(bs[0]); return { n: bs.length, ph: L.gtInternals.S.ph }; }")
        print("gorilla:", gt)
        check(gt == {"n": 2, "ph": "play"}, f"gorilla start buttons {gt}")

        # ---- duck shoot: every duck has an eye on each side
        go(44)
        eyes = page.evaluate("""() => { const L = window.__fd.LEVELS[44]; let n = 0, both = 0; L.group.traverse((o) => { if (o.isGroup && o.children.some((c) => c.geometry && c.geometry.type === 'ConeGeometry')) { const z = o.children.filter((c) => c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius === 0.015).map((c) => Math.sign(c.position.z)); if (z.length) { n++; if (z.includes(1) && z.includes(-1)) both++; } } }); return [n, both]; }""")
        print("duck eyes:", eyes)
        check(eyes[0] > 0 and eyes[0] == eyes[1], f"duck eyes {eyes}")

        # ---- mini golf: the smaller, dimpled ball turns as it rolls
        go(6)
        mg = page.evaluate("""() => { const L = window.__fd.LEVELS[6]; let ball = null; L.group.traverse((o) => { if (o.isMesh && o.geometry.type === 'SphereGeometry' && Math.abs(o.geometry.parameters.radius - 0.027) < 1e-4 && o.material.map) ball = ball || o; });
          return ball ? { r: ball.geometry.parameters.radius } : null; }""")
        print("mini golf ball:", mg)
        check(mg and mg["r"] < 0.03, f"mini golf ball {mg}")

        check(not errors, f"page errors {errors}")
        browser.close()
    print("\n".join(fails) if fails else "\nv87 checks passed")
    return not fails


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
