  // ================================================================ THE D20
  // A chunky twenty-sided die on the coffee table in the lounge. Grab it and throw it: it tumbles, rolls and settles on a
  // face, and whatever is on top is your roll. Opposite faces add up to 21, like a real die. The thrower's page decides
  // the result and everyone else's die turns to show the same number.
  const d20 = ((L) => {
    const G = L.group;
    const R_C = 0.107, R_IN = R_C * 0.7947;               // corner radius, and the radius of the ball it rolls like
    const TABLE = { x0: -7.8, x1: -6.2, z0: 5.35, z1: 6.25, top: 0.412 };   // the lounge's coffee table, with a felt mat on it
    addBox(G, 0.64, 0.012, 0.48, lam(0x1f6a3f), -6.62, 0.406, 5.8);
    makePlate(G, 'Roll the D20', 0.8, 0.14, new V3(-6.62, 0.2, 6.265), 0, { bg: '#2b2260', fg: '#ffd23f', size: 0.62 });
    const UP = new V3(0, 1, 0);

    // ---------------------------------------------------------------- the die: twenty faces, numbered like a real one
    const geo = new THREE.IcosahedronGeometry(R_C, 0);
    const pos = geo.attributes.position, uvA = geo.attributes.uv;
    const faces = [];
    for (let f = 0; f < 20; f++) {
      const a = new V3().fromBufferAttribute(pos, 3 * f), b = new V3().fromBufferAttribute(pos, 3 * f + 1), c = new V3().fromBufferAttribute(pos, 3 * f + 2);
      const n = new V3().subVectors(b, a).cross(new V3().subVectors(c, a)).normalize();
      const swap = n.dot(new V3().add(a).add(b).add(c)) < 0;      // a face wound the other way round
      if (swap) n.negate();
      faces.push({ n, swap, num: 0 });
    }
    const rng = mulberry32(2020);
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    for (let f = 0; f < 20; f++) {
      if (faces[f].num) continue;
      let best = -1, bd = 2;
      for (let j = 0; j < 20; j++) if (j !== f && !faces[j].num) { const d = faces[f].n.dot(faces[j].n); if (d < bd) { bd = d; best = j; } }
      const k = pool.pop();
      faces[f].num = k; faces[best].num = 21 - k;            // opposite faces add up to 21
    }
    const CELL = 128, TW = 640, TH = 512;
    const atlas = canvasTexture(TW, TH, (g) => {
      g.fillStyle = '#1d1748'; g.fillRect(0, 0, TW, TH);
      for (let f = 0; f < 20; f++) {
        const ox = (f % 5) * CELL, oy = Math.floor(f / 5) * CELL;
        g.beginPath(); g.moveTo(ox + 64, oy + 12); g.lineTo(ox + 10, oy + 116); g.lineTo(ox + 118, oy + 116); g.closePath();
        g.fillStyle = '#4636a6'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#8f80ff'; g.stroke();
        const num = faces[f].num, txt = String(num) + (num === 6 || num === 9 ? '.' : '');
        g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `800 ${num > 9 ? 44 : 56}px ${DISPLAY}`;
        g.fillText(txt, ox + 64, oy + 84, 80);
      }
    }).tex;
    // each face's three corners go to its own triangle in the atlas, apex up so the numeral reads upright
    for (let f = 0; f < 20; f++) {
      const ox = (f % 5) * CELL, oy = Math.floor(f / 5) * CELL;
      const P = [[ox + 64, oy + 12], [ox + 10, oy + 116], [ox + 118, oy + 116]];
      const order = faces[f].swap ? [0, 2, 1] : [0, 1, 2];
      for (let k = 0; k < 3; k++) { const p = P[order[k]]; uvA.setXY(3 * f + k, p[0] / TW, 1 - p[1] / TH); }
    }
    uvA.needsUpdate = true;
    L.d20Faces = faces;

    // ---------------------------------------------------------------- the body: it rolls like a ball and we handle the turning
    const SLOT = new V3(-6.62, TABLE.top + R_IN, 5.8);
    const die = makeBody(L, { geo, tex: atlas, r: R_IN, slot: SLOT });
    die.gs = 1; die.ad = 0.04; die.d20 = true;
    const _ax = new V3(), _wn = new V3(), _q = new Q4();
    const faceUp = (i, out) => out.copy(faces[i].n).applyQuaternion(die.mesh.quaternion);
    function orientFaceUp(i) { faceUp(i, _wn); _q.setFromUnitVectors(_wn, UP); die.mesh.quaternion.premultiply(_q); }
    orientFaceUp(faces.findIndex((f) => f.num === 20));
    const D = { b: die, wasHeld: false, rolled: false, rest: 0, settled: true, settledT: 0, spin: new V3(), anim: null, wantN: 0, n: 20, pub: null, seq: 0, labelUntil: 0, last: 0 };
    L.d20 = D;
    const onTable = (b) => b.pos.x > TABLE.x0 - 0.02 && b.pos.x < TABLE.x1 + 0.02 && b.pos.z > TABLE.z0 - 0.02 && b.pos.z < TABLE.z1 + 0.02 && b.pos.y > 0.25;

    // a floating number over the die when it lands
    const labelC = canvasTexture(256, 128);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelC.tex, transparent: true, depthWrite: false, depthTest: false }));
    label.scale.set(0.5, 0.25, 1); label.renderOrder = 30; label.visible = false; G.add(label);
    function showResult(n, who) {
      const g = labelC.g;
      g.clearRect(0, 0, 256, 128);
      rr(g, 6, 6, 244, 116, 40); g.fillStyle = n === 20 ? 'rgba(90,60,0,0.92)' : n === 1 ? 'rgba(90,10,20,0.92)' : 'rgba(20,16,50,0.9)'; g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = n === 20 ? '#ffd23f' : n === 1 ? '#ff6a7a' : '#ffffff'; g.font = `800 ${n === 20 || n === 1 ? 64 : 76}px ${DISPLAY}`;
      g.fillText(String(n), 128, n === 20 || n === 1 ? 52 : 66);
      if (n === 20 || n === 1) { g.font = `700 24px ${BODY}`; g.fillText(n === 20 ? 'NATURAL 20!' : 'CRITICAL FAIL', 128, 100); }
      labelC.tex.needsUpdate = true;
      D.labelUntil = performance.now() + 4500; D.n = n;
      showToast(`${who === state.name ? 'You rolled' : who + ' rolled'} a ${n}${n === 20 ? ': natural 20!' : n === 1 ? '. Ouch.' : ''}`);
      if (n === 20) { sfx('fanfare', 0.7); sfx('cheer', 0.6); } else if (n === 1) sfx('buzzer', 0.5); else tone(600 + n * 25, 0, 0.12, 'sine', 0.12);
    }

    // ---------------------------------------------------------------- tumbling, rolling, settling
    function beginSettle(now) {
      let best = 0, by = -2;
      if (D.wantN) best = faces.findIndex((f) => f.num === D.wantN);
      else for (let i = 0; i < 20; i++) { faceUp(i, _wn); if (_wn.y > by) { by = _wn.y; best = i; } }
      die.vel.x = 0; die.vel.z = 0;            // it stops creeping while it turns onto its face
      faceUp(best, _wn); _q.setFromUnitVectors(_wn, UP);
      D.anim = { from: die.mesh.quaternion.clone(), to: _q.clone().multiply(die.mesh.quaternion), t: 0, face: best };
    }
    function dieFrame(b, dt, now) {
      if (b.held) { D.wasHeld = true; D.settled = false; D.rest = 0; D.anim = null; D.wantN = 0; return; }
      if (D.wasHeld) {
        // let go: it tumbles, harder for a harder throw
        D.wasHeld = false; D.rolled = true; D.settled = false; D.anim = null;
        const sp = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
        D.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(5 + sp * 2.4);
      }
      // a settled die that gets nudged and ends up tilted turns itself flat again
      if (D.settled && !D.anim && D.rolled && !b.sleeping && Math.hypot(b.vel.x, b.vel.z) < 0.2) {
        let top = -2; for (let i = 0; i < 20; i++) { faceUp(i, _wn); if (_wn.y > top) top = _wn.y; }
        if (top < 0.995) { D.settled = false; D.rest = 0.3; }
      }
      if (!D.rolled) {
        // someone else threw it: it tumbles on our screen too, then settles (and is corrected to their result)
        if (!b.sleeping && Math.hypot(b.vel.x, b.vel.y, b.vel.z) > 0.8 && b.owner !== state.myPeer) {
          D.rolled = true; D.settled = false; D.anim = null;
          D.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(6);
        } else return;
      }
      const supY = onTable(b) ? TABLE.top + b.r : b.r;
      const supported = Math.abs(b.pos.y - supY) < 0.03 && Math.abs(b.vel.y) < 0.7;
      if (!supported) { const w = D.spin.length(); if (w > 0.01) { _ax.copy(D.spin).multiplyScalar(1 / w); b.mesh.rotateOnWorldAxis(_ax, w * dt); } D.spin.multiplyScalar(Math.max(0, 1 - 0.3 * dt)); }
      else D.spin.multiplyScalar(Math.max(0, 1 - 7 * dt));
      const speed = Math.hypot(b.vel.x, b.vel.z);
      if (!D.settled && !D.anim) {
        if (supported && speed < 0.15) { D.rest += dt; if (D.rest > 0.3 || b.sleeping) beginSettle(now); } else D.rest = 0;
      }
      if (D.anim) {
        D.anim.t += dt / 0.4;
        const k = Math.min(1, D.anim.t), e = 1 - (1 - k) * (1 - k);
        b.mesh.quaternion.slerpQuaternions(D.anim.from, D.anim.to, e);
        if (k >= 1) {
          const n = faces[D.anim.face].num;
          D.anim = null; D.settled = true; D.settledT = now; D.wantN = 0; D.spin.set(0, 0, 0);
          b.vel.set(0, 0, 0); b.sleeping = true; b.restT = 0;     // and it stays put, face up
          if (b.owner === state.myPeer) { D.pub = { n, seq: ++D.seq, t: now }; showResult(n, state.name); forcePresence(); }
          else D.n = n;
        }
      }
    }
    const baseOBF = L.onBodyFrame || (() => {});
    L.onBodyFrame = (b, dt, now) => { baseOBF(b, dt, now); if (b.d20) dieFrame(b, dt, now); };

    // ---------------------------------------------------------------- the coffee table is solid for it, and a die doesn't bounce like a ball
    const baseCollide = L.collide;
    L.collide = (b, h) => {
      let sup = baseCollide(b, h);
      if (!b.d20) return sup;
      const x0 = TABLE.x0 - b.r, x1 = TABLE.x1 + b.r, z0 = TABLE.z0 - b.r, z1 = TABLE.z1 + b.r;
      if (b.pos.x > x0 && b.pos.x < x1 && b.pos.z > z0 && b.pos.z < z1 && b.pos.y < TABLE.top + b.r && b.pos.y > 0.12) {
        const dTop = TABLE.top + b.r - b.pos.y, dl = b.pos.x - x0, dr = x1 - b.pos.x, dn = b.pos.z - z0, df = z1 - b.pos.z, m = Math.min(dTop, dl, dr, dn, df);
        if (m === dTop) { b.pos.y = TABLE.top + b.r; if (b.vel.y < 0) b.vel.y *= -0.35; sup = true; }
        else if (m === dl) { b.pos.x = x0; if (b.vel.x > 0) b.vel.x *= -0.3; }
        else if (m === dr) { b.pos.x = x1; if (b.vel.x < 0) b.vel.x *= -0.3; }
        else if (m === dn) { b.pos.z = z0; if (b.vel.z > 0) b.vel.z *= -0.3; }
        else { b.pos.z = z1; if (b.vel.z < 0) b.vel.z *= -0.3; }
      }
      const prev = b.dPrevVy || 0;
      if (prev < -0.5 && b.vel.y > 0) {          // it just hit something: a dull clack and less bounce than a ball
        b.vel.y *= 0.55; b.vel.x *= 0.88; b.vel.z *= 0.88;
        if (Math.abs(prev) > 1) tone(1000 + Math.random() * 500, 520, 0.035, 'triangle', Math.min(0.28, -prev * 0.05) / (1 + b.pos.distanceTo(myHead.pos) * 0.15));
      }
      if (sup || b.pos.y <= b.r + 0.004) { b.vel.x *= Math.max(0, 1 - 2.2 * h); b.vel.z *= Math.max(0, 1 - 2.2 * h); }
      b.dPrevVy = b.vel.y;
      return sup || b.pos.y <= b.r + 0.004;
    };

    // ---------------------------------------------------------------- per frame, network, hints
    const baseUpdate = L.update;
    L.update = (dt, now) => {
      baseUpdate(dt, now);
      label.visible = now < D.labelUntil && state.level === L.idx;
      if (label.visible) label.position.set(die.pos.x, die.pos.y + 0.3, die.pos.z);
      // a die left lying about goes back on the table after a while
      if (D.settled && D.rolled && !die.held && die.owner === state.myPeer && now - D.settledT > 25000 && die.pos.distanceTo(die.slot) > 0.3) { reclaimToSlot(die); D.rolled = false; sfx('poof', 0.4); }
      if (die.pos.y < -3) { reclaimToSlot(die); D.rolled = false; }
    };
    const baseP = L.presence, baseR = L.readPresence;
    L.presence = () => { const p = baseP ? baseP() : {}; if (D.pub && performance.now() - D.pub.t < 6000) p.dd = [D.pub.n, D.pub.seq]; return p; };
    L.readPresence = (rec, pres, st) => {
      if (baseR) baseR(rec, pres, st);
      const a = pres.dd;
      if (Array.isArray(a) && a.length === 2 && Number.isInteger(a[0]) && a[0] >= 1 && a[0] <= 20 && Number.isInteger(a[1]) && a[1] > (st.ddSeq || 0)) {
        st.ddSeq = a[1];
        if (st.ddInit && state.level === L.idx) {
          // someone else's roll: show it, and turn our die to match if it has already stopped here
          if (D.settled || D.anim) { D.wantN = a[0]; D.anim = null; D.settled = false; D.rest = 0.5; } else D.wantN = a[0];
          showResult(a[0], rec.name);
        }
      }
      st.ddInit = true;
    };
    L.hintsFor = ((base) => () => {
      if (state.mode === 'flat' && die.pos.distanceTo(myHead.pos) < 3 && !state.held) return [['E', 'grab the D20'], ['Space', 'hold, then let go to throw'], ['WASD', 'move']];
      return base ? base() : L.hints;
    })(L.hintsFor);
    L.d20Internals = { faces, die, SLOT, TABLE, beginSettle, showResult, R_IN };
    return D;
  })(hub);

