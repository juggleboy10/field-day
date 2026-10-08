(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const ui = {
    panel: $('#panel'), net: $('#net'), netText: $('#net-text'), levels: $('#levels'), name: $('#name'), swatches: $('#swatches'),
    vrBtn: $('#btn-vr'), flatBtn: $('#btn-flat'), vrNote: $('#vr-note'), loadError: $('#load-error'),
    hud: $('#hud'), hudTitle: $('#hud-title'), hudScores: $('#hud-scores'), hudLevelActions: $('#hud-level-actions'), menuBtn: $('#btn-menu'), musicBtn: $('#btn-music'), musicToggle: $('#music-toggle'), micBtn: $('#btn-mic'), voiceToggle: $('#voice-toggle'), voiceNote: $('#voice-note'),
    cross: $('#crosshair'), power: $('#power'), powerFill: $('#power-fill'), hints: $('#hints'),
    touch: $('#touch'), stick: $('#stick'), knob: $('#stick-knob'), grabBtn: $('#btn-grab'), throwBtn: $('#btn-throw'),
    toast: $('#toast'), status: $('#hud-status'), hurt: $('#hurt'),
    levelBlurb: $('#level-blurb'), lookPreview: $('#look-preview'), hatChips: $('#hat-chips'), faceChips: $('#face-chips'), shirtChips: $('#shirt-chips'), shirtColorChips: $('#shirtc-chips'),
  };
  function fail(msg) {
    if (msg) ui.loadError.textContent = msg;
    ui.loadError.hidden = false;
    ui.vrBtn.disabled = true;
    ui.flatBtn.disabled = true;
  }
  if (!window.THREE) { fail(); return; }

  // ---------------------------------------------------------------- constants
  const V3 = THREE.Vector3, Q4 = THREE.Quaternion;
  const SIDES = ['left', 'right'];
  const UP = new V3(0, 1, 0);
  const FWD = new V3(0, 0, -1);
  const GRAVITY = 9.8;
  const PLAYER_COLORS = [
    { hex: '#4fc3f7', label: 'Sky blue' },
    { hex: '#ff5c8a', label: 'Pink' },
    { hex: '#8bd450', label: 'Lime' },
    { hex: '#b388ff', label: 'Violet' },
    { hex: '#ffd23f', label: 'Yellow' },
    { hex: '#2ec4b6', label: 'Teal' },
  ];
  const DISPLAY = '"Big Shoulders Display", "Arial Narrow", "Roboto Condensed", Impact, sans-serif';
  const BODY = '"Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const HOLD_OFF = new V3(0, -0.015, -0.085);
  const DESK_OFF = { left: new V3(-0.26, -0.34, -0.3), right: new V3(0.2, -0.22, -0.36) };
  const PREF_KEY = 'field-day-prefs';
  const LEVEL_COUNT = 18;
  const HUB = 8;
  const HATS = ['None', 'Cap', 'Beanie', 'Party hat', 'Crown'];
  const FACES = ['Dots', 'Happy', 'Shades', 'Wink'];
  const SHIRTS = ['Plain', 'Stripes', 'Stars', 'Hoodie', 'Plaid', 'Jersey'];
  const SHIRT_COLORS = [
    { hex: null, label: 'Match' }, { hex: '#2b3a7a', label: 'Navy' }, { hex: '#c23b4a', label: 'Red' },
    { hex: '#2e8a4c', label: 'Green' }, { hex: '#ece8dc', label: 'White' }, { hex: '#2a2a36', label: 'Black' }, { hex: '#e3a83a', label: 'Mustard' },
  ];
  const TEAM_COLORS = [0xff4d6a, 0x4fc3f7];
  const TEAM_HEX = ['#ff4d6a', '#4fc3f7'];
  const TEAM_NAMES = ['Red', 'Blue'];
  const TERMINAL = ['revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'transform_error'];
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);

  // ---------------------------------------------------------------- helpers
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const finite = (x) => typeof x === 'number' && Number.isFinite(x);
  const lerp = (a, b, t) => a + (b - a) * t;
  function cleanName(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16);
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function wrapText(g, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (line && g.measureText(t).width > maxW) { g.fillText(line, x, y); y += lh; line = w; }
      else line = t;
    }
    if (line) { g.fillText(line, x, y); y += lh; }
    return y;
  }
  function toPar(n) { return n === 0 ? 'E' : n > 0 ? `+${n}` : String(n); }

  // ---------------------------------------------------------------- prefs + state
  const prefs = (() => {
    for (const k of [PREF_KEY, 'rooftop-hoops-prefs']) {
      try {
        const p = JSON.parse(localStorage.getItem(k) || 'null');
        if (p && typeof p === 'object') return p;
      } catch (e) { /* ignore */ }
    }
    return {};
  })();
  const savedName = cleanName(prefs.name);
  const state = {
    mode: 'menu',
    level: Number.isInteger(prefs.level) && prefs.level >= 0 && prefs.level < LEVEL_COUNT ? prefs.level : HUB,
    hat: Number.isInteger(prefs.hat) && prefs.hat >= 0 && prefs.hat < HATS.length ? prefs.hat : 0,
    face: Number.isInteger(prefs.face) && prefs.face >= 0 && prefs.face < FACES.length ? prefs.face : 0,
    shirt: Number.isInteger(prefs.shirt) && prefs.shirt >= 0 && prefs.shirt < SHIRTS.length ? prefs.shirt : 0,
    shirtColor: Number.isInteger(prefs.shirtColor) && prefs.shirtColor >= 0 && prefs.shirtColor < SHIRT_COLORS.length ? prefs.shirtColor : 0,
    name: savedName || `Player ${10 + Math.floor(Math.random() * 90)}`,
    nameEdited: !!savedName,
    colorIdx: Number.isInteger(prefs.color) && prefs.color >= 0 && prefs.color < PLAYER_COLORS.length
      ? prefs.color : Math.floor(Math.random() * PLAYER_COLORS.length),
    myPeer: 'solo',
    room: null, net: 'connecting', connected: false, everConnected: false, discT: 0, lastPeers: null,
    presenceT: -1e9, presenceDue: true, lastPresence: '',
    dirtyBoard: true, boardT: 0, netUiT: 0, hudDirty: true,
    yaw: 0, pitch: -0.06, keys: Object.create(null), charge: null, held: null, flatTarget: null,
    vrOK: false, flashT: -1e9,
  };
  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ name: state.nameEdited ? state.name : '', color: state.colorIdx, level: state.level, hat: state.hat, face: state.face, shirt: state.shirt, shirtColor: state.shirtColor, music: prefs.music !== false, voice: prefs.voice === true, smoothTurn: prefs.smoothTurn === true, popBest: prefs.popBest | 0, players: prefs.players || {} }));
    } catch (e) { /* storage unavailable */ }
  }
  function forcePresence() { state.presenceDue = true; }

  // ---------------------------------------------------------------- renderer, scene, camera
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    fail('This browser couldn\u2019t start 3D graphics. Try another browser or device.');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d1a36);
  scene.fog = new THREE.Fog(0x6c4a7b, 45, 230);
  const dolly = new THREE.Group();
  scene.add(dolly);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 700);
  dolly.add(camera);

  function canvasTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (draw) draw(g, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = maxAniso;
    return { tex, c, g };
  }
  function radialTex(stops) {
    return canvasTexture(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      for (const [o, c] of stops) gr.addColorStop(o, c);
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    }).tex;
  }
  function skyTexture(stops) {
    return canvasTexture(8, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      for (const [o, c] of stops) gr.addColorStop(o, c);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }).tex;
  }
  const lam = (hex) => new THREE.MeshLambertMaterial({ color: hex });
  function addBox(parent, w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function addCyl(parent, rt, rb, h, seg, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  // ---------------------------------------------------------------- sky + lights (per-level env)
  const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false });
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 20), skyMat);
  skyMesh.renderOrder = -10;
  scene.add(skyMesh);
  const hemi = new THREE.HemisphereLight(0xa99be0, 0x3b2d44, 0.95);
  const sunLight = new THREE.DirectionalLight(0xffc28a, 0.85);
  const ambient = new THREE.AmbientLight(0x40385e, 0.35);
  scene.add(hemi, sunLight, ambient);
  const sunTex = radialTex([[0, 'rgba(255,238,205,1)'], [0.18, 'rgba(255,196,130,0.85)'], [0.5, 'rgba(245,140,110,0.25)'], [1, 'rgba(245,140,110,0)']]);
  const paleSunTex = radialTex([[0, 'rgba(255,255,245,1)'], [0.12, 'rgba(255,250,225,0.9)'], [0.4, 'rgba(255,240,200,0.18)'], [1, 'rgba(255,240,200,0)']]);
  const warmGlowTex = radialTex([[0, 'rgba(255,230,170,1)'], [0.3, 'rgba(255,200,120,0.5)'], [1, 'rgba(255,180,90,0)']]);
  const redGlowTex = radialTex([[0, 'rgba(255,120,110,1)'], [0.3, 'rgba(255,60,60,0.55)'], [1, 'rgba(255,40,40,0)']]);
  const cloudTex = radialTex([[0, 'rgba(255,255,255,0.95)'], [0.45, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  const shadowTex = radialTex([[0, 'rgba(10,8,25,0.9)'], [0.55, 'rgba(10,8,25,0.45)'], [1, 'rgba(10,8,25,0)']]);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  scene.add(sunSprite);

  function applyEnv(env) {
    skyMat.map = env.sky;
    skyMat.needsUpdate = true;
    scene.background.setHex(env.bg);
    scene.fog.color.setHex(env.fog[0]);
    scene.fog.near = env.fog[1];
    scene.fog.far = env.fog[2];
    hemi.color.setHex(env.hemi[0]);
    hemi.groundColor.setHex(env.hemi[1]);
    hemi.intensity = env.hemi[2];
    sunLight.color.setHex(env.sun[0]);
    sunLight.intensity = env.sun[1];
    sunLight.position.copy(env.sunDir);
    ambient.color.setHex(env.ambient[0]);
    ambient.intensity = env.ambient[1];
    sunSprite.visible = !!env.sprite;
    if (env.sprite) {
      sunSprite.material.map = env.sprite.tex;
      sunSprite.material.needsUpdate = true;
      sunSprite.position.copy(env.sprite.pos);
      sunSprite.scale.set(env.sprite.scale, env.sprite.scale, 1);
    }
  }

