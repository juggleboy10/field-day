  // ---------------------------------------------------------------- HUD + boards
  function playerRows(L) {
    const rows = [Object.assign({ name: state.name, color: PLAYER_COLORS[state.colorIdx].hex, me: true }, L.rowFor(null, true))];
    for (const rec of remotes.values()) {
      if (!inMyLevel(rec)) continue;
      const st = rec.lvState[L.id] || {};
      rows.push(Object.assign({ name: rec.name, color: PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '#ffffff', me: false }, L.rowFor(st, false)));
    }
    rows.sort((a, b) => L.sortRows(a, b) || (a.me ? -1 : b.me ? 1 : a.name.localeCompare(b.name)));
    return rows;
  }
  function renderHudScores(rows) {
    ui.hudScores.replaceChildren(...rows.slice(0, 8).map((p) => {
      const li = document.createElement('li');
      if (p.me) li.className = 'me';
      const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = p.color;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = p.me ? `${p.name} (you)` : p.name;
      const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = p.text;
      li.append(sw, nm, sc);
      return li;
    }));
  }
  function renderHud() {
    const L = curLevel();
    ui.hudTitle.textContent = L.meta.name;
    if (ui.musicBtn) ui.musicBtn.textContent = MUSIC.on ? 'Music: on' : 'Music: off';
    if (ui.micBtn) { ui.micBtn.hidden = !VOICE.stream; ui.micBtn.textContent = VOICE.muted ? 'Mic: muted' : 'Mic: on'; }
    syncVoiceToggle();
    if (ui.musicToggle) ui.musicToggle.checked = MUSIC.on;
    const actionBtns = L.hudActions.filter((a) => !a.show || a.show()).map((a) => {
      const b = document.createElement('button');
      b.className = 'hud-btn';
      b.type = 'button';
      b.textContent = a.label();
      b.addEventListener('click', () => { b.blur(); a.run(); state.hudDirty = true; });
      return b;
    });
    if (L.canHop) {
      const jb = document.createElement('button'); jb.className = 'hud-btn'; jb.type = 'button'; jb.textContent = 'Jump';
      jb.addEventListener('click', () => { jb.blur(); hopNow(); });
      actionBtns.push(jb);
    }
    ui.hudLevelActions.replaceChildren(...actionBtns);
    const hs = (L.hintsFor ? L.hintsFor() : L.hints).slice();
    if (L.canHop) hs.push(['J', 'jump']);
    ui.hints.replaceChildren(...hs.map(([k, t]) => {
      const s = document.createElement('span');
      const kb = document.createElement('kbd');
      kb.textContent = k;
      s.append(kb, document.createTextNode(t));
      return s;
    }));
    ui.hints.hidden = coarse;
    ui.grabBtn.hidden = !!L.grabless;
    ui.throwBtn.hidden = !!L.noLocomotion;
    ui.throwBtn.textContent = L.throwLabel ? L.throwLabel() : holdingTool() ? 'Swing' : 'Hold to throw';
  }
  function updateUi(now) {
    const L = curLevel();
    if (state.dirtyBoard && now - state.boardT > 250) {
      state.dirtyBoard = false;
      state.boardT = now;
      const rows = playerRows(L);
      L.drawBoard(rows);
      renderHudScores(rows);
    }
    if (state.hudDirty && state.mode === 'flat') { state.hudDirty = false; renderHud(); }
    if (state.charge !== null) ui.powerFill.style.width = `${Math.round(Math.min(1, (now - state.charge) / 1000) * 100)}%`;
    if (now - state.netUiT > 500) { state.netUiT = now; updateNetUI(); }
  }

  function onResize() {
    if (renderer.xr.isPresenting) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      for (const f of redraws.slice()) f();
      state.dirtyBoard = true;
      for (const rec of remotes.values()) {
        if (rec.colorIdx >= 0) { drawTag(rec.tagC.g, rec.name, PLAYER_COLORS[rec.colorIdx].hex); rec.tagC.tex.needsUpdate = true; }
      }
    });
  }

