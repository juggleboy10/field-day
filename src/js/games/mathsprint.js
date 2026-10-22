  // ================================================================ LEVEL: MATH SPRINT (study hall)
  // Mental maths against the clock: a problem goes up on the chalkboard, four answers hang in front of you, and you tap
  // the right one. Sixty seconds, as many as you can; a wrong answer locks you out for a second and a half.
  // Warm-up (adding and taking away), Times tables (and dividing), Mental mix (percentages, squares, bigger products)
  // and Binary & hex, for the A+ crowd.
  // VR: tap an answer (or point and pull the trigger). Browser: aim and click, or press 1-4.
  const mathsprint = (() => {
    const L = newLevel(53);
    const G = L.group;
    const rand = mulberry32(5353);
    L.grabless = true;
    L.bounds = { minX: -5.6, maxX: 5.6, minZ: -3.5, maxZ: 3.6 };
    L.env = STUDY.env();
    const hall = STUDY.room(G, rand, { w: 12, d: 10, z: -1, h: 4.4 });
    const SPOT_Z = 1.6, ROUND = 60, LOCK = 1.5;
    const MODES = [
      { id: 'add', name: 'Warm-up', sub: 'Adding and taking away' },
      { id: 'times', name: 'Times tables', sub: 'Up to 12 × 12, and dividing' },
      { id: 'mix', name: 'Mental mix', sub: 'Percentages, squares, bigger sums' },
      { id: 'bin', name: 'Binary & hex', sub: 'Number systems for IT' },
    ];
    const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const toBin = (n) => n.toString(2), toHex = (n) => n.toString(16).toUpperCase();
    // a problem: { q, a (the answer, as text), wrong: [three near misses] }
    function nearNums(ans, extra) {
      const out = new Set();
      const cands = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, Number(String(ans).split('').reverse().join(''))].concat(extra || []);
      for (const c of cands.sort(() => rand() - 0.5)) if (Number.isInteger(c) && c >= 0 && c !== ans) out.add(c);
      let k = 3; while (out.size < 3) { out.add(ans + k); k += 1; }
      return [...out].slice(0, 3).map(String);
    }
    function problem(mode) {
      if (mode === 'add') {
        if (rand() < 0.55) { const a = ri(11, 89), b = ri(6, 99 - a); return { q: `${a} + ${b}`, a: String(a + b), wrong: nearNums(a + b) }; }
        const a = ri(25, 99), b = ri(6, a - 5); return { q: `${a} − ${b}`, a: String(a - b), wrong: nearNums(a - b, [a + b - 0]) };
      }
      if (mode === 'times') {
        const a = ri(2, 12), b = ri(2, 12);
        if (rand() < 0.65) return { q: `${a} × ${b}`, a: String(a * b), wrong: nearNums(a * b, [a * (b + 1), (a + 1) * b, a * (b - 1)]) };
        return { q: `${a * b} ÷ ${a}`, a: String(b), wrong: nearNums(b, [b + 1, b - 1, a]) };
      }
      if (mode === 'mix') {
        const k = rand();
        if (k < 0.3) { const p = pick([10, 20, 25, 50, 75, 5, 15]), n = pick([20, 40, 60, 80, 120, 160, 200, 240]); const v = p * n / 100; if (!Number.isInteger(v)) return problem(mode); return { q: `${p}% of ${n}`, a: String(v), wrong: nearNums(v, [v * 2, v / 2 | 0, n - v]) }; }
        if (k < 0.55) { const n = ri(11, 20); return { q: `${n}²`, a: String(n * n), wrong: nearNums(n * n, [n * 2, (n + 1) * (n + 1), (n - 1) * (n - 1)]) }; }
        if (k < 0.8) { const a = ri(12, 49), b = ri(3, 9); return { q: `${a} × ${b}`, a: String(a * b), wrong: nearNums(a * b, [a * b + b, a * b - b, a * b + 10]) }; }
        const d = pick([2, 3, 4, 5]), n = d * ri(6, 30); const name = { 2: 'Half', 3: 'A third', 4: 'A quarter', 5: 'A fifth' }[d];
        return { q: `${name} of ${n}`, a: String(n / d), wrong: nearNums(n / d, [n / (d + 1) | 0, n * d]) };
      }
      // binary and hex
      const k = rand();
      if (k < 0.3) { const n = ri(3, 31); const b = toBin(n); const flip = (i) => { const arr = b.split(''); arr[i] = arr[i] === '1' ? '0' : '1'; return arr.join('').replace(/^0+(?=.)/, ''); };
        const w = new Set(); for (let i = 0; i < b.length && w.size < 3; i++) { const f = flip((i * 7 + 3) % b.length); if (f !== b) w.add(f); } while (w.size < 3) w.add(toBin(n + w.size + 1));
        return { q: `${n} in binary`, a: b, wrong: [...w].slice(0, 3), mono: true }; }
      if (k < 0.6) { const n = ri(5, 63), b = toBin(n); return { q: `${b}₂ in decimal`, a: String(n), wrong: nearNums(n, [n ^ 1, n ^ 2, n ^ 4].filter((x) => x !== n)) }; }
      if (k < 0.8) { const n = ri(16, 255); return { q: `0x${toHex(n)} in decimal`, a: String(n), wrong: nearNums(n, [n + 16, n - 16, parseInt(toHex(n).split('').reverse().join(''), 16)]) }; }
      const n = ri(10, 255), h = toHex(n), alt = [toHex(n + 1), toHex(Math.max(1, n - 1)), toHex(n + 16), h.split('').reverse().join('')].filter((x) => x !== h);
      return { q: `${n} in hex`, a: h, wrong: [...new Set(alt)].slice(0, 3), mono: true };
    }
    L.problem = problem;

    // ---------------------------------------------------------------- the chalkboard and the answers
    addBox(G, 5.2, 2.5, 0.08, lam(0x6a4a2a), 0, 2.35, -5.86);
    const board = STUDY.screen(G, 1024, 470, 5.0, 2.3, 0, 2.35, -5.82, 0, 0x6a4a2a);
    addBox(G, 5.0, 0.05, 0.12, lam(0x6a4a2a), 0, 1.18, -5.76);
    for (let i = 0; i < 4; i++) addBox(G, 0.07, 0.02, 0.02, lam(0xffffff), -2.2 + i * 0.14, 1.215, -5.75);   // chalk
    const deck = STUDY.cards(G, { n: 4, w: 0.5, h: 0.28 });
    const AT = [[-0.29, 1.4], [0.29, 1.4], [-0.29, 1.08], [0.29, 1.08]];

    // ---------------------------------------------------------------- the round
    const S = { ph: 'menu', mode: 'add', t0: 0, score: 0, wrong: 0, p: null, c: -1, lock: 0, streak: 0, best: {}, lastQ: '' };
    try { if (prefs.mathBest && typeof prefs.mathBest === 'object') S.best = Object.assign({}, prefs.mathBest); } catch (e) { /* none */ }
    L.math = S;
    const timeLeft = () => Math.max(0, ROUND - (performance.now() - S.t0) / 1000);
    function showMenu() { S.ph = 'menu'; MODES.forEach((m, i) => deck.set(i, m.name, 'mode', { sub: m.sub, big: 48 })); }
    function startRound(mode) {
      Object.assign(S, { ph: 'play', mode, t0: performance.now(), score: 0, wrong: 0, lock: 0, streak: 0 });
      sfx('whistle', 0.6);
      next();
      forcePresence(); state.dirtyBoard = true;
    }
    L.startRound = startRound;
    function next() {
      let p, n = 0;
      do { p = problem(S.mode); } while (p.q === S.lastQ && n++ < 10);
      S.lastQ = p.q;
      const opts = [p.a].concat(p.wrong.slice(0, 3)).sort(() => rand() - 0.5);
      S.p = p; S.c = opts.indexOf(p.a);
      opts.forEach((t, i) => deck.set(i, t, 'idle', { big: 76, mono: p.mono }));
      boardKey = '';
    }
    function answer(i) {
      if (S.ph === 'menu') { startRound(MODES[i].id); return; }
      if (S.ph !== 'play' || S.lock > 0) return;
      if (i === S.c) {
        S.score += 1; S.streak += 1;
        tone(660 + Math.min(10, S.streak) * 50, 0, 0.09, 'sine', 0.16);
        spawnFloat('+1', deck.cards[i].grp.position.clone().add(new V3(0, 0.25, 0)), '#8bd450');
        next();
      } else {
        S.wrong += 1; S.streak = 0; S.lock = LOCK;
        STUDY.wrong();
        deck.look(i, 'wrong'); deck.look(S.c, 'right');
      }
      forcePresence(); state.dirtyBoard = true;
    }
    L.answer = answer;
    function endRound() {
      S.ph = 'menu';
      const prev = S.best[S.mode] || 0, isBest = S.score > prev;
      if (isBest) { S.best[S.mode] = S.score; prefs.mathBest = Object.assign({}, S.best); savePrefs(); }
      RECORDS.add(L, S.mode, S.score);
      sfx(S.score >= 25 ? 'fanfare' : 'chime', 0.8);
      showToast(`Time! ${S.score} right${S.wrong ? `, ${S.wrong} wrong` : ''}${isBest ? ' (your best!)' : ''}`);
      S.summary = { score: S.score, wrong: S.wrong, mode: S.mode, best: isBest };
      showMenu(); boardKey = '';
      forcePresence(); state.dirtyBoard = true;
    }
    L.endRound = endRound;
    const input = STUDY.input(L, deck, { onPick: (i) => answer(i), enabled: () => state.level === L.idx });
    L.throwLabel = () => 'Answer';

    // ---------------------------------------------------------------- the chalkboard
    let boardKey = '';
    function drawBoard() {
      const t = S.ph === 'play' ? Math.ceil(timeLeft()) : 0;
      const key = `${S.ph}|${S.p ? S.p.q : ''}|${t}|${S.score}|${S.lock > 0}|${S.summary ? S.summary.score : ''}`;
      if (key === boardKey) return; boardKey = key;
      const g = board.g, W = 1024, H = 470;
      g.fillStyle = '#2a4a3a'; g.fillRect(0, 0, W, H);
      // a little chalk dust
      g.fillStyle = 'rgba(255,255,255,0.04)'; for (let i = 0; i < 30; i++) g.fillRect((i * 337) % W, (i * 191) % H, 60, 6);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      if (S.ph === 'menu') {
        g.fillStyle = '#f4f2e8'; g.font = `900 110px ${DISPLAY}`; g.fillText('MATH SPRINT', W / 2, 130);
        g.font = `400 36px ${BODY}`; g.fillStyle = '#d8e8d8';
        if (S.summary) { const s = S.summary; g.font = `800 72px ${DISPLAY}`; g.fillStyle = '#ffe08a'; g.fillText(`${s.score} in 60 seconds`, W / 2, 250); g.font = `400 34px ${BODY}`; g.fillStyle = '#d8e8d8'; g.fillText(`${MODES.find((m) => m.id === s.mode).name}  ·  ${s.best ? 'your best yet!' : `best ${S.best[s.mode] || 0}`}`, W / 2, 310); }
        else STUDY.wrap(g, 'Sixty seconds. Tap the right answer as fast as you can. A wrong one costs you a second and a half.', W / 2, 220, W - 140, 46);
        g.fillStyle = '#ffe08a'; g.font = `700 34px ${BODY}`; g.fillText('Pick a mode below', W / 2, 420);
        board.tex.needsUpdate = true; return;
      }
      g.textAlign = 'left'; g.fillStyle = '#d8e8d8'; g.font = `700 40px ${BODY}`; g.fillText(MODES.find((m) => m.id === S.mode).name, 40, 60);
      g.textAlign = 'right'; g.fillStyle = t <= 10 ? '#ff9a8a' : '#f4f2e8'; g.font = `900 72px ${DISPLAY}`; g.fillText(`${t}`, W - 40, 80);
      g.fillStyle = '#ffe08a'; g.font = `800 48px ${DISPLAY}`; g.fillText(`${S.score} right`, W - 40, 140);
      g.textAlign = 'center'; g.fillStyle = S.lock > 0 ? '#ff9a8a' : '#ffffff';
      const q = `${S.p.q}${/in |of /.test(S.p.q) ? '' : ' = ?'}`;
      g.font = `900 ${q.length > 14 ? 120 : 170}px ${DISPLAY}`; g.fillText(q, W / 2, 330, W - 80);
      if (S.lock > 0) { g.font = `700 40px ${BODY}`; g.fillText(`It’s ${S.p.a}`, W / 2, 420); }
      board.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    function stand() { S.slot = STUDY.slotOf(L); STUDY.standAt(STUDY.SLOT_X[S.slot] * 0.6, state.mode === 'vr' ? SPOT_Z : SPOT_Z + 1.0, 0, -0.08); }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      hall.tick();
      if (!here) { input.hide(); return; }
      if (STUDY.slotOf(L) !== S.slot) stand();
      const ox = STUDY.SLOT_X[S.slot || 0] * 0.6;
      AT.forEach(([x, y], i) => deck.place(i, ox + x, y, SPOT_Z - 0.5, 0, -0.25));
      if (S.ph === 'play') {
        if (timeLeft() <= 0) endRound();
        else if (S.lock > 0) { S.lock -= dt; if (S.lock <= 0) { S.lock = 0; next(); } }
      }
      input.tick(dt);
      drawBoard();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'menu' ? 'Math Sprint  ·  aim at a mode and click (or press 1-4)' : `${Math.ceil(timeLeft())} s  ·  ${S.score} right  ·  click the answer or press 1-4`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ ms: [S.score, Math.max(0, ...Object.values(S.best).map(Number).filter(Number.isFinite)), S.ph === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.ms;
      if (!Array.isArray(a) || a.length !== 3 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e5)) { st.ms = null; return; }
      if (!st.ms || st.ms[0] !== a[0] || st.ms[1] !== a[1]) state.dirtyBoard = true;
      st.ms = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? L.presence().ms : st.ms;
      if (!a) return { best: 0, text: '' };
      return { best: a[1], text: `${a[2] ? `${a[0]} now · ` : ''}best ${a[1]}` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.85, 2.0, -0.8, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#2a4a3a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ffe08a'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffe08a'; g.font = `800 56px ${DISPLAY}`; g.fillText('Quickest minds', 36, 80);
      g.fillStyle = '#d8e8d8'; g.font = `400 24px ${BODY}`; g.fillText('Most right in 60 seconds (any mode)', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 3.6, 3.0, -Math.PI * 0.75);
    RECORDS.def(L, MODES.map((m) => ({ k: m.id, label: `${m.name}: most in a minute` })), { x: 5.75, z: 0.2, yaw: -Math.PI / 2 });
    L.hudActions = [{ label: () => (S.ph === 'menu' ? 'Start: warm-up' : 'End round'), run: () => { if (S.ph === 'menu') startRound('add'); else endRound(); } }];
    L.hints = [['Tap', 'the right answer'], ['Point + trigger', 'works too']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Aim + click', 'pick an answer'], ['1-4', 'answer by number']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { S.summary = null; showMenu(); boardKey = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; showMenu(); input.hide(); };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 1.7, 3.0); camera.lookAt(0, 1.8, -3); };
    showMenu();
    L.mathInternals = { S, deck, answer, next, startRound, endRound, problem, MODES };
    MUSIC_THEMES.mathsprint = { gain: 0.6, bpm: 132, swing: 0, chords: ['C', 'G', 'Am', 'F'], arp: { inst: 'marimba', every: 1, order: [1, 2, 3, 4, 3, 2, 1, 2] }, bass: { at: [0, 4, 8, 12] }, drums: { k: 'x...x...x...x...', h: 'o.o.o.o.o.o.o.o.' }, cut: 4800 };
    return L;
  })();
