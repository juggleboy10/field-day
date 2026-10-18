  // ================================================================ LEVEL: SUNRISE WORKOUT
  // A coached workout on a rooftop at dawn, to a beat. Rounds of punching (red pads with your left fist, blue with
  // your right; low pads are uppercuts), squats (duck under the bars), dodges (lean away from the walls) and reaches
  // (touch the stars above your head with both hands), with short rests between. Coach Kai shows each move on the
  // stage. Your height is measured when you start, so the squats and reaches fit you. Reps, accuracy and a rough
  // calorie count at the end; your best score for each session is kept.
  // In a browser: F / J punch (or click a side), down arrow squats, left / right dodge, up arrow reaches.
  const workout = (() => {
    const L = newLevel(27);
    const G = L.group;
    const rand = mulberry32(2727);
    L.grabless = true;
    L.bounds = { minX: -7, maxX: 7, minZ: -7, maxZ: 5 };
    L.env = {
      sky: skyTexture([[0, '#2a3a7a'], [0.35, '#ff9a6a'], [0.5, '#ffd8a0'], [0.52, '#c88a6a'], [1, '#3a2a3a']]),
      bg: 0xffb88a, fog: [0xffc8a0, 30, 120], hemi: [0xfff0e0, 0x806050, 0.8],
      sun: [0xffd0a0, 0.7], sunDir: new V3(-0.2, 0.35, -1), ambient: [0x806060, 0.35],
      sprite: { tex: paleSunTex, pos: new V3(-30, 18, -120), scale: 40 },
    };
    const SPOT_GAP = 2.6, HZ = -0.5, TRAVEL = 2.0, SPEED = 6;   // things fly in from 12 m away and reach you in 2 s
    const RED = 0xff4a5a, BLUE = 0x3aa8ff;

    // ---------------------------------------------------------------- the rooftop
    const deck = canvasTexture(256, 256, (g) => {
      for (let i = 0; i < 8; i++) { const s = 150 + Math.floor(rand() * 30); g.fillStyle = `rgb(${s + 30},${s},${s - 40})`; g.fillRect(0, i * 32, 256, 30); g.fillStyle = 'rgba(60,40,20,0.35)'; g.fillRect(0, i * 32 + 30, 256, 2); }
    });
    deck.tex.wrapS = deck.tex.wrapT = THREE.RepeatWrapping; deck.tex.repeat.set(6, 6);
    addBox(G, 16, 0.2, 14, new THREE.MeshLambertMaterial({ map: deck.tex }), 0, -0.1, -1);
    // a low parapet and the city below
    for (const [x, z, w, d] of [[0, -8, 16, 0.3], [0, 6, 16, 0.3], [-8, -1, 0.3, 14], [8, -1, 0.3, 14]]) addBox(G, w, 0.9, d, lam(0xb89a80), x, 0.45, z);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 1.4 - Math.PI * 1.2, r = 40 + rand() * 30, h = 8 + rand() * 30;
      addBox(G, 6 + rand() * 6, h, 6 + rand() * 6, lam(rand() < 0.5 ? 0x4a3a5a : 0x5a4a6a), Math.cos(a) * r, h / 2 - 20, Math.sin(a) * r);
    }
    // the coach's stage, and the coach
    addBox(G, 3, 0.25, 1.6, lam(0x3a3a4a), 0, 0.125, -4.2);
    const coach = buildAvatar('#ff9a5c', 2, 1, true, 2, 5);
    const gloves = [RED, BLUE].map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), lam(c)); G.add(m); return m; });
    coach.rotation.y = Math.PI; G.add(coach);
    const coachTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Coach Kai', 128, 33); }).tex, transparent: true, depthWrite: false }));
    coachTag.scale.set(0.9, 0.225, 1); coachTag.position.y = 0.45; coach.add(coachTag);
    // mats for everyone
    const mats = [];
    for (let k = 0; k < 4; k++) { const m = addBox(G, 1.2, 0.02, 1.9, lam(k % 2 ? 0x3aa8a0 : 0x7a5aff), 0, 0.01, 0.1); m.visible = k === 0; mats.push(m); }

    // ---------------------------------------------------------------- sessions: rounds of moves
    const MOVES = {
      punch: { name: 'Punch', tip: 'Red pads with your left fist, blue with your right. Low pads: uppercut!', met: 7.5 },
      squat: { name: 'Squats', tip: 'Duck under each bar as it reaches you: bend your knees, back straight', met: 5.5 },
      dodge: { name: 'Dodge', tip: 'Lean away from each wall as it comes through', met: 4.5 },
      reach: { name: 'Reach', tip: 'Touch both stars above your head as they arrive', met: 8 },
      rest: { name: 'Rest', tip: 'Breathe. Shake out your arms', met: 2 },
    };
    const SESSIONS = [
      { name: 'Quick burn', bpm: 112, rounds: [['punch', 40], ['squat', 30], ['reach', 30], ['punch', 40], ['dodge', 30]], chords: ['C', 'Am', 'F', 'G'] },
      { name: 'Boxing cardio', bpm: 120, rounds: [['punch', 45], ['dodge', 30], ['punch', 45], ['squat', 30], ['punch', 45], ['dodge', 30]], chords: ['Am', 'F', 'C', 'G'] },
      { name: 'Full body', bpm: 116, rounds: [['punch', 40], ['squat', 40], ['reach', 40], ['dodge', 40], ['punch', 40], ['squat', 40], ['reach', 40]], chords: ['Dm', 'Bb', 'F', 'C'] },
    ];
    const REST = 8;
    // a session's timeline: when each round starts and what flies in on which beat
    function makePlan(si) {
      const S = SESSIONS[si], beat = 60 / S.bpm, r = mulberry32(si * 97 + 5);
      const rounds = [], events = [];
      let t = 3;                              // a moment to get ready
      S.rounds.forEach(([mv, secs], ri) => {
        if (ri > 0) { rounds.push({ mv: 'rest', t0: t, t1: t + REST, next: mv }); t += REST; }
        const t0 = Math.ceil(t / beat) * beat, t1 = t0 + secs;
        rounds.push({ mv, t0, t1 });
        let hand = 0, side = 0, b = 0;
        for (let bt = t0 + beat * 2; bt < t1 - beat; bt += beat, b++) {
          if (mv === 'punch') {
            // a punch every beat, alternating fists; now and then a quick one-two, and uppercuts on some
            const upper = b % 8 >= 6;
            events.push({ k: 'pad', t: bt, hand, upper });
            if (b % 8 === 3 && r() < 0.6) events.push({ k: 'pad', t: bt + beat / 2, hand: 1 - hand, upper: false });
            hand = 1 - hand;
          } else if (mv === 'squat' && b % 4 === 0) events.push({ k: 'bar', t: bt });
          else if (mv === 'dodge' && b % 2 === 0) { events.push({ k: 'wall', t: bt, side }); side = r() < 0.75 ? 1 - side : side; }
          else if (mv === 'reach' && b % 2 === 0) events.push({ k: 'stars', t: bt });
        }
        t = t1;
      });
      const total = { pad: 0, bar: 0, wall: 0, stars: 0 };
      for (const e of events) total[e.k]++;
      return { rounds, events, len: t + 1.5, beat, total, si };
    }
    L.makePlan = makePlan;

    // ---------------------------------------------------------------- the things that fly in
    const padGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 24);
    padGeo.rotateX(Math.PI / 2);
    const ringGeo = new THREE.TorusGeometry(0.15, 0.015, 6, 24);
    const upTex = canvasTexture(64, 64, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(32, 10); g.lineTo(54, 40); g.lineTo(10, 40); g.closePath(); g.fill(); }).tex;
    const pads = [];
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      const disc = new THREE.Mesh(padGeo, new THREE.MeshLambertMaterial({ color: RED, emissive: 0x220008 }));
      const rim = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })); rim.position.z = 0.045;
      const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: upTex, transparent: true, depthWrite: false })); arrow.position.z = 0.05;
      g.add(disc, rim, arrow); g.visible = false; G.add(g);
      pads.push({ g, disc, arrow, e: null });
    }
    const bars = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12), new THREE.MeshLambertMaterial({ color: 0xff9a3a, emissive: 0x6a3000 }));
      m.rotation.z = Math.PI / 2; m.visible = false; G.add(m); bars.push({ m, e: null });
    }
    const walls = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 0.3), new THREE.MeshLambertMaterial({ color: 0x7a5aff, transparent: true, opacity: 0.55, emissive: 0x201050 }));
      m.visible = false; G.add(m); walls.push({ m, e: null });
    }
    const starGeo = new THREE.OctahedronGeometry(0.11, 0);
    const stars = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(starGeo, new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6a4a00 })); m.visible = false; G.add(m); stars.push({ m, e: null, side: i % 2 }); }

    // ---------------------------------------------------------------- the session
    const W = { st: 'idle', si: 0, plan: null, i: 0, t0: 0, H0: 1.6, score: 0, hits: 0, misses: 0, combo: 0, reps: { punch: 0, squat: 0, dodge: 0, reach: 0 }, kcal: 0, spotX: 0, best: prefs.woBest || {}, result: null, clock: null, round: null, audio: false, nextStep: 0, flat: { squat: 0, lean: 0, reach: 0 } };
    L.wo = W;
    const now0 = () => (W.clock ? W.clock() : snd.ctx && W.audio ? snd.ctx.currentTime - W.t0 : (performance.now() - W.pt0) / 1000);
    let out = null;
    function chain() { const c = snd.ctx; if (!c) return null; if (!out) { out = c.createGain(); out.gain.value = 0.28; out.connect(snd.master); } return out; }
    const PAT = (s) => s.split('').map((ch) => (ch === 'x' ? 1 : ch === 'o' ? 0.55 : ch === '-' ? 0.3 : 0));
    const DR = { k: PAT('x...x...x...x...'), s: PAT('....x.......x...'), h: PAT('--x---x---x---x-') };
    function playStep(c, d, S, step, t, mv) {
      const bar = Math.floor(step / 16), s = step % 16, chord = CH[S.chords[bar % S.chords.length]] || CH.C;
      const resting = mv === 'rest';
      if (DR.k[s]) drum(c, d, t, 'k', DR.k[s] * (resting ? 0.5 : 1.5));
      if (!resting) { if (DR.s[s]) drum(c, d, t, 's', 1.3); if (DR.h[s]) drum(c, d, t, 'h', DR.h[s] * 1.4); }
      if (s % 4 === 2) INST.bass(c, d, t, chord[0], 60 / S.bpm / 2, 1.0);
      if (s === 0) for (const m of chord.slice(1, 4)) INST.pad(c, d, t, m, (60 / S.bpm) * 3.8, 0.8);
      if (!resting && (s === 6 || s === 14)) for (const m of chord.slice(1, 3)) INST.synth(c, d, t, m + 12, 0.12, 0.7);
    }
    function spotNow() {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      ids.sort();
      const n = Math.min(4, ids.length), k = Math.min(3, Math.max(0, ids.indexOf(state.myPeer)));
      return { n, k, x: (i) => (i - (n - 1) / 2) * SPOT_GAP };
    }
    const _v = new V3(), _w = new V3();
    function standOnMat() {
      const sp = spotNow(); W.spotX = sp.x(sp.k);
      // (in a browser the camera sits where the game puts it, so just stand the body on the spot)
      if (state.mode !== 'vr') { dolly.position.set(W.spotX, 0, 0); return; }
      camera.getWorldPosition(_v);
      dolly.position.x += W.spotX - _v.x; dolly.position.z += 0 - _v.z;
    }
    function start() {
      if (state.mode === 'menu') return;
      ensureAudio();
      const c = snd.ctx;
      W.plan = makePlan(W.si);
      Object.assign(W, { st: 'go', i: 0, score: 0, hits: 0, misses: 0, combo: 0, reps: { punch: 0, squat: 0, dodge: 0, reach: 0 }, kcal: 0, result: null, nextStep: 0, round: null });
      standOnMat();
      camera.getWorldPosition(_v);
      W.H0 = state.mode === 'vr' ? clamp(_v.y, 1.1, 2.1) : 1.55;          // your height, for the squats and reaches
      W.audio = !!(c && c.state === 'running');
      W.t0 = W.audio ? c.currentTime : 0; W.pt0 = performance.now();
      for (const o of pads.concat(bars, walls, stars)) { o.e = null; (o.g || o.m).visible = false; }
      if (MUSIC.voice && c) { const g = MUSIC.voice.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(0, c.currentTime + 0.8); }
      showToast(`${SESSIONS[W.si].name}: stand tall on your mat, here we go!`);
      sfx('whistle', 0.8);
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    function stop(why) {
      if (W.st !== 'go') return;
      const c = snd.ctx;
      if (out && c) { const g = out.gain, o = out; out = null; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(0, c.currentTime + 0.5); setTimeout(() => { try { o.disconnect(); } catch (e) { /* ignore */ } }, 900); }
      if (MUSIC.voice && c) { const g = MUSIC.voice.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(0, c.currentTime); g.linearRampToValueAtTime((MUSIC_THEMES.workout || {}).gain || 1, c.currentTime + 2); }
      for (const o of pads.concat(bars, walls, stars)) { o.e = null; (o.g || o.m).visible = false; }
      W.st = 'idle';
      if (why === 'done') {
        const tot = W.hits + W.misses, acc = tot ? W.hits / tot : 0, key = String(W.si), nb = W.score > (W.best[key] || 0);
        if (nb) { W.best[key] = W.score; prefs.woBest = W.best; savePrefs(); }
        W.result = { score: W.score, acc, kcal: W.kcal, reps: Object.assign({}, W.reps), newBest: nb };
        showToast(`Workout done! ${Math.round(acc * 100)}% · about ${Math.round(W.kcal)} kcal${nb ? ' · new best' : ''}`);
        sfx('fanfare', 0.9);
      }
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    function hit(e, kind, pos, col) {
      W.combo += 1; W.hits += 1; W.reps[kind] += 1;
      const pts = 100 + Math.min(50, W.combo * 2);
      W.score += pts;
      spawnFloat(kind === 'punch' ? String(pts) : kind === 'squat' ? 'Squat!' : kind === 'dodge' ? 'Dodged!' : 'Reach!', pos, col || '#ffffff');
      state.dirtyBoard = true;
    }
    function miss(pos, what) {
      W.combo = 0; W.misses += 1;
      if (pos) spawnFloat(what || 'Miss', pos, '#ffffff');
      tone(200, 150, 0.12, 'square', 0.06);
    }
    const roundAt = (t) => W.plan.rounds.find((r) => t >= r.t0 && t < r.t1) || null;
    // where your head and hands are, relative to your mat (in a browser, from the keys)
    function bodyNow(out) {
      camera.getWorldPosition(_v);
      out.head = { x: _v.x - W.spotX, y: _v.y, z: _v.z };
      out.hands = {};
      for (const s of SIDES) {
        const mh = myHands[s];
        if (state.mode === 'vr' && mh.ok) { handVelocity(vrHands[s], _w); out.hands[s] = { p: mh.pos.clone(), v: _w.clone() }; }
      }
      return out;
    }
    const body = {};
    function step(dt) {
      const S = SESSIONS[W.si], P = W.plan, t = now0(), c = snd.ctx;
      // music, booked half a second ahead
      if (W.audio && c) {
        const d = chain(), st = 60 / S.bpm / 4;
        while (d && W.t0 + W.nextStep * st < c.currentTime + 0.5 && W.nextStep * st < P.len) { const tt = W.nextStep * st; const r = roundAt(tt); playStep(c, d, S, W.nextStep, W.t0 + tt, r ? r.mv : 'rest'); W.nextStep++; }
      }
      // the round we're in
      const r = roundAt(t);
      if (r !== W.round) {
        W.round = r;
        if (r) { showToast(r.mv === 'rest' ? `Rest! Next: ${MOVES[r.next].name}` : `${MOVES[r.mv].name}! ${MOVES[r.mv].tip}`); sfx(r.mv === 'rest' ? 'chime' : 'whistle', 0.6); }
        state.dirtyBoard = true;
      }
      if (r) W.kcal += MOVES[r.mv].met * 1.225 * (dt / 60);           // (about 70 kg; a rough guide)
      // new things come into view
      while (W.i < P.events.length && P.events[W.i].t - t < TRAVEL) {
        const e = P.events[W.i++];
        const pool = e.k === 'pad' ? pads : e.k === 'bar' ? bars : e.k === 'wall' ? walls : null;
        if (pool) { const o = pool.find((x) => !x.e); if (o) { o.e = e; (o.g || o.m).visible = true; if (e.k === 'pad') { o.disc.material.color.setHex(e.hand ? BLUE : RED); o.arrow.visible = e.upper; } } }
        else { let n = 0; for (const o of stars) if (!o.e && n < 2) { o.e = e; o.side = n++; o.m.visible = true; } }
      }
      bodyNow(body);
      const zOf = (e) => HZ - (e.t - t) * SPEED;
      const H0 = W.H0;
      // pads: punch them with the right fist, moving into them
      for (const o of pads) {
        if (!o.e) continue;
        const e = o.e, z = Math.min(HZ, zOf(e));
        const x = W.spotX + (e.hand ? 0.2 : -0.2), y = e.upper ? H0 - 0.6 : H0 - 0.22;
        o.g.position.set(x, y, z);
        o.g.rotation.x = e.upper ? -0.9 : 0;
        const late = t - e.t;
        if (late > -0.35) {
          let done = false;
          if (state.mode === 'vr') {
            const hd = body.hands[e.hand ? 'right' : 'left'];
            if (hd && hd.p.distanceTo(o.g.position) < 0.2) {
              const v = hd.v, ok = e.upper ? v.y > 1.0 : -v.z > 1.0;
              if (ok) { hit(e, 'punch', o.g.position.clone().add(_w.set(0, 0.25, 0)), e.hand ? '#3aa8ff' : '#ff4a5a'); noiseBurst(0.06, 0.4, 900, 0.8); tone(e.hand ? 240 : 200, 120, 0.08, 'sine', 0.35); haptic(vrHands[e.hand ? 'right' : 'left'], 0.8, 40); done = true; }
            }
            // the wrong fist doesn't count, but it doesn't break the pad either
          } else if (W.flat.punch && W.flat.punch.hand === e.hand && Math.abs(late) < 0.3) {
            W.flat.punch = null; hit(e, 'punch', o.g.position.clone().add(_w.set(0, 0.25, 0)), e.hand ? '#3aa8ff' : '#ff4a5a'); noiseBurst(0.06, 0.4, 900, 0.8); done = true;
          }
          if (!done && late > 0.4) { miss(o.g.position.clone(), 'Miss'); done = true; }
          if (done) { o.e = null; o.g.visible = false; }
        }
      }
      // bars: be under them as they pass your head
      for (const o of bars) {
        if (!o.e) continue;
        const e = o.e, z = zOf(e) - HZ;           // (the bar's line is where your head is)
        const barY = H0 * 0.8;
        o.m.position.set(W.spotX, barY, z);
        if (z >= 0 && !e.judged) {
          e.judged = true;
          const headY = state.mode === 'vr' ? body.head.y : 1.55 - W.flat.squat * 0.6;
          if (headY < barY - 0.04) hit(e, 'squat', new V3(W.spotX, barY + 0.3, -0.6)); else { miss(new V3(W.spotX, barY + 0.3, -0.6), 'Squat lower!'); }
        }
        if (z > 2) { o.e = null; o.m.visible = false; }
      }
      // walls: lean out of the way
      for (const o of walls) {
        if (!o.e) continue;
        const e = o.e, z = zOf(e) - HZ;
        const x0 = e.side ? -0.05 : -0.95, x1 = e.side ? 0.95 : 0.05;     // covers the middle; lean the other way
        o.m.scale.set(x1 - x0, 1, 1); o.m.position.set(W.spotX + (x0 + x1) / 2, 1.2, z);
        if (z >= 0 && !e.judged) {
          e.judged = true;
          const hx = state.mode === 'vr' ? body.head.x : W.flat.lean * 0.35;
          if (hx + 0.1 < x0 || hx - 0.1 > x1) hit(e, 'dodge', new V3(W.spotX, 2.0, -0.6)); else miss(new V3(W.spotX, 2.0, -0.6), 'Lean!');
        }
        if (z > 2) { o.e = null; o.m.visible = false; }
      }
      // stars: both hands up to touch them as they arrive
      const starPair = stars.filter((o) => o.e);
      for (const o of starPair) {
        const e = o.e, z = Math.min(HZ + 0.1, zOf(e) + 0.1);
        o.m.position.set(W.spotX + (o.side ? 0.38 : -0.38), H0 + 0.28, z);
        o.m.rotation.y += dt * 3;
        if (state.mode === 'vr') { const hd = body.hands[o.side ? 'right' : 'left']; if (hd && hd.p.distanceTo(o.m.position) < 0.24 && t - e.t > -0.4) o.touched = true; }
        else if (W.flat.reach > 0.5 && Math.abs(t - e.t) < 0.4) o.touched = true;
      }
      const groups = new Map();
      for (const o of starPair) { if (!groups.has(o.e)) groups.set(o.e, []); groups.get(o.e).push(o); }
      for (const [e, os] of groups) {
        const both = os.every((o) => o.touched);
        if (both || t - e.t > 0.45) {
          if (both) { hit(e, 'reach', new V3(W.spotX, W.H0 + 0.6, -0.6), '#ffd23f'); tone(880, 1320, 0.1, 'sine', 0.12); } else miss(new V3(W.spotX, W.H0 + 0.6, -0.6), 'Reach up!');
          for (const o of os) { o.e = null; o.touched = false; o.m.visible = false; }
        }
      }
      if (t > P.len) stop('done');
    }

    // ---------------------------------------------------------------- Coach Kai shows the move
    function coachPose(now) {
      const r = W.st === 'go' ? W.round : null, mv = r ? r.mv : 'idle', t = W.st === 'go' ? now0() : now / 1000;
      const beat = W.plan ? W.plan.beat : 0.5, ph = (t / beat) % 1, bt = Math.floor(t / beat);
      let y = 1.62, x = 0, lx = -0.25, ly = 1.2, lz = -4.05, rx = 0.25, ry = 1.2, rz = -4.05;
      if (mv === 'punch') { const ext = Math.sin(Math.min(1, ph * 3) * Math.PI) * 0.4; if (bt % 2) rz += ext; else lz += ext; ly = ry = 1.35; }
      else if (mv === 'squat') { const k = (bt % 4) / 4 + ph / 4, d = Math.max(0, Math.sin(k * Math.PI * 2 - Math.PI / 2)) * 0.45; y -= d; ly = ry = 1.25 - d; lz = rz = -3.9; }
      else if (mv === 'dodge') { x = Math.sin((bt % 2 + ph) * Math.PI) * 0.3 * (Math.floor(bt / 2) % 2 ? 1 : -1); lx += x; rx += x; }
      else if (mv === 'reach') { const up = Math.sin(((bt % 2) + ph) * Math.PI / 2 * 2) > 0 ? 1 : 0.2; ly = ry = 1.2 + up * 0.7; lx = -0.35 - up * 0.1; rx = 0.35 + up * 0.1; }
      else { y += Math.sin(now * 0.003) * 0.02; }
      coach.position.set(x, y + 0.25, -4.2);
      gloves[0].position.set(lx, ly + 0.25, lz); gloves[1].position.set(rx, ry + 0.25, rz);
    }

    // ---------------------------------------------------------------- picking a session: buttons by your mat, or up top
    const nextSession = () => { if (W.st === 'go') return; W.si = (W.si + 1) % SESSIONS.length; W.result = null; sfx('click', 0.5); state.hudDirty = true; state.dirtyBoard = true; };
    const btns = [];
    btns.push(makeButton(L, new V3(-0.95, 1.0, -0.35), 0xb388ff, 'Session', nextSession, { faceYaw: 0.5 }));
    btns.push(makeButton(L, new V3(-0.95, 1.0, 0.05), 0x8bd450, 'Start', () => { if (W.st !== 'go') start(); }, { faceYaw: 0.5 }));
    btns.push(makeButton(L, new V3(-0.95, 1.0, 0.45), 0xff5a5a, 'Stop', () => {
      if (W.st !== 'go') return;
      const t = performance.now();
      if (t - (W.stopAsk || 0) < 2500) stop('quit'); else { W.stopAsk = t; showToast('Press Stop again to end the workout'); }
    }, { faceYaw: 0.5 }));
    const btnBase = btns.map((b) => b.pos.x);
    function moveButtons() { btns.forEach((b, i) => { const x = btnBase[i] + W.spotX; const dx = x - b.pos.x; b.pos.x = x; b.mesh.position.x += dx; b.plate.position.x += dx; }); }
    makeKiosk(L, -3.6, 2.6, Math.PI / 2);
    L.hudActions = [
      { label: () => `Session: ${SESSIONS[W.si].name} ▸`, show: () => W.st !== 'go', run: nextSession },
      { label: () => (W.st === 'go' ? 'Stop' : 'Start'), run: () => (W.st === 'go' ? stop('quit') : start()) },
    ];
    // browser controls
    const keys = {};
    L.onKey = (code) => {
      if (code === 'KeyF') { W.flat.punch = { hand: 0 }; return true; }
      if (code === 'KeyJ') { W.flat.punch = { hand: 1 }; return true; }
      if (/^Digit/.test(code) && W.st === 'go') return true;
      return false;
    };
    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (state.level !== L.idx || state.mode !== 'flat' || W.st !== 'go') return;
      const r = renderer.domElement.getBoundingClientRect(); W.flat.punch = { hand: (e.clientX - r.left) / r.width < 0.5 ? 0 : 1 };
    });
    void keys;
    L.hints = [['F / J', 'punch left / right'], ['↓', 'squat'], ['← →', 'dodge'], ['↑', 'reach']];
    L.hintsFor = () => (state.mode === 'flat' ? L.hints : [['Punch', 'red left, blue right'], ['Squat', 'under the bars'], ['Lean', 'away from walls'], ['Reach', 'touch the stars']]);

    // ---------------------------------------------------------------- the board over the stage
    L.board = makeBoard(G, 1024, 512, 4.0, 2.0, 0, 3.4, -4.9, 0, false);
    let boardKey = '';
    function drawBoard() {
      const g = L.board.g, Wd = 1024, H = 512, S = SESSIONS[W.si];
      g.fillStyle = '#1e1a2e'; g.fillRect(0, 0, Wd, H);
      g.strokeStyle = '#ff9a5c'; g.lineWidth = 10; g.strokeRect(5, 5, Wd - 10, H - 10);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      if (W.st === 'go') {
        const r = W.round, t = now0(), P = W.plan;
        const mv = r ? r.mv : 'rest', left = r ? Math.max(0, Math.ceil(r.t1 - t)) : Math.max(0, Math.ceil(P.rounds[0].t0 - t));
        g.fillStyle = mv === 'rest' ? '#8bd450' : '#ff9a5c'; g.font = `800 96px ${DISPLAY}`;
        g.fillText(r ? (mv === 'rest' ? `Rest · next: ${MOVES[r.next].name}` : MOVES[mv].name) : 'Get ready', Wd / 2, 120, Wd - 60);
        g.fillStyle = '#ffffff'; g.font = `800 120px ${DISPLAY}`; g.fillText(`${left}s`, Wd / 2, 260);
        g.fillStyle = '#d8d0f0'; g.font = `400 32px ${BODY}`; g.fillText(r ? MOVES[mv].tip : 'Stand tall on your mat', Wd / 2, 320, Wd - 60);
        g.font = `700 40px ${BODY}`; g.fillStyle = '#ffffff';
        g.fillText(`${W.score.toLocaleString()} points · ${W.combo} streak · ${Math.round(W.kcal)} kcal`, Wd / 2, 400);
        const p = clamp(t / P.len, 0, 1);
        rr(g, 112, 440, 800, 18, 9); g.fillStyle = '#3a3450'; g.fill(); rr(g, 112, 440, Math.max(18, 800 * p), 18, 9); g.fillStyle = '#ff9a5c'; g.fill();
      } else if (W.result) {
        const R = W.result;
        g.fillStyle = '#ff9a5c'; g.font = `800 84px ${DISPLAY}`; g.fillText('Workout done!', Wd / 2, 110);
        g.fillStyle = '#ffffff'; g.font = `800 72px ${DISPLAY}`; g.fillText(`${R.score.toLocaleString()} points${R.newBest ? '  ★' : ''}`, Wd / 2, 210);
        g.fillStyle = '#d8d0f0'; g.font = `400 36px ${BODY}`;
        g.fillText(`${Math.round(R.acc * 100)}% · about ${Math.round(R.kcal)} kcal`, Wd / 2, 280);
        g.fillText(`${R.reps.punch} punches · ${R.reps.squat} squats · ${R.reps.dodge} dodges · ${R.reps.reach} reaches`, Wd / 2, 340, Wd - 60);
        g.font = `400 28px ${BODY}`; g.fillText('Calories are a rough guide for an adult of about 70 kg', Wd / 2, 420);
      } else {
        g.fillStyle = '#ff9a5c'; g.font = `800 88px ${DISPLAY}`; g.fillText('Sunrise Workout', Wd / 2, 120);
        g.fillStyle = '#ffffff'; g.font = `700 56px ${DISPLAY}`;
        g.fillText(`${S.name} · ${Math.round(S.rounds.reduce((n, r) => n + r[1], 0) / 60 + (S.rounds.length - 1) * REST / 60)} min`, Wd / 2, 220);
        g.fillStyle = '#d8d0f0'; g.font = `400 32px ${BODY}`;
        g.fillText(S.rounds.map((r) => MOVES[r[0]].name).join(' · '), Wd / 2, 290, Wd - 60);
        const best = W.best[String(W.si)];
        g.fillText(best ? `Your best: ${best.toLocaleString()}` : 'Clear some space around you, then press Start', Wd / 2, 360);
        g.fillText(state.mode === 'vr' ? 'Session and Start are by your mat, on the left' : 'F / J punch · ↓ squat · ← → dodge · ↑ reach', Wd / 2, 430);
      }
      L.board.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      const sp = spotNow();
      mats.forEach((m, i) => { m.visible = i < Math.max(1, sp.n); m.position.x = sp.x(i); });
      if (here && W.st !== 'go') { const want = sp.x(sp.k); if (Math.abs(want - W.spotX) > 0.01) { W.spotX = want; moveButtons(); } }
      // browser body: keys move your view
      if (state.mode === 'flat') {
        const k = state.keys, f = 1 - Math.exp(-dt * 12);
        W.flat.squat += ((k.ArrowDown || k.KeyS || k.KeyC ? 1 : 0) - W.flat.squat) * f;
        W.flat.lean += (((k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0)) - W.flat.lean) * f;
        W.flat.reach += ((k.ArrowUp || k.KeyW ? 1 : 0) - W.flat.reach) * f;
      }
      if (here && W.st === 'go') step(dt);
      if (state.mode === 'flat' && W.flat.punch && performance.now() - (W.flat.punchT || 0) > 400) W.flat.punchT = performance.now();
      coachPose(now);
      const t = W.st === 'go' ? now0() : 0;
      const key = `${W.st}|${W.score}|${W.combo}|${Math.round(W.kcal)}|${W.round ? W.round.t0 : -1}|${Math.ceil(t)}|${W.si}|${!!W.result}|${state.mode}`;
      if (here && key !== boardKey) { boardKey = key; drawBoard(); }
    };
    L.flatCamera = () => {
      camera.position.set(W.flat.lean * 0.35, 1.55 - W.flat.squat * 0.6, 0.55);      // (a step back from the pads, so you can see them coming)
      camera.rotation.set(-0.06 + W.flat.reach * 0.25, 0, -W.flat.lean * 0.12, 'YXZ');
      state.yaw = 0; state.pitch = -0.06;
      return true;
    };
    L.spawn = () => { dolly.position.set(0, 0, 0); camera.position.set(0, 1.6, 0); standOnMat(); if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.06; } };
    L.onEnter = () => { boardKey = ''; };
    L.onExit = () => stop('quit');
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.4; camera.position.set(Math.sin(a) * 3, 2.2, 3); camera.lookAt(0, 1.4, -4); };
    // walking with the stick is fine between workouts; during one you stay on your mat
    Object.defineProperty(L, 'noLocomotion', { get: () => W.st === 'go' });

    // ---------------------------------------------------------------- network
    L.presence = () => ({ wo: [W.st === 'go' ? 1 : 0, W.si, W.score, W.hits, Math.round(W.kcal * 10)] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.wo;
      if (!Array.isArray(a) || a.length !== 5 || !a.every(Number.isInteger)) return;
      if (!st.wo || st.wo[2] !== a[2] || st.wo[0] !== a[0]) state.dirtyBoard = true;
      st.wo = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? [W.st === 'go' ? 1 : 0, W.si, W.score, W.hits, Math.round(W.kcal * 10)] : st.wo || [0, 0, 0, 0, 0];
      return { score: a[2], text: a[0] ? `${a[2].toLocaleString()} · ${Math.round(a[4] / 10)} kcal` : a[2] ? `${a[2].toLocaleString()} points` : 'warming up' };
    };
    L.sortRows = (a, b) => (b.score || 0) - (a.score || 0);
    L.drawBoard = () => { boardKey = ''; };
    L.woInternals = { W, SESSIONS, MOVES, makePlan, start, stop, step, pads, bars, walls, stars, HZ };
    return L;
  })();
