  // ================================================================ LEVEL: BEACH VOLLEYBALL
  // Two against two on the sand (or one on one, on a smaller court), first to 15 (win by 2). Each side gets three touches: a pass to the setter,
  // a set up by the net, and a spike over. Your touches are helped along: a pass floats to your setter, a set
  // hangs by the net for the hitter. Hit it hard (or hold Space in a browser) to spike it where you like.
  // VR: your hands are your hands: bump, set and swing at the ball. Browser: walk under the ball and you'll
  // play it; hold Space as it reaches you to spike, aimed where you look. Bots fill the empty spots, and
  // friends who come along join a side. The first player in the room runs the match; the others send their hits.
  const volleyball = (() => {
    const L = newLevel(37);
    const G = L.group;
    const rand = mulberry32(3737);
    L.grabless = true;
    L.chargeKick = true;
    // the court's half length and half width: 8 x 4 for doubles, smaller for one on one (see setCourt)
    let HX = 8, HZ = 4;
    const NET_H = 2.24, BR = 0.105, GRAV = 7.0, WIN = 15, BLOCK_STUFF = 0.35;
    L.bounds = { minX: -12, maxX: 12, minZ: -7, maxZ: 7 };
    L.walkSpeed = 4;
    L.canHop = true;
    L.vrHop = true;   // A or X (or the right stick up) jumps in VR, J in a browser: jump at the net to block a spike
    L.env = {
      sky: skyTexture([[0, '#3a8ae0'], [0.55, '#8ac8f4'], [1, '#fff0d0']]),
      bg: 0x8ac8f4, fog: [0xbfe0f4, 50, 160], hemi: [0xffffff, 0xd8b880, 0.8],
      sun: [0xfff4e0, 1.05], sunDir: new V3(-0.3, 1, 0.4), ambient: [0x9aa0a8, 0.35], sprite: null,
    };
    const sgn = (team) => (team === 0 ? -1 : 1);   // team 0 plays on the x < 0 side
    const teamOf = (slot) => (slot < 2 ? 0 : 1);
    const BOT_NAMES = ['Sandy', 'Kai', 'Coral', 'Spike'];
    const BOT_COLS = ['#4fc3f7', '#2ec4b6', '#ff7a5a', '#ffb03a'];
    const LEVELS = [{ name: 'Easy', speed: 3.4, miss: 0.12, spikeMiss: 0.5, err: 1.2, react: 0.45 }, { name: 'Pro', speed: 4.4, miss: 0.04, spikeMiss: 0.3, err: 0.6, react: 0.3 }];

    // ---------------------------------------------------------------- the beach
    const sandTex = canvasTexture(256, 256, (g) => { g.fillStyle = '#e8d098'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1600; i++) { const v = 190 + Math.floor(rand() * 50); g.fillStyle = `rgba(${v},${v - 30},${v - 90},0.5)`; g.fillRect(rand() * 256, rand() * 256, 2, 2); } });
    sandTex.tex.wrapS = sandTex.tex.wrapT = THREE.RepeatWrapping; sandTex.tex.repeat.set(16, 16);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshLambertMaterial({ map: sandTex.tex, color: 0xd8b880 })); sand.rotation.x = -Math.PI / 2; sand.position.z = 10; G.add(sand);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), new THREE.MeshLambertMaterial({ color: 0x2a8ac8, emissive: 0x0a2a4a })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.05, -120); G.add(sea);
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(400, 1.2), new THREE.MeshBasicMaterial({ color: 0xf4fbff })); surf.rotation.x = -Math.PI / 2; surf.position.set(0, 0.01, -29.6); G.add(surf);
    // court lines (blue tape), the net, posts and antennas
    const tape = new THREE.MeshBasicMaterial({ color: 0x2a5ad8 });
    const lines = [[0, -HZ, HX * 2, 0.05], [0, HZ, HX * 2, 0.05], [-HX, 0, 0.05, HZ * 2], [HX, 0, 0.05, HZ * 2]].map(([x, z, w, d]) => addBox(G, w, 0.01, d, tape, x, 0.006, z));
    const antennas = [];
    const netTex = canvasTexture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#1a1a2a'; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64); }).tex;
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.repeat.set(36, 4);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(HZ * 2 + 1, 1.0), new THREE.MeshLambertMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }));
    net.rotation.y = Math.PI / 2; net.position.set(0, NET_H - 0.5, 0); G.add(net);
    addBox(G, 0.05, 0.07, HZ * 2 + 1, new THREE.MeshLambertMaterial({ color: 0xffffff }), 0, NET_H - 0.03, 0);
    for (const sz of [-1, 1]) {
      addCyl(G, 0.06, 0.06, NET_H + 0.3, 10, lam(0xd8d8e0), 0, (NET_H + 0.3) / 2, sz * (HZ + 0.6));
      const ant = new THREE.Mesh(cyl(0.01, 0.01, 1.4, 6), lam(0xe5453a)); ant.position.set(0, NET_H + 0.3, sz * HZ); G.add(ant); antennas.push(ant);
    }
    // one on one plays on a smaller court (6.5 x 3 a side, like the king-of-the-court games): move the tape and antennas
    function setCourt(solo) {
      HX = solo ? 6.5 : 8; HZ = solo ? 3 : 4;
      lines[0].position.z = -HZ; lines[1].position.z = HZ; lines[0].scale.x = lines[1].scale.x = HX / 8;
      lines[2].position.x = -HX; lines[3].position.x = HX; lines[2].scale.z = lines[3].scale.z = HZ / 4;
      antennas.forEach((a, i) => { a.position.z = (i ? 1 : -1) * HZ; });
    }
    // palms, a lifeguard tower, towels and an umbrella
    function palm(x, z, h, lean) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.z = lean; G.add(g);
      for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(cyl(0.16 - i * 0.01, 0.18 - i * 0.01, h / 6, 8), lam(i % 2 ? 0x8a6a3a : 0x7a5a30)); s.position.y = h / 12 + i * h / 6; s.position.x = Math.sin(i / 6) * 0.3; g.add(s); }
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.4, 4), lam(0x3a9a3a)); f.position.set(Math.cos(a) * 0.9 + 0.3, h - 0.1, Math.sin(a) * 0.9); f.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); f.scale.set(1, 1, 0.25); g.add(f); }
    }
    for (const [x, z, h, l] of [[-14, -6, 6, 0.1], [-16, 4, 7, -0.15], [14, -7, 6.5, -0.1], [17, 3, 5.5, 0.12], [-9, -12, 7, 0.05], [10, -13, 6, -0.08], [3, 14, 6.5, 0.1]]) palm(x, z, h, l);
    addBox(G, 2.2, 0.15, 2.2, lam(0xf4f4f0), -8, 2.2, 10); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addCyl(G, 0.06, 0.06, 2.2, 6, lam(0xf4f4f0), -8 + x, 1.1, 10 + z);
    addBox(G, 2.2, 1.0, 0.08, lam(0xe5453a), -8, 2.8, 9); makePlate(G, 'LIFEGUARD', 1.6, 0.3, new V3(-8, 2.8, 8.94), Math.PI, { bg: '#e5453a', fg: '#ffffff', size: 0.6 });
    for (const [x, z, c] of [[4, 8, 0xff4d8a], [6.2, 8.4, 0xffd23f], [-3, 9, 0x4fc3f7]]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), lam(c)); t.rotation.x = -Math.PI / 2; t.position.set(x, 0.01, z); G.add(t); }
    addCyl(G, 0.04, 0.04, 2.3, 6, lam(0xf4f4f0), 5, 1.15, 9.5);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xff7a5a, side: THREE.DoubleSide })); umb.position.set(5, 2.4, 9.5); G.add(umb);
    // the scoreboard, facing the court from the side
    const scoreC = canvasTexture(640, 240);
    const scoreBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.97), new THREE.MeshBasicMaterial({ map: scoreC.tex }));
    scoreBoard.position.set(0, 3.4, -HZ - 2.4); G.add(scoreBoard);
    addCyl(G, 0.06, 0.06, 2.9, 6, lam(0x8a6a3a), -1.1, 1.45, -HZ - 2.42); addCyl(G, 0.06, 0.06, 2.9, 6, lam(0x8a6a3a), 1.1, 1.45, -HZ - 2.42);

    // ---------------------------------------------------------------- the ball and the players
    const ballTex = canvasTexture(256, 128, (g) => { const c = ['#ffd23f', '#ffffff', '#2a6ad8']; for (let i = 0; i < 6; i++) { g.fillStyle = c[i % 3]; g.fillRect(i * 256 / 6, 0, 256 / 6 + 1, 128); } });
    const ballMesh = new THREE.Mesh(sph(BR, 20, 14), new THREE.MeshLambertMaterial({ map: ballTex.tex })); G.add(ballMesh);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(BR * 1.3, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; G.add(shadow);
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false })); marker.rotation.x = -Math.PI / 2; marker.position.y = 0.02; G.add(marker);
    const bots = BOT_NAMES.map((name, i) => {
      const g = buildAvatar(BOT_COLS[i], [3, 0, 1, 2][i], i % 4, true, 2, i < 2 ? 3 : 1);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 30px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 128, 33); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.8, 0.2, 1); tag.position.y = 0.42; g.add(tag); g.visible = false; G.add(g);
      return { slot: i, name, g, x: 0, z: 0, jump: 0 };
    });

    // ---------------------------------------------------------------- the match (run by the host)
    // ph: idle, serve, rally, dead (a point was just won), over
    const V = {
      g: 0, ph: 'idle', p: new V3(0, 1, 0), v: new V3(), score: [0, 0], serveTeam: 0, server: 0, touches: 0, lastTeam: -1, lastSlot: -1,
      t: 0, msg: '', msgSeq: 0, winner: -1, lv: 1, people: ['', '', '', ''], hitSeq: {}, cool: [0, 0, 0, 0], serveIdx: [0, 0], spin: 0, solo: false,
    };
    // the spots in play: all four, or one a side (spots 0 and 2) one on one
    const teamSlots = (t) => (V.solo ? [t * 2] : [t * 2, t * 2 + 1]);
    const inPlay = (sl) => !V.solo || sl % 2 === 0;
    L.vb = V;
    const P = [0, 1, 2, 3].map((s) => ({ x: sgn(teamOf(s)) * 4, z: s % 2 ? 2 : -2 }));   // where each spot's player is
    const humansHere = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const isHost = () => humansHere()[0] === state.myPeer;
    // the people fill the spots in turn: one on each side, then the second on each side
    function assignPeople() {
      const ids = humansHere().filter((id) => { if (id === state.myPeer) return !(L.sitOut && L.sitOut.on); const st = remotes.get(id).lvState[L.id]; return !(st && st.sitOut); });
      const order = V.solo ? [0, 2] : [0, 2, 1, 3], people = ['', '', '', ''];
      ids.slice(0, order.length).forEach((id, i) => { people[order[i]] = id; });
      V.people = people;
    }
    const mySlot = () => V.people.indexOf(state.myPeer);
    const myTeam = () => (mySlot() >= 0 ? teamOf(mySlot()) : -1);
    const nameOfSlot = (s) => { const id = V.people[s]; if (!id) return BOT_NAMES[s]; if (id === state.myPeer) return 'You'; const rec = remotes.get(id); return rec ? rec.name : 'Someone'; };
    const teamName = (t) => (myTeam() === t ? 'Your side' : myTeam() >= 0 ? 'The other side' : t === 0 ? 'Blue' : 'Orange');
    function say(msg) { V.msg = msg; V.msgSeq += 1; showToast(msg); }
    // where a human player is
    function humanPos(id, out) {
      if (id === state.myPeer) return out.set(myHead.pos.x, myHead.pos.y, myHead.pos.z);
      const rec = remotes.get(id);
      if (rec && rec.cur && rec.cur.h) return out.copy(rec.cur.h.pos);
      return null;
    }
    function startMatch() {
      assignPeople();
      Object.assign(V, { g: Date.now() % 1000000, score: [0, 0], serveTeam: 0, winner: -1, serveIdx: [0, 0] });
      for (let s = 0; s < 4; s++) { P[s].x = sgn(teamOf(s)) * (V.solo ? 3.5 : 4); P[s].z = V.solo ? 0 : s % 2 ? 2 : -2; }
      newServe();
      sfx('whistle', 1);
      say(myTeam() >= 0 ? `First to ${WIN}. ${myTeam() === 0 ? 'You serve first' : 'They serve first'}` : `First to ${WIN}`);
      forcePresence();
    }
    L.startMatch = startMatch;
    function newServe() {
      const t = V.serveTeam;
      V.server = t * 2 + (V.solo ? 0 : V.serveIdx[t] % 2);
      V.ph = 'serve'; V.t = 0; V.touches = 0; V.lastTeam = -1; V.lastSlot = -1; V.rallyN = 0;
      P[V.server].x = sgn(t) * (HX + 0.7); P[V.server].z = V.solo ? 0 : V.server % 2 ? 1.2 : -1.2;
      // my serve: step back behind the line
      if (V.people[V.server] === state.myPeer) { const c = new V3(); camera.getWorldPosition(c); dolly.position.x += P[V.server].x - c.x; dolly.position.z += P[V.server].z - c.z; if (state.mode !== 'vr') { state.yaw = t === 0 ? -Math.PI / 2 : Math.PI / 2; state.pitch = 0.1; } showToast(state.mode === 'vr' ? 'Your serve: hit the ball in front of you' : 'Your serve: look where you want it and press Space'); }
      tossBall();
      forcePresence();
    }
    // the serving ball floats in front of the server
    function tossBall() {
      const s = V.server, id = V.people[s];
      const _p = new V3();
      if (id && humanPos(id, _p)) { const far = id === state.myPeer && state.mode !== 'vr'; V.p.set(_p.x - sgn(teamOf(s)) * (far ? 1.0 : 0.45), _p.y - (far ? 0.45 : 0.25), _p.z - (far ? sgn(teamOf(s)) * 0.35 : 0)); }
      else V.p.set(P[s].x - sgn(teamOf(s)) * 0.45, 1.3 + Math.sin(V.t * 3) * 0.05, P[s].z);
      V.v.set(0, 0, 0);
    }
    // ---------------------------------------------------------------- shots: velocities that carry the ball where it should go
    function lob(from, to, apex) {
      apex = Math.max(apex, from.y + 0.2, to.y + 0.2);
      const vy = Math.sqrt(2 * GRAV * (apex - from.y)), T = vy / GRAV + Math.sqrt(2 * (apex - to.y) / GRAV);
      return new V3((to.x - from.x) / T, vy, (to.z - from.z) / T);
    }
    function flat(from, to, speed) {
      const d = Math.hypot(to.x - from.x, to.z - from.z), T = Math.max(0.35, d / speed);
      return new V3((to.x - from.x) / T, (to.y - from.y + 0.5 * GRAV * T * T) / T, (to.z - from.z) / T);
    }
    // lift a shot over the net if it would hit it
    function overNet(from, v) {
      for (let i = 0; i < 30; i++) {
        if (Math.abs(v.x) < 0.01) return v;
        const t = -from.x / v.x;
        if (!(t > 0)) return v;
        const y = from.y + v.y * t - 0.5 * GRAV * t * t;
        if (y > NET_H + BR + 0.12) return v;
        v.y += 0.3; v.x *= 0.97; v.z *= 0.97;
      }
      return v;
    }
    L.overNet = overNet;
    // a spot in the court of the given team
    const inCourt = (team, x, z, m) => new V3(sgn(team) * clamp(Math.abs(x), 1.2, HX - (m || 0.5)), BR, clamp(z, -HZ + (m || 0.5), HZ - (m || 0.5)));
    // shot kinds: 0 serve, 1 pass, 2 set, 3 spike, 4 free ball (over the net, soft), 5 block (back down on their side), 6 soft block (a touch that pops up on my own side)
    function shotVel(slot, kind, from, aim) {
      const t = teamOf(slot), s = sgn(t), o = 1 - t;
      if (kind === 1) { // pass to the setter's spot by the net
        return lob(from, new V3(s * 1.6, 2.1, clamp(from.z * 0.3, -1.5, 1.5)), 4.3);
      }
      if (kind === 2) { // set up high by the net, toward the far side of the hitter
        const hz = from.z > 0 ? -1.8 : 1.8;
        return lob(from, new V3(s * 1.1, 2.6, hz), Math.max(4.2, from.y + 1.4));
      }
      if (kind === 5) return overNet(from, flat(from, inCourt(o, 2.2 + rand() * 2.4, from.z + (rand() - 0.5) * 2.5, 0.5), 7));   // a stuff, but slow enough to dig
      if (kind === 6) return lob(from, inCourt(t, 2.2 + rand() * 1.8, from.z * 0.5, 0.8), Math.max(from.y + 0.7, 3.3));
      const to = aim || inCourt(o, 5 + rand() * 2, (rand() - 0.5) * 6);
      if (kind === 3) return overNet(from, flat(from, to, 13));
      if (kind === 0) return overNet(from, lob(from, to, 4.6));
      return overNet(from, lob(from, to, Math.max(3.9, from.y + 1.3)));
    }
    L.shotVel = shotVel;
    // a player touches the ball: the rules, then away it goes
    function applyHit(slot, p, v, kind) {
      const t = teamOf(slot);
      if (V.ph === 'serve') { if (slot !== V.server) return; V.ph = 'rally'; V.lastTeam = t; V.touches = 3; V.lastSlot = slot; }
      else if (kind === 5) { if (V.ph !== 'rally') return; V.lastTeam = t; V.touches = 3; V.lastSlot = slot; }   // a block isn't one of the three touches
      else if (kind === 6) { if (V.ph !== 'rally') return; V.lastTeam = t; V.touches = 0; V.lastSlot = slot; }   // nor is a soft block: three touches still to come
      else {
        if (V.ph !== 'rally') return;
        if (V.lastTeam !== t) { V.touches = 1; V.lastTeam = t; } else V.touches += 1;
        if (V.touches > 3) { point(1 - t, `Four touches by ${teamName(t).toLowerCase()}`); return; }
        V.lastSlot = slot;
      }
      V.rallyN = (V.rallyN || 0) + 1;
      V.p.copy(p); V.v.copy(v); V.cool[slot] = 0.45; V.hitN = (V.hitN || 0) + 1; V.sinceHit = 0;
      V.spin = (rand() - 0.5) * 20; V.lastKind = kind;
      if (kind === 5) { sfx('slam', 0.9); spawnFloat('BLOCKED!', p.clone().add(new V3(0, 0.5, 0)), '#4fc3f7'); forcePresence(); return; }
      if (kind === 6) { sfx('ball', 0.6); spawnFloat('Tipped', p.clone().add(new V3(0, 0.5, 0)), '#9fd8ff'); forcePresence(); return; }
      const loud = kind === 3 ? 1 : 0.6;
      sfx(kind === 3 ? 'slam' : 'ball', loud); tone(kind === 3 ? 160 : 260, 120, 0.06, 'square', 0.12);
      if (kind === 3) spawnFloat('SPIKE!', p.clone().add(new V3(0, 0.4, 0)), '#ffd23f');
      forcePresence();
    }
    function point(team, why) {
      if (V.ph !== 'rally' && V.ph !== 'serve') return;
      V.score[team] += 1;
      if (myTeam() >= 0 && V.rallyN >= 6) RECORDS.add(L, 'rally', V.rallyN);
      const s = V.score;
      V.ph = 'dead'; V.t = 0;
      if (team !== V.serveTeam) { V.serveTeam = team; V.serveIdx[team] += 1; }
      const mine = myTeam() === team;
      if (Math.max(s[0], s[1]) >= WIN && Math.abs(s[0] - s[1]) >= 2) {
        V.ph = 'over'; V.winner = team;
        say(myTeam() < 0 ? `${teamName(team)} wins ${s[team]}-${s[1 - team]}` : mine ? `You win the match ${s[team]}-${s[1 - team]}!` : `They win ${s[team]}-${s[1 - team]}. Rematch?`);
        sfx(mine ? 'fanfare' : 'buzzer', 0.9); if (mine) sfx('cheer', 0.8);
        if (mine) RECORDS.add(L, 'margin', s[team] - s[1 - team]);
        if (mine) { V.wins = (V.wins || 0) + 1; prefs.vbWins = V.wins; savePrefs(); state.dirtyBoard = true; }
      } else {
        say(`${why}. ${myTeam() < 0 ? `${teamName(team)} scores` : mine ? 'Point to you' : 'Point to them'}: ${s[myTeam() === 1 ? 1 : 0]}-${s[myTeam() === 1 ? 0 : 1]}`);
        sfx(mine ? 'cheer' : 'whistle', 0.6);
      }
      forcePresence();
    }
    try { if (Number.isInteger(prefs.vbWins)) V.wins = prefs.vbWins; } catch (e) { /* none */ }
    // where the ball will be when it comes down to height h (or null)
    function predict(h, out) {
      let x = V.p.x, y = V.p.y, z = V.p.z, vx = V.v.x, vy = V.v.y, vz = V.v.z;
      for (let i = 0; i < 400; i++) {
        const dt = 0.01;
        vy -= GRAV * dt; x += vx * dt; y += vy * dt; z += vz * dt;
        if (vy < 0 && y <= h) return out.set(x, y, z);
      }
      return null;
    }
    L.predict = predict;
    // ---------------------------------------------------------------- the host's step: the ball, the bots
    const _c = new V3(), _h = new V3(), _q = new V3();
    function ballStep(dt) {
      const px = V.p.x;
      V.v.y -= GRAV * dt;
      V.p.addScaledVector(V.v, dt);
      // the net
      if (Math.sign(px) !== Math.sign(V.p.x) && V.p.y < NET_H + BR * 0.5 && V.p.y > NET_H - 1.05 && Math.abs(V.p.z) < 4.5) {   // (the net is full width whatever the court)
        V.p.x = Math.sign(px) * BR; V.v.x *= -0.25; V.v.z *= 0.5; V.v.y *= 0.3; sfx('net', 0.6);
      }
      if (V.p.y <= BR) {
        V.p.y = BR;
        const inside = Math.abs(V.p.x) <= HX + BR && Math.abs(V.p.z) <= HZ + BR;
        sfx('thump', 0.5);
        if (inside) point(V.p.x < 0 ? 1 : 0, 'In!');
        else point(V.lastTeam >= 0 ? 1 - V.lastTeam : (V.p.x < 0 ? 1 : 0), 'Out');
      }
    }
    L.ballStep = ballStep;
    function botStep(dt) {
      const lv = LEVELS[V.lv];
      // whose side is it heading for, and where will it come down to a playable height
      const land = V.ph === 'rally' ? predict(1.2, _c) : null;
      const side = land ? (land.x < 0 ? 0 : 1) : -1;
      for (let t = 0; t < 2; t++) {
        const s0 = t * 2, s = sgn(t);
        // who goes for it: the nearer of the two (a person on the team claims anything near them)
        let chaser = -1;
        if (side === t && V.ph === 'rally') {
          let best = 1e9;
          for (const sl of teamSlots(t)) {
            const id = V.people[sl];
            const pos = id ? humanPos(id, _h) : _h.set(P[sl].x, 0, P[sl].z);
            if (!pos) continue;
            const d = Math.hypot(pos.x - land.x, pos.z - land.z) - (id ? 1.5 : 0) - (sl === V.lastSlot && V.lastTeam === t ? -2.5 : 0);
            if (d < best) { best = d; chaser = sl; }
          }
        }
        for (const sl of teamSlots(t)) {
          if (V.people[sl]) continue;
          const b = P[sl];
          if (b.rolled === undefined) { b.rolled = -1; b.whiff = -1; }
          let tx, tz;
          if (V.ph === 'serve' && sl === V.server) { tx = b.x; tz = b.z; }
          else if (V.ph === 'serve' || V.ph === 'dead' || V.ph === 'idle' || V.ph === 'over') { tx = s * (V.solo ? 3.5 : 4.2); tz = V.solo ? 0 : sl % 2 ? 2 : -2; }
          else if (sl === chaser) { tx = land.x - s * 0.25; tz = land.z; }
          else if (side === t) { const next = V.lastTeam === t ? V.touches + 1 : 1; if (next === 1) { tx = s * 1.6; tz = 0; } else { tx = s * 3.2; tz = V.p.z > 0 ? -1.8 : 1.8; } }
          else if (V.ph === 'rally' && V.lastTeam === 1 - t && V.touches >= 2 && sl === s0 && !V.solo) { tx = s * 0.9; tz = clamp(V.p.z, -3, 3); }   // up to the net to block
          else if (V.solo) { tx = s * HX * 0.5; tz = clamp(V.p.z * 0.4, -1.5, 1.5); }   // one on one: the middle of the court, leaning toward the ball
          else { tx = s * 4.5; tz = sl % 2 ? 2.2 : -2.2; }
          tx = clamp(tx, s < 0 ? -HX - 1 : 0.4, s < 0 ? -0.4 : HX + 1); tz = clamp(tz, -HZ - 1, HZ + 1);
          const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz), step = (V.ph === 'rally' && V.sinceHit < lv.react && V.lastTeam !== t) ? 0 : Math.min(d, lv.speed * dt);
          if (d > 0.01) { b.x += dx / d * step; b.z += dz / d * step; }
          // play the ball when it's in reach
          V.cool[sl] = Math.max(0, V.cool[sl] - dt);
          // a bot up at the net now and then blocks a spike
          if (V.ph === 'rally' && V.lastKind === 3 && V.lastTeam === 1 - t && Math.abs(V.p.x) < 0.8 && V.v.x * s > 0 && Math.abs(b.x) < 2.2 && Math.abs(V.p.z - b.z) < 1.0 && b.blockN !== V.hitN) {
            b.blockN = V.hitN;
            if (rand() < 0.15) { b.jump = 0.5; const from = V.p.clone(); from.x = s * 0.25; from.y = Math.max(from.y, NET_H + 0.25); const k = rand() < BLOCK_STUFF ? 5 : 6; applyHit(sl, from, shotVel(sl, k, from, null), k); continue; }
          }
          if (V.ph !== 'rally' || V.cool[sl] > 0) continue;
          const onMySide = Math.sign(V.p.x) === s || Math.abs(V.p.x) < 0.3;
          const hd = Math.hypot(V.p.x - b.x, V.p.z - b.z), nearNet = Math.abs(V.p.x) < 3.2;
          if (!onMySide || hd > 0.95 || V.p.y < 0.35 || V.p.y > (nearNet ? 3.0 : 2.6)) continue;
          if (V.v.y > 1.5 && V.p.y < 2.0) continue;   // still rising past: wait for it
          const next = V.lastTeam === t ? V.touches + 1 : 1;
          const hard = V.v.length() > 10;
          if (b.whiff === V.hitN) continue;
          if (b.rolled !== V.hitN) { b.rolled = V.hitN; if (rand() < (hard ? lv.spikeMiss : lv.miss)) { b.whiff = V.hitN; continue; } }   // a whiff
          // (one on one there's no setter: a pass up to the net, then the attack)
          let kind = next === 1 ? 1 : next === 2 && !V.solo ? 2 : V.p.y > 2.2 && nearNet ? 3 : 4;
          // a teammate who's a person: set it up for them, unless they're nowhere near
          const aim = inCourt(1 - t, 3 + rand() * 4.5, (rand() - 0.5) * 7 * lv.err, 0.3 + 0.3 * (1 - lv.err));
          if (kind >= 3 && rand() < 0.08 * lv.err) aim.x += sgn(1 - t) * 1.6;   // long
          if (kind === 3) b.jump = 0.5;
          applyHit(sl, V.p.clone(), shotVel(sl, kind, V.p.clone(), aim), kind);
        }
      }
      // a bot serving
      if (V.ph === 'serve' && !V.people[V.server]) {
        V.t += dt; tossBall();
        if (V.t > 1.6) {
          const sl = V.server, aim = inCourt(1 - teamOf(sl), 3 + rand() * 4.5, (rand() - 0.5) * 6);
          V.p.y = 2.2;
          applyHit(sl, V.p.clone(), shotVel(sl, 0, V.p.clone(), aim), 0);
        }
      } else if (V.ph === 'serve') { V.t += dt; tossBall(); }
      for (const b of bots) b.jump = Math.max(0, b.jump - dt);
    }
    function hostStep(dt) {
      V.sinceHit = (V.sinceHit || 0) + dt;
      if (V.ph === 'rally') { const n = Math.max(1, Math.ceil(dt / 0.005)); for (let i = 0; i < n && V.ph === 'rally'; i++) ballStep(dt / n); }
      if (V.ph === 'dead') { V.t += dt; if (V.t > 2.2) newServe(); }
      botStep(dt);
    }
    L.hostStep = hostStep;
    // ---------------------------------------------------------------- my own touches
    // The ball as I see it is the host's; when I touch it I work out the shot, play it here at once and
    // tell the host (who plays it too, so everyone sees it).
    const ME = { seq: 0, claim: null, prevH: { left: new V3(), right: new V3() }, hv: { left: new V3(), right: new V3() }, cool: 0 };
    function myTouch(kind, aim) {
      const sl = mySlot();
      if (sl < 0) return;
      const from = V.p.clone();
      if (kind === 3 && from.y < 2.0) from.y = Math.max(from.y, 1.6);
      const v = shotVel(sl, kind, from, aim);
      ME.cool = 0.45; ME.seq += 1;
      ME.claim = [ME.seq, kind, sl, ...[from.x, from.y, from.z, v.x, v.y, v.z].map((x) => Math.round(x * 100) / 100)];
      if (isHost()) applyHit(sl, from, v, kind);
      else { V.p.copy(from); V.v.copy(v); if (V.ph === 'serve') V.ph = 'rally'; sfx(kind === 3 ? 'slam' : 'ball', 0.7); }
      if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], kind === 3 ? 0.9 : 0.5, 40);
      forcePresence();
    }
    L.myTouch = myTouch;
    // which touch I'd be making, and what it does: a pass, a set, then over (one on one: a pass, then over)
    const nextTouch = () => (V.lastTeam === myTeam() ? V.touches + 1 : 1);
    const touchKind = (next) => (next === 1 ? 1 : next === 2 && !V.solo ? 2 : 4);
    // a spot to spike or serve at: where I'm looking, in their court
    function lookAim() {
      const t = myTeam(); if (t < 0) return null;
      const q = new Q4(); camera.getWorldQuaternion(q); const f = new V3(0, 0, -1).applyQuaternion(q); f.y = 0; f.normalize();
      const p = myHead.pos;
      // where the look line crosses the middle of their court, roughly
      const k = Math.abs(f.x) > 0.2 ? (sgn(1 - t) * 4.5 - p.x) / f.x : 8;
      return inCourt(1 - t, p.x + f.x * clamp(k, 3, 14), p.z + f.z * clamp(k, 3, 14), 0.4);
    }
    function myStep(dt, now) {
      ME.cool = Math.max(0, ME.cool - dt);
      const sl = mySlot();
      if (sl < 0 || ME.cool > 0) return;
      const t = teamOf(sl), s = sgn(t);
      if (V.ph === 'serve' && V.server === sl) {
        if (state.mode === 'vr') {
          for (const sd of SIDES) {
            const h = myHands[sd]; if (!h.ok) continue;
            if (h.pos.distanceTo(V.p) < BR + 0.12 && ME.hv[sd].length() > 1.0) {
              const hv = ME.hv[sd]; const f = new V3(hv.x, 0, hv.z); if (f.lengthSq() < 0.01) f.set(-s, 0, 0); f.normalize();
              const k = (sgn(1 - t) * 4.5 - V.p.x) / (Math.abs(f.x) > 0.2 ? f.x : -s);
              const aim = inCourt(1 - t, V.p.x + f.x * k, V.p.z + f.z * k, 0.5);
              aim.x = sgn(1 - t) * clamp(2.5 + hv.length() * 0.6, 2.5, HX - 0.6);
              V.p.y = 2.0;
              myTouch(0, aim);
              return;
            }
          }
        }
        return;
      }
      if (V.ph !== 'rally') return;
      // a block: their spike coming over the net, and my hands up in its way
      if (V.lastTeam === 1 - t && V.lastKind === 3 && Math.abs(V.p.x) < 1.4 && V.v.x * s > 0) {
        let blocked = false;
        let hands = 0;
        if (state.mode === 'vr') { for (const sd of SIDES) { const h = myHands[sd]; if (h.ok && h.pos.y > NET_H - 0.05 && Math.abs(h.pos.x) < 0.7 && h.pos.distanceTo(V.p) < BR + 0.13) hands++; } }
        else { const hd = Math.hypot(V.p.x - myHead.pos.x, V.p.z - myHead.pos.z); if (Math.abs(myHead.pos.x) < 1.2 && hd < 0.65 && V.p.y > myHead.pos.y + 0.03 && V.p.y < myHead.pos.y + 0.7) hands = 1; }
        if (hands) {
          // a clean stuff is the exception: mostly the spike just glances off and pops up on my side
          const b = V.p.clone(); b.x = s * 0.25; b.y = Math.max(b.y, NET_H + 0.25); V.p.copy(b);
          const stuff = L.blockRoll != null ? L.blockRoll : rand();
          myTouch(stuff < BLOCK_STUFF + (hands > 1 ? 0.12 : 0) ? 5 : 6, null); return;
        }
      }
      const onMySide = Math.sign(V.p.x) === s || Math.abs(V.p.x) < 0.4;
      if (!onMySide) return;
      if (state.mode === 'vr') {
        for (const sd of SIDES) {
          const h = myHands[sd]; if (!h.ok) continue;
          if (h.pos.distanceTo(V.p) > BR + 0.16) continue;
          const hv = ME.hv[sd], sp = hv.length(), next = nextTouch();
          // a hard swing at a high ball is a spike, aimed along the swing
          if (sp > 3.0 && V.p.y > myHead.pos.y - 0.15 && hv.y < 1.5) {
            const f = new V3(hv.x, 0, hv.z); if (f.lengthSq() < 0.04 || Math.sign(f.x) !== -s) f.set(-s, 0, f.z); f.normalize();
            const k = (sgn(1 - t) * 4.5 - V.p.x) / f.x;
            const aim = inCourt(1 - t, V.p.x + f.x * k, V.p.z + f.z * k, 0.4);
            aim.x = sgn(1 - t) * clamp(1.5 + sp * 0.9, 2, HX - 0.5);
            myTouch(3, aim); return;
          }
          myTouch(touchKind(next), touchKind(next) === 4 ? lookAim() : null); return;
        }
      } else {
        const hd = Math.hypot(V.p.x - myHead.pos.x, V.p.z - myHead.pos.z), top = myHead.pos.y + (HOP.air ? 1.4 : 1.2);
        if (hd > 1.1 || V.p.y < 0.3 || V.p.y > top) return;
        if (V.v.y > 1.5 && V.p.y < 2.0) return;
        const next = nextTouch(), spike = state.charge !== null && (next >= 2 || Math.abs(V.p.x) < 4) && V.p.y > 1.4;
        if (spike) { state.charge = null; ui.power.hidden = true; myTouch(3, lookAim()); return; }
        myTouch(touchKind(next), touchKind(next) === 4 ? lookAim() : null);
      }
    }
    // browser: Space serves (when it's yours), starts a match, or (held) spikes as the ball reaches you
    L.onChargeStart = () => {
      const sl = mySlot();
      if (V.ph === 'idle' || V.ph === 'over') { requestStart(); return; }
      if (V.ph === 'serve' && V.server === sl && sl >= 0) { V.p.y = 2.0; myTouch(0, lookAim()); }
    };
    L.kick = () => {};
    L.throwLabel = () => (V.ph === 'idle' || V.ph === 'over' ? 'Start' : V.ph === 'serve' && V.server === mySlot() ? 'Serve' : 'Spike');
    // starting: the host starts; anyone else asks the host
    function requestStart() {
      if (isHost()) startMatch(); else { ME.startReq = (ME.startReq || 0) + 1; forcePresence(); showToast('Asking to start a match…'); }
    }

    // ---------------------------------------------------------------- the network
    const PH = ['idle', 'serve', 'rally', 'dead', 'over'];
    const r2 = (x) => Math.round(x * 100) / 100;
    function snapshot() {
      return { g: V.g, ph: PH.indexOf(V.ph), b: [V.p.x, V.p.y, V.p.z, V.v.x, V.v.y, V.v.z].map(r2), s: V.score.slice(), sv: V.server, t: V.touches, lt: V.lastTeam, ls: V.lastSlot, pl: P.flatMap((p) => [r2(p.x), r2(p.z)]), h: V.people.slice(), m: [V.msgSeq, V.msg], w: V.winner, lv: V.lv, lk: V.lastKind === undefined ? -1 : V.lastKind, so: V.solo ? 1 : 0 };
    }
    const fin = (x, m) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < m;
    function validSnap(q) {
      return q && Number.isInteger(q.g) && Number.isInteger(q.ph) && q.ph >= 0 && q.ph < PH.length && Array.isArray(q.b) && q.b.length === 6 && q.b.every((x) => fin(x, 100))
        && Array.isArray(q.s) && q.s.length === 2 && q.s.every((x) => Number.isInteger(x) && x >= 0 && x < 100) && Number.isInteger(q.sv) && q.sv >= 0 && q.sv < 4
        && Number.isInteger(q.t) && Number.isInteger(q.lt) && Number.isInteger(q.ls) && Array.isArray(q.pl) && q.pl.length === 8 && q.pl.every((x) => fin(x, 100))
        && Array.isArray(q.h) && q.h.length === 4 && q.h.every((x) => typeof x === 'string' && x.length < 64) && Array.isArray(q.m) && q.m.length === 2 && Number.isInteger(q.m[0]) && typeof q.m[1] === 'string' && q.m[1].length < 200
        && Number.isInteger(q.w) && (q.lv === 0 || q.lv === 1);
    }
    let seenMsg = -1, lastSnapB = '';
    function applySnap(q) {
      V.g = q.g; V.ph = PH[q.ph]; V.score = q.s.slice(); V.server = q.sv; V.touches = q.t; V.lastTeam = q.lt; V.lastSlot = q.ls; V.people = q.h.slice(); V.winner = q.w; V.lv = q.lv; if (Number.isInteger(q.lk)) V.lastKind = q.lk;
      if ((q.so === 1) !== V.solo) { V.solo = q.so === 1; setCourt(V.solo); drawScore.key = ''; }
      for (let s = 0; s < 4; s++) { P[s].tx = q.pl[s * 2]; P[s].tz = q.pl[s * 2 + 1]; }
      // the ball: take the host's, unless I've just hit it myself (mine is newer)
      const key = q.b.join();
      if (key !== lastSnapB && ME.cool < 0.25) { V.p.set(q.b[0], q.b[1], q.b[2]); V.v.set(q.b[3], q.b[4], q.b[5]); }
      lastSnapB = key;
      if (seenMsg >= 0 && q.m[0] !== seenMsg && q.m[1]) showToast(q.m[1]);
      seenMsg = q.m[0];
    }
    L.presence = () => {
      const p = { vw: [V.wins || 0, ME.startReq || 0] };
      p.vh = ME.claim || [0, 0, 0, 0, 0, 0, 0, 0, 0];
      if (isHost() && state.level === L.idx) p.vq = snapshot();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      const w = pres.vw;
      if (Array.isArray(w) && w.length === 2 && w.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) {
        if (!st.vw || st.vw[0] !== w[0]) state.dirtyBoard = true;
        // a friend asking to start
        if (st.vw && w[1] !== st.vw[1] && isHost() && state.level === L.idx && (V.ph === 'idle' || V.ph === 'over')) startMatch();
        st.vw = w;
      } else st.vw = null;
      // their touch of the ball
      const h = pres.vh;
      if (Array.isArray(h) && h.length === 9 && h.every((x) => fin(x, 1e6)) && Number.isInteger(h[0]) && Number.isInteger(h[1]) && h[1] >= 0 && h[1] <= 5 && Number.isInteger(h[2]) && h[2] >= 0 && h[2] < 4) {
        if (isHost() && state.level === L.idx && V.hitSeq[rec.peer] !== h[0] && V.people[h[2]] === rec.peer && V.hitSeq[rec.peer] !== undefined) {
          applyHit(h[2], new V3(h[3], h[4], h[5]), new V3(h[6], h[7], h[8]), h[1]);
        }
        V.hitSeq[rec.peer] = h[0];
      }
      if (pres.vq && validSnap(pres.vq)) { st.vq = pres.vq; if (!isHost() && rec.peer === humansHere()[0]) applySnap(pres.vq); }
      else st.vq = null;
    };

    // ---------------------------------------------------------------- per frame
    function drawScore() {
      const key = `${V.score.join()}|${V.ph}|${V.serveTeam}|${myTeam()}`;
      if (key === drawScore.key) return; drawScore.key = key;
      const g = scoreC.g;
      g.fillStyle = '#1a2a4a'; g.fillRect(0, 0, 640, 240);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, 632, 232);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const names = [myTeam() === 0 ? 'YOU' : 'BLUE', myTeam() === 1 ? 'YOU' : 'ORANGE'];
      for (let t = 0; t < 2; t++) {
        const x = t === 0 ? 170 : 470;
        g.fillStyle = t === 0 ? '#4fc3f7' : '#ff9a5a'; g.font = `800 40px ${DISPLAY}`; g.fillText(names[t] + (V.serveTeam === t && V.ph !== 'idle' ? ' •' : ''), x, 56);
        g.fillStyle = '#ffffff'; g.font = `900 120px ${DISPLAY}`; g.fillText(String(V.score[t]), x, 156);
      }
      g.fillStyle = '#c8d8f0'; g.font = `600 26px ${BODY}`; g.fillText(V.ph === 'idle' ? 'Press Start' : V.ph === 'over' ? 'Final' : `to ${WIN}`, 320, 210);
      scoreC.tex.needsUpdate = true;
    }
    const _m = new V3();
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { marker.visible = false; return; }
      // my hand speeds (VR)
      for (const sd of SIDES) { const h = myHands[sd]; ME.hv[sd].subVectors(h.pos, ME.prevH[sd]).divideScalar(Math.max(dt, 1e-3)); ME.prevH[sd].copy(h.pos); }
      if (isHost()) {
        if (V.ph === 'idle' || V.ph === 'over') { const before = V.people.join(); assignPeople(); if (V.people.join() !== before) forcePresence(); }
        else { const here2 = humansHere(); V.people = V.people.map((id) => (id && here2.includes(id) ? id : '')); }   // someone left: a bot takes over
        hostStep(dt);
      } else {
        // between snapshots: fly the ball on, and slide the bots to where the host has them
        if (V.ph === 'rally') { V.v.y -= GRAV * dt; V.p.addScaledVector(V.v, dt); if (V.p.y < BR) { V.p.y = BR; V.v.set(0, 0, 0); } }
        const k = 1 - Math.exp(-dt * 10);
        for (const p of P) if (p.tx !== undefined) { p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k; }
      }
      myStep(dt, now);
      // VR: A or X starts a match
      if (state.mode === 'vr') {
        let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !ME.aPrev && (V.ph === 'idle' || V.ph === 'over')) requestStart();
        ME.aPrev = a;
      }
      // the ball
      ballMesh.position.copy(V.p); ballMesh.visible = V.ph !== 'idle';
      ballMesh.rotation.x += V.spin * dt * (V.ph === 'rally' ? 1 : 0); ballMesh.rotation.z += V.spin * 0.5 * dt * (V.ph === 'rally' ? 1 : 0);
      shadow.position.set(V.p.x, 0.012, V.p.z); shadow.visible = ballMesh.visible;
      // where it's coming down, when it's coming my way
      const land = V.ph === 'rally' && myTeam() >= 0 ? predict(1.0, _m) : null;
      marker.visible = !!land && Math.sign(land.x) === sgn(myTeam());
      if (marker.visible) marker.position.set(land.x, 0.02, land.z);
      // the bots
      for (const b of bots) {
        const s = b.slot;
        b.g.visible = V.ph !== 'idle' && !V.people[s] && inPlay(s);
        if (!b.g.visible) continue;
        const face = new V3(V.p.x - P[s].x, 0, V.p.z - P[s].z);
        const yaw = Math.atan2(-face.x, -face.z);
        b.g.position.set(P[s].x, 1.62 + Math.sin(Math.min(1, b.jump / 0.5) * Math.PI) * 0.5, P[s].z); b.g.rotation.y = yaw;
      }
      drawScore();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const sl = mySlot();
        const txt = V.ph === 'idle' ? `Beach volleyball, ${V.solo ? '1 v 1' : '2 v 2'} (bots: ${LEVELS[V.lv].name})  ·  press Space to start` : V.ph === 'over' ? `${V.score[0]}-${V.score[1]}  ·  press Space for a rematch`
          : `${V.score[myTeam() === 1 ? 1 : 0]}-${V.score[myTeam() === 1 ? 0 : 1]}  ·  ${V.ph === 'serve' ? (V.server === sl ? 'your serve: look and press Space' : `${nameOfSlot(V.server)} to serve`) : sl < 0 ? 'watching' : `walk under the ball to play it  ·  hold Space to spike`}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    // stay on my side during a rally, and off the far side of the court
    L.clampPlayer = (head) => {
      const B = L.bounds, m = 0.3;
      let dx = 0, dz = 0;
      if (head.x < B.minX + m) dx = B.minX + m - head.x; else if (head.x > B.maxX - m) dx = B.maxX - m - head.x;
      if (head.z < B.minZ + m) dz = B.minZ + m - head.z; else if (head.z > B.maxZ - m) dz = B.maxZ - m - head.z;
      const t = myTeam();
      if (t >= 0 && V.ph !== 'idle' && V.ph !== 'over') { const s = sgn(t); if (head.x * s < 0.35) dx = s * 0.35 - head.x; }
      return [dx, dz];
    };
    L.rowFor = (st, isMe) => { const w = isMe ? (V.wins || 0) : st.vw ? st.vw[0] : 0; return { best: w, text: `${w} match${w === 1 ? '' : 'es'} won` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.6, 1.66, 10.5, 1.9, 0, -Math.PI / 2);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#1a2a4a'; g.fillRect(0, 0, W, 460);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Matches won', 36, 80);
      g.fillStyle = '#c8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Pass, set, spike. First to 15, win by 2', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 10.5, 4.5, -Math.PI / 2);
    RECORDS.def(L, [{ k: 'rally', label: 'Longest rally (touches)' }, { k: 'margin', label: 'Biggest win (points)' }]);
    L.hudActions = [
      { label: () => (V.ph === 'idle' || V.ph === 'over' ? 'Start match' : 'Restart'), run: () => { if (isHost()) startMatch(); else requestStart(); } },
      { label: () => `Teams: ${V.solo ? '1 v 1' : '2 v 2'} ▸`, run: () => setSolo(!V.solo) },
      { label: () => `Bots: ${LEVELS[V.lv].name} ▸`, run: () => { if (!isHost()) { showToast('The first player in the room picks the bots'); return; } V.lv = (V.lv + 1) % LEVELS.length; forcePresence(); state.hudDirty = true; } },
    ];
    // one on one or two on two: the first player in the room picks, between matches
    function setSolo(on) {
      if (!isHost()) { showToast('The first player in the room picks 1 v 1 or 2 v 2'); return; }
      if (V.ph !== 'idle' && V.ph !== 'over') { showToast('Switch between matches (or Restart first)'); return; }
      V.solo = on; setCourt(on); assignPeople();
      for (let s = 0; s < 4; s++) { P[s].x = sgn(teamOf(s)) * (on ? 3.5 : 4); P[s].z = on ? 0 : s % 2 ? 2 : -2; }
      drawScore.key = ''; state.hudDirty = true; forcePresence();
      showToast(on ? 'One on one: a smaller court, and you play every touch (a pass up to the net, then over)' : 'Two on two');
      sfx('click', 0.7);
    }
    L.setSolo = setSolo;
    // buttons on the sand beside the court (for VR): 1 v 1 or 2 v 2, the bots, and start
    makeButton(L, new V3(-3.2, 1.0, 5.4), 0x4fc3f7, '1 v 1 / 2 v 2', () => setSolo(!V.solo), { faceYaw: Math.PI });
    makeButton(L, new V3(-2.2, 1.0, 5.4), 0xffd23f, 'Start match', () => { if (V.ph === 'idle' || V.ph === 'over') requestStart(); else if (isHost()) startMatch(); }, { faceYaw: Math.PI });
    makeButton(L, new V3(-1.2, 1.0, 5.4), 0xff9a5a, 'Bots: easy / pro', () => { if (!isHost()) { showToast('The first player in the room picks the bots'); return; } V.lv = (V.lv + 1) % LEVELS.length; showToast(`Bots: ${LEVELS[V.lv].name}`); forcePresence(); state.hudDirty = true; }, { faceYaw: Math.PI });
    L.hints = [['A / X', 'start a match, then jump'], ['Jump at the net', 'hands up to block their spike'], ['Bump or set', 'just get your hands to the ball'], ['Spike', 'swing hard at a high ball by the net'], ['White ring', 'where the ball is coming down']];
    L.hintsFor = () => (state.mode === 'flat' ? [['WASD', 'move (Shift runs)'], ['Walk under the ball', 'to play it'], ['Hold Space', 'to spike, aimed where you look'], ['J at the net', 'jump to block their spike']] : L.hints);
    L.spawn = () => { dolly.position.set(-4, 0, 1); if (state.mode !== 'vr') { state.yaw = -Math.PI / 2; state.pitch = 0; } };
    L.onEnter = () => { drawScore.key = ''; ME.claim = null; seenMsg = -1; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; marker.visible = false; if (isHost() && V.ph !== 'over') V.ph = 'idle'; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.4; camera.position.set(Math.sin(a) * 6, 4, 11); camera.lookAt(0, 1.5, 0); };
    L.vbInternals = { V, P, ME, setSolo, setCourt, teamSlots, touchKind, court: () => [HX, HZ], startMatch, newServe, applyHit, shotVel, ballStep, botStep, hostStep, myTouch, predict, overNet, inCourt, snapshot, applySnap, validSnap, assignPeople, LEVELS };
    MUSIC_THEMES.volleyball = { gain: 0.7, bpm: 112, swing: 0.15, chords: ['C', 'F', 'G', 'F'], comp: { inst: 'guitar', at: [0, 3, 6, 10, 12], dur: 0.15 }, bass: { at: [0, 6, 8, 14] }, drums: { k: 'x.....x...x.....', s: '....x.......x...', h: '..o...o...o...o.' }, lead: { inst: 'vibes', p: 0.25, up: 12 }, cut: 4200 };
    return L;
  })();
