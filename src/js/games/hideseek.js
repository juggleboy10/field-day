  // ================================================================ LEVEL: SUNSET BACKYARDS (hide-and-seek)
  const hideseek = (() => {
    const L = newLevel(12);
    const G = L.group;
    const rand = mulberry32(9090);
    const YARD = { x0: -20, x1: 20, z0: -30, z1: 6 };
    const BASE = new V3(0, 0, -12);
    L.env = {
      sky: skyTexture([[0, '#3a3a7a'], [0.3, '#8a5a9a'], [0.42, '#f08a6a'], [0.49, '#ffc070'], [0.51, '#ffd9a0'], [0.53, '#7a8a5a'], [1, '#4a5a3a']]),
      bg: 0xf0a878, fog: [0xf2b48a, 45, 170], hemi: [0xffd8b0, 0x5a6a3a, 0.78],
      sun: [0xffb070, 0.9], sunDir: new V3(-0.7, 0.32, -0.6), ambient: [0x7a6a8a, 0.32],
      sprite: { tex: paleSunTex, pos: new V3(-260, 70, -230), scale: 80 },
    };
    // things you bump into (2D boxes), and things you can't see through (3D boxes)
    const SOLIDS = [], OCCL = [];
    L.SOLIDS = SOLIDS;
    L.OCCL = OCCL;
    function solidBox(mat, x0, x1, y0, y1, z0, z1, opts) {
      const o = opts || {};
      const m = addBox(G, x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      if (o.solid !== false) SOLIDS.push({ x0, x1, z0, z1 });
      if (o.occlude !== false) OCCL.push({ x0, x1, y0, y1, z0, z1 });
      return m;
    }
    const occlOnly = (x0, x1, y0, y1, z0, z1) => OCCL.push({ x0, x1, y0, y1, z0, z1 });

    // ---------------------------------------------------------------- ground, fence, houses
    const lawn = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#6aa04a'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#74ab52'; for (let i = 0; i < 4; i += 2) g.fillRect(i * 64, 0, 64, 256);
      for (let i = 0; i < 4000; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,200,0.05)' : 'rgba(0,40,0,0.08)'; g.fillRect(rand() * 256, rand() * 256, 2, 2); }
    }).tex;
    lawn.wrapS = lawn.wrapT = THREE.RepeatWrapping;
    lawn.repeat.set(30, 30);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({ map: lawn }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -12;
    G.add(ground);
    // a privacy fence around the yard
    const boardMat = lam(0xb07a4a), boardDark = lam(0x8a5a34);
    const fenceGeo = boxg(0.16, 1.9, 0.04);
    const fence = new THREE.InstancedMesh(fenceGeo, boardMat, 600);
    let fi = 0;
    const _m = new THREE.Matrix4(), _q = new Q4(), _s = new V3(1, 1, 1), _p = new V3();
    function fenceLine(ax, az, bx, bz) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 0.17), ang = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
      _q.setFromAxisAngle(UP, ang);
      for (let k = 0; k < n && fi < 600; k++) { const t = (k + 0.5) / n; _m.compose(_p.set(ax + (bx - ax) * t, 0.95, az + (bz - az) * t), _q, _s); fence.setMatrixAt(fi++, _m); }
      addBox(G, Math.abs(bx - ax) || 0.08, 0.1, Math.abs(bz - az) || 0.08, boardDark, (ax + bx) / 2, 1.55, (az + bz) / 2);
    }
    fenceLine(YARD.x0, YARD.z0, YARD.x1, YARD.z0);
    fenceLine(YARD.x0, YARD.z0, YARD.x0, YARD.z1);
    fenceLine(YARD.x1, YARD.z0, YARD.x1, YARD.z1);
    fence.count = fi;
    G.add(fence);
    // houses peeking over the fence, with warm windows
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffd08a });
    function house(x, z, w, d, h, color, face) {
      addBox(G, w, h, d, lam(color), x, h / 2, z);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * 0.62, 2.4, 4, 1), lam(0x6a3a34));
      roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, d / w); roof.position.set(x, h + 1.2, z); G.add(roof);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.2), winMat);
        win.position.set(x - w / 3 + i * w / 3, 1.6 + j * 2.6, z + face * (d / 2 + 0.02));
        if (face < 0) win.rotation.y = Math.PI;
        G.add(win);
      }
    }
    for (const [x, c] of [[-26, 0xd8c8a8], [-6, 0xb8c8d8], [14, 0xe0b8a0], [32, 0xc8d8b0]]) house(x, -42, 13, 9, 6, c, 1);
    house(0, 13, 22, 10, 6.5, 0xe8dcc0, -1);
    // the back porch of our house, with a step down to the lawn
    addBox(G, 10, 0.4, 2.5, lam(0x9a6a44), 0, 0.2, 7.2);
    // string lights from the porch out to the home tree
    const bulbMat = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffd08a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const bulbs = [];
    for (const sx of [-1, 1]) for (let k = 1; k < 12; k++) {
      const t = k / 12, x = sx * 4 * (1 - t) + sx * 0.6 * t, z = 6.5 * (1 - t) + -11 * t, y = 3.0 - Math.sin(t * Math.PI) * 0.6;
      const s = new THREE.Sprite(bulbMat); s.position.set(x, y, z); s.scale.set(0.35, 0.35, 1); G.add(s); bulbs.push(s);
    }
    L.bulbs = bulbs;

    // ---------------------------------------------------------------- home base: the big oak
    addCyl(G, 0.55, 0.75, 3.4, 12, lam(0x5a3e28), BASE.x, 1.7, BASE.z);
    SOLIDS.push({ x0: BASE.x - 0.6, x1: BASE.x + 0.6, z0: BASE.z - 0.6, z1: BASE.z + 0.6 });
    OCCL.push({ x0: BASE.x - 0.55, x1: BASE.x + 0.55, y0: 0, y1: 3.2, z0: BASE.z - 0.55, z1: BASE.z + 0.55 });
    const leafMat = lam(0x4a7a34);
    for (const [dx, dy, dz, s] of [[0, 5.0, 0, 2.6], [-1.6, 4.3, 0.6, 1.8], [1.5, 4.5, -0.5, 1.9], [0.3, 4.2, 1.6, 1.7], [-0.4, 4.4, -1.6, 1.8]]) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), leafMat); c.position.set(BASE.x + dx, dy, BASE.z + dz); G.add(c);
    }
    const homeRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.55, 40), new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.6 }));
    homeRing.rotation.x = -Math.PI / 2; homeRing.position.set(BASE.x, 0.02, BASE.z); G.add(homeRing);
    makePlate(G, 'HOME', 0.6, 0.22, new V3(BASE.x, 1.55, BASE.z + 0.78), 0, { bg: '#5a3e28', fg: '#fff2c8', size: 0.8 });

    // ---------------------------------------------------------------- hiding places
    // spots: where a bot hides, the path it walks to get there, how low it crouches,
    // and a "peek" point: a seeker standing there can see into the spot
    const SPOTS = [];
    function spot(name, x, z, path, crouch, peek) { SPOTS.push({ name, x, z, path, crouch, peek: peek || null }); }
    const wood = lam(0xa8774a), woodDark = lam(0x7a5434), roofMat = lam(0x8a3a34), trim = lam(0xf2ead8);
    // the garden shed, door facing the lawn
    {
      const x0 = -17, x1 = -13, z0 = -26, z1 = -22, h = 2.4, t = 0.12;
      solidBox(wood, x0, x0 + t, 0, h, z0, z1);
      solidBox(wood, x0, x1, 0, h, z0, z0 + t);
      solidBox(wood, x0, x1, 0, h, z1 - t, z1);
      solidBox(wood, x1 - t, x1, 0, h, z0, -24.6);
      solidBox(wood, x1 - t, x1, 0, h, -23.4, z1);
      solidBox(wood, x1 - t, x1, 2.0, h, -24.6, -23.4, { solid: false });
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 3.0, 1.2, 4, 1), roofMat);
      roof.rotation.y = Math.PI / 4; roof.position.set(-15, h + 0.6, -24); G.add(roof);
      occlOnly(x0, x1, h, h + 1.2, z0, z1);
      addBox(G, 1.0, 0.8, 0.5, woodDark, -16.3, 0.4, -22.6);
      spot('the shed', -16.1, -25.2, [[-11.4, -24], [-13.0, -24], [-15.2, -24.4]], 0.85, [-12.4, -24]);
    }
    // the playhouse, door facing the lawn
    {
      const x0 = 13.5, x1 = 16.5, z0 = -25.5, z1 = -22.5, h = 2.0, t = 0.1;
      const pmat = lam(0xf2c8d8);
      solidBox(pmat, x1 - t, x1, 0, h, z0, z1);
      solidBox(pmat, x0, x1, 0, h, z0, z0 + t);
      solidBox(pmat, x0, x1, 0, h, z1 - t, z1);
      solidBox(pmat, x0, x0 + t, 0, h, z0, -24.5);
      solidBox(pmat, x0, x0 + t, 0, h, -23.5, z1);
      solidBox(pmat, x0, x0 + t, 1.6, h, -24.5, -23.5, { solid: false });
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 2.3, 1.1, 4, 1), lam(0x7a5aa8));
      roof.rotation.y = Math.PI / 4; roof.position.set(15, h + 0.55, -24); G.add(roof);
      occlOnly(x0, x1, h, h + 1.1, z0, z1);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), lam(0x3a2a4a)); win.position.set(15, 1.3, -22.44); G.add(win);
      spot('the playhouse', 15.9, -25.0, [[11.6, -24], [13.5, -24], [15.2, -24.4]], 0.7, [12.6, -24]);
    }
    // a tall hedge along the west side, with a hidden strip behind it
    {
      const hm = lam(0x3e6a2e);
      solidBox(hm, -14.5, -13.5, 0, 1.85, -17, -6);
      for (let k = 0; k < 12; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), hm); b.position.set(-14 + (rand() - 0.5) * 0.3, 1.6 + rand() * 0.3, -16.5 + k * 0.95); G.add(b); }
      spot('behind the hedge', -16.6, -11.5, [[-12.3, -5], [-16.2, -5], [-16.6, -9]], 0.95);
      spot('the back of the hedge', -17.5, -15.8, [[-12.3, -18.2], [-16.5, -18.2], [-17.5, -17]], 0.9);
    }
    // tall grass by the back fence: crouch in it and you vanish
    {
      const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 1, 4), lam(0x8aa84a), 700);
      for (let k = 0; k < 700; k++) {
        const h = 0.9 + rand() * 0.6;
        _m.compose(_p.set(-10 + rand() * 5, h / 2, -29.6 + rand() * 4.4), _q.setFromAxisAngle(UP, rand() * 6), _s.set(1, h, 1));
        blades.setMatrixAt(k, _m);
        blades.setColorAt(k, new THREE.Color().setHSL(0.18 + rand() * 0.08, 0.5, 0.35 + rand() * 0.12));
      }
      _s.set(1, 1, 1);
      G.add(blades);
      occlOnly(-10, -5, 0, 1.2, -29.6, -25.2);
      spot('the tall grass', -7.6, -27.8, [[-1.5, -21], [-7.6, -23.4], [-7.6, -26.5]], 0.5);
    }
    // a camping tent: fabric you can walk into, but not see through
    {
      const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.5, 2.4, 3, 1, true), new THREE.MeshLambertMaterial({ color: 0xe8803a, side: THREE.DoubleSide }));
      tent.rotation.set(Math.PI / 2, 0, 0); tent.scale.set(1, 1, 1.1); tent.position.set(9, 0.75, -4); G.add(tent);
      occlOnly(7.9, 10.1, 0, 1.5, -5.2, -2.8);
      spot('the tent', 9, -4.4, [[9, -0.8], [9, -2.6]], 0.55, [9, -1.6]);
    }
    // the family car in the driveway
    {
      solidBox(lam(0x3a6aa8), -8.2, -3.8, 0.3, 1.1, 1.1, 2.9);
      solidBox(lam(0x3a6aa8), -7.4, -4.8, 1.1, 1.55, 1.2, 2.8);
      const glass = new THREE.Mesh(boxg(2.5, 0.42, 1.5), new THREE.MeshLambertMaterial({ color: 0x9ac8e8, transparent: true, opacity: 0.6 }));
      glass.position.set(-6.1, 1.33, 2); G.add(glass);
      for (const [x, z] of [[-7.4, 1.1], [-4.6, 1.1], [-7.4, 2.9], [-4.6, 2.9]]) { const w = addCyl(G, 0.32, 0.32, 0.22, 14, lam(0x222228), x, 0.32, z); w.rotation.x = Math.PI / 2; }
      occlOnly(-8.2, -3.8, 0, 0.3, 1.2, 2.8);
      spot('behind the car', -6.0, 3.8, [[-9.4, 0.2], [-9.4, 3.8]], 0.6);
    }
    // the woodpile by the east fence
    {
      solidBox(woodDark, 16.5, 18.5, 0, 1.3, -14, -10);
      for (let k = 0; k < 18; k++) { const l = addCyl(G, 0.13, 0.13, 1.9, 8, wood, 16.7 + (k % 6) * 0.33, 0.2 + Math.floor(k / 6) * 0.4, -12); l.rotation.x = Math.PI / 2; }
      spot('behind the woodpile', 19.2, -12, [[15.8, -8.8], [19.2, -8.8]], 0.55);
    }
    // the trampoline: duck underneath
    {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.06, 6, 32), lam(0x2a6aa8)); ring.rotation.x = Math.PI / 2; ring.position.set(5, 0.9, -20); G.add(ring);
      const mat = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32), lam(0x222230)); mat.rotation.x = -Math.PI / 2; mat.position.set(5, 0.88, -20); G.add(mat);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.8, 32, 1, true), new THREE.MeshLambertMaterial({ color: 0x2a6aa8, side: THREE.DoubleSide }));
      skirt.position.set(5, 0.48, -20); G.add(skirt);
      occlOnly(3.1, 6.9, 0, 0.85, -21.9, -18.1);
      spot('under the trampoline', 5, -20, [[5, -16.6], [5, -18.6]], 0.35);
    }
    // the bins by the back fence
    {
      for (const x of [-3, -1.8, -0.6]) { solidBox(lam(x < -2 ? 0x3a6a3a : 0x3a4a6a), x - 0.5, x + 0.5, 0, 1.2, -28.6, -27.8); }
      spot('behind the bins', -1.8, -29.3, [[1.2, -26], [1.2, -29.3]], 0.55);
    }
    // the play fort: crawl in under the platform
    {
      for (const [x, z] of [[-5, -19], [-3, -19], [-5, -17], [-3, -17]]) addBox(G, 0.14, 2.8, 0.14, wood, x, 1.4, z);
      solidBox(wood, -5.1, -2.9, 1.25, 1.4, -19.1, -16.9, { solid: false });
      solidBox(woodDark, -5.1, -4.95, 0, 1.25, -19.1, -16.9);
      solidBox(woodDark, -3.05, -2.9, 0, 1.25, -19.1, -16.9);
      solidBox(woodDark, -5.1, -2.9, 0, 1.25, -19.1, -18.95);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.7, 0.9, 4, 1), lam(0x3a8a5a)); roof.rotation.y = Math.PI / 4; roof.position.set(-4, 3.25, -18); G.add(roof);
      const slide = new THREE.Mesh(boxg(0.7, 0.06, 3.2), lam(0xf2c83a)); slide.position.set(-1.2, 0.75, -18); slide.rotation.z = -0.48; slide.rotation.y = Math.PI / 2; G.add(slide);
      spot('under the fort', -4.0, -18.4, [[-4, -14.8], [-4, -16.4]], 0.55, [-4, -15.8]);
    }
    // round bushes
    for (const [x, z] of [[11, -15], [-11, -2], [3, -27.4]]) {
      const bm = lam(0x4a8a3a);
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), bm); b.position.set(x, 0.85, z); b.scale.set(1, 0.75, 1); G.add(b);
      SOLIDS.push({ x0: x - 0.9, x1: x + 0.9, z0: z - 0.9, z1: z + 0.9 });
      OCCL.push({ x0: x - 0.9, x1: x + 0.9, y0: 0, y1: 1.45, z0: z - 0.9, z1: z + 0.9 });
      const ax = x - BASE.x, az = z - BASE.z, al = Math.hypot(ax, az);
      const sx = x + (ax / al) * 1.6, sz = z + (az / al) * 1.6;
      const side = [x + (az / al) * 2.0, z - (ax / al) * 2.0];
      spot('behind a bush', sx, sz, [side, [sx, sz]], 0.5);
    }
    // a picnic table with a long tablecloth
    {
      solidBox(lam(0xf2f0e8), 10.8, 13.2, 0.72, 0.8, 0.3, 1.7, { solid: false });
      const cloth = new THREE.Mesh(boxg(2.46, 0.72, 1.46), new THREE.MeshLambertMaterial({ color: 0xd84a4a }));
      cloth.position.set(12, 0.4, 1); G.add(cloth);
      occlOnly(10.8, 13.2, 0, 0.72, 0.3, 1.7);
      for (const z of [-0.3, 2.3]) addBox(G, 2.4, 0.08, 0.35, wood, 12, 0.45, z);
      spot('under the picnic table', 12, 1, [[12, -1.4], [12, 0.6]], 0.4, [12, -0.6]);
    }
    // a few things just for looks: a grill, chairs, a doghouse, flower beds
    addCyl(G, 0.35, 0.3, 0.5, 12, lam(0x222228), 4.5, 1.0, 4.4);
    for (const [x, z] of [[4.2, 4.4], [4.8, 4.4]]) addBox(G, 0.04, 0.9, 0.04, lam(0x222228), x, 0.45, z);
    for (const x of [-2.5, -1]) { addBox(G, 0.6, 0.06, 0.6, lam(0x3a8aa8), x, 0.42, 4.6); addBox(G, 0.6, 0.6, 0.06, lam(0x3a8aa8), x, 0.72, 4.9); }
    solidBox(lam(0xc8783a), -18.8, -17.2, 0, 1.1, 2.6, 4.4);
    for (const [x0, x1, z0, z1] of [[-19.6, -14, -29.7, -28.3], [14, 19.6, -29.7, -28.3]]) {
      addBox(G, x1 - x0, 0.2, z1 - z0, lam(0x5a3a24), (x0 + x1) / 2, 0.1, (z0 + z1) / 2);
      for (let k = 0; k < 14; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), lam([0xff6a8a, 0xffd23f, 0xb388ff, 0xffffff][k % 4])); f.position.set(x0 + 0.3 + rand() * (x1 - x0 - 0.6), 0.35, z0 + 0.2 + rand() * (z1 - z0 - 0.4)); G.add(f); }
    }
    L.SPOTS = SPOTS;
    L.BASE = BASE;

    // ---------------------------------------------------------------- sight and movement
    // does the line from a to b pass through anything you can't see through?
    function blocked(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      for (const o of OCCL) {
        let t0 = 0, t1 = 1, ok = true;
        for (const [p, d, lo, hi] of [[a.x, dx, o.x0, o.x1], [a.y, dy, o.y0, o.y1], [a.z, dz, o.z0, o.z1]]) {
          if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { ok = false; break; } continue; }
          let u0 = (lo - p) / d, u1 = (hi - p) / d;
          if (u0 > u1) { const tmp = u0; u0 = u1; u1 = tmp; }
          t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
          if (t0 > t1) { ok = false; break; }
        }
        if (ok && t1 > 0.02 && t0 < 0.98) return true;
      }
      return false;
    }
    L.blocked = blocked;
    // push a circle of radius r out of solid things and keep it in the yard
    function pushOut(x, z, r) {
      for (const s of SOLIDS) {
        if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r) {
          const dl = x - (s.x0 - r), dr = s.x1 + r - x, db = z - (s.z0 - r), df = s.z1 + r - z;
          const m = Math.min(dl, dr, db, df);
          if (m === dl) x = s.x0 - r; else if (m === dr) x = s.x1 + r; else if (m === db) z = s.z0 - r; else z = s.z1 + r;
        }
      }
      return [clamp(x, YARD.x0 + r, YARD.x1 - r), clamp(z, YARD.z0 + r, YARD.z1 + 0.4)];
    }
    L.pushOut = pushOut;

    // ---------------------------------------------------------------- the game
    const HIDE_S = 25, SEEK_S = 150, RESULT_S = 8;
    const HOME_SPOT = new V3(BASE.x, 0, BASE.z + 1.9);
    const BOT_NAMES = ['Pip', 'Juno', 'Bodhi', 'Mabel', 'Ozzie', 'Wren', 'Toby', 'Ivy'];
    const EV = { START: 1, FOUND: 2, SEEK: 3, SEEKERS_WIN: 4, HIDERS_WIN: 5, ENDED: 6 };
    const R = { rid: 0, ph: 0, endAt: 0, seekers: [], hiders: [], found: [], win: -1, ev: [0, 0, '', '', ''] };
    L.round = R;
    const bots = new Map();
    L.bots = bots;
    const me = { finds: 0, wins: 0, crouch: false, tagSeq: 0, tags: [], tagCool: 0, req: null };
    L.me = me;
    const herePeers = () => {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    };
    const isHost = () => herePeers()[0] === state.myPeer;
    L.isHost = isHost;
    const isBot = (id) => typeof id === 'string' && id[0] === 'b' && bots.has(id);
    function nameOf(id) {
      if (id === state.myPeer) return state.name;
      if (bots.has(id)) return bots.get(id).name;
      const rec = remotes.get(id);
      return rec ? rec.name : 'someone';
    }
    const myRole = () => (R.seekers.includes(state.myPeer) ? 'seek' : R.hiders.includes(state.myPeer) ? 'hide' : 'none');
    // where a hider's head is (for sight checks and tagging)
    function headOf(id) {
      if (id === state.myPeer) return myHead.pos;
      const b = bots.get(id);
      if (b) return new V3(b.x, b.headY, b.z);
      const rec = remotes.get(id);
      return rec && rec.hasH ? rec.cur.h.pos : null;
    }

    // ---------------------------------------------------------------- bots
    const botLabelCache = new Map();
    function labelSprite(text) {
      if (botLabelCache.has(text)) return new THREE.Sprite(botLabelCache.get(text));
      const c = canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(30,24,44,0.75)'; g.fill(); g.fillStyle = '#fff6e4'; g.font = `700 34px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 33); });
      const m = new THREE.SpriteMaterial({ map: c.tex, transparent: true, depthWrite: false });
      botLabelCache.set(text, m);
      return new THREE.Sprite(m);
    }
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xff3a4a });
    function makeBot(id, n, look) {
      const [ci, hat, face, shirt, sc] = look;
      const g = new THREE.Group();
      const av = buildAvatar(PLAYER_COLORS[ci].hex, hat, face, true, shirt, sc);
      g.add(av);
      const label = labelSprite(BOT_NAMES[n % BOT_NAMES.length]);
      label.scale.set(0.7, 0.175, 1); label.position.y = 0.42; g.add(label);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.025, 6, 20), bandMat);
      band.rotation.x = Math.PI / 2; band.position.y = 0.06; band.visible = false; g.add(band);
      G.add(g);
      const b = { id, n, name: BOT_NAMES[n % BOT_NAMES.length], look, x: BASE.x, z: BASE.z + 2.4, yaw: 0, headY: 1.55, crouch: 1, role: 'hide', route: [], spot: null, g, band, label, rx: BASE.x, rz: BASE.z + 2.4, plan: [], lookT: 0, spotT: new Map(), mv: 0 };
      bots.set(id, b);
      return b;
    }
    function clearBots() { for (const b of bots.values()) G.remove(b.g); bots.clear(); }
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function walk(b, dt, speed) {
      if (!b.route.length) return true;
      const [tx, tz] = b.route[0], dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { b.route.shift(); b.stuckT = 0; return !b.route.length; }
      const step = Math.min(d, speed * dt);
      const ox = b.x, oz = b.z;
      [b.x, b.z] = pushOut(b.x + (dx / d) * step, b.z + (dz / d) * step, 0.28);
      // something in the way: step to the side and try again
      if (Math.hypot(b.x - ox, b.z - oz) < step * 0.3) b.stuckT = (b.stuckT || 0) + dt; else b.stuckT = Math.max(0, (b.stuckT || 0) - dt);
      if (b.stuckT > 0.6) {
        b.stuckT = 0;
        const side = rand() < 0.5 ? 1 : -1;
        b.route.unshift([b.x - (dz / d) * 2.2 * side - (dx / d) * 0.6, b.z + (dx / d) * 2.2 * side - (dz / d) * 0.6]);
      }
      b.yaw = Math.atan2(-dx, -dz);
      b.mv = 1;
      return false;
    }
    const EYE = 1.5;
    const _eye = new V3(), _tgt = new V3();
    // can this seeker bot see that hider right now?
    function botSees(b, id) {
      const h = headOf(id);
      if (!h) return false;
      const dx = h.x - b.x, dz = h.z - b.z, d = Math.hypot(dx, dz);
      if (d < 1.1) return true;
      if (d > 18) return false;
      let da = Math.atan2(-dx, -dz) - b.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      // looking right into a hiding place
      for (const s of SPOTS) if (s.peek && Math.hypot(b.x - s.peek[0], b.z - s.peek[1]) < 1.4 && Math.hypot(h.x - s.x, h.z - s.z) < 1.3) return true;
      if (Math.abs(da + (b.glance || 0)) > 1.05) return false;
      _eye.set(b.x, EYE, b.z);
      if (!blocked(_eye, _tgt.set(h.x, h.y, h.z))) return true;
      return h.y > 1.1 && !blocked(_eye, _tgt.set(h.x, h.y - 0.45, h.z));
    }
    L.botSees = botSees;
    function botSeek(b, dt) {
      b.glance = Math.sin(performance.now() * 0.0016 + b.n * 2) * 0.7;
      if (b.spinT > 0) {
        b.spinT -= dt;
        b.yaw += dt * (Math.PI * 2 / 3.2);
      } else if (b.lookT > 0) {
        b.lookT -= dt;
        b.yaw += Math.sin(performance.now() * 0.003 + b.n) * dt * 1.4;
      } else if (walk(b, dt, 2.5)) {
        // arrived somewhere: plan the next hiding place to check
        if (b.target) { b.lookT = 1.1; const s = b.target; b.yaw = Math.atan2(-(s.x - b.x), -(s.z - b.z)); b.target = null; return; }
        if (!b.plan.length) b.plan = shuffle(SPOTS.slice());
        b.plan.sort((p, q) => Math.hypot(p.path[0][0] - b.x, p.path[0][1] - b.z) - Math.hypot(q.path[0][0] - b.x, q.path[0][1] - b.z));
        const s = b.plan.shift();
        b.target = s;
        b.route = [s.path[0].slice(), (s.peek || s.path[Math.min(1, s.path.length - 1)]).slice()];
      }
      for (const id of R.hiders.slice()) {
        const k = b.spotT.get(id) || 0;
        if (botSees(b, id)) {
          const nk = k + dt;
          b.spotT.set(id, nk);
          if (nk > 0.6) found(id, b.id);
        } else b.spotT.set(id, Math.max(0, k - dt));
      }
    }

    // ---------------------------------------------------------------- rounds (run by the host)
    function announce(code, a, b, extra) {
      R.ev = [R.ev[0] + 1, code, a || '', b || '', extra || ''];
      showEvent(R.ev);
      forcePresence();
    }
    function startRound(kind, requester) {
      const humans = herePeers();
      clearBots();
      let seekers, hiders;
      if (kind === 1) { seekers = [requester]; hiders = humans.filter((p) => p !== requester); }
      else { seekers = []; hiders = humans.slice(); }
      const nb = kind === 1 ? Math.max(2, 4 - hiders.length) : Math.max(2, 3 - hiders.length);
      const spots = shuffle(SPOTS.slice());
      const names = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
      const look = () => [Math.floor(rand() * PLAYER_COLORS.length), Math.floor(rand() * HATS.length), Math.floor(rand() * FACES.length), Math.floor(rand() * SHIRTS.length), Math.floor(rand() * SHIRT_COLORS.length)];
      for (let i = 0; i < nb; i++) {
        const b = makeBot('b' + (i + 1), names[i], look());
        b.spot = spots[i];
        b.route = spots[i].path.map((p) => p.slice()).concat([[spots[i].x, spots[i].z]]);
        b.x = b.rx = BASE.x + (rand() - 0.5) * 3; b.z = b.rz = BASE.z + 2.2 + rand();
        hiders.push(b.id);
      }
      if (kind === 2) {
        const s = makeBot('b0', names[nb], look());
        s.role = 'seek'; s.x = s.rx = HOME_SPOT.x; s.z = s.rz = HOME_SPOT.z; s.yaw = 0;
        seekers.push('b0');
      }
      Object.assign(R, { rid: R.rid + 1, ph: 1, endAt: performance.now() + HIDE_S * 1000, seekers, hiders, found: [], win: -1 });
      announce(EV.START, seekers.join(','), '');
    }
    function found(id, by) {
      if (R.ph !== 2 || !R.hiders.includes(id)) return;
      R.hiders = R.hiders.filter((x) => x !== id);
      R.seekers.push(id);
      R.found.push(id);
      const b = bots.get(id);
      if (b) { b.role = 'seek'; b.route = []; b.plan = []; b.lookT = 0.8; b.crouch = 1; }
      announce(EV.FOUND, by, id);
      if (!R.hiders.length) endRound(0);
    }
    function endRound(win) {
      R.ph = 3;
      R.win = win;
      R.endAt = performance.now() + RESULT_S * 1000;
      announce(win ? EV.HIDERS_WIN : EV.SEEKERS_WIN, R.hiders.join(','), '');
    }
    function hostTag(by, id) {
      if (R.ph !== 2 || !R.seekers.includes(by) || !R.hiders.includes(id)) return;
      const a = headOf(by), h = headOf(id);
      if (!a || !h || Math.hypot(a.x - h.x, a.z - h.z) > 3.2) return;
      found(id, by);
    }
    function hostRequest(req, from) {
      if (!Array.isArray(req) || req.length !== 2 || req[1] !== R.rid) return;
      if ((req[0] === 1 || req[0] === 2) && (R.ph === 0 || R.ph === 3)) startRound(req[0], from);
      else if (req[0] === 3 && (R.ph === 1 || R.ph === 2)) { R.ph = 0; clearBots(); announce(EV.ENDED, '', ''); }
    }
    function request(kind) {
      me.req = [kind, R.rid];
      if (isHost()) hostRequest(me.req, state.myPeer);
      forcePresence();
    }
    let wasHost = false;
    function hostStep(dt, now) {
      if (!wasHost) { wasHost = true; }
      hostRequest(me.req, state.myPeer);
      // people who left drop out of the round
      if (R.ph === 1 || R.ph === 2) {
        const here = new Set(herePeers());
        const keep = (id) => isBot(id) || here.has(id);
        if (!R.seekers.every(keep) || !R.hiders.every(keep)) { R.seekers = R.seekers.filter(keep); R.hiders = R.hiders.filter(keep); forcePresence(); }
        if (!R.seekers.length) { R.ph = 0; clearBots(); announce(EV.ENDED, '', ''); return; }
        if (R.ph === 1) for (const p of here) if (!R.seekers.includes(p) && !R.hiders.includes(p)) { R.hiders.push(p); forcePresence(); }
      }
      for (const b of bots.values()) {
        b.mv = 0;
        if (b.role === 'hide') {
          if (R.ph === 1 || R.ph === 2) { if (walk(b, dt, 2.9) && b.spot) { b.crouch = b.spot.crouch; b.yaw = Math.atan2(-(BASE.x - b.x), -(BASE.z - b.z)) + Math.PI; } }
        } else if (R.ph === 1) { b.x = HOME_SPOT.x; b.z = HOME_SPOT.z; b.yaw = 0; }
        else if (R.ph === 2) botSeek(b, dt);
        b.headY = 1.55 * b.crouch;
      }
      if (R.ph === 1 && now > R.endAt) {
        R.ph = 2; R.endAt = now + SEEK_S * 1000;
        for (const b of bots.values()) if (b.role === 'seek') b.spinT = 3.2;
        announce(EV.SEEK, '', '');
      }
      else if (R.ph === 2 && now > R.endAt) endRound(1);
      else if (R.ph === 3 && now > R.endAt) { R.ph = 0; clearBots(); forcePresence(); state.dirtyBoard = true; }
    }

    // ---------------------------------------------------------------- what happened, for everyone
    function showEvent(ev) {
      const [, code, a, b, extra] = ev;
      const mine = state.myPeer;
      if (code === EV.START) {
        const seekers = a.split(',');
        showToast(seekers.includes(mine) ? 'You\u2019re it! Cover your eyes and count' : `${nameOf(seekers[0])} is it. Go hide!`);
        sfx('whistle', 0.7);
      } else if (code === EV.SEEK) {
        showToast(myRole() === 'seek' ? 'Ready or not, here I come!' : `${R.seekers.map(nameOf)[0]} is coming\u2026`);
        sfx('chime', 0.8);
      } else if (code === EV.FOUND) {
        if (b === mine) { showToast(`${nameOf(a)} found you! Now help them seek`); sfx('tagged', 0.9); }
        else if (a === mine) { me.finds += 1; showToast(`You found ${nameOf(b)}!`); sfx('coin', 0.9); state.dirtyBoard = true; }
        else { showToast(`${nameOf(a)} found ${nameOf(b)}`); sfx('click', 0.6); }
      } else if (code === EV.SEEKERS_WIN) { showToast('Everyone was found. The seekers win!'); sfx('fanfare', 0.8); }
      else if (code === EV.HIDERS_WIN) {
        const left = a ? a.split(',').filter(Boolean) : [];
        if (left.includes(mine)) { me.wins += 1; state.dirtyBoard = true; showToast('Time\u2019s up! You stayed hidden'); sfx('fanfare', 0.9); }
        else showToast(`Time\u2019s up! ${left.map(nameOf).join(', ')} stayed hidden`);
      } else if (code === EV.ENDED) showToast('Round ended');
      state.hudDirty = true;
      state.dirtyBoard = true;
      void extra;
    }

    // ---------------------------------------------------------------- tagging
    function tryTag(id) {
      const now = performance.now();
      if (now < me.tagCool) return;
      me.tagCool = now + 600;
      if (isHost()) hostTag(state.myPeer, id);
      else { me.tags.push([++me.tagSeq, id]); if (me.tags.length > 4) me.tags.shift(); forcePresence(); }
      sfx('whoosh', 0.6);
    }
    const _cf = new V3(), _cq = new Q4(), _cp = new V3(), _to = new V3();
    // browser: E or click tags whoever you're looking at, if they're close
    L.onUse = () => {
      if (R.ph !== 2 || myRole() !== 'seek') return R.ph === 1 && myRole() === 'seek';
      camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
      _cf.set(0, 0, -1).applyQuaternion(_cq);
      let best = null, bestA = 0.5;
      for (const id of R.hiders) {
        const h = headOf(id);
        if (!h) continue;
        for (const dy of [0, -0.45, -0.9]) {
          _to.set(h.x - _cp.x, h.y + dy - _cp.y, h.z - _cp.z);
          const d = _to.length();
          if (d > 2.6) continue;
          const a = Math.acos(clamp(_to.dot(_cf) / d, -1, 1));
          if (a < bestA) { bestA = a; best = id; }
        }
      }
      if (best) tryTag(best); else showToast('Nobody close enough. Get right up to them!');
      return true;
    };
    function vrTags() {
      if (state.mode !== 'vr' || R.ph !== 2 || myRole() !== 'seek') return;
      for (const s of SIDES) {
        const hp = myHands[s];
        if (!hp.ok) continue;
        for (const id of R.hiders) {
          const h = headOf(id);
          if (!h) continue;
          if (hp.pos.distanceTo(h) < 0.5 || hp.pos.distanceTo(_to.set(h.x, h.y - 0.5, h.z)) < 0.5) { tryTag(id); haptic(vrHands[s], 0.8, 60); return; }
        }
      }
    }

    // ---------------------------------------------------------------- blindfold, crouching, markers
    const blindDiv = document.createElement('div');
    blindDiv.id = 'blind';
    blindDiv.setAttribute('role', 'status');
    Object.assign(blindDiv.style, { position: 'fixed', inset: '0', background: 'radial-gradient(circle at 50% 45%, #1a1424, #050308)', color: '#fff2c8', display: 'none', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', font: `800 64px ${DISPLAY}`, zIndex: '5', pointerEvents: 'none', textAlign: 'center' });
    document.body.appendChild(blindDiv);
    const blindSphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x07050c, side: THREE.BackSide, depthTest: false }));
    blindSphere.renderOrder = 998;
    blindSphere.visible = false;
    camera.add(blindSphere);
    const blindText = canvasTexture(512, 160);
    const blindPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.094), new THREE.MeshBasicMaterial({ map: blindText.tex, transparent: true, depthTest: false }));
    blindPlate.position.z = -0.25; blindPlate.renderOrder = 999; blindPlate.visible = false;
    camera.add(blindPlate);
    let blindKey = '';
    function drawBlind(n) {
      const key = String(n);
      if (key === blindKey) return;
      blindKey = key;
      blindDiv.innerHTML = `<div style="font-size:28px;font-weight:600;opacity:.8;margin-bottom:12px">Eyes closed\u2026 counting</div><div>${n}</div>`;
      const g = blindText.g;
      g.clearRect(0, 0, 512, 160);
      g.fillStyle = '#fff2c8'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `600 30px ${BODY}`; g.fillText('Eyes closed\u2026 counting', 256, 40);
      g.font = `800 80px ${DISPLAY}`; g.fillText(String(n), 256, 112);
      blindText.tex.needsUpdate = true;
    }
    const itMat = new THREE.SpriteMaterial({ map: canvasTexture(128, 128, (g) => { g.fillStyle = '#ff3a4a'; g.beginPath(); g.moveTo(64, 120); g.lineTo(20, 40); g.lineTo(108, 40); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.font = `800 34px ${DISPLAY}`; g.textAlign = 'center'; g.fillText('IT', 64, 72); }).tex, transparent: true, depthWrite: false });
    const itMarks = [];
    for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(itMat); s.scale.set(0.3, 0.3, 1); s.visible = false; G.add(s); itMarks.push(s); }
    L.eyeHeight = () => (me.crouch ? 0.9 : 1.6);
    L.onKey = (code) => {
      if (code !== 'KeyC' || state.mode !== 'flat') return;
      me.crouch = !me.crouch;
      showToast(me.crouch ? 'Crouching' : 'Standing up');
      state.hudDirty = true;
    };
    L.walkSpeed = 3;

    // ---------------------------------------------------------------- buttons, boards
    makeButton(L, new V3(-1.3, 1.0, -8.6), 0xff5c6a, 'I\u2019ll seek', () => request(1), { faceYaw: 0 });
    makeButton(L, new V3(1.3, 1.0, -8.6), 0x8bd450, 'I\u2019ll hide', () => request(2), { faceYaw: 0 });
    makeButton(L, new V3(3.4, 1.0, -8.6), 0x9a90b0, 'End round', () => request(3), { faceYaw: 0 });
    makeKiosk(L, -4.2, -6.4, 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.405, -6.8, 2.0, -9.2, 0.35);
    const sign = makeBoard(G, 720, 500, 1.9, 1.32, 6.6, 1.95, -9.2, -0.35);
    function drawSign() {
      const g = sign.g, W = 720;
      g.fillStyle = '#2a1e34'; g.fillRect(0, 0, W, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffb36b'; g.font = `800 56px ${DISPLAY}`; g.fillText('Hide and seek', 36, 76);
      let y = 120;
      for (const [label, body] of [
        ['Start', 'Press I\u2019ll seek or I\u2019ll hide by the big oak. Bots join in so there\u2019s always someone to find.'],
        ['Hiding', 'You get 25 seconds while the seeker counts. Crouch down (C in a browser) behind things: seekers can only find what they can see.'],
        ['Seeking', 'Tag hiders by touching them in VR, or by getting close and pressing E. Anyone you find joins your hunt.'],
      ]) {
        g.fillStyle = '#ffd08a'; g.font = `700 24px ${BODY}`; g.fillText(label, 36, y); y += 31;
        g.fillStyle = '#f2e8f8'; g.font = `400 24px ${BODY}`; y = wrapText(g, body, 36, y, 648, 30) + 10;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);

    // ---------------------------------------------------------------- network
    const r2 = (x) => Math.round(x * 100) / 100;
    L.presence = () => {
      const p = { hk: [me.finds, me.wins] };
      if (me.req) p.hq = me.req.slice();
      if (me.tags.length) p.ht = me.tags.slice();
      if (isHost()) {
        p.hs = [R.rid, R.ph, Math.max(0, Math.round((R.endAt - performance.now()) / 100)), R.win];
        p.hsr = [R.seekers.slice(0, 16), R.hiders.slice(0, 16), R.found.slice(0, 16)];
        p.hse = R.ev.slice();
        p.hb = Array.from(bots.values()).map((b) => [b.n, b.id === 'b0' ? 0 : Number(b.id.slice(1)), r2(b.x), r2(b.z), r2(b.yaw), Math.round(b.crouch * 100), b.role === 'seek' ? 1 : 0, b.mv, ...b.look]);
      }
      return p;
    };
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    const ids = (a) => Array.isArray(a) && a.length <= 16 && a.every((x) => typeof x === 'string' && x.length > 0 && x.length < 64);
    function applyHost(pres) {
      const hs = pres.hs;
      if (!Array.isArray(hs) || hs.length !== 4 || !int(hs[0], 0, 1e9) || !int(hs[1], 0, 3) || !int(hs[2], 0, 99999) || !int(hs[3], -1, 1)) return;
      const r = pres.hsr;
      if (!Array.isArray(r) || r.length !== 3 || !r.every(ids)) return;
      const prevPh = R.ph, prevRid = R.rid;
      const left = performance.now() + hs[2] * 100;
      Object.assign(R, { rid: hs[0], ph: hs[1], win: hs[3], seekers: r[0].slice(), hiders: r[1].slice(), found: r[2].slice() });
      if (Math.abs(left - R.endAt) > 400 || prevPh !== R.ph || prevRid !== R.rid) R.endAt = left;
      if (prevPh !== R.ph) state.hudDirty = true;
      if (Array.isArray(pres.hb)) {
        const seen = new Set();
        for (const a of pres.hb.slice(0, 12)) {
          if (!Array.isArray(a) || a.length !== 13 || !int(a[0], 0, 7) || !int(a[1], 0, 12) || !finite(a[2]) || !finite(a[3]) || !finite(a[4]) || !int(a[5], 20, 100) || !int(a[6], 0, 1) || !int(a[7], 0, 1)) continue;
          const look = a.slice(8);
          if (!int(look[0], 0, PLAYER_COLORS.length - 1) || !int(look[1], 0, HATS.length - 1) || !int(look[2], 0, FACES.length - 1) || !int(look[3], 0, SHIRTS.length - 1) || !int(look[4], 0, SHIRT_COLORS.length - 1)) continue;
          const id = 'b' + a[1];
          let b = bots.get(id);
          if (!b) { b = makeBot(id, a[0], look); b.rx = a[2]; b.rz = a[3]; }
          Object.assign(b, { x: clamp(a[2], -30, 30), z: clamp(a[3], -40, 16), yaw: a[4], crouch: a[5] / 100, role: a[6] ? 'seek' : 'hide', mv: a[7] });
          b.headY = 1.55 * b.crouch;
          seen.add(id);
        }
        for (const [id, b] of bots) if (!seen.has(id)) { G.remove(b.g); bots.delete(id); }
      }
      const ev = pres.hse;
      if (Array.isArray(ev) && ev.length === 5 && int(ev[0], 0, 1e9) && int(ev[1], 0, 9) && ev.slice(2).every((x) => typeof x === 'string' && x.length < 400) && ev[0] !== R.ev[0]) {
        const fresh = R.ev[0] !== 0;
        R.ev = ev.slice();
        if (fresh) showEvent(ev);
      }
    }
    L.readPresence = (rec, pres, st) => {
      const k = Array.isArray(pres.hk) ? pres.hk : [];
      const finds = int(k[0], 0, 99999) ? k[0] : 0, wins = int(k[1], 0, 99999) ? k[1] : 0;
      if (finds !== st.finds || wins !== st.wins) state.dirtyBoard = true;
      st.finds = finds; st.wins = wins;
      if (isHost()) {
        if (Array.isArray(pres.hq)) hostRequest(pres.hq, rec.peer);
        if (Array.isArray(pres.ht)) {
          for (const t of pres.ht.slice(-4)) {
            if (!Array.isArray(t) || t.length !== 2 || !int(t[0], 0, 1e9) || typeof t[1] !== 'string') continue;
            if (t[0] <= (st.tagSeq || 0)) continue;
            st.tagSeq = t[0];
            if (st.tagInit) hostTag(rec.peer, t[1]);
          }
        }
        st.tagInit = true;
      } else {
        if (Array.isArray(pres.ht) && pres.ht.length) { st.tagSeq = Math.max(st.tagSeq || 0, ...pres.ht.map((t) => (Array.isArray(t) && int(t[0], 0, 1e9) ? t[0] : 0))); st.tagInit = true; }
        if (rec.peer === herePeers()[0] && pres.hs) applyHost(pres);
      }
    };

    // ---------------------------------------------------------------- per frame
    const _hd = new V3();
    function standAt(spot, yaw) {
      camera.getWorldPosition(_hd);
      dolly.position.x += spot.x - _hd.x;
      dolly.position.z += spot.z - _hd.z;
      if (state.mode !== 'vr') { state.yaw = yaw || 0; state.pitch = -0.05; }
    }
    let lastPh = 0, lastRid = 0;
    L.update = (dt, now) => {
      if (isHost()) hostStep(dt, now); else wasHost = false;
      // a new round: seekers go to the oak
      if (R.rid !== lastRid || R.ph !== lastPh) {
        if (R.ph === 1 && myRole() === 'seek' && state.mode !== 'menu') standAt(HOME_SPOT, 0);
        if (R.ph !== 1) me.crouch = me.crouch && R.ph === 2;
        lastRid = R.rid; lastPh = R.ph;
      }
      const blind = R.ph === 1 && myRole() === 'seek' && state.mode !== 'menu';
      const n = Math.max(0, Math.ceil((R.endAt - now) / 1000));
      if (blind) drawBlind(n);
      blindDiv.style.display = blind && state.mode === 'flat' ? 'flex' : 'none';
      blindSphere.visible = blindPlate.visible = blind && state.mode === 'vr';
      vrTags();
      // bots
      const k = 1 - Math.exp(-dt * 10);
      for (const b of bots.values()) {
        b.rx += (b.x - b.rx) * k; b.rz += (b.z - b.rz) * k;
        const bob = b.mv ? Math.abs(Math.sin(now * 0.014 + b.n)) * 0.05 : 0;
        b.g.position.set(b.rx, b.headY + bob, b.rz);
        b.g.rotation.y = b.yaw;
        b.band.visible = b.role === 'seek';
        b.label.visible = R.ph !== 1 || myRole() !== 'seek';
      }
      // "IT" over every seeker but me
      let m = 0;
      for (const id of R.seekers) {
        if (id === state.myPeer || m >= itMarks.length || R.ph === 0) continue;
        const h = headOf(id);
        if (!h) continue;
        itMarks[m].position.set(h.x, h.y + 0.62, h.z);
        itMarks[m].visible = true;
        m++;
      }
      for (; m < itMarks.length; m++) itMarks[m].visible = false;
      for (const s of L.bulbs) s.material.opacity = 0.85 + 0.15 * Math.sin(now * 0.002);
      updateStatus(now);
    };
    let statusKey = '';
    function updateStatus(now) {
      if (!ui.status) return;
      const show = state.mode === 'flat' && state.level === L.idx && R.ph > 0;
      if (!show) { if (statusKey) { ui.status.hidden = true; statusKey = ''; } return; }
      const n = Math.max(0, Math.ceil((R.endAt - now) / 1000));
      const t = `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
      const role = myRole();
      const a = R.ph === 1 ? `Hiding time ${t}` : R.ph === 2 ? `Seeking ${t}` : R.win === 1 ? 'Hiders win' : 'Seekers win';
      const b = role === 'seek' ? 'You\u2019re it' : role === 'hide' ? (me.crouch ? 'Hiding, crouched' : 'Hiding') : 'Watching';
      const c = R.ph === 2 ? `${R.hiders.length} still hidden` : '';
      const key = `${a}|${b}|${c}`;
      if (key === statusKey) return;
      statusKey = key;
      ui.status.hidden = false;
      ui.status.replaceChildren();
      for (const [txt, col] of [[a, '#ffd08a'], [b, null], [c, null]]) { if (!txt) continue; const s = document.createElement('span'); s.textContent = txt; if (col) s.style.color = col; ui.status.append(s); }
    }

    L.rowFor = (st, isMe) => {
      const finds = isMe ? me.finds : (st.finds || 0), wins = isMe ? me.wins : (st.wins || 0);
      return { finds, wins, text: `${finds} found, ${wins} times unfound` };
    };
    L.sortRows = (a, b) => (b.finds + b.wins) - (a.finds + a.wins);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#2a1e34'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffb36b'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffb36b'; g.font = `800 60px ${DISPLAY}`; g.fillText('Sunset Backyards', 36, 82);
      g.fillStyle = '#d8c8e8'; g.font = `400 24px ${BODY}`;
      g.fillText(R.ph === 0 ? 'Press I\u2019ll seek or I\u2019ll hide by the oak' : R.ph === 3 ? (R.win === 1 ? 'The hiders won that round' : 'The seekers found everyone') : `${R.hiders.length} hiding, ${R.seekers.length} seeking`, 36, 120, W - 72);
      drawRows(g, rows, 178, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [
      { label: () => 'I\u2019ll seek', run: () => request(1), show: () => R.ph === 0 || R.ph === 3 },
      { label: () => 'I\u2019ll hide', run: () => request(2), show: () => R.ph === 0 || R.ph === 3 },
      { label: () => 'End round', run: () => request(3), show: () => R.ph === 1 || R.ph === 2 },
    ];
    L.hintsFor = () => (myRole() === 'seek' && R.ph === 2 ? [['WASD', 'move'], ['E', 'tag someone close'], ['Shift', 'run']] : [['WASD', 'move'], ['C', 'crouch'], ['Shift', 'run'], ['E', 'press a button']]);
    L.clampPlayer = (p) => {
      if (R.ph === 1 && myRole() === 'seek') {
        const dx = p.x - HOME_SPOT.x, dz = p.z - HOME_SPOT.z, d = Math.hypot(dx, dz);
        return d > 0.6 ? [-dx * (1 - 0.6 / d), -dz * (1 - 0.6 / d)] : [0, 0];
      }
      const [x, z] = pushOut(p.x, p.z, 0.25);
      return [x - p.x, z - p.z];
    };
    L.spawn = () => { dolly.position.set((Math.random() - 0.5) * 2, 0, -5.4); state.yaw = 0; };
    L.onExit = () => { blindDiv.style.display = 'none'; blindSphere.visible = blindPlate.visible = false; if (ui.status) ui.status.hidden = true; statusKey = ''; me.crouch = false; };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.00008) * 0.4;
      camera.position.set(Math.sin(a) * 10, 4.5, 4);
      camera.lookAt(0, 1.2, -16);
    };
    L.internals = { startRound, found, hostTag, EV, HOME_SPOT, request };
    return L;
  })();

