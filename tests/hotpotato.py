"""Harvest Hot Potato: plays real rounds against the bots in a browser, with the fuse shortened.

Checks that the round runs from the countdown to a single winner and starts again, that one player pops
per potato, that pressing Space while you hold the potato throws it to someone, and that you stay on
your spot while it's on.

Usage: python tests/hotpotato.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

SNAP = """
() => {
  const fd = window.__fd, L = fd.LEVELS[18], I = L.potatoInternals, RS = I.RS, me = fd.state.myPeer;
  const k = RS.order.indexOf(me), n = RS.order.length;
  let off = null;
  if (k >= 0 && RS.alive.includes(me)) { const s = I.spotPos(k, n, new THREE.Vector3()); off = Math.hypot(fd.dolly.position.x - s.x, fd.dolly.position.z - s.z); }
  return { round: RS.round, ph: RS.ph, n, alive: RS.alive.length, holder: RS.holder === me ? 'me' : RS.holder, flying: !!RS.fl,
           popSeq: RS.popSeq, winner: RS.winner === me ? 'me' : RS.winner, imIn: RS.alive.includes(me), off };
}
"""


def main():
    ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1000, "height": 700})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(18)")
        page.locator("#btn-flat").click()
        page.evaluate("() => { const F = window.__fd.LEVELS[18].potatoInternals.FUSE; F[0] = 1800; F[1] = 2600; }")

        rounds, pops_by_round, winners = set(), {}, {}
        throws_tried = throws_done = 0
        worst_off = 0.0
        waiting_throw = None
        t_end = time.time() + 120
        while time.time() < t_end:
            s = page.evaluate(SNAP)
            rounds.add(s["round"])
            pops_by_round.setdefault(s["round"], set()).add(s["popSeq"])
            if s["ph"] == "over":
                winners[s["round"]] = (s["winner"], s["n"])
            if s["ph"] == "play" and s["off"] is not None:
                worst_off = max(worst_off, s["off"])
            if waiting_throw and (s["holder"] != "me" or s["flying"]):
                throws_done += 1
                waiting_throw = None
            elif waiting_throw and time.time() - waiting_throw > 2.5:
                print("   a throw didn't happen")
                waiting_throw = None
            if s["holder"] == "me" and not s["flying"] and not waiting_throw:
                time.sleep(0.35)          # a moment in hand, as a person would
                page.keyboard.press("Space")
                throws_tried += 1
                waiting_throw = time.time()
            if len(winners) >= 2 and throws_done >= 2:
                break
            time.sleep(0.1)

        print(f"rounds seen: {sorted(rounds)}")
        for r, (w, n) in sorted(winners.items()):
            pops = len([x for x in pops_by_round.get(r, set())])
            print(f"round {r}: {n} players, winner {w}")
        print(f"your throws: {throws_done} of {throws_tried} went")
        print(f"furthest you drifted from your spot during play: {worst_off:.2f} m")
        if len(winners) < 2:
            print("FAIL: fewer than two rounds finished"); ok = False
        if throws_tried == 0 or throws_done < throws_tried - 1:
            print("FAIL: your throws didn't go"); ok = False
        if worst_off > 0.7:
            print("FAIL: you weren't kept on your spot"); ok = False
        for r, (w, n) in winners.items():
            if not w:
                print(f"FAIL: round {r} had no winner"); ok = False
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nhot potato checks passed" if ok else "\nhot potato checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
