  // ================================================================ LEVEL: NEON LASER TAG
  const lasertag = (() => {
    const L = newLevel(4);
    const G = L.group;
    const rand = mulberry32(5150);
    L.teams = true;
    L.teamKey = 'lq';
    L.grabless = true;
    const AR = { minX: -14, maxX: 14, minZ: -11.5, maxZ: 11.5 };
    const WIN = 15;
    L.bounds = AR;
    L.env = {
      sky: skyTexture([[0, '#05040e'], [0.5, '#1a1240'], [1, '#05040e']]),
      bg: 0x090b1a, fog: [0x0b0b20, 22, 80], hemi: [0x6070c0, 0x10101a, 0.65],
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
    grid.tex.repeat.set(28 / 8, 23 / 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 23), new THREE.MeshBasicMaterial({ map: grid.tex }));
    floor.rotation.x = -Math.PI / 2;
    G.add(floor);
    const mid = new THREE.Mesh(new THREE.PlaneGeometry(28, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    mid.rotation.x = -Math.PI / 2; mid.position.y = 0.005;
    G.add(mid);
    // team bases
    for (const t of [0, 1]) {
      const z = t === 0 ? 10 : -10;
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
    addBox(G, 28.6, WALL_H, 0.3, wallMat, 0, WALL_H / 2, AR.maxZ + 0.15);
    addBox(G, 28.6, WALL_H, 0.3, wallMat, 0, WALL_H / 2, AR.minZ - 0.15);
    addBox(G, 0.3, WALL_H, 23.6, wallMat, AR.minX - 0.15, WALL_H / 2, 0);
    addBox(G, 0.3, WALL_H, 23.6, wallMat, AR.maxX + 0.15, WALL_H / 2, 0);
    addBox(G, 28.6, 0.06, 0.34, trimMats[0], 0, WALL_H, AR.maxZ + 0.15);
    addBox(G, 28.6, 0.06, 0.34, trimMats[1], 0, WALL_H, AR.minZ - 0.15);
    for (const x of [AR.minX - 0.15, AR.maxX + 0.15]) addBox(G, 0.34, 0.06, 23.6, trimMats[2], x, WALL_H, 0);
    // cover blocks: [x, z, w, d, h]
    const BLOCKS = [
      [0, 0, 4, 1, 1.3], [-6, 3.5, 1, 4, 2.2], [6, -3.5, 1, 4, 2.2], [-6, -5.5, 3, 1, 1.3], [6, 5.5, 3, 1, 1.3],
      [-11, 0, 1, 5, 2.2], [11, 0, 1, 5, 2.2], [0, 6.5, 3, 1, 2.2], [0, -6.5, 3, 1, 2.2], [-3, -2.5, 1.4, 1.4, 1.5],
      [3, 2.5, 1.4, 1.4, 1.5], [-10.5, 8, 2, 1.2, 1.4], [10.5, -8, 2, 1.2, 1.4], [-10.5, -8, 2, 1.2, 1.4], [10.5, 8, 2, 1.2, 1.4],
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
    for (const [x, z, c] of [[0, 8, TEAM_COLORS[0]], [0, -8, TEAM_COLORS[1]], [-8, 0, 0xb388ff], [8, 0, 0xb388ff]]) {
      const l = new THREE.PointLight(c, 0.9, 16, 1.5);
      l.position.set(x, 3.2, z);
      G.add(l);
    }

    // kiosk, team switch, boards
    L.board = makeBoard(G, 720, 460, 2.6, 1.66, AR.minX + 0.02, 1.75, 0, Math.PI / 2, false);
    const sign = makeBoard(G, 720, 500, 2.0, 1.39, AR.maxX - 0.02, 1.6, -3.8, -Math.PI / 2, false);
    function drawSign() {
      const g = sign.g;
      g.fillStyle = '#0d0f24'; g.fillRect(0, 0, 720, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#b388ff'; g.font = `800 58px ${DISPLAY}`;
      g.fillText('How to play', 36, 78);
      const sections = [
        ['In VR', 'Pull either trigger to fire from that hand. Aim with the laser. Move with the left stick and duck behind cover.'],
        ['In a browser', 'Click or press Space to fire at the crosshair.'],
        ['Rules', `A tag knocks someone out for 3 seconds. First team to ${WIN} tags wins the round. You can\u2019t tag your own team.`],
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

    // ---------------------------------------------------------------- me
    L.me = { team: -1, tags: 0, round: 0, tagged: false, taggedUntil: 0, invUntil: 0, cool: 0, hand: 'right', lsSeq: 0, ls: [], lhSeq: 0, lh: [], practice: 0, winT: 0 };
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
      const z = me.team === 0 ? 9.6 : -9.6;
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
    scene.add(blaster);

    // beams (mine and everyone else's)
    const beams = [];
    const beamGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, -0.5);
    function showBeam(from, to, team) {
      const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: TEAM_COLORS[team] || 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
      m.position.copy(from);
      m.lookAt(to);
      m.scale.z = Math.max(0.01, from.distanceTo(to));
      const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: TEAM_COLORS[team] || 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      spark.position.copy(to);
      spark.scale.set(0.4, 0.4, 1);
      G.add(m, spark);
      beams.push({ m, spark, t0: performance.now() });
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
      if (me.tagged || now < me.cool || state.mode === 'menu') return;
      me.cool = now + 260;
      blasterPose();
      _d.set(0, 0, -1).applyQuaternion(blaster.quaternion);
      _o.copy(blaster.position).addScaledVector(_d, 0.24);
      if (state.mode === 'flat') {
        camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
        _end.set(0, 0, -40).applyQuaternion(_cq).add(_cp);
        _d.subVectors(_end, _o).normalize();
      }
      let maxT = 45;
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
      let hitDrone = null;
      if (!hitRec) {
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
      } else if (hitDrone) {
        hitDrone.alive = false;
        hitDrone.respawn = now + 2500;
        me.practice += 1;
        sfx('poof', 0.8);
        spawnFloat('Nice', hitDrone.pos.clone(), '#ffd23f');
      }
      forcePresence();
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
      const s = [0, 0];
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
      const col = me.tagged ? 0x555566 : TEAM_COLORS[me.team] || 0xffffff;
      for (const m of blaster.userData.glow) m.color.setHex(col);
      if (me.tagged && now > me.taggedUntil) { me.tagged = false; me.invUntil = now + 1500; state.dirtyBoard = true; forcePresence(); }
      // adopt a newer round if someone is already on it
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        if (rec.lv === L.idx && st && st.round > me.round) { me.round = st.round; me.tags = 0; me.winT = 0; state.dirtyBoard = true; forcePresence(); }
      }
      const s = scores();
      if (!me.winT && (s[0] >= WIN || s[1] >= WIN)) {
        me.winT = now;
        const w = s[0] >= WIN ? 0 : 1;
        sfx(w === me.team ? 'fanfare' : 'buzzer', 1);
        showToast(`${TEAM_NAMES[w]} team wins ${s[w]} to ${s[1 - w]}!`);
        spawnFloat(`${TEAM_NAMES[w]} wins!`, myHead.pos.clone().add(new V3(0, 0.6, 0).add(new V3(0, 0, -2).applyQuaternion(myHead.quat))), TEAM_HEX[w]);
      }
      if (me.winT && now - me.winT > 6000) { me.round += 1; me.tags = 0; me.winT = 0; state.dirtyBoard = true; forcePresence(); }
      // drones
      const practice = opponents() === 0;
      drones.forEach((dr, i) => {
        if (!dr.alive && now > dr.respawn) dr.alive = true;
        const t = now * 0.00035 + dr.phase;
        dr.pos.set(Math.sin(t * (1 + i * 0.13)) * 9, 1.4 + Math.sin(t * 2.1 + i) * 0.5, Math.cos(t * 0.8 + i) * 7);
        dr.m.position.copy(dr.pos);
        dr.m.rotation.y += dt * 2;
        dr.m.visible = practice && dr.alive && state.level === L.idx;
      });
      // beams fade
      for (let i = beams.length - 1; i >= 0; i--) {
        const b = beams[i], k = (now - b.t0) / 160;
        if (k >= 1) { G.remove(b.m, b.spark); b.m.material.dispose(); b.spark.material.dispose(); beams.splice(i, 1); continue; }
        b.m.material.opacity = 0.9 * (1 - k);
        b.spark.material.opacity = 1 - k;
      }
      // other players carry blasters too
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        const show = inMyLevel(rec) && rec.hasH && st && st.team >= 0;
        if (!rec.blaster && show) { rec.blaster = makeBlaster(); scene.add(rec.blaster); }
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
      wrist.update(me.team >= 0 ? `${TEAM_NAMES[me.team]} team` : 'Laser tag', TEAM_HEX[me.team], me.tagged ? `Tagged! Back in ${left}` : scoreLine);
      if (ui.hurt && state.mode === 'flat') { ui.hurt.style.opacity = me.tagged ? '0.6' : '0'; ui.hurt.classList.toggle('down', false); }
      if (ui.status) {
        const show = state.mode === 'flat';
        ui.status.hidden = !show;
        const key = `${me.team}|${scoreLine}|${me.tagged ? left : ''}|${practice}`;
        if (show && key !== statusKey) {
          statusKey = key;
          const t = document.createElement('span'); t.textContent = `${TEAM_NAMES[me.team] || ''} team`; t.style.color = TEAM_HEX[me.team] || '';
          const sc = document.createElement('span'); sc.textContent = scoreLine;
          const o = document.createElement('span'); o.className = 'obj'; o.textContent = me.tagged ? `Tagged! Back in ${left}` : practice ? 'Practice: shoot the drones' : `First to ${WIN}`;
          ui.status.replaceChildren(t, sc, o);
        }
      }
    };
    L.onExit = () => {
      blaster.visible = false;
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
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      const s = scores();
      g.fillStyle = '#0d0f24'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#b388ff'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left'; g.fillStyle = TEAM_HEX[0]; g.font = `800 72px ${DISPLAY}`; g.fillText(`Red ${s[0]}`, 36, 88);
      g.textAlign = 'right'; g.fillStyle = TEAM_HEX[1]; g.fillText(`${s[1]} Blue`, W - 36, 88);
      g.textAlign = 'center'; g.fillStyle = '#c9c4e8'; g.font = `400 24px ${BODY}`; g.fillText(`Neon laser tag, first to ${WIN}`, W / 2, 124);
      drawRows(g, rows.map((r) => Object.assign({}, r, { color: r.color })), 180, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => 'Switch team', run: () => switchTeam() }];
    L.hints = [['Click', 'fire'], ['WASD', 'move'], ['Drag', 'aim']];
    L.clampPlayer = (p) => {
      const m = 0.3;
      let x = clamp(p.x, AR.minX + m, AR.maxX - m), z = clamp(p.z, AR.minZ + m, AR.maxZ - m);
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
      camera.position.set(Math.sin(a) * 13, 6, Math.cos(a) * 10);
      camera.lookAt(0, 0.5, 0);
    };
    return L;
  })();

