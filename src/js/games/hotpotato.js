  // ================================================================ LEVEL: HARVEST HOT POTATO
  // Everyone stands on a ring of spots in a farmyard and passes a ticking potato. Whoever is holding it when it
  // pops is out; the last one standing wins the round. Bots fill the ring to six.
  // The lowest-named player's page runs the rounds, the fuse and the bots. A throw is a request from the holder's
  // page; the flight is the same arc on every page, so nobody needs the potato's physics.
  const hotpotato = (() => {
    const L = newLevel(18);
    const G = L.group;
    const rand = mulberry32(1818);
    L.grabless = true;
    L.walkSpeed = 2.6;
    L.bounds = { minX: -13, maxX: 13, minZ: -13, maxZ: 13 };
    L.env = {
      sky: skyTexture([[0, '#5a6fb8'], [0.38, '#f0a070'], [0.5, '#ffd89a'], [0.52, '#c8b070'], [1, '#6a7a3a']]),
      bg: 0xf0b080, fog: [0xf2c090, 30, 110], hemi: [0xffe0b0, 0x6a6a3a, 0.82],
      sun: [0xffc080, 0.85], sunDir: new V3(-0.6, 0.35, -0.7), ambient: [0x806a5a, 0.35],
      sprite: { tex: paleSunTex, pos: new V3(-120, 40, -140), scale: 50 },
    };
    const FILL_TO = 6, MAX_SPOTS = 10, COUNT_MS = 3500, PAUSE_MS = 2600, OVER_MS = 6000;
    const FUSE = [13000, 24000];          // a new potato's fuse, in ms (tests shorten it)
    const PH = { idle: 0, count: 1, play: 2, pop: 3, over: 4 }, PH_N = ['idle', 'count', 'play', 'pop', 'over'];
    const BOT_NAMES = ['Spud Spencer', 'Tater Tina', 'Mash Mabel', 'Russet Rex', 'Yukon Yuki', 'Hash Brown Hal', 'Chip Charlie', 'Gnocchi Gia'];
    const BOT_COLORS = ['#ff8a4a', '#8bd450', '#b388ff', '#4fc3f7', '#ffd23f', '#ff6a9a', '#5ad8b0', '#e8a060'];
    const _a = new V3(), _b = new V3(), _c = new V3(), _q = new Q4();

    // ---------------------------------------------------------------- the farmyard
    const grass = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#7a9a44'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3000; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,240,170,0.07)' : 'rgba(40,60,10,0.1)'; g.fillRect(rand() * 256, rand() * 256, 2, 3); }
    }).tex;
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(24, 24);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshLambertMaterial({ map: grass }));
    ground.rotation.x = -Math.PI / 2; G.add(ground);
    const dirt = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#a07a4a'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2500; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,230,180,0.1)' : 'rgba(70,40,15,0.14)'; g.fillRect(rand() * 256, rand() * 256, 3, 2); }
    }).tex;
    dirt.wrapS = dirt.wrapT = THREE.RepeatWrapping; dirt.repeat.set(3, 3);
    const yard = new THREE.Mesh(new THREE.CircleGeometry(6.2, 48), new THREE.MeshLambertMaterial({ map: dirt, polygonOffset: true, polygonOffsetFactor: -1 }));
    yard.rotation.x = -Math.PI / 2; yard.position.y = 0.01; G.add(yard);
    // hay bales round the edge, for whoever's out to sit on and watch
    const hay = canvasTexture(128, 64, (g) => {
      g.fillStyle = '#e0b858'; g.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 500; i++) { g.strokeStyle = rand() < 0.5 ? 'rgba(255,240,160,0.5)' : 'rgba(150,100,30,0.4)'; g.beginPath(); const x = rand() * 128, y = rand() * 64; g.moveTo(x, y); g.lineTo(x + 6 + rand() * 6, y + (rand() - 0.5) * 3); g.stroke(); }
      g.fillStyle = 'rgba(120,70,20,0.6)'; g.fillRect(30, 0, 3, 64); g.fillRect(95, 0, 3, 64);
    }).tex;
    const hayMat = new THREE.MeshLambertMaterial({ map: hay });
    const BENCH_R = 7.4;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + 0.11;
      const b = addBox(G, 1.5, 0.55, 0.6, hayMat, Math.sin(a) * BENCH_R, 0.275, Math.cos(a) * BENCH_R);
      b.rotation.y = a + Math.PI / 2;
    }
    // a red barn, a fence, trees, pumpkins
    {
      const red = lam(0xb83a30), white = lam(0xf2ead8), roofM = lam(0x5a4040);
      addBox(G, 10, 6, 8, red, 0, 3, -22);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.6, 3.2, 4, 1), roofM);
      roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.82); roof.position.set(0, 7.6, -22); G.add(roof);
      addBox(G, 3.2, 4, 0.1, lam(0x8a2a24), 0, 2, -17.95);
      for (const s of [-1, 1]) { const x = addBox(G, 0.16, 4.4, 0.06, white, 0, 2, -17.88); x.rotation.z = s * 0.68; }
      addBox(G, 3.4, 0.16, 0.06, white, 0, 4.05, -17.88);
      addBox(G, 1.6, 1.2, 0.1, white, 0, 6.2, -17.95);
      const post = lam(0x8a6a44);
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2, x = Math.sin(a) * 12, z = Math.cos(a) * 12;
        if (z < -10.5 && Math.abs(x) < 6) continue;                 // a gap by the barn
        addBox(G, 0.14, 1.1, 0.14, post, x, 0.55, z);
        const a2 = ((k + 1) / 40) * Math.PI * 2, len = 2 * 12 * Math.sin(Math.PI / 40);
        for (const y of [0.45, 0.9]) { const r = addBox(G, len, 0.08, 0.05, post, (x + Math.sin(a2) * 12) / 2, y, (z + Math.cos(a2) * 12) / 2); r.rotation.y = a + Math.PI / 40 + Math.PI / 2; }
      }
      const trunkM = lam(0x6a4a30), leafM = [lam(0x5a8a34), lam(0xc8862a), lam(0xb85a2a)];
      for (let k = 0; k < 22; k++) {
        const a = rand() * Math.PI * 2, d = 18 + rand() * 30, x = Math.sin(a) * d, z = Math.cos(a) * d;
        if (Math.abs(x) < 8 && z < -14 && z > -30) continue;
        const h = 2 + rand() * 2;
        addCyl(G, 0.25, 0.32, h, 6, trunkM, x, h / 2, z);
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + rand(), 1), leafM[k % 3]); c.position.set(x, h + 1.2, z); G.add(c);
      }
      const pumpkinM = lam(0xe8822a), stemM = lam(0x4a6a2a);
      for (let k = 0; k < 16; k++) {
        const a = rand() * Math.PI * 2, d = 8.6 + rand() * 2.6, x = Math.sin(a) * d, z = Math.cos(a) * d, r = 0.2 + rand() * 0.18;
        const p = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), pumpkinM); p.scale.y = 0.72; p.position.set(x, r * 0.72, z); G.add(p);
        addCyl(G, 0.025, 0.035, 0.12, 5, stemM, x, r * 1.42, z);
      }
      // string lights on four posts round the ring
      const bulbMat = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffd890, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      const P4 = [0, 1, 2, 3].map((k) => { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; return [Math.sin(a) * 8.6, Math.cos(a) * 8.6]; });
      for (const [x, z] of P4) addCyl(G, 0.06, 0.08, 3.6, 6, post, x, 1.8, z);
      for (let k = 0; k < 4; k++) {
        const [x0, z0] = P4[k], [x1, z1] = P4[(k + 1) % 4];
        for (let j = 1; j < 10; j++) { const t = j / 10, s = new THREE.Sprite(bulbMat); s.position.set(x0 + (x1 - x0) * t, 3.5 - Math.sin(t * Math.PI) * 0.7, z0 + (z1 - z0) * t); s.scale.set(0.32, 0.32, 1); G.add(s); }
      }
    }
    makeKiosk(L, 9.2, 5.2, Math.atan2(-9.2, -5.2));
    makePlayerPicker(L, { min: 2, max: 9, def: FILL_TO, note: 'from the next round' });
    L.board = makeBoard(G, 720, 460, 3.2, 2.05, 0, 2.5, -10.2, 0);

    // ---------------------------------------------------------------- the potato
    const potatoTex = canvasTexture(128, 64, (g) => {
      g.fillStyle = '#b8864e'; g.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 260; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(90,50,20,0.35)' : 'rgba(230,190,130,0.3)'; g.fillRect(rand() * 128, rand() * 64, 2, 2); }
      for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(80,45,20,0.7)'; g.beginPath(); g.ellipse(rand() * 128, 8 + rand() * 48, 3, 2, rand() * 3, 0, Math.PI * 2); g.fill(); }
    }).tex;
    const potatoMat = new THREE.MeshLambertMaterial({ map: potatoTex, emissive: 0x000000 });
    const potato = new THREE.Group();
    const spud = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), potatoMat);
    spud.scale.set(1.35, 0.92, 1.0);
    const glowMat = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffd060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });
    const glow = new THREE.Sprite(glowMat); glow.scale.set(0.55, 0.55, 1);
    potato.add(spud, glow);
    potato.visible = false; G.add(potato);
    // little puffs of steam when it's getting hot, and a burst of mash when it pops
    const steamMat = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    const steam = [];
    for (let k = 0; k < 8; k++) { const s = new THREE.Sprite(steamMat.clone()); s.visible = false; G.add(s); steam.push({ s, t: 0, life: 0, vx: 0, vz: 0 }); }
    const mashGeo = new THREE.IcosahedronGeometry(0.05, 0), mashMat = lam(0xfff2c8);
    const mash = [];
    for (let k = 0; k < 40; k++) { const m = new THREE.Mesh(mashGeo, mashMat); m.visible = false; G.add(m); mash.push({ m, v: new V3(), t: 0 }); }
    function burst(at) {
      for (const p of mash) {
        p.m.position.copy(at); p.m.visible = true; p.t = 1.4;
        p.v.set((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6);
        p.m.scale.setScalar(0.6 + Math.random() * 1.2);
      }
    }

    // ---------------------------------------------------------------- the ring: spots, and the pads under them
    const ringR = (n) => clamp(0.6 + n * 0.42, 2.4, 4.6);
    function spotPos(k, n, out, r) {
      const a = (k / n) * Math.PI * 2;
      const R = r === undefined ? ringR(n) : r;
      return out.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    }
    const faceCentre = (x, z) => Math.atan2(x, z);        // the yaw that looks from (x, z) to the middle
    const padGeo = new THREE.CircleGeometry(0.45, 24);
    const pads = [];
    for (let k = 0; k < MAX_SPOTS; k++) {
      const m = new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.025; m.visible = false; G.add(m); pads.push(m);
    }
    // a sign over the middle that everyone can read
    const signC = canvasTexture(512, 128);
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signC.tex, transparent: true, depthWrite: false }));
    sign.scale.set(2.8, 0.7, 1); sign.position.set(0, 3.3, 0); G.add(sign);
    let signKey = '';
    function drawSign(text, col) {
      const key = text + col;
      if (key === signKey) return;
      signKey = key;
      const g = signC.g;
      g.clearRect(0, 0, 512, 128);
      rr(g, 6, 10, 500, 108, 40); g.fillStyle = 'rgba(40,24,16,0.85)'; g.fill();
      g.fillStyle = col || '#ffe0a0'; g.font = `800 64px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, 256, 68, 480);
      signC.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- bots
    const bots = BOT_NAMES.map((name, k) => {
      const g = buildAvatar(BOT_COLORS[k], (k * 3 + 1) % HATS.length, k % FACES.length, true, k % SHIRTS.length, (k * 2 + 1) % SHIRT_COLORS.length);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.42; g.add(tag);
      g.visible = false; G.add(g);
      return { id: `bot:${k}`, k, name, g, x: 0, z: 0, hop: 0 };
    });
    const isBot = (id) => typeof id === 'string' && id.startsWith('bot:');
    const botOf = (id) => bots[Number(id.slice(4))];

    // ---------------------------------------------------------------- state
    // RS is what everyone sees (the host's word); H is the host's own bookkeeping
    const RS = { round: 0, ph: 'idle', order: [], alive: [], holder: '', fl: null, fseq: 0, heat: 0, popped: '', popSeq: 0, winner: '', phLeft: 0 };
    const H = { phaseT: 0, fuseEnd: 0, fuseTotal: 1, catchT: 0, botHoldUntil: 0, botWins: bots.map(() => 0) };
    const me = { wins: 0, tseq: 0, tTarget: -1, catchT: 0, pendingUntil: 0, round: -1, popSeen: 0, winSeen: -1, wasHolder: false, ph: '', side: 'right', swingArmed: true };
    L.potato = { RS, H, me };
    const SIT = makeSitOut(L, { outMsg: 'Sitting out: you\u2019re out of the game and free to walk about. Join in to play again' });
    const humans = () => {
      const ids = state.mode !== 'menu' && !SIT.on ? [state.myPeer] : [];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame && !SIT.out(rec)) ids.push(rec.peer);
      return ids.sort();
    };
    const hostId = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort()[0]; };
    const isHost = () => hostId() === state.myPeer;
    const nameOf = (id) => (id === state.myPeer ? 'You' : isBot(id) ? botOf(id).name : (remotes.get(id) || {}).name || 'Someone');
    const idx = (id) => RS.order.indexOf(id);
    const imIn = () => RS.alive.includes(state.myPeer);

    // where someone's throwing hand is (the potato sits there)
    function handPos(id, out) {
      if (id === state.myPeer) {
        const mh = myHands[me.side].ok ? myHands[me.side] : myHands[me.side === 'right' ? 'left' : 'right'];
        if (mh.ok) return out.copy(mh.pos);
        return out.copy(myHead.pos).add(_c.set(0, -0.35, 0));
      }
      if (isBot(id)) {
        const b = botOf(id);
        const k = Math.max(0, idx(id)), n = Math.max(1, RS.order.length);
        spotPos(k, n, _c);
        const inward = 0.32 / Math.max(0.01, Math.hypot(_c.x, _c.z));
        return out.set(b.x - _c.x * inward, 1.12 + b.hop, b.z - _c.z * inward);
      }
      const rec = remotes.get(id);
      if (rec && rec.hasR) return out.copy(rec.cur.r.pos);
      if (rec && rec.hasH) return out.copy(rec.cur.h.pos).add(_c.set(0, -0.4, 0));
      const k = idx(id);
      return spotPos(Math.max(0, k), Math.max(1, RS.order.length), out).setY(1.1);
    }
    function flightPos(fl, now, out) {
      const t = clamp((now - fl.t0) / fl.T, 0, 1);
      handPos(fl.to, _b);
      out.lerpVectors(fl.from, _b, t);
      out.y += fl.arc * 4 * t * (1 - t);
      return t;
    }

    // ---------------------------------------------------------------- the host: rounds, the fuse, the bots
    function beginCount(now) {
      const hs = humans().slice(0, MAX_SPOTS);
      const nb = Math.min(bots.length, Math.max(0, L.picker.n - hs.length));
      const ids = hs.concat(bots.slice(0, nb).map((b) => b.id));
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      Object.assign(RS, { round: RS.round + 1, ph: 'count', order: ids, alive: ids.slice(), holder: '', fl: null, heat: 0, popped: '', winner: '' });
      H.phaseT = now;
      forcePresence();
    }
    function newPotato(now, near) {
      // a fresh potato goes to someone still in, next round the ring from whoever just went out
      const n = RS.order.length;
      let pick = RS.alive[Math.floor(Math.random() * RS.alive.length)];
      if (near) { const k0 = idx(near); for (let j = 1; j <= n; j++) { const id = RS.order[(k0 + j) % n]; if (RS.alive.includes(id)) { pick = id; break; } } }
      RS.holder = pick; RS.fl = null; RS.heat = 0;
      const humanIn = RS.alive.some((id) => !isBot(id));
      H.fuseTotal = (FUSE[0] + Math.random() * (FUSE[1] - FUSE[0])) * (humanIn ? 1 : 0.5);
      H.fuseEnd = now + H.fuseTotal; H.catchT = now; H.botHoldUntil = now + 700 + Math.random() * 800;
      RS.ph = 'play';
      forcePresence();
    }
    function startFlight(from, to, now) {
      const a = handPos(from, new V3()), d = a.distanceTo(handPos(to, _b));
      RS.fl = { fromId: from, to, from: a, t0: now, T: 380 + d * 95, arc: 0.5 + d * 0.12 };
      RS.fseq += 1; RS.holder = '';
      forcePresence();
    }
    function pickRandomTarget(from) {
      const others = RS.alive.filter((id) => id !== from);
      return others[Math.floor(Math.random() * others.length)];
    }
    function hostThrow(from, to, now) {
      if (RS.ph !== 'play' || RS.fl || RS.holder !== from || now - H.catchT < 150) return false;
      if (!RS.alive.includes(to) || to === from) to = pickRandomTarget(from);
      if (!to) return false;
      startFlight(from, to, now);
      return true;
    }
    function hostStep(now) {
      const hs = humans();
      // people who left are out of the round
      const gone = RS.alive.filter((id) => !isBot(id) && !hs.includes(id));
      if (gone.length && (RS.ph === 'count' || RS.ph === 'play' || RS.ph === 'pop')) {
        RS.alive = RS.alive.filter((id) => !gone.includes(id));
        if (gone.includes(RS.holder) || (RS.fl && (gone.includes(RS.fl.to) || gone.includes(RS.fl.fromId)))) { RS.fl = null; if (RS.alive.length > 1) newPotato(now); }
        forcePresence();
      }
      if (RS.ph === 'idle') { if (hs.length) beginCount(now); return; }
      if (RS.ph === 'count') {
        RS.phLeft = COUNT_MS - (now - H.phaseT);
        if (RS.phLeft <= 0) newPotato(now);
        return;
      }
      if (RS.ph === 'play' && RS.alive.length <= 1) { endRound(now); return; }      // (everyone else left)
      if (RS.ph === 'play') {
        if (!H.fuseEnd) { H.fuseTotal = 15000; H.fuseEnd = now + Math.max(2500, (1 - RS.heat) * 15000); }   // took over as host mid-round
        RS.heat = clamp(1 - (H.fuseEnd - now) / H.fuseTotal, 0, 1);
        // a potato in the air lands in the hands it was thrown to
        if (RS.fl && now - RS.fl.t0 >= RS.fl.T) {
          RS.holder = RS.fl.to; RS.fl = null; H.catchT = now;
          H.botHoldUntil = now + (RS.heat > 0.7 ? 250 + Math.random() * 450 : 450 + Math.random() * 1000);
          forcePresence();
        }
        if (now >= H.fuseEnd) {
          const victim = RS.fl ? ((now - RS.fl.t0) / RS.fl.T > 0.5 ? RS.fl.to : RS.fl.fromId) : RS.holder;
          RS.alive = RS.alive.filter((id) => id !== victim);
          RS.popped = victim; RS.popSeq += 1; RS.fl = null; RS.holder = '';
          RS.ph = 'pop'; H.phaseT = now; H.fuseEnd = 0;
          forcePresence();
          return;
        }
        // a bot holding it throws it on
        if (RS.holder && isBot(RS.holder) && !RS.fl && now > H.botHoldUntil) hostThrow(RS.holder, pickRandomTarget(RS.holder), now);
        return;
      }
      if (RS.ph === 'pop') {
        RS.phLeft = PAUSE_MS - (now - H.phaseT);
        if (RS.phLeft <= 0) { if (RS.alive.length <= 1) endRound(now); else newPotato(now, RS.popped); }
        return;
      }
      if (RS.ph === 'over') {
        RS.phLeft = OVER_MS - (now - H.phaseT);
        if (RS.phLeft <= 0) { if (hs.length) beginCount(now); else RS.ph = 'idle'; }
      }
    }
    function endRound(now) {
      RS.winner = RS.alive[0] || '';
      if (isBot(RS.winner)) H.botWins[botOf(RS.winner).k] += 1;
      RS.ph = 'over'; H.phaseT = now; RS.holder = ''; RS.fl = null;
      forcePresence();
    }

    // ---------------------------------------------------------------- your throws
    // in a browser: whoever you're facing; in VR: whoever your swing (or your pointing hand) is aimed at
    function pickTarget(dx, dz) {
      const n = RS.order.length, mk = idx(state.myPeer);
      spotPos(Math.max(0, mk), Math.max(1, n), _a);
      const from = imIn() ? _a : myHead.pos;
      let best = null, bestA = 9;
      const dl = Math.hypot(dx, dz) || 1;
      for (const id of RS.alive) {
        if (id === state.myPeer) continue;
        spotPos(idx(id), n, _b);
        const vx = _b.x - from.x, vz = _b.z - from.z, vl = Math.hypot(vx, vz) || 1;
        const ang = Math.acos(clamp((vx * dx + vz * dz) / (vl * dl), -1, 1));
        if (ang < bestA) { bestA = ang; best = id; }
      }
      return best;
    }
    const canThrow = (now) => RS.ph === 'play' && RS.holder === state.myPeer && !RS.fl && now - me.catchT > 180 && now > me.pendingUntil;
    function throwAt(target) {
      const now = performance.now();
      if (!target || !canThrow(now)) return false;
      me.pendingUntil = now + 700;
      if (isHost()) hostThrow(state.myPeer, target, now);
      else { me.tseq += 1; me.tTarget = idx(target); forcePresence(); }
      sfx('whoosh', 0.7);
      return true;
    }
    L.deskFire = () => {
      if (state.mode !== 'flat' || RS.holder !== state.myPeer) return;
      camera.getWorldQuaternion(_q);
      _a.set(0, 0, -1).applyQuaternion(_q);
      throwAt(pickTarget(_a.x, _a.z));
    };
    L.onVRTrigger = (h) => {
      if (RS.holder !== state.myPeer) return;
      const mh = myHands[h.side];
      _a.set(0, 0, -1).applyQuaternion(mh.quat);
      throwAt(pickTarget(_a.x, _a.z));
    };
    // VR: a quick swing of the hand holding it throws it the way you swung
    const _hv = new V3();
    function vrSwing(now) {
      if (state.mode !== 'vr' || RS.holder !== state.myPeer) { me.swingArmed = true; return; }
      handVelocity(vrHands[me.side], _hv);
      const hsp = Math.hypot(_hv.x, _hv.z);
      if (hsp < 0.9) me.swingArmed = true;
      if (me.swingArmed && hsp > 2.0 && canThrow(now)) {
        me.swingArmed = false;
        if (throwAt(pickTarget(_hv.x, _hv.z))) haptic(vrHands[me.side], 0.5, 40);
      }
    }

    // ---------------------------------------------------------------- where you stand
    function myMarkPos(out) {
      const k = idx(state.myPeer), n = RS.order.length;
      if (k < 0) return null;
      return imIn() ? spotPos(k, n, out) : spotPos(k, n, out, BENCH_R - 1.0);
    }
    function toSpot() {
      const p = myMarkPos(_a);
      if (!p) return;
      const yaw = faceCentre(p.x, p.z);
      if (state.mode === 'vr') {
        camera.getWorldQuaternion(_q);
        const e = new THREE.Euler().setFromQuaternion(_q, 'YXZ');
        snapTurn(yaw - e.y);
      } else { state.yaw = yaw; state.pitch = -0.12; }
      camera.getWorldPosition(_b);
      dolly.position.x += p.x - _b.x; dolly.position.z += p.z - _b.z;
    }
    L.clampPlayer = (p) => {
      const B = L.bounds;
      let x = clamp(p.x, B.minX + 0.4, B.maxX - 0.4), z = clamp(p.z, B.minZ + 0.4, B.maxZ - 0.4);
      const live = RS.ph === 'count' || RS.ph === 'play' || RS.ph === 'pop';
      if (live && imIn() && !SIT.on) {
        // stay on your spot
        const s = myMarkPos(_a), dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz);
        if (d > 0.6) { x = s.x + dx * 0.6 / d; z = s.z + dz * 0.6 / d; }
      } else if (live && !SIT.on) {
        // keep out of the ring while it's on
        const R = ringR(RS.order.length) + 1.0, d = Math.hypot(x, z);
        if (d < R) { const k = R / Math.max(0.01, d); x *= k; z *= k; }
      }
      return [x - p.x, z - p.z];
    }

    // ---------------------------------------------------------------- what happened, for everyone
    function showPop(victim) {
      const at = potato.visible ? potato.position.clone() : handPos(victim, new V3());
      burst(at);
      sfx('poof', 1); sfx('slam', 0.6); tone(120, 50, 0.35, 'sawtooth', 0.25);
      if (victim === state.myPeer) {
        showToast('POP! You’re out. Cheer them on from the hay bales');
        for (const s of SIDES) haptic(vrHands[s], 1, 250);
        if (ui.hurt && state.mode === 'flat') { ui.hurt.style.opacity = '0.55'; setTimeout(() => { ui.hurt.style.opacity = '0'; }, 500); }
        setTimeout(() => { if (state.level === L.idx && state.mode !== 'menu' && !imIn() && !SIT.on) toSpot(); }, 900);
      } else showToast(`POP! ${nameOf(victim)} is out`);
      spawnFloat('POP!', at.clone().add(_c.set(0, 0.4, 0)), '#ff6a3a');
      state.dirtyBoard = true;
    }
    function showWinner(id) {
      if (id === state.myPeer) { me.wins += 1; showToast('You’re the last one standing!'); sfx('fanfare', 0.9); sfx('cheer', 0.7); forcePresence(); }
      else if (id) { showToast(`${nameOf(id)} wins the round!`); sfx('cheer', 0.5); }
      state.dirtyBoard = true;
    }

    // ---------------------------------------------------------------- per frame
    let tickT = 0, steamT = 0;
    const hudPlate = makePlate(camera, 'Throw it!', 0.5, 0.1, new V3(0, -0.2, -0.6), 0, { bg: '#5a2a10', fg: '#ffe0a0', size: 0.6 });
    hudPlate.material.depthTest = false; hudPlate.renderOrder = 999; hudPlate.visible = false;
    let statusKey = '';
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { hudPlate.visible = false; potato.visible = false; return; }
      if (isHost()) hostStep(now);
      else if (RS.ph === 'count' || RS.ph === 'pop' || RS.ph === 'over') RS.phLeft -= dt * 1000;
      // a new round: take your spot
      if (RS.round !== me.round) {
        me.round = RS.round;
        if (idx(state.myPeer) >= 0) { toSpot(); showToast(`Round ${RS.round}: stand on your spot. Don’t get caught holding it!`); }
        else if (RS.round > 0) showToast('Round on: you’ll be in the next one');
        state.dirtyBoard = true;
      }
      if (RS.ph !== me.ph) {
        if (RS.ph === 'play' && me.ph === 'count') { sfx('whistle', 0.8); spawnFloat('Go!', new V3(0, 2.4, 0), '#8bd450'); }
        if (RS.ph === 'play' && me.ph === 'pop') sfx('chime', 0.5);
        me.ph = RS.ph; state.dirtyBoard = true; state.hudDirty = true;
      }
      // pops and wins, shown once each (on arriving, catch up silently instead of replaying an old one)
      if (!me.synced && (isHost() || me.heardHost)) { me.synced = true; me.popSeen = RS.popSeq; me.winSeen = RS.ph === 'over' ? RS.round : -1; }
      if (me.synced) {
        if (RS.popSeq !== me.popSeen) { me.popSeen = RS.popSeq; if (RS.popped) showPop(RS.popped); }
        if (RS.ph === 'over' && me.winSeen !== RS.round) { me.winSeen = RS.round; showWinner(RS.winner); }
      }
      // you caught it
      const mine = RS.holder === state.myPeer;
      if (mine && !me.wasHolder) {
        me.catchT = now; me.pendingUntil = 0;
        if (state.mode === 'vr') { me.side = myHands.right.ok ? 'right' : 'left'; haptic(vrHands[me.side], 0.7, 60); }
        sfx('mitt', 0.8);
      }
      me.wasHolder = mine;
      vrSwing(now);
      // the bots, standing on their spots (or watching from the bales once they're out)
      const n = Math.max(1, RS.order.length);
      for (const b of bots) {
        const k = idx(b.id);
        b.g.visible = k >= 0 && RS.ph !== 'idle';
        if (!b.g.visible) continue;
        const inRound = RS.alive.includes(b.id);
        spotPos(k, n, _a, inRound ? undefined : BENCH_R - 0.75);
        b.x += (_a.x - b.x) * Math.min(1, dt * 4); b.z += (_a.z - b.z) * Math.min(1, dt * 4);
        const holding = RS.holder === b.id;
        b.hop = holding ? Math.abs(Math.sin(now * 0.02 + b.k)) * 0.06 : 0;
        b.g.position.set(b.x, (inRound ? 1.5 : 1.2) + b.hop + (inRound ? Math.abs(Math.sin(now * 0.004 + b.k)) * 0.02 : 0), b.z);
        b.g.rotation.y = faceCentre(b.x, b.z);
      }
      // the pads
      for (let k = 0; k < MAX_SPOTS; k++) {
        const p = pads[k], id = RS.order[k];
        p.visible = !!id && RS.ph !== 'idle' && RS.alive.includes(id);
        if (!p.visible) continue;
        spotPos(k, n, _a); p.position.x = _a.x; p.position.z = _a.z;
        const col = id === RS.holder ? 0xff7a3a : id === state.myPeer ? 0x8bd450 : 0xffffff;
        p.material.color.setHex(col);
        p.material.opacity = id === RS.holder ? 0.75 + 0.2 * Math.sin(now * 0.02) : 0.45;
      }
      // the potato: in someone's hand, or in the air
      potato.visible = RS.ph === 'play' && (!!RS.holder || !!RS.fl);
      if (potato.visible) {
        if (RS.fl) { flightPos(RS.fl, now, potato.position); potato.rotation.x += dt * 9; potato.rotation.z += dt * 5; }
        else { handPos(RS.holder, potato.position); potato.position.y += 0.04; potato.rotation.y += dt * 2; }
        // it gets redder and ticks faster as the fuse burns down
        const heat = RS.heat;
        glowMat.color.setRGB(1, 0.85 - heat * 0.7, 0.3 - heat * 0.3);
        glowMat.opacity = 0.35 + heat * 0.5 + (heat > 0.75 ? 0.15 * Math.sin(now * 0.03) : 0);
        glow.scale.setScalar(0.45 + heat * 0.45);
        potatoMat.emissive.setRGB(heat * 0.5, heat * 0.12, 0);
        const shake = heat > 0.6 ? (heat - 0.6) * 0.05 : 0;
        spud.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        const gap = 0.13 + 0.6 * (1 - heat);
        if (now - tickT > gap * 1000) {
          tickT = now;
          const near = 1 / (1 + potato.position.distanceTo(myHead.pos) * 0.25);
          tone(1700 + heat * 500, 1500, 0.025, 'square', (0.05 + heat * 0.07) * near);
        }
        if (heat > 0.45 && now - steamT > 260 - heat * 160) {
          steamT = now;
          const s = steam.find((x) => x.t <= 0);
          if (s) { s.t = s.life = 0.9; s.s.position.copy(potato.position); s.vx = (Math.random() - 0.5) * 0.3; s.vz = (Math.random() - 0.5) * 0.3; s.s.visible = true; }
        }
      }
      for (const s of steam) {
        if (s.t <= 0) continue;
        s.t -= dt;
        s.s.position.x += s.vx * dt; s.s.position.z += s.vz * dt; s.s.position.y += 0.6 * dt;
        const k = 1 - s.t / s.life;
        s.s.scale.setScalar(0.12 + k * 0.3); s.s.material.opacity = 0.45 * (1 - k);
        if (s.t <= 0) s.s.visible = false;
      }
      for (const p of mash) {
        if (p.t <= 0) continue;
        p.t -= dt; p.v.y -= 9.8 * dt; p.m.position.addScaledVector(p.v, dt);
        if (p.m.position.y < 0.03) { p.m.position.y = 0.03; p.v.set(0, 0, 0); }
        if (p.t <= 0) p.m.visible = false;
      }
      // the sign, your HUD
      const left = RS.alive.length;
      if (RS.ph === 'idle') drawSign('Hot potato', '#ffe0a0');
      else if (RS.ph === 'count') drawSign(`Get ready… ${Math.max(1, Math.ceil(RS.phLeft / 1000))}`, '#ffe0a0');
      else if (RS.ph === 'play') drawSign(`${left} left · pass it on!`, '#ffd060');
      else if (RS.ph === 'pop') drawSign(`POP! ${nameOf(RS.popped)} ${RS.popped === state.myPeer ? 'are' : 'is'} out`, '#ff7a5a');
      else drawSign(RS.winner === state.myPeer ? 'You win!' : `${nameOf(RS.winner)} wins!`, '#8bd450');
      hudPlate.visible = state.mode === 'vr' && mine;
      if (state.mode === 'flat' && ui.status) {
        const a = mine ? 'You have the potato! Space to throw' : RS.ph === 'play' && RS.holder ? `${nameOf(RS.holder)} has it` : RS.ph === 'play' ? 'In the air…' : RS.ph === 'count' ? 'Get ready' : RS.ph === 'over' ? `${nameOf(RS.winner)} won` : RS.ph === 'pop' ? 'POP!' : 'Hot potato';
        const b = RS.ph === 'idle' ? '' : imIn() ? `${left} left` : idx(state.myPeer) >= 0 ? 'You’re out' : 'Watching';
        const key = `${a}|${b}|${mine}`;
        if (key !== statusKey) {
          statusKey = key; ui.status.hidden = false; ui.status.replaceChildren();
          for (const [t, col] of [[a, mine ? '#ffb070' : '#ffe0a0'], [b, null]]) { if (!t) continue; const s = document.createElement('span'); s.textContent = t; if (col) s.style.color = col; ui.status.append(s); }
        }
      }
    };

    // ---------------------------------------------------------------- scoreboard and the player list
    let boardKey = '';
    L.drawBoard = () => {
      const rows = RS.order.map((id) => ({ id, name: nameOf(id), alive: RS.alive.includes(id), holder: id === RS.holder, wins: winsOf(id) }));
      const key = JSON.stringify([rows, RS.ph, RS.round]);
      if (key === boardKey) return;
      boardKey = key;
      const g = L.board.g, W = 720, Hh = 460;
      g.fillStyle = '#3a2418'; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#ffb060'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, Hh - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd890'; g.font = `800 58px ${DISPLAY}`; g.fillText('Hot potato', 32, 70);
      g.fillStyle = '#e8c8a0'; g.font = `400 24px ${BODY}`; g.textAlign = 'right';
      g.fillText(RS.round ? `Round ${RS.round}` : 'Pass it before it pops', W - 32, 66);
      rows.slice(0, 10).forEach((r, i) => {
        const col = i < 5 ? 0 : 1, y = 128 + (i % 5) * 64, x = 32 + col * 344;
        g.textAlign = 'left';
        g.fillStyle = r.alive ? (r.id === state.myPeer ? '#8bd450' : '#fff2e0') : '#8a7060';
        g.font = `${r.id === state.myPeer ? 700 : 400} 28px ${BODY}`;
        g.fillText(`${r.holder ? '\u{1F954} ' : ''}${r.id === state.myPeer ? 'You' : r.name}`, x, y, 240);
        g.textAlign = 'right'; g.fillStyle = '#ffd890'; g.font = `800 30px ${DISPLAY}`;
        g.fillText(r.alive ? String(r.wins) : 'out', x + 300, y);
      });
      g.textAlign = 'left'; g.fillStyle = '#c8a888'; g.font = `400 22px ${BODY}`;
      g.fillText('Wins this visit. Browser: face someone and press Space. VR: swing or pull the trigger.', 32, Hh - 24, W - 64);
      L.board.tex.needsUpdate = true;
    };
    function winsOf(id) {
      if (id === state.myPeer) return me.wins;
      if (isBot(id)) return H.botWins[botOf(id).k];
      const rec = remotes.get(id), st = rec && rec.lvState[L.id];
      return st && st.wins ? st.wins : 0;
    }
    L.rowFor = (st, isMe) => {
      const id = isMe ? state.myPeer : st && st.peer;
      const k = id ? idx(id) : -1;
      const text = k < 0 ? 'watching' : RS.holder === id ? '\u{1F954}' : RS.alive.includes(id) ? 'in' : 'out';
      return { wins: isMe ? me.wins : (st && st.wins) || 0, text };
    };
    L.sortRows = (a, b) => b.wins - a.wins;
    L.hints = [['Swing', 'throw the potato'], ['Trigger', 'throw where you point'], ['Stay on', 'your spot']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Space', 'throw to who you’re facing'], ['Drag', 'turn to aim'], ['WASD', 'shuffle on your spot']] : L.hints);

    // ---------------------------------------------------------------- network
    L.presence = () => {
      const p = { pq: [me.wins, me.tseq, me.tTarget, RS.round] };
      if (isHost()) {
        const now = performance.now(), fl = RS.fl;
        p.ph = [RS.round, PH[RS.ph], Math.round(RS.heat * 100), RS.fseq, fl ? Math.round(now - fl.t0) : -1, fl ? Math.round(fl.T) : 0,
          idx(RS.holder), fl ? idx(fl.fromId) : -1, fl ? idx(fl.to) : -1, idx(RS.winner), idx(RS.popped), RS.popSeq, Math.max(0, Math.round(RS.phLeft))];
        p.po = RS.order.slice();
        p.pa = RS.order.map((id) => (RS.alive.includes(id) ? 1 : 0));
        p.pw = H.botWins.slice();
      }
      return p;
    };
    const intIn = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    L.readPresence = (rec, pres, st) => {
      st.peer = rec.peer;
      const q = pres.pq;
      if (Array.isArray(q) && q.length === 4 && q.every((x) => Number.isInteger(x))) {
        if (q[0] !== st.wins) state.dirtyBoard = true;
        st.wins = clamp(q[0], 0, 9999);
        // a throw request from whoever's holding it
        if (isHost() && q[1] > (st.tseq || 0)) {
          if (st.tInit && q[3] === RS.round && q[2] >= 0 && q[2] < RS.order.length) hostThrow(rec.peer, RS.order[q[2]], performance.now());
          st.tseq = q[1];
        }
        st.tInit = true;
      }
      if (rec.peer !== hostId() || isHost()) return;
      const h = pres.ph, po = pres.po, pa = pres.pa;
      if (!Array.isArray(h) || h.length !== 13 || !h.every((x) => Number.isInteger(x))) return;
      if (!Array.isArray(po) || po.length > MAX_SPOTS || !po.every((x) => typeof x === 'string' && x.length < 64)) return;
      if (!Array.isArray(pa) || pa.length !== po.length) return;
      const ord = po.filter((id) => !isBot(id) || (intIn(Number(id.slice(4)), 0, bots.length - 1)));
      if (ord.length !== po.length) return;
      const at = (i) => (intIn(i, 0, po.length - 1) ? po[i] : '');
      const now = performance.now();
      RS.round = h[0]; RS.ph = PH_N[clamp(h[1], 0, 4)]; RS.heat = clamp(h[2], 0, 100) / 100;
      RS.order = po.slice(); RS.alive = po.filter((_, i) => pa[i] === 1);
      RS.holder = at(h[6]); RS.winner = at(h[9]); RS.popped = at(h[10]); RS.phLeft = h[12];
      if (h[4] >= 0 && at(h[7]) && at(h[8])) {
        if (!RS.fl || h[3] !== RS.fseq) RS.fl = { fromId: at(h[7]), to: at(h[8]), from: handPos(at(h[7]), new V3()), t0: now - h[4], T: Math.max(100, h[5]), arc: 0 };
        const d = RS.fl.from.distanceTo(handPos(RS.fl.to, _b)); RS.fl.arc = 0.5 + d * 0.12;
      } else RS.fl = null;
      RS.fseq = h[3];
      RS.popSeq = h[11];
      me.heardHost = true;
      if (Array.isArray(pres.pw) && pres.pw.length === bots.length && pres.pw.every((x) => intIn(x, 0, 9999))) H.botWins = pres.pw.slice();
    };
    L.spawn = () => { dolly.position.set((Math.random() - 0.5) * 2, 0, BENCH_R + 1.6); state.yaw = 0; };
    L.onEnter = () => {
      me.round = -1; me.ph = ''; me.synced = false; me.heardHost = false; boardKey = ''; statusKey = ''; state.dirtyBoard = true;
      // a round left over from an earlier visit is stale: start clean (whoever's hosting will tell us what's on)
      Object.assign(RS, { ph: 'idle', order: [], alive: [], holder: '', fl: null, heat: 0, popped: '', winner: '' });
      H.fuseEnd = 0;
    };
    L.onExit = () => { hudPlate.visible = false; potato.visible = false; if (ui.status) ui.status.hidden = true; statusKey = ''; for (const b of bots) b.g.visible = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : now * 0.00006; camera.position.set(Math.sin(a) * 11, 4.2, Math.cos(a) * 11); camera.lookAt(0, 1, 0); };
    L.potatoInternals = { RS, H, me, FUSE, bots, hostStep, hostThrow, throwAt, pickTarget, spotPos, ringR, handPos, isHost };
    return L;
  })();
