  // ================================================================ MERGE STATIC: lots of still scenery, drawn as a few meshes
  // Every mesh costs a draw call, and a Quest manages a frame of only so many. A room of bookshelves is hundreds of
  // little boxes that never move: mergeStatic(root) bakes them into a few big meshes, so they cost a few calls.
  //   - Plain-coloured meshes of the same kind (Lambert, Basic, ...) and settings become one mesh with each one's colour
  //     baked into its corners (vertex colours). Textured ones are merged with others that use the same material.
  //   - The scenery is split into four parts (by quarter, around its middle), so a part that's behind you is still
  //     skipped when drawing.
  //   - The originals stay where they are, on a layer nothing draws or hits (31), so anything that refers to them, and
  //     anything hung under them, carries on as before.
  // Left alone: anything marked with userData.live (or under something marked), anything hidden, transparent, with
  // several materials or a special render order, and anything in opts.keep (and what's under it).
  // Call it once the scenery's built and before anything moves. Merging something that later moves, hides or changes
  // colour is the one way this goes wrong: in test mode (?test) mergeCheck() lists any merged original that has since
  // changed, and tests/v104.py plays places and fails if one has. ?nomerge in the address turns merging off.
  const MERGE_LAYER = 31;
  const MERGED = [];       // (test mode: what each merge baked, to check later)
  const MERGE_OFF = (() => { try { return new URLSearchParams(location.search).has('nomerge'); } catch (e) { return false; } })();
  const MERGE_TEST = (() => { try { return new URLSearchParams(location.search).has('test'); } catch (e) { return false; } })();
  const _mgV = new V3(), _mgM = new THREE.Matrix4(), _mgN = new THREE.Matrix3(), _mgC = new THREE.Color(), _mgInv = new THREE.Matrix4();
  const MERGE_KINDS = { MeshLambertMaterial: 1, MeshBasicMaterial: 1, MeshPhongMaterial: 1, MeshStandardMaterial: 1 };
  const MAP_KEYS = ['map', 'lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 'normalMap', 'specularMap', 'alphaMap', 'envMap', 'roughnessMap', 'metalnessMap'];
  function mergeKey(m) {
    const textured = MAP_KEYS.some((k) => m[k]) || m.vertexColors;
    if (textured) return { key: `same:${m.uuid}`, bake: false };
    const em = m.emissive ? m.emissive.getHex() : -1, sh = m.shininess !== undefined ? m.shininess : -1;
    const rm = m.roughness !== undefined ? `${m.roughness}/${m.metalness}` : '';
    return { key: `${m.type}|${m.side}|${!!m.flatShading}|${m.fog}|${m.depthTest}|${m.depthWrite}|${m.toneMapped}|${!!m.wireframe}|${em}|${sh}|${rm}|${m.polygonOffset ? `${m.polygonOffsetFactor},${m.polygonOffsetUnits}` : ''}`, bake: true };
  }
  function mergeStatic(root, opts) {
    const o = opts || {};
    if (MERGE_OFF) return null;
    const keep = new Set(o.keep || []);
    root.updateMatrixWorld(true);
    _mgInv.copy(root.matrixWorld).invert();
    // what can go in
    const picked = [];
    (function walk(obj, ok) {
      if (obj !== root && (!obj.visible || keep.has(obj) || (obj.userData && obj.userData.live))) ok = false;
      if (ok && obj !== root && obj.type === 'Mesh' && obj.layers.mask === 1 && !Array.isArray(obj.material) && obj.material && MERGE_KINDS[obj.material.type]
        && !obj.material.transparent && obj.material.opacity === 1 && obj.material.visible && obj.renderOrder === 0 && !obj.onBeforeRender.length
        && obj.geometry && obj.geometry.isBufferGeometry && obj.geometry.attributes.position && obj.geometry.attributes.normal && !obj.geometry.morphAttributes.position) {
        const mk = mergeKey(obj.material);
        if (!mk.bake && obj.material.map && !obj.geometry.attributes.uv) { /* a texture with nothing to place it: leave it */ }
        else picked.push({ mesh: obj, mk });
      }
      for (const c of obj.children) walk(c, ok);
    })(root, true);
    if (picked.length < 2) return null;
    // four parts, by quarter around the middle
    let cx = 0, cz = 0;
    for (const p of picked) { p.mesh.getWorldPosition(_mgV).applyMatrix4(_mgInv); p.x = _mgV.x; p.z = _mgV.z; cx += p.x; cz += p.z; }
    cx /= picked.length; cz /= picked.length;
    const buckets = new Map();
    for (const p of picked) {
      const part = o.parts === 1 ? 0 : (p.x < cx ? 0 : 1) + (p.z < cz ? 0 : 2);
      const k = `${p.mk.key}#${part}`;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(p);
    }
    const made = [], originals = [];
    for (const list of buckets.values()) {
      if (list.length < 2) continue;      // (one alone gains nothing)
      const m0 = list[0].mesh.material, bake = list[0].mk.bake, uv = !bake, col = bake || !!m0.vertexColors;
      let nv = 0, ni = 0;
      for (const p of list) { const g = p.mesh.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uvs = uv ? new Float32Array(nv * 2) : null, cols = col ? new Float32Array(nv * 3) : null;
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let v0 = 0, i0 = 0;
      for (const p of list) {
        const mesh = p.mesh, g = mesh.geometry, pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ca = g.attributes.color;
        _mgM.multiplyMatrices(_mgInv, mesh.matrixWorld); _mgN.getNormalMatrix(_mgM);
        // (a mirrored mesh's triangles face the other way once baked: turn them round)
        const flip = _mgM.determinant() < 0;
        if (bake) _mgC.copy(mesh.material.color);
        for (let k = 0; k < pa.count; k++) {
          const j = v0 + k;
          _mgV.fromBufferAttribute(pa, k).applyMatrix4(_mgM); pos[j * 3] = _mgV.x; pos[j * 3 + 1] = _mgV.y; pos[j * 3 + 2] = _mgV.z;
          _mgV.fromBufferAttribute(na, k).applyMatrix3(_mgN).normalize(); nor[j * 3] = _mgV.x; nor[j * 3 + 1] = _mgV.y; nor[j * 3 + 2] = _mgV.z;
          if (uvs && ua) { uvs[j * 2] = ua.getX(k); uvs[j * 2 + 1] = ua.getY(k); }
          if (cols) {
            if (bake) { cols[j * 3] = _mgC.r; cols[j * 3 + 1] = _mgC.g; cols[j * 3 + 2] = _mgC.b; }
            else if (ca) { cols[j * 3] = ca.getX(k); cols[j * 3 + 1] = ca.getY(k); cols[j * 3 + 2] = ca.getZ(k); }
            else { cols[j * 3] = cols[j * 3 + 1] = cols[j * 3 + 2] = 1; }
          }
        }
        const n = g.index ? g.index.count : pa.count;
        for (let t = 0; t < n; t += 3) {
          const a = g.index ? g.index.getX(t) : t, b = g.index ? g.index.getX(t + 1) : t + 1, c = g.index ? g.index.getX(t + 2) : t + 2;
          idx[i0 + t] = v0 + a; idx[i0 + t + 1] = v0 + (flip ? c : b); idx[i0 + t + 2] = v0 + (flip ? b : c);
        }
        v0 += pa.count; i0 += n;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (uvs) geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      if (cols) geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      let mat = m0;
      if (bake) { mat = m0.clone(); mat.color.set(0xffffff); mat.vertexColors = true; }
      const merged = new THREE.Mesh(geo, mat);
      merged.name = 'merged'; merged.matrixAutoUpdate = false;
      root.add(merged); merged.updateMatrixWorld(true);
      made.push(merged);
      for (const p of list) { p.mesh.layers.set(MERGE_LAYER); originals.push(p); }
    }
    if (MERGE_TEST && originals.length) MERGED.push({ root, items: originals.map((p) => ({ mesh: p.mesh, snap: mergeSnap(root, p.mesh) })) });
    return { meshes: made, count: originals.length };
  }
  // (test mode) what a merged original looked like when it was baked: where it is relative to the root, whether it
  // and everything above it is showing, and its colour
  function mergeSnap(root, mesh) {
    root.updateMatrixWorld(true);
    _mgM.copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
    let shown = true;
    for (let p = mesh; p && p !== root; p = p.parent) if (!p.visible) shown = false;
    const m = mesh.material;
    return { e: Array.from(_mgM.elements, (x) => Math.round(x * 1000)), shown, layer: mesh.layers.mask, col: m.color ? m.color.getHex() : 0, op: m.opacity, vis: m.visible, attached: mesh.parent !== null };
  }
  function mergeCheck() {
    const bad = [];
    for (const r of MERGED) {
      for (const it of r.items) {
        const now = mergeSnap(r.root, it.mesh), was = it.snap;
        const what = [];
        if (now.e.some((x, i) => Math.abs(x - was.e[i]) > 2)) what.push('moved');
        if (now.shown !== was.shown) what.push('shown/hidden');
        if (now.layer !== was.layer) what.push('layer');
        if (now.col !== was.col || now.op !== was.op || now.vis !== was.vis) what.push('colour');
        if (now.attached !== was.attached) what.push('removed');
        if (what.length) bad.push({ name: it.mesh.name || it.mesh.geometry.type, what: what.join(', ') });
      }
    }
    return bad;
  }
