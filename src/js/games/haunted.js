  // ================================================================ LEVEL: HAUNTED MANSION
  // A dark old house, five rooms deep, and a flashlight each. Ghosts drift about; hold one in your beam and it
  // shivers, shrinks and gets sucked into the light. Catch every ghost in a room to unlock the next door.
  // They don't like the light, so they dodge, and now and then one sneaks up behind you and shouts BOO
  // (five scares and you faint, waking up at the door). The Phantom Duke waits in the attic.
  // VR: the flashlight is in your right hand. Browser: it points where you look.
  // One player's device (the first in the room) runs the ghosts; everyone's beam counts.
  const haunted = (() => {
    const L = newLevel(39);
    const G = L.group;
    const rand = mulberry32(3939);
    L.grabless = true;
    L.walkSpeed = 2.6;
    L.bounds = { minX: -5, maxX: 5, minZ: -50, maxZ: 6 };
    L.env = {
      sky: skyTexture([[0, '#05030a'], [1, '#100a1a']]),
      bg: 0x05030a, fog: [0x05030a, 6, 22], hemi: [0x8a7aaa, 0x201828, 0.16],
      sun: [0x9a8ac8, 0.06], sunDir: new V3(0.3, 1, 0.2), ambient: [0x2a2040, 0.22], sprite: null,
    };
    const RW = 10, RD = 10, DOOR = 0.95;
    const ROOMS = [
      { name: 'Foyer', z: 0, ghosts: 2, wall: '#3a1a3a', floor: '#4a2a1a' },
      { name: 'Library', z: -11, ghosts: 4, wall: '#1a2a3a', floor: '#3a2a1a' },
      { name: 'Dining hall', z: -22, ghosts: 5, wall: '#3a1a1a', floor: '#2a1a12' },
      { name: 'Ballroom', z: -33, ghosts: 6, wall: '#2a1a3a', floor: '#3a3048' },
      { name: 'Attic', z: -44, ghosts: 3, wall: '#2a2018', floor: '#3a2a1a', boss: true },
    ];
    const roomOfZ = (z) => { for (let i = 0; i < ROOMS.length; i++) if (z > ROOMS[i].z - RD / 2 - 0.5) return i; return ROOMS.length - 1; };

    // ---------------------------------------------------------------- the house
    const wallTex = (col) => canvasTexture(128, 128, (g) => { g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { g.beginPath(); g.moveTo(x + 16, y + 4); g.lineTo(x + 26, y + 16); g.lineTo(x + 16, y + 28); g.lineTo(x + 6, y + 16); g.fill(); } });
    const floorTex = (col) => canvasTexture(128, 128, (g) => { g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 8; i++) g.fillRect(0, i * 16, 128, 1); for (let i = 0; i < 12; i++) g.fillRect(Math.floor(rand() * 128), Math.floor(rand() * 8) * 16, 1, 16); });
    const doors = [];
    const flameM = new THREE.MeshBasicMaterial({ color: 0xffc860 });
    const glowM = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const candles = [];
    function candle(x, y, z, s) {
      addCyl(G, 0.025 * s, 0.03 * s, 0.18 * s, 8, lam(0xe8e0c8), x, y + 0.09 * s, z);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.018 * s, 0.06 * s, 6), flameM); f.position.set(x, y + 0.21 * s, z); G.add(f);
      const gl = new THREE.Sprite(glowM); gl.position.set(x, y + 0.22 * s, z); gl.scale.set(0.5 * s, 0.5 * s, 1); G.add(gl);
      candles.push({ f, gl, ph: rand() * 10, s });
    }
    ROOMS.forEach((r, i) => {
      const wt = wallTex(r.wall), ft = floorTex(r.floor);
      wt.tex.wrapS = wt.tex.wrapT = THREE.RepeatWrapping; wt.tex.repeat.set(4, 2);
      ft.tex.wrapS = ft.tex.wrapT = THREE.RepeatWrapping; ft.tex.repeat.set(3, 3);
      const wm = new THREE.MeshLambertMaterial({ map: wt.tex }), fm = new THREE.MeshLambertMaterial({ map: ft.tex });
      const H = i === 4 ? 3.2 : 3.6;
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD + 1), fm); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, r.z); G.add(fl);
      const ce = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD + 1), lam(0x1a1218)); ce.rotation.x = Math.PI / 2; ce.position.set(0, H, r.z); G.add(ce);
      for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(RD + 1, H), wm); w.position.set(sx * RW / 2, H / 2, r.z); w.rotation.y = -sx * Math.PI / 2; G.add(w); }
      // the far wall, with a doorway (and a door that opens when the room is clear)
      const zf = r.z - RD / 2 - 0.5, side = (RW - DOOR * 2) / 2;
      for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(side, H), wm); w.position.set(sx * (DOOR + side / 2), H / 2, zf); G.add(w); const w2 = w.clone(); w2.rotation.y = Math.PI; G.add(w2); }
      const lintel = new THREE.Mesh(new THREE.PlaneGeometry(DOOR * 2, H - 2.3), wm); lintel.position.set(0, 2.3 + (H - 2.3) / 2, zf); G.add(lintel); const l2 = lintel.clone(); l2.rotation.y = Math.PI; G.add(l2);
      if (i === 0) { const w = new THREE.Mesh(new THREE.PlaneGeometry(RW, H), wm); w.position.set(0, H / 2, r.z + RD / 2 + 0.5); w.rotation.y = Math.PI; G.add(w); }
      if (i < ROOMS.length - 1) {
        const door = new THREE.Group(); door.position.set(-DOOR, 0, zf); G.add(door);
        const panel = new THREE.Mesh(boxg(DOOR * 2, 2.3, 0.08), lam(0x3a2010)); panel.position.set(DOOR, 1.15, 0); door.add(panel);
        const knob = new THREE.Mesh(sph(0.04, 8, 6), lam(0xd8b060)); knob.position.set(DOOR * 1.8, 1.1, 0.06); door.add(knob);
        const lock = new THREE.Mesh(boxg(0.18, 0.22, 0.06), new THREE.MeshLambertMaterial({ color: 0x8a8a9a, emissive: 0x200000 })); lock.position.set(DOOR, 1.2, 0.08); door.add(lock);
        doors.push({ g: door, open: 0, lock });
      }
      // a room label above the doorway behind you
      makePlate(G, r.name, 2.0, 0.34, new V3(0, 2.75, r.z + RD / 2 + 0.44), Math.PI, { bg: '#1a1018', fg: '#d8c0a0', size: 0.6 });
      // portraits, candles on little tables
      for (const sx of [-1, 1]) for (const dz of [-2.5, 2.5]) {
        const pz = r.z + dz;
        const frame = new THREE.Mesh(boxg(0.06, 1.0, 0.8), lam(0x6a4a1a)); frame.position.set(sx * (RW / 2 - 0.03), 1.9, pz); G.add(frame);
        const pic = canvasTexture(64, 80, (g) => { g.fillStyle = '#2a2018'; g.fillRect(0, 0, 64, 80); g.fillStyle = '#8a7a6a'; g.beginPath(); g.ellipse(32, 34, 14, 18, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3a2a2a'; g.fillRect(14, 54, 36, 26); g.fillStyle = '#ff3a3a'; g.fillRect(25, 30, 4, 3); g.fillRect(35, 30, 4, 3); });
        const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.86), new THREE.MeshLambertMaterial({ map: pic.tex })); pm.position.set(sx * (RW / 2 - 0.07), 1.9, pz); pm.rotation.y = -sx * Math.PI / 2; G.add(pm);
      }
      addBox(G, 0.5, 0.8, 0.5, lam(0x3a2414), -RW / 2 + 0.5, 0.4, r.z + 3.6); candle(-RW / 2 + 0.5, 0.8, r.z + 3.6, 1.4);
      addBox(G, 0.5, 0.8, 0.5, lam(0x3a2414), RW / 2 - 0.5, 0.4, r.z - 3.6); candle(RW / 2 - 0.5, 0.8, r.z - 3.6, 1.4);
    });
    // the library: tall bookshelves
    {
      const z = ROOMS[1].z, bookCols = [0x8a2a2a, 0x2a4a8a, 0x2a6a3a, 0x8a6a2a, 0x5a2a6a];
      for (const sx of [-1, 1]) for (const dz of [-1, 1]) {
        const x = sx * 3.2, zz = z + dz * 1.6;
        addBox(G, 0.4, 2.6, 2.0, lam(0x3a2414), x, 1.3, zz);
        for (let sh = 0; sh < 5; sh++) for (let b = 0; b < 9; b++) addBox(G, 0.3, 0.32, 0.12, lam(bookCols[(b + sh) % 5]), x - sx * 0.05, 0.25 + sh * 0.5, zz - 0.85 + b * 0.21);
      }
    }
    // the dining hall: a long table, chairs and a candelabra
    {
      const z = ROOMS[2].z;
      addBox(G, 1.4, 0.08, 5.5, lam(0x4a2a14), 0, 0.78, z); for (const [x, dz] of [[-0.6, -2.5], [0.6, -2.5], [-0.6, 2.5], [0.6, 2.5]]) addBox(G, 0.08, 0.78, 0.08, lam(0x3a2010), x, 0.39, z + dz);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 5.2), lam(0xd8d0c0)); cloth.rotation.x = -Math.PI / 2; cloth.position.set(0, 0.825, z); G.add(cloth);
      for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { const cz = z - 2 + k * 1.3; addBox(G, 0.45, 0.06, 0.45, lam(0x5a2a1a), sx * 1.05, 0.46, cz); addBox(G, 0.06, 0.6, 0.45, lam(0x5a2a1a), sx * 1.28, 0.78, cz); }
      for (const dz of [-1.5, 1.5]) { addCyl(G, 0.03, 0.06, 0.4, 8, lam(0xc8a040), 0, 1.02, z + dz); for (const ox of [-0.15, 0, 0.15]) candle(ox, 1.2, z + dz, 0.8); }
      for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(cyl(0.12, 0.12, 0.02, 14), lam(0xe8e8f0)); p.position.set((k % 2 ? 0.35 : -0.35), 0.835, z - 2 + Math.floor(k / 2) * 2); G.add(p); }
    }
    // the ballroom: a chandelier and a checker floor
    {
      const z = ROOMS[3].z;
      const ch = new THREE.Group(); ch.position.set(0, 3.0, z); G.add(ch);
      ch.add(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 6, 24), lam(0xc8a040)));
      ch.children[0].rotation.x = Math.PI / 2;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; candle(Math.cos(a) * 0.8, 3.0, z + Math.sin(a) * 0.8, 0.8); }
      const chk = canvasTexture(64, 64, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#2a2030' : '#8a8090'; g.fillRect(x * 8, y * 8, 8, 8); } });
      chk.tex.magFilter = THREE.NearestFilter; chk.tex.wrapS = chk.tex.wrapT = THREE.RepeatWrapping; chk.tex.repeat.set(2, 2);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshLambertMaterial({ map: chk.tex })); f.rotation.x = -Math.PI / 2; f.position.set(0, 0.006, z); G.add(f);
      // a grand piano in the corner
      addBox(G, 1.5, 0.3, 1.0, lam(0x0a0a0a), 3.4, 0.85, z + 3.6); for (const [x, dz] of [[2.8, 3.2], [4, 3.2], [3.4, 4]]) addCyl(G, 0.04, 0.04, 0.7, 6, lam(0x0a0a0a), x, 0.35, z + dz);
    }
    // the attic: crates, cobwebs, a trunk
    {
      const z = ROOMS[4].z;
      for (const [x, dz, s] of [[-3.6, -3, 0.9], [-3.0, -3.4, 0.6], [3.4, 2.8, 0.8], [3.8, -2, 1.0], [-3.8, 2.6, 0.7]]) addBox(G, s, s, s, lam(0x6a4a2a), x, s / 2, z + dz);
      addBox(G, 1.2, 0.6, 0.6, lam(0x4a2a1a), 0, 0.3, z - 4.3);
      const web = canvasTexture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(230,230,240,0.6)'; g.lineWidth = 1; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 64, Math.sin(a) * 64); g.stroke(); } for (let r = 12; r < 64; r += 12) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI / 2); g.stroke(); } });
      for (const [x, y, ry] of [[-4.95, 3.0, Math.PI / 2], [4.95, 3.0, -Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: web.tex, transparent: true, side: THREE.DoubleSide })); w.position.set(x, y - 0.6, z - 4.3); w.rotation.y = ry; G.add(w); }
    }
    // a window in the foyer, for the lightning
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), new THREE.MeshBasicMaterial({ color: 0x1a2040 })); win.position.set(-RW / 2 + 0.02, 1.9, 2.5); win.rotation.y = Math.PI / 2; G.add(win);
    addBox(G, 0.05, 1.8, 0.06, lam(0x2a1a10), -RW / 2 + 0.04, 1.9, 2.5); addBox(G, 0.05, 0.06, 1.4, lam(0x2a1a10), -RW / 2 + 0.04, 1.9, 2.5);

    // ---------------------------------------------------------------- flashlights
    function makeTorch() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(cyl(0.022, 0.02, 0.18, 10), lam(0x2a2a30)); body.rotation.x = Math.PI / 2; body.position.z = -0.03; g.add(body);
      const head = new THREE.Mesh(cyl(0.035, 0.025, 0.05, 12), lam(0xd8b040)); head.rotation.x = Math.PI / 2; head.position.z = -0.14; g.add(head);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: 0xfff8d0 })); lens.position.z = -0.166; lens.rotation.y = Math.PI; g.add(lens);
      return g;
    }
    const myTorch = makeTorch(); L.overlay.add(myTorch);
    const spot = new THREE.SpotLight(0xfff0c8, 2.4, 16, 0.32, 0.45, 1.2);
    const spotTarget = new THREE.Object3D(); L.overlay.add(spot, spotTarget); spot.target = spotTarget;
    // a soft visible cone for each beam (mine and everyone else's)
    const coneGeo = new THREE.ConeGeometry(1.0, 5, 20, 1, true); coneGeo.translate(0, -2.5, 0); coneGeo.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const myCone = new THREE.Mesh(coneGeo, coneMat); L.overlay.add(myCone);
    const otherBeams = new Map();
    const BEAM = { range: 9, cos: Math.cos(0.2) };

    // ---------------------------------------------------------------- ghosts
    const ghostMat = () => new THREE.MeshLambertMaterial({ color: 0xe8f0ff, emissive: 0x405a7a, transparent: true, opacity: 0.82 });
    function makeGhost(boss) {
      const g = new THREE.Group(), m = ghostMat();
      const head = new THREE.Mesh(sph(0.32, 16, 12), m); g.add(head);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.6, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0xe8f0ff, emissive: 0x405a7a, transparent: true, opacity: 0.82, side: THREE.DoubleSide })); skirt.position.y = -0.3; g.add(skirt); g.userData.skirt = skirt;
      const eyeM = new THREE.MeshBasicMaterial({ color: 0x0a0a1a });
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(sph(0.055, 8, 6), eyeM); e.scale.set(0.8, 1.3, 0.5); e.position.set(sx * 0.11, 0.06, -0.28); g.add(e); }
      const mouth = new THREE.Mesh(sph(0.06, 8, 6), eyeM); mouth.scale.set(1, 1.4, 0.5); mouth.position.set(0, -0.1, -0.29); g.add(mouth);
      for (const sx of [-1, 1]) { const a = new THREE.Mesh(sph(0.08, 8, 6), m); a.scale.set(1, 0.6, 0.6); a.position.set(sx * 0.36, -0.08, 0); g.add(a); }
      if (boss) {
        const crown = new THREE.Group(); crown.position.y = 0.3; g.add(crown);
        const gold = new THREE.MeshLambertMaterial({ color: 0xffc83a, emissive: 0x4a3000 });
        crown.add(new THREE.Mesh(cyl(0.18, 0.18, 0.08, 14, true), gold));
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), gold); c.position.set(Math.cos(a) * 0.18, 0.08, Math.sin(a) * 0.18); crown.add(c); }
        g.scale.setScalar(2.2);
      }
      g.visible = false; G.add(g);
      return { g, m, boss };
    }
    const MAXG = 8;
    const ghostMeshes = [];
    for (let i = 0; i < MAXG; i++) ghostMeshes.push(makeGhost(false));
    const bossMesh = makeGhost(true);
    // the ghosts' state (run by the host): x, y, z, vx, vz, meter (0..1 caught), st 0 roam / 1 sneak / 2 caught (sucked in) / 3 gone
    const H = { g: 0, ph: 'idle', room: 0, ghosts: [], bossHp: 0, t0: 0, msg: '', msgSeq: 0, boo: [0, ''], caught: 0, time: 0, best: 0, open: [] };
    try { if (Number.isFinite(prefs.hauntBest)) H.best = prefs.hauntBest; } catch (e) { /* none */ }
    L.haunt = H;
    const humansHere = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const isHost = () => humansHere()[0] === state.myPeer;
    function say(m) { H.msg = m; H.msgSeq += 1; showToast(m); }
    function fillRoom(i) {
      const r = ROOMS[i];
      H.room = i; H.ghosts = [];
      for (let k = 0; k < r.ghosts; k++) H.ghosts.push(newGhost(r, false, k));
      if (r.boss) { H.bossHp = 3; H.ghosts.push(newGhost(r, true, 9)); }
      forcePresence();
    }
    function newGhost(r, boss, k) {
      return { x: (rand() - 0.5) * (RW - 3), y: 1.4 + rand() * 0.8, z: r.z - 1 - rand() * 3, vx: 0, vz: 0, meter: 0, st: 0, t: 0, boss, k, sneakT: 3 + rand() * 6, target: '', wob: rand() * 10 };
    }
    function startHunt() {
      H.g = (H.g + 1) % 100000; H.ph = 'hunt'; H.caught = 0; H.t0 = Date.now(); H.open = [];
      fillRoom(0);
      say('Catch the ghosts in your flashlight beam!');
      sfx('chains', 0.6);
      forcePresence();
    }
    L.startHunt = startHunt;
    // everyone's beams: [origin, direction] (mine, and from the others' right hands)
    const _d = new V3();
    function beams() {
      const out = [];
      const mh = myHands.right;
      if (state.mode === 'vr' && mh.ok) out.push([mh.pos.clone(), new V3(0, 0, -1).applyQuaternion(mh.quat)]);
      else { out.push([myHead.pos.clone(), new V3(0, 0, -1).applyQuaternion(myHead.quat)]); }
      for (const rec of remotes.values()) {
        if (rec.lv !== L.idx || !rec.inGame) continue;
        if (rec.hasR) out.push([rec.cur.r.pos.clone(), new V3(0, 0, -1).applyQuaternion(rec.cur.r.quat)]);
        else if (rec.hasH) out.push([rec.cur.h.pos.clone(), new V3(0, 0, -1).applyQuaternion(rec.cur.h.quat)]);
      }
      return out;
    }
    L.beams = beams;
    // how well a beam lights a point: 0 (not at all) .. 1 (dead centre, close)
    function lit(beam, p) {
      _d.subVectors(p, beam[0]); const dist = _d.length();
      if (dist > BEAM.range || dist < 0.1) return 0;
      const c = _d.dot(beam[1]) / dist;
      if (c < BEAM.cos) return 0;
      return (c - BEAM.cos) / (1 - BEAM.cos) * 0.5 + 0.5 * (1 - dist / BEAM.range);
    }
    function playerPositions() {
      const out = [[state.myPeer, myHead.pos.clone()]];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame && rec.hasH) out.push([rec.peer, rec.cur.h.pos.clone()]);
      return out;
    }
    const _p = new V3();
    function hostStep(dt) {
      if (H.ph !== 'hunt') return;
      H.time = (Date.now() - H.t0) / 1000;
      const r = ROOMS[H.room], bs = beams(), people = playerPositions().filter(([, p]) => roomOfZ(p.z) === H.room);
      for (const gh of H.ghosts) {
        if (gh.st === 3) continue;
        gh.t += dt;
        if (gh.st === 2) { gh.meter += dt; if (gh.meter > 1.8) gh.st = 3; continue; }
        _p.set(gh.x, gh.y, gh.z);
        let light = 0, from = null;
        for (const b of bs) { const l = lit(b, _p); if (l > light) { light = l; from = b; } }
        // in the light: the catch meter fills (the Duke takes longer), and the ghost tries to slip out sideways
        const need = gh.boss ? 2.6 : 1.3;
        if (light > 0) {
          gh.meter += dt * (0.5 + light) / need;
          if (gh.st === 1) { gh.st = 0; gh.sneakT = 4 + rand() * 5; }
          const sx = -from[1].z, sz = from[1].x, side = Math.sin(gh.wob) > 0 ? 1 : -1;
          gh.vx += sx * side * dt * (gh.boss ? 5 : 3.5); gh.vz += sz * side * dt * (gh.boss ? 5 : 3.5);
          if (gh.meter >= 1) {
            if (gh.boss) {
              H.bossHp -= 1; gh.meter = 0;
              if (H.bossHp <= 0) { gh.st = 2; gh.meter = 0; say('You caught the Phantom Duke! The mansion is free!'); sfx('fanfare', 1); finish(); }
              else { say(`The Duke wails! ${H.bossHp} more to go`); sfx('roar', 0.7); gh.x = -gh.x; gh.z = r.z - 3; for (let k = 0; k < 2; k++) H.ghosts.push(newGhost(r, false, H.ghosts.length)); }
            } else { gh.st = 2; gh.meter = 0; H.caught += 1; sfx('zap', 0.6); tone(900, 200, 0.4, 'sine', 0.15); }
            forcePresence();
            continue;
          }
        } else gh.meter = Math.max(0, gh.meter - dt * 0.35);
        // wander, or sneak up on someone and shout
        gh.wob += dt * (0.7 + (gh.k % 3) * 0.3);
        gh.sneakT -= dt;
        if (gh.st === 0 && gh.sneakT <= 0 && people.length) { const [id] = people[Math.floor(rand() * people.length)]; gh.st = 1; gh.target = id; gh.t = 0; }
        if (gh.st === 1) {
          const tp = people.find(([id]) => id === gh.target);
          if (!tp || gh.t > 8) { gh.st = 0; gh.sneakT = 4 + rand() * 4; }
          else {
            const dx = tp[1].x - gh.x, dz = tp[1].z - gh.z, d = Math.hypot(dx, dz) || 1;
            gh.vx += dx / d * dt * 2.2; gh.vz += dz / d * dt * 2.2; gh.y += (tp[1].y - 0.1 - gh.y) * dt;
            if (d < 0.6) { H.boo = [H.boo[0] + 1, gh.target]; gh.st = 0; gh.sneakT = 6 + rand() * 5; gh.vx = -dx / d * 3; gh.vz = -dz / d * 3; sfx('roar', 0.3); forcePresence(); if (gh.target === state.myPeer) scared(); }
          }
        } else {
          gh.vx += Math.sin(gh.wob * 1.3 + gh.k) * dt * 1.2; gh.vz += Math.cos(gh.wob * 0.9 + gh.k * 2) * dt * 1.2;
          gh.y += (1.6 + Math.sin(gh.wob) * 0.5 - gh.y) * dt;
        }
        const sp = Math.hypot(gh.vx, gh.vz), max = gh.st === 1 ? 1.6 : gh.boss ? 2.6 : 2.0;
        if (sp > max) { gh.vx *= max / sp; gh.vz *= max / sp; }
        gh.vx *= Math.exp(-dt * 0.8); gh.vz *= Math.exp(-dt * 0.8);
        gh.x += gh.vx * dt; gh.z += gh.vz * dt;
        if (Math.abs(gh.x) > RW / 2 - 0.6) { gh.x = Math.sign(gh.x) * (RW / 2 - 0.6); gh.vx *= -1; }
        if (gh.z > r.z + RD / 2 - 0.6) { gh.z = r.z + RD / 2 - 0.6; gh.vz *= -1; }
        if (gh.z < r.z - RD / 2 + 0.6) { gh.z = r.z - RD / 2 + 0.6; gh.vz *= -1; }
      }
      // the room's clear: open the door
      if (H.ph === 'hunt' && H.ghosts.every((g) => g.st === 3) && H.room < ROOMS.length - 1 && !H.open.includes(H.room)) {
        H.open.push(H.room); say(`The ${ROOMS[H.room].name.toLowerCase()} is clear! The door creaks open`); sfx('gate', 0.8);
        forcePresence();
      }
      // walk through into the next room and its ghosts appear
      if (H.open.includes(H.room) && H.room < ROOMS.length - 1 && playerPositions().some(([, p]) => roomOfZ(p.z) === H.room + 1)) {
        fillRoom(H.room + 1);
        say(`The ${ROOMS[H.room].name.toLowerCase()}: ${ROOMS[H.room].boss ? 'the Phantom Duke is here!' : `${H.ghosts.length} ghosts`}`); sfx('chains', 0.5);
      }
    }
    L.hostStep = hostStep;
    function finish() {
      H.ph = 'won';
      const t = Math.round(H.time * 10) / 10;
      if (!H.best || t < H.best) { H.best = t; prefs.hauntBest = t; savePrefs(); }
      RECORDS.add(L, 'time', t);
      say(`The mansion is free! ${H.caught} ghosts caught in ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
      state.dirtyBoard = true;
      forcePresence();
    }
    // ---------------------------------------------------------------- my courage
    const ME = { courage: 5, faint: 0, seenBoo: 0 };
    function scared() {
      ME.courage -= 1;
      sfx('hurt', 0.8); tone(200, 80, 0.5, 'sawtooth', 0.15);
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 1, 200);
      if (ui.hurt && state.mode === 'flat') { ui.hurt.style.opacity = '0.8'; setTimeout(() => { ui.hurt.style.opacity = '0'; }, 350); }
      if (ME.courage <= 0) {
        showToast('BOO! You fainted… you wake up by the door');
        ME.courage = 5; ME.faint = 2;
        const c = new V3(); camera.getWorldPosition(c);
        const r = ROOMS[Math.max(0, roomOfZ(c.z))];
        dolly.position.x += 0 - c.x; dolly.position.z += r.z + RD / 2 - 0.8 - c.z;
      } else showToast(`BOO! (courage ${'♥'.repeat(ME.courage)}${'♡'.repeat(5 - ME.courage)})`);
    }

    // ---------------------------------------------------------------- network
    const PH = ['idle', 'hunt', 'won'];
    const r2 = (x) => Math.round(x * 100) / 100;
    function snapshot() {
      return { g: H.g, ph: PH.indexOf(H.ph), rm: H.room, gh: H.ghosts.flatMap((g) => [r2(g.x), r2(g.y), r2(g.z), Math.round(g.meter * 20), g.st, g.boss ? 1 : 0]), bh: H.bossHp, o: H.open.slice(), b: H.boo.slice(), c: H.caught, t: Math.round(H.time), m: [H.msgSeq, H.msg] };
    }
    function validSnap(q) {
      return q && Number.isInteger(q.g) && Number.isInteger(q.ph) && q.ph >= 0 && q.ph < 3 && Number.isInteger(q.rm) && q.rm >= 0 && q.rm < ROOMS.length
        && Array.isArray(q.gh) && q.gh.length % 6 === 0 && q.gh.length <= 6 * 16 && q.gh.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 200)
        && Number.isInteger(q.bh) && Array.isArray(q.o) && q.o.every((x) => Number.isInteger(x)) && Array.isArray(q.b) && q.b.length === 2 && Number.isInteger(q.b[0]) && typeof q.b[1] === 'string'
        && Number.isInteger(q.c) && Number.isInteger(q.t) && Array.isArray(q.m) && q.m.length === 2 && Number.isInteger(q.m[0]) && typeof q.m[1] === 'string' && q.m[1].length < 200;
    }
    let seenMsg = -1;
    function applySnap(q) {
      const prevRoom = H.room, prevPh = H.ph;
      H.g = q.g; H.ph = PH[q.ph]; H.room = q.rm; H.bossHp = q.bh; H.open = q.o.slice(); H.caught = q.c; H.time = q.t;
      const n = q.gh.length / 6;
      if (H.ghosts.length !== n || prevRoom !== H.room) H.ghosts = [];
      for (let k = 0; k < n; k++) {
        const a = q.gh.slice(k * 6, k * 6 + 6);
        const g = H.ghosts[k] || (H.ghosts[k] = { x: a[0], y: a[1], z: a[2], wob: rand() * 10 });
        g.tx = a[0]; g.ty = a[1]; g.tz = a[2]; g.meter = a[3] / 20; if (g.st !== 2 && a[4] === 2) { sfx('zap', 0.5); } g.st = a[4]; g.boss = !!a[5];
      }
      if (prevPh === 'hunt' && H.ph === 'won' && q.t > 0) RECORDS.add(L, 'time', q.t);
      if (q.b[0] !== ME.seenBoo) { if (ME.seenBoo && q.b[1] === state.myPeer) scared(); ME.seenBoo = q.b[0]; }
      if (seenMsg >= 0 && q.m[0] !== seenMsg && q.m[1]) showToast(q.m[1]);
      seenMsg = q.m[0];
    }
    L.presence = () => {
      const p = { hm: [Math.round((H.best || 0) * 10)] };
      if (isHost() && state.level === L.idx) p.hq = snapshot();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      const a = pres.hm;
      if (Array.isArray(a) && a.length === 1 && Number.isInteger(a[0]) && a[0] >= 0) { if (!st.hm || st.hm[0] !== a[0]) state.dirtyBoard = true; st.hm = a; } else st.hm = null;
      if (pres.hq && validSnap(pres.hq)) { st.hq = pres.hq; if (!isHost() && rec.peer === humansHere()[0]) applySnap(pres.hq); } else st.hq = null;
    };

    // ---------------------------------------------------------------- per frame
    let flash = 0, nextFlash = 6;
    const _t = new V3();
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) return;
      if (isHost()) hostStep(dt);
      else { const k = 1 - Math.exp(-dt * 10); for (const g of H.ghosts) if (g.tx !== undefined) { g.x += (g.tx - g.x) * k; g.y += (g.ty - g.y) * k; g.z += (g.tz - g.z) * k; } }
      // VR: A or X starts the hunt
      if (state.mode === 'vr') {
        let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !ME.aPrev && H.ph !== 'hunt') { if (isHost()) startHunt(); else showToast('The first player in the room starts the hunt'); }
        ME.aPrev = a;
      }
      // my flashlight
      const vr = state.mode === 'vr' && myHands.right.ok;
      const src = vr ? myHands.right : null;
      if (src) { myTorch.position.copy(src.pos); myTorch.quaternion.copy(src.quat); }
      else { myTorch.position.set(0.18, -0.2, -0.3).applyQuaternion(myHead.quat).add(myHead.pos); myTorch.quaternion.copy(myHead.quat); }
      myTorch.visible = true;
      _d.set(0, 0, -1).applyQuaternion(myTorch.quaternion);
      spot.position.copy(myTorch.position).addScaledVector(_d, 0.17); spotTarget.position.copy(spot.position).addScaledVector(_d, 4);
      myCone.position.copy(spot.position); myCone.quaternion.copy(myTorch.quaternion);
      myCone.visible = vr;
      // the others' beams
      for (const rec of remotes.values()) {
        let c = otherBeams.get(rec.peer);
        const show = rec.lv === L.idx && rec.inGame && (rec.hasR || rec.hasH);
        if (!c && show) { c = { cone: new THREE.Mesh(coneGeo, coneMat.clone()), torch: makeTorch() }; c.cone.material.opacity = 0.12; L.overlay.add(c.cone, c.torch); otherBeams.set(rec.peer, c); }
        if (!c) continue;
        c.cone.visible = c.torch.visible = show;
        if (!show) continue;
        const pp = rec.hasR ? rec.cur.r : rec.cur.h;
        c.torch.position.copy(pp.pos); c.torch.quaternion.copy(pp.quat);
        _t.set(0, 0, -0.17).applyQuaternion(pp.quat); c.cone.position.copy(pp.pos).add(_t); c.cone.quaternion.copy(pp.quat);
      }
      // ghosts
      ghostMeshes.forEach((m) => { m.g.visible = false; });
      bossMesh.g.visible = false;
      let gi = 0;
      for (const gh of H.ghosts) {
        if (gh.st === 3 || H.ph === 'idle') continue;
        const m = gh.boss ? bossMesh : ghostMeshes[gi++];
        if (!m) continue;
        m.g.visible = true;
        let x = gh.x, y = gh.y + Math.sin(now * 0.003 + (gh.k || 0)) * 0.08, z = gh.z, s = gh.boss ? 2.2 : 1;
        if (gh.st === 2) {
          // sucked into the nearest light
          const u = Math.min(1, gh.meter / 1.6);
          const b = beams()[0][0];
          x += (b.x - x) * u; y += (b.y - y) * u; z += (b.z - z) * u; s *= Math.max(0.05, 1 - u);
          m.g.rotation.y += dt * 12;
        } else {
          m.g.rotation.y = Math.atan2(-(myHead.pos.x - x), -(myHead.pos.z - z));
          const shiver = gh.meter > 0 ? (Math.random() - 0.5) * 0.06 * (1 + gh.meter * 3) : 0;
          x += shiver; z += shiver;
          s *= 1 - gh.meter * 0.35;
        }
        m.g.position.set(x, y, z); m.g.scale.setScalar(s);
        m.m.emissive.setHex(gh.meter > 0.05 && gh.st !== 2 ? (Math.floor(now / 70) % 2 ? 0xa0c0ff : 0x405a7a) : gh.st === 1 ? 0x5a2a6a : 0x405a7a);
        m.m.opacity = gh.st === 1 ? 0.45 : 0.82; const sk = m.g.userData.skirt.material; sk.emissive.copy(m.m.emissive); sk.opacity = m.m.opacity;
      }
      // doors swing open
      doors.forEach((d, i) => { const want = H.open.includes(i) ? 1 : 0; d.open += (want - d.open) * Math.min(1, dt * 1.5); d.g.rotation.y = d.open * 1.6; d.lock.visible = !want; });
      // candles flicker; lightning now and then
      for (const c of candles) { const f = 0.85 + Math.sin(now * 0.013 + c.ph) * 0.08 + Math.sin(now * 0.031 + c.ph * 2) * 0.07; c.gl.scale.set(0.5 * c.s * f, 0.5 * c.s * f, 1); c.f.scale.y = f; }
      nextFlash -= dt;
      if (nextFlash <= 0) { flash = 0.35; nextFlash = 8 + Math.random() * 12; setTimeout(() => sfx('thump', 0.5), 600); }
      if (flash > 0) { flash -= dt; hemi.intensity = L.env.hemi[2] + (Math.floor(flash * 20) % 2 ? 1.2 : 0.2); win.material.color.setHex(0xc8d8ff); if (flash <= 0) { hemi.intensity = L.env.hemi[2]; win.material.color.setHex(0x1a2040); } }
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const left = H.ghosts.filter((g) => g.st < 2 && !g.boss).length;
        const txt = H.ph === 'idle' ? 'Haunted Mansion  ·  press Space to start the ghost hunt' : H.ph === 'won' ? `The mansion is free!  ·  ${H.caught} ghosts  ·  press Space to play again`
          : `${ROOMS[H.room].name}  ·  ${ROOMS[H.room].boss ? `Phantom Duke ${'★'.repeat(Math.max(0, H.bossHp))}  ·  ` : ''}${left} ghost${left === 1 ? '' : 's'} left  ·  courage ${'♥'.repeat(ME.courage)}${'♡'.repeat(5 - ME.courage)}  ·  ${H.caught} caught`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    // no going past a door that's still shut
    L.clampPlayer = (head) => {
      let dx = 0, dz = 0;
      if (head.x < -RW / 2 + 0.3) dx = -RW / 2 + 0.3 - head.x; else if (head.x > RW / 2 - 0.3) dx = RW / 2 - 0.3 - head.x;
      const r = roomOfZ(head.z);
      const doorZ = ROOMS[r].z - RD / 2 - 0.5;
      const open = H.open.includes(r) && r < ROOMS.length - 1;
      if (!open && head.z < doorZ + 0.3) dz = doorZ + 0.3 - head.z;
      else if (open && head.z < doorZ + 0.3 && head.z > doorZ - 0.3 && Math.abs(head.x) > DOOR - 0.25) dz = doorZ + 0.3 - head.z;   // through the doorway only
      if (head.z > ROOMS[0].z + RD / 2 + 0.2) dz = ROOMS[0].z + RD / 2 + 0.2 - head.z;
      return [dx, dz];
    };
    L.deskFire = () => { if (H.ph !== 'hunt') { if (isHost()) startHunt(); else showToast('The first player in the room starts the hunt'); } };
    L.throwLabel = () => (H.ph === 'hunt' ? '…' : 'Start');
    L.rowFor = (st, isMe) => { const b = isMe ? H.best : st.hm ? st.hm[0] / 10 : 0; return { best: b || 1e9, text: b ? `freed the mansion in ${Math.floor(b / 60)}:${String(Math.floor(b % 60)).padStart(2, '0')}` : 'not yet' }; };
    L.sortRows = (a, b) => (a.best || 1e9) - (b.best || 1e9);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, RW / 2 - 0.06, 1.7, ROOMS[0].z + 1.2, -Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#140c18'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#8a6aaa'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#d8c0ff'; g.font = `800 56px ${DISPLAY}`; g.fillText('Ghostbusting times', 36, 80);
      g.fillStyle = '#b8a8c8'; g.font = `400 24px ${BODY}`; g.fillText('Five rooms, then the Phantom Duke in the attic', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, -RW / 2 + 0.6, ROOMS[0].z + 4.2, Math.PI / 2);
    RECORDS.def(L, [{ k: 'time', label: 'Fastest to free the mansion', low: true, fmt: 'time' }]);
    L.hudActions = [{ label: () => (H.ph === 'hunt' ? 'Restart hunt' : 'Start hunt'), run: () => { if (isHost()) startHunt(); else showToast('The first player in the room starts the hunt'); } }];
    L.hints = [['A / X', 'start the hunt'], ['Flashlight', 'in your right hand: hold a ghost in the beam'], ['BOO!', 'keep the light moving, they sneak up']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Mouse', 'point the flashlight'], ['WASD', 'walk'], ['Hold a ghost', 'in the beam until it’s sucked in']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, ROOMS[0].z + 3.5); if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0; } };
    L.onEnter = () => { seenMsg = -1; ME.courage = 5; flash = 0; spot.visible = true; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; hemi.intensity = L.env.hemi[2]; spot.visible = false; if (isHost() && H.ph === 'hunt') H.ph = 'idle'; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 1.8, ROOMS[0].z + 4.5); camera.lookAt(0, 1.4, ROOMS[0].z - 4); };
    L.hauntInternals = { H, ME, startHunt, hostStep, fillRoom, beams, lit, snapshot, applySnap, validSnap, ROOMS, roomOfZ };
    MUSIC_THEMES.haunted = { gain: 0.55, bpm: 72, swing: 0, chords: ['Am', 'Dm', 'E', 'Am'], comp: { inst: 'musicbox', at: [0, 3, 6, 9, 12], dur: 0.3 }, bass: { at: [0, 8] }, drums: {}, cut: 2400 };
    return L;
  })();
