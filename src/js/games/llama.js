  // ================================================================ LEVEL: LLAMA DERBY
  // Two laps round a ranch track on the back of a llama. Shake the reins (giddy-up!) to go faster, jump the hay
  // bales, grab carrots for a burst of speed and keep out of the mud. Three bot llamas race too; friends race
  // alongside (each page runs its own llama).
  // VR: shake both hands up and down like reins, lean or use the stick to steer, A or X (or both hands flung up)
  // to jump. Browser: tap Space (or click) to giddy-up, A/D steer, J jumps.
  const llama = (() => {
    const L = newLevel(40);
    const G = L.group;
    const rand = mulberry32(4040);
    L.grabless = true;
    L.noLocomotion = true;
    L.env = {
      sky: skyTexture([[0, '#4a90e0'], [0.5, '#a8d4f4'], [1, '#f4f0d8']]),
      bg: 0xa8d4f4, fog: [0xc8e0f0, 80, 260], hemi: [0xffffff, 0x7a9a4a, 0.85],
      sun: [0xfff4e0, 0.9], sunDir: new V3(0.4, 1, 0.3), ambient: [0x8a9a8a, 0.35], sprite: null,
    };
    const HW = 3.6, LAPS = 2, COUNT_MS = 3500, VMAX = 12.5;

    // ---------------------------------------------------------------- the track: a loop round the ranch
    const CTRL = [[0, 0, 0], [28, 0, -6], [52, 0, -30], [50, 0, -66], [24, 0, -88], [-8, 0, -84], [-24, 0, -62], [-12, 0, -40], [-38, 0, -22], [-30, 0, 4]];
    const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, y, z]) => new V3(x, y, z)), true, 'centripetal');
    const N = 1200;
    const P = curve.getSpacedPoints(N); P.pop();
    const TLEN = curve.getLength(), DS = TLEN / N;
    const T = P.map((p, i) => new V3().subVectors(P[(i + 1) % N], P[(i - 1 + N) % N]).setY(0).normalize());
    const NR = T.map((t) => new V3(-t.z, 0, t.x));
    const FINISH = LAPS * TLEN;
    const idx = (s) => ((Math.floor(s / DS) % N) + N) % N;
    function posAt(s, lat, out) {
      const i = idx(s), u = clamp(s / DS - Math.floor(s / DS), 0, 1), a = P[i], b = P[(i + 1) % N], na = NR[i], nb = NR[(i + 1) % N];
      // (the sideways direction is blended too, so nothing off the centre line jumps from one point to the next)
      const nx = na.x + (nb.x - na.x) * u, nz = na.z + (nb.z - na.z) * u;
      out.set(a.x + (b.x - a.x) * u + nx * lat, 0, a.z + (b.z - a.z) * u + nz * lat);
      return out;
    }
    const yawAt = (s) => { const i = idx(s), u = clamp(s / DS - Math.floor(s / DS), 0, 1), a = T[i], b = T[(i + 1) % N]; return Math.atan2(-(a.x + (b.x - a.x) * u), -(a.z + (b.z - a.z) * u)); };
    // what you ride with: a heading and a height that change smoothly (no bobbing with the gallop), so the view never shakes
    const RIDE = { yaw: 0, y: 0, on: false };
    function rideStep(dt, yaw, y) {
      if (!RIDE.on) { RIDE.yaw = yaw; RIDE.y = y; RIDE.on = true; }
      let d = yaw - RIDE.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      RIDE.yaw += d * Math.min(1, dt * 3); RIDE.y += (y - RIDE.y) * Math.min(1, dt * 4);
    }
    L.track = { P, TLEN, posAt };
    // grass, the dirt track, fences
    const grassTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#6aa848'; g.fillRect(0, 0, 128, 128); for (let k = 0; k < 400; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(60,120,40,0.5)' : 'rgba(140,190,90,0.5)'; g.fillRect(rand() * 128, rand() * 128, 2, 4); } });
    grassTex.tex.wrapS = grassTex.tex.wrapT = THREE.RepeatWrapping; grassTex.tex.repeat.set(60, 60);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ map: grassTex.tex })); grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.02, -40); G.add(grass);
    function ribbon(l0, l1, y, mat, vScale) {
      const pos = [], uv = [], ix = [];
      for (let i = 0; i <= N; i++) {
        const p = P[i % N], n = NR[i % N];
        pos.push(p.x + n.x * l0, y, p.z + n.z * l0, p.x + n.x * l1, y, p.z + n.z * l1);
        uv.push(0, (i * DS) / vScale, 1, (i * DS) / vScale);
        if (i < N) { const a = i * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(ix); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat); G.add(m); return m;
    }
    const dirtTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#b08858'; g.fillRect(0, 0, 128, 128); for (let k = 0; k < 300; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(120,80,40,0.35)' : 'rgba(210,180,130,0.35)'; g.beginPath(); g.ellipse(rand() * 128, rand() * 128, 2 + rand() * 3, 1 + rand() * 2, rand() * 3, 0, Math.PI * 2); g.fill(); } });
    dirtTex.tex.wrapS = dirtTex.tex.wrapT = THREE.RepeatWrapping;
    ribbon(-HW, HW, 0.01, new THREE.MeshLambertMaterial({ map: dirtTex.tex, side: THREE.DoubleSide }), 8);
    {
      const n = Math.floor(TLEN / 3) * 2, posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), lam(0xf4f2ec), n), rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.08, 3.05), lam(0xf4f2ec), n * 2);
      const m4 = new THREE.Matrix4(), q = new Q4(), sc = new V3(1, 1, 1), p = new V3();
      let k = 0, r = 0;
      for (let s = 0; s < TLEN - 1 && k < n - 1; s += 3) for (const sx of [-1, 1]) {
        posAt(s, sx * (HW + 0.4), p); m4.compose(new V3(p.x, 0.5, p.z), q, sc); posts.setMatrixAt(k++, m4);
        posAt(s + 1.5, sx * (HW + 0.4), p); q.setFromAxisAngle(UP, yawAt(s + 1.5));
        for (const y of [0.55, 0.9]) { m4.compose(new V3(p.x, y, p.z), q, sc); rails.setMatrixAt(r++, m4); }
        q.identity();
      }
      posts.count = k; rails.count = r; posts.frustumCulled = rails.frustumCulled = false; G.add(posts, rails);
    }
    // the barn, a windmill, trees and hills
    {
      addBox(G, 12, 6, 9, lam(0xb83a2a), -60, 3, -40); const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.8, 3.5, 4, 1), lam(0x5a3a2a)); roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 0.95); roof.position.set(-60, 7.7, -40); G.add(roof);
      addBox(G, 3.4, 4, 0.1, lam(0xf4f2ec), -53.95, 2, -40).rotation.y = Math.PI / 2;
      addCyl(G, 0.3, 0.5, 12, 8, lam(0xd8d0c0), 75, 6, -50);
      const blades = new THREE.Group(); blades.position.set(75, 12, -49.4); G.add(blades); L.windmill = blades;
      for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(boxg(0.5, 4, 0.05), lam(0xf4f2ec)); b.position.y = 2; const h = new THREE.Group(); h.rotation.z = k * Math.PI / 2; h.add(b); blades.add(h); }
      for (let k = 0; k < 40; k++) {
        const a = rand() * Math.PI * 2, d = 90 + rand() * 60, x = Math.cos(a) * d, z = -40 + Math.sin(a) * d * 0.8;
        addCyl(G, 0.3, 0.4, 3, 6, lam(0x6a4a2a), x, 1.5, z);
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4 + rand(), 0), lam([0x3a7a3a, 0x4a8a3a, 0x5a9a4a][k % 3])); c.position.set(x, 4.5, z); G.add(c);
      }
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, d = 220, s = 30 + rand() * 30; const h = new THREE.Mesh(sph(s, 12, 8), lam(0x7ab85a)); h.scale.y = 0.4; h.position.set(Math.cos(a) * d, -2, -40 + Math.sin(a) * d); G.add(h); }
      // bleachers by the start
      const p0 = posAt(4, HW + 4, new V3());
      for (let r = 0; r < 4; r++) addBox(G, 10, 0.3, 0.9, lam(0x8a6a4a), p0.x, 0.4 + r * 0.45, p0.z + r * 0.9);
    }
    // ---------------------------------------------------------------- on the track: hay bales, carrots, mud
    const BALES = [0.17, 0.43, 0.68, 0.9].map((f) => ({ s: f * TLEN }));
    const baleMat = canvasTexture(64, 64, (g) => { g.fillStyle = '#e8c860'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(160,120,40,0.6)'; for (let k = 0; k < 20; k++) { g.beginPath(); const x = rand() * 64; g.moveTo(x, 0); g.lineTo(x + (rand() - 0.5) * 10, 64); g.stroke(); } g.fillStyle = '#8a5a2a'; g.fillRect(0, 20, 64, 3); g.fillRect(0, 42, 64, 3); });
    for (const b of BALES) {
      const p = posAt(b.s, 0, new V3()), g = new THREE.Group();
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(boxg(1.7, 0.5, 0.55), new THREE.MeshLambertMaterial({ map: baleMat.tex })); m.position.set(-HW + 0.9 + k * 1.8, 0.25, 0); g.add(m); }
      g.position.set(p.x, 0, p.z); g.rotation.y = yawAt(b.s); G.add(g);
    }
    const MUD = [[0.08, 1.4], [0.3, -1.6], [0.55, 0.6], [0.62, -1.8], [0.8, 1.8]].map(([f, lat]) => ({ s: f * TLEN, lat, r: 1.5 }));
    for (const m of MUD) { const p = posAt(m.s, m.lat, new V3()); const d = new THREE.Mesh(new THREE.CircleGeometry(1, 20), lam(0x5a3a1a)); d.rotation.x = -Math.PI / 2; d.scale.set(m.r, m.r * 1.6, 1); d.position.set(p.x, 0.02, p.z); d.rotation.z = -yawAt(m.s); G.add(d); }
    const CARROTS = [[0.12, -2.0], [0.24, 2.2], [0.36, 0], [0.5, -2.2], [0.6, 2.0], [0.75, 0], [0.85, -1.6], [0.95, 1.6]].map(([f, lat], i) => ({ i, s: f * TLEN, lat }));
    const carrotMeshes = CARROTS.map((c) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 10), lam(0xf5821f)); body.rotation.x = Math.PI; g.add(body);
      for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 5), lam(0x4a9a3a)); l.position.set((k - 1) * 0.04, 0.35, 0); l.rotation.z = (k - 1) * 0.4; g.add(l); }
      const p = posAt(c.s, c.lat, new V3()); g.position.set(p.x, 0.9, p.z); G.add(g);
      return g;
    });
    // start/finish arch
    {
      const p = posAt(0, 0, new V3()), yaw = yawAt(0);
      for (const sx of [-1, 1]) { const q = posAt(0, sx * (HW + 0.7), new V3()); addCyl(G, 0.12, 0.12, 4, 8, lam(0x6a4a2a), q.x, 2, q.z); }
      makePlate(G, 'START  ·  FINISH', HW * 2 + 1.6, 0.8, new V3(p.x, 3.8, p.z), yaw, { bg: '#ffd23f', fg: '#3a2a1a', size: 0.6 });
      const chk = canvasTexture(64, 16, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 4, y * 4, 4, 4); } });
      const line = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 0.6), new THREE.MeshLambertMaterial({ map: chk.tex })); line.rotation.x = -Math.PI / 2; line.rotation.z = -yaw; line.position.set(p.x, 0.02, p.z); G.add(line);
    }

    // ---------------------------------------------------------------- llamas
    function makeLlama(col) {
      const g = new THREE.Group(), fur = lam(new THREE.Color(col).getHex()), dark = lam(0x3a2a1a);
      const body = new THREE.Mesh(sph(0.45, 14, 10), fur); body.scale.set(0.75, 0.75, 1.35); body.position.y = 1.15; g.add(body);
      const neck = new THREE.Mesh(cyl(0.14, 0.18, 0.9, 10), fur); neck.position.set(0, 1.65, -0.5); neck.rotation.x = -0.25; g.add(neck);
      const head = new THREE.Group(); head.position.set(0, 2.1, -0.62); g.add(head);
      const skull = new THREE.Mesh(sph(0.16, 12, 10), fur); skull.scale.set(0.9, 1, 1.2); head.add(skull);
      const snout = new THREE.Mesh(sph(0.1, 10, 8), lam(0xf4e8d8)); snout.position.set(0, -0.05, -0.17); head.add(snout);
      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 6), fur); ear.position.set(sx * 0.08, 0.2, 0.02); ear.rotation.z = -sx * 0.2; head.add(ear);
        const eye = new THREE.Mesh(sph(0.025, 6, 5), lam(0x111111)); eye.position.set(sx * 0.09, 0.04, -0.12); head.add(eye);
      }
      const legs = [];
      for (const [x, z] of [[-0.2, -0.38], [0.2, -0.38], [-0.2, 0.4], [0.2, 0.4]]) { const lg = new THREE.Group(); lg.position.set(x, 0.95, z); const m = new THREE.Mesh(cyl(0.06, 0.05, 0.95, 6), fur); m.position.y = -0.47; lg.add(m); const hoof = new THREE.Mesh(cyl(0.06, 0.06, 0.06, 6), dark); hoof.position.y = -0.93; lg.add(hoof); g.add(lg); legs.push(lg); }
      const tail = new THREE.Mesh(sph(0.1, 8, 6), fur); tail.position.set(0, 1.3, 0.62); g.add(tail);
      // a saddle blanket in bright stripes, and reins
      const blanket = new THREE.Mesh(boxg(0.72, 0.04, 0.6), lam(0xe5453a)); blanket.position.set(0, 1.47, 0.0); g.add(blanket);
      const stripe = new THREE.Mesh(boxg(0.74, 0.045, 0.12), lam(0xffd23f)); stripe.position.set(0, 1.47, 0.0); g.add(stripe);
      G.add(g);
      return { g, legs, head, body };
    }
    const LLAMA_COLS = ['#f4ecdc', '#c8a070', '#8a6a4a', '#f0d8c0', '#d8d0c8'];
    const mine = makeLlama(LLAMA_COLS[0]);
    const rider = new THREE.Group(); rider.position.set(0, 2.1, 0.05); mine.g.add(rider);
    let riderKey = '';
    const BOTS = [{ name: 'Dolly Llama', col: '#c8a070', top: 9.2 }, { name: 'Fuzzy Fern', col: '#8a6a4a', top: 9.6 }, { name: 'Spitting Sid', col: '#f0d8c0', top: 8.8 }].map((d, i) => {
      const m = makeLlama(d.col), r = buildAvatar(['#ff7ac8', '#4fc3f7', '#8bd450'][i], [2, 1, 3][i], i + 1, true, 1, 4);
      r.position.set(0, 2.1, 0.05); m.g.add(r); m.g.visible = false;
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(1, 0.25, 1); tag.position.y = 2.9; m.g.add(tag);
      return Object.assign({ i, m, s: 0, lat: 0, v: 0, air: 0, airV: 0, done: 0, steer: 0, stumble: 0, gait: 0, carrots: [], boost: 0, line: 0, late: false }, d);
    });
    L.llamaBots = BOTS;
    BOTLV.on(L);

    // ---------------------------------------------------------------- my llama and the race
    const K = { s: 0, lat: 0, v: 0, air: 0, airV: 0, steer: 0, done: 0, stumble: 0, gait: 0, carrots: [], boost: 0, giddy: 0 };
    const RACE = { id: 0, st: 'idle', startAt: 0, botsOn: true, best: 0 };
    try { if (Number.isFinite(prefs.llamaBest)) RACE.best = prefs.llamaBest; } catch (e) { /* none */ }
    L.ll = K; L.llRace = RACE;
    const laneLat = (k) => [-2.4, -0.8, 0.8, 2.4][k % 4];
    function racers() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); }
    function toGrid() {
      RIDE.on = false;
      const k = Math.max(0, racers().indexOf(state.myPeer));
      Object.assign(K, { s: -2, lat: laneLat(k), v: 0, air: 0, airV: 0, steer: 0, done: 0, stumble: 0, carrots: [], boost: 0 });
      const n = racers().length;
      BOTS.forEach((b, i) => Object.assign(b, { s: -4, lat: laneLat(n + i), v: 0, air: 0, airV: 0, done: 0, stumble: 0, carrots: [], boost: 0, line: [-1.6, 0.4, 1.8][i] }));
      calibrated = false;
    }
    function startRace(fromPeer) {
      RACE.id = Math.floor(Date.now() / 1000); RACE.startAt = Date.now() + COUNT_MS; RACE.st = 'count';
      RACE.botsOn = racers().length < 4;
      toGrid(); state.hudDirty = true;
      showToast(fromPeer ? `${fromPeer} started a race! Get ready…` : 'To your marks… shake those reins!'); sfx('whistle', 0.8);
      forcePresence();
    }
    L.startRace = startRace;
    const raceT = () => (RACE.st === 'idle' ? 0 : (Date.now() - RACE.startAt) / 1000);
    // giddy-up: a burst of speed, less the faster you're already going
    function giddy(o, amount) { if (o.stumble > 0) return; o.v += amount * Math.max(0, 1 - o.v / VMAX); }
    function jump(o, isMe) {
      if (o.air > 0 || o.stumble > 0) return;
      o.air = 0.001; o.airV = 3.4;
      if (isMe) { sfx('whoosh', 0.6); tone(400, 800, 0.2, 'triangle', 0.1); }
    }
    L.llJump = () => jump(K, true);
    function llamaStep(o, dt, steer, isMe) {
      // a little drag, more when you're fast; mud slows you a lot
      o.v -= (0.35 + 0.012 * o.v * o.v) * dt;
      for (const m of MUD) { const ds = Math.abs(((o.s % TLEN) + TLEN) % TLEN - m.s); if (o.air <= 0 && ds < m.r * 1.6 && Math.abs(o.lat - m.lat) < m.r) { o.v *= Math.exp(-1.6 * dt); if (isMe && Math.random() < dt * 4) tone(120, 80, 0.1, 'sine', 0.08); } }
      if (o.boost > 0) { o.boost -= dt; o.v += 3 * dt; }
      if (o.s > FINISH + 10) o.v -= 2.5 * dt;
      o.v = clamp(o.v, 0, VMAX + 2);
      o.stumble = Math.max(0, o.stumble - dt);
      o.s += o.v * dt;
      o.lat += steer * (2.2 + o.v * 0.12) * (o.air > 0 ? 0.4 : 1) * dt;
      if (Math.abs(o.lat) > HW - 0.5) { o.lat = Math.sign(o.lat) * (HW - 0.5); o.v *= Math.exp(-0.8 * dt); }
      if (o.air > 0) { o.air += o.airV * dt; o.airV -= 9.8 * dt; if (o.air <= 0) { o.air = 0; if (isMe) { sfx('thump', 0.6); if (state.mode === 'vr') for (const sd of SIDES) haptic(vrHands[sd], 0.6, 70); } } }
      // hay bales: jump them, or stumble into them
      const sl = ((o.s % TLEN) + TLEN) % TLEN;
      for (const b of BALES) if (Math.abs(sl - b.s) < 0.45 && o.air < 0.25 && o.stumble <= 0) {
        o.stumble = 1.0; o.v *= 0.3; o.s = Math.floor(o.s / TLEN) * TLEN + b.s - 0.5 * Math.sign(o.v || 1);
        if (isMe) { showToast('Oof! Jump the hay bales'); sfx('thump', 1); tone(200, 90, 0.25, 'square', 0.1); if (state.mode === 'vr') for (const sd of SIDES) haptic(vrHands[sd], 1, 150); }
      }
      // carrots: one each per lap
      const lap = Math.floor(o.s / TLEN);
      for (const c of CARROTS) { const key = lap * 100 + c.i; if (!o.carrots.includes(key) && Math.abs(sl - c.s) < 0.9 && Math.abs(o.lat - c.lat) < 0.8) { o.carrots.push(key); o.boost = 1.2; if (isMe) { sfx('coin', 0.8); spawnFloat('Carrot!', posAt(o.s + 3, o.lat, new V3()).add(new V3(0, 2.6, 0)), '#f5821f'); } } }
      if (!o.done && o.s >= FINISH && RACE.st !== 'idle') { o.done = raceT(); if (isMe) finished(); }
      o.gait += o.v * dt * 1.4;
    }
    function finished() {
      const t = K.done, place = standings().findIndex((r) => r.me) + 1;
      const isBest = !RACE.best || t < RACE.best;
      if (isBest) { RACE.best = Math.round(t * 10) / 10; prefs.llamaBest = RACE.best; savePrefs(); }
      RECORDS.add(L, 'race', t);
      showToast(`Finished ${['1st', '2nd', '3rd', '4th', '5th', '6th'][place - 1] || ''} in ${t.toFixed(1)} s${isBest ? ' (your best!)' : ''}`);
      sfx(place === 1 ? 'fanfare' : 'chime', 1); setTimeout(() => sfx('cheer', 0.7), 250);
      forcePresence(); state.dirtyBoard = true;
    }
    function standings() {
      const rows = [{ name: state.name || 'You', me: true, s: K.s, done: K.done }];
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.ll && st.ll[0] === RACE.id) rows.push({ name: rec.name, s: st.ll[1] / 10, done: st.ll[3] / 10 }); }
      if (RACE.botsOn) for (const b of BOTS) rows.push({ name: b.name, bot: true, s: b.s, done: b.done });
      rows.sort((a, b) => (a.done && b.done ? a.done - b.done : a.done ? -1 : b.done ? 1 : b.s - a.s));
      return rows;
    }
    L.standings = standings;
    function botRide(b, dt) {
      // keep giddying up toward its top speed; jump bales (now and then a bit late); steer for carrots, round mud
      const lv = BOTLV.get(L), top = b.top * [0.88, 1, 1.08][lv];   // (the Bots level: their top speed, and how often they're late for a bale)
      if (b.v < top && rand() < dt * [4, 5, 7][lv]) giddy(b, 1.5);
      const sl = ((b.s % TLEN) + TLEN) % TLEN;
      for (const bl of BALES) { const ahead = bl.s - sl; if (ahead > 0 && ahead < (b.late ? 0.3 : Math.max(0.9, b.v * 0.3))) { jump(b, false); b.late = rand() < [0.25, 0.12, 0.04][lv]; } }
      let want = b.line;
      for (const c of CARROTS) { const ahead = c.s - sl; if (ahead > 0 && ahead < 20) { want = c.lat; break; } }
      for (const m of MUD) { const ahead = m.s - sl; if (ahead > -2 && ahead < 14 && Math.abs(want - m.lat) < m.r + 0.4) want = m.lat + (m.lat > 0 ? -m.r - 0.6 : m.r + 0.6); }
      b.steer = clamp((want - b.lat) * 1.2, -1, 1);
      llamaStep(b, dt, b.steer, false);
    }

    // ---------------------------------------------------------------- input: reins in VR, keys in a browser
    let calibrated = false;
    const calib = { x: 0, z: 0, y: 0, yaw: 0 };
    const _e = new THREE.Euler();
    function calibrate() { calib.x = camera.position.x; calib.z = camera.position.z; calib.y = camera.position.y; _e.setFromQuaternion(camera.quaternion, 'YXZ'); calib.yaw = _e.y; calibrated = true; }
    const prevH = { left: new V3(), right: new V3() }, shake = { e: 0, up: 0 };
    function inputs(dt) {
      let steer = 0, jumpNow = false, start = false, recenter = false, push = 0;
      if (state.mode === 'vr') {
        if (!calibrated) calibrate();
        const dx = camera.position.x - calib.x, dz = camera.position.z - calib.z, c = Math.cos(calib.yaw), s = Math.sin(calib.yaw);
        steer = clamp((dx * c - dz * s) / 0.22, -1, 1);
        // the reins: how hard both hands are shaking up and down
        let vy = 0, n = 0, upBoth = 0;
        for (const sd of SIDES) { const h = myHands[sd]; if (!h.ok) continue; const v = (h.pos.y - prevH[sd].y) / Math.max(dt, 1e-3); prevH[sd].copy(h.pos); vy += Math.abs(v); n++; if (v > 2.2 && h.pos.y > myHead.pos.y - 0.1) upBoth++; }
        const e = n ? vy / n : 0;
        shake.e += (e - shake.e) * Math.min(1, dt * 6);
        push = clamp((shake.e - 0.5) / 1.6, 0, 1);
        if (upBoth >= 2) jumpNow = true;
        for (const sd of SIDES) {
          const gp = vrHands[sd].source && vrHands[sd].source.gamepad;
          if (!gp) continue;
          const ax = gp.axes && gp.axes.length >= 4 ? gp.axes[2] : 0;
          if (Math.abs(ax) > Math.abs(steer) && Math.abs(ax) > 0.2) steer = ax;
          if (gp.buttons[4] && gp.buttons[4].pressed) { if (RACE.st === 'run') jumpNow = true; else start = true; }
          if (gp.buttons[5] && gp.buttons[5].pressed) recenter = true;
        }
      } else if (state.mode === 'flat') {
        const k = state.keys;
        steer = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0) || (typeof stick !== 'undefined' ? stick.x : 0);
      }
      return { steer, jumpNow, start, recenter, push };
    }
    let startHeld = false;
    // browser: each tap of Space (or a click) is a flick of the reins; W does it too
    function flatGiddy() {
      if (RACE.st === 'idle' || RACE.st === 'over') { if (RACE.st === 'idle' || K.done) { startRace(); return; } }
      if (RACE.st !== 'run' && !(RACE.st === 'over')) return;
      const now = performance.now();
      const quick = now - K.giddy < 140;
      K.giddy = now;
      giddy(K, quick ? 0.6 : 1.4);
      if (Math.random() < 0.35) tone(700 + Math.random() * 200, 500, 0.06, 'triangle', 0.05);
    }
    L.deskFire = () => flatGiddy();
    L.onKey = (code) => {
      if (code === 'KeyJ') { if (RACE.st === 'run' || RACE.st === 'over') jump(K, true); return true; }
      if (code === 'KeyW' || code === 'ArrowUp') { flatGiddy(); return true; }
      return false;
    };
    L.throwLabel = () => (RACE.st === 'run' ? 'Giddy-up!' : 'Start');

    // ---------------------------------------------------------------- per frame
    const _p = new V3(), _seat = new V3();
    const hud = makePlate(camera, 'Ready', 0.5, 0.09, new V3(0, -0.24, -0.6), 0, { bg: '#2a1a0e', fg: '#ffffff', size: 0.55 });
    hud.material.depthTest = false; hud.renderOrder = 999; hud.visible = false;
    let hudKey = '', lastCount = 0;
    function placeLlama(m, o, now) {
      posAt(o.s, o.lat, _p);
      const yaw = yawAt(o.s);
      const bob = o.air > 0 ? o.air : Math.abs(Math.sin(o.gait * 2)) * 0.08 * Math.min(1, o.v / 4);
      m.g.position.set(_p.x, bob, _p.z);
      m.g.rotation.set(o.stumble > 0 ? Math.sin(o.stumble * 12) * 0.12 : (o.air > 0 ? -o.airV * 0.04 : 0), yaw - (o.steer || 0) * 0.2, -(o.steer || 0) * 0.08, 'YXZ');
      const run = Math.min(1, o.v / 3);
      m.legs.forEach((lg, k) => { lg.rotation.x = o.air > 0 ? (k < 2 ? -0.7 : 0.7) : Math.sin(o.gait * 2 + (k === 0 || k === 3 ? 0 : Math.PI)) * 0.6 * run; });
      m.head.rotation.x = Math.sin(o.gait * 2) * 0.1 * run;
      void now;
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (L.windmill) L.windmill.rotation.z += dt * 0.6;
      // join a race someone else started
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (here && rec.lv === L.idx && st && st.ll && st.ll[0] > RACE.id && st.ll[2] > Date.now() - 500) { RACE.id = st.ll[0]; RACE.startAt = st.ll[2]; RACE.st = 'count'; RACE.botsOn = racers().length < 4; toGrid(); showToast(`${rec.name} started a race! Get ready…`); } }
      if (RACE.st === 'count') {
        const left = RACE.startAt - Date.now(), n = Math.ceil(left / 1000);
        if (left <= 0) { RACE.st = 'run'; sfx('whistle', 1); showToast('GO! Giddy-up!'); }
        else if (n !== lastCount) { lastCount = n; tone(660, 660, 0.15, 'square', 0.15); }
      }
      if (here) {
        const inp = inputs(dt);
        if (inp.start && !startHeld && RACE.st !== 'count' && RACE.st !== 'run') startRace();
        startHeld = inp.start;
        if (inp.recenter) calibrate();
        K.steer += (inp.steer - K.steer) * Math.min(1, dt * 8);
        const going = RACE.st === 'run' || RACE.st === 'over';
        if (going && inp.push > 0) giddy(K, inp.push * 5.5 * dt);
        if (going && inp.jumpNow) jump(K, true);
        const steps = Math.max(1, Math.ceil(dt / 0.02));
        for (let k = 0; k < steps; k++) {
          if (going) llamaStep(K, dt / steps, K.steer, true);
          if (RACE.st === 'run' && RACE.botsOn) for (const b of BOTS) botRide(b, dt / steps);
        }
        if (RACE.st === 'run' && K.done && (!RACE.botsOn || BOTS.every((b) => b.done)) && K.v < 0.3) RACE.st = 'over';
        // hoofbeats
        if (snd.ctx && K.v > 0.5 && K.air <= 0 && Math.floor(K.gait * 2 / Math.PI) !== K.lastBeat) { K.lastBeat = Math.floor(K.gait * 2 / Math.PI); tone(140 + Math.random() * 30, 90, 0.04, 'sine', 0.05 * Math.min(1, K.v / 6)); }
      }
      placeLlama(mine, K, now);
      mine.g.visible = here;
      const rkey = `${state.colorIdx}|${state.hat}|${state.face}|${state.mode}`;
      if (rkey !== riderKey) { riderKey = rkey; rider.clear(); if (state.mode !== 'vr') rider.add(buildAvatar(PLAYER_COLORS[state.colorIdx].hex, state.hat, state.face, true)); }
      for (const b of BOTS) { b.m.g.visible = here && RACE.botsOn && RACE.st !== 'idle'; if (b.m.g.visible) placeLlama(b.m, b, now); }
      // carrots I haven't taken this lap spin; ones I have are gone
      const lap = Math.floor(Math.max(0, K.s) / TLEN);
      carrotMeshes.forEach((m, i) => { m.visible = !K.carrots.includes(lap * 100 + i); m.rotation.y += dt * 2; m.position.y = 0.9 + Math.sin(now * 0.004 + i) * 0.1; });
      // VR: you ride on the llama
      if (here && state.mode === 'vr') {
        if (!calibrated) calibrate();
        rideStep(dt, yawAt(K.s), K.air);
        posAt(K.s, K.lat, _seat); _seat.add(new V3(0, 0, 0.05).applyAxisAngle(UP, RIDE.yaw));
        const ry = RIDE.yaw - calib.yaw;
        dolly.rotation.set(0, ry, 0);
        const off = new V3(calib.x, 0, calib.z).applyAxisAngle(UP, ry);
        dolly.position.set(_seat.x - off.x, 2.15 + RIDE.y + 0.75 - calib.y, _seat.z - off.z);
      }
      // others' llamas
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id], show = here && inMyLevel(rec) && st && st.ll;
        if (!show) { if (rec.llama) rec.llama.g.visible = false; continue; }
        if (!rec.llama) rec.llama = makeLlama(LLAMA_COLS[(rec.colorIdx + 1) % LLAMA_COLS.length]);
        rec.llama.g.visible = true;
        const o = rec.llamaO || (rec.llamaO = { gait: 0 });
        const s = st.ll[1] / 10; o.v = Math.max(0, (s - (o.s || s)) / Math.max(dt, 1e-3)); o.s = s; o.lat = st.ll[4] / 100; o.air = st.ll[5] / 100; o.gait += Math.min(o.v, 14) * dt * 1.4; o.steer = 0; o.airV = 0; o.stumble = 0;
        placeLlama(rec.llama, o, now);
      }
      if (here) {
        const t = raceT(), rows = standings(), place = rows.findIndex((r) => r.me) + 1, lapN = clamp(Math.floor(Math.max(0, K.s) / TLEN) + 1, 1, LAPS);
        const txt = RACE.st === 'count' ? `Get ready… ${Math.max(1, Math.ceil((RACE.startAt - Date.now()) / 1000))}` : RACE.st === 'run' || RACE.st === 'over' ? `${K.done ? `Done ${K.done.toFixed(1)} s` : `Lap ${lapN}/${LAPS}  ·  ${t.toFixed(1)} s`}  ·  ${place}/${rows.length}  ·  ${Math.round(K.v * 3.6)} km/h` : `Llama Derby  ·  ${state.mode === 'vr' ? 'press A' : 'press Space'} to start a race  ·  best ${RACE.best ? RACE.best.toFixed(1) + ' s' : '-'}`;
        if (state.mode === 'vr') { hud.visible = true; if (txt !== hudKey) { hudKey = txt; hud.userData.draw(txt); } }
        else { hud.visible = false; if (ui.status) { ui.status.hidden = false; if (ui.status.textContent !== txt) ui.status.textContent = txt; } }
      } else hud.visible = false;
    };
    // browser: a chase camera behind the llama
    let chase = null;
    L.flatCamera = (dt) => {
      rideStep(dt, yawAt(K.s), K.air);
      const fx = -Math.sin(RIDE.yaw), fz = -Math.cos(RIDE.yaw), me = posAt(K.s, K.lat, new V3());
      const want = new V3(me.x - fx * 5.5, 3.2 + RIDE.y * 0.6, me.z - fz * 5.5);
      if (!chase || chase.distanceTo(want) > 20) chase = want.clone();
      chase.lerp(want, Math.min(1, dt * 4));
      dolly.rotation.set(0, 0, 0); dolly.position.set(chase.x, chase.y - 1.6, chase.z);
      camera.position.set(0, 1.6, 0);
      camera.lookAt(me.x + fx * 6, 1.6, me.z + fz * 6);
      return true;
    };
    L.publishPose = () => {
      if (state.mode === 'vr') return null;
      const q = new Q4().setFromEuler(new THREE.Euler(0, mine.g.rotation.y, 0));
      const head = new V3(0, 2.6, 0.05).applyQuaternion(q).add(mine.g.position);
      return { h: [head, q], l: [head.clone().add(new V3(-0.2, -0.4, 0)), q], r: [head.clone().add(new V3(0.2, -0.4, 0)), q] };
    };
    L.presence = () => ({ ll: [RACE.id, Math.round(K.s * 10), RACE.startAt, Math.round(K.done * 10), Math.round(K.lat * 100), Math.round(K.air * 100), Math.round(RACE.best * 10)] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.ll;
      if (!Array.isArray(a) || a.length !== 7 || !a.every((x) => typeof x === 'number' && Number.isFinite(x))) { st.ll = null; return; }
      if (!st.ll || st.ll[3] !== a[3] || st.ll[6] !== a[6]) state.dirtyBoard = true;
      st.ll = a;
    };
    L.rowFor = (st, isMe) => { const best = isMe ? RACE.best : st.ll ? st.ll[6] / 10 : 0; return { best: best || 1e9, text: best ? `best ${best.toFixed(1)} s` : 'no race yet' }; };
    L.sortRows = (a, b) => (a.best || 1e9) - (b.best || 1e9);
    {
      const p0 = posAt(-8, -(HW + 5), new V3());
      L.board = makeBoard(G, 720, 460, 3, 1.92, p0.x, 2.2, p0.z, yawAt(0) + Math.PI / 2);
      const pk = posAt(-14, -(HW + 3), new V3());
      makeKiosk(L, pk.x, pk.z, yawAt(0) + Math.PI / 2);
    }
    RECORDS.def(L, [{ k: 'race', label: 'Fastest two laps', low: true, fmt: 'time' }]);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#2a1a0e'; g.fillRect(0, 0, W, 460);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Llama Derby', 36, 80);
      g.fillStyle = '#e8d8c0'; g.font = `400 24px ${BODY}`; g.fillText('Fastest two laps', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => (RACE.st === 'count' || RACE.st === 'run' ? 'Restart race' : 'Start race'), run: () => startRace() }, { label: () => 'Back to the start', run: () => { RACE.st = 'idle'; toGrid(); } }];
    L.hints = [['Shake the reins', 'both hands up and down: faster'], ['Lean', 'steer'], ['A / X', 'start, then jump'], ['Both hands up', 'jump too'], ['B', 'recentre']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Tap Space', 'giddy-up (or click, or W)'], ['A / D', 'steer'], ['J', 'jump the hay bales'], ['Carrots', 'speed; mud slows you']] : L.hints);
    L.clampPlayer = () => [0, 0];
    L.spawn = () => { toGrid(); chase = null; RIDE.on = false; };
    L.onEnter = () => { RACE.st = 'idle'; toGrid(); calibrated = false; };
    L.onExit = () => { hud.visible = false; dolly.rotation.set(0, 0, 0); dolly.position.y = 0; if (ui.status) ui.status.hidden = true; for (const rec of remotes.values()) if (rec.llama) rec.llama.g.visible = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : now * 0.00004; const p = posAt((a * 400) % TLEN, 0, new V3()); camera.position.set(p.x + 10, 6, p.z + 12); camera.lookAt(p.x, 1, p.z); };
    L.llInternals = { K, RACE, BOTS, llamaStep, botRide, startRace, toGrid, standings, posAt, giddy, jump, BALES, CARROTS, MUD, TLEN, FINISH };
    MUSIC_THEMES.llama = { gain: 0.75, bpm: 140, swing: 0.1, chords: ['G', 'C', 'G', 'D'], comp: { inst: 'guitar', at: [0, 2, 4, 6, 8, 10, 12, 14], dur: 0.1 }, bass: { at: [0, 4, 8, 12] }, drums: { k: 'x.......x.......', s: '....x.......x...', sh: '-.-.-.-.-.-.-.-.' }, lead: { inst: 'vibes', p: 0.3, up: 12 }, cut: 4600 };
    return L;
  })();
