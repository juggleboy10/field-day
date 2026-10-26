  // ================================================================ LEVEL: MUSICAL CHAIRS
  // Walk round the ring of chairs while the music plays. When it stops, grab a seat: stand right at a chair.
  // There's one chair fewer than players, so whoever's left standing is out; a chair goes each round until one
  // winner is left. Bots make up the numbers. One player's device (the first in the room) runs the game and
  // decides who got each chair; everyone else follows. The tune is the game's own, so it really stops.
  const chairs = (() => {
    const L = newLevel(32);
    BOTLV.on(L);   // the bots: how quick they react to the music stopping, and how fast they dash
    const G = L.group;
    const rand = mulberry32(3232);
    L.grabless = true;
    L.bounds = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
    L.env = {
      sky: skyTexture([[0, '#ffb86a'], [0.5, '#ffd8a0'], [1, '#ffd8a0']]),
      bg: 0xffd8a0, fog: [0xffe0b0, 25, 70], hemi: [0xfff4e0, 0x8a6a50, 0.85],
      sun: [0xfff0d8, 0.7], sunDir: new V3(0.4, 1, 0.3), ambient: [0x8a7060, 0.4], sprite: null,
    };
    const BOT_NAMES = ['Dizzy Dot', 'Speedy Sam', 'Slow Moe', 'Polka Pam', 'Twirly Tim', 'Bouncy Bea', 'Lucky Lou'];
    const BOT_COLS = ['#ff7ac8', '#4fc3f7', '#8bd450', '#ffd23f', '#b388ff', '#ff9a3a', '#2ec4b6'];
    const BOT_SPEED = [3.0, 3.4, 2.4, 2.9, 3.1, 2.7, 3.2], BOT_REACT = [0.45, 0.3, 0.7, 0.5, 0.4, 0.55, 0.35];

    // ---------------------------------------------------------------- the party room
    const wood = canvasTexture(256, 256, (g) => { for (let i = 0; i < 8; i++) { const s = 170 + Math.floor(rand() * 30); g.fillStyle = `rgb(${s},${s - 40},${s - 90})`; g.fillRect(0, i * 32, 256, 30); g.fillStyle = 'rgba(80,50,20,0.5)'; g.fillRect(0, i * 32 + 30, 256, 2); g.fillRect(Math.floor(rand() * 256), i * 32, 2, 30); } });
    wood.tex.wrapS = wood.tex.wrapT = THREE.RepeatWrapping; wood.tex.repeat.set(4, 4);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshLambertMaterial({ map: wood.tex })); floor.rotation.x = -Math.PI / 2; G.add(floor);
    const rug = new THREE.Mesh(new THREE.RingGeometry(1.2, 5.6, 48), new THREE.MeshLambertMaterial({ color: 0xd84a6a })); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.005; G.add(rug);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 4, 48, 1, true), new THREE.MeshLambertMaterial({ color: 0xf8e0c0, side: THREE.BackSide })); wall.position.y = 2; G.add(wall);
    // bunting and balloons
    const cols = [0xff4d8a, 0x4fc3f7, 0xffd23f, 0x8bd450, 0xb388ff];
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, f = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 3), lam(cols[i % 5])); f.position.set(Math.cos(a) * 8.6, 3.3, Math.sin(a) * 8.6); f.rotation.x = Math.PI; G.add(f); }
    const balloons = [];
    for (let i = 0; i < 14; i++) { const a = rand() * Math.PI * 2, r = 6.5 + rand() * 2, b = new THREE.Mesh(sph(0.28, 12, 10), new THREE.MeshLambertMaterial({ color: cols[i % 5] })); b.scale.y = 1.2; b.position.set(Math.cos(a) * r, 2.6 + rand() * 1.2, Math.sin(a) * r); G.add(b); balloons.push({ m: b, y: b.position.y, ph: rand() * 6 }); }
    // the record player on a table
    addBox(G, 1.2, 0.8, 0.8, lam(0x8a5a30), 0, 0.4, -7.6);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 24), lam(0x1a1a1a)); disc.position.set(0, 0.83, -7.6); G.add(disc);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.022, 16), lam(0xff4d8a)); label.position.copy(disc.position); G.add(label);
    const notes = [];
    for (let i = 0; i < 6; i++) { const n = makePlate(G, '♪', 0.3, 0.3, new V3(0, 1.2, -7.4), 0, { bg: 'rgba(0,0,0,0)', fg: '#ff4d8a', size: 0.9 }); n.material.transparent = true; notes.push(n); }

    // ---------------------------------------------------------------- chairs and players
    const chairMeshes = [];
    function makeChair(col) {
      const g = new THREE.Group(), m = lam(col), legM = lam(0xf4f4f0);
      g.add(at(new THREE.Mesh(boxg(0.45, 0.06, 0.45), m), 0, 0.46, 0));
      g.add(at(new THREE.Mesh(boxg(0.45, 0.5, 0.06), m), 0, 0.72, 0.2));
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) g.add(at(new THREE.Mesh(boxg(0.04, 0.46, 0.04), legM), x, 0.23, z));
      G.add(g);
      return g;
    }
    for (let i = 0; i < 8; i++) chairMeshes.push(makeChair(cols[i % 5]));
    const R = (n) => 0.9 + n * 0.22;   // the chair ring's radius for n chairs
    // chairs face outward, so you come at them from the walking ring
    const chairPos = (i, n) => { const a = (i / n) * Math.PI * 2; return { x: Math.cos(a) * R(n), z: Math.sin(a) * R(n), yaw: Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI }; };
    const bots = BOT_NAMES.map((name, i) => {
      const g = buildAvatar(BOT_COLS[i], [3, 1, 2, 3, 0, 1, 2][i], i % 4, true, 1, 5);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.42; g.add(tag); g.visible = false; G.add(g);
      return { id: `b${i}`, i, name, g, x: 0, z: 0, ang: 0, tx: 0, tz: 0, target: -1, reactT: 0 };
    });
    L.chairBots = bots;

    // ---------------------------------------------------------------- the game (run by the host)
    // players: ids, 'b0'.. for bots or a peer id. alive: still in. seats: which player has each chair (-1 none).
    const S = { g: 0, ph: 'lobby', round: 0, ids: [], alive: [], seats: [], n: 0, t: 0, stopAt: 0, outName: '', winner: '', tempo: 1, req: 0 };
    L.mc = S;
    const humansHere = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const isHost = () => humansHere()[0] === state.myPeer;
    const nameOf = (id) => { if (id[0] === 'b' && id.length <= 2) return BOT_NAMES[Number(id.slice(1))]; if (id === state.myPeer) return state.name || 'You'; const rec = remotes.get(id); return rec ? rec.name : 'Someone'; };
    makePlayerPicker(L, { min: 3, max: 8, def: 6, label: 'Players', note: 'bots make up the numbers' });
    function startGame() {
      const people = humansHere().filter((id) => { if (id === state.myPeer) return !(L.sitOut && L.sitOut.on); const st = remotes.get(id).lvState[L.id]; return !(st && st.sitOut); });
      const nBots = clamp(L.picker.n - people.length, people.length < 2 ? 2 : 0, bots.length);
      S.ids = [...people, ...bots.slice(0, nBots).map((b) => b.id)];
      S.alive = S.ids.map(() => true);
      S.g = Date.now(); S.round = 0; S.tempo = 1;
      nextRound();
      forcePresence();
    }
    function aliveIds() { return S.ids.filter((_, i) => S.alive[i]); }
    function nextRound() {
      const n = aliveIds().length;
      if (n <= 1) { S.ph = 'won'; S.winner = aliveIds()[0] || ''; S.t = Date.now(); return; }
      S.round += 1; S.n = n - 1; S.seats = Array(S.n).fill(''); S.ph = 'walk'; S.t = Date.now();
      S.stopAt = S.t + 6000 + rand() * 9000; S.tempo = 1 + (S.round - 1) * 0.08;
      // the bots spread out round the walking ring
      aliveIds().forEach((id, k) => { const b = botOf(id); if (b) { b.ang = (k / n) * Math.PI * 2 + 0.3; b.target = -1; b.reactT = BOT_REACT[b.i] * (0.7 + rand() * 0.6) * BOTLV.pick(L, [1.6, 1, 0.6]); } });   // (the Bots level: how quick they react)
    }
    const botOf = (id) => (id[0] === 'b' && id.length <= 2 ? bots[Number(id.slice(1))] : null);
    function claim(id, chair) {
      if (S.ph !== 'grab' || S.seats[chair] || S.seats.includes(id)) return false;
      S.seats[chair] = id;
      if (S.seats.every((x) => x)) {
        const out = aliveIds().find((x) => !S.seats.includes(x));
        if (out) { S.alive[S.ids.indexOf(out)] = false; S.outName = nameOf(out); }
        S.ph = 'result'; S.t = Date.now();
      }
      forcePresence();
      return true;
    }
    function posOf(id) {
      if (id === state.myPeer) return myHead.pos;
      const b = botOf(id); if (b) return { x: b.x, z: b.z };
      const rec = remotes.get(id); return rec && rec.hasH ? rec.tgt.h.pos : null;
    }
    function hostStep(dt) {
      const now = Date.now();
      const n = S.n, ring = R(n) + 1.25;
      if (S.ph === 'walk') {
        for (const id of aliveIds()) { const b = botOf(id); if (!b) continue; b.ang += dt * (0.62 * S.tempo) * (1.2 / ring) * 2.2; b.x = Math.cos(b.ang) * ring; b.z = Math.sin(b.ang) * ring; }
        if (now >= S.stopAt) { S.ph = 'grab'; S.t = now; forcePresence(); }
      } else if (S.ph === 'grab') {
        // bots: a moment to react, then dash for the nearest free chair
        for (const id of aliveIds()) {
          const b = botOf(id); if (!b || S.seats.includes(id)) continue;
          b.reactT -= dt; if (b.reactT > 0) continue;
          let best = -1, bd = 1e9;
          for (let c = 0; c < n; c++) { if (S.seats[c]) continue; const p = chairPos(c, n), d = Math.hypot(p.x - b.x, p.z - b.z); if (d < bd) { bd = d; best = c; } }
          if (best < 0) continue;
          const p = chairPos(best, n), dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz), s = BOT_SPEED[b.i] * BOTLV.pick(L, [0.82, 1, 1.15]) * dt;
          if (d <= 0.25) { claim(id, best); continue; }
          b.x += dx / d * Math.min(d, s); b.z += dz / d * Math.min(d, s);
        }
        // people: standing right at a free chair takes it
        for (const id of aliveIds()) {
          if (botOf(id) || S.seats.includes(id)) continue;
          const p = posOf(id); if (!p) continue;
          for (let c = 0; c < n; c++) { if (S.seats[c]) continue; const q = chairPos(c, n); if (Math.hypot(q.x - p.x, q.z - p.z) < 0.55) { claim(id, c); break; } }
        }
      } else if (S.ph === 'result' && now - S.t > 3200) { nextRound(); forcePresence(); }
    }
    L.mcInternals = { S, startGame, hostStep, claim, chairPos, R, bots, nextRound };

    // ---------------------------------------------------------------- the tune (its own, so it really stops)
    const TUNE = [72, 76, 79, 76, 72, 76, 79, 84, 81, 79, 77, 76, 74, 76, 72, 67, 72, 76, 79, 76, 72, 76, 79, 84, 83, 81, 79, 77, 76, 74, 72, 72];
    const BASS = [48, 55, 48, 55, 53, 60, 53, 60, 48, 55, 48, 55, 43, 50, 48, 48];
    const mtoF = (m) => 440 * Math.pow(2, (m - 69) / 12);
    let tuneStep = 0, tuneNext = 0;
    function playTune(now, on, tempo) {
      if (!on || !snd.ctx || snd.ctx.state !== 'running') { tuneNext = 0; return; }
      const stepMs = 60000 / (150 * tempo) / 2;
      if (!tuneNext) tuneNext = now;
      while (tuneNext <= now + 30) {
        const m = TUNE[tuneStep % TUNE.length];
        tone(mtoF(m), 0, stepMs / 1000 * 0.9, 'square', 0.05);
        if (tuneStep % 2 === 0) tone(mtoF(BASS[(tuneStep / 2) % BASS.length]), 0, stepMs / 1000 * 1.6, 'triangle', 0.08);
        tuneStep += 1; tuneNext += stepMs;
      }
    }

    // ---------------------------------------------------------------- network
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    const PH = ['lobby', 'walk', 'grab', 'result', 'won'];
    L.presence = () => {
      const p = { mr: S.req };
      if (isHost()) p.mc = { g: S.g, ph: PH.indexOf(S.ph), r: S.round, n: S.n, ids: S.ids, al: S.alive.map((a) => (a ? 1 : 0)), se: S.seats, sa: S.stopAt, o: S.outName, w: S.winner, tp: Math.round(S.tempo * 100), b: bots.map((b) => [Math.round(b.x * 100) / 100, Math.round(b.z * 100) / 100]) };
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      // someone pressed Start: the host starts a game
      if (int(pres.mr, 0, 1e9) && pres.mr !== st.mr) { const was = st.mr; st.mr = pres.mr; if (was !== undefined && isHost() && (S.ph === 'lobby' || S.ph === 'won')) startGame(); }
      const q = pres.mc;
      if (!q || isHost() || rec.peer !== humansHere()[0]) return;
      if (!(int(q.g, 0, 1e14) && int(q.ph, 0, 4) && int(q.r, 0, 99) && int(q.n, 0, 8) && Array.isArray(q.ids) && q.ids.length <= 9 && q.ids.every((x) => typeof x === 'string' && x.length < 80)
        && Array.isArray(q.al) && q.al.length === q.ids.length && Array.isArray(q.se) && q.se.length === q.n && q.se.every((x) => typeof x === 'string') && Number.isFinite(q.sa) && Array.isArray(q.b) && q.b.length === bots.length)) return;
      const prevPh = S.ph, wasAlive = S.alive[S.ids.indexOf(state.myPeer)];
      Object.assign(S, { g: q.g, ph: PH[q.ph], round: q.r, n: q.n, ids: q.ids.slice(), alive: q.al.map((a) => a === 1), seats: q.se.slice(), stopAt: q.sa, outName: String(q.o || ''), winner: String(q.w || ''), tempo: (q.tp || 100) / 100 });
      bots.forEach((b, i) => { const a = q.b[i]; if (Array.isArray(a) && Number.isFinite(a[0]) && Number.isFinite(a[1])) { b.tx = a[0]; b.tz = a[1]; } });
      announce(prevPh, wasAlive);
    };
    // what's happening, for everyone (the host calls this too)
    let lastPh = 'lobby', lastRound = 0, saidSafe = false;
    function announce(prevPh) {
      if (S.ph === lastPh && S.round === lastRound) return;
      const meIn = S.ids.includes(state.myPeer);
      if (S.ph === 'walk') { showToast(S.round === 1 ? `Round 1: ${S.n} chairs for ${S.n + 1} players. Walk round until the music stops!` : `Round ${S.round}: ${S.n} chair${S.n === 1 ? '' : 's'} left. Walk!`); saidSafe = false; }
      else if (S.ph === 'grab') { showToast('The music stopped! Grab a chair!'); sfx('buzzer', 0.4); if (state.mode === 'vr' && meIn) for (const s of SIDES) haptic(vrHands[s], 0.7, 120); }
      else if (S.ph === 'result') { const iOut = S.outName && meIn && !S.alive[S.ids.indexOf(state.myPeer)] && S.outName === (state.name || 'You'); showToast(iOut ? 'No chair for you! You’re out' : `${S.outName} is out!`); sfx(iOut ? 'buzzer' : 'poof', 0.7); }
      else if (S.ph === 'won') { const iWon = S.winner === state.myPeer; showToast(iWon ? 'You win musical chairs!' : `${nameOf(S.winner)} wins!`); sfx(iWon ? 'fanfare' : 'cheer', 1); if (iWon) spawnFloat('Winner!', new V3(0, 2.2, 0), '#ffd23f'); }
      lastPh = S.ph; lastRound = S.round;
      state.hudDirty = true; state.dirtyBoard = true;
      void prevPh;
    }

    // ---------------------------------------------------------------- per frame
    const _c = new V3();
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (here && isHost() && S.ph !== 'lobby' && S.ph !== 'won') hostStep(dt);
      if (here) announce();
      if (here && S.ph === 'won' && isHost() && Date.now() - S.t > 9000) { S.ph = 'lobby'; forcePresence(); }
      const n = S.n;
      // chairs
      chairMeshes.forEach((c, i) => {
        c.visible = S.ph !== 'lobby' && S.ph !== 'won' ? i < n : i < Math.max(0, Math.min(8, (L.picker ? L.picker.n : 6) - 1));
        if (!c.visible) return;
        const nn = S.ph !== 'lobby' && S.ph !== 'won' ? n : Math.max(1, (L.picker ? L.picker.n : 6) - 1);
        const p = chairPos(i, nn); c.position.set(p.x, 0, p.z); c.rotation.y = p.yaw;
      });
      // bots: walking, dashing, sitting
      const k = 1 - Math.exp(-dt * 12);
      for (const b of bots) {
        const idx = S.ids.indexOf(b.id);
        b.g.visible = here && idx >= 0;
        if (!b.g.visible) continue;
        if (!isHost()) { b.x += (b.tx - b.x) * k; b.z += (b.tz - b.z) * k; }
        const alive = S.alive[idx], seat = S.seats.indexOf(b.id);
        let x = b.x, z = b.z, y = 1.62, yaw = Math.atan2(-Math.sin(b.ang + Math.PI / 2), -Math.cos(b.ang + Math.PI / 2));
        if (!alive) { const a = (b.i / bots.length) * Math.PI * 2; x = Math.cos(a) * 7.2; z = Math.sin(a) * 7.2; yaw = Math.atan2(x, z); }
        else if (seat >= 0 && S.ph !== 'walk') { const p = chairPos(seat, n); x = p.x; z = p.z; y = 1.22; yaw = p.yaw; }
        else if (S.ph === 'walk') { yaw = b.ang + Math.PI; y += Math.abs(Math.sin(now * 0.012 + b.i)) * 0.05; }
        b.g.position.set(x, y, z); b.g.rotation.y = yaw;
      }
      // the tune, the record and the notes
      const playing = here && S.ph === 'walk';
      playTune(performance.now(), playing, S.tempo);
      disc.rotation.y += playing ? dt * 4 : 0; label.rotation.y = disc.rotation.y;
      notes.forEach((m, i) => { const u = ((now * 0.0005 + i / notes.length) % 1); m.visible = playing; m.position.set(Math.sin(i * 2.3 + u * 4) * 0.6, 1.0 + u * 1.6, -7.5); m.material.opacity = 1 - u; });
      for (const b of balloons) b.m.position.y = b.y + Math.sin(now * 0.001 + b.ph) * 0.08;
      // me: am I seated?
      if (here && S.ph === 'grab' && S.seats.includes(state.myPeer) && !saidSafe) { saidSafe = true; showToast('Safe! You got a chair'); sfx('chime', 0.8); }
      if (here && ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const meIdx = S.ids.indexOf(state.myPeer), alive = meIdx >= 0 && S.alive[meIdx];
        const txt = S.ph === 'lobby' ? 'Musical Chairs: press Start game' : S.ph === 'won' ? `${nameOf(S.winner)} wins!` : `Round ${S.round} · ${S.n} chair${S.n === 1 ? '' : 's'} · ${aliveIds().length} players · ${meIdx < 0 ? 'watching' : alive ? (S.ph === 'walk' ? 'keep walking…' : S.ph === 'grab' ? (S.seats.includes(state.myPeer) ? 'safe!' : 'GRAB A CHAIR!') : '') : 'you’re out'}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    // while the music plays you walk the ring, not by the chairs; once out, you watch from the edge
    L.clampPlayer = (p) => {
      const meIdx = S.ids.indexOf(state.myPeer), alive = meIdx >= 0 && S.alive[meIdx];
      const r = Math.hypot(p.x, p.z) || 1e-3;
      let want = r;
      if (alive && S.ph === 'walk') want = clamp(r, R(S.n) + 0.75, R(S.n) + 2.2);
      else if (!alive && S.ph !== 'lobby' && S.ph !== 'won' && meIdx >= 0) want = Math.max(r, 6.2);
      want = Math.min(want, 8.5);
      return [p.x / r * want - p.x, p.z / r * want - p.z];
    };
    L.walkSpeed = 3.2;
    function requestStart() {
      if (isHost()) { if (S.ph === 'lobby' || S.ph === 'won') startGame(); else showToast('A game is already on'); }
      else { S.req += 1; forcePresence(); showToast('Asking to start…'); }
    }
    L.requestStart = requestStart;
    makeButton(L, new V3(1.8, 1.0, -7.2), 0xff4d8a, 'Start game', () => requestStart(), { faceYaw: 0 });
    makeKiosk(L, -6.6, 4.2, Math.PI * 0.75);
    L.board = makeBoard(G, 720, 460, 2.4, 1.53, -6.0, 2.0, -5.0, Math.PI * 0.27);
    L.rowFor = (st, isMe) => ({ text: isMe ? (S.ids.includes(state.myPeer) ? (S.alive[S.ids.indexOf(state.myPeer)] ? 'in' : 'out') : 'watching') : '' });
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#4a1a3a'; g.fillRect(0, 0, W, 460);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Musical Chairs', 36, 80);
      g.fillStyle = '#ffd8e8'; g.font = `400 24px ${BODY}`; g.fillText('Walk while it plays. Grab a chair when it stops!', 36, 118);
      const list = S.ids.length ? S.ids.map((id, i) => ({ name: nameOf(id), me: id === state.myPeer, text: S.alive[i] ? (S.ph === 'won' ? 'WINNER' : 'in') : 'out', color: '#ffffff' })) : rows;
      drawRows(g, list, 176, 40, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => (S.ph === 'lobby' || S.ph === 'won' ? 'Start game' : 'Playing…'), run: () => requestStart() }];
    L.hints = [['Music on', 'walk round the ring'], ['Music stops', 'get to a chair!'], ['Stand at a chair', 'to take it']];
    L.hintsFor = () => (state.mode === 'flat' ? [['WASD', 'walk'], ['Music stops', 'run to a chair and stand on it'], ['Start game', 'top right']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 5.5); camera.position.set(0, 1.6, 0); if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.2; } };
    L.onEnter = () => { lastPh = S.ph; lastRound = S.round; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; tuneNext = 0; };
    L.attract = (now) => { const a = reduceMotion ? 0 : now * 0.0001; camera.position.set(Math.sin(a) * 6, 3.5, Math.cos(a) * 6); camera.lookAt(0, 0.6, 0); };
    MUSIC_THEMES.chairs = { gain: 0.0001, bpm: 100, chords: ['C'], drums: {} };
    void _c;
    return L;
  })();
