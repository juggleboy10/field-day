  // ---------------------------------------------------------------- main loop
  hoops.throwSpeed = [3, 12, 0.2];
  baseball.throwSpeed = [4, 24, 0.08];
  baseball.lockWhileHolding = true;
  discgolf.walkSpeed = 3.4;
  // the places where a little hop is on (J in a browser; A or X, or the right stick pushed up, in VR)
  for (const id of ['hoops', 'baseball', 'lasertag', 'hub', 'hideseek', 'paintball', 'dodgeball', 'ctf']) { const Lv = LEVELS.find((l) => l && l.id === id); if (Lv) { Lv.canHop = true; Lv.vrHop = true; } }
  curLevel().group.visible = true;
  applyEnv(curLevel().env);

  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    musicTick();
    voiceTick(performance.now());
    voiceVrButtons();
    const now = performance.now();
    // Game time keeps up with real time on any headset. A frame that took longer than 1/20 s (a Quest 2 working hard
    // on a busy scene, say) is played as a few shorter steps rather than cut short, so nobody runs in slow motion next
    // to someone with a faster headset. (Past 0.15 s, like coming back to the tab, the rest is dropped.)
    const raw = Math.min(0.15, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    const steps = Math.max(1, Math.ceil(raw / 0.05 - 1e-6)), dt = raw / steps;
    state.frameSteps = steps;
    state.frameMs = (state.frameMs || 16) * 0.95 + Math.min(100, raw * 1000) * 0.05;     // a running average of the frame time
    pollPeers();
    const L = curLevel();
    if (state.mode === 'menu') L.attract(now);
    updateMyPose(now);
    for (let si = 0; si < steps; si++) {
      const t = now - (steps - 1 - si) * dt * 1000;
      if (state.mode === 'flat') flatUpdate(dt);
      if (state.mode === 'vr') vrUpdate(dt, t);
      watchTick(dt, t);
      if (state.mode === 'flat') {
        state.flatTarget = findFlatTarget();
        ui.cross.classList.toggle('on', !!state.flatTarget || !!state.held);
      }
      updateRemotes(dt);
      updateBodies(L, dt, t);
      for (const Lv of LEVELS) if (Lv && Lv.overlay) Lv.overlay.visible = Lv === L && state.mode !== 'menu';
      L.update(dt, t);
      if (L.recBoard) RECORDS.draw(L);
      if (si < steps - 1) updateMyPose(t);
    }
    PRIZE_FX.tick(dt * steps, now);
    CAMERA.tick(dt * steps, now);
    if (L.picker) L.picker.tick();
    if (L.sitOut) L.sitOut.tick(dt * steps);
    updateButtons(L, now);
    updateFloats(now);
    updateUi(now);
    netTick(now);
    renderer.render(scene, CAMERA.viewCam() || camera);   // (a browser selfie shows what the camera sees)
    CAMERA.afterRender();
  });

  checkVR();
  initNet();
  updateNetUI();
  // the tests in tests/ reach inside through this, only when the page is opened with ?test
  // the shared records board (the Claude page's database, or records.php on your own site), if there is one
  RECORDS.shared.start();
  PHOTOS.start();
  try { if (new URLSearchParams(location.search).has('test')) window.__fd = { LEVELS, vrHands, CAMERA, PHOTOS, prizeFx: PRIZE_FX, BOTLV, watch: { press: watchPress, btns: watchBtns, draw: () => { panelKey = ''; drawPanel(); return panelC.g.canvas.toDataURL(); } }, state, dolly, camera, myHead, myHands, RECORDS, APLUS, switchLevel, startGame, voice: { VOICE, voiceWatch, voiceResend, remotes, buildPresence, createRemote, bodyFollow }, audio: { snd, tone, sfx, ensureAudio, MUSIC } }; } catch (e) { /* ignore */ }
})();
