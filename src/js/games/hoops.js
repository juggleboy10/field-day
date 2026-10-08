  // ================================================================ LEVEL: ROOFTOP HOOPS
  const hoops = (() => {
    const L = newLevel(0);
    const G = L.group;
    const rand = mulberry32(20260930);
    const BALL_R = 0.12;
    const RIM = new V3(0, 2.9, -5.5), RIM_R = 0.275, RIM_TUBE = 0.018, THREE_PT = 4.2;
    const FENCE = { minX: -6, maxX: 6, minZ: -7.5, maxZ: 5.5, h: 3.6 };
    const TABLE = { x0: 2.5, x1: 3.1, z0: 0.35, z1: 2.05, top: 0.92 };
    L.bounds = { minX: FENCE.minX, maxX: FENCE.maxX, minZ: FENCE.minZ, maxZ: FENCE.maxZ };
    L.stats = { score: 0 };
    L.env = {
      sky: skyTexture([[0, '#131135'], [0.22, '#27225e'], [0.38, '#5b3f7f'], [0.46, '#b3607c'], [0.495, '#f3a468'], [0.51, '#b86e78'], [0.56, '#5e4474'], [1, '#1c1733']]),
      bg: 0x1d1a36, fog: [0x6c4a7b, 45, 230], hemi: [0xa99be0, 0x3b2d44, 0.95],
      sun: [0xffc28a, 0.85], sunDir: new V3(-0.3, 0.5, -1), ambient: [0x40385e, 0.35],
      sprite: { tex: sunTex, pos: new V3(-50, 6, -290), scale: 90 },
    };

    // skyline
    const win = canvasTexture(64, 128, (g) => {
      g.fillStyle = '#1b1934'; g.fillRect(0, 0, 64, 128);
      for (let y = 5; y < 128; y += 16) for (let x = 2; x < 64; x += 8) {
        const r = rand();
        g.fillStyle = r < 0.24 ? '#ffd08a' : r < 0.3 ? '#a8d4ff' : '#29264a';
        g.fillRect(x, y, 5, 8);
      }
    });
    win.tex.wrapS = win.tex.wrapT = THREE.RepeatWrapping;
    const sideMat = new THREE.MeshBasicMaterial({ map: win.tex, color: 0xd8d0ff });
    const bMats = [sideMat, sideMat, new THREE.MeshBasicMaterial({ color: 0x1e1b36 }), new THREE.MeshBasicMaterial({ color: 0x1e1b36 }), sideMat, sideMat];
    function buildingGeo(w, h, d) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const uv = geo.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * dims[f][0] / 12, uv.getY(i) * dims[f][1] / 24);
      }
      return geo;
    }
    const beaconMat = new THREE.SpriteMaterial({ map: redGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const beacons = [];
    for (let i = 0; i < 70; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = 26 + Math.pow(rand(), 0.8) * 110;
      const w = 7 + rand() * 12, d = 7 + rand() * 12;
      const top = -18 + Math.pow(rand(), 1.4) * (dist > 60 ? 75 : 45);
      const base = -90, h = top - base;
      const m = new THREE.Mesh(buildingGeo(w, h, d), bMats);
      m.position.set(Math.cos(ang) * dist, base + h / 2, Math.sin(ang) * dist - 1);
      m.rotation.y = -ang + (rand() - 0.5) * 0.4;
      G.add(m);
      if (top > 28 && beacons.length < 8) {
        const s = new THREE.Sprite(beaconMat);
        s.position.set(m.position.x, top + 1.5, m.position.z);
        s.scale.set(3.2, 3.2, 1);
        s.userData.phase = rand() * 2400;
        G.add(s);
        beacons.push(s);
      }
    }

    // the rooftop
    const facade = new THREE.Mesh(buildingGeo(24, 70, 26), bMats);
    facade.position.set(0, -35.6, -1);
    G.add(facade);
    addBox(G, 24, 0.6, 26, lam(0x43465e), 0, -0.3, -1);
    const parMat = lam(0x55587a);
    addBox(G, 24, 0.7, 0.4, parMat, 0, 0.35, -14);
    addBox(G, 24, 0.7, 0.4, parMat, 0, 0.35, 12);
    addBox(G, 0.4, 0.7, 26, parMat, -12, 0.35, -1);
    addBox(G, 0.4, 0.7, 26, parMat, 12, 0.35, -1);
    const propMat = lam(0x5b5e7a);
    addBox(G, 1.8, 1.2, 1.3, propMat, 8.6, 0.6, -9.2);
    addBox(G, 1.2, 0.9, 1.2, propMat, 8.9, 0.45, -6.8);
    addBox(G, 2.6, 2.7, 2.3, lam(0x4d506c), 8.4, 1.35, 7.4);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.0), lam(0x2a2842));
    door.position.set(8.4 - 1.31, 1.0, 7.4);
    door.rotation.y = -Math.PI / 2;
    G.add(door);
    for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) addCyl(G, 0.07, 0.07, 3.2, 6, legMat, -8.6 + lx, 1.6, 7.2 + lz);
    addCyl(G, 1.35, 1.35, 2.3, 18, lam(0x6e4f4a), -8.6, 4.35, 7.2);
    const tankRoof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.9, 18), lam(0x3c3040));
    tankRoof.position.set(-8.6, 5.95, 7.2);
    G.add(tankRoof);

    // court
    const PX = 80;
    const court = canvasTexture(12 * PX, 13 * PX, (g, W, H) => {
      const X = (x) => (x + 6) * PX, Z = (z) => (z + 7.5) * PX;
      g.fillStyle = '#2a5d5a'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#31726d'; g.fillRect(X(-5.5), Z(-7.0), 11 * PX, 12 * PX);
      g.fillStyle = '#5c3a6e'; g.fillRect(X(-1.8), Z(-7.0), 3.6 * PX, 5.8 * PX);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
        g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
      g.strokeStyle = '#efece2'; g.lineWidth = 0.05 * PX;
      g.strokeRect(X(-5.5), Z(-7.0), 11 * PX, 12 * PX);
      g.strokeRect(X(-1.8), Z(-7.0), 3.6 * PX, 5.8 * PX);
      g.beginPath(); g.arc(X(0), Z(-1.2), 1.8 * PX, 0, Math.PI * 2); g.stroke();
      g.save();
      g.beginPath(); g.rect(X(-5.5), Z(-7.0), 11 * PX, 12 * PX); g.clip();
      g.beginPath(); g.arc(X(RIM.x), Z(RIM.z), THREE_PT * PX, 0, Math.PI * 2); g.stroke();
      g.restore();
      g.beginPath(); g.arc(X(0), Z(5.0), 1.8 * PX, Math.PI, Math.PI * 2); g.stroke();
    });
    const courtMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 13), new THREE.MeshLambertMaterial({ map: court.tex }));
    courtMesh.rotation.x = -Math.PI / 2;
    courtMesh.position.set(0, 0.002, -1);
    G.add(courtMesh);

    // fence + string lights
    const link = canvasTexture(64, 64, (g) => {
      g.clearRect(0, 0, 64, 64);
      g.strokeStyle = 'rgba(214,216,232,1)'; g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke();
    });
    link.tex.wrapS = link.tex.wrapT = THREE.RepeatWrapping;
    L.linkTex = link.tex;
    function fencePanel(len, x, z, rotY) {
      const t = link.tex.clone();
      t.needsUpdate = true;
      t.repeat.set(len / 0.14, FENCE.h / 0.14);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, FENCE.h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, color: 0xb8bcd8 }));
      m.position.set(x, FENCE.h / 2, z);
      m.rotation.y = rotY;
      G.add(m);
    }
    fencePanel(12, 0, FENCE.minZ, 0);
    fencePanel(12, 0, FENCE.maxZ, 0);
    fencePanel(13, FENCE.minX, -1, Math.PI / 2);
    fencePanel(13, FENCE.maxX, -1, Math.PI / 2);
    const corners = [[FENCE.minX, FENCE.minZ], [FENCE.maxX, FENCE.minZ], [FENCE.maxX, FENCE.maxZ], [FENCE.minX, FENCE.maxZ]];
    const posts = [];
    for (let c = 0; c < 4; c++) {
      const [ax, az] = corners[c], [bx, bz] = corners[(c + 1) % 4];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2.2);
      for (let k = 0; k < n; k++) posts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    const m4 = new THREE.Matrix4();
    const postMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, FENCE.h + 0.1, 6), lam(0x8a8fa8), posts.length);
    posts.forEach(([x, z], i) => { m4.makeTranslation(x, (FENCE.h + 0.1) / 2, z); postMesh.setMatrixAt(i, m4); });
    postMesh.frustumCulled = false;
    G.add(postMesh);
    const railMat = lam(0x8a8fa8);
    addBox(G, 12, 0.05, 0.05, railMat, 0, FENCE.h, FENCE.minZ);
    addBox(G, 12, 0.05, 0.05, railMat, 0, FENCE.h, FENCE.maxZ);
    addBox(G, 0.05, 0.05, 13, railMat, FENCE.minX, FENCE.h, -1);
    addBox(G, 0.05, 0.05, 13, railMat, FENCE.maxX, FENCE.h, -1);
    const bulbPos = [], wireSegs = [];
    for (let i = 0; i < posts.length; i++) {
      const a = posts[i], b = posts[(i + 1) % posts.length];
      for (let k = 0; k < 6; k++) {
        const t = (k + 0.5) / 6;
        bulbPos.push(new V3(a[0] + (b[0] - a[0]) * t, FENCE.h + 0.04 - 0.32 * Math.sin(Math.PI * t), a[1] + (b[1] - a[1]) * t));
      }
      let prev = null;
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const p = new V3(a[0] + (b[0] - a[0]) * t, FENCE.h + 0.08 - 0.32 * Math.sin(Math.PI * t), a[1] + (b[1] - a[1]) * t);
        if (prev) wireSegs.push(prev, p);
        prev = p;
      }
    }
    G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wireSegs), new THREE.LineBasicMaterial({ color: 0x24223a })));
    const bulbWarm = new THREE.Color(0xffd38a), bulbHot = new THREE.Color(0xfff6e6);
    const bulbMat = new THREE.MeshBasicMaterial({ color: bulbWarm.clone() });
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), bulbMat, bulbPos.length);
    bulbPos.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); bulbs.setMatrixAt(i, m4); });
    bulbs.frustumCulled = false;
    G.add(bulbs);
    const glowMat = new THREE.PointsMaterial({ map: warmGlowTex, size: 0.45, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc070, opacity: 0.55 });
    G.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(bulbPos), glowMat));

    // hoop
    const poleMat = lam(0x2b2d42);
    addCyl(G, 0.08, 0.08, 3.3, 10, poleMat, 0, 1.65, -6.75);
    addBox(G, 0.12, 0.12, 0.8, poleMat, 0, 3.1, -6.35);
    const boardArt = canvasTexture(360, 210, (g) => {
      g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, 360, 210);
      g.strokeStyle = '#1b1932'; g.lineWidth = 12; g.strokeRect(6, 6, 348, 198);
      g.strokeStyle = '#f5821f'; g.lineWidth = 7; g.strokeRect(121, 81, 118, 88);
    });
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.04), new THREE.MeshLambertMaterial({ map: boardArt.tex }));
    backboard.position.set(0, 3.22, -5.93);
    G.add(backboard);
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(RIM_R, RIM_TUBE, 8, 40), lam(0xe8531f));
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.copy(RIM);
    G.add(rimMesh);
    addBox(G, 0.14, 0.04, 0.15, lam(0xe8531f), 0, RIM.y - 0.01, -5.84);
    const net = (() => {
      const top = [], mid = [], bot = [], N = 12;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2, a2 = ((i + 0.5) / N) * Math.PI * 2;
        top.push(new V3(Math.cos(a) * RIM_R, 0, Math.sin(a) * RIM_R));
        mid.push(new V3(Math.cos(a2) * RIM_R * 0.8, -0.2, Math.sin(a2) * RIM_R * 0.8));
        bot.push(new V3(Math.cos(a) * RIM_R * 0.6, -0.42, Math.sin(a) * RIM_R * 0.6));
      }
      const pts = [];
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        pts.push(top[i], mid[i], top[j], mid[i], mid[i], bot[i], mid[i], bot[j], bot[i], bot[j]);
      }
      const n = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xf2f0ff, transparent: true, opacity: 0.8 }));
      n.position.copy(RIM);
      return n;
    })();
    G.add(net);

    // ball rack
    const wood = lam(0x9a6b43);
    addBox(G, TABLE.x1 - TABLE.x0, 0.06, TABLE.z1 - TABLE.z0, wood, (TABLE.x0 + TABLE.x1) / 2, TABLE.top - 0.03, (TABLE.z0 + TABLE.z1) / 2);
    addBox(G, 0.06, 0.05, TABLE.z1 - TABLE.z0, wood, TABLE.x0, TABLE.top + 0.025, (TABLE.z0 + TABLE.z1) / 2);
    addBox(G, 0.06, 0.05, TABLE.z1 - TABLE.z0, wood, TABLE.x1, TABLE.top + 0.025, (TABLE.z0 + TABLE.z1) / 2);
    for (const lx of [TABLE.x0 + 0.05, TABLE.x1 - 0.05]) for (const lz of [TABLE.z0 + 0.05, TABLE.z1 - 0.05]) addBox(G, 0.05, TABLE.top - 0.06, 0.05, legMat, lx, (TABLE.top - 0.06) / 2, lz);

    const COLLIDERS = [
      box(-0.9, 2.695, -5.95, 0.9, 3.745, -5.91, 0.6, 'board'),
      box(-0.06, 3.04, -6.75, 0.06, 3.16, -5.95, 0.5, 'board'),
      box(-0.08, 0, -6.83, 0.08, 3.3, -6.67, 0.5, 'wall'),
      box(TABLE.x0, TABLE.top - 0.06, TABLE.z0, TABLE.x1, TABLE.top, TABLE.z1, 0.35, 'floor'),
      box(TABLE.x0 - 0.03, TABLE.top, TABLE.z0, TABLE.x0 + 0.03, TABLE.top + 0.05, TABLE.z1, 0.35, 'floor'),
      box(TABLE.x1 - 0.03, TABLE.top, TABLE.z0, TABLE.x1 + 0.03, TABLE.top + 0.05, TABLE.z1, 0.35, 'floor'),
      box(2.64, 0, 2.59, 2.96, 1.05, 2.91, 0.35, 'floor'),
      box(FENCE.minX, 1.3, -3.85, FENCE.minX + 0.11, 2.9, -1.35, 0.4, 'board'),
      box(FENCE.maxX - 0.11, 1.08, -2.65, FENCE.maxX, 2.82, -0.15, 0.4, 'board'),
      box(-5.05, 0, 3.05, -3.35, 1.75, 4.75, 0.4, 'board'),
    ];

    // boards + buttons
    L.board = makeBoard(G, 720, 460, 2.4, 1.533, FENCE.minX + 0.08, 2.1, -2.6, Math.PI / 2);
    const sign = makeBoard(G, 720, 500, 2.4, 1.667, FENCE.maxX - 0.08, 1.95, -1.4, -Math.PI / 2);
    function drawSign() {
      const g = sign.g, W = 720, H = 500;
      g.fillStyle = '#16142e'; g.fillRect(0, 0, W, H);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#f4f2ff'; g.font = `800 58px ${DISPLAY}`;
      g.fillText('How to play', 36, 78);
      const sections = [
        ['In VR', 'Grab with grip or trigger. Point at a ball across the court to pull it to your hand. Let go mid-swing to throw. Left stick moves, right stick turns.'],
        ['In a browser', 'Drag to look, WASD to move, E to grab. Hold Space, then let go to throw.'],
        ['Reset', 'The orange button by the rack puts every ball back.'],
      ];
      let y = 128;
      for (const [label, body] of sections) {
        g.fillStyle = '#ffa24a'; g.font = `700 25px ${BODY}`;
        g.fillText(label, 36, y);
        y += 33;
        g.fillStyle = '#e4e0fa'; g.font = `400 25px ${BODY}`;
        y = wrapText(g, body, 36, y, 648, 32) + 12;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);
    makeButton(L, new V3(2.8, 1.03, 2.75), 0xf5821f, 'Reset balls', () => resetBodies(L), { faceYaw: -Math.PI / 2 });
    makeKiosk(L, -4.2, 3.9, Math.PI * 0.75);
    makePlayerPicker(L, { min: 2, max: 8, def: 4, label: 'Lightning players', note: 'from the next game' });

    // balls
    const ballTex = canvasTexture(256, 128, (g) => {
      g.fillStyle = '#e8742a'; g.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
        g.fillRect(Math.random() * 256, Math.random() * 128, 1.5, 1.5);
      }
      g.strokeStyle = '#2a1a14'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 64); g.lineTo(256, 64); g.stroke();
      for (const x of [0, 128, 256]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
      for (const off of [64, 192]) {
        g.beginPath();
        for (let x = -64; x <= 64; x += 2) {
          const y = 64 + 50 * Math.cos((x / 64) * (Math.PI / 2)) * (off === 64 ? 1 : -1);
          if (x === -64) g.moveTo(off + x, y); else g.lineTo(off + x, y);
        }
        g.stroke();
      }
    }).tex;
    const ballGeo = new THREE.SphereGeometry(BALL_R, 24, 16);
    for (let i = 0; i < 6; i++) {
      const slot = new V3(2.8 + (i % 2 ? 0.13 : -0.13), TABLE.top + BALL_R + 0.002, 1.2 + (Math.floor(i / 2) - 1) * 0.56);
      const b = makeBody(L, { geo: ballGeo, tex: ballTex, r: BALL_R, slot });
      b.mesh.rotation.set(rand() * 6, rand() * 6, 0);
    }

    const _rimPt = new V3();
    L.collide = (b) => {
      let support = groundBounce(b, 0.72, 0.97, 'floor');
      if (b.pos.x < FENCE.minX + b.r) { b.pos.x = FENCE.minX + b.r; if (b.vel.x < 0) { impact(b, -b.vel.x, 'wall'); b.vel.x *= -0.4; } }
      if (b.pos.x > FENCE.maxX - b.r) { b.pos.x = FENCE.maxX - b.r; if (b.vel.x > 0) { impact(b, b.vel.x, 'wall'); b.vel.x *= -0.4; } }
      if (b.pos.z < FENCE.minZ + b.r) { b.pos.z = FENCE.minZ + b.r; if (b.vel.z < 0) { impact(b, -b.vel.z, 'wall'); b.vel.z *= -0.4; } }
      if (b.pos.z > FENCE.maxZ - b.r) { b.pos.z = FENCE.maxZ - b.r; if (b.vel.z > 0) { impact(b, b.vel.z, 'wall'); b.vel.z *= -0.4; } }
      for (const bx of COLLIDERS) if (collideBox(b, bx) > 0.6) support = true;
      if (Math.abs(b.pos.y - RIM.y) < 0.2) {
        const rx = b.pos.x - RIM.x, rz = b.pos.z - RIM.z, rl = Math.hypot(rx, rz);
        if (rl > 1e-4 && Math.abs(rl - RIM_R) < 0.2) {
          _rimPt.set(RIM.x + (rx / rl) * RIM_R, RIM.y, RIM.z + (rz / rl) * RIM_R);
          collidePoint(b, _rimPt, RIM_TUBE + b.r, 0.42, 'rim');
        }
      }
      return support;
    };
    L.groundAt = (b) => (b.pos.x > TABLE.x0 && b.pos.x < TABLE.x1 && b.pos.z > TABLE.z0 && b.pos.z < TABLE.z1 && b.pos.y > TABLE.top ? TABLE.top : 0);

    let swishT = -1e9;
    function celebrate(who, pts) {
      const p = clamp(Math.round(pts), 1, 3);
      const now = performance.now();
      swishT = now;
      state.flashT = now;
      sfx('swish', 1);
      setTimeout(() => sfx('chime', 1), 120);
      spawnFloat(`+${p}`, new V3(RIM.x, RIM.y + 0.35, RIM.z + 0.1));
      showToast(who ? `${who} scored ${p}` : `You scored ${p}`);
      if (!who && state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.5, 80);
    }
    L.onBodyFrame = (b) => {
      if (b.scored || b.held || b.owner !== state.myPeer) return;
      if (!(b.prev.y >= RIM.y && b.pos.y < RIM.y && b.vel.y < 0)) return;
      const t = (b.prev.y - RIM.y) / (b.prev.y - b.pos.y);
      const cx = b.prev.x + (b.pos.x - b.prev.x) * t, cz = b.prev.z + (b.pos.z - b.prev.z) * t;
      if (Math.hypot(cx - RIM.x, cz - RIM.z) >= RIM_R - b.r * 0.3) return;
      b.scored = true;
      const pts = Math.hypot(b.throwFrom.x - RIM.x, b.throwFrom.z - RIM.z) > THREE_PT ? 3 : 2;
      if (L.gameBallMade && L.gameBallMade(b, pts)) return;   // Lightning handles its own balls
      L.stats.score += pts;
      state.dirtyBoard = true;
      forcePresence();
      celebrate(null, pts);
    };
    L.update = (dt, now) => {
      const e = (now - swishT) / 520;
      if (e >= 0 && e < 1) {
        net.scale.y = 1 + 0.35 * Math.sin(e * Math.PI) * (1 - e);
        net.rotation.y = 0.25 * Math.sin(e * Math.PI * 2) * (1 - e);
      } else { net.scale.y = 1; net.rotation.y = 0; }
      const f = Math.max(0, 1 - (now - state.flashT) / 800);
      bulbMat.color.copy(bulbWarm).lerp(bulbHot, f);
      glowMat.opacity = 0.55 + 0.45 * f;
      glowMat.size = 0.45 + 0.35 * f;
      for (const bcn of beacons) bcn.visible = ((now + bcn.userData.phase) % 2400) < 380;
    };
    L.presence = () => ({ s: L.stats.score });
    L.readPresence = (rec, pres, st) => {
      const s = Number.isInteger(pres.s) ? clamp(pres.s, 0, 99999) : 0;
      if (st.init && s > st.s) celebrate(rec.name, s - st.s);
      if (s !== st.s) state.dirtyBoard = true;
      st.s = s;
      st.init = true;
    };
    L.rowFor = (st, me) => ({ score: me ? L.stats.score : (st.s || 0), text: String(me ? L.stats.score : (st.s || 0)) });
    L.sortRows = (a, b) => b.score - a.score;
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#16142e'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#f5821f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#f5821f'; g.font = `800 64px ${DISPLAY}`;
      g.fillText('Rooftop Hoops', 36, 84);
      g.fillStyle = '#a9a3cf'; g.font = `400 24px ${BODY}`;
      g.fillText('Shots from outside the arc count for 3', 36, 122);
      drawRows(g, rows, 180, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => 'Reset balls', run: () => resetBodies(L) }];
    L.hints = [['Drag', 'look'], ['WASD', 'move'], ['E', 'grab'], ['Space', 'hold, then let go to throw']];
    L.spawn = () => {
      dolly.position.set((Math.random() - 0.5) * 2, 0, 2.6);
      state.yaw = 0;
    };
    L.attract = (now) => {
      const a = reduceMotion ? 0.7 : 0.7 + now * 0.00004;
      camera.position.set(Math.sin(a) * 9.5, 3.6, -1.5 + Math.cos(a) * 9.5);
      camera.lookAt(0, 1.9, -3.2);
    };

    // ================================================================ LIGHTNING (knockout)
    // Everyone lines up at the free-throw line (plus three computer shooters if you're alone); two balls are in play. The front shooter shoots first, the next
    // one right behind. Score before the person in front of you and they're out. First shot from the line;
    // after a miss, rebound and shoot from anywhere. Last one standing wins. Computer shooters fill the line.
    const FT_D = 3.9, FT = new V3(RIM.x, 0, RIM.z + FT_D);
    const LT_BOTS = [{ name: 'Swish Sam', color: '#ffb36b', skill: 1.0 }, { name: 'Bricky Bo', color: '#8bd450', skill: 1.35 }, { name: 'Net Nadia', color: '#b388ff', skill: 0.85 },
      { name: 'Hoop Hana', color: '#4fc3f7', skill: 0.95 }, { name: 'Dunk Dex', color: '#ff6a9a', skill: 1.15 }, { name: 'Rim Rosa', color: '#ffd23f', skill: 1.05 }, { name: 'Layup Lou', color: '#5ad8b0', skill: 1.25 }];
    const LT = { ph: 0, gid: 0, order: [], line: [], front: '', chaser: '', out: [], winner: '', ballOf: {}, giveSeq: {}, frontShot: false, ev: [0, 0, '', ''] };
    L.lt = LT;
    const ltMe = { req: null, reqSeq: 0, reports: [], repSeq: 0, k: -1, giveSeen: -1, held: false, shots: 0 };
    L.ltMe = ltMe;
    const GAME_BALLS = [0, 1];
    const herePeersLT = () => {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    };
    const ltHost = () => herePeersLT()[0] === state.myPeer;
    const isBot = (id) => typeof id === 'string' && id.startsWith('bot:');
    const nameLT = (id) => (isBot(id) ? (LT_BOTS[Number(id.slice(4))] || {}).name || 'Bot' : id === state.myPeer ? state.name : (remotes.get(id) || {}).name || 'Someone');
    const holderOf = (k) => Object.keys(LT.ballOf).find((id) => LT.ballOf[id] === k);
    const lightningOn = () => LT.ph === 1;

    // ---------------------------------------------------------------- computer shooters
    const bots = LT_BOTS.map((cfg, n) => {
      const body = buildAvatar(cfg.color, (n + 2) % HATS.length, n % FACES.length, false);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cfg.name, 128, 33); }).tex, transparent: true, depthWrite: false }));
      label.scale.set(0.9, 0.225, 1); label.position.y = 0.42;
      body.add(label);
      body.visible = false;
      G.add(body);
      return { id: `bot:${n}`, n, cfg, body, x: 0, z: 0, yaw: 0, ph: 'line', t0: 0, rx: 0, rz: 0, active: false };
    });
    L.ltBots = bots;
    const botById = (id) => bots.find((b) => b.id === id);
    const lineSpot = (i) => new V3(-1.6 - (i % 2) * 0.7, 0, FT.z + 1.3 + Math.floor(i / 2) * 0.8);
    const handOf = (bt, out) => out.set(bt.x - Math.sin(bt.yaw) * 0.32, 1.25, bt.z - Math.cos(bt.yaw) * 0.32);
    const ltGauss = () => (rand() + rand() + rand() - 1.5) / 0.5;
    const _lv = new V3(), _lh = new V3();

    // ---------------------------------------------------------------- balls changing hands (host)
    function give(id, k, now) {
      if (k !== 0 && k !== 1) k = GAME_BALLS.find((j) => !Object.values(LT.ballOf).includes(j));
      if (k === undefined) return;
      const b = L.bodies[k];
      b.v += 1; b.owner = state.myPeer; b.held = null;
      b.vel.set(0, 0, 0); b.corr.set(0, 0, 0); b.sleeping = true; b.restT = 0; b.scored = true; b.data = {};
      LT.ballOf[id] = k;
      LT.giveSeq[id] = (LT.giveSeq[id] || 0) + 1;
      const bt = botById(id);
      if (bt) { bt.ph = 'carry'; bt.shots = 0; bt.t0 = now; b.data.botHeld = bt.n; handOf(bt, b.pos); }
      else b.pos.set(FT.x + (k === 0 ? -0.45 : 0.45), 1.0, FT.z + 0.25);   // waiting for you at the line
      b.prev.copy(b.pos);
      forcePresence();
    }
    function announceLT(code, a, b) { LT.ev = [LT.ev[0] + 1, code, a || '', b || '']; showEventLT(LT.ev); forcePresence(); }
    function startLightning(now) {
      const humans = herePeersLT();
      // computer shooters make up the numbers to the picker's count (at least two players in all)
      const nb = Math.min(bots.length, Math.max(humans.length < 2 ? 1 : 0, L.picker.n - humans.length));
      const order = [];
      for (let i = 0; i < Math.max(humans.length, nb); i++) { if (humans[i]) order.push(humans[i]); if (i < nb) order.push(bots[i].id); }
      Object.assign(LT, { gid: LT.gid + 1, ph: 1, order, out: [], winner: '', ballOf: {}, frontShot: false });
      for (const bt of bots) { bt.active = order.includes(bt.id); bt.ph = 'line'; }
      LT.front = order[0]; LT.chaser = order[1]; LT.line = order.slice(2); LT.frontT = now;
      placeLine();
      give(LT.front, 0, now); give(LT.chaser, 1, now);
      announceLT(1, LT.front, '');
    }
    function placeLine() { LT.line.forEach((id, i) => { const bt = botById(id); if (bt) { const p = lineSpot(i); bt.tx = p.x; bt.tz = p.z; if (bt.ph !== 'carry') bt.ph = 'line'; } }); }
    function shooterMade(id, k, now) {
      if (LT.ph !== 1) return;
      if (id === LT.front) {
        // safe: to the back of the line, and the ball goes to the next in line
        const ball = LT.ballOf[id]; delete LT.ballOf[id];
        LT.line.push(id);
        const next = LT.line.shift();
        LT.front = LT.chaser; LT.chaser = next; LT.frontShot = true; LT.frontShotT = now; LT.frontT = now;
        announceLT(2, id, '');
        give(next, ball, now);
      } else if (id === LT.chaser) {
        // knocked out the person in front
        const gone = LT.front;
        LT.out.push(gone);
        const fb = LT.ballOf[gone], cb = LT.ballOf[id];
        delete LT.ballOf[gone]; delete LT.ballOf[id];
        LT.line.push(id);
        const gbt = botById(gone); if (gbt) { gbt.ph = 'out'; }
        if (LT.line.length <= 1) {
          LT.winner = LT.line[0]; LT.ph = 2; LT.front = ''; LT.chaser = '';
          announceLT(4, LT.winner, gone);
          return;
        }
        announceLT(3, id, gone);
        LT.front = LT.line.shift(); LT.chaser = LT.line.shift(); LT.frontShot = false; LT.frontT = now;
        give(LT.front, fb, now); give(LT.chaser, cb, now);
      }
      placeLine();
      void k;
    }
    function dropShooter(id, now) {
      // someone left mid-game: they're out
      if (id === LT.front || id === LT.chaser) {
        const ball = LT.ballOf[id]; delete LT.ballOf[id];
        LT.out.push(id);
        if (id === LT.front) LT.front = LT.chaser;
        LT.chaser = LT.line.shift() || '';
        if (!LT.chaser) { LT.winner = LT.front; LT.ph = 2; announceLT(4, LT.winner, id); return; }
        give(LT.chaser, ball, now);
      } else { LT.line = LT.line.filter((x) => x !== id); LT.out.push(id); }
    }
    // a make reported by a person's page: [seq, ball, first shot?, distance x10]
    function hostMakeReport(from, r, now) {
      if (LT.ph !== 1 || LT.ballOf[from] !== r[1]) return;
      if (r[2] === 1 && r[3] < (FT_D - 0.5) * 10) { announceLT(5, from, ''); give(from, r[1], now); return; }
      shooterMade(from, r[1], now);
    }
    function hostRequestLT(req, now) {
      if (!Array.isArray(req) || req.length !== 3 || req[1] !== LT.gid) return;
      if (req[0] === 1 && LT.ph !== 1) startLightning(now);
      else if (req[0] === 2 && LT.ph !== 0) { LT.ph = 0; LT.ballOf = {}; for (const bt of bots) bt.active = false; announceLT(6, '', ''); }
    }

    // ---------------------------------------------------------------- how a computer shooter plays (host)
    function botShoot(bt, b, now) {
      const from = handOf(bt, _lh).clone(); from.y = 2.05;
      const dx = RIM.x - from.x, dz = RIM.z - from.z, d = Math.hypot(dx, dz), dh = RIM.y + 0.03 - from.y;
      const th = d < 2.2 ? 1.3 : 0.96;   // up close, a high arc so it drops in rather than clipping the front of the rim
      const c = Math.cos(th);
      const v = Math.sqrt((GRAVITY * d * d) / Math.max(0.05, 2 * c * c * (d * Math.tan(th) - dh)));
      // shakier on the first shot from the line; rebounds are as before
      const sk = bt.cfg.skill * (1 + Math.max(0, d - FT_D) * 0.12) * (bt.shots ? 1 : 1.6);
      const a = th + ltGauss() * (0.011 + 0.0035 * d) * sk, sp = v * (1 + ltGauss() * (0.007 + 0.0028 * d) * sk), yaw = ltGauss() * (0.008 + 0.0028 * d) * sk;
      const hx = dx / d, hz = dz / d, cy = Math.cos(yaw), sy = Math.sin(yaw);
      const ux = hx * cy - hz * sy, uz = hx * sy + hz * cy;
      b.v += 1; b.owner = state.myPeer; b.held = null; b.sleeping = false; b.restT = 0; b.scored = false;
      b.pos.copy(from); b.prev.copy(from);
      b.vel.set(ux * Math.cos(a) * sp, Math.sin(a) * sp, uz * Math.cos(a) * sp);
      b.throwFrom.copy(from);
      b.data = {};
      bt.shots = (bt.shots || 0) + 1;
      bt.ph = 'shot'; bt.t0 = now;
      if (bt.id === LT.front && !LT.frontShot) { LT.frontShot = true; LT.frontShotT = now; }
      forcePresence();
    }
    function moveToward(bt, tx, tz, speed, dt) {
      const dx = tx - bt.x, dz = tz - bt.z, d = Math.hypot(dx, dz);
      if (d < 0.05) return true;
      const s = Math.min(d, speed * dt);
      bt.x += (dx / d) * s; bt.z += (dz / d) * s;
      bt.yaw = Math.atan2(-dx, -dz);
      return d < 0.12;
    }
    function botStepLT(bt, dt, now) {
      const k = LT.ballOf[bt.id];
      const b = k === undefined ? null : L.bodies[k];
      if (bt.ph === 'out') { moveToward(bt, 4.6, FT.z + 3.5 + bt.n * 0.7, 2.5, dt); return; }
      if (!b) { if (bt.tx !== undefined) moveToward(bt, bt.tx, bt.tz, 3, dt); return; }
      if (bt.ph === 'carry') {
        // first shot from the line; after that, from wherever they picked up the rebound (closer if it's far out)
        let tx = bt.x, tz = bt.z;
        if (!bt.shots) { tx = FT.x + (k === 0 ? -0.4 : 0.4); tz = FT.z; }
        else {
          const d = Math.hypot(bt.x - RIM.x, bt.z - RIM.z) || 0.01;
          // too far: come in closer; right under the basket: step out a little
          const want = d > 4.5 ? 3.2 : d < 1.1 ? 1.4 : d;
          let ux = (bt.x - RIM.x) / d, uz = (bt.z - RIM.z) / d;
          if (uz < 0.3) { uz = 0.6; ux = Math.sign(ux || 1) * 0.8; }   // never shoot from behind the backboard
          tx = RIM.x + ux * want; tz = RIM.z + uz * want;
        }
        const there = moveToward(bt, tx, tz, 3.2, dt);
        handOf(bt, b.pos); b.prev.copy(b.pos); b.sleeping = true; b.vel.set(0, 0, 0);
        if (there) {
          bt.yaw = Math.atan2(-(RIM.x - bt.x), -(RIM.z - bt.z));
          // the shooter behind waits half a second after the front's first shot (or 6 s if the front never shoots)
          const mayShoot = bt.id === LT.front || (LT.frontShot && now - (LT.frontShotT || 0) > 500) || now - (LT.frontT || 0) > 6000;
          if (!bt.aimT) bt.aimT = now;
          if (mayShoot && now - bt.aimT > 1150 + rand() * 400) { bt.aimT = 0; botShoot(bt, b, now); }
        } else bt.aimT = 0;
      } else if (bt.ph === 'shot') {
        // chase the rebound
        if (b.held || b.owner !== state.myPeer) return;
        const low = b.pos.y < 1.5 && (b.vel.y < 0.5 || b.sleeping);
        if (now - bt.t0 > 500 && low) moveToward(bt, b.pos.x, b.pos.z, 4.6, dt);
        if (Math.hypot(b.pos.x - bt.x, b.pos.z - bt.z) < 0.55 && b.pos.y < 1.4 && now - bt.t0 > 600) {
          b.v += 1; b.owner = state.myPeer; b.sleeping = true; b.vel.set(0, 0, 0); b.scored = true;
          bt.ph = 'carry'; bt.t0 = now;
          forcePresence();
        }
      }
    }

    // ---------------------------------------------------------------- scoring with a game ball
    L.canGrab = (b) => {
      if (!lightningOn() || !GAME_BALLS.includes(b.i)) return true;
      if (LT.ballOf[state.myPeer] === b.i) return true;
      showToast('That\u2019s someone else\u2019s ball');
      return false;
    };
    L.gameBallMade = (b, pts) => {
      if (!lightningOn() || !GAME_BALLS.includes(b.i)) return false;
      const id = holderOf(b.i);
      const now = performance.now();
      if (isBot(id)) { if (ltHost()) shooterMade(id, b.i, now); }
      else if (id === state.myPeer) {
        const r = [++ltMe.repSeq, b.i, ltMe.shots <= 1 ? 1 : 0, Math.round(Math.hypot(b.throwFrom.x - RIM.x, b.throwFrom.z - RIM.z) * 10)];
        ltMe.reports.push(r); if (ltMe.reports.length > 4) ltMe.reports.shift();
        if (ltHost()) hostMakeReport(state.myPeer, r, now);
        forcePresence();
      }
      void pts;
      return true;
    };

    // ---------------------------------------------------------------- what happened, for everyone
    function showEventLT(ev) {
      const [, code, a, b] = ev;
      if (code === 1) { showToast(`Lightning! ${nameLT(a)} shoots first`); sfx('fanfare', 0.6); }
      else if (code === 2) { swishLT(); showToast(a === state.myPeer ? 'Safe! Back of the line' : `${nameLT(a)} is safe`); }
      else if (code === 3) { swishLT(); showToast(b === state.myPeer ? `${nameLT(a)} knocked you out!` : `${nameLT(a)} knocks out ${nameLT(b)}!`); sfx('buzzer', 0.5); }
      else if (code === 4) { swishLT(); showToast(a === state.myPeer ? 'You win Lightning!' : `${nameLT(a)} wins Lightning!`); sfx('cheer', 0.9); }
      else if (code === 5) showToast(a === state.myPeer ? 'Your first shot has to be from the line' : `${nameLT(a)}: first shot has to be from the line`);
      else if (code === 6) showToast('Lightning ended');
      state.dirtyBoard = true; state.hudDirty = true;
    }
    function swishLT() { sfx('swish', 0.9); state.flashT = performance.now(); spawnFloat('Swish!', new V3(RIM.x, RIM.y + 0.4, RIM.z + 0.1), '#ffd23f'); }

    // ---------------------------------------------------------------- per frame
    const baseUpdateLT = L.update, basePresenceLT = L.presence, baseReadLT = L.readPresence, baseDrawLT = L.drawBoard, baseRowLT = L.rowFor, baseSortLT = L.sortRows;
    L.update = (dt, now) => {
      baseUpdateLT(dt, now);
      const host = ltHost();
      if (host) {
        if (ltMe.req && ltMe.req.join() !== ltMe.lastOwnReq) { ltMe.lastOwnReq = ltMe.req.join(); hostRequestLT(ltMe.req, now); }
        if (LT.ph === 1) {
          const here = herePeersLT();
          for (const id of [LT.front, LT.chaser, ...LT.line]) if (!isBot(id) && id && !here.includes(id)) dropShooter(id, now);
          for (const bt of bots) if (bt.active) botStepLT(bt, dt, now);
          const fk = LT.ballOf[LT.front];
          if (!LT.frontShot && !isBot(LT.front) && fk !== undefined) { const fb = L.bodies[fk]; if (!fb.held && fb.owner === LT.front && !fb.sleeping) { LT.frontShot = true; LT.frontShotT = now; } }
        }
      }
      // my ball: count my shots (the first one has to be from the line)
      const k = LT.ballOf[state.myPeer];
      if (lightningOn() && k !== undefined) {
        if ((LT.giveSeq[state.myPeer] || 0) !== ltMe.giveSeen) { ltMe.giveSeen = LT.giveSeq[state.myPeer] || 0; ltMe.shots = 0; ltMe.held = false; }
        const b = L.bodies[k], mine = !!(b.held && b.held.peer === state.myPeer);
        if (ltMe.held && !mine) ltMe.shots += 1;
        ltMe.held = mine;
      }
      // computer shooters, drawn for everyone
      const show = state.level === L.idx;
      for (const bt of bots) {
        bt.body.visible = show && bt.active;
        if (!bt.body.visible) continue;
        const kk = 1 - Math.exp(-dt * (host ? 30 : 10));
        if (Math.hypot(bt.rx - bt.x, bt.rz - bt.z) > 6) { bt.rx = bt.x; bt.rz = bt.z; }
        bt.rx += (bt.x - bt.rx) * kk; bt.rz += (bt.z - bt.rz) * kk;
        bt.body.position.set(bt.rx, 1.55 + (bt.ph === 'shot' && now - bt.t0 < 350 ? 0.25 * Math.sin(((now - bt.t0) / 350) * Math.PI) : 0), bt.rz);
        bt.body.rotation.y = bt.yaw;
      }
      if (now - (L._ltBoardT || 0) > 400) { L._ltBoardT = now; if (LT.ph) state.dirtyBoard = true; }
    };

    // ---------------------------------------------------------------- network
    const q2 = (x) => Math.round(x * 100) / 100;
    const BOT_PH = { line: 0, carry: 1, shot: 2, out: 3 }, BOT_PHN = ['line', 'carry', 'shot', 'out'];
    L.presence = () => {
      const p = basePresenceLT();
      if (ltMe.req) p.ltq = ltMe.req.slice();
      if (ltMe.reports.length) p.ltm = ltMe.reports.map((r) => r.slice());
      if (ltHost()) {
        p.lts = [LT.gid, LT.ph, LT.frontShot ? 1 : 0];
        p.lto = LT.order.slice(0, 12); p.ltl = LT.line.slice(0, 12); p.ltx = LT.out.slice(0, 12);
        p.ltf = LT.front; p.ltc = LT.chaser; p.ltw = LT.winner;
        p.ltb = Object.entries(LT.ballOf).map(([id, k]) => [id, k, LT.giveSeq[id] || 0]);
        p.ltp = bots.filter((b) => b.active).map((b) => [b.n, q2(b.x), q2(b.z), q2(b.yaw), BOT_PH[b.ph] || 0, Math.round((performance.now() - b.t0) / 10)]);
        p.lte = LT.ev.slice();
      }
      return p;
    };
    const strArr = (a) => Array.isArray(a) && a.every((x) => typeof x === 'string' && x.length < 80);
    L.readPresence = (rec, pres, st) => {
      baseReadLT(rec, pres, st);
      const now = performance.now();
      if (ltHost()) {
        if (Array.isArray(pres.ltq) && pres.ltq.join() !== st.ltq) { st.ltq = pres.ltq.join(); if (st.ltqInit) hostRequestLT(pres.ltq, now); }
        st.ltqInit = true;
        if (Array.isArray(pres.ltm)) for (const r of pres.ltm.slice(-4)) { if (!Array.isArray(r) || r.length !== 4 || !r.every(Number.isInteger) || r[0] <= (st.ltmSeq || 0)) continue; st.ltmSeq = r[0]; hostMakeReport(rec.peer, r, now); }
        return;
      }
      if (rec.peer !== herePeersLT()[0] || !Array.isArray(pres.lts) || pres.lts.length !== 3) return;
      LT.gid = pres.lts[0] | 0; LT.ph = clamp(pres.lts[1] | 0, 0, 2); LT.frontShot = pres.lts[2] === 1;
      if (strArr(pres.lto)) LT.order = pres.lto.slice(); if (strArr(pres.ltl)) LT.line = pres.ltl.slice(); if (strArr(pres.ltx)) LT.out = pres.ltx.slice();
      LT.front = typeof pres.ltf === 'string' ? pres.ltf : ''; LT.chaser = typeof pres.ltc === 'string' ? pres.ltc : ''; LT.winner = typeof pres.ltw === 'string' ? pres.ltw : '';
      if (Array.isArray(pres.ltb)) { LT.ballOf = {}; for (const e of pres.ltb) if (Array.isArray(e) && typeof e[0] === 'string' && (e[1] === 0 || e[1] === 1) && Number.isInteger(e[2])) { LT.ballOf[e[0]] = e[1]; LT.giveSeq[e[0]] = e[2]; } }
      const seen = new Set();
      if (Array.isArray(pres.ltp)) for (const a of pres.ltp) {
        if (!Array.isArray(a) || a.length !== 6 || !a.every(finite) || !bots[a[0]]) continue;
        const bt = bots[a[0]]; seen.add(bt.n);
        if (!bt.active) { bt.rx = a[1]; bt.rz = a[2]; }
        Object.assign(bt, { active: true, x: a[1], z: a[2], yaw: a[3], ph: BOT_PHN[clamp(a[4], 0, 3)], t0: now - a[5] * 10 });
      }
      for (const bt of bots) if (!seen.has(bt.n)) bt.active = false;
      const ev = pres.lte;
      if (Array.isArray(ev) && ev.length === 4 && Number.isInteger(ev[0]) && ev[0] !== LT.ev[0]) { const fresh = LT.ev[0] !== 0; LT.ev = ev.slice(); if (fresh) showEventLT(ev); }
    };
    function requestLT(kind) {
      ltMe.req = [kind, LT.gid, ++ltMe.reqSeq];
      if (ltHost()) { ltMe.lastOwnReq = ltMe.req.join(); hostRequestLT(ltMe.req, performance.now()); }
      forcePresence();
    }
    L.requestLightning = requestLT;
    makeButton(L, new V3(-2.6, 1.0, 2.9), 0xffd23f, 'Lightning', () => requestLT(LT.ph === 1 ? 2 : 1), { faceYaw: Math.PI / 2 });
    L.hudActions.push({ label: () => (LT.ph === 1 ? 'End Lightning' : 'Lightning'), run: () => requestLT(LT.ph === 1 ? 2 : 1) });

    // ---------------------------------------------------------------- the board: the line during a game
    L.drawBoard = (rows) => {
      if (!LT.ph) { baseDrawLT(rows); return; }
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#16142e'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 60px ${DISPLAY}`; g.fillText('Lightning', 36, 80);
      g.fillStyle = '#a9a3cf'; g.font = `400 24px ${BODY}`;
      g.fillText(LT.ph === 2 ? `${nameLT(LT.winner)} wins!` : 'Score before the shooter ahead of you', 36, 116);
      const list = LT.ph === 2 ? [LT.winner] : [LT.front, LT.chaser, ...LT.line].filter(Boolean);
      list.slice(0, 6).forEach((id, i) => {
        const y = 170 + i * 44;
        g.fillStyle = i === 0 && LT.ph === 1 ? '#ffd23f' : i === 1 && LT.ph === 1 ? '#ff9a5c' : '#f4f2ff';
        g.font = `${i < 2 ? 700 : 400} 30px ${BODY}`;
        g.fillText(`${nameLT(id)}${id === state.myPeer ? ' (you)' : ''}`, 64, y, 420);
        g.textAlign = 'right'; g.fillStyle = '#ffd08a'; g.font = `700 24px ${BODY}`;
        g.fillText(LT.ph === 2 ? 'winner' : i === 0 ? 'shooting' : i === 1 ? 'right behind' : `${i - 1} back`, W - 40, y);
        g.textAlign = 'left';
      });
      if (LT.out.length) { g.fillStyle = '#8f89b8'; g.font = `400 22px ${BODY}`; g.fillText(`Out: ${LT.out.map(nameLT).join(', ')}`, 36, H - 30, W - 72); }
      L.board.tex.needsUpdate = true;
    };
    L.ltInternals = { startLightning, shooterMade, botShoot, give, FT, FT_D, LT_BOTS };
    return L;
  })();

  // Draws a list of player rows on a scoreboard canvas (shared by every level)
  function drawRows(g, rows, y0, step, W) {
    rows.slice(0, 6).forEach((p, i) => {
      const y = y0 + i * step;
      g.fillStyle = p.color; rr(g, 36, y - 26, 12, 32, 4); g.fill();
      g.textAlign = 'left';
      g.fillStyle = '#f4f2ff'; g.font = `${p.me ? 700 : 400} 30px ${BODY}`;
      g.fillText(p.me ? `${p.name} (you)` : p.name, 64, y, W - 330);
      g.textAlign = 'right';
      g.fillStyle = '#ffd08a'; g.font = `800 38px ${DISPLAY}`;
      g.fillText(p.text, W - 40, y + 2, 240);
    });
    g.textAlign = 'left';
    if (rows.length === 1) {
      g.fillStyle = '#8f89b8'; g.font = `400 24px ${BODY}`;
      g.fillText('Friends who open this page will show up here', 36, y0 + step + 24);
    }
  }

