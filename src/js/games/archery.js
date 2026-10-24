  // ================================================================ LEVEL: ARCHERY RANGE (golf and lanes)
  // A meadow range: straw targets at 10, 20, 30 and 50 metres, one sliding target, and balloons drifting about.
  // A round is 12 arrows at whatever you like: rings score 1 to 10 (the sliding target doubles), a balloon is 10.
  // VR: the bow's in your left hand. Bring your right hand to the string, squeeze the grip, draw back to your face and
  // let go. Arrows drop over distance, so aim a little high for the far ones. Swap hands with the button on the HUD.
  // Browser: hold Space to draw (the longer, the harder), aim with the view, let go to loose.
  const archery = (() => {
    const L = newLevel(57);
    const G = L.group;
    const rand = mulberry32(5757);
    L.grabless = true;
    L.chargeKick = true;
    L.bounds = { minX: -6, maxX: 6, minZ: -1.5, maxZ: 4 };
    L.env = {
      sky: skyTexture([[0, '#4a8ad8'], [0.45, '#a8d0f0'], [0.5, '#f0f4e8'], [0.52, '#9ac87a'], [1, '#4a7a3a']]),
      bg: 0xa8d0f0, fog: [0xc8e0e8, 70, 260], hemi: [0xf8fff0, 0x5a7a3a, 0.85],
      sun: [0xfff4dc, 0.7], sunDir: new V3(0.4, 0.8, 0.3), ambient: [0x8a9a7a, 0.3], sprite: { tex: paleSunTex, pos: new V3(120, 200, 140), scale: 45 },
    };
    const AG = 6.0, VMAX = 62, ROUND = 12;
    // ---------------------------------------------------------------- the meadow
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), lam(0x6aa84a)); grass.rotation.x = -Math.PI / 2; G.add(grass);
    for (let i = 0; i < 60; i++) { const x = (rand() - 0.5) * 120, z = -60 - rand() * 50; if (Math.abs(x) < 8 && z > -70) continue; addCyl(G, 0.2, 0.25, 3, 6, lam(0x5a3a1a), x, 1.5, z); const c = new THREE.Mesh(new THREE.SphereGeometry(2 + rand(), 8, 6), lam(0x3a7a3a)); c.position.set(x, 4 + rand(), z); G.add(c); }
    for (const sx of [-1, 1]) for (let i = 0; i < 14; i++) { const x = sx * (9 + rand() * 25), z = 5 - rand() * 60; addCyl(G, 0.18, 0.22, 3, 6, lam(0x5a3a1a), x, 1.5, z); const c = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 8), lam(0x3a6a3a)); c.position.set(x, 4.5, z); G.add(c); }
    // the shooting line and its little shelter
    addBox(G, 12, 0.02, 0.12, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 0.01, -0.6);
    for (let i = 0; i < 12; i++) addBox(G, 0.1, 0.012, 1.2, lam(0x8a6a4a), -5.5 + i, 0.006, 0.6);
    addBox(G, 13, 0.15, 3.6, lam(0x8a3a2a), 0, 3.0, 1.4); for (const x of [-6.2, 6.2]) for (const z of [-0.2, 3]) addBox(G, 0.15, 3, 0.15, lam(0x5a3a1a), x, 1.5, z);
    makePlate(G, '\u{1F3F9}  ARCHERY RANGE', 3.2, 0.42, new V3(0, 2.7, -0.35), 0, { bg: '#2e5a2e', fg: '#fff4d8', size: 0.6 });
    // ---------------------------------------------------------------- targets
    const faceTex = canvasTexture(256, 256, (g) => {
      const cols = ['#ffffff', '#ffffff', '#1a1a1a', '#1a1a1a', '#2a7ad8', '#2a7ad8', '#d8302a', '#d8302a', '#ffd23f', '#ffd23f'];
      for (let i = 0; i < 10; i++) { g.fillStyle = cols[i]; g.beginPath(); g.arc(128, 128, 126 * (10 - i) / 10, 0, Math.PI * 2); g.fill(); g.strokeStyle = i === 2 || i === 3 ? '#ffffff' : '#1a1a1a'; g.lineWidth = 1; g.stroke(); }
      g.strokeStyle = '#1a1a1a'; g.beginPath(); g.moveTo(124, 128); g.lineTo(132, 128); g.moveTo(128, 124); g.lineTo(128, 132); g.stroke();
    }).tex;
    const TG = [];
    function target(x, z, R, moving) {
      const g = new THREE.Group(); g.position.set(x, 1.3, z); G.add(g);
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.12, R * 1.12, 0.35, 24), lam(0xd8b860)); bale.rotation.x = Math.PI / 2; bale.position.z = -0.18; g.add(bale);
      const face = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshBasicMaterial({ map: faceTex })); face.position.z = 0.005; g.add(face);
      for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), lam(0x5a3a1a)); leg.position.set(sx * R * 0.7, -0.85, -0.4); leg.rotation.x = -0.25; g.add(leg); }
      if (!moving) makePlate(G, `${Math.round(-z)} m`, 0.7, 0.26, new V3(x, 0.25, z + 0.3), 0, { bg: '#fff4d8', fg: '#2e5a2e', size: 0.7 });
      const t = { g, R, x0: x, z, moving: !!moving, dist: -z };
      TG.push(t); return t;
    }
    target(-3, -10, 0.5); target(2.5, -20, 0.6); target(-2.5, -30, 0.7); target(0.5, -50, 0.9);
    const mover = target(0, -25, 0.45, true);
    addBox(G, 12, 0.08, 0.12, lam(0x5a3a1a), 0, 0.4, -25.3);
    makePlate(G, 'Moving: double points', 1.6, 0.24, new V3(5.5, 0.6, -25.1), 0, { bg: '#d8302a', fg: '#ffffff', size: 0.55 });
    // balloons
    const BAL = [];
    const balCols = [0xff4d6a, 0x4fc3f7, 0xffd23f, 0x8bd450, 0xb388ff];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshLambertMaterial({ color: balCols[i % 5], emissive: 0x111111 })); m.scale.y = 1.2; G.add(m);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 4), lam(0xffffff)); str.position.y = -0.9; m.add(str);
      const b = { m, p: new V3(), ph: rand() * 6, pop: 0 }; placeBalloon(b); BAL.push(b);
    }
    function placeBalloon(b) { b.p.set((rand() - 0.5) * 12, 3 + rand() * 4, -14 - rand() * 30); b.ph = rand() * 6; b.pop = 0; b.m.visible = true; }
    // ---------------------------------------------------------------- bow and arrows
    function makeBow() {
      const g = new THREE.Group();
      const wood = lam(0x8a4a2a);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), lam(0x2a1a10)); g.add(grip);
      // two curved limbs, the bow standing up in your hand, curving away from you
      const limbs = [];
      for (const s of [1, -1]) {
        const curve = new THREE.QuadraticBezierCurve3(new V3(0, s * 0.06, 0), new V3(0, s * 0.38, 0.03), new V3(0, s * 0.62, 0.14));
        const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.013, 6), wood); g.add(limb); limbs.push(curve);
      }
      const strM = new THREE.LineBasicMaterial({ color: 0xf4f2ec });
      const strG = new THREE.BufferGeometry().setFromPoints([new V3(0, 0.62, 0.14), new V3(0, 0, 0.14), new V3(0, -0.62, 0.14)]);
      const string = new THREE.Line(strG, strM); string.frustumCulled = false; g.add(string);
      g.userData.string = string;
      g.visible = false; L.overlay.add(g);
      return g;
    }
    function makeArrow() {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.75, 6), lam(0xd8b878)); shaft.rotation.x = Math.PI / 2; g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 6), lam(0x8a8a90)); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.4; g.add(tip);
      for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.09), new THREE.MeshLambertMaterial({ color: k ? 0xffffff : 0xd8302a, side: THREE.DoubleSide })); f.position.set(0, 0, 0.32); f.rotation.set(0, Math.PI / 2, k * Math.PI * 2 / 3); const p = new THREE.Group(); p.rotation.z = k * Math.PI * 2 / 3; f.position.set(0, 0.018, 0.32); f.rotation.set(0, Math.PI / 2, 0); p.add(f); g.add(p); }
      return g;
    }
    const bow = makeBow();
    const nocked = makeArrow(); nocked.visible = false; L.overlay.add(nocked);
    const ARROWS = [];
    for (let i = 0; i < 30; i++) { const m = makeArrow(); m.visible = false; G.add(m); ARROWS.push({ m, p: new V3(), v: new V3(), st: 'off', t: 0 }); }
    let arrowI = 0;
    // ---------------------------------------------------------------- the round
    const S = { ph: 'idle', left: ROUND, score: 0, last: null, best: 0, bowHand: 'left', drawing: false, draw: 0, bulls: 0, slot: 0 };
    try { if (Number.isInteger(prefs.archBest)) S.best = prefs.archBest; if (prefs.bowHand === 'right') S.bowHand = 'right'; } catch (e) { /* none */ }
    L.arch = S;
    function newRound() { Object.assign(S, { ph: 'play', left: ROUND, score: 0, last: null, bulls: 0 }); for (const a of ARROWS) { a.st = 'off'; a.m.visible = false; } sbKey = ''; forcePresence(); state.dirtyBoard = true; }
    L.newRound = newRound;
    // lefties hold the bow in the right hand and draw with the left
    function swapHands() { S.bowHand = S.bowHand === 'left' ? 'right' : 'left'; prefs.bowHand = S.bowHand; savePrefs(); S.drawing = false; showToast(S.bowHand === 'left' ? 'Right-handed: bow in your left hand' : 'Left-handed: bow in your right hand'); state.hudDirty = true; }
    L.swapHands = swapHands;
    const _up = new V3(0, 0, -1), _q = new Q4();
    function loose(from, dir, speed) {
      if (S.ph !== 'play') newRound();
      if (S.left <= 0) { showToast('That’s your twelve: start a new round'); return null; }
      const a = ARROWS[arrowI++ % ARROWS.length];
      a.p.copy(from); a.v.copy(dir).normalize().multiplyScalar(clamp(speed, 6, VMAX)); a.st = 'fly'; a.t = 0; a.m.visible = true;
      S.left -= 1;
      tone(180, 90, 0.12, 'triangle', 0.3); noiseBurst(0.1, 0.25, 2500, 0.6);
      forcePresence(); sbKey = '';
      return a;
    }
    L.loose = loose;
    function scoreArrow(pts, what, at) {
      S.score += pts; S.last = { pts, what };
      if (pts >= 10 && what !== 'balloon') S.bulls += 1;
      spawnFloat(pts ? (pts >= 10 && what !== 'balloon' ? `${pts}! Bullseye` : `+${pts}`) : 'Miss', at.clone().add(new V3(0, 0.5, 0)), pts >= 10 ? '#ffd23f' : pts ? '#ffffff' : '#c8c8c8');
      if (pts) sfx(pts >= 10 ? 'cheer' : 'board', pts >= 10 ? 0.5 : 0.6);
      sbKey = ''; forcePresence(); state.dirtyBoard = true;
      if (S.left <= 0) setTimeout(() => endRound(), 900);
    }
    function endRound() {
      if (S.ph !== 'play') return;
      S.ph = 'done';
      const isBest = S.score > S.best;
      if (isBest) { S.best = S.score; prefs.archBest = S.best; savePrefs(); }
      RECORDS.add(L, 'round', S.score);
      if (S.bulls) RECORDS.add(L, 'bulls', S.bulls);
      state.hudDirty = true;
      showToast(`Round over: ${S.score} points${isBest ? ' (your best!)' : ''}. Draw again (or press Play again) for another round`);
      sfx('chime', 0.8); sbKey = ''; forcePresence(); state.dirtyBoard = true;
    }
    L.endRound = endRound;
    const _p0 = new V3(), _c = new V3();
    function arrowStep(a, h) {
      _p0.copy(a.p);
      a.v.y -= AG * h; a.v.multiplyScalar(1 - 0.02 * h);
      a.p.addScaledVector(a.v, h); a.t += h;
      // a target face?
      for (const t of TG) {
        const cz = t.g.position.z + 0.01;
        if (_p0.z >= cz && a.p.z < cz) {
          const u = (_p0.z - cz) / (_p0.z - a.p.z), x = _p0.x + (a.p.x - _p0.x) * u, y = _p0.y + (a.p.y - _p0.y) * u;
          const d = Math.hypot(x - t.g.position.x, y - t.g.position.y);
          if (d < t.R * 1.12) {
            a.p.set(x, y, cz - 0.05); a.st = 'stuck'; a.on = t; a.off = new V3(x - t.g.position.x, y - t.g.position.y, 0);
            const ring = Math.floor(d / (t.R / 10)), pts = d < t.R ? (10 - ring) * (t.moving ? 2 : 1) : 0;
            tone(140, 100, 0.08, 'square', 0.2);
            scoreArrow(pts, 'target', a.p);
            if (pts) RECORDS.add(L, 'long', Math.round(t.dist));
            return;
          }
        }
      }
      // a balloon?
      for (const b of BAL) {
        if (!b.m.visible) continue;
        _c.subVectors(b.m.position, _p0); const seg = a.p.clone().sub(_p0), l2 = seg.lengthSq(), k = l2 > 1e-9 ? clamp(_c.dot(seg) / l2, 0, 1) : 0;
        if (_c.copy(_p0).addScaledVector(seg, k).distanceTo(b.m.position) < 0.32) {
          b.m.visible = false; b.pop = 2.5; noiseBurst(0.12, 0.6, 3000, 0.4); tone(900, 200, 0.1, 'square', 0.15);
          scoreArrow(10, 'balloon', b.m.position);
        }
      }
      if (a.p.y < 0.02) { a.p.y = 0.02; a.st = 'stuck'; a.on = null; scoreArrow(0, 'ground', a.p); }
      if (a.t > 6) { a.st = 'off'; a.m.visible = false; scoreArrow(0, 'lost', a.p); }
    }
    L.arrowStep = arrowStep;
    // ---------------------------------------------------------------- shooting: VR
    const _bp = new V3(), _sp = new V3(), _dir = new V3(), _nock = new V3();
    const stringHand = () => (S.bowHand === 'left' ? 'right' : 'left');
    // (the watch keeps off the bow hand, and off the drawing hand too)
    L.handBusy = (side) => state.level === L.idx && (side === S.bowHand || (S.drawing && side === stringHand()));
    function vrBow(dt) {
      const bh = myHands[S.bowHand], sh = myHands[stringHand()];
      bow.visible = bh.ok; bow.scale.setScalar(1); nocked.scale.setScalar(1);
      if (!bh.ok) { S.drawing = false; nocked.visible = false; return; }
      bow.position.copy(bh.pos); bow.quaternion.copy(bh.quat);
      // (the bow faces where your bow hand points; the string sits just behind the grip)
      _nock.set(0, 0, 0.14).applyQuaternion(bh.quat).add(bh.pos);
      const gp = vrHands[stringHand()].source && vrHands[stringHand()].source.gamepad;
      const grip = !!(gp && gp.buttons && ((gp.buttons[1] && gp.buttons[1].pressed) || (gp.buttons[0] && gp.buttons[0].pressed)));
      if (!S.drawing && grip && sh.ok && sh.pos.distanceTo(_nock) < 0.2 && (S.left > 0 || S.ph !== 'play')) { S.drawing = true; haptic(vrHands[stringHand()], 0.3, 20); }
      const str = bow.userData.string.geometry.attributes.position;
      if (S.drawing && sh.ok) {
        _bp.copy(bh.pos); _sp.copy(sh.pos);
        S.draw = clamp(_sp.distanceTo(_bp) - 0.12, 0, 0.62);
        if (Math.random() < S.draw * 0.3) haptic(vrHands[stringHand()], 0.05 + S.draw * 0.25, 10);
        // the string comes back to your hand; the arrow lies from your hand through the grip
        const local = bow.worldToLocal(_sp.clone());
        str.setXYZ(1, local.x, local.y, local.z); str.needsUpdate = true;
        _dir.subVectors(_bp, _sp).normalize();
        nocked.visible = true; nocked.position.copy(_sp).addScaledVector(_dir, 0.36); nocked.quaternion.setFromUnitVectors(_up, _dir);
        if (!grip) {
          S.drawing = false; nocked.visible = false; str.setXYZ(1, 0, 0, 0.14); str.needsUpdate = true;
          if (S.draw > 0.12) { loose(_bp.clone().addScaledVector(_dir, 0.3), _dir.clone(), 10 + (S.draw / 0.62) * (VMAX - 10)); haptic(vrHands[S.bowHand], 0.7, 40); }
        }
      } else { S.drawing = false; nocked.visible = false; str.setXYZ(1, 0, 0, 0.14); str.needsUpdate = true; }
    }
    // ---------------------------------------------------------------- shooting: the browser
    L.onChargeStart = () => { if (S.ph !== 'play') newRound(); };
    L.kick = (c) => {
      camera.getWorldPosition(_bp); camera.getWorldQuaternion(_q); _dir.set(0, 0, -1).applyQuaternion(_q);
      if (c < 0.12) { showToast('Hold Space longer to draw the bow'); return; }
      loose(_bp.clone().addScaledVector(_dir, 0.5).add(new V3(0, -0.05, 0)), _dir.clone(), 10 + c * (VMAX - 10));
    };
    L.throwLabel = () => 'Draw';
    function flatBow(now) {
      const c = state.charge !== null ? Math.min(1, (now - state.charge) / 1000) : 0;
      camera.getWorldPosition(_bp); camera.getWorldQuaternion(_q);
      bow.visible = true; bow.scale.setScalar(0.5); nocked.scale.setScalar(0.5); const lr = S.bowHand === 'left' ? -1 : 1;
      bow.position.copy(_bp).add(_sp.set(0.2 * lr, -0.13, -0.7).applyQuaternion(_q)); bow.quaternion.copy(_q);
      bow.rotateZ(-0.3 * lr);
      const str = bow.userData.string.geometry.attributes.position;
      str.setXYZ(1, 0, 0, 0.14 + c * 0.32); str.needsUpdate = true;
      nocked.visible = c > 0.02; if (nocked.visible) { nocked.position.copy(bow.position).add(_sp.set(0, 0, (0.14 + c * 0.32 - 0.36) * 0.5).applyQuaternion(bow.quaternion)); nocked.quaternion.copy(bow.quaternion); }
    }
    // ---------------------------------------------------------------- the scoreboard
    const sb = canvasTexture(512, 256);
    const sbM = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: sb.tex })); sbM.position.set(-4.6, 1.6, 0.2); sbM.rotation.y = 0.5; G.add(sbM);
    addBox(G, 0.06, 1.4, 0.06, lam(0x5a3a1a), -4.6, 0.7, 0.18);
    let sbKey = '';
    function drawSb() {
      const key = `${S.ph}|${S.left}|${S.score}|${S.last ? S.last.pts : ''}|${S.best}`;
      if (key === sbKey) return; sbKey = key;
      const g = sb.g;
      g.fillStyle = '#2e5a2e'; g.fillRect(0, 0, 512, 256); g.strokeStyle = '#fff4d8'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 250);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff4d8';
      g.font = `800 40px ${DISPLAY}`; g.fillText(S.ph === 'done' ? 'ROUND OVER' : 'ARCHERY', 256, 50);
      g.fillStyle = '#ffd23f'; g.font = `900 96px ${DISPLAY}`; g.fillText(String(S.score), 256, 150);
      g.fillStyle = '#fff4d8'; g.font = `700 28px ${BODY}`; g.fillText(`Arrows left: ${S.left}  ·  best ${S.best}`, 256, 200);
      g.font = `400 22px ${BODY}`; g.fillText(S.last ? (S.last.what === 'balloon' ? 'Last: popped a balloon! +10' : S.last.pts ? `Last arrow: ${S.last.pts}` : 'Last arrow: missed') : 'Twelve arrows a round', 256, 236);
      sb.tex.needsUpdate = true;
    }
    // ---------------------------------------------------------------- per frame
    function stand() {
      const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      ids.sort(); S.slot = Math.max(0, ids.indexOf(state.myPeer)) % 4;
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += [0, -1.6, 1.6, -3.2][S.slot] - c.x; dolly.position.z += 0.2 - c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0.02; }
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      // the sliding target and the balloons
      mover.g.position.x = Math.sin(now * 0.0006) * 4.5;
      for (const b of BAL) {
        if (b.pop > 0) { b.pop -= dt; if (b.pop <= 0) placeBalloon(b); continue; }
        b.m.position.set(b.p.x + Math.sin(now * 0.0004 + b.ph) * 1.5, b.p.y + Math.sin(now * 0.0011 + b.ph) * 0.4, b.p.z);
      }
      for (const a of ARROWS) {
        if (a.st === 'fly') { const n = Math.max(1, Math.ceil(dt / 0.004)); for (let i = 0; i < n && a.st === 'fly'; i++) arrowStep(a, dt / n); }
        if (a.st === 'stuck' && a.on) a.p.set(a.on.g.position.x + a.off.x, a.on.g.position.y + a.off.y, a.on.g.position.z - 0.05);
        if (a.st !== 'off') { a.m.position.copy(a.p); if (a.st === 'fly' && a.v.lengthSq() > 1e-4) a.m.quaternion.setFromUnitVectors(_up, _dir.copy(a.v).normalize()); }
      }
      if (!here) { bow.visible = false; nocked.visible = false; return; }
      if (state.mode === 'vr') vrBow(dt); else if (state.mode === 'flat') flatBow(now);
      drawSb();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = `Archery  ·  ${S.score} points  ·  ${S.left} arrows left  ·  hold Space to draw, let go to shoot (aim a little high for the far ones)`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ ar: [S.score, S.best, S.ph === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.ar;
      if (!Array.isArray(a) || a.length !== 3 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e5)) { st.ar = null; return; }
      if (!st.ar || st.ar.join() !== a.join()) state.dirtyBoard = true;
      st.ar = a;
    };
    L.rowFor = (st, isMe) => { const a = isMe ? L.presence().ar : st.ar; if (!a) return { best: 0, text: '' }; return { best: a[1], text: `${a[2] ? `${a[0]} now · ` : ''}best ${a[1]}` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, 5.0, 1.9, 1.4, -0.6);
    L.drawBoard = (rows) => {
      const g = L.board.g, Wd = 720;
      g.fillStyle = '#2e5a2e'; g.fillRect(0, 0, Wd, 460); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, Wd - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Sharpshooters', 36, 80);
      g.fillStyle = '#fff4d8'; g.font = `400 24px ${BODY}`; g.fillText('Best round of twelve arrows', 36, 118);
      drawRows(g, rows, 176, 46, Wd);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, -3.0, 3.2, Math.PI * 0.8);
    makeButton(L, new V3(3.2, 1.0, 1.0), 0x2e8a4c, 'Lefty / righty', () => swapHands(), { faceYaw: -0.4 });
    makeButton(L, new V3(-3.4, 1.0, 1.0), 0xffd23f, 'Play again', () => newRound(), { faceYaw: 0.4 });
    RECORDS.def(L, [{ k: 'round', label: 'Best round (12 arrows)' }, { k: 'bulls', label: 'Most bullseyes in a round' }, { k: 'long', label: 'Longest hit', fmt: 'm' }]);
    L.hudActions = [
      { label: () => (S.ph === 'play' ? 'New round' : S.ph === 'done' ? 'Play again' : 'Start a round'), run: () => newRound() },
      { label: () => (S.bowHand === 'left' ? 'Right-handed ▸' : 'Left-handed ▸'), run: () => swapHands() },
    ];
    L.hints = [['Bow hand', 'points where you shoot'], ['Other hand', 'grip at the string, draw back, let go'], ['Far targets', 'aim a little high']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Space', 'hold to draw, let go to shoot'], ['Drag', 'aim'], ['Far targets', 'aim a little high']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { sbKey = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; S.drawing = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.2; camera.position.set(Math.sin(a) * 3, 2.2, 3); camera.lookAt(0, 1.4, -25); };
    L.archInternals = { S, TG, BAL, ARROWS, loose, arrowStep, newRound, endRound, mover };
    for (const n of ['G', 'Em', 'C', 'D']) if (!CH[n]) CH[n] = genChord(n);
    MUSIC_THEMES.archery = { gain: 0.55, bpm: 84, swing: 0.1, chords: ['G', 'Em', 'C', 'D'], arp: { inst: 'harp', every: 2, order: [1, 2, 3, 4, 3, 2, 3, 4] }, pad: { inst: 'flute' }, bass: { at: [0, 8] }, drums: { k: 'x.......x.......', sh: '--o---o---o---o-' }, cut: 3400 };
    return L;
  })();
