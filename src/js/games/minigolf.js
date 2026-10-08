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
    L.bounds = { minX: -14.5, maxX: 14.5, minZ: -24.5, maxZ: 10.5 };

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
    planks.tex.repeat.set(10, 11);
    addBox(G, 30, 0.4, 36, new THREE.MeshLambertMaterial({ map: planks.tex }), 0, -0.2, -7);
    // the posts end just under the deck (a post top level with the deck's top would flicker through it)
    for (let x = -14; x <= 14; x += 4) for (const z of [-24.6, -9, 10.6]) addCyl(G, 0.25, 0.25, 1.7, 8, lam(0x6a4a2a), x, -1.15, z);
    const railMat = lam(0xffffff), railAlt = lam(0x2ec4b6);
    for (const z of [-25, 11]) { addBox(G, 30, 0.08, 0.08, railMat, 0, 1.0, z); addBox(G, 30, 0.06, 0.06, railAlt, 0, 0.55, z); }
    for (const x of [-15, 15]) { addBox(G, 0.08, 0.08, 36, railMat, x, 1.0, -7); addBox(G, 0.06, 0.06, 36, railAlt, x, 0.55, -7); }
    for (let x = -15; x <= 15; x += 2.5) for (const z of [-25, 11]) addBox(G, 0.08, 1.0, 0.08, railMat, x, 0.5, z);
    for (let z = -25; z <= 11; z += 2.5) for (const x of [-15, 15]) addBox(G, 0.08, 1.0, 0.08, railMat, x, 0.5, z);
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
      { name: 'Windmill', x: 3.2, len: 8, w: 2.2, par: 3, cup: [0, -3.2], feats: [{ t: 'spin', c: [0, -0.4], arm: 0.92, w: 0.85, theta: 0 }] },
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
    ];
    for (const H of HOLES) if (H.z === undefined) H.z = 0;
    L.HOLES = HOLES;
    const PAR_TOTAL = HOLES.reduce((n, h) => n + h.par, 0);
    for (const H of HOLES) H.tee = [0, H.len / 2 - 0.6];
    function height(H, lx, lz) {
      let y = FELT;
      for (const f of H.feats) if (f.t === 'hill') y += f.a * Math.exp(-((lx - f.c[0]) ** 2 + (lz - f.c[1]) ** 2) / (2 * f.s * f.s));
      return y;
    }
    function grad(H, lx, lz, out) {
      out[0] = 0; out[1] = 0;
      for (const f of H.feats) {
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
    const spinners = [];
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
        }
      }
    });

    // boards, kiosk
    L.board = makeBoard(G, 720, 460, 3.4, 2.17, 0, 2.6, -24.4, 0);
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
        ['Scoring', `Ten holes over two rows, par ${PAR_TOTAL}. Six strokes is the most you can take on a hole.`],
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
    scene.add(putter);
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

    L.me = { hole: 0, strokes: 0, scores: [0, 0, 0, 0, 0], done: 0, hand: 'right', phase: 'rest', t0: 0, last: -1, lastHole: -1 };
    const me = L.me;
    const B = { x: 0, z: 0, vx: 0, vz: 0, hitCool: 0, sink: 0 };
    L.ball = B;
    const H0 = () => HOLES[me.hole];
    function placeOnTee() {
      const H = H0();
      B.x = H.x + H.tee[0]; B.z = H.z + H.tee[1]; B.vx = 0; B.vz = 0; B.sink = 0;
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
      me.scores = [0, 0, 0, 0, 0];
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
    function ballStep(h, now, b = B, H = H0(), cb = null) {
      let lx = b.x - H.x, lz = b.z - H.z;
      grad(H, lx, lz, g2);
      b.vx -= 9.8 * 0.714 * g2[0] * h;
      b.vz -= 9.8 * 0.714 * g2[1] * h;
      let sp = Math.hypot(b.vx, b.vz);
      if (sp > 0) { const ns = Math.max(0, sp - (0.75 + 0.09 * sp) * h); b.vx *= ns / sp; b.vz *= ns / sp; sp = ns; }
      lx += b.vx * h; lz += b.vz * h;
      const hw = H.w / 2 - BR, hl = H.len / 2 - BR;
      if (lx < -hw) { lx = -hw; if (b.vx < 0) { bonk(-b.vx); b.vx = -b.vx * 0.72; } }
      if (lx > hw) { lx = hw; if (b.vx > 0) { bonk(b.vx); b.vx = -b.vx * 0.72; } }
      if (lz < -hl) { lz = -hl; if (b.vz < 0) { bonk(-b.vz); b.vz = -b.vz * 0.72; } }
      if (lz > hl) { lz = hl; if (b.vz > 0) { bonk(b.vz); b.vz = -b.vz * 0.72; } }
      for (const f of H.feats) {
        if (f.t === 'wall' || f.t === 'spin') {
          const segs = [];
          if (f.t === 'wall') segs.push([f.a[0], f.a[1], f.b[0], f.b[1], 0.04]);
          else for (let k = 0; k < 4; k++) { const a = f.theta + k * Math.PI / 2; segs.push([f.c[0], f.c[1], f.c[0] + Math.cos(a) * f.arm, f.c[1] + Math.sin(a) * f.arm, 0.035]); }
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

    // hits: in VR the putter head pushes the ball; in a browser, Space putts toward where you look
    const headPrev = new V3(), headNow = new V3(), _hp = new V3();
    let headInit = false;
    function strike(nx, nz, speed, now) {
      // every hit is a stroke, even on a ball that's still rolling
      if (me.phase === 'moving') showToast('Hitting a rolling ball still counts as a stroke');
      me.strokes += 1;
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
          scene.add(rec.putter);
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
      const gy = height(H, B.x - H.x, B.z - H.z);
      ballMesh.position.set(B.x, gy + BR - B.sink * 0.09, B.z);
      ballMesh.visible = B.sink < 1;
      ballShadow.position.set(B.x, gy + 0.003, B.z);
      ballShadow.visible = B.sink < 0.5;
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
      HOLES.forEach((h, i) => { g.fillText(String(i + 1), cols[i], 112); g.font = `400 17px ${BODY}`; g.fillText(`p${h.par}`, cols[i], 134); g.font = `700 22px ${BODY}`; });
      g.fillText('Total', totX, 112);
      rows.slice(0, 6).forEach((p, r) => {
        const y = 186 + r * 44;
        g.textAlign = 'left';
        g.fillStyle = p.color; rr(g, 32, y - 24, 12, 30, 4); g.fill();
        g.fillStyle = '#1b1932'; g.font = `${p.me ? 700 : 400} 26px ${BODY}`;
        g.fillText(p.me ? `${p.name} (you)` : p.name, 54, y, 170);
        g.textAlign = 'center'; g.font = `800 ${HOLES.length > 6 ? 24 : 30}px ${DISPLAY}`;
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
    const beaBall = { x: 0, z: 0, vx: 0, vz: 0, lipped: false, sink: 0 };
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
        for (const sp of [0.9, 1.5, 2.2, 3.0, 4.0, 5.3]) {
          const a = base + (da * Math.PI) / 180;
          const t = { x: sx, z: sz, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, lipped: false, sink: 0 };
          let sunk = false, rest = false;
          const cb = { sink: () => { sunk = true; }, rest: () => { rest = true; } };
          simQuiet = true;
          try { for (let k = 0; k < 900 && !sunk && !rest; k++) ballStep(1 / 120, now, t, H, cb); } finally { simQuiet = false; }
          // holing it is best; otherwise how close it stops (a gentler putt breaks ties)
          const score = sunk ? -10 + sp * 0.01 + Math.abs(da) * 0.001 : Math.hypot(t.x - cx, t.z - cz) + sp * 0.005 + (wallBetween(H, t.x, t.z) ? 1.5 : 0);
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
      Object.assign(beaBall, { x: H.x + H.tee[0] + 0.18, z: H.z + H.tee[1], vx: 0, vz: 0, lipped: false, sink: 0 });
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
          beaBall.vx = Math.cos(a) * sp; beaBall.vz = Math.sin(a) * sp;
          BEA.strokes += 1; BEA.phase = 'moving'; BEA.swingT = now;
          tone(950, 650, 0.05, 'triangle', 0.25 / (1 + Math.hypot(beaBall.x - myHead.pos.x, beaBall.z - myHead.pos.z) * 0.3));
          forcePresence();
        }
      } else if (BEA.phase === 'moving') {
        const steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;
        const cb = {
          sink: () => { BEA.phase = 'holed'; BEA.scores[BEA.hole] = BEA.strokes; spawnFloat(`Bea: ${word(BEA.strokes, H.par)}`, new V3(H.x + H.cup[0], 1.3, H.z + H.cup[1]), '#ffb36b'); sfx('chime', 0.5); state.dirtyBoard = true; forcePresence(); },
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
      const gy = height(H, beaBall.x - H.x, beaBall.z - H.z);
      beaMesh.position.set(beaBall.x, gy + BR, beaBall.z);
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
    return L;
  })();

