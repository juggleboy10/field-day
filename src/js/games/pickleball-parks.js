  // ================================================================ PICKLEBALL PARKS: where the court is
  // The court, its rules and everything you play with stay the same; a park is what's around it (and its sky and light).
  // Built the first time it's picked. Each park: { id, name, env, court: [court, kitchen] colours, build(group, C) },
  // where C is the court's size: { HL, HW, R } (R: the fence round the court you play on).
  const PB_PARKS = (() => {
    // ---------------------------------------------------------------- helpers
    const _m4 = new THREE.Matrix4(), _q = new Q4(), _q2 = new Q4(), _p = new V3(), _s = new V3(), _col = new THREE.Color();
    const UP = new V3(0, 1, 0), XAX = new V3(1, 0, 0);
    // many copies of one shape as one draw call: items are [x, y, z, sx, sy, sz, quaternion or yaw, colour?]
    function instanced(parent, geo, mat, items) {
      if (!items.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach(([x, y, z, sx, sy, sz, rot, color], i) => {
        if (rot && rot.isQuaternion) _q.copy(rot); else _q.setFromAxisAngle(UP, rot || 0);
        _m4.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
        im.setMatrixAt(i, _m4);
        if (color !== undefined) im.setColorAt(i, _col.setHex(color));
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      parent.add(im);
      return im;
    }
    const flat = (parent, w, d, mat, x, y, z, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.set(-Math.PI / 2, 0, rot || 0); m.position.set(x, y, z); parent.add(m); return m;
    };
    // a chain-link fence panel (see-through), with a top rail and posts
    function chainFence(parent, x0, z0, x1, z1, h, color, linkTex) {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
      const t = linkTex.clone(); t.needsUpdate = true; t.repeat.set(len / 0.5, h / 0.5);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshLambertMaterial({ map: t, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }));
      f.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); f.rotation.y = -ang; parent.add(f);
      const rail = addBox(parent, len, 0.05, 0.05, lam(color), (x0 + x1) / 2, h, (z0 + z1) / 2); rail.rotation.y = -ang;
      const n = Math.max(1, Math.round(len / 3));
      for (let k = 0; k <= n; k++) addCyl(parent, 0.035, 0.035, h + 0.05, 6, lam(color), x0 + (x1 - x0) * k / n, (h + 0.05) / 2, z0 + (z1 - z0) * k / n);
    }
    // court lines for a pickleball court centred at (cx, cz), long along x
    function pbLines(parent, cx, cz, HL, HW, mat) {
      const K = 2.13, line = (x, z, w, d) => addBox(parent, w, 0.004, d, mat, cx + x, 0.009, cz + z);
      line(0, -HW, HL * 2, 0.05); line(0, HW, HL * 2, 0.05); line(-HL, 0, 0.05, HW * 2); line(HL, 0, 0.05, HW * 2);
      line(-K, 0, 0.05, HW * 2); line(K, 0, 0.05, HW * 2);
      line(-(K + HL) / 2, 0, HL - K, 0.05); line((K + HL) / 2, 0, HL - K, 0.05);
    }
    // a gabled house: walls, a roof (a three-sided prism), a door and windows, facing +z when yaw is 0
    // (a three-sided prism along x, its ridge up: the apex at y 1, the base at y -0.5, z from -0.87 to 0.87)
    const roofGeo = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1); g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); return g; })();
    function house(parent, x, z, yaw, w, d, h, wall, roof) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; parent.add(g);
      addBox(g, w, h, d, lam(wall), 0, h / 2, 0);
      const sy = d * 0.24, r = new THREE.Mesh(roofGeo, lam(roof));
      r.scale.set(w + 0.6, sy, (d / 2 + 0.35) / 0.87); r.position.set(0, h + 0.5 * sy, 0); g.add(r);
      addBox(g, 0.9, 2.0, 0.06, lam(0x4a3a2e), w * 0.18, 1.0, d / 2 + 0.03);
      for (const wx of [-w * 0.28, w * 0.38]) addBox(g, 1.2, 1.0, 0.06, lam(0x2a3442), wx, 1.6, d / 2 + 0.03);
      addBox(g, w * 0.45, h * 0.75, 0.06, lam(0xb8b4a8), -w * 0.12, h * 0.375, -d / 2 - 0.03);   // (a garage door or back wall patch)
      return g;
    }


    // ---------------------------------------------------------------- the seasons (in every park)
    // Spring: fresh green and blossom, flowers in the grass. Summer: deep green. Fall: orange, red, yellow and brown, with
    // leaves on the ground. Winter: bare trees, snow on the ground and the pines (and falling: see pickleball.js).
    const SEASONS = [
      { id: 'spring', name: 'Spring', env: { sky: skyTexture([[0, '#5a9ae0'], [0.5, '#9ccaf0'], [0.85, '#d8ecf4'], [1, '#eef4ee']]), bg: 0xb0d4f0, fog: [0xd0e4f0, 70, 220], hemi: [0xf4fff0, 0x7a9a5a, 0.7], sun: [0xfffaf0, 0.95], sunDir: new V3(0.4, 0.8, 0.4), ambient: [0x9aa4b0, 0.36], sprite: null } },
      { id: 'summer', name: 'Summer', env: { sky: skyTexture([[0, '#2a7ad8'], [0.5, '#6ab6f0'], [0.85, '#c8e4f4'], [1, '#eaf4f4']]), bg: 0x9ccaf0, fog: [0xc4e0f0, 90, 260], hemi: [0xffffff, 0x6a8a4a, 0.72], sun: [0xfff4e0, 1.0], sunDir: new V3(0.3, 1, 0.35), ambient: [0x8a9aaa, 0.36], sprite: null } },
      { id: 'fall', name: 'Fall', env: { sky: skyTexture([[0, '#2a78d8'], [0.45, '#5aa6ec'], [0.85, '#b8daf4'], [1, '#e8f0f0']]), bg: 0x9ccaf0, fog: [0xbcd6ea, 70, 210], hemi: [0xe8f2ff, 0x6a7448, 0.72], sun: [0xfff0d8, 1.05], sunDir: new V3(-0.35, 0.5, 0.8), ambient: [0x8a94a4, 0.36], sprite: null } },
      { id: 'winter', name: 'Winter', env: { sky: skyTexture([[0, '#7a9ab8'], [0.5, '#b8cad8'], [0.85, '#dfe6ec'], [1, '#eef2f4']]), bg: 0xc8d4de, fog: [0xd8e0e8, 50, 170], hemi: [0xf0f4ff, 0xb0b8c8, 0.85], sun: [0xf0f4ff, 0.75], sunDir: new V3(-0.3, 0.45, 0.7), ambient: [0xa0a8b8, 0.42], sprite: null } },
    ];
    const groundTex = [];
    function seasonGround(s) {
      if (groundTex[s]) return groundTex[s];
      const rand = mulberry32(900 + s);
      const t = canvasTexture(256, 256, (g) => {
        g.fillStyle = ['#6a9c42', '#4e8a34', '#566c36', '#eef2f6'][s]; g.fillRect(0, 0, 256, 256);
        const blot = [['rgba(140,190,70,0.35)', 'rgba(90,140,50,0.35)', 'rgba(170,200,90,0.3)'], ['rgba(70,130,50,0.35)', 'rgba(50,100,36,0.38)', 'rgba(100,150,60,0.3)'],
          ['rgba(120,140,60,0.35)', 'rgba(140,110,64,0.4)', 'rgba(54,76,36,0.38)'], ['rgba(190,205,225,0.45)', 'rgba(255,255,255,0.7)', 'rgba(160,175,195,0.25)']][s];
        for (let k = 0; k < 140; k++) { g.fillStyle = blot[k % 3]; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 6 + rand() * 26, 4 + rand() * 16, rand() * 3, 0, Math.PI * 2); g.fill(); }
        if (s === 3) for (let k = 0; k < 160; k++) { g.fillStyle = 'rgba(90,110,70,0.3)'; g.fillRect(rand() * 256, rand() * 256, 1.2, 2.5); }   // (a few tufts poking through)
        else for (let k = 0; k < 2200; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(170,190,100,0.22)' : 'rgba(40,60,25,0.25)'; g.fillRect(rand() * 256, rand() * 256, 1.5, 3); }
      }).tex;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(32, 32);
      return (groundTex[s] = t);
    }
    const PAL = {
      spring: [0x9ad860, 0x8ac850, 0xa8e070, 0x7ab848], blossom: [0xf4b8d8, 0xf8e8f0, 0xe8a0c8, 0xfcd8e8],
      summer: [0x4a8a30, 0x3e7a2a, 0x5a9a3a, 0x467e2c],
      fall: [[0xd8782a, 0xe08a3a, 0xc8602a], [0xb83a22, 0xc8482a, 0x9a3020], [0xe8b830, 0xd8a028, 0xf0c840], [0x9a6a3a, 0x8a5a30, 0xa87a48]],
    };
    // what a park registers as it builds, so a season can recolour or show it: its ground, leafy crowns (on the bare
    // trees), pine tiers (and their winter snow caps), leaves on the ground (fall) and flowers (spring)
    function seasonKit(rand) {
      const K = { grounds: [], crowns: [], cones: [], caps: [], leaves: [], flowerList: [], im: {} };
      K.ground = (m) => { m.userData.live = true; K.grounds.push(m); return m; };
      K.tree = () => ({ blossom: rand() < 0.22, fall: (rand() * 4) | 0 });
      K.crown = (t, x, y, z, sz) => K.crowns.push({ t, x, y, z, s: sz, j: rand(), yaw: rand() * 6, sq: 0.75 + rand() * 0.2 });
      K.cone = (x, y, z, sz, h, color) => { K.cones.push([x, y, z, sz, h, sz, rand() * 6, color]); K.caps.push([x, y + h * 0.16, z, sz * 0.8, h * 0.62, sz * 0.8, rand() * 6, 0xf2f6fa]); };
      K.flowers = (n, area, keepOut) => {
        for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) {
          const x = area[0] + rand() * (area[1] - area[0]), z = area[2] + rand() * (area[3] - area[2]);
          if (keepOut(x, z)) continue;
          const sz = 0.05 + rand() * 0.05;
          K.flowerList.push([x, 0.04, z, sz, sz * 0.6, sz, 0, [0xf8e040, 0xffffff, 0xb07ae0, 0xf27aa8, 0xf8f0a0][(rand() * 5) | 0]]); k++;
        }
      };
      const blob = new THREE.IcosahedronGeometry(1, 0), cone = new THREE.ConeGeometry(1, 1, 8);
      const leafGeo = new THREE.PlaneGeometry(1, 1); leafGeo.rotateX(-Math.PI / 2);
      K.flush = (P) => {
        K.im.crowns = instanced(P, blob, lam(0xffffff), K.crowns.map((c) => [c.x, c.y, c.z, c.s, c.s * c.sq, c.s, c.yaw, 0xffffff]));
        K.im.cones = instanced(P, cone, lam(0xffffff), K.cones);
        K.im.caps = instanced(P, cone, lam(0xffffff), K.caps);
        K.im.leaves = instanced(P, leafGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), K.leaves);
        K.im.flowers = instanced(P, blob, lam(0xffffff), K.flowerList);
        for (const [k, m] of Object.entries(K.im)) if (m) { m.userData.live = true; m.name = `season-${k}`; }
      };
      K.apply = (s) => {
        for (const m of K.grounds) { m.material.map = seasonGround(s); m.material.needsUpdate = true; }
        const cr = K.im.crowns;
        if (cr) {
          cr.visible = s !== 3;
          if (s !== 3) {
            K.crowns.forEach((c, i) => { const p = s === 0 ? (c.t.blossom ? PAL.blossom : PAL.spring) : s === 1 ? PAL.summer : PAL.fall[c.t.fall]; _col.setHex(p[(c.j * p.length) | 0]).offsetHSL(0, 0, (c.j - 0.5) * 0.06); cr.setColorAt(i, _col); });
            cr.instanceColor.needsUpdate = true;
          }
        }
        if (K.im.caps) K.im.caps.visible = s === 3;
        if (K.im.leaves) K.im.leaves.visible = s === 2;
        if (K.im.flowers) K.im.flowers.visible = s === 0;
      };
      return K;
    }

    // ---------------------------------------------------------------- College Park
    // From photos: a neighbourhood park in late autumn. A paved path winds in from Rice Dr past the green "College Park"
    // sign on its stone pillars, through tall bare oaks and pines, to the fenced courts: two pickleball courts side by
    // side, the basketball court (green with a navy surround, black poles, glass backboards) and a playground beyond it.
    // Houses with wooden privacy fences back onto the park; a clear blue sky and a low sun.
    function buildCollege(P, C) {
      const { HL, HW, R } = C;
      const rand = mulberry32(14630);
      const r = (a, b) => a + rand() * (b - a);
      const K = seasonKit(rand);
      // ---- ground (its grass, or snow, comes with the season)
      K.ground(flat(P, 300, 300, new THREE.MeshLambertMaterial({ map: seasonGround(2) }), 0, -0.01, -20));
      const asphalt = lam(0x6e7276), concrete = lam(0xb8b6ae);
      // ---- the courts: ours (fenced, light blue-grey surround), the one beside it, and the basketball court
      flat(P, 24, 15, lam(0x6a7e92), 0, 0.001, 0);              // our surround
      flat(P, 24, 15, lam(0x6a7e92), 0, 0.001, 14.5);           // the second court's surround
      flat(P, HL * 2, HW * 2, lam(0x3f7a5a), 0, 0.004, 14.5);
      for (const sx of [-1, 1]) flat(P, 2.13, HW * 2, lam(0x4c8a66), sx * 1.065, 0.006, 14.5);
      const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
      pbLines(P, 0, 14.5, HL, HW, white);
      // its net and posts
      const net2 = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + 0.6, 0.88), new THREE.MeshLambertMaterial({ color: 0x1b1932, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
      net2.rotation.y = Math.PI / 2; net2.position.set(0, 0.44, 14.5); P.add(net2);
      addBox(P, 0.04, 0.05, HW * 2 + 0.6, white, 0, 0.88, 14.5);
      for (const sz of [-1, 1]) addCyl(P, 0.04, 0.04, 0.94, 8, lam(0x2b2d42), 0, 0.47, 14.5 + sz * (HW + 0.3));
      // the basketball court: navy round the edge, green inside, white lines, east of the courts, its length running north-south
      const BX = 25, BZ = 8, BL = 11, BW = 7;      // centre and half sizes (BL along its length, which runs north-south)
      const bb = new THREE.Group(); bb.position.set(BX, 0, BZ); bb.rotation.y = Math.PI / 2; P.add(bb);
      flat(bb, BL * 2 + 3, BW * 2 + 3, lam(0x1e2a4a), 0, 0.002, 0);
      flat(bb, BL * 2, BW * 2, lam(0x3f8a52), 0, 0.004, 0);
      for (const sx of [-1, 1]) flat(bb, 5.8, 4.9, lam(0x1e2a4a), sx * (BL - 2.9), 0.006, 0);   // the keys
      const bl = (x, z, w, d) => addBox(bb, w, 0.004, d, white, x, 0.009, z);
      bl(0, -BW, BL * 2, 0.06); bl(0, BW, BL * 2, 0.06); bl(-BL, 0, 0.06, BW * 2); bl(BL, 0, 0.06, BW * 2); bl(0, 0, 0.06, BW * 2);
      const arc = (x, z, rad, a0, a1, seg) => { for (let k = 0; k < seg; k++) { const a = a0 + (a1 - a0) * (k + 0.5) / seg, l = rad * (a1 - a0) / seg + 0.02; const m = addBox(bb, l, 0.004, 0.06, white, x + Math.cos(a) * rad, 0.009, z + Math.sin(a) * rad); m.rotation.y = -a - Math.PI / 2; } };
      arc(0, 0, 1.8, 0, Math.PI * 2, 24);                                      // centre circle
      for (const sx of [-1, 1]) {
        arc(sx * (BL - 5.8), 0, 1.8, sx > 0 ? Math.PI / 2 : -Math.PI / 2, sx > 0 ? Math.PI * 1.5 : Math.PI / 2, 12);   // free-throw circles
        arc(sx * (BL - 1.6), 0, 6.0, sx > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, sx > 0 ? Math.PI * 1.38 : Math.PI * 0.38, 28);   // three-point arcs
        bl(sx * (BL - 2.9), -2.45, 5.8, 0.06); bl(sx * (BL - 2.9), 2.45, 5.8, 0.06); bl(sx * (BL - 5.8), 0, 0.06, 4.9);
        // a hoop: black square pole, an arm out over the court, a glass backboard with a white frame, an orange rim
        const hx = sx * (BL + 0.9), black = lam(0x15161a);
        addBox(bb, 0.18, 3.2, 0.18, black, hx, 1.6, 0);
        addBox(bb, 1.1, 0.12, 0.12, black, hx - sx * 0.5, 3.15, 0);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.05), new THREE.MeshLambertMaterial({ color: 0xcfe4ee, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
        glass.position.set(hx - sx * 1.05, 3.35, 0); glass.rotation.y = Math.PI / 2; bb.add(glass);
        for (const [w, h, y, z] of [[0.05, 1.05, 3.35, -0.9], [0.05, 1.05, 3.35, 0.9], [0.05, 0.05, 3.88, 0], [0.05, 0.05, 2.82, 0]]) addBox(bb, w, h, z === 0 ? 1.8 : 0.05, white, hx - sx * 1.05, y, z);
        addBox(bb, 0.05, 0.45, 0.6, lam(0xd8322a), hx - sx * 1.06, 3.12, 0);   // the red box on the board
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.018, 6, 18), lam(0xe8602a)); rim.rotation.x = Math.PI / 2; rim.position.set(hx - sx * 1.33, 3.05, 0); bb.add(rim);
      }
      // ---- fences: black chain link round both pickleball courts (with a divider between) and along the basketball court
      const linkTex = canvasTexture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#1e2024'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); }).tex;
      linkTex.wrapS = linkTex.wrapT = THREE.RepeatWrapping;
      const FB = 0x15161a;
      chainFence(P, R.minX, R.minZ, R.maxX, R.minZ, 3, FB, linkTex);
      chainFence(P, R.minX, R.minZ, R.minX, 22, 3, FB, linkTex);
      chainFence(P, R.maxX, R.minZ, R.maxX, -6.6, 3, FB, linkTex); chainFence(P, R.maxX, -5.0, R.maxX, 22, 3, FB, linkTex);   // (a gap: the way in, at the path's end)
      chainFence(P, R.minX, 22, R.maxX, 22, 3, FB, linkTex);
      chainFence(P, R.minX, R.maxZ, R.maxX, R.maxZ, 1.2, FB, linkTex);        // (a low divider between the two courts)
      chainFence(P, BX - BW - 2.2, BZ - BL - 1.5, BX - BW - 2.2, BZ + BL + 1.5, 3, FB, linkTex);   // (between it and the pickleball courts)
      // ---- the path: in from the sidewalk on Rice Dr, winding south through the trees (the courts off to your right, the
      // playground on your left) to the gate in the courts' east fence
      const PATH = [[22, -80], [21, -70], [17, -60], [10, -50], [6, -40], [8, -30], [12, -20], [13.4, -11], [13.4, -5.8], [11.2, -5.8]];
      const pathSegs = [];
      for (let k = 0; k < PATH.length - 1; k++) {
        const [x0, z0] = PATH[k], [x1, z1] = PATH[k + 1], len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
        flat(P, 2.3, len + 1.2, asphalt, (x0 + x1) / 2, 0.003 + k * 0.0002, (z0 + z1) / 2, ang);
        pathSegs.push([x0, z0, x1, z1]);
      }
      // a side path off to the right (as in the first photo), toward the houses' fences
      for (const [[x0, z0], [x1, z1]] of [[[17, -60], [2, -62]], [[2, -62], [-12, -60]]]) {
        const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
        flat(P, 1.8, len + 1, asphalt, (x0 + x1) / 2, 0.0028, (z0 + z1) / 2, ang); pathSegs.push([x0, z0, x1, z1]);
      }
      // a path down between the courts and the basketball court, and round the south end
      for (const [[x0, z0], [x1, z1]] of [[[13.4, -5.8], [13.4, 23.5]], [[13.4, 23.5], [-13, 23.5]]]) {
        const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
        flat(P, 1.8, len + 1, concrete, (x0 + x1) / 2, 0.0029, (z0 + z1) / 2, ang); pathSegs.push([x0, z0, x1, z1]);
      }
      const nearPath = (x, z, m) => pathSegs.some(([x0, z0, x1, z1]) => {
        const dx = x1 - x0, dz = z1 - z0, t = clamp(((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz), 0, 1);
        return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)) < m;
      });
      // ---- Rice Dr: the road, the sidewalk along the park, and the houses
      flat(P, 300, 8, lam(0x3e4144), 0, 0.002, -87);
      flat(P, 300, 1.7, concrete, 0, 0.004, -81.2);
      for (let x = -150; x < 150; x += 1.6) addBox(P, 0.03, 0.006, 1.7, lam(0x8e8c86), x, 0.006, -81.2);   // sidewalk joints
      for (let x = -146; x < 150; x += 6) addBox(P, 3, 0.004, 0.14, lam(0xe8d24a), x, 0.004, -87);        // (the centre line)
      const WALLS = [0x8a96a6, 0x6e7a8a, 0xd8d4c8, 0xa8a8a2, 0x7a8a9a, 0xc8c0b0, 0x9a8a7a, 0xe8e6e0];
      const ROOFS = [0x3a3c42, 0x4a4442, 0x2e3238, 0x5a4a42];
      // houses on the park side of the road, backing onto it (west of the path and east of the park's frontage)
      for (const x of [-72, -58, -44, -30, -16, -3, 58, 72, 86]) house(P, x, -71, Math.PI, r(9, 11), r(8, 9.5), r(3.2, 3.8), WALLS[(x / 2 + 99) % WALLS.length | 0], ROOFS[(x + 200) % ROOFS.length | 0]);
      // and across the road, facing it
      for (let x = -80; x <= 80; x += 14) house(P, x + r(-2, 2), -102, 0, r(9, 11), r(8, 9.5), r(3.2, 3.8), WALLS[(x / 2 + 103) % WALLS.length | 0], ROOFS[(x + 205) % ROOFS.length | 0]);
      // a few more round the park's edges (the houses you see past the basketball court)
      for (const [x, z, yaw] of [[62, 6, -Math.PI / 2], [62, 22, -Math.PI / 2], [60, -18, -Math.PI / 2], [-62, 4, Math.PI / 2], [-60, 22, Math.PI / 2], [14, 58, Math.PI], [32, 56, Math.PI], [-6, 58, Math.PI]]) house(P, x, z, yaw, r(9, 11), r(8, 9.5), r(3.2, 3.8), WALLS[(x + z + 400) % WALLS.length | 0], ROOFS[(x + 300) % ROOFS.length | 0]);
      // wooden privacy fences along the backyards
      const boards = canvasTexture(128, 64, (g) => { g.fillStyle = '#7a6448'; g.fillRect(0, 0, 128, 64); for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? 'rgba(40,28,18,0.35)' : 'rgba(150,130,100,0.2)'; g.fillRect(k * 8, 0, 1.2, 64); } for (let k = 0; k < 300; k++) { g.fillStyle = 'rgba(30,20,10,0.12)'; g.fillRect(rand() * 128, rand() * 64, 1, 4); } }).tex;
      boards.wrapS = THREE.RepeatWrapping;
      const woodFence = (x0, z0, x1, z1) => {
        const len = Math.hypot(x1 - x0, z1 - z0), t = boards.clone(); t.needsUpdate = true; t.repeat.set(len / 2.4, 1);
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, 1.85, 0.06), new THREE.MeshLambertMaterial({ map: t }));
        m.position.set((x0 + x1) / 2, 0.93, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); P.add(m);
      };
      woodFence(-78, -62, 4, -62); woodFence(4, -62, 4, -76);
      woodFence(50, -61, 92, -61); woodFence(50, -61, 50, -76);
      // ---- the sign at the way in: green, gold-edged, on two stone pillars, facing the sidewalk
      const stoneTex = canvasTexture(64, 128, (g) => { g.fillStyle = '#a8a092'; g.fillRect(0, 0, 64, 128); for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? -12 : 0; x < 64; x += 24) { g.fillStyle = ['#b8ae9c', '#988e80', '#c8beac', '#8a8274'][(x + y * 3 + 400) % 4]; g.fillRect(x + 1, y + 1, 22, 14); } }).tex;
      const stone = new THREE.MeshLambertMaterial({ map: stoneTex });
      const SX = 27.5, SZ = -76;   // (on the lawn to the left of the path, as you walk in)
      for (const dx of [-1.35, 1.35]) { addBox(P, 0.62, 1.15, 0.62, stone, SX + dx, 0.575, SZ); addBox(P, 0.72, 0.08, 0.72, lam(0x8e8678), SX + dx, 1.19, SZ); }
      const signTex = canvasTexture(512, 300, (g) => {
        g.fillStyle = '#1e5a36'; g.beginPath(); g.moveTo(0, 300); g.lineTo(0, 60); g.quadraticCurveTo(256, -30, 512, 60); g.lineTo(512, 300); g.fill();
        g.strokeStyle = '#d8c47a'; g.lineWidth = 8; g.beginPath(); g.moveTo(10, 292); g.lineTo(10, 66); g.quadraticCurveTo(256, -18, 502, 66); g.lineTo(502, 292); g.closePath(); g.stroke();
        g.fillStyle = '#f4f0e0'; g.beginPath(); g.ellipse(256, 82, 40, 26, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2a6a8a'; g.fillRect(220, 84, 72, 14); g.fillStyle = '#1e5a36'; for (const tx of [236, 256, 276]) { g.beginPath(); g.moveTo(tx, 62); g.lineTo(tx - 9, 84); g.lineTo(tx + 9, 84); g.fill(); }
        g.textAlign = 'center'; g.fillStyle = '#f4f0e0'; g.font = `700 66px Georgia, serif`; g.fillText('College Park', 256, 200);
      }).tex;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.23), new THREE.MeshLambertMaterial({ map: signTex, transparent: true, alphaTest: 0.5 }));
      sign.position.set(SX, 0.95, SZ - 0.04); sign.rotation.y = Math.PI; P.add(sign);
      const signBack = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.23), new THREE.MeshLambertMaterial({ map: signTex, transparent: true, alphaTest: 0.5 }));
      signBack.position.set(SX, 0.95, SZ + 0.04); P.add(signBack);
      // a park-rules post and a bin where the path starts
      addCyl(P, 0.035, 0.035, 2.4, 6, lam(0x8a8e94), 17.2, 1.2, -73.5);
      addBox(P, 0.6, 0.45, 0.03, lam(0x2a5ac8), 17.2, 2.2, -73.48);
      addBox(P, 0.3, 0.3, 0.03, lam(0xe8d24a), 17.2, 1.55, -73.48);
      addCyl(P, 0.28, 0.26, 0.95, 10, lam(0x2a2c30), 16.6, 0.48, -72.8);
      // ---- the playground: on your left as you walk in (north of the basketball court), half as big again as it was:
      // a green slide, orange and yellow climbers, a little roof
      const PX = 34, PZ = -24, PS = 1.5;
      const pg = new THREE.Group(); pg.position.set(PX, 0, PZ); pg.scale.setScalar(PS); P.add(pg);
      flat(pg, 15, 12, lam(0x8a6a4a), 0, 0.002, 0);       // (wood chips)
      const yel = lam(0xf2c12e), org = lam(0xf2782a), grn = lam(0x5ab82a), dgrn = lam(0x2e8a3a);
      for (const [x, z] of [[-3, -2], [-3, 2], [1, -2], [1, 2], [4, -2], [4, 2]]) addCyl(pg, 0.08, 0.08, 2.8, 8, x < 0 ? yel : org, x, 1.4, z);
      addBox(pg, 4.3, 0.12, 4.3, grn, -1, 1.5, 0); addBox(pg, 3.2, 0.12, 4.3, yel, 2.5, 1.0, 0);
      const peak = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.0, 4), dgrn); peak.position.set(-1, 3.3, 0); peak.rotation.y = Math.PI / 4; pg.add(peak);
      const slide = addBox(pg, 0.9, 0.08, 3.6, grn, -1, 0.85, -3.6); slide.rotation.x = -0.45;
      for (const sx of [-1, 1]) { const rail = addBox(pg, 0.06, 0.3, 3.6, dgrn, -1 + sx * 0.45, 1.0, -3.6); rail.rotation.x = -0.45; }
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 16, Math.PI * 1.5), org); curl.position.set(5.2, 1.2, 1.5); curl.rotation.y = Math.PI / 2; pg.add(curl);
      for (let k = 0; k < 5; k++) addBox(pg, 0.08, 0.08, 1.2, org, 5.4, 0.4 + k * 0.45, -2 + k * 0.1);
      // benches and a picnic table
      const wood = lam(0x8a6038), iron = lam(0x2a2c30);
      const bench = (x, z, yaw) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; P.add(g); addBox(g, 1.8, 0.06, 0.42, wood, 0, 0.46, 0); addBox(g, 1.8, 0.32, 0.05, wood, 0, 0.72, -0.2); for (const sx of [-0.75, 0.75]) addBox(g, 0.06, 0.46, 0.42, iron, sx, 0.23, 0); };
      bench(-14.5, -3, Math.PI / 2); bench(-14.5, 4, Math.PI / 2); bench(25, 22.2, Math.PI); bench(35.6, 8, -Math.PI / 2); bench(PX - 4, PZ + 11, Math.PI); bench(PX + 4, PZ + 11, Math.PI);
      const pt = new THREE.Group(); pt.position.set(36, 0, 24); P.add(pt);
      addBox(pt, 2.0, 0.07, 0.9, wood, 0, 0.75, 0); for (const sz of [-0.75, 0.75]) addBox(pt, 2.0, 0.06, 0.32, wood, 0, 0.45, sz); for (const sx of [-0.7, 0.7]) addBox(pt, 0.08, 0.75, 1.6, iron, sx, 0.38, 0);

      // ---- trees: tall bare oaks and maples (trunks, branches and twigs), pines (some going rusty), a few that keep brown leaves
      const keepOut = (x, z) => (x > -16 && x < 15 && z > -11 && z < 25.5) || (x > 14 && x < 36 && z > -7 && z < 23) || (Math.hypot(x - PX, z - PZ) < 9 * PS + 1)
        || nearPath(x, z, 2.6) || (z < -62 && !(x > 4 && x < 50)) || z < -79 || Math.hypot(x - SX, z - SZ) < 3;
      const trunks = [], branches = [];
      const trunkGeo = new THREE.CylinderGeometry(0.55, 1, 1, 7); trunkGeo.translate(0, 0.5, 0);
      const limbGeo = new THREE.CylinderGeometry(0.5, 1, 1, 5); limbGeo.translate(0, 0.5, 0);
      const coneGeo = new THREE.ConeGeometry(1, 1, 8);
      const blobGeo = new THREE.IcosahedronGeometry(1, 0);
      const BARK = [0x6a5e52, 0x5a5048, 0x7a6e60, 0x4e463e];
      function bareTree(x, z) {
        const h = r(12, 20), rad = r(0.22, 0.4), bark = BARK[(rand() * 4) | 0], tree = K.tree();
        K.crown(tree, x, h * 0.97, z, r(1.8, 2.6));
        trunks.push([x, 0, z, rad, h, rad, rand() * 6, bark]);
        const nb = 4 + ((rand() * 3) | 0);
        for (let k = 0; k < nb; k++) {
          const y = h * r(0.42, 0.82), az = rand() * Math.PI * 2, tilt = r(0.45, 0.95), len = r(2.5, 5.5) * (1.15 - y / h * 0.5), br = rad * r(0.28, 0.42);
          _q.setFromAxisAngle(XAX, tilt); _q2.setFromAxisAngle(UP, az); const q = _q2.clone().multiply(_q);
          branches.push([x, y, z, br, len, br, q, bark]);
          // two twigs from near each branch's end
          const dir = new V3(0, 1, 0).applyQuaternion(q);
          for (let t = 0; t < 2; t++) {
            const at = r(0.55, 0.95), tx = x + dir.x * len * at, ty = y + dir.y * len * at, tz = z + dir.z * len * at;
            _q.setFromAxisAngle(XAX, r(0.3, 1.1)); _q2.setFromAxisAngle(UP, az + r(-1.2, 1.2));
            const q2 = _q2.clone().multiply(_q), tl = len * r(0.4, 0.7), d2 = new V3(0, 1, 0).applyQuaternion(q2);
            branches.push([tx, ty, tz, br * 0.45, tl, br * 0.45, q2, bark]);
            K.crown(tree, tx + d2.x * tl, ty + d2.y * tl, tz + d2.z * tl, r(1.3, 2.0));   // (its leaves, when it has them)
          }
        }
      }
      function pine(x, z) {
        const h = r(9, 17), rusty = rand() < 0.16, green = rusty ? [0x6e4a2c, 0x7a5434][(rand() * 2) | 0] : [0x2e4a2a, 0x355a30, 0x2a4226][(rand() * 3) | 0];
        trunks.push([x, 0, z, 0.25, h, 0.25, 0, 0x5a3e2a]);
        const tiers = 4;
        for (let k = 0; k < tiers; k++) { const y = h * (0.35 + k * 0.17), sz = (1 - k / tiers) * r(2.2, 3.0); K.cone(x, y, z, sz, h * 0.26, green); }
      }
      let placed = 0;
      for (let tries = 0; tries < 4000 && placed < 230; tries++) {
        const x = r(-95, 95), z = r(-78, 60);
        if (keepOut(x, z)) continue;
        // denser right round the courts (as in the aerial photo), thinner out in the open lawn by the road
        const dense = Math.hypot(x - 8, z - 8) < 45 ? 1 : 0.45;
        if (rand() > dense) continue;
        if (rand() < 0.27) pine(x, z); else bareTree(x, z);
        placed++;
      }
      // the trees you see in the photos: tall ones right by the path and round the courts
      for (const [x, z] of [[19, -66], [27, -58], [11, -55], [18, -44], [1, -46], [16, -28], [2, -22], [18, -12], [-19, -4], [-17, 10], [-17, 26], [8, 28], [38, 27], [40, 0]]) if (!keepOut(x, z)) bareTree(x + r(-0.5, 0.5), z + r(-0.5, 0.5));
      for (const [x, z] of [[8, -64], [-3, -36], [-21, 2], [-6, -16], [48, 24]]) if (!keepOut(x, z)) pine(x, z);
      instanced(P, trunkGeo, lam(0xffffff), trunks);
      instanced(P, limbGeo, lam(0xffffff), branches);
      // ---- fallen leaves: on the grass, along the fences and scattered over the courts
      const leafGeo = new THREE.PlaneGeometry(1, 1); leafGeo.rotateX(-Math.PI / 2);
      const LEAF = [0x8a5a2a, 0xa86a2a, 0x6a4a2a, 0xc88a3a, 0x9a7a4a, 0x5a3a1e];
      const leaves = K.leaves;
      for (let k = 0; k < 900; k++) {
        const x = r(-40, 50), z = r(-45, 40), s = r(0.1, 0.18);
        if (x > R.minX && x < R.maxX && z > R.minZ && z < R.maxZ && rand() < 0.7) continue;   // (fewer on the court you play on)
        leaves.push([x, 0.012 + rand() * 0.004, z, s, 1, s * r(0.6, 1), rand() * 6, LEAF[(rand() * LEAF.length) | 0]]);
      }
      for (let k = 0; k < 260; k++) {   // drifts along the fence bottoms
        const side = (rand() * 4) | 0, t = rand();
        const [x, z] = side === 0 ? [R.minX + t * (R.maxX - R.minX), R.minZ + r(0.05, 0.5)] : side === 1 ? [R.minX + r(0.05, 0.5), R.minZ + t * (22 - R.minZ)] : side === 2 ? [R.maxX - r(0.05, 0.5), R.minZ + t * (22 - R.minZ)] : [R.minX + t * (R.maxX - R.minX), 22 - r(0.05, 0.5)];
        const s = r(0.1, 0.17); leaves.push([x, 0.013, z, s, 1, s * 0.8, rand() * 6, LEAF[(rand() * LEAF.length) | 0]]);
      }
      // spring flowers in the grass
      K.flowers(1100, [-60, 60, -78, 45], (x, z) => (x > -16 && x < 15 && z > -11 && z < 25.5) || (x > 14 && x < 36 && z > -7 && z < 23) || Math.hypot(x - PX, z - PZ) < 9 * PS || nearPath(x, z, 1.4) || (z < -62 && !(x > 4 && x < 50)) || z < -79);
      K.flush(P);
      // everything else here stands still: bake it into a few meshes (the see-through fences, glass and net stay as they are)
      mergeStatic(P);
      return K;
    }


    // ---------------------------------------------------------------- Senior Center (Clinton Township)
    // From photos: six blue courts with green surrounds in one big fenced enclosure (dark windscreens, banners along the
    // front), a gate by the sidewalk with a green pop-up tent outside it. In front, the parking lot: cars, tall light
    // poles, and the blue "Senior Center Recreation" sign by the drive. Behind the courts, a basketball court and a
    // playground with a pavilion; to the left, sand volleyball courts, and farther left and back, the baseball field.
    // Big spruces, bare trees and a few red-orange ones.
    function buildSenior(P, C) {
      const { HL, HW, R } = C;
      const rand = mulberry32(2024);
      const r = (a, b) => a + rand() * (b - a);
      const pick = (a) => a[(rand() * a.length) | 0];
      const K = seasonKit(rand);
      // ---- ground (its grass, or snow, comes with the season)
      K.ground(flat(P, 340, 340, new THREE.MeshLambertMaterial({ map: seasonGround(2) }), 0, -0.01, 0));
      const asphalt = lam(0x55595e), concrete = lam(0xb4b2aa), white = new THREE.MeshBasicMaterial({ color: 0xffffff });
      // ---- the enclosure: two courts end to end, three side by side; ours is the west one in the middle row
      const X0 = R.minX, X1 = R.maxX + 22, Z0 = -21, Z1 = 21;     // (the outer fence)
      flat(P, X1 - X0, Z1 - Z0, lam(0x2f6a4a), (X0 + X1) / 2, 0.001, 0);
      const COURTS = [];
      for (const cx of [0, 22]) for (const cz of [-14, 0, 14]) if (cx || cz) COURTS.push([cx, cz]);
      const netMat = new THREE.MeshLambertMaterial({ color: 0x1b1932, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      for (const [cx, cz] of COURTS) {
        flat(P, HL * 2, HW * 2, lam(0x2e5cb4), cx, 0.004, cz);
        for (const sx of [-1, 1]) flat(P, 2.13, HW * 2, lam(0x3868c0), cx + sx * 1.065, 0.006, cz);
        pbLines(P, cx, cz, HL, HW, white);
        const n = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + 0.6, 0.88), netMat); n.rotation.y = Math.PI / 2; n.position.set(cx, 0.44, cz); P.add(n);
        addBox(P, 0.04, 0.05, HW * 2 + 0.6, white, cx, 0.88, cz);
        for (const sz of [-1, 1]) addCyl(P, 0.04, 0.04, 0.94, 8, lam(0x2b2d42), cx, 0.47, cz + sz * (HW + 0.3));
      }
      // fences: black chain link all round with a dark windscreen on its lower part; low dividers between courts
      const linkTex = canvasTexture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#1e2024'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); }).tex;
      linkTex.wrapS = linkTex.wrapT = THREE.RepeatWrapping;
      const FB = 0x15161a, screenMat = lam(0x34403c);
      const GATE = [-7.2, -5.6];      // (the gate, in the front fence, x from and to)
      const outer = (x0, z0, x1, z1) => {
        chainFence(P, x0, z0, x1, z1, 3, FB, linkTex);
        const len = Math.hypot(x1 - x0, z1 - z0), m = addBox(P, len, 1.3, 0.03, screenMat, (x0 + x1) / 2, 0.68, (z0 + z1) / 2);   // (low enough to see out over)
        m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      };
      outer(X0, Z0, X1, Z0); outer(X0, Z0, X0, Z1); outer(X1, Z0, X1, Z1);
      outer(X0, Z1, GATE[0], Z1); outer(GATE[1], Z1, X1, Z1);
      // the gate: a frame, and the door standing open
      for (const gx of GATE) addCyl(P, 0.05, 0.05, 3.1, 6, lam(FB), gx, 1.55, Z1);
      addBox(P, GATE[1] - GATE[0], 0.06, 0.06, lam(FB), (GATE[0] + GATE[1]) / 2, 3.05, Z1);
      const door = new THREE.Group(); door.position.set(GATE[1], 0, Z1); door.rotation.y = -1.2; P.add(door);
      addBox(door, 1.5, 0.05, 0.05, lam(FB), -0.75, 2.1, 0); addBox(door, 1.5, 0.05, 0.05, lam(FB), -0.75, 0.1, 0); addBox(door, 0.05, 2.0, 0.05, lam(FB), -1.5, 1.1, 0);
      const dl = linkTex.clone(); dl.needsUpdate = true; dl.repeat.set(3, 4);
      const dp = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 2.0), new THREE.MeshLambertMaterial({ map: dl, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 })); dp.position.set(-0.75, 1.1, 0); door.add(dp);
      // low dividers round each court (ours sits inside them)
      for (const z of [-7, 7]) chainFence(P, X0, z, X1, z, 1.0, FB, linkTex);
      chainFence(P, R.maxX, Z0, R.maxX, Z1, 1.0, FB, linkTex);
      // banners along the front fence (both faces)
      const banners = [['SENIOR CENTER', 'PICKLEBALL', '#1e5a3a', '#ffffff'], ['WELCOME', 'PLAYERS', '#ffffff', '#1e3a7a'], ['PLEASE CLOSE', 'THE GATE', '#ffffff', '#1e5a3a'], ['PADDLES UP!', '', '#1e3a7a', '#ffffff'], ['SENIOR CENTER', 'RECREATION', '#ffffff', '#1e3a7a']];
      let bx = X0 + 2;
      for (const [a, b2, bg, fg] of banners.concat(banners)) {
        if (bx > GATE[0] - 2.2 && bx < GATE[1] + 0.5) bx = GATE[1] + 1.2;
        if (bx > X1 - 2) break;
        const tex = canvasTexture(256, 128, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 256, 128); g.fillStyle = fg; g.textAlign = 'center'; g.font = `800 34px ${DISPLAY}`; g.fillText(a, 128, b2 ? 54 : 76); if (b2) { g.font = `700 30px ${DISPLAY}`; g.fillText(b2, 128, 98); } }).tex;
        for (const side of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshLambertMaterial({ map: tex })); m.position.set(bx, 1.4, Z1 + side * 0.04); m.rotation.y = side > 0 ? 0 : Math.PI; P.add(m); }
        bx += r(3.6, 5.2);
      }
      // the sidewalk along the front, the path to the gate, the green pop-up tent and a few chairs
      flat(P, X1 - X0 + 30, 2.0, concrete, (X0 + X1) / 2, 0.004, Z1 + 2.2);
      flat(P, 1.8, 6, concrete, (GATE[0] + GATE[1]) / 2, 0.005, Z1 + 3.5);
      const tent = new THREE.Group(); tent.position.set(X0 + 4.5, 0, Z1 + 5.2); P.add(tent);
      const tg = lam(0x1e6a3a);
      for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) addCyl(tent, 0.035, 0.035, 2.3, 6, lam(0xc8ccd0), dx, 1.15, dz);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.25, 0.7, 4), tg); roof.rotation.y = Math.PI / 4; roof.position.y = 2.6; tent.add(roof);
      addBox(tent, 3.0, 0.25, 0.02, tg, 0, 2.2, 1.5); addBox(tent, 3.0, 0.25, 0.02, tg, 0, 2.2, -1.5); addBox(tent, 0.02, 0.25, 3.0, tg, 1.5, 2.2, 0); addBox(tent, 0.02, 0.25, 3.0, tg, -1.5, 2.2, 0);
      addBox(tent, 1.8, 0.05, 0.7, lam(0xe8e6e0), 0, 0.75, 0); for (const sx of [-0.8, 0.8]) addBox(tent, 0.05, 0.75, 0.6, lam(0x8a8e94), sx, 0.38, 0);
      addBox(P, 0.55, 0.75, 0.5, lam(0x3a6ab0), X0 + 8, 0.38, Z1 + 4.4);  // (a cooler)
      const chair = (x, z, yaw, col) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; P.add(g); addBox(g, 0.5, 0.05, 0.5, lam(col), 0, 0.45, 0); addBox(g, 0.5, 0.5, 0.05, lam(col), 0, 0.72, -0.24); for (const [a, b3] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) addBox(g, 0.03, 0.45, 0.03, lam(0x2a2c30), a, 0.22, b3); };
      for (let k = 0; k < 5; k++) chair(X0 + 3 + k * 0.7, Z1 + 4.3 + (k % 2) * 0.1, Math.PI, pick([0x2a5ab0, 0xc83a3a, 0x2a8a4a, 0x5a5a5a]));
      for (let k = 0; k < 4; k++) chair(R.minX + 0.6 + (k % 2) * 0.1, -4.5 + k * 3, Math.PI / 2, 0x3a3c42);   // (along our court's back fence)
      // ---- the parking lot in front: rows of stalls, cars, light poles, the drive in and the sign
      const LZ0 = Z1 + 9, LZ1 = Z1 + 48, LX0 = X0 - 6, LX1 = X1 + 10;
      flat(P, LX1 - LX0, LZ1 - LZ0, asphalt, (LX0 + LX1) / 2, 0.003, (LZ0 + LZ1) / 2);
      const curb = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), m = addBox(P, len, 0.15, 0.25, concrete, (x0 + x1) / 2, 0.075, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); };
      curb(LX0, LZ0, LX1, LZ0); curb(LX0, LZ0, LX0, LZ1); curb(LX1, LZ0, LX1, LZ1 - 12); curb(LX0, LZ1, LX1 - 14, LZ1);
      const CAR = [0xc8ccd0, 0x2a2c30, 0xe8e8e6, 0x1e2a44, 0x8a8e94, 0x5a1e1e, 0x3a4a5a, 0xa8aeb4, 0x1a1a1c];
      const car = (x, z, yaw) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; P.add(g);
        const col = pick(CAR), truck = rand() < 0.25, tall = !truck && rand() < 0.45;
        const L2 = truck ? 5.6 : r(4.4, 4.9), W2 = 1.85, bh = tall ? 1.05 : 0.8;
        addBox(g, W2, bh, L2, lam(col), 0, 0.35 + bh / 2, 0);
        const glass = lam(0x2e3a4a), top = lam(col);
        if (truck) { addBox(g, W2 - 0.3, 0.6, 1.9, glass, 0, 0.35 + bh + 0.3, 0.9); addBox(g, W2 - 0.26, 0.06, 1.94, top, 0, 0.35 + bh + 0.62, 0.9); addBox(g, W2 - 0.1, 0.25, 2.2, top, 0, 0.35 + bh + 0.12, -1.6); }
        else { const ch = tall ? 0.62 : 0.5, cl = L2 * (tall ? 0.6 : 0.48); addBox(g, W2 - 0.3, ch, cl, glass, 0, 0.35 + bh + ch / 2, tall ? -0.2 : 0.05); addBox(g, W2 - 0.26, 0.06, cl - 0.1, top, 0, 0.35 + bh + ch + 0.02, tall ? -0.2 : 0.05); }
        for (const [wx, wz] of [[-0.85, L2 * 0.32], [0.85, L2 * 0.32], [-0.85, -L2 * 0.32], [0.85, -L2 * 0.32]]) { const w = addCyl(g, 0.36, 0.36, 0.28, 10, lam(0x121214), wx, 0.36, wz); w.rotation.z = Math.PI / 2; }
      };
      // two double rows of stalls, nose to nose
      for (const rowZ of [LZ0 + 6, LZ0 + 22]) {
        for (const side of [-1, 1]) {
          const z = rowZ + side * 2.9;
          for (let x = LX0 + 3; x < LX1 - 3; x += 2.8) {
            addBox(P, 0.1, 0.005, 5.2, white, x - 1.4, 0.006, z);
            if (rand() < 0.62) car(x + r(-0.1, 0.1), z + side * r(-0.2, 0.2), side > 0 ? 0 : Math.PI);
          }
        }
        addBox(P, LX1 - LX0 - 6, 0.004, 0.1, white, (LX0 + LX1) / 2, 0.006, rowZ);
      }
      // a car trailer by the lot's west edge (as in the photo)
      const trl = new THREE.Group(); trl.position.set(LX0 - 4, 0, LZ0 + 6); trl.rotation.y = 0.15; P.add(trl);
      addBox(trl, 2.0, 0.1, 4.5, lam(0x2a2c30), 0, 0.55, 0); for (const sx of [-1, 1]) { addBox(trl, 0.06, 0.3, 4.5, lam(0x2a2c30), sx, 0.75, 0); const w = addCyl(trl, 0.3, 0.3, 0.2, 10, lam(0x121214), sx * 1.1, 0.3, 0); w.rotation.z = Math.PI / 2; } addBox(trl, 0.1, 0.1, 1.6, lam(0x2a2c30), 0, 0.5, 3.0);
      // light poles
      for (const [x, z] of [[LX0 + 8, LZ0 + 14], [(LX0 + LX1) / 2, LZ0 + 14], [LX1 - 8, LZ0 + 14], [LX0 + 8, LZ0 + 32], [LX1 - 8, LZ0 + 32], [X0 - 3, 0], [X1 + 3, -10]]) {
        addCyl(P, 0.12, 0.16, 10, 8, lam(0x9aa0a6), x, 5, z);
        addBox(P, 1.4, 0.1, 0.12, lam(0x9aa0a6), x + 0.6, 9.9, z); addBox(P, 0.6, 0.2, 0.35, lam(0x5a5e64), x + 1.25, 9.8, z);
        addCyl(P, 0.3, 0.38, 0.5, 8, concrete, x, 0.25, z);
      }
      // the drive in from the road, curving to the lot's south-east corner, and the road
      flat(P, 340, 9, lam(0x3e4144), 0, 0.002, LZ1 + 26);
      for (let x = -166; x < 170; x += 6) addBox(P, 3, 0.004, 0.14, lam(0xe8d24a), x, 0.004, LZ1 + 26);
      const DRIVE = [[LX1 - 7, LZ1 - 2], [LX1 - 6, LZ1 + 8], [LX1 - 2, LZ1 + 16], [LX1 + 2, LZ1 + 22]];
      for (let k = 0; k < DRIVE.length - 1; k++) { const [x0, z0] = DRIVE[k], [x1, z1] = DRIVE[k + 1], len = Math.hypot(x1 - x0, z1 - z0); flat(P, 8, len + 2, asphalt, (x0 + x1) / 2, 0.0035, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0)); }
      for (let k = 0; k < DRIVE.length - 1; k++) for (const sx of [-4.1, 4.1]) { const [x0, z0] = DRIVE[k], [x1, z1] = DRIVE[k + 1]; curb(x0 + sx, z0, x1 + sx, z1); }
      // the blue sign on two white posts, by the drive: "Senior Center Recreation", with its arrow
      const SGX = LX1 - 13, SGZ = LZ1 + 4;
      for (const dx of [-0.55, 0.55]) addCyl(P, 0.05, 0.05, 2.0, 8, lam(0xf2f2ee), SGX + dx, 1.0, SGZ);
      const signTex = canvasTexture(320, 200, (g) => {
        g.fillStyle = '#1e3e9a'; g.fillRect(0, 0, 320, 200); g.strokeStyle = '#f2f2ee'; g.lineWidth = 6; g.strokeRect(8, 8, 304, 184);
        g.fillStyle = '#f2f2ee'; g.textAlign = 'center'; g.font = `800 36px ${DISPLAY}`; g.fillText('Senior Center', 160, 78); g.fillText('Recreation', 160, 122);
        g.beginPath(); g.moveTo(60, 158); g.lineTo(84, 142); g.lineTo(84, 152); g.lineTo(250, 152); g.lineTo(250, 164); g.lineTo(84, 164); g.lineTo(84, 174); g.closePath(); g.fill();
      }).tex;
      for (const side of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), new THREE.MeshLambertMaterial({ map: signTex })); m.position.set(SGX, 1.55, SGZ + side * 0.03); m.rotation.y = side > 0 ? 0 : Math.PI; P.add(m); }
      // ---- behind the courts: the basketball court (right), the playground and pavilion (left)
      const BX = 24, BZ = Z0 - 12;
      flat(P, 26, 15, lam(0xa8a8a2), BX, 0.003, BZ);
      for (const sx of [-1, 1]) {
        const hx = BX + sx * 12, black = lam(0x2a2c30);
        addCyl(P, 0.08, 0.08, 3.1, 8, black, hx, 1.55, BZ);
        addBox(P, 0.05, 1.05, 1.8, lam(0xf2f2ee), hx - sx * 0.2, 3.35, BZ);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.018, 6, 18), lam(0xe8602a)); rim.rotation.x = Math.PI / 2; rim.position.set(hx - sx * 0.48, 3.05, BZ); P.add(rim);
      }
      for (const [x, z, w, d] of [[BX, BZ - 7.2, 26, 0.06], [BX, BZ + 7.2, 26, 0.06], [BX, BZ, 0.06, 14.4]]) addBox(P, w, 0.004, d, white, x, 0.008, z);
      const PGX = 2, PGZ = Z0 - 14;
      flat(P, 16, 11, lam(0x9a7a52), PGX, 0.003, PGZ);
      const yel = lam(0xf2c12e), red = lam(0xd83a2a), grn = lam(0x4aa83a), blu = lam(0x2a6ab8);
      for (const [x, z] of [[-3, -2], [-3, 2], [1, -2], [1, 2]]) addCyl(P, 0.08, 0.08, 2.6, 8, yel, PGX + x, 1.3, PGZ + z);
      addBox(P, 4.3, 0.12, 4.3, red, PGX - 1, 1.4, PGZ);
      const pk = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.9, 4), grn); pk.position.set(PGX - 1, 3.05, PGZ); pk.rotation.y = Math.PI / 4; P.add(pk);
      const sl = addBox(P, 0.9, 0.08, 3.4, grn, PGX + 3.3, 0.8, PGZ); sl.rotation.z = 0.42; sl.rotation.y = Math.PI / 2;
      for (const x of [-6, -4.4]) { addCyl(P, 0.06, 0.06, 2.4, 6, blu, PGX + x, 1.2, PGZ - 3.5); addCyl(P, 0.06, 0.06, 2.4, 6, blu, PGX + x, 1.2, PGZ + 3.5); }
      addBox(P, 0.08, 0.08, 7.1, blu, PGX - 6, 2.4, PGZ); addBox(P, 0.08, 0.08, 7.1, blu, PGX - 4.4, 2.4, PGZ);   // (the swings' frame)
      for (const z of [-2, 0, 2]) addBox(P, 0.45, 0.05, 0.2, lam(0x2a2c30), PGX - 5.2, 0.55, PGZ + z);
      // the pavilion: a concrete pad, posts, a brown hip roof, picnic tables
      const PVX = -14, PVZ = Z0 - 12;
      flat(P, 10, 8, concrete, PVX, 0.004, PVZ);
      for (const [dx, dz] of [[-4, -3], [0, -3], [4, -3], [-4, 3], [0, 3], [4, 3]]) addBox(P, 0.22, 2.6, 0.22, lam(0x7a4a2a), PVX + dx, 1.3, PVZ + dz);
      const pr = new THREE.Mesh(new THREE.ConeGeometry(6.4, 1.6, 4), lam(0x6a3a26)); pr.rotation.y = Math.PI / 4; pr.scale.set(1, 1, 0.78); pr.position.set(PVX, 3.4, PVZ); P.add(pr);
      for (const dx of [-2.2, 2.2]) for (const dz of [-1.3, 1.3]) { const t = new THREE.Group(); t.position.set(PVX + dx, 0, PVZ + dz); P.add(t); addBox(t, 1.9, 0.07, 0.8, lam(0x8a6038), 0, 0.75, 0); for (const sz of [-0.7, 0.7]) addBox(t, 1.9, 0.06, 0.3, lam(0x8a6038), 0, 0.45, sz); for (const sx of [-0.7, 0.7]) addBox(t, 0.08, 0.75, 1.5, lam(0x2a2c30), sx, 0.38, 0); }
      // ---- to the west: sand volleyball courts, then the baseball field farther out and back
      for (const vz of [-8, 8]) {
        const VX = X0 - 16;
        flat(P, 11, 19, lam(0xc8a878), VX, 0.004, vz);
        for (const sz of [-1, 1]) addCyl(P, 0.05, 0.05, 2.5, 8, lam(0xd8d8d4), VX + sz * 4.6, 1.25, vz);
        const vn = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.0), netMat); vn.position.set(VX, 1.95, vz); P.add(vn);
        addBox(P, 9.2, 0.05, 0.03, white, VX, 2.45, vz);
        for (const [x, z, w, d] of [[VX, vz - 9, 9, 0.06], [VX, vz + 9, 9, 0.06], [VX - 4.5, vz, 0.06, 18], [VX + 4.5, vz, 0.06, 18]]) addBox(P, w, 0.004, d, lam(0x2a5ab0), x, 0.008, z);
      }
      // the diamond: home plate toward the courts (south-east), the outfield away to the north-west
      const HX = X0 - 46, HZ = -18, dirA = -Math.PI * 0.75;    // (from home toward second base)
      const fwd = new V3(Math.sin(dirA), 0, Math.cos(dirA)), rgt = new V3(Math.cos(dirA), 0, -Math.sin(dirA));
      const at = (f, s2) => [HX + fwd.x * f + rgt.x * s2, HZ + fwd.z * f + rgt.z * s2];
      const dirt = lam(0xa86a3e);
      const inf = flat(P, 27.4 * 1.35, 27.4 * 1.35, dirt, ...at(19.4, 0).slice(0, 1), 0.003, at(19.4, 0)[1], dirA + Math.PI / 4);
      inf.position.set(...[at(19.4, 0)[0], 0.003, at(19.4, 0)[1]]);
      const infGrass = flat(P, 22, 22, lam(0x5e8a3e), 0, 0.005, 0, dirA + Math.PI / 4); { const [x, z] = at(19.4, 0); infGrass.position.set(x, 0.005, z); }
      { const [x, z] = at(18.4, 0); const mound = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.25, 18), dirt); mound.position.set(x, 0.12, z); P.add(mound); }
      for (const [f, s2] of [[0, 0], [19.4, 19.4], [38.8, 0], [19.4, -19.4]]) { const [x, z] = at(f * 0.707, s2 * 0.707); addBox(P, 0.4, 0.08, 0.4, white, x, 0.05, z); }
      for (const sgn of [-1, 1]) { const [x0, z0] = at(0, 0), [x1, z1] = at(60 * 0.707, sgn * 60 * 0.707); const len = Math.hypot(x1 - x0, z1 - z0), m = addBox(P, len, 0.004, 0.08, white, (x0 + x1) / 2, 0.008, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); }
      // the backstop behind home, dugout benches, and a low outfield fence
      for (let k = -2; k <= 2; k++) { const a0 = dirA + Math.PI + k * 0.32, a1 = a0 + 0.32; chainFence(P, HX + Math.sin(a0) * 7, HZ + Math.cos(a0) * 7, HX + Math.sin(a1) * 7, HZ + Math.cos(a1) * 7, 5, 0x6a6e74, linkTex); }
      for (const sgn of [-1, 1]) { const [x, z] = at(6, sgn * 14); const b4 = addBox(P, 6, 0.45, 0.5, lam(0x8a8e94), x, 0.25, z); b4.rotation.y = -dirA; }
      for (let k = 0; k < 9; k++) { const a0 = dirA - Math.PI / 4 + k * (Math.PI / 2) / 9, a1 = a0 + (Math.PI / 2) / 9; chainFence(P, HX + Math.sin(a0) * 82, HZ + Math.cos(a0) * 82, HX + Math.sin(a1) * 82, HZ + Math.cos(a1) * 82, 1.4, 0x6a6e74, linkTex); }

      // ---- trees: big blue spruces, bare trees, and a few still red and orange
      const keepOut = (x, z) => (x > X0 - 4 && x < X1 + 4 && z > Z0 - 22 && z < LZ1 + 30) || (x > X0 - 24 && x < X0 && z > -20 && z < 20)
        || Math.hypot(x - HX - fwd.x * 40, z - HZ - fwd.z * 40) < 48 || (Math.abs(z - (LZ1 + 26)) < 7);
      const trunks = [], limbs = [];
      const trunkGeo = new THREE.CylinderGeometry(0.55, 1, 1, 7); trunkGeo.translate(0, 0.5, 0);
      const limbGeo = new THREE.CylinderGeometry(0.5, 1, 1, 5); limbGeo.translate(0, 0.5, 0);
      const coneGeo = new THREE.ConeGeometry(1, 1, 9), blobGeo = new THREE.IcosahedronGeometry(1, 1);
      const bare = (x, z) => {
        const h = r(11, 17), rad = r(0.25, 0.42), bark = pick([0x6a5e52, 0x5a5048, 0x7a6e60]), tree = K.tree();
        trunks.push([x, 0, z, rad, h, rad, rand() * 6, bark]);
        K.crown(tree, x, h * 0.97, z, r(1.8, 2.6));
        for (let k = 0, nb = 5 + ((rand() * 3) | 0); k < nb; k++) {
          const y = h * r(0.35, 0.8), az = rand() * Math.PI * 2, len = r(3, 6) * (1.2 - y / h * 0.5), br = rad * r(0.3, 0.45);
          _q.setFromAxisAngle(XAX, r(0.5, 1.0)); _q2.setFromAxisAngle(UP, az); const q = _q2.clone().multiply(_q);
          limbs.push([x, y, z, br, len, br, q, bark]);
          const dir = new V3(0, 1, 0).applyQuaternion(q);
          for (let t = 0; t < 2; t++) {
            const a2 = r(0.55, 0.95); _q.setFromAxisAngle(XAX, r(0.3, 1.1)); _q2.setFromAxisAngle(UP, az + r(-1.2, 1.2));
            const q2 = _q2.clone().multiply(_q), tl = len * r(0.4, 0.7), d2 = new V3(0, 1, 0).applyQuaternion(q2), tx = x + dir.x * len * a2, ty = y + dir.y * len * a2, tz = z + dir.z * len * a2;
            limbs.push([tx, ty, tz, br * 0.45, tl, br * 0.45, q2, bark]);
            K.crown(tree, tx + d2.x * tl, ty + d2.y * tl, tz + d2.z * tl, r(1.3, 2.0));
          }
        }
      };
      const spruce = (x, z) => {
        const h = r(10, 16), col = pick([0x2a4a3e, 0x2e5244, 0x264236]);
        trunks.push([x, 0, z, 0.3, h * 0.3, 0.3, 0, 0x4a3828]);
        const c = new THREE.Color(col);
        for (let k = 0; k < 5; k++) { const y = h * (0.2 + k * 0.16), sz = (1 - k / 5.5) * r(3.0, 3.6); K.cone(x, y + h * 0.1, z, sz, h * 0.28, c.clone().offsetHSL(0, 0, (k - 2) * 0.012).getHex()); }
      };
      const leafy = bare;     // (every deciduous tree takes its colour from the season)
      let placed = 0;
      for (let tries = 0; tries < 5000 && placed < 190; tries++) {
        const x = r(-150, 110), z = r(-110, 110);
        if (keepOut(x, z)) continue;
        const k = rand(); if (k < 0.3) spruce(x, z); else if (k < 0.42) leafy(x, z); else bare(x, z);
        placed++;
      }
      // the ones in the photo: spruces and bare trees round the lot, a red one by the drive
      for (const [x, z] of [[X0 - 9, LZ0 + 3], [LX1 + 6, LZ0 + 2], [LX1 + 5, LZ0 + 20], [X1 + 8, 6]]) spruce(x, z);
      for (const [x, z] of [[X0 - 10, LZ0 + 16], [LX1 + 7, LZ0 + 30], [X0 - 6, Z0 - 6], [X1 + 7, Z0 - 4], [LX0 - 2, LZ1 + 4]]) bare(x, z);
      for (const [x, z] of [[LX1 - 3, LZ1 + 9], [X0 - 7, LZ0 + 26]]) leafy(x, z);
      instanced(P, trunkGeo, lam(0xffffff), trunks);
      instanced(P, limbGeo, lam(0xffffff), limbs);
      // fallen leaves round the courts and the lot (fall), flowers in the grass (spring)
      const LEAF = [0x8a5a2a, 0xa86a2a, 0x6a4a2a, 0xc88a3a, 0x9a7a4a, 0xb83a22];
      for (let k = 0; k < 800; k++) {
        const x = r(X0 - 30, X1 + 20), z = r(Z0 - 25, LZ1 + 10);
        if (x > X0 && x < X1 && z > Z0 && z < Z1 && rand() < 0.8) continue;
        const sz = r(0.1, 0.18); K.leaves.push([x, 0.013 + rand() * 0.004, z, sz, 1, sz * r(0.6, 1), rand() * 6, pick(LEAF)]);
      }
      K.flowers(1000, [-120, 90, -90, 90], (x, z) => (x > X0 - 4 && x < X1 + 4 && z > Z0 - 4 && z < LZ1 + 30) || (x > X0 - 24 && x < X0 && z > -20 && z < 20) || (Math.abs(z - (LZ1 + 26)) < 7) || (x > PGX - 9 && x < BX + 14 && z > Z0 - 22 && z < Z0));
      K.flush(P);
      mergeStatic(P);
      return K;
    }
    const LIST = [
      { id: 'sunny', name: 'Sunny Courts', natural: 1, court: null, build: null, bounds: { minX: -36, maxX: 36, minZ: -36, maxZ: 36 } },
      {
        id: 'college', name: 'College Park', natural: 2, court: [0x3f7a5a, 0x4c8a66], bounds: { minX: -90, maxX: 90, minZ: -84, maxZ: 58 },
        env: {
          sky: skyTexture([[0, '#2a78d8'], [0.45, '#5aa6ec'], [0.85, '#b8daf4'], [1, '#e8f0f0']]),
          bg: 0x9ccaf0, fog: [0xbcd6ea, 70, 210], hemi: [0xe8f2ff, 0x6a7448, 0.72],
          sun: [0xfff0d8, 1.05], sunDir: new V3(-0.35, 0.5, 0.8), ambient: [0x8a94a4, 0.36], sprite: null,
        },
        build: buildCollege,
      },
      {
        id: 'senior', name: 'Senior Center', natural: 2, court: [0x2e5cb4, 0x3868c0], bounds: { minX: -150, maxX: 105, minZ: -105, maxZ: 100 },
        env: {
          sky: skyTexture([[0, '#3a82d8'], [0.45, '#78b2ea'], [0.8, '#c8e0f2'], [1, '#eef2f2']]),
          bg: 0xa8d0f0, fog: [0xc4dcee, 80, 240], hemi: [0xf0f4ff, 0x6a7a4a, 0.75],
          sun: [0xfff2dc, 1.0], sunDir: new V3(0.5, 0.6, 0.6), ambient: [0x8a94a4, 0.36], sprite: null,
        },
        build: buildSenior,
      },
    ];
    LIST.SEASONS = SEASONS;
    return LIST;
  })();
