"""Draw budgets: no place may get heavier to draw than tests/budgets.json says.

Each place's budget is its draw calls and triangles for a few frames from where you spawn (the heaviest), recorded by
`tools/measure.py --record`. This visits every place (building each on its first visit, as a player would) and fails
if one now draws more than its budget (with a little room for things that move about: 10%, and at least 8 calls).
When a place is made lighter, record again to lower its budget. The long-term goal is 150 draw calls everywhere.

    THREE_JS=/path/to/three.min.js python3 tests/budgets.py
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from measure import measure  # noqa: E402

budgets = json.loads((ROOT / "tests" / "budgets.json").read_text())
with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    places, errors = measure(browser)
    browser.close()

fails = []
for r in places:
    b = budgets.get(r["id"])
    if not b:
        fails.append(f"{r['id']}: no budget (run tools/measure.py --record)")
        continue
    # (the lightest of the frames sampled, against the heaviest recorded: things that move don't fail it)
    if r["calls_min"] > max(b["calls"] * 1.1, b["calls"] + 8):
        fails.append(f"{r['id']}: {r['calls_min']} draw calls, budget {b['calls']}")
    if r["drawn_min"] > b["tris"] * 1.1 + 2000:
        fails.append(f"{r['id']}: {r['drawn_min']} triangles, budget {b['tris']}")
if errors:
    fails.append(f"page errors: {errors[:3]}")
for f in fails:
    print("FAIL", f)
over = sum(1 for r in places if r["calls"] > 150)
print(f"{len(places)} places measured; {over} over the 150-call goal")
print(f"\n{len(fails)} failed" if fails else "all within budget")
sys.exit(1 if fails else 0)
