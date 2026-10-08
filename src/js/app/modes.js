  // ---------------------------------------------------------------- modes + levels
  function dropMine() {
    const L = curLevel();
    for (const b of L.bodies) if (b.held && b.held.peer === state.myPeer) { loseFromMyHand(b); release(b, new V3()); }
    for (const t of L.tools) if (t.held && t.held.peer === state.myPeer) { loseFromMyHand(t); dropTool(t); }
    if (L.disc && L.disc.phase === 'held') L.disc.phase = 'ready';
    for (const s of SIDES) { vrHands[s].holding = null; vrHands[s].target = null; }
    state.held = null;
    state.charge = null;
    ui.power.hidden = true;
  }
  function placePlayer(L) {
    dolly.rotation.set(0, 0, 0);
    dolly.position.set(0, 0, 0);
    if (state.mode !== 'vr') camera.position.set(0, 1.6, 0);
    state.pitch = -0.06;
    L.spawn();
    if (state.mode !== 'vr') camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  }
  function switchLevel(i) {
    if (i === state.level || !LEVELS[i]) return;
    const old = curLevel();
    dropMine();
    old.onExit();
    old.group.visible = false;
    for (const b of old.buttons) b.near = false;
    state.level = i;
    const L = curLevel();
    L.group.visible = true;
    applyEnv(L.env);
    seenPresence.clear();
    state.lastPeers = null;
    for (const rec of remotes.values()) rec.lvState = {};
    // anything still marked as held by someone who isn't in this game any more is free again;
    // real holds come straight back from the players who are here
    const here = new Set([state.myPeer]);
    for (const rec of remotes.values()) if (rec.lv === L.idx) here.add(rec.peer);
    for (const o of L.bodies) if (o.held && !here.has(o.held.peer)) { o.held = null; o.sleeping = false; o.vel.set(0, 0, 0); }
    for (const t of L.tools) if (t.held && !here.has(t.held.peer)) t.held = null;
    if (state.mode !== 'menu') placePlayer(L);
    L.onEnter();
    musicTheme(L.meta.id);
    savePrefs();
    syncLevelPicker();
    state.dirtyBoard = true;
    state.hudDirty = true;
    state.flatTarget = null;
    forcePresence();
    if (state.mode !== 'menu') showToast(L.meta.name);
  }
  function startGame(mode) {
    ensureAudio();
    musicTheme(curLevel().meta.id);
    state.mode = mode;
    ui.panel.hidden = true;
    ui.hud.hidden = mode !== 'flat';
    ui.touch.hidden = !coarse;
    placePlayer(curLevel());
    curLevel().onEnter();
    state.keys = Object.create(null);
    state.dirtyBoard = true;
    state.hudDirty = true;
    forcePresence();
  }
  function toMenu() {
    dropMine();
    curLevel().onExit();
    state.mode = 'menu';
    for (const s of SIDES) { vrHands[s].mesh.visible = false; myHands[s].ok = false; }
    state.flatTarget = null;
    ui.cross.classList.remove('on');
    ui.hud.hidden = true;
    ui.panel.hidden = false;
    dolly.position.set(0, 0, 0);
    dolly.rotation.set(0, 0, 0);
    state.dirtyBoard = true;
    forcePresence();
  }

  function showVRNote(msg) { ui.vrNote.textContent = msg; ui.vrNote.hidden = !msg; }
  function vrUnavailable(msg) {
    state.vrOK = false;
    ui.vrBtn.disabled = true;
    ui.vrBtn.classList.remove('primary');
    ui.flatBtn.classList.add('primary');
    showVRNote(msg);
  }
  function checkVR() {
    ui.vrBtn.disabled = true;
    if (!navigator.xr || typeof navigator.xr.isSessionSupported !== 'function') {
      vrUnavailable('VR needs a headset browser, like the one on a Meta Quest. You can still play here in the browser.');
      return;
    }
    navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
      if (ok) { state.vrOK = true; ui.vrBtn.disabled = false; }
      else vrUnavailable('This browser can\u2019t run VR. Open this page in your headset\u2019s browser, or play here in the browser.');
    }).catch((err) => {
      vrUnavailable(err && err.name === 'SecurityError'
        ? 'This browser blocks VR inside this page\u2019s frame, so it can\u2019t start here. You can still play in the browser.'
        : 'This browser can\u2019t run VR. Open this page in your headset\u2019s browser, or play here in the browser.');
    });
  }
  function enterVR() {
    ensureAudio();
    if (!navigator.xr || state.mode === 'vr') return;
    ui.vrBtn.disabled = true;
    showVRNote('');
    let session;
    navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })
      .then((s) => {
        session = s;
        session.addEventListener('end', onVREnd);
        return renderer.xr.setSession(session);
      })
      .then(() => {
        try {
          const layer = session.renderState.baseLayer;
          if (layer && 'fixedFoveation' in layer) layer.fixedFoveation = 0.5;
        } catch (e) { /* optional */ }
        startGame('vr');
      })
      .catch((err) => {
        if (session) { try { session.end(); } catch (e) { /* already ended */ } }
        showVRNote(err && err.name === 'SecurityError'
          ? 'This browser blocked VR inside this page, so it can\u2019t start here. You can still play in the browser.'
          : 'VR didn\u2019t start. Check that your headset is awake, then try again.');
      })
      .finally(() => { ui.vrBtn.disabled = !state.vrOK; });
  }
  function onVREnd() {
    for (const s of SIDES) {
      const h = vrHands[s];
      if (h.laser) h.laser.visible = false;
      h.mesh.visible = false;
    }
    camera.position.set(0, 1.6, 0);
    camera.quaternion.identity();
    if (state.mode === 'vr') toMenu();
    onResize();
  }

