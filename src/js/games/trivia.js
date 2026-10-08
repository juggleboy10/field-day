  // ================================================================ LEVEL: QUIZZY'S TRIVIA NIGHT
  // A game-show studio. Contestants stand at podiums in an arc facing a big screen, each podium with four
  // coloured answer buttons. Ten questions a game, fifteen seconds each: points for being right, more for being quick.
  // Bots fill the podiums to four. The lowest-named player's page is the host: it picks the questions, runs the
  // clock, plays the bots and scores everyone's answers (each player reports their own pick and how fast they were).
  const trivia = (() => {
    const L = newLevel(23);
    const G = L.group;
    const rand = mulberry32(2323);
    L.grabless = true;
    L.walkSpeed = 2.2;
    L.bounds = { minX: -9.2, maxX: 9.2, minZ: -7, maxZ: 5.4 };
    L.env = {
      sky: skyTexture([[0, '#0c0a24'], [1, '#0c0a24']]),
      bg: 0x0c0a24, fog: [0x100c2a, 22, 60], hemi: [0xe8e0ff, 0x2a2050, 0.85],
      sun: [0xffffff, 0.45], sunDir: new V3(0.2, 1, 0.5), ambient: [0x403a70, 0.5],
      sprite: null,
    };
    const T = { INTRO: 7000, ASK: 15000, REVEAL: 5500, FINAL: 13000, AFTER_ALL: 1400 };   // ms (tests shorten them)
    const QN = 10, FILL_TO = 4, SEATS = 8;
    const PH = { idle: 0, intro: 1, ask: 2, reveal: 3, final: 4 }, PH_N = ['idle', 'intro', 'ask', 'reveal', 'final'];
    const durOf = (ph) => (ph === 'intro' ? T.INTRO : ph === 'ask' ? T.ASK : ph === 'reveal' ? T.REVEAL : ph === 'final' ? T.FINAL : 1);
    const BOT_NAMES = ['Brainy Brooke', 'Trivia Trev', 'Smarty Sal'];
    const BOT_ACC = [0.74, 0.62, 0.55];
    const BOT_COLORS = ['#ff7ac8', '#4fc3f7', '#ffd23f'];
    const ANS_HEX = [0xe8453c, 0x3a7ae8, 0xf2c230, 0x3cb85a];
    const ANS_CSS = ['#e8453c', '#3a7ae8', '#f2c230', '#3cb85a'];
    const LET = ['A', 'B', 'C', 'D'];
    // seats in the order they fill: the middle first
    const SEAT_ORDER = [3, 4, 2, 5, 1, 6, 0, 7];
    const _a = new V3(), _b = new V3(), _q = new Q4();

    // ---------------------------------------------------------------- the studio
    const SCR = { x: 0, y: 3.3, z: -8 };
    const floorC = canvasTexture(512, 512, (g) => {
      const gr = g.createRadialGradient(256, 256, 20, 256, 256, 360);
      gr.addColorStop(0, '#2a2060'); gr.addColorStop(1, '#100c28');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(140,120,255,0.18)'; g.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    }).tex;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), new THREE.MeshLambertMaterial({ map: floorC }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.2); G.add(floor);
    // a glowing arc on the floor under the podiums
    const ARC_R = 7, SPREAD = 0.19;
    {
      const span = SPREAD * SEATS;
      const ring = new THREE.Mesh(new THREE.RingGeometry(ARC_R - 0.55, ARC_R + 0.75, 64, 1, Math.PI / 2 - span / 2, span),
        new THREE.MeshBasicMaterial({ color: 0x3a2a90, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(SCR.x, 0.012, SCR.z); G.add(ring);
      for (const r of [ARC_R - 0.55, ARC_R + 0.75]) {
        const edge = new THREE.Mesh(new THREE.RingGeometry(r - 0.03, r + 0.03, 64, 1, Math.PI / 2 - span / 2, span), new THREE.MeshBasicMaterial({ color: 0x9a7aff }));
        edge.rotation.x = -Math.PI / 2; edge.position.set(SCR.x, 0.016, SCR.z); G.add(edge);
      }
    }
    // walls: a starry backdrop behind the screen, curtains on the sides, a back wall
    const back = canvasTexture(1024, 384, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#1a1050'); gr.addColorStop(1, '#3a1a6a');
      g.fillStyle = gr; g.fillRect(0, 0, 1024, 384);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.7})`; const s = rand() < 0.1 ? 3 : 1.5; g.fillRect(rand() * 1024, rand() * 384, s, s); }
      g.strokeStyle = 'rgba(255,120,220,0.25)'; g.lineWidth = 6;
      for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(512, 384); g.lineTo(k * 128, 0); g.stroke(); }
    }).tex;
    addBox(G, 20, 8, 0.2, new THREE.MeshBasicMaterial({ map: back }), 0, 4, -9.6);
    const curtain = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#5a1030'; g.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 256; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(255,120,150,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = gr; g.fillRect(x, 0, 16, 256); }
    }).tex;
    curtain.wrapS = THREE.RepeatWrapping; curtain.repeat.set(6, 1);
    const curtM = new THREE.MeshLambertMaterial({ map: curtain });
    for (const s of [-1, 1]) addBox(G, 0.2, 8, 17, curtM, s * 10, 4, -1.2);
    addBox(G, 20, 8, 0.2, curtM, 0, 4, 7.4);
    // a lighting truss with coloured spotlights
    const trussM = lam(0x3a3a4a);
    addBox(G, 18, 0.18, 0.18, trussM, 0, 6.4, -4.5);
    addBox(G, 18, 0.18, 0.18, trussM, 0, 6.4, 2.5);
    const beams = [];
    {
      const glowM = (c) => new THREE.SpriteMaterial({ map: warmGlowTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 });
      const cols = [0xff5ac8, 0x5ac8ff, 0xffd84a, 0x8aff7a, 0xb07aff];
      for (let k = 0; k < 10; k++) {
        const x = -8 + k * (16 / 9), z = k % 2 ? -4.5 : 2.5, c = cols[k % cols.length];
        addCyl(G, 0.12, 0.16, 0.3, 8, lam(0x22222a), x, 6.2, z);
        const s = new THREE.Sprite(glowM(c)); s.position.set(x, 6.02, z); s.scale.set(0.9, 0.9, 1); G.add(s);
        // a faint cone of light down to the floor
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 6, 16, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.028, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        cone.position.set(x, 3.05, z); G.add(cone);
        beams.push({ cone, s, x, z, ph: rand() * 6 });
      }
    }
    // a little audience on bleachers at the back
    const crowd = [];
    {
      const seatM = lam(0x2a2450), skin = [lam(0xf0c8a0), lam(0xc89870), lam(0x8a6040), lam(0xe8b890)], shirts = [0xe8453c, 0x3a7ae8, 0xf2c230, 0x3cb85a, 0xb07aff, 0xff8a4a].map(lam);
      for (let row = 0; row < 3; row++) {
        const z = 5.6 + row * 0.6, y = 0.25 + row * 0.35;
        addBox(G, 16, y * 2, 0.6, seatM, 0, y, z);
        for (let k = 0; k < 16; k++) {
          if (rand() < 0.25) continue;
          const x = -7.5 + k + (rand() - 0.5) * 0.3;
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 8), shirts[Math.floor(rand() * shirts.length)]);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skin[Math.floor(rand() * skin.length)]);
          const g = new THREE.Group(); body.position.y = 0.25; head.position.y = 0.62; g.add(body, head);
          g.position.set(x, y * 2, z); G.add(g);
          crowd.push({ g, y0: y * 2, ph: rand() * 6 });
        }
      }
    }
    makeKiosk(L, -7.6, 3.6, Math.atan2(7.6, -2.6));
    // the side scoreboard
    L.board = makeBoard(G, 720, 460, 2.6, 1.66, -7.4, 2.4, -4.6, 0.85);

    // ---------------------------------------------------------------- the big screen, with marquee bulbs round it
    const SW = 6.4, SH = 3.6;
    const screen = makeBoard(G, 1024, 576, SW, SH, SCR.x, SCR.y, SCR.z, 0, false);
    const bulbs = [];
    {
      const bm = () => new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffe6a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      const per = 2 * (SW + SH + 0.5), n = 46;
      for (let k = 0; k < n; k++) {
        let d = (k / n) * per, x, y;
        const w = SW + 0.25, h = SH + 0.25;
        if (d < w) { x = -w / 2 + d; y = h / 2; } else if ((d -= w) < h) { x = w / 2; y = h / 2 - d; } else if ((d -= h) < w) { x = w / 2 - d; y = -h / 2; } else { d -= w; x = -w / 2; y = -h / 2 + Math.min(d, h); }
        const s = new THREE.Sprite(bm()); s.position.set(SCR.x + x, SCR.y + y, SCR.z + 0.06); s.scale.set(0.26, 0.26, 1); G.add(s);
        bulbs.push(s);
      }
    }

    // ---------------------------------------------------------------- Quizzy, the host, at a lectern by the screen
    const QZ = { x: 4.7, z: -6.3 };
    const quizzy = buildAvatar('#ff9a3a', 2 % HATS.length, 1 % FACES.length, true, 1 % SHIRTS.length, 3 % SHIRT_COLORS.length);
    quizzy.position.set(QZ.x, 1.62, QZ.z); quizzy.rotation.y = Math.atan2(QZ.x - 0, QZ.z - 0.5); G.add(quizzy);
    {
      const lect = addBox(G, 0.8, 1.05, 0.45, lam(0x6a3ab8), QZ.x - Math.sin(quizzy.rotation.y) * 0.45, 0.525, QZ.z - Math.cos(quizzy.rotation.y) * 0.45);
      lect.rotation.y = quizzy.rotation.y;
      const top = addBox(G, 0.9, 0.06, 0.5, lam(0xffd84a), lect.position.x, 1.07, lect.position.z); top.rotation.y = quizzy.rotation.y;
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(90,40,160,0.9)'; c.fill(); c.fillStyle = '#ffe680'; c.font = `800 32px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Quizzy', 128, 34); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.48; quizzy.add(tag);
    }
    // a speech bubble over Quizzy's head
    const bubbleC = canvasTexture(512, 160);
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleC.tex, transparent: true, depthWrite: false }));
    bubble.scale.set(2.2, 0.69, 1); bubble.position.set(QZ.x - 0.3, 2.95, QZ.z + 0.2); G.add(bubble);
    let bubbleKey = '';
    function say(text) {
      if (text === bubbleKey) return;
      bubbleKey = text;
      const g = bubbleC.g;
      g.clearRect(0, 0, 512, 160);
      if (!text) { bubbleC.tex.needsUpdate = true; bubble.visible = false; return; }
      bubble.visible = true;
      rr(g, 6, 6, 500, 120, 36); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
      g.beginPath(); g.moveTo(330, 124); g.lineTo(370, 156); g.lineTo(372, 124); g.fill();
      g.fillStyle = '#2a1a50'; g.font = `700 34px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = text.split(' '), lines = [];
      let line = '';
      for (const w of words) { const t = line ? `${line} ${w}` : w; if (line && g.measureText(t).width > 460) { lines.push(line); line = w; } else line = t; }
      if (line) lines.push(line);
      lines.slice(0, 2).forEach((l, i) => g.fillText(l, 256, 66 + (i - (Math.min(2, lines.length) - 1) / 2) * 40, 470));
      bubbleC.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- podiums
    // seat s sits on an arc round the screen; local +z points back toward the contestant
    function seatAt(s) { const a = (s - (SEATS - 1) / 2) * SPREAD; return { x: SCR.x + Math.sin(a) * ARC_R, z: SCR.z + Math.cos(a) * ARC_R, yaw: a }; }
    function local(seat, lx, ly, lz, out) {
      const c = Math.cos(seat.yaw), s = Math.sin(seat.yaw);
      return out.set(seat.x + lx * c + lz * s, ly, seat.z - lx * s + lz * c);
    }
    const TOP = 0.98;
    const podiums = [];
    const podBody = lam(0x2a2458), podTrim = lam(0xd8d0ff);
    const letterTex = canvasTexture(512, 112, (g) => {
      g.fillStyle = '#1a1640'; g.fillRect(0, 0, 512, 112);
      for (let i = 0; i < 4; i++) {
        const x = 64 + i * 128;
        g.fillStyle = ANS_CSS[i]; g.beginPath(); g.arc(x, 56, 40, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.font = `800 52px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(LET[i], x, 60);
      }
    }).tex;
    for (let s = 0; s < SEATS; s++) {
      const seat = seatAt(s);
      const grp = new THREE.Group(); grp.position.set(seat.x, 0, seat.z); grp.rotation.y = seat.yaw; G.add(grp);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, TOP - 0.06, 0.56), podBody); body.position.y = (TOP - 0.06) / 2; grp.add(body);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 0.62), podTrim); lid.position.y = TOP - 0.03; grp.add(lid);
      const stripMat = new THREE.MeshBasicMaterial({ color: 0x3a3470 });
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.07, 0.07, 0.58), stripMat); strip.position.y = 0.12; grp.add(strip);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.21), new THREE.MeshBasicMaterial({ map: letterTex }));
      panel.position.set(0, TOP - 0.2, 0.285); grp.add(panel);
      // the front, toward the screen: a big seat number that lights in your colour
      const frontC = canvasTexture(256, 160);
      const front = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), new THREE.MeshBasicMaterial({ map: frontC.tex }));
      front.position.set(0, 0.5, -0.285); front.rotation.y = Math.PI; grp.add(front);
      const p = { s, seat, grp, stripMat, frontC, frontKey: '', buttons: [], tagC: canvasTexture(320, 112), tagKey: '', tag: null };
      p.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: p.tagC.tex, transparent: true, depthWrite: false }));
      local(seat, 0, 2.2, 0.62, p.tag.position); p.tag.scale.set(1.0, 0.35, 1); p.tag.visible = false; G.add(p.tag);
      for (let i = 0; i < 4; i++) {
        local(seat, (i - 1.5) * 0.245, TOP + 0.02, 0.1, _a);
        const btn = makeButton(L, _a.clone(), ANS_HEX[i], '', () => pressAnswer(s, i), { pedestal: false, faceYaw: seat.yaw });
        btn.plate.visible = false; btn.seat = s; btn.ans = i;
        p.buttons.push(btn);
      }
      podiums.push(p);
    }
    function drawPodium(p, id, k) {
      const name = id ? (id === state.myPeer ? 'You' : nameOf(id)) : '';
      const sc = id ? RS.scores[k] || 0 : 0;
      const fkey = `${name}|${sc}`;
      if (fkey !== p.frontKey) {
        p.frontKey = fkey;
        const g = p.frontC.g;
        g.fillStyle = id ? '#3a2a90' : '#1a1640'; g.fillRect(0, 0, 256, 160);
        g.strokeStyle = '#d8d0ff'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 154);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (id) {
          g.fillStyle = '#ffe680'; g.font = `800 64px ${DISPLAY}`; g.fillText(String(sc), 128, 64);
          g.fillStyle = '#fff'; g.font = `700 26px ${BODY}`; g.fillText(name, 128, 128, 236);
        } else { g.fillStyle = '#6a60a0'; g.font = `800 60px ${DISPLAY}`; g.fillText('?', 128, 84); }
        p.frontC.tex.needsUpdate = true;
      }
      // a name tag over whoever's standing there (not over yourself)
      p.tag.visible = !!id && id !== state.myPeer;
      if (p.tag.visible) {
        const key = `${name}|${sc}`;
        if (key !== p.tagKey) {
          p.tagKey = key;
          const g = p.tagC.g;
          g.clearRect(0, 0, 320, 112);
          rr(g, 4, 6, 312, 100, 30); g.fillStyle = 'rgba(20,16,48,0.85)'; g.fill();
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = '#fff'; g.font = `700 30px ${BODY}`; g.fillText(name, 160, 38, 296);
          g.fillStyle = '#ffe680'; g.font = `800 34px ${DISPLAY}`; g.fillText(String(sc), 160, 80);
          p.tagC.tex.needsUpdate = true;
        }
      }
    }
    // where a contestant stands, behind their podium
    const spotOf = (seat, out) => local(seat, 0, 0, 0.62, out);

    // ---------------------------------------------------------------- bots
    const bots = BOT_NAMES.map((name, k) => {
      const g = buildAvatar(BOT_COLORS[k], (k * 3 + 2) % HATS.length, (k + 2) % FACES.length, true, (k + 1) % SHIRTS.length, (k * 2 + 2) % SHIRT_COLORS.length);
      g.visible = false; G.add(g);
      return { id: `bot:${k}`, k, name, g, x: 0, z: 0, pressT: -1e9 };
    });
    const isBot = (id) => typeof id === 'string' && id.startsWith('bot:');
    const botOf = (id) => bots[Number(id.slice(4))];

    // ---------------------------------------------------------------- state
    // RS is what everyone sees (the host's word). order[k] is who stands at SEAT_ORDER[k] ('' for an empty podium).
    // choices[k]: -1 nothing yet, 9 locked in (hidden until the reveal), 0..3 their answer once revealed.
    const RS = { game: 0, ph: 'idle', qn: 0, qi: -1, perm: [0, 1, 2, 3], left: 0, order: [], scores: [], choices: [], gains: [] };
    const H = { phaseT: 0, ans: new Map(), plan: [], allT: 0, mine: false, recent: [] };
    const me = { choice: -1, ms: 0, key: '', wins: 0, ph: '', phKey: '', synced: false, heardHost: false, tickS: -1, seat: -1, finalSeen: -1 };
    const humans = () => {
      const ids = state.mode !== 'menu' ? [state.myPeer] : [];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    };
    const hostId = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort()[0]; };
    const isHost = () => hostId() === state.myPeer;
    const nameOf = (id) => (id === state.myPeer ? 'You' : isBot(id) ? botOf(id).name : (remotes.get(id) || {}).name || 'Someone');
    const kOf = (id) => (id ? RS.order.indexOf(id) : -1);
    const seatOfK = (k) => (k >= 0 && k < SEATS ? SEAT_ORDER[k] : -1);
    const Q = () => (RS.qi >= 0 && RS.qi < TRIVIA_Q.length ? TRIVIA_Q[RS.qi] : null);
    const ansText = (slot) => { const q = Q(); return q ? q[2 + RS.perm[slot]] : ''; };
    const rightSlot = () => RS.perm.indexOf(0);
    const playing = () => RS.ph === 'intro' || RS.ph === 'ask' || RS.ph === 'reveal';

    // ---------------------------------------------------------------- the host
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function pickQuestion() {
      const lastCat = Q() ? Q()[0] : '';
      const avoid = new Set(H.recent);
      let pool = [];
      for (let i = 0; i < TRIVIA_Q.length; i++) if (!avoid.has(i) && TRIVIA_Q[i][0] !== lastCat) pool.push(i);
      if (!pool.length) { H.recent = []; pool = TRIVIA_Q.map((_, i) => i); }
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function remember(qi) { if (qi < 0 || H.recent.includes(qi)) return; H.recent.push(qi); if (H.recent.length > Math.min(120, TRIVIA_Q.length - 20)) H.recent.shift(); }
    function seatHumans(hs) {
      // people who left give up their podium; newcomers take an empty one (or a bot's, between games)
      for (let k = 0; k < RS.order.length; k++) { const id = RS.order[k]; if (id && !isBot(id) && !hs.includes(id)) { RS.order[k] = ''; RS.scores[k] = 0; } }
      for (const id of hs) {
        if (RS.order.includes(id)) continue;
        let k = RS.order.indexOf('');
        if (k < 0 && RS.order.length < SEATS) { k = RS.order.length; RS.order.push(''); RS.scores.push(0); }
        if (k < 0) break;
        RS.order[k] = id; RS.scores[k] = 0;
      }
      while (RS.order.length && RS.order[RS.order.length - 1] === '') { RS.order.pop(); RS.scores.pop(); }
    }
    function beginGame(now) {
      const hs = humans().slice(0, SEATS);
      const nb = Math.max(0, FILL_TO - hs.length);
      RS.order = shuffle(hs.slice()).concat(bots.slice(0, nb).map((b) => b.id));
      RS.scores = RS.order.map(() => 0);
      RS.choices = RS.order.map(() => -1); RS.gains = RS.order.map(() => 0);
      RS.game += 1; RS.qn = 0; RS.ph = 'intro'; RS.left = T.INTRO; H.phaseT = now;
      forcePresence();
    }
    function ask(qn, now) {
      seatHumans(humans());
      RS.qn = qn; RS.qi = pickQuestion(); remember(RS.qi);
      RS.perm = shuffle([0, 1, 2, 3]);
      RS.choices = RS.order.map(() => -1); RS.gains = RS.order.map(() => 0);
      H.ans.clear(); H.allT = 0;
      planBots();
      RS.ph = 'ask'; RS.left = T.ASK; H.phaseT = now;
      forcePresence();
    }
    function planBots() {
      // each bot decides when it'll buzz in and whether it'll be right
      H.plan = RS.order.map((id) => {
        if (!isBot(id)) return null;
        const b = botOf(id), right = Math.random() < BOT_ACC[b.k];
        let c = rightSlot();
        if (!right) { const wrong = [0, 1, 2, 3].filter((x) => x !== c); c = wrong[Math.floor(Math.random() * 3)]; }
        return { t: T.ASK * (0.18 + Math.random() * (right ? 0.4 : 0.5)), c };
      });
      H.planKey = `${RS.game}:${RS.qn}`;
    }
    function reveal(now) {
      const rs = rightSlot();
      RS.order.forEach((id, k) => {
        const a = id ? H.ans.get(id) : null;
        const c = a ? a.c : -1;
        RS.choices[k] = c;
        const gain = c >= 0 && c === rs ? 100 + Math.round(50 * clamp(1 - a.ms / T.ASK, 0, 1)) : 0;
        RS.gains[k] = gain; RS.scores[k] = (RS.scores[k] || 0) + gain;
      });
      RS.ph = 'reveal'; RS.left = T.REVEAL; H.phaseT = now;
      forcePresence();
    }
    function hostStep(now) {
      const hs = humans();
      if (!H.mine) {
        // just became the host (or took over from one who left): carry on from where they were
        H.mine = true;
        H.phaseT = now - (durOf(RS.ph) - clamp(RS.left, 0, durOf(RS.ph)));
        if (RS.ph === 'ask') {
          for (let k = 0; k < RS.order.length; k++) if (RS.order[k] === state.myPeer && me.choice >= 0) H.ans.set(state.myPeer, { c: me.choice, ms: me.ms });
        }
      }
      if (RS.ph === 'idle') { if (hs.length) beginGame(now); return; }
      if (!hs.length) { RS.ph = 'idle'; return; }
      RS.left = durOf(RS.ph) - (now - H.phaseT);
      if (RS.ph === 'intro') { if (RS.left <= 0) ask(1, now); return; }
      if (RS.ph === 'ask') {
        if (H.planKey !== `${RS.game}:${RS.qn}`) planBots();
        const el = now - H.phaseT;
        RS.order.forEach((id, k) => {
          if (!id) return;
          if (isBot(id) && !H.ans.has(id) && H.plan[k] && el >= H.plan[k].t) {
            H.ans.set(id, { c: H.plan[k].c, ms: H.plan[k].t });
            botOf(id).pressT = now;
            forcePresence();
          }
          if (H.ans.has(id) && RS.choices[k] !== 9) { RS.choices[k] = 9; forcePresence(); }
        });
        const live = RS.order.filter((id) => id && (isBot(id) || hs.includes(id)));
        const all = live.length > 0 && live.every((id) => H.ans.has(id));
        if (all && !H.allT) H.allT = now;
        if (RS.left <= 0 || (H.allT && now - H.allT >= T.AFTER_ALL)) reveal(now);
        return;
      }
      if (RS.ph === 'reveal') {
        if (RS.left <= 0) {
          if (RS.qn < QN) ask(RS.qn + 1, now);
          else { RS.ph = 'final'; RS.left = T.FINAL; H.phaseT = now; forcePresence(); }
        }
        return;
      }
      if (RS.ph === 'final' && RS.left <= 0) beginGame(now);
    }

    // ---------------------------------------------------------------- answering
    const mySeat = () => seatOfK(kOf(state.myPeer));
    const canAnswer = () => RS.ph === 'ask' && kOf(state.myPeer) >= 0 && me.choice < 0 && RS.left > 0;
    function answer(slot) {
      if (!canAnswer() || !(slot >= 0 && slot < 4)) return false;
      me.choice = slot; me.ms = Math.round(clamp(T.ASK - RS.left, 0, T.ASK));
      if (isHost()) { H.ans.set(state.myPeer, { c: slot, ms: me.ms }); RS.choices[kOf(state.myPeer)] = 9; }
      const p = podiums[mySeat()];
      if (p) p.buttons[slot].pressT = performance.now();
      sfx('beep2', 0.6);
      forcePresence();
      state.hudDirty = true;
      return true;
    }
    function pressAnswer(seat, slot) {
      if (seat !== mySeat()) {
        if (kOf(state.myPeer) < 0) showToast(RS.ph === 'idle' ? 'A game is about to start' : 'You’ll get a podium at the next question');
        else showToast('That’s someone else’s podium');
        return;
      }
      if (RS.ph !== 'ask') return;
      if (me.choice >= 0) { showToast('You’re locked in!'); return; }
      answer(slot);
    }
    L.deskFire = () => {
      const t = state.flatTarget;
      if (t && t.kind === 'button') pressButton(t.obj, performance.now());
    };
    // VR: touch a button, or point at one and pull the trigger
    L.onVRTrigger = (h) => {
      const p = podiums[mySeat()];
      if (!p) return;
      const mh = myHands[h.side];
      _a.set(0, 0, -1).applyQuaternion(mh.quat);
      let best = -1, bestA = 0.3;
      for (let i = 0; i < 4; i++) {
        _b.subVectors(p.buttons[i].pos, mh.pos);
        const d = _b.length();
        if (d < 0.01 || d > 3) continue;
        const ang = Math.acos(clamp(_b.dot(_a) / d, -1, 1));
        if (ang < bestA) { bestA = ang; best = i; }
      }
      if (best >= 0) pressButton(p.buttons[best], performance.now());
    };
    L.onKey = (code) => {
      const m = /^Digit([1-4])$/.exec(code);
      if (m && kOf(state.myPeer) >= 0 && RS.ph !== 'idle' && RS.ph !== 'final') { answer(Number(m[1]) - 1); return; }
      if (/^Digit[1-9]$/.test(code) && Number(code.slice(5)) <= LEVEL_META.length) switchLevel(Number(code.slice(5)) - 1);
    };
    L.hudActions = [0, 1, 2, 3].map((i) => ({
      label: () => { const t = ansText(i); return `${i + 1} · ${t.length > 20 ? t.slice(0, 19) + '…' : t}`; },
      show: () => canAnswer(),
      run: () => answer(i),
    }));

    // ---------------------------------------------------------------- where you stand
    function toSpot() {
      const s = mySeat();
      if (s < 0) return;
      const seat = seatAt(s), p = spotOf(seat, _a);
      if (state.mode === 'vr') {
        camera.getWorldQuaternion(_q);
        const e = new THREE.Euler().setFromQuaternion(_q, 'YXZ');
        snapTurn(seat.yaw - e.y);
      } else { state.yaw = seat.yaw; state.pitch = 0.06; }
      camera.getWorldPosition(_b);
      dolly.position.x += p.x - _b.x; dolly.position.z += p.z - _b.z;
    }
    L.clampPlayer = (p) => {
      const B = L.bounds;
      let x = clamp(p.x, B.minX + 0.4, B.maxX - 0.4), z = clamp(p.z, B.minZ + 0.4, B.maxZ - 0.4);
      const s = mySeat();
      if (s >= 0 && RS.ph !== 'idle') {
        // stay at your podium
        const sp = spotOf(seatAt(s), _a), dx = x - sp.x, dz = z - sp.z, d = Math.hypot(dx, dz);
        if (d > 0.45) { x = sp.x + dx * 0.45 / d; z = sp.z + dz * 0.45 / d; }
      } else {
        // watchers stay behind the podiums
        const dx = x - SCR.x, dz = z - SCR.z, d = Math.hypot(dx, dz), R = ARC_R + 1.0;
        if (d < R) { x = SCR.x + dx * R / Math.max(0.01, d); z = SCR.z + dz * R / Math.max(0.01, d); }
      }
      return [x - p.x, z - p.z];
    }

    // ---------------------------------------------------------------- the big screen
    let screenKey = '', screenT = 0;
    function standings() {
      return RS.order.map((id, k) => ({ id, k, name: id === state.myPeer ? 'You' : nameOf(id), score: RS.scores[k] || 0 })).filter((r) => r.id).sort((a, b) => b.score - a.score);
    }
    function drawScreen(now) {
      if (now - screenT < 90) return;
      const secs = Math.max(0, Math.ceil(RS.left / 1000));
      const bar = RS.ph === 'ask' ? Math.round(clamp(RS.left / T.ASK, 0, 1) * 100) : 0;
      const key = JSON.stringify([RS.ph, RS.game, RS.qn, RS.qi, RS.perm, secs, bar, RS.choices, RS.scores, RS.order, me.choice]);
      if (key === screenKey) return;
      screenKey = key; screenT = now;
      const g = screen.g, W = 1024, Hh = 576;
      const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#24186a'); gr.addColorStop(1, '#0e0a30');
      g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
      g.textBaseline = 'middle';
      const q = Q();
      if ((RS.ph === 'ask' || RS.ph === 'reveal') && q) {
        // header: question number, category, the clock
        g.textAlign = 'left'; g.fillStyle = '#b8a8ff'; g.font = `700 28px ${BODY}`;
        g.fillText(`Question ${RS.qn} of ${QN}`, 36, 42);
        g.font = `800 26px ${DISPLAY}`;
        const cw = g.measureText(q[0]).width + 44;
        rr(g, W / 2 - cw / 2, 20, cw, 46, 23); g.fillStyle = '#ff7ac8'; g.fill();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(q[0], W / 2, 44);
        if (RS.ph === 'ask') {
          g.beginPath(); g.arc(W - 70, 46, 34, 0, Math.PI * 2); g.fillStyle = secs <= 5 ? '#e8453c' : '#3a2a90'; g.fill();
          g.fillStyle = '#fff'; g.font = `800 36px ${DISPLAY}`; g.fillText(String(secs), W - 70, 48);
        }
        // the question
        g.fillStyle = '#fff'; g.textAlign = 'center';
        let fs = 46;
        g.font = `800 ${fs}px ${DISPLAY}`;
        if (g.measureText(q[1]).width > 920 * 2) { fs = 38; g.font = `800 ${fs}px ${DISPLAY}`; }
        const lines = [];
        { let line = ''; for (const w of q[1].split(' ')) { const t = line ? `${line} ${w}` : w; if (line && g.measureText(t).width > 930) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); }
        const top = lines.length > 1 ? 130 : 160;
        lines.slice(0, 3).forEach((l, i) => g.fillText(l, W / 2, top + i * (fs + 10)));
        // the four answers
        const rs = rightSlot();
        for (let i = 0; i < 4; i++) {
          const bx = i % 2 ? 524 : 36, by = i < 2 ? 262 : 392, bw = 464, bh = 112;
          const dim = RS.ph === 'reveal' && i !== rs;
          g.globalAlpha = dim ? 0.3 : 1;
          rr(g, bx, by, bw, bh, 22); g.fillStyle = ANS_CSS[i]; g.fill();
          if (RS.ph === 'reveal' && i === rs) { g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke(); }
          if (me.choice === i) { g.lineWidth = 6; g.strokeStyle = RS.ph === 'reveal' && i !== rs ? '#ffb0b0' : '#fff'; g.setLineDash([12, 8]); g.stroke(); g.setLineDash([]); }
          g.beginPath(); g.arc(bx + 50, by + bh / 2, 32, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
          g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `800 38px ${DISPLAY}`; g.fillText(LET[i], bx + 50, by + bh / 2 + 2);
          g.textAlign = 'left'; g.font = `700 34px ${BODY}`;
          g.fillText(ansText(i), bx + 96, by + (RS.ph === 'reveal' ? 44 : bh / 2 + 2), bw - 116);
          if (RS.ph === 'reveal') {
            // who picked it
            const who = RS.order.map((id, k) => (id && RS.choices[k] === i ? (id === state.myPeer ? 'You' : nameOf(id)) : null)).filter(Boolean);
            if (who.length) { g.font = `600 22px ${BODY}`; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText(who.join(', '), bx + 96, by + 86, bw - 116); }
          }
          g.globalAlpha = 1;
        }
        // the timer bar and who's locked in
        if (RS.ph === 'ask') {
          rr(g, 36, 530, 952, 18, 9); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill();
          if (bar > 0) { rr(g, 36, 530, 952 * bar / 100, 18, 9); g.fillStyle = secs <= 5 ? '#ff6a5a' : '#8bd450'; g.fill(); }
          const n = RS.order.filter(Boolean).length, locked = RS.order.filter((id, k) => id && (RS.choices[k] === 9 || (id === state.myPeer && me.choice >= 0))).length;
          g.textAlign = 'right'; g.fillStyle = '#b8a8ff'; g.font = `600 22px ${BODY}`; g.fillText(`${locked} of ${n} locked in`, W - 36, 512);
        }
      } else if (RS.ph === 'final') {
        g.textAlign = 'center'; g.fillStyle = '#ffe680'; g.font = `800 60px ${DISPLAY}`; g.fillText('Final scores', W / 2, 70);
        const rows = standings();
        rows.slice(0, 6).forEach((r, i) => {
          const y = 150 + i * 62;
          rr(g, 180, y - 26, 664, 54, 16); g.fillStyle = i === 0 ? 'rgba(255,214,90,0.3)' : 'rgba(255,255,255,0.08)'; g.fill();
          g.textAlign = 'left'; g.fillStyle = i === 0 ? '#ffe680' : '#fff'; g.font = `800 34px ${DISPLAY}`;
          g.fillText(`${i === 0 ? '\u{1F451}' : `${i + 1}.`}`, 200, y + 2);
          g.font = `${r.id === state.myPeer ? 800 : 600} 32px ${BODY}`; g.fillText(r.name, 270, y + 2, 400);
          g.textAlign = 'right'; g.font = `800 34px ${DISPLAY}`; g.fillText(String(r.score), 824, y + 2);
        });
        g.textAlign = 'center'; g.fillStyle = '#b8a8ff'; g.font = `600 26px ${BODY}`; g.fillText(`A new game starts in ${secs}…`, W / 2, 545);
      } else {
        // the title card, before a game
        g.textAlign = 'center'; g.fillStyle = '#ffe680'; g.font = `800 76px ${DISPLAY}`; g.fillText('Quizzy’s Trivia Night', W / 2, 120);
        g.fillStyle = '#fff'; g.font = `700 34px ${BODY}`;
        g.fillText(RS.ph === 'intro' ? `Game ${RS.game} starts in ${secs}…` : 'Step up to a podium', W / 2, 205);
        const rows = RS.order.map((id) => (id === state.myPeer ? 'You' : nameOf(id))).filter((n, k) => RS.order[k]);
        g.font = `600 30px ${BODY}`; g.fillStyle = '#d8d0ff';
        if (rows.length) g.fillText(rows.join('   ·   '), W / 2, 280, 960);
        g.fillStyle = '#b8a8ff'; g.font = `500 26px ${BODY}`;
        g.fillText(`${QN} questions, ${Math.round(T.ASK / 1000)} seconds each. Right answers score 100, plus up to 50 for speed.`, W / 2, 370, 960);
        g.fillText('VR: touch a button on your podium.  Browser: press 1–4, or look at a button and press E.', W / 2, 420, 960);
        for (let i = 0; i < 4; i++) {
          const x = W / 2 + (i - 1.5) * 120;
          g.beginPath(); g.arc(x, 500, 36, 0, Math.PI * 2); g.fillStyle = ANS_CSS[i]; g.fill();
          g.fillStyle = '#fff'; g.font = `800 40px ${DISPLAY}`; g.fillText(LET[i], x, 502);
        }
      }
      screen.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- what Quizzy says
    const QUIPS_RIGHT = ['Correct!', 'That’s right!', 'Nailed it!', 'Yes indeed!'];
    function quizzyLine() {
      const q = Q();
      if (RS.ph === 'intro') return 'Welcome to Trivia Night! Fingers on buttons…';
      if (RS.ph === 'ask' && q) return RS.left > T.ASK - 3500 ? `${q[0]}, for question ${RS.qn}!` : RS.left < 5000 ? 'Five seconds!' : 'Lock it in…';
      if (RS.ph === 'reveal' && q) return `${QUIPS_RIGHT[(RS.qn + RS.game) % QUIPS_RIGHT.length]} It’s ${ansText(rightSlot())}.`;
      if (RS.ph === 'final') { const top = standings()[0]; return top ? (top.id === state.myPeer ? 'And the winner is… you!' : `And the winner is… ${top.name}!`) : 'What a game!'; }
      return 'Come on down!';
    }

    // ---------------------------------------------------------------- per frame
    let statusKey = '';
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) return;
      if (isHost()) hostStep(now);
      else { H.mine = false; if (RS.ph !== 'idle') RS.left -= dt * 1000; }
      // a new question: forget your last answer
      const qkey = `${RS.game}:${RS.qn}`;
      if (qkey !== me.key) { me.key = qkey; me.choice = -1; me.ms = 0; me.tickS = -1; remember(RS.qi); state.hudDirty = true; }
      // your podium changed (a new game, or you just got one)
      const s = mySeat();
      if (s !== me.seat) {
        me.seat = s;
        if (s >= 0) { toSpot(); showToast(RS.ph === 'intro' ? 'Take your podium: the game’s about to start!' : 'You’re in! Answer with your podium buttons'); }
        state.dirtyBoard = true;
      }
      if (!me.synced && (isHost() || me.heardHost)) { me.synced = true; me.phKey = `${RS.game}:${RS.qn}:${RS.ph}`; me.finalSeen = RS.ph === 'final' ? RS.game : -1; }
      const phKey = `${RS.game}:${RS.qn}:${RS.ph}`;
      if (me.synced && phKey !== me.phKey) {
        me.phKey = phKey;
        onPhase(now);
        state.dirtyBoard = true; state.hudDirty = true;
      }
      // the last five seconds tick
      if (RS.ph === 'ask') {
        const secs = Math.ceil(RS.left / 1000);
        if (secs !== me.tickS && secs <= 5 && secs > 0) { me.tickS = secs; tone(1200, 0, 0.05, 'square', 0.05); }
      }
      // podiums: lit buttons, the light strip, the scores
      const rs = rightSlot();
      for (const p of podiums) {
        const k = SEAT_ORDER.indexOf(p.s), id = k >= 0 && k < RS.order.length ? RS.order[k] : '';
        const mineP = id && id === state.myPeer;
        const c = mineP ? me.choice : RS.choices[k];
        for (let i = 0; i < 4; i++) p.buttons[i].lit = !!id && (RS.ph === 'ask' || RS.ph === 'reveal') && c === i;
        let col = id ? 0x4a4090 : 0x241f48;
        if (id && RS.ph === 'ask') col = (c >= 0) ? 0xf4f0ff : 0x4a4090;
        else if (id && RS.ph === 'reveal') col = c < 0 || c === 9 ? 0x4a4090 : c === rs ? 0x3cd85a : 0xe8453c;
        else if (id && RS.ph === 'final') { const top = standings()[0]; col = top && top.id === id ? (Math.sin(now * 0.012) > 0 ? 0xffd84a : 0xff9a3a) : 0x4a4090; }
        else if (id && RS.ph === 'intro') col = ANS_HEX[(Math.floor(now / 300) + p.s) % 4];
        p.stripMat.color.setHex(col);
        drawPodium(p, id, k);
      }
      // the bots at their podiums
      for (const b of bots) {
        const k = kOf(b.id);
        b.g.visible = k >= 0 && RS.ph !== 'idle';
        if (!b.g.visible) continue;
        const seat = seatAt(seatOfK(k)); spotOf(seat, _a);
        b.x = _a.x; b.z = _a.z;
        const e = (now - b.pressT) / 400, dip = e >= 0 && e < 1 ? Math.sin(e * Math.PI) * 0.06 : 0;
        const happy = RS.ph === 'reveal' && RS.choices[k] === rs ? Math.abs(Math.sin(now * 0.012 + b.k)) * 0.12 : 0;
        b.g.position.set(b.x, 1.55 - dip + happy + Math.sin(now * 0.002 + b.k * 2) * 0.01, b.z);
        b.g.rotation.y = seat.yaw + Math.sin(now * 0.0011 + b.k) * 0.08;
      }
      // bots' button presses show on their podiums (the host knows when; others see the lock-in)
      for (let k = 0; k < RS.order.length; k++) {
        const id = RS.order[k];
        if (!isBot(id)) continue;
        const b = botOf(id);
        if (RS.ph === 'ask' && RS.choices[k] === 9 && b.pressKey !== qkey) { b.pressKey = qkey; b.pressT = now; const p = podiums[seatOfK(k)]; if (p) p.buttons[Math.floor(Math.random() * 4)].pressT = now; }
      }
      // Quizzy, the screen, the lights
      quizzy.position.y = 1.62 + Math.sin(now * 0.003) * 0.02;
      quizzy.rotation.y = Math.atan2(QZ.x - 0, QZ.z - 0.5) + Math.sin(now * 0.0009) * 0.25;
      say(quizzyLine());
      drawScreen(now);
      const chase = Math.floor(now / (RS.ph === 'ask' && RS.left < 5000 ? 70 : 140));
      bulbs.forEach((s, i) => { s.material.opacity = (i + chase) % 3 === 0 ? 1 : 0.35; });
      for (const bm of beams) { if (!reduceMotion) { bm.cone.rotation.z = Math.sin(now * 0.0007 + bm.ph) * 0.25; bm.cone.rotation.x = Math.cos(now * 0.0005 + bm.ph) * 0.2; } }
      const cheer = RS.ph === 'reveal' || RS.ph === 'final';
      for (const c of crowd) c.g.position.y = c.y0 + (cheer && !reduceMotion ? Math.max(0, Math.sin(now * 0.014 + c.ph)) * 0.12 : 0);
      // the browser status bar
      if (state.mode === 'flat' && ui.status) {
        const inGame = kOf(state.myPeer) >= 0;
        const a = RS.ph === 'ask' ? (!inGame ? 'Watching: you’ll join at the next question' : me.choice >= 0 ? `Locked in: ${LET[me.choice]}` : 'Press 1–4 to answer')
          : RS.ph === 'reveal' ? (me.choice < 0 ? `It was ${LET[rs]}` : me.choice === rs ? 'Correct!' : `Not quite: it was ${LET[rs]}`)
            : RS.ph === 'intro' ? 'Get ready…' : RS.ph === 'final' ? 'Final scores' : 'Trivia Night';
        const k = kOf(state.myPeer), b = k >= 0 && RS.ph !== 'idle' ? `${RS.scores[k] || 0} points` : '';
        const key = `${a}|${b}`;
        if (key !== statusKey) {
          statusKey = key; ui.status.hidden = false; ui.status.replaceChildren();
          for (const [t, col] of [[a, RS.ph === 'reveal' && me.choice >= 0 ? (me.choice === rs ? '#8bd450' : '#ff8a7a') : '#ffe680'], [b, null]]) { if (!t) continue; const sp = document.createElement('span'); sp.textContent = t; if (col) sp.style.color = col; ui.status.append(sp); }
        }
      }
    };
    function onPhase() {
      const k = kOf(state.myPeer), rs = rightSlot();
      if (RS.ph === 'intro') { sfx('chime', 0.6); }
      else if (RS.ph === 'ask') { sfx('beep2', 0.5); }
      else if (RS.ph === 'reveal') {
        if (k >= 0) {
          const pos = spotOf(seatAt(seatOfK(k)), new V3()).setY(2.1);
          if (me.choice === rs) { sfx('chime', 0.9); spawnFloat(`+${RS.gains[k] || 100}`, pos, '#8bd450'); for (const s of SIDES) haptic(vrHands[s], 0.5, 80); }
          else if (me.choice >= 0) { sfx('buzzer', 0.8); spawnFloat('✗', pos, '#ff6a5a'); }
          else { sfx('buzzer', 0.4); spawnFloat('Time!', pos, '#b8a8ff'); }
        } else sfx('chime', 0.4);
      } else if (RS.ph === 'final' && me.finalSeen !== RS.game) {
        me.finalSeen = RS.game;
        const top = standings()[0];
        if (top && top.id === state.myPeer) { me.wins += 1; sfx('fanfare', 0.9); sfx('cheer', 0.7); showToast('You win Trivia Night!'); forcePresence(); }
        else if (top) { sfx('cheer', 0.5); showToast(`${top.name} wins Trivia Night!`); }
      }
    }

    // ---------------------------------------------------------------- side scoreboard and the player list
    let boardKey = '';
    L.drawBoard = () => {
      const rows = standings();
      const key = JSON.stringify([rows.map((r) => [r.id, r.score]), RS.game, RS.qn, RS.ph, me.wins]);
      if (key === boardKey) return;
      boardKey = key;
      const g = L.board.g, W = 720, Hh = 460;
      g.fillStyle = '#1a1446'; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#9a7aff'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, Hh - 8);
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left'; g.fillStyle = '#ffe680'; g.font = `800 54px ${DISPLAY}`; g.fillText('Scores', 32, 68);
      g.textAlign = 'right'; g.fillStyle = '#c8b8ff'; g.font = `400 24px ${BODY}`;
      g.fillText(RS.game ? `Game ${RS.game}${RS.qn ? ` · Q${RS.qn}/${QN}` : ''}` : 'Trivia Night', W - 32, 64);
      rows.slice(0, 8).forEach((r, i) => {
        const y = 124 + i * 40;
        g.textAlign = 'left'; g.fillStyle = r.id === state.myPeer ? '#8bd450' : '#f4f0ff';
        g.font = `${r.id === state.myPeer ? 700 : 400} 28px ${BODY}`;
        g.fillText(`${i + 1}. ${r.name}`, 32, y, 480);
        g.textAlign = 'right'; g.fillStyle = '#ffe680'; g.font = `800 30px ${DISPLAY}`; g.fillText(String(r.score), W - 32, y);
      });
      g.textAlign = 'left'; g.fillStyle = '#a898e0'; g.font = `400 22px ${BODY}`;
      g.fillText(`Games you’ve won this visit: ${me.wins}`, 32, Hh - 26, W - 64);
      L.board.tex.needsUpdate = true;
    };
    L.rowFor = (st, isMe) => {
      const id = isMe ? state.myPeer : st && st.peer;
      const k = kOf(id);
      return { score: k >= 0 ? RS.scores[k] || 0 : -1, text: k >= 0 ? String(RS.scores[k] || 0) : 'watching' };
    };
    L.sortRows = (a, b) => (b.score || 0) - (a.score || 0);
    L.hints = [['Touch', 'a button on your podium'], ['Trigger', 'press the button you point at']];
    L.hintsFor = () => (state.mode === 'flat' ? [['1–4', 'answer A–D'], ['E', 'press the button you look at']] : L.hints);

    // ---------------------------------------------------------------- network
    L.presence = () => {
      const p = { tq: [RS.game, RS.qn, me.choice, me.ms, me.wins] };
      if (isHost()) {
        p.th = [RS.game, PH[RS.ph], RS.qn, RS.qi, RS.perm[0], RS.perm[1], RS.perm[2], RS.perm[3], Math.max(0, Math.round(RS.left / 100))];
        p.tho = RS.order.slice();
        p.ths = RS.scores.slice();
        p.thc = RS.choices.slice();
        p.thg = RS.gains.slice();
      }
      return p;
    };
    const intIn = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    L.readPresence = (rec, pres, st) => {
      st.peer = rec.peer;
      const q = pres.tq;
      if (Array.isArray(q) && q.length === 5 && q.every((x) => Number.isInteger(x))) {
        st.wins = clamp(q[4], 0, 9999);
        // their answer to this question
        if (isHost() && RS.ph === 'ask' && q[0] === RS.game && q[1] === RS.qn && intIn(q[2], 0, 3) && kOf(rec.peer) >= 0 && !H.ans.has(rec.peer)) {
          H.ans.set(rec.peer, { c: q[2], ms: clamp(q[3], 0, T.ASK) });
        }
      }
      if (rec.peer !== hostId() || isHost()) return;
      const h = pres.th, po = pres.tho, ps = pres.ths, pc = pres.thc, pg = pres.thg;
      if (!Array.isArray(h) || h.length !== 9 || !h.every((x) => Number.isInteger(x))) return;
      if (!Array.isArray(po) || po.length > SEATS || !po.every((x) => typeof x === 'string' && x.length < 64)) return;
      if (po.some((id) => isBot(id) && !intIn(Number(id.slice(4)), 0, bots.length - 1))) return;
      const n = po.length, ok = (a, lo, hi) => Array.isArray(a) && a.length === n && a.every((x) => intIn(x, lo, hi));
      if (!ok(ps, 0, 99999) || !ok(pc, -1, 9) || !ok(pg, 0, 999)) return;
      const perm = h.slice(4, 8);
      if (perm.slice().sort().join() !== '0,1,2,3') return;
      if (!intIn(h[3], -1, TRIVIA_Q.length - 1) || !intIn(h[1], 0, 4)) return;
      RS.game = h[0]; RS.ph = PH_N[h[1]]; RS.qn = h[2]; RS.qi = h[3]; RS.perm = perm; RS.left = h[8] * 100;
      RS.order = po.slice(); RS.scores = ps.slice(); RS.choices = pc.slice(); RS.gains = pg.slice();
      me.heardHost = true;
    };
    L.spawn = () => { dolly.position.set((Math.random() - 0.5) * 2, 0, 3.4); state.yaw = 0; state.pitch = 0.08; };
    L.onEnter = () => {
      me.seat = -1; me.key = ''; me.phKey = ''; me.synced = false; me.heardHost = false; H.mine = false;
      boardKey = ''; screenKey = ''; statusKey = ''; bubbleKey = '-'; state.dirtyBoard = true;
      // a game left over from an earlier visit is stale: whoever's hosting will tell us what's on
      Object.assign(RS, { ph: 'idle', qn: 0, qi: -1, order: [], scores: [], choices: [], gains: [], left: 0 });
      H.ans.clear();
    };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; statusKey = ''; for (const b of bots) b.g.visible = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.00012) * 0.5; camera.position.set(Math.sin(a) * 7, 3.2, 4 + Math.cos(a) * 2); camera.lookAt(0, 2.4, -7); };
    L.triviaInternals = { RS, H, me, T, bots, podiums, hostStep, answer, isHost, seatAt, mySeat, rightSlot, ansText, QN, SEAT_ORDER, kOf, bank: TRIVIA_Q };
    return L;
  })();
