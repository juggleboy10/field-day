  // ================================================================ LEVEL: MAPLE HOLLOW DISC GOLF
  const discgolf = (() => {
    const L = newLevel(2);
    const G = L.group;
    const rand = mulberry32(99);
    const HOLES = [
      { tee: new V3(0, 0, 2), basket: new V3(-4, 0, -34), par: 3 },
      { tee: new V3(4, 0, -41), basket: new V3(38, 0, -60), par: 3 },
      { tee: new V3(44, 0, -53), basket: new V3(25, 0, -12), par: 3 },
      // three more, looping east past the pond and back toward the start
      { tee: new V3(32, 0, -8), basket: new V3(60, 0, 14), par: 3, name: 'Pond carry' },
      { tee: new V3(66, 0, 22), basket: new V3(52, 0, 58), par: 4, name: 'The dogleg' },
      { tee: new V3(44, 0, 62), basket: new V3(12, 0, 30), par: 4, name: 'Homeward' },
    ];
    for (const h of HOLES) {
      h.dir = new V3().subVectors(h.basket, h.tee).setY(0);
      h.len = Math.round(h.dir.length());
      h.dir.normalize();
      h.right = new V3(-h.dir.z, 0, h.dir.x);
      h.yaw = Math.atan2(-h.dir.x, -h.dir.z);
    }
    const AREA = { minX: -45, maxX: 95, minZ: -105, maxZ: 75 };
    L.bounds = AREA;
    L.env = {
      sky: skyTexture([[0, '#5b8fd0'], [0.3, '#8db7e3'], [0.46, '#d9e6ee'], [0.5, '#f6e3c3'], [0.53, '#d8c9a6'], [1, '#7b6a4a']]),
      bg: 0xcfdcea, fog: [0xeadcc4, 50, 260], hemi: [0xfff1dd, 0x6b5a3a, 0.95],
      sun: [0xffe0b0, 0.9], sunDir: new V3(-0.6, 0.45, -0.5), ambient: [0x806a50, 0.3],
      sprite: { tex: paleSunTex, pos: new V3(-276, 208, -231), scale: 70 },
    };

    // ground
    const meadow = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#86a04a'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = rand() < 0.5 ? 'rgba(150,170,80,0.35)' : 'rgba(100,125,55,0.3)';
        g.beginPath(); g.arc(rand() * 256, rand() * 256, 10 + rand() * 30, 0, Math.PI * 2); g.fill();
      }
      for (let i = 0; i < 5000; i++) {
        const r = Math.random();
        g.fillStyle = r < 0.04 ? 'rgba(230,190,70,0.6)' : r < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(40,60,10,0.08)';
        g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
    });
    meadow.tex.wrapS = meadow.tex.wrapT = THREE.RepeatWrapping;
    meadow.tex.repeat.set(50, 50);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshLambertMaterial({ map: meadow.tex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(20, 0, -30);
    G.add(ground);

    // fairways, tee pads, tee signs
    const fairTex = canvasTexture(64, 8, (g) => {
      const gr = g.createLinearGradient(0, 0, 64, 0);
      gr.addColorStop(0, 'rgba(170,196,96,0)');
      gr.addColorStop(0.2, 'rgba(170,196,96,0.85)');
      gr.addColorStop(0.8, 'rgba(170,196,96,0.85)');
      gr.addColorStop(1, 'rgba(170,196,96,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 8);
    }).tex;
    const concrete = lam(0xb7b1a6);
    HOLES.forEach((h, i) => {
      const yaw = Math.atan2(h.dir.x, h.dir.z);
      const fw = new THREE.Mesh(new THREE.PlaneGeometry(9, h.len + 8), new THREE.MeshLambertMaterial({ map: fairTex, transparent: true, depthWrite: false }));
      fw.rotation.x = -Math.PI / 2;
      const fg = new THREE.Group();
      fg.add(fw);
      fg.position.copy(h.tee).lerp(h.basket, 0.5).setY(0.004);
      fg.rotation.y = yaw;
      G.add(fg);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 3.0), concrete);
      pad.position.copy(h.tee).addScaledVector(h.dir, -0.8).setY(0.03);
      pad.rotation.y = yaw;
      G.add(pad);
      const sp = new V3().copy(h.tee).addScaledVector(h.right, 1.7).addScaledVector(h.dir, -0.6);
      addCyl(G, 0.04, 0.04, 1.2, 6, legMat, sp.x, 0.6, sp.z);
      makePlate(G, `Hole ${i + 1}   ${h.len} m   par ${h.par}`, 1.3, 0.3, sp.clone().setY(1.32), Math.atan2(-h.dir.x, -h.dir.z) + 0.5, { size: 0.5, bg: '#3b2a1e', fg: '#ffe8c2' });
    });

    // baskets
    const yellow = lam(0xffc93c), metal = lam(0x9aa0ad);
    const chainMat = new THREE.LineBasicMaterial({ color: 0xd4d8e2 });
    HOLES.forEach((h, i) => {
      const B = h.basket;
      addCyl(G, 0.025, 0.025, 1.75, 8, metal, B.x, 0.875, B.z);
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.2, 20, 1, true), new THREE.MeshLambertMaterial({ color: 0xffc93c, side: THREE.DoubleSide }));
      tray.position.set(B.x, 0.62, B.z);
      G.add(tray);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.27, 20), metal);
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.set(B.x, 0.52, B.z);
      G.add(bottom);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.015, 6, 28), yellow);
      band.rotation.x = Math.PI / 2;
      band.position.set(B.x, 1.38, B.z);
      G.add(band);
      const pts = [];
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        const p0 = new V3(B.x + Math.cos(a) * 0.3, 1.38, B.z + Math.sin(a) * 0.3);
        const p1 = new V3(B.x + Math.cos(a + 0.35) * 0.2, 1.1, B.z + Math.sin(a + 0.35) * 0.2);
        const p2 = new V3(B.x + Math.cos(a + 0.5) * 0.05, 0.86, B.z + Math.sin(a + 0.5) * 0.05);
        pts.push(p0, p1, p1, p2);
      }
      G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), chainMat));
      const capM = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 16), yellow);
      capM.position.set(B.x, 1.44, B.z);
      G.add(capM);
      for (const flip of [0, Math.PI]) makePlate(G, String(i + 1), 0.2, 0.2, new V3(B.x + Math.sin(flip) * 0.03, 1.66, B.z + Math.cos(flip) * 0.03), flip, { bg: '#ffc93c', fg: '#1b1932', size: 0.8 });
    });

    // trees
    const trees = [];
    function segDist(px, pz, a, b) {
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      return Math.hypot(px - (a.x + dx * t), pz - (a.z + dz * t));
    }
    function addTree(x, z, cr, force) {
      if (!force) {
        for (const h of HOLES) {
          if (segDist(x, z, h.tee, h.basket) < 6.5 + cr * 0.6) return false;
          if (Math.hypot(x - h.tee.x, z - h.tee.z) < 7 || Math.hypot(x - h.basket.x, z - h.basket.z) < 6) return false;
        }
        for (const t of trees) if (Math.hypot(x - t.x, z - t.z) < (t.cr + cr) * 0.75) return false;
      }
      const th = 2.6 + rand() * 2.2;
      trees.push({ x, z, tr: 0.18 + cr * 0.06, th, cr, cy: th + cr * 0.55 });
      return true;
    }
    // a pond for hole 4 to carry over (trees keep clear of it)
    const POND = { x: 47, z: 4, r: 7 };
    trees.push({ x: POND.x, z: POND.z, tr: 0, th: 0, cr: POND.r, cy: -50 });
    for (let n = 0; trees.length < 260 && n < 6000; n++) {
      addTree(lerp(AREA.minX - 12, AREA.maxX + 12, rand()), lerp(AREA.minZ - 12, AREA.maxZ + 12, rand()), 1.8 + rand() * 1.9, false);
    }
    {
      const h2 = HOLES[1], h3 = HOLES[2];
      const m2 = h2.tee.clone().lerp(h2.basket, 0.55).addScaledVector(h2.right, 2.4);
      addTree(m2.x, m2.z, 2.7, true);
      const m3 = h3.tee.clone().lerp(h3.basket, 0.45).addScaledVector(h3.right, -2.6);
      addTree(m3.x, m3.z, 2.5, true);
      // a big maple guarding the corner of the dogleg
      const h5 = HOLES[4], m5 = h5.tee.clone().lerp(h5.basket, 0.5).addScaledVector(h5.right, -1.6);
      addTree(m5.x, m5.z, 3.2, true);
    }
    {
      const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 40), new THREE.MeshLambertMaterial({ color: 0x4a8ab8, emissive: 0x0a2a40 }));
      water.rotation.x = -Math.PI / 2; water.position.set(POND.x, 0.02, POND.z); G.add(water);
      const bank = new THREE.Mesh(new THREE.RingGeometry(POND.r, POND.r + 0.7, 40), lam(0x8a7a5a));
      bank.rotation.x = -Math.PI / 2; bank.position.set(POND.x, 0.015, POND.z); G.add(bank);
      for (let k = 0; k < 10; k++) { const a = rand() * Math.PI * 2; const r = addCyl(G, 0.04, 0.04, 1.0, 5, lam(0x6a7a3a), POND.x + Math.cos(a) * (POND.r - 0.4), 0.5, POND.z + Math.sin(a) * (POND.r - 0.4)); r.rotation.z = (rand() - 0.5) * 0.3; }
    }
    L.HOLES = HOLES;
    L.trees = trees;
    const AUTUMN = ['#d9642b', '#e8a33d', '#c2412d', '#f0c75e', '#9aa83a', '#b5532a', '#e37b2e'];
    {
      const N = trees.length;
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 1, 1, 7), lam(0x5a4030), N);
      const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lam(0xffffff), N);
      const m4 = new THREE.Matrix4(), q = new Q4(), s = new V3(), p = new V3(), col = new THREE.Color();
      trees.forEach((t, i) => {
        m4.compose(p.set(t.x, (t.th + t.cr * 0.4) / 2, t.z), q.identity(), s.set(t.tr, t.th + t.cr * 0.4, t.tr));
        trunks.setMatrixAt(i, m4);
        q.setFromAxisAngle(UP, rand() * 6);
        m4.compose(p.set(t.x, t.cy, t.z), q, s.set(t.cr, t.cr * 0.85, t.cr));
        crowns.setMatrixAt(i, m4);
        crowns.setColorAt(i, col.set(AUTUMN[Math.floor(rand() * AUTUMN.length)]));
      });
      trunks.frustumCulled = crowns.frustumCulled = false;
      G.add(trunks, crowns);
      const NL = 600;
      const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), NL);
      for (let i = 0; i < NL; i++) {
        const t = trees[Math.floor(rand() * N)];
        const a = rand() * Math.PI * 2, d = rand() * (t.cr + 1.2);
        q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rand() * 6));
        m4.compose(p.set(t.x + Math.cos(a) * d, 0.012, t.z + Math.sin(a) * d), q, s.set(1, 1, 1));
        leaves.setMatrixAt(i, m4);
        leaves.setColorAt(i, col.set(AUTUMN[Math.floor(rand() * AUTUMN.length)]));
      }
      leaves.frustumCulled = false;
      G.add(leaves);
    }

    // boards, kiosk, buttons near the first tee
    L.board = makeBoard(G, 720, 460, 2.4, 1.533, -3.6, 2.0, 4.2, Math.PI / 2 - 0.45);
    const sign = makeBoard(G, 720, 500, 2.2, 1.528, 4.4, 1.95, 4.4, -Math.PI / 2 + 0.45);
    function drawSign() {
      const g = sign.g, W = 720;
      g.fillStyle = '#2a1d14'; g.fillRect(0, 0, W, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffe8c2'; g.font = `800 58px ${DISPLAY}`;
      g.fillText('How to play', 36, 78);
      const sections = [
        ['In VR', 'Your disc waits by your hand. Squeeze grip or trigger to hold it, then let go mid-throw. Tilt your hand to curve it. Left stick moves, right stick turns.'],
        ['In a browser', 'Aim with the mouse. Hold Space, then let go to throw; a longer hold throws farther.'],
        ['Scoring', 'After each throw you walk to your disc automatically. Three holes, par 3 each. Discs curve left as they slow down.'],
      ];
      let y = 124;
      for (const [label, body] of sections) {
        g.fillStyle = '#ffb34d'; g.font = `700 24px ${BODY}`;
        g.fillText(label, 36, y);
        y += 31;
        g.fillStyle = '#f2e6d4'; g.font = `400 24px ${BODY}`;
        y = wrapText(g, body, 36, y, 648, 30) + 12;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);
    makeKiosk(L, -2.4, 6.6, Math.PI);
    makeButton(L, new V3(2.3, 1.0, 6.4), 0xf5821f, 'Restart round', () => restartRound(), { faceYaw: Math.PI });

    // ---------------------------------------------------------------- my disc
    const KL = 0.21, KD = 0.08;
    L.stats = { hole: 0, strokes: 0, total: 0, done: 0, parDone: 0, last: -1, lastHole: -1 };
    const D = {
      mesh: makeDiscMesh(PLAYER_COLORS[state.colorIdx].hex), pos: new V3(), vel: new V3(), n: new V3(0, 1, 0),
      spin: 0, phase: 'ready', side: 'right', t0: 0, lie: new V3(), sliding: false, inLeaves: false, lastSnd: 0,
    };
    D.mesh.visible = false;
    G.add(D.mesh);
    L.disc = D;
    L.setColor = (hex) => setDiscColor(D.mesh, hex);
    const hole = () => HOLES[L.stats.hole];

    // a small readout that floats above the left wrist in VR
    const wrist = canvasTexture(256, 96);
    const wristMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.049), new THREE.MeshBasicMaterial({ map: wrist.tex, transparent: true, depthWrite: false }));
    wristMesh.visible = false;
    scene.add(wristMesh);
    let wristText = '';
    function drawWrist() {
      const s = L.stats;
      const t = D.phase === 'holed' ? 'In the basket!' : `Hole ${s.hole + 1}   throw ${s.strokes + 1}`;
      const sub = s.done ? `${toPar(s.total - s.parDone)} after ${s.done}` : `par ${hole().par}, ${hole().len} m`;
      const key = t + sub;
      if (key === wristText) return;
      wristText = key;
      const g = wrist.g;
      g.clearRect(0, 0, 256, 96);
      rr(g, 2, 2, 252, 92, 16); g.fillStyle = 'rgba(30,20,12,0.85)'; g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffe8c2'; g.font = `800 38px ${DISPLAY}`; g.fillText(t, 128, 36, 240);
      g.fillStyle = '#e8c79a'; g.font = `400 22px ${BODY}`; g.fillText(sub, 128, 72, 240);
      wrist.tex.needsUpdate = true;
    }

    function standAt(spot, faceTo) {
      // move the player so their head is over `spot`, keeping their real-world offset in VR
      camera.getWorldPosition(_hd);
      dolly.position.x += spot.x - _hd.x;
      dolly.position.z += spot.z - _hd.z;
      if (state.mode !== 'vr' && faceTo) {
        state.yaw = Math.atan2(-(faceTo.x - spot.x), -(faceTo.z - spot.z));
        state.pitch = -0.05;
      }
    }
    const _hd = new V3();
    function goToTee(i) {
      const h = HOLES[i];
      L.stats.hole = i;
      L.stats.strokes = 0;
      D.lie.copy(h.tee);
      D.phase = 'ready';
      standAt(h.tee.clone().addScaledVector(h.dir, -1.0), h.basket);
      state.hudDirty = true;
      forcePresence();
    }
    function restartRound() {
      Object.assign(L.stats, { hole: 0, strokes: 0, total: 0, done: 0, parDone: 0, last: -1, lastHole: -1 });
      if (D.phase === 'held') loseFromMyHand(D);
      goToTee(0);
      state.dirtyBoard = true;
      sfx('reset', 0.8);
    }
    L.restartRound = restartRound;

    function scoreWord(strokes, par) {
      if (strokes === 1) return 'an ace';
      const d = strokes - par;
      return d <= -2 ? 'an eagle' : d === -1 ? 'a birdie' : d === 0 ? 'par' : d === 1 ? 'a bogey' : d === 2 ? 'a double bogey' : `${strokes} throws`;
    }
    function scoreFloat(strokes, par) {
      if (strokes === 1) return 'Ace!';
      const d = strokes - par;
      return d <= -2 ? 'Eagle!' : d === -1 ? 'Birdie!' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : `+${d}`;
    }

    const _vh = new V3(), _ld = new V3(), _left = new V3(), _q = new Q4(), _qs = new Q4(), _hp = new V3(), _hr = new V3();
    L.canHoldDisc = () => state.mode === 'vr' && D.phase === 'ready';
    L.holdDisc = (side) => { D.phase = 'held'; D.side = side; sfx('grab', 0.6); };
    // returns true if the disc was actually thrown
    L.throwDisc = (vel, handQuat, now) => {
      if (vel.length() < 3) { D.phase = 'ready'; return false; }
      L.stats.strokes += 1;
      D.vel.copy(vel);
      if (D.vel.length() > 30) D.vel.setLength(30);
      _vh.copy(D.vel).normalize();
      D.float = !!handQuat;
      if (handQuat) {
        // VR: a frisbee leaves your hand nearly level whatever your arm does, nose up a little,
        // so an upward swing turns into a long glide instead of a lob
        const hl = Math.hypot(_vh.x, _vh.z) || 1;
        const launch = Math.atan2(_vh.y, hl), pitch = clamp(launch / 3 + 0.1, -0.1, 0.35);
        D.n.set(-(_vh.x / hl) * Math.sin(pitch), Math.cos(pitch), -(_vh.z / hl) * Math.sin(pitch)).normalize();
      } else {
        // browser: disc flat to its flight path, nose up 4 degrees
        D.n.copy(UP).addScaledVector(_vh, -UP.dot(_vh));
        if (D.n.lengthSq() < 1e-4) D.n.set(0, 0, 1);
        D.n.normalize().multiplyScalar(Math.cos(0.07)).addScaledVector(_vh, -Math.sin(0.07)).normalize();
      }
      if (handQuat) {
        // tilting the hand banks the disc (hyzer / anhyzer), limited to about 20 degrees
        _hr.set(1, 0, 0).applyQuaternion(handQuat);
        const roll = clamp(Math.asin(clamp(_hr.y, -1, 1)) * (D.side === 'left' ? -0.6 : 0.6), -0.35, 0.35);
        _q.setFromAxisAngle(_vh, -roll);
        D.n.applyQuaternion(_q).normalize();
      }
      D.phase = 'flying';
      D.t0 = now;
      D.sliding = false;
      D.inLeaves = false;
      sfx('whoosh', 1);
      state.hudDirty = true;
      forcePresence();
      return true;
    };

    let discQuiet = false;
    function discSound(kind, speed, dd = D) {
      if (discQuiet) return;
      const now = performance.now();
      if (now - (dd.lastSnd || 0) < 90) return;
      dd.lastSnd = now;
      sfx(kind, Math.min(1, speed / 10) / (1 + dd.pos.distanceTo(myHead.pos) * 0.12));
    }
    function holeOut(now) {
      const s = L.stats, h = hole();
      D.phase = 'holed';
      D.t0 = now;
      D.vel.set(0, 0, 0);
      D.pos.set(h.basket.x + (rand() - 0.5) * 0.18, 0.56, h.basket.z + (rand() - 0.5) * 0.18);
      D.n.set((rand() - 0.5) * 0.4, 1, (rand() - 0.5) * 0.4).normalize();
      s.total += s.strokes;
      s.parDone += h.par;
      s.done += 1;
      s.last = s.strokes;
      s.lastHole = s.hole;
      sfx('chains', 1);
      setTimeout(() => sfx('chime', 1), 250);
      spawnFloat(scoreFloat(s.strokes, h.par), new V3(h.basket.x, 2.1, h.basket.z), s.strokes < h.par ? '#ffd23f' : '#ffffff');
      const word = scoreWord(s.strokes, h.par);
      showToast(`${word.charAt(0).toUpperCase() + word.slice(1)} on hole ${s.hole + 1}`);
      if (state.mode === 'vr') for (const sd of SIDES) haptic(vrHands[sd], 0.5, 90);
      state.dirtyBoard = true;
      state.hudDirty = true;
      forcePresence();
    }

    // d and the hole default to your disc; the rival's disc and its practice flights pass their own (cb)
    function discStep(h, now, d = D, cb = null) {
      const v = d.vel, sp = v.length();
      if (!d.sliding && sp > 0.05) {
        _vh.copy(v).multiplyScalar(1 / sp);
        const ndv = d.n.dot(_vh);
        const alpha = Math.asin(clamp(-ndv, -1, 1));
        // VR throws are slower than a browser flick, so they get a little extra float as they slow
        const CL = (0.15 + 1.4 * alpha) * (d.float ? 1 + 0.6 * Math.max(0, 1 - sp / 20) : 1), CD = 0.08 + 2.72 * (alpha + 0.07) * (alpha + 0.07);
        _ld.copy(d.n).addScaledVector(_vh, -ndv);
        const ll = _ld.length();
        if (ll > 1e-4) v.addScaledVector(_ld, (KL * CL * sp * sp * h) / ll);
        v.addScaledVector(_vh, -KD * CD * sp * sp * h);
        // fade: as the disc slows it banks left; a fast disc turns slightly right first
        _left.crossVectors(d.n, _vh);
        let roll = 0;
        // (a VR throw flies more like a stable frisbee, so it fades much less)
        if (sp < 16) roll = (d.float ? 0.3 : 0.9) * (1 - sp / 16) * h;
        else if (sp > 21) roll = -0.25 * Math.min(1, (sp - 21) / 8) * h;
        if (roll) d.n.addScaledVector(_left, roll).normalize();
      }
      v.y -= GRAVITY * h;
      if (d.inLeaves) v.multiplyScalar(1 - 3.5 * h);
      d.pos.addScaledVector(v, h);

      // ground
      if (d.pos.y <= 0.012) {
        d.pos.y = 0.012;
        if (!d.sliding && v.y < -1.6) {
          discSound('disc', -v.y, d);
          v.y = -v.y * 0.18;
          v.x *= 0.6; v.z *= 0.6;
        } else {
          if (!d.sliding) discSound('disc', 3, d);
          d.sliding = true;
          v.y = 0;
          const hs = Math.hypot(v.x, v.z);
          const nd = Math.max(0, hs - 5.5 * h);
          if (hs > 1e-6) { v.x *= nd / hs; v.z *= nd / hs; }
          d.n.lerp(UP, Math.min(1, 6 * h)).normalize();
        }
      }
      // trees
      d.inLeaves = false;
      for (const t of (cb && cb.trees) || trees) {
        const dx = d.pos.x - t.x, dz = d.pos.z - t.z;
        if (Math.abs(dx) > t.cr + 0.3 || Math.abs(dz) > t.cr + 0.3) continue;
        const hd = Math.hypot(dx, dz);
        if (d.pos.y < t.cy && hd < t.tr + 0.1 && hd > 1e-4) {
          const nx = dx / hd, nz = dz / hd;
          d.pos.x = t.x + nx * (t.tr + 0.1);
          d.pos.z = t.z + nz * (t.tr + 0.1);
          const vn = v.x * nx + v.z * nz;
          if (vn < 0) {
            discSound('wood', -vn, d);
            v.x -= 1.3 * vn * nx; v.z -= 1.3 * vn * nz;
            v.multiplyScalar(0.55);
            d.n.lerp(new V3(nx, 0.3, nz), 0.5).normalize();
          }
        }
        const dy = (d.pos.y - t.cy) / 0.85;
        if (hd * hd + dy * dy < t.cr * t.cr * 0.8) {
          if (!d.inLeaves && v.length() > 3) discSound('leaves', v.length(), d);
          d.inLeaves = true;
        }
      }
      // baskets: the current one catches, every pole can be hit
      HOLES.forEach((hl, i) => {
        const B = hl.basket;
        const dx = d.pos.x - B.x, dz = d.pos.z - B.z, hd = Math.hypot(dx, dz);
        if (i === (cb ? cb.hole : L.stats.hole) && hd < 0.3 && d.pos.y > 0.52 && d.pos.y < 1.36) { if (cb) cb.holed(now); else holeOut(now); return; }
        if (hd < 0.13 && hd > 1e-4 && d.pos.y < 1.75 && d.phase === 'flying') {
          const nx = dx / hd, nz = dz / hd;
          d.pos.x = B.x + nx * 0.13; d.pos.z = B.z + nz * 0.13;
          const vn = v.x * nx + v.z * nz;
          if (vn < 0) { discSound('rim', -vn, d); v.x -= 1.4 * vn * nx; v.z -= 1.4 * vn * nz; v.multiplyScalar(0.6); }
        }
      });
    }

    const outOfBounds = (p) => p.x < AREA.minX || p.x > AREA.maxX || p.z < AREA.minZ || p.z > AREA.maxZ;
    const _dp = new V3(), _up2 = new V3();
    function discRender(now, dt) {
      const s = L.stats;
      if (D.phase === 'ready' || D.phase === 'held') {
        const mh = myHands[D.side].ok ? myHands[D.side] : myHands.right;
        if (mh.ok) {
          holdPoint(mh.pos, mh.quat, D.pos);
          _dp.set(0, 0, -0.06).applyQuaternion(mh.quat);
          D.pos.add(_dp);
          _up2.set(0, 1, 0).applyQuaternion(mh.quat);
          D.n.copy(UP).lerp(_up2, 0.45).normalize();
          if (D.phase === 'ready' && state.mode === 'vr') D.pos.y += 0.02 * Math.sin(now * 0.004);
        }
        D.mesh.visible = mh.ok && state.mode !== 'menu';
      } else D.mesh.visible = true;
      if (D.phase === 'flying') D.spin += Math.min(40, D.vel.length() * 2.2) * dt;
      _q.setFromUnitVectors(UP, D.n);
      _qs.setFromAxisAngle(UP, D.spin);
      D.mesh.quaternion.multiplyQuaternions(_q, _qs);
      D.mesh.position.copy(D.pos);
      // wrist readout
      const lh = myHands.left;
      wristMesh.visible = state.mode === 'vr' && lh.ok && state.level === L.idx;
      if (wristMesh.visible) {
        drawWrist();
        wristMesh.position.set(0, 0.07, 0.03).applyQuaternion(lh.quat).add(lh.pos);
        wristMesh.quaternion.copy(camera.getWorldQuaternion(_q));
      }
      if (D.phase === 'ready' && s.strokes === 0 && D.lie.distanceTo(hole().tee) > 0.01) D.lie.copy(hole().tee);
    }

    L.update = (dt, now) => {
      if (D.phase === 'flying') {
        const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
        for (let k = 0; k < steps && D.phase === 'flying'; k++) discStep(h, now);
        const stopped = D.sliding && Math.hypot(D.vel.x, D.vel.z) < 0.12;
        const lost = D.pos.y < -2 || Math.abs(D.pos.x) > 300 || Math.abs(D.pos.z) > 300 || now - D.t0 > 15000;
        if (D.phase === 'flying' && (stopped || lost)) { D.phase = 'rest'; D.t0 = now; D.vel.set(0, 0, 0); }
      } else if (D.phase === 'rest' && now - D.t0 > 1100) {
        const h = hole();
        if (outOfBounds(D.pos) || D.pos.y < -1) {
          L.stats.strokes += 1;
          showToast('Out of bounds: one penalty throw');
        } else D.lie.copy(D.pos).setY(0);
        _dp.subVectors(h.basket, D.lie).setY(0);
        if (_dp.lengthSq() < 1e-4) _dp.set(0, 0, -1);
        _dp.normalize();
        standAt(D.lie.clone().addScaledVector(_dp, -0.9), h.basket);
        D.phase = 'ready';
        state.hudDirty = true;
        forcePresence();
      } else if (D.phase === 'holed' && now - D.t0 > 2800) {
        const next = (L.stats.hole + 1) % HOLES.length;
        if (next === 0) {
          const s = L.stats;
          showToast(`Round complete: ${s.total} (${toPar(s.total - s.parDone)})`);
          sfx('cheer', 0.7);
          D.phase = 'between';
          D.t0 = now;
        } else goToTee(next);
      } else if (D.phase === 'between' && now - D.t0 > 4500) {
        restartRound();
      }
      discRender(now, dt);
      updateRemoteDiscs(dt);
    };

    // other players' discs
    function updateRemoteDiscs(dt) {
      const k = 1 - Math.exp(-dt * 12);
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        const show = inMyLevel(rec) && st && st.discOk;
        if (!show) { if (rec.disc) rec.disc.visible = false; continue; }
        if (!rec.disc) {
          rec.disc = makeDiscMesh(PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '#ffffff');
          rec.disc.userData.cur = new V3().copy(st.discPos);
          rec.disc.userData.n = new V3().copy(st.discN);
          rec.disc.userData.color = rec.colorIdx;
          rec.disc.userData.spin = 0;
          G.add(rec.disc);
        }
        const u = rec.disc.userData;
        if (u.color !== rec.colorIdx && PLAYER_COLORS[rec.colorIdx]) { setDiscColor(rec.disc, PLAYER_COLORS[rec.colorIdx].hex); u.color = rec.colorIdx; }
        if (u.cur.distanceTo(st.discPos) > 6) u.cur.copy(st.discPos); else u.cur.lerp(st.discPos, k);
        u.n.lerp(st.discN, k).normalize();
        if (st.discPhase === 1) u.spin += 30 * dt;
        rec.disc.visible = true;
        rec.disc.position.copy(u.cur);
        _q.setFromUnitVectors(UP, u.n);
        _qs.setFromAxisAngle(UP, u.spin);
        rec.disc.quaternion.multiplyQuaternions(_q, _qs);
      }
    }

    const PHASE_CODE = { ready: 0, held: 0, flying: 1, rest: 2, holed: 3, between: 3 };
    L.presence = () => {
      const s = L.stats;
      return {
        dg: [s.hole, s.strokes, s.total, s.done, s.parDone, s.last, s.lastHole],
        d: [PHASE_CODE[D.phase] || 0, r3(D.pos.x), r3(D.pos.y), r3(D.pos.z), r3(D.n.x), r3(D.n.y), r3(D.n.z)],
      };
    };
    L.readPresence = (rec, pres, st) => {
      const a = Array.isArray(pres.dg) ? pres.dg : [];
      const num = (x, lo, hi, dflt) => (Number.isInteger(x) ? clamp(x, lo, hi) : dflt);
      const hl = num(a[0], 0, HOLES.length - 1, 0), strokes = num(a[1], 0, 99, 0), total = num(a[2], 0, 999, 0);
      const done = num(a[3], 0, 99, 0), parDone = num(a[4], 0, 999, 0), last = num(a[5], -1, 99, -1), lastHole = num(a[6], -1, HOLES.length - 1, -1);
      if (st.init && done > st.done && last > 0 && lastHole >= 0) {
        showToast(`${rec.name} made ${scoreWord(last, HOLES[lastHole].par)} on hole ${lastHole + 1}`);
        sfx('chains', 0.5 / (1 + HOLES[lastHole].basket.distanceTo(myHead.pos) * 0.05));
      }
      if (done !== st.done || total !== st.total || hl !== st.hole) state.dirtyBoard = true;
      Object.assign(st, { hole: hl, strokes, total, done, parDone, init: true });
      const d = pres.d;
      st.discOk = false;
      if (Array.isArray(d) && d.length === 7 && d.every(finite)) {
        st.discPos = st.discPos || new V3();
        st.discN = st.discN || new V3();
        st.discPos.set(clamp(d[1], -300, 300), clamp(d[2], -5, 60), clamp(d[3], -300, 300));
        st.discN.set(d[4], d[5], d[6]);
        if (st.discN.lengthSq() < 1e-6) st.discN.set(0, 1, 0); else st.discN.normalize();
        st.discPhase = d[0];
        st.discOk = true;
      }
    };
    L.rowFor = (st, me) => {
      const s = me ? L.stats : st;
      const done = s.done || 0, total = s.total || 0, parDone = s.parDone || 0, hl = s.hole || 0;
      const rel = total - parDone;
      return { done, rel, text: done ? `${toPar(rel)} thru ${done}` : `Hole ${hl + 1}` };
    };
    L.sortRows = (a, b) => (b.done - a.done) || (a.rel - b.rel);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#2a1d14'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffb34d'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffb34d'; g.font = `800 64px ${DISPLAY}`;
      g.fillText('Maple Hollow', 36, 84);
      g.fillStyle = '#e8c79a'; g.font = `400 24px ${BODY}`;
      g.fillText(`${HOLES.length} holes, par ${HOLES.reduce((n, h) => n + h.par, 0)}`, 36, 122);
      drawRows(g, rows, 180, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => 'Restart round', run: () => restartRound() }];
    L.hintsFor = () => {
      const s = L.stats, h = hole();
      return [[`Hole ${s.hole + 1}`, `par ${h.par}, ${h.len} m`], ['Throw', String(s.strokes + (D.phase === 'ready' ? 1 : 0))], ['Space', 'hold, then let go to throw'], ['Drag', 'aim']];
    };
    L.grabless = true;
    L.spawn = () => {
      dolly.position.set(0, 0, 0);
      camera.position.set(0, 1.6, 0);
      goToTee(L.stats.hole);
    };
    // with the disc in hand you can take a run-up, but you can't carry it toward the basket
    const RUNUP = 2.2;
    L.clampPlayer = (p) => {
      let dx = 0, dz = 0;
      if (D.phase === 'ready' || D.phase === 'held') {
        const ox = p.x - D.lie.x, oz = p.z - D.lie.z, d = Math.hypot(ox, oz);
        if (d > RUNUP) { dx = -ox * (1 - RUNUP / d); dz = -oz * (1 - RUNUP / d); }
      }
      const B = L.bounds, m = 0.3, x = p.x + dx, z = p.z + dz;
      if (x < B.minX + m) dx += B.minX + m - x; else if (x > B.maxX - m) dx += B.maxX - m - x;
      if (z < B.minZ + m) dz += B.minZ + m - z; else if (z > B.maxZ - m) dz += B.maxZ - m - z;
      return [dx, dz];
    };
    L.RUNUP = RUNUP;
    L.onEnter = () => { if (D.phase === 'flying' || D.phase === 'rest') D.phase = 'ready'; };
    L.onExit = () => { if (D.phase === 'held') D.phase = 'ready'; wristMesh.visible = false; };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.00006) * 0.6;
      camera.position.set(6 + Math.sin(a) * 4, 6.5, 12);
      camera.lookAt(-3, 1, -30);
    };

    // ================================================================ FAIRWAY FINN: a disc golf rival
    // He plays the hole you're on with his own disc and the same flight physics as yours. Before each throw he
    // test-flies a spread of aims, speeds and angles (a few each frame, so nothing stutters), takes the one
    // that lands nearest the basket, then throws it with a little human error. The host runs him.
    const FINN = { name: 'Fairway Finn', color: '#4fc3f7', on: prefs.discBot !== false, active: false, hole: -1, phase: 'wait', strokes: 0, scores: HOLES.map(() => 0), lie: new V3(), t0: 0, gen: null, plan: null, throwT: 0, req: null, reqSeq: 0, lastMyDone: 0 };
    const MAX_THROWS = 8;
    const finnDisc = { mesh: makeDiscMesh(FINN.color), pos: new V3(), vel: new V3(), n: new V3(0, 1, 0), spin: 0, phase: 'ready', sliding: false, inLeaves: false, lastSnd: 0, float: false };
    finnDisc.mesh.visible = false;
    G.add(finnDisc.mesh);
    FINN.disc = finnDisc;
    L.finn = FINN;
    const finnBody = buildAvatar(FINN.color, 2, 0, true, 5, 3);
    const finnLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Fairway Finn', 128, 33); }).tex, transparent: true, depthWrite: false }));
    finnLabel.scale.set(0.9, 0.225, 1); finnLabel.position.y = 0.42;
    finnBody.add(finnLabel);
    finnBody.visible = false;
    G.add(finnBody);
    const herePeersDG = () => {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    };
    const finnHost = () => herePeersDG()[0] === state.myPeer;
    const finnGauss = () => (rand() + rand() + rand() - 1.5) / 0.5;
    const _fv = new V3(), _fh = new V3(), _fq = new Q4(), _fqs = new Q4();

    // a throw: direction, speed and launch angle, with the disc held flat to its path like a browser throw
    function finnLaunch(dk, sp, pitch, yaw, from) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const hx = dk.x * c - dk.z * s, hz = dk.x * s + dk.z * c;
      dk.pos.copy(from);
      dk.vel.set(hx * Math.cos(pitch) * sp, Math.sin(pitch) * sp, hz * Math.cos(pitch) * sp);
      _fh.copy(dk.vel).normalize();
      dk.n.copy(UP).addScaledVector(_fh, -UP.dot(_fh));
      if (dk.n.lengthSq() < 1e-4) dk.n.set(0, 0, 1);
      dk.n.normalize().multiplyScalar(Math.cos(0.07)).addScaledVector(_fh, -Math.sin(0.07)).normalize();
      dk.sliding = false; dk.inLeaves = false; dk.phase = 'flying'; dk.float = false;
    }
    // test-fly one candidate after another; yields between each so the work spreads over frames
    function* finnPlanGen(holeIdx, now) {
      const H = HOLES[holeIdx];
      const to = _fv.copy(H.basket).sub(FINN.lie).setY(0);
      const dist = to.length();
      const dir = to.normalize().clone();
      const from = FINN.lie.clone().setY(1.2);
      // only the trees near the line matter for planning
      const near = trees.filter((t) => { const px = t.x - from.x, pz = t.z - from.z, along = px * dir.x + pz * dir.z, off = Math.abs(px * dir.z - pz * dir.x); return along > -4 && along < dist + 25 && off < 24; });
      const cb = { hole: holeIdx, trees: near, holed: () => { sim.holed = true; } };
      const sim = { pos: new V3(), vel: new V3(), n: new V3(), sliding: false, inLeaves: false, phase: 'flying', x: dir.x, z: dir.z, holed: false, lastSnd: 0, float: false };
      const top = Math.min(22, 6 + dist * 0.42);
      const speeds = [0.5, 0.65, 0.8, 0.92, 1.05, 1.18].map((k) => Math.max(5, top * k));
      let best = { score: Infinity, sp: speeds[2], pitch: 0.08, yaw: 0 };
      for (const yaw of [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36]) {
        for (const sp of speeds) {
          for (const pitch of [0.05, 0.15]) {
            sim.holed = false;
            finnLaunch(sim, sp, pitch, yaw, from);
            discQuiet = true;
            try {
              for (let k = 0; k < 360 && sim.phase === 'flying' && !sim.holed; k++) {
                discStep(1 / 40, now, sim, cb);
                if (sim.sliding && Math.hypot(sim.vel.x, sim.vel.z) < 0.12) break;
                if (sim.pos.y < -2) break;
              }
            } finally { discQuiet = false; }
            const off = outOfBounds(sim.pos) || sim.pos.y < -1;
            const score = sim.holed ? -100 : Math.hypot(sim.pos.x - H.basket.x, sim.pos.z - H.basket.z) + (off ? 60 : 0) + Math.abs(yaw) * 0.5;
            if (score < best.score) best = { score, sp, pitch, yaw };
            yield null;
          }
        }
      }
      return best;
    }

    // ---------------------------------------------------------------- his round (host)
    function finnToHole(i, now) {
      // leaving a hole he hadn't finished: he picks up for one more throw
      if (FINN.hole >= 0 && FINN.phase !== 'holed' && !FINN.scores[FINN.hole]) FINN.scores[FINN.hole] = Math.min(MAX_THROWS, FINN.strokes + 1);
      FINN.hole = i;
      FINN.lie.copy(HOLES[i].tee).add(HOLES[i].right.clone().multiplyScalar(1.4));
      FINN.strokes = 0; FINN.phase = 'wait'; FINN.t0 = now; FINN.gen = null; FINN.plan = null;
      finnDisc.phase = 'ready';
      forcePresence();
    }
    function finnStep(dt, now) {
      if (!FINN.active) return;
      const myDone = L.stats.done;
      if (myDone < FINN.lastMyDone) { FINN.scores = HOLES.map(() => 0); FINN.hole = -1; }
      FINN.lastMyDone = myDone;
      if (L.stats.hole !== FINN.hole && D.phase !== 'between') finnToHole(L.stats.hole, now);
      const H = HOLES[FINN.hole];
      if (!H) return;
      if (FINN.phase === 'wait') {
        // you throw first, then he lines up
        if ((L.stats.strokes > 0 || now - FINN.t0 > 4000) && now - FINN.t0 > 1500) { FINN.phase = 'aim'; FINN.t0 = now; FINN.gen = finnPlanGen(FINN.hole, now); FINN.plan = null; }
      } else if (FINN.phase === 'aim') {
        if (FINN.gen) {
          const t0 = performance.now();
          while (FINN.gen && performance.now() - t0 < 3) { const r = FINN.gen.next(); if (r.done) { FINN.plan = r.value; FINN.gen = null; } }
        }
        if (FINN.plan && now - FINN.t0 > 1200) {
          const p = FINN.plan;
          const to = _fv.copy(H.basket).sub(FINN.lie).setY(0).normalize();
          finnDisc.x = to.x; finnDisc.z = to.z;
          finnLaunch(finnDisc, p.sp * (1 + finnGauss() * 0.09), p.pitch + finnGauss() * 0.035, p.yaw + finnGauss() * 0.06, FINN.lie.clone().setY(1.2));
          FINN.strokes += 1; FINN.phase = 'flying'; FINN.throwT = now;
          sfx('whoosh', 0.6 / (1 + FINN.lie.distanceTo(myHead.pos) * 0.1));
          forcePresence();
        }
      } else if (FINN.phase === 'flying') {
        const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
        const cb = { hole: FINN.hole, holed: () => {
          FINN.phase = 'holed'; finnDisc.phase = 'holed'; FINN.scores[FINN.hole] = FINN.strokes;
          finnDisc.pos.set(H.basket.x, 0.56, H.basket.z); finnDisc.vel.set(0, 0, 0);
          sfx('chains', 0.6 / (1 + H.basket.distanceTo(myHead.pos) * 0.08));
          spawnFloat(`Finn: ${scoreWord(FINN.strokes, H.par)}`, new V3(H.basket.x, 2.1, H.basket.z), '#4fc3f7');
          state.dirtyBoard = true; forcePresence();
        } };
        for (let k = 0; k < steps && finnDisc.phase === 'flying'; k++) discStep(h, now, finnDisc, cb);
        if (finnDisc.phase === 'flying') {
          const stopped = finnDisc.sliding && Math.hypot(finnDisc.vel.x, finnDisc.vel.z) < 0.12;
          const lost = finnDisc.pos.y < -2 || now - FINN.throwT > 15000;
          if (stopped || lost) {
            finnDisc.phase = 'rest'; finnDisc.vel.set(0, 0, 0);
            if (outOfBounds(finnDisc.pos) || lost) FINN.strokes += 1;   // penalty; he throws again from where he was
            else FINN.lie.copy(finnDisc.pos).setY(0);
            if (FINN.strokes >= MAX_THROWS) { FINN.phase = 'holed'; FINN.scores[FINN.hole] = MAX_THROWS; state.dirtyBoard = true; }
            else { FINN.phase = 'wait'; FINN.t0 = now; }
            forcePresence();
          }
        }
      }
    }

    // ---------------------------------------------------------------- per frame, network, scoreboard
    const baseUpdateDG = L.update, basePresenceDG = L.presence, baseReadDG = L.readPresence, baseDrawDG = L.drawBoard;
    L.update = (dt, now) => {
      FINN.active = FINN.on && herePeersDG().length < 3;
      if (finnHost()) finnStep(dt, now);
      baseUpdateDG(dt, now);
      const H = HOLES[FINN.hole];
      const show = FINN.active && !!H && state.level === L.idx;
      finnBody.visible = show;
      finnDisc.mesh.visible = show && (FINN.phase === 'flying' || FINN.phase === 'holed' || finnDisc.phase === 'rest');
      if (!show) return;
      // he stands at his lie, facing the basket
      const to = _fv.copy(H.basket).sub(FINN.lie).setY(0);
      if (to.lengthSq() < 1e-4) to.set(0, 0, -1);
      to.normalize();
      const lunge = FINN.phase === 'flying' && now - FINN.throwT < 400 ? 0.35 : 0;
      finnBody.position.set(FINN.lie.x - to.x * (0.6 - lunge), 1.55, FINN.lie.z - to.z * (0.6 - lunge));
      finnBody.rotation.y = Math.atan2(-to.x, -to.z);
      // his disc
      if (FINN.phase === 'flying') finnDisc.spin += Math.min(40, finnDisc.vel.length() * 2.2) * dt;
      _fq.setFromUnitVectors(UP, finnDisc.n.lengthSq() > 0.5 ? finnDisc.n : UP);
      _fqs.setFromAxisAngle(UP, finnDisc.spin);
      finnDisc.mesh.quaternion.multiplyQuaternions(_fq, _fqs);
      finnDisc.mesh.position.copy(finnDisc.pos);
    };
    const q2 = (x) => Math.round(x * 100) / 100;
    const FPH = { wait: 0, aim: 1, flying: 2, holed: 3 }, FPN = ['wait', 'aim', 'flying', 'holed'];
    L.presence = () => {
      const p = basePresenceDG ? basePresenceDG() : {};
      if (finnHost()) p.dgb = [FINN.on ? 1 : 0, FINN.hole, FPH[FINN.phase], FINN.strokes, q2(finnDisc.pos.x), q2(finnDisc.pos.y), q2(finnDisc.pos.z), q2(finnDisc.n.x), q2(finnDisc.n.y), q2(finnDisc.n.z), q2(FINN.lie.x), q2(FINN.lie.z), ...FINN.scores];
      if (FINN.req) p.dgr = FINN.req.slice();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      if (baseReadDG) baseReadDG(rec, pres, st);
      if (finnHost() && Array.isArray(pres.dgr) && pres.dgr.length === 2 && (pres.dgr[0] === 0 || pres.dgr[0] === 1) && pres.dgr.join() !== st.dgr) {
        st.dgr = pres.dgr.join();
        if (st.dgrInit && FINN.on !== !!pres.dgr[0]) { FINN.on = !!pres.dgr[0]; state.hudDirty = true; state.dirtyBoard = true; forcePresence(); }
      }
      st.dgrInit = true;
      if (rec.peer !== herePeersDG()[0]) return;
      const a = pres.dgb;
      if (!Array.isArray(a) || a.length !== 12 + HOLES.length || !a.every(finite)) return;
      if ((a[0] === 1) !== FINN.on) { FINN.on = a[0] === 1; state.hudDirty = true; }
      const scores = a.slice(12).map((x) => clamp(Math.round(x), 0, MAX_THROWS));
      if (scores.join() !== FINN.scores.join()) state.dirtyBoard = true;
      const ph = FPN[clamp(Math.round(a[2]), 0, 3)];
      if (ph === 'flying' && FINN.phase !== 'flying') FINN.throwT = performance.now();
      Object.assign(FINN, { hole: clamp(Math.round(a[1]), -1, HOLES.length - 1), phase: ph, strokes: a[3], scores });
      finnDisc.pos.set(a[4], a[5], a[6]); finnDisc.n.set(a[7], a[8], a[9]);
      finnDisc.phase = ph === 'flying' ? 'flying' : 'rest';
      FINN.lie.set(a[10], 0, a[11]);
    };
    function setFinn(on) {
      FINN.on = on; prefs.discBot = on; savePrefs();
      FINN.req = [on ? 1 : 0, ++FINN.reqSeq];
      showToast(on ? 'Fairway Finn will play along' : 'Fairway Finn sits this round out');
      state.hudDirty = true; state.dirtyBoard = true;
      forcePresence();
    }
    L.setFinn = setFinn;
    L.hudActions.push({ label: () => (FINN.on ? 'Bot: on' : 'Bot: off'), run: () => setFinn(!FINN.on) });
    L.drawBoard = (rows) => {
      const all = rows.slice();
      if (FINN.active) {
        const done = FINN.scores.filter((x) => x).length;
        const total = FINN.scores.reduce((a, b) => a + b, 0), parDone = HOLES.reduce((a, h, i) => a + (FINN.scores[i] ? h.par : 0), 0);
        all.push({ name: 'Fairway Finn (bot)', color: FINN.color, me: false, done, rel: total - parDone, text: done ? `${toPar(total - parDone)} thru ${done}` : `Hole ${Math.max(0, FINN.hole) + 1}` });
      }
      all.sort(L.sortRows);
      baseDrawDG(all);
    };
    L.finnInternals = { finnPlanGen, finnStep, finnToHole };
    return L;
  })();

