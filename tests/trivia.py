"""Trivia Night: a game runs from the intro through ten questions to the final scores, and starts again.

- you get a podium, with bots filling the rest to four
- a right answer (key 1-4) scores 100 plus a speed bonus; a wrong one (HUD button) scores nothing
- the bots answer, and their picks are revealed
- no question repeats within a game; every question shows four different answers
- the final scores come up, and a new game starts on its own

Usage: python tests/trivia.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")
D = os.environ.get("SHOTS")       # a folder to save screenshots into, if set
TI = "window.__fd.LEVELS[23].triviaInternals"


def main():
    ok = True
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1100, "height": 650})
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.evaluate("() => window.__fd.switchLevel(23)")
        page.locator("#btn-flat").click()
        # shorter phases so the test finishes (the game reads these as it goes)
        page.evaluate(f"() => Object.assign({TI}.T, {{ INTRO: 2500, ASK: 9000, REVEAL: 2000, FINAL: 3000, AFTER_ALL: 600 }})")

        page.wait_for_function(f"() => {TI}.RS.ph === 'intro'", timeout=30000)
        page.wait_for_timeout(1200)
        st = page.evaluate(f"""() => {{ const t = {TI}, RS = t.RS, fd = window.__fd, s = t.mySeat(), seat = t.seatAt(s);
          const c = new THREE.Vector3(); fd.camera.getWorldPosition(c);
          const sx = seat.x + Math.sin(seat.yaw) * 0.62, sz = seat.z + Math.cos(seat.yaw) * 0.62;
          return {{ order: RS.order, seat: s, dist: Math.hypot(c.x - sx, c.z - sz) }}; }}""")
        print("intro:", st)
        checks += [("four contestants: you and three bots", len(st["order"]) == 4 and sum(1 for i in st["order"] if i.startswith("bot:")) == 3),
                   ("you're put at your podium", st["seat"] >= 0 and st["dist"] < 0.6)]
        if D: page.screenshot(path=f"{D}/trivia-intro.png")

        # question 1: answer right with the keyboard
        page.wait_for_function(f"() => {TI}.RS.ph === 'ask' && {TI}.RS.qn === 1", timeout=30000)
        page.wait_for_timeout(1500)
        right = page.evaluate(f"() => {TI}.rightSlot()")
        page.keyboard.press(f"Digit{right + 1}")
        page.wait_for_timeout(300)
        if D: page.screenshot(path=f"{D}/trivia-ask.png")
        mine = page.evaluate(f"() => {TI}.me.choice")
        page.wait_for_function(f"() => {TI}.RS.ph === 'reveal' && {TI}.RS.qn === 1", timeout=30000)
        if D: page.wait_for_timeout(400); page.screenshot(path=f"{D}/trivia-reveal.png")
        r1 = page.evaluate(f"() => {{ const t = {TI}, RS = t.RS, k = t.kOf(window.__fd.state.myPeer); return {{ score: RS.scores[k], gain: RS.gains[k], choices: RS.choices, order: RS.order, level: window.__fd.state.level }}; }}")
        print("question 1 (answered right with a key):", r1)
        bot_picks = [c for i, c in zip(r1["order"], r1["choices"]) if i.startswith("bot:")]
        checks += [("a key press locks in your answer", mine == right), ("pressing a number key didn't switch games", r1["level"] == 23),
                   ("a right answer scores 100 plus speed", 100 < r1["gain"] <= 150 and r1["score"] == r1["gain"]),
                   ("the bots answer, and their picks are revealed", sum(1 for c in bot_picks if 0 <= c <= 3) >= 2)]

        # question 2: answer wrong with the HUD button
        page.wait_for_function(f"() => {TI}.RS.ph === 'ask' && {TI}.RS.qn === 2", timeout=30000)
        page.wait_for_timeout(1500)
        wrong = page.evaluate(f"() => ({TI}.rightSlot() + 1) % 4")
        btn = page.locator(".hud-btn", has_text=f"{wrong + 1} ·")
        hud_ok = btn.count() == 1
        if hud_ok: btn.first.click()
        page.wait_for_function(f"() => {TI}.RS.ph === 'reveal' && {TI}.RS.qn === 2", timeout=30000)
        r2 = page.evaluate(f"() => {{ const t = {TI}, RS = t.RS, k = t.kOf(window.__fd.state.myPeer); return {{ score: RS.scores[k], gain: RS.gains[k], mine: RS.choices[k] }}; }}")
        print("question 2 (answered wrong with the HUD):", r2, "hud button found:", hud_ok)
        checks += [("the HUD answer buttons work", hud_ok and r2["mine"] == wrong), ("a wrong answer scores nothing", r2["gain"] == 0 and r2["score"] == r1["score"])]

        # skip ahead to the last question, then the final scores and a new game
        seen = page.evaluate(f"() => [{TI}.RS.qi]")
        page.wait_for_function(f"() => {TI}.RS.ph === 'ask' && {TI}.RS.qn === 3", timeout=30000)
        seen += page.evaluate(f"() => [{TI}.RS.qi]")
        page.evaluate(f"() => {{ {TI}.RS.qn = 10; }}")
        page.wait_for_function(f"() => {TI}.RS.ph === 'final'", timeout=40000)
        page.wait_for_timeout(500)
        if D: page.screenshot(path=f"{D}/trivia-final.png")
        fin = page.evaluate(f"() => ({{ game: {TI}.RS.game, scores: {TI}.RS.scores }})")
        page.wait_for_function(f"() => {TI}.RS.ph === 'intro' && {TI}.RS.game === {fin['game'] + 1}", timeout=30000)
        new = page.evaluate(f"() => ({{ scores: {TI}.RS.scores, order: {TI}.RS.order }})")
        print("final:", fin, "-> new game:", new)
        checks += [("the final scores come up", len(fin["scores"]) == 4), ("a new game starts with scores reset", all(s == 0 for s in new["scores"]) and len(new["order"]) == 4)]

        # the bank and the picker: no repeats in a game, four different answers each
        bank = page.evaluate(f"() => ({{ recent: {TI}.H.recent.slice(), size: {TI}.bank.length, bad: {TI}.bank.filter((q) => q.length !== 6 || new Set(q.slice(2)).size !== 4).length }})")
        rec = bank["recent"]
        print("questions asked so far:", rec)
        checks.append((f"all {bank['size']} questions have four different answers", bank["size"] >= 150 and bank["bad"] == 0))
        checks.append(("no question repeats", len(rec) == len(set(rec)) and len(set(seen)) == len(seen)))
        ok_watch = page.evaluate(f"""() => {{ const L = window.__fd.LEVELS[23], t = {TI}, s = t.seatAt(t.mySeat());
          const sx = s.x + Math.sin(s.yaw) * 0.62, sz = s.z + Math.cos(s.yaw) * 0.62; const d = L.clampPlayer({{ x: sx + 3, z: sz + 2 }});
          return Math.hypot(sx + 3 + d[0] - sx, sz + 2 + d[1] - sz); }}""")
        checks.append(("contestants stay at their podium", ok_watch <= 0.46))

        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\ntrivia checks passed" if ok else "\ntrivia checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
