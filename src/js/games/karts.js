  // ================================================================ LEVEL: PEBBLE BAY GO-KARTS
  const karts = (() => {
    const L = newLevel(9);
    const G = L.group;
    const rand = mulberry32(9090);
    L.grabless = true;
    L.noLocomotion = true;
    const HW = 5, RACE_LAPS = 3;
    L.env = {
      sky: skyTexture([[0, '#3a7cc8'], [0.3, '#6fb0e6'], [0.47, '#d6ecf6'], [0.5, '#f4ead4'], [0.52, '#a8c48a'], [1, '#4f7a3a']]),
      bg: 0x9cc8ea, fog: [0xd2e4ee, 90, 420], hemi: [0xeaf4ff, 0x5a7a3e, 0.8],
      sun: [0xfff0d8, 0.68], sunDir: new V3(0.3, 0.8, 0.5), ambient: [0x8090a0, 0.25],
      sprite: { tex: paleSunTex, pos: new V3(150, 300, 250), scale: 70 },
    };

    // ---------------------------------------------------------------- track
    const CTRL = [[0, 32], [-40, 32], [-62, 20], [-66, -4], [-52, -24], [-28, -26], [-10, -38], [16, -44], [42, -36], [58, -14], [54, 8], [36, 18], [16, 28]];
    const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => new V3(x, 0, z)), true, 'centripetal');
    const N = 800;
    const P = curve.getSpacedPoints(N).slice(0, N);
    const TLEN = curve.getLength(), DS = TLEN / N;
    const T = P.map((p, i) => new V3().subVectors(P[(i + 1) % N], P[(i - 1 + N) % N]).setY(0).normalize());
    const NR = T.map((t) => new V3(-t.z, 0, t.x));   // points to the driver's right
    L.track = { P, T, NR, N, TLEN, HW };

    function ribbon(inner, outer, y, mat, vScale) {
      const pos = [], uv = [], idx = [];
      for (let i = 0; i <= N; i++) {
        const k = i % N, p = P[k], n = NR[k];
        pos.push(p.x + n.x * inner, y, p.z + n.z * inner, p.x + n.x * outer, y, p.z + n.z * outer);
        uv.push(0, (i * DS) / vScale, 1, (i * DS) / vScale);
        if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      G.add(m);
      return m;
    }
    const asphalt = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#4a4c55'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 2500; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'; g.fillRect(rand() * 128, rand() * 128, 2, 2); }
      g.fillStyle = '#e8e4d8'; g.fillRect(62, 0, 4, 64);
    });
    asphalt.tex.wrapS = asphalt.tex.wrapT = THREE.RepeatWrapping;
    const curb = canvasTexture(16, 64, (g) => { g.fillStyle = '#d84a4a'; g.fillRect(0, 0, 16, 32); g.fillStyle = '#f4f2ec'; g.fillRect(0, 32, 16, 32); });
    curb.tex.wrapS = curb.tex.wrapT = THREE.RepeatWrapping;
    const grass = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#5e9a40'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 3000; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,40,0,0.08)'; g.fillRect(rand() * 128, rand() * 128, 2, 2); }
    });
    grass.tex.wrapS = grass.tex.wrapT = THREE.RepeatWrapping;
    grass.tex.repeat.set(80, 80);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ map: grass.tex }));
    ground.rotation.x = -Math.PI / 2;
    G.add(ground);
    ribbon(-HW, HW, 0.02, new THREE.MeshLambertMaterial({ map: asphalt.tex }), 8);
    ribbon(-HW - 0.7, -HW, 0.03, new THREE.MeshLambertMaterial({ map: curb.tex }), 3);
    ribbon(HW, HW + 0.7, 0.03, new THREE.MeshLambertMaterial({ map: curb.tex }), 3);
    // start line, boost pads
    function trackQuad(i, along, across, lat, y, mat) {
      const p = P[i], t = T[i];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(across, along), mat);
      m.rotation.x = -Math.PI / 2;
      const g = new THREE.Group();
      g.add(m);
      g.position.set(p.x + NR[i].x * lat, y, p.z + NR[i].z * lat);
      g.rotation.y = Math.atan2(-t.x, -t.z);
      G.add(g);
      return g;
    }
    const checker = canvasTexture(128, 16, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); } }).tex;
    trackQuad(0, 1.2, HW * 2, 0, 0.035, new THREE.MeshLambertMaterial({ map: checker }));
    const chev = canvasTexture(64, 64, (g) => {
      g.fillStyle = '#ffb000'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#fff4b0';
      for (const y of [6, 28]) { g.beginPath(); g.moveTo(8, y + 22); g.lineTo(32, y); g.lineTo(56, y + 22); g.lineTo(46, y + 26); g.lineTo(32, y + 12); g.lineTo(18, y + 26); g.closePath(); g.fill(); }
    }).tex;
    const BOOSTS = [0.3, 0.56, 0.82].map((f) => Math.round(f * N));
    const boostMat = new THREE.MeshBasicMaterial({ map: chev, transparent: true, opacity: 0.95 });
    const boostPads = BOOSTS.map((i) => trackQuad(i, 3, 3.6, 0, 0.04, boostMat));
    // start gantry with countdown lights
    {
      const i = 0, p = P[i], n = NR[i];
      const yaw = Math.atan2(-T[i].x, -T[i].z);
      const gm = lam(0x2b2d42);
      for (const s of [-1, 1]) addBox(G, 0.4, 5.2, 0.4, gm, p.x + n.x * s * (HW + 1), 2.6, p.z + n.z * s * (HW + 1));
      const beam = addBox(G, (HW + 1) * 2 + 0.4, 0.6, 0.5, gm, p.x, 5.1, p.z);
      beam.rotation.y = yaw;
      L.lights = [];
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0x331111 }));
        const off = (k - 1.5) * 0.7;
        m.position.set(p.x + n.x * off - T[i].x * 0.3, 5.1, p.z + n.z * off - T[i].z * 0.3);
        G.add(m);
        L.lights.push(m);
      }
      const sign = makePlate(G, 'Pebble Bay', 3.2, 0.5, new V3(p.x - T[i].x * 0.27, 5.65, p.z - T[i].z * 0.27), yaw, { bg: '#2b2d42', fg: '#ffd23f', size: 0.7 });
      sign.material.fog = false;
    }
    // grandstand beside the start straight, and the scoreboard on it
    for (let row = 0; row < 5; row++) addBox(G, 30, 0.6 + row * 0.6, 1.2, lam([0x3b4f9a, 0xc23b4a, 0xe8e4d8][row % 3]), -20, (0.6 + row * 0.6) / 2, 40 + row * 1.2);
    L.board = makeBoard(G, 720, 460, 8, 5.1, -20, 7.2, 46.5, Math.PI, false);
    addBox(G, 8.4, 5.4, 0.3, lam(0x2b2d42), -20, 7.2, 46.8);
    // arch back to the clubhouse, on the grass beside the straight
    const ARCH = { x: 12, z: 40.5, w: 2.4 };
    {
      const am = new THREE.MeshLambertMaterial({ color: KIOSK_COLORS[HUB], emissive: 0x3a2a10 });
      for (const s of [-1, 1]) addBox(G, 0.3, 3.2, 0.3, am, ARCH.x + s * ARCH.w, 1.6, ARCH.z);
      addBox(G, ARCH.w * 2 + 0.3, 0.4, 0.3, am, ARCH.x, 3.3, ARCH.z);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(ARCH.w * 2, 3.1), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      surf.position.set(ARCH.x, 1.55, ARCH.z);
      G.add(surf);
      makePlate(G, 'Drive through for the clubhouse', 4.6, 0.42, new V3(ARCH.x, 3.85, ARCH.z + 0.2), Math.PI, { bg: '#6b4a33', fg: '#ffe2b8', size: 0.6 });
    }
    // trees and hills
    {
      const spots = [];
      for (let k = 0; k < 900 && spots.length < 110; k++) {
        const x = (rand() - 0.5) * 240, z = (rand() - 0.5) * 220;
        let ok = Math.hypot(x + 20, z - 43) > 18 && Math.hypot(x - ARCH.x, z - ARCH.z) > 8;
        for (let i = 0; ok && i < N; i += 6) if (Math.hypot(x - P[i].x, z - P[i].z) < HW + 9) ok = false;
        if (ok) spots.push([x, z]);
      }
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.32, 1, 6), lam(0x6a4a30), spots.length);
      const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), lam(0xffffff), spots.length);
      const m4 = new THREE.Matrix4(), q = new Q4(), s = new V3(), p = new V3(), col = new THREE.Color();
      spots.forEach(([x, z], i) => {
        const h = 2 + rand() * 2, r = 1.6 + rand() * 1.4;
        m4.compose(p.set(x, h / 2, z), q, s.set(1, h, 1)); trunks.setMatrixAt(i, m4);
        m4.compose(p.set(x, h + r * 1.2, z), q, s.set(r, r * 2.6, r)); crowns.setMatrixAt(i, m4);
        crowns.setColorAt(i, col.set(['#2f6a33', '#3f7a36', '#4e8a3a'][Math.floor(rand() * 3)]));
      });
      trunks.frustumCulled = crowns.frustumCulled = false;
      G.add(trunks, crowns);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + rand(), d = 210 + rand() * 60;
        const hill = new THREE.Mesh(new THREE.ConeGeometry(40 + rand() * 30, 30 + rand() * 40, 10), lam(k % 2 ? 0x5a7a5a : 0x6a8a6a));
        hill.position.set(Math.cos(a) * d, 10, Math.sin(a) * d);
        G.add(hill);
      }
    }

    // ---------------------------------------------------------------- karts
    function makeKart(colorHex) {
      const g = new THREE.Group();
      const body = new THREE.MeshLambertMaterial({ color: colorHex });
      const dark = lam(0x22232c);
      const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
      add(new THREE.BoxGeometry(1.3, 0.2, 1.9), body, 0, 0.27, 0);
      add(new THREE.BoxGeometry(1.15, 0.18, 0.3), dark, 0, 0.26, -1.08);
      add(new THREE.BoxGeometry(0.9, 0.16, 0.55), body, 0, 0.4, -0.75);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.22, 0.2, 1.0), body, s * 0.62, 0.38, 0.05);
      add(new THREE.BoxGeometry(0.55, 0.45, 0.12), dark, 0, 0.6, 0.62);
      add(new THREE.BoxGeometry(0.55, 0.08, 0.5), dark, 0, 0.42, 0.4);
      add(new THREE.BoxGeometry(0.8, 0.32, 0.38), dark, 0, 0.45, 0.95);
      const col = add(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), dark, 0, 0.55, -0.32);
      col.rotation.x = 0.6;
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16), dark);
      wheel.position.set(0, 0.72, -0.2); wheel.rotation.x = -0.9;
      g.add(wheel);
      const tireGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.24, 14);
      tireGeo.rotateZ(Math.PI / 2);
      const wheels = [], fronts = [];
      for (const [x, z, front] of [[-0.72, -0.7, 1], [0.72, -0.7, 1], [-0.72, 0.72, 0], [0.72, 0.72, 0]]) {
        const piv = new THREE.Group(); piv.position.set(x, 0.24, z);
        const t = new THREE.Mesh(tireGeo, dark);
        piv.add(t); g.add(piv);
        wheels.push(t);
        if (front) fronts.push(piv);
      }
      const dashC = canvasTexture(256, 96);
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: dashC.tex }));
      dash.position.set(0, 0.66, -0.52); dash.rotation.x = -0.5;
      g.add(dash);
      G.add(g);
      return { g, body, wheels, fronts, wheel, dashC };
    }
    const mine = makeKart(PLAYER_COLORS[state.colorIdx].hex);
    const driver = new THREE.Group();
    driver.position.set(0, 0.95, 0.35);
    mine.g.add(driver);
    let driverKey = '';
    L.setColor = (hex) => mine.body.color.set(hex);

    // ---------------------------------------------------------------- my kart state
    const K = { x: 0, z: 0, yaw: 0, speed: 0, steer: 0, idx: 0, s: 0, lat: 0, boostT: 0, boostCool: 0, lapStart: 0, lap: 0, best: 0, lastLap: 0, halfway: false, spin: 0, bumpT: 0, spinT: 0, shieldT: 0, item: null, roll: 0 };
    const race = { id: 0, phase: 'free', t0: 0, start: 0, lap: 0, finish: 0, beeps: 0 };
    L.K = K;
    L.race = race;
    function nearest(x, z, hint) {
      let best = hint, bd = Infinity;
      const full = hint < 0;
      for (let k = full ? 0 : -50; k < (full ? N : 51); k++) {
        const i = full ? k : (hint + k + N) % N;
        const d = (P[i].x - x) ** 2 + (P[i].z - z) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    function racers() {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    }
    function placeOnGrid() {
      const slot = Math.max(0, racers().indexOf(state.myPeer));
      const back = Math.round((3.5 + Math.floor(slot / 2) * 4) / DS);
      const i = (N - back) % N, lat = (slot % 2 ? 1 : -1) * 2.2;
      K.x = P[i].x + NR[i].x * lat; K.z = P[i].z + NR[i].z * lat;
      K.yaw = Math.atan2(-T[i].x, -T[i].z);
      K.speed = 0; K.steer = 0;
      K.idx = i; K.s = i * DS; K.halfway = false;
      K.lapStart = performance.now();
      calibrated = false;
    }
    function startRace() {
      let id = race.id;
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.raceId > id) id = st.raceId; }
      beginCountdown(id + 1);
    }
    function beginCountdown(id) {
      race.id = id; race.phase = 'count'; race.t0 = performance.now(); race.lap = 0; race.finish = 0; race.beeps = 0;
      placeOnGrid();
      showToast('Race starting!');
      state.dirtyBoard = true;
      state.hudDirty = true;
      forcePresence();
    }
    L.startRace = startRace;
    const fmt = (ms) => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

    // ---------------------------------------------------------------- driving
    let calibrated = false;
    const calib = { x: 0, z: 0, y: 0, yaw: 0 };
    const _q = new Q4(), _e = new THREE.Euler();
    function calibrate() {
      // remember where you are sitting and which way you face in your room
      calib.x = camera.position.x; calib.z = camera.position.z; calib.y = camera.position.y;
      _e.setFromQuaternion(camera.quaternion, 'YXZ');
      calib.yaw = _e.y;
      calibrated = true;
    }
    function inputs() {
      let throttle = 0, brake = 0, steer = 0, startBtn = false, recenter = false, useBtn = false;
      if (state.mode === 'vr') {
        const gpR = vrHands.right.source && vrHands.right.source.gamepad, gpL = vrHands.left.source && vrHands.left.source.gamepad;
        const btn = (gp, i) => (gp && gp.buttons && gp.buttons[i] ? gp.buttons[i] : null);
        throttle = btn(gpR, 0) ? btn(gpR, 0).value : 0;
        brake = Math.max(btn(gpL, 0) ? btn(gpL, 0).value : 0, btn(gpR, 1) ? btn(gpR, 1).value * 0.6 : 0);
        for (const gp of [gpL, gpR]) { if (gp && gp.axes) { const x = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0] || 0; if (Math.abs(x) > Math.abs(steer)) steer = x; } }
        startBtn = !!((btn(gpR, 4) && btn(gpR, 4).pressed) || (btn(gpL, 4) && btn(gpL, 4).pressed));
        useBtn = !!(btn(gpL, 1) && btn(gpL, 1).pressed);
        recenter = !!((btn(gpR, 5) && btn(gpR, 5).pressed) || (btn(gpL, 5) && btn(gpL, 5).pressed));
      } else if (state.mode === 'flat') {
        const k = state.keys;
        throttle = (k.KeyW || k.ArrowUp) ? 1 : Math.max(0, -stick.y);
        brake = (k.KeyS || k.ArrowDown) ? 1 : Math.max(0, stick.y);
        steer = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0) || stick.x;
      }
      if (Math.abs(steer) < 0.12) steer = 0;
      return { throttle, brake, steer, startBtn, recenter, useBtn };
    }
    let startHeld = false, useHeld = false;
    function drive(dt, now) {
      const inp = inputs();
      if (inp.startBtn && !startHeld && race.phase !== 'count') startRace();
      startHeld = inp.startBtn;
      if (inp.recenter) calibrate();
      if (inp.useBtn && !useHeld) useItem();
      useHeld = inp.useBtn;
      const frozen = race.phase === 'count';
      // spinning out: no grip, no throttle, until it settles
      const spun = K.spinT > 0;
      K.spinT = Math.max(0, K.spinT - dt);
      K.shieldT = Math.max(0, K.shieldT - dt);
      const throttle = frozen || spun ? 0 : inp.throttle, brake = frozen || spun ? 0 : inp.brake;
      if (spun) K.speed *= Math.exp(-2.6 * dt);
      K.steer += ((spun ? 0 : inp.steer) - K.steer) * Math.min(1, dt * 8);
      K.idx = nearest(K.x, K.z, K.idx);
      const p = P[K.idx];
      K.lat = (K.x - p.x) * NR[K.idx].x + (K.z - p.z) * NR[K.idx].z;
      const offroad = Math.abs(K.lat) > HW + 0.5;
      K.boostT = Math.max(0, K.boostT - dt);
      const vmax = K.boostT > 0 ? 23 : offroad ? 7 : K.shieldT > 0 ? 19 : 16;
      if (throttle > 0.05 && K.speed < vmax) K.speed += (K.boostT > 0 ? 14 : 6.5) * throttle * dt;
      if (brake > 0.05) { if (K.speed > 0.3) K.speed -= 16 * brake * dt; else if (K.speed > -4) K.speed -= 5 * brake * dt; }
      const drag = throttle < 0.05 && brake < 0.05 ? 2.2 : 0.6;
      K.speed -= Math.sign(K.speed) * Math.min(Math.abs(K.speed), (drag + 0.01 * K.speed * K.speed) * dt);
      if (K.speed > vmax) K.speed = Math.max(vmax, K.speed - (offroad ? 14 : 5) * dt);
      const grip = clamp(Math.abs(K.speed) / 5, 0, 1) * (1 - 0.35 * clamp((Math.abs(K.speed) - 12) / 10, 0, 1));
      K.yaw -= K.steer * 2.1 * grip * Math.sign(K.speed || 1) * dt;
      K.x += -Math.sin(K.yaw) * K.speed * dt;
      K.z += -Math.cos(K.yaw) * K.speed * dt;
      const r = Math.hypot(K.x, K.z);
      if (r > 150) { K.x *= 150 / r; K.z *= 150 / r; K.speed *= 0.5; }
      // bump into other karts
      for (const rec of remotes.values()) {
        if (!rec.kart || !rec.kart.g.visible) continue;
        const dx = K.x - rec.kart.g.position.x, dz = K.z - rec.kart.g.position.z, d = Math.hypot(dx, dz);
        if (d < 1.7 && d > 1e-3) {
          K.x += (dx / d) * (1.7 - d); K.z += (dz / d) * (1.7 - d);
          if (now > K.bumpT) { K.speed *= 0.7; K.bumpT = now + 400; tone(160, 90, 0.12, 'square', 0.12); if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.6, 60); }
        }
      }
      // and into the bots
      if (typeof botKarts === 'function') for (const b of botKarts()) {
        const dx = K.x - b.x, dz = K.z - b.z, d = Math.hypot(dx, dz);
        if (d < 1.7 && d > 1e-3) {
          K.x += (dx / d) * (1.7 - d) * 0.6; K.z += (dz / d) * (1.7 - d) * 0.6;
          if (now > K.bumpT) { K.speed *= 0.75; K.bumpT = now + 400; tone(160, 90, 0.12, 'square', 0.12); if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.6, 60); }
        }
      }
      // boost pads
      if (now > K.boostCool && Math.abs(K.lat) < 2.4) {
        for (const b of BOOSTS) {
          const di = Math.abs(((K.idx - b + N / 2 + N) % N) - N / 2);
          if (di * DS < 1.6) { K.boostT = 1.4; K.boostCool = now + 1500; sfx('whoosh', 1); if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.4, 120); break; }
        }
      }
      // laps
      const prevS = K.s;
      K.s = K.idx * DS;
      if (K.s > TLEN * 0.4 && K.s < TLEN * 0.6) K.halfway = true;
      if (prevS > TLEN * 0.8 && K.s < TLEN * 0.2) {
        if (K.halfway) {
          const t = now - K.lapStart;
          K.lastLap = t; K.lap += 1;
          const isBest = !K.best || t < K.best;
          if (isBest) K.best = t;
          if (race.phase === 'run') {
            race.lap += 1;
            if (race.lap >= RACE_LAPS) {
              race.finish = now - race.start;
              race.phase = 'done';
              const place = standings().findIndex((r) => r.me) + 1;
              showToast(`Finished ${ordinal(place)} in ${fmt(race.finish)}`);
              sfx(place === 1 ? 'fanfare' : 'chime', 1);
            } else { showToast(`Lap ${race.lap + 1} of ${RACE_LAPS}${isBest ? ', best lap!' : ''}`); sfx('chime', 0.7); }
          } else { showToast(`Lap ${fmt(t)}${isBest ? ', new best!' : ''}`); sfx('chime', 0.7); }
          state.dirtyBoard = true;
          forcePresence();
        }
        K.lapStart = now;
        K.halfway = false;
      } else if (prevS < TLEN * 0.2 && K.s > TLEN * 0.8) K.halfway = false;
      // through the arch to the clubhouse
      if (Math.abs(K.x - ARCH.x) < ARCH.w && Math.abs(K.z - ARCH.z) < 0.8) { sfx('whoosh', 1); switchLevel(HUB); }
    }
    const ordinal = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
    function standings() {
      const rows = [];
      const mineRow = { me: true, phase: race.phase, lap: race.lap, s: K.s, finish: race.finish };
      if (race.phase === 'run' || race.phase === 'done') rows.push(mineRow);
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        if (rec.lv !== L.idx || !st || st.raceId !== race.id || (st.phase !== 'run' && st.phase !== 'done')) continue;
        rows.push({ me: false, phase: st.phase, lap: st.raceLap, s: st.s, finish: st.finish });
      }
      if (typeof botKarts === 'function') for (const b of botKarts()) if (b.raceId === race.id && (b.phase === 'run' || b.phase === 'done')) rows.push({ me: false, bot: b.n, phase: b.phase, lap: b.lap, s: b.s, finish: b.finish });
      rows.sort((a, b) => {
        if (a.phase === 'done' && b.phase === 'done') return a.finish - b.finish;
        if (a.phase === 'done') return -1;
        if (b.phase === 'done') return 1;
        return (b.lap - a.lap) || (b.s - a.s);
      });
      return rows;
    }

    // engine sound
    const engine = { o1: null, o2: null, g: null };
    function engineOn() {
      const c = snd.ctx;
      if (!c || c.state !== 'running' || engine.g) return;
      engine.g = c.createGain(); engine.g.gain.value = 0;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      engine.o1 = c.createOscillator(); engine.o1.type = 'sawtooth';
      engine.o2 = c.createOscillator(); engine.o2.type = 'square';
      engine.o1.connect(f); engine.o2.connect(f); f.connect(engine.g); engine.g.connect(snd.master);
      engine.o1.start(); engine.o2.start();
    }
    function engineOff() {
      if (!engine.g) return;
      try { engine.o1.stop(); engine.o2.stop(); engine.g.disconnect(); } catch (e) { /* already stopped */ }
      engine.g = engine.o1 = engine.o2 = null;
    }

    // ---------------------------------------------------------------- per frame
    const _seat = new V3(), _fwd = new V3();
    let chase = null;
    let dashT = 0;
    L.update = (dt, now) => {
      const playing = state.mode !== 'menu' && state.level === L.idx;
      itemsUpdate(dt, now, playing);
      // adopt a race someone else started
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        if (rec.lv === L.idx && st && st.raceId > race.id && (st.phase === 'count' || st.phase === 'run')) beginCountdown(st.raceId);
      }
      if (race.phase === 'count') {
        const e = now - race.t0;
        const n = Math.min(4, Math.floor(e / 1000) + 1);
        if (n > race.beeps) { race.beeps = n; sfx(n >= 4 ? 'beep2' : 'beep', 1); if (n < 4) spawnFloat(String(4 - n), new V3(P[0].x, 6.6, P[0].z), '#ff4d6a'); else spawnFloat('Go!', new V3(P[0].x, 6.6, P[0].z), '#8bd450'); }
        if (e >= 3000) { race.phase = 'run'; race.start = now; race.lap = 0; K.lapStart = now; K.halfway = false; forcePresence(); }
      }
      const lightsOn = race.phase === 'count' ? Math.min(3, Math.floor((now - race.t0) / 1000) + 1) : 0;
      const green = race.phase === 'run' && now - race.start < 2000;
      L.lights.forEach((m, k) => m.material.color.setHex(green ? 0x5dff7a : k < lightsOn ? 0xff3030 : 0x331111));
      if (playing) {
        const steps = 2;
        for (let k = 0; k < steps && state.level === L.idx; k++) drive(dt / steps, now);
        if (state.level !== L.idx) return;
        engineOn();
      } else engineOff();
      if (engine.g) {
        engine.g.gain.value = playing ? 0.045 : 0;
        const f = 55 + Math.abs(K.speed) * 7 + (K.boostT > 0 ? 25 : 0);
        engine.o1.frequency.value = f; engine.o2.frequency.value = f * 1.5;
      }
      // my kart
      mine.g.position.set(K.x, 0, K.z);
      mine.g.rotation.y = K.yaw + (K.spinT > 0 ? (1.3 - K.spinT) * 11 : 0);
      K.spin += K.speed * dt / 0.24;
      for (const w of mine.wheels) w.rotation.x = -K.spin;
      for (const f of mine.fronts) f.rotation.y = -K.steer * 0.45;
      mine.wheel.rotation.z = K.steer * 0.9;
      mine.g.visible = state.level === L.idx;
      const dkey = `${state.colorIdx}|${state.hat}|${state.face}|${state.mode}`;
      if (dkey !== driverKey) {
        driverKey = dkey;
        driver.clear();
        if (state.mode !== 'vr') driver.add(buildAvatar(PLAYER_COLORS[state.colorIdx].hex, state.hat, state.face, false));
        mine.body.color.set(PLAYER_COLORS[state.colorIdx].hex);
      }
      // where you sit
      _seat.set(0, 0.98, 0.32).applyAxisAngle(UP, K.yaw).add(mine.g.position);
      if (state.mode === 'vr' && playing) {
        if (!calibrated) calibrate();
        const yaw = K.yaw - calib.yaw;
        dolly.rotation.set(0, yaw, 0);
        const off = new V3(calib.x, 0, calib.z).applyAxisAngle(UP, yaw);
        dolly.position.set(_seat.x - off.x, _seat.y - calib.y, _seat.z - off.z);
      }
      // dashboard
      if (now - dashT > 200) {
        dashT = now;
        const g = mine.dashC.g;
        g.fillStyle = '#101018'; g.fillRect(0, 0, 256, 96);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        let top, bot;
        if (race.phase === 'count') { top = 'Get ready'; bot = 'Race starting'; }
        else if (race.phase === 'run') { const pl = standings().findIndex((r) => r.me) + 1; top = `${ordinal(pl)}   lap ${Math.min(RACE_LAPS, race.lap + 1)}/${RACE_LAPS}`; bot = fmt(now - race.start); }
        else if (race.phase === 'done') { top = 'Finished'; bot = fmt(race.finish); }
        else { top = `Lap ${fmt(now - K.lapStart)}`; bot = K.best ? `best ${fmt(K.best)}` : (state.mode === 'vr' ? 'A starts a race' : 'Start race: top right'); }
        g.fillStyle = '#ffd23f'; g.font = `800 40px ${DISPLAY}`; g.fillText(top, 128, 32, 240);
        g.fillStyle = '#e4e0fa'; g.font = `400 26px ${BODY}`; g.fillText(bot, 128, 72, 240);
        mine.dashC.tex.needsUpdate = true;
        if (ui.status && state.mode === 'flat' && playing) {
          ui.status.hidden = false;
          const a = document.createElement('span'); a.textContent = top;
          const b = document.createElement('span'); b.className = 'obj'; b.textContent = bot;
          ui.status.replaceChildren(a, b);
        }
      }
      // other karts
      const k = 1 - Math.exp(-dt * 10);
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        const show = inMyLevel(rec) && st && st.ok;
        if (!show) { if (rec.kart) rec.kart.g.visible = false; continue; }
        if (!rec.kart) { rec.kart = makeKart(PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '#ffffff'); rec.kart.g.position.set(st.x, 0, st.z); rec.kart.g.rotation.y = st.yaw; rec.kart.spin = 0; }
        const kg = rec.kart.g;
        kg.visible = true;
        if (PLAYER_COLORS[rec.colorIdx]) rec.kart.body.color.set(PLAYER_COLORS[rec.colorIdx].hex);
        if (Math.hypot(kg.position.x - st.x, kg.position.z - st.z) > 8) kg.position.set(st.x, 0, st.z);
        else { kg.position.x += (st.x - kg.position.x) * k; kg.position.z += (st.z - kg.position.z) * k; }
        let dy = st.yaw - kg.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        kg.rotation.y += dy * k;
        if (st.spun) kg.rotation.y += dt * 11;
        rec.kart.spin += st.speed * dt / 0.24;
        for (const w of rec.kart.wheels) w.rotation.x = -rec.kart.spin;
        for (const f of rec.kart.fronts) f.rotation.y = -st.steer * 0.45;
      }
    };
    // browser: a chase camera behind the kart
    L.flatCamera = (dt) => {
      _fwd.set(-Math.sin(K.yaw), 0, -Math.cos(K.yaw));
      const want = new V3(K.x - _fwd.x * 5.6, 0, K.z - _fwd.z * 5.6);
      if (!chase || chase.distanceTo(want) > 20) chase = want.clone();
      chase.lerp(want, Math.min(1, dt * 5));
      dolly.rotation.set(0, 0, 0);
      dolly.position.copy(chase);
      camera.position.set(0, 2.5, 0);
      camera.lookAt(K.x + _fwd.x * 4, 0.9, K.z + _fwd.z * 4);
      return true;
    };
    // what others see of you: sitting in the kart, hands on the wheel
    const _hq = new Q4();
    L.publishPose = () => {
      if (state.mode === 'vr') return null;
      _hq.setFromAxisAngle(UP, K.yaw);
      const head = _seat.clone();
      const lh = new V3(-0.18, 0.72, -0.2).applyAxisAngle(UP, K.yaw).add(mine.g.position);
      const rh = new V3(0.18, 0.72, -0.2).applyAxisAngle(UP, K.yaw).add(mine.g.position);
      return { h: [head, _hq], l: [lh, _hq], r: [rh, _hq] };
    };

    const PHASE = { free: 0, count: 1, run: 2, done: 3 }, PHASE_NAME = ['free', 'count', 'run', 'done'];
    L.presence = () => ({ ka: [r3(K.x), r3(K.z), r3(K.yaw), r3(K.speed), Math.round(K.s), Math.round(K.best / 10), race.id, PHASE[race.phase], race.lap, Math.round(race.finish / 10), r3(K.steer)] });
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    L.readPresence = (rec, pres, st) => {
      const a = pres.ka;
      st.ok = false;
      if (!Array.isArray(a) || a.length !== 11 || !a.every(finite)) return;
      const phase = PHASE_NAME[int(a[7], 0, 3) ? a[7] : 0];
      if (st.init && st.phase === 'run' && phase === 'done' && st.raceId === race.id) showToast(`${rec.name} finished`);
      const best = int(a[5], 0, 1e8) ? a[5] * 10 : 0;
      if (best !== st.best || phase !== st.phase || a[8] !== st.raceLap) state.dirtyBoard = true;
      Object.assign(st, { x: clamp(a[0], -300, 300), z: clamp(a[1], -300, 300), yaw: a[2], speed: clamp(a[3], -30, 30), s: a[4], best, raceId: int(a[6], 0, 1e6) ? a[6] : 0, phase, raceLap: int(a[8], 0, 99) ? a[8] : 0, finish: int(a[9], 0, 1e8) ? a[9] * 10 : 0, steer: clamp(a[10], -1, 1), ok: true, init: true });
    };
    L.rowFor = (st, isMe) => {
      const phase = isMe ? race.phase : st.phase, best = isMe ? K.best : st.best, finish = isMe ? race.finish : st.finish, lap = isMe ? race.lap : st.raceLap;
      const inRace = (isMe || st.raceId === race.id) && (phase === 'run' || phase === 'done');
      const text = inRace ? (phase === 'done' ? `Finished ${fmt(finish)}` : `Lap ${Math.min(RACE_LAPS, lap + 1)}/${RACE_LAPS}`) : best ? `Best ${fmt(best)}` : 'No lap yet';
      return { inRace, done: phase === 'done', finish, lap, best: best || 1e12, text };
    };
    L.sortRows = (a, b) => (b.inRace - a.inRace) || (b.done - a.done) || (a.done && b.done ? a.finish - b.finish : (b.lap - a.lap)) || (a.best - b.best);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#14161f'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 64px ${DISPLAY}`; g.fillText('Pebble Bay', 36, 84);
      g.fillStyle = '#b9bccc'; g.font = `400 24px ${BODY}`;
      g.fillText(race.phase === 'free' ? `Best laps. Start a ${RACE_LAPS}-lap race any time.` : `Race ${race.id}: ${RACE_LAPS} laps`, 36, 122);
      drawRows(g, rows, 180, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => 'Start race', run: () => startRace() }];
    L.hints = [['W/S', 'drive and brake'], ['A/D', 'steer'], ['Start race', 'button, top right']];
    L.clampPlayer = () => [0, 0];
    L.spawn = () => {
      placeOnGrid();
      chase = null;
      if (state.mode !== 'vr') { dolly.position.set(K.x, 0, K.z); }
    };
    L.onEnter = () => { calibrated = false; state.dirtyBoard = true; };
    L.onExit = () => {
      engineOff();
      dolly.rotation.set(0, 0, 0);
      dolly.position.y = 0;
      if (ui.status) ui.status.hidden = true;
      for (const rec of remotes.values()) if (rec.kart) rec.kart.g.visible = false;
    };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : now * 0.00005;
      camera.position.set(Math.sin(a) * 40 - 5, 22, Math.cos(a) * 40 + 10);
      camera.lookAt(-5, 0, 0);
    };
    void boostPads;

    // ================================================================ POWER-UPS: item boxes on the track
    const ITEMS = {
      turbo: { label: 'Turbo', icon: '\u{1F680}', color: '#ff8a3a' },
      banana: { label: 'Banana peel', icon: '\u{1F34C}', color: '#ffd23f' },
      bumper: { label: 'Bumper ball', icon: '\u{1F7E2}', color: '#5ad86a' },
      homing: { label: 'Homing ball', icon: '\u{1F534}', color: '#ff4a5a' },
      shield: { label: 'Shield', icon: '\u{1F6E1}\uFE0F', color: '#7ad8ff' },
    };
    const ITEM_KEYS = Object.keys(ITEMS);
    const KIND_CODE = { bumper: 0, homing: 1 };
    // three rows of boxes across the track
    const boxTex = canvasTexture(128, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 128, 128);
      ['#ff5c8a', '#ffd23f', '#8bd450', '#4fc3f7', '#b388ff'].forEach((c, i) => gr.addColorStop(i / 4, c));
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(8, 8, 112, 112);
      g.fillStyle = '#ffffff'; g.font = `900 92px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.strokeStyle = 'rgba(40,20,60,0.6)'; g.lineWidth = 6; g.strokeText('?', 64, 70); g.fillText('?', 64, 70);
    }).tex;
    const boxMat = new THREE.MeshLambertMaterial({ map: boxTex, emissive: 0x332244, transparent: true, opacity: 0.92 });
    const boxGeo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
    const itemBoxes = [];
    for (const f of [0.14, 0.44, 0.69]) {
      const i = Math.round(f * N);
      for (const lat of [-3.6, -1.2, 1.2, 3.6]) {
        const m = new THREE.Mesh(boxGeo, boxMat);
        const x = P[i].x + NR[i].x * lat, z = P[i].z + NR[i].z * lat;
        m.position.set(x, 0.9, z);
        G.add(m);
        itemBoxes.push({ m, x, z, back: 0, phase: rand() * 6 });
      }
    }
    L.itemBoxes = itemBoxes;

    // things on the track: my bananas and balls, and everyone else's
    const bananaGeo = new THREE.TorusGeometry(0.22, 0.08, 6, 12, Math.PI * 1.2);
    const bananaMat = lam(0xffd23f);
    function bananaMesh() {
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(bananaGeo, bananaMat); m.rotation.set(Math.PI / 2, 0, k * 2.1); m.position.y = 0.08; m.scale.set(1, 1, 0.6); g.add(m); }
      G.add(g);
      return g;
    }
    function ballMesh(kind) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), lam(kind === 'homing' ? 0xe8303a : 0x3ac84a)));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 6, 20), lam(0xffffff));
      ring.rotation.x = Math.PI / 2; g.add(ring);
      g.position.y = 0.35;
      G.add(g);
      return g;
    }
    const mineObjs = { bananas: [], balls: [], seq: 0 };
    const remoteObjs = new Map();   // "peer:id" -> { kind, x, z, vx, vz, mesh, owner, id, seen }
    const consumed = { list: [], seq: 0 };
    const usedUp = new Set();   // things that already hit me, so a late update can't bring them back
    L.itemState = { mineObjs, remoteObjs, consumed };
    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.22, depthWrite: false });
    const myShield = new THREE.Mesh(new THREE.SphereGeometry(1.45, 18, 12), shieldMat);
    myShield.position.y = 0.7; myShield.visible = false;
    mine.g.add(myShield);

    // ---------------------------------------------------------------- getting and using items
    function placeNow() { const s = standings(); return { place: s.findIndex((r) => r.me) + 1, n: s.length }; }
    function rollItem() {
      const { place, n } = placeNow();
      const leading = n > 1 && place === 1;
      const w = leading ? { banana: 40, bumper: 35, turbo: 20, shield: 5, homing: 0 } : n > 1 ? { turbo: 28, homing: 24, bumper: 16, banana: 14, shield: 18 } : { turbo: 40, banana: 25, bumper: 15, shield: 20, homing: 0 };
      let t = rand() * Object.values(w).reduce((a, b) => a + b, 0);
      for (const k of ITEM_KEYS) { t -= w[k] || 0; if (t <= 0) return k; }
      return 'turbo';
    }
    function useItem() {
      if (!K.item || K.roll > 0 || race.phase === 'count' || state.level !== L.idx) return false;
      const it = K.item;
      K.item = null;
      const fx = -Math.sin(K.yaw), fz = -Math.cos(K.yaw);
      if (it === 'turbo') { K.boostT = 1.6; K.boostCool = performance.now() + 1700; sfx('whoosh', 1); }
      else if (it === 'shield') { K.shieldT = 5; sfx('zap', 0.8); }
      else if (it === 'banana') {
        const b = { id: ++mineObjs.seq, x: K.x - fx * 1.6, z: K.z - fz * 1.6, t0: performance.now(), mesh: bananaMesh() };
        b.mesh.position.set(b.x, 0, b.z);
        mineObjs.bananas.push(b);
        if (mineObjs.bananas.length > 4) { const old = mineObjs.bananas.shift(); G.remove(old.mesh); }
        sfx('thump', 0.6);
      } else {
        const sp = Math.max(28, K.speed + 14);
        const b = { id: ++mineObjs.seq, kind: it, x: K.x + fx * 1.8, z: K.z + fz * 1.8, vx: fx * sp, vz: fz * sp, t0: performance.now(), mesh: ballMesh(it), idx: K.idx };
        mineObjs.balls.push(b);
        if (mineObjs.balls.length > 3) { const old = mineObjs.balls.shift(); G.remove(old.mesh); }
        sfx('shoot', 0.9);
      }
      drawItemSlot();
      forcePresence();
      return true;
    }
    L.useItem = useItem;
    L.deskFire = () => useItem();
    L.onUse = () => { useItem(); return true; };
    function hitMe(by) {
      if (K.shieldT > 0) { sfx('clang', 0.8); return; }
      if (K.spinT > 0) return;
      K.spinT = 1.3;
      K.boostT = 0;
      sfx('slam', 0.7); sfx('tagged', 0.8);
      showToast(by ? `${by} got you!` : 'Spun out!');
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.9, 300);
      forcePresence();
    }
    L.hitMe = hitMe;

    // ---------------------------------------------------------------- per frame
    const _ia = new V3();
    function ownerName(peer, bot) { if (bot >= 0 && typeof BOT_NAMES !== 'undefined') return BOT_NAMES[bot]; const rec = remotes.get(peer); return rec ? rec.name : null; }
    function karts() {
      // everyone's kart position, me included
      const out = [{ peer: state.myPeer, x: K.x, z: K.z, s: K.s }];
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.ok) out.push({ peer: rec.peer, x: st.x, z: st.z, s: st.s }); }
      if (typeof botKarts === 'function') for (const b of botKarts()) out.push({ peer: `bot:${b.n}`, x: b.x, z: b.z, s: b.s });
      return out;
    }
    function stepBall(b, dt, homingTarget) {
      if (b.kind === 'homing' && homingTarget) {
        // steer gently toward the target
        const dx = homingTarget.x - b.x, dz = homingTarget.z - b.z, d = Math.hypot(dx, dz) || 1, sp = Math.hypot(b.vx, b.vz);
        const k = Math.min(1, dt * 3.2);
        b.vx += ((dx / d) * sp - b.vx) * k; b.vz += ((dz / d) * sp - b.vz) * k;
      }
      b.x += b.vx * dt; b.z += b.vz * dt;
      b.idx = nearest(b.x, b.z, b.idx === undefined ? -1 : b.idx);
      // bounce off the edges of the track
      const p = P[b.idx], n = NR[b.idx];
      const lat = (b.x - p.x) * n.x + (b.z - p.z) * n.z;
      if (Math.abs(lat) > HW + 0.6) {
        const vn = b.vx * n.x + b.vz * n.z;
        if (Math.sign(vn) === Math.sign(lat)) { b.vx -= 2 * vn * n.x; b.vz -= 2 * vn * n.z; tone(320, 220, 0.06, 'triangle', 0.06); }
        const fix = (Math.abs(lat) - (HW + 0.6)) * Math.sign(lat);
        b.x -= n.x * fix; b.z -= n.z * fix;
      }
    }
    function homingTargetFor(b) {
      // the nearest kart ahead of the ball along the track, other than the thrower
      let best = null, bd = 70;
      for (const k of karts()) {
        if (k.peer === b.owner) continue;
        let ahead = ((k.s - b.idx * DS) % TLEN + TLEN) % TLEN;
        if (ahead > TLEN / 2) ahead -= TLEN;
        const d = Math.hypot(k.x - b.x, k.z - b.z);
        if (ahead > -3 && d < bd) { bd = d; best = k; }
      }
      return best;
    }
    function itemsUpdate(dt, now, playing) {
      // item boxes: spin, bob, respawn, and hand out items
      for (const b of itemBoxes) {
        const up = now > b.back;
        b.m.visible = up;
        b.m.rotation.y += dt * 1.6; b.m.rotation.x += dt * 0.7;
        b.m.position.y = 0.9 + Math.sin(now * 0.003 + b.phase) * 0.12;
        if (playing && up && !K.item && K.roll <= 0 && Math.hypot(K.x - b.x, K.z - b.z) < 1.35) {
          b.back = now + 4000;
          K.roll = 1.2;
          sfx('chime', 0.7);
        } else if (playing && up && Math.hypot(K.x - b.x, K.z - b.z) < 1.35) b.back = now + 4000;
        // other karts take boxes too
        for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (up && rec.lv === L.idx && st && st.ok && Math.hypot(st.x - b.x, st.z - b.z) < 1.35) b.back = now + 4000; }
      }
      // the roulette
      if (K.roll > 0) {
        const before = Math.floor(K.roll * 10);
        K.roll -= dt;
        if (Math.floor(K.roll * 10) !== before) tone(900 + rand() * 300, 0, 0.03, 'square', 0.04);
        if (K.roll <= 0) { K.item = rollItem(); sfx('coin', 0.8); showToast(`${ITEMS[K.item].icon} ${ITEMS[K.item].label}! ${state.mode === 'vr' ? 'Squeeze the left grip' : 'E or Space'} to use it`); }
        drawItemSlot();
      }
      myShield.visible = K.shieldT > 0;
      if (myShield.visible) { shieldMat.opacity = 0.16 + 0.08 * Math.sin(now * 0.02) + (K.shieldT < 1 ? 0.1 * Math.sin(now * 0.05) : 0); }
      // my things on the track
      for (let i = mineObjs.bananas.length - 1; i >= 0; i--) {
        const b = mineObjs.bananas[i];
        b.mesh.rotation.y += dt * 0.5;
        if (now - b.t0 > 30000) { G.remove(b.mesh); mineObjs.bananas.splice(i, 1); continue; }
        // I can slip on my own peel too, once I've driven clear of it
        if (playing && (b.bot >= 0 || now - b.t0 > 1200) && Math.hypot(K.x - b.x, K.z - b.z) < 1.0) { G.remove(b.mesh); mineObjs.bananas.splice(i, 1); hitMe(b.bot >= 0 ? BOT_NAMES[b.bot] : null); forcePresence(); }
      }
      for (let i = mineObjs.balls.length - 1; i >= 0; i--) {
        const b = mineObjs.balls[i];
        b.owner = b.bot >= 0 ? `bot:${b.bot}` : state.myPeer;
        stepBall(b, dt, b.kind === 'homing' ? homingTargetFor(b) : null);
        b.mesh.position.set(b.x, 0.35, b.z);
        b.mesh.rotation.y += dt * 9;
        if (now - b.t0 > (b.kind === 'homing' ? 7000 : 6000)) { G.remove(b.mesh); mineObjs.balls.splice(i, 1); continue; }
        // my own bumper ball can come back around and get me
        if (playing && (b.bot >= 0 || (b.kind === 'bumper' && now - b.t0 > 900)) && Math.hypot(K.x - b.x, K.z - b.z) < 1.15) { G.remove(b.mesh); mineObjs.balls.splice(i, 1); hitMe(b.bot >= 0 ? BOT_NAMES[b.bot] : null); forcePresence(); }
      }
      // everyone else's things: move balls between updates, and check if they hit me
      for (const [key, o] of remoteObjs) {
        if (!o.alive) { G.remove(o.mesh); remoteObjs.delete(key); continue; }
        if (o.kind === 'banana') o.mesh.rotation.y += dt * 0.5;
        else {
          stepBall(o, dt, o.kind === 'homing' ? homingTargetFor(o) : null);
          o.mesh.position.set(o.x, 0.35, o.z);
          o.mesh.rotation.y += dt * 9;
        }
        if (playing && Math.hypot(K.x - o.x, K.z - o.z) < (o.kind === 'banana' ? 1.0 : 1.2)) {
          o.alive = false;
          usedUp.add(key);
          if (usedUp.size > 60) usedUp.delete(usedUp.values().next().value);
          consumed.list.push([++consumed.seq, o.owner, o.id]);
          if (consumed.list.length > 6) consumed.list.shift();
          hitMe(ownerName(o.owner, o.bot));
        }
      }
    }
    // a little item window on the dashboard (VR) and in the HUD (browser)
    const slotC = canvasTexture(128, 128);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: slotC.tex, transparent: true }));
    slot.position.set(0.26, 0.86, -0.38);
    slot.rotation.x = -0.35;
    mine.g.add(slot);
    const slotDiv = document.createElement('div');
    Object.assign(slotDiv.style, { position: 'absolute', left: '50%', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', width: '76px', height: '76px', borderRadius: '18px', background: 'rgba(20,16,32,0.72)', border: '3px solid rgba(255,255,255,0.35)', display: 'none', alignItems: 'center', justifyContent: 'center', font: '44px system-ui', pointerEvents: 'none', zIndex: '3' });
    slotDiv.setAttribute('aria-live', 'polite');
    (ui.hud || document.body).appendChild(slotDiv);
    function drawItemSlot() {
      const g = slotC.g;
      g.clearRect(0, 0, 128, 128);
      rr(g, 4, 4, 120, 120, 26); g.fillStyle = 'rgba(20,16,32,0.85)'; g.fill();
      g.strokeStyle = K.item ? ITEMS[K.item].color : 'rgba(255,255,255,0.3)'; g.lineWidth = 6; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '70px system-ui';
      const show = K.roll > 0 ? ITEMS[ITEM_KEYS[Math.floor(performance.now() / 90) % ITEM_KEYS.length]] : K.item ? ITEMS[K.item] : null;
      if (show) g.fillText(show.icon, 64, 70);
      slotC.tex.needsUpdate = true;
      slot.visible = !!show;
      slotDiv.style.display = show && state.mode === 'flat' && state.level === L.idx ? 'flex' : 'none';
      slotDiv.textContent = show ? show.icon : '';
      slotDiv.style.borderColor = K.item ? ITEMS[K.item].color : 'rgba(255,255,255,0.35)';
      slotDiv.setAttribute('aria-label', K.item ? `Item: ${ITEMS[K.item].label}` : 'No item');
    }
    drawItemSlot();

    // ---------------------------------------------------------------- network
    const basePresence = L.presence, baseRead = L.readPresence, baseExit = L.onExit;
    const r2i = (x) => Math.round(x * 100) / 100;
    L.presence = () => {
      const p = basePresence();
      p.ki = {
        b: mineObjs.bananas.map((b) => [b.id, r2i(b.x), r2i(b.z), b.bot >= 0 ? b.bot : -1]),
        p: mineObjs.balls.map((b) => [b.id, KIND_CODE[b.kind], r2i(b.x), r2i(b.z), r2i(b.vx), r2i(b.vz), b.bot >= 0 ? b.bot : -1]),
        s: K.shieldT > 0 ? 1 : 0, sp: K.spinT > 0 ? 1 : 0,
        x: consumed.list.slice(),
      };
      return p;
    };
    const ok = (x) => finite(x) && Math.abs(x) < 400;
    L.readPresence = (rec, pres, st) => {
      baseRead(rec, pres, st);
      const ki = pres.ki;
      if (!ki || typeof ki !== 'object') return;
      st.spun = ki.sp === 1;
      if (rec.kart) {
        if (!rec.kart.shield) { rec.kart.shield = new THREE.Mesh(new THREE.SphereGeometry(1.45, 18, 12), shieldMat); rec.kart.shield.position.y = 0.7; rec.kart.g.add(rec.kart.shield); }
        rec.kart.shield.visible = ki.s === 1;
      }
      // their bananas and balls
      const seen = new Set();
      if (Array.isArray(ki.b)) for (const a of ki.b.slice(0, 6)) {
        if (!Array.isArray(a) || (a.length !== 3 && a.length !== 4) || !Number.isInteger(a[0]) || !ok(a[1]) || !ok(a[2])) continue;
        const key = `${rec.peer}:b${a[0]}`;
        seen.add(key);
        if (usedUp.has(key)) continue;
        let o = remoteObjs.get(key);
        if (!o) { o = { kind: 'banana', owner: rec.peer, id: a[0], mesh: bananaMesh(), alive: true, bot: Number.isInteger(a[3]) ? a[3] : -1 }; remoteObjs.set(key, o); }
        o.x = a[1]; o.z = a[2]; o.mesh.position.set(o.x, 0, o.z);
      }
      if (Array.isArray(ki.p)) for (const a of ki.p.slice(0, 4)) {
        if (!Array.isArray(a) || (a.length !== 6 && a.length !== 7) || !Number.isInteger(a[0]) || (a[1] !== 0 && a[1] !== 1) || !a.slice(2, 6).every(ok)) continue;
        const key = `${rec.peer}:p${a[0]}`;
        seen.add(key);
        if (usedUp.has(key)) continue;
        let o = remoteObjs.get(key);
        const kind = a[1] === 1 ? 'homing' : 'bumper';
        if (!o) { o = { kind, owner: rec.peer, id: a[0], mesh: ballMesh(kind), alive: true, bot: Number.isInteger(a[6]) ? a[6] : -1 }; remoteObjs.set(key, o); }
        o.x = a[2]; o.z = a[3]; o.vx = a[4]; o.vz = a[5];
      }
      for (const [key, o] of remoteObjs) if (o.owner === rec.peer && !seen.has(key)) o.alive = false;
      // things of mine that hit them: take them off the track
      if (Array.isArray(ki.x)) for (const c of ki.x.slice(-6)) {
        if (!Array.isArray(c) || c.length !== 3 || !Number.isInteger(c[0]) || c[1] !== state.myPeer || !Number.isInteger(c[2])) continue;
        if (c[0] <= (st.hitSeq || 0)) continue;
        st.hitSeq = c[0];
        for (const list of [mineObjs.bananas, mineObjs.balls]) {
          const i = list.findIndex((o) => o.id === c[2]);
          if (i >= 0) { G.remove(list[i].mesh); list.splice(i, 1); if (st.hitInit) { showToast(`You got ${rec.name}!`); sfx('coin', 0.7); } }
        }
      }
      st.hitInit = true;
    };
    L.onExit = () => {
      baseExit();
      slotDiv.style.display = 'none';
      for (const o of remoteObjs.values()) G.remove(o.mesh);
      remoteObjs.clear();
    };
    L.hints = [['W/S', 'drive and brake'], ['A/D', 'steer'], ['E or Space', 'use your item'], ['Start race', 'button, top right']];
    L.itemsInternals = { ITEMS, rollItem, itemBoxes, hitMe };

    // ================================================================ AI RACERS
    // Up to three computer racers fill the grid when there are fewer than four people. The host drives them;
    // everyone else sees them through the host's presence.
    const BOT_NAMES = ['Turbo Tess', 'Pebble Pete', 'Captain Drift'];
    const BOT_COLORS = ['#ff8a3a', '#8bd450', '#b388ff'];
    const BOT_SKILL = [{ vmax: 17.4, line: -1.2 }, { vmax: 16.9, line: 1.4 }, { vmax: 16.4, line: 0.2 }];
    const bots = [];
    const botState = { on: prefs.kartBots !== false, req: null, reqSeq: 0 };
    L.bots = bots;
    L.botState = botState;
    // how sharply the track bends ahead of each point (signed: + bends left)
    const BEND = P.map((_, i) => {
      const a = T[i], b = T[(i + Math.round(16 / DS)) % N];
      return Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);
    });
    const humanCount = () => racers().length;
    const isHost = () => racers()[0] === state.myPeer;
    const wantBots = () => (botState.on ? Math.max(0, Math.min(3, 4 - humanCount())) : 0);
    function botKarts() { return bots.filter((b) => b.active); }
    L.botKarts = botKarts;

    function makeBot(n) {
      const kart = makeKart(BOT_COLORS[n]);
      const driver = buildAvatar(BOT_COLORS[n], (n * 2 + 1) % HATS.length, n % FACES.length, false);
      driver.position.set(0, 0.95, 0.35);
      kart.g.add(driver);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.75)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(BOT_NAMES[n], 128, 33); }).tex, transparent: true, depthWrite: false }));
      label.scale.set(1.2, 0.3, 1); label.position.set(0, 1.85, 0.35);
      kart.g.add(label);
      const shield = new THREE.Mesh(new THREE.SphereGeometry(1.45, 18, 12), shieldMat);
      shield.position.y = 0.7; shield.visible = false;
      kart.g.add(shield);
      const b = {
        n, name: BOT_NAMES[n], kart, shield, active: false,
        x: 0, z: 0, yaw: 0, speed: 0, steer: 0, idx: 0, s: 0, line: BOT_SKILL[n].line, vmax: BOT_SKILL[n].vmax,
        lap: 0, halfway: false, phase: 'free', raceId: 0, finish: 0, boostT: 0, boostCool: 0, spinT: 0, shieldT: 0, item: null, roll: 0, itemT: 0, bumpT: 0, wspin: 0,
        rx: 0, rz: 0, ryaw: 0,
      };
      bots.push(b);
      return b;
    }
    for (let n = 0; n < 3; n++) makeBot(n);
    function placeBot(b, slot) {
      const back = Math.round((3.5 + Math.floor(slot / 2) * 4) / DS);
      const i = (N - back) % N, lat = (slot % 2 ? 1 : -1) * 2.2;
      Object.assign(b, { x: P[i].x + NR[i].x * lat, z: P[i].z + NR[i].z * lat, yaw: Math.atan2(-T[i].x, -T[i].z), speed: 0, steer: 0, idx: i, s: i * DS, halfway: false, spinT: 0, shieldT: 0, boostT: 0 });
      b.rx = b.x; b.rz = b.z; b.ryaw = b.yaw;
    }

    // ---------------------------------------------------------------- driving (host)
    function leaderProgress() {
      // how far round the race the people are, for a gentle catch-up either way
      let best = -Infinity;
      const mine = race.lap * TLEN + K.s;
      best = Math.max(best, mine);
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.ok) best = Math.max(best, (st.raceLap || 0) * TLEN + st.s); }
      return best;
    }
    function botDrive(b, dt, now, frozen) {
      b.idx = nearest(b.x, b.z, b.idx);
      const p = P[b.idx];
      const lat = (b.x - p.x) * NR[b.idx].x + (b.z - p.z) * NR[b.idx].z;
      const offroad = Math.abs(lat) > HW + 0.5;
      // aim at a point ahead on the racing line, cutting to the inside of bends
      const ahead = Math.round((6 + Math.max(0, b.speed) * 0.55) / DS);
      const ti = (b.idx + ahead) % N, bend = BEND[b.idx];
      const want = clamp(b.line - Math.sign(bend) * Math.min(2.4, Math.abs(bend) * 3.2), -HW + 1.1, HW - 1.1);
      const tx = P[ti].x + NR[ti].x * want, tz = P[ti].z + NR[ti].z * want;
      const head = Math.atan2(-(tx - b.x), -(tz - b.z));
      let dy = head - b.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      const spun = b.spinT > 0;
      b.spinT = Math.max(0, b.spinT - dt); b.shieldT = Math.max(0, b.shieldT - dt); b.boostT = Math.max(0, b.boostT - dt);
      const steerCmd = spun ? 0 : clamp(-dy * 2.4, -1, 1);
      b.steer += (steerCmd - b.steer) * Math.min(1, dt * 8);
      // slow for tight bends; a little catch-up so races stay close
      let target = b.vmax * (1 - clamp(Math.abs(BEND[(b.idx + Math.round(10 / DS)) % N]) * 0.42, 0, 0.26));
      if (race.phase === 'run' && b.phase === 'run') {
        const gap = (b.lap * TLEN + b.s) - leaderProgress();
        if (gap > 50) target *= 0.95; else if (gap < -30) target *= 1.13;
      }
      const vmax = b.boostT > 0 ? 23 : offroad ? 7 : b.shieldT > 0 ? Math.max(target, 18) : target;
      const throttle = frozen || spun ? 0 : b.speed < vmax ? 1 : 0, brake = !frozen && !spun && b.speed > vmax + 1.5 ? 0.6 : 0;
      if (spun) b.speed *= Math.exp(-2.6 * dt);
      if (throttle && b.speed < vmax) b.speed += (b.boostT > 0 ? 14 : 6.5) * dt;
      if (brake && b.speed > 0.3) b.speed -= 16 * brake * dt;
      b.speed -= Math.sign(b.speed) * Math.min(Math.abs(b.speed), (throttle ? 0.6 : 2.2) * dt + 0.01 * b.speed * b.speed * dt);
      if (b.speed > vmax) b.speed = Math.max(vmax, b.speed - (offroad ? 14 : 5) * dt);
      const grip = clamp(Math.abs(b.speed) / 5, 0, 1) * (1 - 0.35 * clamp((Math.abs(b.speed) - 12) / 10, 0, 1));
      b.yaw -= b.steer * 2.1 * grip * dt;
      b.x += -Math.sin(b.yaw) * b.speed * dt;
      b.z += -Math.cos(b.yaw) * b.speed * dt;
      // boost pads
      if (now > b.boostCool && Math.abs(lat) < 2.4) for (const pi of BOOSTS) { const di = Math.abs(((b.idx - pi + N / 2 + N) % N) - N / 2); if (di * DS < 1.6) { b.boostT = 1.4; b.boostCool = now + 1500; break; } }
      // laps
      const prevS = b.s;
      b.s = b.idx * DS;
      if (b.s > TLEN * 0.4 && b.s < TLEN * 0.6) b.halfway = true;
      if (prevS > TLEN * 0.8 && b.s < TLEN * 0.2) {
        if (b.halfway) {
          b.lap += 1;
          if (b.phase === 'run' && b.lap >= RACE_LAPS) { b.phase = 'done'; b.finish = now - race.start; showToast(`${b.name} finished`); state.dirtyBoard = true; }
          state.dirtyBoard = true;
        }
        b.halfway = false;
      } else if (prevS < TLEN * 0.2 && b.s > TLEN * 0.8) b.halfway = false;
      // item boxes, and using what they've got
      for (const box of itemBoxes) if (now > box.back && Math.hypot(b.x - box.x, b.z - box.z) < 1.35) { box.back = now + 4000; if (!b.item && b.roll <= 0) b.roll = 1.2; }
      if (b.roll > 0) { b.roll -= dt; if (b.roll <= 0) { b.item = botRollItem(b); b.itemT = now + 800 + rand() * 1500; } }
      if (b.item && now > b.itemT && !frozen && !spun) botUseItem(b, now);
    }
    function standingOf(b) { const s = standings(); return { place: s.findIndex((r) => r.bot === b.n) + 1, n: s.length }; }
    function botRollItem(b) {
      const { place, n } = standingOf(b);
      const r = rand();
      if (n > 1 && place === 1) return r < 0.45 ? 'banana' : r < 0.8 ? 'bumper' : 'turbo';
      return r < 0.3 ? 'turbo' : r < 0.55 ? 'homing' : r < 0.72 ? 'bumper' : r < 0.86 ? 'banana' : 'shield';
    }
    // simple tactics: turbo on a straight, drop a peel with someone close behind, fire at someone ahead
    function botUseItem(b, now) {
      const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
      const others = karts().filter((k) => k.peer !== `bot:${b.n}`);
      let behind = false, ahead = false;
      for (const k of others) {
        const dx = k.x - b.x, dz = k.z - b.z, d = Math.hypot(dx, dz), along = (dx * fx + dz * fz) / (d || 1);
        if (d < 12 && along < -0.6) behind = true;
        if (d < 30 && along > 0.85) ahead = true;
      }
      const it = b.item;
      let go = false;
      if (it === 'turbo') go = Math.abs(BEND[b.idx]) < 0.12;
      else if (it === 'banana') go = behind || now > b.itemT + 6000;
      else if (it === 'bumper') go = ahead || now > b.itemT + 7000;
      else if (it === 'homing') go = others.length > 0;
      else if (it === 'shield') go = true;
      if (!go) return;
      b.item = null;
      if (it === 'turbo') { b.boostT = 1.6; b.boostCool = now + 1700; }
      else if (it === 'shield') b.shieldT = 5;
      else if (it === 'banana') {
        const o = { id: ++mineObjs.seq, x: b.x - fx * 1.6, z: b.z - fz * 1.6, t0: now, mesh: bananaMesh(), bot: b.n };
        o.mesh.position.set(o.x, 0, o.z);
        mineObjs.bananas.push(o);
        if (mineObjs.bananas.length > 8) { const old = mineObjs.bananas.shift(); G.remove(old.mesh); }
      } else {
        const sp = Math.max(28, b.speed + 14);
        const o = { id: ++mineObjs.seq, kind: it, x: b.x + fx * 1.8, z: b.z + fz * 1.8, vx: fx * sp, vz: fz * sp, t0: now, mesh: ballMesh(it), idx: b.idx, bot: b.n };
        mineObjs.balls.push(o);
        if (mineObjs.balls.length > 6) { const old = mineObjs.balls.shift(); G.remove(old.mesh); }
      }
      forcePresence();
    }
    function hitBot(b) {
      if (b.shieldT > 0) return;
      if (b.spinT > 0) return;
      b.spinT = 1.3; b.boostT = 0;
    }
    // the host checks every banana and ball on the track against the bots
    function botHits(now) {
      for (const b of botKarts()) {
        for (let i = mineObjs.bananas.length - 1; i >= 0; i--) {
          const o = mineObjs.bananas[i];
          if (o.bot === b.n && now - o.t0 < 1200) continue;
          if (Math.hypot(b.x - o.x, b.z - o.z) < 1.0) { G.remove(o.mesh); mineObjs.bananas.splice(i, 1); if (b.shieldT <= 0 && o.bot !== b.n) showToast(`${o.bot >= 0 ? BOT_NAMES[o.bot] : state.name} got ${b.name}!`); hitBot(b); forcePresence(); }
        }
        for (let i = mineObjs.balls.length - 1; i >= 0; i--) {
          const o = mineObjs.balls[i];
          if (o.bot === b.n && now - o.t0 < 900) continue;
          if (Math.hypot(b.x - o.x, b.z - o.z) < 1.2) { G.remove(o.mesh); mineObjs.balls.splice(i, 1); hitBot(b); forcePresence(); }
        }
        for (const [key, o] of remoteObjs) {
          if (!o.alive || Math.hypot(b.x - o.x, b.z - o.z) > (o.kind === 'banana' ? 1.0 : 1.2)) continue;
          o.alive = false;
          usedUp.add(key);
          consumed.list.push([++consumed.seq, o.owner, o.id]);
          if (consumed.list.length > 6) consumed.list.shift();
          hitBot(b);
          forcePresence();
        }
      }
    }

    // ---------------------------------------------------------------- per frame
    let lastRaceId = race.id, lastPhase = race.phase;
    const baseUpdate = L.update;
    L.update = (dt, now) => {
      baseUpdate(dt, now);
      const host = isHost() && state.level === L.idx;
      const n = wantBots();
      if (host) {
        bots.forEach((b, i) => {
          const was = b.active;
          b.active = i < n;
          if (b.active && !was) { placeBot(b, humanCount() + i + 2); b.phase = race.phase === 'run' || race.phase === 'count' ? 'free' : 'free'; b.lap = 0; }
        });
        // a race just started: line up on the grid behind the people
        if (race.id !== lastRaceId && (race.phase === 'count' || race.phase === 'run')) {
          botKarts().forEach((b, i) => { placeBot(b, humanCount() + i); Object.assign(b, { phase: 'count', raceId: race.id, lap: 0, finish: 0, item: null, roll: 0 }); });
          forcePresence();
        }
        if (race.phase === 'run' && lastPhase === 'count') botKarts().forEach((b) => { if (b.raceId === race.id) { b.phase = 'run'; b.lap = 0; b.halfway = false; } });
        const frozen = race.phase === 'count';
        for (const b of botKarts()) for (let k = 0; k < 2; k++) botDrive(b, dt / 2, now, frozen && b.phase === 'count');
        // bots bump each other
        const list = botKarts();
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
          const a = list[i], c = list[j], dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz);
          if (d < 1.7 && d > 1e-3) { const p = (1.7 - d) / 2; a.x -= (dx / d) * p; a.z -= (dz / d) * p; c.x += (dx / d) * p; c.z += (dz / d) * p; }
        }
        // and get pushed by the people
        for (const b of list) {
          for (const k of karts()) {
            if (k.peer.startsWith('bot:')) continue;
            const dx = b.x - k.x, dz = b.z - k.z, d = Math.hypot(dx, dz);
            if (d < 1.7 && d > 1e-3) { b.x += (dx / d) * (1.7 - d) * 0.5; b.z += (dz / d) * (1.7 - d) * 0.5; if (now > b.bumpT) { b.speed *= 0.8; b.bumpT = now + 400; } }
          }
        }
        botHits(now);
      }
      lastRaceId = race.id; lastPhase = race.phase;
      // draw them
      const k = 1 - Math.exp(-dt * (host ? 30 : 10));
      for (const b of bots) {
        b.kart.g.visible = b.active && state.level === L.idx;
        if (!b.kart.g.visible) continue;
        if (Math.hypot(b.rx - b.x, b.rz - b.z) > 8) { b.rx = b.x; b.rz = b.z; }
        b.rx += (b.x - b.rx) * k; b.rz += (b.z - b.rz) * k;
        let dy = b.yaw - b.ryaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        b.ryaw += dy * k;
        b.kart.g.position.set(b.rx, 0, b.rz);
        b.kart.g.rotation.y = b.ryaw + (b.spinT > 0 ? (1.3 - b.spinT) * 11 : 0);
        b.wspin += b.speed * dt / 0.24;
        for (const w of b.kart.wheels) w.rotation.x = -b.wspin;
        for (const f of b.kart.fronts) f.rotation.y = -b.steer * 0.45;
        b.shield.visible = b.shieldT > 0;
      }
    };

    // ---------------------------------------------------------------- network
    const PH = { free: 0, count: 1, run: 2, done: 3 }, PH_NAME = ['free', 'count', 'run', 'done'];
    const basePresence2 = L.presence, baseRead2 = L.readPresence;
    const q2 = (x) => Math.round(x * 100) / 100;
    L.presence = () => {
      const p = basePresence2();
      if (isHost()) p.kb = [botState.on ? 1 : 0, ...botKarts().map((b) => [b.n, q2(b.x), q2(b.z), q2(b.yaw), q2(b.speed), q2(b.steer), Math.round(b.s), b.lap, PH[b.phase], Math.round(b.finish / 10), b.raceId, (b.spinT > 0 ? 1 : 0) | (b.shieldT > 0 ? 2 : 0)])];
      if (botState.req) p.kbr = botState.req.slice();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      baseRead2(rec, pres, st);
      // asked to switch bots on or off
      if (isHost() && Array.isArray(pres.kbr) && pres.kbr.length === 2 && (pres.kbr[0] === 0 || pres.kbr[0] === 1) && pres.kbr.join() !== st.kbr) {
        st.kbr = pres.kbr.join();
        if (st.kbrInit && botState.on !== !!pres.kbr[0]) { botState.on = !!pres.kbr[0]; state.hudDirty = true; state.dirtyBoard = true; forcePresence(); }
      }
      st.kbrInit = true;
      // the host's bots
      if (rec.peer !== racers()[0] || !Array.isArray(pres.kb)) return;
      const on = pres.kb[0] === 1;
      if (on !== botState.on) { botState.on = on; state.hudDirty = true; }
      const seen = new Set();
      for (const a of pres.kb.slice(1, 4)) {
        if (!Array.isArray(a) || a.length !== 12 || !a.every(finite) || !Number.isInteger(a[0]) || a[0] < 0 || a[0] > 2) continue;
        const b = bots[a[0]];
        seen.add(a[0]);
        const was = b.active;
        Object.assign(b, { active: true, x: clamp(a[1], -300, 300), z: clamp(a[2], -300, 300), yaw: a[3], speed: a[4], steer: a[5], s: a[6], lap: a[7], phase: PH_NAME[clamp(a[8], 0, 3)], finish: a[9] * 10, raceId: a[10], spinT: a[11] & 1 ? 0.5 : 0, shieldT: a[11] & 2 ? 1 : 0 });
        if (!was) { b.rx = b.x; b.rz = b.z; b.ryaw = b.yaw; }
        state.dirtyBoard = true;
      }
      for (const b of bots) if (!seen.has(b.n)) b.active = false;
    };
    function setBots(on) {
      botState.on = on;
      prefs.kartBots = on; savePrefs();
      botState.req = [on ? 1 : 0, ++botState.reqSeq];
      showToast(on ? 'Computer racers on' : 'Computer racers off');
      state.hudDirty = true; state.dirtyBoard = true;
      forcePresence();
    }
    L.setBots = setBots;
    L.hudActions.push({ label: () => (botState.on ? 'Bots: on' : 'Bots: off'), run: () => setBots(!botState.on) });
    // the scoreboard lists the bots too
    const baseDraw = L.drawBoard;
    L.drawBoard = (rows) => {
      const all = rows.slice();
      for (const b of botKarts()) {
        const inRace = b.raceId === race.id && (b.phase === 'run' || b.phase === 'done');
        all.push({ name: `${b.name} (bot)`, color: BOT_COLORS[b.n], me: false, inRace, done: b.phase === 'done', finish: b.finish, lap: b.lap, best: 1e12, text: inRace ? (b.phase === 'done' ? `Finished ${fmt(b.finish)}` : `Lap ${Math.min(RACE_LAPS, b.lap + 1)}/${RACE_LAPS}`) : 'Cruising' });
      }
      all.sort(L.sortRows);
      baseDraw(all);
    };
    L.botInternals = { BOT_NAMES, botDrive, placeBot, hitBot, BEND };
    return L;
  })();

