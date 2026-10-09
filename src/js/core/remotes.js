  // ---------------------------------------------------------------- remote players
  const remotes = new Map();
  const seenPresence = new Map();
  function drawTag(g, name, colorHex) {
    g.clearRect(0, 0, 256, 64);
    rr(g, 4, 8, 248, 48, 24);
    g.fillStyle = 'rgba(20,18,40,0.75)';
    g.fill();
    g.fillStyle = colorHex;
    g.beginPath(); g.arc(30, 32, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.font = `700 29px ${BODY}`;
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(name, 48, 33, 196);
  }
  function createRemote(peerId) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const dark = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const head = new THREE.Group();
    head.add(new THREE.Mesh(headGeo, mat));
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.scale.set(1.05, 0.55, 0.72);
    visor.position.set(0, 0.012, -0.078);
    head.add(visor);
    const hatSlot = new THREE.Group(), faceSlot = new THREE.Group();
    head.add(hatSlot, faceSlot);
    faceSlot.add(buildFace(0));
    const body = new THREE.Mesh(bodyGeo, dark);
    const vest = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    vest.rotation.x = Math.PI / 2;
    vest.visible = false;
    scene.add(vest);
    const lh = makeHand(mat, 'left'), rh = makeHand(mat, 'right');
    const tagC = canvasTexture(256, 64);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagC.tex, depthWrite: false, transparent: true }));
    tag.scale.set(0.52, 0.13, 1);
    const shadow = makeShadow(scene, 0.55);
    const parts = [head, body, lh, rh, tag, shadow];
    for (const p of parts) { p.visible = false; scene.add(p); }
    const rec = {
      peer: peerId, mat, dark, head, body, lh, rh, tag, tagC, shadow, parts,
      name: '', colorIdx: -1, inGame: false, lv: -1, hasH: false, hasL: false, hasR: false,
      tgt: { h: pose(), l: pose(), r: pose() }, cur: { h: pose(), l: pose(), r: pose() },
      lvState: {}, disc: null, hatSlot, faceSlot, look: [0, 0, 0, 0], vest, blaster: null,
    };
    remotes.set(peerId, rec);
    return rec;
  }
  function disposeRemote(rec) {
    for (const p of rec.parts) scene.remove(p);
    rec.mat.dispose(); rec.dark.dispose();
    rec.tagC.tex.dispose(); rec.tag.material.dispose();
    rec.shadow.material.dispose();
    if (rec.disc) { rec.disc.parent && rec.disc.parent.remove(rec.disc); }
    scene.remove(rec.vest);
    // a player who leaves takes their props with them
    for (const k of ['blaster', 'putter', 'mgBall', 'vrPaddle']) if (rec[k] && rec[k].parent) rec[k].parent.remove(rec[k]);
    if (rec.kayak && rec.kayak.g.parent) rec.kayak.g.parent.remove(rec.kayak.g);
  }
  const inMyLevel = (rec) => rec.inGame && rec.lv === state.level;

  function readPose(a, out) {
    if (!Array.isArray(a) || a.length !== 7) return false;
    for (let i = 0; i < 7; i++) if (!finite(a[i])) return false;
    out.pos.set(clamp(a[0], -300, 300), clamp(a[1], -20, 60), clamp(a[2], -300, 300));
    out.quat.set(a[3], a[4], a[5], a[6]);
    if (out.quat.lengthSq() < 1e-6) out.quat.identity(); else out.quat.normalize();
    return true;
  }

  const _fwd = new V3();
  function updateRemotes(dt) {
    const k = 1 - Math.exp(-dt * 14);
    for (const rec of remotes.values()) {
      const show = inMyLevel(rec) && rec.hasH;
      for (const p of rec.parts) p.visible = show;
      if (!show) continue;
      const cur = rec.cur, tgt = rec.tgt;
      cur.h.pos.lerp(tgt.h.pos, k); cur.h.quat.slerp(tgt.h.quat, k);
      if (rec.hasL) { cur.l.pos.lerp(tgt.l.pos, k); cur.l.quat.slerp(tgt.l.quat, k); }
      if (rec.hasR) { cur.r.pos.lerp(tgt.r.pos, k); cur.r.quat.slerp(tgt.r.quat, k); }
      rec.head.position.copy(cur.h.pos);
      rec.head.quaternion.copy(cur.h.quat);
      _fwd.set(0, 0, -1).applyQuaternion(cur.h.quat);
      rec.body.position.set(cur.h.pos.x, cur.h.pos.y - 0.44, cur.h.pos.z);
      rec.body.rotation.set(0, Math.atan2(-_fwd.x, -_fwd.z), 0);
      rec.lh.visible = rec.hasL;
      rec.rh.visible = rec.hasR;
      if (rec.hasL) { rec.lh.position.copy(cur.l.pos); rec.lh.quaternion.copy(cur.l.quat); }
      if (rec.hasR) { rec.rh.position.copy(cur.r.pos); rec.rh.quaternion.copy(cur.r.quat); }
      rec.tag.position.set(cur.h.pos.x, cur.h.pos.y + (rec.look[0] ? 0.42 : 0.3), cur.h.pos.z);
      rec.shadow.position.set(cur.h.pos.x, 0.004, cur.h.pos.z);
    }
    // team vests in team games
    const L = curLevel();
    for (const rec of remotes.values()) {
      const st = L.teams && inMyLevel(rec) && rec.hasH ? rec.lvState[L.id] : null;
      const team = st && (st.team === 0 || st.team === 1) ? st.team : -1;
      rec.vest.visible = team >= 0 && !(st.tagged && Math.floor(performance.now() / 120) % 2);
      if (team >= 0) {
        rec.vest.material.color.setHex(st.tagged ? 0x666677 : TEAM_COLORS[team]);
        rec.vest.position.set(rec.cur.h.pos.x, rec.cur.h.pos.y - 0.36, rec.cur.h.pos.z);
      }
    }
  }
  function setLook(rec, hat, face, shirt, shirtColor) {
    const col = PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '#888888';
    dressBody(rec.dark, col, shirt, shirtColor);
    if (rec.look[0] === hat && rec.look[1] === face && rec.look[2] === shirt && rec.look[3] === shirtColor) return;
    rec.look = [hat, face, shirt, shirtColor];
    rec.hatSlot.clear();
    rec.faceSlot.clear();
    const h = buildHat(hat);
    if (h) rec.hatSlot.add(h);
    rec.faceSlot.add(buildFace(face));
  }
  function remoteHandPose(peerId, side) {
    const rec = remotes.get(peerId);
    if (!rec || !inMyLevel(rec) || !rec.hasH) return null;
    const has = side === 'left' ? rec.hasL : rec.hasR;
    return has ? rec.cur[side === 'left' ? 'l' : 'r'] : rec.cur.h;
  }

