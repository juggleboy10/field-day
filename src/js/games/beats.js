  // ================================================================ LEVEL: BEAT BLADES
  // A rhythm game. Blocks fly down a neon runway in time with the music; slice each with the blade of its colour
  // (red in your left hand, blue in your right) in the direction its arrow points. A dot can be cut any way.
  // Dodge the bombs, lean out of the way of the walls. Three original songs, played by the game's own synths,
  // each with an Easy, Normal and Hard chart worked out from the music itself, so every block lands on a beat.
  // In a browser your mouse is the blade (any colour will do). Friends play side by side on lanes of their own.
  const beats = (() => {
    const L = newLevel(25);
    const G = L.group;
    const rand = mulberry32(8080);
    L.grabless = true;
    // (no walking with the stick mid-song; between songs you can walk over to the kiosk)
    Object.defineProperty(L, 'noLocomotion', { get: () => !!(L.bb && L.bb.st === 'play') });
    L.bounds = { minX: -7, maxX: 7, minZ: -6, maxZ: 4 };
    L.env = {
      sky: skyTexture([[0, '#05010f'], [0.45, '#1a0533'], [0.55, '#3a0a4a'], [1, '#05010f']]),
      bg: 0x07020f, fog: [0x12051e, 18, 70], hemi: [0x7a5aff, 0x10081a, 0.6],
      sun: [0xff66cc, 0.25], sunDir: new V3(0, 1, -1), ambient: [0x302050, 0.5], sprite: null,
    };
    const HZ = -1.15;            // where you cut: just over an arm's length in front
    const COLS = [-0.72, -0.24, 0.24, 0.72], ROWS = [0.8, 1.2, 1.6];
    const CUBE = 0.36, RED = 0xff3355, BLUE = 0x33aaff, RED_HEX = '#ff3355', BLUE_HEX = '#33aaff';
    const DIFFS = [
      { name: 'Easy', speed: 9, look: 2.0, mult: 0.5, gap: 0.7 },
      { name: 'Normal', speed: 11, look: 1.6, mult: 1, gap: 0.42 },
      { name: 'Hard', speed: 13, look: 1.35, mult: 1.6, gap: 0.26 },
    ];

    // ---------------------------------------------------------------- the stage: a runway of light into the dark
    const floorTex = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#07030f'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(160,80,255,0.35)'; g.lineWidth = 2;
      for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    });
    floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping; floorTex.tex.repeat.set(14, 30);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 60), new THREE.MeshBasicMaterial({ map: floorTex.tex }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -24); G.add(floor);
    // the runway: a dark strip with glowing edges, one per lane (lanes are added as players arrive)
    const runMat = new THREE.MeshBasicMaterial({ color: 0x0c0618 }), edgeMat = new THREE.MeshBasicMaterial({ color: 0xff3aa8 });
    const LANE_W = 3.2, MAX_LANES = 4;
    const runways = [];
    for (let k = 0; k < MAX_LANES; k++) {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(boxg(2.0, 0.02, 44), runMat), 0, 0.01, -21));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(boxg(0.05, 0.03, 44), edgeMat), sx * 1.0, 0.02, -21));
      // a pad to stand on
      const pad = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.52, 32), new THREE.MeshBasicMaterial({ color: 0x8a5aff }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.025, 0); g.add(pad);
      g.visible = k === 0; G.add(g); runways.push(g);
    }
    // light rings down the runway that pulse on the beat
    const rings = [];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.05, 6, 4), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff3aa8 : 0x3a8aff, transparent: true, opacity: 0.5 }));
      m.rotation.z = Math.PI / 4; m.position.set(0, 1.8, -12 - i * 4.2); G.add(m); rings.push(m);
    }
    // side towers of light
    const towers = [];
    for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(boxg(0.25, 6, 0.25), new THREE.MeshBasicMaterial({ color: sx < 0 ? 0xff3355 : 0x33aaff, transparent: true, opacity: 0.35 }));
      m.position.set(sx * (7 + i * 0.6), 3, -10 - i * 6); G.add(m); towers.push(m);
    }
    // stars
    {
      const pos = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) { const a = rand() * Math.PI * 2, e = rand() * 0.9 + 0.05, r = 80; pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r - 20; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      G.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true })));
    }

    // ---------------------------------------------------------------- songs (original, played by the game's synths)
    // A song is chords, drum patterns and a few layers; its sections say which layers play and how busy the chart is.
    const SONGS = [
      { title: 'Neon Sunrise', bpm: 118, chords: ['Am', 'F', 'C', 'G'], arp: 'synth', lead: 'pluck', pad: 'pad',
        drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..o...o...o...o.' }, bass: 'x..x..x.x..x..x.', seed: 11,
        sections: [['intro', 4, 'kh', 0.2], ['verse', 8, 'khsba', 1], ['build', 4, 'khsbap', 1.4], ['drop', 8, 'khsbalp', 2], ['break', 4, 'pa', 0.6, true], ['drop', 8, 'khsbalp', 2], ['outro', 4, 'kp', 0.5]] },
      { title: 'Pixel Rush', bpm: 138, chords: ['Dm', 'Bb', 'C', 'A'], arp: 'pluck', lead: 'synth', pad: 'pad',
        drums: { k: 'x...x...x...x.x.', s: '....x.......x...', h: 'x-x-x-x-x-x-x-x-' }, bass: 'x.xx..x.x.xx..x.', seed: 23,
        sections: [['intro', 4, 'kh', 0.4], ['verse', 8, 'khsba', 1.2], ['build', 4, 'khsbap', 1.6], ['drop', 8, 'khsbalp', 2.2], ['break', 4, 'pa', 0.7, true], ['drop', 8, 'khsbalp', 2.3], ['outro', 4, 'kh', 0.6]] },
      { title: 'Starfall', bpm: 100, chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G6'], arp: 'marimba', lead: 'vibes', pad: 'pad',
        drums: { k: 'x.......x.x.....', s: '....x.......x...', sh: '-o-o-o-o-o-o-o-o' }, bass: 'x......x..x.....', seed: 37,
        sections: [['intro', 4, 'p', 0.2], ['verse', 8, 'kshbap', 0.9], ['chorus', 8, 'kshbalp', 1.5], ['break', 4, 'pa', 0.5, true], ['chorus', 8, 'kshbalp', 1.7], ['outro', 4, 'pa', 0.4]] },
    ];
    for (const sg of SONGS) {
      sg.step = 60 / sg.bpm / 4;
      sg.bars = sg.sections.reduce((n, s) => n + s[1], 0);
      sg.len = sg.bars * 16 * sg.step;
      // which section each bar is in
      sg.barSec = [];
      for (const s of sg.sections) for (let b = 0; b < s[1]; b++) sg.barSec.push(s);
      // a two-bar melody of our own: chord tones picked by a seeded roll, held for one or two sixteenths
      const r = mulberry32(sg.seed);
      sg.motif = [];
      for (let i = 0; i < 32; i++) sg.motif.push(i % 2 === 0 && r() < 0.62 ? 1 + Math.floor(r() * 4) : 0);
    }
    L.SONGS = SONGS;

    // the song's own little sequencer, on the audio clock
    let songOut = null;
    function songChain() {
      const c = snd.ctx;
      if (!c) return null;
      if (!songOut) { songOut = c.createGain(); songOut.gain.value = 0.3; songOut.connect(snd.master); }
      return songOut;
    }
    const PAT = (s) => s.split('').map((ch) => (ch === 'x' ? 1 : ch === 'o' ? 0.55 : ch === '-' ? 0.3 : 0));
    function playStep(c, out, sg, step, t) {
      const bar = Math.floor(step / 16), s = step % 16;
      if (bar >= sg.bars) return;
      const lay = sg.barSec[bar][2], chord = CH[sg.chords[bar % sg.chords.length]] || CH.C;
      for (const [kind, pat] of Object.entries(sg.drums)) {
        const want = kind === 'sh' ? 'h' : kind;
        if (!lay.includes(want)) continue;
        const v = PAT(pat)[s]; if (v) drum(c, out, t, kind, v * 1.6);
      }
      if (lay.includes('b') && sg.bass[s] === 'x') INST.bass(c, out, t, chord[0], sg.step * 2.2, 1.1);
      if (lay.includes('a') && s % 2 === 0) INST[sg.arp](c, out, t, chord[1 + ((s / 2) % 4)] + 12, sg.step * 2.5, 0.9);
      if (lay.includes('p') && s === 0) for (const m of chord.slice(1, 4)) INST[sg.pad](c, out, t, m, sg.step * 15, 0.9);
      if (lay.includes('l')) { const d = sg.motif[step % 32]; if (d) INST[sg.lead](c, out, t, chord[d] + 12, sg.step * 1.8, 1.0); }
    }

    // ---------------------------------------------------------------- charts: worked out from the song
    // Each section's busyness, times the difficulty, picks a rhythm on the sixteenth grid. Hands alternate, each hand
    // swings down then up (the way your arms naturally go), with some sideways and diagonal cuts as it gets harder.
    // Bombs sit where you're not swinging; walls (VR only) come in the breaks.
    const RHYTHM = [
      [0.35, [0]], [0.7, [0, 8]], [1.15, [0, 4, 8, 12]], [1.75, [0, 4, 6, 8, 12, 14]], [2.4, [0, 2, 4, 6, 8, 10, 12, 14]], [9, [0, 2, 4, 6, 8, 10, 11, 12, 14]],
    ];
    const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0], [-0.707, 0.707], [0.707, 0.707], [-0.707, -0.707], [0.707, -0.707], [0, 0]];
    const UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3, UL = 4, UR = 5, DL = 6, DR = 7, ANY = 8;
    function makeChart(si, di, vr) {
      const sg = SONGS[si], D = DIFFS[di], r = mulberry32(sg.seed * 10 + di);
      const notes = [];
      const hand = [{ t: -9, down: true, col: 1 }, { t: -9, down: true, col: 2 }];
      let next = 0;            // which hand gets the next single note
      let wallSide = 0;
      for (let bar = 0; bar < sg.bars; bar++) {
        const sec = sg.barSec[bar], e = sec[3] * D.mult;
        const isIntroEnd = sec[0] === 'intro' && bar === sg.sections[0][1] - 1;
        const steps = isIntroEnd && e < 0.35 ? [8] : (RHYTHM.find((x) => e <= x[0]) || RHYTHM[RHYTHM.length - 1])[1];
        // walls in the breaks (VR, Normal and Hard): one side, then the other
        let wallNow = -1;
        if (sec[4] && vr && di > 0) {
          const firstBar = sg.barSec.indexOf(sec);
          if ((bar - firstBar) % 2 === 0) { wallSide = wallSide ? 0 : 1; notes.push({ kind: 'w', t: (bar * 16) * sg.step, side: wallSide, dur: 16 * sg.step * 1.5 }); }
          wallNow = wallSide;
        }
        for (const s of steps) {
          const t = (bar * 16 + s) * sg.step;
          if (t < 1.5) continue;
          // (both hands at once only in VR: a mouse is one blade)
          const dbl = vr && di > 0 && s === 0 && (sec[0] === 'drop' || sec[0] === 'chorus') && bar % (di === 2 ? 1 : 2) === 0;
          const who = dbl ? [0, 1] : [next];
          for (const h of who) {
            const H = hand[h];
            if (t - H.t < D.gap && !dbl) continue;
            // under a wall, keep to the open side
            const side = wallNow >= 0 ? 1 - wallNow : -1;
            let col = h === 0 ? (r() < 0.6 ? 1 : 0) : (r() < 0.6 ? 2 : 3);
            if (side === 0) col = h === 0 ? 0 : 1; else if (side === 1) col = h === 0 ? 2 : 3;
            let dir, row;
            const down = !H.down;            // flip from the last swing
            const fancy = r() < (di === 0 ? 0 : di === 1 ? 0.18 : 0.32);
            if (di === 0 && r() < 0.15) { dir = ANY; row = 1; }
            else if (fancy && r() < 0.4) { dir = h === 0 ? (down ? RIGHT : LEFT) : (down ? LEFT : RIGHT); row = 1; }
            else if (fancy) { dir = down ? (h === 0 ? DR : DL) : (h === 0 ? UL : UR); row = down ? 2 : 0; }
            else { dir = down ? DOWN : UP; row = down ? (r() < 0.5 ? 2 : 1) : 0; }
            if (dbl) { dir = down ? DOWN : UP; row = down ? 2 : 0; col = h === 0 ? 1 : 2; }
            notes.push({ kind: 'n', t, hand: h, col, row, dir });
            H.t = t; H.down = down; H.col = col;
          }
          if (!dbl) next = 1 - next;
        }
        // bombs on the off-beats (Normal and Hard), up in an outside corner where no block is near
        if (di > 0 && e >= 0.8) {
          for (const s of [2, 6, 10, 14]) {
            if (r() > (di === 2 ? 0.3 : 0.18)) continue;
            const t = (bar * 16 + s) * sg.step, col = r() < 0.5 ? 0 : 3;
            if (notes.some((n) => n.kind === 'n' && Math.abs(n.t - t) < sg.step * 1.5 && Math.abs(n.col - col) <= 1)) continue;
            if (wallNow >= 0 && (col < 2 ? 0 : 1) === wallNow) continue;
            notes.push({ kind: 'b', t, col, row: 2 });
          }
        }
      }
      notes.sort((a, b) => a.t - b.t);
      // the best you could score: every block at full marks, with the multiplier climbing as it does
      let max = 0, mult = 1, prog = 0;
      for (const n of notes) {
        if (n.kind !== 'n') continue;
        max += 115 * mult;
        if (mult < 8) { prog += 1; if (prog >= mult * 2) { mult *= 2; prog = 0; } }
      }
      return { notes, max, si, di };
    }
    L.makeChart = makeChart;

    // ---------------------------------------------------------------- blocks, bombs, walls, debris
    const arrowTex = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(64, 22); g.lineTo(108, 70); g.lineTo(84, 70); g.lineTo(64, 50); g.lineTo(44, 70); g.lineTo(20, 70); g.closePath(); g.fill();
    }).tex;
    const dotTex = canvasTexture(128, 128, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 18, 0, Math.PI * 2); g.fill(); }).tex;
    const cubeGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const faceMats = {};
    for (const [h, col] of [[0, RED], [1, BLUE]]) for (const kind of ['arrow', 'dot']) {
      const side = new THREE.MeshLambertMaterial({ color: col, emissive: new THREE.Color(col).multiplyScalar(0.35) });
      const front = new THREE.MeshBasicMaterial({ color: 0xffffff, map: kind === 'arrow' ? arrowTex : dotTex });
      // a coloured face with the white mark on it: draw the mark over a coloured backing
      front.onBeforeCompile = null;
      faceMats[h + kind] = [side, side, side, side, new THREE.MeshLambertMaterial({ color: col, emissive: new THREE.Color(col).multiplyScalar(0.5), map: kind === 'arrow' ? arrowTex : dotTex }), side];
    }
    // (the texture's white mark multiplies with the colour, so the mark reads as a bright patch on the cube's face)
    const blocks = [];
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(cubeGeo, faceMats['0arrow']);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(CUBE * 0.9, CUBE * 0.9), new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, depthWrite: false }));
      mark.position.z = CUBE / 2 + 0.002; m.add(mark);
      m.visible = false; G.add(m); blocks.push({ m, mark, n: null });
    }
    const bombGeo = new THREE.IcosahedronGeometry(0.17, 1), bombMat = new THREE.MeshLambertMaterial({ color: 0x1a1a22, emissive: 0x220010 });
    const bombs = [];
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(bombGeo, bombMat); m.visible = false; G.add(m); bombs.push({ m, n: null }); }
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xff2255, transparent: true, opacity: 0.28, depthWrite: false });
    const wallEdge = new THREE.LineBasicMaterial({ color: 0xff6688 });
    const walls = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wallMat);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), wallEdge); m.add(e);
      m.visible = false; G.add(m); walls.push({ m, n: null });
    }
    const halfGeo = new THREE.BoxGeometry(CUBE, CUBE / 2, CUBE);
    const debris = [];
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(halfGeo, new THREE.MeshLambertMaterial({ color: RED, transparent: true })); m.visible = false; G.add(m); debris.push({ m, v: new V3(), w: new V3(), t: 0 }); }
    let debrisI = 0;
    function shatter(pos, dirX, dirY, color, rot) {
      // two halves flying apart across the cut
      const px = -dirY, py = dirX;
      for (const sgn of [-1, 1]) {
        const d = debris[debrisI++ % debris.length];
        d.m.material.color.setHex(color); d.m.material.opacity = 1;
        d.m.position.copy(pos); d.m.position.x += px * sgn * 0.05; d.m.position.y += py * sgn * 0.05;
        d.m.rotation.set(0, 0, rot + (sgn < 0 ? Math.PI : 0));
        d.v.set(px * sgn * 2.2 + dirX * 1.2, py * sgn * 2.2 + dirY * 1.2 + 0.4, -0.6);   // apart and away from you, not into your face
        d.w.set((rand() - 0.5) * 8, (rand() - 0.5) * 8, (rand() - 0.5) * 8);
        d.t = 0.45; d.m.visible = true;
      }
    }

    // ---------------------------------------------------------------- blades
    function makeSaber(col) {
      const g = new THREE.Group();
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 10), lam(0x30303a)); hilt.rotation.x = Math.PI / 2; hilt.position.z = 0.0; g.add(hilt);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1.0, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      core.rotation.x = Math.PI / 2; core.position.z = -0.6; g.add(core);
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.0, 10), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.rotation.x = Math.PI / 2; glow.position.z = -0.6; g.add(glow);
      g.userData.glow = glow;
      g.visible = false;
      L.overlay.add(g);
      return g;
    }
    const sabers = { left: makeSaber(RED), right: makeSaber(BLUE) };
    const flatSaber = makeSaber(0xb066ff);
    // each blade's segment now and a frame ago (hilt end to tip), for sweeping through blocks
    const blade = { left: { a: new V3(), b: new V3(), pa: new V3(), pb: new V3(), ok: false, was: false }, right: { a: new V3(), b: new V3(), pa: new V3(), pb: new V3(), ok: false, was: false }, flat: { a: new V3(), b: new V3(), pa: new V3(), pb: new V3(), ok: false, was: false } };
    const _q = new Q4(), _v = new V3(), _w = new V3();
    function poseSaber(g, B, pos, quat) {
      g.position.copy(pos); g.quaternion.copy(quat); g.visible = true;
      B.pa.copy(B.a); B.pb.copy(B.b);
      B.a.set(0, 0, -0.1).applyQuaternion(quat).add(pos);
      B.b.set(0, 0, -1.1).applyQuaternion(quat).add(pos);
      if (!B.was) { B.pa.copy(B.a); B.pb.copy(B.b); }
      B.ok = B.was = true;
    }
    // the browser blade: from low in front of you out to the point under the mouse, on the cutting plane
    const mouse = { x: 0, y: -0.2, seen: false };
    renderer.domElement.addEventListener('pointermove', (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; mouse.seen = true;
    });
    const ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _pv = new V3(), _tip = new V3();
    function flatBlade() {
      _ndc.set(mouse.x, mouse.y);
      camera.updateMatrixWorld(true);
      ray.setFromCamera(_ndc, camera);
      const zp = dolly.position.z + HZ, o = ray.ray.origin, d = ray.ray.direction;
      if (Math.abs(d.z) < 1e-4) return;
      const t = (zp - o.z) / d.z;
      _tip.copy(o).addScaledVector(d, t);
      camera.getWorldPosition(_pv); _pv.y -= 0.75; _pv.z -= 0.2;
      _w.subVectors(_pv, _tip).normalize();
      const B = blade.flat;
      B.pa.copy(B.a); B.pb.copy(B.b);
      B.b.copy(_tip); B.a.copy(_tip).addScaledVector(_w, 1.0);
      if (!B.was) { B.pa.copy(B.a); B.pb.copy(B.b); }
      B.ok = B.was = true;
      flatSaber.position.copy(B.a).addScaledVector(_w, 0.1);
      flatSaber.lookAt(_v.copy(flatSaber.position).addScaledVector(_w, 1));
      flatSaber.visible = true;
    }

    // ---------------------------------------------------------------- playing a song
    const BB = { st: 'idle', si: 0, di: 1, chart: null, i: 0, t0: 0, pt0: 0, nextStep: 0, score: 0, combo: 0, maxCombo: 0, mult: 1, prog: 0, hp: 0.5, hits: 0, misses: 0, best: prefs.bbBest || {}, clock: null, laneX: 0, result: null, beat: -1, fx: 0 };
    L.bb = BB;
    function songNow() {
      if (BB.clock) return BB.clock();
      const c = snd.ctx;
      return c && c.state === 'running' && BB.audio ? c.currentTime - BB.t0 : (performance.now() - BB.pt0) / 1000;
    }
    function lanes() {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      ids.sort();
      return { k: Math.max(0, ids.indexOf(state.myPeer)), n: Math.min(MAX_LANES, ids.length) };
    }
    const laneXOf = (k, n) => (k - (n - 1) / 2) * LANE_W;
    function standInLane() {
      const { k, n } = lanes();
      BB.laneX = laneXOf(Math.min(k, MAX_LANES - 1), Math.max(n, Math.min(k + 1, MAX_LANES)));
      // (in a browser the camera sits where the game puts it, so just stand the body on the spot)
      if (state.mode !== 'vr') dolly.position.set(BB.laneX, 0, 0);
      else { camera.getWorldPosition(_v); dolly.position.x += BB.laneX - _v.x; dolly.position.z += 0 - _v.z; }
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.12; }
    }
    function start() {
      if (state.mode === 'menu') return;
      ensureAudio();
      const c = snd.ctx;
      BB.chart = makeChart(BB.si, BB.di, state.mode === 'vr');
      Object.assign(BB, { st: 'play', i: 0, nextStep: 0, score: 0, combo: 0, maxCombo: 0, mult: 1, prog: 0, hp: 0.5, hits: 0, misses: 0, result: null, beat: -1 });
      for (const o of blocks.concat(bombs, walls)) { o.n = null; o.m.visible = false; }
      BB.audio = !!(c && c.state === 'running');
      BB.t0 = BB.audio ? c.currentTime + 2.5 : 0; BB.pt0 = performance.now() + 2500;
      // quiet the lounge music while the song plays
      if (MUSIC.voice && c) { const g = MUSIC.voice.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(0, c.currentTime + 0.8); }
      standInLane();
      showToast(`${SONGS[BB.si].title} (${DIFFS[BB.di].name}): get ready…`);
      sfx('click', 0.8);
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    function stop(why) {
      if (BB.st !== 'play') return;
      const c = snd.ctx;
      if (songOut && c) { const g = songOut.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(0, c.currentTime + 0.4); const old = songOut; songOut = null; setTimeout(() => { try { old.disconnect(); } catch (e) { /* ignore */ } }, 900); }
      if (MUSIC.voice && c) { const g = MUSIC.voice.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(0, c.currentTime); g.linearRampToValueAtTime((MUSIC_THEMES.beats || {}).gain || 1, c.currentTime + 2); }
      for (const o of blocks.concat(bombs, walls)) { o.n = null; o.m.visible = false; }
      const ch = BB.chart, acc = ch && ch.max ? BB.score / ch.max : 0;
      BB.st = why === 'quit' ? 'idle' : why;
      if (why === 'done' || why === 'failed') {
        const rank = why === 'failed' ? 'Failed' : acc >= 0.9 ? 'SS' : acc >= 0.8 ? 'S' : acc >= 0.65 ? 'A' : acc >= 0.5 ? 'B' : acc >= 0.35 ? 'C' : 'D';
        const key = `${BB.si}:${BB.di}`, newBest = why === 'done' && BB.score > (BB.best[key] || 0);
        if (newBest) { BB.best[key] = BB.score; prefs.bbBest = BB.best; savePrefs(); }
        if (why === 'done') RECORDS.add(L, `s${BB.si}`, BB.score);
        BB.result = { rank, score: BB.score, acc, maxCombo: BB.maxCombo, hits: BB.hits, misses: BB.misses, newBest };
        if (why === 'done') { sfx('fanfare', 0.9); showToast(`${rank}! ${BB.score.toLocaleString()} points${newBest ? ' · new best' : ''}`); }
        else { sfx('buzzer', 0.8); showToast('Out of energy. Try again, or pick an easier level'); }
      }
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    L.bbStart = start; L.bbStop = stop;
    function addHit(n, quality) {
      const pts = Math.round((70 + 45 * quality) * BB.mult);
      BB.score += pts; BB.combo += 1; BB.hits += 1; BB.maxCombo = Math.max(BB.maxCombo, BB.combo);
      if (BB.mult < 8) { BB.prog += 1; if (BB.prog >= BB.mult * 2) { BB.mult *= 2; BB.prog = 0; } }
      BB.hp = Math.min(1, BB.hp + 0.01);
      state.dirtyBoard = true;
      return pts;
    }
    function addMiss(what) {
      BB.combo = 0; BB.misses += 1;
      if (BB.mult > 1) BB.mult /= 2;
      BB.prog = 0;
      BB.hp -= what === 'bomb' ? 0.15 : 0.1;
      if (BB.hp <= 0) { BB.hp = 0; stop('failed'); }
    }
    // does a blade's sweep since last frame pass through a ball of radius r at p? returns the cut's direction and speed
    const _s0 = new V3(), _s1 = new V3(), _cl = new V3();
    function sweepHit(B, p, r, dt) {
      if (!B.ok) return null;
      let best = null;
      for (let k = 0; k <= 8; k++) {
        const f = 0.15 + (k / 8) * 0.85;
        _s0.lerpVectors(B.pa, B.pb, f); _s1.lerpVectors(B.a, B.b, f);
        _w.subVectors(_s1, _s0);
        const len2 = _w.lengthSq();
        const u = len2 > 1e-9 ? clamp(_cl.subVectors(p, _s0).dot(_w) / len2, 0, 1) : 0;
        _cl.copy(_s0).addScaledVector(_w, u);
        const d = _cl.distanceTo(p);
        if (d < r && (!best || d < best.d)) best = { d, vx: _w.x / dt, vy: _w.y / dt, vz: _w.z / dt };
      }
      // a blade simply resting inside a block counts too (no direction)
      if (!best) {
        _w.subVectors(B.b, B.a); const len2 = _w.lengthSq();
        const u = clamp(_cl.subVectors(p, B.a).dot(_w) / len2, 0, 1); _cl.copy(B.a).addScaledVector(_w, u);
        if (_cl.distanceTo(p) < r * 0.8) best = { d: 0, vx: 0, vy: 0, vz: 0 };
      }
      return best;
    }
    const _bp = new V3();
    function blockPos(n, now, out) {
      const D = DIFFS[BB.di];
      return out.set(BB.laneX + COLS[n.col], ROWS[n.row], dolly.position.z * 0 + HZ - (n.t - now) * D.speed);
    }
    function stepSong(dt) {
      const c = snd.ctx, sg = SONGS[BB.si], D = DIFFS[BB.di], ch = BB.chart;
      const now = songNow();
      // the music, booked half a second ahead
      if (BB.audio && c) {
        const out = songChain();
        while (out && BB.nextStep < sg.bars * 16 && BB.t0 + BB.nextStep * sg.step < c.currentTime + 0.5) { playStep(c, out, sg, BB.nextStep, BB.t0 + BB.nextStep * sg.step); BB.nextStep += 1; }
      }
      // new things come into view
      while (BB.i < ch.notes.length && ch.notes[BB.i].t - now < D.look) {
        const n = ch.notes[BB.i++];
        const pool = n.kind === 'n' ? blocks : n.kind === 'b' ? bombs : walls;
        const o = pool.find((x) => !x.n);
        if (!o) continue;
        o.n = n; o.m.visible = true;
        if (n.kind === 'n') {
          const mats = faceMats[n.hand + (n.dir === ANY ? 'dot' : 'arrow')];
          o.m.material = mats; o.mark.material.map = n.dir === ANY ? dotTex : arrowTex; o.mark.material.needsUpdate = true;
          const v = DIRV[n.dir];
          o.m.rotation.set(0, 0, n.dir === ANY ? 0 : Math.atan2(v[1], v[0]) - Math.PI / 2);
        }
      }
      const zHead = 0;
      for (const o of blocks) {
        if (!o.n) continue;
        const n = o.n;
        blockPos(n, now, o.m.position);
        const age = D.look - (n.t - now);
        // grows in as it arrives, and shrinks away once it's past where you cut (so it never fills your view)
        o.m.scale.setScalar(clamp(age / 0.25, 0.2, 1) * clamp(1 - (o.m.position.z - (HZ + 0.12)) / 0.4, 0, 1));
        // slicing (only once it's near you)
        if (Math.abs(o.m.position.z - HZ) < 0.9) {
          for (const side of state.mode === 'vr' ? ['left', 'right'] : ['flat']) {
            const hit = sweepHit(blade[side], o.m.position, CUBE * 0.75, dt);
            if (!hit) continue;
            const sp = Math.hypot(hit.vx, hit.vy);
            const want = DIRV[n.dir];
            const colorOk = side === 'flat' || (side === 'left' ? 0 : 1) === n.hand;
            const dirOk = n.dir === ANY ? sp > 0.8 : sp > 1.0 && (hit.vx * want[0] + hit.vy * want[1]) / Math.max(sp, 1e-6) > 0.45;
            if (colorOk && dirOk) {
              const pts = addHit(n, clamp((sp - 1.0) / 3.5, 0, 1));
              shatter(o.m.position, sp > 0 ? hit.vx / sp : 0, sp > 0 ? hit.vy / sp : -1, n.hand ? BLUE : RED, Math.atan2(hit.vy, hit.vx));
              spawnFloat(String(pts), o.m.position.clone().add(new V3(0, 0.3, 0)), n.hand ? BLUE_HEX : RED_HEX);
              noiseBurst(0.09, 0.35, 3200, 0.9); tone(n.hand ? 880 : 660, n.hand ? 1320 : 990, 0.07, 'triangle', 0.12);
              if (state.mode === 'vr') haptic(vrHands[side], 0.7, 35);
            } else if (sp > 0.5 || hit.d === 0) {
              // wrong colour or wrong way: it breaks, but it's a miss
              addMiss('bad');
              shatter(o.m.position, 0, -1, 0x777788, 0);
              spawnFloat(colorOk ? 'Wrong way' : 'Wrong colour', o.m.position.clone().add(new V3(0, 0.3, 0)), '#bbbbcc');
              tone(180, 120, 0.15, 'square', 0.12);
            } else continue;
            o.n = null; o.m.visible = false;
            break;
          }
          if (BB.st !== 'play') return;
        }
        // gone past you
        if (o.n && o.m.position.z > HZ + 0.7) {
          o.n = null; o.m.visible = false;
          addMiss('miss'); spawnFloat('Miss', new V3(BB.laneX + COLS[n.col], ROWS[n.row] + 0.35, HZ - 1.2), '#ffffff');
          if (BB.st !== 'play') return;
        }
      }
      for (const o of bombs) {
        if (!o.n) continue;
        const n = o.n;
        blockPos(n, now, o.m.position);
        o.m.rotation.x += dt * 2; o.m.rotation.y += dt * 3;
        o.m.scale.setScalar(clamp(1 - (o.m.position.z - (HZ + 0.12)) / 0.4, 0.001, 1));   // and bombs shrink away past you too
        if (Math.abs(o.m.position.z - HZ) < 0.9) {
          for (const side of state.mode === 'vr' ? ['left', 'right'] : ['flat']) {
            const hit = sweepHit(blade[side], o.m.position, 0.22, dt);
            if (!hit) continue;
            o.n = null; o.m.visible = false;
            addMiss('bomb'); sfx('slam', 0.8); noiseBurst(0.4, 0.5, 600, 0.6);
            spawnFloat('Bomb!', o.m.position.clone(), '#ff6666');
            if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 1, 120);
            break;
          }
          if (BB.st !== 'play') return;
        }
        if (o.n && o.m.position.z > HZ + 2) { o.n = null; o.m.visible = false; }
      }
      // walls: your head mustn't be inside one
      camera.getWorldPosition(_v);
      let inWall = false;
      for (const o of walls) {
        if (!o.n) continue;
        const n = o.n, len = n.dur * D.speed;
        const zFront = HZ - (n.t - now) * D.speed + 1.2;           // (a wall reaches you a little before the cutting line)
        const x0 = n.side ? -0.05 : -1.6, x1 = n.side ? 1.6 : 0.05;      // (it covers the middle: lean the other way)
        o.m.scale.set(x1 - x0, 2.6, len);
        o.m.position.set(BB.laneX + (x0 + x1) / 2, 1.3, zFront - len / 2);
        if (zFront - len > zHead + 2) { o.n = null; o.m.visible = false; continue; }
        const hx = _v.x - BB.laneX;
        if (zFront > -0.2 && zFront - len < 0.2 && hx + 0.1 > x0 && hx - 0.1 < x1) inWall = true;
      }
      if (inWall) { BB.hp -= dt * 0.3; BB.combo = 0; if (now - (BB.wallT || -9) > 0.4) { BB.wallT = now; tone(140, 100, 0.2, 'sawtooth', 0.08); } if (BB.hp <= 0) { BB.hp = 0; stop('failed'); return; } }
      if (ui.hurt) ui.hurt.style.opacity = inWall ? '0.5' : '0';
      if (now > sg.len + 1.0 && BB.i >= ch.notes.length && !blocks.some((o) => o.n)) stop('done');
      // the beat, for the lights
      const beat = Math.floor((now * sg.bpm) / 60);
      if (beat !== BB.beat) { BB.beat = beat; if (now > 0) BB.fx = 1; }
    }

    // ---------------------------------------------------------------- song select: a console at your left
    const CON = { x: -1.2, z: -0.15, yaw: Math.atan2(1.2, 0.35) };
    const conBoard = makeBoard(G, 640, 400, 1.15, 0.72, CON.x - 0.08, 1.62, CON.z - 0.18, CON.yaw, false);
    addBox(G, 1.12, 0.95, 0.24, lam(0x241838), CON.x - Math.sin(CON.yaw) * 0.02, 0.475, CON.z - Math.cos(CON.yaw) * 0.02).rotation.y = CON.yaw;      // (shallow, so the buttons' labels show on its front)
    const conBtn = (dx, col, label, fn) => {
      const c = Math.cos(CON.yaw), s = Math.sin(CON.yaw);
      return makeButton(L, new V3(CON.x + dx * c, 1.0, CON.z - dx * s), col, label, fn, { faceYaw: CON.yaw, pedestal: false });
    };
    const nextSong = () => { if (BB.st === 'play') return; BB.si = (BB.si + 1) % SONGS.length; BB.result = null; sfx('click', 0.5); state.hudDirty = true; state.dirtyBoard = true; };
    const nextDiff = () => { if (BB.st === 'play') return; BB.di = (BB.di + 1) % DIFFS.length; BB.result = null; sfx('click', 0.5); state.hudDirty = true; state.dirtyBoard = true; };
    conBtn(-0.4, 0xb066ff, 'Song', nextSong);
    conBtn(-0.135, 0xffd23f, 'Level', nextDiff);
    conBtn(0.135, 0x8bd450, 'Play', () => { if (BB.st !== 'play') start(); });
    // (a wild swing can brush the console, so stopping mid-song takes two presses)
    conBtn(0.4, 0xff5a5a, 'Stop', () => {
      if (BB.st !== 'play') return;
      const t = performance.now();
      if (t - (BB.stopAsk || 0) < 2500) stop('quit'); else { BB.stopAsk = t; showToast('Press Stop again to end the song'); }
    });
    makeKiosk(L, -2.6, 1.4, Math.PI / 2);
    RECORDS.def(L, SONGS.map((s2, i) => ({ k: `s${i}`, label: `Best score: ${s2.title}` })));
    function drawConsole() {
      const g = conBoard.g, W = 640, H = 400, sg = SONGS[BB.si];
      g.fillStyle = '#12081f'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#b066ff'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ff6ac8'; g.font = `800 34px ${DISPLAY}`; g.fillText('Beat Blades', 28, 52);
      g.fillStyle = '#ffffff'; g.font = `800 52px ${DISPLAY}`; g.fillText(sg.title, 28, 122, W - 56);
      g.fillStyle = '#c9b8f0'; g.font = `400 26px ${BODY}`;
      g.fillText(`${sg.bpm} bpm · ${Math.floor(sg.len / 60)}:${String(Math.round(sg.len % 60)).padStart(2, '0')}`, 28, 160);
      DIFFS.forEach((d, i) => {
        const x = 28 + i * 196, on = i === BB.di;
        rr(g, x, 186, 180, 56, 14); g.fillStyle = on ? '#ffd23f' : '#2a1a44'; g.fill();
        g.fillStyle = on ? '#1a0a2a' : '#c9b8f0'; g.font = `800 28px ${DISPLAY}`; g.textAlign = 'center'; g.fillText(d.name, x + 90, 224); g.textAlign = 'left';
      });
      const best = BB.best[`${BB.si}:${BB.di}`];
      g.fillStyle = '#ffffff'; g.font = `700 28px ${BODY}`; g.fillText(best ? `Your best: ${best.toLocaleString()}` : 'No score yet on this one', 28, 290);
      g.fillStyle = '#c9b8f0'; g.font = `400 22px ${BODY}`;
      wrapText(g, state.mode === 'vr' ? 'Red blade left, blue right. Cut the way the arrow points; dots any way. Miss the bombs, lean out of the walls.' : 'Your mouse is the blade: swipe across each block the way its arrow points. Dots any way. Miss the bombs.', 28, 326, W - 56, 28);
      conBoard.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- the big board over the runway
    L.board = makeBoard(G, 1024, 512, 4.4, 2.2, 0, 3.35, -8.5, 0, false);
    let boardKey = '';
    function drawBig(now) {
      const g = L.board.g, W = 1024, H = 512, sg = SONGS[BB.si];
      g.fillStyle = 'rgba(10,4,20,1)'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ff3aa8'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      if (BB.st === 'play') {
        g.fillStyle = '#ffffff'; g.font = `800 120px ${DISPLAY}`; g.fillText(BB.score.toLocaleString(), W / 2, 170);
        g.font = `800 64px ${DISPLAY}`; g.fillStyle = '#ffd23f'; g.fillText(`×${BB.mult}`, W / 2 - 230, 280);
        g.fillStyle = '#ffffff'; g.fillText(`${BB.combo} combo`, W / 2 + 140, 280);
        // energy
        rr(g, 112, 330, 800, 40, 20); g.fillStyle = '#2a1a44'; g.fill();
        rr(g, 112, 330, Math.max(40, 800 * BB.hp), 40, 20); g.fillStyle = BB.hp > 0.3 ? '#8bd450' : '#ff5a5a'; g.fill();
        // progress
        const p = clamp(now / sg.len, 0, 1);
        rr(g, 112, 400, 800, 16, 8); g.fillStyle = '#2a1a44'; g.fill();
        rr(g, 112, 400, Math.max(16, 800 * p), 16, 8); g.fillStyle = '#b066ff'; g.fill();
        g.fillStyle = '#c9b8f0'; g.font = `400 30px ${BODY}`;
        g.fillText(now < 0 ? `Get ready: ${Math.ceil(-now)}` : `${sg.title} · ${DIFFS[BB.di].name}`, W / 2, 470);
      } else if (BB.result) {
        const r = BB.result;
        g.fillStyle = r.rank === 'Failed' ? '#ff5a5a' : '#ffd23f'; g.font = `800 140px ${DISPLAY}`; g.fillText(r.rank, W / 2, 170);
        g.fillStyle = '#ffffff'; g.font = `800 64px ${DISPLAY}`; g.fillText(`${r.score.toLocaleString()} points${r.newBest ? '  ★ best' : ''}`, W / 2, 270);
        g.fillStyle = '#c9b8f0'; g.font = `400 34px ${BODY}`;
        g.fillText(`${Math.round(r.acc * 100)}% · ${r.hits} cut, ${r.misses} missed · best combo ${r.maxCombo}`, W / 2, 340);
        g.fillText('Play again from the console on your left', W / 2, 430);
      } else {
        g.fillStyle = '#ff6ac8'; g.font = `800 96px ${DISPLAY}`; g.fillText('Beat Blades', W / 2, 150);
        g.fillStyle = '#ffffff'; g.font = `700 48px ${DISPLAY}`; g.fillText(`${sg.title} · ${DIFFS[BB.di].name}`, W / 2, 250);
        g.fillStyle = '#c9b8f0'; g.font = `400 32px ${BODY}`;
        g.fillText(state.mode === 'vr' ? 'Pick a song on the console at your left, then press Play' : 'Pick a song with the buttons up top, then press Play', W / 2, 330);
        g.fillText('Red blade in your left hand, blue in your right', W / 2, 390);
      }
      L.board.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    let lastMode = '';
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      // blades
      for (const side of SIDES) {
        const mh = myHands[side], show = here && state.mode === 'vr' && mh.ok;
        if (show) poseSaber(sabers[side], blade[side], mh.pos, mh.quat); else { sabers[side].visible = false; blade[side].ok = blade[side].was = false; }
      }
      if (here && state.mode === 'flat') flatBlade(); else { flatSaber.visible = false; blade.flat.ok = blade.flat.was = false; }
      // lanes for everyone here
      const { n } = lanes();
      runways.forEach((g, k) => { g.visible = k < Math.max(1, n); g.position.x = laneXOf(k, Math.max(1, n)); });
      if (BB.st === 'play' && here) stepSong(dt);
      // debris and lights
      for (const d of debris) {
        if (!d.m.visible) continue;
        d.t -= dt; d.v.y -= 6 * dt;
        d.m.position.addScaledVector(d.v, dt);
        d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt;
        d.m.material.opacity = clamp(d.t / 0.45, 0, 1) * 0.8; d.m.scale.setScalar(0.4 + 0.6 * clamp(d.t / 0.45, 0, 1));
        if (d.t <= 0) d.m.visible = false;
      }
      BB.fx = Math.max(0, BB.fx - dt * 3);
      const pulse = BB.st === 'play' ? BB.fx : 0.25 + Math.sin(now * 0.002) * 0.1;
      rings.forEach((m, i) => { m.material.opacity = 0.25 + pulse * 0.6 * (i % 2 === BB.beat % 2 ? 1 : 0.5); m.scale.setScalar(1 + pulse * 0.05); });
      for (const m of towers) m.material.opacity = 0.2 + pulse * 0.5;
      // boards
      const sNow = BB.st === 'play' ? songNow() : 0;
      const key = `${BB.st}|${BB.score}|${BB.combo}|${BB.mult}|${Math.round(BB.hp * 50)}|${Math.round(sNow * 2)}|${BB.si}|${BB.di}|${!!BB.result}|${state.mode}`;
      if (here && key !== boardKey) { boardKey = key; drawBig(sNow); drawConsole(); }
      // other players' blades
      for (const rec of remotes.values()) {
        const show = here && inMyLevel(rec);
        for (const [k, side, col] of [['bbL', 'l', RED], ['bbR', 'r', BLUE]]) {
          const has = side === 'l' ? rec.hasL : rec.hasR;
          if (!rec[k] && show && has) rec[k] = makeSaber(col);
          if (!rec[k]) continue;
          rec[k].visible = show && has;
          if (rec[k].visible) { const p = rec.cur[side]; rec[k].position.copy(p.pos); rec[k].quaternion.copy(p.quat); }
        }
      }
      if (state.mode !== lastMode) { lastMode = state.mode; state.hudDirty = true; }
    };
    // in a browser: a fixed view down the runway, and the mouse is the blade
    L.flatCamera = () => {
      camera.position.set(0, 1.55, 0);
      camera.rotation.set(-0.1, 0, 0, 'YXZ');
      state.yaw = 0; state.pitch = -0.1;
      return true;
    };
    L.spawn = () => { dolly.position.set(0, 0, 0); camera.position.set(0, 1.6, 0); standInLane(); };
    L.onEnter = () => { BB.result = null; state.dirtyBoard = true; boardKey = ''; };
    L.onExit = () => {
      stop('quit');
      for (const s of SIDES) sabers[s].visible = false;
      flatSaber.visible = false;
      for (const rec of remotes.values()) { if (rec.bbL) rec.bbL.visible = false; if (rec.bbR) rec.bbR.visible = false; }
      if (ui.hurt) ui.hurt.style.opacity = '0';
    };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3;
      camera.position.set(Math.sin(a) * 4, 2.4, 3.5);
      camera.lookAt(0, 1.4, -10);
    };
    L.hudActions = [
      { label: () => `Song: ${SONGS[BB.si].title} ▸`, show: () => BB.st !== 'play', run: nextSong },
      { label: () => `Level: ${DIFFS[BB.di].name} ▸`, show: () => BB.st !== 'play', run: nextDiff },
      { label: () => (BB.st === 'play' ? 'Stop' : 'Play'), run: () => (BB.st === 'play' ? stop('quit') : start()) },
    ];
    L.hints = [['Mouse', 'swipe through the blocks'], ['Arrow', 'the way to cut'], ['Dot', 'any way']];
    L.hintsFor = () => (state.mode === 'flat' ? L.hints : [['Swing', 'cut the way the arrow points'], ['Red / blue', 'left / right hand']]);
    // (number keys shouldn't jump to another game mid-song)
    L.onKey = (code) => (BB.st === 'play' && /^Digit/.test(code) ? true : false);

    // ---------------------------------------------------------------- the others: what they're playing and how they're doing
    const STC = { idle: 0, play: 1, done: 2, failed: 3 };
    L.presence = () => ({ bt: [STC[BB.st] || 0, BB.si, BB.di, BB.score, BB.combo, BB.result ? Math.round(BB.result.acc * 100) : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.bt;
      if (!Array.isArray(a) || a.length !== 6 || !a.every((x) => Number.isInteger(x))) return;
      const nb = { st: a[0], si: clamp(a[1], 0, SONGS.length - 1), di: clamp(a[2], 0, 2), score: Math.max(0, a[3]), combo: Math.max(0, a[4]) };
      if (!st.bt || st.bt.score !== nb.score || st.bt.st !== nb.st) state.dirtyBoard = true;
      st.bt = nb;
    };
    L.rowFor = (st, isMe) => {
      const b = isMe ? { st: STC[BB.st] || 0, score: BB.score, si: BB.si } : st.bt || { st: 0, score: 0, si: 0 };
      return { score: b.score, text: b.st === 1 ? `${b.score.toLocaleString()} ♪` : b.score ? b.score.toLocaleString() : 'picking a song' };
    };
    L.sortRows = (a, b) => (b.score || 0) - (a.score || 0);
    L.drawBoard = () => { boardKey = ''; };
    L.bbInternals = { playStep, BB, SONGS, DIFFS, makeChart, start, stop, stepSong, blocks, bombs, walls, blade, sweepHit, HZ, COLS, ROWS, DIRV, lanes };
    ENDGAME.on(L, { active: () => BB.st === 'play', end: () => { stop('quit'); return ''; } });
    return L;
  })();
