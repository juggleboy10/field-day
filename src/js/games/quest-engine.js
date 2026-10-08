  // ================================================================ QUEST ENGINE (Sunstone Keep, Skyline Siege, Hexwood Hollow)
  // Each quest is an open world: areas where the fighting happens, joined by wide paths that bend,
  // with themed boundaries (castle walls, tree lines, rooftop railings) instead of corridors.
  // a round shield, strapped on so its face points where your hand points
  TOOL_MESH.shield = () => {
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a32, emissive: 0x000000 });
    const metal = new THREE.MeshLambertMaterial({ color: 0xc8ccd8, emissive: 0x000000 });
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 24), wood); face.rotation.x = Math.PI / 2; face.position.set(0, 0.03, -0.14);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 6, 24), metal); rim.position.set(0, 0.03, -0.158);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal); boss.rotation.x = -Math.PI / 2; boss.position.set(0, 0.03, -0.16);
    g.add(face, rim, boss);
    g.userData.mats = [wood, metal];
    return g;
  };
  function makeQuest(cfg) {
    const L = newLevel(cfg.idx);
    const G = L.group;
    const rand = mulberry32(cfg.seed);
    const TH = cfg.theme;
    const PW = cfg.pathW || 6, GATE_H = 3.4;
    const ROOMS = cfg.rooms.map((r) => Object.assign({}, r));
    for (const r of ROOMS) { r.x0 = r.cx - r.w / 2; r.x1 = r.cx + r.w / 2; r.z0 = r.cz - r.d / 2; r.z1 = r.cz + r.d / 2; }
    // a path from each area's north edge to the next area's south edge, bending if they don't line up
    const PATHS = [];
    for (let i = 0; i < ROOMS.length - 1; i++) {
      const r = ROOMS[i], n = ROOMS[i + 1];
      const ax = clamp(n.cx, r.x0 + PW / 2 + 0.6, r.x1 - PW / 2 - 0.6);
      const bx = clamp(ax, n.x0 + PW / 2 + 0.6, n.x1 - PW / 2 - 0.6);
      const zA = r.z0, zB = n.z1, zm = (zA + zB) / 2;
      const segs = [];
      if (Math.abs(ax - bx) < 0.6) segs.push({ x0: ax - PW / 2, x1: ax + PW / 2, z0: zB, z1: zA, kind: 'only' });
      else {
        segs.push({ x0: ax - PW / 2, x1: ax + PW / 2, z0: zm - PW / 2, z1: zA, kind: 'first' });
        segs.push({ x0: Math.min(ax, bx) - PW / 2, x1: Math.max(ax, bx) + PW / 2, z0: zm - PW / 2, z1: zm + PW / 2, kind: 'mid' });
        segs.push({ x0: bx - PW / 2, x1: bx + PW / 2, z0: zB, z1: zm + PW / 2, kind: 'last' });
      }
      const mid = segs[segs.length > 1 ? 1 : 0];
      PATHS.push({ ax, bx, zA, zB, zm, segs, center: new V3((mid.x0 + mid.x1) / 2, 0, (mid.z0 + mid.z1) / 2) });
    }
    L.ROOMS = ROOMS;
    L.PATHS = PATHS;
    L.cfg = cfg;
    L.env = cfg.env;
    const ALL = [...ROOMS, ...PATHS.flatMap((p) => p.segs)];
    const playable = (x, z, m) => ALL.some((r) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m);

    // instanced props, so hundreds of stones or trees cost only a few draw calls
    const batches = new Map();
    const YAXIS = new V3(0, 1, 0);
    const _m4 = new THREE.Matrix4(), _q = new Q4(), _p = new V3(), _s = new V3(), _col = new THREE.Color();
    function inst(key, geo, mat, x, y, z, sx, sy, sz, ry, color) {
      let b = batches.get(key);
      if (!b) { b = { geo, mat, items: [] }; batches.set(key, b); }
      b.items.push([x, y, z, sx, sy, sz, ry || 0, color]);
    }
    function flushInstances() {
      for (const b of batches.values()) {
        const im = new THREE.InstancedMesh(b.geo, b.mat, b.items.length);
        b.items.forEach(([x, y, z, sx, sy, sz, ry, color], i) => {
          _q.setFromAxisAngle(YAXIS, ry);
          _m4.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
          im.setMatrixAt(i, _m4);
          if (color !== undefined) im.setColorAt(i, _col.set(color));
        });
        im.frustumCulled = false;
        G.add(im);
      }
    }

    // ground, area floors, paths
    const tex = (w, h, fn, rx, ry) => { const t = canvasTexture(w, h, (g) => fn(g, rand)).tex; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry); return t; };
    const groundY = TH.groundY || 0;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ map: tex(256, 256, TH.ground, 90, 90) }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, groundY, -50);
    G.add(ground);
    const floorMat = new THREE.MeshLambertMaterial({ map: tex(256, 256, TH.floor) });
    const pathMat = new THREE.MeshLambertMaterial({ map: tex(256, 256, TH.path || TH.floor) });
    function surface(r, mat, y) {
      const w = r.x1 - r.x0, d = r.z1 - r.z0;
      const geo = new THREE.PlaneGeometry(w, d);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 3, uv.getY(i) * d / 3);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
      G.add(m);
      if (TH.slab) {
        // rooftops and bridges are slabs high above the street
        const slab = new THREE.Mesh(boxg(w, 0.5, d), lam(TH.slab));
        slab.position.set((r.x0 + r.x1) / 2, y - 0.26, (r.z0 + r.z1) / 2);
        G.add(slab);
      }
    }
    for (const r of ROOMS) surface(r, floorMat, 0.01);
    // each piece of a bending path sits a few millimetres apart, so the corners where they overlap can't flicker
    const SEG_Y = { only: 0.012, first: 0.012, mid: 0.016, last: 0.02 };
    for (const p of PATHS) for (const s of p.segs) surface(s, pathMat, SEG_Y[s.kind]);
    if (TH.slab) {
      // each rooftop sits on its own tower; bridges rest on thin piers
      const bt = tex(64, 128, (g) => { g.fillStyle = '#141a2c'; g.fillRect(0, 0, 64, 128); for (let y = 4; y < 128; y += 10) for (let x = 3; x < 64; x += 8) { const v = rand(); g.fillStyle = v < 0.3 ? '#ffd08a' : v < 0.38 ? '#7ad8ff' : '#1e2640'; g.fillRect(x, y, 4, 6); } });
      const h = -groundY - 0.5;
      for (const r of ROOMS) {
        const geo = new THREE.BoxGeometry(r.x1 - r.x0 - 0.6, h, r.z1 - r.z0 - 0.6);
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (r.x1 - r.x0) / 8, uv.getY(i) * h / 12);
        const b = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: bt, color: 0xc8d0ff }));
        b.position.set(r.cx, groundY + h / 2, r.cz);
        G.add(b);
      }
      const pierGeo = new THREE.CylinderGeometry(0.25, 0.3, 1, 8), pierMat = lam(0x3a4052);
      for (const p of PATHS) for (const s of p.segs) {
        const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
        if (ROOMS.some((r) => cx > r.x0 && cx < r.x1 && cz > r.z0 && cz < r.z1)) continue;
        inst('pier', pierGeo, pierMat, cx, groundY / 2 - 0.5, cz, 1, -groundY, 1);
      }
    }

    // boundaries: walk every edge and line the outside with the theme's props, leaving openings where paths join
    const torches = [];
    const lightCol = TH.wallLightColor || 0xffb060;
    const flameMat = new THREE.SpriteMaterial({ map: warmGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: lightCol });
    const coreMat = new THREE.SpriteMaterial({ map: paleSunTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffe6b0 });
    const ironMat = lam(0x2e2b33);
    const ctx = { L, G, ROOMS, PATHS, rand, torches, flameMat, coreMat, ironMat, inst, playable, groundY };
    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1, 6), postMat = lam(0x3a2a20);
    const poleGeo = boxg(0.12, 1, 0.12), poleMat = lam(0x2a3040);
    function lightAt(x, z) {
      const y = TH.wallLight === 'neon' ? 2.3 : TH.wallLight === 'lantern' ? 2.4 : 2.0;
      if (TH.wallLight === 'neon') inst('npole', poleGeo, poleMat, x, 1.1, z, 1, 2.2, 1);
      else if (TH.wallLight !== 'lantern') inst('tpost', postGeo, postMat, x, 0.9, z, 1, 1.8, 1);
      const glow = new THREE.Sprite(flameMat); glow.position.set(x, y, z); glow.scale.set(0.9, 0.9, 1);
      const core = new THREE.Sprite(coreMat); core.position.set(x, y, z); core.scale.set(0.22, 0.3, 1);
      G.add(glow, core);
      torches.push({ glow, core, phase: rand() * 100, float: TH.wallLight === 'lantern', y0: y, bx: x, bz: z });
    }
    let lightGap = 0;
    const placedEdges = [];
    for (const r of ALL) {
      const sides = [[r.x0, r.z1, r.x0, r.z0, -1, 0], [r.x1, r.z0, r.x1, r.z1, 1, 0], [r.x0, r.z0, r.x1, r.z0, 0, -1], [r.x1, r.z1, r.x0, r.z1, 0, 1]];
      for (const [ax, az, bx, bz, nx, nz] of sides) {
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / (TH.edgeStep || 2)));
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          if (playable(x + nx * 0.7, z + nz * 0.7, -0.05)) continue;
          const ex = x + nx * 0.35, ez = z + nz * 0.35;
          if (placedEdges.some(([px, pz]) => Math.abs(px - ex) < 0.6 && Math.abs(pz - ez) < 0.6)) continue;
          placedEdges.push([ex, ez]);
          if (TH.edgeProp) TH.edgeProp(ctx, ex, ez, nx, nz, len / n);
          // lights stand clear of the wall blocks (the old spot was right on the wall's inner face, so the glow sat half inside it)
          const lo = TH.lightOff !== undefined ? TH.lightOff : 0.15;
          if (++lightGap % (TH.lightEvery || 4) === 0) lightAt(x + nx * lo, z + nz * lo);
        }
      }
    }
    for (const [i, r] of ROOMS.entries()) {
      const light = new THREE.PointLight(i === ROOMS.length - 1 ? TH.vaultLight : TH.roomLight, TH.lightIntensity || 1.5, Math.max(r.w, r.d) * 1.3, 1.2);
      light.position.set(r.cx, 4.2, r.cz);
      G.add(light);
      r.light = light;
    }
    L.torches = torches;

    // gates at the start of each path: iron bars, a sliding door, or a magic ward, inside a fixed frame
    L.gates = [];
    const gateCol = TH.gateColor || 0x2e2b33;
    const frameMat = lam(TH.gateFrame || 0x4a4552);
    PATHS.forEach((p) => {
      const g = new THREE.Group();
      const W = PW;
      if (TH.gate === 'door') {
        const panel = new THREE.Mesh(boxg(W, GATE_H, 0.14), lam(gateCol)); panel.position.y = GATE_H / 2;
        const stripe = new THREE.Mesh(boxg(W + 0.02, 0.1, 0.16), new THREE.MeshBasicMaterial({ color: lightCol })); stripe.position.y = GATE_H * 0.55;
        g.add(panel, stripe);
      } else if (TH.gate === 'ward') {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(W, GATE_H), new THREE.MeshBasicMaterial({ color: gateCol, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
        m.position.y = GATE_H / 2;
        g.add(m);
        g.userData.ward = m;
      } else {
        const nb = Math.round(W / 0.45);
        for (let k = 0; k <= nb; k++) { const bar = new THREE.Mesh(boxg(0.07, GATE_H, 0.07), ironMat); bar.position.set(-W / 2 + k * (W / nb), GATE_H / 2, 0); g.add(bar); }
        for (const y of [0.6, 1.7, 2.8]) { const bar = new THREE.Mesh(boxg(W, 0.07, 0.07), ironMat); bar.position.set(0, y, 0); g.add(bar); }
      }
      g.position.set(p.ax, 0, p.zA);
      G.add(g);
      for (const sx of [-1, 1]) addBox(G, 0.5, GATE_H + 1.0, 0.6, frameMat, p.ax + sx * (W / 2 + 0.25), (GATE_H + 1.0) / 2, p.zA);
      addBox(G, W + 1.0, 0.5, 0.6, frameMat, p.ax, GATE_H + 0.75, p.zA);
      L.gates.push({ g, y: 0 });
    });

    // armory racks in the first area
    const woodMat = lam(TH.rackColor || 0x5a3a22);
    addBox(G, 0.12, 0.08, 3.0, woodMat, -4.62, 1.1, 0);
    addBox(G, 0.3, 0.12, 3.0, woodMat, -4.55, 0.06, 0);
    for (const z of [-1.5, 1.5]) addBox(G, 0.08, 1.1, 0.08, woodMat, -4.62, 0.55, z);
    const downQ = new Q4().setFromUnitVectors(FWD, new V3(0, -1, 0));
    const west = cfg.racks.west || [], east = cfg.racks.east || [];
    const spacing = (n, max) => Math.min(max, 2.8 / Math.max(1, n - 1));
    west.forEach((kind, k) => makeTool(L, new V3(-4.45, 1.22, (k - (west.length - 1) / 2) * spacing(west.length, 0.62)), downQ, kind));
    addBox(G, 1.0, 0.08, 3.0, woodMat, 4.3, 0.88, 0);
    for (const [dx, dz] of [[-0.42, -1.4], [0.42, -1.4], [-0.42, 1.4], [0.42, 1.4]]) addBox(G, 0.08, 0.84, 0.08, woodMat, 4.3 + dx, 0.42, dz);
    const flatQ = new Q4();
    east.forEach((kind, k) => makeTool(L, new V3(4.3, 0.98, (k - (east.length - 1) / 2) * spacing(east.length, 0.68) + 0.2), flatQ, kind));

    // the goal in the last area, and the theme's own landmarks
    const VAULT0 = ROOMS[ROOMS.length - 1];
    Object.assign(ctx, { woodMat, VAULT: VAULT0 });
    if (cfg.decorate) cfg.decorate(ctx);
    // scenery that stands where you can walk (altars, consoles, racks, pillars, standing stones) is solid
    const SOLIDS = [];
    {
      const inside = (x, z) => playable(x, z, 0);
      for (const g of L.gates) g.g.traverse((o) => { o.userData.noSolid = true; });
      for (const t of L.tools) t.g.traverse((o) => { o.userData.noSolid = true; });
      const bb = new THREE.Box3();
      G.updateMatrixWorld(true);
      G.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || o.userData.noSolid) return;
        bb.setFromObject(o);
        if (bb.max.y < 0.7 || bb.min.y > 0.5 || bb.max.x - bb.min.x > 10 || bb.max.z - bb.min.z > 10) return;
        if (!inside((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2)) return;
        SOLIDS.push([bb.min.x, bb.max.x, bb.min.z, bb.max.z]);
      });
      for (const [batchKey, b] of batches) {
        if (!b.geo.boundingBox) b.geo.computeBoundingBox();
        const gb = b.geo.boundingBox, rx = Math.max(Math.abs(gb.min.x), Math.abs(gb.max.x)), rz = Math.max(Math.abs(gb.min.z), Math.abs(gb.max.z));
        if (batchKey === 'tpost' || batchKey === 'npole') continue;   // torch and light posts are slim: no collision bumps
        for (const [x, y, z, sx, sy, sz, ry] of b.items) {
          const top = y + gb.max.y * Math.abs(sy), bot = y + gb.min.y * Math.abs(sy);
          if (top < 0.7 || bot > 0.5 || !inside(x, z)) continue;
          let hx = rx * Math.abs(sx), hz = rz * Math.abs(sz);
          if (ry) { const h = Math.hypot(hx, hz); hx = hz = h; }
          SOLIDS.push([x - hx, x + hx, z - hz, z + hz]);
        }
      }
    }
    L.SOLIDS = SOLIDS;
    flushInstances();
    addCyl(G, 0.32, 0.42, 1.0, 16, lam(TH.pedestal || 0x4a4552), VAULT0.cx, 0.5, VAULT0.cz);
    const goal = cfg.goal.make(ctx);
    goal.mesh.position.set(VAULT0.cx, 1.32, VAULT0.cz);
    G.add(goal.mesh);
    const goalGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: cfg.goal.glow || 0xffd060 }));
    goalGlow.position.copy(goal.mesh.position);
    goalGlow.scale.set(1.6, 1.6, 1);
    G.add(goalGlow);
    L.sunstone = goal.mesh;
    L.sunGlow = goalGlow;
    L.SUN_HOME = goal.mesh.position.clone();

    const inRect = (p, r, m) => p.x > r.x0 + m && p.x < r.x1 - m && p.z > r.z0 + m && p.z < r.z1 - m;
    L.inRect = inRect;
    L.roomAt = (p) => ROOMS.findIndex((r) => inRect(p, r, 0));
    L.walkable = (p) => playable(p.x, p.z, -0.3);
    const WALL_TOP = 14;
    const CORR_H = GATE_H;
    // where you come back after going down, and the path ground you may walk on
    L.checkpointAt = (pg) => (pg <= 0 ? new V3(0, 0, 2.5) : PATHS[Math.min(pg, PATHS.length) - 1].center.clone());
    L.pathRects = (i) => PATHS[i].segs.map((s) => [s.x0, s.x1, s.kind === 'last' || s.kind === 'only' ? s.z0 - 0.8 : s.z0, s.kind === 'first' || s.kind === 'only' ? s.z1 + 0.8 : s.z1]);

    // ---------------------------------------------------------------- enemies
    function enemyMesh(type) {
      const T = ENEMIES[type];
      const g = new THREE.Group();
      const mats = [];
      const M = (hex, emis) => { const m = new THREE.MeshLambertMaterial({ color: hex, emissive: emis || 0x000000 }); m.userData.base = emis || 0; mats.push(m); return m; };
      const arm = new THREE.Group();
      T.mesh(g, arm, M);
      g.add(arm);
      const bar = new THREE.Group();
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.08), new THREE.MeshBasicMaterial({ color: 0x1b1932, depthWrite: false, transparent: true, opacity: 0.8 }));
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.06), new THREE.MeshBasicMaterial({ color: 0xff4d5a, depthWrite: false, transparent: true }));
      fill.position.z = 0.001;
      bar.add(bg, fill);
      bar.position.y = T.fly ? T.h + 0.35 : T.h + (T.ai === 'boss' ? 0.45 : 0.25);
      bar.scale.x = T.ai === 'boss' ? 2.2 : 0.6;
      bar.visible = false;
      g.add(bar);
      const shadow = makeShadow(G, T.r * 2.2);
      G.add(g);
      return { g, mats, arm, bar, fill, shadow };
    }
    const slamRing = new THREE.Mesh(new THREE.RingGeometry(3.05, 3.3, 48), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    slamRing.rotation.x = -Math.PI / 2;
    slamRing.position.y = 0.02;
    slamRing.visible = false;
    G.add(slamRing);

    L.q = { r: 0, pg: 0, wave: 0, spawned: 0, done: 0 };
    L.enemies = new Map();
    L.projs = new Map();
    L.pickups = new Map();
    L.claimed = new Set();
    L.nextId = 1;
    const host = { waveT: 0, summonT: 0, projLog: [] };
    L.hostState = host;

    function makeEnemy(id, type, x, z, y) {
      const T = ENEMIES[type];
      const yy = y !== undefined ? y : T.fly || 0;
      const e = { id, type, x, z, y: yy, yaw: 0, hp: T.hp, hpMax: T.hp, st: 0, ac: 0, t: 0, cd: 1 + rand(), rx: x, rz: z, ry: yy, ryaw: 0, lastAc: 0, flash: 0, dieT: 0, room: L.roomAt(new V3(x, 0, z)), strafe: rand() < 0.5 ? 1 : -1, slowUntil: 0, fx: 0, burstLeft: 0, burstT: 0, dive: false };
      Object.assign(e, enemyMesh(type));
      e.g.position.set(x, yy, z);
      L.enemies.set(id, e);
      return e;
    }
    function removeEnemy(e) {
      G.remove(e.g);
      G.remove(e.shadow);
      for (const m of e.mats) m.dispose();
      L.enemies.delete(e.id);
    }
    L.makeEnemy = makeEnemy;
    L.removeEnemy = removeEnemy;
    function playerCount() {
      let n = 0;
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) n++;
      return n;
    }
    function spawnWave(roomIdx, wave) {
      const r = ROOMS[roomIdx];
      const n = 1 + playerCount();
      for (const [name, ox, oz] of r.waves[wave]) {
        const type = ENEMY[name];
        const e = makeEnemy(L.nextId++, type, r.cx + ox, r.cz + oz);
        const T = ENEMIES[type];
        if (T.ai === 'boss') { e.hp = e.hpMax = T.hp + (T.perPlayer || 8) * Math.min(4, n); host.summonT = performance.now() + 9000; sfx('roar', 0.9); }
      }
      forcePresence();
    }
    L.spawnWave = spawnWave;

    function dropLoot(e) {
      const T = ENEMIES[e.type];
      const boss = T.ai === 'boss';
      const coins = boss ? 14 : T.hp >= 4 ? 4 : 1 + Math.floor(rand() * 3);
      for (let k = 0; k < coins; k++) {
        const a = rand() * Math.PI * 2, d = 0.3 + rand() * (boss ? 1.6 : 0.6);
        L.pickups.set(L.nextId, { id: L.nextId, type: 0, x: e.x + Math.cos(a) * d, z: e.z + Math.sin(a) * d });
        L.nextId++;
      }
      if (rand() < (boss ? 1 : 0.25)) { L.pickups.set(L.nextId, { id: L.nextId, type: 1, x: e.x, z: e.z + 0.2 }); L.nextId++; }
      // keep the list from growing without end
      if (L.pickups.size > 28) { const old = Array.from(L.pickups.keys()).slice(0, L.pickups.size - 28); for (const id of old) L.pickups.delete(id); }
    }
    // the host applies damage reported by any player (including itself)
    L.damageEnemy = (id, dmg, fx) => {
      const e = L.enemies.get(id);
      if (!e || e.st === 3) return false;
      const T = ENEMIES[e.type];
      e.hp -= dmg;
      e.flash = 0.15;
      if (fx === 1) e.slowUntil = performance.now() + 3000;
      if (e.hp <= 0) {
        e.hp = 0; e.st = 3; e.t = 0.6;
        dropLoot(e);
        sfx('poof', 0.8 / (1 + Math.hypot(e.x - myHead.pos.x, e.z - myHead.pos.z) * 0.08));
        if (T.split) for (const s of [-1, 1]) makeEnemy(L.nextId++, ENEMY[T.split], e.x + s * 0.45, e.z + s * 0.2);
        if (T.death) { showToast(T.death); sfx('roar', 0.7); }
      } else if (T.ai !== 'boss' && T.ai !== 'turret') {
        const tgt = nearestTarget(e, currentTargets());
        if (tgt) { const dx = e.x - tgt.pos.x, dz = e.z - tgt.pos.z, d = Math.hypot(dx, dz) || 1; e.x += (dx / d) * 0.35; e.z += (dz / d) * 0.35; }
        if (e.st === 1 || e.st === 4) { e.st = 0; e.cd = 0.8; }
      }
      forcePresence();
      return true;
    };
    function currentTargets() {
      const list = [];
      if (state.mode !== 'menu' && !L.me.down) list.push({ id: state.myPeer, pos: myHead.pos });
      for (const rec of remotes.values()) {
        if (rec.lv !== L.idx || !rec.inGame || !rec.hasH) continue;
        const st = rec.lvState[L.id];
        if (st && st.down) continue;
        list.push({ id: rec.peer, pos: rec.cur.h.pos });
      }
      return list;
    }
    L.currentTargets = currentTargets;
    function nearestTarget(e, targets) {
      let best = null, bd = Infinity;
      for (const t of targets) {
        const d = Math.hypot(t.pos.x - e.x, t.pos.z - e.z);
        if (d < bd && (e.room < 0 || L.inRect(t.pos, ROOMS[e.room], -1.5))) { bd = d; best = t; }
      }
      if (best) best.d = bd;
      return best;
    }
    // enemy attacks
    const ARROW_G = (p) => PROJ_BY_CODE[p].gravity;
    function shoot(e, tgt, now, spreadAng) {
      const T = ENEMIES[e.type];
      const P = PROJ[T.proj || 'arrow'];
      const fwd = 0.35 + T.r * 0.4;
      const from = new V3(e.x - Math.sin(e.yaw) * fwd, T.fly ? e.y : T.h * 0.72, e.z - Math.cos(e.yaw) * fwd);
      const aim = new V3(tgt.pos.x + (rand() - 0.5) * 0.5, tgt.pos.y - 0.25, tgt.pos.z + (rand() - 0.5) * 0.5);
      if (spreadAng) {
        const dx = aim.x - from.x, dz = aim.z - from.z, c = Math.cos(spreadAng), s = Math.sin(spreadAng);
        aim.x = from.x + dx * c - dz * s; aim.z = from.z + dx * s + dz * c;
      }
      const dist = from.distanceTo(aim), Tt = dist / P.speed;
      const vel = aim.sub(from).divideScalar(Tt);
      vel.y += 0.5 * P.gravity * Tt;
      const id = L.nextId++;
      spawnProjectile(id, from, vel, P.code);
      host.projLog.push({ id, t0: now, pos: from.clone(), vel: vel.clone(), ptype: P.code });
      if (host.projLog.length > 12) host.projLog.shift();
    }
    function strike(e, tgt, now) {
      const T = ENEMIES[e.type];
      if (T.ai === 'ranged' || T.ai === 'turret' || (T.ai === 'flyer' && T.ranged)) {
        e.st = 2; e.cd = T.cool;
        if (T.burst) { e.burstLeft = T.burst; e.burstT = 0; e.t = 0.3 + T.burst * 0.18; }
        else { shoot(e, tgt, now); e.t = 0.35; }
      } else if (T.ai === 'charger') {
        const d = Math.hypot(tgt.pos.x - e.x, tgt.pos.z - e.z) || 1;
        e.st = 4; e.t = 0.75; e.dx = (tgt.pos.x - e.x) / d; e.dz = (tgt.pos.z - e.z) / d;
      } else if (T.ai === 'kamikaze') {
        e.ac += 1; e.hp = 0; e.st = 3; e.t = 0.4;
      } else if (T.ai === 'boss' && e.st === 5) {
        const n = T.boss.barrage;
        for (let k = 0; k < n; k++) shoot(e, tgt, now, ((k / (n - 1)) - 0.5) * 0.9);
        e.st = 2; e.t = 0.5; e.cd = T.cool;
      } else {
        e.st = 2; e.t = 0.35; e.ac += 1; e.cd = T.cool; e.dive = false;
      }
      forcePresence();
    }
    function hostStep(dt, now) {
      const q = L.q;
      const targets = currentTargets();
      if (q.pg > 0 && q.pg < ROOMS.length && ROOMS[q.pg].waves.length && !q.spawned) {
        if (targets.some((t) => L.inRect(t.pos, ROOMS[q.pg], 0.3))) { q.spawned = 1; q.wave = 0; spawnWave(q.pg, 0); }
      }
      for (const e of L.enemies.values()) {
        const T = ENEMIES[e.type];
        if (e.st === 3) { e.t -= dt; if (e.t <= 0) removeEnemy(e); continue; }
        const slow = e.slowUntil > now ? 0.45 : 1;
        e.fx = slow < 1 ? 1 : 0;
        const tgt = nearestTarget(e, targets);
        e.cd -= dt * slow;
        if (T.fly) {
          const want = e.dive && tgt ? tgt.pos.y - 0.2 : T.fly + Math.sin(now * 0.002 + e.id) * 0.25;
          e.y += (want - e.y) * Math.min(1, dt * (e.dive ? 4 : 2));
        }
        if (e.burstLeft > 0 && tgt) {
          e.burstT -= dt;
          if (e.burstT <= 0) { shoot(e, tgt, now); e.burstLeft -= 1; e.burstT = 0.18; }
        }
        if (!tgt) { if (e.st !== 2) e.st = 0; e.dive = false; continue; }
        const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, d = tgt.d || 0.001;
        const d3 = Math.hypot(dx, dz, tgt.pos.y - (T.fly ? e.y : 1.0));
        const want = Math.atan2(-dx, -dz);
        let dy = want - e.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        e.yaw += clamp(dy, -6 * dt, 6 * dt);
        if (e.st === 1 || e.st === 5) { e.t -= dt * slow; if (e.t <= 0) strike(e, tgt, now); continue; }
        if (e.st === 2) { e.t -= dt; if (e.t <= 0) { e.st = 0; e.dive = false; } continue; }
        if (e.st === 4) {
          e.t -= dt;
          e.x += e.dx * T.speed * 3.4 * slow * dt; e.z += e.dz * T.speed * 3.4 * slow * dt;
          if (d < T.reach) { e.st = 2; e.t = 0.5; e.ac += 1; e.cd = T.cool; forcePresence(); }
          else if (e.t <= 0) { e.st = 0; e.cd = T.cool; }
          continue;
        }
        let mx = 0, mz = 0;
        const ux = dx / d, uz = dz / d;
        const windup = (st) => { e.st = st || 1; e.t = T.windup; sfx(T.ai === 'boss' ? 'roar' : T.proj ? 'creak' : 'growl', 0.8 / (1 + d * 0.15)); forcePresence(); };
        if (T.ai === 'ranged' || (T.ai === 'flyer' && T.ranged)) {
          const [near, far] = T.keep || [4.5, 8];
          if (d < near) { mx -= ux; mz -= uz; } else if (d > far) { mx += ux; mz += uz; }
          mx += -uz * 0.5 * e.strafe; mz += ux * 0.5 * e.strafe;
          if (rand() < dt * 0.3) e.strafe *= -1;
          if (e.cd <= 0 && d < 13) { windup(); continue; }
        } else if (T.ai === 'turret') {
          if (e.cd <= 0 && d < 16) { windup(); continue; }
        } else if (T.ai === 'flyer') {
          if (e.cd <= 0 && d < 7) e.dive = true;
          if (e.dive) { mx = ux; mz = uz; if (d3 < T.reach + 0.2) { windup(); continue; } }
          else { mx = -uz * e.strafe + (d > 4 ? ux * 0.6 : d < 2.5 ? -ux * 0.6 : 0); mz = ux * e.strafe + (d > 4 ? uz * 0.6 : d < 2.5 ? -uz * 0.6 : 0); }
        } else if (T.ai === 'kamikaze') {
          mx = ux; mz = uz;
          if (d3 < T.reach) { windup(); continue; }
        } else if (T.ai === 'charger') {
          if (d > 2.2) { mx = ux; mz = uz; }
          if (e.cd <= 0 && d < 7.5) { windup(); continue; }
        } else if (T.ai === 'boss') {
          const B = T.boss;
          if (B.slam && e.cd <= 0 && d < T.reach + 0.1) { windup(1); continue; }
          if (B.barrage && e.cd <= 0 && (!B.slam || d >= T.reach + 0.1)) { windup(5); continue; }
          const stop = T.fly ? 5 : T.reach * 0.8;
          if (d > stop) { mx = ux; mz = uz; }
        } else {
          if (d > T.reach * 0.8) { mx = ux; mz = uz; }
          if (e.cd <= 0 && d < T.reach + 0.1) { windup(); continue; }
        }
        const ml = Math.hypot(mx, mz);
        if (ml > 0.01) { e.x += (mx / ml) * T.speed * slow * dt; e.z += (mz / ml) * T.speed * slow * dt; }
      }
      const list = Array.from(L.enemies.values()).filter((e) => e.st !== 3);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (!!ENEMIES[a.type].fly !== !!ENEMIES[b.type].fly) continue;
          const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = ENEMIES[a.type].r + ENEMIES[b.type].r;
          if (d < min && d > 1e-4) {
            const p = (min - d) / 2;
            const am = ENEMIES[a.type].speed ? 1 : 0, bm = ENEMIES[b.type].speed ? 1 : 0;
            a.x -= (dx / d) * p * am; a.z -= (dz / d) * p * am; b.x += (dx / d) * p * bm; b.z += (dz / d) * p * bm;
          }
        }
      }
      for (const e of list) {
        if (e.room < 0) continue;
        const r = ROOMS[e.room], m = ENEMIES[e.type].r + 0.2;
        e.x = clamp(e.x, r.x0 + m, r.x1 - m);
        e.z = clamp(e.z, r.z0 + m, r.z1 - m);
      }
      const boss = list.find((e) => ENEMIES[e.type].ai === 'boss');
      if (boss && now > host.summonT) {
        const B = ENEMIES[boss.type].boss;
        host.summonT = now + B.every;
        const kind = ENEMY[B.summon];
        if (list.filter((e) => e.type === kind).length < 3) {
          const r = ROOMS[boss.room];
          for (const sx of [-1, 1]) makeEnemy(L.nextId++, kind, r.cx + sx * (r.w / 2 - 1.5), r.z1 - 1.5);
          showToast(cfg.text.summon || 'Reinforcements are coming!');
          forcePresence();
        }
      }
      if (q.spawned && L.enemies.size === 0) {
        if (!host.waveT) host.waveT = now + 1600;
        else if (now > host.waveT) {
          host.waveT = 0;
          const waves = ROOMS[q.pg].waves;
          if (q.wave + 1 < waves.length) { q.wave += 1; spawnWave(q.pg, q.wave); showToast('More are coming!'); }
          else { q.pg += 1; q.spawned = 0; q.wave = 0; forcePresence(); }
        }
      } else host.waveT = 0;
      for (const id of L.claimed) if (L.pickups.has(id)) { L.pickups.delete(id); forcePresence(); }
      host.projLog = host.projLog.filter((p) => now - p.t0 < 1500);
    }
    L.hostStep = hostStep;

    // ---------------------------------------------------------------- enemy projectiles
    const arrowGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5);
    arrowGeo.rotateX(Math.PI / 2);
    const boltGeoE = new THREE.BoxGeometry(0.05, 0.05, 0.45);
    function spawnProjectile(id, pos, vel, ptype) {
      if (L.projs.has(id)) return;
      const P = PROJ_BY_CODE[ptype] || PROJ.arrow;
      let m;
      if (P === PROJ.arrow) m = new THREE.Mesh(arrowGeo, lam(P.color));
      else if (P === PROJ.laser) {
        m = new THREE.Group();
        m.add(new THREE.Mesh(boltGeoE, new THREE.MeshBasicMaterial({ color: 0xffd0d8 })));
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: P.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        s.scale.set(0.7, 0.7, 1); m.add(s);
      } else {
        m = new THREE.Group();
        m.add(new THREE.Mesh(sph(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0b0 })));
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: P.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        s.scale.set(0.9, 0.9, 1); m.add(s);
      }
      G.add(m);
      L.projs.set(id, { id, pos: pos.clone(), vel: vel.clone(), ptype, mesh: m, age: 0, dead: false });
      sfx(P === PROJ.laser ? 'laser' : 'arrow', 0.6 / (1 + pos.distanceTo(myHead.pos) * 0.1));
    }
    L.spawnProjectile = spawnProjectile;
    const _pq = new Q4(), _pv = new V3();
    L.stepProjectiles = (dt) => {
      for (const p of L.projs.values()) {
        p.age += dt;
        if (!p.dead) {
          p.vel.y -= ARROW_G(p.ptype) * dt;
          p.pos.addScaledVector(p.vel, dt);
          if (!L.walkable(p.pos) || p.pos.y < 0.02 || p.pos.y > WALL_TOP) { p.dead = true; p.age = Math.max(p.age, 2.2); }
          else if (L.onArrow) L.onArrow(p);
        }
        p.mesh.position.copy(p.pos);
        if (p.vel.lengthSq() > 1e-4) p.mesh.quaternion.copy(_pq.setFromUnitVectors(FWD, _pv.copy(p.vel).normalize()));
        if (p.dead && p.ptype !== 0) p.mesh.visible = false;
        if (p.age > 3) { G.remove(p.mesh); L.projs.delete(p.id); }
      }
    };

    // ---------------------------------------------------------------- loot
    const coinGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 14);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshLambertMaterial({ color: 0xf2c14e, emissive: 0x4a3000 });
    const potionMat = new THREE.MeshLambertMaterial({ color: 0xff3d6e, emissive: 0x500018, transparent: true, opacity: 0.9 });
    const corkMat = lam(0x8a6a44);
    const lootMeshes = new Map();
    L.syncLootMeshes = (now) => {
      for (const [id, m] of lootMeshes) if (!L.pickups.has(id) || L.claimed.has(id)) { G.remove(m); lootMeshes.delete(id); }
      for (const p of L.pickups.values()) {
        if (L.claimed.has(p.id)) continue;
        let m = lootMeshes.get(p.id);
        if (!m) {
          if (p.type === 0) m = new THREE.Mesh(coinGeo, coinMat);
          else {
            m = new THREE.Group();
            const flask = new THREE.Mesh(sph(0.1, 10, 8), potionMat);
            const neck = at(new THREE.Mesh(cyl(0.03, 0.03, 0.08, 6), potionMat), 0, 0.1, 0);
            const cork = at(new THREE.Mesh(cyl(0.035, 0.035, 0.04, 6), corkMat), 0, 0.16, 0);
            m.add(flask, neck, cork);
          }
          m.userData.phase = rand() * 6;
          m.userData.pos = new V3(p.x, 0.35, p.z);
          G.add(m);
          lootMeshes.set(p.id, m);
        }
        const u = m.userData;
        m.position.set(u.pos.x, 0.35 + Math.sin(now * 0.004 + u.phase) * 0.06, u.pos.z);
        m.rotation.y = now * 0.003 + u.phase;
      }
    };
    L.lootMeshes = lootMeshes;

    // where an enemy can be hit
    function enemyHit(e, p, pad) {
      const T = ENEMIES[e.type];
      if (T.fly) return Math.hypot(p.x - e.rx, p.y - e.ry, p.z - e.rz) < T.r + pad;
      return p.y > 0.05 && p.y < T.h && Math.hypot(p.x - e.rx, p.z - e.rz) < T.r + pad;
    }
    // how far along a ray (origin o, unit direction d) it first meets an enemy, or Infinity
    const _w = new V3();
    function rayEnemy(o, d, maxT, e) {
      const T = ENEMIES[e.type];
      if (T.fly) {
        _w.set(e.rx - o.x, e.ry - o.y, e.rz - o.z);
        const s = _w.dot(d);
        if (s < 0 || s > maxT) return Infinity;
        return _w.addScaledVector(d, -s).length() < T.r + 0.05 ? s : Infinity;
      }
      // vertical body from the floor to its height
      const hx = d.x, hz = d.z, hl = Math.hypot(hx, hz);
      if (hl < 1e-5) return Infinity;
      const s = ((e.rx - o.x) * hx + (e.rz - o.z) * hz) / (hl * hl);
      if (s < 0 || s > maxT) return Infinity;
      const px = o.x + d.x * s - e.rx, pz = o.z + d.z * s - e.rz, py = o.y + d.y * s;
      if (Math.hypot(px, pz) > T.r + 0.05 || py < 0 || py > T.h + 0.1) return Infinity;
      return s;
    }
    L.enemyHit = enemyHit;
    L.rayEnemy = rayEnemy;

    // ---------------------------------------------------------------- draw enemies (host and everyone else)
    const _ey = new V3(), _eb = new V3();
    L.renderEnemies = (dt, now) => {
      const k = 1 - Math.exp(-dt * 12);
      let slam = null;
      for (const e of L.enemies.values()) {
        const T = ENEMIES[e.type];
        e.rx += (e.x - e.rx) * k;
        e.rz += (e.z - e.rz) * k;
        e.ry += (e.y - e.ry) * k;
        let dy = e.yaw - e.ryaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        e.ryaw += dy * k;
        if (e.ac !== e.lastAc) { if (L.onStrike) L.onStrike(e); e.lastAc = e.ac; }
        let armX = 0, bob = 0, scale = 1;
        if (e.st === 1) armX = T.ai === 'ranged' || T.ai === 'turret' ? 0 : -1.4;
        if (e.st === 2) armX = T.ai === 'ranged' || T.ai === 'turret' ? 0 : 0.9;
        if (e.st === 0 && !T.fly) bob = Math.abs(Math.sin(now * 0.012 + e.id)) * 0.05;
        if (e.st === 3) { e.dieT += dt; scale = Math.max(0.01, 1 - e.dieT / 0.6); }
        const ud = e.arm.userData;
        if (ud.flap) for (const w of e.arm.children) w.rotation.z = Math.sin(now * 0.03 + e.id) * 0.7 * w.userData.side;
        else if (ud.spin) e.arm.rotation.y += dt * (e.st === 5 ? 14 : 4);
        else if (ud.squish) { const s = 1 + Math.sin(now * 0.008 + e.id) * 0.08 + (e.st === 1 ? 0.15 : 0); e.arm.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s)); }
        else if (ud.pulse) ud.pulse.scale.setScalar(0.9 + Math.sin(now * 0.02) * 0.15 + (e.st === 1 ? 0.6 : 0));
        else if (T.ai === 'turret') { e.arm.rotation.x = 0; }
        else e.arm.rotation.x = armX;
        e.g.position.set(e.rx, (T.fly ? e.ry : 0) + bob, e.rz);
        e.g.rotation.y = e.ryaw;
        e.g.scale.setScalar(scale);
        e.shadow.position.set(e.rx, 0.01, e.rz);
        e.shadow.material.opacity = T.fly ? 0.25 : 0.5;
        if (T.ai === 'boss' && T.boss.slam && e.st === 1) slam = e;
        e.flash = Math.max(0, e.flash - dt);
        for (const m of e.mats) m.emissive.setHex(e.flash > 0 ? 0x887766 : e.fx ? 0x1a3a66 : m.userData.base);
        e.bar.visible = e.hp < e.hpMax && e.st !== 3;
        if (e.bar.visible) {
          e.fill.scale.x = Math.max(0.001, e.hp / e.hpMax);
          e.fill.position.x = -(1 - e.fill.scale.x) / 2;
          camera.getWorldPosition(_ey);
          e.bar.lookAt(_ey.x, e.bar.getWorldPosition(_eb).y, _ey.z);
        }
      }
      slamRing.visible = !!slam;
      if (slam) {
        const s = ENEMIES[slam.type].reach / 3.3;
        slamRing.scale.set(s, s, 1);
        slamRing.position.set(slam.rx, 0.02, slam.rz);
        slamRing.material.opacity = 0.35 + 0.35 * Math.sin(now * 0.025);
      }
    };

    // ---------------------------------------------------------------- me
    const MAX_HP = 3;
    L.me = { hp: MAX_HP, coins: 0, kills: 0, down: false, downT: 0, invT: 0, hxSeq: 0, hx: [], shSeq: 0, sh: [], pc: [], dr: [-1, -1, -1], swordCool: new Map(), lastTool: null, ff: [], ffSeq: 0 };
    const me = L.me;
    L.allowRecall = true;
    const hostId = () => {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx) ids.push(rec.peer);
      ids.sort();
      return ids[0];
    };
    L.isHost = () => hostId() === state.myPeer;
    const inGameHere = () => state.mode !== 'menu' && state.level === L.idx;
    const C = cfg.colors, TX = cfg.text;

    const veilTex = radialTex([[0, 'rgba(255,40,40,0)'], [0.55, 'rgba(255,30,30,0.25)'], [1, 'rgba(160,0,0,0.85)']]);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: veilTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    veil.position.z = -0.3;
    veil.renderOrder = 999;
    veil.visible = false;
    camera.add(veil);
    const downText = makePlate(camera, 'Down! A friend can revive you', 0.4, 0.06, new V3(0, -0.02, -0.29), 0, { bg: '#2a0d12', fg: '#ffd0d0', size: 0.6 });
    downText.material.depthTest = false;
    downText.renderOrder = 1000;
    downText.visible = false;
    let hurtT = -1e9;

    function takeDamage(n) {
      const now = performance.now();
      if (!inGameHere() || me.down || now < me.invT || L.q.done) return;
      me.hp = Math.max(0, me.hp - n);
      me.invT = now + 900;
      hurtT = now;
      sfx('hurt', 1);
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.8, 120);
      if (me.hp <= 0) { me.down = true; me.downT = now; me.downAt = myHead.pos.clone(); showToast(friendsAround() ? 'You\u2019re down! A friend can revive you' : 'You\u2019re down!'); }
      state.hudDirty = true;
      forcePresence();
    }
    L.takeDamage = takeDamage;
    const checkpoint = () => L.checkpointAt(L.q.pg);
    const _hd = new V3();
    function standAt(spot) {
      camera.getWorldPosition(_hd);
      dolly.position.x += spot.x - _hd.x;
      dolly.position.z += spot.z - _hd.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.05; }
    }
    // ---------------------------------------------------------------- shields
    const myShields = () => L.tools.filter((t) => t.kind === 'shield' && t.held && t.held.peer === state.myPeer);
    const _shC = new V3(), _shN = new V3(), _shR = new V3();
    function shieldFace(t) { _shC.set(0, 0.03, -0.14).applyQuaternion(t.quat).add(t.pos); _shN.set(0, 0, -1).applyQuaternion(t.quat); }
    function shieldClang(t) { sfx('clang', 1); if (state.mode === 'vr') haptic(vrHands[t.held.side], 0.8, 60); }
    // a blow from the direction your shield faces
    function shieldStops(fromX, fromZ) {
      for (const t of myShields()) {
        shieldFace(t);
        const dx = fromX - myHead.pos.x, dz = fromZ - myHead.pos.z, d = Math.hypot(dx, dz) || 1;
        const nh = Math.hypot(_shN.x, _shN.z) || 1;
        if ((_shN.x * dx + _shN.z * dz) / (d * nh) > 0.45) return t;
      }
      return null;
    }
    L.onStrike = (e) => {
      const T = ENEMIES[e.type];
      const d = Math.hypot(e.rx - myHead.pos.x, e.rz - myHead.pos.z);
      // a raised shield takes ordinary blows, and takes most of a boss's slam
      if (T.ai !== 'kamikaze' && (T.fly ? Math.hypot(d, myHead.pos.y - e.ry) : d) < T.reach + 0.6 && inGameHere() && !me.down) {
        const t = shieldStops(e.rx, e.rz);
        if (t) { shieldClang(t); if (T.ai === 'boss') { sfx('slam', 1 / (1 + d * 0.08)); takeDamage(1); } return; }
      }
      const d3 = Math.hypot(d, myHead.pos.y - (T.fly ? e.ry : 1.0));
      if (T.ai === 'boss') {
        sfx('slam', 1 / (1 + d * 0.08));
        if (state.mode === 'flat') L.shakeT = performance.now();
        if (d < T.reach) takeDamage(T.dmg || 2);
      } else if (T.ai === 'kamikaze') {
        sfx('slam', 0.6 / (1 + d * 0.1));
        spawnBlast(new V3(e.rx, e.ry, e.rz), 0x7ad8ff, 1.6);
        if (d3 < T.blast) takeDamage(T.dmg);
      } else {
        sfx('whoosh', 0.8 / (1 + d * 0.2));
        if ((T.fly ? d3 : d) < T.reach + 0.3) takeDamage(T.dmg || 1);
      }
    };

    // ---------------------------------------------------------------- hitting enemies
    function reportHit(e, dmg, fx) {
      if (!e || e.st === 3) return;
      const lethal = e.hp - dmg <= 0;
      if (lethal) { me.kills += 1; state.dirtyBoard = true; }
      e.flash = 0.15;
      sfx('hit', 0.8);
      if (L.isHost()) L.damageEnemy(e.id, dmg, fx || 0);
      else {
        e.hp = Math.max(0, e.hp - dmg);
        me.hx.push([++me.hxSeq, e.id, dmg, fx || 0]);
        if (me.hx.length > 8) me.hx.shift();
      }
      forcePresence();
    }
    const aliveEnemies = () => Array.from(L.enemies.values()).filter((e) => e.st !== 3);
    function splash(center, radius, dmg, skip) {
      for (const e of aliveEnemies()) {
        if (e === skip) continue;
        const T = ENEMIES[e.type];
        const d = Math.hypot(e.rx - center.x, (T.fly ? e.ry : Math.min(center.y, T.h * 0.5)) - center.y, e.rz - center.z);
        if (d < radius + T.r) reportHit(e, dmg, 0);
      }
    }

    // sword
    const _a = new V3(), _b = new V3(), _pt = new V3(), _ax2 = new V3(), _tipL = new V3();
    const swordState = new Map();
    function swordStep(dt, now) {
      for (const t of L.tools) {
        if (t.kind !== 'sword' || !t.held || t.held.peer !== state.myPeer) { swordState.delete(t); continue; }
        _ax2.set(0, 0, -1).applyQuaternion(t.quat);
        const A = t.pos.clone().addScaledVector(_ax2, 0.15), B = t.pos.clone().addScaledVector(_ax2, 0.95);
        dolly.worldToLocal(_tipL.copy(B));
        let s = swordState.get(t);
        if (!s) { swordState.set(t, { a: A.clone(), b: B.clone(), tip: _tipL.clone() }); continue; }
        const speed = _tipL.distanceTo(s.tip) / Math.max(dt, 1 / 240);
        if (!(state.mode === 'flat' && t.noHit) && speed > 2.2 && !me.down) {
          for (const e of aliveEnemies()) {
            if ((me.swordCool.get(e.id) || 0) > now) continue;
            let hit = false;
            for (let k = 1; k <= 3 && !hit; k++) {
              _a.lerpVectors(s.a, A, k / 3); _b.lerpVectors(s.b, B, k / 3);
              for (let j = 0; j <= 4; j++) { _pt.lerpVectors(_a, _b, j / 4); if (L.enemyHit(e, _pt, 0.05)) { hit = true; break; } }
            }
            if (hit) {
              me.swordCool.set(e.id, now + 380);
              reportHit(e, speed > 6 ? 2 : 1, 0);
              if (state.mode === 'vr') haptic(vrHands[t.held.side], 0.9, 50);
            }
          }
        }
        if (!(state.mode === 'flat' && t.noHit) && speed > 2.2 && !me.down) {
          for (const rec of friendsHere()) {
            if ((me.swordCool.get(rec.peer) || 0) > now) continue;
            let hit = false;
            for (let k = 1; k <= 3 && !hit; k++) {
              _a.lerpVectors(s.a, A, k / 3); _b.lerpVectors(s.b, B, k / 3);
              for (let j = 0; j <= 4 && !hit; j++) { _pt.lerpVectors(_a, _b, j / 4); for (const c of friendParts(rec)) if (c.distanceTo(_pt) < 0.3) { hit = true; break; } }
            }
            if (hit) { me.swordCool.set(rec.peer, now + 600); hurtFriend(rec.peer, speed > 6 ? 2 : 1); }
          }
        }
        s.a.copy(A); s.b.copy(B); s.tip.copy(_tipL);
      }
    }
    const _segC = new V3();
    function segDist(p, a, b) {
      const ab = _segC.subVectors(b, a), t = clamp(_pt.subVectors(p, a).dot(ab) / Math.max(ab.lengthSq(), 1e-8), 0, 1);
      return p.distanceTo(_pt.copy(a).addScaledVector(ab, t));
    }
    const _body = new V3();
    L.onArrow = (p) => {
      if (!inGameHere() || me.down) return;
      for (const s of swordState.values()) {
        if (segDist(p.pos, s.a, s.b) < 0.16) {
          p.dead = true; p.age = 2.6; p.vel.multiplyScalar(-0.2);
          sfx('clang', 1);
          for (const t of L.tools) if (swordState.get(t) === s && state.mode === 'vr') haptic(vrHands[t.held.side], 0.7, 40);
          return;
        }
      }
      for (const t of myShields()) {
        shieldFace(t);
        _shR.subVectors(p.pos, _shC);
        const dn = _shR.dot(_shN), inPlane = Math.sqrt(Math.max(0, _shR.lengthSq() - dn * dn));
        if (Math.abs(dn) < 0.14 && inPlane < 0.36 && p.vel.dot(_shN) < 0) { p.dead = true; p.age = 2.6; p.vel.multiplyScalar(-0.2); shieldClang(t); return; }
      }
      _body.set(myHead.pos.x, Math.max(0.3, myHead.pos.y - 1.1), myHead.pos.z);
      if (p.pos.distanceTo(myHead.pos) < 0.28 || segDist(p.pos, myHead.pos, _body) < 0.3) {
        p.dead = true; p.age = 2.95;
        takeDamage((PROJ_BY_CODE[p.ptype] || PROJ.arrow).dmg);
      }
    };

    // ---------------------------------------------------------------- ranged weapons
    const beams = [];
    const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, -0.5);
    function showBeam(from, to, color, width) {
      const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
      m.position.copy(from);
      m.lookAt(to);
      m.scale.set(width || 0.012, width || 0.012, Math.max(0.01, from.distanceTo(to)));
      G.add(m);
      beams.push({ m, t0: performance.now(), life: 170 });
    }
    function spawnBlast(pos, color, size) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.position.copy(pos);
      s.scale.set(0.3, 0.3, 1);
      G.add(s);
      beams.push({ m: s, t0: performance.now(), life: 380, blast: size || 2 });
    }
    // walk the ray until it leaves the level, so walls stop shots
    function wallT(o, d, max) {
      const p = new V3();
      for (let t = 0.3; t < max; t += 0.3) {
        p.copy(o).addScaledVector(d, t);
        if (!L.walkable(p) || p.y < 0 || p.y > WALL_TOP) return t;
      }
      return max;
    }
    // ---------------------------------------------------------------- friendly fire: your shots and swings can hit your friends
    const friendsHere = () => { const out = []; for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && rec.hasH && !(st && st.down)) out.push(rec); } return out; };
    const _fc = new V3();
    const friendParts = (rec) => { const h = rec.cur.h.pos; return [new V3(h.x, h.y, h.z), new V3(h.x, h.y - 0.45, h.z), new V3(h.x, h.y - 0.9, h.z)]; };
    function friendAt(p, pad) { for (const rec of friendsHere()) for (const c of friendParts(rec)) if (c.distanceTo(p) < 0.26 + pad) return rec.peer; return null; }
    function rayFriend(o, d, maxT, only) {
      let best = null, bt = maxT;
      for (const rec of only ? [only] : friendsHere()) for (const c of friendParts(rec)) {
        const oc = _fc.subVectors(c, o), t = oc.dot(d);
        if (t < 0 || t > bt) continue;
        if (oc.lengthSq() - t * t < 0.26 * 0.26) { bt = t; best = rec.peer; }
      }
      return { f: best, t: bt };
    }
    function hurtFriend(peer, dmg) {
      me.ff.push([++me.ffSeq, peer, dmg]);
      if (me.ff.length > 6) me.ff.shift();
      const rec = remotes.get(peer);
      showToast(`Friendly fire! You hit ${rec ? rec.name : 'a friend'}`);
      forcePresence();
    }
    L.hurtFriend = hurtFriend;
    function firstHit(o, d, max, skip) {
      let best = null, bt = wallT(o, d, max);
      for (const e of aliveEnemies()) {
        if (skip && skip.has(e)) continue;
        const s = L.rayEnemy(o, d, bt, e);
        if (s < bt) { bt = s; best = e; }
      }
      const fr = rayFriend(o, d, bt);
      if (fr.f) return { e: null, t: fr.t, f: fr.f };
      return { e: best, t: bt };
    }
    const shots = [];
    const glowSprite = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.set(size, size, 1); return s; };
    const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.36, 5);
    boltGeo.rotateX(Math.PI / 2);
    function spawnShot(kind, pos, vel, mine, opts) {
      const o = opts || {};
      let m;
      if (kind === 'bolt') m = new THREE.Mesh(boltGeo, lam(0x9aa0b0));
      else { m = new THREE.Group(); m.add(new THREE.Mesh(sph(o.big ? 0.12 : 0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }))); m.add(glowSprite(WEAPON_FX_COLOR[kind], o.big ? 1.1 : 0.6)); }
      G.add(m);
      const grav = kind === 'bolt' ? 2 : kind === 'plasma' ? 6 : kind === 'fire' ? 1 : 0;
      shots.push({ kind, pos: pos.clone(), vel: vel.clone(), grav, mine, mesh: m, age: 0, dead: false, big: !!o.big });
    }
    function impactShot(s, e) {
      const at3 = s.pos.clone();
      if (s.kind === 'bolt') { if (e) reportHit(e, 1, 0); }
      else if (s.kind === 'frost') { if (e) reportHit(e, 1, 1); spawnBlast(at3, WEAPON_FX_COLOR.frost, 1.2); }
      else if (s.kind === 'fire') {
        if (e) reportHit(e, s.big ? 3 : 2, 0);
        splash(at3, s.big ? 1.8 : 1.0, 1, e);
        spawnBlast(at3, WEAPON_FX_COLOR.fire, s.big ? 3 : 1.8);
        sfx('poof', 0.7);
      }
      // a blast catches friends standing close to it too
      if (s.kind === 'fire' || s.kind === 'plasma') { const R = s.kind === 'plasma' ? 2.2 : s.big ? 1.8 : 1.0; for (const rec of friendsHere()) if (rec.cur.h.pos.distanceTo(at3) < R + 0.6) hurtFriend(rec.peer, 1); }
      if (s.kind === 'plasma') {
        for (const x of aliveEnemies()) {
          const T = ENEMIES[x.type];
          const d = Math.hypot(x.rx - at3.x, (T.fly ? x.ry : Math.min(at3.y, T.h * 0.5)) - at3.y, x.rz - at3.z);
          if (d < 2.2 + T.r) reportHit(x, d < 1.0 + T.r ? 3 : 2, 0);
        }
        spawnBlast(at3, WEAPON_FX_COLOR.plasma, 3.4);
        sfx('slam', 0.5);
      }
    }
    function stepShots(dt) {
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.age += dt;
        if (!s.dead) {
          for (let k = 0; k < 4 && !s.dead; k++) {
            s.vel.y -= s.grav * dt / 4;
            s.pos.addScaledVector(s.vel, dt / 4);
            if (!L.walkable(s.pos) || s.pos.y < 0.02 || s.pos.y > WALL_TOP) { s.dead = true; if (s.mine) impactShot(s, null); break; }
            if (s.mine) for (const e of aliveEnemies()) { if (L.enemyHit(e, s.pos, 0.04)) { s.dead = true; impactShot(s, e); break; } }
            if (s.mine && !s.dead && s.age > 0.05) { const f = friendAt(s.pos, 0.04); if (f) { s.dead = true; hurtFriend(f, s.kind === 'fire' ? (s.big ? 3 : 2) : s.kind === 'plasma' ? 2 : 1); impactShot(s, null); } }
          }
        }
        s.mesh.position.copy(s.pos);
        if (!s.dead && s.kind === 'bolt') s.mesh.quaternion.setFromUnitVectors(FWD, _md.copy(s.vel).normalize());
        if (s.dead && s.kind !== 'bolt') s.mesh.visible = false;
        if (s.age > (s.dead ? 2.5 : 3)) { G.remove(s.mesh); shots.splice(i, 1); }
      }
    }
    const cool = new Map();
    const _mz = new V3(), _md = new V3(), _sp = new V3();
    function muzzle(t) {
      _md.set(0, 0, -1).applyQuaternion(t.quat);
      const len = t.kind === 'crossbow' ? 0.42 : t.kind === 'wand' ? 0.42 : t.g.children[0].userData.len || 0.4;
      _mz.copy(t.pos).addScaledVector(_md, len).add(new V3(0, 0.03, 0).applyQuaternion(t.quat));
    }
    function share(kind, from, a) {
      me.sh.push([++me.shSeq, WEAPON_FX.indexOf(kind), r3(from.x), r3(from.y), r3(from.z), r3(a.x), r3(a.y), r3(a.z)]);
      if (me.sh.length > 3) me.sh.shift();
      forcePresence();
    }
    function recoil(side, amt) { if (state.mode === 'vr' && side) haptic(vrHands[side], amt, 35); }
    function fireWeapon(t, side, charge) {
      const now = performance.now();
      const k = t.kind === 'wand' ? ['fire', 'frost', 'storm'][t.spell || 0] : t.kind;
      const cd = { crossbow: 550, pistol: 220, scatter: 850, rail: 650, plasma: 1200, fire: 600, frost: 420, storm: 1000 }[k] || 500;
      if (me.down || (cool.get(t) || 0) > now) return;
      cool.set(t, now + cd);
      muzzle(t);
      if (k === 'crossbow') { spawnShot('bolt', _mz, _md.clone().multiplyScalar(32), true); share('bolt', _mz, _md.clone().multiplyScalar(32)); sfx('shoot', 1); }
      else if (k === 'pistol') {
        const h = firstHit(_mz, _md, 40);
        const end = _mz.clone().addScaledVector(_md, h.t);
        showBeam(_mz, end, WEAPON_FX_COLOR.pistol, 0.012);
        if (h.e) reportHit(h.e, 1, 0);
        if (h.f) hurtFriend(h.f, 1);
        share('pistol', _mz, end); sfx('laser', 1);
      } else if (k === 'scatter') {
        const tally = new Map();
        for (let p = 0; p < 6; p++) {
          _sp.copy(_md).add(new V3((rand() - 0.5) * 0.24, (rand() - 0.5) * 0.18, (rand() - 0.5) * 0.24)).normalize();
          const h = firstHit(_mz, _sp, 12);
          showBeam(_mz, _mz.clone().addScaledVector(_sp, h.t), WEAPON_FX_COLOR.scatter, 0.01);
          if (h.e) tally.set(h.e, Math.min(3, (tally.get(h.e) || 0) + 1));
          if (h.f) tally.set(h.f, Math.min(3, (tally.get(h.f) || 0) + 1));
        }
        for (const [e, n] of tally) { if (typeof e === 'string') hurtFriend(e, n); else reportHit(e, n, 0); }
        share('scatter', _mz, _mz.clone().addScaledVector(_md, 10)); sfx('shoot', 1); tone(180, 80, 0.15, 'square', 0.15);
      } else if (k === 'rail') {
        const c = clamp(charge || 0, 0, 1), dmg = c >= 0.99 ? 4 : c > 0.5 ? 2 : 1;
        const max = wallT(_mz, _md, 50);
        const hit = new Set();
        for (const e of aliveEnemies()) if (L.rayEnemy(_mz, _md, max, e) < max) hit.add(e);
        for (const e of hit) reportHit(e, dmg, 0);
        for (const rec of friendsHere()) if (rayFriend(_mz, _md, max, rec).f) hurtFriend(rec.peer, dmg);
        const end = _mz.clone().addScaledVector(_md, max);
        showBeam(_mz, end, WEAPON_FX_COLOR.rail, 0.012 + c * 0.03);
        share('rail', _mz, end); tone(900, 200, 0.25, 'sawtooth', 0.1 + c * 0.1); sfx('laser', 1);
      } else if (k === 'plasma') { const v = _md.clone().multiplyScalar(14); v.y += 1.5; spawnShot('plasma', _mz, v, true); share('plasma', _mz, v); tone(220, 90, 0.25, 'sine', 0.3); }
      else if (k === 'fire') { const big = (charge || 0) >= 0.99; const v = _md.clone().multiplyScalar(16); spawnShot('fire', _mz, v, true, { big }); share('fire', _mz, v); sfx('whoosh', 1); tone(big ? 300 : 500, 150, 0.3, 'sawtooth', 0.08); }
      else if (k === 'frost') { const v = _md.clone().multiplyScalar(20); spawnShot('frost', _mz, v, true); share('frost', _mz, v); tone(1600, 2400, 0.15, 'sine', 0.1); }
      else if (k === 'storm') {
        const h = firstHit(_mz, _md, 22);
        let from = _mz.clone(), end = _mz.clone().addScaledVector(_md, h.t);
        zap(from, end);
        if (h.f) hurtFriend(h.f, 1);
        if (h.e) {
          const done = new Set([h.e]);
          reportHit(h.e, 1, 0);
          let cur = h.e;
          for (let j = 0; j < 2; j++) {
            let nxt = null, bd = 4.5;
            for (const e of aliveEnemies()) { if (done.has(e)) continue; const d = Math.hypot(e.rx - cur.rx, e.rz - cur.rz); if (d < bd) { bd = d; nxt = e; } }
            if (!nxt) break;
            const T1 = ENEMIES[cur.type], T2 = ENEMIES[nxt.type];
            zap(new V3(cur.rx, T1.fly ? cur.ry : T1.h * 0.6, cur.rz), new V3(nxt.rx, T2.fly ? nxt.ry : T2.h * 0.6, nxt.rz));
            reportHit(nxt, 1, 0);
            done.add(nxt); cur = nxt;
          }
        }
        share('storm', _mz, end); noiseBurst(0.25, 0.3, 3000, 0.5, 0.002); tone(1200, 300, 0.2, 'sawtooth', 0.08);
      }
      recoil(side, k === 'scatter' || k === 'plasma' || k === 'rail' ? 0.8 : 0.45);
    }
    function zap(a, b) {
      const n = 5, prev = a.clone();
      for (let i = 1; i <= n; i++) {
        const p = a.clone().lerp(b, i / n);
        if (i < n) p.add(new V3((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3));
        showBeam(prev.clone(), p, WEAPON_FX_COLOR.storm, 0.014);
        prev.copy(p);
      }
    }
    const isCharge = (t) => t.kind === 'rail' || (t.kind === 'wand' && !(t.spell || 0));
    function pressTrigger(t, side) {
      if (t.kind === 'sword') return;
      if (isCharge(t)) { t.chargeT = performance.now(); return; }
      fireWeapon(t, side, 0);
    }
    function releaseTrigger(t, side) {
      if (!t.chargeT) return;
      const c = (performance.now() - t.chargeT) / 800;
      t.chargeT = 0;
      fireWeapon(t, side, c);
    }
    function setSpell(t, s) {
      t.spell = s;
      const ud = t.g.children[0].userData;
      ud.tip.material.color.setHex(SPELLS[s].color);
      ud.tipGlow.material.color.setHex(SPELLS[s].color);
      showToast(SPELLS[s].name);
      tone(700 + s * 200, 0, 0.08, 'sine', 0.12);
      state.hudDirty = true;
    }
    L.onTrigger = (t, h) => pressTrigger(t, h.side);
    L.onTriggerEnd = (t, h) => releaseTrigger(t, h.side);
    L.onKey = (code) => {
      if (code !== 'KeyR' || state.mode !== 'flat') return;
      const t = L.tools.find((x) => x.kind === 'wand' && x.held && x.held.peer === state.myPeer);
      if (t) setSpell(t, ((t.spell || 0) + 1) % SPELLS.length);
    };

    // browser: sword arcs in front of you; other weapons point where you look
    const SWING = 230;
    const swing = { t0: 0 };
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    const _cq2 = new Q4(), _cp2 = new V3(), _dir = new V3(), _loc = new V3(), _aimP = new V3();
    const YAX = new V3(0, 1, 0), XAX = new V3(1, 0, 0);
    const myTool = () => L.tools.find((x) => x.held && x.held.peer === state.myPeer);
    L.deskSwing = (now) => {
      const t = myTool();
      if (!t || me.down) return;
      if (t.kind !== 'sword') { pressTrigger(t, null); return; }
      if (swing.t0 && now - swing.t0 < SWING + 180) return;
      swing.t0 = now;
      sfx('whoosh', 0.9);
    };
    L.deskRelease = () => { const t = myTool(); if (t && t.kind !== 'sword') releaseTrigger(t, null); };
    L.deskHand = (side, mh, now) => {
      if (state.mode !== 'flat') return false;
      const t = L.tools.find((x) => x.held && x.held.peer === state.myPeer && x.held.side === side);
      if (!t) return false;
      if (t.kind === 'shield') {
        const cq = new Q4(), cp = new V3(); camera.getWorldQuaternion(cq); camera.getWorldPosition(cp);
        mh.pos.set(-0.14, -0.22, -0.3).applyQuaternion(cq).add(cp);
        mh.quat.copy(cq);
        mh.ok = true;
        return true;
      }
      camera.getWorldQuaternion(_cq2);
      camera.getWorldPosition(_cp2);
      if (t.kind === 'sword') {
        const u = swing.t0 ? (now - swing.t0) / SWING : 99;
        t.noHit = !(u < 1);
        let yaw, pitch;
        if (u < 1) { const e = ease(u); yaw = lerp(-1.25, 1.35, e); pitch = lerp(-0.05, -0.4, e); _loc.set(lerp(0.2, -0.05, e), -0.28, -0.3); }
        else if (u < 1 + 180 / SWING) { const k = (u - 1) * SWING / 180; yaw = lerp(1.35, -0.35, k); pitch = lerp(-0.4, 0.75, k); _loc.set(lerp(-0.05, 0.22, k), -0.3, -0.3); }
        else { yaw = -0.35; pitch = 0.75; _loc.set(0.22, -0.32, -0.28); }
        _dir.set(0, 0, -1).applyAxisAngle(XAX, pitch).applyAxisAngle(YAX, yaw).applyQuaternion(_cq2);
        mh.pos.copy(_loc.applyQuaternion(_cq2)).add(_cp2);
      } else {
        _loc.set(0.16, -0.2, -0.32);
        mh.pos.copy(_loc.applyQuaternion(_cq2)).add(_cp2);
        _aimP.set(0, 0, -25).applyQuaternion(_cq2).add(_cp2);
        _dir.subVectors(_aimP, mh.pos).normalize();
      }
      mh.quat.setFromUnitVectors(FWD, _dir);
      mh.ok = true;
      return true;
    };
    L.onToolGrab = (t) => { me.lastTool = t; if (t.kind === 'wand' && t.spell === undefined) t.spell = 0; };

    // ---------------------------------------------------------------- buttons, kiosk, boards
    function request(slot) { me.dr[slot] = L.q.r; forcePresence(); }
    makeButton(L, new V3(2.2, 1.0, -4.1), C.button || 0xe8b54a, TX.begin || 'Begin quest', () => request(0), { faceYaw: 0 });
    makeButton(L, new V3(-1.9, 1.0, 4.1), 0xf5821f, 'Restart quest', () => request(1), { faceYaw: Math.PI });
    const VAULT = ROOMS[ROOMS.length - 1];
    makeButton(L, new V3(VAULT.cx + 2.4, 1.0, VAULT.z1 - 1.2), 0xf5821f, 'Play again', () => request(1), { faceYaw: Math.PI });
    const sunBtn = { L, pos: L.SUN_HOME.clone(), mesh: new THREE.Object3D(), mat: new THREE.MeshLambertMaterial(), plate: null, cool: 0, pressT: -1e9, baseY: 0, lit: false, label: cfg.goal.name,
      onPress: () => { if (L.q.pg >= ROOMS.length - 1 && !L.q.done) request(2); } };
    L.buttons.push(sunBtn);
    makeKiosk(L, -3.6, 4.3, Math.PI);
    L.board = makeBoard(G, 720, 460, 2.2, 1.405, 0.7, 2.15, 4.85, Math.PI);
    const sign = makeBoard(G, 720, 500, 1.9, 1.32, 3.75, 1.95, 4.85, Math.PI);
    function drawSign() {
      const g = sign.g, W = 720;
      g.fillStyle = C.board; g.fillRect(0, 0, W, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = C.accent; g.font = `800 58px ${DISPLAY}`;
      g.fillText('How to play', 36, 78);
      let y = 122;
      for (const [label, body] of TX.howto) {
        g.fillStyle = C.label; g.font = `700 24px ${BODY}`; g.fillText(label, 36, y); y += 31;
        g.fillStyle = C.text; g.font = `400 24px ${BODY}`; y = wrapText(g, body, 36, y, 648, 30) + 10;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);

    // ---------------------------------------------------------------- runs, requests, victory
    const seenProj = new Set();
    const confetti = [];
    function clearWorld() {
      for (const e of Array.from(L.enemies.values())) removeEnemy(e);
      for (const p of L.projs.values()) G.remove(p.mesh);
      L.projs.clear();
      L.pickups.clear();
      L.claimed.clear();
      seenProj.clear();
      L.sunstone.position.copy(L.SUN_HOME);
      L.sunGlow.position.copy(L.SUN_HOME);
    }
    // ---------------------------------------------------------------- down, reviving, and game over
    // Down stays down until a friend revives you: they stand over you and hold E (or a grip in VR) for 2.5 s.
    // It's only over when everyone here is down at once: then the quest starts again.
    const friendsAround = () => [...remotes.values()].some((rec) => rec.lv === L.idx && rec.inGame);
    Object.assign(me, { rv: [], rvSeq: 0, rvT: 0, rvPeer: null });
    const downTags = new Map();
    function downTag(rec) {
      let s = downTags.get(rec.peer);
      if (!s) {
        s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(320, 72, (g) => { rr(g, 4, 6, 312, 60, 30); g.fillStyle = 'rgba(120,20,30,0.9)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Down! Revive me', 160, 38); }).tex, transparent: true, depthWrite: false }));
        s.scale.set(0.9, 0.2, 1); G.add(s); downTags.set(rec.peer, s);
      }
      return s;
    }
    let overT = 0;
    function reviveStep(dt, now) {
      const here = inGameHere();
      // tags over friends who are down
      for (const [peer, s] of downTags) { const rec = remotes.get(peer), st = rec && rec.lvState[L.id]; s.visible = !!(here && rec && rec.lv === L.idx && st && st.down && rec.hasH); if (s.visible) s.position.copy(rec.cur.h.pos).add(new V3(0, 0.45, 0)); }
      let target = null;
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && rec.hasH && st && st.down) { downTag(rec); if (here && !me.down && !target && Math.hypot(rec.cur.h.pos.x - myHead.pos.x, rec.cur.h.pos.z - myHead.pos.z) < 1.6) target = rec; } }
      const holding = state.mode === 'vr' ? SIDES.some((s) => { const gp = vrHands[s].source && vrHands[s].source.gamepad; return !!(gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed); }) : !!(state.keys && state.keys.KeyE);
      if (target && holding) {
        if (me.rvPeer !== target.peer) { me.rvPeer = target.peer; me.rvT = 0; showToast(`Reviving ${target.name}\u2026 keep holding`); }
        const before = me.rvT; me.rvT += dt;
        if (state.mode === 'vr' && Math.floor(me.rvT * 3) !== Math.floor(before * 3)) for (const s of SIDES) haptic(vrHands[s], 0.25, 25);
        if (me.rvT >= 2.5) {
          me.rv.push([++me.rvSeq, target.peer]); if (me.rv.length > 4) me.rv.shift();
          showToast(`You revived ${target.name}!`); sfx('potion', 1);
          me.rvT = 0; me.rvPeer = null;
          forcePresence();
        }
      } else { me.rvT = 0; me.rvPeer = null; }
      // everyone down at once: game over, and the quest starts again
      if (here && !L.q.done) {
        const peers = [state.myPeer, ...[...remotes.values()].filter((r) => r.lv === L.idx && r.inGame).map((r) => r.peer)];
        const allDown = me.down && peers.every((p) => p === state.myPeer || (remotes.get(p).lvState[L.id] || {}).down);
        if (allDown && !overT) { overT = now; showToast(peers.length > 1 ? 'Everyone\u2019s down. Game over! The quest starts again' : 'Game over! The quest starts again'); sfx('buzzer', 0.8); }
        if (!allDown) overT = 0;
        if (overT && now - overT > 3000 && peers.slice().sort()[0] === state.myPeer) { overT = 0; resetRun(); }
      }
    }
    L.onUse = () => { if (state.mode !== 'flat' || me.down) return me.down; for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && rec.hasH && st && st.down && Math.hypot(rec.cur.h.pos.x - myHead.pos.x, rec.cur.h.pos.z - myHead.pos.z) < 1.6) return true; } return false; };
    function onNewRun() {
      clearWorld();
      Object.assign(me, { hp: MAX_HP, coins: 0, kills: 0, down: false, pc: [], hx: [], sh: [] });
      me.swordCool.clear();
      L.hostState.waveT = 0;
      L.hostState.projLog = [];
      if (inGameHere()) { camera.getWorldPosition(_hd); if (L.roomAt(_hd) !== 0) standAt(new V3(0, 0, 2.5)); }
      state.dirtyBoard = true;
      state.hudDirty = true;
    }
    function resetRun() {
      L.q = { r: L.q.r + 1, pg: 0, wave: 0, spawned: 0, done: 0 };
      onNewRun();
      sfx('reset', 0.8);
      showToast('A new quest begins');
      forcePresence();
    }
    function celebrate() {
      sfx('fanfare', 1);
      setTimeout(() => sfx('cheer', 0.8), 300);
      showToast(TX.win);
      spawnFloat('Victory!', L.SUN_HOME.clone().setY(2.4), '#ffd23f');
      const cols = [0xffd23f, 0xff5c8a, 0x4fc3f7, 0x8bd450, 0xb388ff];
      for (let i = 0; i < 70; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide }));
        m.position.copy(L.SUN_HOME).setY(1.6);
        G.add(m);
        const a = rand() * Math.PI * 2, s = 2 + rand() * 3;
        confetti.push({ m, vel: new V3(Math.cos(a) * s * 0.6, 3 + rand() * 3, Math.sin(a) * s * 0.6), spin: new V3(rand() * 9, rand() * 9, rand() * 9), age: 0 });
      }
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.6, 200);
    }
    function applyQ(q) {
      const prev = L.q;
      if (q.r !== prev.r) { L.q = q; onNewRun(); return; }
      if (q.pg > prev.pg) { sfx('gate', 0.9); showToast(q.pg >= ROOMS.length - 1 ? TX.vaultOpen || 'The way to the prize is open!' : 'A gate rumbles open'); state.dirtyBoard = true; }
      if (q.done && !prev.done) { L.q = q; celebrate(); state.dirtyBoard = true; return; }
      if (q.wave !== prev.wave || q.spawned !== prev.spawned) state.hudDirty = true;
      L.q = q;
    }
    function hostRequests(dr) {
      if (!Array.isArray(dr) || dr.length !== 3) return;
      const q = L.q;
      if (dr[1] === q.r) { resetRun(); return; }
      if (dr[0] === q.r && q.pg === 0) { applyQ(Object.assign({}, q, { pg: 1 })); forcePresence(); }
      if (dr[2] === q.r && q.pg >= ROOMS.length - 1 && !q.done) { applyQ(Object.assign({}, q, { done: 1 })); forcePresence(); }
    }

    // ---------------------------------------------------------------- network
    const r2 = (x) => Math.round(x * 100) / 100;
    function hostSnapshot() {
      const q = L.q;
      const e = [];
      for (const en of L.enemies.values()) e.push([en.id, en.type, r2(en.x), r2(en.z), r2(en.yaw), Math.max(0, Math.round(en.hp)), en.hpMax, en.st, en.ac, r2(en.y), en.fx]);
      const p = L.hostState.projLog.map((a) => [a.id, r2(a.pos.x), r2(a.pos.y), r2(a.pos.z), r2(a.vel.x), r2(a.vel.y), r2(a.vel.z), a.ptype]);
      const k = Array.from(L.pickups.values()).slice(-28).map((a) => [a.id, a.type, r2(a.x), r2(a.z)]);
      return { q: [q.r, q.pg, q.wave, q.spawned, q.done], e, p, k, n: L.nextId };
    }
    L.presence = () => {
      const p = { dq: [me.hp, me.coins, me.kills, me.down ? 1 : 0, L.q.r], hx: me.hx.slice(), sh: me.sh.slice(), pc: me.pc.slice(-24), dr: me.dr.slice(), ff: me.ff.slice(), rv: me.rv.slice() };
      if (L.isHost()) p.dh = hostSnapshot();
      return p;
    };
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    const num = (x, lim) => finite(x) && Math.abs(x) <= lim;
    function applyHostState(dh) {
      if (!dh || typeof dh !== 'object' || !Array.isArray(dh.q) || dh.q.length !== 5 || !dh.q.every((x) => int(x, 0, 1e9))) return;
      const [r, pg, wave, spawned, done] = dh.q;
      applyQ({ r, pg: Math.min(pg, ROOMS.length - 1), wave, spawned, done });
      if (int(dh.n, 0, 1e9)) L.nextId = Math.max(L.nextId, dh.n);
      const seen = new Set();
      if (Array.isArray(dh.e)) {
        for (const a of dh.e.slice(0, 30)) {
          if (!Array.isArray(a) || a.length !== 11 || !int(a[0], 0, 1e9) || !int(a[1], 0, ENEMIES.length - 1) || !num(a[2], 300) || !num(a[3], 300) || !num(a[4], 50) || !int(a[5], 0, 999) || !int(a[6], 1, 999) || !int(a[7], 0, 5) || !int(a[8], 0, 1e9) || !num(a[9], 30) || !int(a[10], 0, 1)) continue;
          let e = L.enemies.get(a[0]);
          if (!e) { e = makeEnemy(a[0], a[1], a[2], a[3], a[9]); e.lastAc = a[8]; }
          e.x = a[2]; e.z = a[3]; e.yaw = a[4]; e.hp = a[5]; e.hpMax = a[6]; e.y = a[9]; e.fx = a[10];
          if (a[7] === 3 && e.st !== 3) { e.dieT = 0; sfx('poof', 0.8 / (1 + Math.hypot(e.x - myHead.pos.x, e.z - myHead.pos.z) * 0.08)); }
          e.st = a[7]; e.ac = a[8];
          seen.add(a[0]);
        }
      }
      for (const e of Array.from(L.enemies.values())) {
        if (seen.has(e.id)) continue;
        if (e.st !== 3) { e.st = 3; e.dieT = 0; }
        if (e.dieT > 0.6) removeEnemy(e);
      }
      if (Array.isArray(dh.p)) {
        for (const a of dh.p.slice(0, 14)) {
          if (!Array.isArray(a) || a.length !== 8 || !int(a[0], 0, 1e9) || !a.slice(1, 7).every((x) => num(x, 300)) || !int(a[7], 0, PROJ_BY_CODE.length - 1)) continue;
          if (seenProj.has(a[0])) continue;
          seenProj.add(a[0]);
          L.spawnProjectile(a[0], new V3(a[1], a[2], a[3]), new V3(a[4], a[5], a[6]), a[7]);
        }
      }
      if (Array.isArray(dh.k)) {
        const next = new Map();
        for (const a of dh.k.slice(0, 40)) {
          if (!Array.isArray(a) || a.length !== 4 || !int(a[0], 0, 1e9) || !int(a[1], 0, 1) || !num(a[2], 300) || !num(a[3], 300)) continue;
          next.set(a[0], { id: a[0], type: a[1], x: a[2], z: a[3] });
        }
        L.pickups = next;
      }
    }
    L.readPresence = (rec, pres, st) => {
      const a = Array.isArray(pres.dq) ? pres.dq : [];
      const hp = int(a[0], 0, MAX_HP) ? a[0] : MAX_HP, coins = int(a[1], 0, 99999) ? a[1] : 0, kills = int(a[2], 0, 99999) ? a[2] : 0;
      const down = a[3] === 1;
      if (coins !== st.coins || kills !== st.kills || down !== st.down) state.dirtyBoard = true;
      if (st.init && down && !st.down) showToast(`${rec.name} is down`);
      Object.assign(st, { hp, coins, kills, down, init: true });
      // a friend revived me
      if (Array.isArray(pres.rv)) for (const r of pres.rv.slice(-4)) {
        if (!Array.isArray(r) || r.length !== 2 || !int(r[0], 0, 1e9) || typeof r[1] !== 'string' || r[0] <= (st.rvSeq || 0)) continue;
        st.rvSeq = r[0];
        if (st.rvInit && r[1] === state.myPeer && me.down) { me.down = false; me.hp = Math.min(MAX_HP, 2); me.invT = performance.now() + 1500; showToast(`${rec.name} revived you!`); sfx('potion', 1); state.hudDirty = true; forcePresence(); }
      }
      st.rvInit = true;
      if (Array.isArray(pres.ff)) for (const f of pres.ff.slice(-6)) {
        if (!Array.isArray(f) || f.length !== 3 || !int(f[0], 0, 1e9) || typeof f[1] !== 'string' || !int(f[2], 1, 4) || f[0] <= (st.ffSeq || 0)) continue;
        st.ffSeq = f[0];
        if (st.ffInit && f[1] === state.myPeer) { takeDamage(f[2]); showToast(`Ouch! ${rec.name} hit you. Friendly fire!`); }
      }
      st.ffInit = true;
      if (Array.isArray(pres.pc)) for (const id of pres.pc.slice(-30)) if (int(id, 0, 1e9)) L.claimed.add(id);
      if (Array.isArray(pres.sh)) {
        for (const s of pres.sh.slice(-3)) {
          if (!Array.isArray(s) || s.length !== 8 || !int(s[0], 0, 1e9) || !int(s[1], 0, WEAPON_FX.length - 1) || !s.slice(2).every((x) => num(x, 300))) continue;
          if (s[0] <= (st.shSeq || 0)) continue;
          st.shSeq = s[0];
          if (!st.shInit) continue;
          const kind = WEAPON_FX[s[1]], from = new V3(s[2], s[3], s[4]), b = new V3(s[5], s[6], s[7]);
          const vol = 0.6 / (1 + from.distanceTo(myHead.pos) * 0.1);
          if (kind === 'pistol' || kind === 'rail') { showBeam(from, b, WEAPON_FX_COLOR[kind], kind === 'rail' ? 0.03 : 0.012); sfx('laser', vol); }
          else if (kind === 'scatter') { const d = b.clone().sub(from).normalize(); for (let p = 0; p < 6; p++) { const dd = d.clone().add(new V3((rand() - 0.5) * 0.24, (rand() - 0.5) * 0.18, (rand() - 0.5) * 0.24)).normalize(); showBeam(from, from.clone().addScaledVector(dd, 8), WEAPON_FX_COLOR.scatter, 0.01); } sfx('shoot', vol); }
          else if (kind === 'storm') { zap(from, b); }
          else { spawnShot(kind, from, b, false); sfx(kind === 'bolt' ? 'shoot' : 'whoosh', vol); }
        }
        st.shInit = true;
      }
      if (L.isHost()) {
        if (Array.isArray(pres.hx)) {
          for (const h of pres.hx.slice(-8)) {
            if (!Array.isArray(h) || (h.length !== 3 && h.length !== 4) || !int(h[0], 0, 1e9) || !int(h[1], 0, 1e9) || !int(h[2], 1, 4)) continue;
            if (h[0] <= (st.hxSeq || 0)) continue;
            st.hxSeq = h[0];
            if (st.hxInit) L.damageEnemy(h[1], h[2], h[3] === 1 ? 1 : 0);
          }
        }
        st.hxInit = true;
        hostRequests(pres.dr);
      } else {
        if (Array.isArray(pres.hx) && pres.hx.length) st.hxSeq = Math.max(st.hxSeq || 0, ...pres.hx.slice(-8).map((h) => (Array.isArray(h) && int(h[0], 0, 1e9) ? h[0] : 0)));
        st.hxInit = true;
        if (rec.peer === hostId() && pres.dh) applyHostState(pres.dh);
      }
    };

    // ---------------------------------------------------------------- per frame
    const _hand = new V3();
    let wasHost = false;
    const spellPrev = { left: false, right: false };
    L.update = (dt, now) => {
      const isHost = L.isHost();
      if (isHost && !wasHost) L.hostState.waveT = 0;
      wasHost = isHost;
      if (isHost) { hostRequests(me.dr); L.hostStep(dt, now); }
      L.renderEnemies(dt, now);
      L.stepProjectiles(dt);
      swordStep(dt, now);
      stepShots(dt);
      L.syncLootMeshes(now);
      // wands: A or X switches spell in VR; charging weapons glow brighter
      for (const t of L.tools) {
        if (t.kind === 'wand') {
          const ud = t.g.children[0].userData;
          const c = t.chargeT ? Math.min(1, (now - t.chargeT) / 800) : 0;
          ud.tipGlow.scale.setScalar(0.14 + c * 0.35 + Math.sin(now * 0.01) * 0.02);
          if (state.mode === 'vr' && t.held && t.held.peer === state.myPeer) {
            const gp = vrHands[t.held.side].source && vrHands[t.held.side].source.gamepad;
            const pressed = !!(gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed);
            if (pressed && !spellPrev[t.held.side]) setSpell(t, ((t.spell || 0) + 1) % SPELLS.length);
            spellPrev[t.held.side] = pressed;
          }
        } else if (t.kind === 'rail' && t.g.children[0].userData.glow) {
          const c = t.chargeT ? Math.min(1, (now - t.chargeT) / 800) : 0;
          t.g.children[0].userData.glow.color.setHex(c >= 0.99 ? 0xffffff : 0xb388ff);
        }
      }
      L.gates.forEach((gt, i) => {
        const open = L.q.pg > i;
        const target = open ? -CORR_H - 0.2 : 0;
        gt.y += (target - gt.y) * Math.min(1, dt * 1.6);
        if (gt.g.userData.ward) { gt.g.userData.ward.material.opacity = open ? Math.max(0, gt.g.userData.ward.material.opacity - dt) : 0.35 + Math.sin(now * 0.004) * 0.12; gt.g.visible = gt.g.userData.ward.material.opacity > 0.01; }
        else gt.g.position.y = gt.y;
      });
      const camNow = new V3(); camera.getWorldPosition(camNow);
      for (const t of L.torches) {
        // a wall-light's glow stands a little toward you, so a wall at an angle can't slice it in half
        if (t.bx !== undefined && !t.blink && !t.beacon && !t.firefly) {
          const dx = camNow.x - t.bx, dz = camNow.z - t.bz, d = Math.hypot(dx, dz) || 1, k = Math.min(0.25, d * 0.5);
          t.glow.position.x = t.bx + (dx / d) * k; t.glow.position.z = t.bz + (dz / d) * k;
          if (t.core) { t.core.position.x = t.glow.position.x; t.core.position.z = t.glow.position.z; }
        }
        if (t.blink) { t.glow.visible = Math.sin(now * 0.004 + t.phase) > 0.2; continue; }
        if (t.beacon) { t.glow.scale.setScalar(22 + Math.sin(now * 0.003) * 5); continue; }
        if (t.firefly) { const k = now * 0.0006 + t.phase; t.glow.position.set(t.x0 + Math.sin(k * 1.3) * 1.2, t.y0 + Math.sin(k * 2.1) * 0.5, t.z0 + Math.cos(k) * 1.2); t.glow.material.opacity = 0.5 + 0.5 * Math.sin(k * 7); continue; }
        const f = 0.9 + 0.1 * Math.sin(now * 0.017 + t.phase) + 0.06 * Math.sin(now * 0.043 + t.phase * 2);
        if (t.sx) t.glow.scale.set(t.sx * f, t.sy, 1);
        else t.glow.scale.setScalar((t.big ? 1.7 : 0.9) * f);
        if (t.core) t.core.scale.set(0.22 * f, (t.float ? 0.22 : 0.3) * f, 1);
        if (t.float) { const y = t.y0 + Math.sin(now * 0.0015 + t.phase) * 0.12; t.glow.position.y = y; if (t.core) t.core.position.y = y; }
      }
      for (const r of ROOMS) r.light.intensity = (TH.lightIntensity || 1.5) * (0.94 + 0.06 * Math.sin(now * 0.011 + r.cz));
      const sun = L.sunstone;
      sun.rotation.y += dt * (L.q.done ? 3 : 0.8);
      sun.rotation.x += dt * 0.3;
      const sy = L.q.done ? Math.min(2.6, sun.position.y + dt * 0.5) : L.SUN_HOME.y + Math.sin(now * 0.002) * 0.04;
      sun.position.y = sy;
      L.sunGlow.position.y = sy;
      L.sunGlow.scale.setScalar(1.6 + (L.q.done ? 1 : 0) + Math.sin(now * 0.004) * 0.1);
      sunBtn.lit = L.q.pg >= ROOMS.length - 1 && !L.q.done;
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.age += dt; c.vel.y -= 4 * dt; c.vel.multiplyScalar(1 - 0.8 * dt);
        c.m.position.addScaledVector(c.vel, dt);
        c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt;
        if (c.age > 4 || c.m.position.y < 0) { G.remove(c.m); confetti.splice(i, 1); }
      }
      for (let i = beams.length - 1; i >= 0; i--) {
        const b = beams[i], k = (now - b.t0) / b.life;
        if (k >= 1) { G.remove(b.m); b.m.material.dispose(); beams.splice(i, 1); continue; }
        if (b.blast) { b.m.scale.setScalar(0.3 + k * b.blast); b.m.material.opacity = 1 - k; }
        else b.m.material.opacity = 0.9 * (1 - k);
      }
      if (inGameHere() && !me.down) {
        for (const p of L.pickups.values()) {
          if (L.claimed.has(p.id)) continue;
          const m = L.lootMeshes.get(p.id);
          if (!m) continue;
          const u = m.userData;
          const dx = myHead.pos.x - u.pos.x, dz = myHead.pos.z - u.pos.z, d = Math.hypot(dx, dz);
          if (p.type === 0 && d < 2.4) { u.pos.x += dx * Math.min(1, dt * 3); u.pos.z += dz * Math.min(1, dt * 3); }
          let touch = d < 0.6;
          for (const s of SIDES) if (myHands[s].ok && myHands[s].pos.distanceTo(_hand.set(u.pos.x, 0.35, u.pos.z)) < 0.35) touch = true;
          if (!touch) continue;
          if (p.type === 1 && me.hp >= MAX_HP) continue;
          L.claimed.add(p.id);
          me.pc.push(p.id);
          if (me.pc.length > 40) me.pc.shift();
          if (p.type === 0) { me.coins += 1; sfx('coin', 0.8); }
          else { me.hp = Math.min(MAX_HP, me.hp + 2); sfx('potion', 1); showToast('Healed'); }
          state.dirtyBoard = true;
          state.hudDirty = true;
          forcePresence();
        }
      }
      reviveStep(dt, now);
      const hurt = Math.max(0, 1 - (now - hurtT) / 600);
      const veilOp = me.down ? 0.85 : hurt * 0.8;
      veil.visible = state.mode === 'vr' && state.level === L.idx && veilOp > 0.01;
      veil.material.opacity = veilOp;
      veil.material.color.setHex(me.down ? 0x552222 : 0xffffff);
      downText.visible = state.mode === 'vr' && me.down && state.level === L.idx;
      if (ui.hurt) { ui.hurt.style.opacity = state.mode === 'flat' && state.level === L.idx ? String(veilOp) : '0'; ui.hurt.classList.toggle('down', me.down); }
      if (L.shakeT && state.mode === 'flat') {
        const k = Math.max(0, 1 - (now - L.shakeT) / 350);
        camera.position.x += (Math.random() - 0.5) * 0.08 * k;
        camera.position.y += (Math.random() - 0.5) * 0.08 * k;
      }
      drawWrist();
      updateStatus();
    };

    // ---------------------------------------------------------------- readouts
    function objective() {
      const q = L.q;
      if (q.done) return 'Quest complete!';
      if (q.pg === 0) return `Take a weapon, then press ${TX.begin || 'Begin quest'}`;
      if (q.pg >= ROOMS.length - 1) return TX.claim;
      const r = ROOMS[q.pg];
      if (!q.spawned) return `Onward to the ${r.name.toLowerCase()}`;
      const left = aliveEnemies().length;
      return left ? `${r.name}: ${left} left` : `${r.name}: cleared`;
    }
    const hearts = () => { const n = clamp(me.hp | 0, 0, MAX_HP); return '\u2665'.repeat(n) + '\u2661'.repeat(MAX_HP - n); };
    let statusKey = '';
    function updateStatus() {
      if (!ui.status) return;
      const show = state.mode === 'flat' && state.level === L.idx;
      ui.status.hidden = !show;
      if (!show) return;
      const wand = L.tools.find((x) => x.kind === 'wand' && x.held && x.held.peer === state.myPeer);
      const key = `${hearts()}|${me.coins}|${objective()}|${wand ? wand.spell : ''}`;
      if (key === statusKey) return;
      statusKey = key;
      ui.status.replaceChildren();
      const h = document.createElement('span'); h.className = 'hearts'; h.textContent = hearts(); h.setAttribute('aria-label', `${me.hp} of ${MAX_HP} hearts`);
      const c = document.createElement('span'); c.textContent = wand ? SPELLS[wand.spell || 0].name : `${me.coins} coins`;
      if (wand) c.style.color = SPELLS[wand.spell || 0].hex;
      const o = document.createElement('span'); o.className = 'obj'; o.textContent = objective();
      ui.status.append(h, c, o);
    }
    const wrist = canvasTexture(256, 112);
    const wristMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.057), new THREE.MeshBasicMaterial({ map: wrist.tex, transparent: true, depthWrite: false }));
    wristMesh.visible = false;
    scene.add(wristMesh);
    let wristKey = '';
    const _wq = new Q4();
    function drawWrist() {
      const lh = myHands.left;
      wristMesh.visible = state.mode === 'vr' && state.level === L.idx && lh.ok;
      if (!wristMesh.visible) return;
      wristMesh.position.set(0, 0.07, 0.03).applyQuaternion(lh.quat).add(lh.pos);
      wristMesh.quaternion.copy(camera.getWorldQuaternion(_wq));
      const key = `${me.hp}|${me.coins}|${objective()}`;
      if (key === wristKey) return;
      wristKey = key;
      const g = wrist.g;
      g.clearRect(0, 0, 256, 112);
      rr(g, 2, 2, 252, 108, 16); g.fillStyle = 'rgba(20,14,24,0.88)'; g.fill();
      g.textBaseline = 'middle'; g.textAlign = 'left';
      g.font = `700 34px ${BODY}`;
      for (let i = 0; i < MAX_HP; i++) { g.fillStyle = i < me.hp ? '#ff4d6a' : '#5a4a5e'; g.fillText('\u2665', 14 + i * 30, 32); }
      g.textAlign = 'right'; g.fillStyle = '#ffd23f'; g.font = `800 32px ${DISPLAY}`;
      g.fillText(`${me.coins} \u25CF`, 242, 32);
      g.textAlign = 'center'; g.fillStyle = '#ece4f4'; g.font = `400 21px ${BODY}`;
      g.fillText(objective(), 128, 82, 240);
      wrist.tex.needsUpdate = true;
    }

    L.rowFor = (st, isMe) => {
      const coins = isMe ? me.coins : (st.coins || 0), kills = isMe ? me.kills : (st.kills || 0);
      return { coins, kills, text: `${coins} coins, ${kills} defeated` };
    };
    L.sortRows = (a, b) => (b.coins - a.coins) || (b.kills - a.kills);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = C.board; g.fillRect(0, 0, W, H);
      g.strokeStyle = C.accent; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = C.accent; g.font = `800 64px ${DISPLAY}`;
      g.fillText(TX.title, 36, 84);
      g.fillStyle = C.sub; g.font = `400 24px ${BODY}`;
      const q = L.q;
      g.fillText(q.done ? 'Quest complete! Press Restart quest to go again.' : q.pg === 0 ? `Take a weapon, then press ${TX.begin || 'Begin quest'}` : `${Math.min(q.pg, ROOMS.length - 1)} of ${ROOMS.length - 1} gates open`, 36, 122, W - 72);
      drawRows(g, rows, 180, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => 'Restart quest', run: () => request(1) }];
    L.hintsFor = () => {
      const h = state.held;
      if (h && h.kind === 'tool') {
        const k = h.obj.kind;
        if (k === 'sword') return [['Click', 'swing'], ['WASD', 'move'], ['E', 'put it back']];
        if (k === 'wand') return [['Click', 'cast (hold to charge a fireball)'], ['R', 'next spell'], ['E', 'put it back']];
        if (k === 'rail') return [['Hold Space', 'charge, then let go'], ['WASD', 'move'], ['E', 'put it back']];
        return [['Click', 'shoot'], ['WASD', 'move'], ['E', 'put it back']];
      }
      return [['Drag', 'look'], ['WASD', 'move'], ['E', 'take a weapon or press a button']];
    };
    L.throwLabel = () => (state.held && state.held.kind === 'tool' ? 'Attack' : 'Hold to throw');
    L.clampPlayer = (p) => {
      if (me.down && me.downAt) return [me.downAt.x - p.x, me.downAt.z - p.z];
      const pg = L.q.pg, m = 0.3;
      const rects = [];
      for (let i = 0; i <= Math.min(pg, ROOMS.length - 1); i++) { const r = ROOMS[i]; rects.push([r.x0 + m, r.x1 - m, r.z0 + m, r.z1 - m]); }
      for (let i = 0; i < Math.min(pg, L.PATHS.length); i++) for (const [x0, x1, z0, z1] of L.pathRects(i)) rects.push([x0 + m, x1 - m, z0, z1]);
      let best = null, bd = Infinity;
      for (const [x0, x1, z0, z1] of rects) {
        const cx = clamp(p.x, x0, x1), cz = clamp(p.z, z0, z1), d = Math.hypot(p.x - cx, p.z - cz);
        if (d === 0) { best = [0, 0]; break; }
        if (d < bd) { bd = d; best = [cx - p.x, cz - p.z]; }
      }
      best = best || [0, 0];
      // and out of anything solid standing in the way
      let x = p.x + best[0], z = p.z + best[1];
      for (let pass = 0; pass < 2; pass++) for (const [x0, x1, z0, z1] of L.SOLIDS || []) {
        const a0 = x0 - m, a1 = x1 + m, b0 = z0 - m, b1 = z1 + m;
        if (x <= a0 || x >= a1 || z <= b0 || z >= b1) continue;
        const dl = x - a0, dr = a1 - x, dn = z - b0, df = b1 - z, mn = Math.min(dl, dr, dn, df);
        if (mn === dl) x = a0; else if (mn === dr) x = a1; else if (mn === dn) z = b0; else z = b1;
      }
      return [x - p.x, z - p.z];
    };
    L.spawn = () => { dolly.position.set((Math.random() - 0.5) * 2, 0, 2.6); state.yaw = 0; };
    L.onExit = () => { veil.visible = false; downText.visible = false; wristMesh.visible = false; if (ui.status) ui.status.hidden = true; };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.25;
      camera.position.set(Math.sin(a) * 2, 1.7, 4.2);
      camera.lookAt(0, 1.6, -6);
    };

    // ================================================================ BLOB HELPERS (Hexwood Hollow)
    // Pick up to three friendly blobs at the start. The host runs them: each follows a player and, when something
    // hostile is close, bounces over and bonks it. Everyone draws them from the host's updates. Nothing hurts them.
    const HB = { enabled: !!cfg.helpers, want: 0, list: [], req: null, reqSeq: 0, run: -1 };
    L.hb = HB;
    if (HB.enabled) {
      const RIBBON = [0xff9ad0, 0xffd23f, 0x7ad8ff];
      for (let n = 0; n < 3; n++) {
        const m = enemyMesh(ENEMY.slime);
        m.g.visible = false; m.shadow.visible = false; m.bar.visible = false;
        m.g.scale.setScalar(0.72);
        const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 14), new THREE.MeshBasicMaterial({ color: RIBBON[n] }));
        ribbon.rotation.x = Math.PI / 2; ribbon.position.y = 0.62; m.g.add(ribbon);
        HB.list.push({ n, m, x: 0, z: 0, yaw: 0, rx: 0, rz: 0, cd: 0, lunge: -1e9, active: false, snapped: false });
      }
      const hq = (x) => Math.round(x * 100) / 100;
      // where a helper may stand: the open areas, and not inside anything solid
      function clampOpen(h) {
        const pg = L.q.pg, m = 0.45, rects = [];
        for (let i = 0; i <= Math.min(pg, ROOMS.length - 1); i++) { const r = ROOMS[i]; rects.push([r.x0 + m, r.x1 - m, r.z0 + m, r.z1 - m]); }
        for (let i = 0; i < Math.min(pg, L.PATHS.length); i++) for (const [x0, x1, z0, z1] of L.pathRects(i)) rects.push([x0 + m, x1 - m, z0, z1]);
        let bx = h.x, bz = h.z, bd = Infinity;
        for (const [x0, x1, z0, z1] of rects) { const cx = clamp(h.x, x0, x1), cz = clamp(h.z, z0, z1), d = Math.hypot(h.x - cx, h.z - cz); if (d === 0) { bx = h.x; bz = h.z; bd = 0; break; } if (d < bd) { bd = d; bx = cx; bz = cz; } }
        h.x = bx; h.z = bz;
        for (const [x0, x1, z0, z1] of L.SOLIDS || []) {
          const a0 = x0 - 0.3, a1 = x1 + 0.3, b0 = z0 - 0.3, b1 = z1 + 0.3;
          if (h.x <= a0 || h.x >= a1 || h.z <= b0 || h.z >= b1) continue;
          const dl = h.x - a0, dr = a1 - h.x, dn = h.z - b0, df = b1 - h.z, mn = Math.min(dl, dr, dn, df);
          if (mn === dl) h.x = a0; else if (mn === dr) h.x = a1; else if (mn === dn) h.z = b0; else h.z = b1;
        }
      }
      function steer(h, tx, tz, speed, dt) {
        const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
        if (d < 0.05) return d;
        const s = Math.min(d, speed * dt);
        h.x += (dx / d) * s; h.z += (dz / d) * s;
        h.yaw = Math.atan2(-dx, -dz);
        return d;
      }
      function hostHelpers(dt, now) {
        const players = currentTargets();
        if (L.q.r !== HB.run) { HB.run = L.q.r; for (const h of HB.list) h.snapped = false; }
        const foes = [];
        for (const e of L.enemies.values()) if (e.st !== 3 && !ENEMIES[e.type].fly) foes.push(e);
        HB.list.forEach((h, i) => {
          h.active = i < HB.want;
          if (!h.active || !players.length) return;
          const owner = players[i % players.length], ox = owner.pos.x, oz = owner.pos.z;
          if (!h.snapped || Math.hypot(h.x - ox, h.z - oz) > 16) { h.x = ox + (i - 1) * 1.1; h.z = oz + 1.6; h.rx = h.x; h.rz = h.z; h.snapped = true; clampOpen(h); }
          // the nearest hostile near me or near the player I'm minding
          let tg = null, bd = 10;
          for (const e of foes) { const d = Math.min(Math.hypot(e.x - h.x, e.z - h.z), Math.hypot(e.x - ox, e.z - oz) + 1.5); if (d < bd) { bd = d; tg = e; } }
          if (tg) {
            // each blob picks its own spot around the target, so they don't pile up on one point
            const r = ENEMIES[tg.type].r, reach = r + 0.7, ang = i * 2.1 + 0.6;
            steer(h, tg.x + Math.cos(ang) * (r + 0.35), tg.z + Math.sin(ang) * (r + 0.35), 3.8, dt);
            const d = Math.hypot(tg.x - h.x, tg.z - h.z);
            if (d < reach + 0.6) h.yaw = Math.atan2(-(tg.x - h.x), -(tg.z - h.z));
            if (d < reach + 0.1 && now > h.cd) { L.damageEnemy(tg.id, 1, 0); h.cd = now + 850; h.lunge = now; sfx('whoosh', 0.35 / (1 + Math.hypot(h.x - myHead.pos.x, h.z - myHead.pos.z) * 0.15)); }
          } else {
            const d = Math.hypot(ox - h.x, oz - h.z);
            if (d > 2.8) steer(h, ox + (i - 1) * 0.9, oz + 1.2, d > 7 ? 6 : 3.3, dt);
          }
          clampOpen(h);
        });
      }
      function cycleHelpers() {
        const n = (HB.want + 1) % 4;
        HB.want = n;
        HB.req = [n, ++HB.reqSeq];
        showToast(n ? `${n} blob helper${n > 1 ? 's' : ''} will fight beside you` : 'No blob helpers');
        sfx('chime', 0.5);
        state.hudDirty = true;
        forcePresence();
      }
      L.cycleHelpers = cycleHelpers;
      makeButton(L, new V3(-2.2, 1.0, -4.1), 0x8bd450, 'Blob helpers', cycleHelpers, { faceYaw: 0 });
      L.hudActions = (L.hudActions || []).concat([{ label: () => `Helpers: ${HB.want || 'off'}`, run: cycleHelpers }]);

      const hbBaseP = L.presence, hbBaseR = L.readPresence, hbBaseU = L.update;
      L.presence = () => {
        const p = hbBaseP();
        if (HB.req) p.hbq = HB.req.slice();
        if (L.isHost()) { const now = performance.now(); p.hb = [HB.want, ...HB.list.filter((h) => h.active).map((h) => [h.n, hq(h.x), hq(h.z), hq(h.yaw), now - h.lunge < 300 ? 1 : 0])]; }
        return p;
      };
      L.readPresence = (rec, pres, st) => {
        hbBaseR(rec, pres, st);
        if (L.isHost()) {
          const q = pres.hbq;
          if (Array.isArray(q) && q.length === 2 && int(q[0], 0, 3) && int(q[1], 0, 1e9) && q.join() !== st.hbq) { st.hbq = q.join(); if (st.hbqInit) { HB.want = q[0]; state.hudDirty = true; forcePresence(); } }
          st.hbqInit = true;
          return;
        }
        if (rec.peer !== hostId() || !Array.isArray(pres.hb) || !int(pres.hb[0], 0, 3)) return;
        HB.want = pres.hb[0];
        const seen = new Set(), now = performance.now();
        for (const a of pres.hb.slice(1, 4)) {
          if (!Array.isArray(a) || a.length !== 5 || !int(a[0], 0, 2) || !a.slice(1, 4).every((x) => num(x, 400))) continue;
          const h = HB.list[a[0]]; seen.add(h.n);
          if (!h.active) { h.rx = a[1]; h.rz = a[2]; }
          h.active = true; h.x = a[1]; h.z = a[2]; h.yaw = a[3];
          if (a[4] === 1 && now - h.lunge > 450) h.lunge = now;
        }
        for (const h of HB.list) if (!seen.has(h.n)) h.active = false;
      };
      L.update = (dt, now) => {
        hbBaseU(dt, now);
        const host = L.isHost();
        if (host) hostHelpers(dt, now);
        const here = state.level === L.idx && state.mode !== 'menu';
        for (const h of HB.list) {
          const m = h.m;
          m.g.visible = m.shadow.visible = here && h.active;
          if (!m.g.visible) continue;
          const k = 1 - Math.exp(-dt * (host ? 30 : 10));
          if (Math.hypot(h.rx - h.x, h.rz - h.z) > 6) { h.rx = h.x; h.rz = h.z; }
          const moving = Math.hypot(h.x - h.rx, h.z - h.rz) > 0.04;
          h.rx += (h.x - h.rx) * k; h.rz += (h.z - h.rz) * k;
          const lunge = Math.max(0, 1 - (now - h.lunge) / 280);
          const hop = moving ? Math.abs(Math.sin(now * 0.012 + h.n * 2)) * 0.22 : Math.abs(Math.sin(now * 0.004 + h.n)) * 0.03;
          m.g.position.set(h.rx - Math.sin(h.yaw) * lunge * 0.4, hop, h.rz - Math.cos(h.yaw) * lunge * 0.4);
          m.g.rotation.y = h.yaw;
          m.shadow.position.set(h.rx, 0.02, h.rz);
          const sq = 1 + Math.sin(now * 0.008 + h.n) * 0.07 + lunge * 0.25;
          m.arm.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
        }
      };
    }
    L.resetRun = resetRun;
    return L;
  }

