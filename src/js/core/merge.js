  // ================================================================ MERGE STATIC: lots of still scenery, drawn as a few meshes
  // Every mesh costs a draw call, and a Quest manages a frame of only so many. A room of bookshelves is hundreds of
  // little boxes that never move: mergeStatic(root) bakes them into a few big meshes, so they cost a few calls.
  //   - Plain-coloured meshes of the same kind (Lambert, Basic, ...) and settings become one mesh with each one's colour
  //     baked into its corners (vertex colours). Textured ones are merged with others that use the same material.
  //   - The scenery is split into four parts (by quarter, around its middle), so a part that's behind you is still
  //     skipped when drawing.
  //   - The originals stay where they are, on a layer nothing draws or hits (31), so anything that refers to them, and
  //     anything hung under them, carries on as before.
  // (An InstancedMesh calls itself a 'Mesh' too in this three.js: it's already one draw call, and is left alone.)
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
      if (ok && obj !== root && obj.isMesh && !obj.isInstancedMesh && !obj.isSkinnedMesh && obj.type === 'Mesh' && obj.layers.mask === 1 && !Array.isArray(obj.material) && obj.material && MERGE_KINDS[obj.material.type]
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
  // (test mode) every two seconds: if anything merged has changed, say so as a page error, which every test catches
  let mergeWatchT = 0, mergeWatchSaid = false;
  function mergeWatch(now) {
    if (!MERGE_TEST || mergeWatchSaid || !MERGED.length || now < mergeWatchT) return;
    mergeWatchT = now + 2000;
    const bad = mergeCheck();
    if (!bad.length) return;
    mergeWatchSaid = true;
    setTimeout(() => { throw new Error(`merged scenery changed: ${bad.slice(0, 4).map((b) => `${b.name} ${b.what}`).join('; ')}`); });
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

  // ================================================================ GLOW BATCH: many flickering glows drawn as one mesh
  // A glow drawn as a Sprite costs a draw call each, and a quest has a hundred wall lights with two glows apiece. This
  // draws a whole set of them (same picture, same colour) in one go: each is a little square that turns to face you,
  // and the flicker, the bob of a floating lantern and the lean toward you (so a wall at an angle can't slice the
  // glow in half) are worked out on the graphics card, exactly as the quest's Sprites used to do them.
  //   const b = glowBatch(tex, color); b.add(x, y, z, sx, sy, phase, float); ...; b.done(group)
  // ?nomerge turns these off too (the place then uses Sprites as before); ?still (test mode) stops the flicker, so
  // pictures of a place can be compared.
  const FX_STILL = MERGE_TEST && (() => { try { return new URLSearchParams(location.search).has('still'); } catch (e) { return false; } })();
  const GLOW_VS = `
    uniform float time; uniform float still;
    attribute vec3 center; attribute vec4 prm;
    varying vec2 vUv;
    #include <fog_pars_vertex>
    void main() {
      vUv = uv;
      float f = still > 0.5 ? 1.0 : 0.9 + 0.1 * sin(time * 0.017 + prm.z) + 0.06 * sin(time * 0.043 + prm.z * 2.0);
      vec3 c = center;
      if (prm.w > 0.5 && still < 0.5) c.y += sin(time * 0.0015 + prm.z) * 0.12;
      vec3 wc = (modelMatrix * vec4(c, 1.0)).xyz;
      vec2 d = cameraPosition.xz - wc.xz; float len = max(length(d), 1e-4);
      wc.xz += d / len * min(0.25, len * 0.5);
      vec4 mvPosition = viewMatrix * vec4(wc, 1.0);
      mvPosition.xy += (uv - 0.5) * prm.xy * f;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const GLOW_FS = `
    uniform sampler2D map; uniform vec3 diffuse;
    varying vec2 vUv;
    #include <fog_pars_fragment>
    void main() {
      gl_FragColor = vec4(diffuse, 1.0) * texture2D(map, vUv);
      #include <fog_fragment>
    }`;
  function glowBatch(tex, color) {
    if (MERGE_OFF) return null;
    const items = [];
    return {
      add(x, y, z, sx, sy, phase, float) { items.push([x, y, z, sx, sy, phase || 0, float ? 1 : 0]); },
      get count() { return items.length; },
      done(group) {
        if (!items.length) return null;
        const n = items.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), cen = new Float32Array(n * 12), prm = new Float32Array(n * 16), idx = new Uint16Array(n * 6);
        const UV = [0, 0, 1, 0, 1, 1, 0, 1];
        items.forEach(([x, y, z, sx, sy, ph, fl], i) => {
          for (let k = 0; k < 4; k++) {
            const j = i * 4 + k;
            pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z;     // (only for the bounds: the shader places the corners)
            cen[j * 3] = x; cen[j * 3 + 1] = y; cen[j * 3 + 2] = z;
            uv[j * 2] = UV[k * 2]; uv[j * 2 + 1] = UV[k * 2 + 1];
            prm[j * 4] = sx; prm[j * 4 + 1] = sy; prm[j * 4 + 2] = ph; prm[j * 4 + 3] = fl;
          }
          idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setAttribute('center', new THREE.BufferAttribute(cen, 3));
        geo.setAttribute('prm', new THREE.BufferAttribute(prm, 4));
        geo.setIndex(new THREE.BufferAttribute(idx, 1));
        const uni = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, still: { value: FX_STILL ? 1 : 0 }, map: { value: null }, diffuse: { value: new THREE.Color(color) } }]);
        uni.map.value = tex;
        const mat = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: GLOW_VS, fragmentShader: GLOW_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'glows'; mesh.frustumCulled = false; mesh.matrixAutoUpdate = false;
        mesh.onBeforeRender = () => { uni.time.value = performance.now(); };
        group.add(mesh); mesh.updateMatrixWorld(true);
        return mesh;
      },
    };
  }
