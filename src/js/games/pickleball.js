  // ================================================================ LEVEL: SUNNY PICKLEBALL COURTS
  // Singles or doubles on a regulation court: underhand serves into the diagonal box, the two-bounce rule, no volleys
  // from the kitchen, rally scoring to 11 (win by 2). Four spots, two at each end (slot = side * 2 + spot; spot 0 plays
  // the right half, spot 1 the left; singles uses spot 0 only). Friends take spots; the court bots fill the rest.
  // Whoever the ball is heading toward runs it, so your own hits never lag.
  const pickleball = (() => {
    const L = newLevel(15);
    const G = L.group;
    const rand = mulberry32(4114);
    const HL = 6.705, HW = 3.05, NET_H = 0.88, KITCH = 2.13, BR = 0.037;   // half length (x), half width (z)
    const GRAV = 9.8, DRAG = 0.085, WIN = 11, MAG = 0.5;   // (a holey plastic ball: quick off the paddle, then it dies)   // MAG: how hard spin bends the ball (Magnus)
    const SIDE_AIR = 0.4, SIDE_KICK = 2.1, TOP_AIR = 0.85;   // spin only bends it a little in the air; it mostly shows when it bounces
    const R = { minX: -11, maxX: 11, minZ: -7, maxZ: 7 };      // the court's fence: the ball, a thrown paddle and the bots stay inside
    L.bounds = { ...R };                                          // where you can walk: the park round it (set by the park)
    BOTLV.on(L);   // the court bots: easy, normal (how they always played) or hard
    L.env = {
      sky: skyTexture([[0, '#5aa8e8'], [0.6, '#a8d8f8'], [1, '#f4f8e8']]),
      bg: 0xa8d8f8, fog: [0xc8e4f0, 40, 140], hemi: [0xffffff, 0x6a8a5a, 0.75],
      sun: [0xfff4e0, 1.0], sunDir: new V3(0.4, 1, 0.3), ambient: [0x8a9aaa, 0.35], sprite: null,
    };
    const SIDE_NAME = ['West', 'East'];
    const endX = (s) => (s === 0 ? -1 : 1) * HL;

    // ---------------------------------------------------------------- the place
    // (the court is the same in every park; what's round it is the park: Sunny Courts here, the others in pickleball-parks.js)
    const sunny = new THREE.Group(); G.add(sunny);
    const sunnyCrowns = [];
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), lam(0x6aa84a));
    grass.rotation.x = -Math.PI / 2; grass.position.y = -0.01; sunny.add(grass);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), lam(0x3a7a5a));
    apron.rotation.x = -Math.PI / 2; sunny.add(apron);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(HL * 2, HW * 2), lam(0x2a6ab8));
    court.rotation.x = -Math.PI / 2; court.position.y = 0.004; G.add(court);
    const kitchenMat = lam(0x3a86c8);
    for (const sx of [-1, 1]) { const k = new THREE.Mesh(new THREE.PlaneGeometry(KITCH, HW * 2), kitchenMat); k.rotation.x = -Math.PI / 2; k.position.set(sx * KITCH / 2, 0.006, 0); G.add(k); }
    const lineM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const line = (x, z, w, d) => addBox(G, w, 0.004, d, lineM, x, 0.009, z);
    line(0, -HW, HL * 2, 0.05); line(0, HW, HL * 2, 0.05);
    line(-HL, 0, 0.05, HW * 2); line(HL, 0, 0.05, HW * 2);
    line(-KITCH, 0, 0.05, HW * 2); line(KITCH, 0, 0.05, HW * 2);
    line(-(KITCH + HL) / 2, 0, HL - KITCH, 0.05); line((KITCH + HL) / 2, 0, HL - KITCH, 0.05);
    const netMat = new THREE.MeshLambertMaterial({ color: 0x1b1932, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + 0.6, NET_H), netMat);
    netMesh.rotation.y = Math.PI / 2; netMesh.position.set(0, NET_H / 2, 0); G.add(netMesh);
    addBox(G, 0.04, 0.05, HW * 2 + 0.6, lineM, 0, NET_H, 0);
    for (const sz of [-1, 1]) addCyl(G, 0.04, 0.04, NET_H + 0.06, 8, lam(0x2b2d42), 0, (NET_H + 0.06) / 2, sz * (HW + 0.3));
    // a chain-link fence, benches and a shade umbrella
    const fence = canvasTexture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#d8dce8'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); }).tex;
    fence.wrapS = fence.wrapT = THREE.RepeatWrapping;
    const fenceMat = (w) => { const t = fence.clone(); t.needsUpdate = true; t.repeat.set(w / 0.5, 6); return new THREE.MeshLambertMaterial({ map: t, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }); };
    for (const [x, z, w, rot] of [[0, R.minZ, 22, 0], [0, R.maxZ, 22, 0], [R.minX, 0, 14, Math.PI / 2], [R.maxX, 0, 14, Math.PI / 2]]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 3), fenceMat(w)); f.position.set(x, 1.5, z); f.rotation.y = rot; sunny.add(f);
      addBox(sunny, rot ? 0.06 : w, 0.06, rot ? w : 0.06, lam(0x9aa0b0), x, 3.0, z);
    }
    for (const sx of [-1, 1]) { addBox(sunny, 2.2, 0.45, 0.5, lam(0xc8955a), sx * 4.5, 0.25, R.maxZ - 0.6); addBox(sunny, 2.2, 0.5, 0.08, lam(0xa8753a), sx * 4.5, 0.65, R.maxZ - 0.38); }
    addCyl(sunny, 0.05, 0.05, 2.4, 6, lam(0xf4f2ec), 0, 1.2, R.maxZ - 1.0);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xff5c6a, side: THREE.DoubleSide }));
    umb.position.set(0, 2.5, R.maxZ - 1.0); sunny.add(umb);
    for (const [x, z] of [[-16, -12], [-9, -14], [3, -15], [14, -12], [18, 4], [-18, 6], [-6, 14], [9, 13]]) {
      addCyl(sunny, 0.2, 0.28, 2.4, 7, lam(0x7a5a3a), x, 1.2, z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), lam(0x4e8a3a)); crown.position.set(x, 3.4, z); sunny.add(crown);
      sunnyCrowns.push(crown);
    }
    // ---------------------------------------------------------------- the park
    // Everyone on the court sees the same park: the latest pick wins (by its number, so devices agree).
    // ...and the season: each park starts in its own (Sunny Courts in summer, the others in fall) until someone picks one,
    // which then holds in every park. Park and season travel together, so the latest pick of either wins.
    const PARKS = PB_PARKS, SEASONS = PB_PARKS.SEASONS;
    PARKS[0].court = [0x2a6ab8, 0x3a86c8]; PARKS[0].group = sunny;
    PARKS[0].apply = (s) => {
      grass.material.color.setHex([0x7ab848, 0x6aa84a, 0x9aa04a, 0xe8eef4][s]);
      sunnyCrowns.forEach((c, k) => { c.visible = s !== 3; c.material.color.setHex(s === 0 ? (k % 3 ? 0x8ad060 : 0xf4b8d8) : s === 1 ? 0x4e8a3a : [0xd8782a, 0xc8482a, 0xe8b830][k % 3]); });
    };
    let park = 0, parkVer = 0, season = -1;
    const curSeason = () => (season >= 0 ? season : PARKS[park].natural);
    // snow falling round the court in winter
    const SNOW_N = 900, snowPos = new Float32Array(SNOW_N * 3);
    for (let k = 0; k < SNOW_N; k++) { snowPos[k * 3] = -16 + Math.random() * 32; snowPos[k * 3 + 1] = Math.random() * 14; snowPos[k * 3 + 2] = -12 + Math.random() * 24; }
    const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false }));
    snow.visible = false; snow.frustumCulled = false; snow.userData.live = true; G.add(snow);
    function snowStep(dt, now) {
      if (!snow.visible) return;
      for (let k = 0; k < SNOW_N; k++) {
        const i3 = k * 3;
        snowPos[i3 + 1] -= (0.6 + (k % 7) * 0.06) * dt;
        snowPos[i3] += Math.sin(now * 0.0008 + k) * 0.18 * dt;
        if (snowPos[i3 + 1] < 0) { snowPos[i3 + 1] += 14; snowPos[i3] = -16 + Math.random() * 32; }
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    function applyLook() {
      const P = PARKS[park], s = curSeason();
      if (P.apply) P.apply(s);
      L.env = SEASONS[s].env;
      if (state.level === L.idx) applyEnv(L.env);
      snow.visible = s === 3;
      state.hudDirty = true;
    }
    function setPark(i, ver, quiet) {
      if (!(i >= 0 && i < PARKS.length)) return;
      park = i; parkVer = Math.max(parkVer, ver || parkVer + 1);
      const P = PARKS[i];
      if (!P.group) {
        P.group = new THREE.Group(); G.add(P.group);
        const K = P.build(P.group, { HL, HW, R });
        if (K) { P.apply = K.apply; P.crack = K.crack || null; P.stripe = K.stripe || null; P.courts = K.courts; P.courtGroups = K.courtGroups; P.courtNames = K.courtNames; P.court0 = K.home; }
        if (P.courtAt === undefined) P.courtAt = P.court0 || 0;
      }
      for (const Q of PARKS) if (Q.group) Q.group.visible = Q === P;
      placeCourt();
      court.material.color.setHex(P.court[0]); kitchenMat.color.setHex(P.court[1]);
      applyLook();
      if (!quiet) { showToast(`Park: ${P.name} (${SEASONS[curSeason()].name.toLowerCase()})`); sfx('chime', 0.5); forcePresence(); }
    }
    // which of the park's courts you play on: the park slides so that court sits where the game is (the game's court,
    // racks, scoreboard and buttons don't move), and that court's own drawing hides under it
    function placeCourt() {
      const P = PARKS[park], k = P.courts ? clamp(P.courtAt || 0, 0, P.courts.length - 1) : 0, [ox, oz] = P.courts ? P.courts[k] : [0, 0];
      P.group.position.set(-ox, 0, -oz);
      if (P.courtGroups) P.courtGroups.forEach((g, j) => { g.visible = j !== k; });
      const B = P.bounds || R;
      Object.assign(L.bounds, B === R ? R : { minX: B.minX - ox, maxX: B.maxX - ox, minZ: B.minZ - oz, maxZ: B.maxZ - oz });   // (you can leave the court and look round)
      courtOff[0] = ox; courtOff[1] = oz;
    }
    const courtOff = [0, 0];
    const courtCount = () => (PARKS[park].courts ? PARKS[park].courts.length : 1);
    function setCourt(k, ver, quiet) {
      const P = PARKS[park];
      if (!P.courts) { if (!quiet) showToast('There’s just the one court here'); return; }
      if (!(k >= 0 && k < P.courts.length)) return;
      P.courtAt = k; parkVer = Math.max(parkVer, ver || parkVer + 1);
      placeCourt();
      if (!quiet) { showToast(`Playing on the ${P.courtNames[k]} (${k + 1} of ${P.courts.length})`); sfx('chime', 0.5); forcePresence(); }
    }
    const nextCourt = () => setCourt(((PARKS[park].courtAt || 0) + 1) % courtCount(), parkVer + 1);
    function setSeason(s, ver, quiet) {
      if (!(s >= -1 && s < SEASONS.length)) return;
      season = s; parkVer = Math.max(parkVer, ver || parkVer + 1);
      applyLook();
      if (!quiet) { showToast(`Season: ${SEASONS[curSeason()].name}`); sfx('chime', 0.5); forcePresence(); }
    }
    const nextPark = () => setPark((park + 1) % PARKS.length, parkVer + 1);
    const nextSeason = () => setSeason((curSeason() + 1) % SEASONS.length, parkVer + 1);
    Object.assign(L.bounds, PARKS[0].bounds);
    applyLook();

    // the singles / doubles switch, on a stand by the net post on the bench side, and the park switch beside it
    makeButton(L, new V3(0, 1.0, HW + 0.9), 0xffd23f, 'Singles / Doubles', () => setDoubles(!PB.dbl), { faceYaw: 0 });
    // the park and the seasons: further back, by the fence on the bench side, out of the way of play
    makeButton(L, new V3(-2.2, 1.0, R.maxZ - 1.6), 0x8bd450, 'Change park', () => nextPark(), { faceYaw: Math.PI });
    makeButton(L, new V3(-3.2, 1.0, R.maxZ - 1.6), 0x4fc3f7, 'Change court', () => nextCourt(), { faceYaw: Math.PI });
    SEASONS.forEach((S, k) => makeButton(L, new V3(1.2 + k * 0.85, 1.0, R.maxZ - 1.6), [0xff9ad0, 0xffd23f, 0xf2782a, 0x9af0ff][k], S.name, () => setSeason(k), { faceYaw: Math.PI }));
    try { const u = new URLSearchParams(location.search), i = PARKS.findIndex((P) => P.id === u.get('park')), j = SEASONS.findIndex((S) => S.id === u.get('season')); if (j >= 0) season = j; if (i > 0) setPark(i, 1, true); else if (j >= 0) setSeason(j, 1, true); } catch (e) { /* ignore */ }
    // the scoreboard by the net post
    const scoreC = canvasTexture(640, 220);
    const scoreBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.76), new THREE.MeshBasicMaterial({ map: scoreC.tex }));
    scoreBoard.position.set(0, 2.6, -HW - 1.6); G.add(scoreBoard);
    const sbBack = scoreBoard.clone(); sbBack.rotation.y = Math.PI; sbBack.position.z -= 0.02; G.add(sbBack);
    addCyl(G, 0.05, 0.05, 2.3, 6, lam(0x2b2d42), 0, 1.15, -HW - 1.62);
    const sign = makeBoard(G, 720, 500, 2.4, 1.67, R.maxX - 0.2, 1.9, -3.0, -Math.PI / 2);
    (function drawSign() {
      const g = sign.g;
      g.fillStyle = '#1b3a5a'; g.fillRect(0, 0, 720, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 54px ${DISPLAY}`; g.fillText('Pickleball', 36, 72);
      let y = 116;
      for (const [h, b] of [
        ['Play', 'Grab a paddle from a rack. Singles or doubles: switch at the post by the net, or grab a doubles partner paddle (the far racks). Bots fill open spots.'],
        ['Serve', 'Underhand, into the box diagonally across, past the kitchen line. Right side when your score is even.'],
        ['Rules', 'The return of serve and the shot after it must bounce. No volleys from the kitchen (the lighter zone by the net). First to 11, win by 2.'],
        ['Browser', 'WASD to move, hold Space to hit as the ball comes, look where you want it to go. E puts the paddle back.'],
      ]) {
        g.fillStyle = '#8be0ff'; g.font = `700 24px ${BODY}`; g.fillText(h, 36, y); y += 30;
        g.fillStyle = '#f2f6fa'; g.font = `400 23px ${BODY}`; y = wrapText(g, b, 36, y, 648, 29) + 10;
      }
      sign.tex.needsUpdate = true;
    })();
    makeKiosk(L, R.maxX - 1.2, R.maxZ - 1.2, -Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'rally', label: 'Longest rally (hits)' }], { x: R.maxX - 3.0, z: R.maxZ - 0.9, yaw: Math.PI });   // (inside the fence, facing the court)

    // ---------------------------------------------------------------- paddles and ball
    TOOL_MESH.pbpaddle = () => {
      const g = new THREE.Group();
      const grip = new THREE.MeshLambertMaterial({ color: 0x2b2d42, emissive: 0x000000 });
      const face = new THREE.MeshLambertMaterial({ color: 0x4fc3f7, emissive: 0x000000 });
      const edge = new THREE.MeshLambertMaterial({ color: 0x1b1932, emissive: 0x000000 });
      const handle = new THREE.Mesh(cyl(0.016, 0.018, 0.13, 8), grip); handle.rotation.x = Math.PI / 2; handle.position.z = -0.04;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.19, 0.24), face); blade.position.set(0, 0, -0.22);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.2, 0.25), edge); rim.position.set(0, 0, -0.22); rim.scale.set(0.9, 1, 1);
      g.add(handle, rim, blade);
      g.userData.mats = [grip, face, edge];
      return g;
    };
    const rackQ = new Q4().setFromAxisAngle(new V3(0, 0, 1), Math.PI / 2);
    // a rack for each spot: the singles racks on the bench side, the doubles partners' racks on the far side
    const sideOf = (sl) => sl >> 1;
    const paddles = [0, 1, 2, 3].map((sl) => {
      const s = sideOf(sl), dz = sl % 2 ? -1 : 1, x = endX(s) + (s === 0 ? -1.4 : 1.4), z = dz * (HW + 0.9);
      addBox(G, 0.9, 0.8, 0.5, lam(sl % 2 ? 0x3a2b52 : 0x2b2d42), x, 0.4, z);
      if (sl % 2) makePlate(G, 'Doubles partner', 0.8, 0.14, new V3(x, 0.55, z + 0.26 * dz), dz > 0 ? 0 : Math.PI, { size: 0.55, bg: '#ffd23f', fg: '#1b1932' });
      const t = makeTool(L, new V3(x, 0.82, z), rackQ, 'pbpaddle');
      t.holdToDrop = 700;      // VR: squeeze and hold to put it down, so a bump of the grip doesn't drop it
      t.pbSide = s; t.pbSlot = sl;
      return t;
    });
    // the ball: bright yellow with its rows of holes and a faint seam, so you can watch it spin
    const ballTex = canvasTexture(256, 128, (g) => {
      g.fillStyle = '#d8f43a'; g.fillRect(0, 0, 256, 128);
      // little dimples all over (so even a slow turn shows)
      for (let row = 0; row < 12; row++) {
        const lat = (row + 0.5) / 12, y = lat * 128, n = Math.max(3, Math.round(30 * Math.sin(Math.PI * lat)));
        for (let k = 0; k < n; k++) { const x = (k + (row % 2) * 0.5) * 256 / n; g.fillStyle = 'rgba(90,110,0,0.22)'; g.beginPath(); g.ellipse(x, y, 2.2 / Math.max(0.25, Math.sin(Math.PI * lat)), 2.2, 0, 0, Math.PI * 2); g.fill(); }
      }
      // the holes: dark, with a lighter lip
      for (const [lat, n, off] of [[0.2, 5, 0], [0.4, 8, 0.5], [0.6, 8, 0], [0.8, 5, 0.5]]) {
        const y = lat * 128, sx = 1 / Math.max(0.3, Math.sin(Math.PI * lat));
        for (let k = 0; k < n; k++) {
          const x = (k + off) * 256 / n;
          for (const xx of [x, x - 256, x + 256]) {
            g.fillStyle = '#f2ff86'; g.beginPath(); g.ellipse(xx, y, 8.5 * sx, 8.5, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#4a5400'; g.beginPath(); g.ellipse(xx, y, 6.2 * sx, 6.2, 0, 0, Math.PI * 2); g.fill();
          }
        }
      }
      // one hole at each pole, and a seam round the middle
      g.fillStyle = '#4a5400'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 124, 256, 4);
      g.fillStyle = 'rgba(70,80,0,0.55)'; g.fillRect(0, 63, 256, 2);
    }).tex;
    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BR, 20, 14), new THREE.MeshLambertMaterial({ color: 0xffffff, map: ballTex }));
    ballMesh.visible = false; G.add(ballMesh);
    // turn the ball by its spin (the same w the flight uses: topspin turns it over forwards), and a slow tumble from
    // its travel when there's no spin on it
    const _spinAx = new V3();
    function spinBall(dt) {
      const b = PB.b, wx = b.wx || 0, wy = b.wy || 0, wz = b.wz || 0, w = Math.hypot(wx, wy, wz);
      if (w > 0.02) { _spinAx.set(wx / w, wy / w, wz / w); ballMesh.rotateOnWorldAxis(_spinAx, w * 34 * dt); }
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0.3 && PB.ph === 'rally') { _spinAx.set(b.vz / sp, 0, -b.vx / sp); ballMesh.rotateOnWorldAxis(_spinAx, sp * 0.6 * dt); }
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(BR * 1.2, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; G.add(shadow);
    // the court bots, one for each spot (Dink Daisy has the east end)
    const BOT_NAMES = ['Lob Larry', 'Spin Sam', 'Dink Daisy', 'Volley Val'], BOT_COLS = ['#5ac8ff', '#8bd450', '#ff9a5c', '#ff7ac8'];
    const BOTS = [0, 1, 2, 3].map((sl) => {
      const body = buildAvatar(BOT_COLS[sl], [2, 0, 1, 3][sl], [1, 3, 2, 0][sl], true, 3, [1, 2, 4, 3][sl]);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#fff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(BOT_NAMES[sl], 128, 33); }).tex, transparent: true, depthWrite: false }));
      label.scale.set(0.9, 0.225, 1); label.position.y = 0.42; body.add(label);
      const paddle = TOOL_MESH.pbpaddle();
      G.add(body, paddle);
      body.visible = paddle.visible = false;
      return { sl, body, paddle, x: endX(sideOf(sl)) * 0.85, z: 0, vx: 0, vz: 0, decided: false, missing: false, swingT: 0, hitKey: '', reactAt: 0, ex: 0, ez: 0 };
    });

    // ---------------------------------------------------------------- state
    const PB = {
      mySide: -1, ver: 0, auth: '', b: { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 },
      ph: 'idle', server: 0, lastHit: -1, need: -1, bounced: false, hits: 0, score: [0, 0], pointSeq: 0, deadT: 0, overT: 0, winner: -1,
      swingUntil: 0, swingFrom: 0, swingHeld: false, swingPow: 0, spinMode: 0, serveT: 0, serveVer: -1, botMask: 0,
      mySlot: -1, dbl: false,
    };
    L.pb = PB;
    // (PB.bot: the first bot playing, for the tests and anything that wants "the" bot in singles)
    Object.defineProperty(PB, 'bot', { get: () => BOTS[botSlots()[0] ?? 2] });
    // who's in each of the four spots (peer ids, or null)
    function slots() {
      const at = [null, null, null, null];
      if (PB.mySlot >= 0) at[PB.mySlot] = state.myPeer;
      // (only players whose page is alive: a headset taken off, or a frozen browser, frees the spot for the court bot, and
      // if they had the ball, whoever's left takes it on: see core/referee.js)
      const now = performance.now();
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (liveIn(rec, L, now) && st && st.pbSlot >= 0 && !at[st.pbSlot]) at[st.pbSlot] = rec.peer; }
      return at;
    }
    // the first person on each side
    function players() { const a = slots(); return [a[0] || a[1], a[2] || a[3]]; }
    const humans = () => slots().filter(Boolean);
    const activeSlots = () => (PB.dbl ? [0, 1, 2, 3] : [0, 2]);
    // the spots the bots play: every open spot, once someone's on the court
    function botSlots() { const a = slots(); if (!a.some(Boolean) || PB.mySlot < 0) return []; return activeSlots().filter((sl) => !a[sl]); }
    const otherHuman = () => (PB.mySide >= 0 ? players()[1 - PB.mySide] : null);
    const botSide = () => { const b = botSlots(); return b.length ? sideOf(b[0]) : -1; };
    const iAmAuth = () => PB.mySide >= 0 && PB.auth === state.myPeer;
    const sideOfX = (x) => (x < 0 ? 0 : 1);
    const nameOfSlot = (sl) => { const p = slots()[sl]; if (!p) return BOT_NAMES[sl]; if (p === state.myPeer) return 'you'; return (remotes.get(p) || {}).name || SIDE_NAME[sideOf(sl)]; };
    const nameOfSide = (s) => { const n = (PB.dbl ? [s * 2, s * 2 + 1] : [s * 2]).map(nameOfSlot); return n.length > 1 ? `${n[0]} and ${n[1]}` : n[0]; };
    // the half of the court each spot covers in doubles: spot 0 the right (+z for west, -z for east)
    const homeZ = (sl) => (PB.dbl ? (sl % 2 ? -1 : 1) * (sideOf(sl) === 0 ? 1 : -1) * HW / 2 : 0);
    // where a spot's player is standing (for the kitchen rule)
    function standingSlot(sl) {
      const p = slots()[sl];
      if (p === state.myPeer) return { x: myHead.pos.x, z: myHead.pos.z };
      if (p) { const rec = remotes.get(p); if (rec && rec.hasH) return { x: rec.cur.h.pos.x, z: rec.cur.h.pos.z }; return null; }
      return { x: BOTS[sl].x, z: BOTS[sl].z };
    }
    const standing = (s) => standingSlot(s * 2);
    // the serve: from the right when the server's score is even; right is +z for west, -z for east
    const serveRight = () => PB.score[PB.server] % 2 === 0;
    const serveZ = () => { const zr = PB.server === 0 ? 1 : -1; return (serveRight() ? zr : -zr) * HW / 2; };
    // in doubles, whoever's on that half serves (so partners take turns as the score goes up)
    const serverSlot = () => PB.server * 2 + (PB.dbl && !serveRight() ? 1 : 0);

    // ---------------------------------------------------------------- the rules (run by whoever has the ball)
    const oppKey = () => `${PB.dbl ? 'd' : 's'}:${humans().filter((p) => p !== state.myPeer).sort().join()}`;
    function newGame() { Object.assign(PB, { score: [0, 0], server: rand() < 0.5 ? 0 : 1, overT: 0, winner: -1, opp: oppKey() }); startServe(); }
    function startServe() {
      Object.assign(PB, { ph: 'serve', lastHit: -1, need: -1, bounced: false, hits: 0 });
      Object.assign(PB.b, { x: endX(PB.server) * 1.04, y: 0.75, z: serveZ(), vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 });
      const a = slots(), sv = serverSlot();
      PB.auth = a[sv] || a[PB.server * 2] || a[PB.server * 2 + 1] || state.myPeer;
      PB.ver += 1; PB.serveVer = PB.ver; PB.serveT = performance.now(); for (const b of BOTS) b.decided = false;   // (a bot server waits a moment before serving)
      forcePresence();
    }
    function point(winner, why) {
      if (PB.ph !== 'rally' && PB.ph !== 'serve') return;
      PB.score[winner] += 1; PB.pointSeq += 1;
      if (PB.mySide >= 0 && PB.hits >= 4) RECORDS.add(L, 'rally', PB.hits);
      PB.ph = 'dead'; PB.deadT = performance.now();
      const [a, b] = PB.score;
      if ((a >= WIN || b >= WIN) && Math.abs(a - b) >= 2) { PB.winner = a > b ? 0 : 1; PB.overT = performance.now(); }
      PB.server = winner;   // rally scoring: whoever wins the rally serves
      PB.ver += 1;
      announce(winner, why);
      forcePresence();
    }
    function announce(winner, why) {
      const mine = winner === PB.mySide, [a, b] = PB.score;
      if (PB.winner >= 0) ANNOUNCE.win(PB.winner === PB.mySide ? `You win ${Math.max(a, b)}-${Math.min(a, b)}!` : `${nameOfSide(PB.winner)} wins ${Math.max(a, b)}-${Math.min(a, b)}`, PB.winner === PB.mySide ? 'win' : 'lose');
      else { sfx(mine ? 'chime' : 'buzzer', 0.5); showToast(`${why ? why + ': ' : ''}${mine ? 'your point' : `point to ${nameOfSide(winner)}`}. ${a}-${b}`, { vr: false }); }   // (the scoreboard has it in VR)
      state.dirtyBoard = true;
    }
    function onHit(side, slot) {
      const b = PB.b;
      if (PB.ph === 'serve') { if (side !== PB.server) return; Object.assign(PB, { ph: 'rally', lastHit: side, need: 1 - side, bounced: false, hits: 1 }); PB.ver += 1; return; }
      if (PB.ph !== 'rally') return;
      if (side === PB.lastHit) { point(1 - side, 'Double hit'); return; }
      const volley = !PB.bounced;
      // the two-bounce rule: the return of serve and the third shot must bounce first
      if (volley && PB.hits < 3) { point(1 - side, 'Let it bounce first'); return; }
      // no volleys from the kitchen
      const at = slot >= 0 ? standingSlot(slot) : standing(side);
      if (volley && at && Math.abs(at.x) < KITCH && sideOfX(at.x) === side) { point(1 - side, 'Kitchen volley'); return; }
      void b;
      Object.assign(PB, { lastHit: side, need: 1 - side, bounced: false, hits: PB.hits + 1 });
      PB.ver += 1;
    }
    function onBounce(x, z) {
      if (PB.ph !== 'rally') return;
      const s = sideOfX(x), inCourt = Math.abs(x) <= HL + BR && Math.abs(z) <= HW + BR;
      if (PB.need === s && !PB.bounced) {
        if (!inCourt) { point(1 - PB.lastHit, 'Out'); return; }
        // the serve has to land in the diagonal box, past the kitchen line
        if (PB.hits === 1) {
          const zSign = Math.sign(PB.serveFromZ || 1), boxOk = Math.abs(x) >= KITCH - BR && Math.sign(z) === -zSign;
          if (!boxOk) { point(1 - PB.lastHit, Math.abs(x) < KITCH ? 'Serve in the kitchen' : 'Serve in the wrong box'); return; }
        }
        PB.bounced = true; PB.ver += 1;
        return;
      }
      if (PB.need === s && PB.bounced) { point(PB.lastHit, 'Two bounces'); return; }
      // it came down on the hitter's own side (into the net, or never crossed)
      if (s === PB.lastHit) point(1 - PB.lastHit, 'Into the net');
    }

    // ---------------------------------------------------------------- ball physics
    let simOnly = false, lastTick = 0;
    function tick(v) { const now = performance.now(); if (now - lastTick < 50) return; lastTick = now; tone(900, 600, 0.04, 'triangle', (v * 0.3) / (1 + myHead.pos.distanceTo(ballMesh.position) * 0.2)); }
    function stepBall(h) {
      const b = PB.b;
      if (PB.ph !== 'rally') return;
      const sp = Math.hypot(b.vx, b.vy, b.vz);
      airStep(b, h, sp);
      const px = b.x;
      b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
      if ((px < 0) !== (b.x < 0) && b.y < NET_H + BR && Math.abs(b.z) < HW + 0.3) { b.x = px < 0 ? -BR : BR; b.vx *= -0.1; b.vz *= 0.4; tone(220, 0, 0.06, 'triangle', 0.1); }
      if (b.y < BR && b.vy < 0) {
        bounceSpin(b);
        tick(0.6);
        if (!simOnly) { crackKick(b); stripeKick(b); }
        if (!simOnly) onBounce(b.x, b.z);
      }
      if (Math.abs(b.x) > R.maxX - 0.2 || Math.abs(b.z) > R.maxZ - 0.2) { b.vx *= -0.3; b.vz *= -0.3; b.x = clamp(b.x, R.minX + 0.2, R.maxX - 0.2); b.z = clamp(b.z, R.minZ + 0.2, R.maxZ - 0.2); }
      // a ball that has stopped is dead
      if (!simOnly && PB.ph === 'rally' && b.y < BR + 0.01 && sp < 0.6) { if (PB.bounced) point(PB.lastHit, 'Missed it'); else point(1 - PB.lastHit, 'Out'); }
    }
    // a crack in the court (College Park): a ball that lands on it kicks off a few degrees one way or the other, and a
    // little higher or lower. (Bots can't see it coming either.)
    const _onCrack = (x, z, C) => { for (let k = 0; k < C.length - 1; k++) {
      const [x0, z0] = C[k], [x1, z1] = C[k + 1], dx = x1 - x0, dz = z1 - z0, t = clamp(((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz), 0, 1);
      if (Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)) < 0.08) return true; } return false; };
    function crackKick(b) {
      const C = PARKS[park].crack;
      if (!C || !_onCrack(b.x + courtOff[0], b.z + courtOff[1], C)) return false;
      const a = (rand() < 0.5 ? -1 : 1) * (0.07 + rand() * 0.11), c = Math.cos(a), sn = Math.sin(a);   // (4 to 10 degrees)
      const vx = b.vx * c - b.vz * sn, vz = b.vx * sn + b.vz * c;
      b.vx = vx; b.vz = vz; b.vy *= 0.8 + rand() * 0.35;
      tone(330, 180, 0.05, 'square', 0.12);
      PB.crackHits = (PB.crackHits || 0) + 1;
      return true;
    }
    // College Park's raised white stripe: a ball that lands on it bounces a touch higher, and a degree or two off line
    function stripeKick(b) {
      const S = PARKS[park].stripe;
      if (!S) return false;
      const x = b.x + courtOff[0], z = b.z + courtOff[1];
      if (x < S.x0 || x > S.x1 || Math.abs(z - S.z) > S.hw + BR * 0.5) return false;
      const a = (rand() < 0.5 ? -1 : 1) * (0.015 + rand() * 0.035), c = Math.cos(a), sn = Math.sin(a);   // (1 to 3 degrees)
      const vx = b.vx * c - b.vz * sn, vz = b.vx * sn + b.vz * c;
      b.vx = vx; b.vz = vz; b.vy *= 1.05 + rand() * 0.1;
      PB.stripeHits = (PB.stripeHits || 0) + 1;
      return true;
    }
    // drag, gravity and spin over one small step. Spin (w, at most 1 long) pushes the ball along w x v: topspin dips it,
    // backspin floats it, sidespin curves it. It wears off slowly in the air.
    function airStep(p, h, sp) {
      const wx = p.wx || 0, wy = p.wy || 0, wz = p.wz || 0, ws = wy * SIDE_AIR, tx = wx * TOP_AIR, tz = wz * TOP_AIR;
      const ax = MAG * (ws * p.vz - tz * p.vy), ay = MAG * (tz * p.vx - tx * p.vz), az = MAG * (tx * p.vy - ws * p.vx);
      p.vx += (ax - DRAG * sp * p.vx) * h; p.vy += (ay - GRAV - DRAG * sp * p.vy) * h; p.vz += (az - DRAG * sp * p.vz) * h;
      if (wx || wy || wz) { const f = 1 - 0.12 * h; p.wx = wx * f; p.wy = wy * f; p.wz = wz * f; }
    }
    // on the bounce the ball loses a lot of pace (it's a light plastic ball): topspin kicks on through, keeping most of
    // its speed (it comes down steep, so it still jumps); a flat ball sits up slower; backspin checks up and stays low
    function bounceSpin(b) {
      const hs = Math.hypot(b.vx, b.vz) || 1, ux = b.vx / hs, uz = b.vz / hs;
      const ts = clamp((b.wx || 0) * uz - (b.wz || 0) * ux, -1, 1);     // + topspin, - backspin
      const keep = 0.72 + 0.2 * ts;
      b.y = BR; b.vy = -b.vy * (0.76 + (ts > 0 ? -0.08 : 0.12) * ts); b.vx *= keep; b.vz *= keep;
      // sidespin grabs the court and kicks it off sideways, the same way it was curving
      const ss = clamp(b.wy || 0, -1, 1) * SIDE_KICK;
      b.vx += ss * uz; b.vz -= ss * ux;
      b.wx = (b.wx || 0) * 0.4; b.wy = (b.wy || 0) * 0.4; b.wz = (b.wz || 0) * 0.4;
    }
    // a shot that lands at (tx, tz) and clears the net: start from the no-air answer, then fly it (with drag and spin) and correct
    function flyTo(from, v) {
      const p = { x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, wx: v.wx || 0, wy: v.wy || 0, wz: v.wz || 0 };
      let netY = 99, t = 0;
      for (let k = 0; k < 480; k++) {
        t += 1 / 120;
        const sp = Math.hypot(p.vx, p.vy, p.vz), h = 1 / 120, px = p.x;
        airStep(p, h, sp);
        p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
        if ((px < 0) !== (p.x < 0)) netY = p.y;
        if (p.y < BR) break;
      }
      return { x: p.x, z: p.z, netY, t };
    }
    // spin: [wx, wy, wz] the shot will carry (the aim allows for it, so it still lands where you meant, just with a different flight)
    function aimed(from, tx, tz, speed, spin) {
      const dx = tx - from.x, dz = tz - from.z, d = Math.hypot(dx, dz);
      let T = clamp(d / speed, 0.45, 1.9);
      const w = spin || [0, 0, 0];
      const out = { vx: dx / T, vy: (BR - from.y + 0.5 * GRAV * T * T) / T, vz: dz / T, wx: w[0], wy: w[1], wz: w[2] };
      // fly it and correct, keeping its time in the air: the distance by the pace, the time by the lift (so topspin gets
      // a higher arc that dips in, and backspin a flatter one that floats, rather than one just hit harder or softer)
      let lift = 0;
      for (let i = 0; i < 12; i++) {
        const f = flyTo(from, out);
        const ld = Math.hypot(f.x - from.x, f.z - from.z);
        if (f.netY < NET_H + 0.12) { lift = Math.max(lift, T * 1.1); out.vy += 0.4; }
        else if (Math.abs(ld - d) < 0.12 && Math.abs(f.t - T) < 0.06) break;
        else out.vy += clamp((Math.max(T, lift) - f.t) * GRAV * 0.5, -2, 2);
        if (lift && f.netY >= NET_H + 0.12) T = Math.max(T, f.t);
        const k = clamp(d / Math.max(0.5, ld), 0.7, 1.4);
        out.vx *= k; out.vz *= k;
        // keep the direction pointed at the target too
        const ang = Math.atan2(dz, dx) - Math.atan2(f.z - from.z, f.x - from.x);
        const c = Math.cos(ang), sn = Math.sin(ang), vx = out.vx * c - out.vz * sn, vz = out.vx * sn + out.vz * c;
        out.vx = vx; out.vz = vz;
      }
      return out;
    }
    // the last check on any shot: lift it until it clears the net, and if that sends it long, take a little pace off
    // (a shot hit too hard to stay in, keepIn false, is left to go long)
    function clearNet(from, v, keepIn = true) {
      for (let i = 0; i < 16; i++) {
        const f = flyTo(from, v);
        if (f.netY < NET_H + 0.1) { v.vy += 0.25; continue; }
        if (keepIn && Math.abs(f.x) > HL - 0.15 && Math.sign(f.x) !== Math.sign(from.x || 1)) { v.vx *= 0.93; v.vz *= 0.93; continue; }
        break;
      }
      return v;
    }
    function hitBall(side, v, slot, keepIn = true) {
      const b = PB.b, s = Math.hypot(v.vx, v.vy, v.vz), k = s > 24 ? 24 / s : 1;
      if (PB.ph === 'serve') PB.serveFromZ = b.z;
      v = { vx: v.vx * k, vy: v.vy * k, vz: v.vz * k, wx: v.wx, wy: v.wy, wz: v.wz };
      clearNet(b, v, keepIn);
      b.vx = v.vx; b.vy = v.vy; b.vz = v.vz;
      b.wx = v.wx || 0; b.wy = v.wy || 0; b.wz = v.wz || 0;
      onHit(side, slot === undefined ? -1 : slot);
      tone(520, 380, 0.05, 'square', 0.25);
      PB.ver += 1;
      forcePresence();
    }
    const hittable = (side, slot) => (PB.ph === 'serve' ? side === PB.server && (slot === undefined || slot === serverSlot()) : PB.ph === 'rally' && PB.lastHit !== side && sideOfX(PB.b.x) === side);
    // where to aim: a serve goes to the diagonal box; otherwise deep in the far court
    function target(side, wantX, wantZ) {
      const far = side === 0 ? 1 : -1;
      if (PB.ph === 'serve') { const z = -Math.sign(PB.b.z || 1) * clamp(Math.abs(wantZ ?? HW / 2), 0.4, HW - 0.35); return { x: far * clamp(Math.abs(wantX ?? HL * 0.7), KITCH + 0.6, HL - 0.4), z }; }
      return { x: far * clamp(Math.abs(wantX ?? HL * 0.7), 1.0, HL - 0.35), z: clamp(wantZ ?? 0, -HW + 0.35, HW - 0.35) };
    }
    // power decides how deep it really goes: too soft drops it short, too hard sends it past the baseline. Returns
    // whether the shot is still meant to land in (so the help keeps it in only then).
    function powerDepth(tg, deep) {
      tg.x = Math.sign(tg.x) * Math.max(0.6, deep);
      return deep <= HL - 0.3;
    }

    // ---------------------------------------------------------------- your paddle
    const myPaddle = () => paddles.find((t) => t.held && t.held.peer === state.myPeer);
    const _pc = new V3(), _pn = new V3(), _bw = new V3(), _q = new Q4(), _cp = new V3();
    let prevPC = null, ballPrev = null;
    const prevPN = new V3(1, 0, 0);
    function vrPaddle(dt, steps) {
      const t = myPaddle();
      if (!t || state.mode !== 'vr' || !iAmAuth() || TH.on) { prevPC = null; return; }
      _pc.set(0, 0, -0.22).applyQuaternion(t.quat).add(t.pos); _pn.set(1, 0, 0).applyQuaternion(t.quat);
      if (!prevPC) { prevPC = _pc.clone(); prevPN.copy(_pn); return; }
      const vp = _pc.clone().sub(prevPC).multiplyScalar(1 / Math.max(1e-3, dt));
      // (a real jump of the paddle, a snap turn or teleport, isn't a swing)
      if (_pc.distanceTo(prevPC) > 0.6) { prevPC.copy(_pc); prevPN.copy(_pn); return; }
      if (hittable(PB.mySide, PB.mySlot)) {
        // Swept: both the paddle and the ball move during the frame, so follow both through it in small steps, and
        // count a hit if the ball touches the face or passes from one side of it to the other (however fast the swing,
        // and whether or not you're moving as you swing)
        const bNow = _bw.set(PB.b.x, PB.b.y, PB.b.z), b0 = ballPrev || bNow, N = Math.max(steps, 16);
        let dPrev = null;
        for (let k = 0; k <= N; k++) {
          const u = k / N, c = prevPC.clone().lerp(_pc, u), n = prevPN.clone().lerp(_pn, u).normalize();
          const rel = b0.clone().lerp(bNow, u).sub(c);
          const d = rel.dot(n), inPlane = Math.sqrt(Math.max(0, rel.lengthSq() - d * d));
          const crossed = dPrev !== null && Math.sign(d) !== Math.sign(dPrev) && inPlane < 0.16;
          const side = crossed ? Math.sign(dPrev) || 1 : Math.sign(d || 1);
          dPrev = d;
          if (!crossed && (k === 0 || inPlane > 0.15 || Math.abs(d) > BR + 0.04)) continue;
          const vb = new V3(PB.b.vx, PB.b.vy, PB.b.vz), vn = vb.clone().sub(vp).dot(n);
          if (vn * side >= 0) continue;
          // the ball comes off the face on the side it came from
          const at = c.clone().add(rel.clone().addScaledVector(n, -d)).addScaledVector(n, side * (BR + 0.012));
          PB.b.x = at.x; PB.b.y = Math.max(BR, at.y); PB.b.z = at.z;
          vb.addScaledVector(n, -1.8 * vn);
          // your swing sets the pace and direction; the help keeps it in the court
          // (a gentle push lands short; a hard hit, past about 13 m/s off the paddle, sails long)
          const speed = clamp(Math.hypot(vb.x, vb.z), 3, 20);
          const tg = target(PB.mySide, HL * clamp(0.35 + speed / 22, 0.45, 0.92), PB.b.z + vb.z * 0.35);
          const keepIn = powerDepth(tg, HL * (0.18 + speed / 16));
          // brushing up the back of the ball gives topspin, chopping down gives backspin, across gives sidespin
          const vt = vp.clone().addScaledVector(_pn, -vp.dot(_pn)), dOut = vb.clone().normalize();
          const w = vt.cross(dOut).multiplyScalar(0.36); if (w.length() > 1) w.normalize();
          if (w.length() < 0.15) w.set(0, 0, 0);
          const aim = aimed(PB.b, tg.x, tg.z, Math.min(speed, 12), [w.x, w.y, w.z]);
          hitBall(PB.mySide, { vx: vb.x * 0.3 + aim.vx * 0.7, vy: vb.y * 0.3 + aim.vy * 0.7, vz: vb.z * 0.3 + aim.vz * 0.7, wx: w.x, wy: w.y, wz: w.z }, PB.mySlot, keepIn);
          haptic(vrHands[t.held.side], 0.5, 25);
          break;
        }
      }
      prevPC.copy(_pc); prevPN.copy(_pn);
    }
    // browser: the paddle reaches for a ball near you; holding Space keeps a short swing window open
    L.deskHand = (side, mh) => {
      const t = paddles.find((x) => x.held && x.held.peer === state.myPeer && x.held.side === side);
      if (!t || state.mode !== 'flat') return false;
      const b = PB.b, near = Math.hypot(b.x - myHead.pos.x, b.z - myHead.pos.z) < 1.8 && b.y - dolly.position.y < 2.2 && PB.ph !== 'dead';
      if (near) mh.pos.set(b.x + (PB.mySide === 0 ? -0.1 : 0.1), b.y, b.z);
      else { camera.getWorldQuaternion(_q); camera.getWorldPosition(_cp); mh.pos.set(0.3, -0.45, -0.5).applyQuaternion(_q).add(_cp); }
      mh.quat.setFromEuler(new THREE.Euler(0, PB.mySide === 0 ? -Math.PI / 2 : Math.PI / 2, 0));
      mh.ok = true;
      return true;
    };
    // hold Space (or the button) for a harder shot: a tap is a soft dink, about a second is a full drive
    const SPINS = ['No spin', 'Topspin', 'Backspin', 'Slice left', 'Slice right'];
    L.deskSwing = (now) => { if (!myPaddle()) return; PB.swingFrom = now || performance.now(); PB.swingHeld = true; PB.swingUntil = Infinity; };
    L.deskRelease = (now) => { if (!PB.swingHeld) return; PB.swingHeld = false; PB.swingPow = swingPower(now || performance.now()); PB.swingUntil = (now || performance.now()) + 450; };
    const swingPower = (now) => clamp((now - PB.swingFrom) / 900, 0, 1);
    function cycleSpin() { PB.spinMode = (PB.spinMode + 1) % SPINS.length; showToast(`Shot: ${SPINS[PB.spinMode].toLowerCase()}`); sfx('click', 0.6); state.hudDirty = true; }
    L.onKey = (code) => { if (code === 'KeyR' && PB.mySide >= 0) { cycleSpin(); return true; } return false; };
    function deskHit(now) {
      if (state.mode !== 'flat' || !myPaddle() || TH.on || now > PB.swingUntil || !iAmAuth() || !hittable(PB.mySide, PB.mySlot)) return;
      const b = PB.b;
      if (Math.hypot(b.x - myHead.pos.x, b.z - myHead.pos.z) > 1.8 || b.y - dolly.position.y > 2.2 || (PB.ph === 'rally' && b.y < BR + 0.02 && Math.abs(b.vy) < 0.3)) return;
      // the browser plays by the rules for you: wait for the bounce when the two-bounce rule says so, and never volley from the kitchen
      if (PB.ph === 'rally' && !PB.bounced && (PB.hits < 3 || (Math.abs(myHead.pos.x) < KITCH))) return;
      const pow = PB.swingHeld ? swingPower(now) : PB.swingPow;
      PB.swingUntil = 0;
      camera.getWorldQuaternion(_q); camera.getWorldPosition(_cp);
      const dir = new V3(0, 0, -1).applyQuaternion(_q);
      let wx, wz;
      if (dir.y < -0.02) { const tt = -_cp.y / dir.y; wx = _cp.x + dir.x * tt; wz = _cp.z + dir.z * tt; }
      const tg = target(PB.mySide, wx === undefined ? undefined : Math.abs(wx), wz);
      const speed = PB.ph === 'serve' ? 9 + pow * 4 : 5 + pow * 7;   // (the pace it's aimed with: drag adds the rest)
      // about half a second of holding lands where you look; a tap drops it short, a full second sends it long
      const keepIn = powerDepth(tg, Math.abs(tg.x) * (0.4 + 1.3 * pow));
      // the spin you picked, turned to suit the direction of the shot (sidespin's sign is which way it curves)
      const hx = tg.x - b.x, hz = tg.z - b.z, hl = Math.hypot(hx, hz) || 1, ux = hx / hl, uz = hz / hl;
      const m = PB.spinMode, w = m === 1 ? [1 * uz, 0, -1 * ux] : m === 2 ? [-0.9 * uz, 0, 0.9 * ux] : m === 3 ? [0, 0.8, 0] : m === 4 ? [0, -0.8, 0] : [0, 0, 0];
      const v = aimed(b, tg.x, tg.z, speed, w);
      hitBall(PB.mySide, v, PB.mySlot, keepIn);
      PB.swingHeld = false;
    }


    // ---------------------------------------------------------------- throwing the paddle
    // Jump and trigger together (J while holding Space in a browser) flings your paddle where you're looking: a last
    // resort for a ball you can't get to. It has to actually meet the ball, and even then it only goes over now and then
    // (a lucky angle about one time in eight; otherwise it flops off wherever the paddle sends it). The paddle stays
    // where it lands for the rest of the point and comes back to your hand for the next serve.
    const TH = { on: false, seq: -1, p: new V3(), v: new V3(), w: new V3(), hit: false, landed: false, prev: false };
    const throwMesh = TOOL_MESH.pbpaddle(); throwMesh.visible = false; throwMesh.userData.live = true; G.add(throwMesh);
    const _tq = new Q4(), _tf = new V3();
    function throwPaddle() {
      const t = myPaddle();
      if (!t || TH.on || PB.mySide < 0) return false;
      // where you're looking (in VR, your head; in a browser, the view), a little upward, about 10 m/s
      if (state.mode === 'vr') _tq.copy(myHead.quat); else camera.getWorldQuaternion(_tq);
      _tf.set(0, 0, -1).applyQuaternion(_tq);
      const pitch = clamp(Math.asin(clamp(_tf.y, -1, 1)), -0.5, 0.6), hz = Math.hypot(_tf.x, _tf.z) || 1;
      const dir = new V3((_tf.x / hz) * Math.cos(pitch), Math.sin(pitch), (_tf.z / hz) * Math.cos(pitch));
      TH.p.set(0, 0, -0.22).applyQuaternion(t.quat).add(t.pos);
      if (state.mode !== 'vr') TH.p.copy(myHead.pos).addScaledVector(dir, 0.4).add(new V3(0, -0.25, 0));
      TH.v.copy(dir).multiplyScalar(10).add(new V3(0, 1.5, 0));
      TH.w.set(rand() * 4 - 2, 14 + rand() * 6, rand() * 4 - 2);
      Object.assign(TH, { on: true, seq: PB.pointSeq, hit: false, landed: false });
      throwMesh.position.copy(TH.p); throwMesh.quaternion.copy(t.quat); throwMesh.visible = true;
      PB.swingHeld = false; PB.swingUntil = 0;
      sfx('whoosh', 0.5);
      if (state.mode === 'vr') haptic(vrHands[t.held.side], 0.6, 60);
      forcePresence();
      return true;
    }
    const thrown = () => TH.on;
    // the thrown paddle meeting the ball (the ball's path this frame is from b0 to b1)
    function throwHit(b0, b1, u) {
      if (TH.hit || TH.landed || !iAmAuth() || !hittable(PB.mySide, PB.mySlot)) return false;
      const bx = b0.x + (b1.x - b0.x) * u, by = b0.y + (b1.y - b0.y) * u, bz = b0.z + (b1.z - b0.z) * u;
      if (Math.hypot(bx - TH.p.x, by - TH.p.y, bz - TH.p.z) > 0.17) return false;
      TH.hit = true;
      const b = PB.b; b.x = bx; b.y = Math.max(BR, by); b.z = bz;
      tone(420, 300, 0.06, 'square', 0.3);
      if (rand() < 0.12) {
        // a lucky angle: a soft, loopy one over the net, somewhere in their court
        const tg = target(PB.mySide, HL * (0.35 + rand() * 0.5), (rand() - 0.5) * HW * 1.6);
        hitBall(PB.mySide, aimed(b, tg.x, tg.z, 5 + rand() * 2.5), PB.mySlot);
      } else {
        // the usual: it glances off whichever way the paddle sends it, no help from anyone
        const n = new V3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
        const vb = new V3(b.vx, b.vy, b.vz), vn = vb.dot(n);
        vb.addScaledVector(n, -1.6 * vn).multiplyScalar(0.5).addScaledVector(TH.v, 0.35);
        Object.assign(b, { vx: vb.x, vy: vb.y, vz: vb.z, wx: 0, wy: 0, wz: 0 });
        onHit(PB.mySide, PB.mySlot); PB.ver += 1; forcePresence();
      }
      TH.v.multiplyScalar(-0.2);
      return true;
    }
    function throwStep(dt, b0, b1) {
      const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
      for (let k = 1; k <= n; k++) {
        if (TH.landed) break;
        const px = TH.p.x;
        TH.v.y -= GRAV * h; TH.p.addScaledVector(TH.v, h);
        // the net stops it
        if ((px < 0) !== (TH.p.x < 0) && TH.p.y < NET_H && Math.abs(TH.p.z) < HW + 0.3) { TH.p.x = px < 0 ? -0.05 : 0.05; TH.v.x *= -0.15; TH.v.z *= 0.4; }
        if (TH.p.y < 0.03) { TH.p.y = 0.03; TH.v.y *= -0.25; TH.v.x *= 0.55; TH.v.z *= 0.55; TH.w.multiplyScalar(0.4); tone(160, 0, 0.05, 'triangle', 0.15); if (Math.hypot(TH.v.x, TH.v.y, TH.v.z) < 0.4) TH.landed = true; }
        TH.p.x = clamp(TH.p.x, R.minX + 0.2, R.maxX - 0.2); TH.p.z = clamp(TH.p.z, R.minZ + 0.2, R.maxZ - 0.2);
        if (b0 && PB.ph === 'rally') throwHit(b0, b1, k / n);
      }
      throwMesh.position.copy(TH.p);
      if (!TH.landed) { const w = TH.w.length(); if (w > 0.01) throwMesh.rotateOnWorldAxis(_tf.copy(TH.w).multiplyScalar(1 / w), w * dt); }
      else { throwMesh.rotation.set(0, throwMesh.rotation.y, Math.PI / 2); throwMesh.position.y = 0.02; }
    }
    function throwReset() { TH.on = false; throwMesh.visible = false; forcePresence(); }
    // other players' thrown paddles (from their presence), so everyone sees it fly
    const ghosts = new Map();

    // ---------------------------------------------------------------- Dink Daisy, the court bot
    function predictLanding() {
      // run the ball forward to where it comes down on this side
      const s = { ...PB.b };
      for (let k = 0; k < 400; k++) {
        const sp = Math.hypot(s.vx, s.vy, s.vz), h = 1 / 120;
        airStep(s, h, sp);
        s.x += s.vx * h; s.y += s.vy * h; s.z += s.vz * h;
        if (s.y < BR) return s;
      }
      return s;
    }
    // which spot on side s plays the ball coming down at land: whoever's nearest (a person gets the benefit of the
    // doubt, so a bot partner leaves it to you unless it's clearly theirs)
    function responsible(s, land) {
      const a = slots();
      let best = -1, bd = 1e9;
      for (const sl of activeSlots()) {
        if (sideOf(sl) !== s) continue;
        const at = standingSlot(sl); if (!at) continue;
        const d = Math.hypot(at.x - land.x, at.z - land.z) - (a[sl] ? 0.6 : 0);
        if (d < bd) { bd = d; best = sl; }
      }
      return best;
    }
    function botStep(dt, now) {
      const mine = botSlots(), b = PB.b;
      const show = new Set(PB.mySlot >= 0 ? mine : [0, 1, 2, 3].filter((sl) => PB.botMask & (1 << sl)));
      BOTS.forEach((bt) => { bt.body.visible = bt.paddle.visible = show.has(bt.sl); });
      // the rack paddle at a bot's spot is the one in its hand
      paddles.forEach((t) => { t.g.visible = !(show.has(t.pbSlot) && !t.held); });
      if (PB.mySlot < 0) { for (const bt of BOTS) if (show.has(bt.sl)) placeBot(bt, now, false); return; }
      const coming = PB.ph === 'rally', land = coming ? predictLanding() : null;
      const resp = land ? responsible(sideOfX(land.x), land) : -1;
      for (const sl of mine) stepOneBot(BOTS[sl], dt, now, land, resp === sl);
    }
    function stepOneBot(bt, dt, now, land, mineToPlay) {
      const s = sideOf(bt.sl), b = PB.b;
      // home: back near the baseline, on her own half in doubles
      let tx = endX(s) * (PB.dbl ? 0.8 : 0.85), tz = homeZ(bt.sl);
      const coming = PB.ph === 'rally' && PB.lastHit !== s && mineToPlay;
      // a new shot her way: she takes a moment to read it, and her first guess at where it's going is off (more so for
      // fast or spinning shots), getting better as it comes
      const hk = `${PB.pointSeq}:${PB.hits}`;
      if (coming && hk !== bt.hitKey) {
        const lv = BOTLV.get(L);
        bt.hitKey = hk; bt.reactAt = now + [300, 210, 140][lv] + rand() * 160;
        const hard = Math.hypot(b.vx, b.vz) / 10 + Math.hypot(b.wx || 0, b.wy || 0, b.wz || 0) * 0.6, e = [1.4, 1, 0.55][lv];
        bt.ex = (rand() - 0.5) * (1.0 + hard * 1.4) * e; bt.ez = (rand() - 0.5) * (1.0 + hard * 1.4) * e; bt.err0 = Math.abs(b.x) + 0.5;
        // once the two-bounce rule allows it, she often takes it out of the air (from outside the kitchen)
        bt.vol = PB.hits >= 3 && !PB.bounced && rand() < [0.45, 0.65, 0.8][lv] ? volleySpot(bt, s, (bt.reactAt - now) / 1000, BOTLV.pick(L, [2.9, 3.5, 4.2])) : null;
      }
      let speedCap = BOTLV.pick(L, [2.9, 3.5, 4.2]);
      if (coming) {
        if (now < bt.reactAt) { tx = bt.x; tz = bt.z; }
        else {
          const left = clamp(Math.abs(b.x - land.x) / Math.max(1, HL), 0, 1);
          const vol = bt.vol && !PB.bounced ? bt.vol : null, aimAt = vol || { x: land.x + (s === 0 ? -0.9 : 0.9), z: land.z }, err = vol ? 0.4 : 1;
          tx = clamp(aimAt.x + bt.ex * left * err, s === 0 ? -HL - 1.5 : 0.8, s === 0 ? -0.8 : HL + 1.5);
          if (vol) tx = s === 0 ? Math.min(tx, -KITCH - 0.15) : Math.max(tx, KITCH + 0.15);
          tz = clamp(aimAt.z + bt.ez * left * err, -HW - 1, HW + 1);
        }
      } else speedCap = 2.5;
      if (PB.ph === 'serve' && serverSlot() === bt.sl) { tx = b.x + (s === 0 ? -0.4 : 0.4); tz = b.z; speedCap = 4; }
      // she speeds up and slows down rather than darting (about 3.5 m/s flat out)
      const dx = tx - bt.x, dz = tz - bt.z, d = Math.hypot(dx, dz);
      const want = d > 0.05 ? Math.min(speedCap, d * 2.5) : 0, kx = d > 0.05 ? dx / d : 0, kz = d > 0.05 ? dz / d : 0;
      const acc = Math.min(1, 7 * dt / Math.max(0.1, speedCap));
      bt.vx += (kx * want - bt.vx) * acc * 2; bt.vz += (kz * want - bt.vz) * acc * 2;
      const vs = Math.hypot(bt.vx, bt.vz); if (vs > speedCap) { bt.vx *= speedCap / vs; bt.vz *= speedCap / vs; }
      bt.x += bt.vx * dt; bt.z += bt.vz * dt;
      placeBot(bt, now, coming);
      if (!iAmAuth()) return;
      if (PB.ph === 'serve' && serverSlot() === bt.sl) { if (now - PB.serveT > 1000) botHit(bt, true); return; }
      if (!coming) { bt.decided = false; return; }
      const volleyOk = !!bt.vol && !PB.bounced && PB.hits >= 3 && Math.abs(bt.x) > KITCH + 0.05;
      if (!hittable(s) || (!PB.bounced && !volleyOk)) return;
      if (!bt.decided) {
        // harder to get back: fast balls, spin, and ones she had to run for
        bt.decided = true;
        const k = BOTLV.pick(L, [1.7, 1, 0.45]);
        bt.missing = rand() < (0.09 + Math.max(0, Math.hypot(b.vx, b.vz) - 5) * 0.07 + Math.hypot(b.wx || 0, b.wy || 0, b.wz || 0) * 0.12 + Math.min(0.2, Math.abs(bt.z - b.z) * 0.06)) * k;
      }
      if (bt.missing) return;
      if (Math.hypot(b.x - bt.x, b.z - bt.z) < 1.2 && b.y > 0.25 && b.y < 1.6 && b.vy < 1.5) botHit(bt, false);
    }
    // where to meet the ball in the air: a spot outside the kitchen, at a comfortable height, that she can get to in time
    function volleySpot(bt, s, react, speed) {
      const p = { ...PB.b }, h = 1 / 120;
      let t = 0, best = null, bd = 1e9;
      for (let k = 0; k < 400; k++) {
        const sp = Math.hypot(p.vx, p.vy, p.vz);
        airStep(p, h, sp); p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h; t += h;
        if (p.y < BR) break;
        if (k % 2 || sideOfX(p.x) !== s || Math.abs(p.x) < KITCH + 0.5 || p.y < 0.5 || p.y > 1.35) continue;
        const sx = p.x + (s === 0 ? -0.6 : 0.6), d = Math.hypot(sx - bt.x, p.z - bt.z);
        if (d > speed * Math.max(0, t - react) * 0.85 + 0.4) continue;
        if (d < bd) { bd = d; best = { x: sx, z: p.z }; }
      }
      return best;
    }
    // a bot's body and the paddle on the end of her arm: a backswing as the ball comes, a full stroke when she hits
    function placeBot(bt, now, coming) {
      const s = sideOf(bt.sl), b = PB.b;
      bt.body.position.set(bt.x, 1.5, bt.z); bt.body.rotation.y = s === 0 ? -Math.PI / 2 : Math.PI / 2;
      const toNet = s === 0 ? 1 : -1, since = now - bt.swingT;
      let ang = 0;
      if (since < 280) ang = -1.1 + 2.2 * Math.sin((since / 280) * Math.PI / 2);
      else if (since < 650) ang = 1.1 * (1 - (since - 280) / 370);
      else if (coming) ang = -1.1 * clamp(1 - (Math.hypot(b.x - bt.x, b.z - bt.z) - 1.0) / 3.0, 0, 1);
      const reach = 0.6, py = coming ? clamp(b.y, 0.45, 1.4) : 1.0;
      bt.paddle.position.set(bt.x + toNet * Math.cos(ang) * reach, py, bt.z + 0.3 * toNet + Math.sin(ang) * reach * toNet);
      bt.paddle.rotation.set(0, (s === 0 ? -Math.PI / 2 : Math.PI / 2) + ang * 0.9, 0);
    }
    function botHit(bt, serve) {
      // softer and less precise than a person, with the odd one long (hard: deeper, faster, wider, and hardly ever long)
      const lv = BOTLV.get(L), s = sideOf(bt.sl), wild = !serve && rand() < [0.12, 0.08, 0.03][lv];
      const tg = target(s, HL * (wild ? 1.08 + rand() * 0.15 : [0.42, 0.5, 0.62][lv] + rand() * [0.35, 0.4, 0.3][lv]), (rand() - 0.5) * (HW * 2 - [1.4, 1, 0.7][lv]));
      const sc = [0.8, 0.6, 0.3][lv];
      // a bit of spin, like a real player: mostly topspin drives, some backspin, the odd slice (better bots put more on)
      const ax = tg.x - PB.b.x, az = tg.z - PB.b.z, al = Math.hypot(ax, az) || 1, ux = ax / al, uz = az / al;
      const amt = [0.35, 0.5, 0.65][lv] * (0.6 + rand() * 0.4), roll = rand();
      const w = serve ? (roll < 0.6 ? [0.4 * amt * uz, 0, -0.4 * amt * ux] : [0, (rand() < 0.5 ? 1 : -1) * 0.5 * amt, 0])
        : roll < 0.5 ? [amt * uz, 0, -amt * ux] : roll < 0.8 ? [-0.9 * amt * uz, 0, 0.9 * amt * ux] : [0, (rand() < 0.5 ? 1 : -1) * 0.7 * amt, 0];
      // (the pace it's aimed with: a serve arcs to about 2 m, a drive less)
      hitBall(s, aimed(PB.b, tg.x + (rand() - 0.5) * sc, tg.z + (rand() - 0.5) * sc, serve ? [11, 11.8, 12.5][lv] : [8, 9, 10][lv] + rand() * 2.5, w), bt.sl);
      bt.swingT = performance.now(); for (const o of BOTS) o.decided = false;
    }

    // ---------------------------------------------------------------- taking a side
    // taking a spot (takeSide(s) takes that side's singles spot)
    const takeSide = (s) => takeSlot(s * 2);
    function takeSlot(sl) {
      const at = slots()[sl];
      if (at && at !== state.myPeer) { showToast(`That spot is taken`); return false; }
      // a doubles partner's paddle switches the court to doubles (if no one else is mid-game in singles)
      let switched = false;
      if (sl % 2 && !PB.dbl) {
        if (peopleMatch()) { showToast('They’re playing singles: finish the game, or switch to doubles at the post by the net'); return false; }
        PB.dbl = true; PB.ver += 20; PB.opp = ''; switched = true;   // (a big jump, so everyone's device takes it)
      }
      PB.mySlot = sl; PB.mySide = sideOf(sl);
      if (switched) { newGame(); PB.opp = oppKey(); showToast('Doubles! Two a side, bots in any open spot. First to 11, win by 2'); sfx('chime', 0.6); state.hudDirty = true; state.dirtyBoard = true; forcePresence(); return true; }
      // picking your paddle back up (same players, game not finished) carries on where you left off
      const started = PB.score[0] + PB.score[1] > 0 || PB.ph === 'serve' || PB.ph === 'rally' || PB.ph === 'dead';
      if (started && PB.winner < 0 && PB.opp === oppKey()) {
        if (PB.ph === 'idle') startServe();
        showToast(`Back in the game: ${PB.score[PB.mySide]}–${PB.score[1 - PB.mySide]}`);
      } else {
        if (humans().length <= 1 || PB.ph === 'idle') newGame();
        PB.opp = oppKey();
        showToast(`${PB.dbl ? 'Doubles' : 'Pickleball'}${humans().length > 1 ? '' : ' against the court bots'}! First to ${WIN}, win by 2`);
      }
      sfx('chime', 0.6);
      state.hudDirty = true; state.dirtyBoard = true;
      forcePresence();
      return true;
    }
    function leaveCourt() {
      if (PB.mySlot < 0) return;
      PB.mySlot = -1; PB.mySide = -1; prevPC = null;
      if (!humans().length) { PB.ph = 'idle'; ballMesh.visible = false; }
      showToast('You left the court');
      state.hudDirty = true; state.dirtyBoard = true;
      forcePresence();
    }
    // a game going on with people at both ends (then singles/doubles waits until it's over)
    const peopleMatch = () => { const a = slots(); return (a[0] || a[1]) && (a[2] || a[3]) && PB.ph !== 'idle' && PB.winner < 0; };
    // singles or doubles: anyone can switch between games, or any time when it's just you and the bots
    function setDoubles(on) {
      if (on === PB.dbl) return;
      if (peopleMatch()) { showToast('Finish this game first'); return; }
      if (PB.mySlot < 0 && humans().length) { showToast(on ? 'Grab a paddle to join: the far racks are the doubles partners' : 'Only the players on the court can switch'); return; }
      PB.dbl = on; PB.ver += 20; PB.opp = '';
      // a doubles partner's spot doesn't exist in singles: put that paddle back
      if (!on && PB.mySlot >= 0 && PB.mySlot % 2) { const sl = PB.mySlot - 1; putDown(myPaddle()); leaveCourt(); if (!slots()[sl]) showToast('Singles now: grab the paddle on the bench side to play'); }
      if (PB.mySlot >= 0) newGame();
      showToast(on ? 'Doubles: two a side. Bots fill any open spot; friends can grab the paddles on the far side' : 'Singles: one a side');
      sfx('click', 0.7); state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    L.setDoubles = setDoubles;
    function putDown(t) {
      if (!t) return;
      for (const s of SIDES) if (vrHands[s].holding && vrHands[s].holding.obj === t) vrHands[s].holding = null;
      if (state.held && state.held.obj === t) { state.held = null; state.hudDirty = true; }
      dropTool(t);
    }
    L.onToolGrab = (t) => { if (t.kind === 'pbpaddle' && PB.mySlot !== t.pbSlot && !takeSlot(t.pbSlot)) putDown(t); };
    L.onUse = () => {
      if (state.mode !== 'flat') return false;
      if (PB.mySide >= 0) { putDown(myPaddle()); leaveCourt(); return true; }
      let near = null, nd = 1.8;
      for (const t of paddles) { const d = Math.hypot(myHead.pos.x - t.rackPos.x, myHead.pos.z - t.rackPos.z); if (d < nd) { nd = d; near = t; } }
      if (near) {
        const t = near, s = t.pbSide;
        {
          if (t.held && t.held.peer !== state.myPeer) { showToast('That spot is taken'); return true; }
          if (!takeSlot(t.pbSlot)) return true;
          grabTool(t, 'right'); state.held = { kind: 'tool', obj: t }; state.hudDirty = true;
          dolly.position.x += endX(s) * 1.08 - myHead.pos.x; dolly.position.z += homeZ(t.pbSlot) - myHead.pos.z;
          state.yaw = s === 0 ? -Math.PI / 2 : Math.PI / 2; state.pitch = -0.15;
          return true;
        }
      }
      return false;
    };
    // stay on your own half while you play; otherwise the whole park is yours to walk round (and quicker, to look round)
    const inGame = () => PB.mySide >= 0 && (PB.ph === 'serve' || PB.ph === 'rally' || PB.ph === 'dead');
    Object.defineProperty(L, 'walkSpeed', { configurable: true, get: () => (inGame() ? (state.mode === 'vr' ? 2.6 : 3) : (state.mode === 'vr' ? 5 : 6.5)) });
    L.clampPlayer = (p) => {
      const playing = inGame();
      if (!playing) { const B = L.bounds; return [clamp(p.x, B.minX + 0.4, B.maxX - 0.4) - p.x, clamp(p.z, B.minZ + 0.4, B.maxZ - 0.4) - p.z]; }
      let x = clamp(p.x, R.minX + 0.4, R.maxX - 0.4), z = clamp(p.z, R.minZ + 0.4, R.maxZ - 0.4);
      if (PB.mySide === 0) x = Math.min(x, -0.35); else if (PB.mySide === 1) x = Math.max(x, 0.35);
      return [x - p.x, z - p.z];
    };
    L.spawn = () => { dolly.position.set(-HL - 1.6, 0, HW + 2.2); state.yaw = -Math.PI * 0.75; state.pitch = -0.05; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0001) * 0.4; camera.position.set(Math.sin(a) * 9, 5, 9); camera.lookAt(0, 0.5, 0); };
    L.hintsFor = () => {
      if (PB.mySide >= 0 && state.mode === 'flat') return [['WASD', 'move'], ['Hold Space', 'power (too long goes out)'], ['Look', 'aim'], ['R', SPINS[PB.spinMode].toLowerCase()], ['Space + J', 'throw the paddle'], ['E', 'put the paddle back']];
      return [['WASD', 'move'], ['Drag', 'look'], ['E', 'at a paddle rack to play'], ['Doubles', 'the far racks, or the switch by the net']];
    };
    L.onExit = () => { if (TH.on) throwReset(); putDown(myPaddle()); leaveCourt(); PB.swingHeld = false; if (powShown) { powShown = false; ui.power.hidden = true; } };

    // ---------------------------------------------------------------- per frame
    function drawScore() {
      const g = scoreC.g;
      g.fillStyle = '#1b3a5a'; g.fillRect(0, 0, 640, 220);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 36px ${DISPLAY}`; g.fillText(PB.dbl ? 'Pickleball · Doubles' : 'Pickleball · Singles', 320, 38);
      g.fillStyle = '#ffffff'; g.font = `800 92px ${DISPLAY}`; g.fillText(`${PB.score[0]}  -  ${PB.score[1]}`, 320, 124);
      const one = (sl) => { const p = slots()[sl]; return p ? (p === state.myPeer ? 'You' : (remotes.get(p) || {}).name || SIDE_NAME[sideOf(sl)]) : (botSlots().includes(sl) || PB.botMask & (1 << sl) ? BOT_NAMES[sl].split(' ')[1] : 'open'); };
      const who = (s) => (PB.dbl ? `${one(s * 2)} & ${one(s * 2 + 1)}` : one(s * 2));
      g.fillStyle = '#a8d8f8'; g.font = `400 26px ${BODY}`;
      g.fillText(PB.ph === 'idle' ? 'Grab a paddle from a rack to play' : `${PB.server === 0 ? '\u25cf ' : ''}${who(0)}   vs   ${who(1)}${PB.server === 1 ? ' \u25cf' : ''}`, 320, 192, 600);
      scoreC.tex.needsUpdate = true;
    }
    drawScore();
    L.drawBoard = () => drawScore();
    L.rowFor = () => ({ text: '' });
    L.sortRows = () => 0;
    let scoreKey = '';
    let powShown = false;
    // who runs a ball heading to side s: the person on that side nearest it (null: no one there, so it stays put)
    function authFor(s) {
      const a = slots(), on = [s * 2, s * 2 + 1].filter((sl) => a[sl]);
      if (!on.length) return null;
      if (on.length === 1) return a[on[0]];
      const d = (sl) => { const at = standingSlot(sl); return at ? Math.hypot(at.x - PB.b.x, at.z - PB.b.z) : 99; };
      const [p, q] = on, cur = a[p] === PB.auth ? p : a[q] === PB.auth ? q : -1;
      // hand over only when the other partner is clearly nearer (no flip-flopping between two people)
      if (cur >= 0) { const o = cur === p ? q : p; return d(o) < d(cur) - 0.8 ? a[o] : a[cur]; }
      return d(p) <= d(q) ? a[p] : a[q];
    }
    L.update = (dt, now) => {
      // the power bar while you hold the swing in a browser
      const showPow = state.mode === 'flat' && PB.swingHeld && !!myPaddle();
      if (showPow) { ui.power.hidden = false; ui.powerFill.style.width = `${Math.round(swingPower(now) * 100)}%`; powShown = true; }
      else if (powShown) { powShown = false; if (state.charge === null) ui.power.hidden = true; }
      if (PB.mySide >= 0 && !myPaddle()) leaveCourt();
      if (PB.ph === 'serve' && PB.serveVer !== PB.ver) { PB.serveVer = PB.ver; PB.serveT = now; }
      if (iAmAuth() && PB.ph === 'serve') { const sv = slots()[serverSlot()]; if (sv && sv !== state.myPeer) { PB.auth = sv; PB.ver += 1; forcePresence(); } }
      if (PB.mySide >= 0 && PB.ph !== 'idle' && !iAmAuth()) {
        const at = humans();
        if (!at.includes(PB.auth) && at.sort()[0] === state.myPeer) { PB.auth = state.myPeer; PB.ver += 1; if (PB.ph === 'rally') { PB.ph = 'dead'; PB.deadT = now; } forcePresence(); }
      }
      const steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;
      if (iAmAuth()) {
        if (PB.ph === 'dead' && now - PB.deadT > 1500) { if (PB.winner >= 0) { if (now - PB.overT > 5000) newGame(); } else startServe(); }
        ballPrev = new V3(PB.b.x, PB.b.y, PB.b.z);   // (where the ball was at the start of the frame, for the swept paddle check)
        for (let k = 0; k < steps && PB.ph === 'rally'; k++) {
          stepBall(h);
          const toward = sideOfX(PB.b.x), other = authFor(toward);
          if (PB.ph === 'rally' && other && other !== state.myPeer && PB.lastHit !== toward) { PB.auth = other; PB.ver += 1; forcePresence(); break; }
        }
        if (iAmAuth() && PB.ph === 'rally' && PB.lastHit !== PB.mySide && sideOfX(PB.b.x) === PB.mySide) { const o = authFor(PB.mySide); if (o && o !== state.myPeer) { PB.auth = o; PB.ver += 1; forcePresence(); } }
        vrPaddle(dt, 6);
        deskHit(now);
      } else if (PB.ph === 'rally') { simOnly = true; for (let k = 0; k < steps; k++) stepBall(h); simOnly = false; prevPC = null; }
      botStep(dt, now);
      snowStep(dt, now);
      // throwing: jump + trigger on the paddle's hand in VR; J while holding Space in a browser
      {
        const t = myPaddle(); let combo = false;
        if (t && state.mode === 'vr') {
          const gp = (h) => h && h.source && h.source.gamepad, hb = gp(vrHands[t.held.side]);
          const trig = !!(hb && hb.buttons[0] && hb.buttons[0].pressed);
          let jump = false;
          for (const sd of ['left', 'right']) { const g2 = gp(vrHands[sd]); if (g2 && g2.buttons && [4, 5].some((k) => g2.buttons[k] && g2.buttons[k].pressed)) jump = true; }
          const rs = stickAxes(vrHands.right); if (rs && rs[1] < -0.75 && Math.abs(rs[0]) < 0.5) jump = true;
          combo = trig && jump;
        } else if (t && state.mode === 'flat') combo = !!state.keys.KeyJ && PB.swingHeld;
        if (combo && !TH.prev) throwPaddle();
        TH.prev = combo;
      }
      if (TH.on) {
        // back in your hand at the next serve (thrown mid-point, it stays out until the point's over; thrown any other
        // time, it comes back once it has landed)
        if (PB.mySide < 0 || (PB.ph !== 'rally' && PB.ph !== 'dead' && (TH.landed || PB.pointSeq !== TH.seq))) throwReset();
        else { throwStep(dt, iAmAuth() && ballPrev ? ballPrev : null, PB.b); const t = myPaddle(); if (t) t.g.visible = false; }
      }
      for (const [peer, gh] of ghosts) {
        const fresh = now - gh.t < 700 && remotes.has(peer);
        gh.mesh.visible = fresh;
        if (!fresh) { if (now - gh.t > 5000) { G.remove(gh.mesh); ghosts.delete(peer); } continue; }
        gh.mesh.position.set(gh.a[0], gh.a[1], gh.a[2]); gh.mesh.quaternion.set(gh.a[3], gh.a[4], gh.a[5], gh.a[6]).normalize();
        for (const tp of paddles) if (tp.held && tp.held.peer === peer) tp.g.visible = false;
      }
      ballMesh.position.set(PB.b.x, PB.b.y, PB.b.z);
      ballMesh.visible = PB.ph !== 'idle';
      if (ballMesh.visible) spinBall(Math.min(dt, 0.05));
      shadow.visible = ballMesh.visible; shadow.position.set(PB.b.x, 0.012, PB.b.z);
      const key = `${PB.score}|${PB.server}|${PB.ph === 'idle'}|${slots().join()}|${PB.botMask}|${PB.dbl}|${botSlots().join()}`;
      if (key !== scoreKey) { scoreKey = key; drawScore(); }
    };

    // ---------------------------------------------------------------- network
    const PHC = { idle: 0, serve: 1, rally: 2, dead: 3 }, PHN = ['idle', 'serve', 'rally', 'dead'];
    const r3 = (x) => Math.round(x * 1000) / 1000;
    L.presence = () => {
      if (PB.mySide < 0) return { pkp: [park, parkVer, season, PARKS[park].courtAt || 0] };   // (the park, even when you're not playing)
      const b = PB.b, bm = botSlots().reduce((m, sl) => m | (1 << sl), 0);
      const pbt = TH.on ? [r3(TH.p.x), r3(TH.p.y), r3(TH.p.z), r3(throwMesh.quaternion.x), r3(throwMesh.quaternion.y), r3(throwMesh.quaternion.z), r3(throwMesh.quaternion.w)] : null;
      return { pbt, pkp: [park, parkVer, season, PARKS[park].courtAt || 0], pb: [PB.mySide, PB.ver, PB.auth, r3(b.x), r3(b.y), r3(b.z), r3(b.vx), r3(b.vy), r3(b.vz), PHC[PB.ph], PB.server, PB.lastHit, PB.need, PB.bounced ? 1 : 0, PB.hits, PB.score[0], PB.score[1], PB.pointSeq, PB.winner, bm, 0, 0, r3(PB.serveFromZ || 0), r3(b.wx || 0), r3(b.wy || 0), r3(b.wz || 0), PB.mySlot, PB.dbl ? 1 : 0, ...BOTS.flatMap((o) => [r3(o.x), r3(o.z)])] };
    };
    L.readPresence = (rec, pres, st) => {
      const pk = pres.pkp;
      if (Array.isArray(pk) && pk.length >= 2 && pk.length <= 4 && Number.isInteger(pk[0]) && Number.isInteger(pk[1]) && pk[1] > parkVer && pk[1] < 1e6) {
        if (pk.length >= 3 && Number.isInteger(pk[2]) && pk[2] >= -1 && pk[2] < SEASONS.length) season = pk[2];
        if (pk.length === 4 && Number.isInteger(pk[3]) && pk[3] >= 0 && pk[3] < 9 && PARKS[pk[0]]) PARKS[pk[0]].courtAt = pk[3];
        setPark(pk[0], pk[1], true);
      }
      const tt = pres.pbt;
      if (Array.isArray(tt) && tt.length === 7 && tt.every((x) => finite(x) && Math.abs(x) < 60)) {
        let gh = ghosts.get(rec.peer);
        if (!gh) { const m = TOOL_MESH.pbpaddle(); m.userData.live = true; G.add(m); gh = { mesh: m }; ghosts.set(rec.peer, gh); }
        gh.a = tt; gh.t = performance.now();
      } else { const gh = ghosts.get(rec.peer); if (gh) gh.t = 0; }
      const a = pres.pb;
      st.pbSide = -1; st.pbSlot = -1;
      if (!Array.isArray(a) || a.length !== 36 || (a[0] !== 0 && a[0] !== 1) || !Number.isInteger(a[1]) || typeof a[2] !== 'string' || !a.slice(3, 9).every((x) => finite(x) && Math.abs(x) < 60)
        || !Number.isInteger(a[26]) || a[26] < 0 || a[26] > 3 || sideOf(a[26]) !== a[0] || !a.slice(28, 36).every((x) => finite(x) && Math.abs(x) < 60)) return;
      const side = a[0], slot = a[26];
      if (slot === PB.mySlot) { if (rec.peer < state.myPeer) { showToast(`${rec.name} took that spot first`); putDown(myPaddle()); leaveCourt(); } else return; }
      st.pbSide = side; st.pbSlot = slot;
      if (a[1] > PB.ver) {
        const before = PB.pointSeq;
        const sw = (i) => (finite(a[i]) ? clamp(a[i], -1, 1) : 0);
        Object.assign(PB.b, { x: a[3], y: a[4], z: a[5], vx: a[6], vy: a[7], vz: a[8], wx: sw(23), wy: sw(24), wz: sw(25) });
        PB.dbl = a[27] === 1;
        // the court went to singles while I was a doubles partner: that spot's gone
        if (!PB.dbl && PB.mySlot >= 0 && PB.mySlot % 2) { putDown(myPaddle()); leaveCourt(); showToast('They switched to singles'); }
        Object.assign(PB, { ver: a[1], auth: a[2], ph: PHN[clamp(a[9] | 0, 0, 3)], server: a[10] ? 1 : 0, lastHit: a[11] | 0, need: a[12] | 0, bounced: a[13] === 1, hits: a[14] | 0, score: [a[15] | 0, a[16] | 0], pointSeq: a[17] | 0, winner: a[18] | 0, serveFromZ: a[22] });
        if (PB.pointSeq > before && PB.mySide >= 0) announce(PB.score[0] > (st.pbS0 || 0) ? 0 : 1, '');
        if (PB.winner >= 0 && !PB.overT) PB.overT = performance.now();
        if (PB.winner < 0) PB.overT = 0;
      }
      st.pbS0 = PB.score[0];
      // what I see while I'm not playing: their bots, where they have them
      if (PB.mySide < 0) {
        PB.botMask = Number.isInteger(a[19]) ? a[19] & 15 : 0;
        BOTS.forEach((o, i) => { if (PB.botMask & (1 << i)) { o.x = a[28 + i * 2]; o.z = a[29 + i * 2]; } });
      }
    };
    L.hudActions = [
      { label: () => `Shot: ${SPINS[PB.spinMode]} \u25b8`, show: () => PB.mySide >= 0, run: () => cycleSpin() },
      { label: () => `Park: ${PARKS[park].name} \u25b8`, show: () => true, run: () => nextPark() },
      { label: () => `Season: ${SEASONS[curSeason()].name} \u25b8`, show: () => true, run: () => nextSeason() },
      { label: () => `Court: ${(PARKS[park].courtAt || 0) + 1} of ${courtCount()} \u25b8`, show: () => courtCount() > 1, run: () => nextCourt() },
      { label: () => (PB.dbl ? 'Doubles \u25b8' : 'Singles \u25b8'), run: () => setDoubles(!PB.dbl) },
      { label: () => 'New game', show: () => PB.mySide >= 0 && humans().length === 1, run: () => { newGame(); showToast(`New game against the court bots. First to ${WIN}, win by 2`); } },
    ];
    PB.internals = { stripeKick, setCourt, courtOff, crackKick, setSeason, season: () => curSeason(), snow, SEASONS, setPark, park: () => park, parkVer: () => parkVer, PARKS, botHit: (bt, serve) => botHit(bt, serve), TH, throwPaddle, throwStep, throwMesh, ghosts, ballMesh, spinBall, vrPaddle: (dt, steps, b0) => { ballPrev = b0 || null; vrPaddle(dt, steps); }, resetSwing: () => { prevPC = null; }, bounceSpin, airStep, predictLanding, botStep, SPINS, deskHit: (now) => deskHit(now), HL, HW, KITCH, NET_H, paddles, takeSide, takeSlot, setDoubles, slots, botSlots, BOTS, serverSlot, responsible, authFor, homeZ, leaveCourt, newGame, startServe, onHit, onBounce, stepBall, hitBall, aimed, clearNet, flyTo, target, players, botSide, iAmAuth, serveZ };
    // End game: start over at 0-0 with whoever's on the court
    ENDGAME.on(L, { shared: true, active: () => PB.mySlot >= 0 && PB.ph !== 'idle', end: () => { if (PB.mySlot < 0) return ''; newGame(); PB.opp = oppKey(); PB.ver += 20; forcePresence(); return 'Starting over at 0-0.'; } });
    return L;
  })();

