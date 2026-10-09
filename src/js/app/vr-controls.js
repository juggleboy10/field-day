  // ---------------------------------------------------------------- VR controllers
  const myHandMat = new THREE.MeshLambertMaterial({ color: PLAYER_COLORS[state.colorIdx].hex });
  function newHand(side) {
    const mesh = makeHand(myHandMat, side);
    mesh.visible = false;
    scene.add(mesh);
    return { side, grip: null, ray: null, source: null, laser: null, holding: null, grabBtn: null, hist: [], target: null, turnArmed: true, mesh };
  }
  const vrHands = { left: newHand('left'), right: newHand('right') };
  const laserGeo = new THREE.BufferGeometry().setFromPoints([new V3(0, 0, 0), new V3(0, 0, -1)]);
  for (let i = 0; i < 2; i++) {
    const grip = renderer.xr.getControllerGrip(i);
    const ray = renderer.xr.getController(i);
    dolly.add(grip);
    dolly.add(ray);
    const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
    laser.visible = false;
    laser.frustumCulled = false;
    ray.add(laser);
    const slot = { hand: null };
    ray.addEventListener('connected', (e) => {
      const side = e.data && e.data.handedness === 'left' ? 'left' : 'right';
      const hand = vrHands[side];
      slot.hand = hand;
      hand.grip = grip; hand.ray = ray; hand.source = e.data; hand.laser = laser;
    });
    ray.addEventListener('disconnected', () => {
      const hand = slot.hand;
      laser.visible = false;
      if (!hand) return;
      if (hand.holding) endHold(hand, new V3());
      hand.grip = hand.ray = hand.source = hand.laser = null;
      hand.mesh.visible = false;
      slot.hand = null;
    });
    for (const [start, end, btn] of [['selectstart', 'selectend', 'select'], ['squeezestart', 'squeezeend', 'squeeze']]) {
      ray.addEventListener(start, () => { if (slot.hand) vrGrabStart(slot.hand, btn); });
      ray.addEventListener(end, () => { if (slot.hand) vrGrabEnd(slot.hand, btn); });
    }
  }
  function haptic(h, intensity, ms) {
    try {
      const gp = h && h.source && h.source.gamepad;
      const act = gp && gp.hapticActuators && gp.hapticActuators[0];
      if (act && act.pulse) act.pulse(intensity, ms);
    } catch (e) { /* haptics optional */ }
  }
  function vrGrabStart(h, btn) {
    if (state.mode !== 'vr') return;
    const L = curLevel();
    if (L.onVRTrigger && btn === 'select' && !h.holding) { L.onVRTrigger(h); return; }
    if (h.holding) {
      const o = h.holding;
      if (o.kind === 'tool' && o.obj.sticky) {
        if (btn === 'select') { if (L.onTrigger) L.onTrigger(o.obj, h); }
        // some tools (a pickleball paddle) only drop on a long squeeze, so a bump of the grip doesn't lose them
        else if (o.obj.holdToDrop) { h.dropT = performance.now(); haptic(h, 0.15, 15); }
        else { h.holding = null; dropTool(o.obj); haptic(h, 0.2, 20); }
      }
      return;
    }
    if (L.onVRGrab && L.onVRGrab(h, btn)) { h.holding = { kind: 'custom', obj: null }; h.grabBtn = btn; return; }
    if (L.grabless) {
      if (L.canHoldDisc && L.canHoldDisc()) {
        L.holdDisc(h.side);
        h.holding = { kind: 'disc', obj: L.disc };
        h.grabBtn = btn;
        haptic(h, 0.3, 25);
      }
      return;
    }
    let t = h.target;
    if (!t && L.allowRecall && btn === 'squeeze' && L.me && L.me.lastTool && !L.me.lastTool.held) t = { kind: 'tool', obj: L.me.lastTool };
    if (!t || t.obj.held) return;
    if (t.kind === 'body' && L.canGrab && !L.canGrab(t.obj)) return;
    if (t.kind === 'body') grab(t.obj, h.side);
    else if (t.kind === 'tool') { grabTool(t.obj, h.side); if (L.onToolGrab) L.onToolGrab(t.obj); }
    else return;
    h.holding = t;
    h.grabBtn = btn;
    haptic(h, 0.35, 30);
  }
  const _vel = new V3();
  function handVelocity(h, out) {
    out.set(0, 0, 0);
    const hs = h.hist;
    if (hs.length < 2) return out;
    const last = hs[hs.length - 1];
    let first = null;
    for (const s of hs) { if (last.t - s.t <= 100) { first = s; break; } }
    if (!first || first === last) first = hs[Math.max(0, hs.length - 3)];
    const dtS = (last.t - first.t) / 1000;
    if (dtS < 0.004) return out;
    return out.subVectors(last.p, first.p).divideScalar(dtS);
  }
  function endHold(h, vel) {
    const held = h.holding;
    h.holding = null;
    if (!held) return;
    if (held.kind === 'body') release(held.obj, vel);
    else if (held.kind === 'tool') dropTool(held.obj);
    else if (held.kind === 'custom') { const L = curLevel(); if (L.onVRRelease) L.onVRRelease(h, vel); }
    else if (held.kind === 'disc') {
      const L = curLevel();
      if (L.throwDisc) L.throwDisc(vel, myHands[h.side].quat, performance.now());
    }
  }
  function vrGrabEnd(h, btn) {
    if (h.holding && h.holding.kind === 'tool' && h.holding.obj.sticky) {
      const L = curLevel();
      if (btn === 'select' && L.onTriggerEnd) L.onTriggerEnd(h.holding.obj, h);
      return;
    }
    if (!h.holding || h.grabBtn !== btn) return;
    handVelocity(h, _vel).multiplyScalar(h.holding.kind === 'disc' ? 1.4 : h.holding.kind === 'custom' ? 1 : 1.12);
    endHold(h, _vel);
  }
  function stickAxes(h) {
    const gp = h.source && h.source.gamepad;
    if (!gp || !gp.axes) return null;
    const a = gp.axes;
    if (a.length >= 4) return [a[2], a[3]];
    if (a.length >= 2) return [a[0], a[1]];
    return null;
  }
  const _hb = new V3(), _ha = new V3();
  function snapTurn(angle) {
    camera.getWorldPosition(_hb);
    dolly.rotation.y += angle;
    dolly.updateMatrixWorld(true);
    camera.getWorldPosition(_ha);
    dolly.position.x += _hb.x - _ha.x;
    dolly.position.z += _hb.z - _ha.z;
    vrHands.left.hist.length = 0;
    vrHands.right.hist.length = 0;
  }
  const _head = new V3();
  function clampPlayer() {
    const L = curLevel();
    camera.getWorldPosition(_head);
    if (L.clampPlayer) {
      const [dx, dz] = L.clampPlayer(_head);
      dolly.position.x += dx; dolly.position.z += dz;
      return;
    }
    const B = L.bounds, m = 0.3;
    if (_head.x < B.minX + m) dolly.position.x += B.minX + m - _head.x;
    else if (_head.x > B.maxX - m) dolly.position.x += B.maxX - m - _head.x;
    if (_head.z < B.minZ + m) dolly.position.z += B.minZ + m - _head.z;
    else if (_head.z > B.maxZ - m) dolly.position.z += B.maxZ - m - _head.z;
  }
  const toolGrip = (t, out) => out.set(0, 0, -0.1).applyQuaternion(t.quat).add(t.pos);

  const _hp = new V3(), _ro = new V3(), _rd = new V3(), _tb = new V3(), _rq = new Q4(), _right = new V3(), _mf = new V3(), _tg = new V3();
  function vrUpdate(dt, now) {
    const L = curLevel();
    for (const side of SIDES) {
      const h = vrHands[side], o = h.holding;
      if (!h.dropT) continue;
      const gp = h.source && h.source.gamepad, squeezing = !!(gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed);
      if (!o || o.kind !== 'tool' || !o.obj.holdToDrop || !squeezing) { h.dropT = 0; continue; }
      if (now - h.dropT > o.obj.holdToDrop) { h.dropT = 0; h.holding = null; dropTool(o.obj); haptic(h, 0.4, 40); }
    }
    if (HOP.air) { dolly.position.y = HOP.base; HOP.air = false; }     // no hopping in VR
    for (const side of SIDES) {
      const h = vrHands[side], mh = myHands[side];
      const space = h.grip && h.grip.visible ? h.grip : (h.ray && h.ray.visible ? h.ray : null);
      const ry = myRays[side];
      ry.ok = !!(h.ray && h.ray.visible);
      if (ry.ok) { h.ray.getWorldPosition(ry.pos); h.ray.getWorldQuaternion(ry.quat); }
      mh.ok = !!space;
      if (space) { space.getWorldPosition(mh.pos); space.getWorldQuaternion(mh.quat); }
      h.mesh.visible = mh.ok;
      if (mh.ok) {
        h.mesh.position.copy(mh.pos);
        h.mesh.quaternion.copy(mh.quat);
        h.hist.push({ t: now, p: holdPoint(mh.pos, mh.quat, new V3()) });
        while (h.hist.length > 2 && now - h.hist[0].t > 160) h.hist.shift();
      } else h.hist.length = 0;
    }
    const la = L.noLocomotion ? null : stickAxes(vrHands.left), ra = L.noLocomotion ? null : stickAxes(vrHands.right);
    if (la) {
      const x = la[0], y = la[1], m = Math.hypot(x, y);
      if (m > 0.15) {
        camera.getWorldQuaternion(_rq);
        _mf.set(0, 0, -1).applyQuaternion(_rq);
        _mf.y = 0;
        if (_mf.lengthSq() < 1e-4) _mf.set(0, 0, -1);
        _mf.normalize();
        _right.set(-_mf.z, 0, _mf.x);
        const sp = (L.walkSpeed || 2.6) * dt * Math.min(1, (m - 0.15) / 0.85) / m;
        dolly.position.addScaledVector(_right, x * sp).addScaledVector(_mf, -y * sp);
      }
    }
    if (ra) {
      const rh = vrHands.right, x = ra[0];
      if (prefs.smoothTurn) { if (Math.abs(x) > 0.15) snapTurn(-Math.sign(x) * ((Math.abs(x) - 0.15) / 0.85) * 2.4 * dt); }
      else if (rh.turnArmed && Math.abs(x) > 0.7) { snapTurn(x > 0 ? -Math.PI / 6 : Math.PI / 6); rh.turnArmed = false; }
      else if (Math.abs(x) < 0.3) rh.turnArmed = true;
    }
    if (!L.noLocomotion) clampPlayer();

    const cosLimit = Math.cos(9 * Math.PI / 180);
    for (const side of SIDES) {
      const h = vrHands[side], mh = myHands[side];
      h.target = null;
      if (!mh.ok || h.holding || L.grabless) { if (h.laser) h.laser.visible = false; continue; }
      holdPoint(mh.pos, mh.quat, _hp);
      let best = null, bestD = 0.22, far = false, farDist = 0;
      for (const b of L.bodies) {
        if (b.held) continue;
        const d = b.pos.distanceTo(_hp);
        if (d < bestD) { bestD = d; best = { kind: 'body', obj: b }; }
      }
      for (const t of L.tools) {
        if (t.held) continue;
        const d = toolGrip(t, _tg).distanceTo(mh.pos);
        if (d < Math.min(bestD, 0.16)) { bestD = d; best = { kind: 'tool', obj: t }; }
      }
      if (!best && h.ray && h.ray.visible) {
        h.ray.getWorldPosition(_ro);
        h.ray.getWorldQuaternion(_rq);
        _rd.set(0, 0, -1).applyQuaternion(_rq);
        let bestC = cosLimit;
        const consider = (kind, obj, p, maxD) => {
          _tb.subVectors(p, _ro);
          const dist = _tb.length();
          if (dist > maxD || dist < 0.05) return;
          const c = _tb.dot(_rd) / dist;
          if (c > bestC) { bestC = c; best = { kind, obj }; far = true; farDist = dist; }
        };
        for (const b of L.bodies) if (!b.held) consider('body', b, b.pos, L.grabRange || 14);
        for (const t of L.tools) if (!t.held) consider('tool', t, toolGrip(t, _tg), 8);
      }
      h.target = best;
      if (h.laser) {
        h.laser.visible = true;
        h.laser.scale.z = best && far ? Math.max(0.1, farDist - 0.05) : 0.6;
        h.laser.material.color.setHex(best ? 0xffa24a : 0xffffff);
        h.laser.material.opacity = best ? 0.85 : 0.25;
      }
    }
    // buttons are pressed by touching them
    for (const btn of L.buttons) {
      btn.near = false;
      for (const side of SIDES) {
        const mh = myHands[side];
        if (!mh.ok) continue;
        const d = Math.min(mh.pos.distanceTo(btn.pos), holdPoint(mh.pos, mh.quat, _hp).distanceTo(btn.pos));
        if (d < 0.25) btn.near = true;
        if (d < 0.11 && pressButton(btn, now)) { haptic(vrHands[side], 0.6, 50); break; }
      }
    }
  }

