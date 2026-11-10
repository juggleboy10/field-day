  // ================================================================ LEVEL: TABLETOP BRAWL (a platform fighter on a table)
  // A little floating arena hovers over a games table, and you play one of four tiny fighters on it, side-on, the way
  // the classic party fighters work: every hit adds to your damage %, and the higher it is the further the next hit
  // sends you. Get knocked off the edge of the screen and you lose a life. Three lives each; last one standing wins.
  // Up to four play: friends take the first places and bots fill the rest (Players and Bots buttons set how many and
  // how good). A bomb drops in now and then: pick it up with an attack, attack again to throw it.
  // The four: Ruby Roo (a boxing kangaroo: strong, with a dashing haymaker), Ninja Ribbit (a frog: light, quick, three
  // jumps, a long tongue), Bolt-9 (a robot: heavy and slow, fires a rocket fist) and Whisker the Wise (a wizard cat:
  // floaty, throws bouncing fireballs).
  // VR: you stand at the table. Left stick runs (push it up and press special to fly back up), A or X jumps, the
  // trigger attacks, B or Y is your special. Swing your arm hard for a smash attack, the way you swing it.
  // Browser: A and D run, W, Up or Space jumps, S drops through a platform, J (or a click) attacks, K is special;
  // hold J and let go for a smash.
  // Friends: the first player here runs the match (where everyone is, the hits, the bombs) and everyone sends them
  // their buttons, so the match is the same on every screen.
  const brawl = (() => {
    const L = newLevel(60);
    const G = L.group;
    const rand = mulberry32(6060);
    const rnd = Math.random;
    L.grabless = true;
    L.noLocomotion = true;
    L.bounds = { minX: -3, maxX: 3, minZ: -2.5, maxZ: 3 };
    L.env = {
      sky: skyTexture([[0, '#241a3a'], [0.5, '#3a2a5a'], [1, '#1a1426']]),
      bg: 0x241a34, fog: [0x241a34, 12, 40], hemi: [0xfff0e0, 0x3a2a4a, 0.75],
      sun: [0xffe8d0, 0.6], sunDir: new V3(0.3, 0.8, 0.5), ambient: [0x5a4a6a, 0.4],
    };

    // ---------------------------------------------------------------- the room and the table
    const TABLE_Y = 0.82, S = 0.075;     // the arena: 1 arena unit = 7.5 cm
    {
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), lam(0x3a2a3a)); floor.rotation.x = -Math.PI / 2; G.add(floor);
      const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), lam(0x6a2a4a)); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.005; G.add(rug);
      for (const [x, z, ry] of [[0, -4, 0], [-4, 0, Math.PI / 2], [4, 0, -Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), lam(0x2e2440)); w.position.set(x, 2, z); w.rotation.y = ry; G.add(w); }
      // a strip of arcade lights round the walls
      for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: [0xff4d6a, 0x4fc3f7, 0xffd23f, 0x8bd450][i % 4] })); b.position.set(-3.5 + i * 0.54, 3.2, -3.95); G.add(b); }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.06, 40), lam(0x6a4a30)); top.position.y = TABLE_Y; G.add(top);
      const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.01, 40), lam(0x2a5a3a)); felt.position.y = TABLE_Y + 0.035; G.add(felt);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, TABLE_Y - 0.03, 16), lam(0x4a3220)); leg.position.y = (TABLE_Y - 0.03) / 2; G.add(leg);
      // a soft glow under the arena
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshBasicMaterial({ color: 0x8a6aff, transparent: true, opacity: 0.18, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = TABLE_Y + 0.045; G.add(glow);
    }
    const arena = new THREE.Group(); arena.position.set(0, TABLE_Y + 0.28, 0); arena.scale.setScalar(S); G.add(arena);

    // ---------------------------------------------------------------- the stage (in arena units: a floating island)
    const MAIN = { x0: -7, x1: 7, y: 0, solid: true }, PLATS = [MAIN, { x0: -5.6, x1: -2.2, y: 3.3 }, { x0: 2.2, x1: 5.6, y: 3.3 }, { x0: -1.7, x1: 1.7, y: 6.4 }];
    const BLAST = { x: 17, lo: -10, hi: 17 };
    {
      const grass = lam(0x5aa84a), rock = lam(0x7a6a5a), dark = lam(0x5a4a3e);
      const top = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 3), grass); top.position.set(0, -0.25, 0); arena.add(top);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(7, 3.5, 3.2, 8, 1), rock); body.scale.z = 0.22; body.position.set(0, -2.1, 0); arena.add(body);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.6, 8), dark); tip.scale.z = 0.22; tip.rotation.x = Math.PI; tip.position.set(0, -5, 0); arena.add(tip);
      for (const p of PLATS.slice(1)) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, 0.3, 2.2), lam(0xd8b878)); b.position.set((p.x0 + p.x1) / 2, p.y - 0.15, 0); arena.add(b);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, 0.08, 2.24), lam(0xffe8a8)); edge.position.set((p.x0 + p.x1) / 2, p.y - 0.02, 0); arena.add(edge);
      }
      // a few flowers and a tree on the island
      for (let i = 0; i < 10; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), lam([0xff5c8a, 0xffd23f, 0xffffff][i % 3])); f.position.set(-6.5 + rand() * 13, 0.1, -1 + rand() * 0.6); arena.add(f); }
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6), lam(0x6a4a30)); tr.position.set(-6, 1.2, -1.2); arena.add(tr);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), lam(0x3a8a3a)); crown.position.set(-6, 3, -1.2); arena.add(crown);
    }
    // the respawn cloud
    const cloud = new THREE.Group(); for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.7 - i * 0.08, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x6a6a7a })); c.position.set(-0.8 + i * 0.55, Math.sin(i) * 0.15, 0); cloud.add(c); } cloud.visible = false; arena.add(cloud);

    // ---------------------------------------------------------------- the fighters
    const FIGHTERS = [
      { id: 'roo', name: 'Ruby Roo', w: 108, run: 7.2, air: 6, jump: 14.5, jump2: 12.5, grav: 38, jumps: 2, special: 'dash' },
      { id: 'frog', name: 'Ninja Ribbit', w: 82, run: 8.6, air: 7.2, jump: 14.5, jump2: 13, grav: 40, jumps: 3, special: 'tongue' },
      { id: 'bot', name: 'Bolt-9', w: 128, run: 5.6, air: 5, jump: 12.5, jump2: 11.5, grav: 42, jumps: 2, special: 'rocket' },
      { id: 'cat', name: 'Whisker the Wise', w: 92, run: 6.8, air: 6.6, jump: 12.5, jump2: 11.5, grav: 30, jumps: 2, special: 'fireball' },
    ];
    const SLOT_COLS = [0xe8323a, 0x3a7aff, 0xf5c518, 0x3ac84a], SLOT_CSS = ['#e8323a', '#3a7aff', '#f5c518', '#3ac84a'];
    const lm = (hex, em) => new THREE.MeshLambertMaterial({ color: hex, emissive: em || 0x000000 });
    const mk = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const SPH = (r) => new THREE.SphereGeometry(r, 12, 10);
    // each model faces +z, about 1.7 units tall; `fist` is what shoots out in an attack, `legs` swing to run
    function buildModel(fi) {
      const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
      const M = { root, inner, fist: new THREE.Group(), legs: [], fi };
      const eyes = (y, z, x, r) => { for (const sx of [-1, 1]) { mk(SPH(r || 0.09), lm(0xffffff), sx * (x || 0.12), y, z, inner); mk(SPH((r || 0.09) * 0.55), lm(0x111111), sx * (x || 0.12), y, z + (r || 0.09) * 0.6, inner); } };
      if (fi === 0) {
        // a kangaroo in red gloves
        const fur = lm(0xc8884a), light = lm(0xf0d0a0);
        const b = mk(SPH(0.5), fur, 0, 0.95, 0, inner); b.scale.set(0.9, 1.25, 0.85);
        const belly = mk(SPH(0.38), light, 0, 0.85, 0.14, inner); belly.scale.set(0.85, 1.2, 0.7);
        const head = mk(SPH(0.3), fur, 0, 1.72, 0.08, inner); head.scale.set(0.9, 1, 1.05);
        mk(SPH(0.16), light, 0, 1.64, 0.3, inner).scale.set(0.9, 0.7, 1.2);
        mk(SPH(0.05), lm(0x2a1a10), 0, 1.68, 0.47, inner);
        for (const sx of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.09, 0.4, 8), fur, sx * 0.14, 2.05, -0.02, inner); e.rotation.z = -sx * 0.25; }
        eyes(1.8, 0.22, 0.12, 0.07);
        for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * 0.22, 0.45, 0); inner.add(l); mk(new THREE.BoxGeometry(0.2, 0.4, 0.2), fur, 0, -0.2, 0, l); mk(new THREE.BoxGeometry(0.22, 0.1, 0.55), fur, 0, -0.42, 0.15, l); M.legs.push(l); }
        const tail = mk(new THREE.CylinderGeometry(0.06, 0.16, 0.9, 8), fur, 0, 0.45, -0.45, inner); tail.rotation.x = 1.0;
        mk(SPH(0.17), lm(0xd8202a), -0.34, 1.15, 0.28, inner);
        M.fist.position.set(0.34, 1.15, 0.28); inner.add(M.fist); mk(SPH(0.19), lm(0xd8202a), 0, 0, 0, M.fist);
      } else if (fi === 1) {
        // a frog in a ninja headband
        const skin = lm(0x4ab84a), light = lm(0xd8f0a8);
        const b = mk(SPH(0.55), skin, 0, 0.7, 0, inner); b.scale.set(1, 0.85, 0.9);
        mk(SPH(0.42), light, 0, 0.62, 0.18, inner).scale.set(0.9, 0.75, 0.7);
        const head = mk(SPH(0.42), skin, 0, 1.25, 0.05, inner); head.scale.set(1.1, 0.75, 1);
        for (const sx of [-1, 1]) { mk(SPH(0.16), skin, sx * 0.24, 1.5, 0.12, inner); mk(SPH(0.11), lm(0xffffff), sx * 0.24, 1.53, 0.2, inner); mk(SPH(0.06), lm(0x111111), sx * 0.24, 1.53, 0.29, inner); }
        const band = mk(new THREE.TorusGeometry(0.4, 0.05, 6, 20), lm(0xd8202a), 0, 1.3, 0.04, inner); band.rotation.x = Math.PI / 2; band.scale.set(1.12, 1, 1);
        for (const k of [0, 1]) { const tail2 = mk(new THREE.BoxGeometry(0.06, 0.04, 0.35), lm(0xd8202a), 0.05 * (k ? 1 : -1), 1.28, -0.55, inner); tail2.rotation.y = (k ? 1 : -1) * 0.4; }
        mk(new THREE.BoxGeometry(0.4, 0.03, 0.05), lm(0x2a1a10), 0, 1.1, 0.43, inner);
        for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * 0.3, 0.35, 0); inner.add(l); mk(new THREE.BoxGeometry(0.18, 0.35, 0.2), skin, 0, -0.17, 0, l); mk(new THREE.BoxGeometry(0.3, 0.06, 0.4), skin, 0, -0.33, 0.12, l); M.legs.push(l); }
        mk(SPH(0.12), skin, -0.42, 0.8, 0.2, inner);
        M.fist.position.set(0.42, 0.8, 0.2); inner.add(M.fist); mk(SPH(0.13), skin, 0, 0, 0, M.fist);
      } else if (fi === 2) {
        // a robot with an arm cannon
        const metal = lm(0x9aa4b0), dk = lm(0x4a5260);
        mk(new THREE.BoxGeometry(0.85, 0.85, 0.6), metal, 0, 0.95, 0, inner);
        mk(new THREE.BoxGeometry(0.5, 0.3, 0.05), lm(0xffd23f, 0x6a5000), 0, 1.0, 0.31, inner);
        mk(new THREE.BoxGeometry(0.62, 0.5, 0.52), metal, 0, 1.68, 0, inner);
        mk(new THREE.BoxGeometry(0.5, 0.16, 0.05), lm(0x4ff3ff, 0x2a9aaa), 0, 1.72, 0.27, inner);
        mk(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), dk, 0, 2.05, 0, inner); mk(SPH(0.06), lm(0xff4d4d, 0xaa2020), 0, 2.22, 0, inner);
        for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * 0.24, 0.5, 0); inner.add(l); mk(new THREE.BoxGeometry(0.22, 0.5, 0.25), dk, 0, -0.25, 0, l); mk(new THREE.BoxGeometry(0.28, 0.1, 0.4), dk, 0, -0.5, 0.06, l); M.legs.push(l); }
        mk(new THREE.BoxGeometry(0.18, 0.5, 0.18), dk, -0.52, 0.95, 0, inner);
        M.fist.position.set(0.52, 1.0, 0.2); inner.add(M.fist); const can = mk(new THREE.CylinderGeometry(0.14, 0.17, 0.55, 10), dk, 0, 0, 0, M.fist); can.rotation.x = Math.PI / 2;
      } else {
        // a wizard cat
        const robe = lm(0x7a4ad0), fur = lm(0xf0a860);
        mk(new THREE.ConeGeometry(0.55, 1.25, 12), robe, 0, 0.62, 0, inner);
        mk(SPH(0.32), fur, 0, 1.42, 0.02, inner);
        for (const sx of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.1, 0.22, 6), fur, sx * 0.2, 1.68, 0, inner); e.rotation.z = -sx * 0.3; }
        eyes(1.47, 0.25, 0.12, 0.07);
        mk(SPH(0.04), lm(0xff8aa0), 0, 1.38, 0.32, inner);
        const hat = mk(new THREE.ConeGeometry(0.34, 0.85, 12), robe, 0, 1.98, -0.04, inner); hat.rotation.x = -0.15;
        const brim = mk(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 16), robe, 0, 1.62, 0, inner);
        mk(SPH(0.07), lm(0xffd23f, 0x8a6a00), 0, 2.0, 0.17, inner);
        const tail = mk(new THREE.CylinderGeometry(0.05, 0.07, 0.8, 6), fur, 0, 0.4, -0.5, inner); tail.rotation.x = -0.8;
        for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * 0.18, 0.12, 0.1); inner.add(l); mk(SPH(0.11), fur, 0, -0.05, 0.05, l); M.legs.push(l); }
        M.fist.position.set(0.4, 1.0, 0.25); inner.add(M.fist);
        const wand = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), lm(0x5a3a20), 0, 0, 0.2, M.fist); wand.rotation.x = Math.PI / 2;
        mk(SPH(0.09), lm(0xffd23f, 0xaa8a00), 0, 0, 0.52, M.fist);
      }
      M.fistHome = M.fist.position.clone();
      // a coloured ring under their feet (which player they are)
      M.ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
      M.ring.rotation.x = -Math.PI / 2; M.ring.position.y = 0.04; root.add(M.ring);
      // a little arrow over their head (and their number)
      M.tag = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); M.tag.rotation.x = Math.PI; M.tag.position.y = 2.55; root.add(M.tag);
      return M;
    }

    // ---------------------------------------------------------------- the moves
    // box: [ahead, up, width, height] (in front of the fighter); ang: launch angle, degrees above horizontal
    const MOVES = {
      jab: { dur: 0.26, on: [0.05, 0.13], box: [0.95, 0.95, 1.2, 0.9], dmg: 3, base: 4, grow: 0.054, ang: 30 },
      up: { dur: 0.32, on: [0.06, 0.17], box: [0.2, 2.0, 1.4, 1.1], dmg: 5, base: 6, grow: 0.084, ang: 86 },
      nair: { dur: 0.34, on: [0.05, 0.2], box: [0.45, 0.85, 1.8, 1.5], dmg: 6, base: 5, grow: 0.096, ang: 45 },
      dair: { dur: 0.4, on: [0.1, 0.22], box: [0.2, -0.25, 1.2, 0.9], dmg: 8, base: 5, grow: 0.102, ang: -65 },
      smash: { dur: 0.56, on: [0.15, 0.26], box: [1.15, 0.95, 1.8, 1.2], dmg: 13, base: 8, grow: 0.24, ang: 38, smash: true },
      usmash: { dur: 0.56, on: [0.15, 0.28], box: [0.1, 2.1, 1.6, 1.5], dmg: 13, base: 8, grow: 0.24, ang: 84, smash: true },
      upb: { dur: 0.5, on: [0.0, 0.25], box: [0.1, 1.1, 1.4, 1.6], dmg: 4, base: 5, grow: 0.048, ang: 80 },
      dash: { dur: 0.42, on: [0.04, 0.32], box: [0.95, 0.95, 1.4, 1.1], dmg: 10, base: 7, grow: 0.156, ang: 28 },
      tongue: { dur: 0.48, on: [0.12, 0.26], box: [2.5, 1.1, 3.4, 0.6], dmg: 7, base: 6, grow: 0.108, ang: 18 },
      rocket: { dur: 0.42, fire: 0.14 },
      fireball: { dur: 0.36, fire: 0.12 },
    };
    const MOVE_IDS = Object.keys(MOVES);

    // ---------------------------------------------------------------- the match state (run by the host)
    // a fighter: everything about one place in the match
    const newF = (slot) => ({ slot, on: false, fi: 0, peer: '', bot: false, x: 0, y: 0, vx: 0, vy: 0, face: 1, ground: false, jumpsLeft: 1, usedUp: false,
      pct: 0, stocks: 3, kos: 0, mv: '', mt: 0, hit: [], charge: 0, stun: 0, inv: 0, dead: 0, drop: 0, fast: false, held: null, cloud: 0, lastHitBy: -1, think: 0, plan: null });
    const F = [0, 1, 2, 3].map(newF);
    const H = { ph: 'lobby', t: 0, winner: -1, proj: [], bombs: [], nextBomb: 0, startSeen: {}, inputs: {}, spectate: false };
    const ROUND_STOCKS = 3;

    // spawn spots along the island
    const SPOTS = [-4.6, 4.6, -1.6, 1.6];
    function place(f, k) { Object.assign(f, { x: SPOTS[k], y: 0.01, vx: 0, vy: 0, face: SPOTS[k] < 0 ? 1 : -1, ground: true, jumpsLeft: FIGHTERS[f.fi].jumps - 1, usedUp: false, mv: '', mt: 0, stun: 0, dead: 0, drop: 0, inv: 0, held: null, cloud: 0 }); }

    // ---------------------------------------------------------------- physics
    const HURT_H = 1.7, HURT_W = 0.5;
    function step(f, inp, dt) {
      const D = FIGHTERS[f.fi];
      if (f.dead > 0) {
        f.dead -= dt;
        if (f.dead <= 0) {
          if (H.ph === 'fight' && f.stocks <= 0) { f.dead = 1e9; return; }
          // back in on the cloud, invincible for a moment
          Object.assign(f, { x: 0, y: 8.5, vx: 0, vy: 0, pct: 0, stun: 0, inv: 2.2, mv: '', ground: false, jumpsLeft: D.jumps - 1, usedUp: false, held: null, dead: 0, cloud: 1.2 });
        }
        return;
      }
      f.inv = Math.max(0, f.inv - dt); f.drop = Math.max(0, f.drop - dt);
      if (f.cloud > 0) { f.cloud -= dt; f.vx = 0; f.vy = 0; if (inp.mx || inp.jump || inp.atk) f.cloud = 0; else return; }
      const px = f.x, py = f.y;
      if (f.stun > 0) {
        f.stun -= dt;
        f.vx *= Math.exp(-dt * 0.8);
      } else {
        // moving
        const mx = inp.mx, busy = f.mv && f.ground && f.mv !== 'dash';
        const target = busy ? 0 : mx * (f.ground ? D.run : D.air);
        f.vx += (target - f.vx) * Math.min(1, dt * (f.ground ? (mx ? 16 : 12) : 5));
        if (!f.mv && Math.abs(mx) > 0.3) f.face = Math.sign(mx);
        // jumping
        if (inp.jump) {
          if (f.ground) { f.vy = D.jump; f.ground = false; f.fast = false; sfxAt(f, 'whoosh', 0.3); }
          else if (f.jumpsLeft > 0) { f.vy = D.jump2; f.jumpsLeft -= 1; f.fast = false; puff(f.x, f.y); sfxAt(f, 'whoosh', 0.3); }
        }
        // down: drop through a platform, or fall faster
        if (inp.my > 0.6) { if (f.ground && f.y > 0.5) { f.drop = 0.25; f.ground = false; f.y -= 0.05; } else if (!f.ground && f.vy < 3) f.fast = true; }
        // attacks
        if (!f.mv) {
          if (inp.smash) startSmash(f, inp.smash);
          else if (inp.atk) attack(f, inp);
          else if (inp.sp) special(f, inp);
        }
      }
      // the move playing out
      if (f.mv) {
        const m = MOVES[f.mv];
        f.mt += dt;
        if (f.mv === 'dash' && f.mt < 0.34) f.vx = f.face * 13;
        if (m.fire && f.mt >= m.fire && !f.fired) { f.fired = true; shoot(f); }
        if (m.on && f.mt >= m.on[0] && f.mt <= m.on[1]) hitCheck(f, m);
        if (f.mt >= m.dur) { f.mv = ''; f.mt = 0; }
      }
      // falling
      f.vy -= D.grav * dt;
      f.vy = Math.max(f.vy, f.fast ? -26 : -17);
      f.x += f.vx * dt; f.y += f.vy * dt;
      // landing on the island or a platform (platforms: only from above, and not while dropping through)
      f.ground = false;
      for (const p of PLATS) {
        if (f.vy > 0 || f.x < p.x0 - 0.25 || f.x > p.x1 + 0.25) continue;
        if (!p.solid && f.drop > 0) continue;
        if (py >= p.y - 0.02 && f.y <= p.y) { f.y = p.y; f.vy = 0; f.ground = true; f.fast = false; f.jumpsLeft = D.jumps - 1; f.usedUp = false; if (f.stun > 0 && f.stun < 0.25) f.stun = 0; }
      }
      // the island's sides and underside are solid
      if (f.y < MAIN.y - 0.02 && f.y > -3.2 && Math.abs(f.x) < MAIN.x1 + 0.35) {
        if (py < MAIN.y - 0.02 && Math.abs(px) >= MAIN.x1 + 0.3) { f.x = Math.sign(px) * (MAIN.x1 + 0.35); f.vx = 0; }
        else if (py <= -3.2 + 0.01 || f.vy > 0) { f.y = Math.min(f.y, -3.3); f.vy = Math.min(f.vy, 0); }
      }
      // off the screen: a life gone
      if (f.x < -BLAST.x || f.x > BLAST.x || f.y < BLAST.lo || f.y > BLAST.hi) ko(f);
    }
    function attack(f, inp) {
      // holding a bomb: throw it; standing on one: pick it up
      if (f.held) { throwBomb(f, inp); return; }
      const b = H.bombs.find((x) => x.holder < 0 && x.thrown < 0 && Math.abs(x.x - f.x) < 1 && Math.abs(x.y - f.y) < 1.2);
      if (b && f.ground) { b.holder = f.slot; f.held = b; sfxAt(f, 'grab', 0.5); return; }
      const mv = f.ground ? (inp.my < -0.5 ? 'up' : 'jab') : (inp.my > 0.5 ? 'dair' : 'nair');
      begin(f, mv);
    }
    function startSmash(f, s) {
      if (f.held) { throwBomb(f, { mx: s.dx, my: -s.dy }); return; }
      if (Math.abs(s.dx) > 0.25) f.face = Math.sign(s.dx);
      begin(f, s.dy > 0.6 ? 'usmash' : 'smash');
      f.charge = clamp(s.c, 0, 1);
    }
    function special(f, inp) {
      if (inp.my < -0.5 && !f.usedUp) {
        // the recovery: straight up, a little sideways
        f.usedUp = true; f.vy = 17; f.vx = inp.mx * 5; f.stun = 0; f.fast = false;
        begin(f, 'upb'); puff(f.x, f.y); sfxAt(f, 'whoosh', 0.5); return;
      }
      if (inp.my < -0.5) return;
      begin(f, FIGHTERS[f.fi].special);
    }
    function begin(f, mv) { f.mv = mv; f.mt = 0; f.hit = []; f.charge = 0; f.fired = false; if (mv !== 'upb') sfxAt(f, 'whoosh', 0.18); }
    const box = (f, m) => ({ x: f.x + f.face * m.box[0], y: f.y + m.box[1], w: m.box[2] / 2, h: m.box[3] / 2 });
    function hitCheck(f, m) {
      const b = box(f, m);
      for (const o of F) {
        if (!o.on || o === f || o.dead > 0 || o.inv > 0 || o.cloud > 0 || f.hit.includes(o.slot)) continue;
        if (Math.abs(o.x - b.x) < HURT_W + b.w && Math.abs(o.y + HURT_H / 2 - b.y) < HURT_H / 2 + b.h) { f.hit.push(o.slot); hurt(o, f, m, f.face, f.charge); }
      }
      // hitting a bomb sets it off
      for (const bm of H.bombs) if (bm.holder < 0 && Math.abs(bm.x - b.x) < b.w + 0.4 && Math.abs(bm.y + 0.4 - b.y) < b.h + 0.4) boom(bm, f.slot);
    }
    function hurt(o, from, m, dir, charge) {
      const D = FIGHTERS[o.fi], c = m.smash ? 1 + (charge || 0) * 0.6 : 1;
      o.pct = Math.min(999, o.pct + m.dmg * c);
      const kb = (m.base + o.pct * m.grow * c) * (100 / D.w) * (m.smash ? 1 + (charge || 0) * 0.3 : 1);
      const a = m.ang * Math.PI / 180;
      o.vx = Math.cos(a) * kb * dir; o.vy = Math.sin(a) * kb;
      o.stun = Math.min(1.4, kb * 0.035); o.ground = false; o.mv = ''; o.fast = false;
      o.lastHitBy = from ? from.slot : -1;
      if (o.held) { o.held.holder = -1; o.held = null; }
      spark(o.x, o.y + 0.9, kb > 18 ? 1.6 : 1);
      sfxAt(o, kb > 18 ? 'slam' : 'hit', kb > 18 ? 0.7 : 0.5);
    }
    function ko(f) {
      if (f.dead > 0) return;
      burst(f.x, f.y, f.slot);
      sfxAt(f, 'slam', 1); sfx('cheer', 0.3);
      if (f.lastHitBy >= 0 && f.lastHitBy !== f.slot && F[f.lastHitBy]) F[f.lastHitBy].kos += 1;
      if (H.ph === 'fight') f.stocks -= 1;
      f.dead = 1.5; f.mv = ''; f.stun = 0; f.lastHitBy = -1;
      if (f.held) { f.held.dead = true; f.held = null; }
    }
    // ---------------------------------------------------------------- shots and bombs
    function shoot(f) {
      if (f.mv === 'rocket') H.proj.push({ k: 0, x: f.x + f.face * 0.9, y: f.y + 1.0, vx: f.face * 12, vy: 0, owner: f.slot, t: 0, life: 1.1, m: { dmg: 9, base: 7, grow: 0.1, ang: 25 } });
      else H.proj.push({ k: 1, x: f.x + f.face * 0.8, y: f.y + 1.1, vx: f.face * 8, vy: 5, owner: f.slot, t: 0, life: 1.7, b: 0, m: { dmg: 6, base: 5, grow: 0.08, ang: 35 } });
      sfxAt(f, f.mv === 'rocket' ? 'shoot' : 'zap', 0.4);
    }
    function projStep(dt) {
      for (const p of H.proj) {
        p.t += dt;
        if (p.k === 1) { p.vy -= 20 * dt; if (p.vy < 0 && p.y < 0.25 && Math.abs(p.x) < MAIN.x1) { p.y = 0.25; p.vy = 7; p.b += 1; } }
        p.x += p.vx * dt; p.y += p.vy * dt;
        for (const o of F) {
          if (!o.on || o.slot === p.owner || o.dead > 0 || o.inv > 0 || o.cloud > 0) continue;
          if (Math.abs(o.x - p.x) < HURT_W + 0.3 && Math.abs(o.y + HURT_H / 2 - p.y) < HURT_H / 2 + 0.3) { hurt(o, F[p.owner], p.m, Math.sign(p.vx) || 1, 0); p.t = 99; break; }
        }
        for (const bm of H.bombs) if (bm.holder < 0 && Math.abs(bm.x - p.x) < 0.6 && Math.abs(bm.y + 0.4 - p.y) < 0.6) { boom(bm, p.owner); p.t = 99; }
      }
      H.proj = H.proj.filter((p) => p.t < p.life && Math.abs(p.x) < BLAST.x && p.y > BLAST.lo);
    }
    function dropBomb() { H.bombs.push({ x: -5 + rnd() * 10, y: 14, vx: 0, vy: 0, holder: -1, thrown: -1, t: 0, dead: false }); }
    function throwBomb(f, inp) {
      const bm = f.held; f.held = null;
      if (!bm) return;
      bm.holder = -1; bm.thrown = f.slot; bm.x = f.x + f.face * 0.7; bm.y = f.y + 1.2;
      bm.vx = f.face * 11 + (inp.mx || 0) * 3; bm.vy = 5 - (inp.my || 0) * 6;
      sfxAt(f, 'whoosh', 0.4);
    }
    const BOOM = { dmg: 16, base: 10, grow: 0.17, ang: 60 };
    function boom(bm, by) {
      if (bm.dead) return;
      bm.dead = true;
      for (const o of F) {
        if (!o.on || o.dead > 0 || o.inv > 0 || o.cloud > 0) continue;
        const dx = o.x - bm.x, dy = o.y + 0.8 - bm.y;
        if (Math.hypot(dx, dy) < 2.4) { if (o.held === bm) o.held = null; hurt(o, by >= 0 ? F[by] : null, BOOM, Math.sign(dx) || 1, 0); }
      }
      for (const o of F) if (o.held === bm) o.held = null;
      burst(bm.x, bm.y, -1);
      sfx('slam', 0.8); sfx('poof', 0.6);
    }
    function bombStep(dt) {
      for (const bm of H.bombs) {
        if (bm.dead) continue;
        bm.t += dt;
        if (bm.holder >= 0) { const h = F[bm.holder]; if (!h || h.dead > 0) { bm.holder = -1; continue; } bm.x = h.x + h.face * 0.55; bm.y = h.y + 1.2; continue; }
        bm.vy -= 30 * dt; bm.x += bm.vx * dt; bm.y += bm.vy * dt;
        let landed = false;
        for (const p of PLATS) if (bm.vy <= 0 && bm.x > p.x0 - 0.2 && bm.x < p.x1 + 0.2 && bm.y <= p.y && bm.y > p.y - 0.6) { bm.y = p.y; landed = true; }
        if (landed) { if (bm.thrown >= 0) { boom(bm, bm.thrown); continue; } bm.vy = 0; bm.vx *= 0.8; }
        if (bm.thrown >= 0) for (const o of F) if (o.on && o.slot !== bm.thrown && o.dead <= 0 && Math.abs(o.x - bm.x) < 0.7 && Math.abs(o.y + 0.8 - bm.y) < 1.1) { boom(bm, bm.thrown); break; }
        if (bm.t > 12 || bm.y < BLAST.lo) boom(bm, -1);
      }
      H.bombs = H.bombs.filter((b) => !b.dead);
    }

    // ---------------------------------------------------------------- bots
    function botThink(f, dt) {
      const inp = { mx: 0, my: 0, jump: false, atk: false, sp: false, smash: null };
      f.think -= dt;
      const p = f.plan || (f.plan = { mx: 0 });
      inp.mx = p.mx;
      if (f.think > 0) return inp;
      f.think = BOTLV.pick(L, [0.34, 0.2, 0.1]) * (0.7 + rnd() * 0.6);
      const D = FIGHTERS[f.fi];
      // off the island: get back
      const off = Math.abs(f.x) > MAIN.x1 + 0.2 || f.y < -0.3;
      if (off) {
        p.mx = -Math.sign(f.x || 1); inp.mx = p.mx;
        if (f.vy < 2 && f.jumpsLeft > 0 && f.y < 2) inp.jump = true;
        else if (f.vy < 0 && f.y < 1 && !f.usedUp) { inp.sp = true; inp.my = -1; }
        return inp;
      }
      // after someone: the nearest one still in
      let t = null, best = 1e9;
      for (const o of F) if (o.on && o !== f && o.dead <= 0 && o.cloud <= 0) { const d = Math.hypot(o.x - f.x, o.y - f.y); if (d < best) { best = d; t = o; } }
      // a bomb nearby, and nothing in hand: go for it
      const bomb = H.bombs.find((b) => b.holder < 0 && b.thrown < 0 && Math.abs(b.x) < MAIN.x1 && Math.abs(b.x - f.x) < 4 && Math.abs(b.y - f.y) < 1.2);
      if (!f.held && bomb && rnd() < 0.5) { p.mx = Math.sign(bomb.x - f.x); inp.mx = p.mx; if (Math.abs(bomb.x - f.x) < 0.8) inp.atk = true; return inp; }
      if (!t) { p.mx = 0; inp.mx = 0; return inp; }
      const dx = t.x - f.x, dy = t.y - f.y, near = Math.abs(dx) < 1.7 && Math.abs(dy) < 1.4;
      if (f.held && Math.abs(dx) < 6 && Math.abs(dy) < 2) { f.face = Math.sign(dx) || f.face; inp.atk = true; inp.mx = Math.sign(dx) * 0.3; return inp; }
      if (near) {
        f.face = Math.sign(dx) || f.face; p.mx = 0;
        const smashAt = BOTLV.pick(L, [120, 80, 60]);
        if (t.pct > smashAt && rnd() < BOTLV.pick(L, [0.3, 0.55, 0.8])) inp.smash = { dx: Math.sign(dx), dy: dy > 1.2 ? 1 : 0, c: rnd() * 0.8 };
        else if (dy > 1.0) { inp.atk = true; inp.my = -1; }
        else if (rnd() < BOTLV.pick(L, [0.45, 0.7, 0.9])) inp.atk = true;
      } else {
        p.mx = Math.sign(dx) * (Math.abs(dx) > 0.8 ? 1 : 0);
        // a ranged special from afar
        if ((D.special === 'rocket' || D.special === 'fireball') && Math.abs(dx) > 3.5 && Math.abs(dy) < 1.5 && rnd() < 0.35) { f.face = Math.sign(dx); inp.sp = true; p.mx = 0; }
        else if (D.special === 'dash' && Math.abs(dx) < 4 && Math.abs(dy) < 1 && rnd() < 0.2) { f.face = Math.sign(dx); inp.sp = true; }
        else if (D.special === 'tongue' && Math.abs(dx) < 3.2 && Math.abs(dy) < 1 && rnd() < 0.3) { f.face = Math.sign(dx); inp.sp = true; }
        if (dy > 2.2 && f.ground) inp.jump = true;
        if (dy < -2 && f.ground && f.y > 1) inp.my = 1;
      }
      // don't walk off the edge
      if (f.ground && Math.abs(f.x) > MAIN.x1 - 0.9 && Math.sign(p.mx) === Math.sign(f.x)) p.mx = 0;
      inp.mx = p.mx;
      return inp;
    }

    // ---------------------------------------------------------------- who's playing
    const here = () => state.level === L.idx && state.mode !== 'menu';
    const humans = () => {
      const out = H.spectate ? [] : [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame && rec.lvState[L.id] && rec.lvState[L.id].in) out.push(rec.peer);
      return out.sort();
    };
    const hostId = () => humans()[0] || state.myPeer;
    const isHost = () => hostId() === state.myPeer;
    const myFighter = () => { const v = Number(prefs.brawlFighter); return Number.isInteger(v) && v >= 0 && v < 4 ? v : 0; };
    const total = () => { const v = Number(prefs.brawlPlayers); return Number.isInteger(v) && v >= 2 && v <= 4 ? v : 4; };
    // the host fills the places: friends first (in a steady order), then bots
    function seat() {
      const hs = humans().slice(0, 4);
      // friends keep the place they have; someone who's left frees theirs
      for (const f of F) {
        if (f.peer && !hs.includes(f.peer)) { f.peer = ''; f.on = false; }
        else if (f.peer && !f.on) { f.on = true; f.bot = false; place(f, f.slot); f.pct = 0; f.stocks = ROUND_STOCKS; f.kos = 0; }
      }
      for (const p of hs) if (!F.some((f) => f.peer === p)) {
        const k = F.findIndex((f) => !f.peer && !f.on); const free = k >= 0 ? F[k] : F.find((f) => f.bot);
        if (free) { Object.assign(free, { peer: p, on: true, bot: false }); free.fi = p === state.myPeer ? myFighter() : remoteFighter(p); place(free, free.slot); free.pct = 0; free.stocks = ROUND_STOCKS; free.kos = 0; }
      }
      // the rest are bots, up to how many fighters there should be
      const n = Math.max(hs.length, total());
      let count = F.filter((f) => f.peer).length;
      for (const f of F) {
        if (f.peer) { if (H.ph === 'lobby') f.fi = f.peer === state.myPeer ? myFighter() : remoteFighter(f.peer); continue; }
        const want = count < n; if (want) count += 1;
        if (want && !f.on) {
          // a bot plays someone nobody else is playing, if it can
          const used = F.filter((o) => o.on && o !== f).map((o) => o.fi), free = [0, 1, 2, 3].filter((i) => !used.includes(i));
          Object.assign(f, { on: true, bot: true }); f.fi = free.length ? free[Math.floor(rnd() * free.length)] : Math.floor(rnd() * 4);
          place(f, f.slot); f.pct = 0; f.stocks = ROUND_STOCKS; f.kos = 0;
        }
        else if (!want && f.on) { f.on = false; f.bot = false; }
      }
    }
    function remoteFighter(peer) { const rec = remotes.get(peer), st = rec && rec.lvState[L.id]; return st && Number.isInteger(st.fi) ? st.fi : 0; }
    function startMatch() {
      if (!isHost()) { me.startSeq += 1; forcePresence(); showToast('Asking the host to start the match'); return; }
      seat();
      F.forEach((f, k) => { if (f.on) { place(f, k); f.pct = 0; f.stocks = ROUND_STOCKS; f.kos = 0; f.dead = 0; f.cloud = 0; } });
      H.proj = []; H.bombs = []; H.nextBomb = 12 + rnd() * 6;
      H.ph = 'count'; H.t = 3; H.winner = -1;
      sfx('whistle', 0.5); state.hudDirty = true; forcePresence();
    }
    function toLobby() { H.ph = 'lobby'; H.t = 0; H.winner = -1; H.proj = []; H.bombs = []; F.forEach((f, k) => { if (f.on) { place(f, k); f.pct = 0; f.stocks = ROUND_STOCKS; } }); state.hudDirty = true; forcePresence(); }
    L.startMatch = startMatch; L.toLobby = toLobby;
    function hostStep(dt) {
      seat();
      if (H.ph === 'count') { H.t -= dt; if (H.t <= 0) { H.ph = 'fight'; H.t = 0; sfx('beep2', 0.6); } }
      else if (H.ph === 'fight') H.t = Math.max(-5, H.t - dt);
      else if (H.ph === 'over') { H.t -= dt; if (H.t <= 0) toLobby(); }
      const frozen = H.ph === 'count' || H.ph === 'over';
      for (const f of F) {
        if (!f.on) continue;
        const inp = f.bot ? (H.ph === 'lobby' ? IDLE : botThink(f, dt)) : f.peer === state.myPeer ? takeMine() : takeTheirs(f.peer);
        step(f, frozen ? IDLE : inp, frozen ? 0 : dt);
      }
      if (!frozen) { projStep(dt); bombStep(dt); }
      if (H.ph === 'fight') {
        H.nextBomb -= dt; if (H.nextBomb <= 0) { H.nextBomb = 14 + rnd() * 8; if (H.bombs.length < 2) dropBomb(); }
        const live = F.filter((f) => f.on && f.stocks > 0);
        if (live.length <= 1) { H.ph = 'over'; H.t = 5; H.winner = live.length ? live[0].slot : -1; matchOver(); }
      }
    }
    const IDLE = { mx: 0, my: 0, jump: false, atk: false, sp: false, smash: null };

    // ---------------------------------------------------------------- my buttons (and friends', for the host)
    // edges (a press) are counted, so the host never misses one between messages
    const me = { jump: 0, atk: 0, sp: 0, smash: 0, sdx: 0, sdy: 0, sc: 0, mx: 0, my: 0, startSeq: 0, used: { jump: 0, atk: 0, sp: 0, smash: 0 } };
    function takeMine() {
      const i = { mx: me.mx, my: me.my, jump: me.jump > me.used.jump, atk: me.atk > me.used.atk, sp: me.sp > me.used.sp, smash: me.smash > me.used.smash ? { dx: me.sdx, dy: me.sdy, c: me.sc } : null };
      me.used = { jump: me.jump, atk: me.atk, sp: me.sp, smash: me.smash };
      return i;
    }
    function takeTheirs(peer) {
      const rec = remotes.get(peer), st = rec && rec.lvState[L.id];
      const a = st && st.inp;
      if (!a) return IDLE;
      // (bi: fighter, stick x, stick y, then the press counts: jump, attack, special, smash, and the smash's way and strength)
      const u = H.inputs[peer] || (H.inputs[peer] = { jump: a[3], atk: a[4], sp: a[5], smash: a[6] });
      const i = { mx: clamp(a[1] / 10, -1, 1), my: clamp(a[2] / 10, -1, 1), jump: a[3] > u.jump, atk: a[4] > u.atk, sp: a[5] > u.sp, smash: a[6] > u.smash ? { dx: a[7] / 10, dy: a[8] / 10, c: a[9] / 10 } : null };
      Object.assign(u, { jump: a[3], atk: a[4], sp: a[5], smash: a[6] });
      return i;
    }
    // reading the controls
    let lastFire = 0;
    const VRP = { left: {}, right: {} };
    const _hv = new V3();
    function readControls(dt, now) {
      if (state.mode === 'flat') {
        const k = state.keys;
        me.mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
        me.my = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
      } else if (state.mode === 'vr') {
        const ls = stick('left') || [0, 0];
        me.mx = Math.abs(ls[0]) > 0.2 ? ls[0] : 0; me.my = Math.abs(ls[1]) > 0.5 ? ls[1] : 0;
        for (const side of SIDES) {
          const gp = vrHands[side].source && vrHands[side].source.gamepad, b = gp && gp.buttons, P = VRP[side];
          if (b) {
            const press = (i, key) => { const d = !!(b[i] && b[i].pressed), e = d && !P[key]; P[key] = d; return e; };
            if (press(4, 'a')) me.jump += 1;
            if (press(5, 'b')) me.sp += 1;
            if (press(0, 't')) me.atk += 1;
          }
          // a hard swing: a smash, the way you swung
          const h = myHands[side];
          if (h.ok) {
            if (P.last) { _hv.subVectors(h.pos, P.last).multiplyScalar(1 / Math.max(1e-3, dt)); P.v = P.v ? P.v.lerp(_hv, 0.5) : _hv.clone(); }
            P.last = (P.last || new V3()).copy(h.pos);
            const sp = P.v ? Math.hypot(P.v.x, P.v.y) : 0;
            if (sp > 2.6 && now > (P.cool || 0)) { P.cool = now + 650; me.smash += 1; me.sdx = Math.abs(P.v.x) > 0.6 ? Math.sign(P.v.x) : 0; me.sdy = P.v.y > Math.abs(P.v.x) ? 1 : 0; me.sc = clamp((sp - 2.6) / 3, 0, 1); haptic(vrHands[side], 0.6, 40); }
          }
        }
      }
    }
    function stick(side) { const gp = vrHands[side].source && vrHands[side].source.gamepad, a = gp && gp.axes; if (!a) return null; return a.length >= 4 ? [a[2], a[3]] : a.length >= 2 ? [a[0], a[1]] : null; }
    const myF = () => F.find((f) => f.on && f.peer === state.myPeer);
    let jDown = 0;
    window.addEventListener('keydown', (e) => {
      if (!here() || state.mode !== 'flat' || e.repeat || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON'))) return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') me.jump += 1;
      else if (e.code === 'KeyK' || e.code === 'KeyL') me.sp += 1;
      else if (e.code === 'KeyJ') jDown = performance.now();
    });
    // J: a tap attacks; held and let go, it's a smash (charged by how long you held it)
    window.addEventListener('keyup', (e) => {
      if (!here() || state.mode !== 'flat' || e.code !== 'KeyJ' || !jDown) return;
      const held = (performance.now() - jDown) / 1000; jDown = 0;
      if (held > 0.25) { const k = state.keys, mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); me.smash += 1; me.sdx = mx || (myF() ? myF().face : 1); me.sdy = k.KeyW || k.ArrowUp ? 1 : 0; me.sc = clamp((held - 0.25) / 0.8, 0, 1); }
      else me.atk += 1;
    });
    // a click attacks (and Space comes here too, but that's the jump)
    L.deskFire = (now) => { if (state.keys.Space) return; if (now - lastFire < 160) return; lastFire = now; me.atk += 1; };

    // ---------------------------------------------------------------- effects (drawn on every screen, from what changes)
    const fx = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.5, 0);
    function spark(x, y, s) { const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true })); m.position.set(x, y, 0.6); arena.add(m); fx.push({ m, t: 0, life: 0.25, s: s || 1, kind: 'spark' }); }
    function puff(x, y) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); m.position.set(x, y + 0.1, 0); arena.add(m); fx.push({ m, t: 0, life: 0.3, s: 1, kind: 'puff' }); }
    function burst(x, y, slot) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(1.2, 9, 16, 1, true), new THREE.MeshBasicMaterial({ color: slot >= 0 ? SLOT_COLS[slot] : 0xffa040, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      const cx = clamp(x, -BLAST.x + 1, BLAST.x - 1), cy = clamp(y, BLAST.lo + 1, BLAST.hi - 1);
      m.position.set(cx, cy, 0);
      // pointing from the edge back toward the middle
      const dir = new V3(-cx, 2 - cy, 0).normalize(); m.quaternion.setFromUnitVectors(new V3(0, -1, 0), dir.negate());
      arena.add(m); fx.push({ m, t: 0, life: slot >= 0 ? 0.9 : 0.45, s: 1, kind: slot >= 0 ? 'ko' : 'boom' });
    }
    function fxStep(dt) {
      for (const e of fx) {
        e.t += dt; const u = e.t / e.life;
        if (e.kind === 'spark') { e.m.scale.setScalar(e.s * (0.6 + u * 1.4)); e.m.material.opacity = 1 - u; e.m.rotation.z += dt * 8; }
        else if (e.kind === 'puff') { e.m.scale.setScalar(1 + u * 1.5); e.m.material.opacity = 0.7 * (1 - u); }
        else { e.m.scale.set(1 + u * 0.6, 1, 1 + u * 0.6); e.m.material.opacity = 0.85 * (1 - u); }
        if (u >= 1) { arena.remove(e.m); e.m.geometry !== sparkGeo && e.m.geometry.dispose(); e.m.material.dispose(); }
      }
      for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t >= fx[i].life) fx.splice(i, 1);
    }
    function sfxAt(f, kind, v) { if (here()) sfx(kind, v); }

    // ---------------------------------------------------------------- drawing the match (the host's numbers, smoothed)
    const view = F.map(() => ({ x: 0, y: 0, models: [], seen: { pct: 0, stocks: ROUND_STOCKS, dead: false } }));
    const projMeshes = [], bombMeshes = [];
    const rocketGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8), fireGeo = new THREE.SphereGeometry(0.32, 10, 8), bombGeo = new THREE.SphereGeometry(0.42, 12, 10);
    const rocketMat = lm(0x6a7280), fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a }), bombMat = lm(0x222230);
    function modelFor(k, fi) { const v = view[k]; if (!v.models[fi]) { v.models[fi] = buildModel(fi); arena.add(v.models[fi].root); } return v.models[fi]; }
    function draw(dt, t) {
      F.forEach((f, k) => {
        const v = view[k];
        for (let i = 0; i < 4; i++) if (v.models[i] && (i !== f.fi || !f.on)) v.models[i].root.visible = false;
        if (!f.on) return;
        const M = modelFor(k, f.fi);
        // (a friend's screen eases toward the host's numbers)
        if (isHost()) { v.x = f.x; v.y = f.y; } else { const a = 1 - Math.exp(-dt * 18); v.x += (f.x - v.x) * a; v.y += (f.y - v.y) * a; if (Math.abs(f.x - v.x) > 4 || Math.abs(f.y - v.y) > 4) { v.x = f.x; v.y = f.y; } }
        M.root.visible = f.dead <= 0 && !(f.inv > 0 && Math.floor(t * 14) % 2 === 0);
        M.root.position.set(v.x, v.y, 0);
        M.root.rotation.y = f.face > 0 ? Math.PI / 2 - 0.45 : -Math.PI / 2 + 0.45;
        M.ring.material.color.setHex(SLOT_COLS[k]); M.tag.material.color.setHex(SLOT_COLS[k]);
        M.ring.visible = f.ground || f.cloud > 0;
        // tumbling when sent flying, squash on landing, legs when running
        M.inner.rotation.set(0, 0, 0); M.inner.position.set(0, 0, 0);
        if (f.stun > 0.15) M.inner.rotation.x = t * 14;
        const run = f.ground && Math.abs(f.vx) > 1 ? Math.sin(t * 16) * 0.7 : 0;
        M.legs.forEach((l, i) => { l.rotation.x = (i ? 1 : -1) * run; });
        if (!f.ground && !f.stun) M.legs.forEach((l, i) => { l.rotation.x = (i ? 0.5 : -0.3); });
        // the attack: the fist (or glove, or cannon, or wand) shoots out
        M.fist.position.copy(M.fistHome);
        if (f.mv) {
          const m = MOVES[f.mv], u = clamp(f.mt / m.dur, 0, 1), punch = Math.sin(u * Math.PI);
          if (f.mv === 'up' || f.mv === 'usmash' || f.mv === 'upb') { M.fist.position.y += punch * 1.0; M.fist.position.z += punch * 0.2; }
          else if (f.mv === 'dair') { M.fist.position.y -= punch * 0.8; }
          else if (f.mv === 'nair') { M.inner.rotation.x = u * Math.PI * 2; }
          else if (f.mv === 'tongue') { M.fist.position.z += punch * 2.6; }
          else M.fist.position.z += punch * (m.smash ? 1.1 : 0.7);
          if (m.smash && u < 0.25) M.inner.rotation.y = -0.4;
        }
        if (f.cloud > 0) { cloud.visible = true; cloud.position.set(v.x, v.y - 0.25, 0); }
        // effects from what changed: a hit (their % went up), a KO (a life went)
        const s = v.seen;
        if (!isHost()) {
          if (f.pct > s.pct + 0.5 && f.dead <= 0) { spark(v.x, v.y + 0.9, f.pct - s.pct > 10 ? 1.6 : 1); if (here()) sfx(f.pct - s.pct > 10 ? 'slam' : 'hit', 0.5); }
          if (f.dead > 0 && !s.dead) { burst(f.x, f.y, k); if (here()) sfx('slam', 1); }
        }
        s.pct = f.pct; s.stocks = f.stocks; s.dead = f.dead > 0;
      });
      if (!F.some((f) => f.on && f.cloud > 0)) cloud.visible = false;
      // shots and bombs
      H.proj.forEach((p, i) => {
        let m = projMeshes[i]; if (!m) { m = new THREE.Mesh(fireGeo, fireMat); arena.add(m); projMeshes[i] = m; }
        m.geometry = p.k === 0 ? rocketGeo : fireGeo; m.material = p.k === 0 ? rocketMat : fireMat;
        m.visible = true; m.position.set(p.x, p.y, 0); m.rotation.set(0, 0, p.k === 0 ? (p.vx > 0 ? -Math.PI / 2 : Math.PI / 2) : t * 9);
      });
      for (let i = H.proj.length; i < projMeshes.length; i++) projMeshes[i].visible = false;
      H.bombs.forEach((b, i) => {
        let m = bombMeshes[i];
        if (!m) { m = new THREE.Group(); m.add(new THREE.Mesh(bombGeo, bombMat)); const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), lm(0xc8a060)); fuse.position.y = 0.5; m.add(fuse); const sp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sp.position.y = 0.68; m.add(sp); arena.add(m); bombMeshes[i] = m; }
        m.visible = true; m.position.set(b.x, b.y + 0.42, 0); m.children[2].visible = Math.floor(t * 10) % 2 === 0;
      });
      for (let i = H.bombs.length; i < bombMeshes.length; i++) bombMeshes[i].visible = false;
    }

    // ---------------------------------------------------------------- the scoreboard (along the table's front edge) and the big words
    const board = canvasTexture(1024, 200);
    const boardM = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.29), new THREE.MeshBasicMaterial({ map: board.tex, transparent: true }));
    boardM.position.set(0, TABLE_Y + 1.3, -0.75); boardM.rotation.x = 0.12; boardM.scale.setScalar(1.25); G.add(boardM);
    const banner = canvasTexture(1024, 256);
    const bannerM = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: banner.tex, transparent: true, depthTest: false }));
    bannerM.renderOrder = 10; bannerM.position.set(0, TABLE_Y + 0.62, 0.25); G.add(bannerM);
    let boardKey = '', bannerKey = '';
    const nameOf = (f) => (f.bot ? 'CPU' : f.peer === state.myPeer ? (state.name || 'You') : ((remotes.get(f.peer) || {}).name || 'Friend'));
    function drawBoard() {
      const key = F.map((f) => `${f.on}|${f.fi}|${Math.round(f.pct)}|${f.stocks}|${f.dead > 0}|${f.peer}`).join(';') + H.ph;
      if (key === boardKey) return;
      boardKey = key;
      const g = board.g; g.clearRect(0, 0, 1024, 200);
      const on = F.filter((f) => f.on), w = 1024 / Math.max(2, on.length);
      on.forEach((f, i) => {
        const x = i * w;
        rr(g, x + 8, 8, w - 16, 184, 22); g.fillStyle = 'rgba(20,16,32,0.9)'; g.fill();
        g.fillStyle = SLOT_CSS[f.slot]; rr(g, x + 8, 8, w - 16, 14, 7); g.fill();
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.fillStyle = '#ffffff'; g.font = `700 24px ${BODY}`; g.fillText(`P${f.slot + 1} ${nameOf(f)}`, x + 24, 50, w - 48);
        g.fillStyle = '#b8b0d0'; g.font = `400 20px ${BODY}`; g.fillText(FIGHTERS[f.fi].name, x + 24, 76, w - 48);
        const p = Math.round(f.pct), hot = Math.min(1, p / 150);
        g.fillStyle = `rgb(255,${Math.round(255 - hot * 200)},${Math.round(255 - hot * 230)})`; g.font = `800 72px ${DISPLAY}`;
        g.fillText(H.ph === 'lobby' ? '—' : `${p}%`, x + 24, 160);
        if (H.ph !== 'lobby') for (let s = 0; s < ROUND_STOCKS; s++) { g.beginPath(); g.arc(x + w - 40 - s * 30, 150, 11, 0, Math.PI * 2); g.fillStyle = s < f.stocks ? SLOT_CSS[f.slot] : 'rgba(255,255,255,0.15)'; g.fill(); }
      });
      board.tex.needsUpdate = true;
    }
    function drawBanner() {
      const txt = H.ph === 'count' ? String(Math.max(1, Math.ceil(H.t))) : H.ph === 'over' ? (H.winner >= 0 ? `${nameOf(F[H.winner])} wins!` : 'Draw!') : H.ph === 'fight' && H.t > -1 ? 'GO!' : '';
      const key = txt + H.ph;
      if (key === bannerKey) return;
      bannerKey = key;
      const g = banner.g; g.clearRect(0, 0, 1024, 256);
      bannerM.visible = !!txt;
      if (txt) { g.font = `900 150px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 16; g.strokeStyle = '#1b1932'; g.strokeText(txt, 512, 132, 980); g.fillStyle = H.ph === 'over' && H.winner >= 0 ? SLOT_CSS[H.winner] : '#ffd23f'; g.fillText(txt, 512, 132, 980); }
      banner.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- the end of a match
    function matchOver() {
      const mine = myF();
      if (mine) {
        if (H.winner === mine.slot) { RECORDS.add(L, 'wins', (Number(prefs.brawlWins) || 0) + 1); prefs.brawlWins = (Number(prefs.brawlWins) || 0) + 1; savePrefs(); }
        RECORDS.add(L, 'kos', mine.kos);
      }
      sfx(mine && H.winner === mine.slot ? 'fanfare' : 'chime', 0.8);
      state.hudDirty = true; forcePresence();
    }
    let seenPh = 'lobby';
    function phaseSounds() {
      if (H.ph === seenPh) return;
      if (!isHost()) { if (H.ph === 'count') sfx('whistle', 0.5); if (H.ph === 'fight') sfx('beep2', 0.6); if (H.ph === 'over') matchOver(); }
      seenPh = H.ph; state.hudDirty = true;
    }

    // ---------------------------------------------------------------- network
    const ST = ['lobby', 'count', 'fight', 'over'];
    const r2 = (x) => Math.round(x * 100);
    L.presence = () => {
      const p = { bi: [myFighter(), Math.round(me.mx * 10), Math.round(me.my * 10), me.jump, me.atk, me.sp, me.smash, Math.round(me.sdx * 10), Math.round(me.sdy * 10), Math.round(me.sc * 10), me.startSeq] };
      if (isHost()) {
        p.bh = [ST.indexOf(H.ph), Math.round(H.t * 10), H.winner];
        p.bs = F.map((f) => (f.on ? (f.bot ? '~' : f.peer) : ''));
        p.bf = F.map((f) => (f.on ? [f.fi, r2(f.x), r2(f.y), Math.round(f.vx * 10), Math.round(f.vy * 10), f.face, Math.round(f.pct), f.stocks, MOVE_IDS.indexOf(f.mv), r2(f.mt), (f.ground ? 1 : 0) | (f.dead > 0 ? 2 : 0) | (f.inv > 0 ? 4 : 0) | (f.stun > 0.15 ? 8 : 0) | (f.cloud > 0 ? 16 : 0), f.kos] : 0));
        p.bp = H.proj.slice(0, 8).map((q) => [q.k, r2(q.x), r2(q.y), Math.round(q.vx)]);
        p.bb = H.bombs.slice(0, 3).map((b) => [r2(b.x), r2(b.y)]);
      }
      return p;
    };
    const num = (x) => typeof x === 'number' && Number.isFinite(x);
    L.rowFor = (st, isMe) => { const f = isMe ? myF() : F.find((x) => x.on && st && x.peer && remotes.get(x.peer) && remotes.get(x.peer).lvState[L.id] === st); return { text: f ? `${FIGHTERS[f.fi].name}${H.ph === 'lobby' ? '' : ` \u00b7 ${Math.round(f.pct)}%`}` : '' }; };
    L.readPresence = (rec, pres, st) => {
      const a = pres.bi;
      if (Array.isArray(a) && a.length === 11 && a.every(num)) {
        st.in = true; st.fi = clamp(a[0] | 0, 0, 3); st.inp = a;
        // they asked for a match to start (only the host acts on it)
        if (st.startSeen === undefined) st.startSeen = a[10];
        else if (a[10] > st.startSeen) { st.startSeen = a[10]; if (isHost() && H.ph === 'lobby') startMatch(); }
      } else st.in = false;
      if (rec.peer !== hostId() || isHost()) return;
      const h = pres.bh, s = pres.bs, bf = pres.bf;
      if (Array.isArray(h) && h.length === 3 && h.every(num)) { H.ph = ST[clamp(h[0] | 0, 0, 3)]; H.t = h[1] / 10; H.winner = h[2] | 0; }
      if (Array.isArray(s) && s.length === 4 && Array.isArray(bf) && bf.length === 4) {
        F.forEach((f, k) => {
          const e = bf[k], who = s[k];
          if (!Array.isArray(e) || e.length !== 12 || !e.every(num) || typeof who !== 'string') { f.on = false; return; }
          Object.assign(f, { on: true, peer: who === '~' ? '' : who, bot: who === '~', fi: clamp(e[0] | 0, 0, 3), x: e[1] / 100, y: e[2] / 100, vx: e[3] / 10, vy: e[4] / 10, face: e[5] < 0 ? -1 : 1, pct: e[6], stocks: e[7], mv: MOVE_IDS[e[8]] || '', mt: e[9] / 100,
            ground: !!(e[10] & 1), dead: e[10] & 2 ? 1 : 0, inv: e[10] & 4 ? 1 : 0, stun: e[10] & 8 ? 1 : 0, cloud: e[10] & 16 ? 1 : 0, kos: e[11] });
        });
      }
      if (Array.isArray(pres.bp)) H.proj = pres.bp.filter((q) => Array.isArray(q) && q.length === 4 && q.every(num)).map((q) => ({ k: q[0], x: q[1] / 100, y: q[2] / 100, vx: q[3], vy: 0 }));
      if (Array.isArray(pres.bb)) H.bombs = pres.bb.filter((q) => Array.isArray(q) && q.length === 2 && q.every(num)).map((q) => ({ x: q[0] / 100, y: q[1] / 100, holder: -1, thrown: -1 }));
    };

    // ---------------------------------------------------------------- choosing a fighter, how many play
    function cycleFighter() { prefs.brawlFighter = (myFighter() + 1) % 4; savePrefs(); showToast(`You’re ${FIGHTERS[myFighter()].name}`); state.hudDirty = true; forcePresence(); if (isHost() && H.ph === 'lobby') { const f = myF(); if (f) f.fi = myFighter(); } }
    function cyclePlayers() { prefs.brawlPlayers = total() >= 4 ? 2 : total() + 1; savePrefs(); showToast(`${total()} fighters (bots fill the places friends don’t)`); state.hudDirty = true; }
    // in the room: a button per fighter, and Start
    FIGHTERS.forEach((d, i) => makeButton(L, new V3(-1.5 + i * 0.36, 1.0, 1.55), [0xc8884a, 0x4ab84a, 0x9aa4b0, 0x7a4ad0][i], ['Ruby Roo', 'Ribbit', 'Bolt-9', 'Whisker'][i], () => { prefs.brawlFighter = i; savePrefs(); showToast(`You’re ${d.name}`); state.hudDirty = true; forcePresence(); }, { faceYaw: 0 }));
    makeButton(L, new V3(1.2, 1.0, 1.55), 0xff4d6a, 'Start match', () => { if (H.ph === 'lobby') startMatch(); }, { faceYaw: 0 });
    makeButton(L, new V3(1.6, 1.0, 1.55), 0xffd23f, 'Fighters: 2-4', () => cyclePlayers(), { faceYaw: 0 });
    makeKiosk(L, -2.4, 2.2, Math.PI * 0.8);
    RECORDS.def(L, [{ k: 'wins', label: 'Matches won' }, { k: 'kos', label: 'Most KOs in a match' }], { x: 2.6, z: 1.6, yaw: -Math.PI / 2 });
    BOTLV.on(L, { note: 'The CPU fighters' });
    L.hudActions = [
      { label: () => (H.ph === 'lobby' ? 'Start match' : 'Match on'), run: () => { if (H.ph === 'lobby') startMatch(); } },
      { label: () => `Fighter: ${FIGHTERS[myFighter()].name} ▸`, run: () => cycleFighter() },
      { label: () => `Fighters: ${total()} ▸`, run: () => cyclePlayers() },
    ];
    L.hints = [['Left stick', 'run (down: drop through)'], ['A / X', 'jump (twice in the air)'], ['Trigger', 'attack'], ['Swing your arm hard', 'a smash, the way you swing'], ['B / Y', 'special (stick up + special: fly back up)']];
    L.hintsFor = () => (state.mode === 'flat' ? [['A / D', 'run'], ['W or Space', 'jump'], ['J or click', 'attack (hold J, let go: smash)'], ['K', 'special (W + K: fly back up)'], ['S', 'drop through']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 1.0); dolly.rotation.y = 0; if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.22; } };
    // in a browser: stand at the table looking at the arena (the keys play, they don't walk)
    L.flatCamera = () => {
      dolly.position.set(0, 0, 1.0);
      camera.position.set(0, 1.42, 0);
      camera.rotation.set(-0.05, 0, 0, 'YXZ');
      return true;
    };
    L.onEnter = () => { H.ph = 'lobby'; seenPh = 'lobby'; boardKey = ''; bannerKey = ''; for (const f of F) { f.on = false; f.peer = ''; f.bot = false; } };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; for (const f of F) f.on = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.4; camera.position.set(Math.sin(a) * 1.4, 1.5, 1.6); camera.lookAt(0, 1.2, 0); };
    ENDGAME.on(L, { active: () => H.ph !== 'lobby', shared: true, end: () => { if (isHost()) toLobby(); else H.ph = 'lobby'; return 'Back to the lobby: press Start match when everyone’s ready.'; } });
    MUSIC_THEMES.brawl = { gain: 0.6, bpm: 150, swing: 0, chords: ['Am', 'F', 'C', 'G'], comp: { inst: 'synth', at: [0, 3, 6, 8, 11, 14], dur: 0.1 }, bass: { at: [0, 2, 4, 6, 8, 10, 12, 14] }, drums: { k: 'x...x...x...x...', h: '..o...o...o...o.', s: '....x.......x...' }, cut: 5200 };

    // ---------------------------------------------------------------- every frame
    L.update = (dt, now) => {
      if (!here()) return;
      const t = now / 1000;
      readControls(dt, now);
      if (isHost()) hostStep(dt);
      else for (const f of F) if (f.on && f.mv) f.mt += dt;
      phaseSounds();
      draw(dt, t);
      fxStep(dt);
      drawBoard(); drawBanner();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const f = myF();
        const txt = H.ph === 'lobby' ? `Tabletop Brawl  ·  you’re ${FIGHTERS[myFighter()].name}  ·  Start match (up top) when ready  ·  practise in the meantime` : H.ph === 'over' ? 'Match over' : f ? `${FIGHTERS[f.fi].name}  ·  ${Math.round(f.pct)}%  ·  ${'●'.repeat(Math.max(0, f.stocks))}` : 'Watching';
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.brawlInternals = { F, H, FIGHTERS, MOVES, step, hostStep, startMatch, toLobby, me, isHost, humans, botThink, hurt, ko, place, takeMine, buildModel, PLATS, BLAST, dropBomb };
    return L;
  })();
