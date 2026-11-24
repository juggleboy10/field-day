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

    // ---------------------------------------------------------------- College Park
    // From photos: a neighbourhood park in late autumn. A paved path winds in from Rice Dr past the green "College Park"
    // sign on its stone pillars, through tall bare oaks and pines, to the fenced courts: two pickleball courts side by
    // side, the basketball court (green with a navy surround, black poles, glass backboards) and a playground beyond it.
    // Houses with wooden privacy fences back onto the park; a clear blue sky and a low sun.
    function buildCollege(P, C) {
      const { HL, HW, R } = C;
      const rand = mulberry32(14630);
      const r = (a, b) => a + rand() * (b - a);
      // ---- ground: autumn grass with worn, leafy patches
      const grassTex = canvasTexture(256, 256, (g) => {
        g.fillStyle = '#566c36'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 140; k++) { g.fillStyle = rand() < 0.55 ? 'rgba(120,140,60,0.35)' : rand() < 0.5 ? 'rgba(140,110,64,0.4)' : 'rgba(54,76,36,0.38)'; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 6 + rand() * 26, 4 + rand() * 16, rand() * 3, 0, Math.PI * 2); g.fill(); }
        for (let k = 0; k < 2200; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(170,190,100,0.22)' : 'rgba(40,60,25,0.25)'; g.fillRect(rand() * 256, rand() * 256, 1.5, 3); }
      }).tex;
      grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(30, 30);
      flat(P, 300, 300, new THREE.MeshLambertMaterial({ map: grassTex }), 0, -0.01, -20);
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
      // the basketball court: navy round the edge, green inside, white lines, east of the second court
      const BX = 25, BZ = 14.5, BL = 11, BW = 7;      // centre and half sizes
      flat(P, BL * 2 + 3, BW * 2 + 3, lam(0x1e2a4a), BX, 0.002, BZ);
      flat(P, BL * 2, BW * 2, lam(0x3f8a52), BX, 0.004, BZ);
      for (const sx of [-1, 1]) flat(P, 5.8, 4.9, lam(0x1e2a4a), BX + sx * (BL - 2.9), 0.006, BZ);   // the keys
      const bl = (x, z, w, d) => addBox(P, w, 0.004, d, white, BX + x, 0.009, BZ + z);
      bl(0, -BW, BL * 2, 0.06); bl(0, BW, BL * 2, 0.06); bl(-BL, 0, 0.06, BW * 2); bl(BL, 0, 0.06, BW * 2); bl(0, 0, 0.06, BW * 2);
      const arc = (x, z, rad, a0, a1, seg) => { for (let k = 0; k < seg; k++) { const a = a0 + (a1 - a0) * (k + 0.5) / seg, l = rad * (a1 - a0) / seg + 0.02; const m = addBox(P, l, 0.004, 0.06, white, BX + x + Math.cos(a) * rad, 0.009, BZ + z + Math.sin(a) * rad); m.rotation.y = -a - Math.PI / 2; } };
      arc(0, 0, 1.8, 0, Math.PI * 2, 24);                                      // centre circle
      for (const sx of [-1, 1]) {
        arc(sx * (BL - 5.8), 0, 1.8, sx > 0 ? Math.PI / 2 : -Math.PI / 2, sx > 0 ? Math.PI * 1.5 : Math.PI / 2, 12);   // free-throw circles
        arc(sx * (BL - 1.6), 0, 6.0, sx > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, sx > 0 ? Math.PI * 1.38 : Math.PI * 0.38, 28);   // three-point arcs
        bl(sx * (BL - 2.9), -2.45, 5.8, 0.06); bl(sx * (BL - 2.9), 2.45, 5.8, 0.06); bl(sx * (BL - 5.8), 0, 0.06, 4.9);
        // a hoop: black square pole, an arm out over the court, a glass backboard with a white frame, an orange rim
        const hx = BX + sx * (BL + 0.9), black = lam(0x15161a);
        addBox(P, 0.18, 3.2, 0.18, black, hx, 1.6, BZ);
        addBox(P, 1.1, 0.12, 0.12, black, hx - sx * 0.5, 3.15, BZ);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.05), new THREE.MeshLambertMaterial({ color: 0xcfe4ee, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
        glass.position.set(hx - sx * 1.05, 3.35, BZ); glass.rotation.y = Math.PI / 2; P.add(glass);
        for (const [w, h, y, z] of [[0.05, 1.05, 3.35, -0.9], [0.05, 1.05, 3.35, 0.9], [0.05, 0.05, 3.88, 0], [0.05, 0.05, 2.82, 0]]) addBox(P, w, h, z === 0 ? 1.8 : 0.05, white, hx - sx * 1.05, y, BZ + z);
        addBox(P, 0.05, 0.45, 0.6, lam(0xd8322a), hx - sx * 1.06, 3.12, BZ);   // the red box on the board
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.018, 6, 18), lam(0xe8602a)); rim.rotation.x = Math.PI / 2; rim.position.set(hx - sx * 1.33, 3.05, BZ); P.add(rim);
      }
      // ---- fences: black chain link round both pickleball courts (with a divider between) and along the basketball court
      const linkTex = canvasTexture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#1e2024'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); }).tex;
      linkTex.wrapS = linkTex.wrapT = THREE.RepeatWrapping;
      const FB = 0x15161a;
      chainFence(P, R.minX, R.minZ, R.maxX, R.minZ, 3, FB, linkTex);
      chainFence(P, R.minX, R.minZ, R.minX, 22, 3, FB, linkTex);
      chainFence(P, R.maxX, R.minZ, R.maxX, 22, 3, FB, linkTex);
      chainFence(P, R.minX, 22, R.maxX, 22, 3, FB, linkTex);
      chainFence(P, R.minX, R.maxZ, R.maxX, R.maxZ, 1.2, FB, linkTex);        // (a low divider between the two courts)
      chainFence(P, BX - BL - 1.5, BZ - BW - 2.2, BX + BL + 2.5, BZ - BW - 2.2, 3, FB, linkTex);
      // ---- the path: in from the sidewalk on Rice Dr, winding south through the trees to the courts' north-west corner
      const PATH = [[-24, -80], [-23, -70], [-19, -60], [-12, -50], [-8, -40], [-10, -30], [-14, -20], [-14, -11], [-12, -8]];
      const pathSegs = [];
      for (let k = 0; k < PATH.length - 1; k++) {
        const [x0, z0] = PATH[k], [x1, z1] = PATH[k + 1], len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
        flat(P, 2.3, len + 1.2, asphalt, (x0 + x1) / 2, 0.003 + k * 0.0002, (z0 + z1) / 2, ang);
        pathSegs.push([x0, z0, x1, z1]);
      }
      // a side path off to the east (as in the first photo), joining near the houses' fences
      for (const [[x0, z0], [x1, z1]] of [[[-19, -60], [-4, -62]], [[-4, -62], [10, -60]]]) {
        const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
        flat(P, 1.8, len + 1, asphalt, (x0 + x1) / 2, 0.0028, (z0 + z1) / 2, ang); pathSegs.push([x0, z0, x1, z1]);
      }
      // a path round the courts' west side to the basketball court
      for (const [[x0, z0], [x1, z1]] of [[[-12, -8], [-13, 23.5]], [[-13, 23.5], [14, 23.5]]]) {
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
      for (const x of [-72, -58, -44, -32, 14, 28, 42, 56, 70]) house(P, x, -71, Math.PI, r(9, 11), r(8, 9.5), r(3.2, 3.8), WALLS[(x / 2 + 99) % WALLS.length | 0], ROOFS[(x + 200) % ROOFS.length | 0]);
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
      woodFence(-78, -62, -27, -62); woodFence(-27, -62, -27, -76);
      woodFence(8, -61, 76, -61); woodFence(8, -61, 8, -76);
      // ---- the sign at the way in: green, gold-edged, on two stone pillars, facing the sidewalk
      const stoneTex = canvasTexture(64, 128, (g) => { g.fillStyle = '#a8a092'; g.fillRect(0, 0, 64, 128); for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? -12 : 0; x < 64; x += 24) { g.fillStyle = ['#b8ae9c', '#988e80', '#c8beac', '#8a8274'][(x + y * 3 + 400) % 4]; g.fillRect(x + 1, y + 1, 22, 14); } }).tex;
      const stone = new THREE.MeshLambertMaterial({ map: stoneTex });
      const SX = -18.5, SZ = -76;   // (on the lawn east of the path, as you walk in)
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
      addCyl(P, 0.035, 0.035, 2.4, 6, lam(0x8a8e94), -26.2, 1.2, -73.5);
      addBox(P, 0.6, 0.45, 0.03, lam(0x2a5ac8), -26.2, 2.2, -73.48);
      addBox(P, 0.3, 0.3, 0.03, lam(0xe8d24a), -26.2, 1.55, -73.48);
      addCyl(P, 0.28, 0.26, 0.95, 10, lam(0x2a2c30), -25.6, 0.48, -72.8);
      // ---- the playground beyond the basketball court: a green slide, orange and yellow climbers, a little roof
      const PX = 44, PZ = 13;
      flat(P, 15, 12, lam(0x8a6a4a), PX, 0.003, PZ);       // (wood chips)
      const yel = lam(0xf2c12e), org = lam(0xf2782a), grn = lam(0x5ab82a), dgrn = lam(0x2e8a3a);
      for (const [x, z] of [[-3, -2], [-3, 2], [1, -2], [1, 2], [4, -2], [4, 2]]) addCyl(P, 0.08, 0.08, 2.8, 8, x < 0 ? yel : org, PX + x, 1.4, PZ + z);
      addBox(P, 4.3, 0.12, 4.3, grn, PX - 1, 1.5, PZ); addBox(P, 3.2, 0.12, 4.3, yel, PX + 2.5, 1.0, PZ);
      const peak = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.0, 4), dgrn); peak.position.set(PX - 1, 3.3, PZ); peak.rotation.y = Math.PI / 4; P.add(peak);
      const slide = addBox(P, 0.9, 0.08, 3.6, grn, PX - 1, 0.85, PZ - 3.6); slide.rotation.x = -0.45;
      for (const sx of [-1, 1]) { const rail = addBox(P, 0.06, 0.3, 3.6, dgrn, PX - 1 + sx * 0.45, 1.0, PZ - 3.6); rail.rotation.x = -0.45; }
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 16, Math.PI * 1.5), org); curl.position.set(PX + 5.2, 1.2, PZ + 1.5); curl.rotation.y = Math.PI / 2; P.add(curl);
      for (let k = 0; k < 5; k++) addBox(P, 0.08, 0.08, 1.2, org, PX + 5.4, 0.4 + k * 0.45, PZ - 2 + k * 0.1);
      // benches and a picnic table
      const wood = lam(0x8a6038), iron = lam(0x2a2c30);
      const bench = (x, z, yaw) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; P.add(g); addBox(g, 1.8, 0.06, 0.42, wood, 0, 0.46, 0); addBox(g, 1.8, 0.32, 0.05, wood, 0, 0.72, -0.2); for (const sx of [-0.75, 0.75]) addBox(g, 0.06, 0.46, 0.42, iron, sx, 0.23, 0); };
      bench(-14.5, -3, Math.PI / 2); bench(-14.5, 4, Math.PI / 2); bench(25, 24.6, Math.PI); bench(34, 4.5, 0);
      const pt = new THREE.Group(); pt.position.set(36, 0, 24); P.add(pt);
      addBox(pt, 2.0, 0.07, 0.9, wood, 0, 0.75, 0); for (const sz of [-0.75, 0.75]) addBox(pt, 2.0, 0.06, 0.32, wood, 0, 0.45, sz); for (const sx of [-0.7, 0.7]) addBox(pt, 0.08, 0.75, 1.6, iron, sx, 0.38, 0);

      // ---- trees: tall bare oaks and maples (trunks, branches and twigs), pines (some going rusty), a few that keep brown leaves
      const keepOut = (x, z) => (x > -16 && x < 15 && z > -11 && z < 25.5) || (x > 9 && x < 40 && z > 4 && z < 25) || (Math.hypot(x - PX, z - PZ) < 9)
        || nearPath(x, z, 2.6) || (z < -62 && !(x > -27 && x < 8)) || z < -79 || Math.hypot(x - SX, z - SZ) < 3;
      const trunks = [], branches = [], pineCones = [], crowns = [];
      const trunkGeo = new THREE.CylinderGeometry(0.55, 1, 1, 7); trunkGeo.translate(0, 0.5, 0);
      const limbGeo = new THREE.CylinderGeometry(0.5, 1, 1, 5); limbGeo.translate(0, 0.5, 0);
      const coneGeo = new THREE.ConeGeometry(1, 1, 8);
      const blobGeo = new THREE.IcosahedronGeometry(1, 0);
      const BARK = [0x6a5e52, 0x5a5048, 0x7a6e60, 0x4e463e];
      function bareTree(x, z) {
        const h = r(12, 20), rad = r(0.22, 0.4), bark = BARK[(rand() * 4) | 0];
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
            branches.push([tx, ty, tz, br * 0.45, len * r(0.4, 0.7), br * 0.45, _q2.clone().multiply(_q), bark]);
          }
        }
        if (false) crowns.push([x + r(-1, 1), h * 0.8, z + r(-1, 1), r(2.2, 3.4), r(1.6, 2.4), r(2.2, 3.4), rand() * 6, [0x8a6a42, 0x9a7448, 0x7a5a38][(rand() * 3) | 0]]);
      }
      function pine(x, z) {
        const h = r(9, 17), rusty = rand() < 0.16, green = rusty ? [0x6e4a2c, 0x7a5434][(rand() * 2) | 0] : [0x2e4a2a, 0x355a30, 0x2a4226][(rand() * 3) | 0];
        trunks.push([x, 0, z, 0.25, h, 0.25, 0, 0x5a3e2a]);
        const tiers = 4;
        for (let k = 0; k < tiers; k++) { const y = h * (0.35 + k * 0.17), s = (1 - k / tiers) * r(2.2, 3.0); pineCones.push([x, y, z, s, h * 0.26, s, rand() * 6, green]); }
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
      for (const [x, z] of [[-17, -66], [-25, -58], [-9, -55], [-16, -44], [-3, -46], [-18, -26], [-6, -22], [-19, -12], [17, -10], [-17, 10], [15, 2], [-17, 26], [8, 28], [38, 27], [33, 2]]) bareTree(x + r(-0.5, 0.5), z + r(-0.5, 0.5));
      for (const [x, z] of [[-31, -64], [-15, -36], [-21, 2], [20, -14], [48, 24]]) pine(x, z);
      instanced(P, trunkGeo, lam(0xffffff), trunks);
      instanced(P, limbGeo, lam(0xffffff), branches);
      instanced(P, coneGeo, lam(0xffffff), pineCones);
      instanced(P, blobGeo, lam(0xffffff), crowns);
      // ---- fallen leaves: on the grass, along the fences and scattered over the courts
      const leafGeo = new THREE.PlaneGeometry(1, 1); leafGeo.rotateX(-Math.PI / 2);
      const LEAF = [0x8a5a2a, 0xa86a2a, 0x6a4a2a, 0xc88a3a, 0x9a7a4a, 0x5a3a1e];
      const leaves = [];
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
      instanced(P, leafGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), leaves);
      // everything here stands still: bake it into a few meshes (the see-through fences, glass and net stay as they are)
      mergeStatic(P);
    }

    return [
      { id: 'sunny', name: 'Sunny Courts', court: null, env: null, build: null },
      {
        id: 'college', name: 'College Park', court: [0x3f7a5a, 0x4c8a66],
        env: {
          sky: skyTexture([[0, '#2a78d8'], [0.45, '#5aa6ec'], [0.85, '#b8daf4'], [1, '#e8f0f0']]),
          bg: 0x9ccaf0, fog: [0xbcd6ea, 70, 210], hemi: [0xe8f2ff, 0x6a7448, 0.72],
          sun: [0xfff0d8, 1.05], sunDir: new V3(-0.35, 0.5, 0.8), ambient: [0x8a94a4, 0.36], sprite: null,
        },
        build: buildCollege,
      },
    ];
  })();
