  // ---------------------------------------------------------------- ownership claims
  // Each player publishes the balls and bats they last touched. A higher version wins;
  // ties go to the lower peer label, so every page settles on the same owner.
  const _claim = new V3(), _claimV = new V3();
  function applyClaim(owner, c, L) {
    if (!Array.isArray(c) || (c.length !== 9 && c.length !== 10)) return;
    for (let k = 0; k < c.length; k++) if (!finite(c[k])) return;
    const i = c[0], v = c[1], held = c[2];
    if (!Number.isInteger(i) || i < 0 || i >= L.bodies.length || !Number.isInteger(v) || v < 0) return;
    const b = L.bodies[i];
    const newer = v > b.v || (v === b.v && b.owner !== owner && (b.owner === null || owner < b.owner));
    const same = v === b.v && b.owner === owner;
    if (!newer && !same) return;
    if (newer) {
      if (b.held && b.held.peer === state.myPeer) loseFromMyHand(b);
      b.v = v;
      b.owner = owner;
      b.data = { batted: c.length === 10 && c[9] === 1 };
    }
    const side = held === 1 ? 'left' : held === 2 ? 'right' : null;
    if (side) {
      if (!b.held || b.held.peer !== owner || b.held.side !== side) {
        b.held = { peer: owner, side };
        b.pull = 0;
        b.pullFrom.copy(b.pos);
        b.sleeping = false;
        b.corr.set(0, 0, 0);
      }
      return;
    }
    const releasedNow = !!(b.held && b.held.peer === owner);
    b.held = null;
    if (c.length === 10) b.data.batted = c[9] === 1;
    _claim.set(clamp(c[3], -300, 300), clamp(c[4], -5, 80), clamp(c[5], -300, 300));
    _claimV.set(clamp(c[6], -60, 60), clamp(c[7], -60, 60), clamp(c[8], -60, 60));
    if (newer || releasedNow || b.pos.distanceTo(_claim) > 1.0) {
      b.pos.copy(_claim);
      b.vel.copy(_claimV);
      b.corr.set(0, 0, 0);
      b.restT = 0;
      b.sleeping = _claimV.lengthSq() < 1e-6 && !releasedNow && b.pos.y <= b.slot.y + 0.01;
      b.throwFrom.copy(_claim);
    } else {
      b.corr.subVectors(_claim, b.pos);
      if (b.sleeping && _claimV.lengthSq() < 1e-4) {
        if (b.corr.lengthSq() > 0.0004) b.pos.add(b.corr);
        b.corr.set(0, 0, 0);
      } else {
        b.vel.lerp(_claimV, 0.5);
        b.sleeping = false;
      }
    }
  }
  function applyToolClaim(owner, c, L) {
    if (!Array.isArray(c) || c.length !== 3) return;
    const [i, v, held] = c;
    if (!Number.isInteger(i) || i < 0 || i >= L.tools.length || !Number.isInteger(v) || v < 0 || !Number.isInteger(held)) return;
    const t = L.tools[i];
    const newer = v > t.v || (v === t.v && t.owner !== owner && (t.owner === null || owner < t.owner));
    const same = v === t.v && t.owner === owner;
    if (!newer && !same) return;
    if (newer) {
      if (t.held && t.held.peer === state.myPeer) loseFromMyHand(t);
      t.v = v;
      t.owner = owner;
    }
    t.held = held === 1 ? { peer: owner, side: 'left' } : held === 2 ? { peer: owner, side: 'right' } : null;
  }
  // When a player leaves (or walks to another game), the lowest peer label still here adopts their things.
  function adoptFrom(peerId, L, peersNow) {
    const ids = [state.myPeer];
    for (const p of peersNow || []) {
      if (p.kind !== 'viewer' || p.peer === peerId || ids.includes(p.peer)) continue;
      if (p.sameTab || (p.presence && p.presence.lv === L.idx)) ids.push(p.peer);
    }
    ids.sort();
    const leader = ids[0] === state.myPeer;
    for (const b of L.bodies) {
      if (b.owner !== peerId) continue;
      if (b.held && b.held.peer === peerId) { b.held = null; b.vel.set(0, 0, 0); b.sleeping = false; }
      if (leader) { b.v += 1; b.owner = state.myPeer; forcePresence(); }
    }
    for (const t of L.tools) {
      if (t.owner !== peerId) continue;
      if (t.held && t.held.peer === peerId) t.held = null;
      if (leader) { t.v += 1; t.owner = state.myPeer; forcePresence(); }
    }
  }

