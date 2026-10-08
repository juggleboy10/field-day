  // ---------------------------------------------------------------- balls (sphere bodies)
  function makeBody(L, o) {
    const mat = new THREE.MeshLambertMaterial({ map: o.tex, emissive: 0x000000 });
    const mesh = new THREE.Mesh(o.geo, mat);
    L.group.add(mesh);
    const b = {
      i: L.bodies.length, L, r: o.r, mesh, mat, shadow: makeShadow(L.group, o.r * 2.6),
      slot: o.slot.clone(), pos: o.slot.clone(), prev: o.slot.clone(), vel: new V3(), corr: new V3(),
      v: 0, owner: null, held: null, sleeping: true, restT: 0, idleT: 0,
      pull: 1, pullFrom: new V3(), throwFrom: new V3(), scored: true, lastSnd: 0, cool: 0, data: {},
    };
    mesh.position.copy(b.pos);
    L.bodies.push(b);
    return b;
  }

  function grab(b, side) {
    b.v += 1;
    b.owner = state.myPeer;
    b.held = { peer: state.myPeer, side };
    b.sleeping = false;
    b.vel.set(0, 0, 0);
    b.corr.set(0, 0, 0);
    b.pull = 0;
    b.pullFrom.copy(b.pos);
    b.scored = false;
    b.data = {};
    b.idleT = 0;
    sfx(b.pos.distanceTo(myHead.pos) > 1.2 ? 'grab' : 'mitt', 0.7);
    forcePresence();
  }
  function release(b, vel) {
    b.held = null;
    b.vel.copy(vel);
    if (b.vel.length() > 30) b.vel.setLength(30);
    b.throwFrom.copy(b.pos);
    b.scored = false;
    b.sleeping = false;
    b.restT = 0;
    b.data = {};
    forcePresence();
  }
  function loseFromMyHand(obj) {
    for (const s of SIDES) if (vrHands[s].holding && vrHands[s].holding.obj === obj) vrHands[s].holding = null;
    if (state.held && state.held.obj === obj) { state.held = null; state.charge = null; ui.power.hidden = true; state.hudDirty = true; }
  }
  function placeAtSlot(b) {
    b.held = null;
    b.pos.copy(b.slot);
    b.vel.set(0, 0, 0);
    b.corr.set(0, 0, 0);
    b.sleeping = true;
    b.restT = 0;
    b.idleT = 0;
    b.scored = true;
    b.data = {};
  }
  function respawnBody(b) {
    if (b.held) loseFromMyHand(b);
    placeAtSlot(b);
    if (b.owner === state.myPeer) forcePresence();
  }
  function reclaimToSlot(b) {
    b.v += 1;
    b.owner = state.myPeer;
    placeAtSlot(b);
    forcePresence();
  }
  function resetBodies(L) {
    for (const b of L.bodies) {
      if (b.held && b.held.peer !== state.myPeer) continue; // never yank a ball out of someone's hand
      if (b.held) loseFromMyHand(b);
      reclaimToSlot(b);
    }
    sfx('reset', 0.9);
  }

  function impact(b, speed, kind) {
    if (speed < 0.8) return;
    const now = performance.now();
    if (now - b.lastSnd < 70) return;
    b.lastSnd = now;
    const d = b.pos.distanceTo(myHead.pos);
    sfx(kind, Math.min(1, speed / 8) / (1 + d * 0.18));
  }
  function collideBox(b, bx) {
    const R = b.r;
    const cx = clamp(b.pos.x, bx.min.x, bx.max.x);
    const cy = clamp(b.pos.y, bx.min.y, bx.max.y);
    const cz = clamp(b.pos.z, bx.min.z, bx.max.z);
    const dx = b.pos.x - cx, dy = b.pos.y - cy, dz = b.pos.z - cz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= R * R) return -1;
    let nx, ny, nz;
    if (d2 < 1e-10) {
      // center ended up inside the box (a fast ball in one step): push back out through the
      // face it most recently crossed, judged by how long ago it would have entered on each axis
      let best = Infinity;
      nx = 0; ny = 1; nz = 0;
      for (const ax of ['x', 'y', 'z']) {
        const v = b.vel[ax];
        const inMin = b.pos[ax] - bx.min[ax], inMax = bx.max[ax] - b.pos[ax];
        const depth = v > 1e-6 ? inMin : v < -1e-6 ? inMax : Math.min(inMin, inMax);
        const t = depth / (Math.abs(v) + 1e-3);
        if (t < best) {
          best = t;
          nx = ny = nz = 0;
          const sgn = v > 1e-6 ? -1 : v < -1e-6 ? 1 : (inMin < inMax ? -1 : 1);
          if (ax === 'x') nx = sgn; else if (ax === 'y') ny = sgn; else nz = sgn;
        }
      }
      if (nx) b.pos.x = nx < 0 ? bx.min.x - R : bx.max.x + R;
      else if (ny) b.pos.y = ny < 0 ? bx.min.y - R : bx.max.y + R;
      else b.pos.z = nz < 0 ? bx.min.z - R : bx.max.z + R;
    } else {
      const d = Math.sqrt(d2);
      nx = dx / d; ny = dy / d; nz = dz / d;
      const push = R - d;
      b.pos.x += nx * push; b.pos.y += ny * push; b.pos.z += nz * push;
    }
    const vn = b.vel.x * nx + b.vel.y * ny + b.vel.z * nz;
    if (vn < 0) {
      impact(b, -vn, bx.kind);
      const e = vn < -0.7 ? bx.e : 0;
      b.vel.x -= (1 + e) * vn * nx;
      b.vel.y -= (1 + e) * vn * ny;
      b.vel.z -= (1 + e) * vn * nz;
    }
    return ny;
  }
  function collidePoint(b, p, minDist, e, kind) {
    const dx = b.pos.x - p.x, dy = b.pos.y - p.y, dz = b.pos.z - p.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= minDist * minDist || d2 < 1e-10) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, push = minDist - d;
    b.pos.x += nx * push; b.pos.y += ny * push; b.pos.z += nz * push;
    const vn = b.vel.x * nx + b.vel.y * ny + b.vel.z * nz;
    if (vn < 0) {
      impact(b, -vn, kind);
      b.vel.x -= (1 + e) * vn * nx;
      b.vel.y -= (1 + e) * vn * ny;
      b.vel.z -= (1 + e) * vn * nz;
    }
  }
  function groundBounce(b, e, keep, kind) {
    if (b.pos.y >= b.r) return false;
    b.pos.y = b.r;
    if (b.vel.y < 0) {
      const vn = b.vel.y;
      impact(b, -vn, kind);
      b.vel.y = vn < -0.7 ? -vn * e : 0;
      // a real bounce scuffs off some speed; a ball that's simply rolling only feels rolling friction
      if (vn < -0.7) { b.vel.x *= keep; b.vel.z *= keep; }
    }
    return true;
  }
  function box(x0, y0, z0, x1, y1, z1, e, kind) {
    return { min: new V3(x0, y0, z0), max: new V3(x1, y1, z1), e, kind };
  }

  function integrate(b, h) {
    if (b.held) return;
    if (b.corr.lengthSq() > 1e-8) {
      const k = Math.min(1, h * 10);
      b.pos.addScaledVector(b.corr, k);
      b.corr.multiplyScalar(1 - k);
    }
    if (b.sleeping) return;
    const L = b.L;
    b.vel.y -= GRAVITY * (b.gs !== undefined ? b.gs : (L.gravityScale || 1)) * h;
    const adrag = b.ad !== undefined ? b.ad : L.airDrag;
    if (adrag) b.vel.multiplyScalar(Math.max(0, 1 - adrag * h));
    if (L.drag && b.data.batted) {
      const sp = b.vel.length();
      b.vel.multiplyScalar(Math.max(0, 1 - L.drag * sp * h));
    }
    b.pos.addScaledVector(b.vel, h);
    const support = L.collide(b, h);
    if (support) {
      const roll = L.rollFriction || 1.1;
      b.vel.x *= 1 - roll * h;
      b.vel.z *= 1 - roll * h;
      // some surfaces also slow a rolling ball by a steady amount, the way grass and dirt do
      if (L.rollDecel) {
        const sp = Math.hypot(b.vel.x, b.vel.z);
        if (sp > 1e-4) { const k = Math.max(0, sp - L.rollDecel * h) / sp; b.vel.x *= k; b.vel.z *= k; }
      }
      if (b.vel.lengthSq() < 0.02) {
        b.restT += h;
        if (b.restT > 0.35) { b.sleeping = true; b.vel.set(0, 0, 0); }
      } else b.restT = 0;
    } else b.restT = 0;
    if (!Number.isFinite(b.pos.x + b.pos.y + b.pos.z) || b.pos.y < -5 || Math.abs(b.pos.x) > 400 || Math.abs(b.pos.z) > 400) respawnBody(b);
  }

  const _n = new V3();
  function collideBodies(L) {
    const bs = L.bodies;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j];
        const aFixed = !!a.held, bFixed = !!b.held;
        if (aFixed && bFixed) continue;
        if (a.sleeping && b.sleeping) continue;
        const min = a.r + b.r;
        _n.subVectors(b.pos, a.pos);
        const d2 = _n.lengthSq();
        if (d2 >= min * min || d2 < 1e-10) continue;
        const d = Math.sqrt(d2);
        _n.multiplyScalar(1 / d);
        const overlap = min - d;
        if (aFixed) b.pos.addScaledVector(_n, overlap);
        else if (bFixed) a.pos.addScaledVector(_n, -overlap);
        else { a.pos.addScaledVector(_n, -overlap / 2); b.pos.addScaledVector(_n, overlap / 2); }
        const rv = (b.vel.x - a.vel.x) * _n.x + (b.vel.y - a.vel.y) * _n.y + (b.vel.z - a.vel.z) * _n.z;
        if (rv < 0) {
          const e = L.bodyBounce !== undefined ? L.bodyBounce : 0.8;      // bean bags barely bounce off each other
          if (aFixed) b.vel.addScaledVector(_n, -(1 + e) * rv);
          else if (bFixed) a.vel.addScaledVector(_n, (1 + e) * rv);
          else {
            const jmp = -(1 + e) * rv / 2;
            a.vel.addScaledVector(_n, -jmp);
            b.vel.addScaledVector(_n, jmp);
          }
          impact(aFixed ? b : a, -rv, 'ball');
        }
        if (!aFixed) { a.sleeping = false; a.restT = 0; }
        if (!bFixed) { b.sleeping = false; b.restT = 0; }
      }
    }
  }

  function heldTarget(b, out) {
    if (b.held.peer === state.myPeer) {
      const h = myHands[b.held.side];
      if (!h.ok) return false;
      holdPoint(h.pos, h.quat, out);
      return true;
    }
    const p = remoteHandPose(b.held.peer, b.held.side);
    if (!p) return false;
    holdPoint(p.pos, p.quat, out);
    return true;
  }

  // ---------------------------------------------------------------- bats (tools that live in a rack)
  const myRays = { left: Object.assign(pose(), { ok: false }), right: Object.assign(pose(), { ok: false }) };
  // weapons you aim with your controller's laser rather than its grip
  const RAY_AIM = new Set(['crossbow', 'pistol', 'scatter', 'rail', 'plasma', 'wand']);
  function makeTool(L, rackPos, rackQuat, kind) {
    const g = new THREE.Group();
    const k = kind || 'bat';
    if (k === 'sword') g.add(makeSwordMesh());
    else if (k === 'crossbow') g.add(makeCrossbowMesh());
    else if (TOOL_MESH[k]) g.add(TOOL_MESH[k]());
    else g.add(new THREE.Mesh(batGeo, batMat));
    L.group.add(g);
    const t = {
      kind: k, sticky: true, mats: k === 'bat' ? null : g.children[0].userData.mats,
      i: L.tools.length, L, g, rackPos: rackPos.clone(), rackQuat: rackQuat.clone(),
      v: 0, owner: null, held: null, hitR: BAT.hitR,
      prevA: new V3(), prevB: new V3(), curA: new V3(), curB: new V3(), hasPrev: false,
      pos: new V3(), quat: new Q4(),
    };
    L.tools.push(t);
    return t;
  }
  function grabTool(t, side) {
    t.v += 1;
    t.owner = state.myPeer;
    t.held = { peer: state.myPeer, side };
    t.hasPrev = false;
    t.hitR = state.mode === 'vr' ? BAT.hitR : BAT.deskHitR;
    sfx('grab', 0.8);
    forcePresence();
  }
  function dropTool(t) {
    t.held = null;
    t.hasPrev = false;
    forcePresence();
  }
  const _ax = new V3();
  function updateTools(L, dt) {
    for (const t of L.tools) {
      let ok = false;
      if (t.held) {
        if (t.held.peer === state.myPeer) {
          const h = myHands[t.held.side], ray = myRays[t.held.side];
          // a crossbow points where your controller's laser points
          if (RAY_AIM.has(t.kind) && state.mode === 'vr' && ray.ok) { t.pos.copy(ray.pos); t.quat.copy(ray.quat); ok = true; }
          else if (h.ok) { t.pos.copy(h.pos); t.quat.copy(h.quat); ok = true; }
        } else {
          const p = remoteHandPose(t.held.peer, t.held.side);
          if (p) { t.pos.copy(p.pos); t.quat.copy(p.quat); ok = true; }
        }
      }
      if (!ok) { t.pos.copy(t.rackPos); t.quat.copy(t.rackQuat); }
      t.g.position.copy(t.pos);
      t.g.quaternion.copy(t.quat);
      if (t.held && t.held.peer === state.myPeer && ok && t.kind === 'bat') {
        _ax.set(0, 0, -1).applyQuaternion(t.quat);
        if (t.hasPrev) { t.prevA.copy(t.curA); t.prevB.copy(t.curB); }
        t.curA.copy(t.pos).addScaledVector(_ax, BAT.zone0);
        t.curB.copy(t.pos).addScaledVector(_ax, BAT.tip);
        if (!t.hasPrev) { t.prevA.copy(t.curA); t.prevB.copy(t.curB); t.hasPrev = true; }
      } else t.hasPrev = false;
    }
  }

  const _A = new V3(), _B = new V3(), _AB = new V3(), _AP = new V3(), _C = new V3();
  const _vA = new V3(), _vB = new V3(), _vbat = new V3(), _vrel = new V3(), _nn = new V3(), _vt = new V3();
  function batCollide(t, b, frac, dtFrame, now) {
    _A.lerpVectors(t.prevA, t.curA, frac);
    _B.lerpVectors(t.prevB, t.curB, frac);
    _AB.subVectors(_B, _A);
    const len2 = _AB.lengthSq();
    if (len2 < 1e-8) return;
    _AP.subVectors(b.pos, _A);
    const u = clamp(_AP.dot(_AB) / len2, 0, 1);
    _C.copy(_A).addScaledVector(_AB, u);
    _nn.subVectors(b.pos, _C);
    const d = _nn.length(), R = b.r + t.hitR;
    if (d >= R || d < 1e-6) return;
    _nn.multiplyScalar(1 / d);
    const inv = 1 / Math.max(dtFrame, 1 / 240);
    _vA.subVectors(t.curA, t.prevA).multiplyScalar(inv);
    _vB.subVectors(t.curB, t.prevB).multiplyScalar(inv);
    _vbat.lerpVectors(_vA, _vB, u);
    _vrel.subVectors(b.vel, _vbat);
    const vn = _vrel.dot(_nn);
    b.pos.copy(_C).addScaledVector(_nn, R + 0.001);
    if (vn >= 0) return;
    _vt.copy(_vrel).addScaledVector(_nn, -vn).multiplyScalar(0.85);
    b.vel.copy(_vbat).add(_vt).addScaledVector(_nn, -0.5 * vn);
    if (b.vel.length() > 55) b.vel.setLength(55);
    b.cool = now + 150;
    b.v += 1;
    b.owner = state.myPeer;
    b.sleeping = false;
    b.restT = 0;
    b.idleT = 0;
    b.throwFrom.copy(b.pos);
    b.scored = false;
    b.data = { batted: true, hitFrom: b.pos.clone(), landed: false, hr: false };
    sfx('bat', clamp(-vn / 25, 0.25, 1));
    if (state.mode === 'vr') haptic(vrHands[t.held.side], 0.9, 45);
    forcePresence();
    if (b.L.onBatHit) b.L.onBatHit(b, -vn);
  }

  const _held = new V3(), _axis = new V3();
  function updateBodies(L, dt, now) {
    for (const b of L.bodies) {
      b.prev.copy(b.pos);
      if (!b.held) continue;
      if (heldTarget(b, _held)) {
        if (b.pull < 1) {
          b.pull = Math.min(1, b.pull + dt / 0.16);
          const s = b.pull * b.pull * (3 - 2 * b.pull);
          b.pos.lerpVectors(b.pullFrom, _held, s);
        } else b.pos.copy(_held);
      }
      b.vel.set(0, 0, 0);
    }
    updateTools(L, dt);
    const bats = L.tools.filter((t) => t.kind === 'bat' && t.held && t.held.peer === state.myPeer && t.hasPrev && !(state.mode === 'flat' && t.noHit));
    // a moving bat and a pitch can close at 30+ m/s, so step much finer while a bat is in play
    const steps = Math.max(1, Math.ceil(dt * (bats.length ? 600 : 120)));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (const b of L.bodies) integrate(b, h);
      if (bats.length) {
        for (const t of bats) for (const b of L.bodies) if (!b.held && now >= b.cool) batCollide(t, b, (s + 1) / steps, dt, now);
      }
      collideBodies(L);
    }
    const lt = vrHands.left.target, rt = vrHands.right.target;
    for (const b of L.bodies) {
      L.onBodyFrame(b, dt, now);
      const sp = Math.hypot(b.vel.x, b.vel.z);
      if (!b.held && !b.sleeping && sp > 0.02) {
        _axis.set(b.vel.z / sp, 0, -b.vel.x / sp);
        b.mesh.rotateOnWorldAxis(_axis, sp * dt / b.r);
      }
      b.mesh.position.copy(b.pos);
      const targeted = (state.mode === 'flat' && state.flatTarget && state.flatTarget.obj === b)
        || (state.mode === 'vr' && ((lt && lt.obj === b) || (rt && rt.obj === b)));
      b.mat.emissive.setHex(targeted ? 0x5a2a00 : 0x000000);
      const ground = L.groundAt ? L.groundAt(b) : 0;
      const hgt = Math.max(0, b.pos.y - b.r - ground);
      b.shadow.position.set(b.pos.x, ground + 0.004, b.pos.z);
      b.shadow.scale.setScalar(b.r * 2.6 + hgt * 0.08);
      b.shadow.material.opacity = Math.max(0.06, 0.5 - hgt * 0.1);
    }
    for (const t of L.tools) {
      const targeted = (state.mode === 'flat' && state.flatTarget && state.flatTarget.obj === t)
        || (state.mode === 'vr' && ((lt && lt.obj === t) || (rt && rt.obj === t)));
      if (t.kind === 'bat') t.g.children[0].material = targeted ? batHiMat : batMat;
      else for (const m of t.mats) m.emissive.setHex(targeted ? 0x5a2a00 : 0x000000);
    }
  }
  const batHiMat = new THREE.MeshLambertMaterial({ color: 0xc89a5b, emissive: 0x5a2a00 });

