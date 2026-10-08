  // ================================================================ THE WRIST WATCH (VR)
  // A watch on your right wrist. Raise it and look at it, and a little panel wakes up with a Clubhouse button:
  // poke it with your left hand, or point at it and pull the left trigger. Look away and it goes back to sleep.
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
  const panelC = canvasTexture(480, 256);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: panelC.tex, transparent: true, depthTest: false }));
  panel.renderOrder = 20;
  panel.visible = false;
  scene.add(panel);
  let panelKey = '';
  function drawPanel() {
    const atHub = state.level === HUB_IDX, key = `${atHub}|${WATCH.hover}`;
    if (key === panelKey) return;
    panelKey = key;
    const g = panelC.g;
    g.clearRect(0, 0, 480, 256);
    rr(g, 4, 4, 472, 248, 34); g.fillStyle = 'rgba(20,16,32,0.92)'; g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd23f'; g.font = `800 44px ${DISPLAY}`; g.fillText('Field Day', 240, 58);
    // the button: drawn where BTN says it is
    const bx = 240 + (BTN.x / PW) * 480, by = 128 - (BTN.y / PH) * 256, bw = (BTN.w / PW) * 480, bh = (BTN.h / PH) * 256;
    rr(g, bx - bw / 2, by - bh / 2, bw, bh, 26);
    g.fillStyle = atHub ? '#4a4660' : WATCH.hover ? '#8be0ff' : '#4fc3f7'; g.fill();
    g.fillStyle = atHub ? '#a9a3cf' : '#10223a'; g.font = `800 40px ${BODY}`;
    g.fillText(atHub ? 'You\u2019re in the clubhouse' : 'Clubhouse', bx, by + 2, bw - 30);
    panelC.tex.needsUpdate = true;
  }
  drawPanel();
  function watchPress() {
    const now = performance.now();
    if (now < WATCH.cool || state.level === HUB_IDX) return;
    WATCH.cool = now + 1500;
    WATCH.pressed += 1;
    haptic(vrHands.left, 0.5, 40);
    sfx('whoosh', 1);
    WATCH.awake = false; panel.visible = false;
    switchLevel(HUB_IDX);
  }
  const _watchWp = new V3(), _watchWn = new V3(), _watchEye = new V3(), _watchGaze = new V3(), _watchCq = new Q4(), _watchTip = new V3(), _watchInv = new THREE.Matrix4(), _watchLoc = new V3(), _watchRd = new V3();
  function onButton(local) { return Math.abs(local.x - BTN.x) < BTN.w / 2 && Math.abs(local.y - BTN.y) < BTN.h / 2; }
  function watchTick(dt, now) {
    const lh = myHands.right, show = state.mode === 'vr' && lh.ok;   // the watch is on your right wrist
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
    if (!WATCH.awake && WATCH.lookT > 0.25) { WATCH.awake = true; haptic(vrHands.right, 0.15, 20); }
    if (WATCH.awake && WATCH.awayT > 0.8) WATCH.awake = false;
    const minute = Math.floor(Date.now() / 60000) * 2 + (WATCH.awake ? 1 : 0);
    if (minute !== WATCH.minute) { WATCH.minute = minute; drawWatchFace(WATCH.awake); }
    panel.visible = WATCH.awake;
    const rh = myHands.left;   // you press it with your left hand
    if (!WATCH.awake) { WATCH.trigPrev = false; return; }
    // the panel floats just above the watch, facing you
    panel.position.copy(_watchWp).addScaledVector(toEye, 0.03).addScaledVector(_watchRd.set(0, 1, 0).applyQuaternion(_watchCq), 0.075);
    panel.quaternion.copy(_watchCq);
    panel.updateMatrixWorld(true);
    _watchInv.copy(panel.matrixWorld).invert();
    let hover = false;
    if (rh.ok) {
      // poke it with the tip of your right controller
      _watchTip.set(0, 0, -0.06).applyQuaternion(rh.quat).add(rh.pos);
      _watchLoc.copy(_watchTip).applyMatrix4(_watchInv);
      if (Math.abs(_watchLoc.z) < 0.03 && onButton(_watchLoc)) { hover = true; watchPress(); }
      // or point at it and pull the trigger
      _watchRd.set(0, 0, -1).applyQuaternion(rh.quat);
      const n = new V3(0, 0, 1).applyQuaternion(panel.quaternion);
      const den = _watchRd.dot(n);
      if (Math.abs(den) > 1e-3) {
        const t = panel.position.clone().sub(rh.pos).dot(n) / den;
        if (t > 0 && t < 1.2) { _watchLoc.copy(rh.pos).addScaledVector(_watchRd, t).applyMatrix4(_watchInv); if (onButton(_watchLoc)) hover = true; }
      }
      const gp = vrHands.left.source && vrHands.left.source.gamepad;
      const trig = !!(gp && gp.buttons && gp.buttons[0] && gp.buttons[0].pressed);
      if (trig && !WATCH.trigPrev && hover) watchPress();
      WATCH.trigPrev = trig;
    }
    if (hover !== WATCH.hover) { WATCH.hover = hover; }
    drawPanel();
  }

