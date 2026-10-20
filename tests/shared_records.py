"""The shared records board on your own website (records.php next to the page).

- with records.php beside the page, the game finds it and shares records
- a record set on one device shows up on another device's board, under the player's name
- records.php refuses bad input (a made-up id, junk keys, silly values)

Usage: python tests/shared_records.py   (needs php; THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from multiplayer import free_port  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")


def main():
    site = Path(tempfile.mkdtemp())
    shutil.copy(ROOT / "index.html", site / "field-day.html")
    shutil.copy(ROOT / "server" / "records.php", site / "records.php")
    port = free_port()
    server = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", str(site)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    base = f"http://127.0.0.1:{port}"
    fails = []
    check = lambda ok, msg: (print(("ok    " if ok else "FAIL  ") + msg), None if ok else fails.append(msg))
    try:
        # the server on its own: bad input is refused
        def post(body):
            req = urllib.request.Request(base + "/records.php", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
            try:
                with urllib.request.urlopen(req) as r:
                    return r.status, json.loads(r.read())
            except urllib.error.HTTPError as e:
                return e.code, None
        check(post({"id": "x", "n": "Bad", "b": {}})[0] == 400, "records.php refuses a made-up id")
        st, _ = post({"id": "zzzzzzzzzzzzzzzz", "n": "<b>Zed</b>", "b": {"darts.d301": 21, "bad key": 5, "darts.clock": -4, "x.y": "9"}})
        with urllib.request.urlopen(base + "/records.php") as r:
            allp = json.loads(r.read())["players"]
        z = allp.get("zzzzzzzzzzzzzzzz", {})
        print("stored:", z)
        check(st == 200 and z.get("n") == "Zed" and z.get("b") == {"darts.d301": 21}, "records.php keeps only good records (and strips tags from names)")

        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
            pages = []
            for who in ("Alice", "Bob"):
                ctx = browser.new_context(viewport={"width": 900, "height": 560})   # (two devices: separate storage)
                pg = ctx.new_page()
                if THREE_JS:
                    pg.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
                for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**", "**/trystero*/**"):
                    pg.route(pat, lambda r: r.abort())
                pg.goto(base + "/field-day.html?test")
                pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
                pg.wait_for_function("() => window.__fd.RECORDS.shared.mode === 'php'", timeout=15000)
                pg.evaluate(f"() => {{ window.__fd.state.name = '{who}'; }}")
                pages.append(pg)
            A, B = pages
            check(True, "both devices found records.php")
            # Zed's record (posted above) is already on their boards
            zed = A.evaluate("() => window.__fd.RECORDS.list(window.__fd.LEVELS[36], 'd301').map((e) => e[1])")
            check("Zed" in zed, "the board starts with the records already on the site")
            # Alice sets a record; Bob sees it after a moment
            A.evaluate("() => { const fd = window.__fd; fd.RECORDS.add(fd.LEVELS[47], 'hits', 41); }")
            time.sleep(3.5)
            B.evaluate("() => window.__fd.RECORDS.shared.pull()")
            B.wait_for_function("() => window.__fd.RECORDS.list(window.__fd.LEVELS[47], 'hits').some((e) => e[1] === 'Alice')", timeout=10000)
            got = B.evaluate("() => window.__fd.RECORDS.list(window.__fd.LEVELS[47], 'hits').map((e) => [e[0], e[1]])")
            print("Bob's board:", got)
            check([41, "Alice"] in got, "Alice's record shows on Bob's board")
            browser.close()
    finally:
        server.terminate()
        shutil.rmtree(site, ignore_errors=True)
    if fails:
        print("FAIL")
        sys.exit(1)
    print("shared records checks passed")


if __name__ == "__main__":
    main()
