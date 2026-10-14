"""Voice chat's self-repair, with the network side stood in for.

- your presence says whether your mic is on and whether you're talking
- someone talking whose voice isn't reaching you gets asked (once, then not again for a while) to send it again
- someone whose mic is on but whose voice never arrived gets asked too
- someone you can hear, or who isn't talking, is left alone
- when asked, you take your voice off that one connection and put it back

Usage: python tests/voice.py   (THREE_JS=/path/to/three.min.js to serve three.js locally)
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
THREE_JS = os.environ.get("THREE_JS")


def main():
    ok = True
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
        page = browser.new_page()
        if THREE_JS:
            page.route("**/three.min.js", lambda r: r.fulfill(path=THREE_JS, content_type="application/javascript"))
        for pat in ("**/fonts.googleapis.com/**", "**/fonts.gstatic.com/**", "**/cdn.jsdelivr.net/**"):
            page.route(pat, lambda r: r.abort())
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri() + "?test")
        page.wait_for_function("() => window.__fd && !document.querySelector('#btn-flat').disabled", timeout=20000)
        r = page.evaluate("""() => {
          const fd = window.__fd, V = fd.voice, VOICE = V.VOICE;
          // a stand-in room that records the voice requests
          const asked = [], resent = [];
          fd.state.room = { voice: { ask: (id) => asked.push(id), resend: (s, id) => resent.push(id), add() {}, remove() {} } };
          // four other players: A talking but silent to us, B mic on but no voice ever arrived, C talking and heard, D not talking
          const mk = (id, pres) => { const rec = { peer: id, pres }; V.remotes.set(id, rec); return rec; };
          mk('A', { vo: 1, vt: 1 }); mk('B', { vo: 1, vt: 0 }); mk('C', { vo: 1, vt: 1 }); mk('D', { vo: 1, vt: 0 }); mk('E', { vo: 2, vt: 0 });
          const fake = () => ({ el: { play: () => Promise.resolve() }, speakT: 0, dead: false });
          VOICE.peers.set('A', fake()); VOICE.peers.set('C', fake()); VOICE.peers.set('D', fake());
          let now = 100000; VOICE.lastTick = now;
          const run = (secs) => { for (let i = 0; i < secs * 20; i++) { now += 50; VOICE.peers.get('C').speakT = now; V.voiceWatch(now); } };
          run(2);
          const early = asked.slice();
          run(4);
          const after6 = asked.slice();
          run(4);              // still broken at 10 s: no second ask yet (they come 8 s apart)
          const after12 = asked.slice();
          run(7);              // and a second one after that
          const after17 = asked.slice();
          // asked by someone: resend to them
          const s0 = VOICE.stream; VOICE.stream = { id: 'mine' }; V.voiceResend('Z'); VOICE.stream = s0;
          // presence carries the mic state
          const pres = V.buildPresence();
          for (const id of ['A', 'B', 'C', 'D', 'E']) { V.remotes.delete(id); VOICE.peers.delete(id); }
          fd.state.room = null;
          return { early, after6, after12, after17, resent, vo: pres.vo, vt: pres.vt };
        }""")
        print(r)
        count = lambda lst, x: sum(1 for i in lst if i == x)
        checks += [("no one is asked in the first couple of seconds", r["early"] == []),
                   ("someone talking whose voice isn't reaching you is asked to send it again", "A" in r["after6"]),
                   ("someone whose voice never arrived is asked too", "B" in r["after6"]),
                   ("someone you can hear, or who's quiet, or muted, is left alone", not any(x in r["after17"] for x in ("C", "D", "E"))),
                   ("a broken voice isn't asked for again straight away", count(r["after12"], "A") == 1),
                   ("but is asked again a little later if it's still broken", count(r["after17"], "A") == 2),
                   ("when asked, you send your voice to them again", r["resent"] == ["Z"]),
                   ("your presence says your mic is off and you're not talking", r["vo"] == 0 and r["vt"] == 0)]
        for name, good in checks:
            print(f"{'ok  ' if good else 'FAIL'}  {name}")
            ok &= bool(good)
        if errors:
            print("page errors:", errors[:3]); ok = False
        browser.close()
    print("\nvoice checks passed" if ok else "\nvoice checks FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
