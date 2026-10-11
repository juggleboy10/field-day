  // ================================================================ LEVEL: SEASIDE MINI GOLF
  const minigolf = (() => {
    const L = newLevel(6);
    const G = L.group;
    const rand = mulberry32(2024);
    L.grabless = true;
    L.chargeKick = true;
    const BR = 0.034, CUP_R = 0.066, FELT = 0.06, MAXS = 6;
    L.env = {
      sky: skyTexture([[0, '#3d8fd6'], [0.3, '#7cbcec'], [0.47, '#d8eef8'], [0.5, '#fdf3df'], [0.52, '#8fc4d8'], [1, '#2a6f9a']]),
      bg: 0x9cd0f0, fog: [0xcfe8f4, 60, 320], hemi: [0xf0f6ff, 0x6a8aa0, 0.72],
      sun: [0xfff2dc, 0.62], sunDir: new V3(0.5, 0.8, -0.3), ambient: [0x8899aa, 0.25],
      sprite: { tex: paleSunTex, pos: new V3(220, 300, -150), scale: 70 },
    };
    L.bounds = { minX: -14.5, maxX: 14.5, minZ: -39.5, maxZ: 10.5 };

    // sea, pier, rails, a lighthouse
    const sea = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#2b78b0'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(20,60,110,0.25)';
        g.lineWidth = 2;
        const x = rand() * 128, y = rand() * 128;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 3, x + 12, y); g.stroke();
      }
    });
    sea.tex.wrapS = sea.tex.wrapT = THREE.RepeatWrapping;
    sea.tex.repeat.set(60, 60);
    const seaMesh = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ map: sea.tex }));
    seaMesh.rotation.x = -Math.PI / 2; seaMesh.position.y = -1.6;
    G.add(seaMesh);
    const planks = canvasTexture(256, 256, (g) => {
      for (let i = 0; i < 8; i++) {
        const s = 150 + Math.floor(rand() * 30);
        g.fillStyle = `rgb(${s + 20},${s - 25},${s - 75})`;
        g.fillRect(0, i * 32, 256, 30);
        g.fillStyle = 'rgba(90,60,30,0.5)'; g.fillRect(0, i * 32 + 30, 256, 2);
        g.fillRect(Math.floor(rand() * 256), i * 32, 2, 30);
      }
    });
    planks.tex.wrapS = planks.tex.wrapT = THREE.RepeatWrapping;
    planks.tex.repeat.set(10, 6);
    planks.tex.repeat.set(10, 16);
    addBox(G, 30, 0.4, 51, new THREE.MeshLambertMaterial({ map: planks.tex }), 0, -0.2, -14.5);
    // the posts end just under the deck (a post top level with the deck's top would flicker through it)
    for (let x = -14; x <= 14; x += 4) for (const z of [-39.6, -24.6, -9, 10.6]) addCyl(G, 0.25, 0.25, 1.7, 8, lam(0x6a4a2a), x, -1.15, z);
    const railMat = lam(0xffffff), railAlt = lam(0x2ec4b6);
    for (const z of [-40, 11]) { addBox(G, 30, 0.08, 0.08, railMat, 0, 1.0, z); addBox(G, 30, 0.06, 0.06, railAlt, 0, 0.55, z); }
    for (const x of [-15, 15]) { addBox(G, 0.08, 0.08, 51, railMat, x, 1.0, -14.5); addBox(G, 0.06, 0.06, 51, railAlt, x, 0.55, -14.5); }
    for (let x = -15; x <= 15; x += 2.5) for (const z of [-40, 11]) addBox(G, 0.08, 1.0, 0.08, railMat, x, 0.5, z);
    for (let z = -40; z <= 11; z += 2.5) for (const x of [-15, 15]) addBox(G, 0.08, 1.0, 0.08, railMat, x, 0.5, z);
    {
      const red = lam(0xd84a4a), white = lam(0xf4f2ec);
      addCyl(G, 6, 7, 3, 14, lam(0x6d6a66), 40, -1.0, -70);
      for (let k = 0; k < 6; k++) addCyl(G, 2.2 - k * 0.12, 2.3 - k * 0.12, 3, 14, k % 2 ? white : red, 40, 1.5 + k * 3, -70);
      addCyl(G, 1.4, 1.4, 1.6, 12, lam(0x2b2d42), 40, 19.3, -70);
      const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xfff0b0 }));
      beam.position.set(40, 19.4, -70); beam.scale.set(6, 6, 1);
      G.add(beam);
    }

    // holes, laid side by side; each runs from its tee (+z) to its cup (-z)
    const HOLES = [
      { name: 'Warm-up', x: -10, len: 7, w: 1.6, par: 2, cup: [0, -2.8], feats: [] },
      { name: 'Zig-zag', x: -5.6, len: 8, w: 2.4, par: 3, cup: [0.6, -3.2], feats: [{ t: 'wall', a: [-1.2, 1.2], b: [0.45, 1.2] }, { t: 'wall', a: [1.2, -1.0], b: [-0.45, -1.0] }] },
      { name: 'The hump', x: -1.4, len: 8, w: 1.8, par: 3, cup: [0, -3.2], feats: [{ t: 'hill', c: [0, 0.2], a: 0.24, s: 0.75 }] },
      { name: 'Windmill', x: 3.2, len: 8, w: 2.2, par: 3, cup: [0, -3.2], feats: [{ t: 'mill', zf: 0.3, d: 0.8, door: 0.44, w: 1.1 }] },
      { name: 'Bumper bowl', x: 9.2, len: 7, w: 4.0, par: 3, cup: [0, -2.7], feats: [
        { t: 'bump', c: [-0.9, 0.4], r: 0.3 }, { t: 'bump', c: [0.9, 0.4], r: 0.3 }, { t: 'bump', c: [0, -0.9], r: 0.3 },
        { t: 'bump', c: [-1.3, -1.8], r: 0.25 }, { t: 'bump', c: [1.3, -1.8], r: 0.25 }] },
      // the back nine (well, five), out over the water
      { name: 'Twin hills', x: -10, z: -15, len: 8, w: 2.0, par: 3, cup: [0.5, -3.2], feats: [{ t: 'hill', c: [-0.35, 1.3], a: 0.2, s: 0.6 }, { t: 'hill', c: [0.35, -1.0], a: 0.22, s: 0.6 }] },
      { name: 'Slalom', x: -5.6, z: -15, len: 9, w: 2.6, par: 3, cup: [0, -3.8], feats: [
        { t: 'wall', a: [-1.3, 2.0], b: [0.5, 2.0] }, { t: 'wall', a: [1.3, 0.4], b: [-0.5, 0.4] }, { t: 'wall', a: [-1.3, -1.2], b: [0.5, -1.2] }, { t: 'bump', c: [0.85, -2.5], r: 0.22 }] },
      { name: 'Gatekeepers', x: -1.4, z: -15, len: 9, w: 2.4, par: 3, cup: [0, -3.8], feats: [{ t: 'spin', c: [-0.5, 1.2], arm: 0.7, w: -1.0, theta: 0 }, { t: 'spin', c: [0.5, -1.4], arm: 0.7, w: 1.15, theta: 0.6 }] },
      { name: 'Volcano', x: 3.2, z: -15, len: 8, w: 2.2, par: 3, cup: [0, -2.4], feats: [{ t: 'hill', c: [0, -2.4], a: 0.2, s: 0.9 }] },
      { name: 'Pinball finale', x: 9.2, z: -15, len: 9, w: 4.0, par: 4, cup: [1.2, -3.6], feats: [
        { t: 'wall', a: [-2.0, 1.6], b: [0.6, 0.6] }, { t: 'bump', c: [1.1, 1.2], r: 0.28 }, { t: 'bump', c: [-0.9, -0.6], r: 0.3 },
        { t: 'bump', c: [0.6, -1.6], r: 0.26 }, { t: 'hill', c: [-1.0, -2.6], a: 0.18, s: 0.7 }, { t: 'wall', a: [2.0, -2.2], b: [0.9, -2.7] }] },
      // the silly row, at the end of the pier
      // three mouths: the little middle one drops you by the cup; the left spits you sideways; the right sends you back to the tee
      { name: 'Big Mouth', x: -10, z: -30.5, len: 9, w: 2.6, par: 3, cup: [0.7, -3.6], feats: [{ t: 'mouth', z: 1.2, mouths: [
        { x: -0.85, half: 0.17, to: [-1.0, -0.7], dir: [1, 0.25] }, { x: 0, half: 0.12, to: [0.45, -2.75], dir: [0.27, -0.96] }, { x: 0.85, half: 0.17, to: [1.0, 3.3], dir: [-0.3, 1] }] }] },
      // hit it hard enough to make it round the loop; too soft and it rolls back to you
      { name: 'Loop-de-loop', x: -5.6, z: -30.5, len: 9, w: 2.0, par: 3, cup: [0, -3.6], feats: [
        { t: 'wall', a: [-1.0, 2.1], b: [-0.22, 1.3] }, { t: 'wall', a: [-0.22, 1.3], b: [-0.22, 0.5] }, { t: 'wall', a: [1.0, 2.1], b: [0.22, 1.3] }, { t: 'wall', a: [0.22, 1.3], b: [0.22, 0.5] },
        { t: 'loop', z: 0.9, x: 0, r: 0.42, need: 2.2 }, { t: 'bump', c: [-0.45, -1.5], r: 0.2 }, { t: 'bump', c: [0.5, -2.3], r: 0.2 }] },
      { name: 'Mole Patrol', x: -1.4, z: -30.5, len: 9, w: 2.6, par: 3, cup: [0.1, -3.6], feats: [
        { t: 'mole', c: [-0.7, 1.2], r: 0.11, per: 2.6, ph: 0 }, { t: 'mole', c: [0.25, 0.4], r: 0.11, per: 3.1, ph: 1.1 }, { t: 'mole', c: [0.85, -0.7], r: 0.11, per: 2.3, ph: 0.4 },
        { t: 'mole', c: [-0.35, -1.6], r: 0.11, per: 2.9, ph: 2.0 }, { t: 'mole', c: [0.55, -2.5], r: 0.11, per: 2.5, ph: 1.6 }, { t: 'pond', c: [-0.75, -2.95], r: 0.42, ducks: 2 }] },
      // up the ramp and over the shark pool: short is a splash
      { name: 'Shark Jump', x: 3.2, z: -30.5, len: 9, w: 2.2, par: 3, cup: [0, -3.6], feats: [{ t: 'jump', z0: 1.9, z1: 0.9, gapTo: -0.4, rh: 0.2 }] },
    ];
    for (const H of HOLES) if (H.z === undefined) H.z = 0;
    L.HOLES = HOLES;
    const PAR_TOTAL = HOLES.reduce((n, h) => n + h.par, 0);
    for (const H of HOLES) H.tee = [0, H.len / 2 - 0.6];
    for (const H of HOLES) for (const f of H.feats) {
      const hw = H.w / 2;
      if (f.t === 'mill') {
        // a house across the lane with a tunnel through it; the blades sweep across the door
        const dh = f.door / 2, zb = f.zf - f.d;
        f.segs = [[-hw, f.zf, -dh, f.zf, 0.03], [dh, f.zf, hw, f.zf, 0.03], [-hw, zb, -dh, zb, 0.03], [dh, zb, hw, zb, 0.03], [-dh, f.zf, -dh, zb, 0.03], [dh, f.zf, dh, zb, 0.03]];
      } else if (f.t === 'mouth') {
        f.mouths.sort((a, b) => a.x - b.x);
        f.segs = [];
        let x0 = -hw;
        for (const m of f.mouths) { f.segs.push([x0, f.z, m.x - m.half, f.z, 0.03]); x0 = m.x + m.half; const l = Math.hypot(m.dir[0], m.dir[1]); m.dir = [m.dir[0] / l, m.dir[1] / l]; }
        f.segs.push([x0, f.z, hw, f.z, 0.03], [-hw, f.z - 0.3, hw, f.z - 0.3, 0.03]);
      }
    }
    const millBlocked = (f, now) => { const a = (now / 1000) * f.w, q = Math.PI / 2, m = ((a % q) + q) % q; return Math.min(m, q - m) < 0.26; };
    const moleUp = (f, now) => { const p = (((now / 1000 + f.ph) % f.per) + f.per) % f.per / f.per; return p > 0.04 && p < 0.42; };
    const moleLift = (f, now) => { const p = (((now / 1000 + f.ph) % f.per) + f.per) % f.per / f.per; return p < 0.46 ? Math.min(1, p / 0.06, (0.46 - p) / 0.06) : 0; };
    function height(H, lx, lz) {
      let y = FELT;
      for (const f of H.feats) {
        if (f.t === 'hill') y += f.a * Math.exp(-((lx - f.c[0]) ** 2 + (lz - f.c[1]) ** 2) / (2 * f.s * f.s));
        else if (f.t === 'jump' && lz < f.z0 && lz > f.z1) y += f.rh * (f.z0 - lz) / (f.z0 - f.z1);
      }
      return y;
    }
    function grad(H, lx, lz, out) {
      out[0] = 0; out[1] = 0;
      for (const f of H.feats) {
        if (f.t === 'jump' && lz < f.z0 && lz > f.z1) { out[1] += -f.rh / (f.z0 - f.z1); continue; }
        if (f.t !== 'hill') continue;
        const e = f.a * Math.exp(-((lx - f.c[0]) ** 2 + (lz - f.c[1]) ** 2) / (2 * f.s * f.s));
        out[0] += -e * (lx - f.c[0]) / (f.s * f.s);
        out[1] += -e * (lz - f.c[1]) / (f.s * f.s);
      }
      return out;
    }
    L.height = height;
    const felt = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#23803f'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 2500; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,50,10,0.1)'; g.fillRect(rand() * 128, rand() * 128, 1.5, 1.5); }
    });
    felt.tex.wrapS = felt.tex.wrapT = THREE.RepeatWrapping;
    const feltMat = new THREE.MeshLambertMaterial({ map: felt.tex });
    const RAIL_COLS = [0xff5c8a, 0xffd23f, 0x4fc3f7, 0xb388ff, 0xf5821f];
    const spinners = [], mills = [], ponds = [], moles = [], sharks = [], frogs = [];
    const white = lam(0xffffff), black = lam(0x1b1932);
    function buildMill(H, f) {
      const cream = lam(0xf4e2c8), red = lam(0xd84a4a), hw = H.w / 2, dh = f.door / 2, DH = 0.36, BH = 1.15;
      const zf = H.z + f.zf, zc = zf - f.d / 2, sideW = hw - dh;
      addBox(G, sideW, BH, f.d, cream, H.x - dh - sideW / 2, FELT + BH / 2, zc);
      addBox(G, sideW, BH, f.d, cream, H.x + dh + sideW / 2, FELT + BH / 2, zc);
      addBox(G, f.door, BH - DH, f.d, cream, H.x, FELT + DH + (BH - DH) / 2, zc);
      addBox(G, f.door + 0.1, 0.05, 0.03, red, H.x, FELT + DH + 0.025, zf + 0.016);
      for (const sx of [-1, 1]) addBox(G, 0.22, 0.22, 0.02, lam(0x7cc4ec), H.x + sx * (dh + sideW / 2), FELT + 0.75, zf + 0.012);
      // a pitched roof along the lane's width (behind the blades)
      const rr2 = f.d * 0.6, roof = new THREE.Mesh(new THREE.CylinderGeometry(rr2, rr2, H.w + 0.16, 3), red);
      roof.rotation.set(Math.PI / 2, 0, Math.PI / 2); roof.rotateY(Math.PI / 6);
      roof.position.set(H.x, FELT + BH + rr2 * 0.5, zc); G.add(roof);
      const blades = new THREE.Group(), R = 0.93;
      for (let k = 0; k < 4; k++) {
        const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2;
        arm.add(at(new THREE.Mesh(boxg(0.035, R, 0.035), lam(0x6a4a2a)), 0, R / 2, 0));
        arm.add(at(new THREE.Mesh(boxg(0.22, R - 0.16, 0.02), white), 0.11, (R + 0.16) / 2, 0.02));
        for (let j = 1; j < 4; j++) arm.add(at(new THREE.Mesh(boxg(0.22, 0.015, 0.025), red), 0.11, 0.16 + j * (R - 0.16) / 4, 0.03));
        blades.add(arm);
      }
      const hub = new THREE.Mesh(cyl(0.08, 0.08, 0.1, 12), red); hub.rotation.x = Math.PI / 2; blades.add(hub);
      blades.position.set(H.x, FELT + 0.95, zf + 0.09); G.add(blades);
      f.blades = blades; mills.push(f);
    }
    function buildMouth(H, f) {
      const green = lam(0x5cbf4a), throat = lam(0x14301a), red = lam(0xd84a4a), dep = 0.3, FH = 0.75, MH = 0.2;
      const zf = H.z + f.z, zc = zf - dep / 2, xs = [-H.w / 2];
      for (const m of f.mouths) xs.push(m.x - m.half, m.x + m.half);
      xs.push(H.w / 2);
      for (let i = 0; i < xs.length; i += 2) addBox(G, xs[i + 1] - xs[i], FH, dep, green, H.x + (xs[i] + xs[i + 1]) / 2, FELT + FH / 2, zc);
      for (const m of f.mouths) {
        addBox(G, 2 * m.half, FH - MH, dep, green, H.x + m.x, FELT + MH + (FH - MH) / 2, zc);
        addBox(G, 2 * m.half, MH, 0.02, throat, H.x + m.x, FELT + MH / 2, zf - dep + 0.012);
        addBox(G, 2 * m.half + 0.08, 0.05, 0.05, red, H.x + m.x, FELT + MH + 0.025, zf + 0.02);
        // where it comes out
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.085, 18), new THREE.MeshBasicMaterial({ color: 0x0c0c10 }));
        hole.rotation.x = -Math.PI / 2; hole.position.set(H.x + m.to[0], FELT + 0.003, H.z + m.to[1]); G.add(hole);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 6, 20), green); ring.rotation.x = Math.PI / 2; ring.position.copy(hole.position); G.add(ring);
      }
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), green);
      dome.scale.set(H.w / 2, 0.42, 0.45); dome.position.set(H.x, FELT + FH, zc - 0.05); G.add(dome);
      const pupils = [];
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), white); eye.position.set(H.x + sx * 0.6, FELT + FH + 0.42, zc + 0.05); G.add(eye);
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), black); p.position.set(eye.position.x, eye.position.y, eye.position.z + 0.16); G.add(p);
        pupils.push({ m: p, x0: p.position.x, y0: p.position.y });
      }
      // a big silly grin over the mouths
      const grin = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 6, 24, Math.PI), red); grin.rotation.z = Math.PI; grin.position.set(H.x, FELT + 0.62, zf + 0.01); G.add(grin);
      f.pupils = pupils; frogs.push(f);
    }
    function buildLoop(H, f) {
      const pink = lam(0xff5c8a), cx = H.x + f.x, cz = H.z + f.z, cy = FELT + BR + f.r;
      for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(f.r + 0.01, 0.016, 8, 48), pink); t.rotation.y = Math.PI / 2; t.position.set(cx + sx * 0.055, cy, cz); G.add(t); }
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        addBox(G, 0.13, 0.012, 0.012, white, cx, cy - Math.cos(a) * (f.r + 0.045), cz - Math.sin(a) * (f.r + 0.045));
      }
      makePlate(G, 'Full speed!', 0.7, 0.14, new V3(cx, cy + f.r + 0.25, cz), 0, { size: 0.55, bg: '#ff5c8a', fg: '#ffffff' });
    }
    function makeDuck(s) {
      const g = new THREE.Group(), y = lam(0xffd23f);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 12, 8), y); body.scale.set(1.3, 0.8, 1); g.add(body);
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.032 * s, 10, 8), y), -0.045 * s, 0.045 * s, 0));
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.014 * s, 0.03 * s, 8), lam(0xf5821f)); beak.rotation.z = Math.PI / 2; beak.position.set(-0.08 * s, 0.042 * s, 0); g.add(beak);
      G.add(g); return g;
    }
    function buildPond(H, f) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(f.r, 32), new THREE.MeshLambertMaterial({ color: 0x2478b8, emissive: 0x06182c }));
      w.rotation.x = -Math.PI / 2; w.position.set(H.x + f.c[0], FELT + 0.004, H.z + f.c[1]); G.add(w);
      const rim = new THREE.Mesh(new THREE.RingGeometry(f.r, f.r + 0.04, 32), lam(0xe8d8a8)); rim.rotation.x = -Math.PI / 2; rim.position.copy(w.position); rim.position.y += 0.001; G.add(rim);
      f.duckG = []; for (let k = 0; k < (f.ducks || 0); k++) f.duckG.push(makeDuck(1));
      f.wx = w.position.x; f.wz = w.position.z; ponds.push(f);
    }
    function buildMole(H, f) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(f.r + 0.03, 18), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
      hole.rotation.x = -Math.PI / 2; hole.position.set(H.x + f.c[0], FELT + 0.003, H.z + f.c[1]); G.add(hole);
      const g = new THREE.Group(), brown = lam(0x7a5236);
      const body = new THREE.Mesh(new THREE.SphereGeometry(f.r, 14, 10), brown); body.scale.set(1, 1.35, 1); g.add(body);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), black), sx * 0.04, f.r * 0.7, f.r * 0.85));
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), lam(0xff9ad0)), 0, f.r * 0.45, f.r * 0.98));
      g.position.set(H.x + f.c[0], FELT - 0.2, H.z + f.c[1]); G.add(g);
      f.g = g; moles.push(f);
    }
    function buildJump(H, f) {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(H.w, f.z1 - f.gapTo), new THREE.MeshLambertMaterial({ color: 0x1f6aa8, emissive: 0x05142a }));
      water.rotation.x = -Math.PI / 2; water.position.set(H.x, FELT + 0.004, H.z + (f.z1 + f.gapTo) / 2); G.add(water);
      // the lip, striped like a stunt ramp
      for (let k = 0; k < 6; k++) addBox(G, H.w / 6, 0.03, 0.05, lam(k % 2 ? 0xffffff : 0xd84a4a), H.x - H.w / 2 + (k + 0.5) * H.w / 6, FELT + f.rh - 0.012, H.z + f.z1 + 0.025);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 3), lam(0x4a5868)); fin.scale.z = 0.35; G.add(fin);
      // walls up the sides of the ramp
      const D = f.z0 - f.z1, sl = Math.hypot(D, f.rh), tilt = Math.atan2(f.rh, D), rcol = lam(0xd84a4a);
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(boxg(0.08, 0.12, sl), rcol);
        w.position.set(H.x + sx * (H.w / 2 + 0.04), FELT + f.rh / 2 + 0.06, H.z + (f.z0 + f.z1) / 2); w.rotation.x = tilt; G.add(w);
        addBox(G, 0.08, f.rh + 0.12, 0.08, rcol, H.x + sx * (H.w / 2 + 0.04), FELT + (f.rh + 0.12) / 2, H.z + f.z1);
      }
      makePlate(G, 'Mind the shark!', 0.9, 0.16, new V3(H.x + H.w / 2 + 0.5, 0.5, H.z + f.z0), 0, { size: 0.55, bg: '#1f6aa8', fg: '#ffffff' });
      addBox(G, 0.05, 0.42, 0.05, white, H.x + H.w / 2 + 0.5, 0.21, H.z + f.z0 - 0.02);
      f.fin = fin; f.wz = H.z + (f.z1 + f.gapTo) / 2; f.H = H; sharks.push(f);
    }
    HOLES.forEach((H, i) => {
      const geo = new THREE.PlaneGeometry(H.w, H.len, Math.ceil(H.w * 8), Math.ceil(H.len * 8));
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let k = 0; k < pos.count; k++) {
        pos.setY(k, height(H, pos.getX(k), pos.getZ(k)));
        uv.setXY(k, uv.getX(k) * H.w, uv.getY(k) * H.len);
      }
      geo.computeVertexNormals();
      const lane = new THREE.Mesh(geo, feltMat);
      lane.position.x = H.x;
      lane.position.z = H.z;
      G.add(lane);
      addBox(G, H.w + 0.24, FELT - 0.005, H.len + 0.24, lam(0x8a6a4a), H.x, (FELT - 0.005) / 2, H.z);
      const rail = lam(RAIL_COLS[i % RAIL_COLS.length]);
      const RH = 0.1, RT = 0.08;
      addBox(G, RT, RH, H.len + RT * 2, rail, H.x - H.w / 2 - RT / 2, FELT + RH / 2, H.z);
      addBox(G, RT, RH, H.len + RT * 2, rail, H.x + H.w / 2 + RT / 2, FELT + RH / 2, H.z);
      addBox(G, H.w, RH, RT, rail, H.x, FELT + RH / 2, H.z - H.len / 2 - RT / 2);
      addBox(G, H.w, RH, RT, rail, H.x, FELT + RH / 2, H.z + H.len / 2 + RT / 2);
      // cup and flag
      const cup = new THREE.Mesh(new THREE.CircleGeometry(CUP_R, 24), new THREE.MeshBasicMaterial({ color: 0x0c0c10 }));
      cup.rotation.x = -Math.PI / 2;
      cup.position.set(H.x + H.cup[0], height(H, H.cup[0], H.cup[1]) + 0.002, H.z + H.cup[1]);
      G.add(cup);
      addCyl(G, 0.008, 0.008, 1.1, 6, lam(0xf4f2ec), cup.position.x, cup.position.y + 0.55, cup.position.z);
      makePlate(G, String(i + 1), 0.24, 0.16, new V3(cup.position.x + 0.12, cup.position.y + 0.98, cup.position.z), 0, { bg: '#d84a4a', fg: '#ffffff', size: 0.8 });
      // tee mat and sign
      addBox(G, 0.3, 0.008, 0.3, lam(0x1f6b3a), H.x + H.tee[0], FELT + 0.004, H.z + H.tee[1]);
      makePlate(G, `Hole ${i + 1}: ${H.name}, par ${H.par}`, 1.5, 0.2, new V3(H.x, 0.62, H.z + H.len / 2 + 0.35), 0, { size: 0.5, bg: '#ffffff', fg: '#1b1932' });
      addBox(G, 0.06, 0.52, 0.06, lam(0xffffff), H.x, 0.26, H.z + H.len / 2 + 0.32);
      for (const f of H.feats) {
        if (f.t === 'wall') {
          const ax = H.x + f.a[0], az = H.z + f.a[1], bx = H.x + f.b[0], bz = H.z + f.b[1];
          const len = Math.hypot(bx - ax, bz - az);
          const m = addBox(G, len, RH, RT, rail, (ax + bx) / 2, FELT + RH / 2, (az + bz) / 2);
          m.rotation.y = -Math.atan2(bz - az, bx - ax);
        } else if (f.t === 'bump') {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r, 0.14, 24), new THREE.MeshLambertMaterial({ color: 0xff5c8a, emissive: 0x330010 }));
          m.position.set(H.x + f.c[0], FELT + 0.07, H.z + f.c[1]);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(f.r, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
          ring.rotation.x = Math.PI / 2; ring.position.set(H.x + f.c[0], FELT + 0.14, H.z + f.c[1]);
          G.add(m, ring);
          f.mesh = m;
          f.flash = 0;
        } else if (f.t === 'spin') {
          const g = new THREE.Group();
          for (let k = 0; k < 4; k++) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(f.arm, 0.1, 0.06), lam(0xf4f2ec));
            arm.position.x = f.arm / 2;
            const holder = new THREE.Group();
            holder.rotation.y = -k * Math.PI / 2;
            holder.add(arm);
            g.add(holder);
          }
          addCyl(G, 0.07, 0.07, 0.16, 12, lam(0xd84a4a), H.x + f.c[0], FELT + 0.08, H.z + f.c[1]);
          g.position.set(H.x + f.c[0], FELT + 0.05, H.z + f.c[1]);
          G.add(g);
          f.group = g;
          // a little windmill beside the lane, blades turning with the arms
          const tx = H.x + H.w / 2 + 0.9;
          addCyl(G, 0.45, 0.6, 2.2, 8, lam(0xf4e2c8), tx, 1.1, H.z + f.c[1]);
          const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.6, 8), lam(0xd84a4a));
          roof.position.set(tx, 2.5, H.z + f.c[1]);
          G.add(roof);
          const blades = new THREE.Group();
          for (let k = 0; k < 4; k++) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 0.03), lam(0xffffff));
            b.position.y = 0.5;
            const h2 = new THREE.Group(); h2.rotation.z = k * Math.PI / 2; h2.add(b);
            blades.add(h2);
          }
          blades.position.set(tx - 0.5, 1.9, H.z + f.c[1]);
          blades.rotation.y = Math.PI / 2;
          G.add(blades);
          f.blades = blades;
          spinners.push(f);
        } else if (f.t === 'mill') buildMill(H, f);
        else if (f.t === 'mouth') buildMouth(H, f);
        else if (f.t === 'loop') buildLoop(H, f);
        else if (f.t === 'pond') buildPond(H, f);
        else if (f.t === 'mole') buildMole(H, f);
        else if (f.t === 'jump') buildJump(H, f);
      }
    });
    // a giant rubber duck at the end of the pier, for photos
    {
      const yel = lam(0xffd23f), org = lam(0xf5821f), dx = 9.2, dz = -30.5;
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), yel); body.scale.set(1.1, 0.8, 0.85); body.position.set(dx, 0.75, dz); G.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 12), yel); tail.rotation.z = Math.PI / 2 + 0.6; tail.position.set(dx + 1.05, 1.2, dz); G.add(tail);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 12), yel); head.position.set(dx - 0.6, 1.75, dz); G.add(head);
      const beak = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8), org); beak.scale.set(1.2, 0.4, 0.8); beak.position.set(dx - 1.1, 1.65, dz); G.add(beak);
      for (const sz of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lam(0x1b1932)); e.position.set(dx - 0.95, 1.95, dz + sz * 0.25); G.add(e); }
      makePlate(G, 'Ducky says hi', 1.2, 0.2, new V3(dx, 0.4, dz + 1.2), 0, { size: 0.55, bg: '#ffffff', fg: '#1b1932' });
    }

    // boards, kiosk
    L.board = makeBoard(G, 720, 460, 3.4, 2.17, 0, 2.6, -24.4, 0);
    const boardBack = makeBoard(G, 720, 460, 3.4, 2.17, 0, 2.6, -24.5, Math.PI, false);      // (the same card, for the last row)
    makeKiosk(L, -13.4, 6.4, Math.PI / 2);
    const sign = makeBoard(G, 720, 500, 2.0, 1.39, -13.6, 1.9, 2.2, Math.PI / 2);
    function drawSign() {
      const g = sign.g;
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 720, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#d84a4a'; g.font = `800 58px ${DISPLAY}`;
      g.fillText('How to play', 36, 78);
      const sections = [
        ['In VR', 'Your putter is in your right hand; squeeze the other grip to switch hands. Swing gently: the ball goes as hard as you hit it.'],
        ['In a browser', 'Aim with the mouse. Hold Space and let go to putt; the line shows your aim and power.'],
        ['Scoring', `${HOLES.length} holes over three rows, par ${PAR_TOTAL}. Six strokes is the most you can take on a hole. Water costs a stroke.`],
      ];
      let y = 122;
      for (const [label, body] of sections) {
        g.fillStyle = '#2e8a9c'; g.font = `700 24px ${BODY}`;
        g.fillText(label, 36, y);
        y += 31;
        g.fillStyle = '#2a2a3a'; g.font = `400 24px ${BODY}`;
        y = wrapText(g, body, 36, y, 648, 30) + 10;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);

    // ---------------------------------------------------------------- putter and ball
    function makePutter() {
      const g = new THREE.Group();
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.2, 8), lam(0x1b1932));
      grip.rotation.x = Math.PI / 2; grip.position.z = -0.08;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.72, 6), lam(0xc8ccd6));
      shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.53;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.045), new THREE.MeshLambertMaterial({ color: 0x9aa0b0 }));
      head.position.z = -0.9;
      g.add(grip, shaft, head);
      g.userData.head = head;
      g.userData.shaft = shaft;
      for (const m of [grip, shaft, head]) { m.material.transparent = true; m.material.opacity = 0.3; m.material.depthWrite = false; }
      return g;
    }
    // how far the head sits from your hand: the full 0.9 m, or shorter if that would put it into the green
    const HEAD_LEN = 0.9, _pd = new V3();
    let headLen = HEAD_LEN, armed = false;
    function fitPutter(mh) {
      _pd.set(0, 0, -1).applyQuaternion(mh.quat);
      let len = HEAD_LEN;
      const hx = mh.pos.x + _pd.x * HEAD_LEN, hz = mh.pos.z + _pd.z * HEAD_LEN;
      const Hh = H0();
      const onGreen = Math.abs(hx - Hh.x) < Hh.w / 2 + 0.3 && Math.abs(hz - Hh.z) < Hh.len / 2 + 0.3;
      const floor = (onGreen ? height(Hh, clamp(hx - Hh.x, -Hh.w / 2, Hh.w / 2), clamp(hz - Hh.z, -Hh.len / 2, Hh.len / 2)) : 0) + 0.017;
      if (mh.pos.y + _pd.y * HEAD_LEN < floor && _pd.y < -0.05) len = clamp((mh.pos.y - floor) / -_pd.y, 0.2, HEAD_LEN);
      headLen = len;
      const ud = putter.userData;
      ud.head.position.z = -len;
      ud.shaft.scale.y = Math.max(0.02, (len - 0.17) / 0.72);
      ud.shaft.position.z = -(0.17 + len) / 2;
    }
    function setArmed(on) {
      if (on === armed) return;
      armed = on;
      putter.traverse((o) => { if (o.material) { o.material.opacity = on ? 1 : 0.3; o.material.depthWrite = on; } });
      if (on) haptic(vrHands[me.hand], 0.15, 15);
    }
    L.putterState = () => ({ armed, headLen });
    const HEAD_OFF = new V3(0, 0, -0.9);
    const putter = makePutter();
    putter.visible = false;
    L.overlay.add(putter);
    const ballGeo = new THREE.SphereGeometry(BR, 16, 12);
    const myBallMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const ballMesh = new THREE.Mesh(ballGeo, myBallMat);
    G.add(ballMesh);
    const ballShadow = makeShadow(G, 0.09);
    const aim = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.004, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    aim.geometry.translate(0, 0, -0.5);
    aim.visible = false;
    G.add(aim);
    L.setColor = (hex) => myBallMat.color.set(hex).lerp(new THREE.Color(0xffffff), 0.55);
    L.setColor(PLAYER_COLORS[state.colorIdx].hex);

    L.me = { hole: 0, strokes: 0, scores: HOLES.map(() => 0), done: 0, hand: 'right', phase: 'rest', t0: 0, last: -1, lastHole: -1 };
    const me = L.me;
    const B = { x: 0, z: 0, vx: 0, vz: 0, hitCool: 0, sink: 0, fromX: 0, fromZ: 0, vis: null };
    L.ball = B;
    const H0 = () => HOLES[me.hole];
    function placeOnTee() {
      const H = H0();
      B.x = H.x + H.tee[0]; B.z = H.z + H.tee[1]; B.vx = 0; B.vz = 0; B.sink = 0; B.fromX = B.x; B.fromZ = B.z; B.vis = null;
      me.phase = 'rest';
    }
    const _hd = new V3();
    function standAt(x, z, yaw) {
      camera.getWorldPosition(_hd);
      dolly.position.x += x - _hd.x;
      dolly.position.z += z - _hd.z;
      if (state.mode !== 'vr') { state.yaw = yaw; state.pitch = -0.45; }
    }
    function goToHole(i) {
      me.hole = i;
      me.strokes = 0;
      placeOnTee();
      const H = H0();
      standAt(H.x + 0.3, H.z + H.tee[1] + (state.mode === 'vr' ? 0.75 : 1.5), 0);
      state.hudDirty = true;
      forcePresence();
    }
    function restartRound() {
      me.scores = HOLES.map(() => 0);
      me.done = 0;
      me.last = -1;
      me.lastHole = -1;
      goToHole(0);
      state.dirtyBoard = true;
      sfx('reset', 0.8);
    }
    L.restartRound = restartRound;
    const word = (s, par) => (s === 1 ? 'Hole in one!' : s - par <= -2 ? 'Eagle!' : s - par === -1 ? 'Birdie!' : s === par ? 'Par' : s - par === 1 ? 'Bogey' : `+${s - par}`);
    function finishHole(score, now, picked) {
      const H = H0();
      me.scores[me.hole] = score;
      me.done += 1;
      me.last = score;
      me.lastHole = me.hole;
      me.phase = 'holed';
      me.t0 = now;
      if (!picked) {
        sfx('chime', 1);
        tone(520, 0, 0.06, 'triangle', 0.25); tone(380, 0, 0.08, 'triangle', 0.2, 0.07); tone(300, 0, 0.1, 'triangle', 0.15, 0.15);
        spawnFloat(word(score, H.par), new V3(H.x + H.cup[0], 1.3, H.z + H.cup[1]), score < H.par ? '#ffd23f' : '#ffffff');
      }
      showToast(picked ? `Picked up at ${MAXS} on hole ${me.hole + 1}` : `${word(score, H.par).replace('!', '')} on hole ${me.hole + 1}`);
      if (state.mode === 'vr' && !picked) for (const s of SIDES) haptic(vrHands[s], 0.5, 90);
      state.dirtyBoard = true;
      state.hudDirty = true;
      forcePresence();
    }

    // ball physics: rolls on the green (with hills), bounces off rails, walls, bumpers and the turnstile
    const g2 = [0, 0];
    function closestOnSeg(px, pz, ax, az, bx, bz) {
      const dx = bx - ax, dz = bz - az;
      const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
      return [ax + dx * t, az + dz * t];
    }
    let simQuiet = false;
    function bonk(sp, kind) { if (!simQuiet && sp > 0.25) sfx(kind || 'ball', Math.min(1, sp / 4) * 0.6); }
    // b and H default to your ball on your hole; the rival's ball and its practice runs pass their own
    // into the water: a penalty stroke, and back to where the putt was played from
    function splash(b, H, now, cb, wx, wz, arc) {
      if (cb && cb.water) { cb.water(now, wx, wz); return; }
      me.strokes += 1;
      if (!simQuiet) {
        const ms = arc ? arc.ms : 0;
        b.vis = { k: 'splash', t0: now, t1: now + ms + 1000, wx, wz, arc };
        sfx('whoosh', 0.3); tone(220, 70, 0.4, 'sine', 0.35, ms / 1000); sfx('poof', 0.6);
        spawnFloat('Splash!', new V3(wx, 0.6, wz), '#4fc3f7');
        showToast('Splash! One penalty stroke, back to where you hit from');
      }
      b.x = b.fromX; b.z = b.fromZ; b.vx = 0; b.vz = 0;
      state.hudDirty = true; forcePresence();
    }
    function ballStep(h, now, b = B, H = H0(), cb = null) {
      if (b.vis && now < b.vis.t1) return;      // (off doing something fun: a loop, a jump, a trip through the frog)
      let lx = b.x - H.x, lz = b.z - H.z;
      grad(H, lx, lz, g2);
      b.vx -= 9.8 * 0.714 * g2[0] * h;
      b.vz -= 9.8 * 0.714 * g2[1] * h;
      let sp = Math.hypot(b.vx, b.vz);
      if (sp > 0) { const ns = Math.max(0, sp - (0.75 + 0.09 * sp) * h); b.vx *= ns / sp; b.vz *= ns / sp; sp = ns; }
      const plx = lx, plz = lz;
      lx += b.vx * h; lz += b.vz * h;
      const hw = H.w / 2 - BR, hl = H.len / 2 - BR;
      void plx;
      if (lx < -hw) { lx = -hw; if (b.vx < 0) { bonk(-b.vx); b.vx = -b.vx * 0.72; } }
      if (lx > hw) { lx = hw; if (b.vx > 0) { bonk(b.vx); b.vx = -b.vx * 0.72; } }
      if (lz < -hl) { lz = -hl; if (b.vz < 0) { bonk(-b.vz); b.vz = -b.vz * 0.72; } }
      if (lz > hl) { lz = hl; if (b.vz > 0) { bonk(b.vz); b.vz = -b.vz * 0.72; } }
      // the things you go into, through or over
      const put = () => { b.x = H.x + lx; b.z = H.z + lz; };
      for (const f of H.feats) {
        const sp0 = Math.hypot(b.vx, b.vz);
        if (f.t === 'mouth' && plz > f.z && lz <= f.z && b.vz < 0) {
          const m = f.mouths.find((q) => Math.abs(lx - q.x) < q.half - 0.02);
          if (!m) continue;
          const ax = H.x + m.x, az = H.z + f.z;
          lx = m.to[0]; lz = m.to[1];
          const s2 = clamp(sp0 * 0.6, 0.7, 2.2); b.vx = m.dir[0] * s2; b.vz = m.dir[1] * s2;
          if (!simQuiet) { b.vis = { k: 'tube', t0: now, t1: now + 750, ax, az, bx: H.x + lx, bz: H.z + lz }; tone(320, 900, 0.18, 'sine', 0.3); tone(900, 260, 0.15, 'sine', 0.3, 0.6); }
          put(); return;
        }
        if (f.t === 'loop' && plz > f.z && lz <= f.z && b.vz < 0 && Math.abs(lx - f.x) < 0.2) {
          if (sp0 >= f.need) {
            b.vx *= 0.8; b.vz *= 0.8; lz = f.z - 0.002;
            if (!simQuiet) { b.vis = { k: 'loop', t0: now, t1: now + clamp((2 * Math.PI * f.r) / (sp0 * 0.85) * 1000, 350, 1300), x: H.x + lx, z: H.z + f.z, r: f.r }; sfx('whoosh', 0.5); tone(500, 1100, 0.5, 'triangle', 0.12); }
          } else {
            // not enough to make it round: up the loop a way, and back down to you
            b.vz = -b.vz * 0.5; b.vx *= 0.5; lz = f.z + 0.002;
            if (!simQuiet) tone(500, 250, 0.3, 'triangle', 0.15);
          }
          put(); return;
        }
        if (f.t === 'jump') {
          if (plz > f.z1 && lz <= f.z1 && b.vz < 0) {
            // off the lip: a real arc from the ramp's angle and height
            const ang = Math.atan2(f.rh, f.z0 - f.z1), vh = sp0 * Math.cos(ang), vy = sp0 * Math.sin(ang);
            const tf = (vy + Math.sqrt(vy * vy + 2 * 9.8 * f.rh)) / 9.8, carry = vh * tf;
            const ux = b.vx / sp0, uz = b.vz / sp0, tx = clamp(lx + ux * carry, -hw, hw);
            let tz = lz + uz * carry;
            const arc = { ax: H.x + lx, az: H.z + lz, ay: FELT + f.rh, peak: (vy * vy) / (2 * 9.8) + 0.04, ms: tf * 1150 };
            if (!simQuiet) sfx('whoosh', 0.5);
            if (tz > f.gapTo) { splash(b, H, now, cb, H.x + tx, H.z + tz, arc); return; }
            tz = Math.max(tz, -hl);
            b.vx = ux * vh * 0.55; b.vz = uz * vh * 0.55; lx = tx; lz = tz;
            if (!simQuiet) { b.vis = { k: 'jump', t0: now, t1: now + arc.ms, ...arc, bx: H.x + lx, bz: H.z + lz }; tone(160, 90, 0.12, 'sine', 0.4, arc.ms / 1000); }
            put(); return;
          }
          if (lz < f.z1 && lz > f.gapTo) { splash(b, H, now, cb, H.x + lx, H.z + lz, null); return; }
        }
        if (f.t === 'pond' && Math.hypot(lx - f.c[0], lz - f.c[1]) < f.r - 0.01) { splash(b, H, now, cb, H.x + lx, H.z + lz, null); return; }
      }
      for (const f of H.feats) {
        if (f.t === 'wall' || f.t === 'spin' || f.t === 'mill' || f.t === 'mouth') {
          const segs = f.segs ? f.segs.slice() : [];
          if (f.t === 'mill' && millBlocked(f, now)) segs.push([-f.door / 2, f.zf + 0.07, f.door / 2, f.zf + 0.07, 0.03]);
          if (f.t === 'wall') segs.push([f.a[0], f.a[1], f.b[0], f.b[1], 0.04]);
          else if (f.t === 'spin') for (let k = 0; k < 4; k++) { const a = f.theta + k * Math.PI / 2; segs.push([f.c[0], f.c[1], f.c[0] + Math.cos(a) * f.arm, f.c[1] + Math.sin(a) * f.arm, 0.035]); }
          for (const [ax, az, bx, bz, th] of segs) {
            const [cx, cz] = closestOnSeg(lx, lz, ax, az, bx, bz);
            const dx = lx - cx, dz = lz - cz, d = Math.hypot(dx, dz), min = BR + th;
            if (d >= min || d < 1e-6) continue;
            const nx = dx / d, nz = dz / d;
            lx = cx + nx * min; lz = cz + nz * min;
            let wvx = 0, wvz = 0;
            if (f.t === 'spin') { wvx = -f.w * (cz - f.c[1]); wvz = f.w * (cx - f.c[0]); }
            const vn = (b.vx - wvx) * nx + (b.vz - wvz) * nz;
            if (vn < 0) { bonk(-vn); b.vx -= 1.65 * vn * nx; b.vz -= 1.65 * vn * nz; }
          }
        } else if (f.t === 'bump') {
          const dx = lx - f.c[0], dz = lz - f.c[1], d = Math.hypot(dx, dz), min = BR + f.r;
          if (d < min && d > 1e-6) {
            const nx = dx / d, nz = dz / d;
            lx = f.c[0] + nx * min; lz = f.c[1] + nz * min;
            const vn = b.vx * nx + b.vz * nz;
            if (vn < 0) {
              b.vx -= 2.15 * vn * nx; b.vz -= 2.15 * vn * nz;
              const out = b.vx * nx + b.vz * nz, want = Math.max(1.5, -vn * 1.25);
              if (out < want) { b.vx += nx * (want - out); b.vz += nz * (want - out); }
              if (!simQuiet) { tone(1250, 0, 0.12, 'sine', 0.18); f.flash = 0.2; }
            }
          }
        } else if (f.t === 'mole' && moleUp(f, now)) {
          // a mole that's up is in the way (boing)
          const dx = lx - f.c[0], dz = lz - f.c[1], d = Math.hypot(dx, dz), min = BR + f.r;
          if (d < min && d > 1e-6) {
            const nx = dx / d, nz = dz / d;
            lx = f.c[0] + nx * min; lz = f.c[1] + nz * min;
            const vn = b.vx * nx + b.vz * nz;
            if (vn < 0) { b.vx -= 1.75 * vn * nx; b.vz -= 1.75 * vn * nz; if (!simQuiet) { tone(300, 700, 0.15, 'sine', 0.25); f.bonk = now; } }
          }
        }
      }
      b.x = H.x + lx; b.z = H.z + lz;
      sp = Math.hypot(b.vx, b.vz);
      const cx = lx - H.cup[0], cz = lz - H.cup[1], dc = Math.hypot(cx, cz);
      if (dc < CUP_R) {
        if (sp < 1.3) { if (cb) { cb.sink(now); return; } finishHole(me.strokes, now, false); return; }
        if (dc < CUP_R * 0.6 && !b.lipped) {
          b.lipped = true;
          const a = (rand() - 0.5) * 0.6, c = Math.cos(a), s = Math.sin(a);
          const vx = b.vx * c - b.vz * s, vz = b.vx * s + b.vz * c;
          b.vx = vx * 0.7; b.vz = vz * 0.7;
          if (!simQuiet) tone(700, 500, 0.06, 'triangle', 0.15);
        }
      } else b.lipped = false;
      grad(H, lx, lz, g2);
      // the felt holds a slow ball still unless the slope pulls harder than rolling friction
      if (sp < 0.04 && 9.8 * 0.714 * Math.hypot(g2[0], g2[1]) < 0.55) {
        b.vx = 0; b.vz = 0;
        if (cb) { cb.rest(now); return; }
        me.phase = 'rest';
        if (me.strokes >= MAXS) finishHole(MAXS, now, true);
        state.hudDirty = true;
        forcePresence();
      }
    }

    function ballPos(b, H, now, out) {
      const v = b.vis;
      if (v && now < v.t1) {
        const u = clamp((now - v.t0) / (v.t1 - v.t0), 0, 1);
        if (v.k === 'loop') { const th = u * Math.PI * 2; return out.set(v.x, FELT + BR + v.r * (1 - Math.cos(th)), v.z - v.r * Math.sin(th)); }
        if (v.k === 'jump') return out.set(v.ax + (v.bx - v.ax) * u, v.ay + (FELT - v.ay) * u + 4 * v.peak * u * (1 - u) + BR, v.az + (v.bz - v.az) * u);
        if (v.k === 'tube') {
          if (u < 0.18) return out.set(v.ax, FELT + BR, v.az - (u / 0.18) * 0.25);
          if (u < 0.8) return null;
          return out.set(v.bx, FELT + BR - (1 - (u - 0.8) / 0.2) * 0.07, v.bz);
        }
        if (v.k === 'splash') {
          const tA = v.arc ? v.arc.ms / (v.t1 - v.t0) : 0;
          if (v.arc && u < tA) { const w = u / tA; return out.set(v.arc.ax + (v.wx - v.arc.ax) * w, v.arc.ay + (FELT - v.arc.ay) * w + 4 * v.arc.peak * w * (1 - w) + BR, v.arc.az + (v.wz - v.arc.az) * w); }
          const w = (u - tA) / Math.max(0.01, 1 - tA);
          return w < 0.45 ? out.set(v.wx, FELT + BR - w * 0.25, v.wz) : null;
        }
      }
      return out.set(b.x, height(H, b.x - H.x, b.z - H.z) + BR, b.z);
    }
    const _bp = new V3(), _bp2 = new V3();
    // hits: in VR the putter head pushes the ball; in a browser, Space putts toward where you look
    const headPrev = new V3(), headNow = new V3(), _hp = new V3();
    let headInit = false;
    function strike(nx, nz, speed, now) {
      // every hit is a stroke, even on a ball that's still rolling
      if (me.phase === 'moving') showToast('Hitting a rolling ball still counts as a stroke');
      me.strokes += 1;
      B.fromX = B.x; B.fromZ = B.z; B.vis = null;
      const s = Math.min(7, speed);
      B.vx = nx * s; B.vz = nz * s;
      me.phase = 'moving';
      B.hitCool = now + 350;
      tone(950, 650, 0.05, 'triangle', 0.3 * Math.min(1, s / 3 + 0.3));
      state.hudDirty = true;
      forcePresence();
    }
    L.strike = strike;
    function vrPutter(dt, now) {
      const mh = myHands[me.hand];
      putter.visible = mh.ok;
      if (!mh.ok) { headInit = false; return; }
      putter.position.copy(mh.pos);
      putter.quaternion.copy(mh.quat);
      fitPutter(mh);
      // you only swing for real while holding the trigger; otherwise the putter is see-through and passes through the ball
      const gp = vrHands[me.hand].source && vrHands[me.hand].source.gamepad;
      setArmed(!!(gp && gp.buttons && gp.buttons[0] && gp.buttons[0].pressed));
      headNow.set(0, 0, -headLen).applyQuaternion(mh.quat).add(mh.pos);
      if (!headInit) { headPrev.copy(headNow); headInit = true; }
      if (armed && (me.phase === 'rest' || (me.phase === 'moving' && now > B.hitCool)) && dt > 0) {
        const H = H0();
        const by = height(H, B.x - H.x, B.z - H.z) + BR;
        const hvx = (headNow.x - headPrev.x) / dt, hvz = (headNow.z - headPrev.z) / dt;
        for (let k = 1; k <= 4; k++) {
          _hp.lerpVectors(headPrev, headNow, k / 4);
          if (_hp.y > by + 0.25 || _hp.y < by - 0.25) continue;
          const dx = B.x - _hp.x, dz = B.z - _hp.z, d = Math.hypot(dx, dz);
          if (d > BR + 0.065 || d < 1e-5) continue;
          const nx = dx / d, nz = dz / d, vn = hvx * nx + hvz * nz;
          if (vn < 0.15) continue;
          strike(nx, nz, vn * 1.15, now);
          haptic(vrHands[me.hand], 0.4, 25);
          break;
        }
      }
      headPrev.copy(headNow);
    }
    const _cq = new Q4(), _dir = new V3(), _tgt = new V3(), _hand = new V3();
    let followT = 0;
    function deskDir() {
      camera.getWorldQuaternion(_cq);
      _dir.set(0, 0, -1).applyQuaternion(_cq);
      _dir.y = 0;
      if (_dir.lengthSq() < 1e-4) _dir.set(0, 0, -1);
      return _dir.normalize();
    }
    function nearBall() { return Math.hypot(myHead.pos.x - B.x, myHead.pos.z - B.z) < 2.2; }
    L.onChargeStart = () => {
      if (me.phase !== 'rest') return;
      if (!nearBall()) { const d = deskDir(); standAt(B.x - d.x * 1.4, B.z - d.z * 1.4, state.yaw); }
    };
    L.kick = (c) => {
      const now = performance.now();
      if (me.phase !== 'rest') { if (me.phase === 'moving') showToast('Wait for your ball to stop'); return; }
      if (!nearBall()) { const d = deskDir(); standAt(B.x - d.x * 1.4, B.z - d.z * 1.4, state.yaw); return; }
      const d = deskDir();
      strike(d.x, d.z, 0.35 + c * 5.0, now);
      followT = now;
    };
    L.throwLabel = () => 'Putt';
    L.onVRGrab = (h) => { if (h.side !== me.hand) { me.hand = h.side; headInit = false; sfx('grab', 0.5); } return false; };
    function deskPutter(now) {
      const H = H0();
      const show = state.mode === 'flat' && (me.phase === 'rest' || now - followT < 400) && nearBall();
      putter.visible = state.mode === 'flat';
      const d = deskDir();
      const c = state.charge !== null ? Math.min(1, (now - state.charge) / 1000) : 0;
      const by = height(H, B.x - H.x, B.z - H.z);
      if (show) {
        const follow = now - followT < 400 ? Math.sin(Math.min(1, (now - followT) / 200) * Math.PI / 2) * 0.25 : 0;
        const back = 0.07 + c * 0.35 - follow;
        _tgt.set(B.x - d.x * back, by + 0.03, B.z - d.z * back);
      } else {
        _tgt.copy(myHands.right.pos).setY(Math.max(0.1, myHands.right.pos.y - 0.85));
      }
      _hand.copy(myHands.right.pos);
      const sd = new V3().subVectors(_tgt, _hand).normalize();
      putter.position.copy(_tgt).addScaledVector(sd, -0.9);
      putter.quaternion.setFromUnitVectors(FWD, sd);
      aim.visible = show && me.phase === 'rest';
      if (aim.visible) {
        aim.position.set(B.x, by + 0.01, B.z);
        aim.rotation.set(0, Math.atan2(-d.x, -d.z), 0);
        aim.scale.z = 0.5 + c * 2.6;
      }
    }

    // ---------------------------------------------------------------- network, other players
    L.presence = () => ({
      mq: [me.hole, me.strokes, me.done, me.hand === 'left' ? 0 : 1, ...me.scores],
      mb: [r3(B.x), r3(B.z), me.phase === 'moving' ? 1 : me.phase === 'holed' || me.phase === 'between' ? 2 : 0],
    });
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    L.readPresence = (rec, pres, st) => {
      const a = Array.isArray(pres.mq) ? pres.mq : [];
      const hole = int(a[0], 0, HOLES.length - 1) ? a[0] : 0, strokes = int(a[1], 0, 99) ? a[1] : 0, done = int(a[2], 0, 99) ? a[2] : 0;
      const scores = HOLES.map((_, i) => (int(a[4 + i], 0, 99) ? a[4 + i] : 0));
      if (st.init && done > st.done) {
        const hi = scores.findIndex((s, i) => s && !st.scores[i]);
        if (hi >= 0) showToast(`${rec.name}: ${word(scores[hi], HOLES[hi].par).replace('!', '')} on hole ${hi + 1}`);
      }
      if (done !== st.done || scores.join() !== (st.scores || []).join()) state.dirtyBoard = true;
      Object.assign(st, { hole, strokes, done, hand: a[3] === 0 ? 'left' : 'right', scores, init: true });
      const b = pres.mb;
      if (Array.isArray(b) && b.length === 3 && finite(b[0]) && finite(b[1])) { st.bx = clamp(b[0], -20, 20); st.bz = clamp(b[1], -20, 20); st.bphase = b[2]; st.ballOk = true; }
    };
    function remoteVisuals(dt) {
      const k = 1 - Math.exp(-dt * 12);
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        const show = inMyLevel(rec) && st && st.ballOk;
        if (!show) { if (rec.mgBall) rec.mgBall.visible = false; if (rec.putter) rec.putter.visible = false; continue; }
        if (!rec.mgBall) {
          rec.mgBall = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }));
          rec.mgBall.userData.p = new V3(st.bx, 0, st.bz);
          G.add(rec.mgBall);
          rec.putter = makePutter();
          L.overlay.add(rec.putter);
        }
        if (PLAYER_COLORS[rec.colorIdx]) rec.mgBall.material.color.set(PLAYER_COLORS[rec.colorIdx].hex).lerp(new THREE.Color(0xffffff), 0.55);
        const p = rec.mgBall.userData.p;
        if (Math.hypot(p.x - st.bx, p.z - st.bz) > 3) p.set(st.bx, 0, st.bz); else { p.x += (st.bx - p.x) * k; p.z += (st.bz - p.z) * k; }
        const H = HOLES[st.hole];
        rec.mgBall.visible = st.bphase !== 2;
        rec.mgBall.position.set(p.x, height(H, p.x - H.x, p.z - H.z) + BR, p.z);
        const hp = remoteHandPose(rec.peer, st.hand);
        rec.putter.visible = !!hp;
        if (hp) { rec.putter.position.copy(hp.pos); rec.putter.quaternion.copy(hp.quat); }
      }
    }

    // ---------------------------------------------------------------- per frame
    const wrist = makeWristPanel();
    let statusKey = '';
    const total = (scores) => scores.reduce((n, s) => n + s, 0);
    const parThrough = (scores) => scores.reduce((n, s, i) => n + (s ? HOLES[i].par : 0), 0);
    L.update = (dt, now) => {
      for (const f of spinners) {
        f.theta = (now / 1000) * f.w;
        f.group.rotation.y = -f.theta;
        f.blades.rotation.z = f.theta * 1.5;
      }
      for (const f of mills) f.blades.rotation.z = (now / 1000) * f.w;
      for (const f of moles) { const up = moleLift(f, now); f.g.position.y = FELT - 0.17 + up * 0.2 + (f.bonk && now - f.bonk < 250 ? Math.sin((now - f.bonk) / 250 * Math.PI) * 0.04 : 0); }
      for (const f of ponds) f.duckG.forEach((d, k) => { const a = now * 0.00035 * (k % 2 ? -1 : 1) + k * Math.PI; d.position.set(f.wx + Math.cos(a) * f.r * 0.55, FELT + 0.03 + Math.sin(now * 0.003 + k) * 0.006, f.wz + Math.sin(a) * f.r * 0.55); d.rotation.y = -a + (k % 2 ? Math.PI : 0); });
      for (const f of sharks) { const a = now * 0.0011, span = f.H.w / 2 - 0.2; f.fin.position.set(f.H.x + Math.sin(a) * span, FELT + 0.13, f.wz + Math.sin(a * 2.3) * 0.15); f.fin.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI; }
      for (const f of frogs) for (const p of f.pupils) { p.m.position.x = p.x0 + Math.sin(now * 0.004) * 0.05; p.m.position.y = p.y0 + Math.cos(now * 0.0031) * 0.03; }
      for (const H of HOLES) for (const f of H.feats) if (f.t === 'bump') { f.flash = Math.max(0, f.flash - dt); f.mesh.material.emissive.setHex(f.flash > 0 ? 0xff8ab0 : 0x330010); }
      if (me.phase === 'moving') {
        const steps = 4, h = dt / steps;
        for (let k = 0; k < steps && me.phase === 'moving'; k++) ballStep(h, now);
      } else if (me.phase === 'holed' && now - me.t0 > 2400) {
        if (me.hole + 1 < HOLES.length) goToHole(me.hole + 1);
        else {
          const t = total(me.scores);
          showToast(`Round complete: ${t} (${toPar(t - PAR_TOTAL)})`);
          sfx('fanfare', 0.8);
          me.phase = 'between';
          me.t0 = now;
        }
      } else if (me.phase === 'between' && now - me.t0 > 5500) restartRound();
      if (state.mode === 'vr') vrPutter(dt, now);
      else if (state.mode === 'flat') deskPutter(now);
      else { putter.visible = false; aim.visible = false; }
      if (state.mode !== 'flat') aim.visible = false;
      // my ball
      const H = H0();
      if (me.phase === 'holed' || me.phase === 'between') B.sink = Math.min(1, B.sink + dt * 4);
      const bp = ballPos(B, H, now, _bp);
      if (bp) { ballMesh.position.copy(bp); ballMesh.position.y -= B.sink * 0.09; ballShadow.position.set(bp.x, height(H, bp.x - H.x, bp.z - H.z) + 0.003, bp.z); }
      ballMesh.visible = !!bp && B.sink < 1;
      ballShadow.visible = !!bp && B.sink < 0.5;
      remoteVisuals(dt);
      // readouts
      const t = total(me.scores), rel = t - parThrough(me.scores);
      const top = me.phase === 'between' ? 'Round complete' : `Hole ${me.hole + 1}, stroke ${Math.min(MAXS, me.strokes + (me.phase === 'rest' ? 1 : 0))}`;
      const sub = me.done ? `${toPar(rel)} after ${me.done}` : `${H.name}, par ${H.par}`;
      wrist.update(top, '#ffd23f', sub);
      if (ui.status) {
        const show = state.mode === 'flat';
        ui.status.hidden = !show;
        const key = top + sub;
        if (show && key !== statusKey) {
          statusKey = key;
          const a = document.createElement('span'); a.textContent = top;
          const b = document.createElement('span'); b.className = 'obj'; b.textContent = sub;
          ui.status.replaceChildren(a, b);
        }
      }
    };
    L.onExit = () => {
      putter.visible = false; aim.visible = false; wrist.show(false);
      for (const rec of remotes.values()) { if (rec.mgBall) rec.mgBall.visible = false; if (rec.putter) rec.putter.visible = false; }
      if (ui.status) ui.status.hidden = true;
      statusKey = '';
    };
    L.spawn = () => {
      dolly.position.set(0, 0, 0);
      camera.position.set(0, 1.6, 0);
      if (me.phase === 'moving') placeOnTee();
      const H = H0();
      standAt(H.x + 0.3, H.z + H.tee[1] + (state.mode === 'vr' ? 0.75 : 1.5), 0);
    };

    // scorecard
    L.rowFor = (st, isMe) => {
      const scores = isMe ? me.scores : (st.scores || HOLES.map(() => 0));
      const t = total(scores), rel = t - parThrough(scores), done = scores.filter((s) => s).length;
      return { scores, rel, done, text: done ? `${t} (${toPar(rel)})` : 'Hole 1' };
    };
    L.sortRows = (a, b) => (b.done - a.done) || (a.rel - b.rel);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#fdf7ec'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#2ec4b6'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.fillStyle = '#d84a4a'; g.font = `800 58px ${DISPLAY}`; g.fillText('Seaside Mini Golf', 32, 70);
      const gap = Math.min(66, 360 / Math.max(1, HOLES.length - 1)), cols = HOLES.map((_, i) => 252 + i * gap), totX = W - 46;
      g.font = `700 22px ${BODY}`; g.fillStyle = '#5a5a6a'; g.textAlign = 'center';
      const hf = HOLES.length > 10 ? 17 : 22;
      g.font = `700 ${hf}px ${BODY}`;
      HOLES.forEach((h, i) => { g.fillText(String(i + 1), cols[i], 112); g.font = `400 ${hf - 4}px ${BODY}`; g.fillText(`p${h.par}`, cols[i], 134); g.font = `700 ${hf}px ${BODY}`; });
      g.fillText('Total', totX, 112);
      rows.slice(0, 6).forEach((p, r) => {
        const y = 186 + r * 44;
        g.textAlign = 'left';
        g.fillStyle = p.color; rr(g, 32, y - 24, 12, 30, 4); g.fill();
        g.fillStyle = '#1b1932'; g.font = `${p.me ? 700 : 400} 26px ${BODY}`;
        g.fillText(p.me ? `${p.name} (you)` : p.name, 54, y, 170);
        g.textAlign = 'center'; g.font = `800 ${HOLES.length > 10 ? 19 : HOLES.length > 6 ? 24 : 30}px ${DISPLAY}`;
        p.scores.forEach((s, i) => {
          if (!s) return;
          const d = s - HOLES[i].par;
          g.fillStyle = d < 0 ? '#2e8a4c' : d > 0 ? '#c23b4a' : '#1b1932';
          g.fillText(String(s), cols[i], y);
        });
        g.fillStyle = '#1b1932'; g.fillText(p.done ? toPar(p.rel) : '', totX, y);
      });
      if (rows.length === 1) { g.textAlign = 'left'; g.fillStyle = '#8a8a9a'; g.font = `400 22px ${BODY}`; g.fillText('Friends who open this page will show up here', 32, 270); }
      L.board.tex.needsUpdate = true;
      boardBack.g.drawImage(g.canvas, 0, 0); boardBack.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => 'Restart round', run: () => restartRound() }];
    L.hints = [['Space', 'hold, then let go to putt'], ['Drag', 'aim'], ['WASD', 'move']];
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.00008) * 0.5;
      camera.position.set(Math.sin(a) * 6, 5.5, 11);
      camera.lookAt(0, 0, -1);
    };
    placeOnTee();

    // ================================================================ BIRDIE BEA: a mini golf rival
    // She plays the hole you're on with her own ball and the same physics as yours. Before each putt she
    // test-rolls about a hundred shots in silence and picks the one that finishes nearest the cup, then
    // adds a little human error. The host runs her; everyone sees her.
    const BEA = { name: 'Birdie Bea', color: '#ffb36b', on: prefs.golfBot !== false, active: false, hole: -1, phase: 'wait', strokes: 0, scores: HOLES.map(() => 0), t0: 0, aim: [0, -1], swingT: 0, req: null, reqSeq: 0 };
    const beaBall = { x: 0, z: 0, vx: 0, vz: 0, lipped: false, sink: 0, fromX: 0, fromZ: 0, vis: null };
    BEA.ball = beaBall;
    L.bea = BEA;
    const beaMesh = new THREE.Mesh(new THREE.SphereGeometry(BR, 16, 12), new THREE.MeshLambertMaterial({ color: 0xffb36b }));
    G.add(beaMesh);
    const bea = buildAvatar(BEA.color, 3, 1, true, 4, 6);
    const beaLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Birdie Bea', 128, 33); }).tex, transparent: true, depthWrite: false }));
    beaLabel.scale.set(0.9, 0.225, 1); beaLabel.position.y = 0.42;
    bea.add(beaLabel);
    const beaPutter = new THREE.Group();
    beaPutter.add(at(new THREE.Mesh(cyl(0.012, 0.012, 0.85, 6), lam(0xc8ccd8)), 0, -0.42, 0));
    beaPutter.add(at(new THREE.Mesh(boxg(0.1, 0.04, 0.035), lam(0x2b2d42)), 0.03, -0.85, 0));
    beaPutter.position.set(0.18, -0.3, -0.15);
    bea.add(beaPutter);
    bea.visible = false; beaMesh.visible = false;
    G.add(bea);
    const herePeersMG = () => {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    };
    const beaHost = () => herePeersMG()[0] === state.myPeer;

    // ---------------------------------------------------------------- planning a putt
    // is there a wall between this spot and the cup? (a clear look at the cup is worth a lot)
    function segHit(ax, az, bx, bz, cx, cz, dx, dz) {
      const d1 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax), d2 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
      const d3 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx), d4 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
      return d1 * d2 < 0 && d3 * d4 < 0;
    }
    function wallBetween(H, x, z) {
      const px = x - H.x, pz = z - H.z, cx = H.cup[0], cz = H.cup[1];
      return H.feats.some((f) => f.t === 'wall' && segHit(px, pz, cx, cz, f.a[0], f.a[1], f.b[0], f.b[1]));
    }
    // one practice roll at a time, so the work can be spread over several frames
    function* planGen(H, now) {
      const cx = H.x + H.cup[0], cz = H.z + H.cup[1];
      const base = Math.atan2(cz - beaBall.z, cx - beaBall.x);
      const sx = beaBall.x, sz = beaBall.z;
      let best = { score: Infinity, a: base, sp: 1.5 };
      for (let da = -84; da <= 84; da += 6) {
        for (const sp of [0.9, 1.5, 2.2, 3.0, 4.0, 5.3, 6.4]) {
          const a = base + (da * Math.PI) / 180;
          const t = { x: sx, z: sz, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, lipped: false, sink: 0 };
          let sunk = false, rest = false, wet = false;
          const cb = { sink: () => { sunk = true; }, rest: () => { rest = true; }, water: () => { wet = true; } };
          simQuiet = true;
          try { for (let k = 0; k < 900 && !sunk && !rest && !wet; k++) ballStep(1 / 120, now, t, H, cb); } finally { simQuiet = false; }
          // holing it is best; otherwise how close it stops (a gentler putt breaks ties); never the water
          const score = wet ? 20 + sp * 0.01 : sunk ? -10 + sp * 0.01 + Math.abs(da) * 0.001 : Math.hypot(t.x - cx, t.z - cz) + sp * 0.005 + (wallBetween(H, t.x, t.z) ? 1.5 : 0);
          if (score < best.score) best = { score, a, sp };
          yield null;
        }
      }
      return best;
    }
    function planPutt(H, now) { const g = planGen(H, now); let r; do { r = g.next(); } while (!r.done); return r.value; }
    const gauss = () => (rand() + rand() + rand() - 1.5) / 0.5;

    // ---------------------------------------------------------------- her round (host)
    function beaToHole(i, now) {
      // leaving a hole she hadn't finished: she picks up for one more stroke
      if (BEA.hole >= 0 && BEA.phase !== 'holed' && BEA.hole < HOLES.length && !BEA.scores[BEA.hole]) BEA.scores[BEA.hole] = Math.min(MAXS, BEA.strokes + 1);
      BEA.hole = i;
      const H = HOLES[i];
      Object.assign(beaBall, { x: H.x + H.tee[0] + 0.18, z: H.z + H.tee[1], vx: 0, vz: 0, lipped: false, sink: 0, vis: null });
      beaBall.fromX = beaBall.x; beaBall.fromZ = beaBall.z;
      BEA.strokes = 0; BEA.phase = 'wait'; BEA.t0 = now;
      forcePresence();
    }
    function beaStep(dt, now) {
      if (!BEA.active) return;
      // a fresh round for you (your card going back to empty) is a fresh round for her
      const myDone = me.scores.filter((x) => x).length;
      if (myDone < (BEA.lastMyDone || 0)) { BEA.scores = HOLES.map(() => 0); BEA.hole = -1; }
      BEA.lastMyDone = myDone;
      if (me.hole !== BEA.hole && me.phase !== 'between') beaToHole(me.hole, now);
      const H = HOLES[BEA.hole];
      if (!H) return;
      if (BEA.phase === 'wait') {
        // let you go first, then line up
        if ((me.strokes > 0 || now - BEA.t0 > 3000) && now - BEA.t0 > 1400) { BEA.phase = 'aim'; BEA.t0 = now; BEA.plan = null; BEA.gen = planGen(H, now); }
      } else if (BEA.phase === 'aim') {
        // think it over a little each frame (about 3 ms), so the host's frame rate never stutters
        if (BEA.gen) {
          const t0 = performance.now();
          while (BEA.gen && performance.now() - t0 < 3) { const r = BEA.gen.next(); if (r.done) { BEA.plan = r.value; BEA.gen = null; BEA.aim = [Math.cos(r.value.a), Math.sin(r.value.a)]; } }
        }
        if (BEA.plan && now - BEA.t0 > 1100) {
          const p = BEA.plan;
          const a = p.a + (gauss() * 2.2 * Math.PI) / 180, sp = p.sp * (1 + gauss() * 0.07);
          beaBall.fromX = beaBall.x; beaBall.fromZ = beaBall.z;
          beaBall.vx = Math.cos(a) * sp; beaBall.vz = Math.sin(a) * sp;
          BEA.strokes += 1; BEA.phase = 'moving'; BEA.swingT = now;
          tone(950, 650, 0.05, 'triangle', 0.25 / (1 + Math.hypot(beaBall.x - myHead.pos.x, beaBall.z - myHead.pos.z) * 0.3));
          forcePresence();
        }
      } else if (BEA.phase === 'moving') {
        const steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;
        const cb = {
          sink: () => { BEA.phase = 'holed'; BEA.scores[BEA.hole] = BEA.strokes; spawnFloat(`Bea: ${word(BEA.strokes, H.par)}`, new V3(H.x + H.cup[0], 1.3, H.z + H.cup[1]), '#ffb36b'); sfx('chime', 0.5); state.dirtyBoard = true; forcePresence(); },
          water: (t, wx, wz) => {
            BEA.strokes += 1;
            spawnFloat('Bea: splash!', new V3(wx, 0.6, wz), '#ffb36b'); sfx('poof', 0.4);
            Object.assign(beaBall, { x: beaBall.fromX, z: beaBall.fromZ, vx: 0, vz: 0 });
            if (BEA.strokes >= MAXS) { BEA.phase = 'holed'; BEA.scores[BEA.hole] = MAXS; state.dirtyBoard = true; } else { BEA.phase = 'wait'; BEA.t0 = now; }
            forcePresence();
          },
          rest: () => { if (BEA.strokes >= MAXS) { BEA.phase = 'holed'; BEA.scores[BEA.hole] = MAXS; state.dirtyBoard = true; } else { BEA.phase = 'wait'; BEA.t0 = now; } forcePresence(); },
        };
        for (let k = 0; k < steps && BEA.phase === 'moving'; k++) ballStep(h, now, beaBall, H, cb);
      }
    }

    // ---------------------------------------------------------------- per frame, network, scoreboard
    const baseUpdateMG = L.update, basePresenceMG = L.presence, baseReadMG = L.readPresence, baseDrawMG = L.drawBoard;
    L.update = (dt, now) => {
      BEA.active = BEA.on && herePeersMG().length < 3;
      if (beaHost()) beaStep(dt, now);
      baseUpdateMG(dt, now);
      const H = HOLES[BEA.hole];
      const show = BEA.active && !!H && state.level === L.idx;
      bea.visible = show;
      beaMesh.visible = show && BEA.phase !== 'holed';
      if (!show) return;
      const bbp = ballPos(beaBall, H, now, _bp2);
      if (bbp) beaMesh.position.copy(bbp); else beaMesh.visible = false;
      // she stands behind her ball, facing her line
      const ax = BEA.aim[0], az = BEA.aim[1];
      const standX = beaBall.x - ax * 0.45 - az * 0.25, standZ = beaBall.z - az * 0.45 + ax * 0.25;
      if (BEA.phase === 'aim' || BEA.phase === 'wait') { bea.position.set(standX, 1.45, standZ); bea.rotation.y = Math.atan2(-ax, -az); }
      if (BEA.phase === 'holed') bea.position.y = 1.45 + Math.abs(Math.sin(now * 0.008)) * 0.08;
      const u = (now - BEA.swingT) / 300;
      beaPutter.rotation.x = u < 1 ? Math.sin(u * Math.PI) * -0.7 : 0;
    };
    const q2 = (x) => Math.round(x * 100) / 100;
    const PHC = { wait: 0, aim: 1, moving: 2, holed: 3 }, PHN = ['wait', 'aim', 'moving', 'holed'];
    L.presence = () => {
      const p = basePresenceMG();
      if (beaHost()) p.mgb = [BEA.on ? 1 : 0, BEA.hole, q2(beaBall.x), q2(beaBall.z), PHC[BEA.phase], BEA.strokes, q2(BEA.aim[0]), q2(BEA.aim[1]), ...BEA.scores];
      if (BEA.req) p.mgr = BEA.req.slice();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      baseReadMG(rec, pres, st);
      if (beaHost() && Array.isArray(pres.mgr) && pres.mgr.length === 2 && (pres.mgr[0] === 0 || pres.mgr[0] === 1) && pres.mgr.join() !== st.mgr) {
        st.mgr = pres.mgr.join();
        if (st.mgrInit && BEA.on !== !!pres.mgr[0]) { BEA.on = !!pres.mgr[0]; state.hudDirty = true; state.dirtyBoard = true; forcePresence(); }
      }
      st.mgrInit = true;
      if (rec.peer !== herePeersMG()[0]) return;
      const a = pres.mgb;
      if (!Array.isArray(a) || a.length !== 8 + HOLES.length || !a.every(finite)) return;
      if ((a[0] === 1) !== BEA.on) { BEA.on = a[0] === 1; state.hudDirty = true; }
      const scores = a.slice(8).map((x) => clamp(Math.round(x), 0, MAXS));
      if (scores.join() !== BEA.scores.join()) state.dirtyBoard = true;
      if (a[4] === 1 && BEA.phase !== 'aim') BEA.swingT = 0;
      if (a[4] === 2 && BEA.phase !== 'moving') BEA.swingT = performance.now();
      Object.assign(BEA, { hole: clamp(Math.round(a[1]), -1, HOLES.length - 1), phase: PHN[clamp(Math.round(a[4]), 0, 3)], strokes: a[5], aim: [a[6], a[7]], scores });
      Object.assign(beaBall, { x: a[2], z: a[3] });
    };
    function setBea(on) {
      BEA.on = on; prefs.golfBot = on; savePrefs();
      BEA.req = [on ? 1 : 0, ++BEA.reqSeq];
      showToast(on ? 'Birdie Bea will play along' : 'Birdie Bea sits this round out');
      state.hudDirty = true; state.dirtyBoard = true;
      forcePresence();
    }
    L.setBea = setBea;
    L.hudActions.push({ label: () => (BEA.on ? 'Bot: on' : 'Bot: off'), run: () => setBea(!BEA.on) });
    L.drawBoard = (rows) => {
      const all = rows.slice();
      if (BEA.active) {
        const t = total(BEA.scores), rel = t - parThrough(BEA.scores), done = BEA.scores.filter((x) => x).length;
        all.push({ name: 'Birdie Bea (bot)', color: BEA.color, me: false, scores: BEA.scores, rel, done, text: done ? `${t} (${toPar(rel)})` : 'Hole 1' });
      }
      all.sort(L.sortRows);
      baseDrawMG(all);
    };
    L.beaInternals = { planPutt, beaStep, beaToHole };
    L.mgInternals = { ballStep, ballPos, millBlocked, moleUp, HOLES, B, me, placeOnTee, goToHole, strike };
    return L;
  })();

