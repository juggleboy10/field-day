  // ================================================================ LEVEL: CLIFFSIDE CLIMB (racing and parkour)
  // A sea cliff in three tiers, 24 metres to the bell at the top. Three lines of holds go up each tier (green close
  // together, blue further apart, red far apart with crumbly holds that break away). You're on an auto-belay: let go and
  // you're lowered gently to the tier below. Ring the bell to stop the clock.
  // VR: grip a hold and pull yourself up. Your grip tires, faster on one hand: touch the chalk bag at your hip to
  // freshen it. Pull your head over a tier's lip to climb onto it. Browser: click a hold in reach to move a hand to it;
  // you climb onto a tier from its top holds. Click the bell (or press E) to ring it.
  const climb = (() => {
    const L = newLevel(56);
    const G = L.group;
    const rand = mulberry32(5656);
    L.grabless = true;
    L.env = {
      sky: skyTexture([[0, '#3a6ab8'], [0.4, '#8ab8e8'], [0.5, '#ffd8a8'], [0.52, '#5a8ab0'], [1, '#2a5a80']]),
      bg: 0x8ab8e0, fog: [0xc8d8e8, 60, 260], hemi: [0xfff0e0, 0x6a5a4a, 0.85],
      sun: [0xffe0b0, 0.7], sunDir: new V3(0.6, 0.6, 0.6), ambient: [0x8a7a6a, 0.35], sprite: { tex: paleSunTex, pos: new V3(160, 120, 160), scale: 50 },
    };
    // the tiers: each face is a plane z = FACE[k], from y BASE[k] up to the lip at BASE[k + 1]
    const FACE = [-0.6, -1.7, -2.8], BASE = [0, 8, 16, 24], W = 4.2, TOP_Z = -3.9;
    const faceAtY = (y) => (y < BASE[1] ? FACE[0] : y < BASE[2] ? FACE[1] : FACE[2]);
    // what's under you at (x, z): the beach, a tier, or the top
    const support = (z) => (z > FACE[0] ? 0 : z > FACE[1] ? BASE[1] : z > FACE[2] ? BASE[2] : BASE[3]);
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: TOP_Z - 0.6, maxZ: 6 };

    // ---------------------------------------------------------------- the cliff
    const rockTex = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#9a8070'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { const v = 110 + Math.floor(rand() * 70); g.fillStyle = `rgba(${v + 20},${v},${v - 15},0.5)`; g.fillRect(rand() * 256, rand() * 256, 2 + rand() * 9, 2 + rand() * 6); }
      g.strokeStyle = 'rgba(60,45,35,0.45)'; g.lineWidth = 2;
      for (let i = 0; i < 14; i++) { g.beginPath(); let x = rand() * 256, y = rand() * 256; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rand() - 0.5) * 50; y += rand() * 40; g.lineTo(x, y); } g.stroke(); }
    }).tex;
    rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;
    const rockM = new THREE.MeshLambertMaterial({ map: rockTex });
    for (let k = 0; k < 3; k++) {
      const h = BASE[k + 1] - BASE[k] + (k === 2 ? 0 : 0);
      const m = addBox(G, 60, h, 1.1, rockM, 0, BASE[k] + h / 2, FACE[k] - 0.55);
      m.material = rockM.clone(); m.material.map = rockTex.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(30, h / 2);
      // the tier's top (the ledge you climb onto)
      addBox(G, 60, 0.3, Math.abs(FACE[k] - (FACE[k + 1] !== undefined ? FACE[k + 1] : TOP_Z - 6)) + 0.1, lam(0x8a7a5a), 0, BASE[k + 1] - 0.15, (FACE[k] + (FACE[k + 1] !== undefined ? FACE[k + 1] : TOP_Z - 6)) / 2);
    }
    // the cliff above the top and the ground
    addBox(G, 60, 0.3, 30, lam(0x6a8a4a), 0, BASE[3] - 0.15, TOP_Z - 15);
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), lam(0xe8d0a0)); beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0, 18); G.add(beach);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), new THREE.MeshLambertMaterial({ color: 0x2a78b0 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.3, 170); G.add(sea);
    // trees on top, a crash pad and a sign at the bottom
    for (let i = 0; i < 20; i++) { const x = (rand() - 0.5) * 50, z = TOP_Z - 3 - rand() * 20; addCyl(G, 0.15, 0.2, 2, 6, lam(0x5a3a1a), x, BASE[3] + 1, z); const c = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 8), lam(0x3a6a3a)); c.position.set(x, BASE[3] + 3, z); G.add(c); }
    addBox(G, 7, 0.25, 1.6, lam(0x3a6ad8), 0, 0.125, 0.4);
    makePlate(G, '\u{1F9D7}  CLIFFSIDE CLIMB', 2.6, 0.4, new V3(-5.4, 1.9, 1.2), 0.5, { bg: '#c86a2a', fg: '#ffffff', size: 0.6 });
    addBox(G, 0.1, 1.9, 0.1, lam(0x5a3a1a), -5.4, 0.95, 1.18);

    // ---------------------------------------------------------------- holds
    const LANES = [{ x: -1.9, col: 0x3ac84a, gap: 0.5, name: 'Green' }, { x: 0, col: 0x3a8ad8, gap: 0.68, name: 'Blue' }, { x: 1.9, col: 0xe8403a, gap: 0.86, name: 'Red', crumbly: 0.3 }];
    const HOLDS = [];
    const holdGeo = new THREE.SphereGeometry(1, 10, 8);
    LANES.forEach((ln, li) => {
      for (let k = 0; k < 3; k++) {
        let y = BASE[k] + (k === 0 ? 1.1 : 0.9), side = 1;
        const lip = BASE[k + 1];
        while (y < lip - 0.35) {
          const x = ln.x + side * (0.18 + rand() * 0.22); side = -side;
          addHold(x, y, k, li, ln.crumbly && rand() < ln.crumbly && y > BASE[k] + 1.5);
          y += ln.gap * (0.85 + rand() * 0.3);
        }
        addHold(ln.x - 0.25, lip - 0.22, k, li, false, true); addHold(ln.x + 0.25, lip - 0.22, k, li, false, true);   // the lip holds
      }
    });
    function addHold(x, y, k, li, crumbly, top) {
      const r = 0.055 + rand() * 0.03, col = crumbly ? 0x8a6a4a : LANES[li].col;
      const m = new THREE.Mesh(holdGeo, new THREE.MeshLambertMaterial({ color: col, emissive: 0x000000 }));
      m.scale.set(r * 1.4, r, r * 0.8); m.position.set(x, y, FACE[k] + r * 0.5); m.rotation.z = (rand() - 0.5) * 1.2; G.add(m);
      if (crumbly) { const c = new THREE.Mesh(new THREE.BoxGeometry(r * 2.2, 0.006, 0.02), lam(0x2a1a0a)); c.position.set(x, y, FACE[k] + r * 1.25); c.rotation.z = 0.6; G.add(c); }
      HOLDS.push({ m, p: m.position.clone(), r, k, li, crumbly: !!crumbly, top: !!top, gone: false, held: 0 });
    }
    // the bell at the top
    const bell = new THREE.Group(); bell.position.set(0, BASE[3] + 1.8, TOP_Z + 0.4); G.add(bell);
    { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 0.34, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x4a3a00, side: THREE.DoubleSide })); bell.add(cup);
      addBox(G, 0.08, 1.8, 0.08, lam(0x5a3a1a), -0.6, BASE[3] + 0.9, TOP_Z + 0.4); addBox(G, 0.08, 1.8, 0.08, lam(0x5a3a1a), 0.6, BASE[3] + 0.9, TOP_Z + 0.4); addBox(G, 1.3, 0.08, 0.08, lam(0x5a3a1a), 0, BASE[3] + 2.0, TOP_Z + 0.4); }
    // a big height marker on the side
    for (let m = 4; m <= 24; m += 4) makePlate(G, `${m} m`, 0.6, 0.24, new V3(-W - 0.2, m, faceAtY(m - 0.1) + 0.02), 0, { bg: '#ffffff', fg: '#3a2a1a', size: 0.7 });

    // ---------------------------------------------------------------- your climb
    const P = { mantle: null, hand: { left: { hold: null, anchor: new V3(), stam: 1, wait: 0 }, right: { hold: null, anchor: new V3(), stam: 1, wait: 0 } }, vy: 0, ph: 'ground', t0: 0, time: 0, best: 0, top: 0, flat: { left: null, right: null, next: 'right', body: new V3() } };
    try { if (Number.isFinite(prefs.climbBest)) P.best = prefs.climbBest; } catch (e) { /* none */ }
    L.climbP = P;
    const _h = new V3(), _d = new V3(), _a = new V3(), _q = new Q4();
    const anyHold = () => !!(P.hand.left.hold || P.hand.right.hold || P.flat.left || P.flat.right);
    function startClock() { if (P.ph === 'ground' && dolly.position.y < 0.5) { P.ph = 'climb'; P.t0 = performance.now(); forcePresence(); } }
    function ringBell() {
      if (P.ph !== 'climb') { sfx('chime', 0.6); return; }
      P.ph = 'done'; P.time = (performance.now() - P.t0) / 1000;
      const isBest = !P.best || P.time < P.best;
      if (isBest) { P.best = P.time; prefs.climbBest = P.best; savePrefs(); }
      RECORDS.add(L, 'top', P.time);
      for (let i = 0; i < 4; i++) tone(1320, 1320, 1.2, 'sine', 0.2, i * 0.35);
      sfx('fanfare', 0.8);
      showToast(`DING! The top in ${fmt(P.time)}${isBest ? ' (your best!)' : ''}. Press Climb again to go back down`);
      state.hudDirty = true;
      bell.userData.ring = 1;
      forcePresence(); state.dirtyBoard = true;
    }
    L.ringBell = ringBell;
    const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
    function backToStart() {
      for (const s of SIDES) { P.hand[s].hold = null; P.flat[s] = null; }
      dolly.position.set(0, 0, state.mode === 'vr' ? 0.6 : 1.3); P.vy = 0; P.ph = 'ground';
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0.35; }
      for (const h of HOLDS) if (h.gone) { h.gone = false; h.m.visible = true; h.held = 0; }
      P.mantle = null;
      forcePresence(); state.hudDirty = true;
    }
    L.backToStart = backToStart;
    // climb onto the tier above a lip hold: you end up standing on it
    function mantle(k) {
      const lipY = BASE[k + 1], z = (FACE[k] + (FACE[k + 1] !== undefined ? FACE[k + 1] : TOP_Z)) / 2;
      camera.getWorldPosition(_h);
      for (const s of SIDES) { P.hand[s].hold = null; P.hand[s].wait = 0.9; P.flat[s] = null; }
      // a smooth haul up over the lip (no jump cut): up first, then forward onto the ledge
      P.mantle = { t: 0, T: 0.75, fy: dolly.position.y, fz: dolly.position.z, ty: lipY, tz: dolly.position.z + (z - _h.z), k };
      P.vy = 0; sfx('whoosh', 0.4);
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.4, 80);
    }
    function mantleStep(dt) {
      const m = P.mantle; m.t += dt;
      const u = Math.min(1, m.t / m.T), up = Math.min(1, u / 0.6), fw = clamp((u - 0.35) / 0.65, 0, 1);
      const e = (x) => x * x * (3 - 2 * x);
      dolly.position.y = m.fy + (m.ty - m.fy) * e(up);
      dolly.position.z = m.fz + (m.tz - m.fz) * e(fw);
      if (u >= 1) { P.mantle = null; showToast(m.k < 2 ? `Tier ${m.k + 2}: ${BASE[m.k + 1]} m up` : 'The top! Ring the bell'); }
    }
    // the hold nearest a point (within reach)
    function holdNear(p, reach) {
      let best = null, bd = reach;
      for (const h of HOLDS) { if (h.gone) continue; const d = h.p.distanceTo(p) - h.r; if (d < bd) { bd = d; best = h; } }
      return best;
    }
    // ---------------------------------------------------------------- VR
    function vrClimb(dt) {
      const deltas = [];
      for (const side of SIDES) {
        const mh = myHands[side], H = P.hand[side], gp = vrHands[side].source && vrHands[side].source.gamepad;
        const grip = !!(gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed);
        H.wait = Math.max(0, H.wait - dt);
        if (!mh.ok || !grip) { if (H.hold) H.hold.held = 0; H.hold = null; H.stam = Math.min(1, H.stam + dt * 0.25); continue; }
        if (!H.hold && H.wait <= 0 && H.stam > 0.25) {
          const h = holdNear(mh.pos, 0.09);
          if (h) { H.hold = h; H.anchor.copy(mh.pos); haptic(vrHands[side], 0.5, 35); sfx('click', 0.5); startClock(); }
        }
        if (H.hold) {
          if (H.hold.gone) { H.hold = null; continue; }
          deltas.push(_d.copy(H.anchor).sub(mh.pos).clone());
        }
      }
      // tiring: one hand tires fast, two slowly
      const n = deltas.length;
      for (const side of SIDES) {
        const H = P.hand[side];
        if (!H.hold) continue;
        H.stam -= dt * (n === 1 ? 0.075 : 0.022);
        H.hold.held += dt;
        if (H.hold.crumbly && H.hold.held > 1.3) { crumble(H.hold); H.hold = null; continue; }
        if (H.stam <= 0) { H.stam = 0; H.hold = null; H.wait = 0.6; haptic(vrHands[side], 1, 120); showToast('Your grip gave out: chalk up (hand to your hip)'); }
      }
      // chalk: a hand by your hip freshens up
      for (const side of SIDES) {
        const mh = myHands[side], H = P.hand[side];
        if (!mh.ok || H.hold) continue;
        const hip = _a.set(side === 'left' ? -0.18 : 0.18, -0.72, 0).applyQuaternion(_q.setFromAxisAngle(_d.set(0, 1, 0), Math.atan2(-camF.x, -camF.z))).add(myHead.pos);
        if (mh.pos.distanceTo(hip) < 0.16 && H.stam < 0.98) { H.stam = 1; puff(mh.pos); haptic(vrHands[side], 0.3, 40); }
      }
      if (!n) return false;
      const d = new V3(); for (const x of deltas) d.add(x); d.multiplyScalar(1 / n);
      dolly.position.add(d);
      // over a lip: climb onto the tier
      camera.getWorldPosition(_h);
      for (const side of SIDES) { const h = P.hand[side].hold; if (h && h.top && _h.y > BASE[h.k + 1] + 0.05) { mantle(h.k); return false; } }
      return true;
    }
    const camF = new V3();
    // chalk dust
    const dust = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffffff, transparent: true, depthWrite: false })); dust.visible = false; L.overlay.add(dust);
    function puff(p) { dust.position.copy(p); dust.scale.setScalar(0.25); dust.visible = true; dust.userData.t = 0; noiseBurst(0.15, 0.12, 3000, 0.6); }
    function crumble(h) {
      h.gone = true; h.m.visible = false; h.held = 0;
      sfx('slam', 0.4); noiseBurst(0.3, 0.3, 900, 0.8);
      showToast('Crumbly hold! It broke away');
    }
    // grip meters: a little ring on each wrist, green to red
    const meters = {};
    for (const s of SIDES) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 20), new THREE.MeshBasicMaterial({ color: 0x8bd450 })); m.visible = false; L.overlay.add(m); meters[s] = m; }
    // ---------------------------------------------------------------- the browser
    const FLAT_REACH = 1.45;
    const flatBodyFor = () => {
      const f = P.flat, a = f.left ? f.left.p : null, b = f.right ? f.right.p : null;
      const m = a && b ? _a.copy(a).add(b).multiplyScalar(0.5) : _a.copy(a || b);
      const k = (f.left || f.right).k;
      const top = Math.max(a ? a.y : -1e9, b ? b.y : -1e9);
      return new V3(m.x, Math.max(top - 0.3, BASE[k] + 1.6), FACE[k] + 0.55);   // the eyes: a little below the hands, out from the wall (and never below standing height)
    };
    function flatAimHold() {
      camera.getWorldPosition(_h); camera.getWorldQuaternion(_q); _d.set(0, 0, -1).applyQuaternion(_q);
      let best = null, bd = 0.12;
      for (const h of HOLDS) {
        if (h.gone) continue;
        _a.subVectors(h.p, _h); const along = _a.dot(_d); if (along < 0.2 || along > 4) continue;
        const off = _a.addScaledVector(_d, -along).length() / along;
        if (off < bd) { bd = off; best = h; }
      }
      return best;
    }
    function flatReach(h) {
      camera.getWorldPosition(_h);
      if (h.p.distanceTo(_h) > FLAT_REACH + (anyHold() ? 0 : 0.8)) { showToast('Too far: reach for one closer'); return false; }
      const f = P.flat, side = !f.left ? 'left' : !f.right ? 'right' : f.next;
      if (f[side]) f[side].held = 0;
      f[side] = h; f.next = side === 'left' ? 'right' : 'left';
      sfx('click', 0.5); startClock();
      if (h.top) { mantle(h.k); return true; }
      return true;
    }
    L.flatReach = (i) => flatReach(HOLDS[i]);
    L.deskFire = () => {
      // the bell, if you're up there
      camera.getWorldPosition(_h);
      if (_h.y > BASE[3] && _h.distanceTo(bell.position) < 2.5) { ringBell(); return; }
      const h = flatAimHold();
      if (h) flatReach(h);
    };
    L.onE = () => { L.deskFire(); return true; };
    L.onKey = (code) => { if (code === 'KeyR') { backToStart(); return true; } return false; };
    L.throwLabel = () => 'Reach';
    // while you hang in the browser, the view is yours to turn but your body stays on the wall
    L.flatCamera = () => {
      if (!(P.flat.left || P.flat.right)) return false;
      camera.position.set(0, 1.6, 0); camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
      return true;
    };
    // ---------------------------------------------------------------- per frame
    const hiM = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); hiM.visible = false; G.add(hiM);
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { hiM.visible = false; for (const s of SIDES) meters[s].visible = false; return; }
      camera.getWorldDirection(camF);
      let hanging = false;
      if (P.mantle) { mantleStep(dt); hanging = true; }
      else if (state.mode === 'vr') hanging = vrClimb(dt);
      else if (P.flat.left || P.flat.right) {
        // crumbly holds go in the browser too
        for (const s of SIDES) { const h = P.flat[s]; if (!h) continue; h.held += dt; if (h.crumbly && h.held > 1.6) { crumble(h); P.flat[s] = null; } }
        if (P.flat.left || P.flat.right) {
          const target = flatBodyFor();
          camera.getWorldPosition(_h);
          const k = Math.min(1, dt * 6);
          dolly.position.x += (target.x - _h.x) * k; dolly.position.z += (target.z - _h.z) * k; dolly.position.y += (target.y - _h.y) * k;
          hanging = true;
        }
      }
      // let go: the auto-belay lowers you to whatever's below
      if (!hanging) {
        camera.getWorldPosition(_h);
        const floor = support(_h.z);
        if (dolly.position.y > floor + 0.005) { P.vy = Math.max(-3.2, P.vy - 9.8 * dt); dolly.position.y = Math.max(floor, dolly.position.y + P.vy * dt); if (dolly.position.y === floor) { P.vy = 0; sfx('floor', 0.4); } }
        else { dolly.position.y = floor; P.vy = 0; }
      } else { P.vy = 0; camera.getWorldPosition(_h); const fl = support(_h.z); if (dolly.position.y < fl) dolly.position.y = fl; }
      // keep your head out of the rock
      camera.getWorldPosition(_h);
      const fz = faceAtY(_h.y - 0.3) + 0.18;
      if (_h.z < fz && dolly.position.y < BASE[3] - 0.5) dolly.position.z += fz - _h.z;
      // VR: the grip meters, and the bell
      for (const s of SIDES) {
        const m = meters[s], mh = myHands[s];
        m.visible = state.mode === 'vr' && mh.ok && (P.hand[s].stam < 0.99 || !!P.hand[s].hold);
        if (m.visible) { m.position.copy(mh.pos).add(_a.set(0, 0, 0.06).applyQuaternion(mh.quat)); m.quaternion.copy(mh.quat); const st = P.hand[s].stam; m.material.color.setRGB(1 - st * 0.6, 0.3 + st * 0.6, 0.25); }
        if (state.mode === 'vr' && mh.ok && mh.pos.distanceTo(bell.position) < 0.35) ringBell();
      }
      if (dust.visible) { dust.userData.t += dt; dust.scale.setScalar(0.25 + dust.userData.t * 0.8); dust.material.opacity = 1 - dust.userData.t / 0.6; if (dust.userData.t > 0.6) dust.visible = false; }
      if (bell.userData.ring > 0) { bell.userData.ring = Math.max(0, bell.userData.ring - dt * 0.5); bell.rotation.z = Math.sin(now / 60) * 0.4 * bell.userData.ring; }
      // the browser: show which hold you're aiming at, green if it's in reach
      if (state.mode === 'flat') {
        const h = flatAimHold();
        hiM.visible = !!h;
        if (h) { camera.getWorldPosition(_h); hiM.position.copy(h.p).add(_a.set(0, 0, 0.05)); hiM.material.color.setHex(h.p.distanceTo(_h) <= FLAT_REACH + (anyHold() ? 0 : 0.8) ? 0x8bd450 : 0xff6a5a); }
      } else hiM.visible = false;
      P.top = Math.max(P.top, dolly.position.y);
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const t = P.ph === 'climb' ? fmt((performance.now() - P.t0) / 1000) : P.ph === 'done' ? `done in ${fmt(P.time)}` : 'click a hold to start';
        const txt = `Cliffside Climb  ·  ${dolly.position.y.toFixed(1)} m  ·  ${t}  ·  click a hold in reach (green ring)  ·  R: back to the bottom`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.clampPlayer = (p) => {
      const m = 0.3, z = clamp(p.z, L.bounds.minZ + m, L.bounds.maxZ - m), x = clamp(p.x, L.bounds.minX + m, L.bounds.maxX - m);
      // (the rock face is handled in update; the top is a little plateau)
      return [x - p.x, z - p.z];
    };
    L.presence = () => ({ cl: [Math.round(dolly.position.y * 10), Math.round(P.best * 10), P.ph === 'climb' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.cl;
      if (!Array.isArray(a) || a.length !== 3 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) { st.cl = null; return; }
      if (!st.cl || st.cl[1] !== a[1]) state.dirtyBoard = true;
      st.cl = a;
    };
    L.rowFor = (st, isMe) => { const a = isMe ? L.presence().cl : st.cl; if (!a) return { best: 0, text: '' }; return { best: a[1] ? 1e6 - a[1] : 0, text: `${a[2] ? `${(a[0] / 10).toFixed(0)} m up · ` : ''}${a[1] ? `best ${fmt(a[1] / 10)}` : 'not topped yet'}` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, 5.4, 1.9, 1.6, -0.5);
    L.drawBoard = (rows) => {
      const g = L.board.g, Wd = 720;
      g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, Wd, 460); g.strokeStyle = '#ffb04a'; g.lineWidth = 8; g.strokeRect(4, 4, Wd - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffb04a'; g.font = `800 56px ${DISPLAY}`; g.fillText('Summit times', 36, 80);
      g.fillStyle = '#f4e8d8'; g.font = `400 24px ${BODY}`; g.fillText('Fastest from the beach to the bell', 36, 118);
      drawRows(g, rows, 176, 46, Wd);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 3.4, 3.8, -Math.PI * 0.8);
    RECORDS.def(L, [{ k: 'top', label: 'Fastest to the bell', low: true, fmt: 'time' }], { x: -4.4, z: 2.6, yaw: Math.PI * 0.75 });
    L.hudActions = [{ label: () => (P.ph === 'done' ? 'Climb again' : 'Back to the bottom'), run: () => backToStart() }];
    // up top: a button to go again (it takes you back down to the beach)
    makeButton(L, new V3(1.4, BASE[3] + 1.0, TOP_Z + 0.2), 0x3ac84a, 'Climb again', () => backToStart(), { faceYaw: 0 });
    L.hints = [['Grip', 'grab a hold and pull'], ['Hand to hip', 'chalk up when your grip tires'], ['Let go', 'the belay lowers you']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Click a hold', 'reach for it (green ring = in reach)'], ['E', 'ring the bell at the top'], ['R', 'back to the bottom']] : L.hints);
    L.spawn = () => { backToStart(); };
    L.onEnter = () => { P.ph = 'ground'; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; for (const s of SIDES) { P.hand[s].hold = null; P.flat[s] = null; } dolly.position.y = 0; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.4; camera.position.set(Math.sin(a) * 6, 4, 9); camera.lookAt(0, 9, -1); };
    L.climbInternals = { P, HOLDS, BASE, FACE, mantle, ringBell, backToStart, holdNear, flatReach, support, crumble, LANES };
    for (const n of ['D', 'Bm', 'G', 'A']) if (!CH[n]) CH[n] = genChord(n);
    MUSIC_THEMES.climb = { gain: 0.6, bpm: 92, swing: 0.1, chords: ['D', 'Bm', 'G', 'A'], arp: { inst: 'guitar', every: 2, order: [1, 2, 3, 4, 3, 2, 3, 4] }, pad: { inst: 'pad' }, bass: { at: [0, 10] }, drums: { k: 'x.......x.x.....', s: '....x.......x...', sh: '-o-o-o-o-o-o-o-o' }, cut: 3600 };
    return L;
  })();
