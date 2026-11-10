  // ================================================================ LEVEL: BIRDWATCHING (a Michigan forest)
  // A morning walk through a northern Michigan forest with the camera: two minutes and a roll of 24 to photograph as
  // many birds as you can. At the end the round's photos go up on the Field Notes board, each judged on how rare the
  // bird is, how well it's centred, how big it is in the frame and whether anything's in the way. Your best shot of
  // each kind of bird counts, so variety pays.
  // The birds are ones that live in Michigan: robins, chickadees and cardinals at the feeder, red-winged blackbirds in
  // the reeds, woodpeckers on the trunks, bluebirds and goldfinches in the meadow, a heron and maybe a loon on the
  // pond, an eagle overhead now and then... and, once in a long while, a Kirtland's warbler in the young jack pines,
  // singing loudly for a moment before it vanishes. It's the rarest songbird in the state and very shy: a long lens,
  // a steady hand and some luck.
  // VR: the camera's in your hand (from the watch, or pull a trigger). Raise it to your eye to look through the lens;
  // while it's there, that hand's thumbstick zooms. Trigger takes the picture.
  // Browser: the camera's out; click or Space takes a picture, the mouse wheel (or + and -) zooms.
  const birdwatch = (() => {
    const L = newLevel(59);
    const G = L.group;
    const rand = mulberry32(5959);
    const rnd = Math.random;
    L.grabless = true;
    L.walkSpeed = 2.4;
    L.bounds = { minX: -38, maxX: 38, minZ: -44, maxZ: 25 };
    L.env = {
      sky: skyTexture([[0, '#4a7ec0'], [0.3, '#86b2dc'], [0.46, '#d8e8ee'], [0.5, '#eef0dc'], [0.53, '#9aae88'], [1, '#4a5a3a']]),
      bg: 0xc8dce4, fog: [0xc6d8d4, 28, 150], hemi: [0xf4f6e8, 0x4a5a32, 0.95],
      sun: [0xfff0d0, 0.8], sunDir: new V3(0.5, 0.7, 0.35), ambient: [0x6a7a5a, 0.3],
      sprite: { tex: paleSunTex, pos: new V3(180, 220, 120), scale: 60 },
    };
    const ROUND = 120, FILM = 24;
    // the places: where you start, the pond, the meadow, the young jack pines
    const START = new V3(0, 0, 18), POND = { x: -16, z: -6, r: 8 }, MEADOW = { x: 16, z: -2, r: 10 }, JACK = { x: 9, z: -31, r: 9 };
    const FEEDER = new V3(3.2, 0, 10.5);
    const near = (x, z, o, pad) => Math.hypot(x - o.x, z - o.z) < o.r + (pad || 0);

    // ---------------------------------------------------------------- merging (a forest is lots of little shapes: one
    // mesh per material keeps it quick to draw)
    function merged(parts) {
      let n = 0;
      const geos = parts.map((p) => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; n += g.attributes.position.count; return g; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
      const v = new V3(), nm = new THREE.Matrix3(), c = new THREE.Color();
      let o = 0;
      geos.forEach((g, i) => {
        const P = parts[i], m = P.m, pa = g.attributes.position, na = g.attributes.normal;
        nm.getNormalMatrix(m);
        for (let k = 0; k < pa.count; k++) {
          v.fromBufferAttribute(pa, k).applyMatrix4(m); pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
          v.fromBufferAttribute(na, k).applyMatrix3(nm).normalize(); nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
          c.setHex(P.col); if (P.jit) c.offsetHSL(0, 0, (rand() - 0.5) * P.jit);
          col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b; o++;
        }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.computeBoundingSphere();
      return geo;
    }
    const M4 = (x, y, z, sx, sy, sz, ry) => new THREE.Matrix4().compose(new V3(x, y, z), new Q4().setFromEuler(new THREE.Euler(0, ry || 0, 0)), new V3(sx, sy == null ? sx : sy, sz == null ? sx : sz));

    // ---------------------------------------------------------------- the ground
    const floorTex = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#5e7a38'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(120,100,50,0.25)' : 'rgba(70,100,40,0.3)'; g.beginPath(); g.arc(rand() * 256, rand() * 256, 6 + rand() * 26, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < 4000; i++) { const r = rand(); g.fillStyle = r < 0.05 ? 'rgba(160,120,60,0.5)' : r < 0.5 ? 'rgba(255,255,220,0.05)' : 'rgba(20,40,10,0.1)'; g.fillRect(rand() * 256, rand() * 256, 2, 2); }
    });
    floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping; floorTex.tex.repeat.set(40, 40);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshLambertMaterial({ map: floorTex.tex }));
    ground.rotation.x = -Math.PI / 2; G.add(ground);
    // patches laid on top: the meadow's paler grass, the jack pines' sand, the trailhead clearing
    const patch = (x, z, r, color, y) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.85 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y || 0.01, z); G.add(m); return m; };
    patch(MEADOW.x, MEADOW.z, MEADOW.r + 2, 0x9ab454);
    patch(JACK.x, JACK.z, JACK.r + 2, 0xc8b47a);
    patch(START.x, START.z - 3, 7, 0x86a04a);
    // the trail: a dirt ribbon looping out to the pond, the jack pines and the meadow, and back
    const TRAIL = [[0, 20], [0, 12], [-4, 4], [-9, 2], [-12, -14], [-6, -22], [2, -26], [9, -21], [16, -14], [22, -6], [18, 6], [8, 9], [0, 12]];
    {
      const pts = TRAIL.map(([x, z]) => new V3(x, 0.02, z)), curve = new THREE.CatmullRomCurve3(pts), N = 160, W2 = 0.8;
      const pos = [], idx = [];
      for (let i = 0; i <= N; i++) {
        const p = curve.getPoint(i / N), t = curve.getTangent(i / N), sx = -t.z, sz = t.x, l = Math.hypot(sx, sz) || 1;
        pos.push(p.x + sx / l * W2, 0.02, p.z + sz / l * W2, p.x - sx / l * W2, 0.02, p.z - sz / l * W2);
        if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      G.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x9a7a52, side: THREE.DoubleSide })));
    }
    const onTrail = (x, z) => { for (let i = 0; i < TRAIL.length - 1; i++) { const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); if (Math.hypot(x - ax - dx * t, z - az - dz * t) < 2.4) return true; } return false; };

    // the pond: water, a muddy rim, reeds and lily pads
    const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 48), new THREE.MeshLambertMaterial({ color: 0x3a6a7a, transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2; water.position.set(POND.x, 0.04, POND.z); G.add(water);
    patch(POND.x, POND.z, POND.r + 1.2, 0x5a5034, 0.015);
    // ---------------------------------------------------------------- perches: everywhere a bird can sit, by kind
    const PERCH = {};
    const perch = (kind, x, y, z, extra) => { (PERCH[kind] = PERCH[kind] || []).push(Object.assign({ kind, pos: new V3(x, y, z), taken: null }, extra || {})); };

    const leafParts = [], trunkParts = [], birchParts = [], jackParts = [], miscParts = [];
    const TRUNK = 0x5a4430, BIRCH = 0xe8e4da;
    // reeds round the pond's edge (red-winged blackbirds sit on top)
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2, r = POND.r - 0.3 + rand() * 1.4, x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r;
      if (Math.hypot(x - (-9), z - 2) < 3) continue;    // (an opening where the trail comes by)
      const h = 0.9 + rand() * 0.8;
      miscParts.push({ geo: new THREE.CylinderGeometry(0.015, 0.025, h, 4), m: M4(x, h / 2, z, 1), col: 0x6a8a3a, jit: 0.1 });
      if (rand() < 0.35) miscParts.push({ geo: new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), m: M4(x, h - 0.1, z, 1), col: 0x5a3a20 });
      if (i % 4 === 0) perch('reed', x, h + 0.02, z);
    }
    for (let i = 0; i < 14; i++) { const a = rand() * Math.PI * 2, r = rand() * (POND.r - 2); const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35 + rand() * 0.25, 10), lam(0x4a8a3a)); pad.rotation.x = -Math.PI / 2; pad.position.set(POND.x + Math.cos(a) * r, 0.05, POND.z + Math.sin(a) * r); G.add(pad); }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + rand() * 0.3, r = POND.r * (0.3 + rand() * 0.55); perch('water', POND.x + Math.cos(a) * r, 0.05, POND.z + Math.sin(a) * r); }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.2, r = POND.r - 0.6; perch('shore', POND.x + Math.cos(a) * r, 0.05, POND.z + Math.sin(a) * r); }

    // the meadow: wildflowers (hummingbirds and goldfinches), fence posts (bluebirds)
    const FLOWER_COLS = [0xf5d21a, 0xf08a2a, 0xb06ad8, 0xe8e4f0, 0xe0445a];
    for (let i = 0; i < 160; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * MEADOW.r, x = MEADOW.x + Math.cos(a) * r, z = MEADOW.z + Math.sin(a) * r;
      if (onTrail(x, z)) continue;
      const h = 0.35 + rand() * 0.45;
      miscParts.push({ geo: new THREE.CylinderGeometry(0.008, 0.01, h, 3), m: M4(x, h / 2, z, 1), col: 0x5a8a3a });
      miscParts.push({ geo: new THREE.IcosahedronGeometry(0.06, 0), m: M4(x, h, z, 1, 0.6, 1), col: FLOWER_COLS[i % FLOWER_COLS.length] });
      if (i % 9 === 0) perch('flower', x, h + 0.12, z);
    }
    for (let i = 0; i < 9; i++) {
      const x = MEADOW.x - 6 + i * 1.8, z = MEADOW.z + MEADOW.r - 0.5 + Math.sin(i) * 0.3;
      miscParts.push({ geo: new THREE.BoxGeometry(0.1, 1.2, 0.1), m: M4(x, 0.6, z, 1), col: 0x7a6248, jit: 0.1 });
      if (i < 8) miscParts.push({ geo: new THREE.BoxGeometry(1.8, 0.06, 0.04), m: M4(x + 0.9, 0.95, z, 1), col: 0x8a7258 });
      if (i % 2 === 0) perch('fence', x, 1.23, z);
    }
    for (let i = 0; i < 16; i++) { const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * MEADOW.r; perch('meadow', MEADOW.x + Math.cos(a) * r, 0.02, MEADOW.z + Math.sin(a) * r); }

    // trees: maples and oaks (round clumps), white pines and spruces (cones), birches; and a few dead snags
    const trees = [];
    function deciduous(x, z, s) {
      const h = (4 + rand() * 3) * s, tr = 0.16 * s + rand() * 0.06;
      trunkParts.push({ geo: new THREE.CylinderGeometry(tr * 0.7, tr, h, 7), m: M4(x, h / 2, z, 1), col: TRUNK, jit: 0.08 });
      const tone = [0x3f7a2c, 0x4a8a34, 0x5a8a2a, 0x3a6a2a][Math.floor(rand() * 4)];
      const clumps = 3 + Math.floor(rand() * 2);
      for (let k = 0; k < clumps; k++) {
        const a = rand() * Math.PI * 2, rr = (k === 0 ? 0 : 1.1 + rand() * 0.8) * s, cr = (1.6 + rand() * 1.0) * s;
        const cx = x + Math.cos(a) * rr, cz = z + Math.sin(a) * rr, cy = h + (k === 0 ? 0.6 : -0.4 + rand() * 0.8) * s;
        leafParts.push({ geo: new THREE.IcosahedronGeometry(cr, 1), m: M4(cx, cy, cz, 1, 0.85, 1, rand() * 6), col: tone, jit: 0.12 });
        // birds sit round the lower edge of each clump, and on the very top
        for (let j = 0; j < 3; j++) { const b = rand() * Math.PI * 2; perch('branch', cx + Math.cos(b) * cr * 0.92, cy - cr * 0.3, cz + Math.sin(b) * cr * 0.92, { yaw: b }); }
        if (k === 0) perch('canopy', cx, cy + cr * 0.82, cz);
      }
      for (let j = 0; j < 3; j++) { const b = rand() * Math.PI * 2, y = 1.2 + rand() * (h - 2); perch('trunk', x + Math.cos(b) * (tr * (1 - y / h * 0.3) + 0.02), y, z + Math.sin(b) * (tr * (1 - y / h * 0.3) + 0.02), { yaw: b }); }
      trees.push({ x, z, r: tr });
    }
    function pine(x, z, s) {
      const h = (8 + rand() * 4) * s;
      trunkParts.push({ geo: new THREE.CylinderGeometry(0.12 * s, 0.24 * s, h, 7), m: M4(x, h / 2, z, 1), col: 0x4a3a2a, jit: 0.06 });
      const tone = rand() < 0.5 ? 0x2a5a32 : 0x2f6438;
      for (let k = 0; k < 4; k++) {
        const y = h * (0.3 + k * 0.18), r = (2.1 - k * 0.42) * s, ch = 2.6 * s;
        leafParts.push({ geo: new THREE.ConeGeometry(r, ch, 9), m: M4(x, y + ch / 2, z, 1, 1, 1, rand() * 6), col: tone, jit: 0.1 });
        const b = rand() * Math.PI * 2; perch('branch', x + Math.cos(b) * r * 0.85, y + 0.1, z + Math.sin(b) * r * 0.85, { yaw: b });
      }
      perch('canopy', x, h * 0.3 + 3 * 0.18 * h + 2.6 * s, z);
      trees.push({ x, z, r: 0.24 * s });
    }
    function birch(x, z, s) {
      const h = (6 + rand() * 2) * s;
      birchParts.push({ geo: new THREE.CylinderGeometry(0.09 * s, 0.13 * s, h, 7), m: M4(x, h / 2, z, 1), col: BIRCH, jit: 0.05 });
      for (let k = 0; k < 3; k++) {
        const y = 1 + rand() * (h - 2), b = rand() * Math.PI * 2;
        miscParts.push({ geo: new THREE.BoxGeometry(0.14, 0.04, 0.02), m: M4(x + Math.cos(b) * 0.1 * s, y, z + Math.sin(b) * 0.1 * s, 1, 1, 1, -b), col: 0x2a2a2a });
      }
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2, cr = (1.0 + rand() * 0.5) * s, cx = x + Math.cos(a) * 0.6 * s, cz = z + Math.sin(a) * 0.6 * s, cy = h - 0.5 + rand() * 1.2;
        leafParts.push({ geo: new THREE.IcosahedronGeometry(cr, 1), m: M4(cx, cy, cz, 1, 1.2, 1), col: 0x7aa83a, jit: 0.12 });
        const bb = rand() * Math.PI * 2; perch('branch', cx + Math.cos(bb) * cr * 0.9, cy - cr * 0.4, cz + Math.sin(bb) * cr * 0.9, { yaw: bb });
      }
      trees.push({ x, z, r: 0.13 * s });
    }
    function snag(x, z, h) {
      trunkParts.push({ geo: new THREE.CylinderGeometry(0.16, 0.3, h, 7), m: M4(x, h / 2, z, 1), col: 0x8a7a6a, jit: 0.08 });
      for (let k = 0; k < 3; k++) { const y = h * (0.5 + k * 0.15), b = rand() * Math.PI * 2, l = 1.2 - k * 0.3; trunkParts.push({ geo: new THREE.CylinderGeometry(0.04, 0.07, l, 5), m: new THREE.Matrix4().compose(new V3(x + Math.cos(b) * l / 2, y + 0.3, z + Math.sin(b) * l / 2), new Q4().setFromEuler(new THREE.Euler(Math.sin(b) * 1.1, 0, -Math.cos(b) * 1.1)), new V3(1, 1, 1)), col: 0x8a7a6a }); }
      for (let j = 0; j < 4; j++) { const b = rand() * Math.PI * 2, y = 2 + rand() * (h - 4); perch('snag', x + Math.cos(b) * 0.24, y, z + Math.sin(b) * 0.24, { yaw: b }); }
      perch('top', x, h + 0.05, z);
      trees.push({ x, z, r: 0.3 });
    }
    // where trees can't go: the clearing, the trail, the pond, the meadow, the jack pines
    const clear = (x, z, pad) => onTrail(x, z) || near(x, z, POND, 2 + pad) || near(x, z, MEADOW, 1.5 + pad) || near(x, z, JACK, 1 + pad) || Math.hypot(x - START.x, z - (START.z - 3)) < 8 + pad || trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2);
    snag(-4.5, -14.5, 13); snag(26, -24, 10); snag(-27, 6, 9);
    let tries = 0;
    while (trees.length < 95 && tries++ < 4000) {
      const x = -40 + rand() * 80, z = -46 + rand() * 72;
      if (clear(x, z, 0)) continue;
      const r = rand(), s = 0.85 + rand() * 0.4;
      if (r < 0.45) deciduous(x, z, s); else if (r < 0.75) pine(x, z, s); else birch(x, z, s);
    }
    // the young jack pines: short and scruffy, close together (Kirtland's warblers nest in just this)
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * JACK.r, x = JACK.x + Math.cos(a) * r, z = JACK.z + Math.sin(a) * r;
      if (onTrail(x, z)) continue;
      const h = 1.6 + rand() * 2.4;
      jackParts.push({ geo: new THREE.CylinderGeometry(0.04, 0.08, h, 5), m: M4(x, h / 2, z, 1), col: 0x5a4632 });
      for (let k = 0; k < 3; k++) {
        const y = h * (0.35 + k * 0.24), cr = (0.75 - k * 0.18) * (h / 3);
        jackParts.push({ geo: new THREE.IcosahedronGeometry(cr, 0), m: M4(x + (rand() - 0.5) * 0.3, y, z + (rand() - 0.5) * 0.3, 1, 0.8, 1, rand() * 6), col: 0x4a6a34, jit: 0.15 });
        if (k < 2 && rand() < 0.7) { const b = rand() * Math.PI * 2; perch('jack', x + Math.cos(b) * cr * 0.95, y - cr * 0.2, z + Math.sin(b) * cr * 0.95, { yaw: b }); }
      }
    }
    // shrubs along the edges (low perches)
    for (let i = 0; i < 40; i++) {
      const x = -36 + rand() * 72, z = -42 + rand() * 64;
      if (onTrail(x, z) || near(x, z, POND, 1) || near(x, z, JACK, 0) || Math.hypot(x - START.x, z - START.z + 3) < 6) continue;
      const r = 0.6 + rand() * 0.5;
      leafParts.push({ geo: new THREE.IcosahedronGeometry(r, 1), m: M4(x, r * 0.7, z, 1, 0.75, 1), col: 0x4a7a30, jit: 0.15 });
      const b = rand() * Math.PI * 2; perch('low', x + Math.cos(b) * r * 0.9, r * 1.0, z + Math.sin(b) * r * 0.9, { yaw: b });
    }
    // the forest floor (robins, juncos, doves, flickers)
    for (let i = 0; i < 40; i++) { const x = -30 + rand() * 60, z = -38 + rand() * 56; if (near(x, z, POND, 0.5) || near(x, z, JACK, 0)) continue; perch('ground', x, 0.02, z); }
    for (let i = 0; i < 10; i++) { const a = rand() * Math.PI * 2, r = 2 + rand() * 4; perch('ground', START.x + Math.cos(a) * r, 0.02, START.z - 4 + Math.sin(a) * r); }

    const vc = (opts) => new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, opts || {}));
    const leaves = new THREE.Mesh(merged(leafParts), vc({ flatShading: true }));
    const trunks = new THREE.Mesh(merged(trunkParts), vc());
    const birches = new THREE.Mesh(merged(birchParts), vc());
    const jacks = new THREE.Mesh(merged(jackParts), vc({ flatShading: true }));
    const misc = new THREE.Mesh(merged(miscParts), vc());
    G.add(leaves, trunks, birches, jacks, misc);
    // (what can be in the way of a photo)
    const OCC = [leaves, trunks, birches, jacks];

    // ---------------------------------------------------------------- the trailhead: a feeder, a bench, the boards
    {
      const pole = new THREE.Mesh(cyl(0.035, 0.035, 1.5, 8), lam(0x3a3a3a)); pole.position.set(FEEDER.x, 0.75, FEEDER.z); G.add(pole);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.25, 4), lam(0x8a3a2a)); roof.position.set(FEEDER.x, 1.78, FEEDER.z); roof.rotation.y = Math.PI / 4; G.add(roof);
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.6), lam(0x8a6a48)); tray.position.set(FEEDER.x, 1.5, FEEDER.z); G.add(tray);
      const seeds = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshLambertMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0.7 })); seeds.position.set(FEEDER.x, 1.62, FEEDER.z); G.add(seeds);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; perch('feeder', FEEDER.x + Math.cos(a) * 0.29, 1.53, FEEDER.z + Math.sin(a) * 0.29, { yaw: a }); }
      for (let k = 0; k < 5; k++) { const a = rand() * Math.PI * 2, r = 0.6 + rand() * 1.2; perch('feedground', FEEDER.x + Math.cos(a) * r, 0.02, FEEDER.z + Math.sin(a) * r); }
      // a bench
      addBox(G, 1.6, 0.06, 0.42, lam(0x8a6a48), -2.6, 0.45, 14.5);
      for (const dx of [-0.65, 0.65]) addBox(G, 0.08, 0.45, 0.38, lam(0x5a4430), -2.6 + dx, 0.22, 14.5);
      // the trail sign
      makePlate(G, '\u{1F426}  Birdwatching Trail', 2.6, 0.34, new V3(0, 2.75, 12.6), 0, { bg: '#2f5a32', fg: '#f4ecd0', size: 0.6 });
      for (const dx of [-1.4, 1.4]) addBox(G, 0.12, 2.95, 0.12, lam(0x5a4430), dx, 1.47, 12.55);
    }
    // the shared (but private) picture of what each bird looks like is drawn from its colours (see makeBird)

    // ---------------------------------------------------------------- the birds of Michigan
    const TIERS = {
      common: { pts: 10, name: 'common', star: '★', col: '#8bd450' },
      uncommon: { pts: 25, name: 'uncommon', star: '★★', col: '#4fc3f7' },
      rare: { pts: 60, name: 'rare', star: '★★★', col: '#b388ff' },
      vrare: { pts: 150, name: 'very rare', star: '★★★★', col: '#ff9a3d' },
      legend: { pts: 500, name: 'legendary', star: '★★★★★', col: '#ffd23f' },
    };
    // size: length in metres (drawn a little larger than life so they read at a distance)
    // hab: where it perches; shy: how close you can get before it flies (m); stay: seconds on a perch; wt: how often
    const SPECIES = [
      { id: 'robin', name: 'American Robin', tier: 'common', size: 0.25, col: { body: 0x5a5048, belly: 0xd8662a, head: 0x2a2624, beak: 0xe8b830, wing: 0x4a4038, tail: 0x2a2624 }, f: { ring: 0xf4f0e0 }, hab: ['ground', 'branch', 'low'], wt: 10, max: 3, shy: 4, stay: [3, 7], song: 'robin', where: 'Lawns and the forest floor' },
      { id: 'chickadee', name: 'Black-capped Chickadee', tier: 'common', size: 0.13, col: { body: 0x8a8a84, belly: 0xf2ede0, head: 0x1a1a1a, beak: 0x1a1a1a, wing: 0x6a6a68, tail: 0x5a5a58 }, f: { cheeks: 0xf8f8f4, bib: 0x1a1a1a }, hab: ['feeder', 'branch', 'low'], wt: 10, max: 3, shy: 2.5, stay: [2, 5], song: 'chickadee', where: 'The feeder, and everywhere' },
      { id: 'cardinal', name: 'Northern Cardinal', tier: 'common', size: 0.22, col: { body: 0xc8201e, belly: 0xd83020, head: 0xc8201e, beak: 0xf07a3a, wing: 0xa81a18, tail: 0xa81a18 }, f: { crest: 1, mask: 0x101010 }, hab: ['feeder', 'low', 'branch'], wt: 8, max: 2, shy: 4, stay: [3, 6], song: 'cardinal', where: 'The feeder and the shrubs' },
      { id: 'bluejay', name: 'Blue Jay', tier: 'common', size: 0.28, col: { body: 0x3a7ad0, belly: 0xe8eaf0, head: 0x4a8ae0, beak: 0x1a1a1a, wing: 0x2a6ad8, tail: 0x3a7ad0 }, f: { crest: 1, necklace: 0x101010, wingbar: 0xffffff }, hab: ['branch', 'ground', 'feeder'], wt: 7, max: 2, shy: 5, stay: [3, 6], song: 'jay', where: 'Oaks and the feeder' },
      { id: 'goldfinch', name: 'American Goldfinch', tier: 'common', size: 0.12, col: { body: 0xf5d21a, belly: 0xf8dc30, head: 0xf5d21a, beak: 0xf0a070, wing: 0x1a1a1a, tail: 0x1a1a1a }, f: { cap: 0x1a1a1a, wingbar: 0xffffff }, hab: ['flower', 'branch', 'feeder'], wt: 8, max: 3, shy: 3, stay: [2, 5], song: 'finch', where: 'The meadow flowers' },
      { id: 'dove', name: 'Mourning Dove', tier: 'common', size: 0.3, col: { body: 0xb8a088, belly: 0xd8c0a8, head: 0xc0a890, beak: 0x2a2a2a, wing: 0xa89070, tail: 0xa08870 }, f: { longtail: 1, spots: 0x2a2018 }, hab: ['ground', 'feedground', 'branch'], wt: 7, max: 2, shy: 5, stay: [4, 8], song: 'dove', where: 'The ground below the feeder' },
      { id: 'redwing', name: 'Red-winged Blackbird', tier: 'common', size: 0.22, col: { body: 0x141414, belly: 0x181818, head: 0x141414, beak: 0x202020, wing: 0x141414, tail: 0x141414 }, f: { epaulet: 0xd81e1e }, hab: ['reed'], wt: 8, max: 3, shy: 5, stay: [4, 9], song: 'redwing', where: 'The reeds round the pond' },
      { id: 'downy', name: 'Downy Woodpecker', tier: 'common', size: 0.17, col: { body: 0x1a1a1a, belly: 0xf4f2ec, head: 0x1a1a1a, beak: 0x2a2a2a, wing: 0x1a1a1a, tail: 0x1a1a1a }, f: { cheeks: 0xf8f8f4, nape: 0xe0201a, backstripe: 0xf4f2ec, spots: 0xffffff }, shape: 'wood', hab: ['trunk', 'snag'], wt: 7, max: 2, shy: 3.5, stay: [4, 8], song: 'drum', where: 'Tree trunks' },
      { id: 'bluebird', name: 'Eastern Bluebird', tier: 'uncommon', size: 0.18, col: { body: 0x2f6ed8, belly: 0xd2733a, head: 0x2f6ed8, beak: 0x1a1a1a, wing: 0x2a62cc, tail: 0x2a62cc }, hab: ['fence', 'meadow', 'low'], wt: 4, max: 2, shy: 5, stay: [3, 7], song: 'bluebird', where: 'The meadow fence' },
      { id: 'oriole', name: 'Baltimore Oriole', tier: 'uncommon', size: 0.2, col: { body: 0xf07818, belly: 0xf68a20, head: 0x141414, beak: 0x5a5a5a, wing: 0x141414, tail: 0xf07818 }, f: { wingbar: 0xffffff }, hab: ['branch', 'canopy'], wt: 3, max: 1, shy: 6, stay: [3, 6], song: 'oriole', where: 'High in the leafy trees' },
      { id: 'waxwing', name: 'Cedar Waxwing', tier: 'uncommon', size: 0.17, col: { body: 0xb89a70, belly: 0xe8dc90, head: 0xb89a70, beak: 0x1a1a1a, wing: 0x7a7a7a, tail: 0x6a6a6a }, f: { crest: 1, mask: 0x101010, tailtip: 0xf5d21a }, hab: ['branch', 'low'], wt: 3, max: 2, shy: 5, stay: [3, 6], song: 'thin', where: 'Fruit shrubs and treetops' },
      { id: 'redhead', name: 'Red-headed Woodpecker', tier: 'uncommon', size: 0.22, col: { body: 0x141414, belly: 0xf8f6f0, head: 0xc81e2a, beak: 0x6a6a6a, wing: 0x141414, tail: 0x141414 }, f: { wingpatch: 0xffffff }, shape: 'wood', hab: ['snag', 'trunk'], wt: 3, max: 1, shy: 5, stay: [4, 8], song: 'drum', where: 'Dead trees' },
      { id: 'grosbeak', name: 'Rose-breasted Grosbeak', tier: 'uncommon', size: 0.2, col: { body: 0x141414, belly: 0xf8f6f0, head: 0x141414, beak: 0xf0e8d0, wing: 0x141414, tail: 0x141414 }, f: { breast: 0xe0284a, wingbar: 0xffffff, bigbeak: 1 }, hab: ['branch', 'feeder'], wt: 3, max: 1, shy: 5, stay: [3, 6], song: 'robin', where: 'Leafy trees and the feeder' },
      { id: 'indigo', name: 'Indigo Bunting', tier: 'uncommon', size: 0.13, col: { body: 0x2a4ad8, belly: 0x3050e0, head: 0x2a48d0, beak: 0x6a7080, wing: 0x1e3aa8, tail: 0x1e3aa8 }, hab: ['flower', 'low', 'fence'], wt: 3, max: 1, shy: 4, stay: [3, 6], song: 'finch', where: 'Meadow edges' },
      { id: 'flicker', name: 'Northern Flicker', tier: 'uncommon', size: 0.3, col: { body: 0x9a7a5a, belly: 0xf0e4cc, head: 0x9a9a98, beak: 0x2a2a2a, wing: 0x8a6a4a, tail: 0x2a2a2a }, f: { nape: 0xe0201a, bib: 0x141414, spots: 0x1a1a1a }, shape: 'wood', hab: ['ground', 'trunk'], wt: 3, max: 1, shy: 6, stay: [4, 8], song: 'flicker', where: 'Ant hunting on the ground' },
      { id: 'tanager', name: 'Scarlet Tanager', tier: 'rare', size: 0.17, col: { body: 0xe0201a, belly: 0xe8281e, head: 0xe0201a, beak: 0xc8c0a8, wing: 0x141414, tail: 0x141414 }, hab: ['canopy', 'branch'], wt: 1.4, max: 1, shy: 7, stay: [2, 5], song: 'tanager', where: 'Treetops (look up)' },
      { id: 'hummer', name: 'Ruby-throated Hummingbird', tier: 'rare', size: 0.09, col: { body: 0x3a8a3a, belly: 0xf0f0e8, head: 0x3a8a3a, beak: 0x1a1a1a, wing: 0x5a6a5a, tail: 0x2a5a2a }, f: { throat: 0xc8102a, longbeak: 1 }, shape: 'hummer', hab: ['flower'], wt: 1.4, max: 1, shy: 2.5, stay: [1.2, 2.5], song: 'hum', where: 'Darting between the flowers' },
      { id: 'woodduck', name: 'Wood Duck', tier: 'rare', size: 0.48, col: { body: 0xd8c090, belly: 0x8a3a2a, head: 0x1a6a3a, beak: 0xe0402a, wing: 0x2a3a5a, tail: 0x2a2a3a }, f: { headstripe: 0xffffff, crest: 1 }, shape: 'duck', hab: ['water'], wt: 1.3, max: 1, shy: 8, stay: [5, 10], song: 'squeal', where: 'Out on the pond' },
      { id: 'heron', name: 'Great Blue Heron', tier: 'rare', size: 1.15, col: { body: 0x7a8aa0, belly: 0x8a9ab0, head: 0xe8e8e0, beak: 0xe0b030, wing: 0x6a7a92, tail: 0x6a7a92 }, f: { headstripe: 0x141414 }, shape: 'wader', hab: ['shore'], wt: 1.1, max: 1, shy: 9, stay: [8, 16], song: 'croak', where: 'Stalking the pond’s edge' },
      { id: 'pileated', name: 'Pileated Woodpecker', tier: 'rare', size: 0.45, col: { body: 0x141414, belly: 0x1a1a1a, head: 0x141414, beak: 0x4a4a4a, wing: 0x141414, tail: 0x141414 }, f: { crest: 0xd01a1a, cheeks: 0xffffff, wingpatch: 0xffffff }, shape: 'wood', hab: ['snag', 'trunk'], wt: 1.0, max: 1, shy: 8, stay: [5, 9], song: 'pileated', where: 'Big dead trees' },
      { id: 'loon', name: 'Common Loon', tier: 'vrare', size: 0.85, col: { body: 0x141a18, belly: 0xf4f4f0, head: 0x10261a, beak: 0x1a1a1a, wing: 0x141a18, tail: 0x141a18 }, f: { checks: 0xf4f4f0, necklace: 0xf4f4f0, eye: 0xc81010 }, shape: 'loon', hab: ['water'], special: true, shy: 10, stay: [6, 12], song: 'loon', where: 'The pond, some mornings (it dives!)' },
      { id: 'crane', name: 'Sandhill Crane', tier: 'vrare', size: 1.15, col: { body: 0x9a9a98, belly: 0xa8a8a4, head: 0xb0b0ac, beak: 0x2a2a2a, wing: 0x8a8a88, tail: 0x8a8a88 }, f: { crown: 0xd8201a }, shape: 'wader', hab: ['meadow'], special: true, shy: 11, stay: [8, 14], song: 'crane', where: 'The meadow, now and then' },
      { id: 'eagle', name: 'Bald Eagle', tier: 'vrare', size: 0.9, col: { body: 0x3a2a1e, belly: 0x3a2a1e, head: 0xf8f8f4, beak: 0xf0c020, wing: 0x32241a, tail: 0xf8f8f4 }, shape: 'eagle', hab: ['top'], special: true, shy: 14, stay: [6, 10], song: 'eagle', where: 'Soaring overhead, or on the tallest snag' },
      { id: 'kirtland', name: 'Kirtland’s Warbler', tier: 'legend', size: 0.15, col: { body: 0x5a6878, belly: 0xf2d020, head: 0x56667a, beak: 0x1a1a1a, wing: 0x4a5868, tail: 0x3a4858 }, f: { ring: 0xf8f8f4, streaks: 0x1a2028, flankstreaks: 0x2a2a2a }, hab: ['jack'], special: true, shy: 9, stay: [2.2, 3.6], song: 'kirtland', where: 'Young jack pines only. Listen for it.' },
    ];
    const SP = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

    // ---------------------------------------------------------------- a bird, built from its colours (forward is +z)
    const G_S = new THREE.SphereGeometry(1, 10, 8), G_C = new THREE.ConeGeometry(1, 1, 8), G_B = new THREE.BoxGeometry(1, 1, 1), G_CY = new THREE.CylinderGeometry(1, 1, 1, 6);
    const matCache = new Map();
    const M = (hex) => { let m = matCache.get(hex); if (!m) { m = lam(hex); matCache.set(hex, m); } return m; };
    const part = (geo, hex, x, y, z, sx, sy, sz, parent) => { const m = new THREE.Mesh(geo, M(hex)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); (parent || null) && parent.add(m); return m; };
    function makeBird(sp) {
      const s = sp.size * (sp.size < 0.3 ? 1.35 : 1), c = sp.col, f = sp.f || {}, shape = sp.shape || 'song';
      const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
      const B = { root, body, head: new THREE.Group(), wings: [], tail: null, shape, s };
      if (shape === 'wader') {
        // long legs, a long neck, a long bill
        part(G_S, c.body, 0, 0.62 * s, 0, 0.14 * s, 0.14 * s, 0.3 * s, body);
        part(G_S, c.belly, 0, 0.58 * s, 0.08 * s, 0.11 * s, 0.11 * s, 0.2 * s, body);
        for (const sx of [-1, 1]) { const leg = part(G_CY, 0x3a3a30, sx * 0.05 * s, 0.26 * s, 0, 0.012 * s, 0.52 * s, 0.012 * s, body); leg.rotation.x = 0.05; }
        const neck = part(G_CY, c.body, 0, 0.85 * s, 0.24 * s, 0.03 * s, 0.38 * s, 0.03 * s, body); neck.rotation.x = 0.5;
        B.head.position.set(0, 1.03 * s, 0.33 * s); body.add(B.head);
        part(G_S, c.head, 0, 0, 0, 0.055 * s, 0.05 * s, 0.07 * s, B.head);
        const bill = part(G_C, c.beak, 0, 0, 0.14 * s, 0.018 * s, 0.17 * s, 0.018 * s, B.head); bill.rotation.x = Math.PI / 2;
        if (f.headstripe) part(G_S, f.headstripe, 0, 0.025 * s, -0.01 * s, 0.05 * s, 0.02 * s, 0.07 * s, B.head);
        if (f.crown) part(G_S, f.crown, 0, 0.035 * s, 0.01 * s, 0.04 * s, 0.02 * s, 0.045 * s, B.head);
        for (const sx of [-1, 1]) part(G_S, 0x101010, sx * 0.045 * s, 0.01 * s, 0.035 * s, 0.01 * s, 0.01 * s, 0.01 * s, B.head);
        for (const sx of [-1, 1]) { const w = new THREE.Group(); w.position.set(sx * 0.12 * s, 0.7 * s, 0); part(G_S, c.wing, sx * 0.015 * s, -0.08 * s, -0.04 * s, 0.03 * s, 0.13 * s, 0.3 * s, w); body.add(w); B.wings.push(w); }
        B.tail = part(G_B, c.tail, 0, 0.62 * s, -0.32 * s, 0.12 * s, 0.03 * s, 0.12 * s, body);
        B.center = 0.75 * s; B.height = 1.1 * s;
        return B;
      }
      const swim = shape === 'duck' || shape === 'loon';
      const y0 = swim ? 0.04 * s : 0;
      // body and belly
      part(G_S, c.body, 0, y0, 0, 0.19 * s, (swim ? 0.13 : 0.17) * s, 0.28 * s, body);
      part(G_S, c.belly, 0, y0 - 0.045 * s, 0.11 * s, 0.165 * s, (swim ? 0.11 : 0.14) * s, 0.21 * s, body);
      if (f.backstripe) part(G_S, f.backstripe, 0, y0 + 0.14 * s, -0.02 * s, 0.05 * s, 0.04 * s, 0.22 * s, body);
      if (f.checks) for (let k = 0; k < 8; k++) part(G_S, f.checks, (k % 2 ? 1 : -1) * 0.1 * s, y0 + 0.1 * s, (-0.15 + (k >> 1) * 0.09) * s, 0.025 * s, 0.015 * s, 0.025 * s, body);
      if (f.streaks) for (let k = 0; k < 5; k++) part(G_S, f.streaks, (k % 2 ? 1 : -1) * 0.05 * s, y0 + 0.15 * s, (-0.12 + k * 0.06) * s, 0.02 * s, 0.012 * s, 0.05 * s, body);
      if (f.flankstreaks) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) part(G_S, f.flankstreaks, sx * 0.165 * s, y0 - 0.02 * s, (0.02 + k * 0.06) * s, 0.012 * s, 0.03 * s, 0.025 * s, body);
      if (f.breast) part(G_S, f.breast, 0, y0 + 0.01 * s, 0.22 * s, 0.09 * s, 0.09 * s, 0.06 * s, body);
      if (f.spots) for (let k = 0; k < 6; k++) part(G_S, f.spots, (k % 2 ? 1 : -1) * 0.12 * s, y0 + 0.06 * s - (k % 3) * 0.03 * s, (-0.05 + (k >> 1) * 0.06) * s, 0.015 * s, 0.015 * s, 0.015 * s, body);
      // head
      const neckZ = swim ? 0.24 : 0.24, headY = swim ? 0.2 : 0.17, hr = (shape === 'eagle' ? 0.13 : shape === 'hummer' ? 0.15 : 0.135) * s;
      B.head.position.set(0, y0 + headY * s, neckZ * s); body.add(B.head);
      if (swim) part(G_CY, c.head, 0, -0.08 * s, -0.02 * s, 0.06 * s, 0.14 * s, 0.06 * s, B.head);
      part(G_S, c.head, 0, 0, 0, hr, hr, hr * 1.08, B.head);
      if (f.cap) part(G_S, f.cap, 0, hr * 0.45, hr * 0.15, hr * 0.85, hr * 0.5, hr * 0.85, B.head);
      if (f.crest) { const cr = part(G_C, typeof f.crest === 'number' && f.crest > 1 ? f.crest : c.head, 0, hr * 1.05, -hr * 0.35, hr * 0.45, hr * 1.2, hr * 0.45, B.head); cr.rotation.x = -0.75; }
      if (f.mask) part(G_S, f.mask, 0, -hr * 0.05, hr * 0.75, hr * 0.62, hr * 0.42, hr * 0.4, B.head);
      if (f.cheeks) for (const sx of [-1, 1]) part(G_S, f.cheeks, sx * hr * 0.62, -hr * 0.15, hr * 0.25, hr * 0.38, hr * 0.32, hr * 0.42, B.head);
      if (f.bib) part(G_S, f.bib, 0, -hr * 0.75, hr * 0.45, hr * 0.55, hr * 0.45, hr * 0.4, B.head);
      if (f.throat) part(G_S, f.throat, 0, -hr * 0.6, hr * 0.5, hr * 0.6, hr * 0.42, hr * 0.42, B.head);
      if (f.nape) part(G_S, f.nape, 0, hr * 0.25, -hr * 0.8, hr * 0.45, hr * 0.35, hr * 0.3, B.head);
      if (f.necklace) part(G_S, f.necklace, 0, -hr * 0.95, hr * 0.15, hr * 0.92, hr * 0.18, hr * 0.92, B.head);
      if (f.headstripe) for (const sx of [-1, 1]) part(G_S, f.headstripe, sx * hr * 0.72, hr * 0.25, -hr * 0.1, hr * 0.12, hr * 0.12, hr * 0.8, B.head);
      // eyes (and the white eye-ring some have)
      for (const sx of [-1, 1]) {
        if (f.ring) part(G_S, f.ring, sx * hr * 0.8, hr * 0.18, hr * 0.42, hr * 0.26, hr * 0.26, hr * 0.15, B.head);
        part(G_S, f.eye || 0x0a0a0a, sx * hr * 0.86, hr * 0.18, hr * 0.44, hr * 0.17, hr * 0.17, hr * 0.12, B.head);
      }
      // the beak
      const bl = f.longbeak ? 2.6 : f.bigbeak ? 0.95 : shape === 'loon' ? 1.6 : shape === 'eagle' ? 0.95 : shape === 'duck' ? 0.8 : shape === 'wood' ? 1.2 : 0.75;
      const bw = f.longbeak ? 0.12 : f.bigbeak ? 0.45 : shape === 'duck' ? 0.4 : shape === 'eagle' ? 0.4 : 0.28;
      const beak = part(G_C, c.beak, 0, -hr * 0.1, hr * (0.9 + bl * 0.45), hr * bw, hr * bl, hr * bw * (shape === 'duck' ? 0.6 : 1), B.head); beak.rotation.x = Math.PI / 2;
      // the tail
      const tl = f.longtail ? 0.5 : shape === 'hummer' ? 0.18 : shape === 'wood' ? 0.3 : swim ? 0.12 : 0.28;
      B.tail = new THREE.Group(); B.tail.position.set(0, y0 + 0.02 * s, -0.24 * s); body.add(B.tail);
      part(G_B, c.tail, 0, 0, -tl * s / 2, (shape === 'eagle' ? 0.2 : 0.12) * s, 0.025 * s, tl * s, B.tail);
      if (f.tailtip) part(G_B, f.tailtip, 0, 0, -tl * s, 0.125 * s, 0.03 * s, 0.03 * s, B.tail);
      // the wings (they pivot at the shoulder)
      const ws = shape === 'eagle' ? 2.6 : shape === 'hummer' ? 1.1 : 1;
      for (const sx of [-1, 1]) {
        // (a wing hangs down along the bird's side when folded, and swings out and up to fly)
        const w = new THREE.Group(); w.position.set(sx * 0.15 * s, y0 + 0.08 * s, 0.03 * s); body.add(w);
        part(G_S, c.wing, sx * 0.012 * s, -0.075 * s * ws, -0.05 * s, 0.03 * s, 0.09 * s * ws, 0.21 * s, w);
        if (f.wingbar) part(G_B, f.wingbar, sx * 0.03 * s, -0.06 * s * ws, -0.02 * s, 0.012 * s, 0.022 * s, 0.1 * s, w);
        if (f.wingpatch) part(G_S, f.wingpatch, sx * 0.03 * s, -0.09 * s * ws, -0.12 * s, 0.012 * s, 0.045 * s, 0.07 * s, w);
        if (f.epaulet) part(G_S, f.epaulet, sx * 0.03 * s, -0.02 * s, 0.07 * s, 0.014 * s, 0.035 * s, 0.05 * s, w);
        B.wings.push(w);
      }
      // little legs, for the perchers
      if (!swim) for (const sx of [-1, 1]) part(G_CY, 0x3a3028, sx * 0.05 * s, -0.17 * s, 0.03 * s, 0.01 * s, 0.1 * s, 0.01 * s, body);
      B.center = y0 + 0.02 * s; B.height = 0.42 * s;
      return B;
    }

    // ---------------------------------------------------------------- songs (little synth phrases; louder close by)
    const SONGS = {
      robin: [[2400, 2800, 0.13, 0], [2800, 2300, 0.13, 0.18], [2200, 2600, 0.13, 0.4], [2700, 2200, 0.15, 0.58]],
      chickadee: [[3900, 3850, 0.32, 0], [3300, 3250, 0.36, 0.38]],
      cardinal: [[3800, 2000, 0.14, 0], [3800, 2000, 0.14, 0.2], [3800, 2000, 0.14, 0.4], [2600, 2600, 0.08, 0.62], [2600, 2600, 0.08, 0.72]],
      jay: [[1900, 1400, 0.22, 0, 'sawtooth', 0.4], [1900, 1400, 0.22, 0.3, 'sawtooth', 0.4]],
      finch: [[3600, 4200, 0.06, 0], [4200, 3400, 0.06, 0.08], [3800, 4400, 0.06, 0.17], [3000, 3600, 0.08, 0.26], [4000, 3200, 0.06, 0.38]],
      dove: [[620, 720, 0.25, 0], [720, 560, 0.5, 0.3], [560, 560, 0.35, 0.95], [560, 540, 0.35, 1.35]],
      redwing: [[1500, 1500, 0.07, 0, 'square', 0.4], [2400, 2700, 0.1, 0.1], [4200, 3000, 0.55, 0.25, 'sawtooth', 0.3]],
      drum: Array.from({ length: 14 }, (_, k) => [180, 140, 0.03, k * 0.045, 'square', 0.6]),
      bluebird: [[2200, 2600, 0.18, 0], [2400, 2200, 0.18, 0.22], [2600, 2900, 0.22, 0.45]],
      oriole: [[1800, 2200, 0.15, 0], [2200, 1900, 0.15, 0.2], [1900, 2400, 0.2, 0.42], [2300, 2100, 0.16, 0.66]],
      thin: [[7000, 7200, 0.25, 0, 'sine', 0.5], [7000, 7200, 0.25, 0.35, 'sine', 0.5]],
      flicker: Array.from({ length: 10 }, (_, k) => [1500, 1400, 0.05, k * 0.07, 'square', 0.4]),
      tanager: [[2200, 2500, 0.16, 0, 'sawtooth', 0.35], [2500, 2100, 0.16, 0.2, 'sawtooth', 0.35], [2100, 2400, 0.16, 0.4, 'sawtooth', 0.35], [2400, 2000, 0.2, 0.6, 'sawtooth', 0.35]],
      hum: [[180, 190, 0.6, 0, 'sawtooth', 0.25]],
      squeal: [[1600, 1100, 0.35, 0, 'sawtooth', 0.4]],
      croak: [[260, 200, 0.35, 0, 'sawtooth', 0.6]],
      pileated: Array.from({ length: 8 }, (_, k) => [1400, 1250, 0.07, k * 0.1, 'square', 0.45]),
      loon: [[700, 1050, 0.9, 0], [1050, 900, 0.8, 0.95], [900, 1150, 1.1, 1.8]],
      crane: [[540, 500, 0.5, 0, 'sawtooth', 0.6], [560, 520, 0.5, 0.6, 'sawtooth', 0.6]],
      eagle: Array.from({ length: 6 }, (_, k) => [3200 - k * 80, 2900 - k * 80, 0.08, k * 0.11]),
      kirtland: [[2500, 2600, 0.06, 0], [2500, 2600, 0.06, 0.12], [2500, 2600, 0.06, 0.24], [3000, 3500, 0.14, 0.38], [3500, 2900, 0.16, 0.56], [2900, 3700, 0.22, 0.76]],
    };
    let songCool = 0;
    function sing(b, force) {
      if (!here()) return;
      const d = b.pos.distanceTo(myHead.pos), range = b.sp.id === 'kirtland' ? 80 : b.sp.id === 'loon' || b.sp.id === 'crane' ? 90 : 45;
      if (d > range || (!force && performance.now() < songCool)) return;
      songCool = performance.now() + 450;
      const v = Math.pow(1 - d / range, 1.3) * (b.sp.id === 'kirtland' ? 0.2 : 0.11);
      for (const [f0, f1, dur, at, type, k] of SONGS[b.sp.song] || SONGS.finch) tone(f0, f1, dur, type || 'sine', v * (k || 1), at);
    }

    // ---------------------------------------------------------------- the flock: arriving, perching, flying, leaving
    const birds = [];
    const here = () => state.level === L.idx && state.mode !== 'menu';
    const _v = new V3(), _w = new V3(), _q = new Q4(), _p = new V3();
    const edgePoint = (from) => { const a = rnd() * Math.PI * 2; return new V3(from.x + Math.cos(a) * 45, 14 + rnd() * 10, from.z + Math.sin(a) * 45); };
    function freePerch(sp, avoid) {
      const list = [];
      for (const k of sp.hab) for (const p of PERCH[k] || []) if (!p.taken && (!avoid || p.pos.distanceTo(avoid) > sp.shy + 2)) list.push(p);
      return list.length ? list[Math.floor(rnd() * list.length)] : null;
    }
    function spawn(sp, opts) {
      const o = opts || {};
      const p = o.perch || freePerch(sp, myHead.pos);
      if (!p && sp.shape !== 'eagle') return null;
      const B = makeBird(sp);
      G.add(B.root);
      const b = { sp, B, pos: new V3(), state: 'fly', perch: null, from: new V3(), ctrl: new V3(), to: new V3(), t: 0, dur: 1, stay: 0, moves: 0, maxMoves: 1 + Math.floor(rnd() * 4), yaw: rnd() * 6, flap: rnd() * 6, idleT: 0, hop: 0, gone: false, sang: 0, wake: 0 };
      birds.push(b);
      if (o.state === 'soar') { b.state = 'soar'; b.c = new V3(o.x || 0, 0, o.z || -10); b.r = 16 + rnd() * 6; b.h = 22 + rnd() * 6; b.a = rnd() * 6; b.stay = o.stay || 26; b.pos.set(b.c.x + b.r, b.h, b.c.z); return b; }
      if (o.instant && p) { takePerch(b, p); b.pos.copy(p.pos); b.state = 'perch'; b.stay = between(sp.stay); place(b); return b; }
      flyTo(b, p, edgePoint(p.pos));
      return b;
    }
    const between = (a) => a[0] + rnd() * (a[1] - a[0]);
    function takePerch(b, p) { if (b.perch) b.perch.taken = null; b.perch = p; if (p) p.taken = b; }
    function flyTo(b, p, from) {
      takePerch(b, p);
      b.from.copy(from || b.pos); b.to.copy(p.pos);
      const d = b.from.distanceTo(b.to);
      b.ctrl.copy(b.from).lerp(b.to, 0.5); b.ctrl.y = Math.max(b.from.y, b.to.y) + Math.min(6, 1 + d * 0.25);
      b.t = 0; b.dur = Math.max(0.7, d / (b.sp.shape === 'hummer' ? 9 : b.sp.size > 0.6 ? 5.5 : 7.5)); b.state = 'fly';
    }
    function leave(b) {
      takePerch(b, null);
      b.from.copy(b.pos); b.to.copy(edgePoint(b.pos)); b.ctrl.copy(b.from).lerp(b.to, 0.4); b.ctrl.y = b.from.y + 6;
      b.t = 0; b.dur = b.from.distanceTo(b.to) / 8; b.state = 'leave';
    }
    function remove(b) { takePerch(b, null); G.remove(b.B.root); b.gone = true; }
    const bez = (a, c, e, t, out) => out.set((1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * e.x, (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * e.y, (1 - t) * (1 - t) * a.z + 2 * (1 - t) * t * c.z + t * t * e.z);
    // sit it down on its perch the way it would sit there (on a trunk: upright against the bark)
    function place(b) {
      const B = b.B, p = b.perch;
      B.root.position.copy(b.pos);
      B.body.rotation.set(0, 0, 0); B.body.position.set(0, 0, 0);
      if (p && (p.kind === 'trunk' || p.kind === 'snag') && B.shape === 'wood') {
        // facing the trunk, body upright
        B.root.rotation.set(0, (p.yaw || 0) + Math.PI / 2 * 0 - Math.atan2(Math.sin(p.yaw || 0), Math.cos(p.yaw || 0)) * 0, 0);
        B.root.lookAt(b.pos.x - Math.cos(p.yaw || 0), b.pos.y, b.pos.z - Math.sin(p.yaw || 0));
        B.body.rotation.x = -1.25; B.body.position.y = 0.05 * B.s;
      } else if (B.shape === 'wader' || B.shape === 'duck' || B.shape === 'loon') {
        B.root.rotation.set(0, b.yaw, 0);
      } else {
        B.root.rotation.set(0, b.yaw, 0);
        B.body.position.y = 0.17 * B.s * (B.shape === 'eagle' ? 0.5 : 1);
      }
    }
    function wingFold(B, a) { B.wings.forEach((w, i) => { w.rotation.set(0, 0, (i ? 1 : -1) * a); }); }
    function tick(b, dt, t) {
      const sp = b.sp, B = b.B;
      b.flap += dt;
      if (b.state === 'fly' || b.state === 'leave') {
        b.t += dt / b.dur;
        const u = Math.min(1, b.t), e = u * u * (3 - 2 * u);
        bez(b.from, b.ctrl, b.to, e, b.pos);
        bez(b.from, b.ctrl, b.to, Math.min(1, e + 0.02), _w);
        B.root.position.copy(b.pos); B.body.rotation.set(0, 0, 0); B.body.position.set(0, 0, 0);
        if (_w.distanceToSquared(b.pos) > 1e-8) B.root.lookAt(_w);
        const rate = B.shape === 'hummer' ? 60 : B.shape === 'eagle' || B.shape === 'wader' ? 6 : 22;
        const glide = B.shape === 'eagle' || (B.shape !== 'hummer' && Math.sin(b.flap * 2.3) > 0.6);
        wingFold(B, glide ? 1.35 : 1.3 + Math.sin(b.flap * rate) * 0.9);
        if (b.t >= 1) {
          if (b.state === 'leave') { remove(b); return; }
          b.state = sp.hab[0] === 'water' ? 'swim' : B.shape === 'wader' ? 'walk' : B.shape === 'hummer' ? 'hover' : 'perch';
          b.stay = between(sp.stay); b.pos.copy(b.to);
          if (b.perch && b.perch.yaw != null && B.shape !== 'wood') b.yaw = b.perch.yaw + Math.PI + (rnd() - 0.5) * 1.4;
          else if (B.shape !== 'wood') b.yaw = Math.atan2(myHead.pos.x - b.pos.x, myHead.pos.z - b.pos.z) + (rnd() - 0.5) * 2.4;
          wingFold(B, 0); place(b);
          if (rnd() < 0.55) b.sang = 0.6 + rnd() * 1.5;
        }
        return;
      }
      if (b.state === 'soar') {
        b.a += dt * 0.12; b.stay -= dt;
        b.pos.set(b.c.x + Math.cos(b.a) * b.r, b.h + Math.sin(b.a * 2.3) * 1.2, b.c.z + Math.sin(b.a) * b.r);
        _w.set(b.c.x + Math.cos(b.a + 0.05) * b.r, b.pos.y, b.c.z + Math.sin(b.a + 0.05) * b.r);
        B.root.position.copy(b.pos); B.root.lookAt(_w); B.body.rotation.z = -0.25; wingFold(B, 1.45);
        if (b.stay <= 0) {
          // now and then it comes down to the tallest snag for a few seconds
          const top = (PERCH.top || [])[0];
          if (top && !top.taken && !b.landed) { b.landed = true; flyTo(b, top); b.maxMoves = 0; }
          else leave(b);
        }
        return;
      }
      // sitting, swimming, walking, hovering
      b.stay -= dt;
      const d = b.pos.distanceTo(myHead.pos);
      // too close: off it goes
      if (d < sp.shy && b.state !== 'swim') { b.moves += 1; const p = b.moves > b.maxMoves ? null : freePerch(sp, myHead.pos); if (p) flyTo(b, p); else leave(b); sfx('whoosh', 0.15); return; }
      if (b.sang > 0) { b.sang -= dt; if (b.sang <= 0) { sing(b); if (rnd() < 0.4) b.sang = 2 + rnd() * 3; } }
      if (b.stay <= 0) {
        b.moves += 1;
        if (b.state === 'swim' && sp.id === 'loon') { dive(b); return; }
        const p = b.moves > b.maxMoves ? null : freePerch(sp);
        if (p) flyTo(b, p); else leave(b);
        return;
      }
      // little life: looking about, tail flicks, hops and pecks
      b.idleT -= dt;
      if (b.state === 'dive') {
        b.pos.y = -2; B.root.position.copy(b.pos);
        if (b.stay <= 0) b.state = 'swim';
        return;
      }
      if (b.idleT <= 0) {
        b.idleT = 0.4 + rnd() * 1.4;
        B.head.rotation.y = (rnd() - 0.5) * 1.6;
        const p = b.perch;
        if (b.state === 'swim') { b.yaw += (rnd() - 0.5) * 1.2; }
        else if (p && (p.kind === 'ground' || p.kind === 'feedground' || p.kind === 'meadow') && rnd() < 0.6) { b.hop = 0.25; b.yaw += (rnd() - 0.5) * 2; b.pos.x += Math.sin(b.yaw) * 0.15; b.pos.z += Math.cos(b.yaw) * 0.15; }
        else if (p && (p.kind === 'trunk' || p.kind === 'snag') && B.shape === 'wood' && rnd() < 0.5) { b.pos.y += 0.12; b.hop = 0.2; }
        else if (b.state === 'walk') { b.yaw += (rnd() - 0.5) * 0.8; }
        place(b);
      }
      if (b.state === 'swim') {
        b.pos.x += Math.sin(b.yaw) * dt * 0.25; b.pos.z += Math.cos(b.yaw) * dt * 0.25;
        if (Math.hypot(b.pos.x - POND.x, b.pos.z - POND.z) > POND.r - 1) b.yaw += Math.PI * dt;
        b.pos.y = 0.05; B.root.position.copy(b.pos); B.root.rotation.set(0, b.yaw, 0); B.body.position.y = Math.sin(t * 1.3 + b.flap) * 0.01;
        return;
      }
      if (b.state === 'walk') {
        b.pos.x += Math.sin(b.yaw) * dt * 0.18; b.pos.z += Math.cos(b.yaw) * dt * 0.18;
        B.root.position.copy(b.pos); B.root.rotation.set(0, b.yaw, 0);
        B.head.position.z = 0.33 * B.s + Math.sin(t * 3 + b.flap) * 0.02 * B.s;
        return;
      }
      if (b.state === 'hover') {
        B.root.position.set(b.pos.x + Math.sin(t * 2.1) * 0.05, b.pos.y + Math.sin(t * 3.3) * 0.04, b.pos.z);
        B.root.rotation.set(0, b.yaw, 0); B.body.rotation.x = -0.6; wingFold(B, 1.3 + Math.sin(t * 90) * 0.7);
        return;
      }
      // perched: tail bobs (Kirtland's warblers pump their tails all the time)
      if (B.tail) B.tail.rotation.x = Math.sin(t * (sp.id === 'kirtland' ? 9 : 2) + b.flap) * (sp.id === 'kirtland' ? 0.35 : 0.08);
      if (b.hop > 0) { b.hop -= dt; B.root.position.y = b.pos.y + Math.sin((0.25 - b.hop) / 0.25 * Math.PI) * 0.05; }
      else if (B.shape === 'wood' && b.perch && (b.perch.kind === 'trunk' || b.perch.kind === 'snag')) B.body.rotation.x = -1.25 + Math.max(0, Math.sin(t * 14 + b.flap)) * 0.15 * (Math.sin(t * 0.7 + b.flap) > 0.3 ? 1 : 0);
    }
    function dive(b) { b.state = 'dive'; b.stay = 5 + rnd() * 5; b.pos.y = -2; const a = rnd() * Math.PI * 2, r = rnd() * (POND.r - 2); b.pos.x = POND.x + Math.cos(a) * r; b.pos.z = POND.z + Math.sin(a) * r; b.moves = 0; b.idleT = b.stay; }

    // ---------------------------------------------------------------- who turns up
    const R = { ph: 'idle', t0: 0, film: FILM, shots: [], best: Number(prefs.birdBest) || 0, nextSpawn: 0, specials: [], results: null, kirtland: null };
    const life = new Set(Array.isArray(prefs.birdLife) ? prefs.birdLife.filter((x) => SP[x]) : []);
    const alive = (id) => birds.filter((b) => !b.gone && b.sp.id === id).length;
    function populate(now) {
      if (now < R.nextSpawn) return;
      R.nextSpawn = now + 900 + rnd() * 1600;
      if (birds.filter((b) => !b.gone).length >= 18) return;
      const pool = SPECIES.filter((s) => !s.special && alive(s.id) < s.max);
      let sum = 0; for (const s of pool) sum += s.wt;
      let r = rnd() * sum;
      for (const s of pool) { r -= s.wt; if (r <= 0) { spawn(s); return; } }
    }
    // the specials, decided at the start of each round: the loon, the cranes and the eagle often enough, and the
    // Kirtland's warbler hardly ever
    function planSpecials() {
      const t = () => 15 + rnd() * 85;
      R.specials = [];
      if (rnd() < 0.5) R.specials.push({ id: 'loon', at: 0 });
      if (rnd() < 0.4) R.specials.push({ id: 'crane', at: t() });
      if (rnd() < 0.45) R.specials.push({ id: 'eagle', at: t() });
      if (rnd() < (Number(prefs.birdKirtlandOdds) || 0.12)) R.specials.push({ id: 'kirtland', at: 25 + rnd() * 70 });
    }
    function releaseSpecial(s) {
      const sp = SP[s.id];
      if (s.id === 'eagle') { spawn(sp, { state: 'soar', x: -6 + rnd() * 12, z: -14 + rnd() * 12, stay: 22 + rnd() * 10 }); return; }
      if (s.id === 'loon') { const p = freePerch(sp); if (p) { const b = spawn(sp, { perch: p, instant: true }); if (b) { b.state = 'swim'; b.stay = between(sp.stay); setTimeout(() => sing(b, true), 4000); } } return; }
      if (s.id === 'crane') { const p = freePerch(sp); if (p) { const b = spawn(sp, { perch: p }); if (b) b.sang = 2; } return; }
      if (s.id === 'kirtland') {
        const p = freePerch(sp, myHead.pos); if (!p) return;
        const b = spawn(sp, { perch: p, instant: true });
        if (!b) return;
        b.maxMoves = 2 + Math.floor(rnd() * 2);
        R.kirtland = b;
        // it announces itself: one loud song from the jack pines
        setTimeout(() => { if (!b.gone) { sing(b, true); if (here() && b.pos.distanceTo(myHead.pos) < 70) showToast('A loud, rich song from the young jack pines…'); } }, 300);
        b.sang = 1.6;
      }
    }

    // ---------------------------------------------------------------- the judging
    const ray = new THREE.Raycaster();
    const _c = new V3(), _n = new V3(), _d = new V3();
    function judge(cam) {
      const fovV = cam.fov * Math.PI / 180, out = [];
      for (const b of birds) {
        if (b.gone || b.state === 'dive') continue;
        const B = b.B;
        B.root.updateMatrixWorld(true);
        _c.set(0, B.center + B.height * 0.3, 0); B.body.localToWorld(_c);
        _n.copy(_c).project(cam);
        if (_n.z > 1 || Math.abs(_n.x) > 1.02 || Math.abs(_n.y) > 1.02) continue;
        const dist = _c.distanceTo(cam.position);
        const frac = (B.height * 1.2 / dist) / (2 * Math.tan(fovV / 2));
        // anything in the way? (three rays: the middle and either end of the bird)
        let seen = 0;
        for (const off of [0, 0.35, -0.35]) {
          _p.set(0, 0, off * B.height * 2.2).applyQuaternion(B.root.quaternion).add(_c);
          _d.subVectors(_p, cam.position); const len = _d.length(); _d.normalize();
          ray.set(cam.position, _d); ray.far = Math.max(0.1, len - B.height * 0.6);
          if (!ray.intersectObjects(OCC, false).length) seen += 1;
        }
        if (!seen) { out.push({ b, hidden: true }); continue; }
        const r = Math.hypot(_n.x, _n.y) / Math.SQRT2;
        const centre = Math.max(0, Math.min(1, 1 - r * 1.15));
        const sizeF = frac < 0.015 ? 0.12 : frac < 0.08 ? 0.12 + 0.88 * (frac - 0.015) / 0.065 : frac > 1.0 ? 0.6 : 1;
        const visF = 0.35 + 0.65 * seen / 3;
        const flying = b.state === 'fly' || b.state === 'soar' || b.state === 'leave';
        const pts = Math.round(TIERS[b.sp.tier].pts * (0.3 + 0.7 * centre) * sizeF * visF * (flying ? 1.2 : 1));
        out.push({ b, sp: b.sp, pts, centre, frac, seen, flying });
      }
      const scored = out.filter((x) => !x.hidden).sort((a, b) => b.pts - a.pts);
      return { best: scored[0] || null, others: scored.length - 1, hidden: out.filter((x) => x.hidden).length };
    }
    const pct = (x) => `${Math.round(x * 100)}%`;
    function sizeWord(frac) { return frac < 0.015 ? 'a speck (zoom in!)' : frac < 0.04 ? 'tiny (zoom in)' : frac < 0.08 ? 'small' : frac > 1.0 ? 'cut off' : 'nice and big'; }
    // a small copy of a photo, for the board
    function thumb(url) {
      return new Promise((res) => {
        const im = new Image();
        im.onload = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 192; c.getContext('2d').drawImage(im, 0, 0, 256, 192); const t = new Image(); t.onload = () => res(t); t.src = c.toDataURL('image/jpeg', 0.8); };
        im.onerror = () => res(null);
        im.src = url;
      });
    }
    L.canSnap = () => (R.ph === 'play' && R.film <= 0 ? 'Out of film! Wait for the round to end, or press End game.' : '');
    L.onPhoto = (url, cam, now) => {
      const j = judge(cam);
      const what = j.best ? `${j.best.sp.name}: ${pct(j.best.centre)} centred, ${sizeWord(j.best.frac)}${j.best.seen < 3 ? ', partly hidden' : ''}${j.best.flying ? ', in flight!' : ''}` : j.hidden ? 'A bird, but something’s in the way' : 'No bird in that one';
      if (R.ph !== 'play') {
        // practice: it goes in your album as usual, with the verdict after
        setTimeout(() => showToast(`Practice shot. ${what}${j.best ? ` (${j.best.pts} points in a round)` : ''}`), 60);
        return null;
      }
      R.film -= 1;
      const shot = { url, sp: j.best ? j.best.sp : null, pts: j.best ? j.best.pts : 0, centre: j.best ? j.best.centre : 0, frac: j.best ? j.best.frac : 0, seen: j.best ? j.best.seen : 0, flying: j.best ? j.best.flying : false, img: null, t: now };
      R.shots.push(shot);
      thumb(url).then((im) => { shot.img = im; if (R.ph === 'done') drawResults(); });
      if (shot.sp && shot.sp.id === 'kirtland') { sfx('fanfare', 0.8); spawnFloat('KIRTLAND’S!', j.best.b.pos.clone().add(new V3(0, 0.6, 0)), '#ffd23f'); }
      else if (shot.sp) spawnFloat(`+${shot.pts}`, j.best.b.pos.clone().add(new V3(0, 0.4, 0)), TIERS[shot.sp.tier].col);
      state.hudDirty = true; forcePresence();
      return { toast: `${what}${shot.sp ? `  +${shot.pts}` : ''}   (${R.film} left)` };
    };
    L.cameraCount = () => (R.ph === 'play' ? R.film : CAMERA.mine.length);
    const clock = () => { const s = Math.max(0, Math.ceil(ROUND - (performance.now() - R.t0) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    L.cameraNote = () => (R.ph === 'play' ? `${clock()}  ${R.film} LEFT` : 'PRACTICE');

    // ---------------------------------------------------------------- the round
    function startRound() {
      Object.assign(R, { ph: 'play', t0: performance.now(), film: FILM, shots: [], results: null, kirtland: null });
      planSpecials();
      for (const s of R.specials) if (s.at === 0) { releaseSpecial(s); s.done = true; }
      if (!CAMERA.isOn()) CAMERA.toggle(state.mode === 'vr' ? 'right' : undefined);
      CAMERA.drawLcd();
      sfx('whistle', 0.5);
      showToast(state.mode === 'vr' ? 'Two minutes, 24 shots! Raise the camera to your eye to look through it; the stick zooms' : 'Two minutes, 24 shots! Click to take a picture, wheel to zoom. Rarer birds, centred, score most');
      drawGuide(); state.hudDirty = true; forcePresence();
    }
    function endRound() {
      R.ph = 'done';
      // your best shot of each bird counts
      const best = new Map();
      for (const s of R.shots) if (s.sp && (!best.has(s.sp.id) || best.get(s.sp.id).pts < s.pts)) best.set(s.sp.id, s);
      for (const s of R.shots) s.counts = !!s.sp && best.get(s.sp.id) === s;
      const total = Array.from(best.values()).reduce((a, s) => a + s.pts, 0);
      const newOnes = Array.from(best.keys()).filter((id) => !life.has(id));
      for (const id of best.keys()) life.add(id);
      prefs.birdLife = Array.from(life);
      const isBest = total > R.best;
      if (isBest) prefs.birdBest = R.best = total;
      savePrefs();
      RECORDS.add(L, 'score', total); RECORDS.add(L, 'species', best.size);
      R.results = { total, species: best.size, newOnes, isBest };
      // the best photo of the round goes in your album
      const top = R.shots.filter((s) => s.sp).sort((a, b) => b.pts - a.pts)[0];
      if (top) CAMERA.keepPhoto(top.url);
      drawResults(); drawGuide();
      sfx(total >= 300 ? 'fanfare' : 'chime', 0.8);
      showToast(`Time! ${total} points, ${best.size} kinds of bird${isBest ? ' (your best!)' : ''}. See the Field Notes board`);
      // stand in front of the board to see them
      standAt(BOARD.x, BOARD.z + 3.4, 0);
      state.hudDirty = true; forcePresence();
    }
    L.startRound = startRound; L.endRound = endRound;
    function standAt(x, z, yaw) {
      const h = new V3(); camera.getWorldPosition(h);
      dolly.position.x += x - h.x; dolly.position.z += z - h.z;
      if (state.mode !== 'vr') { state.yaw = yaw; state.pitch = 0.05; }
    }

    // ---------------------------------------------------------------- the boards: the field guide and the field notes
    const BOARD = { x: -4.2, z: 9.5 }, GUIDE = { x: 4.4, z: 15.5 };
    const notes = makeBoard(G, 1600, 1000, 3.6, 2.25, BOARD.x, 1.75, BOARD.z, 0);
    const guide = makeBoard(G, 1000, 1300, 1.8, 2.34, GUIDE.x, 1.7, GUIDE.z, -Math.PI * 0.75);
    function drawGuide() {
      const g = guide.g, W = 1000;
      g.fillStyle = '#f4ecd6'; g.fillRect(0, 0, W, 1300);
      g.fillStyle = '#2f5a32'; g.fillRect(0, 0, W, 130);
      g.fillStyle = '#f4ecd0'; g.font = `800 60px ${DISPLAY}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Birds of the trail', 40, 78);
      g.font = `400 26px ${BODY}`; g.fillText(`Your life list: ${life.size} of ${SPECIES.length}`, 40, 116);
      SPECIES.forEach((sp, i) => {
        const y = 170 + i * 46, T = TIERS[sp.tier], got = life.has(sp.id);
        g.fillStyle = got ? '#2a7a3a' : '#b8ad90'; g.font = `800 30px ${BODY}`; g.fillText(got ? '✔' : '○', 34, y);
        g.fillStyle = '#1b1932'; g.font = `700 27px ${BODY}`; g.fillText(sp.name, 78, y, 420);
        g.fillStyle = T.col === '#ffd23f' ? '#c08a00' : T.col === '#8bd450' ? '#3a8a2a' : T.col === '#4fc3f7' ? '#1a78b0' : T.col === '#b388ff' ? '#7a4ad0' : '#d06a10';
        g.font = `700 22px ${BODY}`; g.fillText(T.star, 510, y);
        g.fillStyle = '#5a5040'; g.font = `400 21px ${BODY}`; g.fillText(sp.where, 620, y, 360);
      });
      g.fillStyle = '#5a5040'; g.font = `400 22px ${BODY}`;
      g.fillText(`Points: ★ ${TIERS.common.pts}  ★★ ${TIERS.uncommon.pts}  ★★★ ${TIERS.rare.pts}  ★★★★ ${TIERS.vrare.pts}  ★★★★★ ${TIERS.legend.pts}`, 40, 1282);
      guide.tex.needsUpdate = true;
    }
    function drawResults() {
      const g = notes.g, W = 1600, H = 1000;
      g.fillStyle = '#f4ecd6'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2f5a32'; g.fillRect(0, 0, W, 112);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#f4ecd0'; g.font = `800 64px ${DISPLAY}`; g.fillText('Field Notes', 36, 76);
      if (!R.results) {
        g.font = `400 28px ${BODY}`; g.fillText(R.ph === 'play' ? 'Out on the trail… your photos go up here when the round ends' : `Press Start for a two-minute round. Best so far: ${R.best}`, 420, 70);
        g.fillStyle = '#5a5040'; g.font = `400 34px ${BODY}`;
        const lines = ['Each photo is judged on:', '• how rare the bird is (★ to ★★★★★)', '• how well it’s centred in the frame', '• how big it is (zoom in!) and whether leaves are in the way', '• a bonus for a bird in flight', 'Your best photo of each kind of bird counts toward your score.'];
        lines.forEach((l, i) => g.fillText(l, 60, 200 + i * 60));
        notes.tex.needsUpdate = true; return;
      }
      const r = R.results;
      g.font = `800 44px ${DISPLAY}`; g.textAlign = 'right'; g.fillText(`${r.total} points  ·  ${r.species} kinds of bird${r.isBest ? '  ·  your best!' : ''}`, W - 36, 74); g.textAlign = 'left';
      const cols = 6, cw = 256, ch = 218, x0 = (W - cols * cw - (cols - 1) * 8) / 2, y0 = 128;
      R.shots.slice(0, 24).forEach((s, i) => {
        const x = x0 + (i % cols) * (cw + 8), y = y0 + Math.floor(i / cols) * (ch + 4);
        g.fillStyle = s.counts ? '#fff8e0' : '#ebe2c8'; g.fillRect(x, y, cw, ch);
        if (s.counts) { g.strokeStyle = TIERS[s.sp.tier].col; g.lineWidth = 6; g.strokeRect(x + 3, y + 3, cw - 6, ch - 6); }
        if (s.img) g.drawImage(s.img, x + 12, y + 10, cw - 24, (cw - 24) * 0.75);
        else { g.fillStyle = '#cfc6b4'; g.fillRect(x + 12, y + 10, cw - 24, (cw - 24) * 0.75); }
        g.fillStyle = '#1b1932'; g.font = `700 20px ${BODY}`;
        g.fillText(s.sp ? s.sp.name : 'No bird', x + 12, y + 196, cw - 24);
        g.fillStyle = s.sp ? '#5a5040' : '#9a9080'; g.font = `400 17px ${BODY}`;
        g.fillText(s.sp ? `${TIERS[s.sp.tier].star}  ${pct(s.centre)} centred  ${s.counts ? `${s.pts} pts` : `(${s.pts})`}` : '—', x + 12, y + 214, cw - 24);
      });
      if (r.newOnes.length) { g.fillStyle = '#2a7a3a'; g.font = `700 26px ${BODY}`; g.textAlign = 'left'; g.fillText(`New to your life list: ${r.newOnes.map((id) => SP[id].name).join(', ')}`, 36, H - 14, W - 72); }
      notes.tex.needsUpdate = true;
    }
    drawGuide(); drawResults();

    // ---------------------------------------------------------------- the trailhead's buttons, the kiosk, records
    makeButton(L, new V3(-0.9, 1.05, 15.6), 0x8bd450, 'Start round', () => startRound(), { faceYaw: 0 });
    makeKiosk(L, 2.6, 19.5, Math.PI);
    RECORDS.def(L, [{ k: 'score', label: 'Best round score' }, { k: 'species', label: 'Most kinds of bird in a round' }], { x: -5.6, z: 16.5, yaw: Math.PI / 2 });
    L.hudActions = [{ label: () => (R.ph === 'play' ? 'Restart round' : 'Start round'), run: () => startRound() }];
    L.hints = [['Watch → Camera', 'or pull a trigger, to take out the camera'], ['Camera to your eye', 'look through the lens'], ['Thumbstick (camera up)', 'zoom'], ['Trigger', 'take a picture'], ['Start', 'the green button at the trailhead']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Click or Space', 'take a picture'], ['Mouse wheel or + / -', 'zoom'], ['Start round', 'up top, or the green button'], ['Rare birds', 'the field guide by the trailhead']] : L.hints);
    L.deskFire = () => { if (!CAMERA.isOn()) CAMERA.toggle(); else CAMERA.snap(); };
    L.onVRTrigger = (h) => { if (!CAMERA.isOn()) CAMERA.toggle(h.side); };
    L.spawn = () => { dolly.position.set(START.x, 0, START.z); if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0.02; } };
    L.onEnter = () => {
      R.ph = 'idle'; R.results = null; drawResults(); drawGuide();
      // a few birds already about
      for (let i = 0; i < 8; i++) { const pool = SPECIES.filter((s) => !s.special && alive(s.id) < s.max); const s = pool[Math.floor(rnd() * pool.length)]; const p = freePerch(s, START); if (p) spawn(s, { perch: p, instant: true }); }
      if (!CAMERA.isOn()) CAMERA.toggle(state.mode === 'vr' ? 'right' : undefined);
    };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; R.ph = 'idle'; for (const b of birds.slice()) remove(b); birds.length = 0; if (CAMERA.isOn()) CAMERA.toggle(); };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.00015) * 0.4; camera.position.set(Math.sin(a) * 4, 2.2, 22); camera.lookAt(0, 2.5, 0); };
    ENDGAME.on(L, { active: () => R.ph === 'play', end: () => { endRound(); return 'Your photos are on the Field Notes board.'; } });
    L.presence = () => ({ bw: [R.ph === 'play' ? 1 : 0, R.best] });
    L.readPresence = (rec, pres, st) => { const a = pres.bw; st.bw = Array.isArray(a) && a.length === 2 && a.every((x) => Number.isFinite(x)) ? a : null; };
    L.rowFor = (st, isMe) => { const a = isMe ? [R.ph === 'play' ? 1 : 0, R.best] : st && st.bw; return { best: a ? a[1] : 0, text: a ? `${a[0] ? 'out birding \u00b7 ' : ''}best ${a[1]}` : '' }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    MUSIC_THEMES.birdwatch = { gain: 0.35, bpm: 76, swing: 0.1, chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G6'], comp: { inst: 'musicbox', at: [0, 6, 10], dur: 0.4 }, bass: { at: [0, 8] }, cut: 2400 };

    // ---------------------------------------------------------------- every frame
    L.update = (dt, now) => {
      if (!here()) return;
      const t = now / 1000;
      populate(now);
      if (R.ph === 'play') {
        const el = (now - R.t0) / 1000;
        for (const s of R.specials) if (!s.done && el >= s.at) { s.done = true; releaseSpecial(s); }
        if (el >= ROUND) endRound();
      }
      for (const b of birds) if (!b.gone) tick(b, dt, t);
      for (let i = birds.length - 1; i >= 0; i--) if (birds[i].gone) birds.splice(i, 1);
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = R.ph === 'play' ? `${clock()}  ·  ${R.film} shots left  ·  ${new Set(R.shots.filter((s) => s.sp).map((s) => s.sp.id)).size} kinds so far  ·  wheel to zoom` : `Birdwatching  ·  Start round (up top) for two minutes and 24 shots  ·  best ${R.best}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.birdInternals = { R, birds, SPECIES, SP, PERCH, spawn, judge, startRound, endRound, releaseSpecial, flyTo, makeBird, TIERS, life, OCC, drawResults };
    return L;
  })();
