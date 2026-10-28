  // ================================================================ THE CAMERA: a 90s point-and-shoot
  // Take it out from the watch (VR) or with O / the Camera button (browser). VR: it sits in the hand that pressed the
  // watch; the trigger on that hand takes a picture. Its little screen on the back shows what the lens sees; turn it
  // round to face you and it's a selfie (the tiny mirror by the lens shows you). Browser: the screen becomes the
  // viewfinder; Space or a click takes a picture, V flips to a selfie (you, seen from arm's length).
  // Pictures come out warm and a touch faded, with a little grain and an orange date stamp in the corner, like a
  // drugstore print from 1996. Where they go:
  //  - yours: kept in this browser. The last 12 roll on; the ones you save (the star) stay. They hang on "My photos",
  //    the first of three walls past the fireplace in the clubhouse.
  //  - everyone's: unless you switch it off, each one also goes up on "Everyone's photos" for everyone (see PHOTOS).
  //    Touch one there (or aim and press E) to give it a heart; the most-hearted make "Best of all time", the third wall.
  //  - prints: each picture also slides out of the top of the camera as a print. Grab it with your other hand, carry it,
  //    and let go wherever you like: it stays there, and friends who are here see it too. Touch a photo on "My photos"
  //    for a print of it, or use Print in the album.
  const CAMERA = (() => {
    const C = { on: false, selfie: false, hand: 'right', trigPrev: true, flashT: 0, frame: 0, printT: 0, lastShot: 0, loaded: false, ver: 0, printOf: null, grip: { left: false, right: false } };
    const KEEP = 12, KEPT = 30, W = 640, H = 480;
    const changed = () => { C.ver += 1; state.hudDirty = true; };
    // my photos, oldest first: { id, t, src, kept, gid (its id on everyone's wall, when it's up there) }
    const mine = [];
    // ---------------------------------------------------------------- keeping them in this browser
    // (IndexedDB holds pictures far better than localStorage; localStorage is only the fallback)
    const IDB = (() => {
      let dbp = null;
      const open = () => dbp || (dbp = new Promise((res) => {
        try { const r = indexedDB.open('field-day', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); } catch (e) { res(null); }
      }));
      const run = async (mode, fn) => {
        const db = await open(); if (!db) return null;
        return new Promise((res) => {
          try { const t = db.transaction('photos', mode), req = fn(t.objectStore('photos')); t.oncomplete = () => res(req && req.result !== undefined ? req.result : true); t.onerror = () => res(null); t.onabort = () => res(null); } catch (e) { res(null); }
        });
      };
      return { all: () => run('readonly', (st) => st.getAll()), put: (p) => run('readwrite', (st) => st.put({ id: p.id, t: p.t, src: p.src, kept: !!p.kept, gid: p.gid || '' })), del: (id) => run('readwrite', (st) => st.delete(id)) };
    })();
    let idbOk = true;
    const okSrc = (s) => typeof s === 'string' && s.startsWith('data:image/');
    function storeLS() { try { localStorage.setItem('fd_photos2', JSON.stringify(mine.map((p) => ({ id: p.id, t: p.t, src: p.src, kept: p.kept, gid: p.gid })))); } catch (e) { /* full: they stay for this visit */ } }
    function keepOne(p) { if (idbOk) IDB.put(p).then((r) => { if (r === null) { idbOk = false; storeLS(); } }); else storeLS(); }
    function forget(p) { if (idbOk) IDB.del(p.id); else storeLS(); }
    // the last 12 roll on; saved ones stay (up to 30)
    function trim() {
      const loose = mine.filter((p) => !p.kept), kept = mine.filter((p) => p.kept);
      for (const p of loose.slice(0, Math.max(0, loose.length - KEEP))) { mine.splice(mine.indexOf(p), 1); forget(p); }
      for (const p of kept.slice(0, Math.max(0, kept.length - KEPT))) { mine.splice(mine.indexOf(p), 1); forget(p); }
    }
    async function load() {
      let got = await IDB.all();
      if (got === null) { idbOk = false; try { got = JSON.parse(localStorage.getItem('fd_photos2') || '[]'); } catch (e) { got = []; } }
      const have = new Set(mine.map((p) => p.id));
      for (const p of Array.isArray(got) ? got : []) if (p && typeof p.id === 'string' && okSrc(p.src) && !have.has(p.id)) mine.push({ id: p.id, t: Number(p.t) || 0, src: p.src, kept: !!p.kept, gid: typeof p.gid === 'string' ? p.gid : '' });
      // photos from before (v93 kept them in localStorage): bring them over
      try {
        const old = JSON.parse(localStorage.getItem('fd_photos') || '[]');
        if (Array.isArray(old) && old.length) {
          const ok = old.filter(okSrc);
          ok.forEach((src, k) => { const p = { id: `old${k}${Date.now().toString(36)}`, t: Date.now() - (ok.length - k) * 1000, src, kept: false, gid: '' }; mine.push(p); keepOne(p); });
          localStorage.removeItem('fd_photos');
        }
      } catch (e) { /* nothing to bring over */ }
      mine.sort((a, b) => a.t - b.t);
      trim(); C.loaded = true; drawLcd(); changed();
      loadPrints();
    }
    const sharing = () => prefs.sharePhotos !== false;
    function addMine(src) {
      const p = { id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, t: Date.now(), src, kept: false, gid: '' };
      mine.push(p); trim(); keepOne(p); changed();
      if (sharing()) shareOne(p);
      return p;
    }
    async function shareOne(p) {
      if (p.gid && PHOTOS.has(p.gid)) return;
      const gid = await PHOTOS.share(p.src);
      if (!gid) return;
      p.gid = gid; keepOne(p); changed();
      // prints of it can now be seen by friends too
      for (const it of P.placed.concat(P.held ? [P.held] : [])) if (it.lid === p.id) it.gid = gid;
      savePrints(); if (typeof forcePresence === 'function') forcePresence();
    }
    function unshareOne(p) { if (p.gid) { PHOTOS.unshare(p.gid); p.gid = ''; keepOne(p); changed(); } }
    function setKept(p, on) { p.kept = !!on; if (!p.kept) trim(); keepOne(p); changed(); }
    function removeMine(p) { const i = mine.indexOf(p); if (i < 0) return; mine.splice(i, 1); forget(p); unshareOne(p); drawLcd(); changed(); }
    const stampOf = (t) => { const d = new Date(t); return `'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`; };

    // ---------------------------------------------------------------- the camera itself
    const M = (hex, em) => new THREE.MeshLambertMaterial({ color: hex, emissive: em || 0x000000 });
    const body = new THREE.Group();
    const black = M(0x1f1f24), silver = M(0xb8bcc6), dark = M(0x0c0c10);
    // (the lens looks along -z, like the controller pointing; the back, with its screen, faces you along +z)
    body.add(at(new THREE.Mesh(boxg(0.13, 0.07, 0.042), black), 0, 0, 0));
    // the brushed silver front plate, with the maker's name and a rainbow stripe, very 1996
    const plateC = canvasTexture(256, 80, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 80); gr.addColorStop(0, '#d8dce4'); gr.addColorStop(0.5, '#aeb3bd'); gr.addColorStop(1, '#c8ccd4');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 80);
      for (let y = 0; y < 80; y += 2) { g.fillStyle = `rgba(255,255,255,${0.04 + (y % 6) * 0.01})`; g.fillRect(0, y, 256, 1); }
      ['#e5453a', '#ff9a3a', '#ffd23f', '#4fc3f7'].forEach((c, k) => { g.fillStyle = c; g.fillRect(84 + k * 8, 52, 6, 18); });
      g.fillStyle = '#1b1b22'; g.font = 'italic 900 22px Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('FUNSHOT 35', 8, 26);
      g.font = '700 11px Arial, sans-serif'; g.fillText('AUTO FOCUS', 8, 62);
    });
    const plate = new THREE.Mesh(boxg(0.128, 0.04, 0.004), [silver, silver, silver, silver, silver, new THREE.MeshLambertMaterial({ map: plateC.tex })]);   // (the -z face: the front)
    plate.position.set(0, -0.006, -0.022); body.add(plate);
    body.add(at(new THREE.Mesh(boxg(0.03, 0.068, 0.046), black), 0.05, 0, 0));                            // the grip bulge
    const barrel = new THREE.Mesh(cyl(0.024, 0.026, 0.026, 18), dark); barrel.rotation.x = Math.PI / 2; barrel.position.set(-0.026, -0.004, -0.034); body.add(barrel);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.003, 6, 20), silver); ring.position.set(-0.026, -0.004, -0.047); body.add(ring);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.019, 18), new THREE.MeshLambertMaterial({ color: 0x223a5a, emissive: 0x0a1424 })); glass.position.set(-0.026, -0.004, -0.0475); glass.rotation.y = Math.PI; body.add(glass);
    const flashWin = new THREE.Mesh(boxg(0.03, 0.014, 0.003), new THREE.MeshBasicMaterial({ color: 0xe8eef8 })); flashWin.position.set(-0.045, 0.024, -0.022); body.add(flashWin);
    body.add(at(new THREE.Mesh(boxg(0.014, 0.01, 0.003), new THREE.MeshBasicMaterial({ color: 0x334455 })), 0.022, 0.024, -0.022));   // viewfinder window
    const shutter = new THREE.Mesh(cyl(0.007, 0.007, 0.006, 10), M(0xe5453a)); shutter.position.set(0.045, 0.038, 0.004); body.add(shutter);
    // the little LCD on top: frame count
    const lcdC = canvasTexture(64, 32);
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.013), new THREE.MeshBasicMaterial({ map: lcdC.tex })); lcd.rotation.x = -Math.PI / 2; lcd.position.set(0.012, 0.0355, 0.004); body.add(lcd);
    // the back: the viewfinder screen (VR), and the selfie mirror by the lens
    const preRT = new THREE.WebGLRenderTarget(192, 144);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), new THREE.MeshBasicMaterial({ map: preRT.texture })); screen.position.set(-0.01, 0, 0.0215); body.add(screen);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.0165), new THREE.MeshBasicMaterial({ map: preRT.texture })); mirror.position.set(0.026, -0.012, -0.0225); mirror.rotation.y = Math.PI; body.add(mirror);
    const flashGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flashGlow.position.set(-0.04, 0.024, -0.06); flashGlow.scale.setScalar(0.6); flashGlow.visible = false; body.add(flashGlow);
    // the print that slides out of the top after a picture (VR)
    const printTex = new THREE.Texture();
    const print = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.0825), new THREE.MeshBasicMaterial({ map: printTex, side: THREE.DoubleSide }));
    print.visible = false; body.add(print);
    body.visible = false;
    scene.add(body);
    function drawLcd() {
      const g = lcdC.g; g.fillStyle = '#9aa88a'; g.fillRect(0, 0, 64, 32);
      g.fillStyle = '#1b2414'; g.font = `700 22px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(mine.length).padStart(2, '0'), 32, 17); lcdC.tex.needsUpdate = true;
    }
    drawLcd();

    // ---------------------------------------------------------------- the view: where the lens is and what it sees
    const pcam = new THREE.PerspectiveCamera(56, 4 / 3, 0.05, 500);
    const shotRT = new THREE.WebGLRenderTarget(W, H);
    const _q = new Q4(), _f = new V3(), _u = new V3(), _p = new V3(), _h = new V3();
    // me, for selfies (dressed the way I look; only shown while a selfie is being seen or taken)
    let me = null, meKey = '';
    function myAvatar() {
      const key = `${state.colorIdx}|${state.hat}|${state.face}|${state.shirt}|${state.shirtColor}`;
      if (key !== meKey) {
        if (me) scene.remove(me);
        me = buildAvatar(PLAYER_COLORS[state.colorIdx].hex, state.hat, state.face, true, state.shirt, state.shirtColor);
        me.visible = false; scene.add(me); meKey = key;
      }
      _f.set(0, 0, -1).applyQuaternion(myHead.quat);
      me.position.copy(myHead.pos); me.rotation.set(0, Math.atan2(-_f.x, -_f.z), 0);
      return me;
    }
    // point pcam where the picture's taken from; returns false when there's no camera to take it with
    function aim() {
      if (state.mode === 'vr') {
        const h = myHands[C.hand]; if (!h.ok) return false;
        _f.set(0, 0, -1).applyQuaternion(body.quaternion); _u.set(0, 1, 0).applyQuaternion(body.quaternion);
        _p.set(-0.026, -0.004, -0.05).applyQuaternion(body.quaternion).add(body.position);
        pcam.position.copy(_p); pcam.up.copy(_u); pcam.lookAt(_p.clone().add(_f));
        // facing me: it's a selfie
        _h.copy(myHead.pos).sub(_p);
        C.selfie = _h.length() < 1.2 && _h.normalize().dot(_f) > 0.35;
        return true;
      }
      if (state.mode !== 'flat') return false;
      camera.getWorldQuaternion(_q); camera.getWorldPosition(_h);
      if (!C.selfie) { pcam.position.copy(_h); pcam.quaternion.copy(_q); pcam.up.set(0, 1, 0); return true; }
      // a selfie: the camera at arm's length in front of me, a little high and to one side, looking back at me
      _f.set(0, 0, -1).applyQuaternion(_q); _f.y = 0; if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1); _f.normalize();
      _u.set(-_f.z, 0, _f.x);
      pcam.position.copy(_h).addScaledVector(_f, 0.95).addScaledVector(_u, 0.15).add(_p.set(0, 0.18, 0));
      pcam.up.set(0, 1, 0); pcam.lookAt(_h.x, _h.y - 0.2, _h.z);
      return true;
    }
    // draw the scene from pcam into a render target (with the headset's own view switched off for a moment)
    function renderTo(rt) {
      const xr = renderer.xr.enabled, before = renderer.getRenderTarget(), bodyVis = body.visible;
      const showMe = C.selfie;
      if (Math.abs(pcam.aspect - W / H) > 1e-3) { pcam.aspect = W / H; pcam.updateProjectionMatrix(); }
      if (showMe) myAvatar().visible = true;
      body.visible = false;
      renderer.xr.enabled = false;
      renderer.setRenderTarget(rt);
      renderer.render(scene, pcam);
      renderer.setRenderTarget(before);
      renderer.xr.enabled = xr;
      body.visible = bodyVis;
      if (me) me.visible = false;
    }

    // ---------------------------------------------------------------- taking a picture
    const px = new Uint8Array(W * H * 4);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const og = out.getContext('2d');
    function develop() {
      renderer.readRenderTargetPixels(shotRT, 0, 0, W, H, px);
      const img = og.createImageData(W, H), d = img.data;
      // a drugstore print: warm, a little faded and contrasty, softly darker in the corners, with grain
      for (let y = 0; y < H; y++) {
        const sy = (H - 1 - y) * W * 4, dy = y * W * 4, vy = (y / H - 0.5);
        for (let x = 0; x < W; x++) {
          const i = sy + x * 4, o = dy + x * 4, vx = (x / W - 0.5);
          const vig = 1 - (vx * vx + vy * vy) * 0.75, n = (Math.random() - 0.5) * 18;
          let r = px[i], g = px[i + 1], b = px[i + 2];
          r = (r - 128) * 1.08 + 128; g = (g - 128) * 1.06 + 128; b = (b - 128) * 1.02 + 128;
          r = r * 1.06 + 10; g = g * 1.01 + 5; b = b * 0.88 + 12;   // warm, with lifted blacks
          d[o] = Math.max(0, Math.min(255, r * vig + n)); d[o + 1] = Math.max(0, Math.min(255, g * vig + n)); d[o + 2] = Math.max(0, Math.min(255, b * vig + n)); d[o + 3] = 255;
        }
      }
      og.putImageData(img, 0, 0);
      // the date stamp: orange seven-segment digits, bottom right, '96 style
      const t = new Date(), yy = String(t.getFullYear()).slice(2), stamp = `'${yy} ${t.getMonth() + 1} ${t.getDate()}`;
      og.font = `700 30px "Courier New", ui-monospace, monospace`; og.textAlign = 'right'; og.textBaseline = 'alphabetic';
      og.shadowColor = 'rgba(255,120,30,0.9)'; og.shadowBlur = 8;
      og.fillStyle = '#ff8a1a'; og.fillText(stamp, W - 26, H - 24);
      og.shadowBlur = 0; og.fillStyle = '#ffc070'; og.fillText(stamp, W - 26, H - 24);
      return out.toDataURL('image/jpeg', 0.82);
    }

    // ---------------------------------------------------------------- taking a picture
    function snap(at) {
      const now = at || performance.now();
      if (!C.on || now - C.lastShot < 700 || !aim()) return false;
      C.lastShot = now;
      renderTo(shotRT);
      const url = develop();
      const p = addMine(url);
      drawLcd();
      // click, the flash, and the film winding on
      tone(2600, 0, 0.03, 'square', 0.18); sfx('poof', 0.25);
      tone(180, 420, 0.45, 'sawtooth', 0.05, 0.12); tone(420, 380, 0.25, 'sawtooth', 0.04, 0.55);
      C.flashT = now;
      if (state.mode === 'vr') { haptic(vrHands[C.hand], 0.6, 40); showPrint(p, now); }
      else flashScreen(url);
      const where = sharing() && PHOTOS.mode !== 'off' ? 'on your wall and everyone’s in the clubhouse' : 'on your wall in the clubhouse';
      showToast(`Click! It’s ${where}${state.mode === 'vr' ? '. Grab the print with your other hand' : ' (Photos, up top)'}`);
      return true;
    }
    function showPrint(p, now) {
      C.printOf = p;
      print.material.map = texFor(p.src); print.material.needsUpdate = true;
      print.visible = true; C.printT = now;
    }
    // browser: a white flash and the print sliding into the corner
    let flashDiv = null, thumb = null;
    function flashScreen(url) {
      if (!flashDiv) {
        flashDiv = document.createElement('div');
        Object.assign(flashDiv.style, { position: 'fixed', inset: '0', background: '#fff', opacity: '0', pointerEvents: 'none', zIndex: '30', transition: 'opacity 0.35s ease-out' });
        document.body.appendChild(flashDiv);
        thumb = document.createElement('img');
        Object.assign(thumb.style, { position: 'fixed', right: '18px', bottom: '90px', width: '220px', border: '8px solid #fbfaf6', boxShadow: '0 6px 18px rgba(0,0,0,0.45)', transform: 'rotate(-4deg)', opacity: '0', transition: 'opacity 0.4s, transform 0.4s', pointerEvents: 'none', zIndex: '29' });
        document.body.appendChild(thumb);
      }
      flashDiv.style.transition = 'none'; flashDiv.style.opacity = '0.9';
      requestAnimationFrame(() => { flashDiv.style.transition = 'opacity 0.35s ease-out'; flashDiv.style.opacity = '0'; });
      thumb.src = url; thumb.style.opacity = '1'; thumb.style.transform = 'rotate(-4deg)';
      clearTimeout(thumb.t); thumb.t = setTimeout(() => { thumb.style.opacity = '0'; thumb.style.transform = 'rotate(-4deg) translateY(30px)'; }, 2600);
    }

    // ---------------------------------------------------------------- taking it out and putting it away
    function toggle(hand) {
      C.on = !C.on;
      if (hand) C.hand = hand;
      C.trigPrev = true;    // (the trigger that pressed the watch doesn't also take a picture)
      if (!C.on) { C.selfie = false; body.visible = false; print.visible = false; }
      showToast(C.on ? (state.mode === 'vr' ? 'Camera out: the trigger takes a picture. Turn it round for a selfie' : 'Camera: Space takes a picture, V for a selfie, O to put it away') : 'Camera away');
      sfx(C.on ? 'click' : 'whoosh', 0.5);
      state.hudDirty = true; viewKey = '';
      if (typeof forcePresence === 'function') forcePresence();
      return C.on;
    }
    function flipSelfie() { if (!C.on) toggle(); C.selfie = !C.selfie; showToast(C.selfie ? 'Selfie: smile!' : 'Camera: looking out'); state.hudDirty = true; viewKey = ''; }

    // ---------------------------------------------------------------- pictures as textures (shared by walls and prints)
    const texCache = new Map();
    function texFor(src) {
      let t = texCache.get(src);
      if (t) return t;
      t = new THREE.Texture();
      const im = new Image();
      im.onload = () => { t.image = im; t.needsUpdate = true; };
      im.src = src;
      texCache.set(src, t);
      return t;
    }
    function showOn(mat, src, blank) {
      if (mat.userData.src === src) return;
      mat.userData.src = src;
      if (src) { mat.map = texFor(src); mat.color.setHex(0xffffff); } else { mat.map = null; mat.color.setHex(blank); }
      mat.needsUpdate = true;
    }
    // which hand is nearest (for a touch in VR)
    function nearHand(pos) {
      let best = 'right', d = Infinity;
      for (const side of SIDES) { const h = myHands[side]; if (h.ok && h.pos.distanceTo(pos) < d) { d = h.pos.distanceTo(pos); best = side; } }
      return best;
    }
    // my pressables need the hand to come away before they'll go again (a hand resting on a photo isn't a second press)
    function ready(btn) {
      if (state.mode !== 'vr') return true;
      if (!btn.ready) return false;
      btn.ready = false; return true;
    }

    // ---------------------------------------------------------------- prints: pictures you can hold and leave about
    const PRW = 0.12, PRH = 0.142;
    const prGeo = { card: boxg(PRW, PRH, 0.002), pic: new THREE.PlaneGeometry(PRW * 0.88, PRW * 0.66) };
    function makePrint() {
      const mat = new THREE.MeshLambertMaterial({ color: 0xf6f3ea, emissive: 0x000000 });
      const card = new THREE.Mesh(prGeo.card, mat);
      const pm = new THREE.MeshBasicMaterial({ color: 0x2a2a30 }); pm.userData.src = '';
      const pic = new THREE.Mesh(prGeo.pic, pm); pic.position.set(0, PRH * 0.165, 0.0012); card.add(pic);
      const back = new THREE.Mesh(prGeo.pic, pm); back.position.set(0, PRH * 0.165, -0.0012); back.rotation.y = Math.PI; back.visible = false; card.add(back);
      card.userData = { mat, pm };
      scene.add(card);
      return card;
    }
    const P = { held: null, placed: [] };     // held: { lid, gid, src, side, mesh }; placed: { lid, gid, src, lv, pos, quat, mesh, btn }
    const other = (s) => (s === 'left' ? 'right' : 'left');
    function takePrint(ph, side) {
      if (P.held) placeHeld();
      const mesh = makePrint();
      showOn(mesh.userData.pm, ph.src || '', 0x2a2a30);
      P.held = { lid: ph.lid || '', gid: ph.gid || '', src: ph.src || '', side: side || (C.on ? other(C.hand) : 'right'), mesh };
      holdPose();
      sfx('click', 0.4); state.hudDirty = true;
      if (typeof forcePresence === 'function') forcePresence();
      return P.held;
    }
    // where a print I'm holding is: in my hand (VR), or down in the corner of the view (browser)
    const _cq = new Q4(), _cp = new V3(), _tq = new Q4();
    function holdPose() {
      const h = P.held; if (!h) return;
      h.mesh.visible = state.mode !== 'menu';
      if (state.mode === 'vr') {
        const m = myHands[h.side]; if (!m.ok) { h.mesh.visible = false; return; }
        h.mesh.quaternion.copy(m.quat);
        h.mesh.position.copy(m.pos).add(_p.set(0, 0.045, -0.085).applyQuaternion(m.quat));
        return;
      }
      camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
      h.mesh.quaternion.copy(_cq).multiply(_tq.setFromEuler(new THREE.Euler(-0.12, 0.3, 0.06)));
      h.mesh.position.copy(_cp).add(_p.set(-0.2, -0.15, -0.42).applyQuaternion(_cq));
    }
    function placeHeld() {
      const h = P.held; if (!h) return false;
      P.held = null;
      if (state.mode === 'flat') {
        // a browser: stood up a step in front of you, facing you
        camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
        _f.set(0, 0, -1).applyQuaternion(_cq); _f.y = 0; if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1); _f.normalize();
        h.mesh.position.copy(_cp).addScaledVector(_f, 0.75); h.mesh.position.y = Math.max(0.35, _cp.y - 0.3);
        h.mesh.lookAt(_cp.x, h.mesh.position.y + 0.05, _cp.z);
      }
      addPlaced({ lid: h.lid, gid: h.gid, src: h.src, lv: state.level, pos: h.mesh.position.clone(), quat: h.mesh.quaternion.clone() }, h.mesh);
      savePrints(); sfx('whoosh', 0.3); state.hudDirty = true;
      if (typeof forcePresence === 'function') forcePresence();
      return true;
    }
    function addPlaced(o, mesh) {
      const m = mesh || makePrint();
      showOn(m.userData.pm, o.src || '', 0x2a2a30);
      m.position.copy(o.pos); m.quaternion.copy(o.quat);
      m.children[1].visible = true;    // (once it's down, its back shows the picture too, so it reads from either side)
      const it = Object.assign(o, { mesh: m, btn: null });
      const L = LEVELS[o.lv];
      if (L && Array.isArray(L.buttons)) {
        it.btn = { L, pos: o.pos.clone(), mesh: m, mat: m.userData.mat, onPress: () => { if (ready(it.btn)) pickUp(it); }, cool: 0, pressT: -1e9, baseY: o.pos.y, lit: false, label: 'Print', away: true, ready: false };
        L.buttons.push(it.btn);
      }
      P.placed.push(it);
      while (P.placed.length > 12) removePlaced(P.placed[0]);    // (twelve about at most: the oldest goes)
      return it;
    }
    function removePlaced(it) {
      const i = P.placed.indexOf(it); if (i >= 0) P.placed.splice(i, 1);
      scene.remove(it.mesh);
      if (it.btn) { const b = it.btn.L.buttons, j = b.indexOf(it.btn); if (j >= 0) b.splice(j, 1); }
    }
    function pickUp(it, side) {
      if (P.held) { showToast('You’re holding a print already: put that one down first'); return false; }
      removePlaced(it); savePrints();
      takePrint({ lid: it.lid, gid: it.gid, src: it.src }, side || (state.mode === 'vr' ? nearHand(it.pos) : 'right'));
      showToast(state.mode === 'vr' ? 'Got it: squeeze and let go to leave it somewhere' : 'Got it: press E to put it down');
      return true;
    }
    function binHeld() { const h = P.held; if (!h) return; P.held = null; scene.remove(h.mesh); sfx('whoosh', 0.3); state.hudDirty = true; if (typeof forcePresence === 'function') forcePresence(); }
    // where I left them stays on this device (and they come back next time)
    const r4 = (x) => Math.round(x * 10000) / 10000;
    function savePrints() {
      try {
        localStorage.setItem('fd_prints', JSON.stringify(P.placed.map((it) => ({
          lid: it.lid, gid: it.gid, lv: it.lv, p: [it.pos.x, it.pos.y, it.pos.z].map(r4), q: [it.quat.x, it.quat.y, it.quat.z, it.quat.w].map(r4),
          // (a print of someone else's photo keeps its own copy, in case theirs goes)
          s: !it.lid && okSrc(it.src) && it.src.length < 120000 ? it.src : '',
        }))));
      } catch (e) { /* full: they stay for this visit */ }
    }
    function loadPrints() {
      let a = [];
      try { a = JSON.parse(localStorage.getItem('fd_prints') || '[]'); } catch (e) { a = []; }
      if (!Array.isArray(a)) return;
      for (const o of a.slice(-12)) {
        if (!o || !Number.isInteger(o.lv) || o.lv < 0 || o.lv >= LEVELS.length || !Array.isArray(o.p) || o.p.length !== 3 || !Array.isArray(o.q) || o.q.length !== 4) continue;
        if (![...o.p, ...o.q].every((x) => Number.isFinite(x) && Math.abs(x) < 500)) continue;
        const own = typeof o.lid === 'string' && o.lid ? mine.find((p) => p.id === o.lid) : null;
        const src = own ? own.src : (okSrc(o.s) ? o.s : '');
        const gid = typeof o.gid === 'string' ? o.gid : '';
        if (!src && !gid) continue;
        addPlaced({ lid: own ? own.id : '', gid, src, lv: o.lv, pos: new V3(o.p[0], o.p[1], o.p[2]), quat: new Q4(o.q[0], o.q[1], o.q[2], o.q[3]).normalize() });
      }
    }
    // what friends need to see mine: the camera in my hand, the print I'm holding, and the ones I've left in this game
    // (only prints of photos that are up on everyone's wall: they can't see the others)
    const r3c = (x) => Math.round(x * 1000) / 1000;
    function pres() {
      const cam = C.on && state.mode !== 'menu' ? (C.hand === 'left' ? 1 : 2) : 0;
      const h = P.held && P.held.gid ? P.held : null;
      const here = P.placed.filter((it) => it.gid && it.lv === state.level).slice(-6).map((it) => [it.gid, r3c(it.pos.x), r3c(it.pos.y), r3c(it.pos.z), r3c(it.quat.x), r3c(it.quat.y), r3c(it.quat.z), r3c(it.quat.w)]);
      if (!cam && !h && !here.length) return null;
      return [cam, h ? h.gid : '', h ? (h.side === 'left' ? 1 : 2) : 0, here];
    }
    // ...and theirs, drawn here
    const theirs = new Map();
    let camProto = null;
    function theirCam() {
      if (!camProto) { camProto = body.clone(); for (const m of [screen, mirror, print, flashGlow]) camProto.children[body.children.indexOf(m)].visible = false; }
      const c = camProto.clone(); c.visible = true; scene.add(c); return c;
    }
    function theirPic(m, gid) {
      if (m.userData.gid === gid) return;
      m.userData.gid = gid; showOn(m.userData.pm, '', 0x2a2a30);
      PHOTOS.img(gid).then((src) => { if (m.userData.gid === gid) showOn(m.userData.pm, src, 0x2a2a30); });
    }
    const okEntry = (e) => Array.isArray(e) && e.length === 8 && typeof e[0] === 'string' && e.slice(1).every((x) => Number.isFinite(x) && Math.abs(x) < 500);
    function drawTheirs() {
      for (const [peer, o] of theirs) if (!remotes.has(peer)) { for (const m of [o.cam, o.held, ...o.placed]) if (m) scene.remove(m); theirs.delete(peer); }
      for (const rec of remotes.values()) {
        const a = rec.pres && rec.pres.cm;
        const ok = state.mode !== 'menu' && Array.isArray(a) && a.length === 4 && inMyLevel(rec) && rec.hasH;
        let o = theirs.get(rec.peer);
        if (!ok) { if (o) for (const m of [o.cam, o.held, ...o.placed]) if (m) m.visible = false; continue; }
        if (!o) theirs.set(rec.peer, (o = { cam: null, held: null, placed: [] }));
        const hand = (v) => (v === 1 && rec.hasL ? rec.cur.l : v === 2 && rec.hasR ? rec.cur.r : null);
        // their camera
        const ch = hand(a[0]);
        if (ch && !o.cam) o.cam = theirCam();
        if (o.cam) { o.cam.visible = !!ch; if (ch) { o.cam.quaternion.copy(ch.quat); o.cam.position.copy(ch.pos).add(_p.set(0, 0.035, -0.04).applyQuaternion(ch.quat)); } }
        // the print in their hand
        const ph = typeof a[1] === 'string' && a[1] && PHOTOS.has(a[1]) ? hand(a[2]) : null;
        if (ph && !o.held) o.held = makePrint();
        if (o.held) { o.held.visible = !!ph; if (ph) { theirPic(o.held, a[1]); o.held.quaternion.copy(ph.quat); o.held.position.copy(ph.pos).add(_p.set(0, 0.045, -0.085).applyQuaternion(ph.quat)); } }
        // the ones they've left about
        const list = Array.isArray(a[3]) ? a[3].filter(okEntry).slice(0, 6) : [];
        while (o.placed.length < list.length) { const m = makePrint(); m.children[1].visible = true; o.placed.push(m); }
        o.placed.forEach((m, i) => {
          const e = list[i]; m.visible = !!e && PHOTOS.has(e[0]);
          if (!m.visible) return;
          theirPic(m, e[0]); m.position.set(e[1], e[2], e[3]); m.quaternion.set(e[4], e[5], e[6], e[7]).normalize();
        });
      }
    }

    // ---------------------------------------------------------------- the three walls, past the fireplace (clubhouse west wall)
    const WALLS = { built: false, list: [], key: '' };
    const G_SM = { card: boxg(0.76, 0.7, 0.025), pic: new THREE.PlaneGeometry(0.68, 0.51), cap: new THREE.PlaneGeometry(0.7, 0.11) };
    const G_BIG = { card: boxg(1.0, 0.93, 0.025), pic: new THREE.PlaneGeometry(0.9, 0.675), cap: new THREE.PlaneGeometry(0.92, 0.15) };
    function buildWalls() {
      const L = LEVELS[HUB_IDX]; if (!L || !L.group) return;
      WALLS.built = true;
      const wall = (kind, z0, title, sub, cols, rows, big, plate) => {
        const g = new THREE.Group(); g.position.set(-11.82, 0, z0); g.rotation.y = Math.PI / 2; L.group.add(g); g.updateMatrixWorld(true);
        const sx = big ? 1.18 : 0.86, gw = cols * sx;
        makePlate(g, title, gw, 0.3, new V3(0, big ? 3.2 : 3.05, 0.02), 0, plate);
        makePlate(g, sub, gw * 0.9, 0.12, new V3(0, big ? 2.98 : 2.84, 0.02), 0, { bg: '#2a2236', fg: '#ffe9c2', size: 0.62 });
        const GG = big ? G_BIG : G_SM, slots = [];
        for (let k = 0; k < cols * rows; k++) {
          const col = k % cols, row = Math.floor(k / cols);
          const x = (col - (cols - 1) / 2) * sx, y = big ? 2.3 - row * 1.02 : 2.42 - row * 0.77;
          if (big) g.add(at(new THREE.Mesh(boxg(1.1, 1.03, 0.02), lam(0xc9a227)), x, y, 0.005));
          const mat = new THREE.MeshLambertMaterial({ color: 0xf4f1e8, emissive: 0x000000 });
          const card = new THREE.Mesh(GG.card, mat); card.position.set(x, y, 0.025); card.rotation.z = big ? 0 : ((k * 37) % 7 - 3) * 0.007;   // (pinned up a little crooked)
          const pm = new THREE.MeshBasicMaterial({ color: 0xcfc6b4 }); pm.userData.src = '';
          const pic = new THREE.Mesh(GG.pic, pm); pic.position.set(0, big ? 0.07 : 0.055, 0.0135); card.add(pic);
          const capC = canvasTexture(320, big ? 52 : 50);
          const capM = new THREE.Mesh(GG.cap, new THREE.MeshBasicMaterial({ map: capC.tex, transparent: true })); capM.position.set(0, big ? -0.37 : -0.275, 0.0135); card.add(capM);
          g.add(card);
          const slot = { kind, k, card, pm, capC, id: '', capKey: '', item: null };
          slot.btn = { L, pos: g.localToWorld(new V3(x, y, 0.09)), mesh: card, mat, onPress: () => pressSlot(slot), cool: 0, pressT: -1e9, baseY: y, lit: false, label: kind, off: true, away: true, ready: true };
          L.buttons.push(slot.btn);
          slots.push(slot);
        }
        WALLS.list.push({ kind, slots });
      };
      wall('mine', 5.4, '\u{1F4F7}  My photos', 'Touch one (or aim and press E) for a print of it', 4, 3, false, { bg: '#ffd23f', fg: '#1b1932', size: 0.66 });
      wall('all', 9.6, '♥  Everyone’s photos', 'Touch one (or aim and press E) to give it a heart', 4, 3, false, { bg: '#ff8fb1', fg: '#1b1932', size: 0.66 });
      wall('best', 14.3, '\u{1F3C6}  Best of all time', 'The photos with the most hearts', 3, 2, true, { bg: '#c9a227', fg: '#1b1932', size: 0.66 });
    }
    function wallItems(kind) {
      if (kind === 'mine') {
        const order = mine.filter((p) => p.kept).reverse().concat(mine.filter((p) => !p.kept).reverse());
        return order.slice(0, 12).map((p) => ({ id: p.id, src: p.src, a: p.kept ? `★ ${stampOf(p.t)}` : stampOf(p.t), b: p.gid ? `♥ ${PHOTOS.count(p.gid)}` : '', on: false, p }));
      }
      const list = kind === 'all' ? PHOTOS.list().slice(0, 12) : PHOTOS.best(6);
      return list.map((p, i) => ({ id: p.id, gid: p.id, a: kind === 'best' ? `#${i + 1}  ${p.n}` : p.n, b: `${p.hearted ? '♥' : '♡'} ${p.hearts}`, on: p.hearted }));
    }
    function drawCap(s, it) {
      const g = s.capC.g, cw = s.capC.c ? s.capC.c.width : 320, ch = s.capC.c ? s.capC.c.height : 50;
      g.clearRect(0, 0, cw, ch);
      g.textBaseline = 'middle';
      if (!it) {
        const blank = s.k ? '' : s.kind === 'mine' ? 'Take a photo: O, or the watch' : s.kind === 'all' ? (PHOTOS.mode === 'off' ? 'Only your own here: nowhere to share' : 'Nobody’s shared one yet') : 'Hearts put photos here';
        g.fillStyle = '#8a8070'; g.font = `italic 700 20px "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive`; g.textAlign = 'center'; g.fillText(blank, cw / 2, ch / 2, cw - 16);
      } else {
        g.font = `italic 700 ${s.kind === 'best' ? 26 : 24}px "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive`;
        g.fillStyle = '#2a2a6a'; g.textAlign = 'left'; g.fillText(it.a, 10, ch / 2, cw * 0.66);
        g.fillStyle = it.on ? '#e0244a' : '#a03040'; g.textAlign = 'right'; g.fillText(it.b, cw - 10, ch / 2);
      }
      s.capC.tex.needsUpdate = true;
    }
    function drawWalls() {
      if (!WALLS.built) buildWalls();
      for (const w of WALLS.list) {
        const items = wallItems(w.kind);
        w.slots.forEach((s) => {
          const it = items[s.k] || null;
          s.item = it; s.btn.off = !it;
          const id = it ? it.id : '';
          if (id !== s.id) {
            s.id = id; showOn(s.pm, '', 0xcfc6b4);
            if (it && it.src) showOn(s.pm, it.src, 0xcfc6b4);
            else if (it) PHOTOS.img(it.gid).then((src) => { if (s.id === id) showOn(s.pm, src, 0xcfc6b4); });
          }
          const ck = it ? `${it.a}|${it.b}|${it.on}` : `-${PHOTOS.mode}`;
          if (ck !== s.capKey) { s.capKey = ck; drawCap(s, it); }
        });
      }
    }
    function pressSlot(s) {
      if (!s.item || !ready(s.btn)) return;
      if (s.kind === 'mine') {
        const p = s.item.p;
        if (!p.kept) setKept(p, true);    // (a photo you've printed is one you're keeping)
        takePrint({ lid: p.id, gid: p.gid, src: p.src }, state.mode === 'vr' ? nearHand(s.btn.pos) : 'right');
        showToast(state.mode === 'vr' ? 'Here’s a print of it: squeeze and let go to leave it somewhere' : 'Here’s a print of it: press E to put it down');
        return;
      }
      const on = PHOTOS.heart(s.item.gid);
      sfx(on ? 'chime' : 'click', 0.5);
      showToast(on ? `You gave ${s.item.a.replace(/^#\d+\s+/, '')}’s photo a heart` : 'Heart taken back');
    }

    // ---------------------------------------------------------------- saving a picture as a file
    let dlNs = null;
    async function download(src, name) {
      try {
        const blob = await (await fetch(src)).blob();
        // the Claude page asks you first (its own save prompt); anywhere else it's an ordinary download
        if (window.claude && typeof window.claude.use === 'function') {
          if (dlNs === null) dlNs = (await window.claude.use('downloads')) || false;
          if (dlNs) {
            try { await dlNs.save({ filename: name, data: blob }); } catch (e) { if (e && e.code !== 'declined') showToast('Couldn’t save it from here'); }
            return;
          }
        }
        const a = document.createElement('a'), u = URL.createObjectURL(blob);
        a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 4000);
      } catch (e) { showToast('Couldn’t save that one'); }
    }
    const fileName = (t, extra) => { const d = new Date(t); return `field-day-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}${extra ? `-${extra}` : ''}.jpg`; };

    // ---------------------------------------------------------------- the album (browser): mine, everyone's, the best
    let album = null, tab = 'mine', albumVer = -1;
    const picked = new Set();
    const el = (tag, css, text) => { const e = document.createElement(tag); if (css) Object.assign(e.style, css); if (text !== undefined) e.textContent = text; return e; };
    const pill = (text, fn, css) => {
      const b = el('button', Object.assign({ font: `700 13px ${BODY}`, padding: '6px 10px', borderRadius: '8px', border: '0', cursor: 'pointer', background: '#ece6d6', color: '#1b1932' }, css || {}), text);
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return b;
    };
    const closeAlbum = () => { if (album) album.style.display = 'none'; };
    const albumOpen = () => !!album && album.style.display !== 'none';
    function printFromAlbum(ph) { closeAlbum(); takePrint(ph, 'right'); showToast(state.mode === 'vr' ? 'Here’s the print' : 'Here’s the print: press E to stand it up in front of you'); }
    function openAlbum(which) {
      if (which) { if (which !== tab) picked.clear(); tab = which; }
      if (!album) {
        album = el('div', { position: 'fixed', inset: '0', background: 'rgba(16,12,24,0.92)', zIndex: '40', overflow: 'auto', padding: '20px 16px 40px', boxSizing: 'border-box', font: `500 16px ${BODY}`, color: '#fff' });
        album.addEventListener('click', (e) => { if (e.target === album) closeAlbum(); });
        document.body.appendChild(album);
      }
      albumVer = PHOTOS.ver;
      const everyone = PHOTOS.list();
      album.replaceChildren();
      const wrap = el('div', { maxWidth: '1000px', margin: '0 auto' });
      const head = el('div', { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' });
      for (const [k, label] of [['mine', `My photos (${mine.length})`], ['all', `Everyone’s (${everyone.length})`], ['best', 'Best of all time']]) {
        head.appendChild(pill(label, () => openAlbum(k), { background: tab === k ? '#ffd23f' : 'rgba(255,255,255,0.12)', color: tab === k ? '#1b1932' : '#fff', font: `800 15px ${BODY}`, padding: '8px 13px' }));
      }
      head.appendChild(el('div', { flex: '1' }));
      head.appendChild(pill('Close', closeAlbum, { background: 'rgba(255,255,255,0.18)', color: '#fff' }));
      wrap.appendChild(head);
      const note = el('div', { color: '#d8cff0', fontSize: '14px', margin: '0 0 14px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', minHeight: '32px' });
      wrap.appendChild(note);
      const grid = el('div', { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '18px' });
      const card = (k, src, lines, buttons, sel) => {
        const c = el('div', { background: '#fbfaf6', color: '#1b1932', padding: '8px 8px 10px', boxShadow: sel ? '0 0 0 4px #ffd23f, 0 6px 18px rgba(0,0,0,0.45)' : '0 6px 18px rgba(0,0,0,0.45)', transform: `rotate(${(k % 3 - 1) * 1.2}deg)`, position: 'relative' });
        const im = el('img', { width: '100%', display: 'block', aspectRatio: '4 / 3', background: '#cfc6b4', objectFit: 'cover' });
        if (typeof src === 'string') im.src = src; else src.then((u) => { if (u) im.src = u; });
        c.appendChild(im);
        for (const [t, css] of lines) c.appendChild(el('div', Object.assign({ font: `italic 700 15px "Comic Sans MS", "Chalkboard SE", cursive`, marginTop: '6px', display: 'flex', justifyContent: 'space-between', gap: '8px' }, css || {}), t));
        const row = el('div', { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' });
        for (const b of buttons) row.appendChild(b);
        c.appendChild(row);
        return { c, im };
      };
      if (tab === 'mine') {
        note.appendChild(el('span', null, mine.length ? `The last ${KEEP} roll on: ★ Save keeps one in this browser for good. Tap pictures to pick several.` : 'No photos yet: press O for the camera, then Space to take one.'));
        if (PHOTOS.mode !== 'off') note.appendChild(pill(`New photos go on everyone’s wall: ${sharing() ? 'On' : 'Off'}`, () => { prefs.sharePhotos = !sharing(); savePrefs(); openAlbum(); }, { background: sharing() ? '#8bd450' : '#9a90b0' }));
        else note.appendChild(el('span', { color: '#a99cc8' }, '(Everyone’s wall isn’t reachable from here, so they stay on this device.)'));
        const sel = mine.filter((p) => picked.has(p.id));
        if (sel.length) {
          const bar = el('div', { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', background: '#2c2340', padding: '8px 10px', borderRadius: '10px', margin: '0 0 14px' });
          bar.appendChild(el('span', { fontWeight: '800' }, `${sel.length} picked`));
          bar.appendChild(pill(`★ Save ${sel.length} in this browser`, () => { for (const p of sel) setKept(p, true); showToast(`Saved ${sel.length} in this browser: they won’t roll off`); picked.clear(); openAlbum(); }, { background: '#ffd23f' }));
          bar.appendChild(pill(`Download ${sel.length}`, async () => { for (const p of sel) await download(p.src, fileName(p.t, p.id.slice(-4))); }));
          if (PHOTOS.mode !== 'off') bar.appendChild(pill('Put on everyone’s wall', () => { for (const p of sel) shareOne(p); picked.clear(); setTimeout(openAlbum, 600); }));
          bar.appendChild(pill(`Delete ${sel.length}`, () => { for (const p of sel) removeMine(p); picked.clear(); openAlbum(); }, { background: '#f2b8be' }));
          bar.appendChild(pill('Clear', () => { picked.clear(); openAlbum(); }, { background: 'rgba(255,255,255,0.18)', color: '#fff' }));
          wrap.appendChild(bar);
        }
        mine.slice().reverse().forEach((p, k) => {
          const shared = !!p.gid && PHOTOS.has(p.gid);
          const btns = [
            pill(p.kept ? '★ Saved' : '☆ Save', () => { setKept(p, !p.kept); openAlbum(); }, { background: p.kept ? '#ffd23f' : '#ece6d6' }),
            pill('Print', () => { setKept(p, true); printFromAlbum({ lid: p.id, gid: p.gid, src: p.src }); }),
            pill('Download', () => download(p.src, fileName(p.t, p.id.slice(-4)))),
          ];
          if (PHOTOS.mode !== 'off') btns.push(pill(shared ? 'Take off wall' : 'Share', () => { if (shared) unshareOne(p); else shareOne(p); setTimeout(openAlbum, shared ? 0 : 600); }));
          btns.push(pill('Delete', () => { picked.delete(p.id); removeMine(p); openAlbum(); }, { background: '#f2b8be' }));
          const { c, im } = card(k, p.src, [[`${stampOf(p.t)}${p.kept ? '  ★' : ''}`], ...(shared ? [[`on everyone’s wall  ♥ ${PHOTOS.count(p.gid)}`, { fontSize: '13px', color: '#a03040' }]] : [])], btns, picked.has(p.id));
          im.style.cursor = 'pointer'; im.title = 'Tap to pick';
          im.addEventListener('click', (e) => { e.stopPropagation(); if (picked.has(p.id)) picked.delete(p.id); else picked.add(p.id); openAlbum(); });
          grid.appendChild(c);
        });
      } else {
        const list = tab === 'all' ? everyone : PHOTOS.best(12);
        note.textContent = PHOTOS.mode === 'off' ? 'Everyone’s wall isn’t reachable from here (on your own website it needs photos.php next to the game).'
          : tab === 'all' ? (list.length ? 'Photos everyone has shared, newest first. Give the ones you like a heart.' : 'Nobody’s shared a photo yet.')
            : (list.length ? 'The photos with the most hearts, ever.' : 'No hearts yet: give photos on Everyone’s a heart and the best end up here.');
        list.forEach((p, k) => {
          const src = PHOTOS.img(p.id);
          const btns = [
            pill(`${p.hearted ? '♥' : '♡'} ${p.hearts}`, () => { PHOTOS.heart(p.id); openAlbum(); }, { background: p.hearted ? '#ff8fb1' : '#ece6d6' }),
            pill('Print', () => src.then((u) => printFromAlbum({ lid: '', gid: p.id, src: u }))),
            pill('Download', () => src.then((u) => u && download(u, fileName(p.t, p.n.replace(/[^a-z0-9]/gi, '').slice(0, 12))))),
          ];
          if (p.mine) btns.push(pill('Take down', () => { const m = mine.find((x) => x.gid === p.id); if (m) unshareOne(m); else PHOTOS.unshare(p.id); openAlbum(); }, { background: '#f2b8be' }));
          grid.appendChild(card(k, src, [[`${tab === 'best' ? `#${k + 1}  ` : ''}${p.n}${p.mine ? ' (you)' : ''}`], [stampOf(p.t), { fontSize: '13px', color: '#6a6070' }]], btns, false).c);
        });
      }
      wrap.appendChild(grid);
      album.appendChild(wrap);
      album.style.display = 'block';
    }

    // ---------------------------------------------------------------- every frame
    let viewKey = '';
    const viewDiv = document.createElement('div');
    Object.assign(viewDiv.style, { position: 'fixed', inset: '15% 12% 19%', border: '2px solid rgba(255,255,255,0.75)', borderRadius: '10px', pointerEvents: 'none', zIndex: '6', display: 'none', boxShadow: '0 0 0 9999px rgba(0,0,0,0.18)' });
    const vfText = document.createElement('div');
    Object.assign(vfText.style, { position: 'absolute', left: '14px', top: '10px', font: `700 15px "Courier New", monospace`, color: '#ffd23f', textShadow: '0 1px 2px #000' });
    const vfDot = document.createElement('div');
    Object.assign(vfDot.style, { position: 'absolute', left: '50%', top: '50%', width: '26px', height: '26px', margin: '-13px', border: '2px solid rgba(255,255,255,0.8)', borderRadius: '50%' });
    viewDiv.append(vfText, vfDot);
    document.body.appendChild(viewDiv);
    function tick(dt, now) {
      const L = curLevel(), atHub = state.level === HUB_IDX;
      // the walls, whenever you're in the clubhouse
      PHOTOS.tick(now, (atHub && state.mode !== 'menu') || albumOpen());
      if (atHub) { const k = `${PHOTOS.ver}|${C.ver}`; if (k !== WALLS.key) { WALLS.key = k; drawWalls(); } }
      if (albumOpen() && tab !== 'mine' && albumVer !== PHOTOS.ver) openAlbum();
      // my wall photos and prints want the hand to come away before they press again
      if (state.mode === 'vr') for (const b of L.buttons) if (b.away && !b.ready) {
        let far = true;
        for (const side of SIDES) { const h = myHands[side]; if (h.ok && h.pos.distanceTo(b.pos) < 0.22) far = false; }
        if (far) b.ready = true;
      }
      // prints: the one I'm holding, the ones I've left (only in their own game), and my friends'
      holdPose();
      for (const it of P.placed) {
        it.mesh.visible = it.lv === state.level && state.mode !== 'menu';
        if (!it.src && it.gid && !it.asked && PHOTOS.has(it.gid)) { it.asked = true; PHOTOS.img(it.gid).then((src) => { if (src) { it.src = src; showOn(it.mesh.userData.pm, src, 0x2a2a30); } }); }
      }
      drawTheirs();
      const flat = state.mode === 'flat' && C.on;
      const vk = `${flat}|${C.selfie}|${mine.length}`;
      if (vk !== viewKey) { viewKey = vk; viewDiv.style.display = flat ? 'block' : 'none'; vfText.textContent = `${C.selfie ? 'SELFIE' : 'CAMERA'}   SPACE: SHOOT   V: FLIP   O: PUT AWAY   ${String(mine.length).padStart(2, '0')}`; }
      // VR grips: take the print sticking out of the camera, or pick up one lying about; let go to leave it
      if (state.mode === 'vr') {
        for (const side of SIDES) {
          const gp = vrHands[side].source && vrHands[side].source.gamepad;
          const g = !!(gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed), was = C.grip[side];
          C.grip[side] = g;
          const h = myHands[side]; if (!h.ok) continue;
          if (g && !was) {
            if (print.visible && C.on && side !== C.hand && C.printOf && print.getWorldPosition(_h).distanceTo(h.pos) < 0.17) {
              print.visible = false; const p = C.printOf; setKept(p, true);
              takePrint({ lid: p.id, gid: p.gid, src: p.src }, side); haptic(vrHands[side], 0.4, 30);
            } else if (!P.held) {
              const it = P.placed.find((x) => x.lv === state.level && x.mesh.position.distanceTo(h.pos) < 0.15);
              if (it) { pickUp(it, side); haptic(vrHands[side], 0.4, 30); }
            }
          }
          if (!g && was && P.held && P.held.side === side) { placeHeld(); haptic(vrHands[side], 0.3, 20); }
        }
      }
      if (!C.on || state.mode === 'menu') { body.visible = false; return; }
      if (state.mode === 'vr') {
        const h = myHands[C.hand];
        body.visible = h.ok;
        if (!h.ok) return;
        // held the way you'd hold a camera: in the hand, the lens out along the controller
        body.quaternion.copy(h.quat);
        body.position.copy(h.pos).add(_p.set(0, 0.035, -0.04).applyQuaternion(h.quat));
        // the trigger on that hand takes the picture
        const gp = vrHands[C.hand].source && vrHands[C.hand].source.gamepad;
        const trig = !!(gp && gp.buttons && gp.buttons[0] && gp.buttons[0].pressed);
        if (trig && !C.trigPrev) snap(now);
        C.trigPrev = trig;
        // the little screen and the selfie mirror (a few times a second is plenty)
        C.frame += 1;
        if (C.frame % 4 === 0 && aim()) renderTo(preRT);
        mirror.visible = C.selfie;
      } else body.visible = false;
      // the flash, and the print sliding out (it waits there a while for you to take it)
      flashGlow.visible = now - C.flashT < 90;
      if (print.visible) {
        const u = (now - C.printT) / 1000;
        print.position.set(-0.01, 0.035 + Math.min(1, u * 1.6) * 0.07, 0.006);
        if (u > 12) print.visible = false;
      }
    }
    // in a browser, the screen shows what the camera sees (a selfie is seen from in front of you)
    function viewCam() {
      if (state.mode !== 'flat' || !C.on || !C.selfie || !aim()) return null;
      const el2 = renderer.domElement, a = el2.clientWidth / Math.max(1, el2.clientHeight);
      if (Math.abs(pcam.aspect - a) > 1e-3) { pcam.aspect = a; pcam.updateProjectionMatrix(); }
      myAvatar().visible = true; return pcam;
    }
    function afterRender() { if (me) me.visible = false; }
    // E in a browser, holding a print and not aiming at anything: stand it up in front of you
    function onE() { if (state.mode !== 'flat' || !P.held) return false; placeHeld(); return true; }
    const hud = [
      { label: () => (C.on ? 'Camera: on ▸' : 'Camera'), run: () => toggle() },
      { label: () => (C.selfie ? 'Selfie ↺' : 'Selfie'), show: () => C.on && state.mode === 'flat', run: () => flipSelfie() },
      { label: () => `Photos (${mine.length})`, run: () => openAlbum() },
      { label: () => 'Put print down', show: () => !!P.held && state.mode === 'flat', run: () => placeHeld() },
      { label: () => 'Bin print', show: () => !!P.held && state.mode === 'flat', run: () => binHeld() },
    ];
    const loading = load();
    return {
      C, mine, P, WALLS, body, print, toggle, flipSelfie, snap, tick, viewCam, afterRender, hud, openAlbum, closeAlbum, develop, aim, drawWalls, drawWall: drawWalls,
      isOn: () => C.on, pres, onE, theirs, pressSlot, takePrint, placeHeld, pickUp, binHeld, setKept, removeMine, shareOne, unshareOne, download, loading,
      get photos() { return mine.map((p) => p.src); },
    };
  })();
