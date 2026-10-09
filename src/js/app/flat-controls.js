  // ---------------------------------------------------------------- browser (flat) controls
  function updateMyPose(now) {
    camera.getWorldPosition(myHead.pos);
    camera.getWorldQuaternion(myHead.quat);
    if (state.mode === 'vr') return;
    const L = curLevel();
    for (const side of SIDES) {
      const mh = myHands[side];
      if (L.deskHand && L.deskHand(side, mh, now)) continue;
      mh.quat.copy(myHead.quat);
      mh.pos.copy(DESK_OFF[side]).applyQuaternion(myHead.quat).add(myHead.pos);
      mh.ok = state.mode === 'flat';
    }
  }
  const stick = { id: null, cx: 0, cy: 0, x: 0, y: 0 };
  const holdingTool = () => state.held && state.held.kind === 'tool';
  // a little hop (J) in the places that switch it on: you leave the floor for a moment and come straight back to the same floor,
  // so you can never land on a table or ledge. Browser only.
  const HOP = { air: false, vy: 0, base: 0, prev: false };
  function hopNow() {
    const L = curLevel();
    if (!L.canHop || state.mode !== 'flat' || HOP.air) return;
    if ((L.me && L.me.down) || (L.hopBlocked && L.hopBlocked())) return;   // (holding a bat is fine: a hop doesn't move you sideways)
    HOP.air = true; HOP.vy = 4.6; HOP.base = dolly.position.y;
    sfx('whoosh', 0.25);
  }
  function hopStep(dt) {
    const L = curLevel(), k = state.keys;
    if (k.KeyJ && !HOP.prev) hopNow();
    HOP.prev = !!k.KeyJ;
    if (!HOP.air) return;
    if (!L.canHop) { dolly.position.y = HOP.base; HOP.air = false; return; }
    HOP.vy -= 13 * dt; dolly.position.y += HOP.vy * dt;
    if (dolly.position.y <= HOP.base) { dolly.position.y = HOP.base; HOP.air = false; HOP.vy = 0; }
  }
  function flatUpdate(dt) {
    if (curLevel().flatCamera && curLevel().flatCamera(dt)) return;
    const k = state.keys;
    let mx = stick.x, mz = stick.y;
    if (k.KeyW || k.ArrowUp) mz -= 1;
    if (k.KeyS || k.ArrowDown) mz += 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    if ((holdingTool() && curLevel().lockWhileHolding) || (curLevel().me && curLevel().me.down)) { mx = 0; mz = 0; }
    const speed = ((k.ShiftLeft || k.ShiftRight) ? 1.6 : 1) * (curLevel().walkSpeed || 3);
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    dolly.position.x += (mx * cy + mz * sy) * speed * dt;
    dolly.position.z += (-mx * sy + mz * cy) * speed * dt;
    camera.position.set(0, curLevel().eyeHeight ? curLevel().eyeHeight() : 1.6, 0);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
    clampPlayer();
    hopStep(dt);
  }
  const _cf = new V3(), _cp = new V3(), _tb2 = new V3(), _cq = new Q4();
  function findFlatTarget() {
    const L = curLevel();
    camera.getWorldPosition(_cp);
    camera.getWorldQuaternion(_cq);
    _cf.set(0, 0, -1).applyQuaternion(_cq);
    let best = null, bestA = Infinity;
    const consider = (kind, obj, p, maxD) => {
      _tb2.subVectors(p, _cp);
      const dist = _tb2.length();
      if (dist > maxD || dist < 0.05) return;
      const ang = Math.acos(clamp(_tb2.dot(_cf) / dist, -1, 1));
      const tol = Math.max(0.1, Math.atan(0.25 / dist));
      if (ang < tol && ang < bestA) { bestA = ang; best = { kind, obj }; }
    };
    if (!state.held && !L.grabless) {
      for (const b of L.bodies) if (!b.held && (!L.canTarget || L.canTarget(b))) consider('body', b, b.pos, L.grabRange || 14);
      for (const t of L.tools) if (!t.held) consider('tool', t, toolGrip(t, _tg), 8);
    }
    for (const btn of L.buttons) consider('button', btn, btn.pos, 5);
    return best;
  }
  function tryGrabDesktop() {
    if (state.mode !== 'flat') return;
    const L = curLevel();
    if (L.onUse && L.onUse()) return;
    const auto = !state.held && L.autoGrab ? L.autoGrab() : null;
    let t = auto ? { kind: 'body', obj: auto } : findFlatTarget();
    if (!t && !state.held && L.allowRecall && L.me && L.me.lastTool && !L.me.lastTool.held) t = { kind: 'tool', obj: L.me.lastTool };
    if (!t) return;
    if (t.kind === 'button') { pressButton(t.obj, performance.now()); return; }
    if (state.held || t.obj.held) return;
    if (t.kind === 'body' && L.canGrab && !L.canGrab(t.obj)) return;
    if (t.kind === 'body') grab(t.obj, 'right');
    else { grabTool(t.obj, 'right'); if (L.onToolGrab) L.onToolGrab(t.obj); }
    state.held = t;
    state.hudDirty = true;
  }
  function pressE() {
    if (state.mode !== 'flat') return;
    const aimed = findFlatTarget();
    if (aimed && aimed.kind === 'button') { pressButton(aimed.obj, performance.now()); return; }
    if (holdingTool()) {
      const t = state.held.obj;
      state.held = null;
      dropTool(t);
      state.hudDirty = true;
      return;
    }
    tryGrabDesktop();
  }
  function startCharge() {
    if (state.mode !== 'flat') return;
    const L = curLevel();
    if (L.deskFire) { L.deskFire(performance.now()); return; }
    if (L.chargeKick) { if (state.charge === null) beginCharge(); return; }
    if (L.grabless) {
      if (L.disc && L.disc.phase === 'ready' && state.charge === null) beginCharge();
      return;
    }
    if (holdingTool()) { L.deskSwing(performance.now()); return; }
    if (!state.held) { tryGrabDesktop(); return; }
    if (state.charge === null) beginCharge();
  }
  function beginCharge() {
    const L = curLevel();
    if (L.onChargeStart) L.onChargeStart();
    state.charge = performance.now();
    ui.powerFill.style.width = '0%';
    ui.power.hidden = false;
  }
  function finishCharge() {
    if (state.mode === 'flat' && holdingTool() && curLevel().deskRelease) curLevel().deskRelease(performance.now());
    if (state.charge === null) return;
    const now = performance.now();
    const c = Math.min(1, (now - state.charge) / 1000);
    state.charge = null;
    ui.power.hidden = true;
    const L = curLevel();
    if (L.chargeKick) { L.kick(c); return; }
    camera.getWorldQuaternion(_cq);
    _cf.set(0, 0, -1).applyQuaternion(_cq);
    _right.set(1, 0, 0).applyQuaternion(_cq);
    if (L.grabless) {
      if (!L.disc || L.disc.phase !== 'ready') return;
      _cf.applyAxisAngle(_right, 0.05);
      L.throwDisc(_cf.multiplyScalar(3.5 + c * 18.5), null, now);
      return;
    }
    const held = state.held;
    if (!held || held.kind !== 'body') return;
    const ov = L.throwOverride ? L.throwOverride(held.obj, c) : null;
    if (ov) { state.held = null; state.hudDirty = true; release(held.obj, ov); return; }
    const ts = L.throwSpeed || [3, 12, 0.2];
    _cf.applyAxisAngle(_right, ts[2]);
    state.held = null;
    state.hudDirty = true;
    release(held.obj, _cf.multiplyScalar(ts[0] + c * (ts[1] - ts[0])));
  }

  const canvas = renderer.domElement;
  const pointers = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'flat') return;
    ensureAudio();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const isStick = e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.42 && stick.id === null;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), stick: isStick });
    if (isStick) {
      stick.id = e.pointerId; stick.cx = e.clientX; stick.cy = e.clientY; stick.x = 0; stick.y = 0;
      ui.stick.style.left = `${e.clientX}px`;
      ui.stick.style.top = `${e.clientY}px`;
      ui.knob.style.transform = '';
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p || state.mode !== 'flat') return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (p.stick) {
      let sx = (e.clientX - stick.cx) / 50, sy = (e.clientY - stick.cy) / 50;
      const m = Math.hypot(sx, sy);
      if (m > 1) { sx /= m; sy /= m; }
      stick.x = sx; stick.y = sy;
      ui.knob.style.transform = `translate(${sx * 34}px, ${sy * 34}px)`;
    } else {
      const sens = e.pointerType === 'touch' ? 0.006 : 0.0045;
      state.yaw -= dx * sens;
      state.pitch = clamp(state.pitch - dy * sens, -1.35, 1.35);
    }
  });
  function endPointer(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    if (p.stick) {
      stick.id = null; stick.x = 0; stick.y = 0;
      ui.knob.style.transform = '';
      ui.stick.style.left = ''; ui.stick.style.top = '';
      return;
    }
    const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
    if (e.type === 'pointerup' && moved < 8 && performance.now() - p.t < 350) {
      const L = curLevel();
      if (L.deskFire) L.deskFire(performance.now());
      else if (L.kick && !findFlatTarget()) L.kick(0.3);
      else if (holdingTool()) { L.deskSwing(performance.now()); if (L.deskRelease) L.deskRelease(performance.now()); }
      else tryGrabDesktop();
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  ui.grabBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); ensureAudio(); pressE(); });
  ui.throwBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ensureAudio();
    try { ui.throwBtn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    startCharge();
  });
  ui.throwBtn.addEventListener('pointerup', finishCharge);
  ui.throwBtn.addEventListener('pointercancel', finishCharge);
  ui.grabBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  ui.throwBtn.addEventListener('contextmenu', (e) => e.preventDefault());

  const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', (e) => {
    if (state.mode !== 'flat') return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON')) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    state.keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === 'KeyE') pressE();
    else if (e.code === 'Space') startCharge();
    else if (e.code === 'Escape') toMenu();
    else if (e.code === 'KeyM' && VOICE.stream && state.mode === 'flat') setMuted(!VOICE.muted);
    else if (curLevel().onKey) curLevel().onKey(e.code);
    else if (/^Digit[1-9]$/.test(e.code) && Number(e.code.slice(5)) <= LEVEL_META.length) switchLevel(Number(e.code.slice(5)) - 1);
  });
  window.addEventListener('keyup', (e) => {
    state.keys[e.code] = false;
    if (e.code === 'Space' && state.mode === 'flat') { e.preventDefault(); finishCharge(); }
  });
  window.addEventListener('blur', () => {
    state.keys = Object.create(null);
    state.charge = null;
    ui.power.hidden = true;
  });

