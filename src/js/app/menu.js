  // ---------------------------------------------------------------- start panel
  const levelEls = [];
  const catEls = [];
  const joinBar = document.createElement('div'); joinBar.className = 'join-bar'; joinBar.hidden = true;
  const catGrid = document.createDocumentFragment();
  function makeTile(i) {
    const m = LEVEL_META[i];
    const label = document.createElement('label');
    label.className = 'level' + (i === HUB_IDX ? ' hub-tile' : '');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'level';
    input.value = String(i);
    const glyph = document.createElement('span'); glyph.className = 'glyph'; glyph.setAttribute('aria-hidden', 'true'); glyph.textContent = m.glyph;
    const txt = document.createElement('span'); txt.className = 'txt';
    const strong = document.createElement('strong'); strong.textContent = i === HUB_IDX ? m.name : m.short;
    const count = document.createElement('span'); count.className = 'count';
    txt.append(strong, count);
    input.setAttribute('aria-label', m.name);
    label.title = m.blurb;
    label.append(input, glyph, txt);
    input.addEventListener('change', () => { if (input.checked) switchLevel(i); });
    levelEls[i] = { label, input, count };
    return label;
  }
  ui.levels.append(makeTile(HUB_IDX), joinBar);
  LEVEL_CATS.forEach((c, ci) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cat'; btn.setAttribute('aria-expanded', 'false');
    const glyph = document.createElement('span'); glyph.className = 'glyph'; glyph.setAttribute('aria-hidden', 'true'); glyph.textContent = c.glyph;
    const txt = document.createElement('span'); txt.className = 'txt';
    const strong = document.createElement('strong'); strong.textContent = c.name;
    const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = c.games.map((g) => LEVEL_META[g].short).join(', ');
    txt.append(strong, sub);
    const badge = document.createElement('span'); badge.className = 'badge'; badge.hidden = true;
    btn.append(glyph, txt, badge);
    const panel = document.createElement('div'); panel.className = 'cat-games'; panel.hidden = true;
    c.games.forEach((g) => panel.append(makeTile(g)));
    btn.addEventListener('click', () => { state.catTouched = true; openCat(ci, btn.getAttribute('aria-expanded') !== 'true'); });
    catEls[ci] = { btn, panel, badge, c };
    ui.levels.append(btn);
  });
  // a panel opens right after the row of cards it belongs to (two cards per row)
  function placePanels() {
    catEls.forEach((e, ci) => {
      const rowEnd = Math.min(catEls.length - 1, ci - (ci % 2) + 1);
      const anchor = catEls[rowEnd].btn;
      let after = anchor;
      catEls.forEach((o, oi) => { if (oi <= rowEnd && oi >= ci - (ci % 2) && oi !== ci) { /* siblings share the row */ } });
      e.rowEnd = rowEnd;
    });
  }
  placePanels();
  catEls.forEach((e) => catEls[e.rowEnd].btn.after(e.panel));
  function openCat(ci, open) {
    catEls.forEach((e, k) => {
      const on = open && k === ci;
      e.btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      e.panel.hidden = !on;
      if (on) catEls[e.rowEnd].btn.after(e.panel);
    });
  }
  function catOf(i) { return LEVEL_CATS.findIndex((c) => c.games.includes(i)); }
  function joinLevel(i) {
    const ci = catOf(i);
    if (ci >= 0) openCat(ci, true);
    if (levelEls[i]) { levelEls[i].input.checked = true; switchLevel(i); syncLevelPicker(); }
  }
  PICKER_ORDER.forEach((i) => { if (!levelEls[i]) ui.levels.append(makeTile(i)); });
  function syncLevelPicker() {
    levelEls.forEach((el, i) => {
      el.input.checked = i === state.level;
      el.label.classList.toggle('on', i === state.level);
    });
    const cur = catOf(state.level);
    if (cur >= 0 && catEls[cur] && catEls[cur].btn.getAttribute('aria-expanded') !== 'true' && !state.catTouched) openCat(cur, true);
    if (ui.levelBlurb) ui.levelBlurb.textContent = `${LEVEL_META[state.level].name}: ${LEVEL_META[state.level].blurb}`;
  }
  function updateLevelCounts() {
    const counts = LEVEL_META.map(() => 0);
    for (const p of state.lastPeers || []) {
      if (p.kind !== 'viewer' || p.sameTab || !p.presence || p.presence.p !== 1) continue;
      const lv = p.presence.lv;
      if (Number.isInteger(lv) && lv >= 0 && lv < counts.length) counts[lv]++;
    }
    levelEls.forEach((el, i) => {
      const t = counts[i] ? `${counts[i]} playing` : '';
      if (el.count.textContent !== t) el.count.textContent = t;
    });
    catEls.forEach((e) => {
      const n = e.c.games.reduce((a, g) => a + counts[g], 0);
      const t = n ? `${n} playing` : '';
      e.badge.hidden = !n;
      if (e.badge.textContent !== t) e.badge.textContent = t;
    });
    // Join buttons: busiest places first, up to three
    const hot = counts.map((n, i) => ({ n, i })).filter((o) => o.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
    const sig = hot.map((o) => o.i + ':' + o.n).join(',');
    if (joinBar.dataset.sig !== sig) {
      joinBar.dataset.sig = sig;
      joinBar.replaceChildren();
      for (const o of hot) {
        const bt = document.createElement('button');
        bt.type = 'button'; bt.className = 'join-btn';
        bt.append('Join ' + LEVEL_META[o.i].short + ' ');
        const bd = document.createElement('span'); bd.className = 'badge'; bd.textContent = String(o.n);
        bt.append(bd);
        bt.addEventListener('click', () => joinLevel(o.i));
        joinBar.append(bt);
      }
      joinBar.hidden = hot.length === 0;
    }
  }
  syncLevelPicker();

  ui.name.value = state.name;
  ui.name.addEventListener('input', () => {
    const n = cleanName(ui.name.value);
    state.name = n || 'Player';
    state.nameEdited = !!n;
    savePrefs();
    state.dirtyBoard = true;
    forcePresence();
  });
  ui.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') ui.name.blur(); });
  PLAYER_COLORS.forEach((c, i) => {
    const label = document.createElement('label');
    label.className = 'swatch';
    label.title = c.label;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'color';
    input.value = String(i);
    input.setAttribute('aria-label', c.label);
    input.checked = i === state.colorIdx;
    const span = document.createElement('span');
    span.style.setProperty('--c', c.hex);
    label.append(input, span);
    ui.swatches.append(label);
    input.addEventListener('change', () => { if (input.checked) setColor(i); });
  });
  function drawPreview() {
    if (!ui.lookPreview) return;
    drawLookPreview(ui.lookPreview.getContext('2d'), PLAYER_COLORS[state.colorIdx].hex, state.hat, state.face, state.shirt, state.shirtColor);
  }
  function chipGroup(el, names, key) {
    if (!el) return;
    names.forEach((nm, i) => {
      const label = document.createElement('label');
      label.className = 'chip';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = key;
      input.value = String(i);
      input.checked = state[key] === i;
      const span = document.createElement('span');
      if (key === 'shirtColor' && SHIRT_COLORS[i].hex) { label.classList.add('dot'); span.style.setProperty('--c', SHIRT_COLORS[i].hex); input.setAttribute('aria-label', nm); label.title = nm; }
      else span.textContent = nm;
      label.append(input, span);
      el.append(label);
      input.addEventListener('change', () => {
        if (!input.checked) return;
        state[key] = i;
        savePrefs();
        drawPreview();
        forcePresence();
      });
    });
  }
  function setColor(i) {
    state.colorIdx = i;
    const hex = PLAYER_COLORS[i].hex;
    myHandMat.color.set(hex);
    discgolf.setColor(hex);
    minigolf.setColor(hex);
    bowling.setColor(hex);
    karts.setColor(hex);
    drawPreview();
    savePrefs();
    state.dirtyBoard = true;
    forcePresence();
  }
  function syncLookInputs() {
    ui.swatches.querySelectorAll('input').forEach((el, i) => { el.checked = i === state.colorIdx; });
    if (ui.hatChips) ui.hatChips.querySelectorAll('input').forEach((el, i) => { el.checked = i === state.hat; });
    if (ui.faceChips) ui.faceChips.querySelectorAll('input').forEach((el, i) => { el.checked = i === state.face; });
    if (ui.shirtChips) ui.shirtChips.querySelectorAll('input').forEach((el, i) => { el.checked = i === state.shirt; });
    if (ui.shirtColorChips) ui.shirtColorChips.querySelectorAll('input').forEach((el, i) => { el.checked = i === state.shirtColor; });
  }
  // the clubhouse's look station calls this
  function cycleLook(kind) {
    if (kind === 'hat') state.hat = (state.hat + 1) % HATS.length;
    else if (kind === 'face') state.face = (state.face + 1) % FACES.length;
    else if (kind === 'shirt') state.shirt = (state.shirt + 1) % SHIRTS.length;
    else if (kind === 'shirtColor') state.shirtColor = (state.shirtColor + 1) % SHIRT_COLORS.length;
    else { setColor((state.colorIdx + 1) % PLAYER_COLORS.length); }
    savePrefs();
    drawPreview();
    syncLookInputs();
    forcePresence();
    const msg = { hat: `Hat: ${HATS[state.hat]}`, face: `Face: ${FACES[state.face]}`, shirt: `Shirt: ${SHIRTS[state.shirt]}`, shirtColor: `Shirt color: ${SHIRT_COLORS[state.shirtColor].label}` };
    showToast(msg[kind] || `Color: ${PLAYER_COLORS[state.colorIdx].label}`);
  }
  chipGroup(ui.hatChips, HATS, 'hat');
  chipGroup(ui.faceChips, FACES, 'face');
  chipGroup(ui.shirtChips, SHIRTS, 'shirt');
  chipGroup(ui.shirtColorChips, SHIRT_COLORS.map((c) => c.label), 'shirtColor');
  drawPreview();
  ui.flatBtn.addEventListener('click', () => { ensureAudio(); ui.flatBtn.blur(); startGame('flat'); });
  ui.vrBtn.addEventListener('click', enterVR);
  ui.menuBtn.addEventListener('click', () => { ui.menuBtn.blur(); toMenu(); });
  function syncVoiceToggle() {
    if (!ui.voiceToggle) return;
    const ok = voiceAvailable();
    ui.voiceToggle.disabled = !ok;
    ui.voiceToggle.checked = ok && VOICE.enabled;
    if (ui.voiceNote) ui.voiceNote.hidden = ok || state.transport !== 'claude';
  }
  if (ui.voiceToggle) ui.voiceToggle.addEventListener('change', () => setVoice(ui.voiceToggle.checked));
  if (ui.micBtn) ui.micBtn.addEventListener('click', () => { ui.micBtn.blur(); setMuted(!VOICE.muted); });
  if (ui.musicBtn) ui.musicBtn.addEventListener('click', () => { ui.musicBtn.blur(); ensureAudio(); musicTheme(curLevel().meta.id); setMusicOn(!MUSIC.on); });
  if (ui.musicToggle) { ui.musicToggle.checked = MUSIC.on; ui.musicToggle.addEventListener('change', () => setMusicOn(ui.musicToggle.checked, true)); }

