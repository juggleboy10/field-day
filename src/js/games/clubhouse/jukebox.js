  // ================================================================ THE JUKEBOX: pick a song for the clubhouse
  // Buttons on the wall by the jukebox. Everyone in the clubhouse hears the same pick; the newest press wins.
  ((L) => {
    const G = L.group;
    const X = 11.75, Z0 = 1.3, DZ = 0.55;
    addBox(G, 0.08, 1.7, JUKEBOX.length * DZ + 0.4, lam(0x2b2d42), X + 0.15, 1.2, Z0 + ((JUKEBOX.length - 1) * DZ) / 2);
    const sign = makeBoard(G, 640, 200, 2.6, 0.81, X + 0.1, 2.55, Z0 + ((JUKEBOX.length - 1) * DZ) / 2, -Math.PI / 2);
    let shown = '';
    function drawSign() {
      const title = (JUKEBOX.find((j) => j.id === JUKE.sel) || JUKEBOX[0]).title;
      if (title === shown) return;
      shown = title;
      const g = sign.g;
      g.fillStyle = '#2b1d3a'; g.fillRect(0, 0, 640, 200);
      g.strokeStyle = '#ff5c8a'; g.lineWidth = 8; g.strokeRect(4, 4, 632, 192);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `700 34px ${BODY}`; g.fillText('Now playing', 320, 56);
      g.fillStyle = '#ffffff'; g.font = `800 50px ${DISPLAY}`; g.fillText(title, 320, 128, 600);
      sign.tex.needsUpdate = true;
    }
    function pick(id, fromNet) {
      JUKE.sel = id;
      if (!fromNet) {
        JUKE.seq += 1;
        ensureAudio();
        if (!MUSIC.on) setMusicOn(true, true);
        showToast(`Jukebox: ${(JUKEBOX.find((j) => j.id === id) || JUKEBOX[0]).title}`);
        forcePresence();
      }
      if (state.level === L.idx && state.mode !== 'menu') musicTheme('hub');
      drawSign();
    }
    L.jukePick = pick;
    const COLORS = [0x9a90b0, 0xffd23f, 0x4fc3f7, 0xff9ad0, 0x8bd450, 0xb388ff, 0xffb36b];
    JUKEBOX.forEach((j, k) => makeButton(L, new V3(X, 1.05, Z0 + k * DZ), COLORS[k % COLORS.length], j.title, () => pick(j.id, false), { faceYaw: -Math.PI / 2 }));
    drawSign();
    const baseP = L.presence, baseR = L.readPresence;
    L.presence = () => { const p = baseP ? baseP() : {}; if (JUKE.seq) p.jb = [JUKE.seq, JUKEBOX.findIndex((j) => j.id === JUKE.sel)]; return p; };
    L.readPresence = (rec, pres, st) => {
      if (baseR) baseR(rec, pres, st);
      const a = pres.jb;
      if (!Array.isArray(a) || a.length !== 2 || !Number.isInteger(a[0]) || !Number.isInteger(a[1]) || !JUKEBOX[a[1]]) return;
      // the newest pick wins (ties go to the earlier name, so everyone agrees)
      if (a[0] > JUKE.seq || (a[0] === JUKE.seq && rec.peer < state.myPeer && JUKEBOX[a[1]].id !== JUKE.sel)) {
        JUKE.seq = a[0];
        if (JUKEBOX[a[1]].id !== JUKE.sel) pick(JUKEBOX[a[1]].id, true);
      }
    };
  })(hub);

