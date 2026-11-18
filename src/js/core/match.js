  // ================================================================ MATCH: the machinery every refereed game repeats
  // A game says what's special about it; the kit runs the rest. Extracted from Tabletop Brawl.
  //
  //   const M = MATCH.define(L, {
  //     H,                                   // the game's match state: the kit keeps H.ph ('lobby' | 'count' | 'play' word
  //                                          //   of the game's choosing | 'over') and H.t (seconds left in a phase) in it
  //     play: 'fight',                       // what the game calls its playing phase (default 'play')
  //     count: 3, over: 5,                   // seconds of countdown, and of the results before going back to the lobby
  //     seats: { list: F, total: () => 4 },  // the places: objects with .peer, .on, .bot, .slot (the kit sets the first three)
  //     onSeat(seat, peer), onBot(seat),     // someone (or a bot) has just taken a place: set it up
  //     onStart(), onLobby(),                // the referee is starting a match / going back to the lobby
  //     onPhase(ph, was),                    // every page: the phase changed (sounds, the board)
  //     ask: () => showToast('...'),         // a page that isn't the referee pressed Start
  //   });
  //   M.start(), M.toLobby(), M.over(), M.step(dt) (the referee, every frame), M.seat() (the referee),
  //   M.watch() (every page, every frame), M.presence() / M.read(rec, pres, st) (from L.presence / L.readPresence),
  //   M.isRef(), M.players() (the ids that may play: L.refPool)
  //
  // The referee is core/referee.js's: one page runs the match; it hands over cleanly if that page goes away, and the
  // new referee carries on from the phase and clock it last heard (they're in M.presence()).
  // Start requests are a counter in presence (ms[0]): a press is never lost, and each one is acted on once.
  const MATCH = (() => {
    const PH = ['lobby', 'count', 'play', 'over'];
    function define(L, cfg) {
      const H = cfg.H, PLAY = cfg.play || 'play', COUNT = cfg.count || 3, OVER = cfg.over || 5;
      const names = ['lobby', 'count', PLAY, 'over'];
      const M = { req: 0, seenPh: H.ph || 'lobby', reqSeen: {} };
      H.ph = H.ph || 'lobby'; H.t = H.t || 0;
      const isRef = () => amReferee(L);
      // ------------------------------------------------ seats: people first (keeping their places), then bots
      function seat() {
        const S = cfg.seats; if (!S) return;
        const list = S.list, people = M.players().slice(0, list.length);
        for (const s of list) {
          if (s.peer && !people.includes(s.peer)) { s.peer = ''; s.on = false; }
          else if (s.peer && !s.on) { s.on = true; s.bot = false; if (cfg.onSeat) cfg.onSeat(s, s.peer); }
        }
        for (const p of people) if (!list.some((s) => s.peer === p)) {
          const free = list.find((s) => !s.peer && !s.on) || list.find((s) => s.bot);
          if (free) { Object.assign(free, { peer: p, on: true, bot: false }); if (cfg.onSeat) cfg.onSeat(free, p); }
        }
        const n = Math.max(people.length, S.total ? S.total() : list.length);
        let count = list.filter((s) => s.peer).length;
        for (const s of list) {
          if (s.peer) continue;
          const want = count < n; if (want) count += 1;
          if (want && !s.on) { Object.assign(s, { on: true, bot: true }); if (cfg.onBot) cfg.onBot(s); }
          else if (!want && s.on) { s.on = false; s.bot = false; }
        }
      }
      // ------------------------------------------------ the lifecycle
      function start() {
        if (!isRef()) { M.req += 1; forcePresence(); if (cfg.ask) cfg.ask(); return; }
        seat();
        if (cfg.onStart) cfg.onStart();
        H.ph = 'count'; H.t = COUNT;
        state.hudDirty = true; forcePresence();
      }
      function toLobby() {
        H.ph = 'lobby'; H.t = 0;
        if (cfg.onLobby) cfg.onLobby();
        state.hudDirty = true; forcePresence();
      }
      function over() { H.ph = 'over'; H.t = OVER; state.hudDirty = true; forcePresence(); }
      // the referee, every frame: seats, and the clock between phases (time from the frame's dt, which the main loop
      // already keeps in step with real time)
      function step(dt) {
        seat();
        if (H.ph === 'count') { H.t -= dt; if (H.t <= 0) { H.ph = PLAY; H.t = 0; } }
        else if (H.ph === PLAY) H.t = Math.max(-5, H.t - dt);
        else if (H.ph === 'over') { H.t -= dt; if (H.t <= 0) toLobby(); }
      }
      // every page, every frame: tell the game when the phase changes
      function watch() {
        if (H.ph === M.seenPh) return;
        const was = M.seenPh; M.seenPh = H.ph; state.hudDirty = true;
        if (cfg.onPhase) cfg.onPhase(H.ph, was);
      }
      // ------------------------------------------------ presence
      // ms: [start requests I've made, and (the referee only) the phase, the seconds left (tenths)]
      function presence() {
        const p = { ms: [M.req] };
        if (isRef()) p.ms.push(names.indexOf(H.ph), Math.round(H.t * 10));
        return p;
      }
      function read(rec, pres, st) {
        const a = pres.ms;
        if (!Array.isArray(a) || !a.every((x) => typeof x === 'number' && Number.isFinite(x))) return;
        // a start request (acted on once, by the referee, in the lobby)
        if (st.msReq === undefined) st.msReq = a[0];
        else if (a[0] > st.msReq) { st.msReq = a[0]; if (isRef() && H.ph === 'lobby') start(); }
        // the referee's phase and clock
        if (a.length >= 3 && rec.peer === refereeOf(L) && !isRef()) {
          H.ph = names[Math.max(0, Math.min(3, a[1] | 0))]; H.t = a[2] / 10;
        }
      }
      M.players = () => (cfg.players ? cfg.players() : playersHere(L));
      L.refPool = M.players;
      Object.assign(M, { start, toLobby, over, step, watch, seat, presence, read, isRef, names });
      return M;
    }
    // ------------------------------------------------ drawing others a little in the past, smoothly
    // The referee stamps each snapshot with its own clock (never compared with ours directly). We keep the last second
    // or so, work out the gap between its clock and ours from the quickest snapshots (the lowest delay seen lately),
    // and draw at "now, less that gap, less DELAY": between the two snapshots either side of that moment. Snapshots
    // arriving unevenly (jitter) then make no difference to how smoothly things move.
    //   const tl = MATCH.timeline(100); tl.push(refClockMs, [x0, y0, x1, y1, ...]); tl.at(out) -> true if out was filled
    function timeline(DELAY) {
      const buf = [], offs = [];
      const T = { delay: DELAY || 100 };
      T.push = (rt, vals, nowMs) => {
        const now = nowMs === undefined ? performance.now() : nowMs;
        if (!Number.isFinite(rt)) return;
        const last = buf[buf.length - 1];
        if (last && rt < last.rt - 4000) { buf.length = 0; offs.length = 0; }    // (the referee changed, or its clock wrapped)
        else if (last && rt <= last.rt) return;
        offs.push(now - rt); if (offs.length > 80) offs.shift();
        buf.push({ rt, vals: vals.slice() }); if (buf.length > 40) buf.shift();
      };
      T.reset = () => { buf.length = 0; offs.length = 0; cur = -1; };
      // (how far behind to draw: at least the delay asked for, and enough to cover how unevenly the snapshots arrive
      // (the spread between the quickest and slowest lately) plus the gap between them, so there's nearly always a
      // snapshot on each side of the moment drawn: a referee on a shaky connection or a struggling headset is drawn
      // a little further behind, smoothly, rather than in stops and leaps; at most 0.4 s)
      T.behind = () => {
        if (buf.length < 3) return T.delay;
        const n = Math.min(buf.length - 1, 12), gap = (buf[buf.length - 1].rt - buf[buf.length - 1 - n].rt) / n;
        let lo = Infinity, hi = -Infinity; for (const o of offs) { if (o < lo) lo = o; if (o > hi) hi = o; }
        return Math.min(400, Math.max(T.delay, gap * 1.5, hi - lo + gap + 20));
      };
      // (and it changes gently: drawing runs at most 10% faster, or 30% slower, than real time while it adjusts, so
      // nothing visibly leaps or stops)
      let cur = -1, lastNow = -1;
      T.at = (out, jump, nowMs) => {
        if (buf.length < 2) return false;
        let off = Infinity; for (const o of offs) if (o < off) off = o;
        // (the gap to the referee's clock and how far behind to draw move as snapshots come and go: both go into one
        // number that eases, so the moment drawn never jumps)
        const now = nowMs === undefined ? performance.now() : nowMs, want = off + T.behind();
        if (cur < 0 || lastNow < 0 || now - lastNow > 1000) cur = want;
        // (growing quicker than shrinking, as running dry is the worse of the two; and only for a real change, not every
        // few milliseconds' wobble)
        else if (want > cur + 8 || want < cur - 30) { const dt = now - lastNow; cur += Math.max(-dt * 0.1, Math.min(dt * 0.3, want - cur)); }
        lastNow = now;
        const rt = now - cur;
        let a = buf[0], b = buf[1];
        if (rt <= a.rt) { for (let i = 0; i < a.vals.length; i++) out[i] = a.vals[i]; return true; }
        for (let i = 1; i < buf.length; i++) { a = buf[i - 1]; b = buf[i]; if (b.rt >= rt) break; }
        if (rt >= b.rt) { for (let i = 0; i < b.vals.length; i++) out[i] = b.vals[i]; return true; }
        const u = (rt - a.rt) / Math.max(1, b.rt - a.rt), J = jump || 4;
        for (let i = 0; i < b.vals.length; i++) {
          const x = a.vals[i], y = b.vals[i];
          out[i] = Math.abs(y - x) > J ? (u < 0.5 ? x : y) : x + (y - x) * u;     // (a big jump, like a knockout: no sliding across)
        }
        return true;
      };
      T.size = () => buf.length;
      return T;
    }
    // the referee's clock, for stamping snapshots (whole milliseconds, wrapping every few hours)
    const clock = () => Math.round(performance.now()) % 10000000;
    return { define, PH, timeline, clock };
  })();
