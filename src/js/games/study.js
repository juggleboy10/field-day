  // ================================================================ STUDY HALL: the shared room, screens and answer cards
  // A bright study hall: wood floor, tall windows, bookshelves, a wall clock that tells the real time.
  // Answer cards are the one way you answer in every Study Hall game: in VR touch one (or point and pull the trigger),
  // in the browser aim at it and click, or press its number.
  const STUDY = (() => {
    const env = () => ({
      sky: skyTexture([[0, '#5a9ad8'], [0.48, '#bfe0f5'], [0.5, '#e8f2f8'], [0.52, '#7a9a5a'], [1, '#4a6a3a']]),
      bg: 0xbfe0f5, fog: [0xbfe0f5, 60, 200], hemi: [0xfff8ee, 0x8a7a6a, 0.85],
      sun: [0xfff2d8, 0.55], sunDir: new V3(0.5, 0.8, 0.4), ambient: [0xfff0e0, 0.5], sprite: null,
    });
    const floorTex = canvasTexture(256, 256, (g) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = ['#b8875a', '#a87a50', '#c0905e', '#b0804f'][i % 4]; g.fillRect(0, i * 32, 256, 32);
        g.fillStyle = 'rgba(40,20,0,0.25)'; g.fillRect(0, i * 32 + 31, 256, 1); g.fillRect((i * 97) % 256, i * 32, 2, 32);
      }
    }).tex;
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 4);
    const BOOK_COLS = [0xb03a2e, 0x2e6ab0, 0x2e8a4a, 0xd8a03a, 0x6a3ab0, 0x3a3a4a, 0xe8e0d0, 0x8a4a2a];
    function shelf(G, rand, x, z, yaw, w) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; G.add(g);
      const wood = lam(0x6a4a30);
      addBox(g, w, 2.2, 0.06, wood, 0, 1.1, -0.17);
      for (const sx of [-1, 1]) addBox(g, 0.05, 2.2, 0.36, wood, sx * w / 2, 1.1, 0);
      for (let r = 0; r < 5; r++) {
        const y = 0.08 + r * 0.5;
        addBox(g, w, 0.04, 0.36, wood, 0, y, 0);
        if (r === 4) continue;
        let bx = -w / 2 + 0.06;
        while (bx < w / 2 - 0.1) {
          const bw = 0.04 + rand() * 0.04, bh = 0.26 + rand() * 0.14;
          if (rand() < 0.08) { bx += 0.12; continue; }
          addBox(g, bw, bh, 0.24, lam(BOOK_COLS[Math.floor(rand() * BOOK_COLS.length)]), bx + bw / 2, y + 0.02 + bh / 2, 0.02);
          bx += bw + 0.005;
        }
      }
      return g;
    }
    // the room: o = { w, d, h, z (centre), shelves }
    function room(G, rand, o) {
      const W = o.w || 14, D = o.d || 12, H = o.h || 4.2, Z = o.z || 0;
      const z0 = Z - D / 2, z1 = Z + D / 2;
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: floorTex })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, Z); G.add(fl);
      const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), lam(0xf4f0e8)); ce.rotation.x = Math.PI / 2; ce.position.set(0, H, Z); G.add(ce);
      const wall = lam(0xe8dfcc), trim = lam(0x7a5a3a);
      addBox(G, W, H, 0.2, wall, 0, H / 2, z0 - 0.1); addBox(G, W, H, 0.2, wall, 0, H / 2, z1 + 0.1);
      addBox(G, W, 1.0, 0.04, trim, 0, 0.5, z0 + 0.02); addBox(G, W, 1.0, 0.04, trim, 0, 0.5, z1 - 0.02);
      const glass = new THREE.MeshBasicMaterial({ color: 0xcfe8ff }), frame = lam(0xf4f2ec);
      for (const sx of [-1, 1]) {
        const x = sx * (W / 2 + 0.1);
        addBox(G, 0.2, H, D, wall, x, H / 2, Z);
        addBox(G, 0.04, 1.0, D, trim, x - sx * 0.12, 0.5, Z);
        // tall windows down each side, with a glimpse of sky and lawn
        const nw = Math.max(2, Math.floor(D / 3.4));
        for (let i = 0; i < nw; i++) {
          const wz = z0 + (i + 0.5) * D / nw;
          const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), glass); pane.position.set(x - sx * 0.11, 2.2, wz); pane.rotation.y = -sx * Math.PI / 2; G.add(pane);
          for (const dy of [-1.02, 0, 1.02]) addBox(G, 0.06, 0.07, 1.7, frame, x - sx * 0.12, 2.2 + dy, wz);
          for (const dz of [-0.82, 0, 0.82]) addBox(G, 0.06, 2.1, 0.07, frame, x - sx * 0.12, 2.2, wz + dz);
          addBox(G, 0.22, 0.05, 1.8, frame, x - sx * 0.15, 1.15, wz);
        }
      }
      // ceiling lights
      const lightM = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
      for (let ix = -1; ix <= 1; ix++) for (let iz = 0; iz < Math.floor(D / 4); iz++) addBox(G, 1.4, 0.05, 0.5, lightM, ix * W / 3.2, H - 0.03, z0 + (iz + 0.5) * D / Math.floor(D / 4));
      // bookshelves along the back of the room (behind you)
      for (const sx of [-1, 1]) shelf(G, rand, sx * (W / 2 - 1.6), z1 - 0.25, Math.PI, 2.4);
      if (o.shelves !== false) for (const sx of [-1, 1]) shelf(G, rand, sx * (W / 2 - 1.3), z0 + 0.25, 0, 1.8);
      // a pennant over the front, and a clock with the real time
      makePlate(G, '\u{1F4DA}  STUDY HALL', 3.6, 0.5, new V3(0, H - 0.45, z0 + 0.02), 0, { bg: '#1f5a9a', fg: '#ffffff', size: 0.62 });
      const clock = new THREE.Group(); clock.position.set(o.clockX !== undefined ? o.clockX : W / 2 - 1.3, H - 1.0, z0 + 0.04); G.add(clock);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), lam(0xffffff)); clock.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 32), lam(0x2a2a2a)); clock.add(rim);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; addBox(clock, 0.02, i % 3 ? 0.04 : 0.07, 0.01, lam(0x2a2a2a), Math.sin(a) * 0.29, Math.cos(a) * 0.29, 0.01).rotation.z = -a; }
      const hand = (len, wd, col) => { const p = new THREE.Group(); const m = addBox(p, wd, len, 0.01, lam(col), 0, len / 2 - 0.03, 0.02); void m; clock.add(p); return p; };
      const hh = hand(0.18, 0.03, 0x1a1a1a), mh = hand(0.26, 0.02, 0x1a1a1a), sh = hand(0.28, 0.008, 0xd03a2a);
      // a plant in a corner
      for (const sx of [-1, 1]) {
        const px = sx * (W / 2 - 0.5), pz = Z + D / 2 - 0.7;   // (in the back corners, out of the way of the boards on the side walls)
        addCyl(G, 0.22, 0.17, 0.4, 12, lam(0xc06a3a), px, 0.2, pz);
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const lf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), lam(0x3a8a3a)); lf.scale.set(0.6, 1.6, 0.6); lf.position.set(px + Math.cos(a) * 0.12, 0.65 + (k % 2) * 0.1, pz + Math.sin(a) * 0.12); lf.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); G.add(lf); }
      }
      return {
        tick() {
          const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
          sh.rotation.z = -s / 60 * Math.PI * 2; mh.rotation.z = -m / 60 * Math.PI * 2; hh.rotation.z = -h / 12 * Math.PI * 2;
        },
      };
    }
    // a canvas screen on a stand or wall
    function screen(G, cw, ch, w, h, x, y, z, yaw, frameCol) {
      const ct = canvasTexture(cw, ch);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.06), lam(frameCol || 0x2a2a35)); fr.position.set(x, y, z); fr.rotation.y = yaw || 0; G.add(fr);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ct.tex }));
      face.position.set(x + Math.sin(yaw || 0) * 0.035, y, z + Math.cos(yaw || 0) * 0.035); face.rotation.y = yaw || 0; G.add(face);
      return { g: ct.g, tex: ct.tex, cw, ch, face, key: '' };
    }
    // word wrap: draws text in lines no wider than maxW; returns the number of lines (draw=false just measures)
    function wrap(g, text, x, y, maxW, lh, maxLines, draw) {
      const words = String(text).split(' '); const lines = []; let cur = '';
      for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur);
      const n = maxLines ? Math.min(lines.length, maxLines) : lines.length;
      if (draw !== false) for (let i = 0; i < n; i++) g.fillText(i === n - 1 && n < lines.length ? `${lines[i]}…` : lines[i], x, y + i * lh, maxW);
      return lines.length;
    }
    // the biggest font (from big down to small) that fits text in maxLines lines
    function fit(g, text, maxW, maxLines, big, small, weight, family) {
      for (let s = big; s >= small; s -= 2) { g.font = `${weight || 700} ${s}px ${family || BODY}`; if (wrap(g, text, 0, 0, maxW, s, 0, false) <= maxLines) return s; }
      return small;
    }
    // ---------------------------------------------------------------- answer cards
    // o: { n, w, h, colors, numbered } -> { cards, set(i, text, look), pickRay(from, dir), touched(pos) }
    const LOOKS = { idle: ['#ffffff', '#1a2a4a', '#3a6ad8'], right: ['#8bd450', '#12301a', '#2a8a2a'], wrong: ['#ff6a6a', '#3a1010', '#b02a2a'], dim: ['#c8ccd8', '#6a7088', '#9aa0b8'], mode: ['#ffd23f', '#2a2010', '#d89a1a'] };
    function cards(G, o) {
      const n = o.n || 4, W = o.w || 0.62, Hh = o.h || 0.36, CW = 512, CH = Math.round(512 * Hh / W);
      const list = [];
      for (let i = 0; i < n; i++) {
        const grp = new THREE.Group(); G.add(grp);
        const backM = new THREE.MeshLambertMaterial({ color: 0x3a6ad8, emissive: 0x000000 });
        const back = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, Hh + 0.05, 0.03), backM); back.position.z = -0.018; grp.add(back);
        const ct = canvasTexture(CW, CH);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true })); grp.add(face);
        list.push({ i, grp, back, backM, face, ct, text: '', look: 'idle', key: '', hl: false, num: o.numbered === false ? '' : String(i + 1), visible: true });
      }
      function draw(c) {
        const key = `${c.text}|${c.look}|${c.num}|${c.sub || ''}`;
        if (key === c.key) return; c.key = key;
        const g = c.ct.g, L2 = LOOKS[c.look] || LOOKS.idle;
        g.clearRect(0, 0, CW, CH);
        g.fillStyle = L2[0]; rr(g, 4, 4, CW - 8, CH - 8, 26); g.fill();
        g.lineWidth = 8; g.strokeStyle = L2[2]; rr(g, 4, 4, CW - 8, CH - 8, 26); g.stroke();
        const pad = c.num ? 92 : 30;
        if (c.num) {
          g.fillStyle = L2[2]; g.beginPath(); g.arc(52, CH / 2, 32, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffffff'; g.font = `900 40px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.num, 52, CH / 2 + 2);
        }
        g.fillStyle = L2[1]; g.textAlign = 'center'; g.textBaseline = 'middle';
        const mw = CW - pad - 30, lines = c.sub ? 2 : 3;
        const s = fit(g, c.text, mw, lines, c.big || 58, 22, 700, c.mono ? 'ui-monospace, Menlo, Consolas, monospace' : BODY);
        const nl = Math.min(lines, wrap(g, c.text, 0, 0, mw, s * 1.12, lines, false));
        const y0 = CH / 2 - (nl - 1) * s * 0.56 - (c.sub ? 18 : 0);
        wrap(g, c.text, pad + mw / 2, y0, mw, s * 1.12, lines);
        if (c.sub) { g.font = `400 30px ${BODY}`; g.fillStyle = L2[1]; g.fillText(c.sub, pad + mw / 2, CH - 34, mw); }
        c.ct.tex.needsUpdate = true;
        c.backM.color.set(L2[2]);
      }
      const api = {
        cards: list, W, H: Hh,
        set(i, text, look, extra) { const c = list[i]; c.text = text; c.look = look || 'idle'; c.sub = extra && extra.sub; c.mono = extra && extra.mono; c.big = extra && extra.big; draw(c); },
        look(i, look) { const c = list[i]; c.look = look; draw(c); },
        show(i, on) { list[i].grp.visible = on; list[i].visible = on; },
        place(i, x, y, z, yaw, tilt) { const g = list[i].grp; g.position.set(x, y, z); g.rotation.set(tilt || 0, yaw || 0, 0, 'YXZ'); },
        // which card a ray hits (from, dir in world space)
        pickRay(from, dir) {
          let best = -1, bt = Infinity;
          for (const c of list) {
            if (!c.visible) continue;
            c.grp.updateMatrixWorld();
            const lf = c.grp.worldToLocal(_a.copy(from)), lt = c.grp.worldToLocal(_b.copy(from).add(dir));
            const dz = lt.z - lf.z; if (Math.abs(dz) < 1e-6) continue;
            const t = -lf.z / dz; if (t <= 0 || t > 30) continue;
            const x = lf.x + (lt.x - lf.x) * t, y = lf.y + (lt.y - lf.y) * t;
            if (Math.abs(x) < W / 2 + 0.03 && Math.abs(y) < Hh / 2 + 0.03 && t < bt) { bt = t; best = c.i; }
          }
          return best;
        },
        // which card a hand is touching
        touched(pos) {
          for (const c of list) {
            if (!c.visible) continue;
            c.grp.updateMatrixWorld();
            const lp = c.grp.worldToLocal(_a.copy(pos));
            if (Math.abs(lp.x) < W / 2 + 0.02 && Math.abs(lp.y) < Hh / 2 + 0.02 && lp.z < 0.06 && lp.z > -0.12) return c.i;
          }
          return -1;
        },
        highlight(i) { for (const c of list) { const on = c.i === i; if (on !== c.hl) { c.hl = on; c.backM.emissive.setHex(on ? 0x3a3a10 : 0x000000); c.grp.scale.setScalar(on ? 1.05 : 1); } } },
      };
      return api;
    }
    const _a = new V3(), _b = new V3(), _q = new Q4(), _o = new V3(), _d = new V3();
    // ---------------------------------------------------------------- answering
    // wires a set of cards to the controls. o: { onPick(i, how), touch: bool, ray: bool, keys: bool, enabled() }
    // returns { tick(dt), laser } (call tick every frame while you're in the game)
    function input(L, deck, o) {
      const on = () => (o.enabled ? o.enabled() : true);
      const laserM = new THREE.LineBasicMaterial({ color: 0x9af0ff, transparent: true, opacity: 0.9 });
      const beams = {};
      for (const s of SIDES) {
        const geo = new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, 0, -1)]);
        const ln = new THREE.Line(geo, laserM.clone()); ln.visible = false; ln.frustumCulled = false; L.overlay.add(ln);
        beams[s] = { ln, flash: 0 };
      }
      const wasIn = { left: -1, right: -1 };
      const prev = { left: new V3(), right: new V3() };
      function aimFlat() { camera.getWorldPosition(_o); camera.getWorldQuaternion(_q); _d.set(0, 0, -1).applyQuaternion(_q); return deck.pickRay(_o, _d); }
      function aimHand(s) { const mh = myHands[s]; _d.set(0, 0, -1).applyQuaternion(mh.quat); return deck.pickRay(mh.pos, _d); }
      L.deskFire = () => {
        if (!on()) return;
        const i = aimFlat();
        if (i >= 0) o.onPick(i, 'aim'); else if (o.onMiss) o.onMiss();
      };
      if (o.ray !== false) {
        L.onVRTrigger = (h) => {
          if (!on()) return;
          const i = aimHand(h.side);
          beams[h.side].flash = 0.18;
          if (i >= 0) { o.onPick(i, 'ray'); haptic(vrHands[h.side], 0.5, 25); } else if (o.onMiss) o.onMiss();
        };
      }
      if (o.keys !== false) {
        L.onKey = (code) => {
          const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
          if (!m || !on()) return false;
          const i = Number(m[1]) - 1;
          if (i < deck.cards.length && deck.cards[i].visible) { o.onPick(i, 'key'); return true; }
          return false;
        };
      }
      return {
        beams,
        tick(dt) {
          const vr = state.mode === 'vr';
          let hl = -1;
          if (!vr && state.mode === 'flat' && on()) hl = aimFlat();
          for (const s of SIDES) {
            const b = beams[s], mh = myHands[s];
            // the pointer: a faint line from each hand, bright for a moment when you pull the trigger
            b.flash = Math.max(0, b.flash - dt);
            const show = vr && mh.ok && on() && o.ray !== false;
            b.ln.visible = show;
            if (show) {
              const hit = aimHand(s);
              if (hit >= 0 && hl < 0) hl = hit;
              const pts = b.ln.geometry.attributes.position;
              _d.set(0, 0, -1).applyQuaternion(mh.quat);
              pts.setXYZ(0, mh.pos.x, mh.pos.y, mh.pos.z); pts.setXYZ(1, mh.pos.x + _d.x * 4, mh.pos.y + _d.y * 4, mh.pos.z + _d.z * 4); pts.needsUpdate = true;
              b.ln.material.opacity = b.flash > 0 ? 1 : hit >= 0 ? 0.55 : 0.18;
              b.ln.material.color.setHex(b.flash > 0 ? 0xffffff : 0x9af0ff);
            }
            // touch: a hand pushing into a card picks it (once, until the hand comes back out)
            if (vr && mh.ok && o.touch !== false && on()) {
              const i = deck.touched(mh.pos);
              const speed = prev[s].distanceTo(mh.pos) / Math.max(dt, 1e-3);
              if (i >= 0 && i !== wasIn[s] && (!o.minSpeed || speed > o.minSpeed)) { o.onPick(i, 'touch', s); haptic(vrHands[s], 0.6, 30); }
              wasIn[s] = i;
            } else wasIn[s] = -1;
            prev[s].copy(mh.pos);
          }
          deck.highlight(on() ? hl : -1);
        },
        hide() { for (const s of SIDES) beams[s].ln.visible = false; deck.highlight(-1); },
      };
    }
    // where you stand: everyone gets a spot along a line (up to 4), so friends don't stand inside each other
    function slotOf(L) {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      ids.sort();
      return Math.max(0, ids.indexOf(state.myPeer)) % 4;
    }
    const SLOT_X = [0, -1.3, 1.3, -2.6];
    function standAt(x, z, yaw, pitch) {
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += x - c.x; dolly.position.z += z - c.z;
      if (state.mode !== 'vr') { state.yaw = yaw || 0; state.pitch = pitch === undefined ? -0.08 : pitch; }
    }
    // a little "ding" or "bonk"
    const right = () => { tone(880, 0, 0.12, 'sine', 0.18); tone(1320, 0, 0.18, 'sine', 0.16, 0.08); };
    const wrong = () => { tone(220, 160, 0.22, 'square', 0.08); };
    return { env, room, shelf, screen, wrap, fit, cards, input, slotOf, SLOT_X, standAt, right, wrong };
  })();
