  // ================================================================ LEVEL: WHITEWATER RAPIDS (kayak race)
  // A river down a wooded valley: a calm start pool, bends, rocks, three drops, and a finish pool. The current
  // carries you; paddling speeds you up and steers. In VR you hold a real two-handed paddle: dip a blade and pull it
  // back to push, paddle on one side to turn. In a browser W paddles and A/D turn. Race friends, or three bots when
  // you're on your own. Races start like Skyline Sprint's: whoever presses Start sets the clock for everyone.
  const kayak = (() => {
    const L = newLevel(19);
    const G = L.group;
    const rand = mulberry32(1919);
    L.grabless = true;
    L.noLocomotion = true;
    L.bounds = { minX: -80, maxX: 80, minZ: -480, maxZ: 60 };
    L.env = {
      sky: skyTexture([[0, '#3a82c8'], [0.35, '#7ab8e8'], [0.5, '#d8eef8'], [0.52, '#88a868'], [1, '#3a5a2a']]),
      bg: 0x9ccaea, fog: [0xc8e0e8, 60, 260], hemi: [0xeaf6ff, 0x4a6a3a, 0.85],
      sun: [0xfff4e0, 0.8], sunDir: new V3(0.4, 0.9, 0.3), ambient: [0x7a8a9a, 0.3],
      sprite: { tex: paleSunTex, pos: new V3(120, 220, 100), scale: 60 },
    };
    const COUNT_MS = 4000, SEAT_Y = 0.72;
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const fmt = (ms) => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
    const _a = new V3(), _b = new V3(), _c = new V3(), _q = new Q4(), _e = new THREE.Euler();

    // ---------------------------------------------------------------- the river: a centre line, and width, height and current along it
    const CTRL = [[0, 30], [0, 6], [-3, -24], [5, -54], [12, -84], [6, -114], [-6, -142], [-12, -172], [-4, -202], [8, -230], [10, -258], [2, -286], [-6, -314], [-3, -342], [4, -366], [2, -392], [0, -416]];
    const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => new V3(x, 0, z)), false, 'centripetal');
    const TLEN = curve.getLength(), N = Math.floor(TLEN) + 1, DS = TLEN / (N - 1);
    const P = curve.getSpacedPoints(N - 1);
    const T = P.map((_, i) => new V3().subVectors(P[Math.min(N - 1, i + 1)], P[Math.max(0, i - 1)]).setY(0).normalize());
    const NR = T.map((t) => new V3(-t.z, 0, t.x));      // to your right, facing downstream
    const START_S = 14, FINISH_S = TLEN - 26;
    const DROPS = [{ s: 108, h: 1.3 }, { s: 206, h: 1.5 }, { s: 302, h: 1.2 }];
    const poolA = (s) => 1 - smooth(18, 34, s), poolB = (s) => smooth(TLEN - 42, TLEN - 26, s);
    const nearDrop = (s, r) => DROPS.reduce((m, d) => Math.max(m, 1 - clamp(Math.abs(s - d.s) / r, 0, 1)), 0);
    const Hh = [], W = [], C = [];
    for (let i = 0; i < N; i++) {
      const s = i * DS;
      let y = 9 - 0.012 * s;
      for (const d of DROPS) y -= d.h * smooth(d.s - 2.5, d.s + 2.5, s);
      Hh.push(y);
      let w = 9.5 + 2.2 * Math.sin(s / 31) + 1.4 * Math.sin(s / 13 + 1) - 2.6 * nearDrop(s, 14);
      w = Math.max(6.4, w);
      const pa = poolA(s), pb = poolB(s);
      w = w * (1 - pa) + 16 * pa; w = w * (1 - pb) + 18 * pb;
      W.push(w);
      let c = 1.9 * Math.pow(9.5 / w, 0.6) * (1 + 0.7 * nearDrop(s, 10));
      c = c * (1 - Math.max(pa, pb)) + 0.3 * Math.max(pa, pb);
      C.push(c);
    }
    const at = (arr, s) => { const f = clamp(s / DS, 0, N - 1.001), i = Math.floor(f), k = f - i; return arr[i] * (1 - k) + arr[i + 1] * k; };
    L.river = { P, T, NR, W, H: Hh, C, TLEN, DS, START_S, FINISH_S, DROPS };
    function nearest(x, z, hint) {
      let best = hint, bd = Infinity;
      const lo = hint < 0 ? 0 : Math.max(0, hint - 40), hi = hint < 0 ? N - 1 : Math.min(N - 1, hint + 40);
      for (let i = lo; i <= hi; i++) { const d = (P[i].x - x) ** 2 + (P[i].z - z) ** 2; if (d < bd) { bd = d; best = i; } }
      return best;
    }
    // world position of a point on the river: distance along it, and how far right of the centre line
    function riverPoint(s, lat, out) {
      const f = clamp(s / DS, 0, N - 1.001), i = Math.floor(f), k = f - i;
      out.lerpVectors(P[i], P[i + 1], k);
      const nx = NR[i].x * (1 - k) + NR[i + 1].x * k, nz = NR[i].z * (1 - k) + NR[i + 1].z * k;
      out.x += nx * lat; out.z += nz * lat; out.y = at(Hh, s);
      return out;
    }
    const yawAt = (s) => { const i = clamp(Math.round(s / DS), 0, N - 1); return Math.atan2(-T[i].x, -T[i].z); };

    // ---------------------------------------------------------------- building strips along the river
    function strip(latA, latB, yA, yB, mat, vScale, i0, i1) {
      const pos = [], uv = [], idx = [];
      const a = i0 || 0, b = i1 === undefined ? N - 1 : i1;
      for (let i = a; i <= b; i++) {
        const p = P[i], n = NR[i], la = latA(i), lb = latB(i);
        pos.push(p.x + n.x * la, Hh[i] + yA(i), p.z + n.z * la, p.x + n.x * lb, Hh[i] + yB(i), p.z + n.z * lb);
        uv.push(0, (i * DS) / vScale, 1, (i * DS) / vScale);
        if (i < b) { const k = (i - a) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.frustumCulled = false;
      G.add(m);
      return m;
    }
    // the water, its flow drawn as streaks that run downstream
    const waterC = canvasTexture(128, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 128, 0);
      gr.addColorStop(0, '#2c6a8a'); gr.addColorStop(0.5, '#3a8ab0'); gr.addColorStop(1, '#2c6a8a');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
      for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(220,245,255,${0.08 + rand() * 0.22})`; g.fillRect(rand() * 128, rand() * 256, 1 + rand() * 2, 8 + rand() * 30); }
    });
    waterC.tex.wrapS = waterC.tex.wrapT = THREE.RepeatWrapping;
    const waterMat = new THREE.MeshLambertMaterial({ map: waterC.tex });
    strip((i) => -W[i] / 2 - 1.3, (i) => W[i] / 2 + 1.3, () => 0, () => 0, waterMat, 7);
    // white water at the drops
    const foamC = canvasTexture(128, 128, (g) => { g.clearRect(0, 0, 128, 128); for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.6})`; g.beginPath(); g.arc(rand() * 128, rand() * 128, 1 + rand() * 4, 0, Math.PI * 2); g.fill(); } });
    foamC.tex.wrapS = foamC.tex.wrapT = THREE.RepeatWrapping;
    const foamMat = new THREE.MeshBasicMaterial({ map: foamC.tex, transparent: true, depthWrite: false, opacity: 0.9 });
    for (const d of DROPS) strip((i) => -W[i] / 2 - 0.3, (i) => W[i] / 2 + 0.3, () => 0.03, () => 0.03, foamMat, 3, Math.round((d.s - 3) / DS), Math.round((d.s + 9) / DS));
    // banks: wet rock at the waterline, a rocky slope, grass on top, and fields beyond
    const bankCols = [[0.4, -0.5, 0x4a4844], [3.0, 1.3, 0x7a7266], [5.5, 2.2, 0x6a8a44], [70, 2.6, 0x557a38]];
    for (const side of [-1, 1]) {
      for (let k = 0; k < bankCols.length; k++) {
        const [l1, y1, col] = bankCols[k], [l0, y0] = k ? bankCols[k - 1] : [0.4, -0.5];
        const la = (i) => side * (W[i] / 2 + (k ? l0 : -0.2)), lb = (i) => side * (W[i] / 2 + l1);
        const ya = () => (k ? y0 : -0.6), yb = () => y1;
        const m = side < 0 ? strip(lb, la, yb, ya, lam(col), 6) : strip(la, lb, ya, yb, lam(col), 6);
        void m;
      }
    }
    // the ends: a little waterfall feeding the start pool, and a rock wall closing the finish pool
    {
      const rock = lam(0x6a645c);
      const s0 = riverPoint(0, 0, new V3()), y0 = Hh[0];
      const yaw0 = yawAt(0);
      const wall = addBox(G, W[0] + 16, 5, 3, rock, s0.x - T[0].x * 1.6, y0 + 1.2, s0.z - T[0].z * 1.6); wall.rotation.y = yaw0;
      const fallC = canvasTexture(64, 128, (g) => { g.fillStyle = '#b8e0f0'; g.fillRect(0, 0, 64, 128); for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.6})`; g.fillRect(rand() * 64, rand() * 128, 1 + rand() * 2, 10 + rand() * 30); } });
      fallC.tex.wrapS = fallC.tex.wrapT = THREE.RepeatWrapping; fallC.tex.repeat.set(3, 1);
      L.fallTex = fallC.tex;
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), new THREE.MeshBasicMaterial({ map: fallC.tex, transparent: true, opacity: 0.92 }));
      fall.position.set(s0.x - T[0].x * 0.05, y0 + 1.7, s0.z - T[0].z * 0.05); fall.rotation.y = yaw0 + Math.PI; G.add(fall);
      const e = N - 1, sE = P[e];
      const wallE = addBox(G, W[e] + 16, 4, 3, rock, sE.x + T[e].x * 1.6, Hh[e] + 0.8, sE.z + T[e].z * 1.6); wallE.rotation.y = yawAt(TLEN);
    }
    // rocks in the river, always leaving a clear channel at least 3 m wide
    const ROCKS = [];
    for (let s = 40; s < FINISH_S - 14; s += 9 + rand() * 7) {
      if (DROPS.some((d) => Math.abs(s - d.s) < 10)) continue;
      const i = Math.round(s / DS), w = W[i];
      const lats = [(rand() - 0.5) * (w - 2.6)];
      if (rand() < 0.45) lats.push((rand() - 0.5) * (w - 2.6));
      const rs = lats.map(() => 0.45 + rand() * 0.5);
      const gaps = (ls) => { const e = [-w / 2].concat(ls.slice().sort((a, b) => a - b), [w / 2]); let m = 0; for (let k = 1; k < e.length; k++) m = Math.max(m, e[k] - e[k - 1] - 2.0); return m; };
      while (lats.length && gaps(lats) < 3.2) { lats.pop(); rs.pop(); }
      lats.forEach((lat, k) => { const p = riverPoint(s, lat, new V3()); ROCKS.push({ s, lat, r: rs[k], x: p.x, z: p.z, y: p.y }); });
    }
    L.rocks = ROCKS;
    {
      const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), ROCKS.length);
      const m4 = new THREE.Matrix4(), col = new THREE.Color();
      ROCKS.forEach((r, k) => {
        m4.compose(_a.set(r.x, r.y - 0.12, r.z), _q.setFromEuler(_e.set(rand(), rand() * 6, rand())), _b.set(r.r, r.r * 0.75, r.r));
        im.setMatrixAt(k, m4); im.setColorAt(k, col.setHSL(0.08, 0.06, 0.38 + rand() * 0.15));
      });
      im.frustumCulled = false; G.add(im);
      // boulders along the banks, and trees beyond
      const nb = 220, bm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), nb);
      for (let k = 0; k < nb; k++) {
        const s = rand() * TLEN, side = rand() < 0.5 ? -1 : 1, i = Math.round(s / DS), lat = side * (W[i] / 2 + 0.7 + rand() * 1.8), r = 0.4 + rand() * 0.8;
        const p = riverPoint(s, lat, _c);
        m4.compose(_a.set(p.x, p.y + 0.1 + r * 0.3, p.z), _q.setFromEuler(_e.set(rand(), rand() * 6, rand())), _b.set(r, r * 0.7, r));
        bm.setMatrixAt(k, m4); bm.setColorAt(k, col.setHSL(0.08, 0.05, 0.35 + rand() * 0.2));
      }
      bm.frustumCulled = false; G.add(bm);
      const spots = [];
      for (let k = 0; k < 600 && spots.length < 170; k++) {
        const s = rand() * TLEN, side = rand() < 0.5 ? -1 : 1, i = Math.round(s / DS), lat = side * (W[i] / 2 + 7 + rand() * 36);
        const p = riverPoint(s, lat, new V3()), j = nearest(p.x, p.z, -1);
        if (Math.hypot(p.x - P[j].x, p.z - P[j].z) < W[j] / 2 + 6) continue;     // (a bend brings the river back close)
        spots.push([p.x, Hh[i] + 2.4, p.z]);
      }
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 1, 6), lam(0x6a4a30), spots.length);
      const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }), spots.length);
      spots.forEach(([x, y, z], k) => {
        const h = 2 + rand() * 2.5, r = 1.4 + rand() * 1.4;
        m4.compose(_a.set(x, y + h / 2, z), _q.identity(), _b.set(1, h, 1)); trunks.setMatrixAt(k, m4);
        m4.compose(_a.set(x, y + h + r * 1.3, z), _q.identity(), _b.set(r, r * 2.8, r)); crowns.setMatrixAt(k, m4);
        crowns.setColorAt(k, col.set(['#2f6a33', '#3a7a36', '#4a8a3a', '#2a5a30'][Math.floor(rand() * 4)]));
      });
      trunks.frustumCulled = crowns.frustumCulled = false;
      G.add(trunks, crowns);
    }
    // a footbridge to paddle under
    {
      const s = 158, i = Math.round(s / DS), w = W[i] + 8, p = riverPoint(s, 0, new V3()), wood = lam(0x8a6a44);
      const deck = addBox(G, w, 0.2, 1.6, wood, p.x, p.y + 3.4, p.z); deck.rotation.y = yawAt(s);
      for (const sd of [-0.75, 0.75]) { const rail = addBox(G, w, 0.08, 0.06, wood, p.x + T[i].x * sd, p.y + 4.3, p.z + T[i].z * sd); rail.rotation.y = yawAt(s); }
    }
    // the start and finish banners
    function banner(s, text, bg, fg) {
      const i = Math.round(s / DS), w = W[i], p = riverPoint(s, 0, new V3()), yaw = yawAt(s), post = lam(0x2b2d42);
      for (const sd of [-1, 1]) { const q = riverPoint(s, sd * (w / 2 + 0.9), _c); addCyl(G, 0.12, 0.14, 5.2, 8, post, q.x, q.y + 2.4, q.z); }
      const beam = addBox(G, w + 2, 0.3, 0.3, post, p.x, p.y + 4.9, p.z); beam.rotation.y = yaw;
      return makePlate(G, text, Math.min(w, 7), 0.8, new V3(p.x - T[i].x * 0.2, p.y + 4.3, p.z - T[i].z * 0.2), yaw, { bg, fg, size: 0.62 });
    }
    const startSign = banner(START_S, 'Press START', '#16142e', '#8bd450');
    banner(FINISH_S, 'FINISH', '#d8f43a', '#16142e');
    // paddle through an arch to go back to the clubhouse: one in each pool
    const ARCHES = [{ s: 5, lat: 5.4 }, { s: TLEN - 8, lat: 5.5 }];
    for (const A of ARCHES) {
      const p = riverPoint(A.s, A.lat, new V3()), yaw = yawAt(A.s), g = new THREE.Group();
      g.position.copy(p); g.rotation.y = yaw;
      const am = new THREE.MeshLambertMaterial({ color: KIOSK_COLORS[HUB], emissive: 0x3a2a10 });
      for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.3), am); m.position.set(sx * 2, 1.4, 0); g.add(m); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.4, 0.3), am); top.position.y = 3.2; g.add(top);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 3.0), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
      surf.position.y = 1.5; g.add(surf);
      G.add(g);
      makePlate(G, 'Paddle through for the clubhouse', 4.2, 0.4, new V3(p.x - T[Math.round(A.s / DS)].x * (A.s < 10 ? -0.2 : 0.2), p.y + 3.8, p.z - T[Math.round(A.s / DS)].z * (A.s < 10 ? -0.2 : 0.2)), yaw + (A.s < 10 ? Math.PI : 0), { bg: '#6b4a33', fg: '#ffe2b8', size: 0.55 });
    }
    // the results board, on the left bank of the start pool, facing the water
    const boardAt = riverPoint(START_S - 4, -(W[Math.round(START_S / DS)] / 2 + 3.4), new V3());
    const boardC = makeBoard(G, 720, 460, 3.2, 2.05, boardAt.x, boardAt.y + 3.2, boardAt.z, yawAt(START_S) + Math.PI / 2, false);
    { const i = Math.round(START_S / DS); for (const sx of [-1.3, 1.3]) addCyl(G, 0.05, 0.05, 2.4, 6, lam(0x2b2d42), boardAt.x + T[i].x * sx, boardAt.y + 1.2, boardAt.z + T[i].z * sx); }

    // ---------------------------------------------------------------- boats and paddles
    function makePaddle() {
      const g = new THREE.Group(), shaftM = lam(0x2b2d42), bladeM = lam(0xffd23f);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.2, 8), shaftM); shaft.rotation.z = Math.PI / 2; g.add(shaft);
      for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.17, 0.016), bladeM); b.position.x = sx * 1.02; b.rotation.x = sx * 0.5; g.add(b); }
      return g;
    }
    function makeKayak(colorHex) {
      const g = new THREE.Group();
      const body = new THREE.MeshLambertMaterial({ color: colorHex });
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 10), body); hull.scale.set(0.36, 0.2, 1.6); g.add(hull);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 2.6), lam(0xf4f2ec)); stripe.position.y = 0.19; g.add(stripe);
      const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 18), lam(0x1a1a22)); pit.scale.z = 1.7; pit.position.set(0, 0.2, 0.12); g.add(pit);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 22), lam(0x2b2d42)); rim.rotation.x = Math.PI / 2; rim.scale.y = 1.7; rim.position.set(0, 0.22, 0.12); g.add(rim);
      const paddle = makePaddle(); paddle.position.set(0, 0.55, -0.05); g.add(paddle);
      G.add(g);
      return { g, body, paddle };
    }
    const mine = makeKayak(PLAYER_COLORS[state.colorIdx].hex);
    L.setColor = (hex) => mine.body.color.set(hex);
    const rider = new THREE.Group(); rider.position.set(0, SEAT_Y, 0.12); mine.g.add(rider);
    let riderKey = '';
    const vrPaddleMesh = makePaddle(); vrPaddleMesh.visible = false; G.add(vrPaddleMesh);

    // splashes
    const splashTex = canvasTexture(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }).tex;
    const drops = [];
    for (let k = 0; k < 48; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: splashTex, transparent: true, depthWrite: false })); s.visible = false; G.add(s); drops.push({ s, v: new V3(), t: 0 }); }
    function splash(p, n, up) {
      let c = 0;
      for (const d of drops) {
        if (d.t > 0) continue;
        d.t = 0.55 + Math.random() * 0.3; d.s.visible = true; d.s.position.copy(p);
        d.v.set((Math.random() - 0.5) * 2, (up || 1.6) * (0.6 + Math.random() * 0.8), (Math.random() - 0.5) * 2);
        d.s.scale.setScalar(0.12 + Math.random() * 0.12);
        if (++c >= n) break;
      }
    }

    // ---------------------------------------------------------------- my boat
    const K = { x: 0, z: 0, y: 0, yaw: 0, vx: 0, vz: 0, w: 0, i: 0, s: 0, lat: 0, cp: 0, stroke: 0, strokeOn: false, bumpT: 0, dropSeen: -1, paddleAng: 0, sweep: 0 };
    L.K = K;
    const CPS = [10, 40, 90, 140, 190, 240, 290, 340].filter((s) => s < FINISH_S);
    function placeAt(s, lat) {
      riverPoint(s, lat, _a);
      Object.assign(K, { x: _a.x, z: _a.z, y: _a.y, yaw: yawAt(s), vx: 0, vz: 0, w: 0, i: Math.round(s / DS), s, lat, stroke: 0 });
      chase = null;
    }
    function toCheckpoint() {
      placeAt(CPS[K.cp] || 10, 0);
      sfx('poof', 0.6); showToast(K.cp ? 'Back to your last checkpoint' : 'Back to the start pool');
    }

    // ---------------------------------------------------------------- the race (whoever presses Start sets the clock for everyone here)
    const RACE = { id: 0, state: 'idle', startAt: 0, botsOn: false, botsN: 0, myFinish: 0 };
    L.race = RACE;
    const raceNow = () => (RACE.state === 'idle' ? 0 : Date.now() - RACE.startAt);
    const racers = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const GRID = [-3.2, -1.1, 1.1, 3.2, -5.4, 5.4];
    function toGrid() {
      const k = Math.max(0, racers().indexOf(state.myPeer));
      placeAt(START_S - 3 - Math.floor(k / GRID.length) * 3, GRID[k % GRID.length]);
      K.cp = 0; K.dropSeen = -1;
    }
    function startRace() {
      RACE.id = Math.floor(Date.now() / 1000); RACE.startAt = Date.now() + COUNT_MS; RACE.state = 'count'; RACE.myFinish = 0;
      RACE.botsN = clamp(L.picker.n - racers().length, 0, bots.length); RACE.botsOn = RACE.botsN > 0;
      toGrid(); boardKey = '';
      showToast(RACE.botsOn ? `Race against ${RACE.botsN === 1 ? 'a bot' : `${RACE.botsN} bots`}! Get ready…` : 'Race! Get ready…');
      forcePresence();
    }
    L.startRace = startRace;
    function finishRace() {
      RACE.myFinish = Math.max(1, Math.round(raceNow())); RACE.state = 'over';
      const rank = standings().findIndex((r) => r.me) + 1;
      showToast(`Finished in ${fmt(RACE.myFinish)}! ${rank === 1 ? '1st place!' : `Place ${rank}`}`);
      sfx('fanfare', 1); setTimeout(() => sfx('cheer', 0.8), 250);
      forcePresence();
    }

    // ---------------------------------------------------------------- the bots: each follows its own line round the rocks, at its own pace
    const BOT_DEF = [{ name: 'Paddle Patty', color: '#ff8a4a', f: 0.97, lane: -2.2, hat: 1, face: 1 }, { name: 'River Rick', color: '#8bd450', f: 0.9, lane: 1.8, hat: 2, face: 2 }, { name: 'Eddy Ellis', color: '#b388ff', f: 0.83, lane: 0.3, hat: 0, face: 3 },
      { name: 'Rapids Rosa', color: '#4fc3f7', f: 0.87, lane: -0.9, hat: 3, face: 0 }, { name: 'Whitewater Walt', color: '#ffd23f', f: 0.93, lane: 2.6, hat: 2, face: 1 }];
    const BOT_ROW = 6;     // the bots line up a row behind the people
    makePlayerPicker(L, { min: 1, max: 1 + BOT_DEF.length, def: 4, label: 'Racers', note: 'from the next race', stand: false });
    const bots = BOT_DEF.map((d, bi) => {
      const line = new Float32Array(N);
      for (let i = 0; i < N; i++) line[i] = d.lane * clamp(W[i] / 10, 0.6, 1.2);
      for (const r of ROCKS) {
        for (let i = Math.max(0, Math.round((r.s - 8) / DS)); i <= Math.min(N - 1, Math.round((r.s + 8) / DS)); i++) {
          const wgt = 1 - Math.abs(i * DS - r.s) / 8, clear = r.r + 1.2, dl = line[i] - r.lat;
          if (Math.abs(dl) < clear) {
            let side = Math.sign(dl) || (bi % 2 ? 1 : -1);
            if (Math.abs(r.lat + side * clear) > W[i] / 2 - 0.9) side = -side;
            line[i] += (r.lat + side * clear - line[i]) * wgt;
          }
        }
      }
      const i0g = Math.round((START_S - BOT_ROW) / DS), gridLat = GRID[bi];
      for (let i = i0g; i < Math.min(N, i0g + 22); i++) { const k = smooth(0, 1, (i - i0g) / 22); line[i] = gridLat * (1 - k) + line[i] * k; }
      for (let pass = 0; pass < 3; pass++) { const c = Float32Array.from(line); for (let i = i0g + 22; i < N - 3; i++) line[i] = (c[i - 3] + c[i - 2] + c[i - 1] + c[i] + c[i + 1] + c[i + 2] + c[i + 3]) / 7; }
      for (let i = 0; i < N; i++) line[i] = clamp(line[i], -W[i] / 2 + 0.9, W[i] / 2 - 0.9);
      const tAt = new Float32Array(N), i0 = Math.round((START_S - BOT_ROW) / DS);
      for (let i = i0 + 1; i < N; i++) tAt[i] = tAt[i - 1] + DS / (d.f * (C[i] + 2.2));
      const kay = makeKayak(d.color);
      const av = buildAvatar(d.color, d.hat, d.face, true, 1, 2); av.position.set(0, SEAT_Y, 0.12); kay.g.add(av);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.set(0, SEAT_Y + 0.45, 0.12); kay.g.add(tag);
      kay.g.visible = false;
      const finishT = tAt[Math.round(FINISH_S / DS)] * 1000;
      return Object.assign({ line, tAt, i0, kay, finishT, s: 0, lat: 0, bi }, d);
    });
    function botAt(b, tMs) {
      // where a bot is, t ms into the race
      const t = tMs / 1000;
      if (t <= 0) return { s: b.i0 * DS, lat: b.line[b.i0] };
      let lo = b.i0, hi = N - 1;
      if (t >= b.tAt[hi]) return { s: (N - 1) * DS - 9, lat: b.line[hi] };
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b.tAt[m] <= t) lo = m; else hi = m; }
      const k = (t - b.tAt[lo]) / Math.max(1e-6, b.tAt[hi] - b.tAt[lo]);
      return { s: (lo + k) * DS, lat: b.line[lo] * (1 - k) + b.line[hi] * k };
    }
    function standings() {
      const rows = [{ name: state.name || 'You', me: true, fin: RACE.myFinish, prog: K.s }];
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.ok && st.raceId === RACE.id) rows.push({ name: rec.name, fin: st.fin, prog: st.s }); }
      if (RACE.botsOn && RACE.state !== 'idle') { const t = Math.max(0, raceNow()); for (const b of bots.slice(0, RACE.botsN)) rows.push({ name: b.name, bot: true, fin: t >= b.finishT ? Math.round(b.finishT) : 0, prog: Math.min(FINISH_S, botAt(b, t).s) }); }
      rows.sort((a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.prog - a.prog));
      return rows;
    }
    L.standings = standings;

    // ---------------------------------------------------------------- paddling
    // a browser (and a VR thumbstick): forward strokes alternate sides; turning is a sweep on the far side
    function keyInput() {
      let fwd = 0, steer = 0;
      if (state.mode === 'flat') {
        const k = state.keys;
        fwd = ((k.KeyW || k.ArrowUp) ? 1 : 0) - ((k.KeyS || k.ArrowDown) ? 1 : 0) - (stick.y || 0);
        steer = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0) + (stick.x || 0);
      } else if (state.mode === 'vr') {
        const la = stickAxes(vrHands.left), ra = stickAxes(vrHands.right);
        for (const a of [la, ra]) { if (!a) continue; if (Math.abs(a[1]) > 0.25 && Math.abs(a[1]) > Math.abs(fwd)) fwd = -a[1]; if (Math.abs(a[0]) > 0.25 && Math.abs(a[0]) > Math.abs(steer)) steer = a[0]; }
      }
      return { fwd: clamp(fwd, -1, 1), steer: clamp(steer, -1, 1) };
    }
    // VR: the paddle runs between your hands, a blade past each one. A blade in the water pushes back on the boat
    // as you drag it through: pull it back to go forward, and the side you paddle on turns you away from it.
    const blades = { left: { prev: null, wet: false }, right: { prev: null, wet: false } };
    function bladeForce(pos, prev, dt, f, r, u, out) {
      // out: [forward accel, sideways accel, yaw accel] from one blade
      out[0] = out[1] = out[2] = 0;
      if (!prev || pos.y > K.y + 0.06) return false;
      const vx = (pos.x - prev.x) / dt, vz = (pos.z - prev.z) / dt;
      const rx = vx - u.x, rz = vz - u.z;
      const ff = clamp(-2.2 * (rx * f.x + rz * f.z), -9, 9), fs = clamp(-0.9 * (rx * r.x + rz * r.z), -6, 6);
      const ox = pos.x - K.x, oz = pos.z - K.z, lo = ox * r.x + oz * r.z, fo = ox * f.x + oz * f.z;
      out[0] = ff; out[1] = fs; out[2] = clamp(lo * ff * 0.9 - fo * fs * 0.5, -6, 6);
      return true;
    }
    L.bladeForce = bladeForce;
    const _bf = [0, 0, 0], _bl = new V3(), _br = new V3(), _ax = new V3();
    function vrPaddle(dt, acc) {
      const fx = -Math.sin(K.yaw), fz = -Math.cos(K.yaw), f = new V3(fx, 0, fz), r = new V3(-fz, 0, fx);
      const cur = at(C, K.s), u = new V3(T[K.i].x * cur, 0, T[K.i].z * cur);
      const lh = myHands.left, rh = myHands.right;
      vrPaddleMesh.visible = state.mode === 'vr' && lh.ok && rh.ok;
      if (!vrPaddleMesh.visible) { blades.left.prev = blades.right.prev = null; return; }
      dt = Math.max(dt, 1 / 240);
      _ax.subVectors(rh.pos, lh.pos);
      const span = Math.max(0.2, _ax.length()); _ax.multiplyScalar(1 / span);
      _bl.copy(lh.pos).addScaledVector(_ax, -0.62); _br.copy(rh.pos).addScaledVector(_ax, 0.62);
      vrPaddleMesh.position.addVectors(lh.pos, rh.pos).multiplyScalar(0.5);
      vrPaddleMesh.quaternion.setFromUnitVectors(_c.set(1, 0, 0), _ax);
      vrPaddleMesh.scale.x = (span / 2 + 0.62) / 1.02;
      for (const [side, p] of [['left', _bl], ['right', _br]]) {
        const B = blades[side];
        const wet = bladeForce(p, B.prev, dt, f, r, u, _bf);
        if (wet) { acc[0] += _bf[0]; acc[1] += _bf[1]; acc[2] += _bf[2]; }
        if (wet && !B.wet && B.prev && Math.hypot(p.x - B.prev.x, p.z - B.prev.z) / dt > 0.6) { splash(_a.set(p.x, K.y + 0.05, p.z), 4, 1.2); tone(500 + Math.random() * 200, 200, 0.08, 'triangle', 0.05); haptic(vrHands[side], 0.25, 25); }
        B.wet = wet;
        B.prev = (B.prev || new V3()).copy(p);
      }
    }

    // ---------------------------------------------------------------- one step of my boat
    const acc = [0, 0, 0];
    function step(dt, now, vrAcc) {
      const frozen = RACE.state === 'count';
      const fx = -Math.sin(K.yaw), fz = -Math.cos(K.yaw), f = _b.set(fx, 0, fz), r = new V3(-fz, 0, fx);
      K.i = nearest(K.x, K.z, K.i);
      const i = K.i, p = P[i];
      K.lat = (K.x - p.x) * NR[i].x + (K.z - p.z) * NR[i].z;
      K.s = clamp(i * DS + (K.x - p.x) * T[i].x + (K.z - p.z) * T[i].z, 0, TLEN);
      const cur = at(C, K.s), u = new V3(T[i].x * cur, 0, T[i].z * cur);
      if (frozen) { K.vx = K.vz = K.w = 0; K.y = at(Hh, K.s); return; }
      acc[0] = acc[1] = acc[2] = 0;
      // strokes from the keys (or a VR thumbstick)
      const inp = keyInput();
      if (Math.abs(inp.fwd) > 0.05 || Math.abs(inp.steer) > 0.05) {
        K.stroke += dt / 0.62; K.strokeOn = true;
        const ph = K.stroke % 1, power = ph < 0.7 ? 1 : 0.15, side = Math.floor(K.stroke) % 2 ? 1 : -1;
        acc[0] += (inp.fwd >= 0 ? 3.4 : 2.4) * inp.fwd * power + 0.7 * Math.abs(inp.steer) * power;
        acc[2] += -2.3 * inp.steer + (inp.fwd > 0.1 ? side * 0.3 * power : 0);
        if (Math.floor(K.stroke) !== Math.floor(K.stroke - dt / 0.62)) { tone(420 + Math.random() * 160, 180, 0.07, 'triangle', 0.04); const q = riverPoint(K.s, K.lat + (side > 0 ? 0.9 : -0.9), _c); splash(q, 2, 0.9); }
      } else K.strokeOn = false;
      if (vrAcc) { acc[0] += vrAcc[0]; acc[1] += vrAcc[1]; acc[2] += vrAcc[2]; }
      // the water: easy to move along the hull, hard to push sideways; the current carries you
      let rf = (K.vx - u.x) * fx + (K.vz - u.z) * fz, rs = (K.vx - u.x) * r.x + (K.vz - u.z) * r.z;
      rf += acc[0] * dt; rs += acc[1] * dt;
      rf -= (0.5 * rf + 0.08 * rf * Math.abs(rf)) * dt;
      rs -= 3.0 * rs * dt;
      rf = clamp(rf, -2.5, 3.6);
      K.vx = u.x + fx * rf + r.x * rs; K.vz = u.z + fz * rf + r.z * rs;
      K.w += acc[2] * dt; K.w -= 2.4 * K.w * dt;
      K.yaw += K.w * dt;
      K.x += K.vx * dt; K.z += K.vz * dt;
      collide(now);
      // checkpoints, the drops, the finish, the arches
      for (let c = K.cp + 1; c < CPS.length; c++) if (K.s > CPS[c] && K.s < CPS[c] + 20) { K.cp = c; if (c > 1) showToast('Checkpoint!'); }
      for (let d = 0; d < DROPS.length; d++) if (d > K.dropSeen && K.s > DROPS[d].s + 1.5 && K.s < DROPS[d].s + 8) {
        K.dropSeen = d; splash(_a.set(K.x, K.y + 0.1, K.z), 14, 2.6); sfx('poof', 0.7); sfx('whoosh', 0.6);
        for (const sd of SIDES) haptic(vrHands[sd], 0.6, 120);
      }
      if (RACE.state === 'run' && K.s >= FINISH_S) finishRace();
      for (const A of ARCHES) if (Math.abs(K.s - A.s) < 0.8 && Math.abs(K.lat - A.lat) < 1.8 && now > (L.archCool || 0)) { sfx('whoosh', 1); switchLevel(HUB); return; }
      K.y = at(Hh, K.s);
    }
    // the banks and the rocks: the bow, the middle and the stern each bump
    function bump(speed, now) {
      if (now < K.bumpT || speed < 0.4) return;
      K.bumpT = now + 280;
      tone(140 + Math.random() * 40, 80, 0.12, 'triangle', Math.min(0.25, speed * 0.08));
      for (const sd of SIDES) haptic(vrHands[sd], Math.min(1, 0.3 + speed * 0.2), 60);
    }
    function collide(now) {
      const fx = -Math.sin(K.yaw), fz = -Math.cos(K.yaw), rx = -fz, rz = fx;
      for (const off of [1.25, 0, -1.25]) {
        let px = K.x + fx * off, pz = K.z + fz * off;
        const j = nearest(px, pz, K.i), lat = (px - P[j].x) * NR[j].x + (pz - P[j].z) * NR[j].z, lim = W[j] / 2 - 0.42;
        if (Math.abs(lat) > lim) {
          const e = (Math.abs(lat) - lim) * Math.sign(lat);
          K.x -= NR[j].x * e; K.z -= NR[j].z * e; px -= NR[j].x * e; pz -= NR[j].z * e;
          const vn = K.vx * NR[j].x + K.vz * NR[j].z;
          if (vn * Math.sign(lat) > 0) { K.vx -= NR[j].x * vn * 1.3; K.vz -= NR[j].z * vn * 1.3; bump(Math.abs(vn), now); }
          K.w += Math.sign(lat) * off * 0.6 * Math.max(0.5, Math.abs(vn));
        }
        for (const R of ROCKS) {
          if (Math.abs(R.s - K.s) > 6) continue;
          const dx = px - R.x, dz = pz - R.z, d = Math.hypot(dx, dz), min = R.r + 0.36;
          if (d < min && d > 1e-4) {
            const nx = dx / d, nz = dz / d;
            K.x += nx * (min - d); K.z += nz * (min - d);
            const vn = K.vx * nx + K.vz * nz;
            if (vn < 0) { K.vx -= 1.4 * vn * nx; K.vz -= 1.4 * vn * nz; bump(-vn, now); }
            const side = Math.sign(-(nx * rx + nz * rz)) || 1;          // the rock is to this side of the boat
            K.w += off * side * 0.9 * Math.max(0.5, Math.abs(vn));
          }
        }
      }
      // the ends of the river
      if (K.s < 1.5) { const e = 1.5 - K.s, t = T[0]; K.x += t.x * e; K.z += t.z * e; const vn = K.vx * t.x + K.vz * t.z; if (vn < 0) { K.vx -= t.x * vn; K.vz -= t.z * vn; } }
      if (K.s > TLEN - 2) { const e = K.s - (TLEN - 2), t = T[N - 1]; K.x -= t.x * e; K.z -= t.z * e; const vn = K.vx * t.x + K.vz * t.z; if (vn > 0) { K.vx -= t.x * vn; K.vz -= t.z * vn; } }
    }
    L.kayakInternals = { K, step, nearest, riverPoint, placeAt, ROCKS, CPS, DROPS, bots, botAt, startRace, finishRace, toCheckpoint, standings, bladeForce, TLEN, START_S, FINISH_S, ARCHES };

    // ---------------------------------------------------------------- VR: sit in the boat (like the go-karts)
    let calibrated = false;
    const calib = { x: 0, z: 0, y: 0, yaw: 0 };
    function calibrate() {
      calib.x = camera.position.x; calib.z = camera.position.z; calib.y = camera.position.y;
      _e.setFromQuaternion(camera.quaternion, 'YXZ'); calib.yaw = _e.y;
      calibrated = true;
    }
    let startHeld = false, bHeldT = 0;
    function vrButtons(now) {
      if (state.mode !== 'vr') return;
      const btn = (h, i) => { const gp = h.source && h.source.gamepad; return !!(gp && gp.buttons && gp.buttons[i] && gp.buttons[i].pressed); };
      const a = btn(vrHands.left, 4) || btn(vrHands.right, 4), b = btn(vrHands.left, 5) || btn(vrHands.right, 5);
      if (a && !startHeld && RACE.state !== 'count') startRace();
      startHeld = a;
      // B or Y: a tap re-centres your seat; hold it to go back to your last checkpoint
      if (b) { if (!bHeldT) bHeldT = now; else if (now - bHeldT > 1200 && bHeldT > 0) { bHeldT = -1; toCheckpoint(); } }
      else { if (bHeldT > 0 && now - bHeldT < 1200) { calibrate(); showToast('Seat re-centred'); } bHeldT = 0; }
    }

    // ---------------------------------------------------------------- per frame
    const _seat = new V3(), _fw = new V3();
    let chase = null, hudKey = '', boardKey = '', lastCount = -1;
    const hudPlate = makePlate(camera, 'Kayak', 0.55, 0.1, new V3(0, -0.22, -0.6), 0, { bg: '#16142e', fg: '#ffffff', size: 0.55 });
    hudPlate.material.depthTest = false; hudPlate.renderOrder = 999; hudPlate.visible = false;
    function hudText() {
      if (RACE.state === 'count') return `Get ready… ${Math.max(1, Math.ceil((RACE.startAt - Date.now()) / 1000))}`;
      if (RACE.state === 'run' || RACE.state === 'over') {
        const rows = standings(), pl = rows.findIndex((x) => x.me) + 1;
        return `${RACE.state === 'over' ? 'Done ' + fmt(RACE.myFinish) : fmt(raceNow())}  ·  ${pl}/${rows.length}`;
      }
      return state.mode === 'vr' ? 'A or X: start a race' : 'Free paddle · Start race: top right';
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      // the river flows
      waterC.tex.offset.y -= dt * 0.32; foamC.tex.offset.y -= dt * 0.9; if (L.fallTex) L.fallTex.offset.y += dt * 1.4;
      for (const d of drops) { if (d.t <= 0) continue; d.t -= dt; d.v.y -= 9.8 * dt; d.s.position.addScaledVector(d.v, dt); d.s.material.opacity = Math.min(1, d.t * 2); if (d.t <= 0) d.s.visible = false; }
      // the race clock
      if (RACE.state === 'count') {
        const left = RACE.startAt - Date.now(), n = Math.ceil(left / 1000);
        if (left <= 0) { RACE.state = 'run'; startSign.userData.draw('GO!'); sfx('whistle', 1); showToast('GO!'); }
        else if (n !== lastCount) { lastCount = n; startSign.userData.draw(String(n)); tone(660, 660, 0.15, 'square', 0.15); }
      } else if (RACE.state === 'run' && raceNow() > 4000 && startSign.userData.text !== 'RACE ON') { startSign.userData.text = 'RACE ON'; startSign.userData.draw('RACE ON'); }
      else if (RACE.state !== 'run' && RACE.state !== 'count' && startSign.userData.text !== 'Press START') { startSign.userData.text = 'Press START'; startSign.userData.draw('Press START'); }
      if (here) {
        vrButtons(now);
        let vrAcc = null;
        if (state.mode === 'vr' && RACE.state !== 'count') { vrAcc = [0, 0, 0]; vrPaddle(dt, vrAcc); } else vrPaddleMesh.visible = state.mode === 'vr' && myHands.left.ok && myHands.right.ok;
        for (let k = 0; k < 2 && state.level === L.idx; k++) step(dt / 2, now, vrAcc);
        if (state.level !== L.idx) return;
      }
      // my boat, gently bobbing, nose down over the drops
      const slope = (at(Hh, K.s + 1) - at(Hh, K.s - 1)) / 2;
      mine.g.position.set(K.x, K.y + 0.03 * Math.sin(now * 0.003), K.z);
      mine.g.rotation.set(Math.atan(slope) * 0.9, K.yaw, clamp(-K.w * 0.12, -0.2, 0.2) + 0.02 * Math.sin(now * 0.0021), 'YXZ');
      mine.g.visible = here;
      // the paddle on the boat: animated in a browser; in VR it's the one between your hands
      mine.paddle.visible = state.mode !== 'vr';
      if (mine.paddle.visible) {
        const ph = K.stroke % 1, side = Math.floor(K.stroke) % 2 ? 1 : -1, inp = keyInput();
        const target = K.strokeOn ? (Math.abs(inp.steer) > 0.3 && Math.abs(inp.fwd) < 0.3 ? -Math.sign(inp.steer) * 0.5 : side * 0.5 * Math.sin(ph * Math.PI)) : 0;
        K.paddleAng += (target - K.paddleAng) * Math.min(1, dt * 10);
        mine.paddle.rotation.set(0, K.strokeOn ? (ph - 0.5) * 0.6 * side : 0, K.paddleAng);
      }
      const rkey = `${state.colorIdx}|${state.hat}|${state.face}|${state.shirt}|${state.shirtColor}|${state.mode}`;
      if (rkey !== riderKey) { riderKey = rkey; rider.clear(); if (state.mode !== 'vr') rider.add(buildAvatar(PLAYER_COLORS[state.colorIdx].hex, state.hat, state.face, true, state.shirt, state.shirtColor)); mine.body.color.set(PLAYER_COLORS[state.colorIdx].hex); }
      // in VR you sit in it
      _seat.set(0, SEAT_Y, 0.12).applyAxisAngle(UP, K.yaw).add(_a.set(K.x, K.y, K.z));
      if (state.mode === 'vr' && here) {
        if (!calibrated) calibrate();
        const yaw = K.yaw - calib.yaw;
        dolly.rotation.set(0, yaw, 0);
        const off = _c.set(calib.x, 0, calib.z).applyAxisAngle(UP, yaw);
        dolly.position.set(_seat.x - off.x, _seat.y - calib.y, _seat.z - off.z);
      }
      // the bots
      const tRace = Math.max(0, raceNow());
      for (const b of bots) {
        b.kay.g.visible = here && RACE.botsOn && RACE.state !== 'idle' && b.bi < RACE.botsN;
        if (!b.kay.g.visible) continue;
        const q = botAt(b, tRace);
        riverPoint(q.s, q.lat, _a);
        b.kay.g.position.set(_a.x, _a.y + 0.03 * Math.sin(now * 0.003 + b.f * 10), _a.z);
        const sl = (at(Hh, q.s + 1) - at(Hh, q.s - 1)) / 2;
        b.kay.g.rotation.set(Math.atan(sl) * 0.9, yawAt(q.s), 0, 'YXZ');
        const moving = RACE.state !== 'count' && tRace < b.finishT;
        b.kay.paddle.rotation.set(0, 0, moving ? Math.sin(now * 0.0105 + b.f * 7) * 0.5 : 0);
      }
      // everyone else's boats
      const k = 1 - Math.exp(-dt * 10);
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        const show = inMyLevel(rec) && st && st.ok;
        if (!show) { if (rec.kayak) rec.kayak.g.visible = false; continue; }
        if (!rec.kayak) { rec.kayak = makeKayak(PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '#ffffff'); rec.kayak.g.position.set(st.x, at(Hh, st.s), st.z); rec.kayak.g.rotation.y = st.yaw; }
        const g = rec.kayak.g;
        g.visible = true;
        if (PLAYER_COLORS[rec.colorIdx]) rec.kayak.body.color.set(PLAYER_COLORS[rec.colorIdx].hex);
        if (Math.hypot(g.position.x - st.x, g.position.z - st.z) > 8) g.position.set(st.x, 0, st.z);
        g.position.x += (st.x - g.position.x) * k; g.position.z += (st.z - g.position.z) * k; g.position.y = at(Hh, st.s) + 0.03 * Math.sin(now * 0.003);
        let dy = st.yaw - g.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        g.rotation.set(0, g.rotation.y + dy * k, 0, 'YXZ');
        // a VR player's paddle runs between their hands; otherwise it's animated
        if (rec.hasL && rec.hasR && st.vr) {
          rec.kayak.paddle.visible = false;
          if (!rec.vrPaddle) { rec.vrPaddle = makePaddle(); G.add(rec.vrPaddle); }
          rec.vrPaddle.visible = true;
          _ax.subVectors(rec.cur.r.pos, rec.cur.l.pos); const span = Math.max(0.2, _ax.length()); _ax.multiplyScalar(1 / span);
          rec.vrPaddle.position.addVectors(rec.cur.l.pos, rec.cur.r.pos).multiplyScalar(0.5);
          rec.vrPaddle.quaternion.setFromUnitVectors(_c.set(1, 0, 0), _ax); rec.vrPaddle.scale.x = (span / 2 + 0.62) / 1.02;
        } else {
          if (rec.vrPaddle) rec.vrPaddle.visible = false;
          rec.kayak.paddle.visible = true;
          rec.kayak.paddle.rotation.set(0, 0, st.paddle);
        }
      }
      if (!here) { hudPlate.visible = false; return; }
      // the HUD and the results board
      const txt = hudText();
      if (state.mode === 'vr') { hudPlate.visible = true; if (txt !== hudKey) { hudKey = txt; hudPlate.userData.draw(txt); } }
      else { hudPlate.visible = false; if (ui.status) { ui.status.hidden = false; if (txt !== hudKey) { hudKey = txt; ui.status.textContent = txt; } } }
      drawResults();
    };
    function drawResults() {
      const rows = standings();
      const key = JSON.stringify([RACE.state, rows.map((r) => [r.name, r.fin, Math.round(r.prog / 10)])]);
      if (key === boardKey) return;
      boardKey = key;
      const g = boardC.g, Wd = 720, Hd = 460;
      g.fillStyle = '#12304a'; g.fillRect(0, 0, Wd, Hd);
      g.strokeStyle = '#4fc3f7'; g.lineWidth = 8; g.strokeRect(4, 4, Wd - 8, Hd - 8);
      g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = '#8be0ff'; g.font = `800 56px ${DISPLAY}`; g.fillText('Whitewater Rapids', 32, 52);
      g.fillStyle = '#c8e4f4'; g.font = `400 24px ${BODY}`;
      g.fillText(RACE.state === 'idle' ? 'Press Start race. Paddle, steer round the rocks, ride the drops.' : RACE.state === 'count' ? 'Get ready…' : 'Race on', 32, 104, Wd - 64);
      rows.slice(0, 6).forEach((r, i) => {
        const y = 160 + i * 48;
        g.textAlign = 'left'; g.fillStyle = r.me ? '#8bd450' : r.bot ? '#a9c0d8' : '#ffffff'; g.font = `${r.me ? 700 : 400} 30px ${BODY}`;
        g.fillText(`${i + 1}  ${r.me ? 'You' : r.name}`, 32, y, 420);
        g.textAlign = 'right'; g.fillStyle = '#ffd890'; g.font = `800 34px ${DISPLAY}`;
        g.fillText(r.fin ? fmt(r.fin) : RACE.state === 'run' ? `${Math.round((r.prog / FINISH_S) * 100)}%` : '-', Wd - 32, y);
      });
      boardC.tex.needsUpdate = true;
    }
    // browser: a camera behind the boat
    L.flatCamera = (dt) => {
      _fw.set(-Math.sin(K.yaw), 0, -Math.cos(K.yaw));
      const want = _c.set(K.x - _fw.x * 5.4, K.y, K.z - _fw.z * 5.4);
      if (!chase || chase.distanceTo(want) > 20) chase = want.clone();
      chase.lerp(want, Math.min(1, dt * 4));
      dolly.rotation.set(0, 0, 0);
      dolly.position.copy(chase);
      camera.position.set(0, 2.5, 0);
      camera.lookAt(K.x + _fw.x * 5, K.y + 0.5, K.z + _fw.z * 5);
      return true;
    };
    // what others see of a browser player: sitting in the boat, hands on the paddle
    const _hq = new Q4();
    L.publishPose = () => {
      if (state.mode === 'vr') return null;
      _hq.setFromAxisAngle(UP, K.yaw);
      const head = _seat.clone();
      const lh = new V3(-0.3, SEAT_Y - 0.2, -0.05).applyAxisAngle(UP, K.yaw).add(_a.set(K.x, K.y, K.z));
      const rh = new V3(0.3, SEAT_Y - 0.2, -0.05).applyAxisAngle(UP, K.yaw).add(_a.set(K.x, K.y, K.z));
      return { h: [head, _hq], l: [lh, _hq], r: [rh, _hq] };
    };

    // ---------------------------------------------------------------- network
    const PHC = { idle: 0, count: 1, run: 2, over: 3 };
    L.presence = () => ({ ky: [r3(K.x), r3(K.z), r3(K.yaw), Math.round(K.s * 10), RACE.id, Math.floor(RACE.startAt / 100) % 1e9, RACE.myFinish, PHC[RACE.state], Math.round(K.paddleAng * 100) / 100, state.mode === 'vr' ? 1 : 0, RACE.botsN] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.ky;
      st.ok = false;
      if (!(Array.isArray(a) && a.length === 11 && a.every((x) => typeof x === 'number' && isFinite(x)))) return;
      const fin = Number.isInteger(a[6]) && a[6] >= 0 && a[6] < 3.6e6 ? a[6] : 0;
      if (fin !== st.fin || a[4] !== st.raceId) state.dirtyBoard = true;
      Object.assign(st, { ok: true, x: clamp(a[0], -400, 400), z: clamp(a[1], -600, 200), yaw: a[2], s: clamp(a[3] / 10, 0, TLEN), raceId: a[4], fin, paddle: clamp(a[8], -1, 1), vr: a[9] === 1 });
      // someone started a race: join it if the countdown hasn't finished
      if (a[4] > RACE.id && state.level === L.idx && state.mode !== 'menu') {
        const startAt = a[5] * 100 + Math.floor(Date.now() / 1e11) * 1e11;
        if (startAt > Date.now() - 500) {
          const nb = clamp(Math.round(a[10]), 0, bots.length);
          Object.assign(RACE, { id: a[4], startAt, state: 'count', myFinish: 0, botsN: nb, botsOn: nb > 0 });
          toGrid(); boardKey = ''; showToast(`${rec.name} started a race! Get ready…`);
        }
      }
    };
    L.rowFor = (st, isMe) => {
      const fin = isMe ? RACE.myFinish : st && st.raceId === RACE.id ? st.fin : 0, prog = isMe ? K.s : st ? st.s || 0 : 0;
      return { fin, prog, text: fin ? fmt(fin) : RACE.state === 'run' ? `${Math.round((prog / FINISH_S) * 100)}%` : '-' };
    };
    L.sortRows = (a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : (b.prog || 0) - (a.prog || 0));
    L.drawBoard = () => drawResults();
    L.hudActions = [
      { label: () => (RACE.state === 'idle' || RACE.state === 'over' ? 'Start race' : 'Restart race'), run: () => startRace() },
      { label: () => 'Back to checkpoint', run: () => toCheckpoint() },
    ];
    L.hints = [['Paddle', 'dip a blade and pull it back'], ['Thumbstick', 'paddle and steer'], ['A / X', 'start a race'], ['Hold B / Y', 'back to checkpoint']];
    L.hintsFor = () => (state.mode === 'flat' ? [['W', 'paddle'], ['A / D', 'turn'], ['S', 'back-paddle'], ['R', 'back to checkpoint']] : L.hints);
    L.onKey = (code) => {
      if (state.mode === 'flat' && code === 'KeyR') { toCheckpoint(); return; }
      if (/^Digit[1-9]$/.test(code) && Number(code.slice(5)) <= LEVEL_META.length) switchLevel(Number(code.slice(5)) - 1);
    };
    L.clampPlayer = () => [0, 0];
    L.spawn = () => { placeAt(9, (Math.random() - 0.5) * 6); K.cp = 0; K.dropSeen = -1; chase = null; if (state.mode !== 'vr') dolly.position.set(K.x, K.y, K.z); };
    L.onEnter = () => { calibrated = false; L.archCool = performance.now() + 2500; RACE.state = 'idle'; RACE.myFinish = 0; hudKey = ''; boardKey = ''; state.dirtyBoard = true; };
    L.onExit = () => {
      hudPlate.visible = false; vrPaddleMesh.visible = false;
      dolly.rotation.set(0, 0, 0); dolly.position.y = 0;
      if (ui.status) ui.status.hidden = true;
      for (const b of bots) b.kay.g.visible = false;
      for (const rec of remotes.values()) { if (rec.kayak) rec.kayak.g.visible = false; if (rec.vrPaddle) rec.vrPaddle.visible = false; }
    };
    L.attract = (now) => {
      const s = 40 + ((reduceMotion ? 0 : now * 0.004) % (TLEN - 80)), q = riverPoint(s, 0, _a), yaw = yawAt(s);
      camera.position.set(q.x + Math.sin(yaw) * 8, q.y + 5, q.z + Math.cos(yaw) * 8);
      camera.lookAt(q.x - Math.sin(yaw) * 10, q.y, q.z - Math.cos(yaw) * 10);
    };
    return L;
  })();
