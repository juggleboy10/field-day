  // ================================================================ LEVEL: TOBOGGAN RUN
  // A downhill sled race on a snowy mountain. Gravity does the work; you steer round the snowmen, hit the blue ice
  // strips for speed, and fly off two jumps. Tucking down goes faster but steers less; braking slows you.
  // VR: lean left or right to steer (or use the stick), crouch to tuck, trigger brakes, A starts a race.
  // Browser: A/D steer, W tucks, S brakes. Bots race too; friends race alongside (each page runs its own sled).
  const toboggan = (() => {
    const L = newLevel(35);
    const G = L.group;
    const rand = mulberry32(3535);
    L.grabless = true;
    L.noLocomotion = true;
    L.env = {
      sky: skyTexture([[0, '#4a7ac8'], [0.4, '#9ac0ec'], [0.5, '#e8f2fc'], [1, '#c8d8e8']]),
      bg: 0xc8dcf0, fog: [0xdce8f4, 60, 260], hemi: [0xf4f8ff, 0x8aa0c0, 0.95],
      sun: [0xffffff, 0.75], sunDir: new V3(0.4, 1, 0.5), ambient: [0x8aa0c0, 0.35], sprite: { tex: paleSunTex, pos: new V3(160, 200, -300), scale: 60 },
    };
    const HW = 4.2, GRAV = 9.8, MU = 0.03, DRAG = 0.011, COUNT_MS = 3500;

    // ---------------------------------------------------------------- the run
    const CTRL = [[0, 60, 10], [0, 59.4, 0], [3, 56, -30], [-6, 51, -65], [4, 45, -105], [12, 40, -140], [2, 34, -180], [-10, 28, -220], [-4, 21, -262], [8, 14, -300], [6, 8, -335], [0, 3, -370], [0, 1.2, -395], [0, 0.6, -430], [0, 0.5, -460]];
    const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, y, z]) => new V3(x, y, z)), false, 'centripetal');
    const N = 1400;
    const P = curve.getSpacedPoints(N - 1);
    const TLEN = curve.getLength(), DS = TLEN / (N - 1);
    const T = P.map((p, i) => new V3().subVectors(P[Math.min(N - 1, i + 1)], P[Math.max(0, i - 1)]).setY(0).normalize());
    const NR = T.map((t) => new V3(-t.z, 0, t.x));
    const SLOPE = P.map((p, i) => (i < N - 1 ? (p.y - P[i + 1].y) / DS : 0));
    const START_S = 8, FINISH_S = TLEN - 70;
    L.run = { P, T, NR, N, TLEN, DS, FINISH_S };
    const at_ = (s) => clamp(Math.floor(s / DS), 0, N - 2);
    function posAt(s, lat, out) {
      const i = at_(s), u = clamp(s / DS - i, 0, 1), a = P[i], b = P[i + 1], na = NR[i], nb = NR[i + 1];
      // (the sideways direction is blended too, so nothing off the centre line jumps from one point to the next)
      const nx = na.x + (nb.x - na.x) * u, nz = na.z + (nb.z - na.z) * u;
      out.set(a.x + (b.x - a.x) * u + nx * lat, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u + nz * lat);
      return out;
    }
    // the run's heading at s, blended between points
    function yawAt(s) { const i = at_(s), u = clamp(s / DS - i, 0, 1), a = T[i], b = T[i + 1]; return Math.atan2(-(a.x + (b.x - a.x) * u), -(a.z + (b.z - a.z) * u)); }
    // what you ride with: a heading and a height that change smoothly, so the view never shakes
    const RIDE = { yaw: 0, y: 0, on: false };
    function rideStep(dt, yaw, y) {
      if (!RIDE.on) { RIDE.yaw = yaw; RIDE.y = y; RIDE.on = true; }
      let d = yaw - RIDE.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      RIDE.yaw += d * Math.min(1, dt * 3); RIDE.y += (y - RIDE.y) * Math.min(1, dt * 5);
    }
    // the snow: a wide ribbon down the mountain, the groomed run in the middle, banks at its edges
    function ribbon(l0, l1, yOff, mat, vScale) {
      const pos = [], uv = [], idx = [];
      for (let i = 0; i < N; i++) {
        const p = P[i], n = NR[i], y0 = p.y + (typeof yOff === 'function' ? yOff(l0) : yOff), y1 = p.y + (typeof yOff === 'function' ? yOff(l1) : yOff);
        pos.push(p.x + n.x * l0, y0, p.z + n.z * l0, p.x + n.x * l1, y1, p.z + n.z * l1);
        uv.push(0, (i * DS) / vScale, 1, (i * DS) / vScale);
        if (i < N - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat); G.add(m); return m;
    }
    const snowTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#eef4fa'; g.fillRect(0, 0, 128, 128); for (let k = 0; k < 40; k++) { g.fillStyle = k % 2 ? 'rgba(200,220,240,0.45)' : 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse((k * 37) % 128, (k * 59) % 128, 6 + (k % 4) * 4, 3 + (k % 3) * 2, k, 0, Math.PI * 2); g.fill(); } });
    snowTex.tex.wrapS = snowTex.tex.wrapT = THREE.RepeatWrapping;
    const runTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#dce8f4'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(150,180,210,0.5)'; g.lineWidth = 2; for (let x = 8; x < 128; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, 128); g.stroke(); } });
    runTex.tex.wrapS = runTex.tex.wrapT = THREE.RepeatWrapping;
    for (const sx of [-1, 1]) ribbon(sx * (HW + 1.2), sx * 60, (l) => (Math.abs(l) > 10 ? 0.6 : 0.6), new THREE.MeshLambertMaterial({ map: snowTex.tex, side: THREE.DoubleSide }), 12);
    ribbon(-HW, HW, 0.02, new THREE.MeshLambertMaterial({ map: runTex.tex, side: THREE.DoubleSide }), 6);
    for (const sx of [-1, 1]) ribbon(sx * HW, sx * (HW + 1.2), (l) => (Math.abs(l) > HW + 0.5 ? 0.6 : 0.02), new THREE.MeshLambertMaterial({ color: 0xf4f8ff, side: THREE.DoubleSide }), 6);
    // trees down both sides, mountains beyond
    {
      const n = 340, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.3, 1, 6), lam(0x5a4030), n), crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), lam(0xffffff), n);
      const m4 = new THREE.Matrix4(), q = new Q4(), sc = new V3(), p = new V3(), col = new THREE.Color();
      for (let k = 0; k < n; k++) {
        const s = rand() * TLEN, side = rand() < 0.5 ? -1 : 1, lat = side * (HW + 3 + rand() * 30), h = 2.5 + rand() * 3;
        posAt(s, lat, p); p.y += 0.6;
        m4.compose(new V3(p.x, p.y + 0.5, p.z), q, sc.set(1, 1.2, 1)); trunks.setMatrixAt(k, m4);
        m4.compose(new V3(p.x, p.y + 1 + h / 2, p.z), q, sc.set(1.3 + rand() * 0.6, h, 1.3 + rand() * 0.6)); crowns.setMatrixAt(k, m4);
        crowns.setColorAt(k, col.set(rand() < 0.3 ? '#e8f0f8' : ['#2f5a44', '#3a6a4a', '#2a5040'][Math.floor(rand() * 3)]));
      }
      trunks.frustumCulled = crowns.frustumCulled = false; G.add(trunks, crowns);
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, d = 320 + rand() * 80, s = 60 + rand() * 60; const m = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.5, 8), lam(0x8a9ab0)); m.position.set(Math.cos(a) * d, s * 0.5 - 20, -200 + Math.sin(a) * d); G.add(m); const c = new THREE.Mesh(new THREE.ConeGeometry(s * 0.42, s * 0.6, 8), lam(0xf4f8ff)); c.position.set(m.position.x, m.position.y + s * 0.47, m.position.z); G.add(c); }
    }
    // marker poles down both edges of the run, red on the left and blue on the right
    {
      const n = Math.floor(TLEN / 8) * 2, poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), lam(0xffffff), n), m4 = new THREE.Matrix4(), q = new Q4(), sc = new V3(1, 1, 1), p = new V3(), col = new THREE.Color();
      let k = 0;
      for (let s = 4; s < TLEN - 4 && k < n - 1; s += 8) for (const sx of [-1, 1]) { posAt(s, sx * (HW + 0.3), p); m4.compose(new V3(p.x, p.y + 0.7, p.z), q, sc); poles.setMatrixAt(k, m4); poles.setColorAt(k, col.set(sx < 0 ? '#e5453a' : '#3d82e8')); k++; }
      poles.count = k; poles.frustumCulled = false; G.add(poles);
    }
    // things on the run: ice strips (speed), jumps, snowmen (bonk)
    const quad = (s, len, w, lat, y, mat) => { const p = posAt(s, lat, new V3()); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat); m.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(m); g.position.set(p.x, p.y + y, p.z); g.rotation.y = Math.atan2(-T[at_(s)].x, -T[at_(s)].z); const sl = SLOPE[at_(s)]; m.rotation.x += Math.atan(sl) * 0; G.add(g); return g; };
    const ICE = [70, 150, 235, 310].map((s, k) => ({ s, lat: [-1.6, 1.4, 0, -1.2][k], w: 2.4, len: 4 }));
    const iceMat = new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.75 });
    for (const b of ICE) quad(b.s, b.len, b.w, b.lat, 0.06, iceMat);
    const JUMPS = [118, 272].map((s) => ({ s }));
    for (const j of JUMPS) {
      const p = posAt(j.s, 0, new V3()), g = new THREE.Group();
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 - 0.4, 0.08, 3), new THREE.MeshLambertMaterial({ color: 0xf4f8ff }));
      ramp.rotation.x = 0.2; ramp.position.y = 0.3; g.add(ramp);
      for (let k = 0; k < 8; k++) g.add(at(new THREE.Mesh(boxg((HW * 2 - 0.4) / 8, 0.04, 0.2), lam(k % 2 ? 0xe5453a : 0xffffff)), -HW + 0.2 + (k + 0.5) * (HW * 2 - 0.4) / 8, 0.6, -1.4));
      g.position.set(p.x, p.y, p.z); g.rotation.y = Math.atan2(-T[at_(j.s)].x, -T[at_(j.s)].z); G.add(g);
    }
    const SNOWMEN = [[52, 1.2], [96, -1.8], [134, 1.8], [170, -0.6], [205, 2.0], [250, -2.2], [290, 1.0], [325, -1.4], [350, 1.8]].map(([s, lat]) => ({ s, lat }));
    for (const sm of SNOWMEN) {
      const p = posAt(sm.s, sm.lat, new V3()), g = new THREE.Group(), w = lam(0xffffff);
      g.add(at(new THREE.Mesh(sph(0.45, 14, 10), w), 0, 0.4, 0), at(new THREE.Mesh(sph(0.32, 14, 10), w), 0, 1.0, 0), at(new THREE.Mesh(sph(0.22, 12, 8), w), 0, 1.45, 0));
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 8), lam(0xf5821f)); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.45, 0.25); g.add(nose);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.03, 6, 5), lam(0x111111)), sx * 0.08, 1.52, 0.19));
      g.add(at(new THREE.Mesh(cyl(0.16, 0.16, 0.25, 10), lam(0x1a1a22)), 0, 1.72, 0), at(new THREE.Mesh(cyl(0.25, 0.25, 0.03, 12), lam(0x1a1a22)), 0, 1.6, 0));
      g.position.set(p.x, p.y, p.z); g.rotation.y = Math.atan2(T[at_(sm.s)].x, T[at_(sm.s)].z); G.add(g); sm.g = g;
    }
    // start hut and gate, finish banner
    {
      const p0 = posAt(START_S, 0, new V3());
      addBox(G, 6, 3, 4, lam(0x8a5a30), p0.x - 8, p0.y + 1.5, p0.z + 6);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2, 4), lam(0xe5453a)); roof.rotation.y = Math.PI / 4; roof.position.set(p0.x - 8, p0.y + 4, p0.z + 6); G.add(roof);
      for (const [s, txt, col] of [[START_S, 'START', '#8bd450'], [FINISH_S, 'FINISH', '#ffd23f']]) {
        const p = posAt(s, 0, new V3()), yaw = Math.atan2(-T[at_(s)].x, -T[at_(s)].z);
        for (const sx of [-1, 1]) { const q = posAt(s, sx * (HW + 0.6), new V3()); addCyl(G, 0.1, 0.1, 4, 8, lam(0x2b2d42), q.x, q.y + 2, q.z); }
        const b = makePlate(G, txt, HW * 2 + 1.2, 0.8, new V3(p.x, p.y + 3.8, p.z), yaw, { bg: col, fg: '#16142e', size: 0.7 });
        void b;
      }
    }

    // ---------------------------------------------------------------- sleds
    function makeSled(col) {
      const g = new THREE.Group(), wood = lam(0xb07840), m = lam(col);
      g.add(at(new THREE.Mesh(boxg(0.7, 0.06, 1.5), wood), 0, 0.18, 0));
      for (const sx of [-1, 1]) { g.add(at(new THREE.Mesh(boxg(0.05, 0.05, 1.6), lam(0x9aa0b0)), sx * 0.33, 0.06, 0)); const curl = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 10, Math.PI), lam(0x9aa0b0)); curl.rotation.y = Math.PI / 2; curl.position.set(sx * 0.33, 0.15, -0.8); g.add(curl); }
      g.add(at(new THREE.Mesh(boxg(0.7, 0.18, 0.06), m), 0, 0.3, -0.72));
      G.add(g);
      return g;
    }
    const mySled = makeSled(PLAYER_COLORS[state.colorIdx].hex);
    const rider = new THREE.Group(); rider.position.set(0, 0.95, 0.25); mySled.add(rider);
    let riderKey = '';
    const BOTS = [{ name: 'Sledding Sue', col: '#ff7ac8', f: 0.97 }, { name: 'Downhill Dave', col: '#ffd23f', f: 1.0 }, { name: 'Avalanche Al', col: '#8bd450', f: 0.94 }].map((d, i) => {
      const sled = makeSled(d.col), r = buildAvatar(d.col, [1, 2, 0][i], [1, 2, 3][i], true, 1, 4);
      r.position.set(0, 0.95, 0.25); sled.add(r); sled.visible = false;
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 1.85; sled.add(tag);
      return Object.assign({ i, sled, s: START_S, lat: 0, v: 0, air: 0, airV: 0, done: 0, steer: 0, ice: -1, jump: -1, bonkT: 0, line: 0 }, d);
    });
    L.sledBots = BOTS;
    BOTLV.on(L);

    // ---------------------------------------------------------------- my sled and the race
    const K = { s: START_S, lat: 0, v: 0, air: 0, airV: 0, steer: 0, tuck: false, brake: 0, ice: -1, jump: -1, bonkT: 0, done: 0 };
    const RACE = { id: 0, st: 'idle', startAt: 0, botsOn: true, best: 0 };
    try { if (Number.isFinite(prefs.sledBest)) RACE.best = prefs.sledBest; } catch (e) { /* none */ }
    L.sled = K; L.sledRace = RACE;
    const laneLat = (k) => [-2.7, -0.9, 0.9, 2.7][k % 4];
    function racers() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); }
    function toGrid() {
      RIDE.on = false;
      const k = Math.max(0, racers().indexOf(state.myPeer));
      Object.assign(K, { s: START_S, lat: laneLat(k), v: 0, air: 0, airV: 0, steer: 0, ice: -1, jump: -1, done: 0 });
      const n = racers().length;
      BOTS.forEach((b, i) => Object.assign(b, { s: START_S - 3, lat: laneLat(n + i), v: 0, air: 0, airV: 0, done: 0, ice: -1, jump: -1, line: [-1.5, 0.5, 2][i] }));
      calibrated = false;
    }
    function startRace(fromPeer) {
      RACE.id = Math.floor(Date.now() / 1000); RACE.startAt = Date.now() + COUNT_MS; RACE.st = 'count';
      RACE.botsOn = racers().length < 4;
      toGrid(); state.hudDirty = true;
      showToast(fromPeer ? `${fromPeer} started a race! Get ready…` : 'Race! Get ready…'); sfx('whistle', 0.8);
      forcePresence();
    }
    L.startRace = startRace;
    const raceT = () => (RACE.st === 'idle' ? 0 : (Date.now() - RACE.startAt) / 1000);
    // one step of a sled: gravity down the slope, friction, air drag; steering, the banks, ice, jumps, snowmen
    function sledStep(o, dt, steer, tuck, brake, isMe) {
      const i = at_(o.s), slope = SLOPE[i];
      const drag = DRAG * (tuck ? 0.65 : 1);
      if (o.air <= 0) o.v += (GRAV * slope - MU * GRAV - drag * o.v * o.v - brake * 5) * dt;
      else o.v -= drag * o.v * o.v * dt;
      if (o.s > FINISH_S + 20) o.v -= 3 * dt;   // the run-out after the finish
      o.v = Math.max(0, o.v);
      o.s += o.v * dt;
      o.lat += steer * (1.4 + o.v * 0.22) * (tuck ? 0.55 : 1) * (o.air > 0 ? 0.3 : 1) * dt;
      if (Math.abs(o.lat) > HW - 0.4) { o.lat = Math.sign(o.lat) * (HW - 0.4); o.v *= Math.exp(-1.8 * dt); if (isMe && Math.random() < dt * 8) tone(180, 120, 0.08, 'sawtooth', 0.05); }
      // ice strips: a burst of speed
      ICE.forEach((b, k) => { if (o.ice !== k && o.air <= 0 && Math.abs(o.s - b.s) < b.len / 2 && Math.abs(o.lat - b.lat) < b.w / 2) { o.ice = k; o.v += 4; if (isMe) { sfx('whoosh', 0.9); spawnFloat('Zoom!', posAt(o.s + 4, o.lat, new V3()).add(new V3(0, 2, 0)), '#7ad8ff'); } } });
      // jumps
      JUMPS.forEach((j, k) => { if (o.jump !== k && o.s > j.s && o.s < j.s + 2) { o.jump = k; o.air = 0.01; o.airV = 2 + o.v * 0.28; if (isMe) { sfx('whoosh', 0.7); tone(300, 700, 0.3, 'triangle', 0.12); } } });
      if (o.air > 0) { o.air += o.airV * dt; o.airV -= GRAV * dt; if (o.air <= 0) { o.air = 0; if (isMe) { sfx('thump', 0.8); if (state.mode === 'vr') for (const sd of SIDES) haptic(vrHands[sd], 0.8, 90); } } }
      // snowmen
      if (o.air <= 0.5) for (const sm of SNOWMEN) if (Math.abs(o.s - sm.s) < 0.7 && Math.abs(o.lat - sm.lat) < 0.75 && performance.now() > o.bonkT) {
        o.bonkT = performance.now() + 900; o.v *= 0.4; o.lat += Math.sign(o.lat - sm.lat || 1) * 0.6;
        if (isMe) { showToast('Bonk! Snowman'); sfx('thump', 1); tone(200, 100, 0.2, 'square', 0.12); if (state.mode === 'vr') for (const sd of SIDES) haptic(vrHands[sd], 1, 150); }
        sm.g.rotation.z = (Math.random() - 0.5) * 0.6;
      }
      if (!o.done && o.s >= FINISH_S && RACE.st !== 'idle') { o.done = raceT(); if (isMe) finished(); }
    }
    function finished() {
      const t = K.done, place = standings().findIndex((r) => r.me) + 1;
      const isBest = !RACE.best || t < RACE.best;
      if (isBest) { RACE.best = Math.round(t * 10) / 10; prefs.sledBest = RACE.best; savePrefs(); }
      RECORDS.add(L, 'run', t);
      showToast(`Finished ${['1st', '2nd', '3rd', '4th', '5th', '6th'][place - 1] || ''} in ${t.toFixed(1)} s${isBest ? ' (your best!)' : ''}`);
      sfx(place === 1 ? 'fanfare' : 'chime', 1); setTimeout(() => sfx('cheer', 0.7), 250);
      forcePresence(); state.dirtyBoard = true;
    }
    function standings() {
      const rows = [{ name: state.name || 'You', me: true, s: K.s, done: K.done }];
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.tg && st.tg[0] === RACE.id) rows.push({ name: rec.name, s: st.tg[1] / 10, done: st.tg[3] / 10 }); }
      if (RACE.botsOn) for (const b of BOTS) rows.push({ name: b.name, bot: true, s: b.s, done: b.done });
      rows.sort((a, b) => (a.done && b.done ? a.done - b.done : a.done ? -1 : b.done ? 1 : b.s - a.s));
      return rows;
    }
    function botDrive(b, dt) {
      // follow its line down the run, swerving round snowmen ahead
      let want = b.line + Math.sin(b.s * 0.03 + b.i) * 1.2;
      for (const sm of SNOWMEN) if (sm.s > b.s && sm.s - b.s < 18 && Math.abs(sm.lat - want) < 1.3) want = sm.lat + (sm.lat > 0 ? -1.6 : 1.6);
      for (const ic of ICE) if (ic.s > b.s && ic.s - b.s < 25) want = ic.lat;
      b.steer = clamp((want - b.lat) * 0.9, -1, 1);
      sledStep(b, dt, b.steer, false, 0, false);
      b.v *= Math.pow(b.f * BOTLV.pick(L, [0.955, 1, 1.03]), dt * 0.6);   // (the Bots level: more drag on easy, less on hard)
    }

    // ---------------------------------------------------------------- input: lean in VR, keys in a browser
    let calibrated = false;
    const calib = { x: 0, z: 0, y: 0, yaw: 0 };
    const _e = new THREE.Euler();
    function calibrate() { calib.x = camera.position.x; calib.z = camera.position.z; calib.y = camera.position.y; _e.setFromQuaternion(camera.quaternion, 'YXZ'); calib.yaw = _e.y; calibrated = true; }
    function inputs() {
      let steer = 0, tuck = false, brake = 0, start = false, recenter = false;
      if (state.mode === 'vr') {
        if (!calibrated) calibrate();
        // lean: how far your head has moved sideways from where you sat down
        const dx = camera.position.x - calib.x, dz = camera.position.z - calib.z, c = Math.cos(calib.yaw), s = Math.sin(calib.yaw);
        const side = dx * c - dz * s;
        steer = clamp(side / 0.22, -1, 1);
        tuck = calib.y - camera.position.y > 0.22;
        for (const sd of SIDES) {
          const gp = vrHands[sd].source && vrHands[sd].source.gamepad;
          if (!gp) continue;
          const ax = gp.axes && gp.axes.length >= 4 ? gp.axes[2] : 0;
          if (Math.abs(ax) > Math.abs(steer) && Math.abs(ax) > 0.2) steer = ax;
          if (gp.buttons[0] && gp.buttons[0].value > 0.3) brake = Math.max(brake, gp.buttons[0].value);
          if (gp.buttons[4] && gp.buttons[4].pressed) start = true;
          if (gp.buttons[5] && gp.buttons[5].pressed) recenter = true;
        }
      } else if (state.mode === 'flat') {
        const k = state.keys;
        steer = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0) || (typeof stick !== 'undefined' ? stick.x : 0);
        tuck = !!(k.KeyW || k.ArrowUp); brake = (k.KeyS || k.ArrowDown) ? 1 : 0;
      }
      return { steer, tuck, brake, start, recenter };
    }
    let startHeld = false;

    // ---------------------------------------------------------------- per frame
    const _p = new V3(), _seat = new V3();
    const hud = makePlate(camera, 'Ready', 0.5, 0.09, new V3(0, -0.24, -0.6), 0, { bg: '#16142e', fg: '#ffffff', size: 0.55 });
    hud.material.depthTest = false; hud.renderOrder = 999; hud.visible = false;
    let hudKey = '', lastCount = 0;
    function placeSled(g, o) {
      posAt(o.s, o.lat, _p);
      const i = at_(o.s), yaw = yawAt(o.s);
      g.position.set(_p.x, _p.y + 0.04 + o.air, _p.z);
      g.rotation.set(Math.atan(SLOPE[i]) * 0.9 - (o.air > 0 ? o.airV * 0.03 : 0), yaw - (o.steer || 0) * 0.25, -(o.steer || 0) * 0.12, 'YXZ');
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      // join a race someone else started
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (here && rec.lv === L.idx && st && st.tg && st.tg[0] > RACE.id && st.tg[2] > Date.now() - 500) { RACE.id = st.tg[0]; RACE.startAt = st.tg[2]; RACE.st = 'count'; RACE.botsOn = racers().length < 4; toGrid(); showToast(`${rec.name} started a race! Get ready…`); } }
      if (RACE.st === 'count') {
        const left = RACE.startAt - Date.now(), n = Math.ceil(left / 1000);
        if (left <= 0) { RACE.st = 'run'; sfx('whistle', 1); showToast('GO!'); K.v = 2.5; for (const b of BOTS) b.v = 2.2; }
        else if (n !== lastCount) { lastCount = n; tone(660, 660, 0.15, 'square', 0.15); }
      }
      if (here) {
        const inp = inputs();
        if (inp.start && !startHeld && RACE.st !== 'count' && RACE.st !== 'run') startRace();
        startHeld = inp.start;
        if (inp.recenter) calibrate();
        K.steer += (inp.steer - K.steer) * Math.min(1, dt * 8); K.tuck = inp.tuck; K.brake = inp.brake;
        const going = RACE.st === 'run' || RACE.st === 'over';
        const steps = Math.max(1, Math.ceil(dt / 0.02));
        for (let k = 0; k < steps; k++) {
          if (going) sledStep(K, dt / steps, K.steer, K.tuck, K.brake, true);
          if (RACE.st === 'run' && RACE.botsOn) for (const b of BOTS) botDrive(b, dt / steps);
        }
        if (RACE.st === 'run' && K.done && (!RACE.botsOn || BOTS.every((b) => b.done)) && K.v < 0.3) RACE.st = 'over';
        // sliding sound
        if (snd.ctx && Math.random() < dt * Math.min(12, K.v)) tone(2000 + Math.random() * 1500, 0, 0.03, 'sine', 0.008 * Math.min(1, K.v / 8));
      }
      placeSled(mySled, K);
      mySled.visible = here;
      const rkey = `${state.colorIdx}|${state.hat}|${state.face}|${state.mode}`;
      if (rkey !== riderKey) { riderKey = rkey; rider.clear(); if (state.mode !== 'vr') rider.add(buildAvatar(PLAYER_COLORS[state.colorIdx].hex, state.hat, state.face, true)); }
      rider.position.y = K.tuck ? 0.75 : 0.95;
      for (const b of BOTS) { b.sled.visible = here && RACE.botsOn && RACE.st !== 'idle'; if (b.sled.visible) placeSled(b.sled, b); }
      // VR: you sit on the sled
      if (here && state.mode === 'vr') {
        if (!calibrated) calibrate();
        rideStep(dt, yawAt(K.s), mySled.position.y);
        _seat.set(0, 0.75, 0.25).applyAxisAngle(UP, RIDE.yaw).add(mySled.position);
        const ry = RIDE.yaw - calib.yaw;
        dolly.rotation.set(0, ry, 0);
        const off = new V3(calib.x, 0, calib.z).applyAxisAngle(UP, ry);
        dolly.position.set(_seat.x - off.x, RIDE.y + 1.1 - calib.y, _seat.z - off.z);
      }
      // others' sleds
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id], show = here && inMyLevel(rec) && st && st.tg;
        if (!show) { if (rec.sled) rec.sled.visible = false; continue; }
        if (!rec.sled) rec.sled = makeSled(PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '#ffffff');
        rec.sled.visible = true;
        placeSled(rec.sled, { s: st.tg[1] / 10, lat: st.tg[4] / 100, air: st.tg[5] / 100, steer: 0, airV: 0 });
      }
      if (here) {
        const t = raceT(), rows = standings(), place = rows.findIndex((r) => r.me) + 1;
        const txt = RACE.st === 'count' ? `Get ready… ${Math.max(1, Math.ceil((RACE.startAt - Date.now()) / 1000))}` : RACE.st === 'run' || RACE.st === 'over' ? `${K.done ? `Done ${K.done.toFixed(1)} s` : `${t.toFixed(1)} s`}  ·  ${place}/${rows.length}  ·  ${Math.round(K.v * 3.6)} km/h` : `Practice run  ·  ${Math.round(K.v * 3.6)} km/h  ·  best ${RACE.best ? RACE.best.toFixed(1) + ' s' : '-'}`;
        if (state.mode === 'vr') { hud.visible = true; if (txt !== hudKey) { hudKey = txt; hud.userData.draw(txt); } }
        else { hud.visible = false; if (ui.status) { ui.status.hidden = false; if (ui.status.textContent !== txt) ui.status.textContent = txt; } }
      } else hud.visible = false;
    };
    // browser: a chase camera behind the sled
    let chase = null;
    L.flatCamera = (dt) => {
      rideStep(dt, yawAt(K.s), mySled.position.y);
      const fx = -Math.sin(RIDE.yaw), fz = -Math.cos(RIDE.yaw);
      const want = new V3(mySled.position.x - fx * 6.5, RIDE.y + 3.1, mySled.position.z - fz * 6.5);
      if (!chase || chase.distanceTo(want) > 20) chase = want.clone();
      chase.lerp(want, Math.min(1, dt * 4));
      dolly.rotation.set(0, 0, 0); dolly.position.set(chase.x, chase.y - 1.6, chase.z);
      camera.position.set(0, 1.6, 0);
      camera.lookAt(mySled.position.x + fx * 6, RIDE.y + 0.6, mySled.position.z + fz * 6);
      return true;
    };
    L.publishPose = () => {
      if (state.mode === 'vr') return null;
      const q = new Q4().setFromEuler(new THREE.Euler(0, mySled.rotation.y, 0));
      const head = new V3(0, 0.95 + 0.3, 0.25).applyQuaternion(q).add(mySled.position);
      return { h: [head, q], l: [head.clone().add(new V3(-0.2, -0.4, 0)), q], r: [head.clone().add(new V3(0.2, -0.4, 0)), q] };
    };
    L.presence = () => ({ tg: [RACE.id, Math.round(K.s * 10), RACE.startAt, Math.round(K.done * 10), Math.round(K.lat * 100), Math.round(K.air * 100), Math.round(RACE.best * 10)] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.tg;
      if (!Array.isArray(a) || a.length !== 7 || !a.every((x) => typeof x === 'number' && Number.isFinite(x))) { st.tg = null; return; }
      if (!st.tg || st.tg[3] !== a[3] || st.tg[6] !== a[6]) state.dirtyBoard = true;
      st.tg = a;
    };
    L.rowFor = (st, isMe) => { const best = isMe ? RACE.best : st.tg ? st.tg[6] / 10 : 0; return { best: best || 1e9, text: best ? `best ${best.toFixed(1)} s` : 'no run yet' }; };
    L.sortRows = (a, b) => (a.best || 1e9) - (b.best || 1e9);
    {
      const p0 = posAt(START_S, 0, new V3());
      L.board = makeBoard(G, 720, 460, 3, 1.92, p0.x + 7, p0.y + 2.2, p0.z + 4, -Math.PI / 2 + 0.3);
      makeKiosk(L, p0.x - 6, p0.z + 3, Math.PI / 2);
    }
    RECORDS.def(L, [{ k: 'run', label: 'Fastest run, top to bottom', low: true, fmt: 'time' }]);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#16142e'; g.fillRect(0, 0, W, 460);
      g.strokeStyle = '#7ad8ff'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#7ad8ff'; g.font = `800 56px ${DISPLAY}`; g.fillText('Toboggan Run', 36, 80);
      g.fillStyle = '#c8d8e8'; g.font = `400 24px ${BODY}`; g.fillText('Fastest runs top to bottom', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => (RACE.st === 'count' || RACE.st === 'run' ? 'Restart race' : 'Start race'), run: () => startRace() }, { label: () => 'Back to the top', run: () => { RACE.st = 'idle'; toGrid(); } }];
    L.hints = [['Lean', 'steer'], ['Crouch', 'tuck for speed'], ['Trigger', 'brake'], ['A', 'start a race'], ['B', 'recentre']];
    L.hintsFor = () => (state.mode === 'flat' ? [['A / D', 'steer'], ['W', 'tuck (faster)'], ['S', 'brake'], ['Start race', 'top right']] : L.hints);
    L.clampPlayer = () => [0, 0];
    L.spawn = () => { toGrid(); chase = null; RIDE.on = false; };
    L.onEnter = () => { RACE.st = 'idle'; toGrid(); calibrated = false; RIDE.on = false; };
    L.onExit = () => { hud.visible = false; dolly.rotation.set(0, 0, 0); dolly.position.y = 0; if (ui.status) ui.status.hidden = true; for (const rec of remotes.values()) if (rec.sled) rec.sled.visible = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : now * 0.00004; const p = posAt(60 + (a * 400) % 200, 0, new V3()); camera.position.set(p.x + 12, p.y + 8, p.z + 14); camera.lookAt(p); };
    L.sledInternals = { K, RACE, BOTS, sledStep, botDrive, startRace, toGrid, standings, posAt, SNOWMEN, ICE, JUMPS, FINISH_S, START_S };
    MUSIC_THEMES.toboggan = { gain: 0.8, bpm: 132, swing: 0.05, chords: ['D', 'G', 'A', 'D'], comp: { inst: 'vibes', at: [0, 4, 8, 12], dur: 0.2 }, bass: { at: [0, 8, 10] }, drums: { k: 'x...x...x...x...', sh: '-.-.-.-.-.-.-.-.' }, lead: { inst: 'musicbox', p: 0.3, up: 12 }, cut: 5000 };
    ENDGAME.on(L, { shared: true, active: () => RACE.st === 'count' || RACE.st === 'run', end: () => { RACE.st = 'idle'; toGrid(); state.dirtyBoard = true; forcePresence(); return 'Start a race when everyone’s ready.'; } });
    return L;
  })();
