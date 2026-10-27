  // ================================================================ THE CAMERA: a 90s point-and-shoot
  // Take it out from the watch (VR) or with P / the Camera button (browser). VR: it sits in the hand that pressed the
  // watch; the trigger on that hand takes a picture. Its little screen on the back shows what the lens sees; turn it
  // round to face you and it's a selfie (the tiny mirror by the lens shows you). Browser: the screen becomes the
  // viewfinder; Space or a click takes a picture, V flips to a selfie (you, seen from arm's length).
  // Pictures come out warm and a touch faded, with a little grain and an orange date stamp in the corner, like a
  // drugstore print from 1996. The last 12 are kept on this device: a Photos album (browser, with downloads) and a photo
  // wall by the fireplace in the clubhouse.
  const CAMERA = (() => {
    const C = { on: false, selfie: false, hand: 'right', trigPrev: true, flashT: 0, frame: 0, printT: 0, lastShot: 0 };
    const KEEP = 12, W = 640, H = 480;
    const photos = [];
    try { const a = JSON.parse(localStorage.getItem('fd_photos') || '[]'); if (Array.isArray(a)) for (const s of a.slice(-KEEP)) if (typeof s === 'string' && s.startsWith('data:image/')) photos.push(s); } catch (e) { /* none kept */ }
    const store = () => { try { localStorage.setItem('fd_photos', JSON.stringify(photos)); } catch (e) { /* full, or blocked: they stay for this visit */ } };

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
      g.fillText(String(photos.length).padStart(2, '0'), 32, 17); lcdC.tex.needsUpdate = true;
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
    function snap(at) {
      const now = at || performance.now();
      if (!C.on || now - C.lastShot < 700 || !aim()) return false;
      C.lastShot = now;
      renderTo(shotRT);
      const url = develop();
      photos.push(url); while (photos.length > KEEP) photos.shift();
      store(); drawLcd(); wallKey = '';
      // click, the flash, and the film winding on
      tone(2600, 0, 0.03, 'square', 0.18); sfx('poof', 0.25);
      tone(180, 420, 0.45, 'sawtooth', 0.05, 0.12); tone(420, 380, 0.25, 'sawtooth', 0.04, 0.55);
      C.flashT = now;
      if (state.mode === 'vr') { haptic(vrHands[C.hand], 0.6, 40); showPrint(url); }
      else flashScreen(url);
      showToast(`Click! Photo ${photos.length} of the last ${KEEP} saved${state.mode === 'vr' ? ' (see them on the photo wall in the clubhouse)' : ' (Photos, up top)'}`);
      return true;
    }
    function showPrint(url) {
      const im = new Image();
      im.onload = () => { printTex.image = im; printTex.needsUpdate = true; print.visible = true; C.printT = performance.now(); };
      im.src = url;
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
      showToast(C.on ? (state.mode === 'vr' ? 'Camera out: the trigger takes a picture. Turn it round for a selfie' : 'Camera: Space takes a picture, V for a selfie, P to put it away') : 'Camera away');
      sfx(C.on ? 'click' : 'whoosh', 0.5);
      state.hudDirty = true; viewKey = '';
      return C.on;
    }
    function flipSelfie() { if (!C.on) toggle(); C.selfie = !C.selfie; showToast(C.selfie ? 'Selfie: smile!' : 'Camera: looking out'); state.hudDirty = true; viewKey = ''; }

    // ---------------------------------------------------------------- the album (browser) and the wall (clubhouse)
    let album = null;
    function openAlbum() {
      if (!album) {
        album = document.createElement('div');
        Object.assign(album.style, { position: 'fixed', inset: '0', background: 'rgba(16,12,24,0.9)', zIndex: '40', overflow: 'auto', padding: '24px 16px', boxSizing: 'border-box', font: `500 16px ${BODY}`, color: '#fff' });
        album.addEventListener('click', (e) => { if (e.target === album) album.style.display = 'none'; });
        document.body.appendChild(album);
      }
      album.replaceChildren();
      const head = document.createElement('div'); Object.assign(head.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '980px', margin: '0 auto 16px' });
      const h = document.createElement('div'); h.textContent = photos.length ? `Your photos (the last ${KEEP} are kept)` : 'No photos yet: press P for the camera, then Space to take one'; h.style.font = `800 22px ${DISPLAY}`;
      const x = document.createElement('button'); x.textContent = 'Close'; x.className = 'hud-btn'; x.addEventListener('click', () => { album.style.display = 'none'; });
      head.append(h, x); album.appendChild(head);
      const grid = document.createElement('div'); Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '18px', maxWidth: '980px', margin: '0 auto' });
      photos.slice().reverse().forEach((url, k) => {
        const n = photos.length - k, card = document.createElement('div');
        Object.assign(card.style, { background: '#fbfaf6', padding: '8px 8px 10px', boxShadow: '0 6px 18px rgba(0,0,0,0.45)', transform: `rotate(${(k % 3 - 1) * 1.5}deg)` });
        const im = document.createElement('img'); im.src = url; im.style.width = '100%'; im.style.display = 'block';
        const row = document.createElement('div'); Object.assign(row.style, { display: 'flex', gap: '10px', marginTop: '8px', fontSize: '14px' });
        const dl = document.createElement('a'); dl.href = url; dl.download = `field-day-photo-${n}.jpg`; dl.textContent = 'Download'; dl.style.color = '#1b5ad8';
        const del = document.createElement('a'); del.href = '#'; del.textContent = 'Delete'; del.style.color = '#c23b4a';
        del.addEventListener('click', (e) => { e.preventDefault(); const i = photos.indexOf(url); if (i >= 0) photos.splice(i, 1); store(); drawLcd(); wallKey = ''; openAlbum(); state.hudDirty = true; });
        row.append(dl, del); card.append(im, row); grid.appendChild(card);
      });
      album.appendChild(grid);
      album.style.display = 'block';
    }
    // the photo wall: twelve frames on the clubhouse's west wall, past the fireplace
    let wall = null, wallKey = '';
    function buildWall() {
      const L = LEVELS[HUB_IDX]; if (!L || !L.group) return;
      const g = new THREE.Group(); g.position.set(-11.82, 0, 9.0); g.rotation.y = Math.PI / 2; L.group.add(g);
      makePlate(g, '\u{1F4F7}  Photo wall: your last 12', 2.6, 0.28, new V3(0, 3.3, 0.02), 0, { bg: '#ffd23f', fg: '#1b1932', size: 0.6 });
      const frames = [];
      for (let k = 0; k < KEEP; k++) {
        const col = k % 4, row = Math.floor(k / 4), x = -1.5 + col * 1.0, y = 2.65 - row * 0.8;
        g.add(at(new THREE.Mesh(boxg(0.9, 0.69, 0.03), lam(0x5a3a24)), x, y, 0));
        const tex = new THREE.Texture();
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ color: 0xe8dcc8 }));   // (a blank card until there's a photo)
        pic.position.set(x, y, 0.02); g.add(pic); frames.push({ pic, tex, url: '' });
      }
      wall = { g, frames };
    }
    function drawWall() {
      if (!wall) buildWall();
      if (!wall) return;
      const list = photos.slice().reverse();
      wall.frames.forEach((f, k) => {
        const url = list[k] || '';
        if (url === f.url) return;
        f.url = url;
        if (!url) { f.pic.material.map = null; f.pic.material.color.setHex(0xe8dcc8); f.pic.material.needsUpdate = true; return; }
        const im = new Image();
        im.onload = () => { f.tex.image = im; f.tex.needsUpdate = true; f.pic.material.map = f.tex; f.pic.material.color.setHex(0xffffff); f.pic.material.needsUpdate = true; };
        im.src = url;
      });
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
      // the photo wall, whenever you're in the clubhouse
      if (state.level === HUB_IDX && wallKey !== photos.join('|').length + ':' + photos.length) { wallKey = photos.join('|').length + ':' + photos.length; drawWall(); }
      const flat = state.mode === 'flat' && C.on;
      const vk = `${flat}|${C.selfie}|${photos.length}`;
      if (vk !== viewKey) { viewKey = vk; viewDiv.style.display = flat ? 'block' : 'none'; vfText.textContent = `${C.selfie ? 'SELFIE' : 'CAMERA'}   SPACE: SHOOT   V: FLIP   P: PUT AWAY   ${String(photos.length).padStart(2, '0')}`; }
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
        mirror.visible = C.selfie; screen.visible = !C.selfie || true;
      } else body.visible = false;
      // the flash, and the print sliding out
      flashGlow.visible = now - C.flashT < 90;
      if (print.visible) {
        const u = (now - C.printT) / 1000;
        print.position.set(-0.01, 0.035 + Math.min(1, u * 1.6) * 0.07, 0.006);
        if (u > 4) print.visible = false;
      }
    }
    // in a browser, the screen shows what the camera sees (a selfie is seen from in front of you)
    function viewCam() {
      if (state.mode !== 'flat' || !C.on || !C.selfie || !aim()) return null;
      const el = renderer.domElement, a = el.clientWidth / Math.max(1, el.clientHeight);
      if (Math.abs(pcam.aspect - a) > 1e-3) { pcam.aspect = a; pcam.updateProjectionMatrix(); }
      myAvatar().visible = true; return pcam;
    }
    function afterRender() { if (me) me.visible = false; }
    const hud = [
      { label: () => (C.on ? 'Camera: on ▸' : 'Camera'), run: () => toggle() },
      { label: () => (C.selfie ? 'Selfie ↺' : 'Selfie'), show: () => C.on && state.mode === 'flat', run: () => flipSelfie() },
      { label: () => `Photos (${photos.length})`, run: () => openAlbum() },
    ];
    return { C, photos, body, toggle, flipSelfie, snap, tick, viewCam, afterRender, hud, openAlbum, develop, aim, drawWall, isOn: () => C.on };
  })();
