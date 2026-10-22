  // ================================================================ LEVEL: TRIGGER WORDS (study hall)
  // Quiz-show training: learn the phrases that give the answer away ("Norwegian playwright" → Ibsen).
  // Buzz & recall: the trigger goes up on the board; buzz when you know it, see the response, and say whether you had
  // it. Spaced repetition: the ones you miss come back soon, the ones you know come back less and less (five boxes,
  // and "mastered" is box 4 or 5). Rapid fire: 60 seconds of four-way picks. Pick a category, or all of them.
  // VR: touch a card (or point and pull the trigger). Browser: aim and click, or press 1-4 (Space buzzes too).
  const triggers = (() => {
    const L = newLevel(54);
    const G = L.group;
    const rand = mulberry32(5454);
    L.grabless = true;
    L.bounds = { minX: -5.6, maxX: 5.6, minZ: -3.5, maxZ: 3.6 };
    L.env = STUDY.env();
    const hall = STUDY.room(G, rand, { w: 12, d: 10, z: -1, h: 4.8 });
    const SPOT_Z = 1.6, ROUND = 60, BUZZ_T = 10, GAP = [0, 2, 6, 15, 35, 80];   // reviews until a box comes due again
    const TT = TRIGGERS.T, keyOf = (t) => t[1];

    // ---------------------------------------------------------------- the board, the cards
    const board = STUDY.screen(G, 1024, 576, 4.6, 2.59, 0, 2.75, -5.85, 0, 0xc8a040);
    const deck = STUDY.cards(G, { n: 4, w: 0.5, h: 0.28 });
    const AT = [[-0.29, 1.4], [0.29, 1.4], [-0.29, 1.08], [0.29, 1.08]];
    const prog = STUDY.screen(G, 640, 760, 2.0, 2.375, 5.88, 2.1, -1.4, -Math.PI / 2, 0x6a4a30);

    // ---------------------------------------------------------------- what you know (saved)
    const mem = () => { prefs.trig = prefs.trig && typeof prefs.trig === 'object' ? prefs.trig : {}; const m = prefs.trig; m.n = m.n | 0; m.c = m.c || {}; return m; };
    // a trigger's record: [box 0-5, the review number it was last seen at, times seen, times right]
    const rec = (t) => mem().c[keyOf(t)] || null;
    const mastered = (t) => { const r = rec(t); return !!r && r[0] >= 4; };
    function grade(t, ok) {
      const m = mem(); m.n += 1;
      const r = m.c[keyOf(t)] || [0, 0, 0, 0];
      r[0] = ok ? Math.min(5, r[0] + 1) : 1; r[1] = m.n; r[2] += 1; r[3] += ok ? 1 : 0;
      m.c[keyOf(t)] = r; savePrefs();
    }
    // the next trigger to review: the most overdue one; if nothing's due, a new one; failing that, the oldest
    function nextDue(pool, weakOnly) {
      const m = mem();
      let best = null, bestScore = -Infinity;
      for (const t of pool) {
        const r = rec(t);
        if (!r) continue;
        if (weakOnly && r[0] > 1) continue;
        const over = m.n - r[1] - GAP[r[0]];
        if (keyOf(t) === S.lastKey) continue;
        if (over >= 0 && over - r[0] * 2 + rand() > bestScore) { bestScore = over - r[0] * 2 + rand(); best = t; }
      }
      if (best) return best;
      if (!weakOnly) { const fresh = pool.filter((t) => !rec(t)); if (fresh.length) return fresh[Math.floor(rand() * fresh.length)]; }
      const seen = pool.filter((t) => rec(t) && keyOf(t) !== S.lastKey && (!weakOnly || rec(t)[0] <= 1));
      if (!seen.length) return null;
      seen.sort((a, b) => rec(a)[1] - rec(b)[1]);
      return seen[0];
    }

    // ---------------------------------------------------------------- the session
    const S = { ph: 'menu', mode: 'recall', cat: -1, t: null, t0: 0, buzzT: 0, score: 0, wrong: 0, lock: 0, c: -1, lastKey: '', best: 0, reviewed: 0, right: 0 };
    try { if (Number.isInteger(prefs.trigBest)) S.best = prefs.trigBest; } catch (e) { /* none */ }
    L.trig = S;
    const pool = () => TT.filter((t) => S.cat < 0 || t[0] === TRIGGERS.CATS[S.cat]);
    const catName = () => (S.cat < 0 ? 'All categories' : TRIGGERS.CATS[S.cat]);
    function showMenu() {
      S.ph = 'menu';
      deck.set(0, 'Buzz & recall', 'mode', { sub: 'Spaced repetition', big: 46 });
      deck.set(1, 'Rapid fire', 'mode', { sub: 'Four-way picks, 60 seconds', big: 46 });
      deck.set(2, catName(), 'mode', { sub: 'Category: touch to change', big: 42 });
      deck.set(3, 'Weak spots', 'mode', { sub: 'Only the ones you’ve missed', big: 46 });
      for (let i = 0; i < 4; i++) deck.show(i, true);
      boardKey = '';
    }
    function start(mode) {
      if (mode === 'weak' && !pool().some((t) => rec(t) && rec(t)[0] <= 1)) { showToast('No weak spots here yet: play Buzz & recall first'); return; }
      Object.assign(S, { mode, score: 0, wrong: 0, reviewed: 0, right: 0, lock: 0, t0: performance.now(), summary: null });
      sfx('chime', 0.5);
      if (mode === 'rapid') rapidNext(); else recallNext();
      forcePresence(); state.dirtyBoard = true;
    }
    L.start = start;
    // buzz & recall
    function recallNext() {
      const t = nextDue(pool(), S.mode === 'weak');
      if (!t) { finish(); return; }
      S.t = t; S.lastKey = keyOf(t); S.ph = 'clue'; S.buzzT = performance.now();
      deck.set(0, 'Buzz!', 'mode', { sub: 'I know it', big: 70 }); deck.show(0, true);
      deck.set(1, 'Show me', 'dim', { sub: 'No idea', big: 46 }); deck.show(1, true);
      deck.set(2, 'Done', 'dim', { sub: 'End the session', big: 46 }); deck.show(2, true);
      deck.show(3, false);
      boardKey = '';
    }
    function reveal(buzzed) {
      if (S.ph !== 'clue') return;
      S.ph = 'reveal'; S.buzzed = buzzed; S.took = (performance.now() - S.buzzT) / 1000;
      if (buzzed) tone(880, 0, 0.18, 'square', 0.08);
      deck.set(0, 'Got it', 'right', { sub: 'I had it', big: 60 });
      deck.set(1, 'Missed it', 'wrong', { sub: 'Bring it back soon', big: 52 });
      deck.set(2, 'Done', 'dim', { sub: 'End the session', big: 46 });
      boardKey = '';
    }
    function judge(ok) {
      if (S.ph !== 'reveal') return;
      grade(S.t, ok); S.reviewed += 1; if (ok) S.right += 1;
      if (ok) STUDY.right(); else STUDY.wrong();
      progKey = '';
      recallNext();
      forcePresence(); state.dirtyBoard = true;
    }
    L.judge = judge; L.reveal = reveal;
    // rapid fire
    function rapidNext() {
      const p = pool();
      let t; do { t = p[Math.floor(rand() * p.length)]; } while (keyOf(t) === S.lastKey && p.length > 1);
      S.lastKey = keyOf(t);
      // the wrong answers come from the same category, so they're the plausible ones
      const same = TT.filter((x) => x[0] === t[0] && x[2] !== t[2] && x[3] === t[3]).sort(() => rand() - 0.5).slice(0, 3);
      const opts = [t[2]].concat(same.map((x) => x[2])).sort(() => rand() - 0.5);
      S.t = t; S.c = opts.indexOf(t[2]); S.ph = 'rapid';
      opts.forEach((o, i) => { deck.set(i, o, 'idle', { big: 46 }); deck.show(i, true); });
      boardKey = '';
    }
    function rapidPick(i) {
      if (S.lock > 0) return;
      if (i === S.c) { S.score += 1; tone(660 + Math.min(10, S.score) * 30, 0, 0.09, 'sine', 0.15); rapidNext(); }
      else { S.wrong += 1; S.lock = 1.2; STUDY.wrong(); deck.look(i, 'wrong'); deck.look(S.c, 'right'); }
      forcePresence(); state.dirtyBoard = true;
    }
    function finish() {
      if (S.mode === 'rapid') {
        const isBest = S.score > S.best;
        if (isBest) { S.best = S.score; prefs.trigBest = S.best; savePrefs(); }
        RECORDS.add(L, 'rapid', S.score);
        showToast(`Time! ${S.score} right${isBest ? ' (your best!)' : ''}`);
        S.summary = { rapid: true, score: S.score, wrong: S.wrong, best: isBest };
      } else {
        S.summary = { rapid: false, reviewed: S.reviewed, right: S.right };
        if (S.reviewed) showToast(`${S.right} of ${S.reviewed} recalled`);
      }
      RECORDS.add(L, 'mastered', TT.filter(mastered).length);
      sfx('chime', 0.7);
      showMenu();
      forcePresence(); state.dirtyBoard = true;
    }
    L.finish = finish;
    function onPick(i) {
      if (S.ph === 'menu') {
        if (i === 2) { S.cat = S.cat + 1 >= TRIGGERS.CATS.length ? -1 : S.cat + 1; showMenu(); return; }
        start(['recall', 'rapid', null, 'weak'][i]); return;
      }
      if (S.ph === 'clue') { if (i === 0) reveal(true); else if (i === 1) reveal(false); else if (i === 2) finish(); return; }
      if (S.ph === 'reveal') { if (i === 0) judge(true); else if (i === 1) judge(false); else if (i === 2) finish(); return; }
      if (S.ph === 'rapid') rapidPick(i);
    }
    L.onPick = onPick;
    const input = STUDY.input(L, deck, { onPick, enabled: () => state.level === L.idx });
    // a click (or Space) on a card picks it; anywhere else it buzzes in
    L.deskFire = ((f) => () => { camera.getWorldPosition(_o); camera.getWorldQuaternion(_q); if (deck.pickRay(_o, _d.set(0, 0, -1).applyQuaternion(_q)) >= 0 || S.ph !== 'clue') f(); else reveal(true); })(L.deskFire);
    const _o = new V3(), _q = new Q4(), _d = new V3();
    L.throwLabel = () => (S.ph === 'clue' ? 'Buzz' : S.ph === 'reveal' ? 'Got it' : 'Pick');

    // ---------------------------------------------------------------- the board (a game-show blue)
    let boardKey = '';
    const SERIF = 'Georgia, "Times New Roman", serif';
    function drawBoard() {
      const t = S.ph === 'rapid' ? Math.ceil(Math.max(0, ROUND - (performance.now() - S.t0) / 1000)) : S.ph === 'clue' ? Math.ceil(Math.max(0, BUZZ_T - (performance.now() - S.buzzT) / 1000)) : 0;
      const key = `${S.ph}|${S.t ? keyOf(S.t) : ''}|${t}|${S.score}|${S.lock > 0}|${S.cat}|${S.summary ? JSON.stringify(S.summary) : ''}`;
      if (key === boardKey) return; boardKey = key;
      const g = board.g, W = 1024, H = 576;
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0a1a9a'); gr.addColorStop(1, '#060c6a');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const shadow = (txt, x, y, w) => { g.fillStyle = '#000000'; g.fillText(txt, x + 4, y + 4, w); g.fillStyle = g._col; g.fillText(txt, x, y, w); };
      if (S.ph === 'menu') {
        g._col = '#ffffff'; g.font = `900 100px ${DISPLAY}`; shadow('TRIGGER WORDS', W / 2, 130, W - 60);
        g._col = '#ffcc4a'; g.font = `700 36px ${SERIF}`; shadow('The phrases that give the answer away', W / 2, 190, W - 80);
        const all = pool(), known = all.filter(mastered).length, seen = all.filter((x) => rec(x)).length;
        g._col = '#ffffff'; g.font = `700 44px ${SERIF}`; shadow(`${catName()}: ${known} mastered, ${seen} seen, of ${all.length}`, W / 2, 300, W - 80);
        if (S.summary) {
          const s = S.summary; g._col = '#ffcc4a'; g.font = `700 40px ${SERIF}`;
          shadow(s.rapid ? `Rapid fire: ${s.score} right${s.best ? ' (your best!)' : ''}` : s.reviewed ? `Last session: ${s.right} of ${s.reviewed} recalled` : '', W / 2, 380, W - 80);
        }
        g._col = '#c8d0ff'; g.font = `400 30px ${BODY}`; shadow('Pick below: the third card changes the category', W / 2, 500, W - 80);
        board.tex.needsUpdate = true; return;
      }
      const tr = S.t;
      g._col = '#c8d0ff'; g.font = `700 34px ${BODY}`; shadow(tr[0].toUpperCase(), W / 2, 60, W - 80);
      if (S.ph === 'rapid' || S.ph === 'clue') { g.textAlign = 'right'; g._col = t <= 3 ? '#ff8a7a' : '#ffffff'; g.font = `900 52px ${DISPLAY}`; shadow(String(t), W - 36, 64); g.textAlign = 'center'; }
      if (S.ph === 'rapid') { g.textAlign = 'left'; g._col = '#ffcc4a'; g.font = `900 52px ${DISPLAY}`; shadow(String(S.score), 36, 64); g.textAlign = 'center'; }
      // the trigger, big and in capitals, like a clue
      const clue = tr[1].toUpperCase();
      g._col = '#ffffff';
      const sz = STUDY.fit(g, clue, W - 120, 3, 84, 40, 700, SERIF);
      const nl = Math.min(3, STUDY.wrap(g, clue, 0, 0, W - 120, sz * 1.15, 0, false));
      const y0 = (S.ph === 'reveal' ? 210 : 290) - (nl - 1) * sz * 0.58;
      for (let pass = 0; pass < 2; pass++) { g.fillStyle = pass ? '#ffffff' : '#000000'; STUDY.wrap(g, clue, W / 2 + (pass ? 0 : 4), y0 + (pass ? 0 : 4), W - 120, sz * 1.15, 3); }
      if (S.ph === 'reveal') {
        g._col = '#ffcc4a'; g.font = `700 60px ${SERIF}`; shadow(TRIGGERS.respond(tr), W / 2, 400, W - 80);
        if (tr[4]) { g._col = '#c8d0ff'; g.font = `400 32px ${BODY}`; shadow(tr[4], W / 2, 460, W - 80); }
        g._col = '#8a9aff'; g.font = `400 26px ${BODY}`;
        shadow(`${S.buzzed ? `Buzzed in ${S.took.toFixed(1)} s` : 'No buzz'}  ·  did you have it?`, W / 2, 540, W - 80);
      } else if (S.ph === 'clue') {
        g._col = '#8a9aff'; g.font = `400 28px ${BODY}`; shadow('Buzz when you know it (Space, or the first card)', W / 2, 540, W - 80);
      } else if (S.ph === 'rapid' && S.lock > 0) {
        g._col = '#ffcc4a'; g.font = `700 44px ${SERIF}`; shadow(TRIGGERS.respond(tr), W / 2, 480, W - 80);
      }
      board.tex.needsUpdate = true;
    }
    // the progress chart on the wall: mastered per category
    let progKey = '';
    function drawProg() {
      const key = String(mem().n);
      if (key === progKey) return; progKey = key;
      const g = prog.g, W = 640;
      g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, W, 760);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#0a1a9a'; g.font = `900 52px ${DISPLAY}`; g.fillText('WHAT YOU KNOW', W / 2, 64);
      g.fillStyle = '#6a6050'; g.font = `400 22px ${BODY}`; g.fillText('Mastered (box 4+) out of each category', W / 2, 98);
      let y = 150;
      for (const c of TRIGGERS.CATS) {
        const all = TT.filter((t) => t[0] === c), m = all.filter(mastered).length, s = all.filter((t) => rec(t)).length;
        g.textAlign = 'left'; g.fillStyle = '#2a2a2a'; g.font = `700 24px ${BODY}`; g.fillText(c, 30, y);
        g.fillStyle = '#e4dccc'; g.fillRect(30, y + 10, 460, 14);
        g.fillStyle = '#c8b8e8'; g.fillRect(30, y + 10, 460 * s / all.length, 14);
        g.fillStyle = '#3a6ad8'; g.fillRect(30, y + 10, 460 * m / all.length, 14);
        g.textAlign = 'right'; g.fillStyle = '#2a2a2a'; g.font = `800 26px ${DISPLAY}`; g.fillText(`${m}/${all.length}`, W - 30, y + 22);
        y += 50;
      }
      g.textAlign = 'center'; g.fillStyle = '#6a6050'; g.font = `400 20px ${BODY}`; g.fillText('Dark blue: mastered · light: seen', W / 2, 748);
      prog.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    function stand() { S.slot = STUDY.slotOf(L); STUDY.standAt(STUDY.SLOT_X[S.slot] * 0.6, state.mode === 'vr' ? SPOT_Z : SPOT_Z + 1.0, 0, -0.04); }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      hall.tick();
      if (!here) { input.hide(); return; }
      if (STUDY.slotOf(L) !== S.slot) stand();
      const ox = STUDY.SLOT_X[S.slot || 0] * 0.6;
      AT.forEach(([x, y], i) => deck.place(i, ox + x, y, SPOT_Z - 0.5, 0, -0.25));
      if (S.ph === 'rapid') {
        if (performance.now() - S.t0 > ROUND * 1000) finish();
        else if (S.lock > 0) { S.lock -= dt; if (S.lock <= 0) { S.lock = 0; rapidNext(); } }
      } else if (S.ph === 'clue' && performance.now() - S.buzzT > BUZZ_T * 1000) reveal(false);
      input.tick(dt);
      drawBoard(); drawProg();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'menu' ? 'Trigger Words  ·  aim at a card and click (or press 1-4)' : S.ph === 'clue' ? 'Space or 1: buzz in  ·  2: show me  ·  3: done' : S.ph === 'reveal' ? '1: got it  ·  2: missed it  ·  3: done' : `${S.score} right  ·  click the answer or press 1-4`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ tw: [S.ph === 'rapid' ? S.score : 0, S.best, TT.filter(mastered).length] });
    L.readPresence = (r, pres, st) => {
      const a = pres.tw;
      if (!Array.isArray(a) || a.length !== 3 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e5)) { st.tw = null; return; }
      if (!st.tw || st.tw.join() !== a.join()) state.dirtyBoard = true;
      st.tw = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? L.presence().tw : st.tw;
      if (!a) return { best: 0, text: '' };
      return { best: a[2], text: `${a[2]} mastered · rapid ${a[1]}` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.85, 2.0, -0.8, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#0a1a9a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ffcc4a'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffcc4a'; g.font = `800 56px ${DISPLAY}`; g.fillText('Champions', 36, 80);
      g.fillStyle = '#c8d0ff'; g.font = `400 24px ${BODY}`; g.fillText(`Triggers mastered, out of ${TT.length}`, 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 3.6, 3.0, -Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'rapid', label: 'Rapid fire: most in a minute' }, { k: 'mastered', label: 'Triggers mastered' }], { x: 5.75, z: 1.4, yaw: -Math.PI / 2 });
    L.hudActions = [{ label: () => (S.ph === 'menu' ? 'Buzz & recall' : 'Done'), run: () => { if (S.ph === 'menu') start('recall'); else finish(); } }];
    L.hints = [['Touch a card', 'buzz, then say if you had it'], ['Point + trigger', 'works too']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Space', 'buzz in'], ['1-4', 'pick a card'], ['Aim + click', 'works too']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { S.summary = null; showMenu(); progKey = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; showMenu(); input.hide(); };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 1.7, 3.0); camera.lookAt(0, 2.2, -3); };
    showMenu();
    L.trigInternals = { S, deck, onPick, start, finish, reveal, judge, grade, nextDue, rec, mastered, mem, pool };
    MUSIC_THEMES.triggers = { gain: 0.5, bpm: 104, swing: 0.15, chords: ['Bbmaj7', 'Gm7', 'Cm7', 'F7'], comp: { inst: 'ep', at: [0, 6, 10], dur: 0.5 }, bass: { walk: true }, drums: { k: 'x.......x.......', s: '....x.......x...', h: 'o-o-o-o-o-o-o-o-' }, cut: 3400 };
    return L;
  })();
