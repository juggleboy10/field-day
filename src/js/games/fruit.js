  // ================================================================ LEVEL: FRUIT SLASH (get active)
  // Fruit flies up in front of you; slice it with a katana in each hand before it falls. Don't touch the bombs.
  // Classic: three dropped fruit and you're out, and a bomb ends it. Arcade: 60 seconds, bombs cost 10 points, and
  // golden fruit are worth 5. Slice three or more in one swing for a combo.
  // VR: swing the swords (a sword only cuts when it's moving). Browser: the mouse is the blade, swipe through the fruit.
  const fruit = (() => {
    const L = newLevel(55);
    const G = L.group;
    const rand = mulberry32(5555);
    L.grabless = true;
    L.bounds = { minX: -6, maxX: 6, minZ: -1, maxZ: 3 };
    L.env = {
      sky: skyTexture([[0, '#2a1a4a'], [0.42, '#c8507a'], [0.5, '#ffb070'], [0.53, '#5a3a3a'], [1, '#2a1a1a']]),
      bg: 0x5a3050, fog: [0x7a4a5a, 30, 120], hemi: [0xffd8c0, 0x4a3040, 0.85],
      sun: [0xffc890, 0.75], sunDir: new V3(-0.4, 0.5, -0.8), ambient: [0x6a4a5a, 0.45], sprite: null,
    };
    const N_SLOT = 4, SLOT_W = 3.2, FZ = -1.35, G_F = 6.5;   // where the fruit flies (in front of you), and its gravity
    const slotX = (k) => [0, -SLOT_W, SLOT_W, -2 * SLOT_W][k];

    // ---------------------------------------------------------------- the dojo garden
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), lam(0x8a5a3a)); deck.rotation.x = -Math.PI / 2; deck.position.set(0, 0, 0.5); G.add(deck);
    for (let i = 0; i < 16; i++) addBox(G, 16, 0.005, 0.02, lam(0x6a4028), 0, 0.003, -3.4 + i * 0.5);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), lam(0x3a4a2a)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; G.add(ground);
    // a big wooden wall behind the fruit (the juice splats on it)
    const WALL_Z = -3.6;
    addBox(G, 16, 3.6, 0.2, lam(0x7a4a2a), 0, 1.8, WALL_Z - 0.1);
    for (let i = -7; i <= 7; i++) addBox(G, 0.08, 3.6, 0.06, lam(0x5a3018), i, 1.8, WALL_Z + 0.02);
    addBox(G, 16.4, 0.3, 0.4, lam(0x3a2010), 0, 3.7, WALL_Z);
    makePlate(G, '\u{1F349}  FRUIT SLASH', 3.6, 0.5, new V3(0, 3.1, WALL_Z + 0.07), 0, { bg: '#c8302a', fg: '#fff4e0', size: 0.62 });
    // bamboo and paper lanterns
    for (let i = 0; i < 26; i++) { const x = (i < 13 ? -1 : 1) * (6.6 + rand() * 2.5), z = -3 + rand() * 6, h = 3 + rand() * 3; addCyl(G, 0.05, 0.06, h, 6, lam(0x6a9a3a), x, h / 2, z); }
    const lanternM = new THREE.MeshLambertMaterial({ color: 0xff8a4a, emissive: 0xc84a1a });
    for (const x of [-5, -2.5, 0, 2.5, 5]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), lanternM); l.scale.y = 1.3; l.position.set(x, 3.35, WALL_Z + 0.4); G.add(l); addCyl(G, 0.01, 0.01, 0.2, 4, lam(0x2a2a2a), x, 3.6, WALL_Z + 0.4); }

    // ---------------------------------------------------------------- fruit
    const stripeTex = canvasTexture(128, 64, (g) => { g.fillStyle = '#2a7a2a'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#1a4a1a'; for (let i = 0; i < 8; i++) g.fillRect(i * 16 + 4, 0, 6, 64); }).tex;
    const KINDS = [
      { id: 'apple', r: 0.075, skin: 0xd8302a, flesh: 0xfff0c8, juice: 0xfff0a0 },
      { id: 'orange', r: 0.08, skin: 0xff8a1a, flesh: 0xffb84a, juice: 0xffa020 },
      { id: 'melon', r: 0.15, skin: 0x2a7a2a, flesh: 0xff4a5a, juice: 0xff3a4a, tex: stripeTex },
      { id: 'lemon', r: 0.065, skin: 0xffe02a, flesh: 0xfff4a0, juice: 0xffee5a, sy: 1.25 },
      { id: 'coconut', r: 0.1, skin: 0x6a4020, flesh: 0xffffff, juice: 0xf8f8f0 },
      { id: 'plum', r: 0.065, skin: 0x7a2a8a, flesh: 0xd8e05a, juice: 0xb04ab0 },
      { id: 'peach', r: 0.075, skin: 0xffa070, flesh: 0xffd060, juice: 0xffb050 },
      { id: 'gold', r: 0.08, skin: 0xffd23f, flesh: 0xfff4b0, juice: 0xffe060, gold: true },
    ];
    for (const k of KINDS) {
      k.whole = new THREE.SphereGeometry(k.r, 18, 12);
      k.skinM = new THREE.MeshLambertMaterial(k.tex ? { map: k.tex } : { color: k.skin, emissive: k.gold ? 0x6a4a00 : 0x000000 });
      k.half = new THREE.SphereGeometry(k.r, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      k.cap = new THREE.CircleGeometry(k.r * 0.97, 18);
      k.fleshM = new THREE.MeshLambertMaterial({ color: k.flesh, side: THREE.DoubleSide });
    }
    const bombGeo = new THREE.SphereGeometry(0.1, 16, 12), bombM = lam(0x1a1a22), fuseM = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    const POOL = 14, items = [];
    for (let i = 0; i < POOL; i++) {
      const g = new THREE.Group(); g.visible = false; G.add(g);
      const halves = [0, 1].map(() => { const h = new THREE.Group(); h.visible = false; G.add(h); return h; });
      items.push({ g, halves, on: false, p: new V3(), v: new V3(), spin: new V3(), kind: null, bomb: false, cut: false, t: 0, hp: [new V3(), new V3()], hv: [new V3(), new V3()] });
    }
    function dress(it) {
      it.g.clear(); for (const h of it.halves) h.clear();
      if (it.bomb) {
        it.g.add(new THREE.Mesh(bombGeo, bombM));
        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 5), lam(0x8a6a3a)); fuse.position.y = 0.12; it.g.add(fuse);
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), fuseM); spark.position.y = 0.16; it.g.add(spark); it.spark = spark;
        return;
      }
      const k = it.kind, whole = new THREE.Mesh(k.whole, k.skinM); whole.scale.y = k.sy || 1; it.g.add(whole);
      if (k.id === 'apple' || k.id === 'peach') { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 4), lam(0x4a3018)); st.position.y = k.r; it.g.add(st); }
      for (const h of it.halves) { const sk = new THREE.Mesh(k.half, k.skinM); sk.scale.y = k.sy || 1; h.add(sk); const c = new THREE.Mesh(k.cap, k.fleshM); c.rotation.x = Math.PI / 2; h.add(c); }
    }

    // ---------------------------------------------------------------- juice: a burst of drops and a splat on the wall
    const DROPS = [];
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.015, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.visible = false; G.add(m); DROPS.push({ m, p: new V3(), v: new V3(), t: 0 }); }
    const splatTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 34, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + (i % 3), r = 38 + (i * 13) % 22; g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 5 + (i % 4) * 3, 0, Math.PI * 2); g.fill(); } }).tex;
    const SPLATS = [];
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: splatTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.position.z = WALL_Z + 0.06; G.add(m); SPLATS.push({ m, t: 99 }); }
    let dropI = 0, splatI = 0;
    function juice(p, col, dir) {
      for (let i = 0; i < 8; i++) {
        const d = DROPS[dropI++ % DROPS.length];
        d.p.copy(p); d.v.set((rand() - 0.5) * 2.5 + dir.x * 0.5, rand() * 2.2, (rand() - 0.5) * 1.5 - 0.6); d.t = 0;
        d.m.material.color.setHex(col); d.m.visible = true;
      }
      const s = SPLATS[splatI++ % SPLATS.length];
      s.m.position.x = clamp(p.x + (rand() - 0.5) * 0.6, -7.5, 7.5); s.m.position.y = clamp(p.y + 0.4 + rand() * 0.6, 0.4, 3.2); s.m.rotation.z = rand() * 6;
      s.m.material.color.setHex(col); s.t = 0; s.m.scale.setScalar(0.6 + rand() * 0.6);
    }
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); flash.visible = false; G.add(flash);

    // ---------------------------------------------------------------- the swords
    function makeKatana() {
      const g = new THREE.Group();
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.22, 8), lam(0x2a1a2a)); grip.rotation.x = Math.PI / 2; grip.position.z = 0.02; g.add(grip);
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), lam(0xc8a040)); guard.rotation.x = Math.PI / 2; guard.position.z = -0.1; g.add(guard);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.032, 0.85), new THREE.MeshLambertMaterial({ color: 0xe8eef4, emissive: 0x404850 })); blade.position.z = -0.53; g.add(blade);
      const trail = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.05, 0.85), new THREE.MeshBasicMaterial({ color: 0x9af0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); trail.position.z = -0.53; g.add(trail);
      g.userData.trail = trail; g.visible = false; L.overlay.add(g);
      return g;
    }
    const swords = { left: makeKatana(), right: makeKatana(), flat: makeKatana() };
    // each sword's edge now and a frame ago (from the guard to the tip)
    const edge = {};
    for (const s of ['left', 'right', 'flat']) edge[s] = { a: new V3(), b: new V3(), pa: new V3(), pb: new V3(), ok: false, speed: 0, combo: 0, comboT: 0 };
    function poseSword(side, pos, quat, dt) {
      const g = swords[side], E = edge[side];
      g.position.copy(pos); g.quaternion.copy(quat); g.visible = true;
      E.pa.copy(E.a); E.pb.copy(E.b);
      E.a.set(0, 0, -0.12).applyQuaternion(quat).add(pos); E.b.set(0, 0, -0.96).applyQuaternion(quat).add(pos);
      if (!E.ok) { E.pa.copy(E.a); E.pb.copy(E.b); }
      E.ok = true; E.speed = E.b.distanceTo(E.pb) / Math.max(dt, 1e-3);
      g.userData.trail.material.opacity = clamp((E.speed - 1.5) / 6, 0, 0.7);
    }
    // the browser sword: its tip follows the mouse on the plane where the fruit flies
    const mouse = { x: 0, y: -0.1 };
    renderer.domElement.addEventListener('pointermove', (e) => { const r = renderer.domElement.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; });
    const ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _t = new V3(), _h = new V3(), _w = new V3(), _q = new Q4(), _m4 = new THREE.Matrix4(), _up = new V3(0, 1, 0);
    function flatSword(dt) {
      _ndc.set(mouse.x, mouse.y); camera.updateMatrixWorld(true); ray.setFromCamera(_ndc, camera);
      const o = ray.ray.origin, d = ray.ray.direction, zp = dolly.position.z + FZ;
      if (Math.abs(d.z) < 1e-4) return;
      _t.copy(o).addScaledVector(d, (zp - o.z) / d.z);                     // the tip
      camera.getWorldPosition(_h); _h.y -= 0.55; _h.z -= 0.25; _h.x += 0.2;    // the hand, low in front of you
      _w.subVectors(_t, _h).normalize();
      _m4.lookAt(_h, _t, _up); _q.setFromRotationMatrix(_m4);
      const hand = _t.clone().addScaledVector(_w, -0.96);
      poseSword('flat', hand, _q, dt);
    }

    // ---------------------------------------------------------------- the game
    const S = { ph: 'idle', mode: 'classic', score: 0, lives: 3, t0: 0, next: 0, wave: 0, best: { classic: 0, arcade: 0 }, slot: 0, bigCombo: 0 };
    try { if (prefs.fruitBest && typeof prefs.fruitBest === 'object') Object.assign(S.best, prefs.fruitBest); } catch (e) { /* none */ }
    L.fruitS = S;
    const ox = () => slotX(S.slot);
    const timeLeft = () => Math.max(0, 60 - (performance.now() - S.t0) / 1000);
    function start(mode) {
      Object.assign(S, { ph: 'play', mode, score: 0, lives: 3, t0: performance.now(), next: 0.6, wave: 0, bigCombo: 0 });
      for (const it of items) { it.on = false; it.g.visible = false; for (const h of it.halves) h.visible = false; }
      sfx('whistle', 0.6);
      forcePresence(); state.dirtyBoard = true; state.hudDirty = true; boardKey = '';
    }
    L.start = start;
    function end(why) {
      if (S.ph !== 'play') return;
      S.ph = 'over'; S.why = why;
      const isBest = S.score > (S.best[S.mode] || 0);
      if (isBest) { S.best[S.mode] = S.score; prefs.fruitBest = Object.assign({}, S.best); savePrefs(); }
      RECORDS.add(L, S.mode, S.score);
      if (S.bigCombo >= 3) RECORDS.add(L, 'combo', S.bigCombo);
      showToast(`${why} ${S.score} points${isBest ? ' (your best!)' : ''}`);
      sfx(S.score >= 60 ? 'fanfare' : 'chime', 0.8);
      forcePresence(); state.dirtyBoard = true; state.hudDirty = true; boardKey = '';
    }
    L.end = end;
    // throw one item up into the air in front of you
    function launch(bomb, gold) {
      const it = items.find((x) => !x.on && !x.halves[0].visible) || items.find((x) => !x.on);
      if (!it) return null;
      it.bomb = bomb; it.kind = bomb ? null : gold ? KINDS[7] : KINDS[Math.floor(rand() * 7)];
      dress(it);
      const x0 = (rand() - 0.5) * 2.4, apex = 1.25 + rand() * 0.7, vy = Math.sqrt(2 * G_F * (apex + 0.3));
      const T = 2 * vy / G_F, x1 = (rand() - 0.5) * 1.4;
      it.p.set(ox() + x0, -0.3, dolly.position.z + FZ + (rand() - 0.5) * 0.4);
      it.v.set((x1 - x0) / T, vy, 0); it.spin.set((rand() - 0.5) * 6, (rand() - 0.5) * 6, (rand() - 0.5) * 6);
      it.on = true; it.cut = false; it.t = 0; it.g.visible = true; it.g.rotation.set(0, 0, 0);
      tone(220 + rand() * 80, 400, 0.12, 'sine', 0.06);
      return it;
    }
    L.launch = launch;
    // a wave: a few fruit, sometimes a bomb, more as the game goes on
    function spawnWave() {
      S.wave += 1;
      const el = (performance.now() - S.t0) / 1000;
      const n = Math.min(5, 1 + Math.floor(rand() * (2 + el / 20)));
      const bombP = S.mode === 'arcade' ? 0.22 : clamp(0.06 + el / 300, 0.06, 0.25);
      for (let i = 0; i < n; i++) setTimeout(() => { if (S.ph === 'play' && state.level === L.idx) launch(false, S.mode === 'arcade' && rand() < 0.07); }, i * 140);
      if (rand() < bombP) launch(true, false);
      S.next = Math.max(0.9, 2.2 - el / 40) + rand() * 0.6;
    }
    // a cut: the fruit splits along the swing, the halves fly apart
    function slice(it, side, dir) {
      it.on = false; it.cut = true; it.g.visible = false;
      if (it.bomb) {
        flash.position.copy(it.p); flash.scale.setScalar(2.5); flash.material.color.setHex(0xffffff); flash.visible = true; flash.userData.t = 0;
        sfx('slam', 1); tone(80, 30, 0.6, 'sawtooth', 0.3);
        if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 1, 250);
        if (S.mode === 'classic') { end('Boom!'); return; }
        S.score = Math.max(0, S.score - 10); spawnFloat('-10', it.p.clone().add(new V3(0, 0.3, 0)), '#ff6a5a');
        forcePresence(); state.dirtyBoard = true;
        return;
      }
      const k = it.kind, pts = k.gold ? 5 : 1;
      S.score += pts;
      const E = edge[side]; E.combo = performance.now() - E.comboT < 300 ? E.combo + 1 : 1; E.comboT = performance.now();
      if (E.combo >= 3) { S.score += 1; S.bigCombo = Math.max(S.bigCombo, E.combo); spawnFloat(`${E.combo}x combo!`, it.p.clone().add(new V3(0, 0.45, 0)), '#ffd23f'); }
      else if (pts > 1) spawnFloat(`+${pts}`, it.p.clone().add(new V3(0, 0.3, 0)), '#ffd23f');
      // the cut plane: along the swing, facing you
      const n = _w.set(dir.x, dir.y, 0); if (n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize(); n.set(-n.y, n.x, 0);
      it.halves.forEach((h, i) => {
        const s = i ? -1 : 1;
        h.quaternion.setFromUnitVectors(_up, _t.copy(n).multiplyScalar(s));
        it.hp[i].copy(it.p); it.hv[i].copy(it.v).multiplyScalar(0.4).addScaledVector(n, s * 1.4).add(_h.set(dir.x * 0.15, 0.5, 0));
        h.position.copy(it.p); h.visible = true;
      });
      it.t = 0;
      juice(it.p, k.juice, dir);
      tone(900 + rand() * 300, 300, 0.08, 'sawtooth', 0.06); sfx('swish', 0.4);
      if (state.mode === 'vr' && side !== 'flat') haptic(vrHands[side], 0.6, 25);
      forcePresence(); state.dirtyBoard = true;
    }
    L.slice = slice;
    // does a sword's sweep since last frame cross a ball of radius r at p?
    const _s0 = new V3(), _s1 = new V3(), _cl = new V3(), _sd = new V3();
    function sweepHit(E, p, r) {
      for (let k = 0; k <= 8; k++) {
        const f = 0.1 + (k / 8) * 0.9;
        _s0.lerpVectors(E.pa, E.pb, f); _s1.lerpVectors(E.a, E.b, f);
        _sd.subVectors(_s1, _s0);
        const len2 = _sd.lengthSq(), u = len2 > 1e-9 ? clamp(_cl.subVectors(p, _s0).dot(_sd) / len2, 0, 1) : 0;
        _cl.copy(_s0).addScaledVector(_sd, u);
        if (_cl.distanceTo(p) < r) return _sd.clone();
      }
      return null;
    }

    // ---------------------------------------------------------------- the scoreboard on the wall
    const sc = canvasTexture(512, 160);
    const scM = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.56), new THREE.MeshBasicMaterial({ map: sc.tex })); scM.position.set(0, 2.55, WALL_Z + 0.08); G.add(scM);
    let boardKey = '';
    function drawSc() {
      const t = S.ph === 'play' && S.mode === 'arcade' ? Math.ceil(timeLeft()) : 0;
      const key = `${S.ph}|${S.score}|${S.lives}|${t}|${S.mode}`;
      if (key === boardKey) return; boardKey = key;
      const g = sc.g;
      g.fillStyle = '#2a140c'; g.fillRect(0, 0, 512, 160); g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 154);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (S.ph !== 'play') {
        g.fillStyle = '#ffd23f'; g.font = `800 44px ${DISPLAY}`; g.fillText(S.ph === 'over' ? `${S.score} points` : 'Fruit Slash', 256, 52);
        g.fillStyle = '#fff4e0'; g.font = `400 26px ${BODY}`; g.fillText(`Best: classic ${S.best.classic} · arcade ${S.best.arcade}`, 256, 112);
      } else {
        g.fillStyle = '#ffffff'; g.font = `900 84px ${DISPLAY}`; g.fillText(String(S.score), 150, 84);
        g.font = `800 46px ${DISPLAY}`;
        if (S.mode === 'classic') { g.fillStyle = '#ff6a5a'; g.fillText('✖'.repeat(3 - S.lives) + '○'.repeat(S.lives), 380, 84); }
        else { g.fillStyle = t <= 10 ? '#ff6a5a' : '#ffd23f'; g.fillText(`${t}s`, 380, 84); }
      }
      sc.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    function stand() {
      const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      ids.sort(); S.slot = Math.max(0, ids.indexOf(state.myPeer)) % N_SLOT;
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += slotX(S.slot) - c.x; dolly.position.z += 0 - c.z;
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { for (const s of ['left', 'right', 'flat']) { swords[s].visible = false; edge[s].ok = false; } return; }
      // the swords
      for (const s of SIDES) { const mh = myHands[s]; if (state.mode === 'vr' && mh.ok) poseSword(s, mh.pos, mh.quat, dt); else { swords[s].visible = false; edge[s].ok = false; } }
      if (state.mode === 'flat') flatSword(dt); else { swords.flat.visible = false; edge.flat.ok = false; }
      // VR: A or X starts a classic game, B or Y an arcade one
      if (state.mode === 'vr' && S.ph !== 'play') {
        for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; const a = gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed, b = gp && gp.buttons && gp.buttons[5] && gp.buttons[5].pressed; if (a && !S.aPrev) start('classic'); if (b && !S.aPrev) start('arcade'); S.aPrev = a || b; }
      }
      if (S.ph === 'play') {
        S.next -= dt;
        if (S.next <= 0) spawnWave();
        if (S.mode === 'arcade' && timeLeft() <= 0) end('Time!');
      }
      // flight, cuts and drops
      for (const it of items) {
        if (it.on) {
          it.v.y -= G_F * dt; it.p.addScaledVector(it.v, dt); it.t += dt;
          it.g.position.copy(it.p); it.g.rotation.x += it.spin.x * dt; it.g.rotation.y += it.spin.y * dt; it.g.rotation.z += it.spin.z * dt;
          if (it.spark) it.spark.scale.setScalar(0.7 + Math.random() * 0.8);
          const r = it.bomb ? 0.1 : it.kind.r;
          for (const s of ['left', 'right', 'flat']) {
            const E = edge[s];
            if (!E.ok || E.speed < (s === 'flat' ? 0.8 : 1.6)) continue;
            const hit = sweepHit(E, it.p, r + 0.03);
            if (hit) { slice(it, s, hit); break; }
          }
          if (it.on && it.p.y < -0.4 && it.v.y < 0) {
            it.on = false; it.g.visible = false;
            if (!it.bomb && S.ph === 'play' && S.mode === 'classic') { S.lives -= 1; sfx('buzzer', 0.3); spawnFloat('Dropped!', new V3(it.p.x, 0.6, it.p.z), '#ff6a5a'); if (S.lives <= 0) end('Three dropped!'); forcePresence(); }
          }
        }
        if (it.halves[0].visible) {
          it.t += dt;
          it.halves.forEach((h, i) => { it.hv[i].y -= G_F * dt; it.hp[i].addScaledVector(it.hv[i], dt); h.position.copy(it.hp[i]); h.rotateOnAxis(_t.set(1, 0, 0), dt * 4 * (i ? 1 : -1)); });
          if (it.t > 1.6) for (const h of it.halves) h.visible = false;
        }
      }
      for (const d of DROPS) { if (!d.m.visible) continue; d.t += dt; d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt); d.m.position.copy(d.p); if (d.t > 0.8 || d.p.y < 0) d.m.visible = false; }
      for (const s of SPLATS) { s.t += dt; s.m.material.opacity = s.t < 6 ? 0.85 * (1 - s.t / 6) : 0; }
      if (flash.visible) { flash.userData.t += dt; flash.material.opacity = 1 - flash.userData.t / 0.4; if (flash.userData.t > 0.4) flash.visible = false; }
      drawSc();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'play' ? `${S.score} point${S.score === 1 ? "" : "s"}  ·  ${S.mode === 'classic' ? `${S.lives} lives` : `${Math.ceil(timeLeft())} s`}  ·  swipe the mouse through the fruit` : 'Fruit Slash  ·  pick Classic or Arcade (buttons at the top)';
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    // the browser view: fixed, looking at the fruit; the mouse moves the sword, not the view
    L.flatCamera = () => { camera.position.set(0, 1.5, 1.4); camera.rotation.set(-0.03, 0, 0, 'YXZ'); state.yaw = 0; state.pitch = -0.03; return true; };
    L.presence = () => ({ fs: [S.score, Math.max(S.best.classic, S.best.arcade), S.ph === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.fs;
      if (!Array.isArray(a) || a.length !== 3 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) { st.fs = null; return; }
      if (!st.fs || st.fs.join() !== a.join()) state.dirtyBoard = true;
      st.fs = a;
    };
    L.rowFor = (st, isMe) => { const a = isMe ? L.presence().fs : st.fs; if (!a) return { best: 0, text: '' }; return { best: a[1], text: `${a[2] ? `${a[0]} now · ` : ''}best ${a[1]}` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.6, 1.9, 0.6, Math.PI / 2);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#2a140c'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Fruit masters', 36, 80);
      g.fillStyle = '#fff4e0'; g.font = `400 24px ${BODY}`; g.fillText('Best score, classic or arcade', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 4.6, 1.8, -Math.PI * 0.6);
    RECORDS.def(L, [{ k: 'classic', label: 'Classic: best score' }, { k: 'arcade', label: 'Arcade: best in 60 s' }, { k: 'combo', label: 'Biggest combo' }]);
    L.hudActions = [
      { label: () => (S.ph === 'play' && S.mode === 'classic' ? 'Restart classic' : 'Classic'), run: () => start('classic') },
      { label: () => (S.ph === 'play' && S.mode === 'arcade' ? 'Restart arcade' : 'Arcade (60 s)'), run: () => start('arcade') },
    ];
    L.hints = [['A / X', 'classic game'], ['B / Y', 'arcade (60 s)'], ['Swing', 'slice the fruit, miss the bombs']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Mouse', 'swipe through the fruit'], ['Bombs', 'don’t touch!']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { S.ph = 'idle'; boardKey = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; S.ph = 'idle'; for (const it of items) { it.on = false; it.g.visible = false; for (const h of it.halves) h.visible = false; } };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 1.7, 2.4); camera.lookAt(0, 1.5, -2); };
    L.fruitInternals = { S, items, launch, slice, start, end, edge, sweepHit, KINDS, spawnWave };
    MUSIC_THEMES.fruit = { gain: 0.6, bpm: 120, swing: 0.05, chords: ['Am', 'Em', 'F', 'G'], arp: { inst: 'pluck', every: 1, order: [1, 3, 2, 4, 3, 2, 1, 2], up: 12 }, bass: { at: [0, 6, 10] }, drums: { k: 'x.....x...x.....', s: '....x.......x...', sh: '-o-o-o-o-o-o-o-o' }, cut: 4200 };
    ENDGAME.on(L, { active: () => S.ph === 'play', end: () => { S.ph = 'idle'; for (const it of items) { it.on = false; it.g.visible = false; for (const h of it.halves) h.visible = false; } forcePresence(); return ''; } });
    return L;
  })();
