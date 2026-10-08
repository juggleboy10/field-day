"""Smoke test for Field Day: opens index.html in headless Chromium, plays each of the 18 places
in browser mode for a few seconds (walking, a Space press, an E press), and fails on any page error.

Usage:
    pip install playwright && playwright install chromium     (once)
    python tests/smoke.py                       # tests ./index.html
    THREE_JS=/path/to/three.min.js python tests/smoke.py    # serve three.js from a local copy (no CDN)

Exit code 0 means every place loaded, ran and showed no errors.
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "index.html"
THREE_JS = os.environ.get("THREE_JS")
SECONDS_PER_PLACE = float(os.environ.get("SECONDS", "3"))
EXPECTED_PLACES = 18
EXPECTED_CATEGORIES = 5

# messages from requests this test blocks on purpose (fonts, the peer-to-peer library)
IGNORED = ("Failed to load resource", "net::ERR_FAILED", "ERR_BLOCKED")

COUNT_FRAMES = """
(() => {
  window.__frames = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { window.__frames++; cb(t); });
})();
"""


def main():
    if not PAGE.exists():
        print(f"no {PAGE.name}: run ./build.sh first")
        return 1
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.add_init_script(COUNT_FRAMES)
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        page.route("**/fonts.googleapis.com/**", lambda r: r.abort())
        page.route("**/fonts.gstatic.com/**", lambda r: r.abort())
        page.route("**/cdn.jsdelivr.net/**", lambda r: r.abort())   # play solo, no peer-to-peer

        errors = []
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console: {m.text}") if m.type == "error" and not any(s in m.text for s in IGNORED) else None)

        page.goto(PAGE.as_uri())
        page.wait_for_function("() => !document.querySelector('#btn-flat').disabled", timeout=20000)
        page.wait_for_timeout(1000)

        # the menu
        tiles = page.locator("#levels input[name=level]").count()
        cats = page.locator("#levels .cat").count()
        print(f"menu: {tiles} places, {cats} category cards")
        if tiles != EXPECTED_PLACES:
            failures.append(f"menu shows {tiles} places, expected {EXPECTED_PLACES}")
        if cats != EXPECTED_CATEGORIES:
            failures.append(f"menu shows {cats} category cards, expected {EXPECTED_CATEGORIES}")
        if errors:
            failures.append("errors while loading: " + " | ".join(errors[:3]))
            errors.clear()

        # each place
        for i in range(tiles):
            radio = page.locator(f"#levels input[name=level][value='{i}']")
            name = radio.get_attribute("aria-label")
            radio.evaluate("el => el.click()")          # works even when its category is folded away
            page.wait_for_timeout(300)
            page.locator("#btn-flat").click()
            page.wait_for_timeout(500)
            f0 = page.evaluate("window.__frames")
            page.keyboard.down("KeyW"); page.wait_for_timeout(700); page.keyboard.up("KeyW")
            page.keyboard.down("Space"); page.wait_for_timeout(400); page.keyboard.up("Space")
            page.keyboard.press("KeyE")
            page.wait_for_timeout(max(0, SECONDS_PER_PLACE * 1000 - 1600))
            frames = page.evaluate("window.__frames") - f0
            title = page.locator("#hud-title").inner_text()
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)

            problems = []
            if title != name:
                problems.append(f"HUD says '{title}'")
            if frames < 5:
                problems.append(f"only {frames} frames drawn")
            if errors:
                problems.extend(errors[:3])
                errors.clear()
            print(f"{'FAIL' if problems else 'ok  '}  {i:2d} {name}  ({frames} frames)" + ("".join(f"\n        {x}" for x in problems)))
            if problems:
                failures.append(f"{name}: " + "; ".join(problems))

        browser.close()

    print()
    if failures:
        print(f"{len(failures)} problem(s):")
        for f in failures:
            print(" -", f)
        return 1
    print(f"all {EXPECTED_PLACES} places ran with no errors")
    return 0


if __name__ == "__main__":
    sys.exit(main())
