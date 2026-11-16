#!/usr/bin/env python3
"""Checks the names the game's files share.

Every .js file is an ordinary script, so what a file declares at its top level is visible to every file after it, and
to the browser as a whole. This fails if:
  - two files (or one file twice) declare the same top-level name
  - a top-level name is one the browser already has, in a way that would break: a function or var with the name of
    anything on `window` (it would replace it), or a const/let/class with the name of something on `window` that
    can't be replaced (the script wouldn't load at all)
  - a file has a `return` outside any function
  - an always-loaded file uses something from a game file, or src/manifest.json (which files each place needs) is stale

Needs node with acorn (cd tools && npm install) and Playwright.   Usage: python3 tools/check_scope.py
"""
import json
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

TOOLS = Path(__file__).resolve().parent


def main():
    r = subprocess.run(["node", str(TOOLS / "scope.js")], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr or "tools/scope.js failed (cd tools && npm install?)")
    files = json.loads(r.stdout)["files"]
    problems, seen, kinds = [], {}, {}
    for f, rec in files.items():
        for line in rec["returns"]:
            problems.append(f"{f}:{line}: a return outside any function")
        for name, kind in rec["names"]:
            if name in seen:
                problems.append(f"{name}: declared in {seen[name]} and again in {f}")
            seen[name] = f
            kinds[name] = kind
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page()
        page.goto("about:blank")
        clash = page.evaluate("""(names) => names.map((n) => { if (!(n in window)) return null; let o = window, d = null;
          while (o && !(d = Object.getOwnPropertyDescriptor(o, n))) o = Object.getPrototypeOf(o);
          return [n, o === window && d && !d.configurable]; }).filter(Boolean)""", sorted(seen))
        browser.close()
    for name, fixed in clash:
        if kinds[name] in ("function", "var"):
            problems.append(f"{name} ({kinds[name]} in {seen[name]}): the browser has window.{name}, and this would replace it")
        elif fixed:
            problems.append(f"{name} ({kinds[name]} in {seen[name]}): window.{name} can't be redeclared, so this script wouldn't load")
    shadows = [n for n, fixed in clash if kinds[n] not in ("function", "var") and not fixed]
    print(f"{len(seen)} shared names in {len(files)} files" + (f"; these hide a browser name of the same name (allowed): {', '.join(shadows)}" if shadows else ""))
    if problems:
        print("\n".join(problems))
        sys.exit(1)
    # and the list of files each place needs still matches the code
    m = subprocess.run([sys.executable, str(TOOLS / "manifest.py"), "--check"], capture_output=True, text=True)
    print((m.stdout or m.stderr).strip())
    if m.returncode:
        sys.exit(1)
    print("scope check passed")


if __name__ == "__main__":
    main()
