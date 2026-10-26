  // ================================================================ THE WRIST WATCH (VR)
  // A watch on your right wrist. Raise it and look at it, and a little panel wakes up with a Clubhouse button (and, in
  // a game with bots, a Bots button for how good they are): poke a button with your other hand, or point at it and
  // pull that hand's trigger. Look away and it goes back to sleep.
  const HUB_IDX = 8;
  const WATCH = { awake: false, lookT: 0, awayT: 0, cool: 0, trigPrev: false, hover: false, minute: -1, pressed: 0 };
  const watchG = new THREE.Group();
  const watchBand = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 6, 22), new THREE.MeshLambertMaterial({ color: 0x2b2d42 }));
  const faceC = canvasTexture(128, 128);
  const watchFace = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.007, 22), [
    new THREE.MeshLambertMaterial({ color: 0xc8ccd8 }), new THREE.MeshBasicMaterial({ map: faceC.tex }), new THREE.MeshLambertMaterial({ color: 0xc8ccd8 }),
  ]);
  watchFace.position.y = 0.041;
  watchG.add(watchBand, watchFace);
  watchG.visible = false;
  scene.add(watchG);
  function drawWatchFace(awake) {
    const g = faceC.g, d = new Date();
    g.fillStyle = awake ? '#ffd23f' : '#1b1932'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.fillStyle = awake ? '#1b1932' : '#f4f2ff'; g.font = `800 38px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`, 64, 66);
    faceC.tex.needsUpdate = true;
  }
  drawWatchFace(false);
  // the panel that pops up above it
  const PW = 0.15, PH = 0.08, BTN = { x: 0, y: -0.012, w: 0.12, h: 0.034 };
  // the buttons: just the Clubhouse, or the Clubhouse and the Bots side by side
  const BTN_HUB = { id: 'hub', x: -0.034, y: -0.012, w: 0.064, h: 0.034 }, BTN_BOTS = { id: 'bots', x: 0.034, y: -0.012, w: 0.064, h: 0.034 };
  const watchBtns = () => (curLevel() && curLevel().botLv ? [BTN_HUB, BTN_BOTS] : [{ ...BTN, id: 'hub' }]);
  const panelC = canvasTexture(480, 256);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: panelC.tex, transparent: true, depthTest: false }));
  panel.renderOrder = 20;
  panel.visible = false;
  scene.add(panel);
  let panelKey = '';
  function drawPanel() {
    const atHub = state.level === HUB_IDX, bots = curLevel() && curLevel().botLv ? BOTLV.name(curLevel()) : '', key = `${atHub}|${WATCH.hover}|${bots}`;
    if (key === panelKey) return;
    panelKey = key;
    const g = panelC.g;
    g.clearRect(0, 0, 480, 256);
    rr(g, 4, 4, 472, 248, 34); g.fillStyle = 'rgba(20,16,32,0.92)'; g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd23f'; g.font = `800 44px ${DISPLAY}`; g.fillText('Field Day', 240, 58);
    // the buttons: drawn where they say they are
    for (const B of watchBtns()) {
      const bx = 240 + (B.x / PW) * 480, by = 128 - (B.y / PH) * 256, bw = (B.w / PW) * 480, bh = (B.h / PH) * 256, hov = WATCH.hover === B.id;
      rr(g, bx - bw / 2, by - bh / 2, bw, bh, 26);
      if (B.id === 'hub') {
        g.fillStyle = atHub ? '#4a4660' : hov ? '#8be0ff' : '#4fc3f7'; g.fill();
        g.fillStyle = atHub ? '#a9a3cf' : '#10223a'; g.font = `800 ${bots ? 34 : 40}px ${BODY}`;
        g.fillText(atHub ? 'You\u2019re in the clubhouse' : 'Clubhouse', bx, by + 2, bw - 24);
      } else {
        g.fillStyle = hov ? '#ffe680' : '#ffd23f'; g.fill();
        g.fillStyle = '#1b1932'; g.font = `800 34px ${BODY}`; g.fillText(`Bots: ${bots}`, bx, by + 2, bw - 24);
      }
    }
    panelC.tex.needsUpdate = true;
  }
  drawPanel();
  function watchPress(id) {
    const now = performance.now();
    if (id === 'bots') {
      if (now < WATCH.cool) return;
      WATCH.cool = now + 700;
      haptic(vrHands[WATCH.side === 'left' ? 'right' : 'left'], 0.4, 30);
      BOTLV.cycle(curLevel()); panelKey = '';
      return;
    }
    if (now < WATCH.cool || state.level === HUB_IDX) return;
    WATCH.cool = now + 1500;
    WATCH.pressed += 1;
    haptic(vrHands[WATCH.side === 'left' ? 'right' : 'left'], 0.5, 40);
    sfx('whoosh', 1);
    WATCH.awake = false; panel.visible = false;
    switchLevel(HUB_IDX);
  }
  const _watchWp = new V3(), _watchWn = new V3(), _watchEye = new V3(), _watchGaze = new V3(), _watchCq = new Q4(), _watchTip = new V3(), _watchInv = new THREE.Matrix4(), _watchLoc = new V3(), _watchRd = new V3();
  // which button a point on the panel is over (or null)
  function onButton(local) { const B = watchBtns().find((b) => Math.abs(local.x - b.x) < b.w / 2 && Math.abs(local.y - b.y) < b.h / 2); return B ? B.id : null; }
  // which wrist the watch is on: the right, unless that hand's busy holding something (a bow, a bat, a tool), when it
  // hops to the left for the time being. If both hands are busy it sleeps, so it can't wake in your face mid-shot.
  function watchSide() {
    const L = curLevel();
    const busy = (s) => !!(vrHands[s] && vrHands[s].holding) || !!(L.handBusy && L.handBusy(s));
    const r = busy('right'), l = busy('left');
    return r && l ? null : r ? 'left' : 'right';
  }
  function watchTick(dt, now) {
    const side = watchSide(), other = side === 'left' ? 'right' : 'left';
    if (side !== WATCH.side) { WATCH.side = side; WATCH.awake = false; WATCH.lookT = 0; }
    const lh = side ? myHands[side] : null, show = state.mode === 'vr' && !!lh && lh.ok;
    watchG.visible = show;
    if (!show) { panel.visible = false; WATCH.awake = false; WATCH.lookT = 0; return; }
    // on the back of the left wrist, behind the controller grip
    watchG.position.set(0, 0, 0.085).applyQuaternion(lh.quat).add(lh.pos);
    watchG.quaternion.copy(lh.quat);
    _watchWp.set(0, 0.045, 0).applyQuaternion(lh.quat).add(watchG.position);
    _watchWn.set(0, 1, 0).applyQuaternion(lh.quat);
    camera.getWorldPosition(_watchEye); camera.getWorldQuaternion(_watchCq);
    _watchGaze.set(0, 0, -1).applyQuaternion(_watchCq);
    const _up = new V3(0, 1, 0).applyQuaternion(_watchCq);
    _up.addScaledVector(_watchWn, -_up.dot(_watchWn));
    if (_up.lengthSq() > 1e-4) { _up.applyQuaternion(watchG.quaternion.clone().invert()); watchFace.rotation.y = Math.atan2(-_up.z, _up.x); }
    const toEye = _watchEye.clone().sub(_watchWp), dist = toEye.length();
    toEye.multiplyScalar(1 / Math.max(1e-4, dist));
    // looking at it: the face turned toward you, and you looking at the face
    const looking = dist < 0.65 && _watchWn.dot(toEye) > 0.5 && -_watchGaze.dot(toEye) > Math.cos(0.5);
    if (looking) { WATCH.lookT += dt; WATCH.awayT = 0; } else { WATCH.lookT = 0; if (WATCH.awake) WATCH.awayT += dt; }
    if (!WATCH.awake && WATCH.lookT > 0.25) { WATCH.awake = true; haptic(vrHands[side], 0.15, 20); }
    if (WATCH.awake && WATCH.awayT > 0.8) WATCH.awake = false;
    const minute = Math.floor(Date.now() / 60000) * 2 + (WATCH.awake ? 1 : 0);
    if (minute !== WATCH.minute) { WATCH.minute = minute; drawWatchFace(WATCH.awake); }
    panel.visible = WATCH.awake;
    const rh = myHands[other];   // you press it with your other hand
    if (!WATCH.awake) { WATCH.trigPrev = false; return; }
    // the panel floats just above the watch, facing you
    panel.position.copy(_watchWp).addScaledVector(toEye, 0.03).addScaledVector(_watchRd.set(0, 1, 0).applyQuaternion(_watchCq), 0.075);
    panel.quaternion.copy(_watchCq);
    panel.updateMatrixWorld(true);
    _watchInv.copy(panel.matrixWorld).invert();
    let hover = null;
    if (rh.ok) {
      // poke it with the tip of your right controller
      _watchTip.set(0, 0, -0.06).applyQuaternion(rh.quat).add(rh.pos);
      _watchLoc.copy(_watchTip).applyMatrix4(_watchInv);
      if (Math.abs(_watchLoc.z) < 0.03 && onButton(_watchLoc)) { hover = onButton(_watchLoc); watchPress(hover); }
      // or point at it and pull the trigger
      _watchRd.set(0, 0, -1).applyQuaternion(rh.quat);
      const n = new V3(0, 0, 1).applyQuaternion(panel.quaternion);
      const den = _watchRd.dot(n);
      if (Math.abs(den) > 1e-3) {
        const t = panel.position.clone().sub(rh.pos).dot(n) / den;
        if (t > 0 && t < 1.2) { _watchLoc.copy(rh.pos).addScaledVector(_watchRd, t).applyMatrix4(_watchInv); if (onButton(_watchLoc)) hover = onButton(_watchLoc); }
      }
      const gp = vrHands[other].source && vrHands[other].source.gamepad;
      const trig = !!(gp && gp.buttons && gp.buttons[0] && gp.buttons[0].pressed);
      if (trig && !WATCH.trigPrev && hover) watchPress(hover);
      WATCH.trigPrev = trig;
    }
    if (hover !== WATCH.hover) { WATCH.hover = hover; }
    drawPanel();
  }

