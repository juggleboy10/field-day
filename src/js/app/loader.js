  // ================================================================ LOADER: each place is built the first time you go there
  // The page carries every place's code, but only the clubhouse runs at startup. The rest sit in the page as text
  // (<script type="text/plain" data-fd="js/games/hoops.js">) and the list of which files each place needs is in
  // #fd-manifest (written by tools/manifest.py). Going to a place runs its files, once, as ordinary scripts: they see
  // everything the core defines, just as if they had been there from the start.
  // A page built with --single has no such list: everything is already there, and all of this does nothing.
  //   ?eager in the address builds every place at startup, the old way. The tests (?test) do too, unless ?lazy is there.
  const LOADER = (() => {
    let places = null;
    try { const el = document.getElementById('fd-manifest'); if (el) places = JSON.parse(el.textContent).places; } catch (e) { places = null; }
    const q = new URLSearchParams(location.search);
    const S = { want: -1, ran: new Set(), eager: !places || q.has('eager') || (q.has('test') && !q.has('lazy')), failed: new Set() };
    const filesFor = (i) => (places && LEVEL_META[i] && places[LEVEL_META[i].id]) || [];
    function run(file) {
      if (S.ran.has(file)) return;
      S.ran.add(file);
      const src = document.querySelector(`script[data-fd="${file}"]`);
      if (!src) throw new Error(`missing ${file}`);
      const s = document.createElement('script');
      s.textContent = `${src.textContent}\n//# sourceURL=${file}`;
      document.head.appendChild(s);     // (runs right here)
      s.remove(); src.remove();
    }
    // things the core told every place while this one wasn't there yet
    function settle(L) {
      if (L.setColor) L.setColor(PLAYER_COLORS[state.colorIdx].hex);
      CAMERA.levelLoaded(L);
    }
    // Build place i now, if it isn't. True if it's there afterwards.
    function sync(i) {
      if (LEVELS[i]) return true;
      if (!LEVEL_META[i] || S.failed.has(i)) return false;
      window.__fdLazy = !S.eager;  // (an error in here is this place's problem, not a reason to stop the whole game)
      try { for (const f of filesFor(i)) run(f); } catch (e) { console.error(e); }
      window.__fdLazy = false;
      if (!LEVELS[i]) { S.failed.add(i); return false; }
      try { settle(LEVELS[i]); } catch (e) { console.error(e); }
      return true;
    }
    function all() { for (let i = 0; i < LEVEL_META.length; i++) sync(i); }
    // Go to a place that isn't built: say so, give the screen a moment to show it, build, then go.
    function go(i) {
      if (S.want === i) return;
      S.want = i;
      const name = LEVEL_META[i].name;
      showToast(`Loading ${name}…`);
      setTimeout(() => {
        if (S.want !== i) return;
        S.want = -1;
        if (sync(i)) switchLevel(i);
        else { showToast(`${name} couldn’t load. Try reloading the page.`); syncLevelPicker(); }
      }, 40);
    }
    // at startup: everything (eager), or just the place you were last in
    function boot() {
      if (S.eager) { all(); return; }
      if (!sync(state.level)) state.level = HUB_IDX;
    }
    // ---------------------------------------------------------------- giving a place's graphics memory back
    // A place's code can only run once, so a place you've left stays built. What it holds on the graphics chip (its
    // shapes and pictures, the bulk of the memory on a headset) is given back once you've been away a while
    // (REST_MS; ?restms= in the address to change it). Nothing else changes: the place, its state and its scores stay
    // in the page, and three.js puts the shapes and pictures back on the chip the moment the place is drawn again
    // (when you go back, behind the switch). The clubhouse is never rested: you pass through it all the time. Anything
    // the place shares with where you are now, or with the core (avatars, the watch, the camera), is left alone.
    const REST = {
      ms: (() => { const v = Number(q.get('restms')); return v > 0 ? v : 45000; })(),
      left: new Map(), rested: new Set(), checkT: 0, last: null,
    };
    const MAPS = ['map', 'alphaMap', 'aoMap', 'bumpMap', 'emissiveMap', 'envMap', 'lightMap', 'normalMap', 'specularMap', 'roughnessMap', 'metalnessMap', 'displacementMap'];
    // (only pictures it can upload again: a canvas, an image, raw data; never a render target's picture)
    const reloadable = (t) => {
      const im = t && t.image;
      if (!im || t.isVideoTexture || t.isCompressedTexture) return false;
      if (t.isDataTexture) return !!im.data;
      return (typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement) || (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement)
        || (typeof ImageBitmap !== 'undefined' && im instanceof ImageBitmap) || (typeof OffscreenCanvas !== 'undefined' && im instanceof OffscreenCanvas);
    };
    function collect(root, geos, texs) {
      root.traverse((o) => {
        if (o.geometry && !o.isSprite) geos.add(o.geometry);      // (sprites share one shape, kept by three.js itself)
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) {
          for (const k of MAPS) if (m[k] && m[k].isTexture) texs.add(m[k]);
          if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) texs.add(u.value);
        }
      });
    }
    function rest(L) {
      if (!L || L.idx === state.level || L.idx === HUB_IDX) return null;
      const geos = new Set(), texs = new Set();
      collect(L.group, geos, texs);
      if (L.overlay) collect(L.overlay, geos, texs);
      if (L.env && L.env.sky && L.env.sky.isTexture) texs.add(L.env.sky);
      // what's still in use: everything in the scene but the other places (and the sky showing now)
      const keepG = new Set(), keepT = new Set(), others = new Set();
      for (const Lv of LEVELS) if (Lv && Lv.idx !== state.level) { others.add(Lv.group); if (Lv.overlay) others.add(Lv.overlay); }
      (function walk(o) { if (others.has(o)) return; collect({ traverse: (f) => f(o) }, keepG, keepT); for (const c of o.children) walk(c); })(scene);
      if (skyMat.map) keepT.add(skyMat.map);
      let g = 0, t = 0;
      for (const x of geos) if (!keepG.has(x)) { x.dispose(); g += 1; }
      for (const x of texs) if (!keepT.has(x) && reloadable(x)) { x.dispose(); t += 1; }
      REST.rested.add(L.idx);
      REST.last = { idx: L.idx, geometries: g, textures: t };
      return REST.last;
    }
    // (modes.js tells us when you leave a place and arrive at one; the main loop calls restTick)
    function leaving(L) { if (L) REST.left.set(L.idx, performance.now()); }
    function arriving(L) { if (!L) return; REST.left.delete(L.idx); REST.rested.delete(L.idx); }
    function restTick(now) {
      if (now < REST.checkT) return;
      REST.checkT = now + 2000;
      for (const [idx, t] of REST.left) {
        if (idx === state.level || REST.rested.has(idx) || now - t < REST.ms) continue;
        try { rest(LEVELS[idx]); } catch (e) { console.error(e); }
        REST.left.delete(idx);
        break;      // (one place a check: no big pause)
      }
    }
    return { S, sync, all, go, boot, filesFor, REST, rest, leaving, arriving, restTick, get want() { return S.want; }, set want(v) { S.want = v; }, get eager() { return S.eager; } };
  })();
