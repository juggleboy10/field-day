  // ---------------------------------------------------------------- poses + hands
  const pose = () => ({ pos: new V3(), quat: new Q4() });
  const myHead = pose();
  const myHands = { left: Object.assign(pose(), { ok: false }), right: Object.assign(pose(), { ok: false }) };
  function holdPoint(pos, quat, out) { return out.copy(HOLD_OFF).applyQuaternion(quat).add(pos); }

  // ---------------------------------------------------------------- floating text (pooled)
  const floats = [];
  for (let i = 0; i < 4; i++) {
    const ft = canvasTexture(256, 128);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft.tex, transparent: true, depthWrite: false, fog: false }));
    s.visible = false;
    scene.add(s);
    floats.push({ s, ft, t0: 0, base: new V3(), scale: 1 });
  }
  let floatIdx = 0;
  function spawnFloat(text, pos, color) {
    const f = floats[floatIdx++ % floats.length];
    const g = f.ft.g;
    g.clearRect(0, 0, 256, 128);
    g.font = `800 ${text.length > 5 ? 64 : 96}px ${DISPLAY}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#1b1932';
    g.strokeText(text, 128, 68, 244);
    g.fillStyle = color || '#ffb347';
    g.fillText(text, 128, 68, 244);
    f.ft.tex.needsUpdate = true;
    f.t0 = performance.now();
    f.base.copy(pos);
    f.scale = Math.max(1, pos.distanceTo(myHead.pos) / 7);
    f.s.scale.set(0.8 * f.scale, 0.4 * f.scale, 1);
    f.s.position.copy(pos);
    f.s.material.opacity = 1;
    f.s.visible = true;
  }
  function updateFloats(now) {
    for (const f of floats) {
      if (!f.s.visible) continue;
      const t = (now - f.t0) / 1500;
      if (t >= 1) { f.s.visible = false; continue; }
      f.s.position.set(f.base.x, f.base.y + t * 0.7 * f.scale, f.base.z);
      f.s.material.opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    }
  }

  function showToast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => ui.toast.classList.remove('show'), 2000);
  }

  // ---------------------------------------------------------------- shared meshes
  function makeShadow(parent, size) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }));
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(size);
    m.renderOrder = 1;
    parent.add(m);
    return m;
  }
  const headGeo = new THREE.SphereGeometry(0.13, 20, 14);
  const visorGeo = new THREE.SphereGeometry(0.1, 20, 12);
  const eyeGeo = new THREE.SphereGeometry(0.02, 8, 6);
  const bodyGeo = new THREE.CylinderGeometry(0.1, 0.16, 0.44, 14);
  const handGeo = new THREE.SphereGeometry(0.045, 12, 8);
  const thumbGeo = new THREE.SphereGeometry(0.02, 8, 6);
  const visorMat = lam(0x17152e);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf4f7ff });
  const legMat = lam(0x2b2d42);
  function makeHand(mat, side) {
    const g = new THREE.Group();
    const palm = new THREE.Mesh(handGeo, mat);
    palm.scale.set(0.85, 0.62, 1.25);
    g.add(palm);
    const th = new THREE.Mesh(thumbGeo, mat);
    th.position.set(side === 'left' ? 0.036 : -0.036, 0.008, -0.012);
    g.add(th);
    return g;
  }

  // Bat: grip at origin, barrel pointing along -Z (the grip space's "rod" direction)
  const BAT = { back: 0.1, zone0: 0.28, tip: 0.76, hitR: 0.05, deskHitR: 0.065 };
  const batGeo = (() => {
    const prof = [[-0.1, 0], [-0.1, 0.024], [-0.094, 0.026], [-0.084, 0.016], [0.2, 0.017], [0.36, 0.025], [0.5, 0.032], [0.72, 0.034], [0.752, 0.032], [0.762, 0.02], [0.765, 0]];
    const geo = new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(r, y)), 14);
    geo.rotateX(-Math.PI / 2);
    return geo;
  })();
  const batMat = lam(0xc89a5b);
  function makeSwordMesh() {
    const g = new THREE.Group();
    const steel = new THREE.MeshLambertMaterial({ color: 0xd9dde6, emissive: 0x000000 });
    const gold = new THREE.MeshLambertMaterial({ color: 0xc9a23a, emissive: 0x000000 });
    const grip = new THREE.MeshLambertMaterial({ color: 0x4a2f1f, emissive: 0x000000 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.78), steel);
    blade.position.z = -0.5;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 4), steel);
    tip.rotation.x = -Math.PI / 2; tip.rotation.y = Math.PI / 4; tip.scale.set(1, 1, 0.25);
    tip.position.z = -0.93;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.03), gold);
    guard.position.z = -0.1;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.17, 8), grip);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -0.01;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), gold);
    pommel.position.z = 0.085;
    g.add(blade, tip, guard, handle, pommel);
    g.userData.mats = [steel, gold, grip];
    return g;
  }
  function makeCrossbowMesh() {
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x7a4e2c, emissive: 0x000000 });
    const iron = new THREE.MeshLambertMaterial({ color: 0x55586a, emissive: 0x000000 });
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), wood);
    stock.position.set(0, 0.03, -0.17);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.05), wood);
    handle.position.set(0, -0.03, 0.02);
    handle.rotation.x = 0.3;
    const limbs = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 16, Math.PI * 0.75), iron);
    limbs.rotation.set(Math.PI / 2, 0, Math.PI * 0.125);
    limbs.position.set(0, 0.05, -0.3);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 5), iron);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(0, 0.065, -0.24);
    g.add(stock, handle, limbs, bolt);
    g.userData.mats = [wood, iron];
    g.userData.bolt = bolt;
    return g;
  }

  // Disc: normal along +Y
  const discTopTex = canvasTexture(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 7;
    g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4;
    g.beginPath(); g.arc(64, 64, 26, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(64, 64, 10, 0, Math.PI * 2); g.fill();
  }).tex;
  const discGeo = new THREE.CylinderGeometry(0.105, 0.1, 0.022, 28);
  function makeDiscMesh(colorHex) {
    const side = new THREE.MeshLambertMaterial({ color: colorHex });
    const top = new THREE.MeshLambertMaterial({ color: colorHex, map: discTopTex });
    const m = new THREE.Mesh(discGeo, [side, top, side]);
    m.userData.mats = [side, top];
    return m;
  }
  function setDiscColor(m, hex) { for (const mat of m.userData.mats) mat.color.set(hex); }

  // Player looks: hats and faces (built around a head of radius 0.13 at the origin, facing -Z)
  // a white Old English-style "D" for the ballcap: thick stem and bowl, thin top and bottom strokes, little diamond serifs
  let CAP_LOGO_MAT = null;
  function capLogoMat() {
    if (CAP_LOGO_MAT) return CAP_LOGO_MAT;
    const tex = canvasTexture(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.lineJoin = 'round';
      const outer = () => {
        g.beginPath();
        g.moveTo(16, 24); g.lineTo(62, 24);
        g.bezierCurveTo(100, 22, 112, 48, 112, 64);
        g.bezierCurveTo(112, 80, 100, 106, 62, 104);
        g.lineTo(16, 104); g.lineTo(28, 94); g.lineTo(28, 34);
        g.closePath();
        g.moveTo(54, 40); g.lineTo(64, 40);
        g.bezierCurveTo(84, 40, 90, 54, 90, 64);
        g.bezierCurveTo(90, 74, 84, 88, 64, 88);
        g.lineTo(54, 88);
        g.closePath();
      };
      outer(); g.lineWidth = 9; g.strokeStyle = '#0f1630'; g.stroke();
      outer(); g.fillStyle = '#ffffff'; g.fill('evenodd');
      // the blackletter touches: a hairline down the stem, and diamond serifs at the stem's ends
      g.strokeStyle = '#0f1630'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(41, 36); g.lineTo(41, 92); g.stroke();
      g.fillStyle = '#ffffff'; g.strokeStyle = '#0f1630'; g.lineWidth = 3;
      for (const cy of [24, 104]) { g.beginPath(); g.moveTo(10, cy); g.lineTo(18, cy - 7); g.lineTo(26, cy); g.lineTo(18, cy + 7); g.closePath(); g.fill(); g.stroke(); }
    }).tex;
    CAP_LOGO_MAT = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return CAP_LOGO_MAT;
  }
  function buildHat(i) {
    if (!i) return null;
    const g = new THREE.Group();
    const M = (hex, emis, side) => new THREE.MeshLambertMaterial({ color: hex, emissive: emis || 0x000000, side: side || THREE.FrontSide });
    if (i === 1) {
      const m = M(0x24345e);
      // worn a little higher and tipped back, so the brim sits above the eyes
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.138, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
      dome.position.y = 0.042;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.012, 18, 1, false, Math.PI / 2, Math.PI), m);
      brim.position.set(0, 0.066, -0.1);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), M(0xf5821f));
      btn.position.y = 0.18;
      // a white Old English-style D on the front of the crown, on a patch that follows the curve
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.1396, 14, 8, 3 * Math.PI / 2 - 0.34, 0.68, 0.7, 0.56), capLogoMat());
      patch.position.y = 0.042;
      g.add(dome, brim, btn, patch);
      g.rotation.x = 0.12;
    } else if (i === 2) {
      const m = M(0xe3a83a);
      // pushed up off the eyebrows a little
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.142, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
      dome.scale.y = 1.15; dome.position.y = 0.032;
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.136, 0.022, 8, 24), M(0xc98a22));
      cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.058;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), M(0xfff4dc));
      pom.position.y = 0.207;
      g.add(dome, cuff, pom);
      g.rotation.x = 0.1;
    } else if (i === 3) {
      const stripes = canvasTexture(64, 64, (c) => {
        c.fillStyle = '#ff5c8a'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#ffd23f'; for (let y = 0; y < 64; y += 16) c.fillRect(0, y, 64, 7);
      }).tex;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 18), new THREE.MeshLambertMaterial({ map: stripes }));
      cone.position.set(0.02, 0.2, 0); cone.rotation.z = -0.15;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), M(0xffffff));
      pom.position.set(0.037, 0.31, 0);
      g.add(cone, pom);
    } else if (i === 4) {
      const gold = M(0xf2c14e, 0x3a2600, THREE.DoubleSide);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.108, 0.07, 16, 1, true), gold);
      band.position.y = 0.125;
      g.add(band);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 6), gold);
        spike.position.set(Math.sin(a) * 0.1, 0.19, Math.cos(a) * 0.1);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 5), M(k % 2 ? 0x4fc3f7 : 0xff4d6a, 0x220000));
        gem.position.set(Math.sin(a) * 0.105, 0.125, Math.cos(a) * 0.105);
        g.add(spike, gem);
      }
    }
    return g;
  }
  function buildFace(i) {
    const g = new THREE.Group();
    const white = new THREE.MeshBasicMaterial({ color: 0xf4f7ff });
    const dot = (x) => { const e = new THREE.Mesh(eyeGeo, white); e.scale.set(1, 1.35, 0.5); e.position.set(x, 0.014, -0.148); return e; };
    const arc = (x) => { const e = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.005, 4, 10, Math.PI), white); e.position.set(x, 0.006, -0.15); return e; };
    if (i === 1) g.add(arc(-0.034), arc(0.034));
    else if (i === 2) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.034, 0.012), new THREE.MeshBasicMaterial({ color: 0x07070c }));
      bar.position.set(0, 0.016, -0.152);
      const shine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.002), white);
      shine.position.set(-0.03, 0.026, -0.159); shine.rotation.z = 0.4;
      g.add(bar, shine);
    } else if (i === 3) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), white);
      line.position.set(0.034, 0.012, -0.149);
      g.add(dot(-0.034), line);
    } else g.add(dot(-0.034), dot(0.034));
    return g;
  }
  // flat drawing of a player's head for the start menu
  function drawLookPreview(g, colorHex, hat, face, shirt, shirtColor) {
    const W = g.canvas.width, s = W / 120;
    g.setTransform(s, 0, 0, s, 0, 0);
    g.clearRect(0, 0, 120, 120);
    // shirt
    g.fillStyle = shirtHex(colorHex, shirtColor || 0);
    rr(g, 26, 88, 68, 50, 18); g.fill();
    g.save(); rr(g, 26, 88, 68, 50, 18); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    if (shirt === 1) for (let y = 92; y < 120; y += 8) g.fillRect(26, y, 68, 4);
    else if (shirt === 2) for (const [x, y] of [[40, 100], [62, 108], [80, 96], [50, 116], [74, 118]]) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
    else if (shirt === 3) { g.fillRect(48, 104, 24, 12); g.beginPath(); g.moveTo(54, 92); g.lineTo(54, 102); g.moveTo(66, 92); g.lineTo(66, 102); g.stroke(); }
    else if (shirt === 4) { for (let x = 30; x < 94; x += 10) { g.beginPath(); g.moveTo(x, 88); g.lineTo(x, 120); g.stroke(); } for (let y = 94; y < 120; y += 10) { g.beginPath(); g.moveTo(26, y); g.lineTo(94, y); g.stroke(); } }
    else if (shirt === 5) { g.font = '800 22px "Arial Narrow", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('7', 60, 108); }
    g.restore();
    // head, scaled to sit on the shoulders
    g.setTransform(s * 0.84, 0, 0, s * 0.84, s * (60 - 60 * 0.84), s * (52 - 66 * 0.84));
    g.fillStyle = colorHex;
    g.beginPath(); g.arc(60, 66, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.beginPath(); g.arc(48, 52, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#17152e';
    rr(g, 34, 56, 52, 22, 11); g.fill();
    g.fillStyle = '#f4f7ff'; g.strokeStyle = '#f4f7ff'; g.lineWidth = 3; g.lineCap = 'round';
    const dotEye = (x) => { g.beginPath(); g.ellipse(x, 66, 3.5, 5, 0, 0, Math.PI * 2); g.fill(); };
    const arcEye = (x) => { g.beginPath(); g.arc(x, 69, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); };
    if (face === 1) { arcEye(50); arcEye(70); }
    else if (face === 2) { g.fillStyle = '#07070c'; rr(g, 36, 59, 48, 12, 5); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(42, 66); g.lineTo(47, 61); g.stroke(); }
    else if (face === 3) { dotEye(50); g.beginPath(); g.moveTo(66, 67); g.lineTo(74, 67); g.stroke(); }
    else { dotEye(50); dotEye(70); }
    if (hat === 1) {
      g.fillStyle = '#24345e';
      g.beginPath(); g.arc(60, 46, 32, Math.PI, 0); g.fill();
      rr(g, 22, 42, 46, 8, 4); g.fill();
      g.fillStyle = '#f5821f'; g.beginPath(); g.arc(60, 14, 4, 0, Math.PI * 2); g.fill();
    } else if (hat === 2) {
      g.fillStyle = '#e3a83a'; g.beginPath(); g.arc(60, 48, 33, Math.PI, 0); g.fill();
      g.fillStyle = '#c98a22'; rr(g, 26, 40, 68, 11, 5); g.fill();
      g.fillStyle = '#fff4dc'; g.beginPath(); g.arc(60, 12, 7, 0, Math.PI * 2); g.fill();
    } else if (hat === 3) {
      g.fillStyle = '#ff5c8a'; g.beginPath(); g.moveTo(46, 38); g.lineTo(68, 38); g.lineTo(62, 2); g.closePath(); g.fill();
      g.fillStyle = '#ffd23f'; g.fillRect(50, 26, 15, 4); g.fillRect(54, 14, 9, 4);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(62, 3, 4, 0, Math.PI * 2); g.fill();
    } else if (hat === 4) {
      g.fillStyle = '#f2c14e';
      g.beginPath(); g.moveTo(36, 40); g.lineTo(36, 22); g.lineTo(44, 30); g.lineTo(52, 16); g.lineTo(60, 28); g.lineTo(68, 16); g.lineTo(76, 30); g.lineTo(84, 22); g.lineTo(84, 40); g.closePath(); g.fill();
      g.fillStyle = '#ff4d6a'; g.beginPath(); g.arc(60, 34, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4fc3f7'; g.beginPath(); g.arc(46, 34, 2.5, 0, Math.PI * 2); g.arc(74, 34, 2.5, 0, Math.PI * 2); g.fill();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  // A small readout that floats above your left wrist in VR
  function makeWristPanel() {
    const ct = canvasTexture(256, 112);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.057), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, depthWrite: false }));
    mesh.visible = false;
    scene.add(mesh);
    let key = '';
    const q = new Q4();
    return {
      mesh,
      show(on) { mesh.visible = on; },
      update(top, topColor, bottom) {
        const lh = myHands.left;
        mesh.visible = state.mode === 'vr' && lh.ok;
        if (!mesh.visible) return;
        mesh.position.set(0, 0.07, 0.03).applyQuaternion(lh.quat).add(lh.pos);
        mesh.quaternion.copy(camera.getWorldQuaternion(q));
        const k = top + '|' + topColor + '|' + bottom;
        if (k === key) return;
        key = k;
        const g = ct.g;
        g.clearRect(0, 0, 256, 112);
        rr(g, 2, 2, 252, 108, 16); g.fillStyle = 'rgba(14,14,26,0.88)'; g.fill();
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = topColor || '#ffffff'; g.font = `800 36px ${DISPLAY}`; g.fillText(top, 128, 36, 240);
        g.fillStyle = '#e4e0fa'; g.font = `400 22px ${BODY}`; g.fillText(bottom, 128, 82, 240);
        ct.tex.needsUpdate = true;
      },
    };
  }

  // Shirts: a light pattern texture, tinted by the shirt color ("Match" uses a darker shade of your color)
  const shirtTexCache = [];
  function shirtTexture(style) {
    if (!style) return null;
    if (shirtTexCache[style]) return shirtTexCache[style];
    const t = canvasTexture(256, 128, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128);
      if (style === 1) { g.fillStyle = '#9a9aa6'; for (let y = 8; y < 128; y += 26) g.fillRect(0, y, 256, 12); }
      else if (style === 2) {
        g.fillStyle = '#8a8a96';
        for (let i = 0; i < 18; i++) {
          const x = (i * 47) % 256 + 10, y = (i * 29) % 110 + 10;
          g.beginPath();
          for (let k = 0; k < 10; k++) { const r = k % 2 ? 4 : 10, a = (k / 10) * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
          g.closePath(); g.fill();
        }
      } else if (style === 3) {
        g.fillStyle = '#c8c8d0'; g.fillRect(0, 0, 256, 14);
        g.fillStyle = '#a8a8b4'; g.fillRect(96, 18, 64, 40);
        g.strokeStyle = '#8a8a96'; g.lineWidth = 4; g.beginPath(); g.moveTo(118, 112); g.lineTo(118, 80); g.moveTo(138, 112); g.lineTo(138, 80); g.stroke();
        g.fillStyle = '#d0d0d8'; g.fillRect(0, 118, 256, 10);
      } else if (style === 4) {
        g.fillStyle = 'rgba(120,120,135,0.55)';
        for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 12, 128);
        for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 256, 12);
        g.fillStyle = 'rgba(90,90,100,0.6)';
        for (let x = 20; x < 256; x += 32) g.fillRect(x, 0, 2, 128);
        for (let y = 20; y < 128; y += 32) g.fillRect(0, y, 256, 2);
      } else if (style === 5) {
        g.fillStyle = '#8a8a96'; g.fillRect(0, 0, 256, 10); g.fillRect(56, 0, 10, 128); g.fillRect(190, 0, 10, 128);
        g.font = '800 64px "Arial Narrow", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('7', 128, 70); g.fillText('7', 0, 70); g.fillText('7', 256, 70);
      }
    }).tex;
    shirtTexCache[style] = t;
    return t;
  }
  function shirtHex(colorHex, shirtColor) {
    const sc = SHIRT_COLORS[shirtColor];
    return sc && sc.hex ? sc.hex : '#' + new THREE.Color(colorHex).multiplyScalar(0.6).getHexString();
  }
  function dressBody(mat, colorHex, shirt, shirtColor) {
    mat.color.set(shirtHex(colorHex, shirtColor));
    const t = shirtTexture(shirt);
    if (mat.map !== t) { mat.map = t; mat.needsUpdate = true; }
  }

  function buildAvatar(colorHex, hat, face, withBody, shirt, shirtColor) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: colorHex });
    const head = new THREE.Group();
    head.add(new THREE.Mesh(headGeo, mat));
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.scale.set(1.05, 0.55, 0.72);
    visor.position.set(0, 0.012, -0.078);
    head.add(visor, buildFace(face));
    const h = buildHat(hat);
    if (h) head.add(h);
    g.add(head);
    if (withBody) {
      const bm = new THREE.MeshLambertMaterial({ color: 0xffffff });
      dressBody(bm, colorHex, shirt || 0, shirtColor || 0);
      const body = new THREE.Mesh(bodyGeo, bm);
      body.position.y = -0.44;
      const lh = makeHand(mat, 'left'), rh = makeHand(mat, 'right');
      lh.position.set(-0.25, -0.42, -0.08); rh.position.set(0.25, -0.42, -0.08);
      g.add(body, lh, rh);
    }
    return g;
  }

  // Text plates, boards and touch buttons -------------------------------------
  function makePlate(parent, label, w, h, pos, rotY, opts) {
    let text = label;
    const o = opts || {};
    const cw = 512, ch = Math.round(512 * h / w);
    const ct = canvasTexture(cw, ch);
    const draw = () => {
      const g = ct.g;
      g.fillStyle = o.bg || '#16142e'; g.fillRect(0, 0, cw, ch);
      g.fillStyle = o.fg || '#f4f2ff';
      g.font = `800 ${Math.round(ch * (o.size || 0.62))}px ${DISPLAY}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, cw / 2, ch * 0.54, cw - 24);
      ct.tex.needsUpdate = true;
    };
    draw();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ct.tex }));
    m.position.copy(pos);
    m.rotation.y = rotY || 0;
    m.userData.draw = (t) => { text = t; draw(); };
    if (o.tilt) m.rotation.x = o.tilt;
    parent.add(m);
    redraws.push(draw);
    return m;
  }
  const redraws = [];

  function makeBoard(parent, cw, chh, w, h, x, y, z, rotY, legs) {
    const ct = canvasTexture(cw, chh);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), legMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    parent.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ct.tex }));
    face.position.set(x + Math.sin(rotY) * 0.025, y, z + Math.cos(rotY) * 0.025);
    face.rotation.y = rotY;
    parent.add(face);
    if (legs !== false) {
      for (const off of [-w / 2 + 0.2, w / 2 - 0.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, y - h / 2, 6), legMat);
        leg.position.set(x + Math.cos(rotY) * off, (y - h / 2) / 2, z - Math.sin(rotY) * off);
        parent.add(leg);
      }
    }
    return ct;
  }

  // A button you press by touching it in VR, or aiming at it and pressing E in the browser.
  function makeButton(L, pos, colorHex, label, onPress, opts) {
    const o = opts || {};
    const g = L.group;
    if (o.pedestal !== false) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, pos.y - 0.03, 14), legMat);
      ped.position.set(pos.x, (pos.y - 0.03) / 2, pos.z);
      g.add(ped);
    }
    const mat = new THREE.MeshLambertMaterial({ color: colorHex, emissive: 0x000000 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 20), mat);
    cap.position.copy(pos);
    g.add(cap);
    const faceYaw = o.faceYaw || 0;
    const plate = makePlate(g, label, 0.34, 0.1,
      new V3(pos.x + Math.sin(faceYaw) * 0.17, pos.y - 0.2, pos.z + Math.cos(faceYaw) * 0.17), faceYaw, { size: 0.66 });
    const btn = { L, pos: pos.clone(), mesh: cap, mat, plate, onPress, cool: 0, pressT: -1e9, baseY: pos.y, lit: false, label };
    L.buttons.push(btn);
    return btn;
  }
  function pressButton(btn, now) {
    if (now < btn.cool) return false;
    btn.cool = now + 900;
    btn.pressT = now;
    sfx('click', 1);
    btn.onPress(btn);
    return true;
  }
  function updateButtons(L, now) {
    for (const b of L.buttons) {
      const e = (now - b.pressT) / 260;
      b.mesh.position.y = b.baseY - (e >= 0 && e < 1 ? 0.022 * Math.sin(e * Math.PI) : 0);
      const aimed = (state.mode === 'flat' && state.flatTarget && state.flatTarget.obj === b) || (state.mode === 'vr' && b.near);
      b.mat.emissive.setHex(aimed ? 0x5a2a00 : b.lit ? 0x2a4a10 : 0x000000);
    }
  }

  // Level switch kiosk (one per level)
  const LEVEL_META = [
    { id: 'hoops', name: 'Rooftop hoops', short: 'Hoops', glyph: '\u{1F3C0}', blurb: 'Shoot around on a city rooftop at dusk.' },
    { id: 'baseball', name: 'Sandlot baseball', short: 'Baseball', glyph: '\u26BE', blurb: 'Take swings against a pitching machine, or pitch to a friend.' },
    { id: 'discgolf', name: 'Maple Hollow disc golf', short: 'Disc golf', glyph: '\u{1F94F}', blurb: 'Three holes through an autumn park.' },
    { id: 'dungeon', name: 'Sunstone Keep', short: 'Dungeon', glyph: '\u2694\uFE0F', blurb: 'Fight through a crypt together and claim the Sunstone.' },
    { id: 'lasertag', name: 'Neon laser tag', short: 'Laser tag', glyph: '\u26A1', blurb: 'Red versus blue in a glowing arena. First team to 15 tags.' },
    { id: 'soccer', name: 'Sunday soccer', short: 'Soccer', glyph: '\u26BD', blurb: 'Walk the ball up the pitch and kick it in. First to 5 goals.' },
    { id: 'minigolf', name: 'Seaside mini golf', short: 'Mini golf', glyph: '\u26F3', blurb: 'Five quirky holes on a sunny pier, with a windmill and bumpers.' },
    { id: 'bowling', name: 'Moonlight Lanes', short: 'Bowling', glyph: '\u{1F3B3}', blurb: 'Ten frames in a neon bowling alley. Strikes count extra.' },
    { id: 'hub', name: 'The Clubhouse', short: 'Clubhouse', glyph: '\u{1F3E0}', blurb: 'Hang out, dance, change your look, and walk through a portal to any game.' },
    { id: 'karts', name: 'Pebble Bay go-karts', short: 'Go-karts', glyph: '\u{1F3CE}\uFE0F', blurb: 'Lap the bay or start a three-lap race with friends.' },
    { id: 'siege', name: 'Skyline Siege', short: 'Siege', glyph: '\u{1F52B}', blurb: 'A co-op sci-fi raid with four kinds of laser gun.' },
    { id: 'hexwood', name: 'Hexwood Hollow', short: 'Hexwood', glyph: '\u{1FA84}', blurb: 'A co-op quest through a haunted forest with a three-spell wand.' },
    { id: 'hideseek', name: 'Sunset Backyards', short: 'Hide & seek', glyph: '\u{1F648}', blurb: 'Hide-and-seek at golden hour, with friends or bots.' },
    { id: 'charades', name: 'Charades Lounge', short: 'Charades', glyph: '\u{1F3AD}', blurb: 'Act it out or draw it in the air with a 3D pen. Best with friends.' },
    { id: 'paintball', name: 'Paintball Park', short: 'Paintball', glyph: '\u{1F3A8}', blurb: 'Red against blue among inflatable bunkers. Five markers, real paint.' },
    { id: 'pickleball', name: 'Sunny Pickleball Courts', short: 'Pickleball', glyph: '\u{1F3D3}', blurb: 'Singles pickleball with the kitchen and the two-bounce rule, against a friend or Dink Daisy.' },
    { id: 'parkour', name: 'Skyline Sprint', short: 'Parkour', glyph: '\u{1F9D7}', blurb: 'A parkour race: grab, climb, slide and leap to the finish, with power-up drinks.' },
    { id: 'dodgeball', name: 'Gym Class Dodgeball', short: 'Dodgeball', glyph: '\u{1F534}', blurb: 'Red against blue in a school gym. Hit them, catch to bring a teammate back. Friends or bots.' },
  ];
  const KIOSK_COLORS = [0xf5821f, 0xe8e4d8, 0x8bd450, 0xb388ff, 0xff4d6a, 0x2ec4b6, 0x3fbf7f, 0xff9ad0, 0xffd27a, 0x4fc3f7, 0x4a8aff, 0xb06aff, 0xffb36b, 0xff9ad0, 0x8bd450, 0xd8f43a, 0xff7a3a, 0xe5453a];
  const LEVEL_CATS = [
    { id: 'ball', name: 'Ball sports', glyph: '\u26BD', games: [0, 1, 5, 15, 17] },
    { id: 'lanes', name: 'Golf and lanes', glyph: '\u26F3', games: [2, 6, 7] },
    { id: 'adv', name: 'Adventures', glyph: '\u{1F5E1}\uFE0F', games: [3, 10, 11] },
    { id: 'race', name: 'Racing and parkour', glyph: '\u{1F3C1}', games: [9, 16] },
    { id: 'party', name: 'Party and team games', glyph: '\u{1F389}', games: [13, 12, 14, 4] },
  ];
  const PICKER_ORDER = [8, 17, 16, 15, 14, 13, 12, 3, 10, 11, 0, 1, 2, 4, 5, 6, 7, 9];
  function makeKiosk(L, x, z, yaw) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);   // direction the kiosk faces
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);  // its right-hand side
    makePlate(L.group, 'Clubhouse', 1.1, 0.22, new V3(x - fx * 0.05, 1.55, z - fz * 0.05), yaw, { size: 0.6 });
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.06), legMat);
    post.position.set(x - fx * 0.09, 1.55, z - fz * 0.09);
    post.rotation.y = yaw;
    L.group.add(post);
    void rx; void rz;
    makeButton(L, new V3(x, 1.02, z), KIOSK_COLORS[HUB], 'Go back', () => switchLevel(HUB), { faceYaw: yaw });
  }

  // ---------------------------------------------------------------- level registry
  const LEVELS = [];
  function newLevel(idx) {
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);
    const L = {
      idx, id: LEVEL_META[idx].id, meta: LEVEL_META[idx], group,
      bodies: [], tools: [], buttons: [], hudActions: [], hints: [],
      bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
      drag: 0,
      collide: () => false, onBodyFrame: () => {}, update: () => {},
      presence: () => ({}), readPresence: () => {}, rowFor: () => null, drawBoard: () => {},
      spawn: () => {}, onEnter: () => {}, onExit: () => {}, clampPlayer: null,
    };
    LEVELS[idx] = L;
    return L;
  }
  const curLevel = () => LEVELS[state.level];

