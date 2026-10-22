  // ================================================================ MINI GOLF: THE DRIVING RANGE
  // A deck off the side of the pier with a tee mat, hitting out to sea: floating greens at 50 to 250 yards, a yardage
  // buoy every 50. A bucket is ten balls; land on a green for points (more for the far ones, double near the pin).
  // VR: the driver's in your putter hand; hold the trigger and swing through the ball (how hard and which way you swing
  // decides the shot). Browser: hold Space and let go; the best shots come from letting go in the green part of the bar
  // (too long and you hook it). The button by the pier's east rail takes you there; the one on the deck takes you back.
  const drivingrange = ((L) => {
    const G = L.group;
    const rand = mulberry32(6161);
    const YD = 0.9144, KD = 0.0035, KL = 0.0025, GRAV = 9.8, BR = 0.021;
    const DECK = { x: 26, z: -3, w: 8, d: 10 };
    const TEE = new V3(24.2, 0.03, -3);            // the ball sits here; you hit along +x
    const RB = { minX: DECK.x - DECK.w / 2, maxX: DECK.x + DECK.w / 2, minZ: DECK.z - DECK.d / 2, maxZ: DECK.z + DECK.d / 2 };
    const onRange = (x) => x > 16;
    L.onRange = () => onRange(myHead.pos.x);
    // ---------------------------------------------------------------- the deck, the mat, the targets
    const plank = lam(0xb08a5a);
    addBox(G, DECK.w, 0.4, DECK.d, plank, DECK.x, -0.2, DECK.z);
    for (let i = 0; i < 20; i++) addBox(G, DECK.w, 0.004, 0.02, lam(0x8a6a40), DECK.x, 0.002, RB.minZ + i * 0.5);
    for (const [x, z] of [[RB.minX, RB.minZ], [RB.maxX, RB.minZ], [RB.minX, RB.maxZ], [RB.maxX, RB.maxZ]]) addCyl(G, 0.25, 0.25, 1.7, 8, lam(0x6a4a2a), x, -1.15, z);
    const railM = lam(0xffffff);
    for (const z of [RB.minZ, RB.maxZ]) addBox(G, DECK.w, 0.08, 0.08, railM, DECK.x, 1.0, z);
    addBox(G, 0.08, 0.08, DECK.d, railM, RB.minX, 1.0, DECK.z);
    addBox(G, 2.2, 0.02, 1.6, lam(0x3a8a3a), TEE.x, 0.01, TEE.z);   // the mat
    addCyl(G, 0.008, 0.008, 0.03, 6, lam(0xffffff), TEE.x, 0.015, TEE.z);   // the tee
    makePlate(G, '⛳  DRIVING RANGE', 2.4, 0.4, new V3(RB.minX + 0.06, 2.2, DECK.z), Math.PI / 2, { bg: '#2e8a4c', fg: '#ffffff', size: 0.6 });
    addBox(G, 0.1, 2.4, 0.1, lam(0x3a2a1a), RB.minX + 0.02, 1.2, DECK.z - 1.3); addBox(G, 0.1, 2.4, 0.1, lam(0x3a2a1a), RB.minX + 0.02, 1.2, DECK.z + 1.3);
    // floating greens: [yards, radius in m, points, sideways offset]
    const TARGETS = [[50, 7, 1, -6], [100, 9, 2, 8], [150, 11, 3, -10], [200, 13, 4, 6], [250, 15, 5, -4]];
    const flagCol = [0xff4d4d, 0xffd23f, 0x4fc3f7, 0xb388ff, 0xff9a3c];
    const greens = TARGETS.map(([yd, r, pts, off], i) => {
      const x = TEE.x + yd * YD, z = TEE.z + off;
      const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.4, 32), lam(0x4aa84a)); g.position.set(x, -1.45, z); G.add(g);
      const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.3, r * 0.34, 32), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, -1.24, z); G.add(ring);
      addCyl(G, 0.08, 0.08, 4.5, 6, lam(0xffffff), x, 0.95, z);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshLambertMaterial({ color: flagCol[i], side: THREE.DoubleSide })); fl.position.set(x, 2.5, z + 1.2); fl.rotation.y = Math.PI / 2; G.add(fl);
      makePlate(G, `${yd}`, 2.2, 1.1, new V3(x - 0.02, 2.3, z + 1.2), -Math.PI / 2, { bg: '#ffffff', fg: '#1b1932', size: 0.8 });
      return { x, z, r, pts, yd };
    });
    // yardage buoys down the middle
    for (let yd = 50; yd <= 300; yd += 50) { const x = TEE.x + yd * YD; addCyl(G, 0.6, 0.7, 1.4, 10, lam(0xff6a2a), x, -1.1, TEE.z + 18); makePlate(G, `${yd} yd`, 1.8, 0.7, new V3(x - 0.75, -0.2, TEE.z + 18), -Math.PI / 2, { bg: '#ff6a2a', fg: '#ffffff', size: 0.6 }); }
    // the buttons there and back
    makeButton(L, new V3(14.2, 0.95, 7.5), 0x2e8a4c, 'Driving range', () => goRange(), { faceYaw: -Math.PI / 2 });
    makeButton(L, new V3(RB.minX + 0.8, 0.95, RB.maxZ - 0.8), 0xd84a4a, 'Back to golf', () => { L.spawn(); }, { faceYaw: Math.PI / 2 });
    // the scoreboard on the deck
    const sb = canvasTexture(512, 300);
    const sbM = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.05), new THREE.MeshBasicMaterial({ map: sb.tex })); sbM.position.set(TEE.x - 1.2, 1.7, RB.minZ + 0.1); G.add(sbM);
    addBox(G, 1.9, 1.15, 0.05, lam(0x2a2a2a), TEE.x - 1.2, 1.7, RB.minZ + 0.06);
    for (const dx of [-0.8, 0.8]) addCyl(G, 0.03, 0.03, 1.2, 6, lam(0x2a2a2a), TEE.x - 1.2 + dx, 0.6, RB.minZ + 0.08);

    // ---------------------------------------------------------------- the club and the ball
    function makeDriver() {
      const g = new THREE.Group();
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.013, 0.25, 8), lam(0x1b1932)); grip.rotation.x = Math.PI / 2; grip.position.z = -0.08; g.add(grip);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.85, 6), lam(0x2a2a30)); shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.62; g.add(shaft);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), lam(0x1a1a22)); head.scale.set(1.0, 0.55, 0.8); head.position.set(0.03, 0, -1.06); g.add(head);
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.045, 0.07), lam(0xc8ccd6)); face.position.set(0.085, 0, -1.06); g.add(face);
      g.visible = false; L.overlay.add(g);
      return g;
    }
    const club = makeDriver();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(BR, 14, 10), lam(0xffffff)); G.add(ball);
    const trailN = 60, trailPos = new Float32Array(trailN * 3);
    const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); trail.frustumCulled = false; G.add(trail);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.visible = false; G.add(ring);

    // ---------------------------------------------------------------- the bucket
    const R = { st: 'tee', p: new V3(), v: new V3(), left: 10, score: 0, last: null, best: 0, longest: 0, n: 0, t: 0, side: 0 };
    try { if (prefs.range && typeof prefs.range === 'object') { R.best = prefs.range.best | 0; R.longest = prefs.range.longest | 0; } } catch (e) { /* none */ }
    L.range = R;
    function teeUp() { R.st = 'tee'; R.p.copy(TEE).setY(TEE.y + BR + 0.03); R.v.set(0, 0, 0); ball.position.copy(R.p); trailGeo.setDrawRange(0, 0); R.n = 0; }
    teeUp();
    function newBucket() { R.left = 10; R.score = 0; R.last = null; teeUp(); sbKey = ''; showToast('A fresh bucket: ten balls'); }
    L.newBucket = newBucket;
    function goRange() {
      const c = new V3(); camera.getWorldPosition(c);
      if (state.mode === 'vr') { dolly.position.x += TEE.x - c.x; dolly.position.z += TEE.z - 0.7 - c.z; }
      else { dolly.position.x += TEE.x - 2.4 - c.x; dolly.position.z += TEE.z - c.z; state.yaw = -Math.PI / 2; state.pitch = -0.12; }
      if (R.st !== 'tee' && R.st !== 'fly') teeUp();
      sbKey = '';
      showToast(state.mode === 'vr' ? 'Driving range: hold the trigger and swing through the ball' : 'Driving range: hold Space, let go in the green');
    }
    L.goRange = goRange;
    // hit it: speed in m/s, launch angle (radians), and direction (radians off the target line, + is left)
    function launch(speed, loft, dir) {
      if (R.st !== 'tee') return;
      if (R.left <= 0) newBucket();
      const s = clamp(speed, 3, 72);
      R.v.set(Math.cos(loft) * Math.cos(dir) * s, Math.sin(loft) * s, -Math.cos(loft) * Math.sin(dir) * s);
      R.side = clamp(-dir * 0.8, -0.3, 0.3);   // a little curve the way it started (a push fades, a pull draws)
      R.st = 'fly'; R.t = 0; R.n = 0; R.left -= 1;
      tone(1600, 600, 0.06, 'square', 0.25); sfx('whoosh', 0.5);
      forcePresence(); sbKey = '';
    }
    L.driveBall = launch;
    function flyStep(h) {
      const v = R.v, s = v.length();
      if (s > 1e-4) {
        // drag against the motion, lift up and across it (backspin), and a gentle curve
        const hx = Math.hypot(v.x, v.z) || 1e-6;
        v.x += (-KD * s * v.x - KL * s * s * (v.y / s) * (v.x / hx)) * h;
        v.z += (-KD * s * v.z - KL * s * s * (v.y / s) * (v.z / hx) + R.side * s * 0.12) * h;
        v.y += (-GRAV - KD * s * v.y + KL * s * hx) * h;
      }
      R.p.addScaledVector(v, h);
      R.t += h;
    }
    function land() {
      const carry = Math.hypot(R.p.x - TEE.x, R.p.z - TEE.z) / YD, yd = Math.round(carry);
      let pts = 0, hitG = null;
      for (const gr of greens) { const d = Math.hypot(R.p.x - gr.x, R.p.z - gr.z); if (d < gr.r) { hitG = gr; pts = gr.pts * (d < gr.r * 0.32 ? 2 : 1); } }
      R.score += pts; R.last = { yd, pts, green: hitG ? hitG.yd : 0 };
      R.st = 'down'; R.t = 0;
      ring.position.set(R.p.x, -1.2, R.p.z); ring.scale.setScalar(Math.max(1, carry / 60)); ring.visible = true;
      spawnFloat(pts ? `${yd} yd  +${pts}` : `${yd} yd`, new V3(R.p.x, 1.5, R.p.z), pts ? '#ffd23f' : '#ffffff');
      if (pts) sfx('cheer', 0.6); else tone(300, 120, 0.25, 'sine', 0.1);
      if (yd > R.longest) { R.longest = yd; showToast(`Longest drive yet: ${yd} yards!`); }
      RECORDS.add(L, 'drive', yd);
      prefs.range = { best: R.best, longest: R.longest }; savePrefs();
      if (R.left <= 0) {
        if (R.score > R.best) { R.best = R.score; prefs.range.best = R.best; savePrefs(); showToast(`Bucket done: ${R.score} points (your best!)`); } else showToast(`Bucket done: ${R.score} points`);
        RECORDS.add(L, 'bucket', R.score);
      }
      sbKey = '';
      forcePresence();
    }
    // ---------------------------------------------------------------- swinging
    // VR: the club head sweeps through the ball while you hold the trigger
    const headPrev = new V3(), headNow = new V3(), _hp = new V3(), _hv = new V3();
    let headInit = false;
    function vrSwing(dt) {
      const side = (L.me && L.me.hand) || 'right', mh = myHands[side];
      club.visible = mh.ok;
      if (!mh.ok) { headInit = false; return; }
      club.position.copy(mh.pos); club.quaternion.copy(mh.quat);
      headNow.set(0.03, 0, -1.06).applyQuaternion(mh.quat).add(mh.pos);
      if (!headInit) { headPrev.copy(headNow); headInit = true; }
      const gp = vrHands[side].source && vrHands[side].source.gamepad, armed = !!(gp && gp.buttons && gp.buttons[0] && gp.buttons[0].pressed);
      club.traverse((o) => { if (o.material) { o.material.transparent = !armed; o.material.opacity = armed ? 1 : 0.35; } });
      if (armed && R.st === 'tee' && dt > 0) {
        _hv.subVectors(headNow, headPrev).divideScalar(dt);
        for (let k = 1; k <= 6; k++) {
          _hp.lerpVectors(headPrev, headNow, k / 6);
          if (_hp.distanceTo(R.p) > BR + 0.07) continue;
          const sp = _hv.length();
          if (sp < 1.5) break;
          // the ball goes where the head was heading, with the driver's loft added
          const dir = clamp(Math.atan2(-_hv.z, Math.max(0.1, _hv.x)), -0.45, 0.45), loft = clamp(0.21 + Math.atan2(_hv.y, Math.hypot(_hv.x, _hv.z)) * 0.5, 0.05, 0.6);
          launch(sp * 2.6, loft, dir);
          haptic(vrHands[side], 0.9, 40);
          break;
        }
      }
      headPrev.copy(headNow);
    }
    // the browser: Space charges, and the sweet spot is near the top of the bar
    const _cq = new Q4(), _d = new V3();
    const baseKick = L.kick, baseCS = L.onChargeStart;
    L.onChargeStart = () => { if (!L.onRange() && baseCS) baseCS(); };
    L.kick = (c) => {
      if (!L.onRange()) { if (baseKick) baseKick(c); return; }
      if (R.st !== 'tee') { if (R.st === 'fly') showToast('Wait for it to land'); return; }
      camera.getWorldQuaternion(_cq); _d.set(0, 0, -1).applyQuaternion(_cq);
      const aimDir = clamp(Math.atan2(-_d.z, Math.max(0.1, _d.x)), -0.4, 0.4);
      // 0.8-0.92 is the sweet spot; past it you swing too hard and hook it, short of it you lose distance
      const pure = c >= 0.8 && c <= 0.92, over = c > 0.92;
      const speed = (18 + Math.min(c, 0.92) * 58) * (over ? 0.93 : 1) * (pure ? 1 : 0.95);
      const hook = over ? (c - 0.92) * 4 + (rand() - 0.5) * 0.04 : (rand() - 0.5) * (pure ? 0.03 : 0.1);
      launch(speed, 0.22 + (rand() - 0.5) * 0.03, aimDir + hook);
      if (pure) spawnFloat('Pure!', new V3(TEE.x + 1, 1.4, TEE.z), '#8bd450');
    };
    const baseLabel = L.throwLabel;
    L.throwLabel = () => (L.onRange() ? 'Drive' : baseLabel ? baseLabel() : 'Putt');
    // the browser: you see the club swing from just behind the ball (it pivots about your hands)
    const PIV = new V3(TEE.x, 1.05, TEE.z + 0.35), _u = new V3(), _head = new V3(), _look = new V3();
    function deskClub(now) {
      const c = state.charge !== null ? Math.min(1, (now - state.charge) / 1000) : 0;
      club.visible = true; club.traverse((o) => { if (o.material) { o.material.transparent = false; o.material.opacity = 1; } });
      const th = R.st === 'tee' ? -c * 2.3 : R.st === 'fly' && R.t < 0.6 ? Math.min(1, R.t / 0.2) * 2.1 : 0;
      _u.copy(TEE).setY(0.05).sub(PIV); const rr = _u.length(); _u.normalize();
      _head.copy(PIV).addScaledVector(_u, Math.cos(th) * rr).add(_look.set(Math.sin(th) * rr, 0, 0));
      club.position.copy(PIV);
      club.lookAt(_look.copy(PIV).multiplyScalar(2).sub(_head));   // (its -z, the shaft, points at the head)
    }
    // ---------------------------------------------------------------- the scoreboard
    let sbKey = '';
    function drawSb() {
      const key = `${R.left}|${R.score}|${R.last ? R.last.yd + '/' + R.last.pts : ''}|${R.best}|${R.longest}`;
      if (key === sbKey) return; sbKey = key;
      const g = sb.g;
      g.fillStyle = '#1f4a2a'; g.fillRect(0, 0, 512, 300); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 294);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffffff'; g.font = `800 40px ${DISPLAY}`; g.fillText('DRIVING RANGE', 256, 50);
      g.fillStyle = '#ffd23f'; g.font = `900 80px ${DISPLAY}`; g.fillText(R.last ? `${R.last.yd} yd` : '–', 256, 140);
      g.fillStyle = '#c8e8c8'; g.font = `400 26px ${BODY}`; g.fillText(R.last ? (R.last.pts ? `On the ${R.last.green}-yard green: +${R.last.pts}` : 'In the water') : 'Hit a ball!', 256, 180);
      g.fillStyle = '#ffffff'; g.font = `700 28px ${BODY}`; g.fillText(`Balls left: ${R.left}   ·   Bucket: ${R.score} pts`, 256, 230);
      g.fillStyle = '#c8e8c8'; g.font = `400 22px ${BODY}`; g.fillText(`Best bucket ${R.best}  ·  longest ${R.longest} yd`, 256, 270);
      sb.tex.needsUpdate = true;
    }
    // ---------------------------------------------------------------- per frame
    const baseUpdate = L.update;
    L.update = (dt, now) => {
      baseUpdate(dt, now);
      const here = state.level === L.idx && state.mode !== 'menu' && L.onRange();
      if (!here) { club.visible = false; headInit = false; }
      else if (state.mode === 'vr') vrSwing(dt);
      else if (state.mode === 'flat') deskClub(now);
      if (R.st === 'fly') {
        const n = Math.max(1, Math.ceil(dt / 0.004));
        for (let i = 0; i < n && R.st === 'fly'; i++) { flyStep(dt / n); if (R.p.y < -1.25 && R.v.y < 0) land(); }
        if (R.st === 'fly' && R.n < trailN && (R.n === 0 || R.t * 20 > R.n)) { trailPos.set([R.p.x, R.p.y, R.p.z], R.n * 3); R.n += 1; trailGeo.attributes.position.needsUpdate = true; trailGeo.setDrawRange(0, R.n); }
      } else if (R.st === 'down') {
        R.t += dt;
        if (R.t > 2.2) { ring.visible = false; teeUp(); }
      }
      ball.position.copy(R.p);
      ball.scale.setScalar(R.st === 'fly' ? 1 + Math.min(4, Math.hypot(R.p.x - myHead.pos.x, R.p.z - myHead.pos.z) / 30) : 1);   // (so you can follow it out there)
      if (here) drawSb();
      if (here && ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = R.st === 'fly' ? 'In the air…' : `Driving range  ·  ${R.left} balls left  ·  hold Space, let go in the green  ·  look left or right to aim`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    // walking about: the pier, or the deck (they're not joined, the buttons take you)
    L.clampPlayer = (p) => {
      const B = onRange(p.x) ? RB : L.bounds, m = 0.3;
      return [clamp(p.x, B.minX + m, B.maxX - m) - p.x, clamp(p.z, B.minZ + m, B.maxZ - m) - p.z];
    };
    const baseHints = L.hintsFor;
    L.hintsFor = () => (L.onRange() ? (state.mode === 'flat' ? [['Space', 'hold, let go in the green to drive'], ['Drag', 'aim left or right']] : [['Trigger', 'hold it and swing through the ball'], ['Targets', 'land on a green for points']]) : baseHints ? baseHints() : L.hints);
    L.hudActions.push({ label: () => (L.onRange() ? 'New bucket' : 'Driving range'), run: () => (L.onRange() ? newBucket() : goRange()) });
    L.rangeInternals = { R, launch, flyStep, land, teeUp, newBucket, goRange, greens, TEE, TARGETS, YD };
    return R;
  })(minigolf);
