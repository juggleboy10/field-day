  // ================================================================ LEVEL: ROCK-PAPER-SCISSORS TOURNAMENT
  // Eight players, a knockout bracket, best of three in every match (draws throw again). Friends who are here
  // take places in the bracket and bots fill the rest, each with their own habits (Rocky loves rock; Copycat Cal
  // throws whatever you threw last). Everyone throws on the same count: Rock… Paper… Scissors… SHOOT!
  // VR: on SHOOT, make your hand: squeeze the grip for a fist (rock), leave it open (paper), or pull just the
  // trigger (scissors). Browser: pick with R, P or S (or 1, 2, 3, or the buttons on your table) before SHOOT.
  // One player's device (the first in the room) runs the tournament.
  const rps = (() => {
    const L = newLevel(41);
    const G = L.group;
    const rand = mulberry32(4141);
    L.grabless = true;
    L.bounds = { minX: -11, maxX: 11, minZ: -8, maxZ: 8 };
    L.env = {
      sky: skyTexture([[0, '#1a0a2a'], [1, '#2a1040']]),
      bg: 0x1a0a2a, fog: [0x1a0a2a, 20, 60], hemi: [0xffe8ff, 0x302040, 0.75],
      sun: [0xffffff, 0.55], sunDir: new V3(0.2, 1, 0.5), ambient: [0x503a60, 0.45], sprite: null,
    };
    const ICON = ['✊', '✋', '✌️'], NAME = ['Rock', 'Paper', 'Scissors'];
    const beats = (a, b) => (a - b + 3) % 3 === 1;   // paper beats rock, scissors paper, rock scissors
    const BOTS = [
      { name: 'Rocky', col: '#8a8a9a', bias: [0.55, 0.22, 0.23] },
      { name: 'Paper Pam', col: '#f4f0e8', bias: [0.22, 0.55, 0.23] },
      { name: 'Snips', col: '#ff7a5a', bias: [0.22, 0.23, 0.55] },
      { name: 'Copycat Cal', col: '#ffd23f', copy: true },
      { name: 'Random Randy', col: '#8bd450', bias: [1 / 3, 1 / 3, 1 / 3] },
      { name: 'Stony Stu', col: '#6a6a7a', bias: [0.45, 0.3, 0.25] },
      { name: 'Lucky Lou', col: '#4fc3f7', bias: [0.3, 0.35, 0.35] },
    ];
    const TABLE_X = [-6.3, -2.1, 2.1, 6.3];

    // ---------------------------------------------------------------- the stage
    const floorTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#2a1a3a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,120,220,0.25)'; g.lineWidth = 2; for (let k = 0; k <= 128; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 128); g.moveTo(0, k); g.lineTo(128, k); g.stroke(); } });
    floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping; floorTex.tex.repeat.set(8, 6);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), new THREE.MeshLambertMaterial({ map: floorTex.tex })); fl.rotation.x = -Math.PI / 2; G.add(fl);
    for (const [w, x, z, ry] of [[24, 0, -9, 0], [18, -12, 0, Math.PI / 2], [18, 12, 0, -Math.PI / 2], [24, 0, 9, Math.PI]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 6), lam(0x2a1440)); m.position.set(x, 3, z); m.rotation.y = ry; G.add(m); }
    // spotlights' glow, neon strips
    const glowM = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffa0e0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    for (const x of TABLE_X) { const s = new THREE.Sprite(glowM); s.position.set(x, 3.6, 0); s.scale.set(3, 3, 1); G.add(s); }
    for (const [z, col] of [[-8.95, 0xff4d8a], [8.95, 0x4fc3f7]]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.1), new THREE.MeshBasicMaterial({ color: col })); s.position.set(0, 4.5, z); s.rotation.y = z > 0 ? Math.PI : 0; G.add(s); }
    makePlate(G, 'ROCK  ·  PAPER  ·  SCISSORS', 6, 0.6, new V3(0, 5.2, -8.9), 0, { bg: '#2a1440', fg: '#ffd23f', size: 0.6 });
    // the bracket board on the back wall
    const brC = canvasTexture(1024, 512);
    const bracket = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: brC.tex })); bracket.position.set(0, 2.9, -8.85); G.add(bracket);
    // four tables, each with a countdown sign and a big result sign either side
    const tables = TABLE_X.map((x, k) => {
      addBox(G, 1.2, 0.9, 0.7, lam(0x4a2a6a), x, 0.45, 0);
      addBox(G, 1.3, 0.05, 0.8, lam(0xff4d8a), x, 0.92, 0);
      const sign = makePlate(G, `Table ${k + 1}`, 1.6, 0.3, new V3(x, 2.6, 0), 0, { bg: '#16142e', fg: '#ffffff', size: 0.6 });
      const sign2 = makePlate(G, `Table ${k + 1}`, 1.6, 0.3, new V3(x, 2.6, -0.01), Math.PI, { bg: '#16142e', fg: '#ffffff', size: 0.6 });
      // the throws, shown big above each side of the table
      const show = [0, 1].map((side) => { const z = side ? -0.22 : 0.22; const p = makePlate(G, '', 0.3, 0.3, new V3(x, 1.3, z), 0, { bg: 'rgba(0,0,0,0)', fg: '#ffffff', size: 0.8 }); p.material.transparent = true; const p2 = makePlate(G, '', 0.3, 0.3, new V3(x, 1.3, z - 0.01), Math.PI, { bg: 'rgba(0,0,0,0)', fg: '#ffffff', size: 0.8 }); p2.material.transparent = true; return [p, p2]; });
      return { x, sign, sign2, show, key: '' };
    });
    // browser buttons: a set on each table's near side
    const pickBtns = [];
    TABLE_X.forEach((x) => [0, 1, 2].forEach((c) => { const b = makeButton(L, new V3(x - 0.36 + c * 0.36, 0.98, 0.28), [0x9a9aaa, 0xf4f0e8, 0xff7a5a][c], NAME[c], () => pick(c), { pedestal: false }); pickBtns.push(b); }));

    // ---------------------------------------------------------------- people at the tables
    const botAv = BOTS.map((b, i) => {
      const g = buildAvatar(b.col, [1, 2, 3, 0, 1, 2, 3][i], i % 4, true, 1, 2);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.42; g.add(tag); g.visible = false; G.add(g);
      return g;
    });
    // my hand's shape, floating by my right hand (VR) so I can see what I'm making
    const myHandSign = makePlate(L.overlay, '', 0.12, 0.12, new V3(), 0, { bg: 'rgba(0,0,0,0)', fg: '#ffffff', size: 0.85 }); myHandSign.material.transparent = true; myHandSign.material.depthTest = false; myHandSign.renderOrder = 998;

    // ---------------------------------------------------------------- the tournament (run by the host)
    // ids: 8 entrants ('b0'.. bots, or peer ids). mt: this round's matches [a, b, winsA, winsB, lastA, lastB, winner].
    const S = { g: 0, ph: 'lobby', rnd: 0, ids: [], mt: [], seq: 0, shootAt: 0, t: 0, champ: '', got: {}, prev: {}, msg: '', msgSeq: 0 };
    L.rp = S;
    const humansHere = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const isHost = () => humansHere()[0] === state.myPeer;
    const botOf = (id) => (id && id[0] === 'b' && id.length <= 2 ? Number(id.slice(1)) : -1);
    const nameOf = (id) => { const b = botOf(id); if (b >= 0) return BOTS[b].name; if (id === state.myPeer) return state.name || 'You'; const rec = remotes.get(id); return rec ? rec.name : 'Someone'; };
    function say(m) { S.msg = m; S.msgSeq += 1; showToast(m); }
    const COUNT = 2600, SHOW = 2000, GRACE = 650;
    function startTournament() {
      const people = humansHere().filter((id) => { if (id === state.myPeer) return !(L.sitOut && L.sitOut.on); const st = remotes.get(id).lvState[L.id]; return !(st && st.sitOut); }).slice(0, 8);
      const ids = people.slice();
      const order = [0, 1, 2, 3, 4, 5, 6].sort(() => rand() - 0.5);
      for (const b of order) { if (ids.length >= 8) break; ids.push(`b${b}`); }
      // spread the people round the bracket so friends don't meet in the first round
      const seeded = new Array(8);
      const slotsFor = [0, 2, 4, 6, 1, 3, 5, 7];
      ids.forEach((id, k) => { seeded[slotsFor[k]] = id; });
      Object.assign(S, { g: (S.g + 1) % 100000, ids: seeded, rnd: 0, champ: '', prev: {} });
      newRound();
      sfx('fanfare', 0.6);
      say('The tournament begins! Best of three, winners go through');
    }
    L.startTournament = startTournament;
    function newRound() {
      const alive = S.rnd === 0 ? S.ids.slice() : S.mt.map((m) => m[6]);
      S.mt = [];
      for (let k = 0; k < alive.length; k += 2) S.mt.push([alive[k], alive[k + 1], 0, 0, -1, -1, '']);
      nextThrow();
      forcePresence();
    }
    function nextThrow() {
      S.seq += 1; S.ph = 'count'; S.shootAt = Date.now() + COUNT; S.got = {};
      forcePresence();
    }
    function botPick(id, opp) {
      const b = BOTS[botOf(id)];
      if (b.copy && S.prev[opp] !== undefined) return S.prev[opp];
      const r = rand(), w = b.bias || [1 / 3, 1 / 3, 1 / 3];
      return r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2;
    }
    function resolve() {
      const roundName = ['Quarter-final', 'Semi-final', 'Final'][S.rnd] || 'Round';
      for (const m of S.mt) {
        if (m[6]) { m[4] = -1; m[5] = -1; continue; }
        const pickOf = (id, opp) => (botOf(id) >= 0 ? botPick(id, opp) : S.got[id] !== undefined ? S.got[id] : Math.floor(rand() * 3));
        const a = pickOf(m[0], m[1]), b = pickOf(m[1], m[0]);
        m[4] = a; m[5] = b; S.prev[m[0]] = a; S.prev[m[1]] = b;
        if (beats(a, b)) m[2] += 1; else if (beats(b, a)) m[3] += 1;
        if (m[2] >= 2) m[6] = m[0]; else if (m[3] >= 2) m[6] = m[1];
      }
      S.ph = 'show'; S.t = Date.now();
      // my result
      const mm = S.mt.find((m) => m[0] === state.myPeer || m[1] === state.myPeer);
      void roundName;
      forcePresence();
      return mm;
    }
    L.resolve = resolve;
    function hostStep() {
      const now = Date.now();
      if (S.ph === 'count' && now >= S.shootAt) {
        // wait a moment for everyone's throw to arrive
        const people = S.mt.filter((m) => !m[6]).flatMap((m) => [m[0], m[1]]).filter((id) => botOf(id) < 0);
        if (people.every((id) => S.got[id] !== undefined) || now >= S.shootAt + GRACE) resolve();
      } else if (S.ph === 'show' && now - S.t > SHOW) {
        if (S.mt.every((m) => m[6])) {
          if (S.mt.length === 1) { S.champ = S.mt[0][6]; S.ph = 'done'; S.t = now; say(`${nameOf(S.champ)} ${S.champ === state.myPeer ? 'win' : 'wins'} the tournament!`); sfx('fanfare', 1); sfx('cheer', 1); forcePresence(); return; }
          S.ph = 'between'; S.t = now; say(`On to the ${['semi-finals', 'final'][S.rnd] || 'next round'}!`); forcePresence();
        } else nextThrow();
      } else if (S.ph === 'between' && now - S.t > 2600) { S.rnd += 1; newRound(); }
    }
    L.hostStep = hostStep;

    // ---------------------------------------------------------------- my throw
    const ME = { pick: -1, sentSeq: -1, claim: [0, 0, -1], localShoot: 0, seenSeq: -1, wins: 0 };
    try { if (Number.isInteger(prefs.rpsWins)) ME.wins = prefs.rpsWins; } catch (e) { /* none */ }
    function pick(c) { ME.pick = c; tone([300, 500, 700][c], 0, 0.06, 'triangle', 0.1); state.hudDirty = true; }
    L.pick = pick;
    function vrShape() {
      // the hand that's doing something: grip = fist (rock), trigger alone = scissors, open = paper
      let shape = 1;
      for (const sd of ['right', 'left']) {
        const gp = vrHands[sd].source && vrHands[sd].source.gamepad;
        if (!gp || !gp.buttons) continue;
        const grip = gp.buttons[1] && gp.buttons[1].pressed, trig = gp.buttons[0] && gp.buttons[0].pressed;
        if (grip) return 0;
        if (trig) shape = 2;
      }
      return shape;
    }
    const myMatch = () => S.mt.find((m) => (m[0] === state.myPeer || m[1] === state.myPeer));
    function myThrowNow() {
      const c = state.mode === 'vr' ? vrShape() : ME.pick >= 0 ? ME.pick : Math.floor(Math.random() * 3);
      if (state.mode !== 'vr' && ME.pick < 0) showToast(`Too slow! Your hand threw ${NAME[c].toLowerCase()}`);
      ME.claim = [S.g, S.seq, c]; ME.sentSeq = S.seq;
      if (isHost()) S.got[state.myPeer] = c;
      forcePresence();
    }
    L.onKey = (code) => {
      const m = { KeyR: 0, KeyP: 1, KeyS: 2, Digit1: 0, Digit2: 1, Digit3: 2 }[code];
      if (m !== undefined) { if (code === 'KeyS' && S.ph === 'lobby') return false; pick(m); return true; }
      return false;
    };
    L.deskFire = () => { if (S.ph === 'lobby' || S.ph === 'done') requestStart(); };
    L.throwLabel = () => (S.ph === 'lobby' || S.ph === 'done' ? 'Start' : '…');
    function requestStart() { if (isHost()) startTournament(); else { ME.startReq = (ME.startReq || 0) + 1; forcePresence(); showToast('Asking to start the tournament…'); } }

    // ---------------------------------------------------------------- network
    const PH = ['lobby', 'count', 'show', 'between', 'done'];
    function snapshot() { return { g: S.g, ph: PH.indexOf(S.ph), r: S.rnd, ids: S.ids.slice(), mt: S.mt.map((m) => m.slice()), sq: S.seq, left: Math.max(0, S.shootAt - Date.now()), ch: S.champ, m: [S.msgSeq, S.msg] }; }
    function validSnap(q) {
      return q && Number.isInteger(q.g) && Number.isInteger(q.ph) && q.ph >= 0 && q.ph < PH.length && Number.isInteger(q.r) && q.r >= 0 && q.r < 3 && Array.isArray(q.ids) && q.ids.length <= 8 && q.ids.every((x) => typeof x === 'string' && x.length < 64)
        && Array.isArray(q.mt) && q.mt.length <= 4 && q.mt.every((m) => Array.isArray(m) && m.length === 7 && typeof m[0] === 'string' && typeof m[1] === 'string' && [2, 3, 4, 5].every((i) => Number.isInteger(m[i]) && m[i] >= -1 && m[i] < 3) && typeof m[6] === 'string')
        && Number.isInteger(q.sq) && typeof q.left === 'number' && q.left >= 0 && q.left < 10000 && typeof q.ch === 'string' && Array.isArray(q.m) && q.m.length === 2 && Number.isInteger(q.m[0]) && typeof q.m[1] === 'string' && q.m[1].length < 200;
    }
    let seenMsg = -1;
    function applySnap(q) {
      const prevChamp = S.champ;
      Object.assign(S, { g: q.g, ph: PH[q.ph], rnd: q.r, ids: q.ids.slice(), mt: q.mt.map((m) => m.slice()), champ: q.ch });
      if (q.sq !== S.seq) { S.seq = q.sq; ME.localShoot = Date.now() + q.left; }
      else if (S.ph === 'count' && !ME.localShoot) ME.localShoot = Date.now() + q.left;
      if (seenMsg >= 0 && q.m[0] !== seenMsg && q.m[1]) showToast(q.m[1]);
      seenMsg = q.m[0];
      if (S.champ && S.champ !== prevChamp && S.champ === state.myPeer) wonIt();
    }
    function wonIt() { ME.wins += 1; prefs.rpsWins = ME.wins; savePrefs(); state.dirtyBoard = true; forcePresence(); }
    L.presence = () => {
      const p = { rw: [ME.wins, ME.startReq || 0], rc: ME.claim };
      if (isHost() && state.level === L.idx) p.rq = snapshot();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      const w = pres.rw;
      if (Array.isArray(w) && w.length === 2 && w.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) {
        if (!st.rw || st.rw[0] !== w[0]) state.dirtyBoard = true;
        if (st.rw && w[1] !== st.rw[1] && isHost() && state.level === L.idx && (S.ph === 'lobby' || S.ph === 'done')) startTournament();
        st.rw = w;
      } else st.rw = null;
      const c = pres.rc;
      if (Array.isArray(c) && c.length === 3 && c.every((x) => Number.isInteger(x)) && c[2] >= 0 && c[2] < 3 && isHost() && c[0] === S.g && c[1] === S.seq && S.ph === 'count') S.got[rec.peer] = c[2];
      if (pres.rq && validSnap(pres.rq)) { st.rq = pres.rq; if (!isHost() && rec.peer === humansHere()[0]) applySnap(pres.rq); } else st.rq = null;
    };

    // ---------------------------------------------------------------- per frame
    function drawBracket() {
      const key = JSON.stringify([S.ids, S.mt, S.rnd, S.ph, S.champ]);
      if (key === drawBracket.key) return; drawBracket.key = key;
      const g = brC.g;
      g.fillStyle = '#16102a'; g.fillRect(0, 0, 1024, 512); g.strokeStyle = '#ff4d8a'; g.lineWidth = 8; g.strokeRect(4, 4, 1016, 504);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 40px ${DISPLAY}`; g.fillText(S.ph === 'lobby' ? 'Rock-Paper-Scissors Tournament' : S.champ ? `\u{1F3C6} ${nameOf(S.champ)}` : ['Quarter-finals', 'Semi-finals', 'Final'][S.rnd], 512, 44);
      if (!S.ids.length) { g.fillStyle = '#c8b8e8'; g.font = `500 30px ${BODY}`; g.fillText('Press Start: eight players, best of three, knockout', 512, 260); brC.tex.needsUpdate = true; return; }
      // the bracket: who's through each round (worked out from the current round's matches)
      const cols = [S.ids];
      // keep a record of each round's winners as they're known
      drawBracket.hist = drawBracket.hist || {};
      if (S.g !== drawBracket.g) { drawBracket.hist = {}; drawBracket.g = S.g; }
      S.mt.forEach((m, k) => { drawBracket.hist[`${S.rnd}:${k}`] = m.slice(); });
      for (let r = 0; r < 3; r++) { const prev = cols[r]; const next = []; for (let k = 0; k < prev.length / 2; k++) { const m = drawBracket.hist[`${r}:${k}`]; next.push(m && m[6] ? m[6] : ''); } cols.push(next); }
      const X = [110, 370, 650, 900], H = [8, 4, 2, 1];
      for (let r = 0; r < 4; r++) {
        const n = H[r], step = 440 / n;
        for (let k = 0; k < n; k++) {
          const id = cols[r][k] || '', y = 90 + step * (k + 0.5);
          g.fillStyle = id === state.myPeer ? '#3a2a6a' : '#241a3a'; rr(g, X[r] - 105, y - 18, 210, 36, 10); g.fill();
          g.fillStyle = id ? (id === S.champ ? '#ffd23f' : '#ffffff') : '#5a4a7a'; g.font = `600 ${r === 3 ? 26 : 22}px ${BODY}`; g.fillText(id ? nameOf(id) : '?', X[r], y, 196);
          const m = drawBracket.hist[`${r}:${Math.floor(k / 2)}`];
          if (m && r < 3) { g.fillStyle = '#ff9ad0'; g.font = `700 20px ${BODY}`; g.fillText(String(k % 2 ? m[3] : m[2]), X[r] + 118, y); }
          if (r < 3 && k % 2 === 0) { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X[r] + 130, y); g.lineTo(X[r] + 140, y); g.lineTo(X[r] + 140, y + step); g.lineTo(X[r] + 130, y + step); g.moveTo(X[r] + 140, y + step / 2); g.lineTo(X[r + 1] - 106, y + step / 2); g.stroke(); }
        }
      }
      brC.tex.needsUpdate = true;
    }
    function tableOf(id) { const k = S.mt.findIndex((m) => m[0] === id || m[1] === id); return k; }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { myHandSign.visible = false; return; }
      if (isHost()) { hostStep(); if (S.ph === 'count' && ME.localShoot !== S.shootAt) ME.localShoot = S.shootAt; }
      // VR: A or X starts
      if (state.mode === 'vr') {
        let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !ME.aPrev && (S.ph === 'lobby' || S.ph === 'done')) requestStart();
        ME.aPrev = a;
      }
      // my throw goes in at SHOOT
      const mm = myMatch(), inIt = mm && !mm[6];
      if (S.ph === 'count' && inIt && ME.sentSeq !== S.seq && Date.now() >= ME.localShoot) myThrowNow();
      if (S.ph !== 'count' && ME.seenSeq !== S.seq && S.ph === 'show') {
        ME.seenSeq = S.seq;
        if (mm && mm[4] >= 0) {
          const meA = mm[0] === state.myPeer, mine = meA ? mm[4] : mm[5], theirs = meA ? mm[5] : mm[4];
          const res = beats(mine, theirs) ? 'win' : beats(theirs, mine) ? 'lose' : 'draw';
          sfx(res === 'win' ? 'chime' : res === 'lose' ? 'buzzer' : 'click', 0.6);
          showToast(`${ICON[mine]} vs ${ICON[theirs]}: ${res === 'win' ? 'you take it!' : res === 'lose' ? 'they take it' : 'a draw: throw again'}${mm[6] ? (mm[6] === state.myPeer ? '  ·  You win the match!' : '  ·  You’re out') : ''}`);
        }
        ME.pick = -1;
      }
      // the countdown, said out loud (well, beeped)
      const left = (ME.localShoot - Date.now()) / 1000, beat = S.ph === 'count' ? Math.floor((COUNT / 1000 - left) / (COUNT / 4000)) : -1;
      if (beat !== ME.beat && beat >= 0 && beat <= 3) { tone(beat === 3 ? 880 : 520, 0, 0.1, 'square', 0.12); }
      ME.beat = beat;
      // go to my table, facing my opponent
      const k = mm ? tableOf(state.myPeer) : -1;
      if (k >= 0 && ME.atTable !== `${S.g}:${S.rnd}`) {
        ME.atTable = `${S.g}:${S.rnd}`;
        const side = mm[0] === state.myPeer ? 0 : 1, c = new V3(); camera.getWorldPosition(c);
        dolly.position.x += TABLE_X[k] - c.x; dolly.position.z += (side ? -0.85 : 0.85) - c.z;
        if (state.mode !== 'vr') { state.yaw = side ? Math.PI : 0; state.pitch = -0.15; }
      }
      // tables: names, counts and throws
      tables.forEach((t, i) => {
        const m = S.mt[i];
        const txt = !m ? '' : m[6] ? `${nameOf(m[6])} wins ${Math.max(m[2], m[3])}-${Math.min(m[2], m[3])}` : S.ph === 'count' ? (['Rock…', 'Paper…', 'Scissors…', 'SHOOT!'][clamp(beat, 0, 3)]) : `${nameOf(m[0])} ${m[2]} - ${m[3]} ${nameOf(m[1])}`;
        if (txt !== t.key) { t.key = txt; t.sign.userData.draw(txt); t.sign2.userData.draw(txt); }
        const showing = m && (S.ph === 'show' || S.ph === 'between') && m[4] >= 0;
        t.show.forEach((pp, side) => { const v = showing ? ICON[side ? m[5] : m[4]] : ''; if (pp[0].userData.v !== v) { pp[0].userData.v = v; pp[0].userData.draw(v); pp[1].userData.draw(v); } });
      });
      // bots at their tables
      botAv.forEach((g, b) => {
        const id = `b${b}`, kk = tableOf(id), m = S.mt[kk];
        g.visible = kk >= 0 && S.ph !== 'lobby';
        if (!g.visible) { if (S.ph !== 'lobby' && S.ids.includes(id)) { g.visible = true; g.position.set(-10 + b * 0.9, 1.62, 6.5); g.rotation.y = Math.PI; } return; }
        const side = m[0] === id ? 0 : 1, bob = S.ph === 'count' ? Math.abs(Math.sin(now * 0.0075)) * 0.04 : 0;
        g.position.set(TABLE_X[kk], 1.62 + bob, side ? -0.85 : 0.85); g.rotation.y = side ? Math.PI : 0;
      });
      // my hand's shape (VR)
      myHandSign.visible = state.mode === 'vr' && myHands.right.ok && inIt;
      if (myHandSign.visible) { const sh = vrShape(); if (myHandSign.userData.v !== sh) { myHandSign.userData.v = sh; myHandSign.userData.draw(ICON[sh]); } myHandSign.position.copy(myHands.right.pos).add(new V3(0, 0.12, 0)); myHandSign.quaternion.copy(myHead.quat); }
      drawBracket();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'lobby' ? 'Rock-Paper-Scissors Tournament  ·  press Space to start' : S.ph === 'done' ? `${nameOf(S.champ)} won  ·  press Space for another tournament`
          : !mm ? 'Knocked out: watch the bracket' : mm[6] ? (mm[6] === state.myPeer ? 'Through to the next round! Waiting for the others' : 'Knocked out: watch the bracket')
          : `Pick: R rock, P paper, S scissors  ·  ${ME.pick >= 0 ? `ready: ${ICON[ME.pick]} ${NAME[ME.pick]}` : 'nothing picked yet'}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.rowFor = (st, isMe) => { const w = isMe ? ME.wins : st.rw ? st.rw[0] : 0; return { best: w, text: `${w} tournament${w === 1 ? '' : 's'} won` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.4, 1.53, -11.85, 2.0, 3, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#16102a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#4fc3f7'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Champions', 36, 80);
      g.fillStyle = '#c8b8e8'; g.font = `400 24px ${BODY}`; g.fillText('Tournaments won', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 10.8, 5.5, -Math.PI / 2);
    L.hudActions = [
      { label: () => (S.ph === 'lobby' || S.ph === 'done' ? 'Start tournament' : 'Restart'), run: () => requestStart() },
      { label: () => `✊ Rock`, run: () => pick(0), show: () => state.mode === 'flat' && S.ph !== 'lobby' },
      { label: () => `✋ Paper`, run: () => pick(1), show: () => state.mode === 'flat' && S.ph !== 'lobby' },
      { label: () => `✌️ Scissors`, run: () => pick(2), show: () => state.mode === 'flat' && S.ph !== 'lobby' },
    ];
    L.hints = [['A / X', 'start the tournament'], ['On SHOOT', 'grip = rock, open = paper, trigger = scissors'], ['Best of three', 'winners go through']];
    L.hintsFor = () => (state.mode === 'flat' ? [['R / P / S', 'pick rock, paper or scissors'], ['Before SHOOT', 'your pick is thrown on the count'], ['Space', 'start']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 5); if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0; } };
    L.onEnter = () => { drawBracket.key = ''; seenMsg = -1; ME.atTable = ''; for (const t of tables) t.key = '~'; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; myHandSign.visible = false; if (isHost() && S.ph !== 'lobby' && S.ph !== 'done') S.ph = 'lobby'; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 4, 2.6, 7); camera.lookAt(0, 1.6, -4); };
    // no wandering off mid-match (and S picks scissors rather than stepping back)
    Object.defineProperty(L, 'walkSpeed', { get: () => { const m = myMatch(); return m && !m[6] && S.ph !== 'lobby' && S.ph !== 'done' ? 0.0001 : 2.5; } });
    L.rpsInternals = { S, ME, startTournament, newRound, nextThrow, resolve, hostStep, pick, beats, snapshot, applySnap, validSnap, BOTS };
    MUSIC_THEMES.rps = { gain: 0.7, bpm: 120, swing: 0, chords: ['Am', 'F', 'C', 'G'], comp: { inst: 'synth', at: [0, 3, 6, 8, 11, 14], dur: 0.12 }, bass: { at: [0, 3, 6, 8] }, drums: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' }, cut: 4600 };
    return L;
  })();
