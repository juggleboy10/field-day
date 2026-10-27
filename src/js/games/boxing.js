  // ================================================================ LEVEL: KNOCKOUT KID (boxing)
  // Spar with a cartoon boxer. He keeps his guard up and telegraphs every punch (his glove glows and pulls back):
  // a jab (lean aside), a hook from the left or right (duck it), or an uppercut (lean aside, ducking won't help).
  // Get your gloves up in front of your face to block instead. Make him miss and he's open: head shots then count
  // triple. Body shots always land a little. Punch during his wind-up to counter and stop the punch.
  // VR: your hands are your gloves; really move your head. Browser: J and K punch, L hits the body,
  // A/D lean, S ducks, hold Space to block.
  const boxing = (() => {
    const L = newLevel(33);
    const G = L.group;
    const rand = mulberry32(3333);
    L.grabless = true;
    L.noLocomotion = true;
    L.bounds = { minX: -12, maxX: 12, minZ: -4, maxZ: 4 };
    L.env = {
      sky: skyTexture([[0, '#0c0c14'], [1, '#0c0c14']]),
      bg: 0x0c0c14, fog: [0x0c0c14, 14, 40], hemi: [0xfff0e0, 0x302030, 0.8],
      sun: [0xffffff, 0.6], sunDir: new V3(0, 1, 0.2), ambient: [0x403040, 0.45], sprite: null,
    };
    const N = 4, GAP = 5, RING = 4.2;
    const ringX = (k) => (k - (N - 1) / 2) * GAP;
    const LEVELS = [
      { name: 'Kid', hp: 18, windup: [0.9, 1.2], rest: [1.2, 2.0], open: 1.5, uppercut: 0.15, color: '#4fc3f7' },
      { name: 'Champ', hp: 26, windup: [0.65, 0.9], rest: [0.8, 1.5], open: 1.2, uppercut: 0.25, color: '#ff9a3a' },
      { name: 'Legend', hp: 34, windup: [0.45, 0.7], rest: [0.5, 1.1], open: 1.0, uppercut: 0.35, color: '#e5453a' },
    ];
    // ---------------------------------------------------------------- the gym
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), lam(0x2a2a34)); floor.rotation.x = -Math.PI / 2; G.add(floor);
    const canvasMat = lam(0xe8e0d0), ropeCols = [0xe5453a, 0xf4f4f0, 0x4a7ad8];
    for (let k = 0; k < N; k++) {
      const x = ringX(k), h = RING / 2;
      addBox(G, RING + 0.6, 0.4, RING + 0.6, lam(0x3a3a4a), x, 0.2, 0);
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(RING, RING), canvasMat); mat.rotation.x = -Math.PI / 2; mat.position.set(x, 0.41, 0); G.add(mat);
      for (const [cx, cz] of [[-h, -h], [h, -h], [-h, h], [h, h]]) addCyl(G, 0.08, 0.08, 1.6, 8, lam(0xd8d8e0), x + cx, 1.2, cz);
      ropeCols.forEach((col, i) => {
        const y = 0.85 + i * 0.32;
        for (const [ax, az, bx, bz] of [[-h, -h, h, -h], [h, -h, h, h], [-h, h, h, h], [-h, -h, -h, h]]) {
          const len = Math.hypot(bx - ax, bz - az), m = addBox(G, ax === bx ? 0.04 : len, 0.04, az === bz ? 0.04 : len, lam(col), x + (ax + bx) / 2, y, (az + bz) / 2);
          void m;
        }
      });
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xfff0d0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      lamp.position.set(x, 5.5, 0); lamp.scale.set(5, 5, 1); G.add(lamp);
    }
    // the ring floor is 0.41 up: everything in the ring stands on it
    const FY = 0.41;
    makePlate(G, 'KNOCKOUT KID', 4, 0.6, new V3(0, 4.2, -5.8), 0, { bg: '#e5453a', fg: '#ffffff', size: 0.7 });
    addBox(G, 26, 6, 0.2, lam(0x1a1a24), 0, 3, -6);

    // ---------------------------------------------------------------- the opponent (one per ring)
    function makeBoxer(col) {
      const g = new THREE.Group(), skin = lam(0xd8a070), shorts = lam(new THREE.Color(col).getHex()), gloveM = new THREE.MeshLambertMaterial({ color: 0xe5453a, emissive: 0x000000 });
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.09, 0.08, 0.8, 8), skin), sx * 0.13, 0.4, 0));
      g.add(at(new THREE.Mesh(cyl(0.24, 0.24, 0.28, 12), shorts), 0, 0.85, 0));
      const torso = at(new THREE.Mesh(cyl(0.26, 0.22, 0.55, 12), skin), 0, 1.25, 0); g.add(torso);
      const head = new THREE.Group(); head.position.set(0, 1.7, 0); g.add(head);
      head.add(new THREE.Mesh(sph(0.17, 16, 12), skin));
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 20), shorts); band.rotation.x = Math.PI / 2; band.position.y = 0.06; head.add(band);
      const eyes = [];
      for (const sx of [-1, 1]) { const e = at(new THREE.Mesh(sph(0.03, 8, 6), lam(0xffffff)), sx * 0.06, 0.03, 0.15); const p = at(new THREE.Mesh(sph(0.015, 6, 5), lam(0x111111)), sx * 0.06, 0.03, 0.175); head.add(e, p); eyes.push(p); }
      const mouth = at(new THREE.Mesh(boxg(0.08, 0.015, 0.01), lam(0x5a2a2a)), 0, -0.07, 0.165); head.add(mouth);
      const gloves = [-1, 1].map((sx) => { const gl = new THREE.Mesh(sph(0.11, 12, 10), gloveM.clone()); gl.scale.set(1, 1, 1.2); g.add(gl); return gl; });
      const stars = [];
      for (let i = 0; i < 4; i++) { const s = makePlate(head, '★', 0.12, 0.12, new V3(0, 0.28, 0), 0, { bg: 'rgba(0,0,0,0)', fg: '#ffd23f', size: 0.9 }); s.material.transparent = true; stars.push(s); }
      G.add(g);
      return { g, head, gloves, torso, stars, mouth };
    }
    const opps = [];
    for (let k = 0; k < N; k++) { const b = makeBoxer(LEVELS[1].color); b.g.position.set(ringX(k), FY, -1.05); b.g.visible = false; opps.push(b); }

    // ---------------------------------------------------------------- my gloves
    const gloveMat = new THREE.MeshLambertMaterial({ color: 0x4a7ad8 });
    const myGloves = {};
    for (const s of SIDES) { const m = new THREE.Mesh(sph(0.1, 12, 10), gloveMat); m.scale.set(1, 1, 1.25); m.visible = false; L.overlay.add(m); myGloves[s] = m; }
    L.setColor = (hex) => gloveMat.color.set(hex);
    L.setColor(PLAYER_COLORS[state.colorIdx].hex);

    // ---------------------------------------------------------------- the bout
    // st: idle (between bouts), guard, windup, punch, open (after a miss), dazed (hit hard), down (knocked out), win (you lost)
    const B = { k: 0, lv: 1, st: 'idle', t: 0, next: 0, kind: '', side: 1, hp: 0, myHp: 5, head0: new V3(), t0: 0, punches: 0, landed: 0, dodges: 0, blocks: 0, best: [0, 0, 0], hit: 0, counter: false };
    try { if (Array.isArray(prefs.boxBest) && prefs.boxBest.length === 3) B.best = prefs.boxBest.map((x) => (Number.isFinite(x) ? x : 0)); } catch (e) { /* none */ }
    L.box = B;
    const LV = () => LEVELS[B.lv];
    function mySlot() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); ids.sort(); return Math.max(0, ids.indexOf(state.myPeer)) % N; }
    function standInRing() {
      B.k = mySlot();
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += ringX(B.k) - c.x; dolly.position.z += 0.25 - c.z; dolly.position.y = FY;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.05; }
    }
    function startBout() {
      Object.assign(B, { st: 'guard', t: 0, hp: LV().hp, myHp: 5, punches: 0, landed: 0, dodges: 0, blocks: 0, t0: performance.now() });
      B.next = 1.5;
      showToast(`Round 1 against the ${LV().name}. Watch his gloves!`); sfx('whistle', 1); sfx('cheer', 0.4);
      forcePresence();
    }
    L.startBout = startBout;
    function endBout(won) {
      B.st = won ? 'down' : 'win'; B.t = 0;
      const secs = (performance.now() - B.t0) / 1000;
      if (won) {
        const isBest = !B.best[B.lv] || secs < B.best[B.lv];
        if (isBest) { B.best[B.lv] = Math.round(secs * 10) / 10; prefs.boxBest = B.best.slice(); savePrefs(); }
        RECORDS.add(L, `ko${B.lv}`, secs);
        showToast(`KNOCKOUT! You beat the ${LV().name} in ${secs.toFixed(1)} s${isBest ? ' (your best!)' : ''}. ${B.landed} punches landed, ${B.dodges} dodged`);
        sfx('fanfare', 1); setTimeout(() => sfx('cheer', 1), 300);
      } else { showToast(`Down you go! The ${LV().name} wins this one. Try again`); sfx('buzzer', 0.8); }
      forcePresence(); state.dirtyBoard = true;
    }
    const rr2 = (a) => a[0] + rand() * (a[1] - a[0]);
    // where my head is, relative to my spot in the ring
    const myHeadLocal = (out) => out.set(myHead.pos.x - ringX(B.k), myHead.pos.y - FY, myHead.pos.z);
    const _h = new V3(), _g = new V3();
    function guarding() {
      if (state.mode === 'flat') return !!state.keys.Space;
      // both hands up in front of the face
      let n = 0;
      for (const s of SIDES) { const h = myHands[s]; if (!h.ok) continue; if (Math.abs(h.pos.y - myHead.pos.y) < 0.25 && Math.hypot(h.pos.x - myHead.pos.x, h.pos.z - myHead.pos.z) < 0.35 && h.pos.z < myHead.pos.z) n++; }
      return n >= 2;
    }
    function hurtMe(n, what) {
      B.myHp = Math.max(0, B.myHp - n);
      sfx('hurt', 1); sfx('thump', 0.8);
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 1, 150);
      if (ui.hurt && state.mode === 'flat') { ui.hurt.style.opacity = '0.8'; setTimeout(() => { ui.hurt.style.opacity = '0'; }, 300); }
      showToast(what);
      if (B.myHp <= 0) endBout(false);
      forcePresence();
    }
    function landOnHim(dmg, where, at) {
      B.hp = Math.max(0, B.hp - dmg); B.landed += 1; B.hit = 0.2;
      tone(where === 'body' ? 140 : 220, 90, 0.12, 'square', 0.25); sfx('thump', 0.7);
      spawnFloat(dmg >= 3 ? `POW! ${dmg}` : dmg ? `${dmg}` : 'blocked', at, dmg >= 3 ? '#ffd23f' : dmg ? '#ffffff' : '#9aa0b0');
      if (B.hp <= 0) endBout(true);
      forcePresence();
    }
    // one of my punches arrives: at the head or the body
    function myPunch(where, at) {
      if (B.st === 'idle' || B.st === 'down' || B.st === 'win') return;
      B.punches += 1;
      if (where === 'body') { landOnHim(1, 'body', at); return; }
      if (B.st === 'open' || B.st === 'dazed') { landOnHim(3, 'head', at); if (B.st === 'open' && rand() < 0.4) { B.st = 'dazed'; B.t = 0; } return; }
      if (B.st === 'windup') { landOnHim(2, 'head', at); B.st = 'guard'; B.t = 0; B.next = rr2(LV().rest); showToast('Counter! You stopped his punch'); return; }
      landOnHim(0, 'head', at); sfx('clang', 0.4);
    }
    L.myPunch = myPunch;
    function throwPunch() {
      const r = rand();
      B.kind = r < LV().uppercut ? 'uppercut' : r < 0.6 ? 'hook' : 'jab';
      B.side = rand() < 0.5 ? -1 : 1;
      B.st = 'windup'; B.t = 0; B.wind = rr2(LV().windup);
      myHeadLocal(B.head0);
      tone(B.kind === 'uppercut' ? 300 : 500, B.kind === 'uppercut' ? 600 : 400, 0.15, 'triangle', 0.12);
    }
    function resolvePunch() {
      myHeadLocal(_h);
      const dx = Math.abs(_h.x - B.head0.x), duck = B.head0.y - _h.y;
      let dodged = false;
      if (B.kind === 'jab') dodged = dx > 0.22 || duck > 0.3;
      else if (B.kind === 'hook') dodged = duck > 0.26 || (_h.x - B.head0.x) * B.side > 0.3;   // ducked, or leaned away from it
      else dodged = dx > 0.22;
      if (dodged) { B.dodges += 1; B.st = 'open'; B.t = 0; showToast(B.kind === 'uppercut' ? 'Slipped the uppercut! He’s open!' : 'Dodged! He’s open: hit his head!'); sfx('whoosh', 0.8); return; }
      if (guarding()) { B.blocks += 1; B.st = 'open'; B.t = 0.6; sfx('clang', 0.8); showToast('Blocked!'); return; }
      hurtMe(B.kind === 'uppercut' ? 2 : 1, B.kind === 'uppercut' ? 'Uppercut! Lean aside next time' : B.kind === 'hook' ? 'Hooked! Duck under the next one' : 'Jabbed! Lean aside or block');
      B.st = 'guard'; B.t = 0; B.next = rr2(LV().rest);
    }
    function boutStep(dt) {
      B.t += dt; B.hit = Math.max(0, B.hit - dt);
      if (B.st === 'guard') { B.next -= dt; if (B.next <= 0) throwPunch(); }
      else if (B.st === 'windup') { if (B.t >= B.wind) { B.st = 'punch'; B.t = 0; } }
      else if (B.st === 'punch') { if (B.t >= 0.12) resolvePunch(); }
      else if (B.st === 'open') { if (B.t >= LV().open) { B.st = 'guard'; B.t = 0; B.next = rr2(LV().rest); } }
      else if (B.st === 'dazed') { if (B.t >= 1.6) { B.st = 'guard'; B.t = 0; B.next = rr2(LV().rest); } }
    }
    L.boutStep = boutStep;

    // ---------------------------------------------------------------- VR punches: fast gloves into his head or body
    const prevG = { left: new V3(), right: new V3() }, coolG = { left: 0, right: 0 };
    function vrPunches(dt, now) {
      const o = opps[B.k];
      o.head.getWorldPosition(_g);
      for (const s of SIDES) {
        const h = myHands[s];
        if (!h.ok) continue;
        const v = h.pos.distanceTo(prevG[s]) / Math.max(dt, 1e-3);
        prevG[s].copy(h.pos);
        if (now < coolG[s] || v < 2.2) continue;
        if (h.pos.distanceTo(_g) < 0.27) { coolG[s] = now + 380; myPunch('head', _g.clone()); haptic(vrHands[s], 0.8, 40); continue; }
        const bx = o.g.position.x, bz = o.g.position.z;
        if (Math.hypot(h.pos.x - bx, h.pos.z - bz) < 0.36 && h.pos.y > FY + 0.95 && h.pos.y < FY + 1.55) { coolG[s] = now + 380; myPunch('body', h.pos.clone()); haptic(vrHands[s], 0.6, 30); }
      }
    }
    // browser punches: the gloves shoot out and land
    const flatPunch = { left: 0, right: 0 };
    function deskPunch(side, where) {
      if (B.st === 'idle' || B.st === 'down' || B.st === 'win') { startBout(); return; }
      const now = performance.now();
      if (now < flatPunch[side]) return;
      flatPunch[side] = now + 330;
      setTimeout(() => { const o = opps[B.k]; o.head.getWorldPosition(_g); myPunch(where, where === 'body' ? o.torso.getWorldPosition(new V3()) : _g.clone()); }, 120);
    }
    L.deskPunch = deskPunch;
    L.deskFire = () => deskPunch(flatPunch.alt = flatPunch.alt === 'left' ? 'right' : 'left', 'head');
    L.onKey = (code) => {
      if (code === 'KeyJ') { deskPunch('left', 'head'); return true; }
      if (code === 'KeyK') { deskPunch('right', 'head'); return true; }
      if (code === 'KeyL') { deskPunch(flatPunch.alt = flatPunch.alt === 'left' ? 'right' : 'left', 'body'); return true; }
      return false;
    };

    // ---------------------------------------------------------------- drawing
    function poseBoxer(o, st, kind, side, t, wind, now, hit, lvColor) {
      const glove = (sx) => o.gloves[sx < 0 ? 0 : 1];
      let headX = Math.sin(now * 0.003) * 0.04, headY = 1.7, lean = 0;
      // guard: gloves up by the face
      for (const sx of [-1, 1]) glove(sx).position.set(sx * 0.14, 1.62, 0.2);
      for (const g of o.gloves) g.material.emissive.setHex(0x000000);
      if (st === 'windup') {
        const u = Math.min(1, t / wind), gl = glove(side);
        gl.material.emissive.setHex(Math.floor(now / 90) % 2 ? 0xffd23f : 0x885500);
        if (kind === 'jab') gl.position.set(side * 0.12, 1.65, -0.05 * u);
        else if (kind === 'hook') gl.position.set(side * (0.14 + 0.35 * u), 1.62, 0.05);
        else gl.position.set(side * 0.12, 1.3 - 0.2 * u, 0.1);
        lean = -side * 0.1 * u;
      } else if (st === 'punch') {
        const gl = glove(side), u = Math.min(1, t / 0.12);
        if (kind === 'jab') gl.position.set(side * 0.1, 1.7, 0.2 + 0.85 * u);
        else if (kind === 'hook') gl.position.set(side * (0.49 - 0.5 * u), 1.7, 0.2 + 0.85 * u);
        else gl.position.set(side * 0.1, 1.2 + 0.55 * u, 0.25 + 0.8 * u);
      } else if (st === 'open') { for (const sx of [-1, 1]) glove(sx).position.set(sx * 0.32, 1.3, 0.15); headY = 1.68; }
      else if (st === 'dazed') { for (const sx of [-1, 1]) glove(sx).position.set(sx * 0.3, 1.1, 0.12); headX = Math.sin(now * 0.008) * 0.08; }
      else if (st === 'down') { o.g.rotation.x = Math.max(o.g.rotation.x - 0.05, -1.45); return; }
      o.g.rotation.x = 0;
      o.head.position.set(headX - (hit > 0 ? 0 : 0), headY, -hit * 0.4);
      o.g.rotation.z = lean;
      o.stars.forEach((s, i) => { s.visible = st === 'dazed'; const a = now * 0.006 + i * Math.PI / 2; s.position.set(Math.cos(a) * 0.22, 0.25, Math.sin(a) * 0.22); });
      void lvColor;
    }
    const ST = ['idle', 'guard', 'windup', 'punch', 'open', 'dazed', 'down', 'win'], KINDS = ['jab', 'hook', 'uppercut'];
    const hud = makePlate(camera, 'Ready', 0.6, 0.09, new V3(0, -0.24, -0.6), 0, { bg: '#14141e', fg: '#ffffff', size: 0.55 });
    hud.material.depthTest = false; hud.renderOrder = 999; hud.visible = false;
    let hudKey = '';
    const hpBar = (n, max) => '█'.repeat(Math.ceil(n / max * 10)) + '░'.repeat(10 - Math.ceil(n / max * 10));
    const statusText = () => (B.st === 'idle' ? `Knockout Kid: punch to start (${LV().name})` : B.st === 'down' ? 'KNOCKOUT! You win' : B.st === 'win' ? 'You’re down! Punch to go again' : `You ${'♥'.repeat(B.myHp)}${'♡'.repeat(5 - B.myHp)}   ${LV().name} ${hpBar(B.hp, LV().hp)}${B.st === 'open' || B.st === 'dazed' ? '   HE’S OPEN!' : ''}`);
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (here) {
        if (mySlot() !== B.k) standInRing();
        if (B.st !== 'idle' && B.st !== 'down' && B.st !== 'win') boutStep(dt);
        if (state.mode === 'vr') vrPunches(dt, performance.now());
        // VR: A or X starts a bout
        if (state.mode === 'vr') {
          let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
          if (a && !B.aPrev && (B.st === 'idle' || B.st === 'down' || B.st === 'win')) startBout();
          B.aPrev = a;
        }
      }
      // my opponent, and the others'
      opps.forEach((o, k) => {
        if (k === B.k && here) { o.g.visible = true; poseBoxer(o, B.st, B.kind, B.side, B.t, B.wind || 1, now, B.hit, LV().color); return; }
        let st = null;
        for (const rec of remotes.values()) { const s2 = rec.lvState[L.id]; if (rec.lv === L.idx && rec.inGame && s2 && s2.kb && s2.kb[0] === k) st = s2.kb; }
        o.g.visible = here && !!st;
        if (st) poseBoxer(o, ST[st[1]] || 'guard', KINDS[st[2]] || 'jab', st[3] ? 1 : -1, 0.3, 1, now, 0, '');
      });
      // my gloves
      for (const s of SIDES) {
        const g = myGloves[s];
        g.visible = here && (state.mode === 'vr' ? myHands[s].ok : true);
        if (!g.visible) continue;
        if (state.mode === 'vr') { g.position.copy(myHands[s].pos); g.quaternion.copy(myHands[s].quat); g.scale.set(1, 1, 1.25); }
        else {
          const sx = s === 'left' ? -1 : 1, out = Math.max(0, (flatPunch[s] - performance.now()) / 330);
          const reach = out > 0.6 ? (1 - out) / 0.4 : out / 0.6;
          const up = state.keys.Space ? 1 : 0;
          g.position.set(sx * (0.24 - up * 0.1), -0.3 + up * 0.18, -0.55 - reach * 0.5).applyQuaternion(camera.quaternion).add(camera.getWorldPosition(_h));
          g.scale.set(0.7, 0.7, 0.875);
          g.quaternion.copy(camera.getWorldQuaternion(new Q4()));
        }
      }
      if (here) {
        const txt = statusText();
        if (state.mode === 'vr') { hud.visible = true; if (txt !== hudKey) { hudKey = txt; hud.userData.draw(txt); } }
        else { hud.visible = false; if (ui.status) { ui.status.hidden = false; if (ui.status.textContent !== txt) ui.status.textContent = txt; } }
      } else hud.visible = false;
    };
    // browser: lean and duck by moving the camera
    const lean = { x: 0, y: 0 };
    L.flatCamera = (dt) => {
      const k = state.keys, wx = (k.KeyD ? 0.38 : 0) - (k.KeyA ? 0.38 : 0), wy = k.KeyS ? -0.42 : 0, f = 1 - Math.exp(-dt * 18);
      lean.x += (wx - lean.x) * f; lean.y += (wy - lean.y) * f;
      camera.position.set(lean.x, 1.62 + lean.y, 0);
      camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
      return true;
    };
    L.presence = () => ({ kb: [B.k, ST.indexOf(B.st), Math.max(0, KINDS.indexOf(B.kind)), B.side > 0 ? 1 : 0, B.hp, B.myHp, B.lv, Math.round((B.best[B.lv] || 0) * 10)] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.kb;
      if (!Array.isArray(a) || a.length !== 8 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 100000) || a[0] >= N) { st.kb = null; return; }
      if (!st.kb || st.kb[7] !== a[7]) state.dirtyBoard = true;
      st.kb = a;
    };
    L.rowFor = (st, isMe) => {
      const lv = isMe ? B.lv : st.kb ? st.kb[6] : 1, best = isMe ? B.best[B.lv] : st.kb ? st.kb[7] / 10 : 0;
      return { best: best || 1e9, text: best ? `KO the ${LEVELS[lv].name} in ${best.toFixed(1)} s` : 'no knockout yet' };
    };
    L.sortRows = (a, b) => (a.best || 1e9) - (b.best || 1e9);
    L.board = makeBoard(G, 720, 460, 3, 1.92, -9.5, 2.6, -5.85, 0);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#14141e'; g.fillRect(0, 0, W, 460);
      g.strokeStyle = '#e5453a'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Fastest knockouts', 36, 80);
      g.fillStyle = '#c8c0d8'; g.font = `400 24px ${BODY}`; g.fillText('Dodge or block, then counter while he’s open', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 9.5, 3.2, -Math.PI / 2);
    RECORDS.def(L, LEVELS.map((v, i) => ({ k: `ko${i}`, label: `Fastest knockout: the ${v.name}`, low: true, fmt: 'time' })));
    L.hudActions = [
      { label: () => (B.st === 'idle' || B.st === 'down' || B.st === 'win' ? 'Start bout' : 'Restart'), run: () => startBout() },
      { label: () => `Opponent: ${LV().name} ▸`, run: () => { if (B.st !== 'idle' && B.st !== 'down' && B.st !== 'win') { showToast('Change opponent between bouts'); return; } B.lv = (B.lv + 1) % LEVELS.length; state.hudDirty = true; state.dirtyBoard = true; } },
    ];
    L.hints = [['A / X', 'start a bout'], ['Punch', 'his head when he’s open, his body any time'], ['Glowing glove', 'dodge, duck or block']];
    L.hintsFor = () => (state.mode === 'flat' ? [['J / K', 'punch'], ['L', 'body shot'], ['A / D', 'lean'], ['S', 'duck'], ['Hold Space', 'block']] : L.hints);
    L.spawn = () => { dolly.position.set(0, FY, 0.25); camera.position.set(0, 1.6, 0); standInRing(); };
    L.onEnter = () => { B.st = 'idle'; };
    L.onExit = () => { hud.visible = false; for (const s of SIDES) myGloves[s].visible = false; if (ui.status) ui.status.hidden = true; dolly.position.y = 0; B.st = 'idle'; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.4; camera.position.set(Math.sin(a) * 3, 2.4, 3.2); camera.lookAt(0, 1.4, -1); };
    L.boxInternals = { B, LEVELS, startBout, boutStep, myPunch, resolvePunch, throwPunch, guarding };
    MUSIC_THEMES.boxing = { gain: 0.75, bpm: 96, swing: 0.12, chords: ['Am', 'Am', 'Dm', 'E'], comp: { inst: 'brass', at: [0, 6, 10], dur: 0.2 }, bass: { at: [0, 6, 8, 14] }, drums: { k: 'x.....x.x.......', s: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' }, cut: 4000 };
    ENDGAME.on(L, { active: () => B.st !== 'idle', end: () => { B.st = 'idle'; forcePresence(); state.dirtyBoard = true; return ''; } });
    return L;
  })();
