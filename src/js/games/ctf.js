  // ================================================================ LEVEL: CAPTURE THE FLAG
  // Red holds the south half of a park, blue the north. Run into their half, grab their flag from its stand, and get
  // it back to your base. On your own half you can tag anyone from the other team: tagged players go back to their
  // base, and a tagged carrier drops the flag, which springs home. First to 3 captures wins. Bots fill each team to 4.
  // The lowest-named player's page is the referee: it runs the bots, decides pickups and captures, and checks every
  // tag someone asks for. Events (tags, pickups, captures) go out in its presence for everyone to show.
  const ctf = (() => {
    const L = newLevel(21);
    const G = L.group;
    const rand = mulberry32(2121);
    L.grabless = true;
    L.teams = true; L.teamKey = 'fq';
    L.walkSpeed = 3.4;
    const FX = 14, FZ = 24, WIN = 3, TEAM_SIZE = 4, FLAG_Z = 20.5, BASE_R = 3.0, PICK_R = 1.5, BOT_TAG_R = 0.95, HUMAN_TAG_R = 2.2, IMMUNE_MS = 3000;
    L.bounds = { minX: -FX, maxX: FX, minZ: -FZ, maxZ: FZ };
    L.env = {
      sky: skyTexture([[0, '#4a90d8'], [0.55, '#a8d4f0'], [1, '#e8f4fa']]),
      bg: 0xa8d4f0, fog: [0xc0e0f0, 50, 170], hemi: [0xffffff, 0x5a7a3a, 0.8],
      sun: [0xfff4e0, 0.95], sunDir: new V3(0.3, 1, 0.4), ambient: [0x8a9aaa, 0.32], sprite: null,
    };
    const TEAM_HEX = [0xe5453a, 0x3d82e8], TEAM_STR = ['#ff6a5a', '#6aa8ff'];
    const homeOf = (t) => new V3(0, 0, t === 0 ? FLAG_Z : -FLAG_Z);
    const HOME = [homeOf(0), homeOf(1)];
    const ownHalf = (t, z) => (t === 0 ? z > 0 : z < 0);
    const _a = new V3(), _b = new V3(), _q = new Q4();

    // ---------------------------------------------------------------- the field
    const grass = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#5f9a3a'; g.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? 'rgba(255,255,220,0.06)' : 'rgba(0,30,0,0.06)'; g.fillRect(0, k * 32, 256, 32); }
      for (let i = 0; i < 2500; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,200,0.06)' : 'rgba(10,40,0,0.08)'; g.fillRect(rand() * 256, rand() * 256, 2, 3); }
    }).tex;
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(20, 20);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshLambertMaterial({ map: grass }));
    ground.rotation.x = -Math.PI / 2; G.add(ground);
    const tint = (hex) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.13, depthWrite: false });
    for (const t of [0, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(FX * 2, FZ), tint(TEAM_HEX[t]));
      m.rotation.x = -Math.PI / 2; m.position.set(0, 0.01, t === 0 ? FZ / 2 : -FZ / 2); G.add(m);
      const ring = new THREE.Mesh(new THREE.RingGeometry(BASE_R - 0.12, BASE_R, 48), new THREE.MeshBasicMaterial({ color: TEAM_HEX[t], transparent: true, opacity: 0.8, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(HOME[t].x, 0.02, HOME[t].z); G.add(ring);
    }
    const chalk = new THREE.MeshBasicMaterial({ color: 0xf4f2ec });
    addBox(G, FX * 2, 0.01, 0.16, chalk, 0, 0.015, 0);
    for (const sz of [-1, 1]) addBox(G, FX * 2, 0.01, 0.1, chalk, 0, 0.015, sz * FZ);
    for (const sx of [-1, 1]) addBox(G, 0.1, 0.01, FZ * 2, chalk, sx * FX, 0.015, 0);
    // cones along the edge, trees beyond
    const coneM = lam(0xff8a2a);
    for (let k = -6; k <= 6; k++) for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 10), coneM); c.position.set(sx * (FX + 0.4), 0.21, k * 4); G.add(c); }
    {
      const trunk = lam(0x6a4a30), leaves = [lam(0x3e7a34), lam(0x4a8a3a), lam(0x2e6a2e)];
      for (let k = 0; k < 60; k++) {
        const a = rand() * Math.PI * 2, d = 32 + rand() * 30, x = Math.cos(a) * d * 0.7, z = Math.sin(a) * d;
        const h = 2.5 + rand() * 2.5;
        addCyl(G, 0.25, 0.32, h, 6, trunk, x, h / 2, z);
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + rand() * 1.2, 1), leaves[k % 3]); c.position.set(x, h + 1.3, z); G.add(c);
      }
    }
    // cover: hay bales and hedges, the same on both halves
    const HALF_COVER = [[-8, 7, 2.6, 1.1], [7, 11, 1.1, 3.0], [-3, 14.5, 3.0, 1.1], [9.5, 17.5, 1.4, 1.4], [-10, 18.5, 1.4, 1.4], [3, 4.5, 1.4, 1.4], [0, 10, 1.2, 1.2]];
    const COVER = [];
    for (const m of [1, -1]) for (const [x, z, w, d] of HALF_COVER) COVER.push({ x0: x * m - w / 2, x1: x * m + w / 2, z0: z * m - d / 2, z1: z * m + d / 2 });
    const hayTex = canvasTexture(128, 64, (g) => { g.fillStyle = '#d8b050'; g.fillRect(0, 0, 128, 64); for (let i = 0; i < 400; i++) { g.strokeStyle = rand() < 0.5 ? 'rgba(255,240,160,0.5)' : 'rgba(140,90,30,0.4)'; g.beginPath(); const x = rand() * 128, y = rand() * 64; g.moveTo(x, y); g.lineTo(x + 8, y + (rand() - 0.5) * 3); g.stroke(); } }).tex;
    const hayM = new THREE.MeshLambertMaterial({ map: hayTex }), hedgeM = lam(0x3a7a30);
    COVER.forEach((c, k) => addBox(G, c.x1 - c.x0, k % 2 ? 1.1 : 0.9, c.z1 - c.z0, k % 2 ? hedgeM : hayM, (c.x0 + c.x1) / 2, k % 2 ? 0.55 : 0.45, (c.z0 + c.z1) / 2));
    function pushOut(x, z, r) {
      for (const c of COVER) {
        if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) {
          const dl = x - (c.x0 - r), dr = c.x1 + r - x, db = z - (c.z0 - r), df = c.z1 + r - z, m = Math.min(dl, dr, db, df);
          if (m === dl) x = c.x0 - r; else if (m === dr) x = c.x1 + r; else if (m === db) z = c.z0 - r; else z = c.z1 + r;
        }
      }
      return [clamp(x, -FX + r, FX - r), clamp(z, -FZ + r, FZ - r)];
    }
    L.pushOut = pushOut;
    makeKiosk(L, FX - 1.2, FZ - 1.6, Math.atan2(-(FX - 1.2), -(FZ - 1.6)));
    L.board = makeBoard(G, 720, 460, 3.2, 2.05, -FX - 1.2, 2.4, 0, Math.PI / 2);

    // ---------------------------------------------------------------- the flags
    function makeFlag(t) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), lam(0xd8dce8)); pole.position.y = 0.9; g.add(pole);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), lam(0xffd23f)); ball.position.y = 1.82; g.add(ball);
      const geo = new THREE.PlaneGeometry(0.9, 0.55, 8, 1); geo.translate(0.45, 0, 0);
      const cloth = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: TEAM_HEX[t], side: THREE.DoubleSide }));
      cloth.position.y = 1.45; g.add(cloth);
      G.add(g);
      return { g, cloth, base: geo.attributes.position.array.slice() };
    }
    const flags = [makeFlag(0), makeFlag(1)];
    for (const t of [0, 1]) {
      addCyl(G, 0.35, 0.45, 0.25, 16, lam(0x4a4a5a), HOME[t].x, 0.125, HOME[t].z);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(PICK_R, 32), new THREE.MeshBasicMaterial({ color: TEAM_HEX[t], transparent: true, opacity: 0.25, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(HOME[t].x, 0.02, HOME[t].z); G.add(glow);
    }
    function waveFlag(f, now) {
      const pos = f.cloth.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = f.base[i * 3]; pos.setZ(i, Math.sin(now * 0.006 + x * 5) * 0.08 * x); }
      pos.needsUpdate = true;
    }

    // ---------------------------------------------------------------- bots
    const BOT_NAMES = ['Dash Darla', 'Sneaky Sam', 'Flag Fern', 'Tag Tony', 'Zippy Zoe', 'Rover Rex', 'Swift Sid', 'Bolt Bea'];
    const bots = BOT_NAMES.map((name, k) => {
      const team = k < TEAM_SIZE ? 0 : 1;
      const g = buildAvatar(team ? '#7ab0ff' : '#ff8a7a', (k * 3 + 1) % HATS.length, k % FACES.length, true, (k * 2) % SHIRTS.length, team ? 4 : 6);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = TEAM_STR[team]; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.42; g.add(tag);
      g.visible = false; G.add(g);
      return { id: `bot:${k}`, k, team, name, g, active: false, x: 0, z: 0, rx: 0, rz: 0, role: 'def', downUntil: 0, patrol: rand() * 6, speed: 3.7 };
    });
    const isBot = (id) => typeof id === 'string' && id.startsWith('bot:');
    const botOf = (id) => bots[Number(id.slice(4))];

    // ---------------------------------------------------------------- state
    const PH = { idle: 0, play: 1, cap: 2, over: 3 }, PH_N = ['idle', 'play', 'cap', 'over'];
    const RS = { ph: 'idle', score: [0, 0], carrier: ['', ''], winner: -1, match: 0 };
    const H = { phaseT: 0, evSeq: 0, events: [], immune: new Map() };
    const me = { team: -1, tseq: 0, tTarget: '', tagCool: 0, evSeen: -1, ph: '', match: -1 };
    L.me = me; L.ctf = { RS, H };
    const humanList = () => {
      const out = [];
      if (state.mode !== 'menu' && me.team >= 0) out.push({ id: state.myPeer, team: me.team, pos: myHead.pos });
      for (const rec of remotes.values()) {
        if (rec.lv !== L.idx || !rec.inGame || !rec.hasH) continue;
        const st = rec.lvState[L.id];
        if (st && (st.team === 0 || st.team === 1)) out.push({ id: rec.peer, team: st.team, pos: rec.cur.h.pos });
      }
      return out;
    };
    const hostId = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort()[0]; };
    const isHost = () => hostId() === state.myPeer;
    const nameOf = (id) => (id === state.myPeer ? 'You' : isBot(id) ? botOf(id).name : (remotes.get(id) || {}).name || 'Someone');
    const teamOf = (id) => { if (id === state.myPeer) return me.team; if (isBot(id)) return botOf(id).team; const rec = remotes.get(id), st = rec && rec.lvState[L.id]; return st && (st.team === 0 || st.team === 1) ? st.team : -1; };
    // everyone in the game right now: id, team, where they are
    function everyone() {
      const out = humanList();
      for (const b of bots) if (b.active) out.push({ id: b.id, team: b.team, pos: _a.set(b.x, 1.5, b.z).clone(), bot: b });
      return out;
    }
    const carrying = (id) => RS.carrier.indexOf(id);        // which flag someone has, or -1

    // ---------------------------------------------------------------- the referee (host)
    function emit(type, a, b) {
      // (carry on numbering from the last event we heard, in case we've just taken over as referee)
      H.evSeq = Math.max(H.evSeq, H.events.length ? H.events[H.events.length - 1][0] : 0) + 1; H.events.push([H.evSeq, type, a || '', b === undefined ? '' : String(b)]);
      while (H.events.length > 8) H.events.shift();
      forcePresence();
    }
    function fillBots() {
      const n = [0, 0];
      for (const h of humanList()) n[h.team] += 1;
      const want = [Math.max(0, TEAM_SIZE - n[0]), Math.max(0, TEAM_SIZE - n[1])];
      for (const t of [0, 1]) {
        const tb = bots.filter((b) => b.team === t);
        tb.forEach((b, i) => {
          const was = b.active;
          b.active = i < want[t];
          // roles: keep at least one defender; with people on the team, bots lean toward defending
          b.role = i === 0 ? 'def' : (n[t] > 0 ? (i % 2 ? 'def' : 'att') : (i % 2 ? 'att' : 'def'));
          b.speed = b.role === 'att' ? 3.95 : 3.7;
          if (b.active && !was) respawnBot(b, 0);
        });
      }
    }
    function respawnBot(b, now) {
      const home = HOME[b.team];
      b.x = clamp((b.k % TEAM_SIZE - 1.5) * 3 + (Math.random() - 0.5), -FX + 1, FX - 1); b.z = home.z + (b.team === 0 ? 2.5 : -2.5);
      b.rx = b.x; b.rz = b.z; b.downUntil = now + 1500;
    }
    function startPlay(now, full) {
      if (full) { RS.score = [0, 0]; RS.winner = -1; RS.match += 1; }
      RS.carrier = ['', '']; RS.ph = 'cap'; H.phaseT = now;
      fillBots();
      for (const b of bots) if (b.active) respawnBot(b, now);
      emit(4, '', RS.match);                           // everyone back to base
    }
    function tag(id, by, now) {
      if ((H.immune.get(id) || 0) > now) return false;
      H.immune.set(id, now + IMMUNE_MS);
      const f = carrying(id);
      if (f >= 0) RS.carrier[f] = '';
      if (isBot(id)) respawnBot(botOf(id), now);
      emit(1, id, by);
      return true;
    }
    function hostStep(now) {
      if (RS.ph === 'idle') { if (humanList().length) startPlay(now, true); return; }
      if (RS.ph === 'cap') { if (now - H.phaseT > 3000) { RS.ph = 'play'; forcePresence(); } return; }
      if (RS.ph === 'over') { if (now - H.phaseT > 6000) startPlay(now, true); return; }
      if (now - (H.fillT || 0) > 1000) { H.fillT = now; fillBots(); }
      const all = everyone();
      // a carrier who left drops the flag
      for (const t of [0, 1]) if (RS.carrier[t] && !all.some((p) => p.id === RS.carrier[t])) { RS.carrier[t] = ''; forcePresence(); }
      for (const p of all) {
        if (p.bot && now < p.bot.downUntil) continue;
        const enemy = 1 - p.team;
        // grab their flag off its stand
        if (!RS.carrier[enemy] && carrying(p.id) < 0 && Math.hypot(p.pos.x - HOME[enemy].x, p.pos.z - HOME[enemy].z) < PICK_R) { RS.carrier[enemy] = p.id; emit(2, p.id, enemy); }
        // bring it home
        if (RS.carrier[enemy] === p.id && Math.hypot(p.pos.x - HOME[p.team].x, p.pos.z - HOME[p.team].z) < BASE_R) {
          RS.score[p.team] += 1; RS.carrier[enemy] = '';
          emit(3, p.id, p.team);
          if (RS.score[p.team] >= WIN) { RS.winner = p.team; RS.ph = 'over'; H.phaseT = now; forcePresence(); return; }
          startPlay(now, false);
          return;
        }
      }
      // bots tag anyone from the other team who's on their half and within reach
      for (const p of all) {
        if (!p.bot || now < p.bot.downUntil || !ownHalf(p.team, p.pos.z)) continue;
        for (const q of all) {
          if (q.team === p.team || !ownHalf(p.team, q.pos.z)) continue;
          if (Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < BOT_TAG_R && tag(q.id, p.id, now)) break;
        }
      }
      for (const b of bots) if (b.active) botStep(b, all, now);
    }
    // the bots: attackers go for the flag and dodge defenders; defenders guard and chase; carriers run home
    function botStep(b, all, now) {
      const dt = Math.min(0.05, (now - (b.lastT || now)) / 1000); b.lastT = now;
      if (now < b.downUntil) return;
      const enemy = 1 - b.team;
      let tx, tz, speed = b.speed;
      const enemies = all.filter((p) => p.team === enemy);
      const mine = carrying(b.id);
      if (mine >= 0) {
        tx = HOME[b.team].x; tz = HOME[b.team].z; speed = 3.55;
      } else if (b.role === 'att' && !RS.carrier[enemy]) {
        tx = HOME[enemy].x; tz = HOME[enemy].z;
      } else if (RS.carrier[b.team]) {
        // someone has our flag: chase them (we can only tag them on our half)
        const c = all.find((p) => p.id === RS.carrier[b.team]);
        if (c) { tx = c.pos.x; tz = c.pos.z; } else { tx = HOME[b.team].x; tz = HOME[b.team].z; }
      } else {
        // defend: go for the nearest intruder near our flag, otherwise patrol round it
        let best = null, bd = 12;
        for (const q of enemies) { if (!ownHalf(b.team, q.pos.z)) continue; const d = Math.hypot(q.pos.x - HOME[b.team].x, q.pos.z - HOME[b.team].z); if (d < bd) { bd = d; best = q; } }
        if (best) { tx = best.pos.x; tz = best.pos.z; }
        else { const a = now * 0.0004 + b.patrol; tx = HOME[b.team].x + Math.cos(a) * 5; tz = HOME[b.team].z + (b.team === 0 ? -1 : 1) * (3 + Math.abs(Math.sin(a)) * 3); }
      }
      let dx = tx - b.x, dz = tz - b.z;
      const d = Math.hypot(dx, dz) || 1;
      dx /= d; dz /= d;
      // on their half (or carrying), steer away from defenders who are close
      if (!ownHalf(b.team, b.z) || mine >= 0) {
        for (const q of enemies) {
          if (!ownHalf(enemy, q.pos.z) && mine < 0) continue;
          const ex = b.x - q.pos.x, ez = b.z - q.pos.z, ed = Math.hypot(ex, ez);
          if (ed < 4.5 && ed > 0.01) { const w = (4.5 - ed) / 4.5 * 1.4; dx += (ex / ed) * w; dz += (ez / ed) * w; }
        }
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      }
      const step = Math.min(d, speed * dt);
      const ox = b.x, oz = b.z;
      [b.x, b.z] = pushOut(b.x + dx * step, b.z + dz * step, 0.3);
      // stuck on a hay bale: slide sideways round it
      if (Math.hypot(b.x - ox, b.z - oz) < step * 0.3 && step > 0.01) [b.x, b.z] = pushOut(b.x - dz * step, b.z + dx * step, 0.3);
      b.face = Math.atan2(-(b.x - ox), -(b.z - oz)) || b.face || 0;
    }

    // ---------------------------------------------------------------- tagging (you)
    function requestTag(id) {
      const now = performance.now();
      if (now < me.tagCool) return;
      me.tagCool = now + 600;
      if (isHost()) { if (validTag(state.myPeer, id, now)) tag(id, state.myPeer, now); }
      else { me.tseq += 1; me.tTarget = id; forcePresence(); }
      sfx('whoosh', 0.5);
    }
    function validTag(by, id, now) {
      if (RS.ph !== 'play') return false;
      const all = everyone(), p = all.find((x) => x.id === by), q = all.find((x) => x.id === id);
      if (!p || !q || p.team === q.team || !ownHalf(p.team, p.pos.z) || !ownHalf(p.team, q.pos.z)) return false;
      return Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < HUMAN_TAG_R + 0.6;
    }
    const _cf = new V3(), _cp = new V3();
    L.onUse = () => {
      if (state.mode !== 'flat' || me.team < 0) return false;
      camera.getWorldQuaternion(_q); camera.getWorldPosition(_cp);
      _cf.set(0, 0, -1).applyQuaternion(_q);
      let best = null, bestA = 0.9;
      for (const p of everyone()) {
        if (p.team === me.team) continue;
        const vx = p.pos.x - _cp.x, vz = p.pos.z - _cp.z, d = Math.hypot(vx, vz);
        if (d > HUMAN_TAG_R) continue;
        const ang = Math.acos(clamp((vx * _cf.x + vz * _cf.z) / (d * Math.hypot(_cf.x, _cf.z) || 1), -1, 1));
        if (ang < bestA) { bestA = ang; best = p.id; }
      }
      if (best) { if (!ownHalf(me.team, myHead.pos.z)) showToast('You can only tag on your own half'); else requestTag(best); }
      return true;
    };
    function vrTags() {
      if (state.mode !== 'vr' || me.team < 0 || RS.ph !== 'play' || !ownHalf(me.team, myHead.pos.z)) return;
      for (const s of SIDES) {
        const h = myHands[s];
        if (!h.ok) continue;
        for (const p of everyone()) {
          if (p.team === me.team) continue;
          const dxz = Math.hypot(h.pos.x - p.pos.x, h.pos.z - p.pos.z);
          if (dxz < 0.45 && h.pos.y < p.pos.y + 0.25 && h.pos.y > p.pos.y - 1.3) { requestTag(p.id); haptic(vrHands[s], 0.7, 50); return; }
        }
      }
    }

    // ---------------------------------------------------------------- you
    function toBase() {
      if (me.team < 0) return;
      const home = HOME[me.team], z = home.z + (me.team === 0 ? 2.6 : -2.6), x = (Math.random() - 0.5) * 6;
      const yaw = me.team === 0 ? 0 : Math.PI;
      if (state.mode === 'vr') { camera.getWorldQuaternion(_q); const e = new THREE.Euler().setFromQuaternion(_q, 'YXZ'); snapTurn(yaw - e.y); }
      else { state.yaw = yaw; state.pitch = -0.05; }
      camera.getWorldPosition(_b);
      dolly.position.x += x - _b.x; dolly.position.z += z - _b.z;
    }
    function switchTeam(balance) {
      if (me.team < 0) return;
      if (carrying(state.myPeer) >= 0) { showToast('Not while you have the flag'); return; }
      me.team = 1 - me.team; toBase();
      sfx('zap', 1); showToast(balance ? `Teams balanced: you're on ${TEAM_NAMES[me.team]}` : `You're on ${TEAM_NAMES[me.team]} now`);
      state.dirtyBoard = true; state.hudDirty = true; forcePresence();
    }
    L.clampPlayer = (p) => { const [x, z] = pushOut(p.x, p.z, 0.3); return [x - p.x, z - p.z]; };

    // ---------------------------------------------------------------- what happened, for everyone
    function showEvent(type, a, b) {
      const mine = a === state.myPeer;
      if (type === 1) {
        if (mine) { showToast(`Tagged by ${nameOf(b)}! Back to base`); sfx('tagged', 0.9); for (const s of SIDES) haptic(vrHands[s], 0.8, 120); toBase(); }
        else if (b === state.myPeer) { showToast(`You tagged ${nameOf(a)}!`); sfx('coin', 0.8); }
        else { sfx('click', 0.4); }
      } else if (type === 2) {
        const t = Number(b);
        if (mine) { showToast('You have the flag! Get it home'); sfx('chime', 0.9); }
        else showToast(t === me.team ? `${nameOf(a)} took our flag!` : `${nameOf(a)} has their flag!`);
      } else if (type === 3) {
        const t = Number(b);
        showToast(mine ? 'You captured the flag!' : `${TEAM_NAMES[t]} captured the flag! (${nameOf(a)})`);
        sfx(t === me.team ? 'fanfare' : 'buzzer', 0.8);
      } else if (type === 4) { toBase(); }
      state.dirtyBoard = true; state.hudDirty = true;
    }

    // ---------------------------------------------------------------- per frame
    const carriedFlag = [null, null];
    const hudPlate = makePlate(camera, 'You have the flag!', 0.55, 0.1, new V3(0, -0.2, -0.6), 0, { bg: '#16142e', fg: '#ffd23f', size: 0.55 });
    hudPlate.material.depthTest = false; hudPlate.renderOrder = 999; hudPlate.visible = false;
    let statusKey = '', boardKey = '';
    function carrierPos(id, out) {
      if (id === state.myPeer) return out.copy(myHead.pos);
      if (isBot(id)) { const b = botOf(id); return out.set(b.rx, 1.5, b.rz); }
      const rec = remotes.get(id);
      return rec && rec.hasH ? out.copy(rec.cur.h.pos) : null;
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { hudPlate.visible = false; return; }
      autoBalance(L, me, now, switchTeam);
      if (me.team < 0) { me.team = pickTeam(L); toBase(); forcePresence(); }
      if (isHost()) hostStep(now);
      // events from the referee
      for (const e of H.events) if (e[0] > me.evSeen) { if (me.evSeen >= 0) showEvent(e[1], e[2], e[3]); }
      if (H.events.length) me.evSeen = Math.max(me.evSeen, H.events[H.events.length - 1][0]); else if (me.evSeen < 0) me.evSeen = 0;
      vrTags();
      // the bots
      const k = 1 - Math.exp(-dt * (isHost() ? 30 : 10));
      for (const b of bots) {
        b.g.visible = b.active && RS.ph !== 'idle';
        if (!b.g.visible) continue;
        if (Math.hypot(b.rx - b.x, b.rz - b.z) > 6) { b.rx = b.x; b.rz = b.z; }
        const mx = b.x - b.rx, mz = b.z - b.rz;
        b.rx += mx * k; b.rz += mz * k;
        const moving = Math.hypot(mx, mz) > 0.02;
        if (moving) b.face = Math.atan2(-mx, -mz);
        b.g.position.set(b.rx, 1.5 + (moving ? Math.abs(Math.sin(now * 0.016 + b.k)) * 0.06 : 0), b.rz);
        b.g.rotation.y = b.face || (b.team === 0 ? 0 : Math.PI);
      }
      // the flags: on their stands, or on someone's back
      for (const t of [0, 1]) {
        const f = flags[t], c = RS.carrier[t];
        waveFlag(f, now + t * 500);
        if (c && carrierPos(c, _a)) { f.g.position.set(_a.x, _a.y - 1.05, _a.z); f.g.scale.setScalar(0.75); f.g.rotation.y = now * 0.002; }
        else { f.g.position.copy(HOME[t]).setY(0.25); f.g.scale.setScalar(1); f.g.rotation.y = 0; }
        carriedFlag[t] = c;
      }
      const iHave = carrying(state.myPeer) >= 0;
      hudPlate.visible = state.mode === 'vr' && iHave;
      if (state.mode === 'flat' && ui.status) {
        const a = `Red ${RS.score[0]} · Blue ${RS.score[1]}`;
        const b = RS.ph === 'cap' ? 'Get ready…' : RS.ph === 'over' ? `${TEAM_NAMES[RS.winner]} wins!` : iHave ? 'You have the flag! Get it home' : RS.carrier[me.team] ? `${nameOf(RS.carrier[me.team])} has our flag!` : !ownHalf(me.team, myHead.pos.z) ? 'Their half: don’t get tagged' : 'Your half: tag intruders (E)';
        const key = `${a}|${b}|${me.team}`;
        if (key !== statusKey) { statusKey = key; ui.status.hidden = false; ui.status.replaceChildren(); for (const [t, col] of [[me.team >= 0 ? TEAM_NAMES[me.team] : '', TEAM_STR[me.team]], [a, '#ffd23f'], [b, iHave ? '#8bd450' : null]]) { if (!t) continue; const s = document.createElement('span'); s.textContent = t; if (col) s.style.color = col; ui.status.append(s); } }
      }
      if (RS.ph !== me.ph) { if (RS.ph === 'play' && me.ph === 'cap') { sfx('whistle', 0.9); showToast('Go!'); } me.ph = RS.ph; state.dirtyBoard = true; }
    };
    L.drawBoard = () => {
      const key = JSON.stringify([RS.score, RS.ph, RS.winner, me.team]);
      if (key === boardKey) return;
      boardKey = key;
      const g = L.board.g, W = 720, Hd = 460;
      g.fillStyle = '#1b2a1e'; g.fillRect(0, 0, W, Hd);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, Hd - 8);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 52px ${DISPLAY}`; g.fillText('CAPTURE THE FLAG', W / 2, 56);
      g.font = `800 130px ${DISPLAY}`; g.fillStyle = TEAM_STR[0]; g.fillText(String(RS.score[0]), 180, 200); g.fillStyle = TEAM_STR[1]; g.fillText(String(RS.score[1]), W - 180, 200);
      g.font = `700 30px ${BODY}`; g.fillStyle = TEAM_STR[0]; g.fillText('RED', 180, 290); g.fillStyle = TEAM_STR[1]; g.fillText('BLUE', W - 180, 290);
      g.fillStyle = '#d8e4d8'; g.font = `400 24px ${BODY}`;
      g.fillText(`First to ${WIN}. Grab their flag, bring it home.`, W / 2, 360);
      g.fillText('Tag them on your half: they go back to base.', W / 2, 400);
      L.board.tex.needsUpdate = true;
    };
    L.rowFor = (st, isMe) => { const t = isMe ? me.team : st.team; const id = isMe ? state.myPeer : st.peer; return { team: t, text: `${t >= 0 ? TEAM_NAMES[t] : ''}${id && carrying(id) >= 0 ? ' \u{1F6A9}' : ''}`, color: TEAM_STR[t] }; };
    L.sortRows = (a, b) => a.team - b.team;
    L.hudActions = [{ label: () => 'Switch team', run: () => switchTeam() }];
    L.hints = [['Thumbstick', 'run'], ['Touch', 'tag someone on your half'], ['Their stand', 'walk in to grab the flag']];
    L.hintsFor = () => (state.mode === 'flat' ? [['WASD', 'run (Shift sprints)'], ['E', 'tag someone on your half'], ['Their stand', 'walk in to grab the flag']] : L.hints);

    // ---------------------------------------------------------------- network
    L.presence = () => {
      const p = { fq: [me.team, me.tseq, me.tTarget] };
      if (isHost()) {
        p.fh = [PH[RS.ph], RS.score[0], RS.score[1], RS.winner, RS.match];
        p.ff = RS.carrier.slice();
        p.fb = bots.map((b) => [b.active ? 1 : 0, Math.round(b.x * 10), Math.round(b.z * 10)]);
        p.fe = H.events.slice();
      }
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      st.peer = rec.peer;
      const q = pres.fq;
      if (Array.isArray(q) && q.length === 3 && (q[0] === 0 || q[0] === 1 || q[0] === -1) && Number.isInteger(q[1]) && typeof q[2] === 'string') {
        st.team = q[0];
        if (isHost() && q[1] > (st.tseq || 0)) { if (st.tInit) { const now = performance.now(); if (validTag(rec.peer, q[2], now)) tag(q[2], rec.peer, now); } st.tseq = q[1]; }
        st.tInit = true;
      }
      if (rec.peer !== hostId() || isHost()) return;
      const h = pres.fh, f = pres.ff, fb = pres.fb, fe = pres.fe;
      if (Array.isArray(h) && h.length === 5 && h.every(Number.isInteger)) Object.assign(RS, { ph: PH_N[clamp(h[0], 0, 3)], score: [h[1], h[2]], winner: h[3], match: h[4] });
      if (Array.isArray(f) && f.length === 2 && f.every((x) => typeof x === 'string' && x.length < 64)) RS.carrier = f.slice();
      if (Array.isArray(fb) && fb.length === bots.length) fb.forEach((x, k) => { if (Array.isArray(x) && x.length === 3 && x.every(Number.isFinite)) { const b = bots[k]; if (!b.active && x[0]) { b.rx = x[1] / 10; b.rz = x[2] / 10; } b.active = x[0] === 1; b.x = x[1] / 10; b.z = x[2] / 10; } });
      if (Array.isArray(fe)) {
        const ok = fe.filter((e) => Array.isArray(e) && e.length === 4 && Number.isInteger(e[0]) && Number.isInteger(e[1]) && typeof e[2] === 'string' && typeof e[3] === 'string');
        if (me.evSeen < 0 && ok.length) me.evSeen = ok[ok.length - 1][0];      // arriving: don't replay old news
        H.events = ok;
      }
    };
    L.spawn = () => { if (me.team < 0) me.team = pickTeam(L); toBase(); };
    L.onEnter = () => {
      me.team = pickTeam(L); me.evSeen = -1; me.ph = ''; L.enteredAt = performance.now(); statusKey = ''; boardKey = ''; state.dirtyBoard = true;
      if (isHost()) { RS.ph = 'idle'; H.events = []; }
      toBase(); forcePresence();
    };
    L.onExit = () => { hudPlate.visible = false; if (ui.status) ui.status.hidden = true; statusKey = ''; for (const b of bots) b.g.visible = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.00008) * 0.5; camera.position.set(Math.sin(a) * 16 + 10, 9, 18); camera.lookAt(0, 0, 0); };
    L.ctfInternals = { RS, H, me, bots, HOME, COVER, hostStep, tag, validTag, everyone, isHost, startPlay, pushOut, requestTag, ownHalf };
    return L;
  })();
