  // ================================================================ LEVEL: GORILLA TAG (party games)
  // Jungle infection tag. No sticks, no legs: in VR you move with your arms, pushing off the ground, trunks and
  // platforms like a gorilla (push down and back to go up and forward, let go to fly). One player starts as "lava";
  // touch someone and they're lava too. Survive two and a half minutes to win, or tag everyone first.
  // Friends or bots (the bots stay on the ground, so climb to get away from them).
  // Browser: WASD to run, Space to leap; if you're lava, run into people to tag them.
  const gorilla = (() => {
    const L = newLevel(58);
    const G = L.group;
    const rand = mulberry32(5858);
    L.grabless = true;
    L.noLocomotion = 'turn';   // (VR: your arms are your legs; the right stick still turns you)
    Object.defineProperty(L, 'walkSpeed', { get: () => 4.6 });
    L.env = {
      sky: skyTexture([[0, '#2a6a4a'], [0.4, '#7ab88a'], [0.5, '#d8f0c8'], [0.52, '#3a6a2a'], [1, '#1a3a1a']]),
      bg: 0x6a9a6a, fog: [0x5a8a5a, 18, 70], hemi: [0xe8ffe0, 0x2a4a1a, 0.85],
      sun: [0xfff4c8, 0.6], sunDir: new V3(0.3, 0.9, 0.2), ambient: [0x4a6a3a, 0.4], sprite: null,
    };
    const ARENA = 14, ROUND_T = 150, TAG_R = 0.85;
    // in VR you're gorilla-sized: your eyes are about a metre up, so the ground is in easy reach of your hands
    // (your real floor sits below the jungle floor by SHIFT). A hand is a ball of radius HR.
    const SHIFT = 0.75, HR = 0.06, ARM = 1.3, VMAX = 8.5;
    const shift = () => (state.mode === 'vr' ? SHIFT : 0);
    L.bounds = { minX: -ARENA, maxX: ARENA, minZ: -ARENA, maxZ: ARENA };
    // ---------------------------------------------------------------- the jungle: everything you can touch is a box
    const BOXES = [];
    const bark = lam(0x6a4a2a), leaf = lam(0x3a7a2a), wood = lam(0x9a6a3a), stone = lam(0x7a7a72);
    function box(x0, y0, z0, x1, y1, z1, mat) {
      const b = { min: new V3(x0, y0, z0), max: new V3(x1, y1, z1) };
      addBox(G, x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      BOXES.push(b); return b;
    }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), lam(0x4a7a2a)); ground.rotation.x = -Math.PI / 2; G.add(ground);
    // the big tree in the middle, with a treehouse deck around it
    box(-0.8, 0, -0.8, 0.8, 9, 0.8, bark);
    box(-3.6, 3.0, -3.6, 3.6, 3.2, -0.8, wood); box(-3.6, 3.0, 0.8, 3.6, 3.2, 3.6, wood); box(-3.6, 3.0, -0.8, -0.8, 3.2, 0.8, wood); box(0.8, 3.0, -0.8, 3.6, 3.2, 0.8, wood);
    { const c = new THREE.Mesh(new THREE.SphereGeometry(4.5, 10, 8), leaf); c.position.set(0, 10, 0); c.scale.y = 0.6; G.add(c); }
    // trees around it, each with a branch platform
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + 0.2, x = Math.cos(a) * 9, z = Math.sin(a) * 9;
      box(x - 0.45, 0, z - 0.45, x + 0.45, 8, z + 0.45, bark);
      const h = i % 2 ? 2.1 : 4.2, px = x - Math.cos(a) * 1.4, pz = z - Math.sin(a) * 1.4;
      box(px - 1, h - 0.2, pz - 1, px + 1, h, pz + 1, wood);
      const c = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), leaf); c.position.set(x, 8.6, z); c.scale.y = 0.7; G.add(c);
      // a stump to get you up there
      const sx = x - Math.cos(a) * 3.2 + Math.sin(a) * 1.2, sz = z - Math.sin(a) * 3.2 - Math.cos(a) * 1.2;
      box(sx - 0.55, 0, sz - 0.55, sx + 0.55, i % 2 ? 1.0 : 1.1, sz + 0.55, stone);
      if (!(i % 2)) { const s2x = sx - Math.cos(a) * 0.3, s2z = sz - Math.sin(a) * 0.3; box(s2x - 0.4 + Math.sin(a) * 1.4, 0, s2z - 0.4 - Math.cos(a) * 1.4, s2x + 0.4 + Math.sin(a) * 1.4, 2.2, s2z + 0.4 - Math.cos(a) * 1.4, stone); }
    }
    // logs and boulders on the ground
    box(4.5, 0, -6.4, 8.5, 0.6, -5.8, bark); box(-8.5, 0, 5.8, -4.5, 0.6, 6.4, bark); box(-6.5, 0, -7.5, -5.3, 1.3, -6.3, stone); box(5.5, 0, 6.3, 6.7, 1.3, 7.5, stone);
    // a wall of jungle round the edge (you can climb it a bit, but not out)
    for (const [x0, z0, x1, z1] of [[-ARENA - 1, -ARENA - 1, ARENA + 1, -ARENA], [-ARENA - 1, ARENA, ARENA + 1, ARENA + 1], [-ARENA - 1, -ARENA, -ARENA, ARENA], [ARENA, -ARENA, ARENA + 1, ARENA]]) box(x0, 0, z0, x1, 3, z1, lam(0x2a5a1a));
    for (let i = 0; i < 70; i++) { const a = rand() * Math.PI * 2, r = ARENA + 2 + rand() * 8; addCyl(G, 0.3, 0.4, 7, 6, bark, Math.cos(a) * r, 3.5, Math.sin(a) * r); const c = new THREE.Mesh(new THREE.SphereGeometry(2.5, 7, 5), leaf); c.position.set(Math.cos(a) * r, 7.5, Math.sin(a) * r); G.add(c); }
    makePlate(G, '\u{1F98D}  GORILLA TAG', 2.6, 0.42, new V3(0, 2.1, 0.85), 0, { bg: '#ff6a1a', fg: '#ffffff', size: 0.6 });
    // the ground beneath (x, z) for feet at height y: the highest top you're standing on (or could step up to)
    function support(x, z, y, r) {
      let s = 0; const rr = r || 0.2;
      for (const b of BOXES) if (x > b.min.x - rr && x < b.max.x + rr && z > b.min.z - rr && z < b.max.z + rr && b.max.y <= y + 0.35 && b.max.y > s) s = b.max.y;
      return s;
    }
    // push a point (a head) out of any box it's in, sideways or down
    function pushOut(p, r) {
      const out = new V3();
      for (const b of BOXES) {
        if (p.x < b.min.x - r || p.x > b.max.x + r || p.z < b.min.z - r || p.z > b.max.z + r || p.y < b.min.y - 0.1 || p.y > b.max.y + 0.05) continue;
        const dx0 = p.x - (b.min.x - r), dx1 = b.max.x + r - p.x, dz0 = p.z - (b.min.z - r), dz1 = b.max.z + r - p.z, dyd = p.y - (b.min.y - 0.1);
        const m = Math.min(dx0, dx1, dz0, dz1, dyd);
        if (m === dx0) out.x -= dx0; else if (m === dx1) out.x += dx1; else if (m === dz0) out.z -= dz0; else if (m === dz1) out.z += dz1; else out.y -= dyd;
      }
      return out;
    }
    // is a hand touching a surface? returns where it touches and the surface's normal
    function contact(p) {
      if (p.y < HR) return { at: new V3(p.x, HR, p.z), n: new V3(0, 1, 0) };
      const r = HR;
      for (const b of BOXES) {
        if (p.x < b.min.x - r || p.x > b.max.x + r || p.y < b.min.y - r || p.y > b.max.y + r || p.z < b.min.z - r || p.z > b.max.z + r) continue;
        const d = [[p.x - (b.min.x - r), -1, 0, 0], [b.max.x + r - p.x, 1, 0, 0], [p.y - (b.min.y - r), 0, -1, 0], [b.max.y + r - p.y, 0, 1, 0], [p.z - (b.min.z - r), 0, 0, -1], [b.max.z + r - p.z, 0, 0, 1]];
        d.sort((a, c) => a[0] - c[0]);
        const [pen, nx, ny, nz] = d[0], n = new V3(nx, ny, nz);
        return { at: p.clone().addScaledVector(n, pen), n };
      }
      return null;
    }
    L.gtSupport = support;

    // ---------------------------------------------------------------- bots
    const BOT_NAMES = ['Koko', 'Banjo', 'Mango', 'Bongo', 'Kiwi', 'Pepper', 'Moss'];
    const bodyM = () => new THREE.MeshLambertMaterial({ color: 0x3a3a40 });
    const bots = BOT_NAMES.map((name, i) => {
      const g = new THREE.Group(), m = bodyM();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), m); body.scale.set(1, 1.1, 0.85); body.position.y = 0.75; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), m); head.position.set(0, 1.35, -0.08); g.add(head);
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), lam(0x8a7a6a)); face.position.set(0, 1.3, -0.22); face.scale.z = 0.6; g.add(face);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0x111111 })); e.position.set(sx * 0.07, 1.4, -0.3); g.add(e); }
      const arms = [-1, 1].map((sx) => { const a = new THREE.Group(); a.position.set(sx * 0.42, 1.05, 0); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.9, 8), m); arm.position.y = -0.42; a.add(arm); g.add(a); return a; });
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (gg) => { rr(gg, 4, 6, 248, 52, 26); gg.fillStyle = 'rgba(20,16,32,0.8)'; gg.fill(); gg.fillStyle = '#ffffff'; gg.font = `700 32px ${BODY}`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(name, 128, 33); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.8, 0.2, 1); tag.position.y = 1.85; g.add(tag);
      g.visible = false; G.add(g);
      return { id: 'b' + i, name, g, m, arms, x: 0, z: 0, y: 0, vy: 0, yaw: 0, hop: rand() * 6, tx: 0, tz: 0 };
    });
    const botOf = (id) => (id && id[0] === 'b' && id.length <= 2 ? bots[Number(id.slice(1))] : null);
    // a flame over everyone who's lava
    const flameTex = canvasTexture(64, 64, (g) => { const gr = g.createRadialGradient(32, 40, 2, 32, 36, 30); gr.addColorStop(0, '#fff4a0'); gr.addColorStop(0.4, '#ff8a1a'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }).tex;
    const flames = [];
    for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.set(0.5, 0.7, 1); s.visible = false; G.add(s); flames.push(s); }
    // my own lava hands (VR) and a glow
    const myLava = {};
    for (const s of SIDES) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 16), new THREE.MeshBasicMaterial({ color: 0xff6a1a })); m.visible = false; L.overlay.add(m); myLava[s] = m; }

    // ---------------------------------------------------------------- the round (run by the host)
    const S = { g: 0, ph: 'lobby', ids: [], inf: [], t: ROUND_T, msg: '', msgSeq: 0, seen: {}, tagsMe: 0, survive: 0, start: 0, wins: 0 };
    L.gt = S;
    const ME = { claim: [0, -1], startReq: 0, aPrev: false };
    const humansHere = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const isHost = () => humansHere()[0] === state.myPeer;
    const nameOf = (id) => { const b = botOf(id); if (b) return b.name; if (id === state.myPeer) return 'You'; const rec = remotes.get(id); return rec ? rec.name : 'Someone'; };
    const myIdx = () => S.ids.indexOf(state.myPeer);
    const amLava = () => myIdx() >= 0 && S.inf[myIdx()] === 1;
    makePlayerPicker(L, { min: 2, max: 8, def: 5, label: 'Gorillas', note: 'bots make up the numbers' });
    function say(m) { S.msg = m; S.msgSeq += 1; showToast(m); }
    function posOf(id, out) {
      if (id === state.myPeer) return out.copy(myHead.pos);
      const b = botOf(id); if (b) return out.set(b.x, b.y + 1.35, b.z);
      const rec = remotes.get(id); return rec && rec.hasH ? out.copy(rec.cur.h.pos) : null;
    }
    function startRound() {
      const people = humansHere().filter((id) => { if (id === state.myPeer) return !(L.sitOut && L.sitOut.on); const st = remotes.get(id).lvState[L.id]; return !(st && st.sitOut); });
      const nBots = clamp(L.picker.n - people.length, people.length < 2 ? 1 : 0, bots.length);
      const ids = people.slice(); for (let i = 0; i < nBots; i++) ids.push(bots[i].id);
      const it = Math.floor(rand() * ids.length);
      S.g = (S.g + 1) % 100000; S.ph = 'play'; S.ids = ids; S.inf = ids.map((_, k) => (k === it ? 1 : 0)); S.t = ROUND_T; S.start = performance.now();
      ids.forEach((id, k) => { const b = botOf(id); if (b) { const a = rand() * Math.PI * 2, r = 5 + rand() * 6; b.x = Math.cos(a) * r; b.z = Math.sin(a) * r; b.y = 0; b.vy = 0; } });
      S.tagsMe = 0;
      sfx('whistle', 1);
      say(`${nameOf(ids[it])} ${ids[it] === state.myPeer ? 'are' : 'is'} lava! Don’t get tagged`);
      forcePresence(); state.dirtyBoard = true;
    }
    L.startRound = startRound;
    function tag(a, t) {
      if (S.ph !== 'play' || S.inf[a] !== 1 || S.inf[t] !== 0) return false;
      S.inf[t] = 1;
      if (S.ids[a] === state.myPeer) S.tagsMe = (S.tagsMe || 0) + 1;
      say(`${nameOf(S.ids[a])} tagged ${nameOf(S.ids[t]) === 'You' ? 'you' : nameOf(S.ids[t])}!`);
      const at = posOf(S.ids[t], new V3()); if (at) { tone(220, 110, 0.3, 'sawtooth', 0.15); }
      if (S.inf.every((x) => x === 1)) endRound(1);
      forcePresence(); state.dirtyBoard = true;
      return true;
    }
    L.tag = tag;
    function endRound(lavaWon) {
      S.ph = 'done'; S.t = 0;
      const survivors = S.ids.filter((_, k) => S.inf[k] === 0).map(nameOf);
      say(lavaWon ? 'Everyone’s lava! The lava wins' : `Time! Survivors win: ${survivors.join(', ')}`);
      forcePresence();
    }
    // the host: the clock, the bots, bots tagging
    function hostStep(dt) {
      if (S.ph !== 'play') return;
      S.t = Math.max(0, ROUND_T - (performance.now() - S.start) / 1000);
      if (S.t <= 0) { endRound(0); return; }
      const P = S.ids.map((id) => posOf(id, new V3()));
      S.ids.forEach((id, k) => {
        const b = botOf(id); if (!b) return;
        const lava = S.inf[k] === 1;
        // chase the nearest survivor (that's on the ground-ish), or run from the nearest lava
        let best = -1, bd = 1e9;
        S.ids.forEach((o, j) => { if (j === k || !P[j] || S.inf[j] === (lava ? 1 : 0)) return; const d = Math.hypot(P[j].x - b.x, P[j].z - b.z) + (lava ? Math.max(0, P[j].y - 2.2) * 6 : 0); if (d < bd) { bd = d; best = j; } });
        let dx = 0, dz = 0;
        if (best >= 0) { const p = P[best]; dx = p.x - b.x; dz = p.z - b.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d; if (!lava) { dx = -dx; dz = -dz; if (bd > 9) { dx = Math.sin(b.hop * 0.3); dz = Math.cos(b.hop * 0.3); } } }
        // keep off the edges
        dx -= clamp((b.x) / ARENA, -1, 1) ** 3 * 1.5; dz -= clamp((b.z) / ARENA, -1, 1) ** 3 * 1.5;
        const sp = lava ? 3.9 : 3.5, l = Math.hypot(dx, dz) || 1;
        b.x += dx / l * sp * dt; b.z += dz / l * sp * dt; b.hop += dt * 7;
        b.yaw = Math.atan2(-dx, -dz);
        const push = pushOut(new V3(b.x, 0.8, b.z), 0.45); b.x += push.x; b.z += push.z;
        b.x = clamp(b.x, -ARENA + 0.6, ARENA - 0.6); b.z = clamp(b.z, -ARENA + 0.6, ARENA - 0.6);
        b.y = Math.abs(Math.sin(b.hop)) * 0.35;
        // a lava bot tags anyone it reaches
        if (lava) S.ids.forEach((o, j) => { if (S.inf[j] === 0 && P[j] && Math.hypot(P[j].x - b.x, P[j].z - b.z) < TAG_R && P[j].y - (b.y + 1.3) < 0.9) tag(k, j); });
        else S.ids.forEach((o, j) => { if (S.inf[j] === 1 && !botOf(o) && P[j] && Math.hypot(P[j].x - b.x, P[j].z - b.z) < TAG_R && Math.abs(P[j].y - (b.y + 1.3)) < 1.1) tag(j, k); });
      });
    }
    // me (anyone, host or not): if I'm lava, touching someone tags them
    const _a = new V3(), _b = new V3();
    function myTags() {
      if (S.ph !== 'play' || !amLava()) return;
      const me = myIdx();
      S.ids.forEach((id, j) => {
        if (j === me || S.inf[j] !== 0 || !posOf(id, _a)) return;
        // their head, or their body below it; my head, or my hands
        let hit = Math.hypot(_a.x - myHead.pos.x, _a.z - myHead.pos.z) < TAG_R * 0.8 && Math.abs(_a.y - myHead.pos.y) < 1.0;
        for (const s of SIDES) { const h = myHands[s]; if (!h.ok) continue; const dy = clamp(h.pos.y, _a.y - 1.2, _a.y + 0.2); if (Math.hypot(h.pos.x - _a.x, h.pos.z - _a.z, h.pos.y - dy) < 0.42) hit = true; }
        if (!hit) return;
        if (isHost()) tag(me, j);
        else if (ME.claimT === undefined || performance.now() - ME.claimT > 400) { ME.claim = [ME.claim[0] + 1, j]; ME.claimT = performance.now(); forcePresence(); }
      });
    }

    // ---------------------------------------------------------------- moving: VR arms
    const M = { vel: new V3(), hand: { left: { on: false, at: new V3(), n: new V3() }, right: { on: false, at: new V3(), n: new V3() } }, ground: true, hist: [] };
    L.gtMove = M;
    const _d = new V3(), _c = new V3();
    function vrMove(dt) {
      _c.set(0, 0, 0); let n = 0;
      for (const s of SIDES) {
        const h = myHands[s], H = M.hand[s];
        if (!h.ok) { H.on = false; continue; }
        if (!H.on) {
          const c = contact(h.pos);
          if (c) { H.on = true; H.at.copy(c.at); H.n.copy(c.n); const sp = M.vel.length(); haptic(vrHands[s], Math.min(1, 0.2 + sp * 0.12), 20); if (sp > 2) sfx('grass', Math.min(1, sp / 6)); }
        }
        if (H.on) {
          _d.subVectors(h.pos, H.at);
          // lifting the hand off (away from the surface) lets go
          if (_d.dot(H.n) > 0.04) { H.on = false; continue; }
          _c.sub(_d); n++;
        }
      }
      if (n) {
        _c.divideScalar(n);
        dolly.position.add(_c);
        // how fast your arms are moving you: carried on when you let go (a little extra, gorillas are bouncy)
        M.hist.push(_c.clone().divideScalar(Math.max(dt, 1e-3))); while (M.hist.length > 4) M.hist.shift();
        const v = M.hist.reduce((a, x) => a.add(x), new V3()).divideScalar(M.hist.length).multiplyScalar(ARM);
        if (v.length() > VMAX) v.setLength(VMAX);
        M.vel.copy(v);
      } else {
        M.hist.length = 0;
        M.vel.y -= 9.8 * dt;
        dolly.position.addScaledVector(M.vel, dt);
      }
      settle(dt, n > 0);
    }
    // feet on whatever's below, head out of the trees, inside the arena
    function settle(dt, holding) {
      camera.getWorldPosition(_a);
      const fl = support(_a.x, _a.z, dolly.position.y + shift()) - shift();
      if (dolly.position.y <= fl) { dolly.position.y = fl; if (M.vel.y < 0) M.vel.y = 0; if (!holding) M.vel.x *= Math.exp(-dt * 7), M.vel.z *= Math.exp(-dt * 7); M.ground = true; } else M.ground = false;
      camera.getWorldPosition(_a);
      const push = pushOut(_a, 0.22); push.y = Math.min(0, push.y);
      dolly.position.add(push);
      if (push.x) M.vel.x = 0; if (push.z) M.vel.z = 0; if (push.y < 0 && M.vel.y > 0) M.vel.y = 0;
      camera.getWorldPosition(_a);
      dolly.position.x += clamp(_a.x, -ARENA + 0.4, ARENA - 0.4) - _a.x; dolly.position.z += clamp(_a.z, -ARENA + 0.4, ARENA - 0.4) - _a.z;
    }
    // the browser: WASD moves you (flat-controls), Space leaps; gravity and the trees are ours
    L.deskFire = () => { if (M.ground) { M.vel.y = 5.4; M.ground = false; sfx('whoosh', 0.3); } };
    L.throwLabel = () => 'Leap';
    L.clampPlayer = (p) => { const push = pushOut(new V3(p.x, p.y, p.z), 0.25); const x = clamp(p.x + push.x, -ARENA + 0.4, ARENA - 0.4), z = clamp(p.z + push.z, -ARENA + 0.4, ARENA - 0.4); return [x - p.x, z - p.z]; };
    function flatMove(dt) {
      M.vel.y -= 9.8 * dt;
      dolly.position.y += M.vel.y * dt;
      settle(dt, false);
    }

    // ---------------------------------------------------------------- network
    const PH = ['lobby', 'play', 'done'];
    const r1 = (x) => Math.round(x * 10) / 10;
    function snapshot() { return { g: S.g, ph: PH.indexOf(S.ph), ids: S.ids.slice(), inf: S.inf.slice(), t: Math.round(S.t), b: S.ids.flatMap((id) => { const b = botOf(id); return b ? [r1(b.x), r1(b.y), r1(b.z), r1(b.yaw)] : [0, 0, 0, 0]; }), m: [S.msgSeq, S.msg] }; }
    function validSnap(q) {
      const n = q && Array.isArray(q.ids) ? q.ids.length : -1;
      return n >= 0 && n <= 12 && Number.isInteger(q.g) && Number.isInteger(q.ph) && q.ph >= 0 && q.ph < 3 && q.ids.every((x) => typeof x === 'string' && x.length < 64)
        && Array.isArray(q.inf) && q.inf.length === n && q.inf.every((x) => x === 0 || x === 1) && Number.isInteger(q.t) && q.t >= 0 && q.t <= ROUND_T
        && Array.isArray(q.b) && q.b.length === n * 4 && q.b.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 100)
        && Array.isArray(q.m) && q.m.length === 2 && Number.isInteger(q.m[0]) && typeof q.m[1] === 'string' && q.m[1].length < 200;
    }
    let seenMsg = -1;
    function applySnap(q) {
      const wasLava = amLava(), prevPh = S.ph;
      Object.assign(S, { g: q.g, ph: PH[q.ph], ids: q.ids.slice(), inf: q.inf.slice(), t: q.t });
      S.ids.forEach((id, k) => { const b = botOf(id); if (b) { b.tx = q.b[k * 4]; b.ty = q.b[k * 4 + 1]; b.tz = q.b[k * 4 + 2]; b.yaw = q.b[k * 4 + 3]; } });
      if (seenMsg >= 0 && q.m[0] !== seenMsg && q.m[1]) showToast(q.m[1]);
      seenMsg = q.m[0];
      if (!wasLava && amLava()) onTagged();
      if (prevPh === 'play' && S.ph === 'done') roundOverForMe();
    }
    L.presence = () => {
      const p = { gw: [S.wins || 0, ME.startReq || 0], gc: ME.claim };
      if (isHost() && state.level === L.idx) p.gq = snapshot();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      const w = pres.gw;
      if (Array.isArray(w) && w.length === 2 && w.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) {
        if (!st.gw || st.gw[0] !== w[0]) state.dirtyBoard = true;
        if (st.gw && w[1] !== st.gw[1] && isHost() && state.level === L.idx && S.ph !== 'play') startRound();
        st.gw = w;
      } else st.gw = null;
      const c = pres.gc;
      if (Array.isArray(c) && c.length === 2 && Number.isInteger(c[0]) && Number.isInteger(c[1])) {
        if (isHost() && state.level === L.idx && S.seen[rec.peer] !== undefined && S.seen[rec.peer] !== c[0] && c[1] >= 0 && c[1] < S.ids.length) {
          const a = S.ids.indexOf(rec.peer), ap = posOf(rec.peer, new V3()), tp = posOf(S.ids[c[1]], new V3());
          if (a >= 0 && ap && tp && ap.distanceTo(tp) < 2.5) tag(a, c[1]);
        }
        S.seen[rec.peer] = c[0];
      }
      if (pres.gq && validSnap(pres.gq)) { if (!isHost() && rec.peer === humansHere()[0]) applySnap(pres.gq); }
    };
    // ---------------------------------------------------------------- what happens to me
    let wasLavaLocal = false;
    function onTagged() {
      S.survive = (performance.now() - S.start) / 1000;
      if (S.survive > 5) RECORDS.add(L, 'survive', S.survive);
      sfx('slam', 0.6); tone(160, 60, 0.6, 'sawtooth', 0.2);
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 1, 300);
    }
    function roundOverForMe() {
      if (myIdx() < 0) return;
      if (!amLava()) { S.survive = ROUND_T; RECORDS.add(L, 'survive', ROUND_T); S.wins = (S.wins || 0) + 1; sfx('fanfare', 0.8); }
      if (S.tagsMe) RECORDS.add(L, 'tags', S.tagsMe);
      state.dirtyBoard = true;
    }
    // the clock on the big tree
    const clk = canvasTexture(512, 160);
    const clkM = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshBasicMaterial({ map: clk.tex }));
    const clkB = clkM.clone();
    clkM.position.set(0, 5.0, 0.82); clkB.position.set(0, 5.0, -0.82); clkB.rotation.y = Math.PI; G.add(clkM); G.add(clkB);
    let clkKey = '';
    function drawClk() {
      const nLava = S.inf.filter((x) => x === 1).length, key = `${S.ph}|${Math.ceil(S.t)}|${nLava}|${S.ids.length}`;
      if (key === clkKey) return; clkKey = key;
      const g = clk.g;
      g.fillStyle = '#2a1a0a'; g.fillRect(0, 0, 512, 160); g.strokeStyle = '#ff8a1a'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 154);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (S.ph === 'play') { const t = Math.ceil(S.t); g.fillStyle = '#ffffff'; g.font = `900 70px ${DISPLAY}`; g.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, 160, 82); g.fillStyle = '#ff8a1a'; g.font = `800 40px ${DISPLAY}`; g.fillText(`${nLava} lava`, 380, 60); g.fillStyle = '#8bd450'; g.fillText(`${S.ids.length - nLava} safe`, 380, 110); }
      else { g.fillStyle = '#ff8a1a'; g.font = `800 50px ${DISPLAY}`; g.fillText(S.ph === 'done' ? 'Round over' : 'Gorilla Tag', 256, 62); g.fillStyle = '#ffffff'; g.font = `400 26px ${BODY}`; g.fillText(state.mode === 'vr' ? 'Press A or X to start' : 'Start a round from the buttons up top', 256, 116); }
      clk.tex.needsUpdate = true;
    }
    // ---------------------------------------------------------------- per frame
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { for (const s of SIDES) myLava[s].visible = false; return; }
      if (isHost()) hostStep(dt);
      else { const k = 1 - Math.exp(-dt * 10); for (const b of bots) if (b.tx !== undefined) { b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k; b.z += (b.tz - b.z) * k; } }
      if (state.mode === 'vr') vrMove(dt); else if (state.mode === 'flat') flatMove(dt);
      myTags();
      // got tagged (the host sees it here)
      if (amLava() && !wasLavaLocal && S.ph === 'play' && isHost()) onTagged();
      wasLavaLocal = amLava();
      if (S.ph === 'done' && S.doneSeen !== S.g) { S.doneSeen = S.g; if (isHost()) roundOverForMe(); }
      // bots
      const inRound = new Set(S.ids);
      let fi = 0;
      bots.forEach((b) => {
        const k = S.ids.indexOf(b.id), on = inRound.has(b.id) && S.ph !== 'lobby';
        b.g.visible = on; if (!on) return;
        b.g.position.set(b.x, b.y, b.z); b.g.rotation.y = b.yaw;
        const lava = S.inf[k] === 1;
        b.m.color.setHex(lava ? 0xff5a1a : 0x3a3a40); b.m.emissive.setHex(lava ? 0x6a1a00 : 0x000000);
        b.arms.forEach((a, i) => { a.rotation.x = Math.sin(b.hop + i * Math.PI) * 0.9 - 0.3; });
        if (lava && fi < flames.length) { const f = flames[fi++]; f.visible = true; f.position.set(b.x, b.y + 1.85, b.z); }
      });
      // flames over lava people too
      S.ids.forEach((id, k) => { if (botOf(id) || S.inf[k] !== 1 || id === state.myPeer || fi >= flames.length) return; const p = posOf(id, _b); if (p) { const f = flames[fi++]; f.visible = true; f.position.set(p.x, p.y + 0.45, p.z); } });
      for (; fi < flames.length; fi++) flames[fi].visible = false;
      for (const f of flames) if (f.visible) f.scale.set(0.45 + Math.random() * 0.1, 0.6 + Math.random() * 0.15, 1);
      // my lava hands
      for (const s of SIDES) { const m = myLava[s], h = myHands[s]; m.visible = amLava() && h.ok; if (m.visible) { m.position.copy(h.pos); m.quaternion.copy(h.quat); } }
      // VR: A or X starts a round
      if (state.mode === 'vr') {
        let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !ME.aPrev && S.ph !== 'play') requestStart();
        ME.aPrev = a;
      }
      drawClk();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'play' ? `${amLava() ? '\u{1F525} You’re LAVA: run into people to tag them' : 'Safe: don’t let the lava touch you'}  ·  ${Math.ceil(S.t)} s  ·  Space to leap` : 'Gorilla Tag  ·  start a round from the buttons up top  ·  WASD run, Space leap';
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    function requestStart() { if (isHost()) startRound(); else { ME.startReq += 1; forcePresence(); showToast('Asking to start a round…'); } }
    L.rowFor = (st, isMe) => { const w = isMe ? (S.wins || 0) : st.gw ? st.gw[0] : 0; return { best: w, text: `${w} round${w === 1 ? '' : 's'} survived` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, 0, 1.6, -3.0, Math.PI);
    L.drawBoard = (rows) => {
      const g = L.board.g, Wd = 720;
      g.fillStyle = '#2a1a0a'; g.fillRect(0, 0, Wd, 460); g.strokeStyle = '#ff8a1a'; g.lineWidth = 8; g.strokeRect(4, 4, Wd - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ff8a1a'; g.font = `800 56px ${DISPLAY}`; g.fillText('Top gorillas', 36, 80);
      g.fillStyle = '#f4e8d8'; g.font = `400 24px ${BODY}`; g.fillText('Rounds survived without getting tagged', 36, 118);
      drawRows(g, rows, 176, 46, Wd);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 11.5, 11.5, -Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'tags', label: 'Most tags in a round' }, { k: 'survive', label: 'Longest survival', fmt: 'time' }]);
    L.hudActions = [{ label: () => (S.ph === 'play' ? 'New round' : 'Start a round'), run: () => requestStart() }];
    L.hints = [['Arms', 'push off the ground and trees to move'], ['Push down + back', 'to leap forward'], ['A / X', 'start a round']];
    L.hintsFor = () => (state.mode === 'flat' ? [['WASD', 'run'], ['Space', 'leap'], ['Lava?', 'run into people to tag them']] : L.hints);
    L.spawn = () => { const a = rand() * Math.PI * 2; dolly.position.set(Math.cos(a) * 6, -shift(), Math.sin(a) * 6); M.vel.set(0, 0, 0); if (state.mode !== 'vr') { state.yaw = Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI / 2; state.pitch = 0; } };
    L.onEnter = () => { M.vel.set(0, 0, 0); clkKey = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; dolly.position.y = 0; for (const s of SIDES) { M.hand[s].on = false; myLava[s].visible = false; } if (isHost() && S.ph === 'play') S.ph = 'lobby'; };
    L.attract = (now) => { const a = reduceMotion ? 0 : now * 0.00006; camera.position.set(Math.sin(a) * 12, 5, Math.cos(a) * 12); camera.lookAt(0, 2, 0); };
    L.gtInternals = { S, M, bots, BOXES, startRound, tag, endRound, hostStep, contact, support, pushOut, vrMove, settle, snapshot, applySnap, validSnap, myTags };
    MUSIC_THEMES.gorilla = { gain: 0.6, bpm: 118, swing: 0.15, chords: ['Am', 'G', 'F', 'G'], arp: { inst: 'marimba', every: 1, order: [1, 0, 3, 2, 0, 4, 3, 0] }, bass: { at: [0, 3, 6, 10] }, drums: { k: 'x..x..x...x..x..', c: '....x.......x...', sh: 'o-o-o-o-o-o-o-o-' }, cut: 4000 };
    return L;
  })();
