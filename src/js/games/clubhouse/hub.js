  // ================================================================ LEVEL: THE CLUBHOUSE (hub)
  const hub = (() => {
    const L = newLevel(HUB);
    const G = L.group;
    const rand = mulberry32(1111);
    L.gravityScale = 0.35;
    L.airDrag = 0.5;
    L.rollFriction = 0.9;
    // 24 m wide and 30 m deep: the south end has room behind the ping pong and air hockey tables, and for foosball and pop-a-shot
    const R = { minX: -12, maxX: 12, minZ: -12, maxZ: 18, H: 5 };
    const DEPTH = R.maxZ - R.minZ, MIDZ = (R.maxZ + R.minZ) / 2;
    L.bounds = R;
    L.env = {
      sky: skyTexture([[0, '#2a1f2e'], [1, '#2a1f2e']]),
      bg: 0x2a1f2e, fog: [0x2a1f2e, 30, 90], hemi: [0xffe6cc, 0x3a2a30, 0.78],
      sun: [0xffd8a8, 0.45], sunDir: new V3(0.4, 1, 0.3), ambient: [0x5a4040, 0.35],
      sprite: null,
    };

    // room
    const woodTex = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#6a4228'; g.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 8; r++) for (let c = -1; c < 3; c++) {
        const s = 112 + Math.floor(rand() * 34), x = c * 128 + (r % 2) * 64;
        g.fillStyle = `rgb(${s + 34},${s - 4},${s - 46})`;
        g.fillRect(x, r * 32, 128, 30);
        g.fillStyle = 'rgba(50,25,8,0.4)'; g.fillRect(x, r * 32 + 30, 128, 2); g.fillRect(x, r * 32, 2, 32);
      }
      for (let i = 0; i < 1500; i++) { g.fillStyle = 'rgba(70,35,10,0.08)'; g.fillRect(rand() * 256, rand() * 256, 6, 1); }
    });
    woodTex.tex.wrapS = woodTex.tex.wrapT = THREE.RepeatWrapping;
    woodTex.tex.repeat.set(8, 8);
    woodTex.tex.repeat.set(8, 10);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, DEPTH), new THREE.MeshLambertMaterial({ map: woodTex.tex }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = MIDZ;
    G.add(floor);
    const wallMat = lam(0xe6d2b8), trimMat = lam(0x6b4a33), ceilMat = lam(0x5a3e2c);
    for (const [x, z, w, d] of [[0, R.minZ, 24, 0.3], [0, R.maxZ, 24, 0.3], [R.minX, MIDZ, 0.3, DEPTH], [R.maxX, MIDZ, 0.3, DEPTH]]) {
      addBox(G, w, R.H, d, wallMat, x, R.H / 2, z);
      addBox(G, w + 0.02, 1.0, d + 0.06, trimMat, x, 0.5, z);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, DEPTH), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = R.H; ceil.position.z = MIDZ;
    G.add(ceil);
    for (let x = -10; x <= 10; x += 4) addBox(G, 0.3, 0.3, DEPTH, trimMat, x, R.H - 0.15, MIDZ);
    // windows onto a sunset
    const sunset = canvasTexture(16, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, '#3a2e6a'); gr.addColorStop(0.55, '#e8826a'); gr.addColorStop(0.75, '#ffd08a'); gr.addColorStop(0.76, '#3b5a7a'); gr.addColorStop(1, '#2a4560');
      g.fillStyle = gr; g.fillRect(0, 0, 16, 128);
    }).tex;
    const winMat = new THREE.MeshBasicMaterial({ map: sunset, fog: false });
    for (const z of [-7, -1, 5, 11, 16.5]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), winMat);
      w.rotation.y = -Math.PI / 2; w.position.set(R.maxX - 0.16, 2.6, z);
      G.add(w);
      addBox(G, 0.1, 2.2, 0.12, trimMat, R.maxX - 0.18, 2.6, z); addBox(G, 0.1, 0.12, 2.8, trimMat, R.maxX - 0.18, 2.6, z);
    }
    // warm lights and pendant lamps
    for (const [x, z, c, i] of [[-6, 6, 0xffb070, 1.0], [0, -2, 0xffe2b8, 0.9], [6.5, 6.5, 0xff70c0, 0.8], [-6, 15, 0xffd8a0, 0.9], [4, 15, 0xffd8a0, 0.9]]) {
      const l = new THREE.PointLight(c, i, 18, 1.4);
      l.position.set(x, 3.8, z);
      G.add(l);
      if (x === 6.5) L.danceLight = l;
    }
    const lampGlow = new THREE.SpriteMaterial({ map: warmGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffd8a0 });
    for (const [x, z] of [[-6, 2], [-2, 8], [2, 8], [0, -5], [-6, -6], [6, -6], [0, 14.6], [-7, 15.6], [7.5, 15.6]]) {
      addCyl(G, 0.01, 0.01, 1.2, 4, trimMat, x, R.H - 0.6, z);
      addCyl(G, 0.12, 0.28, 0.3, 12, lam(0x2e5a5a), x, R.H - 1.3, z);
      const s = new THREE.Sprite(lampGlow); s.position.set(x, R.H - 1.5, z); s.scale.set(0.9, 0.9, 1);
      G.add(s);
    }
    makePlate(G, 'The Clubhouse', 4.4, 0.7, new V3(0, 3.9, R.maxZ - 0.17), Math.PI, { bg: '#6b4a33', fg: '#ffe2b8', size: 0.72 });

    // lounge: rug, couches, coffee table, fireplace, plants
    const rug = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#8a3b4a'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#e8b54a'; g.lineWidth = 6; g.strokeRect(10, 10, 108, 108);
      g.strokeStyle = '#f4e2c8'; g.lineWidth = 3; g.strokeRect(22, 22, 84, 84);
      g.fillStyle = '#e8b54a'; g.beginPath(); g.arc(64, 64, 16, 0, Math.PI * 2); g.fill();
    }).tex;
    const rugM = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshLambertMaterial({ map: rug }));
    rugM.rotation.x = -Math.PI / 2; rugM.position.set(-7, 0.005, 6);
    G.add(rugM);
    const fabric = lam(0x2e7a74), fabricDark = lam(0x235f5a);
    const COUCHES = [[-7, 8.6, 3.4, 0.9, 0], [-9.6, 6, 0.9, 3.0, 1]];
    for (const [x, z, w, d, side] of COUCHES) {
      addBox(G, w, 0.45, d, fabric, x, 0.225, z);
      if (side) addBox(G, 0.25, 0.85, d, fabricDark, x - w / 2 + 0.12, 0.42, z);
      else addBox(G, w, 0.85, 0.25, fabricDark, x, 0.42, z + d / 2 - 0.12);
    }
    addBox(G, 1.6, 0.4, 0.9, trimMat, -7, 0.2, 5.8);
    addBox(G, 0.3, 0.2, 0.3, lam(0xe8b54a), -7.3, 0.5, 5.8);
    // the chimney is built around a real opening (a recess you can see into), not a solid block
    const stone = lam(0x7a6d66), X0 = R.minX;
    addBox(G, 0.6, 2.6, 0.6, stone, X0 + 0.3, 1.3, 0.5);          // left pillar     z 0.2 to 0.8
    addBox(G, 0.6, 2.6, 0.6, stone, X0 + 0.3, 1.3, 2.5);          // right pillar    z 2.2 to 2.8
    addBox(G, 0.6, 1.55, 1.4, stone, X0 + 0.3, 1.825, 1.5);       // above the opening, y 1.05 to 2.6
    addBox(G, 0.6, 0.05, 1.4, stone, X0 + 0.3, 0.025, 1.5);       // the hearth floor
    addBox(G, 0.04, 1.0, 1.4, lam(0x1b1414), X0 + 0.27, 0.55, 1.5);   // the soot-black back of the recess
    for (const dz of [-0.28, 0.28]) { const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8), lam(0x4a2f1a)); log.rotation.x = Math.PI / 2; log.position.set(X0 + 0.45, 0.12, 1.5 + dz * 0.1); G.add(log); }
    const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xff9a2a }), flameMat3 = new THREE.MeshBasicMaterial({ color: 0xffd860 });
    const flames = [];
    for (const [dz, h, c] of [[-0.3, 0.45, 0], [0, 0.6, 1], [0.3, 0.42, 0], [-0.1, 0.32, 1], [0.12, 0.34, 1]]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, h, 7), c ? flameMat3 : flameMat2);
      f.position.set(X0 + 0.45, 0.2 + h / 2, 1.5 + dz); G.add(f); flames.push({ f, h, base: 0.2, ph: Math.random() * 6 });
    }
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xff8a3a }));
    fire.position.set(X0 + 0.95, 0.6, 1.5); fire.scale.set(0.8, 0.65, 1);
    G.add(fire);
    L.fireplace = { fire, flames, bx: R.minX + 0.95, bz: 1.5 };
    const fireLight = new THREE.PointLight(0xff8a3a, 0.9, 8, 1.6);
    fireLight.position.set(R.minX + 1.2, 0.8, 1.5);
    G.add(fireLight);
    for (const [x, z] of [[-11, 17], [11, 17], [-11, -11], [11, -11], [-11, 11.5], [11, 11.5], [3.2, 17.2]]) {   // (the last one moved out of the ping pong table's way)
      addCyl(G, 0.3, 0.24, 0.55, 10, lam(0xc46a3a), x, 0.275, z);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), lam(0x4e8a3a));
      leaf.position.set(x, 1.0, z); leaf.scale.set(1, 1.3, 1);
      G.add(leaf);
    }

    // dance floor and jukebox
    const DF = { x: 6.5, z: 6.5, n: 6 };
    const tiles = [];
    for (let i = 0; i < DF.n; i++) for (let j = 0; j < DF.n; j++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.04, 0.96), new THREE.MeshBasicMaterial({ color: 0x332244 }));
      m.position.set(DF.x - DF.n / 2 + 0.5 + i, 0.02, DF.z - DF.n / 2 + 0.5 + j);
      G.add(m);
      tiles.push({ m, i, j });
    }
    const discoTex = canvasTexture(64, 32, (g) => { for (let y = 0; y < 32; y += 4) for (let x = 0; x < 64; x += 4) { const s = 150 + Math.floor(rand() * 100); g.fillStyle = `rgb(${s},${s},${s + 10})`; g.fillRect(x, y, 3, 3); } }).tex;
    const disco = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshLambertMaterial({ map: discoTex, emissive: 0x222233 }));
    disco.position.set(DF.x, R.H - 0.9, DF.z);
    G.add(disco);
    addCyl(G, 0.01, 0.01, 0.55, 4, trimMat, DF.x, R.H - 0.3, DF.z);
    addBox(G, 0.8, 1.4, 0.9, lam(0x6b2a4a), R.maxX - 0.6, 0.7, DF.z);
    const jbGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 16, 1, false, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffb0e0 }));
    jbGlow.rotation.z = Math.PI / 2; jbGlow.rotation.y = Math.PI / 2;
    jbGlow.position.set(R.maxX - 0.6, 1.4, DF.z);
    G.add(jbGlow);

    // portals to every game, in an arc
    const PORTAL_LEVELS = LEVEL_META.map((m, i) => i).filter((i) => i !== HUB);
    const swirl = canvasTexture(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0.15)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(64, 64, 12 + k * 11, k, k + 3.6); g.stroke(); }
    }).tex;
    swirl.center.set(0.5, 0.5);
    // a wide arc; once there are too many to fit side by side, every portal gets a little narrower
    const PORTAL_GAP = (9.5 * Math.PI * 1.16) / (PORTAL_LEVELS.length - 1);
    const PORTAL_W = Math.min(1, (PORTAL_GAP - 0.08) / 2.08);
    const portals = PORTAL_LEVELS.map((lv, k) => {
      const a = ((k / (PORTAL_LEVELS.length - 1)) - 0.5) * Math.PI * 1.16;
      const px = Math.sin(a) * 9.5, pz = -2 - Math.cos(a) * 9.5;
      const g = new THREE.Group();
      g.position.set(px, 0, pz);
      g.rotation.y = -a;
      g.scale.x = PORTAL_W;
      const col = KIOSK_COLORS[lv];
      const frameMat = new THREE.MeshLambertMaterial({ color: col, emissive: new THREE.Color(col).multiplyScalar(0.25) });
      for (const sx of [-0.95, 0.95]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.3), frameMat); p.position.set(sx, 1.2, 0); g.add(p); }
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 8, 24, Math.PI), frameMat);
      arch.position.y = 2.4;
      g.add(arch);
      const t = swirl.clone(); t.needsUpdate = true; t.center.set(0.5, 0.5);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 2.4), new THREE.MeshBasicMaterial({ map: t, color: col, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
      surf.position.y = 1.2;
      g.add(surf);
      const lab = canvasTexture(320, 120);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: lab.tex, transparent: true }));
      plate.position.set(0, 3.6, 0);
      plate.scale.x = 1 / PORTAL_W;          // the label keeps its full width
      g.add(plate);
      G.add(g);
      return { lv, g, px, pz, a, surf, tex: t, lab, key: '' };
    });
    function drawPortalLabel(p, count) {
      const key = String(count);
      if (key === p.key) return;
      p.key = key;
      const g = p.lab.g, m = LEVEL_META[p.lv];
      g.clearRect(0, 0, 320, 120);
      rr(g, 4, 4, 312, 112, 18); g.fillStyle = 'rgba(30,20,28,0.85)'; g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffffff'; g.font = `800 46px ${DISPLAY}`;
      g.fillText(m.short, 160, 46, 296);
      g.fillStyle = count ? '#8bd450' : '#bfb2c8'; g.font = `700 26px ${BODY}`;
      g.fillText(count ? `${count} playing` : 'Walk in to play', 160, 90, 296);
      p.lab.tex.needsUpdate = true;
    }

    // your-look station: a statue of you on a turntable, with buttons
    const turntable = addCyl(G, 0.7, 0.75, 0.2, 24, lam(0x6b4a33), 0, 0.1, 0.4);
    const statue = new THREE.Group();
    statue.position.set(0, 0.2, 0.4);
    G.add(statue);
    let statueKey = '';
    function rebuildStatue() {
      const key = `${state.colorIdx}|${state.hat}|${state.face}|${state.shirt}|${state.shirtColor}`;
      if (key === statueKey) return;
      statueKey = key;
      statue.clear();
      const a = buildAvatar(PLAYER_COLORS[state.colorIdx].hex, state.hat, state.face, true, state.shirt, state.shirtColor);
      a.position.y = 1.35;
      a.scale.setScalar(1.25);
      statue.add(a);
    }
    makePlate(G, 'Your look', 1.6, 0.36, new V3(0, 2.75, 0.4), 0, { bg: '#6b4a33', fg: '#ffe2b8', size: 0.7 });
    makeButton(L, new V3(-1.44, 1.0, 1.75), 0xff5c8a, 'Next hat', () => cycleLook('hat'), { faceYaw: 0 });
    makeButton(L, new V3(-0.72, 1.0, 1.75), 0xffd23f, 'Next face', () => cycleLook('face'), { faceYaw: 0 });
    makeButton(L, new V3(0, 1.0, 1.75), 0x4fc3f7, 'Next color', () => cycleLook('color'), { faceYaw: 0 });
    makeButton(L, new V3(0.72, 1.0, 1.75), 0x8bd450, 'Next shirt', () => cycleLook('shirt'), { faceYaw: 0 });
    makeButton(L, new V3(1.44, 1.0, 1.75), 0xb388ff, 'Shirt color', () => cycleLook('shirtColor'), { faceYaw: 0 });
    makeButton(L, new V3(2.16, 1.0, 1.75), 0x9a90b0, 'VR turning', () => { prefs.smoothTurn = !prefs.smoothTurn; savePrefs(); showToast(prefs.smoothTurn ? 'VR turning: smooth' : 'VR turning: in steps'); }, { faceYaw: 0 });
    const musicBtn = makeButton(L, new V3(R.maxX - 1.4, 1.0, DF.z - 1.4), 0xff5c8a, 'Music', () => toggleMusic(), { faceYaw: -Math.PI / 2 });

    // who's here
    L.board = makeBoard(G, 720, 460, 2.6, 1.66, R.minX + 0.18, 2.5, -4.5, Math.PI / 2, false);
    let whoKey = '';
    function drawWho(now) {
      const rows = [{ name: state.name, color: PLAYER_COLORS[state.colorIdx].hex, me: true, where: state.mode === 'menu' ? 'in the menu' : LEVEL_META[state.level].short }];
      for (const rec of remotes.values()) {
        if (!rec.name) continue;
        rows.push({ name: rec.name, color: PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '#888', me: false, where: !rec.inGame ? 'in the menu' : LEVEL_META[rec.lv] ? LEVEL_META[rec.lv].short : '' });
      }
      const key = rows.map((r) => r.name + r.where + r.color).join('|');
      if (key === whoKey) return;
      whoKey = key;
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#2a1d24'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd27a'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd27a'; g.font = `800 60px ${DISPLAY}`; g.fillText('Who\u2019s here', 36, 80);
      rows.slice(0, 7).forEach((p, i) => {
        const y = 140 + i * 44;
        g.fillStyle = p.color; rr(g, 36, y - 24, 12, 30, 4); g.fill();
        g.textAlign = 'left'; g.fillStyle = '#f4ece4'; g.font = `${p.me ? 700 : 400} 28px ${BODY}`;
        g.fillText(p.me ? `${p.name} (you)` : p.name, 62, y, 380);
        g.textAlign = 'right'; g.fillStyle = '#ffd27a'; g.font = `800 32px ${DISPLAY}`;
        g.fillText(p.where, W - 36, y, 230);
      });
      if (rows.length === 1) { g.textAlign = 'left'; g.fillStyle = '#a8949c'; g.font = `400 24px ${BODY}`; g.fillText('Friends who open this page will show up here', 36, 200); }
      if (rows.length > 7) { g.textAlign = 'left'; g.fillStyle = '#a8949c'; g.font = `400 22px ${BODY}`; g.fillText(`and ${rows.length - 7} more`, 62, 448); }
      L.board.tex.needsUpdate = true;
    }
    L.drawBoard = () => { whoKey = ''; drawWho(performance.now()); };
    L.rowFor = () => ({ text: '' });
    L.sortRows = () => 0;

    // beach balls
    const beachTex = canvasTexture(256, 128, (g) => {
      const cols = ['#ff5c8a', '#ffffff', '#4fc3f7', '#ffd23f', '#ffffff', '#8bd450'];
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 256 / 6, 0, 256 / 6 + 1, 128); });
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 10); g.fillRect(0, 118, 256, 10);
    }).tex;
    const beachGeo = new THREE.SphereGeometry(0.3, 20, 14);
    for (const [x, z] of [[3.2, 2.6], [4.4, 1.6], [2.4, 1.2]]) makeBody(L, { geo: beachGeo, tex: beachTex, r: 0.3, slot: new V3(x, 0.302, z) });
    const COLL = [
      box(-0.75, 0, -0.35, 0.75, 0.2, 1.15, 0.5, 'floor'),
      box(R.maxX - 1.0, 0, DF.z - 0.45, R.maxX, 1.4, DF.z + 0.45, 0.6, 'wall'),
      box(-8.7, 0, 8.15, -5.3, 0.85, 9.05, 0.4, 'floor'),
      box(-10.05, 0, 4.5, -9.15, 0.85, 7.5, 0.4, 'floor'),
      box(R.minX, 0, 0.2, R.minX + 0.6, 2.6, 2.8, 0.4, 'wall'),
    ];
    L.collide = (b) => {
      let support = groundBounce(b, 0.75, 0.97, 'floor');
      if (b.pos.x < R.minX + 0.15 + b.r) { b.pos.x = R.minX + 0.15 + b.r; if (b.vel.x < 0) { impact(b, -b.vel.x, 'ball'); b.vel.x *= -0.7; } }
      if (b.pos.x > R.maxX - 0.15 - b.r) { b.pos.x = R.maxX - 0.15 - b.r; if (b.vel.x > 0) { impact(b, b.vel.x, 'ball'); b.vel.x *= -0.7; } }
      if (b.pos.z < R.minZ + 0.15 + b.r) { b.pos.z = R.minZ + 0.15 + b.r; if (b.vel.z < 0) { impact(b, -b.vel.z, 'ball'); b.vel.z *= -0.7; } }
      if (b.pos.z > R.maxZ - 0.15 - b.r) { b.pos.z = R.maxZ - 0.15 - b.r; if (b.vel.z > 0) { impact(b, b.vel.z, 'ball'); b.vel.z *= -0.7; } }
      if (b.pos.y > R.H - b.r) { b.pos.y = R.H - b.r; if (b.vel.y > 0) b.vel.y *= -0.5; }
      for (const bx of COLL) if (collideBox(b, bx) > 0.6) support = true;
      return support;
    };
    L.throwSpeed = [2, 9, 0.35];

    // the jukebox switches the shared music on and off; the dance floor follows its beat
    function toggleMusic() {
      ensureAudio();
      musicTheme('hub');
      setMusicOn(!MUSIC.on);
      musicBtn.lit = MUSIC.on;
    }
    L.toggleMusic = toggleMusic;
    L.music = MUSIC;
    const music = { beat: -1 };
    const PAL = [0xff5c8a, 0x4fc3f7, 0xffd23f, 0x8bd450, 0xb388ff, 0xff9a5c];

    // portals: walk in to go
    let portalCool = 0;
    const _d = new V3();
    L.update = (dt, now) => {
      rebuildStatue();
      statue.rotation.y += dt * 0.5;
      fire.scale.set(1.2 + Math.sin(now * 0.013) * 0.1, 1.0 + Math.sin(now * 0.021) * 0.12, 1);
      fireLight.intensity = 0.85 + Math.sin(now * 0.017) * 0.12;
      disco.rotation.y += dt * 0.6;
      musicBtn.lit = MUSIC.on;
      const beat = MUSIC.on && MUSIC.theme === 'hub' ? MUSIC.beat : -1;
      if (beat !== music.beat) {
        music.beat = beat;
        if (beat >= 0) for (const t of tiles) t.m.material.color.setHex(rand() < 0.45 ? PAL[Math.floor(rand() * PAL.length)] : 0x332244);
      }
      if (beat < 0) for (const t of tiles) t.m.material.color.setHSL(((t.i + t.j) * 0.06 + now * 0.00008) % 1, 0.55, 0.18 + 0.08 * Math.sin(now * 0.002 + t.i));
      if (L.danceLight) L.danceLight.color.setHSL((now * 0.0001) % 1, 0.7, 0.6);
      // portal labels, shimmer, and walking through
      const counts = LEVEL_META.map(() => 0);
      for (const p of state.lastPeers || []) {
        if (p.kind !== 'viewer' || p.sameTab || !p.presence || p.presence.p !== 1) continue;
        const lv = p.presence.lv;
        if (Number.isInteger(lv) && lv >= 0 && lv < counts.length) counts[lv]++;
      }
      for (const p of portals) {
        drawPortalLabel(p, counts[p.lv]);
        p.tex.rotation = now * 0.0012;
        p.surf.material.opacity = 0.62 + 0.12 * Math.sin(now * 0.003 + p.lv);
      }
      if (state.mode !== 'menu' && now > portalCool) {
        for (const p of portals) {
          _d.set(myHead.pos.x - p.px, 0, myHead.pos.z - p.pz);
          const lx = _d.x * Math.cos(p.a) + _d.z * Math.sin(p.a);
          const lz = -_d.x * Math.sin(p.a) + _d.z * Math.cos(p.a);
          if (Math.abs(lx) < 0.8 * PORTAL_W && Math.abs(lz) < 0.35) { portalCool = now + 2000; sfx('whoosh', 1); switchLevel(p.lv); return; }
        }
      }
      if (now - (L.whoT || 0) > 1000) { L.whoT = now; drawWho(now); }
    };
    L.portals = portals;
    L.onEnter = () => { portalCool = performance.now() + 1500; whoKey = ''; };
    L.onExit = () => {};
    L.hudActions = [];
    L.hints = [['WASD', 'move'], ['Drag', 'look'], ['Walk into a portal', 'play'], ['E', 'grab or press']];
    L.spawn = () => {
      dolly.position.set((Math.random() - 0.5) * 2, 0, 8.4);
      state.yaw = 0;
    };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.0001) * 0.4;
      camera.position.set(Math.sin(a) * 5, 2.4, 9.5);
      camera.lookAt(0, 1.6, -4);
    };
    {
      // the flames lick, and the glow in front of the opening leans toward you so the stonework can't cut it
      const hubBaseU = L.update, camF = new V3();
      L.update = (dt, now) => {
        if (hubBaseU) hubBaseU(dt, now);
        const FP = L.fireplace;
        for (const fl of FP.flames) { const s = 1 + Math.sin(now * 0.013 + fl.ph) * 0.18 + Math.sin(now * 0.031 + fl.ph * 2) * 0.1; fl.f.scale.set(1 - (s - 1) * 0.4, s, 1 - (s - 1) * 0.4); fl.f.position.y = FP.flames[0].base + fl.h * s / 2; }
        camera.getWorldPosition(camF);
        const dx = camF.x - FP.bx, dz = camF.z - FP.bz, d = Math.hypot(dx, dz) || 1, k = Math.min(0.3, d * 0.5);
        FP.fire.position.x = FP.bx + (dx / d) * k; FP.fire.position.z = FP.bz + (dz / d) * k;
      };
    }
    return L;
  })();

