"""Two players on one machine: two pages joined through a stand-in for Claude's room (a BroadcastChannel),
served over http so they share an origin.

- Hot potato: both players end up in the same round on the same spots; whoever isn't hosting can still throw
  the potato (their throw is a request the host carries out); a round runs to a winner on both pages.
- Kayak: one player starts a race and the other joins it, with the same start time.

Usage: python tests/multiplayer.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")

# A stand-in for window.claude's room: presence() merges and broadcasts, peers() lists everyone.
FAKE_ROOM = """
(() => {
  const id = new URLSearchParams(location.search).get('peer') || ('p' + Math.random().toString(36).slice(2, 7));
  const bc = new BroadcastChannel('field-day-test');
  let mine = Object.freeze({}), snap = null;
  const others = new Map(), listeners = [];
  const notify = () => { snap = null; for (const f of listeners) { try { f(); } catch (e) {} } };
  const send = () => bc.postMessage({ id, presence: mine });
  bc.onmessage = (e) => {
    const m = e.data; if (!m || m.id === id) return;
    if (m.bye) { others.delete(m.id); notify(); return; }
    const isNew = !others.has(m.id);
    others.set(m.id, { presence: Object.freeze(m.presence || {}), t: Date.now() });
    if (isNew) send();
    notify();
  };
  setInterval(send, 1000);
  const room = {
    presence(patch) { const n = Object.assign({}, mine); for (const k of Object.keys(patch)) { if (patch[k] === null) delete n[k]; else n[k] = patch[k]; } mine = Object.freeze(n); snap = null; send(); return Promise.resolve(); },
    peers() {
      if (!snap) {
        const list = [Object.freeze({ peer: id, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() })];
        for (const [pid, o] of others) list.push(Object.freeze({ peer: pid, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: o.presence, updatedAt: o.t }));
        snap = Object.freeze(list);
      }
      return snap;
    },
    onPeers(fn) { listeners.push(fn); return () => {}; },
    onConnection(fn) { setTimeout(() => fn(true), 0); return () => {}; },
  };
  window.claude = { use: async (name) => (name === 'room' ? room : name === 'user' ? { me: async () => ({ name: id === 'pA' ? 'Alice' : 'Bob' }) } : null) };
})();
"""

POT = """
() => { const fd = window.__fd, I = fd.LEVELS[18].potatoInternals, RS = I.RS, me = fd.state.myPeer;
  return { me, host: I.isHost(), round: RS.round, ph: RS.ph, order: RS.order.join(','), alive: RS.alive.length, holder: RS.holder, flying: !!RS.fl, winner: RS.winner }; }
"""


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close(); return port


def main():
    port = free_port()
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    ok = True
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
            ctx = browser.new_context(viewport={"width": 900, "height": 600})
            ctx.add_init_script(FAKE_ROOM)
            if THREE_JS:
                ctx.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
            for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
                ctx.route(pat, lambda r: r.abort())
            errors = []
            pages = {}
            for who in ("pA", "pB"):
                pg = ctx.new_page()
                pg.on("pageerror", lambda e, who=who: errors.append(f"{who}: {e}"))
                pg.goto(f"http://127.0.0.1:{port}/index.html?test&peer={who}")
                pg.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
                pages[who] = pg
            for who, pg in pages.items():
                pg.evaluate("() => window.__fd.switchLevel(18)")
                pg.locator("#btn-flat").click()
            for pg in pages.values():
                pg.evaluate("() => { const F = window.__fd.LEVELS[18].potatoInternals.FUSE; F[0] = 2500; F[1] = 3500; }")

            # ---------------------------------------------------------------- hot potato
            seen_same_round = False
            throws = {"pA": [0, 0], "pB": [0, 0]}
            pending = {}
            winners = set()
            t_end = time.time() + 120
            while time.time() < t_end:
                a, b = pages["pA"].evaluate(POT), pages["pB"].evaluate(POT)
                if a["round"] >= 1 and a["round"] == b["round"] and a["order"] == b["order"] and "pA" in a["order"] and "pB" in a["order"]:
                    seen_same_round = True
                if a["ph"] == "over" and a["winner"]:
                    winners.add((a["round"], a["winner"], b["winner"] if b["ph"] == "over" else None))
                for who, s in (("pA", a), ("pB", b)):
                    if who in pending and (s["holder"] != who or s["flying"]):
                        throws[who][1] += 1; del pending[who]
                    elif who in pending and time.time() - pending[who] > 3:
                        del pending[who]
                    if s["holder"] == who and not s["flying"] and who not in pending:
                        time.sleep(0.3)
                        pages[who].keyboard.press("Space")
                        throws[who][0] += 1; pending[who] = time.time()
                if len({w[0] for w in winners}) >= 2 and throws["pB"][1] >= 2:
                    break
                time.sleep(0.12)
            a = pages["pA"].evaluate(POT)
            print(f"hot potato: host is {'pA' if a['host'] else 'pB'}; both in the same round: {seen_same_round}")
            print(f"throws (tried, went): pA {throws['pA']}, pB {throws['pB']}")
            print(f"rounds won: {sorted(winners, key=str)}")
            checks = [
                ("both players are put in the same round", seen_same_round),
                ("the non-host's throws go", throws["pB"][0] > 0 and throws["pB"][1] >= throws["pB"][0] - 1),
                ("the host's throws go", throws["pA"][0] == 0 or throws["pA"][1] >= throws["pA"][0] - 1),
                ("rounds finish with the same winner on both pages", len(winners) >= 1 and all(w[2] in (None, w[1]) for w in winners)),
            ]

            # ---------------------------------------------------------------- kayak: one starts a race, the other joins
            for pg in pages.values():
                pg.keyboard.press("Escape")
                pg.evaluate("() => window.__fd.switchLevel(19)")
                pg.locator("#btn-flat").click()
            time.sleep(1.5)
            pages["pA"].evaluate("() => window.__fd.LEVELS[19].kayakInternals.startRace()")
            time.sleep(1.2)
            ra = pages["pA"].evaluate("() => { const R = window.__fd.LEVELS[19].race; return { id: R.id, state: R.state, startAt: R.startAt, bots: R.botsOn }; }")
            rb = pages["pB"].evaluate("() => { const R = window.__fd.LEVELS[19].race; return { id: R.id, state: R.state, startAt: R.startAt, bots: R.botsOn }; }")
            print(f"kayak: pA {ra}, pB {rb}")
            checks += [
                ("the other player joins the race", rb["id"] == ra["id"] and rb["state"] == "count"),
                ("both have the same start time", abs(rb["startAt"] - ra["startAt"]) < 150),
                ("no bots when two people race", not ra["bots"] and not rb["bots"]),
            ]
            time.sleep(4)
            sa = pages["pA"].evaluate("() => window.__fd.LEVELS[19].race.state")
            sb = pages["pB"].evaluate("() => window.__fd.LEVELS[19].race.state")
            checks.append(("the race starts on both pages", sa == "run" and sb == "run"))
            for name, good in checks:
                print(f"{'ok  ' if good else 'FAIL'}  {name}")
                ok &= bool(good)
            if errors:
                print("page errors:", errors[:4]); ok = False
            browser.close()
    finally:
        server.terminate()
    print("\nmultiplayer checks passed" if ok else "\nmultiplayer checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
