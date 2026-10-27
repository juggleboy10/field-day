  // ================================================================ ENDGAME: stop the game that's going, any game
  // A game says how to tell it's running and how to stop it: ENDGAME.on(L, { active, end, shared }). Then there's an
  // "End game" button (in a browser, up top; in VR, on the watch). Press it twice (the first press asks) and the
  // game goes back to how it is before anyone starts one, so you can start afresh: when a friend turns up, say.
  // A shared game (one everyone here plays together) ends for everyone; a personal one (your own lane or booth)
  // only for you. Who ended a shared game travels in presence (eg: [seq, time]); every page in that game ends it.
  const ENDGAME = (() => {
    const S = { armT: 0, seq: 0, seen: {} };
    function on(L, o) {
      L.endGame = { active: o.active, end: o.end, shared: !!o.shared };
      L.endHud = { label: () => (armed() ? 'Press again to end' : 'End game'), show: () => isOn(L), run: () => press(L) };
    }
    const isOn = (L) => { try { return !!(L && L.endGame && L.endGame.active()); } catch (e) { return false; } };
    const armed = () => performance.now() < S.armT;
    // the first press asks; a second within 3 s ends it
    function press(L) {
      if (!isOn(L)) { showToast('No game going right now'); return false; }
      const now = performance.now();
      if (now > S.armT) { S.armT = now + 3000; showToast(L.endGame.shared ? 'Press End game again to stop this game for everyone here' : 'Press End game again to stop your game'); sfx('click', 0.5); state.hudDirty = true; setTimeout(() => { state.hudDirty = true; }, 3100); return false; }
      S.armT = 0;
      endNow(L, '');
      if (L.endGame.shared) { S.seq += 1; S.t = Date.now(); forcePresence(); }
      return true;
    }
    function endNow(L, who) {
      // (a game can say what happens next, e.g. "Starting over at 0-0")
      let msg = '';
      try { msg = L.endGame.end(!!who) || ''; } catch (e) { console.warn('end game', e); }
      showToast(`${who ? `${who} ended the game` : 'Game ended'}. ${msg || 'Start a new one when you’re ready'}`);
      sfx('whistle', 0.6);
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    // what I send: my latest "end" (in this game), so friends' pages end it too
    const mine = (L) => (L.endGame && L.endGame.shared && S.seq ? [S.seq, S.t, L.idx] : null);
    function read(rec, a) {
      const L = curLevel(), was = S.seen[rec.peer];
      if (!Array.isArray(a) || a.length !== 3 || !Number.isInteger(a[0]) || !Number.isFinite(a[1])) { if (was === undefined) S.seen[rec.peer] = 0; return; }
      if (!L.endGame || !L.endGame.shared || a[2] !== L.idx) { S.seen[rec.peer] = a[0]; return; }
      S.seen[rec.peer] = a[0];
      // a new one (not one I've already seen, and not an old one I'm only hearing about because I just arrived)
      if (was === undefined) return;
      if (a[0] !== was && Date.now() - a[1] < 15000) endNow(L, rec.name || 'A friend');
    }
    return { on, isOn, armed, press, endNow, mine, read };
  })();
