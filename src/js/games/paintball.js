  // ================================================================ LEVEL: PAINTBALL PARK
  const paintball = (() => {
    const L = newLevel(14);
    const G = L.group;
    const rand = mulberry32(4242);
    const F = { minX: -14, maxX: 14, minZ: -20, maxZ: 20 };
    L.bounds = { minX: F.minX - 4, maxX: F.maxX + 4, minZ: F.minZ - 1.5, maxZ: F.maxZ + 1.5 };
    L.env = {
      sky: skyTexture([[0, '#5aa8f0'], [0.55, '#a8d8f8'], [1, '#e8f4fc']]),
      bg: 0xa8d8f8, fog: [0xa8d8f8, 60, 160], hemi: [0xffffff, 0x5a7a3a, 0.75],
      sun: [0xfff4e0, 1.0], sunDir: new V3(0.4, 1, 0.3), ambient: [0x8a9aaa, 0.35], sprite: null,
    };
    const TEAM_HEX = ['#ff4d6a', '#3d8bff'], TEAM_NAME = ['Red', 'Blue'];
    L.TEAM_HEX = TEAM_HEX; L.TEAM_NAME = TEAM_NAME;
    // ---------------------------------------------------------------- ground and netting
    const grass = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#5f9a3a'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { g.fillStyle = rand() < 0.5 ? '#6aa844' : '#548a32'; g.fillRect(rand() * 256, rand() * 256, 2, 3); }
    }).tex;
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(10, 14);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 70), new THREE.MeshLambertMaterial({ map: grass }));
    ground.rotation.x = -Math.PI / 2; G.add(ground);
    // a chalk line around the field and across the middle
    const chalk = new THREE.MeshBasicMaterial({ color: 0xf4f2ec });
    for (const [x, z, w, d] of [[0, F.minZ, 28, 0.08], [0, F.maxZ, 28, 0.08], [F.minX, 0, 0.08, 40], [F.maxX, 0, 0.08, 40], [0, 0, 28, 0.06]]) addBox(G, w, 0.01, d, chalk, x, 0.006, z);
    const netMat = new THREE.MeshBasicMaterial({ color: 0x1b1932, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    for (const [x, z, w, rot] of [[0, F.minZ - 1, 36, 0], [0, F.maxZ + 1, 36, 0], [F.minX - 3.5, 0, 42, Math.PI / 2], [F.maxX + 3.5, 0, 42, Math.PI / 2]]) {
      const n = new THREE.Mesh(new THREE.PlaneGeometry(w, 5), netMat); n.position.set(x, 2.5, z); n.rotation.y = rot; G.add(n);
    }
    for (let k = -3; k <= 3; k++) for (const sx of [-1, 1]) addCyl(G, 0.06, 0.06, 5, 6, lam(0x3a3a4a), sx * (F.maxX + 3.5), 2.5, k * 6.5);
    // ---------------------------------------------------------------- bunkers: inflatables, the same on both halves
    // can: [x, z, r, h]; cone: [x, z, r, h]; wall: [x, z, half w, half d, h, rot]
    const HALF = {
      can: [[-5, 12.5, 0.6, 1.4], [5, 12.5, 0.6, 1.4], [0, 8.5, 0.7, 1.5]],
      cone: [[-3, 4.5, 1.1, 1.8], [4, 3.5, 1.1, 1.8]],
      wall: [[-9, 7.5, 1.5, 0.35, 1.4, 0.3], [9, 7.5, 1.5, 0.35, 1.4, -0.3], [-11, 1.8, 0.45, 2.8, 0.9, 0]],
    };
    const CANS = [], CONES = [], WALLS = [];
    for (const m of [1, -1]) {
      for (const [x, z, r, h] of HALF.can) CANS.push({ x: x * m, z: z * m, r, h });
      for (const [x, z, r, h] of HALF.cone) CONES.push({ x: x * m, z: z * m, r, h });
      for (const [x, z, hw, hd, h, rot] of HALF.wall) WALLS.push({ x: x * m, z: z * m, hw, hd, h, rot });
    }
    WALLS.push({ x: 0, z: 0, hw: 2.0, hd: 0.4, h: 1.6, rot: 0 });   // the big one in the middle
    L.bunkers = { CANS, CONES, WALLS };
    const inflate = (a, b) => canvasTexture(128, 128, (g) => { g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b; for (let i = 0; i < 4; i++) g.fillRect(0, i * 32 + 12, 128, 8); }).tex;
    const matA = new THREE.MeshLambertMaterial({ map: inflate('#3fb8e8', '#ffffff') }), matB = new THREE.MeshLambertMaterial({ map: inflate('#ffd23f', '#ff8a3a') });
    for (const c of CANS) { const m = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r, c.h, 18), matA); m.position.set(c.x, c.h / 2, c.z); G.add(m); const top = new THREE.Mesh(new THREE.SphereGeometry(c.r, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), matA); top.scale.y = 0.35; top.position.set(c.x, c.h, c.z); G.add(top); }
    for (const c of CONES) { const m = new THREE.Mesh(new THREE.ConeGeometry(c.r, c.h, 18), matB); m.position.set(c.x, c.h / 2, c.z); G.add(m); }
    for (const w of WALLS) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.hw * 2, w.h, w.hd * 2), w.hw > 1.9 ? matB : matA);
      m.position.set(w.x, w.h / 2, w.z); m.rotation.y = w.rot; G.add(m);
      for (const e of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(w.hd, w.hd, w.h - 0.01, 12), m.material); const ex = w.hw * Math.cos(w.rot), ez = -w.hw * Math.sin(w.rot); cap.position.set(w.x + e * ex, (w.h - 0.01) / 2, w.z + e * ez); G.add(cap); }
    }
    // is a point inside a bunker? (and which way is out: the surface normal)
    const _n = new V3();
    function bunkerHit(p, pad) {
      if (p.y < 0) { _n.set(0, 1, 0); return _n; }
      for (const c of CANS) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d < c.r + pad && p.y < c.h + c.r * 0.35 + pad) { if (p.y > c.h) _n.set(dx, (p.y - c.h) * 3, dz).normalize(); else _n.set(dx / (d || 1), 0, dz / (d || 1)); return _n; } }
      for (const c of CONES) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), rr2 = c.r * (1 - p.y / c.h); if (p.y < c.h && d < rr2 + pad) { _n.set(dx / (d || 1), c.r / c.h, dz / (d || 1)).normalize(); return _n; } }
      for (const w of WALLS) {
        if (p.y > w.h + pad) continue;
        const cs = Math.cos(w.rot), sn = Math.sin(w.rot), dx = p.x - w.x, dz = p.z - w.z;
        const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
        const ex = Math.max(0, Math.abs(lx) - w.hw);
        if (ex * ex + lz * lz < (w.hd + pad) * (w.hd + pad)) {
          // out the long face, or round the rounded end
          let nx = ex > 0 ? Math.sign(lx) * ex : 0, nz = lz;
          const len = Math.hypot(nx, nz) || 1; nx /= len; nz /= len;
          _n.set(nx * cs + nz * sn, 0, -nx * sn + nz * cs);
          return _n;
        }
      }
      return null;
    }
    L.bunkerHit = bunkerHit;
    // a clear line between two points? (used by the bots)
    const _s = new V3();
    L.clearLine = (a, b) => { const d = a.distanceTo(b), n = Math.ceil(d / 0.4); for (let i = 1; i < n; i++) { _s.lerpVectors(a, b, i / n); if (bunkerHit(_s, 0)) return false; } return true; };

    // ---------------------------------------------------------------- bases, racks, the out bench, boards
    const BASE_Z = [F.maxZ - 1.5, F.minZ + 1.5];   // red at the south end, blue at the north
    L.BASE_Z = BASE_Z;
    for (const t of [0, 1]) {
      const z = BASE_Z[t], col = new THREE.Color(TEAM_HEX[t]);
      addBox(G, 6, 0.02, 2.4, new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.35 }), 0, 0.012, z);
      const pole = addCyl(G, 0.04, 0.04, 3.2, 6, lam(0xd8dce8), 3.6, 1.6, z);
      void pole;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
      flag.position.set(4.05, 2.9, z); G.add(flag);
      addBox(G, 2.6, 0.9, 0.3, lam(0x5a3a28), -2.6, 0.45, z + (t === 0 ? 0.9 : -0.9));
    }
    // the bench for players who are out, beside the field
    const OUT = new V3(F.maxX + 2.2, 0, 0);
    L.OUT = OUT;
    addBox(G, 0.6, 0.45, 8, lam(0x8a6a4a), OUT.x + 0.5, 0.225, 0);
    makePlate(G, 'Out? Wait here for the next round', 3.2, 0.3, new V3(OUT.x + 0.85, 1.6, 0), -Math.PI / 2, { bg: '#2b2d42', fg: '#ffd23f', size: 0.5 });
    L.board = makeBoard(G, 720, 460, 3.6, 2.3, F.minX - 2.0, 2.4, 0, Math.PI / 2);
    const sign = makeBoard(G, 720, 500, 2.4, 1.67, F.minX - 2.0, 2.2, 5.5, Math.PI / 2);
    function drawSign() {
      const g = sign.g, W = 720;
      g.fillStyle = '#1b2a3a'; g.fillRect(0, 0, W, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Paintball', 36, 76);
      let y = 120;
      for (const [label, body] of [
        ['The game', 'Red against blue. One hit and you\u2019re out until the next round. The last team with anyone left wins it.'],
        ['Markers', 'Pump: slow and accurate. Auto: fast. Scatter: a burst up close. Sniper: hold to steady, let go to fire. Lobber: arcs a paint grenade over cover.'],
        ['Controls', 'VR: grab a marker from your rack, pull the trigger. Browser: E takes a marker, Space fires (hold for Auto and Sniper).'],
      ]) {
        g.fillStyle = '#ff9ad0'; g.font = `700 24px ${BODY}`; g.fillText(label, 36, y); y += 31;
        g.fillStyle = '#eef4fa'; g.font = `400 23px ${BODY}`; y = wrapText(g, body, 36, y, 648, 29) + 10;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);
    makeKiosk(L, F.minX - 2.2, -6, Math.PI / 2);
    // walking: the field's edges, and around the bunkers
    L.clampPlayer = (p) => {
      let x = clamp(p.x, L.bounds.minX + 0.3, L.bounds.maxX - 0.3), z = clamp(p.z, L.bounds.minZ + 0.3, L.bounds.maxZ - 0.3);
      for (let k = 0; k < 2; k++) {
        const q = new V3(x, 1.0, z), n = bunkerHit(q, 0.32);
        if (n && Math.abs(n.y) < 0.9) { x += n.x * 0.06; z += n.z * 0.06; }
      }
      return [x - p.x, z - p.z];
    };

    // ================================================================ MARKERS: five paintball guns
    // speed m/s, gravity scale, spread (deg), cooldown ms, pellets, hold to fire (auto), charge (sniper), grenade
    const GUNS = {
      pb_pump:    { name: 'Pump', color: 0xff9a3c, len: 0.52, bulk: 1.0, speed: 38, grav: 0.7, spread: 0.6, cool: 650, pellets: 1 },
      pb_auto:    { name: 'Auto', color: 0x4fc3f7, len: 0.46, bulk: 1.15, speed: 34, grav: 0.75, spread: 2.4, cool: 120, pellets: 1, auto: true },
      pb_scatter: { name: 'Scatter', color: 0xffd23f, len: 0.4, bulk: 1.45, speed: 28, grav: 0.8, spread: 6.5, cool: 1100, pellets: 6 },
      pb_sniper:  { name: 'Sniper', color: 0xb388ff, len: 0.78, bulk: 0.9, speed: 58, grav: 0.35, spread: 2.5, cool: 1200, pellets: 1, charge: 700 },
      pb_lobber:  { name: 'Lobber', color: 0x8bd450, len: 0.42, bulk: 1.7, speed: 13, grav: 1.0, spread: 0.8, cool: 1500, pellets: 1, grenade: true, loft: 0.42 },
    };
    const KINDS = Object.keys(GUNS), KIND_I = Object.fromEntries(KINDS.map((k, i) => [k, i]));
    for (const k of KINDS) { TOOL_MESH[k] = () => makeGunMesh(GUNS[k].color, GUNS[k].len, GUNS[k].bulk); RAY_AIM.add(k); }
    // a rack of all five at each base
    const racks = [[], []];
    for (const t of [0, 1]) KINDS.forEach((k, i) => {
      const z = L.BASE_Z[t] + (t === 0 ? 0.9 : -0.9);
      const q = new Q4().setFromAxisAngle(new V3(0, 1, 0), t === 0 ? 0 : Math.PI);
      racks[t].push(makeTool(L, new V3(-3.6 + i * 0.5, 1.02, z), q, k));
    });
    L.racks = racks;

    // ---------------------------------------------------------------- state
    const PB = { ph: 0, endAt: 0, round: 0, wins: [0, 0], winner: -1, gid: 0, ev: [0, 0, '', ''] };   // 0 waiting, 1 countdown, 2 play, 3 round over
    L.pb = PB;
    const me = { team: -1, out: false, outBy: '', roundSeen: -1, shots: [], shotSeq: 0, hits: [], hitSeq: 0, coolOf: {}, holding: false, chargeT: 0, req: null, reqSeq: 0 };
    L.me = me;
    L.teams = true; L.teamKey = 'pbt';
    const herePeersPB = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const pbHost = () => herePeersPB()[0] === state.myPeer;
    const nameOfPB = (id) => (typeof id === 'string' && id.startsWith('bot:') ? (bots[Number(id.slice(4))] || {}).name || 'A bot' : id === state.myPeer ? 'You' : (remotes.get(id) || {}).name || 'Someone');
    function teamOf(id) {
      if (id === state.myPeer) return me.team;
      if (typeof id === 'string' && id.startsWith('bot:')) { const b = bots[Number(id.slice(4))]; return b && b.active ? b.team : -1; }
      const rec = remotes.get(id); const st = rec && rec.lvState[L.id]; return st && st.pbTeam !== undefined ? st.pbTeam : -1;
    }

    // ---------------------------------------------------------------- paint: balls in flight, and splats
    const ballGeo = new THREE.SphereGeometry(0.034, 8, 6);
    const ballMats = [new THREE.MeshBasicMaterial({ color: 0xff4d6a }), new THREE.MeshBasicMaterial({ color: 0x3d8bff })];
    const splatMats = [new THREE.MeshBasicMaterial({ color: 0xff4d6a, transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), new THREE.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })];
    const splatGeo = new THREE.CircleGeometry(1, 14);
    const balls = [], splats = [];
    const _up = new V3(0, 0, 1), _q = new Q4();
    function splat(p, n, team, size) {
      const m = new THREE.Mesh(splatGeo, splatMats[team] || splatMats[0]);
      const s = size * (0.8 + Math.random() * 0.5);
      m.scale.set(s, s * (0.75 + Math.random() * 0.5), 1);
      m.position.copy(p).addScaledVector(n, 0.012);
      m.quaternion.copy(_q.setFromUnitVectors(_up, n)).multiply(new Q4().setFromAxisAngle(_up, Math.random() * 6.28));
      G.add(m); splats.push(m);
      if (splats.length > 600) G.remove(splats.shift());
    }
    // a person's body: the head, and a column below it
    function bodyHit(p, head) { const dy = p.y - head.y; if (Math.hypot(p.x - head.x, p.z - head.z) < (dy > -0.12 ? 0.18 : 0.26) && dy < 0.2 && dy > -1.25) return true; return false; }
    function targets() {
      const out = [];
      if (me.team >= 0 && !me.out && state.level === L.idx) out.push({ id: state.myPeer, team: me.team, head: myHead.pos });
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && rec.hasH && st && st.pbTeam >= 0 && !st.pbOut) out.push({ id: rec.peer, team: st.pbTeam, head: rec.cur.h.pos }); }
      for (const b of bots) if (b.active && !b.out) out.push({ id: b.id, team: b.team, head: b.head });
      return out;
    }
    // shooter: me or a bot (only the shooter's page decides hits); everyone else just draws it
    function addBall(pos, vel, team, kind, shooter, judge) {
      const m = new THREE.Mesh(ballGeo, ballMats[team] || ballMats[0]);
      m.position.copy(pos); G.add(m);
      balls.push({ m, pos: pos.clone(), vel: vel.clone(), team, kind, shooter, judge, t: 0, grav: GUNS[kind].grav, grenade: !!GUNS[kind].grenade });
    }
    const _np = new V3();
    function stepBalls(dt) {
      const steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        let done = false;
        for (let k = 0; k < steps && !done; k++) {
          b.vel.y -= 9.8 * b.grav * h;
          _np.copy(b.pos).addScaledVector(b.vel, h);
          b.t += h;
          // a person?
          if (b.judge && PB.ph === 2 && !b.grenade) for (const tg of targets()) {
            if (tg.team === b.team || tg.id === b.shooter) continue;
            if (bodyHit(_np, tg.head)) { splat(_np, b.vel.clone().normalize().negate(), b.team, 0.09); judgeHit(tg.id, b.shooter); done = true; break; }
          }
          if (done) break;
          // the netting round the field catches anything that clears it
          const NX = F.maxX + 3.5, NZ = F.maxZ + 1;
          if ((Math.abs(_np.x) > NX || Math.abs(_np.z) > NZ) && _np.y < 5) {
            const nn = Math.abs(_np.x) > NX ? new V3(-Math.sign(_np.x), 0, 0) : new V3(0, 0, -Math.sign(_np.z));
            _np.x = clamp(_np.x, -NX, NX); _np.z = clamp(_np.z, -NZ, NZ);
            if (b.grenade) burst(_np, b.team, b.shooter, b.judge); else splat(_np, nn, b.team, 0.1);
            done = true; break;
          }
          const n = bunkerHit(_np, 0.02);
          if (n || _np.y < 0.02) {
            const nn = n ? n.clone() : new V3(0, 1, 0);
            if (_np.y < 0.02) _np.y = 0.02;
            if (b.grenade) burst(_np, b.team, b.shooter, b.judge);
            else splat(_np, nn, b.team, 0.1);
            tone(220 + Math.random() * 80, 120, 0.04, 'triangle', 0.18 / (1 + _np.distanceTo(myHead.pos) * 0.15));
            done = true; break;
          }
          b.pos.copy(_np);
          if (b.t > 4) { done = true; break; }
        }
        if (done) { G.remove(b.m); balls.splice(i, 1); } else b.m.position.copy(b.pos);
      }
    }
    function burst(p, team, shooter, judge) {
      for (let k = 0; k < 10; k++) { const a = Math.random() * 6.28, r = Math.random() * 1.4; splat(new V3(p.x + Math.cos(a) * r, 0.01, p.z + Math.sin(a) * r), new V3(0, 1, 0), team, 0.16); }
      tone(160, 60, 0.18, 'sawtooth', 0.25 / (1 + p.distanceTo(myHead.pos) * 0.1));
      if (!judge || PB.ph !== 2) return;
      for (const tg of targets()) {
        if (tg.team === team || tg.id === shooter) continue;
        const feet = new V3(tg.head.x, Math.min(p.y + 0.5, tg.head.y - 0.6), tg.head.z);
        if (Math.hypot(tg.head.x - p.x, tg.head.z - p.z) < 1.6 && L.clearLine(new V3(p.x, p.y + 0.3, p.z), feet)) judgeHit(tg.id, shooter);
      }
    }
    // the shooter's page found a hit: tell everyone
    function judgeHit(target, shooter) {
      me.hits.push([++me.hitSeq, target, shooter]);
      if (me.hits.length > 8) me.hits.shift();
      applyHit(target, shooter);
      forcePresence();
    }
    function applyHit(target, shooter) {
      if (target === state.myPeer) {
        if (me.out || PB.ph !== 2) return;
        me.out = true; me.outBy = shooter;
        showToast(`Splat! ${nameOfPB(shooter) === 'You' ? 'You got yourself' : nameOfPB(shooter) + ' got you'}. Wait on the bench for the next round`);
        sfx('buzzer', 0.6);
        if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.8, 200);
        sendToBench();
        forcePresence();
      } else if (target.startsWith('bot:')) {
        const b = bots[Number(target.slice(4))];
        if (b && !b.out) { b.out = true; b.ph = 'out'; if (shooter === state.myPeer) showToast(`You got ${b.name}!`); }
      } else if (shooter === state.myPeer) showToast(`You got ${nameOfPB(target)}!`);
    }

    // ---------------------------------------------------------------- firing your marker
    const myGun = () => L.tools.find((t) => t.held && t.held.peer === state.myPeer && GUNS[t.kind]);
    const _md = new V3(), _mp = new V3();
    function fire(t, now, steady) {
      const gun = GUNS[t.kind];
      // each marker has its own cooldown, so swapping guns never leaves you stuck
      if (now < (me.coolOf[t.kind] || 0) || me.team < 0) return;
      if (me.out) { showToast('You\u2019re out until the next round'); return; }
      if (PB.ph === 1) { showToast('Wait for the countdown'); return; }
      me.coolOf[t.kind] = now + gun.cool;
      _md.set(0, 0, -1).applyQuaternion(t.quat);
      _mp.copy(t.pos).addScaledVector(_md, gun.len);
      const spread = gun.charge ? gun.spread * (1 - steady) : gun.spread;
      for (let k = 0; k < gun.pellets; k++) {
        const d = _md.clone();
        if (gun.loft) d.y += gun.loft;
        d.normalize();
        const a = (Math.random() - 0.5) * 2 * spread * Math.PI / 180, e = (Math.random() - 0.5) * 2 * spread * Math.PI / 180;
        d.applyAxisAngle(new V3(0, 1, 0), a);
        d.applyAxisAngle(new V3(-d.z, 0, d.x).normalize(), e);
        const vel = d.multiplyScalar(gun.speed);
        addBall(_mp, vel, me.team, t.kind, state.myPeer, true);
        me.shots.push([++me.shotSeq, KIND_I[t.kind], r2(_mp.x), r2(_mp.y), r2(_mp.z), r2(vel.x), r2(vel.y), r2(vel.z), me.team, -1]);
      }
      if (me.shots.length > 14) me.shots.splice(0, me.shots.length - 14);
      tone(gun.grenade ? 180 : 420, gun.grenade ? 90 : 160, 0.05, 'square', 0.22);
      if (state.mode === 'vr') haptic(vrHands[t.held.side], 0.35, 25);
      forcePresence();
    }
    const r2 = (x) => Math.round(x * 100) / 100;
    L.onTrigger = (t) => { if (!GUNS[t.kind]) return; me.holding = true; me.chargeT = performance.now(); if (!GUNS[t.kind].charge) fire(t, performance.now(), 0); };
    L.onTriggerEnd = (t) => { if (!GUNS[t.kind]) return; me.holding = false; if (GUNS[t.kind].charge) fire(t, performance.now(), Math.min(1, (performance.now() - me.chargeT) / GUNS[t.kind].charge)); };
    L.deskSwing = () => { const t = myGun(); if (t) L.onTrigger(t); };
    L.deskRelease = () => { const t = myGun(); if (t) L.onTriggerEnd(t); };
    const _cq = new Q4(), _cp = new V3(), _aim = new V3();
    L.deskHand = (side, mh) => {
      if (state.mode !== 'flat') return false;
      const t = L.tools.find((x) => x.held && x.held.peer === state.myPeer && x.held.side === side);
      if (!t) return false;
      camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
      mh.pos.set(0.16, -0.2, -0.32).applyQuaternion(_cq).add(_cp);
      _aim.set(0, 0, -25).applyQuaternion(_cq).add(_cp);
      mh.quat.setFromUnitVectors(FWD, _aim.sub(mh.pos).normalize());
      mh.ok = true;
      return true;
    };
    L.onToolGrab = (t) => { if (GUNS[t.kind]) showToast(`${GUNS[t.kind].name}: ${t.kind === 'pb_sniper' ? 'hold to steady, let go to fire' : t.kind === 'pb_auto' ? 'hold to keep firing' : 'pull the trigger to fire'}`); };

    // ---------------------------------------------------------------- places: your base, the bench
    function spawnSpot(team, k) { return new V3(-2 + (k % 5) * 1.0, 0, L.BASE_Z[team] + (team === 0 ? -1.2 : 1.2)); }
    function moveMeTo(p, faceZ) {
      camera.getWorldPosition(_cp);
      dolly.position.x += p.x - _cp.x; dolly.position.z += p.z - _cp.z;
      if (state.mode !== 'vr') { state.yaw = faceZ < 0 ? 0 : Math.PI; state.pitch = 0; }
    }
    function sendToBench() { moveMeTo(new V3(L.OUT.x, 0, (Math.random() - 0.5) * 6), 0); if (state.mode !== 'vr') state.yaw = Math.PI / 2; }
    function toBase() { const idx = herePeersPB().indexOf(state.myPeer); moveMeTo(spawnSpot(me.team, idx), me.team === 0 ? -1 : 1); }
    function joinTeam(t) {
      me.team = t; me.out = false;
      showToast(`You\u2019re on ${L.TEAM_NAME[t]}. Grab a marker from your rack`);
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    L.onEnter = () => { if (me.team < 0) joinTeam(pickTeam(L)); me.out = PB.ph === 2; if (me.out) sendToBench(); else toBase(); };
    L.spawn = () => { dolly.position.set(L.OUT.x - 1.5, 0, 6); state.yaw = Math.PI / 2; };
    makeButton(L, new V3(L.OUT.x - 0.6, 1.0, 5.2), 0xb388ff, 'Switch team', () => { if (PB.ph === 2 && !me.out) { showToast('Finish this round first'); return; } joinTeam(1 - me.team); }, { faceYaw: -Math.PI / 2 });

    // ---------------------------------------------------------------- computer players (the host runs them)
    const BOT_NAMES = ['Splatty Sue', 'Rex Rapid', 'Dot Drizzle', 'Pip Pelter', 'Moe Mayhem', 'Gus Goop'];
    const bots = BOT_NAMES.map((name, n) => {
      const body = buildAvatar(n % 2 ? '#3d8bff' : '#ff4d6a', (n * 3 + 1) % HATS.length, n % FACES.length, false);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 128, 33); }).tex, transparent: true, depthWrite: false }));
      label.scale.set(0.9, 0.225, 1); label.position.y = 0.42; body.add(label);
      const gunKind = n % 3 === 0 ? 'pb_pump' : 'pb_auto';
      const gm = TOOL_MESH[gunKind](); gm.position.set(0.18, -0.35, -0.25); body.add(gm);
      // a band in their team's colour, so you can tell who's who at a glance
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.045, 6, 18), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      band.rotation.x = Math.PI / 2; band.position.y = -0.42; body.add(band);
      body.visible = false; G.add(body);
      return { id: `bot:${n}`, n, name, body, band, team: 0, active: false, out: false, x: 0, z: 0, yaw: 0, head: new V3(), ph: 'move', tx: 0, tz: 0, until: 0, cool: 0, burst: 0, gun: gunKind, rx: 0, rz: 0 };
    });
    L.pbBots = bots;
    // cover spots: beside every bunker, both sides
    const COVER = [];
    for (const c of [...L.bunkers.CANS, ...L.bunkers.CONES]) for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) COVER.push(new V3(c.x + Math.cos(a) * (c.r + 0.7), 0, c.z + Math.sin(a) * (c.r + 0.7)));
    for (const w of L.bunkers.WALLS) for (const s of [-1, 1]) COVER.push(new V3(w.x + s * Math.sin(w.rot) * (w.hd + 0.7), 0, w.z + s * Math.cos(w.rot) * (w.hd + 0.7)));
    function fillBots() {
      // computer players fill each team up to three (when fewer than six people are here)
      const n = [0, 0];
      for (const id of herePeersPB()) { const t = teamOf(id); if (t === 0 || t === 1) n[t]++; }
      const people = n[0] + n[1], want = people >= 6 ? [0, 0] : [Math.max(0, 3 - n[0]), Math.max(0, 3 - n[1])];
      let k = 0;
      for (const t of [0, 1]) for (let i = 0; i < want[t]; i++) { const b = bots[k++]; Object.assign(b, { active: true, team: t, out: false, ph: 'move' }); b.band.material.color.set(L.TEAM_HEX[t]); }
      for (; k < bots.length; k++) bots[k].active = false;
      bots.forEach((b, i) => { if (b.active) { const p = spawnSpot(b.team, 5 + i); b.x = p.x; b.z = p.z; b.rx = b.x; b.rz = b.z; b.until = 0; } });
    }
    function botStep(b, dt, now) {
      if (!b.active) return;
      const enemyZ = L.BASE_Z[1 - b.team];
      if (b.out) { moveBot(b, L.OUT.x, (b.n - 2.5) * 1.1, 3, dt); return; }
      if (PB.ph !== 2) return;
      if (b.ph === 'move') {
        // run to a new bunker, roughly toward the other team
        if (!b.until) {
          const mine = COVER.filter((c) => (b.team === 0 ? c.z > -6 : c.z < 6) && Math.abs(c.z - b.z) < 14);
          const pick = mine[Math.floor(Math.random() * mine.length)] || COVER[0];
          b.tx = pick.x; b.tz = pick.z; b.until = now + 9000;
        }
        if (moveBot(b, b.tx, b.tz, 3.6, dt) || now > b.until) { b.ph = 'hold'; b.until = now + 3000 + Math.random() * 4000; }
      } else if (b.ph === 'hold') {
        b.yaw = Math.atan2(0, enemyZ - b.z) + Math.PI;
        // shoot at someone it can see
        if (now > b.cool) {
          const foes = targets().filter((t) => t.team !== b.team && t.head.distanceTo(b.head) < 28 && L.clearLine(b.head, t.head));
          if (foes.length) {
            const tg = foes[Math.floor(Math.random() * foes.length)], gun = GUNS[b.gun];
            const from = b.head.clone().add(new V3(0, -0.25, 0)), d = tg.head.clone().add(new V3(0, -0.35, 0)).sub(from), dist = d.length();
            const tof = dist / gun.speed;
            d.y += 0.5 * 9.8 * gun.grav * tof * tof;   // aim a little high for the drop
            const err = (2.2 + dist * 0.12) * Math.PI / 180;
            d.normalize().applyAxisAngle(new V3(0, 1, 0), (Math.random() - 0.5) * 2 * err);
            d.y += (Math.random() - 0.5) * err * 1.4;
            const vel = d.normalize().multiplyScalar(gun.speed);
            addBall(from, vel, b.team, b.gun, b.id, true);
            me.shots.push([++me.shotSeq, KIND_I[b.gun], r2(from.x), r2(from.y), r2(from.z), r2(vel.x), r2(vel.y), r2(vel.z), b.team, b.n]);
            if (me.shots.length > 14) me.shots.splice(0, me.shots.length - 14);
            b.yaw = Math.atan2(-d.x, -d.z);
            b.burst += 1;
            b.cool = now + (b.gun === 'pb_auto' ? (b.burst % 3 ? 160 : 1300 + Math.random() * 900) : 1100 + Math.random() * 900);
            forcePresence();
          } else b.cool = now + 500;
        }
        if (now > b.until) { b.ph = 'move'; b.until = 0; }
      }
    }
    function moveBot(b, tx, tz, speed, dt) {
      const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
      if (d < 0.15) return true;
      const s = Math.min(d, speed * dt);
      b.x += (dx / d) * s; b.z += (dz / d) * s; b.yaw = Math.atan2(-dx, -dz);
      // slide around bunkers
      const n = bunkerHit(new V3(b.x, 1.0, b.z), 0.32);
      if (n && Math.abs(n.y) < 0.9) { b.x += n.x * 0.08 - (dz / d) * 0.05; b.z += n.z * 0.08 + (dx / d) * 0.05; }
      return false;
    }

    // ---------------------------------------------------------------- rounds (the host decides)
    function announcePB(code, a, b) { PB.ev = [PB.ev[0] + 1, code, a || '', b || '']; showEventPB(PB.ev); forcePresence(); }
    function startRound(now) { PB.ph = 1; PB.endAt = now + 5000; PB.round += 1; PB.winner = -1; fillBots(); announcePB(1, '', ''); }
    function aliveOn(t) { let n = 0; for (const id of herePeersPB()) if (teamOf(id) === t && !(id === state.myPeer ? me.out : (remotes.get(id) && remotes.get(id).lvState[L.id] && remotes.get(id).lvState[L.id].pbOut))) n++; for (const b of bots) if (b.active && b.team === t && !b.out) n++; return n; }
    function hostTick(now) {
      if (me.req && me.req.join() !== me.lastOwnReq) { me.lastOwnReq = me.req.join(); hostRequest(me.req, now); }
      if (PB.ph === 1 && now > PB.endAt) { PB.ph = 2; announcePB(2, '', ''); }
      else if (PB.ph === 2) {
        const a = [aliveOn(0), aliveOn(1)];
        if (a[0] === 0 || a[1] === 0) { PB.winner = a[0] === 0 && a[1] === 0 ? -1 : a[0] > 0 ? 0 : 1; if (PB.winner >= 0) PB.wins[PB.winner] += 1; PB.ph = 3; PB.endAt = now + 5000; announcePB(3, String(PB.winner), ''); }
      } else if (PB.ph === 3 && now > PB.endAt) startRound(now);
    }
    function hostRequest(req, now) {
      if (!Array.isArray(req) || req.length !== 3) return;
      if (req[0] === 1 && PB.ph === 0) startRound(now);
      else if (req[0] === 2 && PB.ph !== 0) { PB.ph = 0; for (const b of bots) b.active = false; announcePB(4, '', ''); }
    }
    function requestPB(kind) { me.req = [kind, PB.gid, ++me.reqSeq]; if (pbHost()) { me.lastOwnReq = me.req.join(); hostRequest(me.req, performance.now()); } forcePresence(); }
    L.requestPB = requestPB;
    function showEventPB(ev) {
      const [, code, a] = ev;
      if (code === 1) { me.out = false; if (me.team >= 0 && state.level === L.idx) toBase(); for (const b of balls) G.remove(b.m); balls.length = 0; showToast(`Round ${PB.round}: get ready!`); sfx('chime', 0.6); }
      else if (code === 2) { showToast('Go! Go! Go!'); sfx('fanfare', 0.5); }
      else if (code === 3) { const w = Number(a); showToast(w < 0 ? 'Everyone\u2019s out! A draw' : w === me.team ? `${L.TEAM_NAME[w]} wins the round!` : `${L.TEAM_NAME[w]} wins the round`); sfx(w === me.team ? 'cheer' : 'buzzer', 0.6); }
      else if (code === 4) { showToast('Paintball ended'); me.out = false; }
      state.dirtyBoard = true; state.hudDirty = true;
    }
    L.hudActions = [
      { label: () => 'Start game', run: () => requestPB(1), show: () => PB.ph === 0 },
      { label: () => 'End game', run: () => requestPB(2), show: () => PB.ph !== 0 },
      { label: () => 'Switch team', run: () => { if (PB.ph === 2 && !me.out) { showToast('Finish this round first'); return; } joinTeam(1 - me.team); } },
    ];
    makeButton(L, new V3(L.OUT.x - 0.6, 1.0, 3.8), 0x4fc3f7, 'Start game', () => requestPB(PB.ph === 0 ? 1 : 2), { faceYaw: -Math.PI / 2 });
    L.hintsFor = () => (myGun() ? [['Space', GUNS[myGun().kind].auto ? 'hold to fire' : GUNS[myGun().kind].charge ? 'hold to steady, let go to fire' : 'fire'], ['Drag', 'aim'], ['WASD', 'move'], ['E', 'drop the marker']] : [['E', 'grab a marker from your rack'], ['WASD', 'move'], ['Drag', 'look']]);

    // ---------------------------------------------------------------- per frame
    const _bh = new V3();
    L.update = (dt, now) => {
      if (pbHost()) { hostTick(now); for (const b of bots) botStep(b, dt, now); }
      // hold to keep firing (the Auto)
      const t = myGun();
      if (t && me.holding && GUNS[t.kind].auto) fire(t, now, 0);
      stepBalls(dt);
      // draw the bots
      const host = pbHost();
      for (const b of bots) {
        b.body.visible = b.active && state.level === L.idx;
        if (!b.body.visible) continue;
        const k = 1 - Math.exp(-dt * (host ? 30 : 10));
        if (Math.hypot(b.rx - b.x, b.rz - b.z) > 6) { b.rx = b.x; b.rz = b.z; }
        b.rx += (b.x - b.rx) * k; b.rz += (b.z - b.rz) * k;
        b.body.position.set(b.rx, b.out ? 1.1 : 1.55, b.rz);
        b.body.rotation.y = b.yaw;
        b.head.set(b.rx, 1.55, b.rz);
      }
      // stay on the bench while you're out
      if (me.out && PB.ph === 2 && state.level === L.idx) { camera.getWorldPosition(_bh); if (_bh.x < L.OUT.x - 1.5) sendToBench(); }
      if (now - (L._pbBoard || 0) > 400) { L._pbBoard = now; state.dirtyBoard = true; }
    };
    L.onExit = () => { me.holding = false; };
    L.rowFor = (st, isMe) => { const t = isMe ? me.team : (st.pbTeam ?? -1); return { team: t, text: t < 0 ? '' : `${L.TEAM_NAME[t]}${(isMe ? me.out : st.pbOut) ? ' (out)' : ''}` }; };
    L.sortRows = (a, b) => a.team - b.team;
    L.drawBoard = () => {
      const g = L.board.g, W = 720, H = 460, now = performance.now();
      g.fillStyle = '#1b2a3a'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 54px ${DISPLAY}`; g.fillText('Paintball', W / 2, 64);
      g.font = `800 96px ${DISPLAY}`;
      g.fillStyle = L.TEAM_HEX[0]; g.fillText(String(PB.wins[0]), 150, 190);
      g.fillStyle = L.TEAM_HEX[1]; g.fillText(String(PB.wins[1]), W - 150, 190);
      g.font = `700 26px ${BODY}`; g.fillStyle = L.TEAM_HEX[0]; g.fillText(`RED \u00b7 ${aliveOn(0)} left`, 150, 262); g.fillStyle = L.TEAM_HEX[1]; g.fillText(`BLUE \u00b7 ${aliveOn(1)} left`, W - 150, 262);
      g.fillStyle = '#ffffff'; g.font = `800 44px ${DISPLAY}`;
      g.fillText(PB.ph === 0 ? 'Press Start game' : PB.ph === 1 ? `Round ${PB.round} in ${Math.max(0, Math.ceil((PB.endAt - now) / 1000))}` : PB.ph === 2 ? `Round ${PB.round}` : PB.winner < 0 ? 'A draw!' : `${L.TEAM_NAME[PB.winner]} wins the round`, W / 2, 360, W - 60);
      g.fillStyle = '#a9c0d8'; g.font = `400 24px ${BODY}`; g.fillText('Rounds won', W / 2, 190);
      L.board.tex.needsUpdate = true;
    };

    // ---------------------------------------------------------------- network
    const okNum = (x) => finite(x) && Math.abs(x) < 200;
    L.presence = () => {
      const p = { pbt: [me.team, me.out ? 1 : 0] };
      if (me.shots.length) p.pbs = me.shots.map((s) => s.slice());
      if (me.hits.length) p.pbh = me.hits.map((h) => h.slice());
      if (me.req) p.pbq = me.req.slice();
      if (pbHost()) {
        p.pbg = [PB.ph, PB.round, PB.wins[0], PB.wins[1], PB.winner, Math.max(0, Math.round((PB.endAt - performance.now()) / 100))];
        p.pbb = bots.filter((b) => b.active).map((b) => [b.n, b.team, b.out ? 1 : 0, r2(b.x), r2(b.z), r2(b.yaw)]);
        p.pbe = PB.ev.slice();
      }
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      const t = pres.pbt;
      if (Array.isArray(t) && t.length === 2 && (t[0] === -1 || t[0] === 0 || t[0] === 1)) { st.pbTeam = t[0]; st.pbOut = t[1] === 1; st.team = t[0]; }
      // their shots: draw the same paint (only the shooter's page decides hits)
      if (Array.isArray(pres.pbs)) for (const s of pres.pbs) {
        if (!Array.isArray(s) || s.length !== 10 || !Number.isInteger(s[0]) || s[0] <= (st.pbsSeq || 0) || !KINDS[s[1]] || !s.slice(2, 8).every(okNum) || (s[8] !== 0 && s[8] !== 1)) continue;
        st.pbsSeq = s[0];
        if (st.pbsInit) addBall(new V3(s[2], s[3], s[4]), new V3(s[5], s[6], s[7]), s[8], KINDS[s[1]], s[9] >= 0 ? `bot:${s[9]}` : rec.peer, false);
      }
      if (Array.isArray(pres.pbs) && !st.pbsInit) st.pbsSeq = Math.max(st.pbsSeq || 0, ...pres.pbs.map((s) => (Array.isArray(s) ? s[0] : 0)));
      st.pbsInit = true;
      // their hits: on me, on a bot, or on someone else
      if (Array.isArray(pres.pbh)) for (const h of pres.pbh) {
        if (!Array.isArray(h) || h.length !== 3 || !Number.isInteger(h[0]) || h[0] <= (st.pbhSeq || 0) || typeof h[1] !== 'string' || typeof h[2] !== 'string') continue;
        st.pbhSeq = h[0];
        if (st.pbhInit) applyHit(h[1], h[2]);
      }
      if (Array.isArray(pres.pbh) && !st.pbhInit) st.pbhSeq = Math.max(st.pbhSeq || 0, ...pres.pbh.map((h) => (Array.isArray(h) ? h[0] : 0)));
      st.pbhInit = true;
      if (pbHost()) {
        if (Array.isArray(pres.pbq) && pres.pbq.join() !== st.pbq) { st.pbq = pres.pbq.join(); if (st.pbqInit) hostRequest(pres.pbq, performance.now()); }
        st.pbqInit = true;
        return;
      }
      if (rec.peer !== herePeersPB()[0] || !Array.isArray(pres.pbg) || pres.pbg.length !== 6) return;
      const g = pres.pbg;
      Object.assign(PB, { ph: clamp(g[0] | 0, 0, 3), round: g[1] | 0, wins: [g[2] | 0, g[3] | 0], winner: g[4] | 0 });
      const end = performance.now() + (g[5] | 0) * 100;
      if (Math.abs(end - PB.endAt) > 400) PB.endAt = end;
      const seen = new Set();
      if (Array.isArray(pres.pbb)) for (const a of pres.pbb) {
        if (!Array.isArray(a) || a.length !== 6 || !bots[a[0]] || !a.slice(3).every(okNum)) continue;
        const b = bots[a[0]]; seen.add(b.n);
        if (!b.active) { b.rx = a[3]; b.rz = a[4]; }
        Object.assign(b, { active: true, team: a[1] ? 1 : 0, out: a[2] === 1, x: a[3], z: a[4], yaw: a[5] });
        b.band.material.color.set(L.TEAM_HEX[b.team]);
      }
      for (const b of bots) if (!seen.has(b.n)) b.active = false;
      const ev = pres.pbe;
      if (Array.isArray(ev) && ev.length === 4 && Number.isInteger(ev[0]) && ev[0] !== PB.ev[0]) { const fresh = PB.ev[0] !== 0; PB.ev = ev.slice(); if (fresh) showEventPB(ev); }
    };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0001) * 0.4; camera.position.set(Math.sin(a) * 10 - 6, 5, 22); camera.lookAt(0, 1, 0); };
    L.pbInternals = { GUNS, KINDS, fire, addBall, stepBalls, applyHit, judgeHit, startRound, hostTick, fillBots, bots, balls, splats, targets, teamOf, aliveOn, bodyHit };
    return L;
  })();

