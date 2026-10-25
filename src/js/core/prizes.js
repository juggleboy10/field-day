  // ================================================================ PRIZE_FX: what the Skee-Ball prizes do
  // Prizes bought with tickets at the prize counter can each be switched on or off there (press an owned prize's
  // button). What they do, everywhere you go:
  //   Rubber duck: lucky duck, 25% more tickets from every carnival game
  //   Teddy bear: a buddy that follows you around (friends see it too)
  //   Toy rocket: fireworks go up over you whenever you set a new record
  //   Wind-up robot: follows you and pipes up with a tip for each game you visit
  //   Golden crown: gold sparkles round you, and a crown on your name tag (friends see both)
  const PRIZE_FX = (() => {
    const IDS = ['duck', 'bear', 'rocket', 'robot', 'crown'];
    const DESC = {
      duck: 'Lucky duck: 25% more tickets from every carnival game',
      bear: 'Your teddy bear follows you everywhere',
      rocket: 'Fireworks go up whenever you set a new record',
      robot: 'Your robot follows you and gives you a tip in each game',
      crown: 'Gold sparkles round you, and a crown on your name tag',
    };
    const save = () => (prefs.skee && typeof prefs.skee === 'object' ? prefs.skee : (prefs.skee = { tickets: 0, owned: [] }));
    const owned = (id) => Array.isArray(save().owned) && save().owned.includes(id);
    const isOn = (id) => owned(id) && Array.isArray(save().on) && save().on.includes(id);
    function setOn(id, on) {
      const s = save(); s.on = Array.isArray(s.on) ? s.on.filter((x) => x !== id) : [];
      if (on) s.on.push(id);
      savePrefs(); forcePresence();
    }
    const toggle = (id) => { const on = !isOn(id); setOn(id, on); return on; };
    const mask = () => IDS.reduce((m, id, i) => (isOn(id) ? m | (1 << i) : m), 0);
    const bit = (m, id) => !!(m & (1 << IDS.indexOf(id)));
    // tickets: the lucky duck adds a quarter, rounded up
    const tickets = (n) => (isOn('duck') && n > 0 ? Math.ceil(n * 1.25) : n);

    // ---------------------------------------------------------------- the pets
    function makeBear() {
      const g = new THREE.Group(), b = lam(0xa8743a), dk = lam(0x1a1a1a);
      const body = new THREE.Group(); g.add(body);
      body.add(at(new THREE.Mesh(sph(0.11, 12, 10), b), 0, 0.12, 0), at(new THREE.Mesh(sph(0.08, 12, 10), b), 0, 0.28, -0.01));
      for (const sx of [-1, 1]) {
        body.add(at(new THREE.Mesh(sph(0.03, 8, 6), b), sx * 0.06, 0.35, -0.01));
        body.add(at(new THREE.Mesh(sph(0.012, 6, 5), dk), sx * 0.03, 0.3, -0.08));
        body.add(at(new THREE.Mesh(sph(0.035, 8, 6), b), sx * 0.09, 0.15, -0.03));   // arms
      }
      body.add(at(new THREE.Mesh(sph(0.03, 8, 6), lam(0xd8b080)), 0, 0.26, -0.075));
      const feet = [-1, 1].map((sx) => { const f = at(new THREE.Mesh(sph(0.04, 8, 6), b), sx * 0.05, 0.03, 0); g.add(f); return f; });
      return { g, body, feet, kind: 'bear' };
    }
    function makeRobot() {
      const g = new THREE.Group(), m = lam(0xb8c0d0);
      const body = new THREE.Group(); g.add(body);
      body.add(at(new THREE.Mesh(boxg(0.14, 0.16, 0.1), m), 0, 0.14, 0), at(new THREE.Mesh(boxg(0.1, 0.09, 0.09), m), 0, 0.28, 0));
      const eyeM = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 });
      for (const sx of [-1, 1]) body.add(at(new THREE.Mesh(sph(0.015, 6, 5), eyeM), sx * 0.025, 0.29, -0.046));
      body.add(at(new THREE.Mesh(cyl(0.005, 0.005, 0.06, 4), m), 0, 0.35, 0), at(new THREE.Mesh(sph(0.015, 6, 5), lam(0xe5453a)), 0, 0.385, 0));
      const key = new THREE.Group(); key.position.set(0, 0.15, 0.06); body.add(key);
      key.add(at(new THREE.Mesh(cyl(0.006, 0.006, 0.05, 4), lam(0xffc83a)), 0, 0, 0.02));
      const kb = at(new THREE.Mesh(boxg(0.07, 0.03, 0.008), lam(0xffc83a)), 0, 0, 0.045); key.add(kb);
      key.children[0].rotation.x = Math.PI / 2;
      const feet = [-1, 1].map((sx) => { const f = at(new THREE.Mesh(boxg(0.05, 0.05, 0.08), lam(0x5a6070)), sx * 0.04, 0.025, 0); g.add(f); return f; });
      return { g, body, feet, key, kind: 'robot' };
    }
    // a speech bubble over the robot
    function makeBubble() {
      const c = canvasTexture(512, 160);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: c.tex, depthWrite: false, transparent: true }));
      s.scale.set(0.8, 0.25, 1); s.visible = false; s.renderOrder = 5; scene.add(s);
      return { s, c, until: 0 };
    }
    function say(bub, text) {
      const g = bub.c.g;
      g.clearRect(0, 0, 512, 160);
      rr(g, 6, 6, 500, 122, 26); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#4fc3f7'; g.stroke();
      g.beginPath(); g.moveTo(240, 126); g.lineTo(256, 154); g.lineTo(276, 126); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
      g.fillStyle = '#1b1932'; g.textAlign = 'center'; g.textBaseline = 'middle';
      // wrap to two lines
      let size = 34; g.font = `700 ${size}px ${BODY}`;
      const words = text.split(' '), lines = ['']; for (const w of words) { const t = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w; if (g.measureText(t).width > 470 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
      if (lines.length > 2) { size = 26; g.font = `700 ${size}px ${BODY}`; }
      const show = lines.slice(0, 3), y0 = 67 - (show.length - 1) * size * 0.55;
      show.forEach((ln, i) => g.fillText(ln, 256, y0 + i * size * 1.1, 480));
      bub.c.tex.needsUpdate = true; bub.until = performance.now() + 6500;
    }
    // a pet that trots after a spot (someone's feet), a little behind and to one side
    const _t = new V3(), _d = new V3();
    function follow(pet, base, yaw, side, dt, now, floorY) {
      const back = 0.55, out = 0.45 * side;
      _t.set(base.x + Math.sin(yaw) * back + Math.cos(yaw) * out, floorY, base.z + Math.cos(yaw) * back - Math.sin(yaw) * out);
      const g = pet.g;
      if (!pet.placed || g.position.distanceTo(_t) > 6) { g.position.copy(_t); pet.placed = true; }
      _d.subVectors(_t, g.position); _d.y = 0;
      const d = _d.length(), sp = Math.min(d * 3.2, 4.5);
      if (d > 0.08) { g.position.addScaledVector(_d, Math.min(1, sp * dt / d)); g.rotation.y = Math.atan2(-_d.x, -_d.z); }
      g.position.y += (floorY - g.position.y) * Math.min(1, dt * 8);
      const walking = d > 0.12; pet.ph = (pet.ph || 0) + dt * (walking ? 12 : 0);
      pet.body.position.y = walking ? Math.abs(Math.sin(pet.ph)) * 0.03 : 0;
      pet.body.rotation.z = walking ? Math.sin(pet.ph) * 0.12 : 0;
      pet.feet.forEach((f, i) => { f.position.z = walking ? Math.sin(pet.ph + i * Math.PI) * 0.04 : 0; });
      if (pet.key) pet.key.rotation.z = now * 0.004;
    }

    // ---------------------------------------------------------------- sparkles (the crown) and fireworks (the rocket)
    const sparkM = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffd23f, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const SPARKS = []; for (let i = 0; i < 60; i++) { const s = new THREE.Sprite(sparkM.clone()); s.visible = false; scene.add(s); SPARKS.push({ s, life: 0, v: new V3() }); }
    let sparkI = 0;
    function spark(p, v, life, color, size) {
      const k = SPARKS[sparkI++ % SPARKS.length]; k.s.position.copy(p); k.v.copy(v); k.life = k.max = life; k.s.material.color.setHex(color); k.size = size; k.s.visible = true;
    }
    const ROCKETS = [];
    const rocketM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    function fireworks() {
      if (!isOn('rocket') || state.mode === 'menu') return;
      const base = myHead.pos;
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(sph(0.04, 6, 5), rocketM); m.visible = false; scene.add(m);
        const a = Math.random() * Math.PI * 2;
        ROCKETS.push({ m, p: new V3(base.x + Math.cos(a) * 1.2, base.y - 0.8, base.z + Math.sin(a) * 1.2), v: new V3((Math.random() - 0.5) * 1.2, 9 + Math.random() * 2, (Math.random() - 0.5) * 1.2), t: -i * 0.35, col: [0xff4d8a, 0x4fc3f7, 0xffd23f, 0x8bff6a][(i + Math.floor(Math.random() * 4)) % 4] });
      }
      sfx('whoosh', 0.5);
    }

    // ---------------------------------------------------------------- per frame
    const mine = { bear: null, robot: null, bubble: null, lastLv: -1, tipT: 0 };
    const theirs = new Map();   // peer -> { bear, robot, crownKey }
    const _f = new V3(), _b = new V3();
    function tipFor(L) {
      const h = (L.hintsFor ? L.hintsFor() : L.hints) || [];
      if (!h.length) return null;
      const e = h[Math.floor(Math.random() * h.length)];
      return Array.isArray(e) ? `${e[0]}: ${e[1]}` : String(e);
    }
    function tick(dt, now) {
      const inGame = state.mode !== 'menu', L = curLevel();
      // my pets: at my feet
      _f.set(0, 0, -1).applyQuaternion(myHead.quat); const yaw = Math.atan2(-_f.x, -_f.z) + Math.PI;
      const floorY = Math.max(0, dolly.position.y);
      for (const [id, side] of [['bear', 1], ['robot', -1]]) {
        const on = inGame && isOn(id);
        if (on && !mine[id]) { mine[id] = id === 'bear' ? makeBear() : makeRobot(); scene.add(mine[id].g); }
        if (!mine[id]) continue;
        mine[id].g.visible = on;
        if (on) follow(mine[id], myHead.pos, yaw, side, dt, now, floorY); else mine[id].placed = false;
      }
      // the robot's tips: one when you arrive in a game, then now and then
      if (inGame && isOn('robot') && mine.robot) {
        if (!mine.bubble) mine.bubble = makeBubble();
        if (mine.lastLv !== state.level) { mine.lastLv = state.level; mine.tipT = now + 2500; }
        if (now > mine.tipT) { const t = tipFor(L); if (t) { say(mine.bubble, t); tone(1200, 1600, 0.05, 'square', 0.05); tone(1600, 0, 0.05, 'square', 0.04, 0.07); } mine.tipT = now + 50000; }
        mine.bubble.s.visible = now < mine.bubble.until;
        if (mine.bubble.s.visible) mine.bubble.s.position.copy(mine.robot.g.position).add(_b.set(0, 0.62, 0));
      } else if (mine.bubble) { mine.bubble.s.visible = false; mine.lastLv = -1; }
      // my crown sparkles (only every so often, round my head, outside my own view)
      if (inGame && isOn('crown') && Math.random() < dt * 10) { const a = Math.random() * Math.PI * 2; spark(_b.set(myHead.pos.x + Math.cos(a) * 0.45, myHead.pos.y - 0.3 - Math.random() * 0.9, myHead.pos.z + Math.sin(a) * 0.45), new V3(0, 0.25, 0), 0.9, 0xffd23f, 0.12); }
      // friends' pets and sparkles
      for (const [peer, o] of theirs) if (!remotes.has(peer)) { for (const k of ['bear', 'robot']) if (o[k]) scene.remove(o[k].g); theirs.delete(peer); }
      for (const rec of remotes.values()) {
        const m = Number.isInteger(rec.pz) ? rec.pz : 0, show = inMyLevel(rec) && rec.hasH;
        let o = theirs.get(rec.peer); if (!o && !m) continue; if (!o) { o = {}; theirs.set(rec.peer, o); }
        // a crown on their name tag
        const ck = `${bit(m, 'crown')}|${rec.name}|${rec.colorIdx}`;
        if (o.crownKey !== ck) { o.crownKey = ck; drawTag(rec.tagC.g, (bit(m, 'crown') ? '\u{1F451} ' : '') + rec.name, PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '#ffffff'); rec.tagC.tex.needsUpdate = true; }
        _f.set(0, 0, -1).applyQuaternion(rec.cur.h.quat); const ry = Math.atan2(-_f.x, -_f.z) + Math.PI;
        for (const [id, side] of [['bear', 1], ['robot', -1]]) {
          const on = show && bit(m, id);
          if (on && !o[id]) { o[id] = id === 'bear' ? makeBear() : makeRobot(); scene.add(o[id].g); }
          if (!o[id]) continue;
          o[id].g.visible = on;
          if (on) follow(o[id], rec.cur.h.pos, ry, side, dt, now, 0); else o[id].placed = false;
        }
        if (show && bit(m, 'crown') && Math.random() < dt * 10) { const a = Math.random() * Math.PI * 2, h = rec.cur.h.pos; spark(_b.set(h.x + Math.cos(a) * 0.4, h.y - Math.random() * 1.1, h.z + Math.sin(a) * 0.4), new V3(0, 0.25, 0), 0.9, 0xffd23f, 0.12); }
      }
      // fireworks
      for (let i = ROCKETS.length - 1; i >= 0; i--) {
        const r = ROCKETS[i]; r.t += dt;
        if (r.t < 0) continue;
        r.m.visible = true; r.v.y -= 9.8 * dt; r.p.addScaledVector(r.v, dt); r.m.position.copy(r.p);
        if (Math.random() < 0.6) spark(r.p, new V3(0, -0.5, 0), 0.4, 0xffc890, 0.1);
        if (r.v.y < 1.5) {
          for (let k = 0; k < 26; k++) { const v = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 1.5); spark(r.p, v, 1.3, r.col, 0.35); }
          tone(160, 60, 0.35, 'sawtooth', 0.12); sfx('poof', 0.5);
          scene.remove(r.m); ROCKETS.splice(i, 1);
        }
      }
      for (const k of SPARKS) {
        if (!k.s.visible) continue;
        k.life -= dt; if (k.life <= 0) { k.s.visible = false; continue; }
        k.v.y -= (k.size > 0.2 ? 2.5 : 0) * dt; k.s.position.addScaledVector(k.v, dt);
        const u = k.life / k.max; k.s.scale.setScalar(k.size * (0.4 + u * 0.6)); k.s.material.opacity = u;
      }
    }
    return { IDS, DESC, isOn, owned, setOn, toggle, mask, tickets, fireworks, tick, mine, theirs, rockets: () => ROCKETS.length };
  })();
