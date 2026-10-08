  // ---------------------------------------------------------------- multiplayer (room presence)
  const poseArr = (p, q) => [r3(p.x), r3(p.y), r3(p.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w)];
  function buildPresence() {
    const L = curLevel();
    const inGame = state.mode !== 'menu';
    const p = { n: state.name, c: state.colorIdx, a: [state.hat, state.face, state.shirt, state.shirtColor], p: inGame ? 1 : 0, lv: state.level, h: null, l: null, r: null, b: [], t: [], s: null, bb: null, dg: null, d: null, dq: null, hx: null, sh: null, pc: null, dr: null, dh: null, lq: null, ls: null, lh: null, sq: null, mq: null, mb: null, bo: null, bp: null, bw: null, ka: null };
    if (inGame) {
      const over = L.publishPose ? L.publishPose() : null;
      if (over) {
        p.h = poseArr(over.h[0], over.h[1]); p.l = poseArr(over.l[0], over.l[1]); p.r = poseArr(over.r[0], over.r[1]);
      } else {
        p.h = poseArr(myHead.pos, myHead.quat);
        if (myHands.left.ok) p.l = poseArr(myHands.left.pos, myHands.left.quat);
        if (myHands.right.ok) p.r = poseArr(myHands.right.pos, myHands.right.quat);
      }
    }
    for (const b of L.bodies) {
      if (b.owner !== state.myPeer) continue;
      const held = b.held ? (b.held.side === 'left' ? 1 : 2) : 0;
      const c = [b.i, b.v, held, r3(b.pos.x), r3(b.pos.y), r3(b.pos.z), r3(b.vel.x), r3(b.vel.y), r3(b.vel.z)];
      if (L.drag) c.push(b.data.batted ? 1 : 0);
      p.b.push(c);
    }
    for (const t of L.tools) {
      if (t.owner !== state.myPeer) continue;
      p.t.push([t.i, t.v, t.held ? (t.held.side === 'left' ? 1 : 2) : 0]);
    }
    Object.assign(p, L.presence());
    return p;
  }
  function netTick(now) {
    const room = state.room;
    if (!room) return;
    const interval = state.mode === 'menu' ? 400 : 50;
    const since = now - state.presenceT;
    if (since < 35 || (!state.presenceDue && since < interval)) return;
    state.presenceT = now;
    state.presenceDue = false;
    const p = buildPresence();
    // presence updates are merged into what we sent before, so clear anything we've stopped sending
    // (otherwise old game state lingers for everyone and keeps growing as you visit games)
    if (state.lastKeys) for (const k of state.lastKeys) if (!(k in p)) p[k] = null;
    const json = JSON.stringify(p);
    if (json === state.lastPresence) return;
    state.lastPresence = json;
    state.lastKeys = Object.keys(p).filter((k) => p[k] !== null);
    room.presence(p).catch(onRoomError);
  }
  function setMyPeer(id) {
    if (id === state.myPeer) return;
    for (const L of LEVELS) {
      for (const o of L.bodies.concat(L.tools)) {
        if (o.owner === state.myPeer) o.owner = id;
        if (o.held && o.held.peer === state.myPeer) o.held.peer = id;
      }
    }
    state.myPeer = id;
    forcePresence();
  }
  function applyPeer(peer) {
    const pres = peer.presence || {};
    const rec = remotes.get(peer.peer) || createRemote(peer.peer);
    const name = cleanName(pres.n) || 'Player';
    const ci = Number.isInteger(pres.c) && pres.c >= 0 && pres.c < PLAYER_COLORS.length ? pres.c : 0;
    if (name !== rec.name || ci !== rec.colorIdx) {
      rec.name = name;
      rec.colorIdx = ci;
      const col = PLAYER_COLORS[ci].hex;
      rec.mat.color.set(col);
      drawTag(rec.tagC.g, name, col);
      rec.tagC.tex.needsUpdate = true;
      state.dirtyBoard = true;
    }
    rec.pres = pres;
    const look = Array.isArray(pres.a) ? pres.a : [];
    const pick = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);
    setLook(rec, pick(look[0], HATS.length), pick(look[1], FACES.length), pick(look[2], SHIRTS.length), pick(look[3], SHIRT_COLORS.length));
    const wasHere = rec.lv === state.level, wasIn = rec.inGame;
    rec.inGame = pres.p === 1;
    rec.lv = Number.isInteger(pres.lv) && pres.lv >= 0 && pres.lv < LEVELS.length ? pres.lv : 0;
    if (wasHere && rec.lv !== state.level) { adoptFrom(rec.peer, curLevel(), state.lastPeers); rec.lvState = {}; }
    if (wasIn !== rec.inGame || wasHere !== (rec.lv === state.level)) state.dirtyBoard = true;
    const had = { h: rec.hasH, l: rec.hasL, r: rec.hasR };
    rec.hasH = readPose(pres.h, rec.tgt.h);
    rec.hasL = readPose(pres.l, rec.tgt.l);
    rec.hasR = readPose(pres.r, rec.tgt.r);
    for (const k of ['h', 'l', 'r']) {
      const has = k === 'h' ? rec.hasH : k === 'l' ? rec.hasL : rec.hasR;
      if (has && (!had[k] || !wasIn || !wasHere)) { rec.cur[k].pos.copy(rec.tgt[k].pos); rec.cur[k].quat.copy(rec.tgt[k].quat); }
    }
    if (rec.lv !== state.level) return;
    const L = curLevel();
    const st = rec.lvState[L.id] || (rec.lvState[L.id] = {});
    L.readPresence(rec, pres, st);
    if (Array.isArray(pres.b)) for (const c of pres.b.slice(0, L.bodies.length)) applyClaim(peer.peer, c, L);
    if (Array.isArray(pres.t)) for (const c of pres.t.slice(0, L.tools.length)) applyToolClaim(peer.peer, c, L);
  }
  function removeRemote(peerId, peersNow) {
    const rec = remotes.get(peerId);
    if (rec) {
      if (rec.lv === state.level) adoptFrom(peerId, curLevel(), peersNow);
      disposeRemote(rec);
      remotes.delete(peerId);
      state.dirtyBoard = true;
    }
    seenPresence.delete(peerId);
  }
  function pollPeers() {
    const room = state.room;
    if (!room) return;
    let list;
    try { list = room.peers(); } catch (e) { return; }
    if (list === state.lastPeers) return;
    state.lastPeers = list;
    const alive = new Set();
    for (const p of list) {
      if (p.sameTab) { if (p.peer !== state.myPeer) setMyPeer(p.peer); continue; }
      if (p.kind !== 'viewer') continue;
      alive.add(p.peer);
      if (seenPresence.get(p.peer) !== p.presence) {
        seenPresence.set(p.peer, p.presence);
        applyPeer(p);
      }
    }
    for (const id of Array.from(remotes.keys())) if (!alive.has(id)) removeRemote(id, list);
    updateNetUI();
  }
  function onRoomError(e) { if (e && TERMINAL.includes(e.code)) goSolo(); }
  function goSolo() {
    state.room = null;
    state.net = 'solo';
    state.lastPeers = null;
    for (const rec of remotes.values()) disposeRemote(rec);
    remotes.clear();
    seenPresence.clear();
    for (const L of LEVELS) {
      for (const o of L.bodies.concat(L.tools)) if (o.held && o.held.peer !== state.myPeer) o.held = null;
    }
    setMyPeer('solo');
    state.dirtyBoard = true;
    updateNetUI();
  }
  function updateNetUI() {
    if (typeof syncVoiceToggle === 'function') syncVoiceToggle();
    let dataState = state.net, text;
    if (state.net === 'solo') {
      text = state.soloReason === 'offline'
        ? 'Playing solo. Couldn\u2019t reach the multiplayer network; check your connection and reload.'
        : 'Playing solo. Multiplayer isn\u2019t available in this view.';
    }
    else if (state.net === 'connecting' || !state.room || !state.everConnected) { dataState = 'connecting'; text = 'Looking for other players\u2026'; }
    else if (!state.connected && performance.now() - state.discT > 2500) { dataState = 'connecting'; text = 'Reconnecting\u2026'; }
    else {
      let others = 0;
      for (const p of state.lastPeers || []) if (p.kind === 'viewer' && !p.sameTab) others++;
      const where = state.transport === 'p2p' && P2P_ROOM !== 'lobby' ? ` in room \u201c${P2P_ROOM}\u201d` : '';
      text = others === 0
        ? `You\u2019re the only one here${where}. Friends who open this page will join you.`
        : `${others} other ${others === 1 ? 'person' : 'people'} here${where}`;
      if (others === 0 && state.p2pTrouble) text += ' Someone tried to join but couldn\u2019t connect; their network may block direct connections.';
    }
    if (ui.net.dataset.state !== dataState) ui.net.dataset.state = dataState;
    if (ui.netText.textContent !== text) ui.netText.textContent = text;
    updateLevelCounts();
  }
  // Peer-to-peer transport for copies hosted outside Claude. It exposes the same small
  // interface the game uses for Claude's room: presence(), peers(), onPeers(), onConnection().
  const P2P_URL = 'https://cdn.jsdelivr.net/npm/trystero@0.25.4/+esm';
  const P2P_ROOM = (() => {
    let r = '';
    try { r = new URLSearchParams(location.search).get('room') || ''; } catch (e) { /* ignore */ }
    r = r.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
    return r || 'lobby';
  })();
  async function makeP2PRoom() {
    const mod = await import(P2P_URL);
    const selfId = mod.selfId;
    let mine = Object.freeze({});
    const others = new Map();
    const peerListeners = [];
    let snapshot = null;
    const notify = () => { for (const fn of peerListeners) { try { fn(); } catch (e) { /* ignore */ } } };
    const trouble = { count: 0 };
    const room = mod.joinRoom({ appId: `field-day:${location.hostname || 'local'}` }, P2P_ROOM, {
      onJoinError: () => { trouble.count += 1; state.p2pTrouble = true; },
    });
    const act = room.makeAction('pres');
    const sendAll = () => { act.send(mine).catch(() => {}); };
    act.onMessage = (data, ctx) => {
      const id = ctx && ctx.peerId;
      if (typeof id !== 'string' || !data || typeof data !== 'object' || Array.isArray(data)) return;
      let size = 0;
      try { size = JSON.stringify(data).length; } catch (e) { return; }
      if (size > 6000) return;
      others.set(id, { presence: Object.freeze(data), updatedAt: Date.now() });
      snapshot = null;
      notify();
    };
    room.onPeerJoin = (id) => {
      if (!others.has(id)) others.set(id, { presence: Object.freeze({}), updatedAt: Date.now() });
      snapshot = null;
      act.send(mine, { target: id }).catch(() => {});
      if (VOICE.stream) { try { room.addStream(VOICE.stream, { target: id }); } catch (e) { /* ignore */ } }
      notify();
    };
    room.onPeerStream = (stream, id) => voiceAttach(id, stream);
    room.onPeerLeave = (id) => {
      voiceDetach(id);
      others.delete(id);
      snapshot = null;
      notify();
    };
    setInterval(() => { if (others.size) sendAll(); }, 2000);
    window.addEventListener('pagehide', () => { try { room.leave(); } catch (e) { /* ignore */ } });
    return {
      presence(patch) {
        const next = Object.assign({}, mine);
        for (const k of Object.keys(patch)) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
        mine = Object.freeze(next);
        snapshot = null;
        if (others.size) sendAll();
        return Promise.resolve();
      },
      peers() {
        if (!snapshot) {
          const list = [Object.freeze({ peer: selfId, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() })];
          for (const [id, o] of others) list.push(Object.freeze({ peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: o.presence, updatedAt: o.updatedAt }));
          snapshot = Object.freeze(list);
        }
        return snapshot;
      },
      onPeers(fn) { peerListeners.push(fn); return () => {}; },
      onConnection(fn) { setTimeout(() => fn(true), 0); return () => {}; },
      voice: { add: (s) => room.addStream(s), remove: (s) => room.removeStream(s) },
    };
  }

  function attachRoom(room) {
    state.room = room;
    state.net = 'online';
    room.onConnection((c) => {
      if (!c && state.connected) state.discT = performance.now();
      state.connected = c;
      if (c) state.everConnected = true;
      updateNetUI();
    }, onRoomError);
    room.onPeers(() => pollPeers(), onRoomError);
    forcePresence();
    updateNetUI();
  }
  async function initNet() {
    const cl = window.claude;
    if (!cl || typeof cl.use !== 'function') {
      // hosted somewhere else: go peer-to-peer
      state.transport = 'p2p';
      updateNetUI();
      let room = null;
      try { room = await makeP2PRoom(); } catch (e) { room = null; }
      if (!room) { state.soloReason = 'offline'; goSolo(); return; }
      attachRoom(room);
      return;
    }
    state.transport = 'claude';
    let room = null, user = null;
    try { [room, user] = await Promise.all([cl.use('room'), cl.use('user')]); } catch (e) { room = null; }
    if (user && !state.nameEdited) {
      try {
        const me = await user.me();
        const first = cleanName(String((me && me.name) || '').split(' ')[0]);
        if (first && !state.nameEdited) {
          state.name = first;
          ui.name.value = first;
          state.dirtyBoard = true;
          forcePresence();
        }
      } catch (e) { /* name is optional */ }
    }
    if (!room) { goSolo(); return; }
    attachRoom(room);
  }

