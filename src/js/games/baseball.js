  // ================================================================ LEVEL: SANDLOT BASEBALL
  const baseball = (() => {
    const L = newLevel(1);
    const G = L.group;
    const rand = mulberry32(4242);
    const BR = 0.045;
    const FENCE_R = 62, WALL_H = 2.4;
    const MOUND = new V3(0, 0, -18.4);
    const RELEASE = new V3(0, 1.45, -17.65);
    const HOPPER = new V3(1.45, 0, -17.0);
    const PITCH_SPEED = 19;
    const SWING_MS = 300;
    const BOX_CENTER = new V3(-0.8, 0, 0.1);
    L.drag = 0.004;
    L.rollFriction = 0.35;
    L.rollDecel = 5.5;
    L.stats = { hr: 0, best: 0 };
    L.machine = { on: true, next: 0, beeps: 0, lights: [] };
    L.swing = { t0: 0, pivotY: 0.9, pivotX: -0.62, endDir: new V3(), active: false };
    L.env = {
      sky: skyTexture([[0, '#2f6fc9'], [0.3, '#5d9be0'], [0.46, '#a9d0f0'], [0.5, '#e4f0f5'], [0.52, '#c9dbb8'], [1, '#6f8f5a']]),
      bg: 0x8fbfe8, fog: [0xd3e4ee, 110, 460], hemi: [0xe4f1ff, 0x55773a, 0.82],
      sun: [0xfff2dc, 0.75], sunDir: new V3(0.4, 0.9, 0.3), ambient: [0x8090a0, 0.25],
      sprite: { tex: paleSunTex, pos: new V3(158, 352, 117), scale: 70 },
    };
    const fair = (x, z) => z < 0 && Math.abs(Math.atan2(x, -z)) <= Math.PI / 4 + 0.005;

    // clouds
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2, d = 160 + rand() * 200;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
      s.position.set(Math.cos(a) * d, 110 + rand() * 90, Math.sin(a) * d);
      s.scale.set(70 + rand() * 90, 25 + rand() * 25, 1);
      G.add(s);
    }

    // ground
    const grass = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#5f9e3f'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#6aac48';
      for (let i = 0; i < 4; i += 2) g.fillRect(i * 64, 0, 64, 256);
      for (let i = 0; i < 5000; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,40,0,0.08)';
        g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
    });
    grass.tex.wrapS = grass.tex.wrapT = THREE.RepeatWrapping;
    grass.tex.repeat.set(44, 44);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshLambertMaterial({ map: grass.tex }));
    ground.rotation.x = -Math.PI / 2;
    G.add(ground);
    const track = new THREE.Mesh(new THREE.RingGeometry(FENCE_R - 3.5, FENCE_R, 64, 1, Math.PI / 4, Math.PI / 2), lam(0xb8835a));
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.004;
    G.add(track);

    // infield (home plate at the origin, center field toward -z)
    const IPX = 1024 / 44;
    const infield = canvasTexture(1024, 1024, (g) => {
      const X = (x) => (x + 22) * IPX, Z = (z) => (z + 41) * IPX;
      g.clearRect(0, 0, 1024, 1024);
      const dirt = '#b98a5e', grassIn = '#66a845';
      g.save();
      g.beginPath();
      g.moveTo(X(0), Z(3)); g.lineTo(X(-26), Z(-23)); g.lineTo(X(-26), Z(-41)); g.lineTo(X(26), Z(-41)); g.lineTo(X(26), Z(-23)); g.closePath();
      g.clip();
      g.fillStyle = dirt;
      g.beginPath(); g.arc(X(0), Z(-18.4), 29 * IPX, 0, Math.PI * 2); g.fill();
      g.restore();
      g.fillStyle = grassIn;
      g.beginPath();
      g.moveTo(X(0), Z(-2.2)); g.lineTo(X(17.3), Z(-19.4)); g.lineTo(X(0), Z(-36.6)); g.lineTo(X(-17.3), Z(-19.4)); g.closePath();
      g.fill();
      g.fillStyle = dirt;
      g.beginPath(); g.arc(X(0), Z(-18.4), 2.7 * IPX, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(X(0), Z(0), 4 * IPX, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 12000; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(60,30,0,0.06)';
        g.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
      }
      g.strokeStyle = '#f7f5ee'; g.lineWidth = 0.09 * IPX;
      g.beginPath(); g.moveTo(X(0), Z(0)); g.lineTo(X(22), Z(-22)); g.moveTo(X(0), Z(0)); g.lineTo(X(-22), Z(-22)); g.stroke();
      g.lineWidth = 0.07 * IPX;
      for (const cx of [-0.99, 0.99]) g.strokeRect(X(cx - 0.61), Z(-0.9), 1.22 * IPX, 1.83 * IPX);
      g.fillStyle = '#f7f5ee';
      for (const [bx, bz] of [[19.4, -19.4], [0, -38.8], [-19.4, -19.4]]) {
        g.save(); g.translate(X(bx), Z(bz)); g.rotate(Math.PI / 4); g.fillRect(-0.19 * IPX, -0.19 * IPX, 0.38 * IPX, 0.38 * IPX); g.restore();
      }
      g.beginPath();
      g.moveTo(X(-0.215), Z(-0.215)); g.lineTo(X(0.215), Z(-0.215)); g.lineTo(X(0.215), Z(0)); g.lineTo(X(0), Z(0.215)); g.lineTo(X(-0.215), Z(0));
      g.closePath(); g.fill();
      g.fillRect(X(-0.3), Z(-18.5), 0.6 * IPX, 0.15 * IPX);
    });
    const infieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshLambertMaterial({ map: infield.tex, transparent: true, depthWrite: false }));
    infieldMesh.rotation.x = -Math.PI / 2;
    infieldMesh.position.set(0, 0.006, -19);
    infieldMesh.renderOrder = 0;
    G.add(infieldMesh);
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.08, 28), lam(0xb98a5e));
    mound.position.copy(MOUND).setY(0.02);
    G.add(mound);
    const chalk = lam(0xf7f5ee);
    for (const s of [-1, 1]) {
      const d = new V3(s * Math.SQRT1_2, 0, -Math.SQRT1_2);
      const a = 30, b = FENCE_R - 0.3, len = b - a;
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, len), chalk);
      line.position.set(d.x * (a + len / 2), 0.008, d.z * (a + len / 2));
      line.rotation.y = Math.atan2(d.x, d.z);
      G.add(line);
      const pole = addCyl(G, 0.12, 0.12, 14, 8, lam(0xffd23f), d.x * (FENCE_R + 0.3), 7, d.z * (FENCE_R + 0.3));
      pole.userData.pole = true;
    }

    // outfield wall
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(FENCE_R, FENCE_R, WALL_H, 72, 1, true, Math.PI * 0.75, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x23533f, side: THREE.DoubleSide }));
    wall.position.y = WALL_H / 2;
    G.add(wall);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(FENCE_R + 0.06, FENCE_R + 0.06, 0.12, 72, 1, true, Math.PI * 0.75, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffd23f, side: THREE.DoubleSide }));
    cap.position.y = WALL_H;
    G.add(cap);
    for (const phi of [-0.7, 0, 0.7]) {
      const r = FENCE_R - 0.06;
      makePlate(G, `${FENCE_R} m`, 2.4, 0.9, new V3(Math.sin(phi) * r, 1.3, -Math.cos(phi) * r), -phi, { bg: '#23533f', fg: '#f7f5ee', size: 0.8 });
    }

    // distant trees and a scoreboard in center field
    {
      const N = 90;
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), lam(0x5a4030), N);
      const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lam(0xffffff), N);
      const m4 = new THREE.Matrix4(), q = new Q4(), s = new V3(), p = new V3(), col = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const a = rand() * Math.PI * 2, d = 85 + rand() * 70;
        const h = 4 + rand() * 4, r = 3 + rand() * 3;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        m4.compose(p.set(x, h / 2, z), q.identity(), s.set(0.35, h, 0.35)); trunks.setMatrixAt(i, m4);
        m4.compose(p.set(x, h + r * 0.6, z), q.identity(), s.set(r, r * 0.85, r)); crowns.setMatrixAt(i, m4);
        crowns.setColorAt(i, col.set(['#3f7a36', '#4e8a3a', '#2f6a33', '#5c9442'][Math.floor(rand() * 4)]));
      }
      trunks.frustumCulled = crowns.frustumCulled = false;
      G.add(trunks, crowns);
    }

    // backstop
    const linkT = hoops.linkTex.clone();
    linkT.needsUpdate = true;
    linkT.repeat.set(16 / 0.14, 6 / 0.14);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshBasicMaterial({ map: linkT, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, color: 0x9aa0b8 }));
    back.position.set(0, 3, 5.0);
    G.add(back);
    for (let x = -8; x <= 8; x += 4) addCyl(G, 0.05, 0.05, 6.1, 6, lam(0x8a8fa8), x, 3.05, 5.0);
    addBox(G, 16, 0.06, 0.06, lam(0x8a8fa8), 0, 6.0, 5.0);

    // pitching machine + hopper
    const mMat = lam(0x3b4a8c), mDark = lam(0x23294d);
    addBox(G, 0.7, 0.9, 0.7, mMat, 0, 0.45, -18.4);
    const barrel = addCyl(G, 0.09, 0.11, 0.7, 12, mDark, 0, 1.3, -17.95);
    barrel.rotation.x = Math.PI / 2 - 0.05;
    for (const sx of [-1, 1]) {
      const w = addCyl(G, 0.22, 0.22, 0.08, 18, lam(0x1b1932), sx * 0.2, 1.3, -18.2);
      w.rotation.z = Math.PI / 2;
    }
    addBox(G, 0.5, 0.5, 0.35, mMat, 0, 1.3, -18.35);
    const lightOff = new THREE.MeshBasicMaterial({ color: 0x3a3a48 });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lightOff);
      m.position.set(-0.13 + i * 0.13, 1.7, -18.2);
      G.add(m);
      L.machine.lights.push(m);
    }
    const lightAmber = new THREE.MeshBasicMaterial({ color: 0xffb020 });
    const lightGreen = new THREE.MeshBasicMaterial({ color: 0x5dff7a });
    addBox(G, 0.9, 0.5, 0.9, lam(0x7a5433), HOPPER.x, 0.25, HOPPER.z);
    const COLLIDERS = [
      box(-0.36, 0, -18.76, 0.36, 1.58, -18.04, 0.3, 'wall'),
      box(HOPPER.x - 0.45, 0, HOPPER.z - 0.45, HOPPER.x + 0.45, 0.5, HOPPER.z + 0.45, 0.3, 'grass'),
      box(HOPPER.x - 0.45, 0.5, HOPPER.z - 0.45, HOPPER.x - 0.41, 0.58, HOPPER.z + 0.45, 0.3, 'wall'),
      box(HOPPER.x + 0.41, 0.5, HOPPER.z - 0.45, HOPPER.x + 0.45, 0.58, HOPPER.z + 0.45, 0.3, 'wall'),
      box(HOPPER.x - 0.45, 0.5, HOPPER.z - 0.45, HOPPER.x + 0.45, 0.58, HOPPER.z - 0.41, 0.3, 'wall'),
      box(HOPPER.x - 0.45, 0.5, HOPPER.z + 0.41, HOPPER.x + 0.45, 0.58, HOPPER.z + 0.45, 0.3, 'wall'),
      box(-8, 0, 4.9, 8, 6, 5.3, 0.15, 'net'),
    ];
    for (const [x0, x1] of [[HOPPER.x - 0.45, HOPPER.x - 0.41], [HOPPER.x + 0.41, HOPPER.x + 0.45]]) addBox(G, x1 - x0, 0.08, 0.9, lam(0x7a5433), (x0 + x1) / 2, 0.54, HOPPER.z);
    for (const [z0, z1] of [[HOPPER.z - 0.45, HOPPER.z - 0.41], [HOPPER.z + 0.41, HOPPER.z + 0.45]]) addBox(G, 0.9, 0.08, z1 - z0, lam(0x7a5433), HOPPER.x, 0.54, (z0 + z1) / 2);

    // balls
    const ballTex = canvasTexture(256, 128, (g) => {
      g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, 256, 128);
      g.strokeStyle = '#c8322b'; g.lineWidth = 3;
      for (const off of [0, 128]) {
        g.beginPath();
        for (let x = 0; x <= 128; x += 2) {
          const y = 64 + 36 * Math.sin((x / 128) * Math.PI * 2) * (off ? -1 : 1);
          if (x === 0) g.moveTo(off + x, y); else g.lineTo(off + x, y);
        }
        g.stroke();
      }
    }).tex;
    const ballGeo = new THREE.SphereGeometry(BR, 14, 10);
    for (let i = 0; i < 9; i++) {
      const slot = new V3(HOPPER.x + ((i % 3) - 1) * 0.22, 0.5 + BR + 0.002, HOPPER.z + (Math.floor(i / 3) - 1) * 0.22);
      makeBody(L, { geo: ballGeo, tex: ballTex, r: BR, slot });
    }

    // bat rack
    const rackX = -2.9, rackZ = 1.3;
    addBox(G, 1.1, 0.06, 0.1, legMat, rackX, 1.0, rackZ);
    addBox(G, 1.1, 0.12, 0.3, lam(0x7a5433), rackX, 0.06, rackZ);
    for (const sx of [-0.55, 0.55]) addBox(G, 0.06, 1.02, 0.06, legMat, rackX + sx, 0.51, rackZ);
    const downQ = new Q4().setFromUnitVectors(FWD, new V3(0, -1, 0));
    for (let i = 0; i < 3; i++) makeTool(L, new V3(rackX - 0.32 + i * 0.32, 0.97, rackZ), downQ);

    // buttons, kiosk, boards
    // game settings live on a panel against the backstop, well clear of the batter's box
    addBox(G, 3.9, 1.5, 0.08, lam(0x2b2d42), -2.74, 1.2, 4.62);
    makePlate(G, 'Game settings', 2.4, 0.26, new V3(-2.74, 1.78, 4.57), Math.PI, { bg: '#2b2d42', fg: '#ffd23f', size: 0.7 });
    const machineBtn = makeButton(L, new V3(-3.42, 1.0, 4.3), 0x8bd450, 'Pitching machine', () => setMachine(!L.machine.on), { faceYaw: Math.PI });
    function setMachine(on) {
      L.machine.on = on;
      L.machine.next = 0;
      machineBtn.mat.color.setHex(on ? 0x8bd450 : 0x777788);
      machineBtn.lit = on;
      state.hudDirty = true;
    }
    setMachine(true);
    makeButton(L, new V3(-4.1, 1.0, 4.3), 0xf5821f, 'Reset balls', () => resetBodies(L), { faceYaw: Math.PI });
    makeKiosk(L, -4.9, 3.3, Math.PI * 0.75);
    L.board = makeBoard(G, 720, 460, 2.4, 1.533, -6.4, 2.0, -0.6, Math.PI / 2 - 0.3);
    {
      const big = new THREE.Mesh(new THREE.PlaneGeometry(14, 8.94), new THREE.MeshBasicMaterial({ map: L.board.tex, fog: false }));
      big.position.set(0, 10, -(FENCE_R + 18));
      G.add(big);
      addBox(G, 14.6, 9.5, 0.4, legMat, 0, 10, -(FENCE_R + 18.25));
      for (const sx of [-5, 5]) addBox(G, 0.6, 6, 0.6, legMat, sx, 3, -(FENCE_R + 18.3));
    }
    const sign = makeBoard(G, 720, 500, 2.2, 1.528, -7.2, 1.95, 1.6, Math.PI / 2);
    function drawSign() {
      const g = sign.g, W = 720, H = 500;
      g.fillStyle = '#16142e'; g.fillRect(0, 0, W, H);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#f4f2ff'; g.font = `800 58px ${DISPLAY}`;
      g.fillText('How to play', 36, 78);
      const sections = [
        ['Batting', 'Take a bat from the rack and step into a batter\u2019s box. The machine pitches every few seconds; the three lights count you in. In VR, grab the bat once and it stays in your hand; squeeze again to put it back. In a browser, click or press Space to swing.'],
        ['Pitching', 'Switch the machine off with the green button, grab a ball from the crate by the mound, and throw to a friend.'],
        ['Home runs', `Clear the ${FENCE_R} m wall in fair territory.`],
      ];
      let y = 124;
      for (const [label, body] of sections) {
        g.fillStyle = '#ffa24a'; g.font = `700 24px ${BODY}`;
        g.fillText(label, 36, y);
        y += 31;
        g.fillStyle = '#e4e0fa'; g.font = `400 24px ${BODY}`;
        y = wrapText(g, body, 36, y, 648, 30) + 12;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);

    // physics
    L.collide = (b) => {
      let support = groundBounce(b, 0.42, 0.8, 'grass');
      if (support && b.data.batted && !b.data.landAt) b.data.landAt = b.pos.clone();
      const d = Math.hypot(b.pos.x, b.pos.z);
      if (d > FENCE_R - b.r && d < FENCE_R + 0.6 && b.pos.y < WALL_H && fair(b.pos.x, b.pos.z)) {
        const nx = -b.pos.x / d, nz = -b.pos.z / d;
        const k = (FENCE_R - b.r) / d;
        if (d < FENCE_R + 0.3) { b.pos.x *= k; b.pos.z *= k; }
        const vn = b.vel.x * nx + b.vel.z * nz;
        if (vn < 0) { impact(b, -vn, 'wall'); b.vel.x -= 1.35 * vn * nx; b.vel.z -= 1.35 * vn * nz; }
      }
      for (const bx of COLLIDERS) if (collideBox(b, bx) > 0.6) support = true;
      return support;
    };
    L.groundAt = (b) => (Math.abs(b.pos.x - HOPPER.x) < 0.45 && Math.abs(b.pos.z - HOPPER.z) < 0.45 && b.pos.y > 0.5 ? 0.5 : 0);

    function cheer(text, pos) {
      sfx('cheer', 1);
      state.flashT = performance.now();
      showToast(text);
      if (pos) spawnFloat('Home run!', pos, '#ffd23f');
    }
    L.onBatHit = (b, speed) => { L.lastHitSpeed = speed; };
    L.onBodyFrame = (b, dt) => {
      if (b.owner !== state.myPeer || b.held) return;
      const dd = b.data;
      if (dd.batted && !dd.landed) {
        const d0 = Math.hypot(b.prev.x, b.prev.z), d1 = Math.hypot(b.pos.x, b.pos.z);
        if (!dd.hr && d0 < FENCE_R && d1 >= FENCE_R && b.pos.y > WALL_H && fair(b.pos.x, b.pos.z)) {
          dd.hr = true;
          L.stats.hr += 1;
          state.dirtyBoard = true;
          forcePresence();
          cheer('Home run!', new V3(b.pos.x, WALL_H + 3, b.pos.z));
          if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.6, 120);
        }
        if (dd.landAt) {
          dd.landed = true;
          const lp = dd.landAt;
          const dist = Math.round(Math.hypot(lp.x, lp.z));
          if (dd.hr || fair(lp.x, lp.z)) {
            if (dist > L.stats.best) { L.stats.best = dist; state.dirtyBoard = true; forcePresence(); }
            if (!dd.hr && !gameOn()) showToast(`${dist} m`);
            spawnFloat(`${dist} m`, new V3(lp.x, 1.6, lp.z), dd.hr ? '#ffd23f' : '#ffffff');
          } else if (dist > 3 && !gameOn()) showToast('Foul ball');
        }
      }
      // balls left lying around drift back to the crate
      if (b.sleeping && b.pos.distanceTo(b.slot) > 1.5) {
        b.idleT += dt;
        if (b.idleT > 6) reclaimToSlot(b);
      } else if (!b.sleeping) b.idleT = 0;
    };

    // who is batting? me, if I hold a bat in a batter's box and nobody with a lower label is
    const myBat = () => L.tools.find((t) => t.held && t.held.peer === state.myPeer);
    function inBox(p) { return Math.hypot(p.x, p.z - 0.1) < 3.0 && p.z > -2; }
    function amBatting() {
      if (!myBat() || !inBox(myHead.pos)) return false;
      if (gameOn()) return GM.ph === 1 && GM.order[GM.bi] === state.myPeer && !GAME_PLAY.active && !GAME_PITCH.active;
      for (const rec of remotes.values()) {
        if (!inMyLevel(rec) || rec.peer >= state.myPeer) continue;
        const holds = L.tools.some((t) => t.held && t.held.peer === rec.peer);
        if (holds && inBox(rec.cur.h.pos)) return false;
      }
      return true;
    }
    function firePitch() {
      let pick = null, bestScore = -1;
      for (const b of L.bodies) {
        if (b.held) continue;
        if (b.owner && b.owner !== state.myPeer && !b.sleeping) continue;
        const score = (b.sleeping ? 2 : 0) + (b.pos.distanceTo(HOPPER) < 1.2 ? 1 : 0) + (b.vel.lengthSq() < 0.25 ? 0.5 : 0);
        if (score > bestScore) { bestScore = score; pick = b; }
      }
      if (!pick) return;
      const target = gameOn() ? gamePitchTarget() : new V3((rand() - 0.5) * 0.28, 0.8 + (rand() - 0.5) * 0.26, 0.15);
      const dist = target.distanceTo(RELEASE);
      const T = dist / PITCH_SPEED;
      pick.v += 1;
      pick.owner = state.myPeer;
      pick.held = null;
      pick.pos.copy(RELEASE);
      pick.vel.copy(target).sub(RELEASE).divideScalar(T);
      pick.vel.y += 0.5 * GRAVITY * T;
      pick.sleeping = false;
      pick.restT = 0;
      pick.idleT = 0;
      pick.corr.set(0, 0, 0);
      pick.data = { pitched: true };
      if (gameOn()) gameTrackPitch(pick);
      sfx('thump', 0.9 / (1 + RELEASE.distanceTo(myHead.pos) * 0.05));
      forcePresence();
    }
    L.update = (dt, now) => {
      gameUpdate(dt, now);
      const M = L.machine;
      const lit = (n) => M.lights.forEach((m, i) => { m.material = i < n ? (n === 3 ? lightGreen : lightAmber) : lightOff; });
      if (!(M.on || gameOn()) || !amBatting()) { M.next = 0; M.beeps = 0; lit(0); return; }
      if (!M.next) { M.next = now + 2400; M.beeps = 0; }
      const left = M.next - now;
      const n = left < 1500 ? (left < 1000 ? (left < 500 ? 3 : 2) : 1) : 0;
      lit(n);
      if (n > M.beeps) { M.beeps = n; sfx(n === 3 ? 'beep2' : 'beep', 0.9); }
      if (left <= 0) { firePitch(); M.next = now + (gameOn() ? 3800 : 3300); M.beeps = 0; }
    };

    // desktop batting: the bat swings in a flat arc through the zone; height auto-matches the pitch
    const REST_DIR = new V3(-0.25, 0.85, 0.45).normalize();
    const REST_POS = new V3(-0.66, 1.05, 0.28);
    const _d = new V3(), _p = new V3();
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    const _bp = new V3();
    L.deskSwing = (now) => {
      const s = L.swing;
      if (s.t0 && now - s.t0 < SWING_MS + 350) return;
      // find the pitch that is coming in, then work out where it will meet the bat on this swing
      let ball = null;
      for (const b of L.bodies) {
        if (b.held || b.vel.z < 3 || b.pos.z > 0.8 || b.pos.z < -19) continue;
        if (!ball || b.pos.z > ball.pos.z) ball = b;
      }
      let pivotY = 0.85, pivotX = -0.62;
      if (ball) {
        // reach out over the plate (or pull in) to meet the pitch, the way a batter would
        const tc = (0.12 - ball.pos.z) / Math.max(ball.vel.z, 1);
        pivotX = clamp(ball.pos.x + ball.vel.x * tc - 0.62, -0.95, -0.45);
        let bestPerp = 0.2;
        const dur = SWING_MS / 1000;
        for (let k = 1; k <= 60; k++) {
          const t = (k / 60) * dur;
          const phi = lerp(-0.2, Math.PI + 0.3, ease(t / dur));
          const dx = Math.sin(phi), dz = Math.cos(phi);
          _bp.copy(ball.pos).addScaledVector(ball.vel, t);
          _bp.y -= 0.5 * GRAVITY * t * t;
          const rx = _bp.x - pivotX, rz = _bp.z - 0.12;
          const proj = rx * dx + rz * dz;
          if (proj < BAT.zone0 || proj > BAT.tip) continue;
          const perp = Math.hypot(rx - proj * dx, rz - proj * dz);
          if (perp < bestPerp) { bestPerp = perp; pivotY = _bp.y; }
        }
        if (bestPerp >= 0.2) {
          const t = (0.12 - ball.pos.z) / ball.vel.z;
          pivotY = ball.pos.y + ball.vel.y * t - 0.5 * GRAVITY * t * t;
        }
      }
      // hitting slightly under the ball's center lifts it
      s.pivotY = clamp(pivotY + 0.012 - rand() * 0.042, 0.3, 1.5);
      s.pivotX = pivotX;
      s.t0 = now;
      sfx('whoosh', 0.8);
      gameNoteSwing();
    };
    L.deskHand = (side, mh, now) => {
      const t = myBat();
      if (!t || t.held.side !== side || state.mode !== 'flat') return false;
      const s = L.swing;
      const u = s.t0 ? (now - s.t0) / SWING_MS : 99;
      t.noHit = !(u < 1);
      if (u < 1) {
        const phi = lerp(-0.2, Math.PI + 0.3, ease(u));
        _d.set(Math.sin(phi), 0, Math.cos(phi));
        _p.set(s.pivotX, s.pivotY, 0.12);
        s.endDir.copy(_d);
      } else if (u < 1 + 350 / SWING_MS) {
        const k = (u - 1) * SWING_MS / 350;
        _d.copy(s.endDir).lerp(REST_DIR, k).normalize();
        _p.set(s.pivotX, s.pivotY, 0.12).lerp(REST_POS, k);
      } else {
        _d.copy(REST_DIR);
        _p.copy(REST_POS);
      }
      mh.pos.copy(_p);
      mh.quat.setFromUnitVectors(FWD, _d);
      mh.ok = true;
      return true;
    };
    L.onToolGrab = () => {
      if (state.mode !== 'flat') return;
      dolly.position.set(-0.75, 0, 1.4);
      state.yaw = -0.03;
      state.pitch = -0.04;
      L.swing.t0 = 0;
    };

    L.presence = () => Object.assign({ bb: [L.stats.hr, L.stats.best] }, gamePresence());
    L.readPresence = (rec, pres, st) => {
      gameRead(rec, pres, st);
      const a = Array.isArray(pres.bb) ? pres.bb : [];
      const hr = Number.isInteger(a[0]) ? clamp(a[0], 0, 9999) : 0;
      const best = Number.isInteger(a[1]) ? clamp(a[1], 0, 999) : 0;
      if (st.init && hr > st.hr) cheer(`${rec.name} hit a home run`, null);
      if (hr !== st.hr || best !== st.best) state.dirtyBoard = true;
      st.hr = hr; st.best = best; st.init = true;
    };
    L.rowFor = (st, me) => {
      const hr = me ? L.stats.hr : (st.hr || 0), best = me ? L.stats.best : (st.best || 0);
      return { hr, best, text: `${hr} HR, ${best} m` };
    };
    L.sortRows = (a, b) => (b.hr - a.hr) || (b.best - a.best);
    L.drawBoard = (rows) => {
      if (GM.ph) { drawGameBoard(); return; }
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#123524'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 64px ${DISPLAY}`;
      g.fillText('Sandlot Baseball', 36, 84);
      g.fillStyle = '#b9d8c4'; g.font = `400 24px ${BODY}`;
      g.fillText(`Home runs and longest hit. The wall is ${FENCE_R} m.`, 36, 122);
      drawRows(g, rows, 180, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [
      { label: () => (gameOn() ? 'End game' : 'Play ball!'), run: () => gameRequest(gameOn() ? 2 : 1) },
      { label: () => (L.machine.on ? 'Pitching machine: on' : 'Pitching machine: off'), run: () => setMachine(!L.machine.on), show: () => !gameOn() },
      { label: () => 'Reset balls', run: () => resetBodies(L) },
    ];
    L.hintsFor = () => {
      const h = state.held;
      if (h && h.kind === 'tool') return [['Click', 'swing'], ['Space', 'swing'], ['E', 'put the bat back']];
      return [['Drag', 'look'], ['WASD', 'move'], ['E', 'grab a bat or ball'], ['Space', 'hold, then let go to throw']];
    };
    L.clampPlayer = (p) => {
      let dx = 0, dz = 0;
      const d = Math.hypot(p.x, p.z), maxR = FENCE_R - 0.8;
      if (d > maxR) { dx = p.x * (maxR / d - 1); dz = p.z * (maxR / d - 1); }
      if (p.z + dz > 4.6) dz = 4.6 - p.z;
      return [dx, dz];
    };
    L.spawn = () => {
      dolly.position.set(-3.4, 0, 2.6);
      state.yaw = 0;
    };
    L.onExit = () => { L.machine.next = 0; if (ui.status) ui.status.hidden = true; };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.00007) * 0.5;
      camera.position.set(Math.sin(a) * 9, 5.5, 11);
      camera.lookAt(0, 1.2, -24);
    };

    // ================================================================ FULL GAME: you (and friends) vs the Sandlot Sluggers
    const INNINGS = 3;
    const BASE_POS = [new V3(19.4, 0, -19.4), new V3(0, 0, -38.8), new V3(-19.4, 0, -19.4)];
    const FIRST = BASE_POS[0], SECOND = BASE_POS[1];
    const SPOTS = [[0, -17.2], [0.3, 1.9], [16.5, -23], [7, -33], [-7, -33], [-16.5, -23], [-24, -44], [0, -52], [24, -44]];
    const EV = { BALL: 1, STRIKE_LOOK: 2, STRIKE_SWING: 3, FOUL: 4, OUT_FLY: 5, OUT_GROUND: 6, SINGLE: 7, DOUBLE: 8, TRIPLE: 9, HR: 10, WALK: 11, K: 12, SIDE: 13, WIN: 14, LOSS: 15, TIE: 16, START: 17, OUT_LINE: 18, ENDED: 19, DP: 20, FC: 21 };
    const BASE_D = 27.43;   // home to first or third
    const HIT_BASES = { [EV.SINGLE]: 1, [EV.DOUBLE]: 2, [EV.TRIPLE]: 3, [EV.HR]: 4 };
    const GM = { def: 0, gid: 0, ph: 0, inn: 1, outs: 0, b: 0, s: 0, bases: [0, 0, 0], r: [0, 0], h: [0, 0], line: [[0, 0, 0], [0, 0, 0]], bi: 0, order: [], ev: [0, 0, 0, 0, ''], cpuT: 0, endT: 0 };
    L.game = GM;
    const gameOn = () => GM.ph === 1 || GM.ph === 2;
    const herePeers = () => {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    };
    const gameHost = () => herePeers()[0] === state.myPeer;
    const nameOf = (peer) => (peer === state.myPeer ? state.name : (remotes.get(peer) || {}).name || 'Someone');
    const ZONE = { x: 0.25, y0: 0.45, y1: 1.2 };

    // ---------------------------------------------------------------- what happened, in words
    function describe(code, team, runs, who) {
      if (team === 1 && who && (code === EV.OUT_FLY || code === EV.OUT_LINE)) return `${who} makes the catch!`;
      if (team === 1 && who && code === EV.OUT_GROUND) return `${who} throws them out at first!`;
      if (team === 1 && who && code === EV.DP) return `${who} starts the double play!${runs ? ` ${runs} run${runs > 1 ? 's' : ''} score${runs > 1 ? '' : 's'}` : ''}`;
      if (team === 1 && who && code === EV.FC) return `${who} gets the force at second`;
      const t = team ? 'Sluggers: ' : who ? `${who}: ` : '';
      const r = runs ? ` ${runs} run${runs > 1 ? 's' : ''} score${runs > 1 ? '' : 's'}!` : '';
      switch (code) {
        case EV.BALL: return `Ball ${GM.b}`;
        case EV.STRIKE_LOOK: return `Strike ${GM.s}, looking`;
        case EV.STRIKE_SWING: return `Strike ${GM.s}, swinging`;
        case EV.FOUL: return 'Foul ball';
        case EV.OUT_FLY: return `${t}caught! Fly out`;
        case EV.OUT_LINE: return `${t}snagged! Line out`;
        case EV.OUT_GROUND: return `${t}grounded out${r}`;
        case EV.DP: return team ? `Double play! Two down for the Sluggers${r}` : `${t}grounds into a double play${r}`;
        case EV.FC: return team ? `Sluggers: out at second, fielder\u2019s choice${r}` : `${t}fielder\u2019s choice, out at second${r}`;
        case EV.SINGLE: return `${t}single!${r}`;
        case EV.DOUBLE: return `${t}double!${r}`;
        case EV.TRIPLE: return `${t}triple!${r}`;
        case EV.HR: return `${t}home run!${r}`;
        case EV.WALK: return `${t}ball four, take your base${r}`;
        case EV.K: return `${t}strike three!`;
        case EV.SIDE: return team ? 'Three outs. Your team is up' : 'Three outs. The Sluggers are up';
        case EV.WIN: return `Final: you win ${GM.r[0]} to ${GM.r[1]}!`;
        case EV.LOSS: return `Final: the Sluggers win ${GM.r[1]} to ${GM.r[0]}`;
        case EV.TIE: return `Final: a ${GM.r[0]} to ${GM.r[1]} tie`;
        case EV.START: return 'Play ball!';
        case EV.ENDED: return 'Game ended';
        default: return '';
      }
    }
    function showEvent(code, team, runs, who) {
      const text = describe(code, team, runs, who);
      if (text) showToast(text);
      if (code === EV.HR || code === EV.WIN) { sfx('fanfare', 0.9); sfx('cheer', 1); }
      else if (HIT_BASES[code]) sfx('cheer', team ? 0.5 : 0.9);
      else if (code === EV.DP) { sfx('mitt', 0.7); setTimeout(() => sfx('mitt', 0.7), 380); if (team === 1) sfx('cheer', 0.6); }
      else if (code === EV.STRIKE_LOOK || code === EV.STRIKE_SWING || code === EV.K) sfx('beep', 0.7);
      else if (code === EV.BALL || code === EV.WALK) sfx('beep2', 0.5);
      if (team === 1 && code !== EV.SIDE && !GM.def) cpuSwing(code);
      state.dirtyBoard = true;
      state.hudDirty = true;
    }
    function announce(code, team, runs, who) {
      GM.ev = [GM.ev[0] + 1, code, team, runs || 0, who || ''];
      showEvent(code, team, runs || 0, who || '');
    }

    // ---------------------------------------------------------------- rules (run by the host)
    function score(t, runs) { if (!runs) return; GM.r[t] += runs; GM.line[t][Math.min(GM.inn, INNINGS) - 1] += runs; }
    function walk(t) {
      const B = GM.bases;
      let runs = 0;
      if (B[0]) { if (B[1]) { if (B[2]) runs = 1; B[2] = 1; } B[1] = 1; }
      B[0] = 1;
      score(t, runs);
      return runs;
    }
    function hit(t, n) {
      const B = GM.bases;
      let runs = 0;
      if (n >= 4) { runs = 1 + B[0] + B[1] + B[2]; GM.bases = [0, 0, 0]; }
      else {
        const nb = [0, 0, 0];
        for (let i = 2; i >= 0; i--) {
          if (!B[i]) continue;
          const to = i + n + (n === 1 && i === 1 ? 1 : 0);
          if (to >= 3) runs++; else nb[to] = 1;
        }
        nb[n - 1] = 1;
        GM.bases = nb;
      }
      score(t, runs);
      GM.h[t] += 1;
      return runs;
    }
    // a groundout: the batter is out at first, and any runner who had to move up does
    function groundAdvance() {
      const B = GM.bases;
      let runs = 0;
      if (B[0]) { if (B[1]) { if (B[2]) runs = 1; B[2] = 1; } B[1] = 1; B[0] = 0; }
      return runs;
    }
    // runner out at second and the batter out at first; others move up a base unless that was the third out
    function doublePlay(t) {
      const B = GM.bases;
      let runs = 0;
      GM.outs += 2;
      if (GM.outs < 3) { runs = B[2] ? 1 : 0; GM.bases = [0, 0, B[1] ? 1 : 0]; score(t, runs); } else GM.bases = [0, 0, 0];
      return runs;
    }
    // out at second; the batter reaches first and forced runners move up
    function fieldersChoice(t) {
      const B = GM.bases;
      GM.outs += 1;
      const runs = B[1] && B[2] && GM.outs < 3 ? 1 : 0;
      GM.bases = GM.outs < 3 ? [1, 0, B[1] ? 1 : B[2]] : [0, 0, 0];
      score(t, runs);
      return runs;
    }
    // an infielder has the ball: turn two if there's a force at second and time to do it, otherwise get the batter at first
    function infieldPlay(f, t) {
      const toFirst = 0.6 + Math.hypot(f.x - FIRST.x, f.z - FIRST.z) / 24;
      if (GM.bases[0] && GM.outs < 2) {
        const d2 = Math.hypot(f.x - SECOND.x, f.z - SECOND.z);
        // a quick flip when close to the bag, a firmer throw from farther away
        const toSecond = d2 < 12 ? 0.3 + d2 / 20 : 0.5 + d2 / 26;
        // the runner from first needs about 3.6 s to reach second; the pivot and relay take about 1.3 s;
        // a sandlot batter needs about 4.7 s to reach first
        if (t + toSecond < 3.6) return t + toSecond + 1.28 < 4.7 ? EV.DP : EV.FC;
      }
      return t + toFirst < 4.5 ? EV.OUT_GROUND : EV.SINGLE;
    }
    function nextBatter() {
      GM.b = 0; GM.s = 0;
      const here = new Set(herePeers());
      for (let k = 0; k < GM.order.length; k++) {
        GM.bi = (GM.bi + 1) % GM.order.length;
        if (here.has(GM.order[GM.bi])) return;
      }
    }
    function finish() {
      GM.ph = 3;
      GM.endT = performance.now() + 15000;
      announce(GM.r[0] > GM.r[1] ? EV.WIN : GM.r[0] < GM.r[1] ? EV.LOSS : EV.TIE, 0);
    }
    function endHalf() {
      GM.outs = 0; GM.bases = [0, 0, 0]; GM.b = 0; GM.s = 0;
      if (GM.ph === 1) {
        if (GM.inn >= INNINGS && GM.r[1] > GM.r[0]) { finish(); return; }
        GM.ph = 2;
        GM.cpuT = performance.now() + 2600;
        announce(EV.SIDE, 0);
      } else {
        if (GM.inn >= INNINGS) { finish(); return; }
        GM.inn += 1;
        GM.ph = 1;
        announce(EV.SIDE, 1);
      }
    }
    function changed() { forcePresence(); state.dirtyBoard = true; state.hudDirty = true; }
    // a pitch or play reported by the batter
    function hostPitchEvent(code) {
      if (GM.ph !== 1) return;
      const who = nameOf(GM.order[GM.bi]);
      if (code === EV.BALL) {
        GM.b += 1;
        if (GM.b >= 4) { const runs = walk(0); announce(EV.WALK, 0, runs, who); nextBatter(); } else announce(code, 0);
      } else if (code === EV.STRIKE_LOOK || code === EV.STRIKE_SWING) {
        GM.s += 1;
        if (GM.s >= 3) { announce(EV.K, 0, 0, who); GM.outs += 1; nextBatter(); if (GM.outs >= 3) endHalf(); } else announce(code, 0);
      } else if (code === EV.FOUL) {
        if (GM.s < 2) GM.s += 1;
        announce(code, 0);
      } else if (code === EV.OUT_FLY || code === EV.OUT_LINE) {
        announce(code, 0, 0, who); GM.outs += 1; nextBatter(); if (GM.outs >= 3) endHalf();
      } else if (code === EV.OUT_GROUND) {
        GM.outs += 1;
        const runs = GM.outs < 3 ? groundAdvance() : 0;
        score(0, runs);
        announce(code, 0, runs, who); nextBatter(); if (GM.outs >= 3) endHalf();
      } else if (code === EV.DP || code === EV.FC) {
        const runs = code === EV.DP ? doublePlay(0) : fieldersChoice(0);
        announce(code, 0, runs, who); nextBatter(); if (GM.outs >= 3) endHalf();
      } else if (HIT_BASES[code]) {
        const runs = hit(0, HIT_BASES[code]);
        announce(code, 0, runs, who); nextBatter();
      }
      changed();
    }
    // the Sluggers' turn at bat plays out quickly
    function cpuPA() {
      const x = rand();
      const code = x < 0.2 ? EV.K : x < 0.45 ? EV.OUT_GROUND : x < 0.66 ? EV.OUT_FLY : x < 0.73 ? EV.WALK : x < 0.89 ? EV.SINGLE : x < 0.95 ? EV.DOUBLE : x < 0.96 ? EV.TRIPLE : EV.HR;
      if (code === EV.WALK) announce(code, 1, walk(1));
      else if (HIT_BASES[code]) announce(code, 1, hit(1, HIT_BASES[code]));
      else if (code === EV.OUT_GROUND && GM.bases[0] && GM.outs < 2 && rand() < 0.5) { announce(EV.DP, 1, doublePlay(1)); if (GM.outs >= 3) endHalf(); }
      else if (code === EV.OUT_GROUND) { GM.outs += 1; const runs = GM.outs < 3 ? groundAdvance() : 0; score(1, runs); announce(code, 1, runs); if (GM.outs >= 3) endHalf(); }
      else { announce(code, 1); GM.outs += 1; if (GM.outs >= 3) endHalf(); }
      if (GM.ph === 2 && GM.inn >= INNINGS && GM.r[1] > GM.r[0]) finish();
      changed();
    }
    function startGame() {
      Object.assign(GM, { gid: GM.gid + 1, ph: 1, inn: 1, outs: 0, b: 0, s: 0, bases: [0, 0, 0], r: [0, 0], h: [0, 0], line: [[0, 0, 0], [0, 0, 0]], bi: 0, order: herePeers() });
      announce(EV.START, 0);
      changed();
    }
    function hostRequest(req) {
      if (!Array.isArray(req) || req.length !== 2 || req[1] !== GM.gid) return;
      if (req[0] === 3 || req[0] === 4) { const v = req[0] === 3 ? 1 : 0; if (GM.def !== v) { GM.def = v; showToast(v ? 'Defense on: you\u2019ll field when the Sluggers bat' : 'Defense off: the Sluggers\u2019 turn plays out quickly'); changed(); } return; }
      if (req[0] === 1 && !gameOn()) startGame();
      else if (req[0] === 2 && gameOn()) { GM.ph = 0; announce(EV.ENDED, 0); changed(); }
    }
    const myReq = { v: null };
    function gameRequest(kind) {
      myReq.v = [kind, GM.gid];
      if (gameHost()) hostRequest(myReq.v);
      forcePresence();
    }
    let wasGameHost = false, lastOwnReq = null;
    function hostTick(now) {
      if (!wasGameHost) GM.cpuT = now + 2200;
      wasGameHost = true;
      // act on a request once, when it changes
      if (myReq.v && myReq.v !== lastOwnReq) { lastOwnReq = myReq.v; hostRequest(myReq.v); }
      if (gameOn()) {
        const here = herePeers();
        let grew = false;
        for (const p of here) if (!GM.order.includes(p)) { GM.order.push(p); grew = true; }
        if (grew) changed();
        if (GM.ph === 1 && !here.includes(GM.order[GM.bi])) { nextBatter(); changed(); }
      }
      if (GM.ph === 2 && !GM.def && now > GM.cpuT) { GM.cpuT = now + 2000; cpuPA(); }
      if (GM.ph === 2 && GM.def) hostDefense(now);
      if (GM.ph === 3 && now > GM.endT) { GM.ph = 0; changed(); }
    }

    // ---------------------------------------------------------------- the batter's side: pitches, swings, plays
    const GAME_PITCH = { active: false, ball: null, crossed: false, inZone: false, swung: false, t0: 0 };
    const GAME_PLAY = { active: false, ball: null, t0: 0, landed: false, result: 0, endT: 0, glove: -1, sendUntil: 0 };
    const atBat = { seq: 0, list: [] };
    function report(code) {
      if (gameHost()) hostPitchEvent(code);
      else { atBat.list.push([++atBat.seq, code]); if (atBat.list.length > 4) atBat.list.shift(); forcePresence(); }
    }
    function gamePitchTarget() {
      if (rand() < 0.6) return new V3((rand() - 0.5) * 0.36, 0.62 + rand() * 0.42, 0.15);
      const k = rand();
      if (k < 0.5) return new V3((rand() < 0.5 ? -1 : 1) * (0.36 + rand() * 0.16), 0.6 + rand() * 0.4, 0.15);
      if (k < 0.8) return new V3((rand() - 0.5) * 0.3, 0.22 + rand() * 0.14, 0.15);
      return new V3((rand() - 0.5) * 0.3, 1.32 + rand() * 0.14, 0.15);
    }
    function gameTrackPitch(b) { Object.assign(GAME_PITCH, { active: true, ball: b, crossed: false, inZone: false, swung: false, t0: performance.now() }); }
    function gameNoteSwing() { if (GAME_PITCH.active && !GAME_PITCH.crossed) GAME_PITCH.swung = true; }
    L.gamePitch = GAME_PITCH;
    L.gamePlay = GAME_PLAY;

    // nine fielders in Sluggers gray and red
    const uniMat = lam(0xdedad0), capMat = lam(0xc0283a), pantsMat = lam(0x9a968c), skinMat = lam(0xd9a87a), gloveMat = lam(0x7a4a24);
    const ballMat = lam(0xffffff);
    function figure(cap) {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(cyl(0.2, 0.24, 0.75), uniMat), 0, 1.12, 0));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.08, 0.07, 0.72, 6), pantsMat), sx * 0.11, 0.38, 0));
      g.add(at(new THREE.Mesh(sph(0.15), skinMat), 0, 1.66, 0));
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), cap || capMat); c.position.y = 1.7; g.add(c);
      const brim = new THREE.Mesh(cyl(0.12, 0.12, 0.02, 10), cap || capMat); brim.position.set(0, 1.71, -0.13); brim.scale.z = 0.8; g.add(brim);
      return g;
    }
    const FIELDERS = SPOTS.map(([x, z], i) => {
      const g = figure();
      const glove = at(new THREE.Mesh(sph(0.1, 8, 6), gloveMat), 0.28, 1.05, -0.18);
      const held = at(new THREE.Mesh(sph(0.045, 8, 6), ballMat), 0.28, 1.12, -0.25);
      held.visible = false;
      g.add(glove, held);
      g.position.set(x, 0, z);
      g.visible = false;
      G.add(g);
      return { i, g, held, x, z, tx: x, tz: z, sx: x, sz: z, speed: i < 6 ? 5.4 : 6.0, moving: 0 };
    });
    // runners on base, the Sluggers' batter, the strike zone
    const runnerCap = [lam(0x4fc3f7), capMat];
    const runners = [0, 1, 2].map((i) => { const g = figure(); g.position.copy(BASE_POS[i]).add(new V3(0.6, 0, 0.6)); g.scale.setScalar(0.92); g.visible = false; G.add(g); return g; });
    const cpuBatter = figure();
    cpuBatter.position.set(0.85, 0, 0.1);
    cpuBatter.rotation.y = Math.PI / 2;
    const cpuBat = new THREE.Group();
    cpuBat.position.set(0, 1.3, 0.25);
    cpuBat.add(at(new THREE.Mesh(cyl(0.035, 0.018, 0.85, 8), lam(0xc89a5a)), 0, 0.42, 0));
    cpuBatter.add(cpuBat);
    cpuBatter.visible = false;
    G.add(cpuBatter);
    let cpuSwingT = 0;
    const arcs = [];
    function cpuSwing(code) {
      cpuSwingT = performance.now();
      if (code === EV.K || code === EV.WALK) return;
      sfx('bat', 0.6);
      // a cosmetic ball flies out to show where the Sluggers hit it
      const dist = { [EV.OUT_GROUND]: 22, [EV.OUT_FLY]: 46, [EV.SINGLE]: 34, [EV.DOUBLE]: 52, [EV.TRIPLE]: 58, [EV.HR]: 76 }[code] || 30;
      const ang = (rand() - 0.5) * (Math.PI / 2 - 0.15);
      const end = new V3(Math.sin(ang) * dist, 0, -Math.cos(ang) * dist);
      const m = new THREE.Mesh(sph(0.09, 8, 6), ballMat);
      G.add(m);
      arcs.push({ m, end, t0: performance.now(), dur: code === EV.OUT_GROUND ? 1000 : 1700, h: code === EV.OUT_GROUND ? 0.6 : dist * 0.3 });
    }
    const zone = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(ZONE.x * 2, ZONE.y1 - ZONE.y0)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
    zone.position.set(0, (ZONE.y0 + ZONE.y1) / 2, 0.15);
    zone.visible = false;
    G.add(zone);

    function landingPoint(b) {
      const p = b.pos.clone(), v = b.vel.clone();
      for (let k = 0; k < 400; k++) {
        v.y -= GRAVITY * 0.02;
        v.multiplyScalar(Math.max(0, 1 - L.drag * v.length() * 0.02));
        p.addScaledVector(v, 0.02);
        if (p.y < 1.0 && v.y < 0) break;
      }
      return p;
    }
    function startPlay(b) {
      Object.assign(GAME_PLAY, { active: true, ball: b, t0: performance.now(), landed: false, judged: false, result: 0, endT: 0, glove: -1, sendUntil: 0, chaser: -1 });
      for (const f of FIELDERS) { f.held.visible = false; }
    }
    function endPlay(code, glove) {
      const P = GAME_PLAY;
      P.result = code;
      P.glove = glove;
      P.endT = performance.now() + 1600;
      P.sendUntil = P.endT + 500;
      if (glove >= 0) { FIELDERS[glove].held.visible = true; reclaimToSlot(P.ball); sfx('mitt', 0.7); }
      report(code);
    }
    const _tp = new V3();
    function stepPlay(dt, now) {
      const P = GAME_PLAY;
      if (!P.active) return;
      if (P.result) {
        if (now > P.endT) { P.active = false; for (const f of FIELDERS) { f.tx = f.sx; f.tz = f.sz; f.held.visible = false; } }
        return;
      }
      const b = P.ball, t = (now - P.t0) / 1000;
      const dd = b.data || {};
      if (dd.hr) { endPlay(EV.HR, -1); return; }
      // fair or foul: a ball that first comes down past first or third is judged where it lands; one that comes
      // down in the infield is judged where it passes the bag, stops, or is touched
      if (!P.landed && dd.landAt) {
        P.landed = true;
        if (Math.hypot(dd.landAt.x, dd.landAt.z) > BASE_D) { P.judged = true; if (!fair(dd.landAt.x, dd.landAt.z)) { endPlay(EV.FOUL, -1); return; } }
      }
      if (P.landed && !P.judged && (Math.hypot(b.pos.x, b.pos.z) > BASE_D || Math.hypot(b.vel.x, b.vel.z) < 0.3)) {
        P.judged = true;
        if (!fair(b.pos.x, b.pos.z)) { endPlay(EV.FOUL, -1); return; }
      }
      if (!P.landed && b.pos.z > 3.5) { endPlay(EV.FOUL, -1); return; }
      if (!dd.batted || b.held) { endPlay(EV.FOUL, -1); return; }
      // the two nearest fielders chase; the rest hold their spots
      const target = P.landed ? _tp.copy(b.pos).addScaledVector(b.vel, 0.35) : landingPoint(b);
      const order = FIELDERS.slice().sort((a, c) => Math.hypot(a.x - target.x, a.z - target.z) - Math.hypot(c.x - target.x, c.z - target.z));
      for (const f of FIELDERS) { f.tx = f.sx; f.tz = f.sz; }
      // a sandlot first step; then one fielder commits to a fly (whoever can get there soonest), and two go after a ball on the ground
      if (t > 0.45) {
        if (!P.landed) {
          if (P.chaser < 0) {
            let best = Infinity;
            for (const f of FIELDERS) { const k = Math.hypot(f.x - target.x, f.z - target.z) / f.speed; if (k < best) { best = k; P.chaser = f.i; } }
          }
          const f = FIELDERS[P.chaser]; f.tx = target.x; f.tz = target.z;
        } else for (const f of order.slice(0, 2)) { f.tx = target.x; f.tz = target.z; }
      }
      // hard-hit balls are harder to glove
      const spd = Math.hypot(b.vel.x, b.vel.z);
      const reach = spd > 24 ? 0.7 : spd > 15 ? 0.55 + (24 - spd) / 30 : 1.0;
      for (const f of FIELDERS) {
        const d = Math.hypot(b.pos.x - f.x, b.pos.z - f.z);
        if (!P.landed && d < Math.max(reach, 0.75) && b.pos.y < 2.1 && b.pos.y > 0.15 && !(f.i === 1 && t < 0.6)) { endPlay(t > 1.4 || b.pos.y > 1.7 ? EV.OUT_FLY : EV.OUT_LINE, f.i); return; }
        if (P.landed && d < reach && b.pos.y < 1.0) {
          if (!P.judged && !fair(b.pos.x, b.pos.z)) { endPlay(EV.FOUL, -1); return; }   // touched in foul ground before the bag
          if (f.i <= 5) endPlay(infieldPlay(f, t), f.i);
          else {
            // in a small park, balls that reach the warning track are doubles, and deep ones into the corners can be triples
            const deep = Math.hypot(b.pos.x, b.pos.z) > 48, corner = deep && Math.abs(Math.atan2(b.pos.x, -b.pos.z)) > 0.6;
            endPlay(t > 6.5 || (corner && t > 4) ? EV.TRIPLE : t > 3.2 || deep ? EV.DOUBLE : EV.SINGLE, f.i);
          }
          return;
        }
      }
      if (t > 14) endPlay(EV.SINGLE, -1);
    }
    function moveFielders(dt) {
      for (const f of FIELDERS) {
        const dx = f.tx - f.x, dz = f.tz - f.z, d = Math.hypot(dx, dz);
        const step = Math.min(d, f.speed * dt);
        if (d > 0.05) { f.x += (dx / d) * step; f.z += (dz / d) * step; }
        // nobody runs through the outfield wall
        const r = Math.hypot(f.x, f.z), lim = FENCE_R - 0.7;
        if (r > lim) { f.x *= lim / r; f.z *= lim / r; }
        f.moving = d > 0.3 ? 1 : 0;
      }
    }
    let fieldNet = null;
    function renderField(now, dt) {
      const show = GM.ph === 1 || (GM.ph === 2 && GM.def === 1);
      const ball = GAME_PLAY.active && !GAME_PLAY.result ? GAME_PLAY.ball : DEF.play ? DEF.play.ball : null;
      for (const f of FIELDERS) {
        f.g.visible = show && !f.human;
        f.g.children[4].material = f.g.children[5].material = GM.ph === 2 ? runnerCap[0] : capMat;
        if (!show) continue;
        if (fieldNet) { const k = 1 - Math.exp(-dt * 10); f.x += (fieldNet[f.i * 2] - f.x) * k; f.z += (fieldNet[f.i * 2 + 1] - f.z) * k; f.held.visible = fieldNet[18] === f.i; }
        const bob = f.moving ? Math.abs(Math.sin(now * 0.018 + f.i)) * 0.08 : 0;
        f.g.position.set(f.x, bob, f.z);
        const lx = ball ? ball.pos.x : 0, lz = ball ? ball.pos.z : 0;
        f.g.rotation.y = Math.atan2(-(lx - f.x), -(lz - f.z));
      }
      for (let i = 0; i < 3; i++) {
        runners[i].visible = gameOn() && !!GM.bases[i];
        runners[i].children[4].material = runners[i].children[5].material = runnerCap[GM.ph === 2 ? 1 : 0];
      }
      cpuBatter.visible = GM.ph === 2;
      const u = (now - cpuSwingT) / 260;
      cpuBat.rotation.x = u < 1 ? lerp(0.6, -2.4, u) : 0.6;
      zone.visible = GM.ph === 1;
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i], k = (now - a.t0) / a.dur;
        if (k >= 1.3) { G.remove(a.m); arcs.splice(i, 1); continue; }
        const kk = Math.min(1, k);
        if (k < 0) { a.m.visible = false; continue; }
        a.m.visible = true;
        const fx = a.from ? a.from.x : 0, fz = a.from ? a.from.z : 0, fy = a.from ? a.from.y : 1;
        a.m.position.set(fx + (a.end.x - fx) * kk, fy + (1.1 - fy) * kk + Math.sin(kk * Math.PI) * a.h, fz + (a.end.z - fz) * kk);
      }
    }

    // ---------------------------------------------------------------- per frame
    const _tip = new V3(), _lastTip = new V3();
    let tipOk = false;
    function gameUpdate(dt, now) {
      if (gameHost()) hostTick(now); else wasGameHost = false;
      defenseClient(now);
      const P = GAME_PITCH;
      // a quick bat swing in VR counts as swinging at the pitch
      const bat = myBat();
      if (bat && state.mode === 'vr') {
        _tip.set(0, 0, -BAT.tip).applyQuaternion(bat.quat).add(bat.pos);
        if (tipOk && P.active && !P.crossed && P.ball.pos.z > -10 && _tip.distanceTo(_lastTip) / Math.max(dt, 1 / 240) > 6) P.swung = true;
        _lastTip.copy(_tip); tipOk = true;
      } else tipOk = false;
      if (P.active) {
        const b = P.ball;
        if (b.data && b.data.batted) { P.active = false; startPlay(b); }
        else {
          if (!P.crossed && b.pos.z >= 0.12) { P.crossed = true; P.inZone = Math.abs(b.pos.x) <= ZONE.x && b.pos.y >= ZONE.y0 && b.pos.y <= ZONE.y1; }
          const gone = (P.crossed && (b.pos.z > 1.6 || b.vel.z < 0.5)) || b.held || now - P.t0 > 4000 || !(b.data && b.data.pitched);
          if (gone) { P.active = false; report(P.swung ? EV.STRIKE_SWING : P.crossed && P.inZone ? EV.STRIKE_LOOK : EV.BALL); }
        }
      }
      stepPlay(dt, now);
      if (GAME_PLAY.active) fieldNet = null;
      if (!fieldNet) moveFielders(dt);
      renderField(now, dt);
      updateGameStatus();
    }
    let statusKey = '';
    function updateGameStatus() {
      if (!ui.status) return;
      const show = state.mode === 'flat' && state.level === L.idx && GM.ph > 0;
      if (!show) { if (statusKey) { ui.status.hidden = true; statusKey = ''; } return; }
      const half = GM.ph === 3 ? 'Final' : `${GM.ph === 1 ? 'Top' : 'Bottom'} ${GM.inn}`;
      const up = GM.ph === 1 ? `${nameOf(GM.order[GM.bi])} at bat` : GM.ph === 2 ? (GM.def && L.mySpotName ? `You\u2019re at ${L.mySpotName()}` : 'Sluggers batting') : '';
      const key = `${half}|${GM.outs}|${GM.b}|${GM.s}|${GM.r}|${up}`;
      if (key === statusKey) return;
      statusKey = key;
      ui.status.hidden = false;
      ui.status.replaceChildren();
      const a = document.createElement('span'); a.style.color = '#ffd23f'; a.textContent = `You ${GM.r[0]}, Sluggers ${GM.r[1]}`;
      const c = document.createElement('span'); c.textContent = GM.ph === 3 ? half : `${half} \u00b7 ${GM.outs} out \u00b7 ${GM.b}-${GM.s}`;
      ui.status.append(a, c);
      if (GM.ph === 2 && GM.def) { const o = document.createElement('span'); o.className = 'obj'; o.textContent = up; ui.status.append(o); }
    }

    // ---------------------------------------------------------------- network
    const r1 = (x) => Math.round(x * 10) / 10;
    function gamePresence() {
      const p = {};
      if (gameHost() && (GM.ph || GM.gid)) {
        p.bg = [GM.gid, GM.ph, GM.inn, GM.outs, GM.b, GM.s, ...GM.bases, ...GM.r, ...GM.h, GM.bi, ...GM.line[0], ...GM.line[1]];
        p.bgo = GM.order.slice(0, 12);
        p.bge = GM.ev.slice();
        p.bgd = [GM.def];
      }
      if (myReq.v) p.bgr = myReq.v.slice();
      if (atBat.list.length) p.bga = atBat.list.slice();
      if (GAME_PLAY.active || performance.now() < GAME_PLAY.sendUntil || (DEF.play && gameHost())) p.bgf = [...FIELDERS.flatMap((f) => [r1(f.x), r1(f.z)]), GAME_PLAY.result ? GAME_PLAY.glove : -1];
      return p;
    }
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    function applyHostGame(bg, bgo, bge) {
      if (!Array.isArray(bg) || bg.length !== 20 || !bg.every((x) => int(x, 0, 99999))) return;
      if (!Array.isArray(bgo) || !bgo.every((x) => typeof x === 'string' && x.length < 64)) return;
      const prevPh = GM.ph;
      state.hudDirty = true;
      Object.assign(GM, { gid: bg[0], ph: Math.min(bg[1], 3), inn: clamp(bg[2], 1, INNINGS), outs: Math.min(bg[3], 3), b: Math.min(bg[4], 4), s: Math.min(bg[5], 3), bases: bg.slice(6, 9).map((x) => (x ? 1 : 0)), r: bg.slice(9, 11), h: bg.slice(11, 13), bi: bg[13], line: [bg.slice(14, 17), bg.slice(17, 20)], order: bgo.slice(0, 12) });
      if (GM.bi >= GM.order.length) GM.bi = 0;
      if (Array.isArray(bge) && bge.length === 5 && int(bge[0], 0, 1e9) && int(bge[1], 0, 99) && int(bge[2], 0, 1) && int(bge[3], 0, 9) && typeof bge[4] === 'string') {
        if (bge[0] !== GM.ev[0]) {
          const fresh = GM.ev[0] !== 0 || prevPh !== 0;
          GM.ev = bge.slice();
          if (fresh) showEvent(bge[1], bge[2], bge[3], bge[4].slice(0, 40));
        }
      }
      state.dirtyBoard = true;
    }
    function gameRead(rec, pres, st) {
      const iAmHost = gameHost();
      if (iAmHost) {
        if (Array.isArray(pres.bgr) && pres.bgr.join() !== st.lastBgr) { st.lastBgr = pres.bgr.join(); hostRequest(pres.bgr); }
        if (rec.peer === GM.order[GM.bi] && Array.isArray(pres.bga)) {
          for (const e of pres.bga.slice(-4)) {
            if (!Array.isArray(e) || e.length !== 2 || !int(e[0], 0, 1e9) || !int(e[1], 1, 21)) continue;
            if (e[0] <= (st.bgaSeq || 0)) continue;
            st.bgaSeq = e[0];
            if (st.bgaInit) hostPitchEvent(e[1]);
          }
          st.bgaInit = true;
        } else if (!Array.isArray(pres.bga)) st.bgaInit = true;
        else if (Array.isArray(pres.bga) && pres.bga.length) { st.bgaSeq = Math.max(st.bgaSeq || 0, ...pres.bga.map((e) => (Array.isArray(e) && int(e[0], 0, 1e9) ? e[0] : 0))); st.bgaInit = true; }
      } else {
        if (rec.peer === herePeers()[0] && pres.bg) { applyHostGame(pres.bg, pres.bgo, pres.bge); if (Array.isArray(pres.bgd) && (pres.bgd[0] === 0 || pres.bgd[0] === 1) && GM.def !== pres.bgd[0]) { GM.def = pres.bgd[0]; state.hudDirty = true; } }
        if (Array.isArray(pres.bga) && pres.bga.length) { st.bgaSeq = Math.max(st.bgaSeq || 0, ...pres.bga.map((e) => (Array.isArray(e) && int(e[0], 0, 1e9) ? e[0] : 0))); st.bgaInit = true; }
      }
      // fielders as the current batter's page sees them
      if (rec.peer === GM.order[GM.bi] || (GM.ph === 1 && Array.isArray(pres.bgf)) || (GM.ph === 2 && GM.def && rec.peer === herePeers()[0])) {
        const f = pres.bgf;
        fieldNet = Array.isArray(f) && f.length === 19 && f.slice(0, 18).every((x) => finite(x) && Math.abs(x) < 200) && int(f[18], -1, 8) && rec.peer !== state.myPeer && !GAME_PLAY.active ? f.slice() : null;
      }
    }

    // ---------------------------------------------------------------- the scoreboard during a game
    function drawGameBoard() {
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#123524'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left'; g.fillStyle = '#ffd23f'; g.font = `800 52px ${DISPLAY}`;
      g.fillText(GM.ph === 3 ? 'Final' : `${GM.ph === 1 ? 'Top' : 'Bottom'} of the ${['1st', '2nd', '3rd'][GM.inn - 1]}`, 36, 72);
      const cols = [330, 400, 470], RX = 570, HX = 640;
      g.font = `700 26px ${BODY}`; g.fillStyle = '#b9d8c4'; g.textAlign = 'center';
      cols.forEach((x, i) => g.fillText(String(i + 1), x, 124));
      g.fillText('R', RX, 124); g.fillText('H', HX, 124);
      // the Sluggers skip the bottom of the last inning when they are already ahead
      const skipped = (team, inn) => team === 1 && inn === INNINGS && GM.ph === 3 && GM.r[1] > GM.r[0] && GM.line[1][INNINGS - 1] === 0;
      const played = (team, inn) => (GM.ph === 3 ? !skipped(team, inn) : inn < GM.inn || (inn === GM.inn && (team === 0 || GM.ph === 2)));
      const rowsT = [['You', 0], ['Sluggers', 1]];
      rowsT.forEach(([name, team], k) => {
        const y = 176 + k * 58;
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(26, y - 40, W - 52, 52);
        g.textAlign = 'left'; g.fillStyle = team ? '#ff8a96' : '#8ad8ff'; g.font = `800 34px ${DISPLAY}`;
        g.fillText(name, 40, y);
        g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = `700 32px ${BODY}`;
        cols.forEach((x, i) => g.fillText(skipped(team, i + 1) ? 'x' : played(team, i + 1) ? String(GM.line[team][i]) : '\u2013', x, y));
        g.fillStyle = '#ffd23f'; g.fillText(String(GM.r[team]), RX, y);
        g.fillStyle = '#ffffff'; g.fillText(String(GM.h[team]), HX, y);
      });
      // count, outs, and runners
      const dot = (x, y, on, col) => { g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fillStyle = on ? col : 'rgba(255,255,255,0.15)'; g.fill(); };
      g.textAlign = 'left'; g.font = `700 26px ${BODY}`; g.fillStyle = '#b9d8c4';
      const lines = [['Balls', GM.b, 3, '#8bd450'], ['Strikes', GM.s, 2, '#ffb020'], ['Outs', GM.outs, 2, '#ff5c6a']];
      lines.forEach(([label, n, max, col], k) => {
        const y = 314 + k * 40;
        g.fillStyle = '#b9d8c4'; g.fillText(label, 40, y + 9);
        for (let i = 0; i < max; i++) dot(170 + i * 32, y, i < n, col);
      });
      const dx = 520, dy = 350;
      const diamond = (x, y, on) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,0.15)'; g.fillRect(-15, -15, 30, 30); g.restore(); };
      diamond(dx + 52, dy, GM.bases[0]); diamond(dx, dy - 52, GM.bases[1]); diamond(dx - 52, dy, GM.bases[2]);
      g.save(); g.translate(dx, dy + 52); g.rotate(Math.PI / 4); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 3; g.strokeRect(-12, -12, 24, 24); g.restore();
      g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = `400 24px ${BODY}`;
      const up = GM.ph === 1 ? `At bat: ${nameOf(GM.order[GM.bi])}` : GM.ph === 2 ? 'The Sluggers are batting' : GM.r[0] > GM.r[1] ? 'You win!' : GM.r[0] < GM.r[1] ? 'The Sluggers win' : 'Tie game';
      g.fillText(up, W / 2, H - 24, W - 60);
      L.board.tex.needsUpdate = true;
    }

    // a button by home plate to start or end a game
    makeButton(L, new V3(-1.38, 1.0, 4.3), 0x4fc3f7, 'Play ball!', () => gameRequest(gameOn() ? 0 : 1), { faceYaw: Math.PI });
    makeButton(L, new V3(-2.06, 1.0, 4.3), 0xff5c6a, 'End game', () => { if (gameOn()) gameRequest(2); }, { faceYaw: Math.PI });
    makeButton(L, new V3(-2.74, 1.0, 4.3), 0x8bd450, 'Defense', () => gameRequest(GM.def ? 4 : 3), { faceYaw: Math.PI });
    L.gameInternals = { hostPitchEvent, cpuPA, startGame, FIELDERS, EV, gameRequest, hit, walk, infieldPlay, groundAdvance, doublePlay, fieldersChoice };


    // ================================================================ DEFENSE: take the field while the Sluggers bat
    // The host pitches to the Sluggers' batter, who takes, fouls, misses or puts the ball in play for real.
    // Players stand in for fielders (shortstop first, then center, second, third, left, right).
    // Catch a fly before it lands for an out; field a grounder and get it to first before the runner.
    const DEF = { started: false, pitchT: 0, pitch: null, play: null };
    L.def = DEF;
    const HUMAN_SPOTS = [4, 7, 3, 5, 6, 8];
    const SPOT_NAMES = { 3: 'second base', 4: 'shortstop', 5: 'third base', 6: 'left field', 7: 'center field', 8: 'right field' };
    const FIRST_GLOVE = new V3(19.0, 1.1, -19.8);
    const SECOND_GLOVE = new V3(0.5, 1.1, -38.2);   // the bag at second, glove side toward home
    const forceAtSecond = () => GM.bases[0] === 1 && GM.outs < 2;
    const HOME_SPOT = new V3(-3.4, 0, 2.6);   // beside home plate, by the bat rack, where you start
    const defenseNow = () => GM.ph === 2 && GM.def === 1;
    const rad = (d) => (d * Math.PI) / 180;
    function humansHeads() {
      const out = [];
      if (state.mode !== 'menu' && state.level === L.idx) out.push({ peer: state.myPeer, pos: myHead.pos });
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame && rec.hasH) out.push({ peer: rec.peer, pos: rec.cur.h.pos });
      return out;
    }
    // the Sluggers' count, outs and runs, as the host sees it
    function hostCpuEvent(code, who) {
      if (GM.ph !== 2) return;
      const next = () => { GM.b = 0; GM.s = 0; };
      if (code === EV.BALL) {
        GM.b += 1;
        if (GM.b >= 4) { announce(EV.WALK, 1, walk(1)); next(); } else announce(code, 1);
      } else if (code === EV.STRIKE_LOOK || code === EV.STRIKE_SWING) {
        GM.s += 1;
        if (GM.s >= 3) { announce(EV.K, 1); next(); GM.outs += 1; if (GM.outs >= 3) endHalf(); } else announce(code, 1);
      } else if (code === EV.FOUL) { if (GM.s < 2) GM.s += 1; announce(code, 1); }
      else if (code === EV.OUT_FLY || code === EV.OUT_LINE) { announce(code, 1, 0, who); next(); GM.outs += 1; if (GM.outs >= 3) endHalf(); }
      else if (code === EV.OUT_GROUND) { GM.outs += 1; const runs = GM.outs < 3 ? groundAdvance() : 0; score(1, runs); announce(code, 1, runs, who); next(); if (GM.outs >= 3) endHalf(); }
      else if (code === EV.DP || code === EV.FC) { const runs = code === EV.DP ? doublePlay(1) : fieldersChoice(1); announce(code, 1, runs, who); next(); if (GM.outs >= 3) endHalf(); }
      else if (HIT_BASES[code]) { announce(code, 1, hit(1, HIT_BASES[code])); next(); }
      if (GM.ph === 2 && GM.inn >= INNINGS && GM.r[1] > GM.r[0]) finish();
      changed();
    }
    function freeBall() {
      let pick = null, best = -1;
      for (const b of L.bodies) {
        if (b.held) continue;
        if (b.owner && b.owner !== state.myPeer && !b.sleeping) continue;
        const sc = (b.sleeping ? 2 : 0) + (b.pos.distanceTo(HOPPER) < 1.2 ? 1 : 0) + (b.vel.lengthSq() < 0.25 ? 0.5 : 0);
        if (sc > best) { best = sc; pick = b; }
      }
      return pick;
    }
    function launch(b, pos, vel, data) {
      b.v += 1; b.owner = state.myPeer; b.held = null;
      b.pos.copy(pos); b.vel.copy(vel);
      b.sleeping = false; b.restT = 0; b.idleT = 0; b.corr.set(0, 0, 0);
      b.data = data;
      forcePresence();
    }
    function defensePitch(now) {
      const b = freeBall();
      if (!b) return;
      const target = new V3((rand() - 0.5) * 0.42, 0.52 + rand() * 0.62, 0.15);
      const T = target.distanceTo(RELEASE) / PITCH_SPEED;
      const vel = target.clone().sub(RELEASE).divideScalar(T);
      vel.y += 0.5 * GRAVITY * T;
      launch(b, RELEASE, vel, { pitched: true });
      DEF.pitch = { ball: b, t0: now, decided: false };
      sfx('thump', 0.9 / (1 + RELEASE.distanceTo(myHead.pos) * 0.05));
    }
    // what the Sluggers' batter does with a pitch
    function swingAt(now) {
      const p = DEF.pitch, b = p.ball;
      p.decided = true;
      const r = rand();
      if (r < 0.31) { hostCpuEvent(EV.BALL); return; }
      if (r < 0.45) { hostCpuEvent(EV.STRIKE_LOOK); return; }
      cpuSwingT = now;
      if (r < 0.57) { hostCpuEvent(EV.STRIKE_SWING); return; }
      sfx('bat', 0.8);
      if (r < 0.71) {
        // fouled off into the stands
        const side = rand() < 0.5 ? -1 : 1;
        launch(b, new V3(0, 0.9, 0.2), new V3(side * (9 + rand() * 6), 9 + rand() * 6, 3 + rand() * 6), { batted: true, hitFrom: new V3(0, 0.9, 0.2), landed: false, hr: false });
        hostCpuEvent(EV.FOUL);
        return;
      }
      // in play: a grounder, a liner, a fly, or a pop-up, sprayed around the field
      const k = rand();
      const [la0, la1, s0, s1] = k < 0.42 ? [-6, 6, 22, 31] : k < 0.67 ? [10, 20, 27, 35] : k < 0.94 ? [25, 40, 25, 33] : [55, 68, 17, 22];
      const la = rad(lerp(la0, la1, rand())), sp = lerp(s0, s1, rand()), spray = (rand() - 0.5) * 2 * rad(43);
      const from = new V3(0, 0.9, 0.2);
      launch(b, from, new V3(Math.sin(spray) * Math.cos(la) * sp, Math.sin(la) * sp, -Math.cos(spray) * Math.cos(la) * sp), { batted: true, hitFrom: from.clone(), landed: false, hr: false });
      DEF.play = { ball: b, t0: now, landed: false, judged: false, landT: 0, result: 0, endT: 0, fielder: null, tf: 0, chaser: -1 };
      DEF.pitch = null;
    }
    function endDefense(code, glove, now, who) {
      const P = DEF.play;
      P.result = code;
      P.endT = now + 1600;
      if (glove >= 0) { FIELDERS[glove].held.visible = true; sfx('mitt', 0.7); if (!P.ball.held) reclaimToSlot(P.ball); }
      hostCpuEvent(code, who);
    }
    const _dt = new V3();
    function stepDefense(now) {
      const P = DEF.play, b = P.ball, t = (now - P.t0) / 1000, dd = b.data || {};
      if (P.result) {
        if (now > P.endT) { DEF.play = null; DEF.pitchT = now + 2800; for (const f of FIELDERS) { f.tx = f.sx; f.tz = f.sz; f.held.visible = false; } }
        return;
      }
      const holder = b.held ? b.held.peer : null;
      if (holder) {
        // a player caught it on the fly, or picked it up
        if (!P.landed && P.fielder === null) { endDefense(EV.OUT_FLY, -1, now, nameOf(holder)); return; }
        // picked up before it reached the bag: fair or foul is decided right where you touched it
        if (P.landed && !P.judged && P.fielder === null) { P.judged = true; if (!fair(b.pos.x, b.pos.z)) { endDefense(EV.FOUL, -1, now); return; } }
        if (P.fielder === null) {
          P.fielder = holder; P.tf = t;
          if (Math.hypot(b.pos.x, b.pos.z) > 36) {
            const deep = Math.hypot(b.pos.x, b.pos.z) > 48;
            endDefense(t > 6.5 ? EV.TRIPLE : t > 3.2 || deep ? EV.DOUBLE : EV.SINGLE, -1, now);
            return;
          }
        }
      }
      // fair or foul: judged where it lands if that's past first or third, otherwise where it passes the bag, stops, or is touched
      if (!P.landed && b.pos.y < 0.25 && t > 0.2 && !holder) {
        P.landed = true; P.landT = t;
        if (Math.hypot(b.pos.x, b.pos.z) > BASE_D) { P.judged = true; if (!fair(b.pos.x, b.pos.z)) { endDefense(EV.FOUL, -1, now); return; } }
      }
      if (P.landed && !P.judged && (Math.hypot(b.pos.x, b.pos.z) > BASE_D || Math.hypot(b.vel.x, b.vel.z) < 0.3 || holder)) {
        P.judged = true;
        if (!fair(b.pos.x, b.pos.z)) { endDefense(EV.FOUL, -1, now); return; }
      }
      if (dd.hr || (!P.landed && Math.hypot(b.pos.x, b.pos.z) > FENCE_R + 1 && fair(b.pos.x, b.pos.z))) { endDefense(EV.HR, -1, now); return; }
      if (!P.landed && b.pos.z > 3.5) { endDefense(EV.FOUL, -1, now); return; }
      // a player fielded it: the first baseman covers the bag; beat the runner there
      if (P.fielder !== null) {
        const fb = FIELDERS[2];
        if (!fb.human) { fb.tx = FIRST_GLOVE.x; fb.tz = FIRST_GLOVE.z; }
        // with a force at second, the other middle infielder covers the bag
        if (forceAtSecond()) {
          const cover = !FIELDERS[3].human && !FIELDERS[4].human ? (b.pos.x > 0 ? 4 : 3) : FIELDERS[3].human ? 4 : 3;
          P.cover = cover;
          FIELDERS[cover].tx = SECOND_GLOVE.x; FIELDERS[cover].tz = SECOND_GLOVE.z;
          // your throw beats the runner to second: force out, then the pivot and relay to first
          if (!holder && b.pos.distanceTo(SECOND_GLOVE) < 1.9) {
            if (t < 3.6) {
              const code = t + 1.28 < 4.7 ? EV.DP : EV.FC;
              const m = new THREE.Mesh(sph(0.045, 8, 6), ballMat);
              G.add(m);
              arcs.push({ m, from: SECOND_GLOVE.clone(), end: FIRST_GLOVE.clone(), t0: now + 250, dur: 900, h: 0.6 });
              endDefense(code, cover, now, nameOf(P.fielder));
            } else endDefense(EV.SINGLE, -1, now);
            return;
          }
        }
        if (!holder && b.pos.distanceTo(FIRST_GLOVE) < 1.9) { endDefense(t < 4.6 ? EV.OUT_GROUND : EV.SINGLE, fb.human ? -1 : 2, now, nameOf(P.fielder)); return; }
        if (t > 4.6) { endDefense(EV.SINGLE, -1, now); return; }
        return;
      }
      // computer teammates go for it, unless a player is closer (they back you up if you leave it lying)
      const target = P.landed ? _dt.copy(b.pos).addScaledVector(b.vel, 0.35) : landingPoint(b);
      let dc = Infinity;
      for (const f of FIELDERS) if (!f.human) dc = Math.min(dc, Math.hypot(f.x - target.x, f.z - target.z));
      let yours = false;
      const sp2 = Math.hypot(b.vel.x, b.vel.z) || 1, ux = b.vel.x / sp2, uz = b.vel.z / sp2;
      for (const h of humansHeads()) {
        if (!P.landed) { if (Math.hypot(h.pos.x - target.x, h.pos.z - target.z) < 7) yours = true; }
        else {
          const rx = h.pos.x - b.pos.x, rz = h.pos.z - b.pos.z, along = rx * ux + rz * uz, off = Math.abs(rx * uz - rz * ux);
          if ((along > -0.5 && along < 32 && off < 3.5) || Math.hypot(rx, rz) < 3) yours = true;
        }
      }
      const leaveIt = yours && !(P.landed && t - P.landT > 2.5) && dc > 0.8;
      for (const f of FIELDERS) { f.tx = f.sx; f.tz = f.sz; }
      if (t > 0.45 && !leaveIt) {
        const cpu = FIELDERS.filter((f) => !f.human);
        if (!P.landed) {
          if (P.chaser < 0 || FIELDERS[P.chaser].human) { let best = Infinity; for (const f of cpu) { const k = Math.hypot(f.x - target.x, f.z - target.z) / f.speed; if (k < best) { best = k; P.chaser = f.i; } } }
          const f = FIELDERS[P.chaser]; f.tx = target.x; f.tz = target.z;
        } else for (const f of cpu.sort((a, c) => Math.hypot(a.x - target.x, a.z - target.z) - Math.hypot(c.x - target.x, c.z - target.z)).slice(0, 2)) { f.tx = target.x; f.tz = target.z; }
      }
      const spd = Math.hypot(b.vel.x, b.vel.z);
      const reach = spd > 24 ? 0.7 : spd > 15 ? 0.55 + (24 - spd) / 30 : 1.0;
      for (const f of FIELDERS) {
        if (f.human || holder) continue;
        const d = Math.hypot(b.pos.x - f.x, b.pos.z - f.z);
        if (!P.landed && d < Math.max(reach, 0.75) && b.pos.y < 2.1 && b.pos.y > 0.15 && !(f.i === 1 && t < 0.6)) { endDefense(t > 1.4 || b.pos.y > 1.7 ? EV.OUT_FLY : EV.OUT_LINE, f.i, now); return; }
        if (P.landed && d < reach && b.pos.y < 1.0) {
          if (!P.judged && !fair(b.pos.x, b.pos.z)) { endDefense(EV.FOUL, -1, now); return; }
          if (f.i <= 5) endDefense(infieldPlay(f, t), f.i, now);
          else { const deep = Math.hypot(b.pos.x, b.pos.z) > 48, corner = deep && Math.abs(Math.atan2(b.pos.x, -b.pos.z)) > 0.6; endDefense(t > 6.5 || (corner && t > 4) ? EV.TRIPLE : t > 3.2 || deep ? EV.DOUBLE : EV.SINGLE, f.i, now); }
          return;
        }
      }
      if (t > 14) endDefense(EV.SINGLE, -1, now);
    }
    let lastDefT = 0;
    function hostDefense(now) {
      const dt = Math.min(0.1, (now - (lastDefT || now)) / 1000);
      lastDefT = now;
      if (!DEF.started) { DEF.started = true; DEF.pitchT = now + 3500; DEF.pitch = null; DEF.play = null; }
      if (!DEF.play && !DEF.pitch && now > DEF.pitchT) defensePitch(now);
      if (DEF.pitch) {
        const b = DEF.pitch.ball;
        if (!DEF.pitch.decided && b.pos.z > -0.6) swingAt(now);
        if (DEF.pitch && DEF.pitch.decided && (b.pos.z > 1.8 || now - DEF.pitch.t0 > 3000 || b.vel.z < 0.5)) { DEF.pitch = null; DEF.pitchT = now + 2600; }
      }
      if (DEF.play) stepDefense(now);
      void dt;
    }
    // ---------------------------------------------------------------- every page: take your position, and help out
    let placed = false;
    const _hd2 = new V3();
    function mySpot() {
      const i = herePeers().indexOf(state.myPeer);
      return i >= 0 ? HUMAN_SPOTS[i % HUMAN_SPOTS.length] : -1;
    }
    function defenseClient() {
      const on = defenseNow();
      const n = herePeers().length;
      FIELDERS.forEach((f) => { f.human = on && HUMAN_SPOTS.slice(0, n).includes(f.i); });
      L.grabRange = on ? 4 : 14;
      if (!on) {
        // back in from the field when the Sluggers' half is over (or the game ends, or defense is switched off)
        if (placed && state.mode !== 'menu' && state.level === L.idx) {
          camera.getWorldPosition(_hd2);
          dolly.position.x += HOME_SPOT.x - _hd2.x;
          dolly.position.z += HOME_SPOT.z - _hd2.z;
          if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.05; }
          if (GM.ph === 1 && GM.order[GM.bi] === state.myPeer) setTimeout(() => showToast('You\u2019re up! Grab a bat'), 1600);
        }
        placed = false;
        if (GM.ph !== 2) { DEF.started = false; DEF.play = null; DEF.pitch = null; }
        return;
      }
      if (!placed && state.mode !== 'menu' && state.level === L.idx) {
        placed = true;
        const s = mySpot();
        if (s >= 0) {
          const [x, z] = SPOTS[s];
          camera.getWorldPosition(_hd2);
          dolly.position.x += x - _hd2.x;
          dolly.position.z += z - _hd2.z;
          if (state.mode !== 'vr') { state.yaw = Math.atan2(x, z); state.pitch = -0.05; }
          showToast(`You\u2019re playing ${SPOT_NAMES[s]}. Catch flies, and throw grounders to first`);
        }
      }
    }
    L.mySpotName = () => SPOT_NAMES[mySpot()] || '';
    // browser: throwing during defense goes straight to the first baseman
    // in the infield with a force at second, the throw goes to second to start a double play; otherwise to first
    const throwTarget = (obj) => (forceAtSecond() && Math.hypot(obj.pos.x, obj.pos.z) < 36 ? SECOND_GLOVE : FIRST_GLOVE);
    L.throwOverride = (obj) => {
      if (!defenseNow()) return null;
      const d = throwTarget(obj).clone().sub(obj.pos), dist = d.length();
      const T = clamp(dist / 26, 0.35, 2.2);
      const v = d.divideScalar(T);
      v.y += 0.5 * GRAVITY * T;
      return v;
    };
    // browser: during defense, E gloves any batted ball within reach, wherever you're aiming
    L.autoGrab = () => {
      if (!defenseNow()) return null;
      let best = null, bd = 2.6;
      for (const b of L.bodies) {
        if (b.held || b.pos.y > 2.4) continue;
        const d = Math.hypot(b.pos.x - myHead.pos.x, b.pos.z - myHead.pos.z);
        if (d < bd) { bd = d; best = b; }
      }
      return best;
    };
    // fielding hints while you're on defense
    const baseHintsFor = L.hintsFor, baseHints = L.hints;
    L.hintsFor = () => (defenseNow() ? [['WASD', 'move'], ['Shift', 'run'], ['E', 'glove a ball near you'], ['Space', forceAtSecond() ? 'throw to second for two' : 'throw to first']] : baseHintsFor ? baseHintsFor() : baseHints);
    L.hudActions.splice(1, 0, { label: () => (GM.def ? 'Defense: on' : 'Defense: off'), run: () => gameRequest(GM.def ? 4 : 3) });
    L.defInternals = { hostCpuEvent, swingAt, defensePitch, HUMAN_SPOTS, FIRST_GLOVE };

    return L;
  })();

