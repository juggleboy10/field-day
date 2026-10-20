  // ================================================================ LEVEL: PILLOW FIGHT CASTLE
  // Red against blue in a bouncy castle, a pillow in each hand. Bonk someone on the other team three times and
  // they're out; the last team with anyone left wins the round. Bots make up the numbers.
  // VR: swing your pillows at them (a real swing, not a tap). Browser: click or press Space to swing at whoever
  // is in front of you; J to bounce. One player's device (the first in the room) runs the fight and keeps
  // count; the others tell it who they bonked.
  const pillow = (() => {
    const L = newLevel(38);
    const G = L.group;
    const rand = mulberry32(3838);
    L.grabless = true;
    L.canHop = true;
    L.walkSpeed = 3.2;
    L.bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    L.env = {
      sky: skyTexture([[0, '#5ab0f0'], [0.6, '#b8e0ff'], [1, '#e8f8e0']]),
      bg: 0xb8e0ff, fog: [0xd0ecff, 40, 120], hemi: [0xffffff, 0x6aa84a, 0.85],
      sun: [0xfff4e0, 0.9], sunDir: new V3(0.3, 1, 0.5), ambient: [0x8a9aaa, 0.4], sprite: null,
    };
    const HALF = 4.4, HP = 3;
    const TEAM_COL = ['#e5453a', '#3a7ae5'], TEAM_HEX = [0xe5453a, 0x3a7ae5], TEAM_N = ['Red', 'Blue'];
    const BOT_NAMES = ['Fluffy', 'Snooze', 'Feathers', 'Dozy', 'Puff', 'Nappy', 'Cushy', 'Dreamy'];

    // ---------------------------------------------------------------- the castle
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), lam(0x6ab84a)); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.01; G.add(grass);
    const floorTex = canvasTexture(256, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffd23f' : '#ff5a8a'; g.fillRect(i * 32, 0, 32, 256); } g.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 8; i++) g.fillRect(0, i * 32 + 14, 256, 4); });
    floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping; floorTex.tex.repeat.set(3, 3);
    addBox(G, HALF * 2 + 1.2, 0.3, HALF * 2 + 1.2, new THREE.MeshLambertMaterial({ color: 0xff5a8a }), 0, 0.0, 0);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 0.4, HALF * 2 + 0.4), new THREE.MeshLambertMaterial({ map: floorTex.tex })); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.155; G.add(fl);
    const tubeM = [lam(0xff5a8a), lam(0xffd23f), lam(0x4fc3f7)];
    // inflatable walls: stacked tubes round the sides (one side open, to walk in)
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 3; k++) {
        const t = new THREE.Mesh(cyl(0.22, 0.22, HALF * 2 + 0.4, 14), tubeM[(i + k) % 3]);
        const a = i * Math.PI / 2, r = HALF + 0.4;
        t.position.set(Math.sin(a) * r, 0.45 + k * 0.42, Math.cos(a) * r);
        t.rotation.set(0, a, Math.PI / 2); t.rotation.order = 'YXZ';
        if (i === 0 && k < 2) continue;   // the doorway at the front
        G.add(t);
      }
    }
    // corner towers with pointy tops, and flags in the team colours
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const tx = x * (HALF + 0.4), tz = z * (HALF + 0.4);
      addCyl(G, 0.5, 0.55, 3.0, 16, tubeM[(x + z + 4) % 3], tx, 1.5, tz);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.0, 16), tubeM[(x * 2 + z + 5) % 3]); cone.position.set(tx, 3.5, tz); G.add(cone);
      addCyl(G, 0.02, 0.02, 0.9, 4, lam(0xffffff), tx, 4.4, tz);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshLambertMaterial({ color: TEAM_HEX[x < 0 ? 0 : 1], side: THREE.DoubleSide })); flag.position.set(tx + 0.25, 4.7, tz); G.add(flag);
    }
    // the netting roof posts and a big arch over the doorway
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.25, 10, 24, Math.PI), tubeM[1]); arch.position.set(0, 1.4, HALF + 0.4); G.add(arch);
    makePlate(G, 'PILLOW FIGHT CASTLE', 3.2, 0.5, new V3(0, 3.35, HALF + 0.65), 0, { bg: '#ff5a8a', fg: '#ffffff', size: 0.6 });
    // benches outside for whoever's out
    const BENCH = (i) => new V3(-3 + (i % 8) * 0.85, 0, HALF + 2.6);
    addBox(G, 7.4, 0.4, 0.5, lam(0xa8753a), -0.0, 0.2, HALF + 2.9);
    // the round scoreboard
    const scoreC = canvasTexture(640, 240);
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.97), new THREE.MeshBasicMaterial({ map: scoreC.tex })); sb.position.set(0, 4.2, -HALF - 0.75); G.add(sb);

    // ---------------------------------------------------------------- pillows and people
    function makePillow(col) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(sph(0.2, 14, 10), new THREE.MeshLambertMaterial({ color: col }));
      m.scale.set(1.25, 0.45, 0.85); m.position.z = -0.22; g.add(m);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 6), m.material); c.position.set(sx * 0.24, 0, -0.22 + sz * 0.16); c.rotation.z = sx * Math.PI / 2; g.add(c); }
      g.userData.mat = m.material;
      return g;
    }
    const myPillows = {}; for (const s of SIDES) { const p = makePillow(0xffffff); p.visible = false; L.overlay.add(p); myPillows[s] = p; }
    // other people's pillows: two each, on their hands
    const remotePillows = new Map();
    const bots = BOT_NAMES.map((name, i) => {
      const g = buildAvatar(TEAM_COL[i % 2], [1, 3, 0, 2, 1, 0, 3, 2][i], i % 4, true, 1, 0);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 30px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 128, 33); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.8, 0.2, 1); tag.position.y = 0.42; g.add(tag);
      const pl = makePillow(0xffffff), pr = makePillow(0xffffff); g.add(pl, pr);
      g.visible = false; G.add(g);
      return { id: `b${i}`, i, name, g, pl, pr, mat: g.children[0].children[0].material, x: 0, z: 0, yaw: 0, tx: 0, tz: 0, swing: 0, cool: 0, side: 1, strafe: 0 };
    });
    L.pillowBots = bots;
    // feathers
    const featherM = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true });
    const feathers = [];
    for (let i = 0; i < 70; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.11), featherM); f.visible = false; G.add(f); feathers.push({ m: f, v: new V3(), t: 0 }); }
    let fi = 0;
    function poof(at) {
      for (let i = 0; i < 12; i++) { const f = feathers[fi++ % feathers.length]; f.m.visible = true; f.m.position.copy(at); f.v.set((rand() - 0.5) * 2.4, rand() * 2 + 0.5, (rand() - 0.5) * 2.4); f.t = 1.6; f.m.rotation.set(rand() * 6, rand() * 6, rand() * 6); }
      sfx('poof', 0.7); sfx('thump', 0.4);
    }

    // ---------------------------------------------------------------- the fight (run by the host)
    // ph: lobby, fight, done. ids: everyone in the round ('b0'.. bots or peer ids). tm: their team. hp: bonks left.
    const S = { g: 0, ph: 'lobby', ids: [], tm: [], hp: [], wins: [0, 0], wt: -1, t: 0, msg: '', msgSeq: 0, inv: [], seen: {} };
    L.pf = S;
    const humansHere = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const isHost = () => humansHere()[0] === state.myPeer;
    const botOf = (id) => (id && id[0] === 'b' && id.length <= 2 ? bots[Number(id.slice(1))] : null);
    const nameOf = (id) => { const b = botOf(id); if (b) return b.name; if (id === state.myPeer) return 'You'; const rec = remotes.get(id); return rec ? rec.name : 'Someone'; };
    const myIdx = () => S.ids.indexOf(state.myPeer);
    const myTeam = () => (myIdx() >= 0 ? S.tm[myIdx()] : -1);
    makeKiosk(L, 6.5, 6.5, -Math.PI * 0.75);
    makePlayerPicker(L, { min: 2, max: 8, def: 6, label: 'Players', note: 'bots make up the numbers' });
    RECORDS.def(L, [{ k: 'bonks', label: 'Most bonks in a round' }]);
    function say(m) { S.msg = m; S.msgSeq += 1; showToast(m); }
    function startRound() {
      const people = humansHere().filter((id) => { if (id === state.myPeer) return !(L.sitOut && L.sitOut.on); const st = remotes.get(id).lvState[L.id]; return !(st && st.sitOut); });
      const nBots = clamp(L.picker.n - people.length, people.length < 2 ? 1 : 0, bots.length);
      const ids = [], tm = [];
      people.forEach((id, k) => { ids.push(id); tm.push(k % 2); });
      // the bots even the teams up
      for (let i = 0; i < nBots; i++) { const n0 = tm.filter((t) => t === 0).length, n1 = tm.length - n0; ids.push(bots[i].id); tm.push(n0 <= n1 ? 0 : 1); }
      S.myBonks = 0;
      Object.assign(S, { g: (S.g + 1) % 100000, ph: 'fight', ids, tm, hp: ids.map(() => HP), inv: ids.map(() => 0), wt: -1, t: 0 });
      ids.forEach((id, k) => { const b = botOf(id); if (b) { b.x = (tm[k] ? 1 : -1) * (2.2 + rand() * 1.5); b.z = (rand() - 0.5) * 6; b.cool = 1 + rand(); b.swing = 0; b.pend = null; b.mat.color.set(TEAM_COL[tm[k]]); } });
      // me: to my end of the castle
      const mi = myIdx();
      if (mi >= 0) { const c = new V3(); camera.getWorldPosition(c); dolly.position.x += (S.tm[mi] ? 2.8 : -2.8) - c.x; dolly.position.z += (rand() - 0.5) * 3 - c.z; if (state.mode !== 'vr') { state.yaw = S.tm[mi] ? Math.PI / 2 : -Math.PI / 2; state.pitch = 0; } }
      sfx('whistle', 1);
      say(mi >= 0 ? `Pillow fight! You're on ${TEAM_N[S.tm[mi]]}. Three bonks and you're out` : 'Pillow fight!');
      forcePresence();
    }
    L.startRound = startRound;
    function posOf(id, out) {
      if (id === state.myPeer) return out.set(myHead.pos.x, myHead.pos.y, myHead.pos.z);
      const b = botOf(id); if (b) return out.set(b.x, 1.62, b.z);
      const rec = remotes.get(id); return rec && rec.hasH ? out.copy(rec.cur.h.pos) : null;
    }
    // attacker a bonks target t (indices)
    function bonk(a, t) {
      if (S.ph !== 'fight' || S.hp[a] <= 0 || S.hp[t] <= 0 || S.tm[a] === S.tm[t] || S.inv[t] > 0) return false;
      S.hp[t] -= 1; S.inv[t] = 0.6;
      if (S.ids[a] === state.myPeer) S.myBonks = (S.myBonks || 0) + 1;
      const at = posOf(S.ids[t], new V3()) || new V3();
      poof(at);
      const b = botOf(S.ids[t]);
      if (b) { const ap = posOf(S.ids[a], new V3()); if (ap) { const dx = b.x - ap.x, dz = b.z - ap.z, d = Math.hypot(dx, dz) || 1; b.x += dx / d * 0.6; b.z += dz / d * 0.6; } }
      if (S.hp[t] <= 0) {
        say(`${nameOf(S.ids[t])} ${S.ids[t] === state.myPeer ? 'are' : 'is'} out! (bonked by ${nameOf(S.ids[a]).replace(/^You$/, 'you')})`);
        const left = [0, 1].map((tt) => S.ids.filter((_, k) => S.tm[k] === tt && S.hp[k] > 0).length);
        if (!left[0] || !left[1]) {
          S.wt = left[0] ? 0 : 1; S.wins[S.wt] += 1; S.ph = 'done'; S.t = 0; if (myIdx() >= 0) RECORDS.add(L, 'bonks', S.myBonks || 0);
          say(`${TEAM_N[S.wt]} wins the round!${myTeam() === S.wt ? ' That’s your team!' : ''}`);
          sfx(myTeam() === S.wt ? 'fanfare' : 'cheer', 0.8);
          if (myTeam() === S.wt) { S.myWins = (S.myWins || 0) + 1; prefs.pillowWins = S.myWins; savePrefs(); state.dirtyBoard = true; }
        }
      }
      forcePresence();
      return true;
    }
    L.bonk = bonk;
    try { if (Number.isInteger(prefs.pillowWins)) S.myWins = prefs.pillowWins; } catch (e) { /* none */ }
    const _a = new V3(), _b = new V3();
    function hostStep(dt) {
      S.inv = S.inv.map((x) => Math.max(0, x - dt));
      if (S.ph === 'done') { S.t += dt; if (S.t > 5) startRound(); return; }
      if (S.ph !== 'fight') return;
      // anyone who left drops out
      const here = humansHere();
      S.ids.forEach((id, k) => { if (!botOf(id) && !here.includes(id) && S.hp[k] > 0) { S.hp[k] = 0; } });
      const left = [0, 1].map((tt) => S.ids.filter((_, k) => S.tm[k] === tt && S.hp[k] > 0).length);
      if (!left[0] || !left[1]) { S.wt = left[0] ? 0 : 1; S.wins[S.wt] += 1; S.ph = 'done'; S.t = 0; if (myIdx() >= 0) RECORDS.add(L, 'bonks', S.myBonks || 0); say(`${TEAM_N[S.wt]} wins the round!`); forcePresence(); return; }
      S.ids.forEach((id, k) => {
        const b = botOf(id); if (!b) return;
        if (S.hp[k] <= 0) { const p = BENCH(b.i); b.x += (p.x - b.x) * Math.min(1, dt * 2); b.z += (p.z - b.z) * Math.min(1, dt * 2); return; }
        // the nearest opponent still in
        let best = -1, bd = 1e9;
        S.ids.forEach((id2, k2) => { if (S.tm[k2] === S.tm[k] || S.hp[k2] <= 0) return; const p = posOf(id2, _a); if (!p) return; const d = Math.hypot(p.x - b.x, p.z - b.z); if (d < bd) { bd = d; best = k2; } });
        if (best < 0) return;
        const tp = posOf(S.ids[best], _a);
        const dx = tp.x - b.x, dz = tp.z - b.z, d = Math.hypot(dx, dz) || 1;
        b.yaw = Math.atan2(-dx, -dz);
        b.strafe -= dt; if (b.strafe <= 0) { b.side = rand() < 0.5 ? -1 : 1; b.strafe = 0.8 + rand() * 1.5; }
        const want = d > 1.05 ? 1 : d < 0.75 ? -0.6 : 0;
        const sp = 2.4 * dt;
        b.x += (dx / d * want + (-dz / d) * b.side * 0.4) * sp; b.z += (dz / d * want + (dx / d) * b.side * 0.4) * sp;
        b.x = clamp(b.x, -HALF + 0.3, HALF - 0.3); b.z = clamp(b.z, -HALF + 0.3, HALF - 0.3);
        // a swing landing
        if (b.pend) { b.pend.t -= dt; if (b.pend.t <= 0) { const p2 = posOf(S.ids[b.pend.target], _b); if (p2 && Math.hypot(p2.x - b.x, p2.z - b.z) < 1.6) bonk(k, b.pend.target); b.pend = null; if (S.ph !== 'fight') return; } }
        // swing when close
        b.cool -= dt; b.swing = Math.max(0, b.swing - dt);
        if (b.cool <= 0 && d < 1.35) {
          b.cool = 1.2 + rand() * 1.0; b.swing = 0.35; sfx('whoosh', 0.2);
          if (rand() < 0.45) b.pend = { t: 0.18, target: best };
        }
      });
      // keep bots apart a little
      for (const b1 of bots) for (const b2 of bots) { if (b1 === b2 || !S.ids.includes(b1.id) || !S.ids.includes(b2.id)) continue; const dx = b2.x - b1.x, dz = b2.z - b1.z, d = Math.hypot(dx, dz); if (d < 0.6 && d > 0.001) { b1.x -= dx / d * (0.6 - d) * 0.5; b1.z -= dz / d * (0.6 - d) * 0.5; } }
    }
    L.hostStep = hostStep;

    // ---------------------------------------------------------------- my swings
    const ME = { seq: 0, claim: [0, -1], prev: { left: new V3(), right: new V3() }, cool: { left: 0, right: 0 }, flatSwing: 0, flatSide: 'right', lastHp: HP, push: new V3() };
    function myBonk(t) {
      if (isHost()) { bonk(myIdx(), t); return; }
      ME.seq += 1; ME.claim = [ME.seq, t]; forcePresence(); S.myBonks = (S.myBonks || 0) + 1;
      const at = posOf(S.ids[t], new V3()); if (at) poof(at);
    }
    const _p = new V3(), _hq = new V3();
    function vrSwings(dt, now) {
      const mi = myIdx(); if (mi < 0 || S.hp[mi] <= 0 || S.ph !== 'fight') return;
      for (const sd of SIDES) {
        const h = myHands[sd]; if (!h.ok) continue;
        _p.set(0, 0, -0.22).applyQuaternion(h.quat).add(h.pos);
        const v = _p.distanceTo(ME.prev[sd]) / Math.max(dt, 1e-3); ME.prev[sd].copy(_p);
        if (now < ME.cool[sd] || v < 2.0) continue;
        for (let k = 0; k < S.ids.length; k++) {
          if (S.tm[k] === S.tm[mi] || S.hp[k] <= 0) continue;
          const tp = posOf(S.ids[k], _hq); if (!tp) continue;
          const dh = _p.distanceTo(tp), body = Math.hypot(_p.x - tp.x, _p.z - tp.z) < 0.45 && _p.y < tp.y && _p.y > tp.y - 1.0;
          if (dh < 0.45 || body) { ME.cool[sd] = now + 450; myBonk(k); haptic(vrHands[sd], 0.8, 60); break; }
        }
      }
    }
    // browser: swing at whoever's in front
    function deskSwing() {
      const now = performance.now();
      if (S.ph !== 'fight') { if (S.ph === 'lobby') requestStart(); return; }
      if (now < ME.flatSwing + 380) return;
      ME.flatSwing = now; ME.flatSide = ME.flatSide === 'right' ? 'left' : 'right';
      sfx('whoosh', 0.35);
      const mi = myIdx(); if (mi < 0 || S.hp[mi] <= 0) return;
      const q = new Q4(); camera.getWorldQuaternion(q); const f = new V3(0, 0, -1).applyQuaternion(q); f.y = 0; f.normalize();
      let best = -1, bd = 1e9;
      for (let k = 0; k < S.ids.length; k++) {
        if (S.tm[k] === S.tm[mi] || S.hp[k] <= 0) continue;
        const tp = posOf(S.ids[k], _hq); if (!tp) continue;
        const dx = tp.x - myHead.pos.x, dz = tp.z - myHead.pos.z, d = Math.hypot(dx, dz);
        if (d > 1.7) continue;
        const cos = (dx * f.x + dz * f.z) / (d || 1);
        if (cos < 0.6) continue;
        if (d < bd) { bd = d; best = k; }
      }
      if (best >= 0) setTimeout(() => myBonk(best), 140);
    }
    L.deskFire = () => deskSwing();
    L.throwLabel = () => (S.ph === 'fight' ? 'Swing' : 'Start');
    // the browser hands swing across in front
    L.deskHand = (side, mh, now) => {
      if (state.level !== L.idx) return false;
      const u = (now - ME.flatSwing) / 300;
      if (side !== ME.flatSide || u < 0 || u > 1) return false;
      const sx = side === 'right' ? 1 : -1, a = u * Math.PI;
      mh.quat.copy(myHead.quat).multiply(new Q4().setFromAxisAngle(new V3(0, 1, 0), sx * (0.9 - u * 1.8)));
      mh.pos.set(sx * (0.35 - u * 0.6), -0.1 + Math.sin(a) * 0.15, -0.35 - Math.sin(a) * 0.25).applyQuaternion(myHead.quat).add(myHead.pos);
      mh.ok = state.mode === 'flat';
      return true;
    };
    function requestStart() { if (isHost()) startRound(); else { ME.startReq = (ME.startReq || 0) + 1; forcePresence(); showToast('Asking to start a round…'); } }

    // ---------------------------------------------------------------- network
    const PH = ['lobby', 'fight', 'done'];
    function snapshot() {
      const r1 = (x) => Math.round(x * 10) / 10;
      return { g: S.g, ph: PH.indexOf(S.ph), ids: S.ids.slice(), tm: S.tm.slice(), hp: S.hp.slice(), b: S.ids.flatMap((id) => { const b = botOf(id); return b ? [r1(b.x), r1(b.z), r1(b.yaw), b.swing > 0 ? 1 : 0] : [0, 0, 0, 0]; }), w: S.wins.slice(), wt: S.wt, m: [S.msgSeq, S.msg] };
    }
    function validSnap(q) {
      const n = q && Array.isArray(q.ids) ? q.ids.length : -1;
      return n >= 0 && n <= 12 && Number.isInteger(q.g) && Number.isInteger(q.ph) && q.ph >= 0 && q.ph < 3 && q.ids.every((x) => typeof x === 'string' && x.length < 64)
        && Array.isArray(q.tm) && q.tm.length === n && q.tm.every((x) => x === 0 || x === 1) && Array.isArray(q.hp) && q.hp.length === n && q.hp.every((x) => Number.isInteger(x) && x >= 0 && x <= HP)
        && Array.isArray(q.b) && q.b.length === n * 4 && q.b.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 100)
        && Array.isArray(q.w) && q.w.length === 2 && q.w.every((x) => Number.isInteger(x) && x >= 0) && Number.isInteger(q.wt) && Array.isArray(q.m) && q.m.length === 2 && Number.isInteger(q.m[0]) && typeof q.m[1] === 'string' && q.m[1].length < 200;
    }
    let seenMsg = -1;
    function applySnap(q) {
      const prevHp = S.hp.slice(), prevIds = S.ids.slice(), prevPh = S.ph, prevG = S.g;
      if (q.g !== prevG) S.myBonks = 0;
      Object.assign(S, { g: q.g, ph: PH[q.ph], ids: q.ids.slice(), tm: q.tm.slice(), hp: q.hp.slice(), wins: q.w.slice(), wt: q.wt });
      S.ids.forEach((id, k) => {
        const b = botOf(id); if (b) { b.tx = q.b[k * 4]; b.tz = q.b[k * 4 + 1]; b.yaw = q.b[k * 4 + 2]; if (q.b[k * 4 + 3] && b.swing <= 0) b.swing = 0.35; b.mat.color.set(TEAM_COL[S.tm[k]]); }
        // bonks I didn't see happen (someone else's): a puff of feathers
        const j = prevIds.indexOf(id);
        if (j >= 0 && prevHp[j] > S.hp[k] && id !== state.myPeer) { const at = posOf(id, new V3()); if (at) poof(at); }
      });
      if (seenMsg >= 0 && q.m[0] !== seenMsg && q.m[1]) showToast(q.m[1]);
      seenMsg = q.m[0];
      if (prevPh === 'fight' && S.ph === 'done') RECORDS.add(L, 'bonks', S.myBonks || 0);
    }
    L.presence = () => {
      const p = { pw: [S.myWins || 0, ME.startReq || 0], pb: ME.claim };
      if (isHost() && state.level === L.idx) p.pq = snapshot();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      const w = pres.pw;
      if (Array.isArray(w) && w.length === 2 && w.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) {
        if (!st.pw || st.pw[0] !== w[0]) state.dirtyBoard = true;
        if (st.pw && w[1] !== st.pw[1] && isHost() && state.level === L.idx && S.ph !== 'fight') startRound();
        st.pw = w;
      } else st.pw = null;
      const c = pres.pb;
      if (Array.isArray(c) && c.length === 2 && Number.isInteger(c[0]) && Number.isInteger(c[1])) {
        if (isHost() && state.level === L.idx && S.seen[rec.peer] !== undefined && S.seen[rec.peer] !== c[0] && c[1] >= 0 && c[1] < S.ids.length) {
          const a = S.ids.indexOf(rec.peer);
          // a bonk from a person: believe it if they're near enough
          const ap = posOf(rec.peer, new V3()), tp = posOf(S.ids[c[1]], new V3());
          if (a >= 0 && ap && tp && Math.hypot(ap.x - tp.x, ap.z - tp.z) < 2.6) bonk(a, c[1]);
        }
        S.seen[rec.peer] = c[0];
      }
      if (pres.pq && validSnap(pres.pq)) { st.pq = pres.pq; if (!isHost() && rec.peer === humansHere()[0]) applySnap(pres.pq); } else st.pq = null;
    };

    // ---------------------------------------------------------------- per frame
    function drawScore() {
      const alive = [0, 1].map((t) => S.ids.filter((_, k) => S.tm[k] === t && S.hp[k] > 0).length);
      const key = `${S.wins.join()}|${alive.join()}|${S.ph}`;
      if (key === drawScore.key) return; drawScore.key = key;
      const g = scoreC.g;
      g.fillStyle = '#2a1a3a'; g.fillRect(0, 0, 640, 240); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, 632, 232);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let t = 0; t < 2; t++) {
        const x = t ? 470 : 170;
        g.fillStyle = TEAM_COL[t]; g.font = `800 44px ${DISPLAY}`; g.fillText(TEAM_N[t], x, 52);
        g.fillStyle = '#ffffff'; g.font = `900 110px ${DISPLAY}`; g.fillText(String(S.wins[t]), x, 140);
        g.fillStyle = '#e8d8f0'; g.font = `600 26px ${BODY}`; g.fillText(S.ph === 'fight' ? `${alive[t]} still in` : '', x, 210);
      }
      g.fillStyle = '#ffd23f'; g.font = `700 30px ${BODY}`; g.fillText('rounds', 320, 140);
      scoreC.tex.needsUpdate = true;
    }
    const _hp = new V3();
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) return;
      if (isHost()) hostStep(dt);
      else { const k = 1 - Math.exp(-dt * 10); for (const b of bots) if (b.tx !== undefined) { b.x += (b.tx - b.x) * k; b.z += (b.tz - b.z) * k; } for (const b of bots) b.swing = Math.max(0, b.swing - dt); }
      if (state.mode === 'vr') vrSwings(dt, performance.now());
      // VR: A or X starts a round
      if (state.mode === 'vr') {
        let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !ME.aPrev && S.ph !== 'fight') requestStart();
        ME.aPrev = a;
      }
      // was I bonked?
      const mi = myIdx(), hp = mi >= 0 ? S.hp[mi] : HP;
      if (S.ph === 'fight' && hp < ME.lastHp) {
        sfx('hurt', 0.8);
        if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.9, 120);
        if (ui.hurt && state.mode === 'flat') { ui.hurt.style.opacity = '0.6'; setTimeout(() => { ui.hurt.style.opacity = '0'; }, 250); }
        if (hp <= 0) { showToast('Bonk! You’re out. Watch from the bench'); const c = new V3(); camera.getWorldPosition(c); const p = BENCH(5); dolly.position.x += p.x - c.x; dolly.position.z += p.z + 0.6 - c.z; }
        else showToast(`Bonk! ${hp} left`);
      }
      ME.lastHp = S.ph === 'fight' ? hp : HP;
      // the bots
      for (const b of bots) {
        const k = S.ids.indexOf(b.id);
        b.g.visible = k >= 0 && S.ph !== 'lobby';
        if (!b.g.visible) continue;
        const out = S.hp[k] <= 0, bounce = out ? 0 : Math.abs(Math.sin(now * 0.006 + b.i * 1.3)) * 0.12;
        b.g.position.set(b.x, (out ? 1.25 : 1.62) + bounce, b.z); b.g.rotation.y = b.yaw;
        const sw = b.swing > 0 ? 1 - b.swing / 0.35 : 0;
        b.pr.position.set(0.32 - sw * 0.5, -0.4 + Math.sin(sw * Math.PI) * 0.35, -0.15 - Math.sin(sw * Math.PI) * 0.35); b.pr.rotation.y = 0.9 - sw * 1.8;
        b.pl.position.set(-0.32, -0.42, -0.12); b.pl.rotation.y = -0.4;
        const inv = S.inv && S.inv[k] > 0 && Math.floor(now / 80) % 2;
        b.mat.emissive && b.mat.emissive.setHex(inv ? 0x553333 : 0x000000);
      }
      // my pillows
      for (const s of SIDES) {
        const p = myPillows[s], h = myHands[s];
        p.visible = h.ok && S.ph !== 'lobby' && !(mi >= 0 && S.hp[mi] <= 0);
        if (p.visible) { p.position.copy(h.pos); p.quaternion.copy(h.quat); p.scale.setScalar(state.mode === 'vr' ? 1 : 0.55); p.userData.mat.color.set(mi >= 0 ? TEAM_COL[S.tm[mi]] : '#ffffff').lerp(new THREE.Color(0xffffff), 0.5); }
      }
      // other people's pillows
      for (const rec of remotes.values()) {
        let pp = remotePillows.get(rec.peer);
        const k = S.ids.indexOf(rec.peer), show = rec.lv === L.idx && rec.inGame && k >= 0 && S.hp[k] > 0 && S.ph !== 'lobby';
        if (!pp && show) { pp = { l: makePillow(0xffffff), r: makePillow(0xffffff) }; L.overlay.add(pp.l, pp.r); remotePillows.set(rec.peer, pp); }
        if (!pp) continue;
        pp.l.visible = show && rec.hasL; pp.r.visible = show && rec.hasR;
        if (pp.l.visible) { pp.l.position.copy(rec.cur.l.pos); pp.l.quaternion.copy(rec.cur.l.quat); pp.l.userData.mat.color.set(TEAM_COL[S.tm[k]]).lerp(new THREE.Color(0xffffff), 0.5); }
        if (pp.r.visible) { pp.r.position.copy(rec.cur.r.pos); pp.r.quaternion.copy(rec.cur.r.quat); pp.r.userData.mat.color.set(TEAM_COL[S.tm[k]]).lerp(new THREE.Color(0xffffff), 0.5); }
      }
      // feathers drift down
      for (const f of feathers) { if (!f.m.visible) continue; f.t -= dt; f.v.y = Math.max(f.v.y - 3 * dt, -0.4); f.v.x *= 0.98; f.v.z *= 0.98; f.m.position.addScaledVector(f.v, dt); f.m.rotation.x += dt * 2; f.m.rotation.z += dt * 3; if (f.t <= 0 || f.m.position.y < 0.16) f.m.visible = false; }
      drawScore();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'lobby' ? 'Pillow Fight Castle  ·  press Space to start a round' : S.ph === 'done' ? `${TEAM_N[S.wt]} wins the round  ·  next round soon` : mi < 0 ? 'Watching this round' : S.hp[mi] <= 0 ? 'You’re out: next round soon' : `${TEAM_N[S.tm[mi]]} team  ·  ${'♥'.repeat(S.hp[mi])}${'♡'.repeat(HP - S.hp[mi])}  ·  click or Space to swing`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    // inside the castle during a fight (unless you're out)
    L.clampPlayer = (head) => {
      const mi = myIdx(), inFight = S.ph === 'fight' && mi >= 0 && S.hp[mi] > 0, Bd = inFight ? HALF - 0.3 : 9.5;
      let dx = 0, dz = 0;
      if (head.x < -Bd) dx = -Bd - head.x; else if (head.x > Bd) dx = Bd - head.x;
      if (head.z < -Bd) dz = -Bd - head.z; else if (head.z > Bd) dz = Bd - head.z;
      return [dx, dz];
    };
    L.rowFor = (st, isMe) => { const w = isMe ? (S.myWins || 0) : st.pw ? st.pw[0] : 0; return { best: w, text: `${w} round${w === 1 ? '' : 's'} won` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.4, 1.53, -7, 1.9, 4, Math.PI * 0.75);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#2a1a3a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ff5a8a'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Rounds won', 36, 80);
      g.fillStyle = '#e8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Three bonks and you’re out. Last team standing wins', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => (S.ph === 'fight' ? 'Restart round' : 'Start round'), run: () => requestStart() }];
    L.hints = [['A / X', 'start a round'], ['Swing', 'your pillows at the other team'], ['Three bonks', 'and you’re out']];
    L.hintsFor = () => (state.mode === 'flat' ? [['WASD', 'move'], ['Click or Space', 'swing']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, HALF + 1.8); if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0; } };
    L.onEnter = () => { drawScore.key = ''; seenMsg = -1; ME.lastHp = HP; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; for (const s of SIDES) myPillows[s].visible = false; if (isHost() && S.ph !== 'lobby') S.ph = 'lobby'; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.5; camera.position.set(Math.sin(a) * 7, 4.5, 9); camera.lookAt(0, 1, 0); };
    L.pfInternals = { S, startRound, hostStep, bonk, myBonk, bots, snapshot, applySnap, validSnap, deskSwing };
    MUSIC_THEMES.pillow = { gain: 0.7, bpm: 132, swing: 0, chords: ['F', 'C', 'Dm', 'Bb'], comp: { inst: 'synth', at: [0, 4, 8, 12], dur: 0.12 }, bass: { at: [0, 4, 8, 12] }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'oooooooooooooooo' }, lead: { inst: 'musicbox', p: 0.35, up: 12 }, cut: 5000 };
    return L;
  })();
