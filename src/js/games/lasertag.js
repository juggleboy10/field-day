  // ================================================================ LEVEL: NEON LASER TAG
  const lasertag = (() => {
    const L = newLevel(4);
    const G = L.group;
    const rand = mulberry32(5150);
    L.teams = true;
    L.teamKey = 'lq';
    L.grabless = true;
    const AR = { minX: -20, maxX: 20, minZ: -16.5, maxZ: 16.5 };
    const BASE_Z = 14.5;          // the team bases: red at +z, blue at -z
    const WIN = 15;
    L.bounds = AR;
    L.env = {
      sky: skyTexture([[0, '#05040e'], [0.5, '#1a1240'], [1, '#05040e']]),
      bg: 0x090b1a, fog: [0x0b0b20, 34, 110], hemi: [0x6070c0, 0x10101a, 0.65],
      sun: [0x8090ff, 0.35], sunDir: new V3(0.2, 1, 0.3), ambient: [0x303060, 0.45],
      sprite: null,
    };

    // floor with a glowing grid
    const grid = canvasTexture(512, 512, (g) => {
      g.fillStyle = '#0a0d22'; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(80,140,255,0.35)'; g.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      g.strokeStyle = 'rgba(80,140,255,0.12)'; g.lineWidth = 1;
      for (let i = 32; i < 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    });
    grid.tex.wrapS = grid.tex.wrapT = THREE.RepeatWrapping;
    grid.tex.repeat.set(40 / 8, 33 / 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 33), new THREE.MeshBasicMaterial({ map: grid.tex }));
    floor.rotation.x = -Math.PI / 2;
    G.add(floor);
    const mid = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    mid.rotation.x = -Math.PI / 2; mid.position.y = 0.005;
    G.add(mid);
    // team bases
    for (const t of [0, 1]) {
      const z = t === 0 ? BASE_Z : -BASE_Z;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[t], transparent: true, opacity: 0.35 }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.006, z);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.7, 40), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[t] }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.007, z);
      G.add(pad, ring);
    }
    // walls with neon trim
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x141833, emissive: 0x05060f });
    const trimMats = [new THREE.MeshBasicMaterial({ color: TEAM_COLORS[0] }), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[1] }), new THREE.MeshBasicMaterial({ color: 0xb388ff })];
    const WALL_H = 2.6;
    const AW = AR.maxX - AR.minX + 0.6, AD = AR.maxZ - AR.minZ + 0.6;
    addBox(G, AW, WALL_H, 0.3, wallMat, 0, WALL_H / 2, AR.maxZ + 0.15);
    addBox(G, AW, WALL_H, 0.3, wallMat, 0, WALL_H / 2, AR.minZ - 0.15);
    addBox(G, 0.3, WALL_H, AD, wallMat, AR.minX - 0.15, WALL_H / 2, 0);
    addBox(G, 0.3, WALL_H, AD, wallMat, AR.maxX + 0.15, WALL_H / 2, 0);
    addBox(G, AW, 0.06, 0.34, trimMats[0], 0, WALL_H, AR.maxZ + 0.15);
    addBox(G, AW, 0.06, 0.34, trimMats[1], 0, WALL_H, AR.minZ - 0.15);
    for (const x of [AR.minX - 0.15, AR.maxX + 0.15]) addBox(G, 0.34, 0.06, AD, trimMats[2], x, WALL_H, 0);
    // cover blocks: [x, z, w, d, h]
    // (the same on both halves, turned half way round)
    const BLOCKS = [
      [0, 0, 5, 1.25, 1.3], [-8.7, 5.1, 1.25, 5, 2.2], [8.7, -5.1, 1.25, 5, 2.2], [-8.7, -8, 3.75, 1.25, 1.3], [8.7, 8, 3.75, 1.25, 1.3],
      [-16, 0, 1.25, 6.25, 2.2], [16, 0, 1.25, 6.25, 2.2], [0, 9.4, 3.75, 1.25, 2.2], [0, -9.4, 3.75, 1.25, 2.2], [-4.4, -3.6, 1.75, 1.75, 1.5],
      [4.4, 3.6, 1.75, 1.75, 1.5], [-15.2, 11.6, 2.5, 1.5, 1.4], [15.2, -11.6, 2.5, 1.5, 1.4], [-15.2, -11.6, 2.5, 1.5, 1.4], [15.2, 11.6, 2.5, 1.5, 1.4],
      [-12, 4.5, 1.75, 1.75, 1.5], [12, -4.5, 1.75, 1.75, 1.5], [12.5, 5, 1.25, 3, 2.2], [-12.5, -5, 1.25, 3, 2.2],
      [-4.8, 12.6, 2.5, 1, 1.3], [4.8, -12.6, 2.5, 1, 1.3],
    ];
    const blockMat = new THREE.MeshLambertMaterial({ color: 0x1b2046, emissive: 0x080a1c });
    L.boxes = BLOCKS.map(([x, z, w, d, h]) => {
      const m = addBox(G, w, h, d, blockMat, x, h / 2, z);
      const col = z > 1.5 ? TEAM_COLORS[0] : z < -1.5 ? TEAM_COLORS[1] : 0xb388ff;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: col }));
      edges.position.copy(m.position);
      G.add(edges);
      return { min: new V3(x - w / 2, 0, z - d / 2), max: new V3(x + w / 2, h, z + d / 2) };
    });
    // a few glowing lights overhead
    for (const [x, z, c] of [[0, 12, TEAM_COLORS[0]], [0, -12, TEAM_COLORS[1]], [-12, 0, 0xb388ff], [12, 0, 0xb388ff], [0, 0, 0xb388ff]]) {
      const l = new THREE.PointLight(c, 0.9, 22, 1.5);
      l.position.set(x, 3.2, z);
      G.add(l);
    }

    // kiosk, team switch, boards
    // two big scoreboards up above the end walls, so whichever way you face down the arena you can see the score
    const BW = 8, BH = 4, BY = WALL_H + 0.3 + BH / 2;
    L.board = makeBoard(G, 1024, 512, BW, BH, 0, BY, AR.maxZ + 0.1, Math.PI, false);
    const board2 = makeBoard(G, 1024, 512, BW, BH, 0, BY, AR.minZ - 0.1, 0, false);
    for (const z of [AR.maxZ + 0.15, AR.minZ - 0.15]) for (const x of [-BW / 2 + 0.6, BW / 2 - 0.6]) addBox(G, 0.16, 0.5, 0.16, wallMat, x, WALL_H + 0.25, z);
    const sign = makeBoard(G, 720, 560, 2.0, 1.56, AR.maxX - 0.02, 1.6, -4.4, -Math.PI / 2, false);
    function drawSign() {
      const g = sign.g;
      g.fillStyle = '#0d0f24'; g.fillRect(0, 0, 720, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#b388ff'; g.font = `800 58px ${DISPLAY}`;
      g.fillText('How to play', 36, 78);
      const sections = [
        ['In VR', 'Pull either trigger to fire from that hand. Move with the left stick, press A or X to jump, and duck behind cover.'],
        ['In a browser', 'Click or press Space to fire at the crosshair. J jumps.'],
        ['Rules', `Press Start game: everyone goes back to base for a countdown. A tag knocks someone out for 3 seconds. First team to ${WIN} tags wins.`],
      ];
      let y = 122;
      for (const [label, body] of sections) {
        g.fillStyle = '#4fc3f7'; g.font = `700 24px ${BODY}`;
        g.fillText(label, 36, y);
        y += 31;
        g.fillStyle = '#e4e0fa'; g.font = `400 24px ${BODY}`;
        y = wrapText(g, body, 36, y, 648, 30) + 10;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);
    makeKiosk(L, AR.maxX - 0.7, 1.8, -Math.PI / 2);
    makeButton(L, new V3(AR.maxX - 0.7, 1.0, 3.6), 0xb388ff, 'Switch team', () => switchTeam(), { faceYaw: -Math.PI / 2 });
    makeButton(L, new V3(AR.maxX - 0.7, 1.0, 5.2), 0x8bd450, 'Start game', () => startGame(), { faceYaw: -Math.PI / 2 });
    // and one at each base, by the back wall
    makeButton(L, new V3(2.8, 1.0, AR.maxZ - 0.6), 0x8bd450, 'Start game', () => startGame(), { faceYaw: Math.PI });
    makeButton(L, new V3(-2.8, 1.0, AR.minZ + 0.6), 0x8bd450, 'Start game', () => startGame(), { faceYaw: 0 });

    // ---------------------------------------------------------------- me
    L.me = { team: -1, tags: 0, round: 0, countUntil: 0, countN: -1, tagged: false, taggedUntil: 0, invUntil: 0, cool: 0, hand: 'right', lsSeq: 0, ls: [], lhSeq: 0, lh: [], practice: 0, winT: 0 };
    const me = L.me;
    function switchTeam(balance) {
      if (me.team < 0) return;
      me.team = 1 - me.team;
      me.tags = 0;
      sfx('zap', 1);
      showToast(balance ? `Teams balanced: you\u2019re on ${TEAM_NAMES[me.team]}` : `You\u2019re on ${TEAM_NAMES[me.team]} now`);
      spawnAtBase();
      state.dirtyBoard = true;
      state.hudDirty = true;
      forcePresence();
    }
    function spawnAtBase() {
      const z = me.team === 0 ? BASE_Z - 0.5 : -BASE_Z + 0.5;
      camera.getWorldPosition(_hd);
      dolly.position.x += (rand() - 0.5) * 2 - _hd.x;
      dolly.position.z += z - _hd.z;
      if (state.mode !== 'vr') { state.yaw = me.team === 0 ? 0 : Math.PI; state.pitch = -0.05; }
    }
    const _hd = new V3();
    L.spawn = () => {
      dolly.position.set(0, 0, 0);
      camera.position.set(0, 1.6, 0);
      if (me.team < 0) me.team = pickTeam(L);
      spawnAtBase();
    };
    L.onEnter = () => { if (me.team < 0) me.team = pickTeam(L); L.enteredAt = performance.now(); state.dirtyBoard = true; };
    L.switchTeam = switchTeam;
    L.vrHop = true;

    // ---------------------------------------------------------------- starting a game
    // Round 0 is a warm-up (tags count, but nobody wins). Start game moves everyone on to a new round: back to your base
    // for a 3-2-1 countdown, with no shooting until it's done. Other players see the newer round and do the same.
    const COUNT_MS = 3000;
    const counting = (now) => now < me.countUntil;
    function beginRound(now) {
      me.tags = 0; me.winT = 0; me.tagged = false; me.invUntil = 0;
      me.countUntil = now + COUNT_MS; me.countN = -1;
      if (state.level === L.idx && state.mode !== 'menu') spawnAtBase();
      if (L.ltResetBots) L.ltResetBots();
      showToast(me.round > 1 ? `Game ${me.round}: back to base!` : 'Game on: back to base!');
      state.dirtyBoard = true; state.hudDirty = true; forcePresence();
    }
    function startGame() {
      const now = performance.now();
      if (counting(now) || state.mode === 'menu') return;
      let r = me.round;
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.round > r) r = st.round; }
      me.round = r + 1;
      beginRound(now);
    }
    L.startGame = startGame;

    // my blaster
    function makeBlaster() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.24), new THREE.MeshLambertMaterial({ color: 0x2a2e48 }));
      body.position.z = -0.08;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), new THREE.MeshLambertMaterial({ color: 0x1b1d30 }));
      grip.position.set(0, -0.06, 0.02); grip.rotation.x = 0.3;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.015, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      strip.position.set(0, 0.03, -0.08);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      tip.rotation.x = Math.PI / 2; tip.position.z = -0.22;
      g.add(body, grip, strip, tip);
      g.userData.glow = [strip.material, tip.material];
      return g;
    }
    const blaster = makeBlaster();
    blaster.visible = false;
    L.overlay.add(blaster);

    // beams (mine and everyone else's)
    const beams = [];
    const beamGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 0.5);       // runs from the origin along +z, which lookAt() turns toward the target
    // a shot: a bright white core inside a thick glow in the team's colour, a flash at the muzzle and a burst where it lands
    const glowGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 8, 1, true);
    glowGeo.rotateX(Math.PI / 2); glowGeo.translate(0, 0, 0.5);
    function showBeam(from, to, team) {
      const col = TEAM_COLORS[team] || 0xffffff;
      const len = Math.max(0.01, from.distanceTo(to));
      const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false }));
      const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      for (const x of [m, glow]) { x.position.copy(from); x.lookAt(to); x.scale.z = len; }
      m.scale.x = m.scale.y = 1.6;
      const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      spark.position.copy(to); spark.scale.set(0.8, 0.8, 1);
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      // (small when it's right in front of your eyes, so your own shots don't blind you)
      const near = clamp(from.distanceTo(myHead.pos) / 1.5, 0.25, 1);
      flash.position.copy(from); flash.scale.set(0.35 * near, 0.35 * near, 1);
      G.add(m, glow, spark, flash);
      beams.push({ m, glow, spark, flash, t0: performance.now() });
    }

    // practice drones when nobody is on the other team
    const drones = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6a4a00 }));
      m.visible = false;
      G.add(m);
      drones.push({ m, phase: i * 1.7, alive: true, respawn: 0, pos: new V3() });
    }
    const opponents = () => {
      let n = 0;
      for (const rec of remotes.values()) {
        if (!inMyLevel(rec)) continue;
        const st = rec.lvState[L.id];
        if (st && st.team !== me.team && (st.team === 0 || st.team === 1)) n++;
      }
      return n;
    };

    // ---------------------------------------------------------------- shooting
    function rayBox(o, d, b, maxT) {
      let t0 = 0, t1 = maxT;
      for (const ax of ['x', 'y', 'z']) {
        const inv = 1 / (d[ax] || 1e-9);
        let ta = (b.min[ax] - o[ax]) * inv, tb = (b.max[ax] - o[ax]) * inv;
        if (ta > tb) { const s = ta; ta = tb; tb = s; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) return Infinity;
      }
      return t0;
    }
    // distance between the ray and a vertical body segment, and where along the ray it happens
    const _w = new V3(), _u = new V3();
    function rayBody(o, d, top, bottomY, maxT) {
      _u.set(0, bottomY - top.y, 0);
      _w.subVectors(o, top);
      const b = d.dot(_u), c = d.dot(_w), e = _u.dot(_u), f = _u.dot(_w);
      const den = e - b * b;
      let s = den > 1e-8 ? clamp((b * f - c * e) / den, 0, maxT) : 0;
      let t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c, 0, maxT); } else if (t > 1) { t = 1; s = clamp(b - c, 0, maxT); }
      const px = o.x + d.x * s - top.x, py = o.y + d.y * s - (top.y + _u.y * t), pz = o.z + d.z * s - top.z;
      return { dist: Math.hypot(px, py, pz), s };
    }
    const _o = new V3(), _d = new V3(), _end = new V3(), _cq = new Q4(), _cp = new V3();
    function fire(now) {
      if (me.tagged || now < me.cool || state.mode === 'menu' || counting(now)) return;
      me.cool = now + 420;
      blasterPose();
      _d.set(0, 0, -1).applyQuaternion(blaster.quaternion);
      _o.copy(blaster.position).addScaledVector(_d, 0.24);
      if (state.mode === 'flat') {
        camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
        _end.set(0, 0, -40).applyQuaternion(_cq).add(_cp);
        _d.subVectors(_end, _o).normalize();
      }
      let maxT = 60;
      for (const b of L.boxes) maxT = Math.min(maxT, rayBox(_o, _d, b, maxT));
      for (const t of [(AR.minX - _o.x) / _d.x, (AR.maxX - _o.x) / _d.x, (AR.minZ - _o.z) / _d.z, (AR.maxZ - _o.z) / _d.z, -_o.y / _d.y]) if (t > 0 && t < maxT) maxT = t;
      let hitRec = null, hitT = maxT;
      for (const rec of remotes.values()) {
        if (!inMyLevel(rec) || !rec.hasH) continue;
        const st = rec.lvState[L.id];
        if (!st || st.team === me.team || st.tagged) continue;
        const r = rayBody(_o, _d, rec.cur.h.pos, Math.max(0.2, rec.cur.h.pos.y - 1.15), hitT);
        if (r.dist < 0.3 && r.s < hitT) { hitT = r.s; hitRec = rec; }
      }
      let hitBot = null;
      if (L.ltRayHitsBot) { const hb = L.ltRayHitsBot(_o, _d, hitT); if (hb) { hitBot = hb.bot; hitT = hb.s; hitRec = null; } }
      let hitDrone = null;
      if (!hitRec && !hitBot) {
        for (const dr of drones) {
          if (!dr.alive || !dr.m.visible) continue;
          _w.subVectors(dr.pos, _o);
          const s = _w.dot(_d);
          if (s < 0 || s > hitT) continue;
          if (_w.addScaledVector(_d, -s).length() < 0.32) { hitT = s; hitDrone = dr; }
        }
      }
      _end.copy(_o).addScaledVector(_d, hitT);
      showBeam(_o, _end, me.team);
      sfx('laser', 1);
      if (state.mode === 'vr') haptic(vrHands[me.hand], 0.4, 25);
      me.ls.push([++me.lsSeq, r3(_o.x), r3(_o.y), r3(_o.z), r3(_end.x), r3(_end.y), r3(_end.z)]);
      if (me.ls.length > 3) me.ls.shift();
      if (hitRec) {
        me.tags += 1;
        me.lh.push([++me.lhSeq, hitRec.peer]);
        if (me.lh.length > 6) me.lh.shift();
        sfx('zap', 1);
        spawnFloat('+1', _end.clone().setY(_end.y + 0.4), TEAM_HEX[me.team]);
        state.dirtyBoard = true;
      } else if (hitBot) {
        me.tags += 1;
        L.ltHitBot(hitBot, now);
        sfx('zap', 1);
        spawnFloat('+1', _end.clone().setY(_end.y + 0.4), TEAM_HEX[me.team]);
        state.dirtyBoard = true;
      } else if (hitDrone) {
        hitDrone.alive = false;
        hitDrone.respawn = now + 2500;
        me.practice += 1;
        sfx('poof', 0.8);
        spawnFloat('Nice', hitDrone.pos.clone(), '#ffd23f');
      }
      forcePresence();
    }
    // the aiming sight: where a shot would go right now (blocks, walls and the floor stop it; so do people and bots)
    const sightLine = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }));
    const sightDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
    sightLine.visible = sightDot.visible = false; sightDot.scale.set(0.12, 0.12, 1);
    G.add(sightLine, sightDot);
    function aimRay() {
      blasterPose();
      _d.set(0, 0, -1).applyQuaternion(blaster.quaternion);
      _o.copy(blaster.position).addScaledVector(_d, 0.24);
      if (state.mode === 'flat') {
        camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
        _end.set(0, 0, -40).applyQuaternion(_cq).add(_cp);
        _d.subVectors(_end, _o).normalize();
      }
      let maxT = 60;
      for (const b of L.boxes) maxT = Math.min(maxT, rayBox(_o, _d, b, maxT));
      for (const t of [(AR.minX - _o.x) / _d.x, (AR.maxX - _o.x) / _d.x, (AR.minZ - _o.z) / _d.z, (AR.maxZ - _o.z) / _d.z, -_o.y / _d.y]) if (t > 0 && t < maxT) maxT = t;
      return maxT;
    }
    const _so = new V3(), _sd = new V3(), _se2 = new V3();
    function updateSight() {
      const show = state.level === L.idx && state.mode !== 'menu' && blaster.visible && !me.tagged;
      sightLine.visible = sightDot.visible = show;
      if (!show) return;
      let t = aimRay();
      for (const rec of remotes.values()) {
        if (!inMyLevel(rec) || !rec.hasH) continue;
        const st = rec.lvState[L.id];
        if (!st || st.tagged) continue;
        const r = rayBody(_o, _d, rec.cur.h.pos, Math.max(0.2, rec.cur.h.pos.y - 1.15), t);
        if (r.dist < 0.3 && r.s < t) t = r.s;
      }
      let onEnemy = false;
      if (L.ltRayHitsBot) { const hb = L.ltRayHitsBot(_o, _d, t); if (hb) { t = hb.s; onEnemy = true; } }
      _so.copy(_o); _sd.copy(_d); _se2.copy(_so).addScaledVector(_sd, t);
      sightLine.position.copy(_so); sightLine.lookAt(_se2); sightLine.scale.set(0.6, 0.6, Math.max(0.01, t));
      sightLine.visible = state.mode === 'vr';            // in a browser the crosshair already shows the line; the dot shows where it lands
      sightDot.position.copy(_se2);
      const col = onEnemy ? 0xff3a3a : TEAM_COLORS[me.team] || 0xffffff;
      sightDot.material.color.setHex(col); sightLine.material.color.setHex(col);
      sightDot.scale.setScalar(0.16 + t * 0.012);
    }
    L.onVRTrigger = (h) => { me.hand = h.side; fire(performance.now()); };
    L.deskFire = (now) => fire(now);
    L.throwLabel = () => 'Fire';

    const _bq = new Q4();
    function blasterPose() {
      if (state.mode === 'vr') {
        const ray = myRays[me.hand], hand = myHands[me.hand];
        const src = ray.ok ? ray : hand;
        blaster.position.copy(src.pos);
        blaster.quaternion.copy(src.quat);
        blaster.visible = src.ok;
      } else if (state.mode === 'flat') {
        camera.getWorldQuaternion(_bq); camera.getWorldPosition(_cp);
        blaster.position.set(0.17, -0.2, -0.3).applyQuaternion(_bq).add(_cp);
        blaster.quaternion.copy(_bq);
        blaster.visible = true;
      } else blaster.visible = false;
    }

    // ---------------------------------------------------------------- network
    L.presence = () => ({ lq: [me.team, me.tags, me.tagged ? 1 : 0, me.round], ls: me.ls.slice(), lh: me.lh.slice() });
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    L.readPresence = (rec, pres, st) => {
      const a = Array.isArray(pres.lq) ? pres.lq : [];
      const team = int(a[0], 0, 1) ? a[0] : -1, tags = int(a[1], 0, 9999) ? a[1] : 0, tagged = a[2] === 1, round = int(a[3], 0, 1e6) ? a[3] : 0;
      if (team !== st.team || tags !== st.tags || tagged !== st.tagged || round !== st.round) state.dirtyBoard = true;
      Object.assign(st, { team, tags, tagged, round });
      if (Array.isArray(pres.ls)) {
        for (const s of pres.ls.slice(-3)) {
          if (!Array.isArray(s) || s.length !== 7 || !int(s[0], 0, 1e9) || !s.slice(1).every((x) => finite(x) && Math.abs(x) < 100)) continue;
          if (s[0] <= (st.lsSeq || 0)) continue;
          st.lsSeq = s[0];
          if (st.lsInit) {
            const from = new V3(s[1], s[2], s[3]);
            showBeam(from, new V3(s[4], s[5], s[6]), team);
            sfx('laser', 0.6 / (1 + from.distanceTo(myHead.pos) * 0.1));
          }
        }
        st.lsInit = true;
      }
      if (Array.isArray(pres.lh)) {
        for (const h of pres.lh.slice(-6)) {
          if (!Array.isArray(h) || h.length !== 2 || !int(h[0], 0, 1e9) || typeof h[1] !== 'string') continue;
          if (h[0] <= (st.lhSeq || 0)) continue;
          st.lhSeq = h[0];
          if (!st.lhInit || h[1] !== state.myPeer) continue;
          const now = performance.now();
          if (me.tagged || now < me.invUntil || team === me.team || state.mode === 'menu') continue;
          me.tagged = true;
          me.taggedUntil = now + 3000;
          sfx('tagged', 1);
          showToast(`Tagged by ${rec.name}`);
          if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.9, 200);
          state.dirtyBoard = true;
          forcePresence();
        }
        st.lhInit = true;
      }
    };

    // ---------------------------------------------------------------- rounds, scores, readouts
    function scores() {
      const s = L.ltBotTags ? L.ltBotTags() : [0, 0];
      if (me.team >= 0) s[me.team] += me.tags;
      for (const rec of remotes.values()) {
        if (rec.lv !== L.idx) continue;
        const st = rec.lvState[L.id];
        if (st && (st.team === 0 || st.team === 1) && st.round === me.round) s[st.team] += st.tags;
      }
      return s;
    }
    L.scores = scores;
    const wrist = makeWristPanel();
    const tagPlate = makePlate(camera, 'Tagged!', 0.24, 0.06, new V3(0, -0.04, -0.3), 0, { bg: '#2a0d22', fg: '#ffd0e0', size: 0.65 });
    tagPlate.material.depthTest = false;
    tagPlate.renderOrder = 1000;
    tagPlate.visible = false;
    let statusKey = '', tagLeft = -1;
    L.update = (dt, now) => {
      autoBalance(L, me, now, switchTeam);
      blasterPose();
      updateSight();
      const col = me.tagged ? 0x555566 : TEAM_COLORS[me.team] || 0xffffff;
      for (const m of blaster.userData.glow) m.color.setHex(col);
      if (me.tagged && now > me.taggedUntil) { me.tagged = false; me.invUntil = now + 1500; state.dirtyBoard = true; forcePresence(); }
      // adopt a newer round if someone is already on it
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        if (rec.lv === L.idx && st && st.round > me.round) { me.round = st.round; if (now - (L.enteredAt || 0) > 2000) beginRound(now); else { me.tags = 0; me.winT = 0; state.dirtyBoard = true; forcePresence(); } }
      }
      const s = scores();
      if (!me.winT && me.round > 0 && (s[0] >= WIN || s[1] >= WIN)) {
        me.winT = now;
        const w = s[0] >= WIN ? 0 : 1;
        sfx(w === me.team ? 'fanfare' : 'buzzer', 1);
        showToast(`${TEAM_NAMES[w]} team wins ${s[w]} to ${s[1 - w]}!`);
        spawnFloat(`${TEAM_NAMES[w]} wins!`, myHead.pos.clone().add(new V3(0, 0.6, 0).add(new V3(0, 0, -2).applyQuaternion(myHead.quat))), TEAM_HEX[w]);
      }
      if (me.winT && now - me.winT > 6000) { me.round += 1; beginRound(now); }
      // the countdown
      if (me.countUntil) {
        const n = Math.ceil((me.countUntil - now) / 1000);
        if (n !== me.countN) {
          me.countN = n; state.dirtyBoard = true;
          if (state.level === L.idx && state.mode !== 'menu') {
            const at = myHead.pos.clone().add(new V3(0, 0.25, -1.6).applyQuaternion(myHead.quat));
            if (n > 0) { sfx('beep', 1); spawnFloat(String(n), at, '#ffffff'); }
            else { sfx('whistle', 1); spawnFloat('Go!', at, TEAM_HEX[me.team] || '#ffffff'); }
          }
          if (n <= 0) me.countUntil = 0;
        }
      }
      // drones
      const practice = opponents() === 0 && !(L.ltEnemyBots && L.ltEnemyBots());
      drones.forEach((dr, i) => {
        if (!dr.alive && now > dr.respawn) dr.alive = true;
        const t = now * 0.00035 + dr.phase;
        dr.pos.set(Math.sin(t * (1 + i * 0.13)) * 13, 1.4 + Math.sin(t * 2.1 + i) * 0.5, Math.cos(t * 0.8 + i) * 10);
        dr.m.position.copy(dr.pos);
        dr.m.rotation.y += dt * 2;
        dr.m.visible = practice && dr.alive && state.level === L.idx;
      });
      // beams fade
      for (let i = beams.length - 1; i >= 0; i--) {
        const b = beams[i], k = (now - b.t0) / 520;
        if (k >= 1) { G.remove(b.m, b.glow, b.spark, b.flash); for (const x of [b.m, b.glow, b.spark, b.flash]) x.material.dispose(); beams.splice(i, 1); continue; }
        const f = 1 - k * k;            // stays bright, then fades fast
        b.m.material.opacity = f; b.glow.material.opacity = 0.55 * f;
        b.spark.material.opacity = f; b.spark.scale.setScalar(0.8 + k * 0.6);
        b.flash.material.opacity = Math.max(0, 1 - k * 3);
      }
      // other players carry blasters too
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        const show = inMyLevel(rec) && rec.hasH && st && st.team >= 0;
        if (!rec.blaster && show) { rec.blaster = makeBlaster(); L.overlay.add(rec.blaster); }
        if (!rec.blaster) continue;
        rec.blaster.visible = show;
        if (!show) continue;
        const p = rec.hasR ? rec.cur.r : rec.cur.h;
        rec.blaster.position.copy(p.pos);
        rec.blaster.quaternion.copy(p.quat);
        for (const m of rec.blaster.userData.glow) m.color.setHex(st.tagged ? 0x555566 : TEAM_COLORS[st.team]);
      }
      // readouts
      const left = Math.max(0, Math.ceil((me.taggedUntil - now) / 1000));
      tagPlate.visible = state.mode === 'vr' && me.tagged;
      if (tagPlate.visible && left !== tagLeft) { tagLeft = left; tagPlate.userData.draw(`Tagged! Back in ${left}`); }
      const scoreLine = `Red ${s[0]}, Blue ${s[1]}`;
      const cd = counting(now) ? Math.ceil((me.countUntil - now) / 1000) : 0;
      wrist.update(me.team >= 0 ? `${TEAM_NAMES[me.team]} team` : 'Laser tag', TEAM_HEX[me.team], cd ? `Starting in ${cd}` : me.tagged ? `Tagged! Back in ${left}` : scoreLine);
      if (ui.hurt && state.mode === 'flat') { ui.hurt.style.opacity = me.tagged ? '0.6' : '0'; ui.hurt.classList.toggle('down', false); }
      if (ui.status) {
        const show = state.mode === 'flat';
        ui.status.hidden = !show;
        const key = `${me.team}|${scoreLine}|${me.tagged ? left : ''}|${practice}|${cd}|${me.round > 0}`;
        if (show && key !== statusKey) {
          statusKey = key;
          const t = document.createElement('span'); t.textContent = `${TEAM_NAMES[me.team] || ''} team`; t.style.color = TEAM_HEX[me.team] || '';
          const sc = document.createElement('span'); sc.textContent = scoreLine;
          const o = document.createElement('span'); o.className = 'obj'; o.textContent = cd ? `Starting in ${cd}` : me.tagged ? `Tagged! Back in ${left}` : practice ? 'Practice: shoot the drones' : me.round > 0 ? `First to ${WIN}` : 'Warm-up: press Start game';
          ui.status.replaceChildren(t, sc, o);
        }
      }
    };
    L.onExit = () => {
      blaster.visible = false; sightLine.visible = sightDot.visible = false;
      wrist.show(false);
      tagPlate.visible = false;
      for (const dr of drones) dr.m.visible = false;
      for (const rec of remotes.values()) if (rec.blaster) rec.blaster.visible = false;
      if (ui.status) ui.status.hidden = true;
      if (ui.hurt) ui.hurt.style.opacity = '0';
      statusKey = '';
    };

    L.rowFor = (st, isMe) => {
      const team = isMe ? me.team : st.team, tags = isMe ? me.tags : (st.tags || 0);
      return { team, tags, text: `${tags} tags`, color: TEAM_HEX[team] || '#888' };
    };
    L.sortRows = (a, b) => (a.team - b.team) || (b.tags - a.tags);
    function boardStatus(now) {
      const s = scores();
      if (counting(now)) return [`Starting in ${Math.ceil((me.countUntil - now) / 1000)}`, '#ffffff'];
      if (me.winT) { const w = s[0] >= WIN ? 0 : 1; return [`${TEAM_NAMES[w]} wins! Next game soon`, TEAM_HEX[w]]; }
      if (me.round === 0) return ['Warm-up: press Start game', '#ffd23f'];
      return [`Game ${me.round}: first to ${WIN}`, '#c9c4e8'];
    }
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 1024, H = 512;
      const s = scores();
      g.fillStyle = '#0d0f24'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#b388ff'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
      g.fillStyle = 'rgba(255,77,106,0.16)'; g.fillRect(10, 10, W / 2 - 10, 230);
      g.fillStyle = 'rgba(79,140,255,0.16)'; g.fillRect(W / 2, 10, W / 2 - 10, 230);
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      g.font = `800 44px ${DISPLAY}`;
      g.fillStyle = TEAM_HEX[0]; g.fillText('RED', W / 4, 62);
      g.fillStyle = TEAM_HEX[1]; g.fillText('BLUE', W * 3 / 4, 62);
      g.font = `800 170px ${DISPLAY}`;
      g.fillStyle = TEAM_HEX[0]; g.fillText(String(s[0]), W / 4, 220);
      g.fillStyle = TEAM_HEX[1]; g.fillText(String(s[1]), W * 3 / 4, 220);
      const [st, sc] = boardStatus(performance.now());
      g.fillStyle = sc; g.font = `800 50px ${DISPLAY}`; g.fillText(st, W / 2, 300, W - 60);
      // who's on each team
      g.font = `400 30px ${BODY}`;
      for (const t of [0, 1]) {
        const x0 = t === 0 ? 40 : W / 2 + 20, list = rows.filter((r) => r.team === t).concat(lbots.filter((b) => b.active && b.team === t).map((b) => ({ name: b.name, tags: b.tags, team: t }))).slice(0, 5);
        list.forEach((r, i) => {
          const y = 350 + i * 34;
          g.textAlign = 'left'; g.fillStyle = r.me ? '#ffffff' : '#c9c4e8'; g.font = `${r.me ? 700 : 400} 28px ${BODY}`;
          g.fillText(r.me ? `${r.name} (you)` : r.name, x0, y, W / 2 - 160);
          g.textAlign = 'right'; g.fillStyle = TEAM_HEX[t]; g.font = `800 30px ${DISPLAY}`;
          g.fillText(String(r.tags), x0 + W / 2 - 70, y);
        });
      }
      L.board.tex.needsUpdate = true;
      board2.g.drawImage(g.canvas, 0, 0);
      board2.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => 'Start game', run: () => startGame() }, { label: () => 'Switch team', run: () => switchTeam() }];
    L.hints = [['Click', 'fire'], ['WASD', 'move'], ['Drag', 'aim']];
    L.clampPlayer = (p) => {
      const m = 0.3;
      let x = clamp(p.x, AR.minX + m, AR.maxX - m), z = clamp(p.z, AR.minZ + m, AR.maxZ - m);
      if (counting(performance.now()) && me.team >= 0) {
        // wait at your base until the countdown's done
        const bz = me.team === 0 ? BASE_Z : -BASE_Z, dx = x, dz = z - bz, d = Math.hypot(dx, dz);
        if (d > 2.2) { x = dx * 2.2 / d; z = bz + dz * 2.2 / d; }
      }
      for (const b of L.boxes) {
        if (x > b.min.x - m && x < b.max.x + m && z > b.min.z - m && z < b.max.z + m) {
          const dl = x - (b.min.x - m), dr = b.max.x + m - x, dn = z - (b.min.z - m), df = b.max.z + m - z;
          const k = Math.min(dl, dr, dn, df);
          if (k === dl) x = b.min.x - m; else if (k === dr) x = b.max.x + m; else if (k === dn) z = b.min.z - m; else z = b.max.z + m;
        }
      }
      return [x - p.x, z - p.z];
    };
    L.attract = (now) => {
      const a = reduceMotion ? 0.5 : 0.5 + now * 0.00005;
      camera.position.set(Math.sin(a) * 19, 8, Math.cos(a) * 15);
      camera.lookAt(0, 0.5, 0);
    };
    // ---------------------------------------------------------------- computer players
    // Bots make up each team to the picker's number. The lowest-named player's page runs them: it moves them between
    // cover, has them shoot (at people and at each other), and publishes where they are, their tags and their shots.
    // A person who tags a bot reports it (lbh) and the host knocks it out; a bot's shot at a person names them (lbs)
    // and that person's own page tags them, the same way people's shots work.
    makePlayerPicker(L, { min: 1, max: 5, def: 3, label: 'Per team' });
    const LB_NAMES = ['Zap Zara', 'Pew Pete', 'Glow Gil', 'Beam Bree', 'Flash Finn', 'Volt Vic', 'Neon Nell', 'Ray Rory', 'Blip Bea', 'Sparks Sol'];
    const lbots = LB_NAMES.map((name, k) => {
      const team = k < 5 ? 0 : 1;
      const g = buildAvatar(TEAM_HEX[team], (k * 3 + 2) % HATS.length, k % FACES.length, true, (k * 2 + 1) % SHIRTS.length, team ? 4 : 6);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = TEAM_HEX[team]; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.45; g.add(tag);
      const gun = makeBlaster(); gun.position.set(0.22, -0.32, -0.22); g.add(gun);
      for (const m of gun.userData.glow) m.color.setHex(TEAM_COLORS[team]);
      g.visible = false; G.add(g);
      return { id: `bot:${k}`, k, team, name, g, gun, active: false, x: 0, z: 0, rx: 0, rz: 0, yaw: 0, vx: 0, vz: 0, tagged: false, taggedUntil: 0, invUntil: 0, tags: 0, cool: 0, goal: null, goalT: 0, skill: 0.85 + rand() * 0.3 };
    });
    const ltHost = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort()[0] === state.myPeer; };
    const ltHumans = () => { const out = state.mode !== 'menu' ? [{ id: state.myPeer, team: me.team, head: myHead.pos, tagged: me.tagged }] : []; for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (inMyLevel(rec) && rec.hasH && st && (st.team === 0 || st.team === 1)) out.push({ id: rec.peer, team: st.team, head: rec.cur.h.pos, tagged: st.tagged }); } return out; };
    const LB = { seq: 0, shots: [], hitSeq: 0, hits: [], round: -1 };
    L.ltBots = lbots;
    function spawnBot(b) {
      const z = b.team === 0 ? BASE_Z - 0.5 : -BASE_Z + 0.5;
      b.x = b.rx = (rand() - 0.5) * 8; b.z = b.rz = z + (rand() - 0.5) * 1.5; b.vx = b.vz = 0; b.goal = null; b.yaw = b.team === 0 ? 0 : Math.PI;
    }
    function fillLtBots() {
      const nh = [0, 0];
      for (const h of ltHumans()) nh[h.team] += 1;
      for (const t of [0, 1]) {
        const want = Math.max(0, L.picker.n - nh[t]);
        lbots.filter((b) => b.team === t).forEach((b, i) => { const was = b.active; b.active = i < want; if (b.active && !was) { spawnBot(b); b.tags = 0; b.tagged = false; } });
      }
      forcePresence();
    }
    // a clear line between two points (cover blocks are taller than 1.2 m, or low walls you can shoot over)?
    const _lo = new V3(), _ld = new V3();
    function clearLine(a, b) {
      _ld.subVectors(b, a); const len = _ld.length(); if (len < 1e-3) return true; _ld.divideScalar(len);
      for (const bx of L.boxes) if (rayBox(a, _ld, bx, len) < len - 0.2) return false;
      return true;
    }
    function pushOutOfBoxes(b) {
      const m = 0.35;
      b.x = clamp(b.x, AR.minX + m, AR.maxX - m); b.z = clamp(b.z, AR.minZ + m, AR.maxZ - m);
      for (const bx of L.boxes) if (b.x > bx.min.x - m && b.x < bx.max.x + m && b.z > bx.min.z - m && b.z < bx.max.z + m) {
        const dl = b.x - (bx.min.x - m), dr = bx.max.x + m - b.x, dn = b.z - (bx.min.z - m), df = bx.max.z + m - b.z, k = Math.min(dl, dr, dn, df);
        if (k === dl) b.x = bx.min.x - m; else if (k === dr) b.x = bx.max.x + m; else if (k === dn) b.z = bx.min.z - m; else b.z = bx.max.z + m;
      }
    }
    // somewhere to head for: beside a block, on our half or the middle (or pushing up when we're ahead)
    function pickGoal(b) {
      const side = b.team === 0 ? 1 : -1;
      for (let i = 0; i < 12; i++) {
        const bx = L.boxes[Math.floor(rand() * L.boxes.length)], cx = (bx.min.x + bx.max.x) / 2, cz = (bx.min.z + bx.max.z) / 2;
        if (cz * side < -8.7 && rand() < 0.7) continue;          // mostly stay out of their back third
        const a = rand() * Math.PI * 2, r = Math.max(bx.max.x - bx.min.x, bx.max.z - bx.min.z) / 2 + 0.7;
        return new V3(clamp(cx + Math.cos(a) * r, AR.minX + 0.6, AR.maxX - 0.6), 0, clamp(cz + Math.sin(a) * r, AR.minZ + 0.6, AR.maxZ - 0.6));
      }
      return new V3((rand() - 0.5) * 28, 0, side * (3 + rand() * 9));
    }
    const _bh = new V3(), _th = new V3(), _se = new V3();
    function botHead(b, out) { return out.set(b.x, 1.5, b.z); }
    function tagBot(b, now) { if (b.tagged || now < b.invUntil) return false; b.tagged = true; b.taggedUntil = now + 3000; forcePresence(); return true; }
    function botFire(b, now, target) {
      botHead(b, _bh); _bh.y = 1.25;
      _th.copy(target.head); _th.y -= 0.35;
      const d = _bh.distanceTo(_th);
      const p = clamp((0.82 - d * 0.03) * b.skill, 0.2, 0.8);
      const hit = Math.random() < p;
      // a miss goes a little wide
      if (!hit) { _th.x += (Math.random() - 0.5) * 1.6; _th.y += (Math.random() - 0.3) * 0.8; _th.z += (Math.random() - 0.5) * 1.6; }
      _ld.subVectors(_th, _bh).normalize();
      let maxT = 60;
      for (const bx of L.boxes) maxT = Math.min(maxT, rayBox(_bh, _ld, bx, maxT));
      const end = _se.copy(_bh).addScaledVector(_ld, hit ? Math.min(maxT, d) : Math.min(maxT, d + 4));
      showBeam(_bh, end, b.team);
      sfx('laser', 0.5 / (1 + _bh.distanceTo(myHead.pos) * 0.1));
      let victim = '';
      if (hit) {
        victim = target.id;
        b.tags += 1;
        if (target.bot) tagBot(target.bot, now);
        else if (target.id === state.myPeer) getTagged(now, b.name);
      }
      LB.shots.push([++LB.seq, r3(_bh.x), r3(_bh.y), r3(_bh.z), r3(end.x), r3(end.y), r3(end.z), victim, b.k]);
      if (LB.shots.length > 6) LB.shots.shift();
      b.cool = now + 1100 + Math.random() * 800;
      state.dirtyBoard = true;
      forcePresence();
    }
    function getTagged(now, by) {
      if (me.tagged || now < me.invUntil || state.mode === 'menu') return;
      me.tagged = true; me.taggedUntil = now + 3000;
      sfx('tagged', 1); showToast(`Tagged by ${by}`);
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.9, 200);
      state.dirtyBoard = true; forcePresence();
    }
    function stepLtBots(dt, now) {
      if (counting(now)) { for (const b of lbots) b.vx = b.vz = 0; return; }      // everyone waits at base for the countdown
      const hs = ltHumans();
      for (const b of lbots) {
        if (!b.active) continue;
        if (b.tagged) { if (now > b.taggedUntil) { b.tagged = false; b.invUntil = now + 1500; forcePresence(); } else { b.vx = b.vz = 0; continue; } }
        // the nearest enemy it can see
        botHead(b, _bh);
        let tgt = null, td = 36;
        for (const h of hs) if (h.team !== b.team && !h.tagged) { const d = Math.hypot(h.head.x - b.x, h.head.z - b.z); if (d < td && clearLine(_bh, h.head)) { td = d; tgt = h; } }
        for (const o of lbots) if (o.active && o.team !== b.team && !o.tagged) { const oh = botHead(o, new V3()); const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < td && clearLine(_bh, oh)) { td = d; tgt = { id: o.id, head: oh, bot: o }; } }
        // move: to its goal, strafing a little when it has someone in its sights
        // a new place to go when it gets there, after a while, or when it's stopped getting closer (stuck on a block)
        const gd = b.goal ? Math.hypot(b.goal.x - b.x, b.goal.z - b.z) : 0;
        if (b.goal && gd < (b.bestGd || 1e9) - 0.3) { b.bestGd = gd; b.progT = now; }
        if (!b.goal || now > b.goalT || gd < 0.4 || (!tgt && now - (b.progT || now) > 1500)) { b.goal = pickGoal(b); b.goalT = now + 4000 + rand() * 4000; b.bestGd = 1e9; b.progT = now; }
        let mx = b.goal.x - b.x, mz = b.goal.z - b.z;
        const ml = Math.hypot(mx, mz) || 1;
        let sp = tgt ? 1.2 : 2.6;
        if (tgt) { const s = Math.sin(now * 0.002 + b.k) > 0 ? 1 : -1; const fx = (tgt.head.x - b.x) / td, fz = (tgt.head.z - b.z) / td; mx = mx / ml * 0.4 - fz * s; mz = mz / ml * 0.4 + fx * s; }
        else { mx /= ml; mz /= ml; }
        const l2 = Math.hypot(mx, mz) || 1;
        const k = 1 - Math.exp(-dt * 6);
        b.vx += (mx / l2 * sp * b.skill - b.vx) * k; b.vz += (mz / l2 * sp * b.skill - b.vz) * k;
        b.x += b.vx * dt; b.z += b.vz * dt;
        pushOutOfBoxes(b);
        b.yaw = tgt ? Math.atan2(-(tgt.head.x - b.x), -(tgt.head.z - b.z)) : Math.hypot(b.vx, b.vz) > 0.3 ? Math.atan2(-b.vx, -b.vz) : b.yaw;
        if (tgt && now > b.cool && !me.winT) botFire(b, now, tgt);
      }
    }
    // people's shots can hit bots: called from fire()
    function rayHitsBot(o, d, maxT) {
      let best = null, bt = maxT;
      for (const b of lbots) {
        if (!b.active || b.tagged || b.team === me.team) continue;
        const r = rayBody(o, d, botHead(b, _bh), 0.4, bt);
        if (r.dist < 0.32 && r.s < bt) { bt = r.s; best = b; }
      }
      return best ? { bot: best, s: bt } : null;
    }
    L.ltRayHitsBot = rayHitsBot;
    L.ltHitBot = (b, now) => {
      if (ltHost()) tagBot(b, now);
      else { LB.hits.push([++LB.hitSeq, b.k]); if (LB.hits.length > 6) LB.hits.shift(); b.tagged = true; b.taggedUntil = now + 3000; }
    };
    // a new game: the host puts its bots back at their bases with no tags
    L.ltResetBots = () => { if (!ltHost()) return; LB.round = me.round; for (const b of lbots) { b.tags = 0; b.tagged = false; b.invUntil = 0; if (b.active) spawnBot(b); } forcePresence(); };
    L.ltEnemyBots = () => lbots.some((b) => b.active && b.team !== me.team);
    L.ltBotTags = () => { const s = [0, 0]; for (const b of lbots) if (b.active) s[b.team] += b.tags; return s; };
    let fillT = 0;
    const baseUpdate = L.update;
    L.update = (dt, now) => {
      const here = state.mode !== 'menu' && state.level === L.idx;
      if (here && ltHost()) {
        if (LB.round !== me.round) { LB.round = me.round; for (const b of lbots) b.tags = 0; }
        if (now - fillT > 800) { fillT = now; fillLtBots(); }
        if (!L.paused) stepLtBots(Math.min(dt, 0.05), now);
        for (const b of lbots) { b.rx = b.x; b.rz = b.z; }
      } else for (const b of lbots) { const k = 1 - Math.exp(-dt * 10); b.rx += (b.x - b.rx) * k; b.rz += (b.z - b.rz) * k; if (b.tagged && now > b.taggedUntil + 400) b.tagged = false; }
      baseUpdate(dt, now);
      for (const b of lbots) {
        b.g.visible = here && b.active;
        if (!b.g.visible) continue;
        const run = Math.hypot(b.vx, b.vz);
        b.g.position.set(b.rx, (b.tagged ? 1.15 : 1.5) + (run > 0.5 && !b.tagged ? Math.abs(Math.sin(now * 0.012 + b.k)) * 0.05 : 0), b.rz);
        b.g.rotation.set(b.tagged ? 0.5 : 0, b.yaw, 0, 'YXZ');
        for (const m of b.gun.userData.glow) m.color.setHex(b.tagged ? 0x555566 : TEAM_COLORS[b.team]);
      }
    };
    {
      const baseP = L.presence, baseR = L.readPresence;
      const r1 = (x) => Math.round(x * 10);
      L.presence = () => {
        const p = baseP();
        if (ltHost()) { p.lbt = lbots.filter((b) => b.active).map((b) => [b.k, r1(b.x), r1(b.z), Math.round(b.yaw * 100), b.tagged ? 1 : 0, b.tags, r1(b.vx), r1(b.vz)]); p.lbs = LB.shots.slice(); }
        p.lbh = LB.hits.slice();     // always sent (even empty), so the host has seen it before our first hit
        return p;
      };
      L.readPresence = (rec, pres, st) => {
        baseR(rec, pres, st);
        const now = performance.now();
        // someone tagged one of our bots
        if (ltHost() && Array.isArray(pres.lbh)) {
          for (const h of pres.lbh.slice(-6)) {
            if (!Array.isArray(h) || h.length !== 2 || !Number.isInteger(h[0]) || !lbots[h[1]]) continue;
            if (h[0] <= (st.lbhSeq || 0)) continue;
            st.lbhSeq = h[0];
            if (st.lbhInit && lbots[h[1]].team !== st.team) tagBot(lbots[h[1]], now);
          }
          st.lbhInit = true;
        }
        const ids = [state.myPeer]; for (const r of remotes.values()) if (r.lv === L.idx && r.inGame) ids.push(r.peer);
        if (rec.peer !== ids.sort()[0]) return;
        if (Array.isArray(pres.lbt)) {
          const seen = new Set();
          for (const a of pres.lbt.slice(0, lbots.length)) {
            if (!Array.isArray(a) || a.length !== 8 || !a.every(Number.isFinite) || !lbots[a[0]]) continue;
            const b = lbots[a[0]]; seen.add(b.k);
            if (!b.active) { b.rx = a[1] / 10; b.rz = a[2] / 10; }
            const tagged = a[4] === 1;
            if (tagged && !b.tagged) b.taggedUntil = now + 3000;
            Object.assign(b, { active: true, x: clamp(a[1] / 10, AR.minX, AR.maxX), z: clamp(a[2] / 10, AR.minZ, AR.maxZ), yaw: a[3] / 100, tagged, tags: clamp(a[5] | 0, 0, 9999), vx: a[6] / 10, vz: a[7] / 10 });
          }
          for (const b of lbots) if (!seen.has(b.k)) b.active = false;
          state.dirtyBoard = true;
        }
        // the bots' shots: beams, and a tag if one names us
        if (Array.isArray(pres.lbs)) {
          for (const s of pres.lbs.slice(-6)) {
            if (!Array.isArray(s) || s.length !== 9 || !Number.isInteger(s[0]) || !s.slice(1, 7).every((x) => finite(x) && Math.abs(x) < 100) || typeof s[7] !== 'string') continue;
            if (s[0] <= (st.lbsSeq || 0)) continue;
            st.lbsSeq = s[0];
            if (!st.lbsInit) continue;
            const b = lbots[s[8]] || lbots[0];
            showBeam(new V3(s[1], s[2], s[3]), new V3(s[4], s[5], s[6]), b.team);
            sfx('laser', 0.5 / (1 + new V3(s[1], s[2], s[3]).distanceTo(myHead.pos) * 0.1));
            if (s[7] === state.myPeer && b.team !== me.team) getTagged(now, b.name);
          }
          st.lbsInit = true;
        }
      };
    }
    L.onExit = ((base) => () => { base(); for (const b of lbots) b.g.visible = false; })(L.onExit);
    L.ltInternals = { AR, BASE_Z, startGame, counting: (now) => counting(now), beams, lbots, fillLtBots, stepLtBots, rayHitsBot, botFire, ltHost, LB, me, scores, fire: (now) => fire(now), clearLine };
    return L;
  })();

