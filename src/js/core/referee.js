  // ================================================================ WHO'S PLAYING, AND WHO REFEREES
  // In a game where one page runs things (the rounds, the bots, the clock), that page is the referee. The rule, the same
  // on every page:
  //   - Only players who are really there count: in this game, and their page alive. Every page bumps a heartbeat (hb)
  //     in its presence twice a second; a page that's gone quiet for 2 seconds (a headset taken off, a frozen browser)
  //     is skipped. A page that knows it's going (the tab hidden, the headset's view hidden) says so at once (aw).
  //   - The referee keeps the job while it's there: each page says which game it's refereeing (rf), and if anyone here
  //     is, they stay referee. Only when nobody is does the lowest player take it on. So someone joining (or coming
  //     back) never snatches the game from the page that has the latest state of it.
  //   - Each new referee takes a hand-over number (re) one higher than any it has seen there, and if two pages both say
  //     they're refereeing (one lost its connection for a while, and the other took over), the higher number wins
  //     (then the lower id). The page with the old number gives way at once, and takes the game as it now stands.
  // Players from pages older than this rule (no hb) count as alive, as before.
  //   playersHere(L): the ids of the players in L, sorted (always including me)
  //   refereeOf(L), amReferee(L)
  const LIVE = { hb: 0, hbT: 0, away: false, ref: -1, ep: 0 };
  const LIVE_MS = 2000;
  function liveIn(rec, L, now) {
    return rec.inGame && rec.lv === L.idx && !rec.away && (rec.hb === undefined || now - rec.hbT < LIVE_MS);
  }
  function playersHere(L) {
    const now = performance.now(), ids = [state.myPeer];
    for (const rec of remotes.values()) if (liveIn(rec, L, now)) ids.push(rec.peer);
    return ids.sort();
  }
  // (a game can say who may referee, L.refPool() giving their ids: Brawl's fighters, say, not its spectators; if none of
  // them is here, it's me)
  function refereeOf(L) {
    const now = performance.now(), pool = L.refPool ? new Set(L.refPool()) : null, all = [];
    let best = null, bestEp = -1;
    const consider = (id, ep) => { if (ep > bestEp || (ep === bestEp && id < best)) { best = id; bestEp = ep; } };
    if (!pool || pool.has(state.myPeer)) { all.push(state.myPeer); if (LIVE.ref === L.idx && !LIVE.away) consider(state.myPeer, LIVE.ep); }
    for (const rec of remotes.values()) {
      if (!liveIn(rec, L, now) || (pool && !pool.has(rec.peer))) continue;
      all.push(rec.peer);
      if (rec.rf === L.idx) consider(rec.peer, rec.re || 0);
    }
    return best || all.sort()[0] || state.myPeer;
  }
  const amReferee = (L) => refereeOf(L) === state.myPeer;
  // every frame: the heartbeat, and whether I'm refereeing the game I'm in (for my presence)
  function liveTick(now) {
    if (now - LIVE.hbT >= 500) { LIVE.hbT = now; LIVE.hb = (LIVE.hb + 1) % 1000; }
    const L = curLevel();
    const was = LIVE.ref;
    LIVE.ref = L && state.mode !== 'menu' && !LIVE.away && refereeOf(L) === state.myPeer ? L.idx : -1;
    // (taking over: one higher than any hand-over number seen here)
    if (LIVE.ref >= 0 && was !== LIVE.ref) {
      let top = 0;
      for (const rec of remotes.values()) if (rec.lv === L.idx && Number.isInteger(rec.re)) top = Math.max(top, rec.re);
      LIVE.ep = top + 1;
    }
  }
  // what goes in my presence
  const livePresence = () => ({ hb: LIVE.hb, aw: LIVE.away ? 1 : 0, rf: LIVE.ref, re: LIVE.ep });
  // a friend's presence: when their heartbeat last moved, whether they're away, what they referee
  function liveRead(rec, pres) {
    const now = performance.now();
    if (rec.hbT === undefined) rec.hbT = now;
    if (Number.isInteger(pres.hb) && pres.hb !== rec.hb) { rec.hb = pres.hb; rec.hbT = now; }
    rec.away = pres.aw === 1;
    rec.rf = Number.isInteger(pres.rf) ? pres.rf : -1;
    rec.re = Number.isInteger(pres.re) ? pres.re : 0;
  }
  // going away (the tab hidden, the headset's view hidden): say so now, as the frame loop is about to stop; and give up
  // refereeing, so whoever takes over keeps it when I come back
  function setAway(on) {
    on = !!on;
    if (LIVE.away === on) return;
    LIVE.away = on;
    if (on) LIVE.ref = -1;
    try { if (state.room) state.room.presence({ aw: on ? 1 : 0, rf: -1 }).catch(() => {}); } catch (e) { /* not connected */ }
    forcePresence();
  }
  document.addEventListener('visibilitychange', () => setAway(document.hidden));
