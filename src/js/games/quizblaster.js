  // ================================================================ LEVEL: QUIZ BLASTER (study hall)
  // CompTIA A+ practice with a blaster: a question goes up on the big screen, four answer cards float in front of you,
  // and you shoot the right one. Twelve questions a round, points for being quick and for streaks.
  // Pick Core 1, Core 2, the full exam mix (weighted like the real exam's domains) or Weak spots, which serves up more of
  // what you've been missing. Every answer goes in your report card on the wall, domain by domain.
  // VR: point and pull the trigger. Browser: aim and click, or press 1-4.
  const quizblaster = (() => {
    const L = newLevel(48);
    const G = L.group;
    const rand = mulberry32(4848);
    L.grabless = true;
    L.bounds = { minX: -5.6, maxX: 5.6, minZ: -3.5, maxZ: 3.6 };
    L.env = STUDY.env();
    const hall = STUDY.room(G, rand, { w: 12, d: 10, z: -1, h: 4.8 });
    const SPOT_Z = 2.2, ROUNDN = 12, QTIME = 25;
    const scr = STUDY.screen(G, 1024, 512, 4.6, 2.3, 0, 2.95, -5.85, 0, 0x1a2a4a);
    const deck = STUDY.cards(G, { n: 4, w: 1.2, h: 0.6 });
    const BASE = [[-0.74, 1.28], [0.74, 1.28], [-0.74, 0.6], [0.74, 0.6]];
    const MODES = [
      { id: 'c1', name: 'Core 1 (220-1201)', sub: 'Hardware, networking, mobile, cloud' },
      { id: 'c2', name: 'Core 2 (220-1202)', sub: 'Windows, security, software, procedures' },
      { id: 'mix', name: 'Full exam mix', sub: 'Weighted like the real exams' },
      { id: 'weak', name: 'Weak spots', sub: 'More of what you’ve been missing' },
    ];

    // ---------------------------------------------------------------- the round
    const S = { ph: 'menu', mode: 'mix', n: 0, score: 0, right: 0, streak: 0, bestStreak: 0, q: null, t0: 0, pick: -1, revealT: 0, recent: [], dom: {}, best: 0, last: null };
    try { if (Number.isInteger(prefs.qbBest)) S.best = prefs.qbBest; } catch (e) { /* none */ }
    L.qb = S;
    const timeLeft = () => Math.max(0, QTIME - (performance.now() - S.t0) / 1000);
    function showMenu() {
      S.ph = 'menu';
      MODES.forEach((m, i) => { deck.set(i, m.name, 'mode', { sub: m.sub, big: 50 }); deck.show(i, true); });
    }
    function startRound(mode) {
      Object.assign(S, { ph: 'ask', mode, n: 0, score: 0, right: 0, streak: 0, bestStreak: 0, dom: {}, last: null });
      sfx('whistle', 0.6);
      nextQuestion();
    }
    L.startRound = startRound;
    function nextQuestion() {
      if (S.n >= ROUNDN) { endRound(); return; }
      S.q = APLUS.next(S.mode, rand, S.recent);
      S.recent.push(S.q.q); if (S.recent.length > 40) S.recent.shift();
      S.n += 1; S.pick = -1; S.ph = 'ask'; S.t0 = performance.now();
      S.q.a.forEach((t, i) => { deck.set(i, t, 'idle'); deck.show(i, true); });
      forcePresence(); state.dirtyBoard = true;
    }
    function answer(i) {
      if (S.ph !== 'ask') return;
      const ok = i === S.q.c, tl = timeLeft();
      S.pick = i; S.ph = 'reveal'; S.revealT = 0;
      const d = S.q.d; S.dom[d] = S.dom[d] || [0, 0]; S.dom[d][ok ? 0 : 1] += 1;
      APLUS.mark(S.q, ok);
      if (ok) {
        const pts = 100 + Math.round(50 * tl / QTIME) + 10 * Math.min(10, S.streak);
        S.score += pts; S.right += 1; S.streak += 1; S.bestStreak = Math.max(S.bestStreak, S.streak);
        S.last = { ok: true, pts };
        STUDY.right(); spawnFloat(`+${pts}`, deck.cards[i].grp.position.clone().add(new V3(0, 0.4, 0.2)), '#8bd450');
      } else {
        S.streak = 0; S.last = { ok: false, pts: 0, timeout: i < 0 };
        STUDY.wrong();
      }
      for (let k = 0; k < 4; k++) deck.look(k, k === S.q.c ? 'right' : k === i ? 'wrong' : 'dim');
      reportKey = '';
      forcePresence(); state.dirtyBoard = true;
    }
    L.answer = answer;
    function endRound() {
      S.ph = 'menu';
      const isBest = S.score > S.best;
      if (isBest) { S.best = S.score; prefs.qbBest = S.best; savePrefs(); }
      RECORDS.add(L, 'score', S.score);
      if (S.bestStreak >= 3) RECORDS.add(L, 'streak', S.bestStreak);
      sfx(S.right >= 10 ? 'fanfare' : 'chime', 0.8);
      showToast(`${S.right} of ${ROUNDN} right, ${S.score} points${isBest ? ' (your best!)' : ''}`);
      S.summary = { right: S.right, score: S.score, dom: S.dom, best: isBest, streak: S.bestStreak };
      showMenu();
      forcePresence(); state.dirtyBoard = true;
    }
    L.endRound = endRound;
    function onPick(i) {
      if (S.ph === 'menu') { fireAt(i); startRound(MODES[i].id); return; }
      if (S.ph === 'ask') { fireAt(i); answer(i); return; }
      if (S.ph === 'reveal' && S.revealT > 0.7) nextQuestion();
    }

    // ---------------------------------------------------------------- the blaster (and its bolts)
    const blaster = new THREE.Group();
    { const body = lam(0x3a4a6a), trim = lam(0xffd23f);
      addBox(blaster, 0.06, 0.08, 0.2, body, 0, 0, -0.02);
      addBox(blaster, 0.04, 0.12, 0.05, body, 0, -0.08, 0.05).rotation.x = 0.3;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 10), trim); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.015, -0.18); blaster.add(barrel);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9af0ff })); tip.position.set(0, 0.015, -0.27); blaster.add(tip); }
    L.overlay.add(blaster);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), new THREE.MeshBasicMaterial({ color: 0x9af0ff })); bolt.visible = false; L.overlay.add(bolt);
    const boom = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0x9af0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); boom.visible = false; L.overlay.add(boom);
    const B = { t: -1, from: new V3(), to: new V3(), hand: 'right' };
    const _m = new V3(), _q = new Q4(), _up = new V3(0, 1, 0);
    function muzzle(out) {
      if (state.mode === 'vr') { const mh = myHands[B.hand]; return out.set(0, 0.015, -0.28).applyQuaternion(mh.quat).add(mh.pos); }
      return out.set(0, 0.015, -0.28).applyQuaternion(blaster.quaternion).multiplyScalar(blaster.scale.x).add(blaster.position);
    }
    function fireAt(i) {
      muzzle(B.from); B.to.copy(deck.cards[i].grp.position); B.t = 0;
      tone(1200, 300, 0.12, 'sawtooth', 0.06);
    }
    const input = STUDY.input(L, deck, { onPick: (i) => onPick(i), onMiss: () => { if (S.ph === 'reveal' && S.revealT > 0.7) nextQuestion(); }, touch: false, enabled: () => state.level === L.idx });
    const trig = L.onVRTrigger;
    L.onVRTrigger = (h) => { B.hand = h.side; trig(h); };
    L.deskFire = ((f) => () => { if (S.ph === 'reveal' && S.revealT > 0.7) { nextQuestion(); return; } f(); })(L.deskFire);
    L.throwLabel = () => (S.ph === 'menu' ? 'Pick' : S.ph === 'reveal' ? 'Next' : 'Shoot');

    // ---------------------------------------------------------------- the big screen
    const DN = APLUS.DOMAINS;
    function drawScreen() {
      const t = S.ph === 'ask' ? Math.ceil(timeLeft()) : 0;
      const key = `${S.ph}|${S.n}|${t}|${S.pick}|${S.score}|${S.summary ? S.summary.score : ''}`;
      if (key === scr.key) return; scr.key = key;
      const g = scr.g, W = 1024, H = 512;
      g.fillStyle = '#10203a'; g.fillRect(0, 0, W, H);
      g.textBaseline = 'alphabetic';
      if (S.ph === 'menu') {
        g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.font = `900 92px ${DISPLAY}`; g.fillText('QUIZ BLASTER', W / 2, 108);
        g.fillStyle = '#c8d8f0'; g.font = `400 30px ${BODY}`; g.fillText('CompTIA A+ practice: shoot the right answer', W / 2, 156);
        if (S.summary) {
          const s = S.summary;
          g.fillStyle = '#ffffff'; g.font = `800 64px ${DISPLAY}`; g.fillText(`${s.right} / ${ROUNDN} right  ·  ${s.score} points`, W / 2, 252);
          g.fillStyle = s.best ? '#8bd450' : '#9ab0d0'; g.font = `700 30px ${BODY}`; g.fillText(s.best ? 'Your best round yet!' : `Your best: ${S.best}`, W / 2, 298);
          // the domain this round went worst in
          let worst = null, wr = 2;
          for (const d in s.dom) { const r = s.dom[d], f = r[0] / (r[0] + r[1]); if (r[1] && f < wr) { wr = f; worst = d; } }
          g.fillStyle = '#ffffff'; g.font = `400 30px ${BODY}`;
          g.fillText(worst ? `Brush up on: ${DN[worst].exam} · ${DN[worst].name}` : 'A clean sweep. Nice work!', W / 2, 360, W - 80);
          g.fillStyle = '#9ab0d0'; g.font = `400 26px ${BODY}`; g.fillText('Shoot a card to go again', W / 2, 440);
        } else {
          g.fillStyle = '#ffffff'; g.font = `400 32px ${BODY}`;
          STUDY.wrap(g, 'Twelve questions a round. Quick answers and streaks score more. Your report card on the right wall keeps track of every domain.', W / 2, 240, W - 140, 44);
          g.fillStyle = '#ffd23f'; g.font = `700 34px ${BODY}`; g.fillText('Shoot a card below to pick a mode', W / 2, 420);
        }
        scr.tex.needsUpdate = true; return;
      }
      const q = S.q;
      // header: question number, domain, score, timer
      g.textAlign = 'left'; g.fillStyle = '#9ab0d0'; g.font = `700 28px ${BODY}`;
      g.fillText(`Question ${S.n} of ${ROUNDN}  ·  ${DN[q.d].exam}: ${DN[q.d].name}`, 40, 52, 760);
      g.textAlign = 'right'; g.fillStyle = '#ffd23f'; g.font = `900 46px ${DISPLAY}`; g.fillText(`${S.score}`, W - 40, 56);
      if (S.ph === 'ask') {
        const f = timeLeft() / QTIME;
        g.fillStyle = '#24365a'; g.fillRect(40, 72, W - 80, 10);
        g.fillStyle = f > 0.3 ? '#4fc3f7' : '#ff6a6a'; g.fillRect(40, 72, (W - 80) * f, 10);
      }
      g.textAlign = 'center'; g.fillStyle = '#ffffff';
      const big = S.ph === 'ask';
      const s = STUDY.fit(g, q.q, W - 100, big ? 4 : 2, big ? 58 : 40, 26, 700);
      const nl = Math.min(big ? 4 : 2, STUDY.wrap(g, q.q, 0, 0, W - 100, s * 1.15, 0, false));
      STUDY.wrap(g, q.q, W / 2, big ? 260 - (nl - 1) * s * 0.58 : 140, W - 100, s * 1.15, big ? 4 : 2);
      if (S.ph === 'reveal') {
        const ok = S.last && S.last.ok;
        g.fillStyle = ok ? '#8bd450' : '#ff6a6a'; g.font = `900 64px ${DISPLAY}`;
        g.fillText(ok ? `Correct! +${S.last.pts}` : S.last && S.last.timeout ? 'Out of time' : 'Not quite', W / 2, 272);
        if (!ok) { g.fillStyle = '#ffffff'; g.font = `700 32px ${BODY}`; g.fillText(`Answer: ${q.a[q.c]}`, W / 2, 322, W - 80); }
        g.fillStyle = '#c8d8f0'; g.font = `400 32px ${BODY}`;
        STUDY.wrap(g, q.why, W / 2, ok ? 336 : 378, W - 120, 40, 3);
        g.fillStyle = '#6a80a8'; g.font = `400 22px ${BODY}`; g.fillText('Shoot any card for the next question', W / 2, H - 22);
      }
      scr.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- the report card on the wall
    const rep = STUDY.screen(G, 640, 760, 2.0, 2.375, 5.88, 2.1, -1.4, -Math.PI / 2, 0x6a4a30);
    let reportKey = '';
    function drawReport() {
      const log = APLUS.log(), key = JSON.stringify(log.dom);
      if (key === reportKey) return; reportKey = key;
      const g = rep.g, W = 640;
      g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, W, 760);
      g.textAlign = 'center'; g.fillStyle = '#1f5a9a'; g.font = `900 58px ${DISPLAY}`; g.fillText('REPORT CARD', W / 2, 70);
      g.fillStyle = '#6a6050'; g.font = `400 22px ${BODY}`; g.fillText('Every A+ answer you’ve given, by exam domain', W / 2, 104);
      let y = 150, exam = '';
      for (const d in DN) {
        const D = DN[d], r = log.dom[d] || [0, 0], n = r[0] + r[1], f = n ? r[0] / n : 0;
        if (D.exam !== exam) { exam = D.exam; g.textAlign = 'left'; g.fillStyle = '#1f5a9a'; g.font = `800 30px ${DISPLAY}`; g.fillText(`${exam} (${exam === 'Core 1' ? '220-1201' : '220-1202'})`, 30, y + 6); y += 44; }
        g.textAlign = 'left'; g.fillStyle = '#2a2a2a'; g.font = `700 22px ${BODY}`; g.fillText(`${D.name} (${D.w}%)`, 30, y, 400);
        g.fillStyle = '#e4dccc'; g.fillRect(30, y + 10, 460, 16);
        g.fillStyle = !n ? '#e4dccc' : f >= 0.8 ? '#3a9a4a' : f >= 0.6 ? '#d8a03a' : '#c84a3a'; g.fillRect(30, y + 10, 460 * f, 16);
        g.textAlign = 'right'; g.fillStyle = '#2a2a2a'; g.font = `800 26px ${DISPLAY}`; g.fillText(n ? `${Math.round(f * 100)}%` : '–', W - 30, y + 24);
        g.fillStyle = '#8a8070'; g.font = `400 18px ${BODY}`; g.fillText(n ? `${r[0]}/${n}` : '', W - 30, y - 2);
        y += 62;
      }
      g.textAlign = 'center'; g.fillStyle = '#6a6050'; g.font = `400 20px ${BODY}`; g.fillText('Green 80%+ · amber 60%+ · red: practise with Weak spots', W / 2, 744);
      rep.tex.needsUpdate = true;
    }
    L.drawReport = () => { reportKey = ''; drawReport(); };

    // ---------------------------------------------------------------- per frame
    function stand() { S.slot = STUDY.slotOf(L); STUDY.standAt(STUDY.SLOT_X[S.slot], SPOT_Z, 0); }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      hall.tick();
      if (!here) { blaster.visible = false; bolt.visible = false; input.hide(); return; }
      if (STUDY.slotOf(L) !== S.slot) stand();
      if (S.ph === 'ask' && timeLeft() <= 0) answer(-1);
      if (S.ph === 'reveal') { S.revealT += dt; if (S.revealT > (S.last && S.last.ok ? 3.5 : 7)) nextQuestion(); }
      // the cards drift about a little, like targets
      const ts = reduceMotion ? 0 : now / 1000;
      deck.cards.forEach((c, i) => {
        const [bx, by] = BASE[i];
        const chosen = S.ph === 'reveal' && i === S.pick, shake = chosen && S.revealT < 0.3 ? Math.sin(S.revealT * 90) * 0.03 : 0;
        const dx = S.ph === 'ask' ? Math.sin(ts * 0.7 + i * 1.7) * 0.1 : 0, dy = S.ph === 'ask' ? Math.sin(ts * 0.9 + i * 2.3) * 0.06 : 0;
        deck.place(i, bx + dx + shake, by + dy, -0.9, 0, 0);
      });
      input.tick(dt);
      // the blaster: in your hand (VR) or held low on the right (browser)
      blaster.visible = true;
      if (state.mode === 'vr') { const mh = myHands[B.hand]; blaster.position.copy(mh.pos); blaster.quaternion.copy(mh.quat); blaster.scale.setScalar(1); blaster.visible = mh.ok; }
      else { camera.getWorldPosition(_m); camera.getWorldQuaternion(_q); blaster.position.copy(new V3(0.2, -0.22, -0.45).applyQuaternion(_q).add(_m)); blaster.quaternion.copy(_q); blaster.scale.setScalar(0.8); }
      if (B.t >= 0) {
        B.t += dt / 0.12;
        if (B.t >= 1) { B.t = -1; bolt.visible = false; boom.visible = true; boom.position.copy(B.to); boom.userData.t = 0; }
        else { bolt.visible = true; bolt.position.lerpVectors(B.from, B.to, B.t); bolt.quaternion.setFromUnitVectors(_up, _m.subVectors(B.to, B.from).normalize()); }
      }
      if (boom.visible) { boom.userData.t += dt; const k = boom.userData.t / 0.3; boom.scale.setScalar(0.3 + k * 0.9); boom.material.opacity = 1 - k; if (k >= 1) boom.visible = false; }
      drawScreen(); drawReport();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'menu' ? 'Quiz Blaster  ·  aim at a mode and click (or press 1-4)' : S.ph === 'ask' ? `Question ${S.n}/${ROUNDN}  ·  ${Math.ceil(timeLeft())} s  ·  click an answer or press 1-4` : 'Click or press 1-4 for the next question';
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ qb: [S.score, S.best, S.ph === 'menu' ? 0 : 1, S.n] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.qb;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) { st.qb = null; return; }
      if (!st.qb || st.qb[0] !== a[0] || st.qb[1] !== a[1]) state.dirtyBoard = true;
      st.qb = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? [S.score, S.best, S.ph === 'menu' ? 0 : 1, S.n] : st.qb;
      if (!a) return { best: 0, text: '' };
      return { best: a[1], text: `${a[2] ? `${a[0]} now (Q${a[3]}) · ` : ''}best ${a[1]}` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.85, 2.0, -1.2, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#10203a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Top of the class', 36, 80);
      g.fillStyle = '#c8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Best round of twelve questions', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, -4.2, 3.0, Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'score', label: 'Best round (12 questions)' }, { k: 'streak', label: 'Longest streak' }], { x: -5.75, z: 1.7, yaw: Math.PI / 2 });
    L.hudActions = [{ label: () => (S.ph === 'menu' ? 'Exam mix' : 'Quit round'), run: () => { if (S.ph === 'menu') startRound('mix'); else { S.summary = null; showMenu(); } } }];
    L.hints = [['Point + trigger', 'shoot an answer card'], ['Report card', 'on the right wall: how you’re doing per domain']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Aim + click', 'shoot an answer card'], ['1-4', 'answer by number'], ['Report card', 'on the right wall']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { S.summary = null; showMenu(); scr.key = ''; reportKey = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; S.ph = 'menu'; input.hide(); };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 1.7, 3.2); camera.lookAt(0, 1.7, -2); };
    showMenu();
    L.qbInternals = { S, deck, answer, nextQuestion, startRound, endRound, onPick, drawReport, MODES };
    MUSIC_THEMES.quizblaster = { gain: 0.55, bpm: 112, swing: 0.1, chords: ['C', 'Am', 'F', 'G'], comp: { inst: 'piano', at: [0, 3, 6, 8, 11, 14], dur: 0.2 }, bass: { at: [0, 6, 8, 14] }, drums: { k: 'x.....x.x.......', h: '..o...o...o...o.' }, cut: 3600 };
    return L;
  })();
