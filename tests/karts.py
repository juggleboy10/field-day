"""Go karts extras: jump ramps, drifting with a mini-turbo, coins, beach balls, and the new items.

Drives the real kart code a step at a time: up a ramp into the air (and a boost on landing), a held drift that
charges and fires a mini-turbo, picking up a coin, bouncing off a beach ball, a Superstar shrugging off a hit,
and a triple turbo lasting three uses.

Usage: python tests/karts.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

RUN = """() => { const fd = window.__fd, L = fd.LEVELS[9], K = L.K, tr = L.track, X = L.extras, out = {};
  const put = (i, lat, speed) => { const p = tr.P[i], n = tr.NR[i]; K.x = p.x + n.x * lat; K.z = p.z + n.z * lat; K.yaw = Math.atan2(-tr.T[i].x, -tr.T[i].z); K.speed = speed; K.idx = i; K.steer = 0; K.spinT = 0; K.boostT = 0; K.drift = 0; K.airT = 0; };
  const step = (secs, keys) => { Object.assign(fd.state.keys, { KeyW: false, KeyA: false, KeyD: false, ShiftLeft: false }, keys || {}); let now = performance.now(); for (let k = 0; k < secs * 60; k++) { now += 1000 / 60; L.update(1 / 60, now); } };
  out.counts = { ramps: X.RAMPS.length, balls: X.HAZ.length, coins: X.COINS.length };
  // a ramp at speed: into the air, and a boost on a big landing
  const R = X.RAMPS[0]; put((R.i - Math.round(8 / (tr.TLEN / tr.N)) + tr.N) % tr.N, 0, 16);
  let maxAir = 0, maxY = 0, boosted = false; Object.assign(fd.state.keys, { KeyW: true });
  let now = performance.now();
  for (let k = 0; k < 120; k++) { now += 1000 / 60; L.update(1 / 60, now); maxAir = Math.max(maxAir, K.airT); maxY = Math.max(maxY, L.kartY(K, now)); if (K.boostT > 0 && maxAir > 0 && K.airT === 0) boosted = true; }
  out.ramp = { maxAir: +maxAir.toFixed(2), maxY: +maxY.toFixed(2), boosted };
  // drift: hold shift and steer for two seconds, then let go
  put(0, 0, 15); step(0.1, { KeyW: true });
  step(2.0, { KeyW: true, KeyD: true, ShiftLeft: true }); const drifting = K.drift, charge = +K.driftT.toFixed(2);
  step(0.05, { KeyW: true }); out.drift = { drifting, charge, boost: +K.boostT.toFixed(2) };
  // a coin
  K.coins = 0; const c = X.COINS[3]; c.back = 0; K.x = c.x; K.z = c.z; K.idx = -1; K.idx = 0; step(0.05, {}); out.coins = K.coins;
  // a beach ball
  const H = X.HAZ[0]; step(0.02, {}); K.x = H.x + 0.5; K.z = H.z; K.speed = 14; K.hazT = 0; K.airT = 0; step(0.02, {}); out.ball = { speed: +K.speed.toFixed(1), dist: +Math.hypot(K.x - H.x, K.z - H.z).toFixed(2) };
  // superstar: hits bounce off; a hit without it spins you and costs coins
  K.coins = 5; K.starT = 3; K.spinT = 0; L.itemsInternals.hitMe('test'); out.star = { spun: K.spinT > 0 };
  K.starT = 0; K.shieldT = 0; L.itemsInternals.hitMe('test'); out.hit = { spun: K.spinT > 0, coins: K.coins };
  // triple turbo: three uses
  fd.state.keys.KeyW = false; K.spinT = 0; K.item = 'triple'; K.tripleLeft = 3; K.roll = 0; let uses = 0; while (K.item && uses < 5) { L.useItem(); uses++; }
  out.triple = uses;
  fd.state.keys.KeyW = false; fd.state.keys.KeyD = false; fd.state.keys.ShiftLeft = false;
  return out; }"""


def main():
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
        page.evaluate("() => window.__fd.switchLevel(9)")
        page.locator("#btn-flat").click()
        page.wait_for_timeout(1500)
        res = page.evaluate(RUN)
        print(res)
        browser.close()
    checks = [
        ("two ramps, two beach balls, plenty of coins", res["counts"]["ramps"] == 2 and res["counts"]["balls"] == 2 and res["counts"]["coins"] >= 20),
        ("a ramp at speed sends you flying and lands with a boost", res["ramp"]["maxY"] > 1.0 and res["ramp"]["boosted"]),
        ("a two-second drift charges and fires a mini-turbo", res["drift"]["drifting"] == 1 and res["drift"]["charge"] > 1.8 and res["drift"]["boost"] > 1.0),
        ("driving through a coin collects it", res["coins"] == 1),
        ("a beach ball bounces you off and slows you", res["ball"]["speed"] < 9 and res["ball"]["dist"] > 1.9),
        ("a superstar shrugs off a hit", not res["star"]["spun"]),
        ("a hit without one spins you and drops coins", res["hit"]["spun"] and res["hit"]["coins"] == 2),
        ("a triple turbo lasts three uses", res["triple"] == 3),
    ]
    ok = not errors
    for label, good in checks:
        print(("PASS " if good else "FAIL ") + label)
        ok = ok and good
    if errors:
        print("page errors:", errors[:5])
    print("kart checks passed" if ok else "kart checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
