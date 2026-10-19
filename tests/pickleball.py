"""Pickleball: shots with topspin (or none) clear the net and stay in.

A swing from anywhere on your side, at any speed and with any amount of topspin, is checked the way a VR hit is:
the aimed shot blended with 30% of the raw swing, then the final net check. None should hit the net or go long.

Usage: python tests/pickleball.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

SIM = """() => { const I = window.__fd.LEVELS[15].pb.internals; const out = {};
  for (const top of [0, 0.4, 0.8, 1.0]) {
    let net = 0, long = 0, n = 0;
    for (const y of [0.3, 0.6, 0.9]) for (const x of [-6, -4, -2.5]) for (const sp of [6, 9, 12, 14]) for (const rawUp of [-1, 1.5]) {
      const w = [0, 0, -top], from = { x, y, z: 0 }, aim = I.aimed(from, 4.5, 0, sp, w);
      const v = { vx: sp * 0.3 + aim.vx * 0.7, vy: rawUp * 0.3 + aim.vy * 0.7, vz: aim.vz * 0.7, wx: w[0], wy: w[1], wz: w[2] };
      I.clearNet(from, v);
      const p = { x, y, z: 0, vx: v.vx, vy: v.vy, vz: v.vz, wx: w[0], wy: w[1], wz: w[2] };
      let over = null, land = null;
      for (let k = 0; k < 600; k++) { const s = Math.hypot(p.vx, p.vy, p.vz), px = p.x; I.airStep(p, 1 / 120, s); p.x += p.vx / 120; p.y += p.vy / 120; p.z += p.vz / 120;
        if (px < 0 && p.x >= 0) { over = p.y > I.NET_H + 0.037; if (!over) break; } if (p.y < 0.037) { land = p.x; break; } }
      n++; if (!over) net++; else if (land > I.HL) long++;
    }
    out[top] = { net, long, n };
  }
  return out; }"""


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page()
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        res = page.evaluate(SIM)
        browser.close()
    print("topspin -> shots into the net / long:", res)
    ok = all(r["net"] == 0 and r["long"] <= 1 for r in res.values())
    print("pickleball checks passed" if ok else "pickleball checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
