  // ---------------------------------------------------------------- main loop
  hoops.throwSpeed = [3, 12, 0.2];
  baseball.throwSpeed = [4, 24, 0.08];
  baseball.lockWhileHolding = true;
  discgolf.walkSpeed = 3.4;
  // the places where a little hop is on (J in a browser)
  for (const id of ['hoops', 'baseball', 'lasertag', 'hub', 'hideseek', 'paintball', 'dodgeball', 'ctf']) { const Lv = LEVELS.find((l) => l && l.id === id); if (Lv) Lv.canHop = true; }
  curLevel().group.visible = true;
  applyEnv(curLevel().env);

  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    musicTick();
    voiceTick(performance.now());
    voiceVrButtons();
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    pollPeers();
    const L = curLevel();
    if (state.mode === 'menu') L.attract(now);
    else if (state.mode === 'flat') flatUpdate(dt);
    updateMyPose(now);
    if (state.mode === 'vr') vrUpdate(dt, now);
    watchTick(dt, now);
    if (state.mode === 'flat') {
      state.flatTarget = findFlatTarget();
      ui.cross.classList.toggle('on', !!state.flatTarget || !!state.held);
    }
    updateRemotes(dt);
    updateBodies(L, dt, now);
    L.update(dt, now);
    updateButtons(L, now);
    updateFloats(now);
    updateUi(now);
    netTick(now);
    renderer.render(scene, camera);
  });

  checkVR();
  initNet();
  updateNetUI();
  // the tests in tests/ reach inside through this, only when the page is opened with ?test
  try { if (new URLSearchParams(location.search).has('test')) window.__fd = { LEVELS, state, dolly, camera, switchLevel, startGame }; } catch (e) { /* ignore */ }
})();
