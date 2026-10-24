  // ================================================================ LEVEL: PC BUILD BENCH (study hall)
  // Build a PC on an open test bench, the way the A+ exam expects: wrist strap on first, CPU in the socket, thermal paste,
  // cooler, memory of the right generation (one stick on the tray is the wrong kind), the M.2 SSD, the graphics card in
  // the x16 slot, the 24-pin and 8-pin power cables. Then press the power button: if something's missing, the PC tells
  // you the way a real one would (a beep code, no display, "no bootable device").
  // Guided shows a checklist; Timed doesn't, and every mistake adds 10 seconds.
  // VR: grab a part, put it on its slot and let go. Browser: click a part to pick it up, click a slot to fit it.
  const pcbuild = (() => {
    const L = newLevel(50);
    const G = L.group;
    const rand = mulberry32(5050);
    L.grabless = true;
    L.bounds = { minX: -5.6, maxX: 5.6, minZ: 0.62, maxZ: 3.6 };   // (you can lean right over the bench)
    L.env = STUDY.env();
    const hall = STUDY.room(G, rand, { w: 12, d: 10, z: -1, h: 4.4 });
    const K = 1.4, TOP = 0.9, BX = 0, BY = TOP + 0.006, BZ = 0.5, SPOT_Z = 1.25;
    // ---------------------------------------------------------------- the bench and the motherboard
    addBox(G, 2.3, 0.05, 0.85, lam(0x8a6a4a), 0, TOP - 0.025, 0.55);
    for (const [x, z] of [[-1.05, 0.2], [1.05, 0.2], [-1.05, 0.9], [1.05, 0.9]]) addBox(G, 0.06, TOP - 0.05, 0.06, lam(0x3a3a3a), x, (TOP - 0.05) / 2, z);
    const mat = addBox(G, 2.1, 0.004, 0.75, lam(0x2a5a8a), 0, TOP + 0.002, 0.55);   // an antistatic mat
    void mat;
    const board = addBox(G, 0.305 * K, 0.004, 0.244 * K, lam(0x1f5a3a), BX, BY, BZ);
    void board;
    // a little detail on the board: traces and chips
    for (let i = 0; i < 14; i++) addBox(G, 0.002 * K, 0.001, (0.03 + rand() * 0.08) * K, lam(0x3a8a5a), BX + (rand() - 0.5) * 0.28 * K, BY + 0.0025, BZ + (rand() - 0.5) * 0.2 * K);
    addBox(G, 0.025 * K, 0.006, 0.025 * K, lam(0x2a2a2a), BX + 0.04 * K, BY + 0.004, BZ + 0.07 * K);   // the chipset
    addBox(G, 0.02 * K, 0.03, 0.09 * K, lam(0x8a8a90), BX - 0.14 * K, BY + 0.015, BZ - 0.06 * K);   // the I/O shield
    // slots, in board coordinates (x right, z toward you), real ATX-ish layout
    const SLOTS = [
      { id: 'socket', kind: 'socket', at: [-0.03, -0.05], size: [0.05, 0.05], tip: 'That’s the CPU socket: the processor goes in, then thermal paste, then the cooler.' },
      { id: 'dimm1', kind: 'ram', at: [0.06, -0.05], size: [0.008, 0.135], tip: 'Those are DIMM slots: memory only.' },
      { id: 'dimm2', kind: 'ram', at: [0.078, -0.05], size: [0.008, 0.135], tip: 'Those are DIMM slots: memory only.' },
      { id: 'atx', kind: 'atx', at: [0.14, -0.03], size: [0.012, 0.05], tip: 'That’s the 24-pin ATX power header: the big cable from the power supply.' },
      { id: 'eps', kind: 'eps', at: [-0.125, -0.11], size: [0.02, 0.01], tip: 'That’s the 8-pin CPU power header (EPS12V).' },
      { id: 'm2', kind: 'ssd', at: [-0.02, 0.035], size: [0.08, 0.022], tip: 'That’s the M.2 slot: it takes the M.2 NVMe SSD.' },
      { id: 'pcie', kind: 'gpu', at: [-0.02, 0.075], size: [0.09, 0.008], tip: 'That’s the PCIe x16 slot: it’s for the graphics card.' },
    ];
    const slotPos = (s, out) => out.set(BX + s.at[0] * K, BY + 0.004, BZ + s.at[1] * K);
    const markM = new THREE.MeshBasicMaterial({ color: 0x9af0ff, transparent: true, opacity: 0.0, depthWrite: false });
    for (const s of SLOTS) {
      const p = slotPos(s, new V3());
      // the slot itself (black plastic), and a glow that shows where a held part could go
      if (s.kind === 'ram' || s.kind === 'gpu' || s.kind === 'atx') addBox(G, s.size[0] * K, 0.01, s.size[1] * K, lam(0x1a1a1a), p.x, p.y + 0.005, p.z);
      else if (s.kind === 'socket') { addBox(G, s.size[0] * K, 0.004, s.size[1] * K, lam(0xb8b8c0), p.x, p.y + 0.002, p.z); addBox(G, 0.004, 0.006, s.size[1] * K, lam(0x6a6a70), p.x + s.size[0] * K * 0.6, p.y + 0.003, p.z); }
      else addBox(G, s.size[0] * K, 0.004, s.size[1] * K, lam(0x2a2a2a), p.x, p.y + 0.002, p.z);
      s.glow = addBox(G, s.size[0] * K + 0.03, 0.03, s.size[1] * K + 0.03, markM.clone(), p.x, p.y + 0.02, p.z);
      s.filled = null;
    }
    const genPlate = makePlate(G, 'DDR5', 0.07, 0.025, new V3(BX + 0.069 * K, BY + 0.003, BZ + 0.035 * K), 0, { bg: '#1f5a3a', fg: '#ffffff', size: 0.75, tilt: -Math.PI / 2 });
    // the power supply, with its cables
    const PSU = new V3(0.72, TOP + 0.065, 0.3);
    addBox(G, 0.15 * K, 0.086 * K, 0.14 * K, lam(0x2a2a2e), PSU.x, PSU.y, PSU.z);
    makePlate(G, 'POWER SUPPLY', 0.2, 0.04, new V3(PSU.x, PSU.y + 0.035, PSU.z + 0.1), 0, { bg: '#2a2a2e', fg: '#ffd23f', size: 0.7 });
    // the monitor (it shows the checklist, then the POST screen)
    addBox(G, 0.08, 0.3, 0.08, lam(0x2a2a2a), 0, TOP + 0.15, 0.17);
    const mon = STUDY.screen(G, 1024, 600, 1.15, 0.67, 0, TOP + 0.62, 0.15, 0, 0x1a1a1a);
    // the power button
    addBox(G, 0.14, 0.24, 0.14, lam(0x2a2a2e), 0.95, TOP + 0.12, 0.8);
    const powerBtn = makeButton(L, new V3(0.95, TOP + 0.265, 0.8), 0x3aa86a, 'Power', () => powerOn(), { pedestal: false });

    // ---------------------------------------------------------------- the parts
    const label = (t, x, z, col) => makePlate(G, t, 0.18, 0.04, new V3(x, TOP + 0.012, z + 0.07), 0, { bg: col || '#ffffff', fg: '#1a1a2a', size: 0.62, tilt: -Math.PI / 2 + 0.5 });
    const P = {};
    function part(id, kind, name, home, mesh, extra) {
      const p = Object.assign({ id, kind, name, home: new V3(home[0], TOP + (extra && extra.h || 0.01), home[1]), mesh, st: 'home', slot: null, lab: label(name, home[0], home[1]) }, extra || {});
      mesh.position.copy(p.home); G.add(mesh);
      p.homeRot = mesh.rotation.clone();
      P[id] = p; return p;
    }
    const grp = (...ms) => { const g = new THREE.Group(); for (const m of ms) g.add(m); g.scale.setScalar(K); return g; };
    const box = (w, h, d, col, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(col)); m.position.set(x || 0, y || 0, z || 0); return m; };
    // ESD strap: a wristband and a coiled cord
    { const g = new THREE.Group(); const band = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 20), lam(0x2a6ad8)); band.rotation.x = Math.PI / 2; g.add(band);
      const clip = box(0.02, 0.012, 0.03, 0xd8d8d8, 0.05, 0, 0); g.add(clip);
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 4, 10), lam(0x2a2a2a)); c.position.set(0.075 + i * 0.012, 0, 0); c.rotation.y = Math.PI / 2; g.add(c); }
      part('strap', 'strap', 'ESD wrist strap', [-0.95, 0.83], g, { h: 0.012 }); }
    // CPU
    part('cpu', 'cpu', 'CPU', [-0.72, 0.8], grp(box(0.045, 0.004, 0.045, 0xc8c8d0), box(0.04, 0.002, 0.04, 0xd8b040, 0, -0.003, 0), box(0.006, 0.001, 0.006, 0xd8b040, -0.017, 0.0025, 0.017)), { h: 0.008 });
    // thermal paste: a syringe
    { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 10), lam(0xd8d8e0)); t.rotation.z = Math.PI / 2; const tip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02, 8), lam(0x8a8a90)); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.05;
      part('paste', 'paste', 'Thermal paste', [-0.5, 0.86], grp(t, tip), { h: 0.012 }); }
    // CPU cooler: a heatsink with a fan on top
    const fan = new THREE.Group();
    { const hs = box(0.09, 0.05, 0.09, 0x9aa0a8); for (let i = 0; i < 8; i++) { const f = box(0.088, 0.002, 0.088, 0xb8bec8, 0, -0.02 + i * 0.006, 0); hs.add(f); }
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.012, 20), lam(0x2a2a2e)); ring.position.y = 0.031;
      for (let i = 0; i < 5; i++) { const b = box(0.036, 0.002, 0.012, 0x3a3a40, 0, 0, 0); b.position.x = 0.018; const arm = new THREE.Group(); arm.rotation.y = i / 5 * Math.PI * 2; arm.add(b); fan.add(arm); }
      fan.position.y = 0.038;
      part('cooler', 'cooler', 'CPU cooler', [-0.82, 0.42], grp(hs, ring, fan), { h: 0.035 }); }
    // memory: three sticks, one of the wrong generation
    const ramMesh = (col) => { const g = new THREE.Group(); g.add(box(0.004, 0.031, 0.133, 0x1f6a3a)); for (let i = 0; i < 8; i++) g.add(box(0.0055, 0.012, 0.012, 0x1a1a1a, 0, 0.002, -0.056 + i * 0.016)); g.add(box(0.0056, 0.008, 0.11, col, 0, 0.011, 0)); g.scale.setScalar(K); return g; };
    const RAMS = [['ramA', -0.46], ['ramB', -0.36], ['ramC', -0.26]].map(([id, x]) => part(id, 'ram', 'RAM', [x, 0.5], ramMesh(0x2a2a2a), { h: 0.024 }));
    // M.2 NVMe SSD
    part('ssd', 'ssd', 'M.2 NVMe SSD', [-0.5, 0.68], grp(box(0.08, 0.003, 0.022, 0x1f5a3a), box(0.02, 0.0035, 0.015, 0x1a1a1a, -0.015, 0.002, 0), box(0.012, 0.0035, 0.012, 0x1a1a1a, 0.015, 0.002, 0)), { h: 0.006 });
    // graphics card: lies flat on the tray, stands up in the slot
    const gpuFans = [];
    { const g = new THREE.Group(); g.add(box(0.24, 0.1, 0.035, 0x2a2a30)); g.add(box(0.24, 0.1, 0.002, 0x1f5a3a, 0, 0, -0.019)); g.add(box(0.09, 0.01, 0.004, 0xd8b040, -0.02, -0.055, -0.016));
      for (const fx of [-0.06, 0.06]) { const f = new THREE.Group(); f.position.set(fx, 0, 0.019); const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.003, 20), lam(0x1a1a1a)); ring.rotation.x = Math.PI / 2; f.add(ring);
        for (let i = 0; i < 7; i++) { const b = box(0.034, 0.012, 0.002, 0x4a4a52); b.position.x = 0.018; const arm = new THREE.Group(); arm.rotation.z = i / 7 * Math.PI * 2; arm.add(b); arm.position.z = 0.002; f.add(arm); } g.add(f); gpuFans.push(f); }
      g.scale.setScalar(K); g.rotation.x = -Math.PI / 2;
      part('gpu', 'gpu', 'Graphics card', [0.42, 0.8], g, { h: 0.03 }); }
    // the power cables (a connector you plug; the wire follows it back to the PSU)
    part('atx', 'atx', '24-pin ATX cable', [0.42, 0.5], grp(box(0.012, 0.02, 0.05, 0xf0f0f0), box(0.01, 0.006, 0.048, 0xd8a040, 0, 0.012, 0)), { h: 0.014 });
    part('eps', 'eps', '8-pin CPU cable', [0.62, 0.58], grp(box(0.02, 0.02, 0.01, 0xf0f0f0), box(0.018, 0.006, 0.008, 0xd8a040, 0, 0.012, 0)), { h: 0.014 });
    const wireM = lam(0x1a1a1a), wires = {};
    function wire(id) {
      const p = P[id], a = PSU.clone().add(new V3(-0.08, -0.02, id === 'atx' ? 0.04 : -0.02)), b = p.mesh.position.clone();
      const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + 0.06;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      if (wires[id]) { G.remove(wires[id]); wires[id].geometry.dispose(); }
      wires[id] = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, id === 'atx' ? 0.012 : 0.007, 6), wireM); G.add(wires[id]);
    }
    const pasteDot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.003, 12), lam(0x9a9aa0)); pasteDot.visible = false; G.add(pasteDot);

    // ---------------------------------------------------------------- the build
    const S = { ph: 'idle', mode: 'guided', gen: 5, t0: 0, tEnd: 0, mistakes: 0, strap: false, cpu: false, paste: false, cooler: false, held: null, msg: '', msgOk: false, msgT: 0, posted: false, fails: 0, best: {} };
    try { if (prefs.pcBest && typeof prefs.pcBest === 'object') S.best = Object.assign({}, prefs.pcBest); } catch (e) { /* none */ }
    L.pc = S;
    const elapsed = () => (S.ph === 'done' ? S.tEnd : S.ph === 'build' ? (performance.now() - S.t0) / 1000 : 0);
    function say(msg, ok) { S.msg = msg; S.msgOk = !!ok; S.msgT = performance.now(); }
    function goHome(p) {
      p.st = 'home'; p.slot = null; p.mesh.position.copy(p.home); p.mesh.rotation.copy(p.homeRot); p.lab.visible = true;
      if (p.kind === 'atx' || p.kind === 'eps') wire(p.id);
    }
    function reset(mode) {
      for (const s of SLOTS) s.filled = null;
      for (const id in P) goHome(P[id]);
      // a DDR4 or a DDR5 board this time, with two sticks to match and one that won't fit
      S.gen = rand() < 0.5 ? 4 : 5;
      const wrongAt = Math.floor(rand() * 3);
      RAMS.forEach((r, i) => { r.gen = i === wrongAt ? (S.gen === 5 ? 4 : 5) : S.gen; r.lab.userData.draw(`DDR${r.gen} RAM`); r.name = `DDR${r.gen} RAM`; });
      genPlate.userData.draw(`DDR${S.gen}`);
      pasteDot.visible = false;
      Object.assign(S, { ph: mode ? 'build' : 'idle', mode: mode || S.mode, t0: performance.now(), tEnd: 0, mistakes: 0, strap: false, cpu: false, paste: false, cooler: false, held: null, posted: false, fails: 0 });
      say(mode ? (mode === 'timed' ? 'The clock’s running. Every mistake adds 10 seconds.' : 'Follow the checklist. Start with the wrist strap.') : '', true);
      monKey = '';
      forcePresence(); state.dirtyBoard = true;
    }
    L.reset = reset;
    function mistake(msg) {
      S.mistakes += 1; say(msg, false); STUDY.wrong();
      forcePresence();
    }
    function pickUp(p, side) {
      if (S.ph !== 'build') reset(S.mode);
      if (p.st !== 'home') return false;
      if (p.kind === 'strap') { S.strap = true; p.st = 'worn'; p.lab.visible = false; say('Strap on: you’re grounded, so no static zaps.', true); STUDY.right(); return false; }
      p.st = 'held'; p.side = side || null; S.held = p; p.lab.visible = false;
      sfx('grab', 0.3);
      return true;
    }
    L.pickUp = (id, side) => pickUp(P[id], side);
    // try to fit the held part into slot s
    function fit(p, s) {
      S.held = null;
      if (!S.strap) { goHome(p); mistake('Zap! Put on the ESD wrist strap first (front left of the bench): static can kill a part.'); return false; }
      const want = s.kind === 'socket' ? ['cpu', 'paste', 'cooler'] : [s.kind];
      if (!want.includes(p.kind)) { goHome(p); mistake(s.tip); return false; }
      if (s.kind === 'socket') {
        if (p.kind === 'cpu' && S.cpu) { goHome(p); return false; }
        if (p.kind === 'paste' && !S.cpu) { goHome(p); mistake('The CPU goes in first; the paste goes on top of it.'); return false; }
        if (p.kind === 'paste' && S.paste) { goHome(p); say('There’s already enough paste: a pea-sized dot is plenty.', true); return false; }
        if (p.kind === 'cooler' && !S.cpu) { goHome(p); mistake('The CPU goes in before the cooler.'); return false; }
        if (p.kind === 'cooler' && !S.paste) { goHome(p); mistake('Thermal paste first! Without it the CPU will overheat.'); return false; }
      } else if (s.filled) { goHome(p); return false; }
      if (p.kind === 'ram' && p.gen !== S.gen) { goHome(p); mistake(`That’s DDR${p.gen}: the notch is in a different place, so it won’t fit a DDR${S.gen} slot.`); return false; }
      // it fits
      const sp = slotPos(s, new V3());
      p.st = 'in'; p.slot = s.id; p.lab.visible = false;
      if (p.kind === 'paste') { S.paste = true; goHome(p); P.paste.st = 'used'; P.paste.lab.visible = false; pasteDot.position.set(sp.x, sp.y + 0.012, sp.z); pasteDot.visible = true; say('A pea-sized dot of paste: the cooler will spread it.', true); STUDY.right(); return true; }
      if (p.kind === 'cpu') { S.cpu = true; p.mesh.position.set(sp.x, sp.y + 0.006, sp.z); p.mesh.rotation.set(0, 0, 0); say('CPU in: the little triangle lines up with the socket’s corner.', true); }
      else if (p.kind === 'cooler') { S.cooler = true; p.mesh.position.set(sp.x, sp.y + 0.05, sp.z); p.mesh.rotation.set(0, 0, 0); pasteDot.visible = false; say('Cooler on, pressing the paste into a thin layer.', true); }
      else if (p.kind === 'ram') { s.filled = p.id; p.mesh.position.set(sp.x, sp.y + 0.024, sp.z); p.mesh.rotation.set(0, 0, 0); say(`DDR${S.gen} in: press until the clips snap shut.`, true); }
      else if (p.kind === 'ssd') { s.filled = p.id; p.mesh.position.set(sp.x, sp.y + 0.004, sp.z); p.mesh.rotation.set(0, 0, 0); say('SSD in, screwed down: NVMe talks over PCIe lanes, so it’s fast.', true); }
      else if (p.kind === 'gpu') { s.filled = p.id; p.mesh.position.set(sp.x + 0.07, sp.y + 0.075, sp.z); p.mesh.rotation.set(0, 0, 0); say('Graphics card in the PCIe x16 slot.', true); }
      else if (p.kind === 'atx') { s.filled = p.id; p.mesh.position.set(sp.x, sp.y + 0.015, sp.z); p.mesh.rotation.set(0, 0, 0); wire('atx'); say('24-pin in: the motherboard has power.', true); }
      else if (p.kind === 'eps') { s.filled = p.id; p.mesh.position.set(sp.x, sp.y + 0.015, sp.z); p.mesh.rotation.set(0, 0, 0); wire('eps'); say('8-pin in: the CPU has its own power.', true); }
      sfx('click', 1); tone(660, 880, 0.08, 'triangle', 0.12);
      forcePresence(); state.dirtyBoard = true;
      return true;
    }
    L.fit = (slotId) => { const p = S.held; const s = SLOTS.find((x) => x.id === slotId); return p && s ? fit(p, s) : false; };
    const ramIn = () => SLOTS.filter((s) => s.kind === 'ram' && s.filled).length;
    const filled = (k) => SLOTS.some((s) => s.kind === k && s.filled);
    // the checklist (and what a missing step does when you press the power button)
    const STEPS = [
      ['Put on the ESD wrist strap', () => S.strap],
      ['CPU into the socket', () => S.cpu],
      ['Thermal paste on the CPU', () => S.paste],
      ['CPU cooler on top', () => S.cooler],
      [() => `Two sticks of DDR${S.gen} RAM`, () => ramIn() === 2],
      ['M.2 SSD in the M.2 slot', () => filled('ssd')],
      ['Graphics card in PCIe x16', () => filled('gpu')],
      ['24-pin ATX power cable', () => filled('atx')],
      ['8-pin CPU power cable', () => filled('eps')],
      ['Press the power button', () => S.posted],
    ];
    function powerOn() {
      if (S.ph !== 'build') { if (S.ph === 'done') reset(S.mode); return; }
      const fails = [
        [!filled('atx'), 'Nothing at all: the motherboard has no power. Plug in the 24-pin ATX cable.'],
        [!S.cpu, 'Fans spin, nothing on screen: there’s no CPU.'],
        [!filled('eps'), 'Fans twitch, then nothing: the CPU needs its 8-pin power cable.'],
        [!S.cooler, 'It shuts off after a few seconds: the CPU is overheating with no cooler.'],
        [ramIn() === 0, 'Beep, beep, beep: a POST beep code. No memory found.'],
        [!filled('gpu'), 'It powers up but there’s no picture: this CPU has no built-in graphics, so fit the graphics card.'],
        [ramIn() === 1, 'It boots, but with one stick the memory runs single-channel. Fit the second stick for dual-channel.'],
        [!filled('ssd'), 'POST passes, then: "No bootable device". Fit the M.2 SSD.'],
      ];
      const f = fails.find((x) => x[0]);
      if (f) { S.fails += 1; mistake(f[1]); sfx('buzzer', 0.4); return; }
      S.posted = true; S.ph = 'done'; S.tEnd = (performance.now() - S.t0) / 1000;
      const total = S.tEnd + (S.mode === 'timed' ? S.mistakes * 10 : 0);
      S.total = total;
      const prev = S.best[S.mode], isBest = !prev || total < prev;
      if (isBest) { S.best[S.mode] = Math.round(total * 10) / 10; prefs.pcBest = Object.assign({}, S.best); savePrefs(); }
      RECORDS.add(L, S.mode, total);
      sfx('fanfare', 0.8);
      say(`POST OK! Built in ${fmtT(total)}${S.mode === 'timed' && S.mistakes ? ` (with ${S.mistakes * 10} s of penalties)` : ''}${S.mistakes ? '' : ', with no mistakes'}.`, true);
      showToast(`It boots! ${fmtT(total)}${isBest ? ' (your best!)' : ''}`);
      forcePresence(); state.dirtyBoard = true;
    }
    L.powerOn = powerOn;
    const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

    // ---------------------------------------------------------------- controls
    const deck = STUDY.cards(G, { n: 2, w: 0.5, h: 0.26, numbered: false });
    deck.place(0, 1.75, 1.45, 0.45, -0.8, 0); deck.place(1, 1.75, 1.13, 0.45, -0.8, 0);
    addBox(G, 0.05, 1.2, 0.05, lam(0x3a3a3a), 1.77, 0.6, 0.43);
    function drawDeck() { deck.set(0, S.ph === 'idle' ? 'Guided build' : 'Restart guided', 'mode', { sub: 'With a checklist', big: 44 }); deck.set(1, S.ph === 'idle' ? 'Timed build' : 'Restart timed', 'mode', { sub: 'No hints, +10 s a mistake', big: 44 }); }
    const _o = new V3(), _d = new V3(), _q = new Q4(), _t = new V3();
    // the part (or slot) nearest a ray
    function rayNear(from, dir, pts, maxD) {
      let best = -1, bd = maxD;
      pts.forEach((p, i) => { if (!p) return; _t.subVectors(p, from); const along = _t.dot(dir); if (along < 0.1) return; const d = _t.addScaledVector(dir, -along).length(); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    const partList = () => Object.values(P);
    function aimRay(side) {
      if (side) { const mh = myHands[side]; _o.copy(mh.pos); _d.set(0, 0, -1).applyQuaternion(mh.quat); }
      else { camera.getWorldPosition(_o); camera.getWorldQuaternion(_q); _d.set(0, 0, -1).applyQuaternion(_q); }
    }
    function clickAt(side) {
      aimRay(side);
      // the power button (first: it's nearer than the cards)
      if (rayNear(_o, _d, [powerBtn.pos], 0.08) === 0) { pressButton(powerBtn, performance.now()); return; }
      const di = deck.pickRay(_o, _d);
      if (di >= 0) { reset(di === 0 ? 'guided' : 'timed'); drawDeck(); return; }
      if (S.held) {
        const si = rayNear(_o, _d, SLOTS.map((s) => slotPos(s, new V3())), 0.06);
        if (si >= 0) fit(S.held, SLOTS[si]);
        else { goHome(S.held); S.held = null; }
        return;
      }
      const ps = partList(), i = rayNear(_o, _d, ps.map((p) => (p.st === 'home' ? p.mesh.position : null)), 0.07);
      if (i >= 0) pickUp(ps[i], side);
    }
    L.deskFire = () => clickAt(null);
    L.onVRTrigger = (h) => {
      aimRay(h.side);
      if (deck.pickRay(_o, _d) >= 0 || rayNear(_o, _d, [powerBtn.pos], 0.08) === 0) clickAt(h.side);
    };
    L.onVRGrab = (h) => {
      const mh = myHands[h.side];
      let best = null, bd = 0.2;
      for (const p of partList()) { if (p.st !== 'home') continue; const d = p.mesh.position.distanceTo(mh.pos); if (d < bd) { bd = d; best = p; } }
      if (!best) return false;
      const held = pickUp(best, h.side);
      if (!held) haptic(vrHands[h.side], 0.4, 30);
      return held;
    };
    L.onVRRelease = (h) => {
      const p = S.held; if (!p || p.side !== h.side) return;
      let best = null, bd = 0.14;
      for (const s of SLOTS) { const sp = slotPos(s, _t); const d = Math.hypot(sp.x - p.mesh.position.x, sp.z - p.mesh.position.z); if (d < bd && p.mesh.position.y < BY + 0.3) { bd = d; best = s; } }
      if (best) { if (fit(p, best)) haptic(vrHands[h.side], 0.6, 40); }
      else { goHome(p); S.held = null; }
    };
    L.throwLabel = () => (S.held ? 'Fit' : 'Pick up');
    L.hudActions = [{ label: () => (S.held ? 'Put it back' : 'Restart'), run: () => { if (S.held) { goHome(S.held); S.held = null; } else { reset(S.mode); drawDeck(); } } }];

    // ---------------------------------------------------------------- the monitor
    let monKey = '';
    function drawMon() {
      const tt = Math.floor(elapsed());
      const key = `${S.ph}|${S.mode}|${tt}|${S.msg}|${STEPS.map((s) => (s[1]() ? 1 : 0)).join('')}|${S.mistakes}|${S.gen}`;
      if (key === monKey) return; monKey = key;
      const g = mon.g, W = 1024, H = 600;
      if (S.ph === 'done') {
        g.fillStyle = '#000814'; g.fillRect(0, 0, W, H);
        g.textAlign = 'left'; g.fillStyle = '#9af0ff'; g.font = `700 34px ui-monospace, Menlo, Consolas, monospace`;
        const lines = ['FieldDay BIOS v2.1', `CPU ......... OK`, `Memory ...... 32 GB DDR${S.gen} dual-channel OK`, 'NVMe SSD .... OK', 'Graphics .... OK', '', 'Booting...'];
        lines.forEach((l, i) => g.fillText(l, 50, 70 + i * 46));
        g.fillStyle = '#8bd450'; g.font = `900 70px ${DISPLAY}`; g.fillText(`POST OK  ·  ${fmtT(S.total)}`, 50, 470);
        g.fillStyle = '#c8d8f0'; g.font = `400 28px ${BODY}`; g.fillText(S.mistakes ? `${S.mistakes} mistake${S.mistakes > 1 ? 's' : ''} on the way` : 'No mistakes!', 50, 520);
        g.fillText('Press Power (or a card) to build again', 50, 568);
        mon.tex.needsUpdate = true; return;
      }
      g.fillStyle = '#10203a'; g.fillRect(0, 0, W, H);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `900 52px ${DISPLAY}`; g.fillText('PC BUILD BENCH', 30, 62);
      g.textAlign = 'right'; g.fillStyle = '#ffffff'; g.font = `800 52px ${DISPLAY}`;
      if (S.ph === 'build') g.fillText(`${fmtT(elapsed())}${S.mode === 'timed' && S.mistakes ? ` +${S.mistakes * 10}s` : ''}`, W - 30, 62);
      g.textAlign = 'left';
      if (S.ph === 'idle') {
        g.fillStyle = '#ffffff'; g.font = `400 32px ${BODY}`;
        STUDY.wrap(g, 'Build a working PC from the parts on the bench, then press the power button. Pick Guided (with a checklist) or Timed on the stand to your right.', 30, 140, W - 60, 44);
        g.fillStyle = '#9ab0d0'; g.font = `400 28px ${BODY}`;
        STUDY.wrap(g, state.mode === 'vr' ? 'Grab a part, hold it over its slot and let go.' : 'Click a part to pick it up, then click the slot it goes in.', 30, 380, W - 60, 38);
      } else if (S.mode === 'guided') {
        let next = STEPS.findIndex((s) => !s[1]());
        STEPS.forEach((s, i) => {
          const done = s[1](), y = 112 + i * 36, txt = typeof s[0] === 'function' ? s[0]() : s[0];
          g.fillStyle = done ? '#8bd450' : i === next ? '#ffd23f' : '#9ab0d0'; g.font = `${i === next ? 800 : 400} 28px ${BODY}`;
          g.fillText(`${done ? '✔' : i === next ? '▶' : '○'}  ${txt}`, 30, y, W - 60);
        });
        void next;
      } else {
        const n = STEPS.filter((s) => s[1]()).length;
        g.fillStyle = '#ffffff'; g.font = `800 44px ${DISPLAY}`; g.fillText(`${n} of ${STEPS.length} steps done  ·  ${S.mistakes} mistake${S.mistakes === 1 ? '' : 's'}`, 30, 150);
        g.fillStyle = '#9ab0d0'; g.font = `400 28px ${BODY}`; g.fillText('No checklist in Timed mode: you know the drill.', 30, 200);
      }
      if (S.msg && S.ph !== 'idle') {
        g.fillStyle = S.msgOk ? '#1f4a2a' : '#5a1a1a'; g.fillRect(20, 480, W - 40, 106);
        g.fillStyle = '#ffffff'; g.font = `700 28px ${BODY}`; STUDY.wrap(g, S.msg, 36, 520, W - 72, 34, 2);
      }
      mon.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    function stand() { S.slot = STUDY.slotOf(L); STUDY.standAt(STUDY.SLOT_X[S.slot] * 0.4, state.mode === 'vr' ? SPOT_Z : 1.7, 0, -0.62); }
    const strapP = P.strap;
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      hall.tick();
      if (!here) return;
      if (STUDY.slotOf(L) !== S.slot) stand();
      // a held part: in your hand (VR) or floating in front of you (browser)
      const p = S.held;
      if (p) {
        if (state.mode === 'vr' && p.side) { p.mesh.position.copy(myHands[p.side].pos); }
        else { camera.getWorldPosition(_o); camera.getWorldQuaternion(_q); p.mesh.position.copy(_t.set(0.1, -0.12, -0.38).applyQuaternion(_q).add(_o)); }
        if (p.kind === 'atx' || p.kind === 'eps') wire(p.id);
      }
      // the wrist strap goes on your left wrist
      if (strapP.st === 'worn') { const h = myHands.left; strapP.mesh.position.copy(h.ok ? h.pos : _t.set(-0.25, -0.4, -0.3).applyQuaternion(myHead.quat).add(myHead.pos)); }
      // slots glow while you hold a part (the one you're over brightest)
      let near = -1;
      if (p) {
        let bd = 0.12;
        if (state.mode === 'vr') SLOTS.forEach((s, i) => { const sp = slotPos(s, _t), d = Math.hypot(sp.x - p.mesh.position.x, sp.z - p.mesh.position.z); if (d < bd) { bd = d; near = i; } });
        else { aimRay(null); near = rayNear(_o, _d, SLOTS.map((s) => slotPos(s, new V3())), 0.06); }
      }
      SLOTS.forEach((s, i) => { s.glow.material.opacity = !p ? 0 : i === near ? 0.75 : 0.18 + 0.1 * Math.sin(now / 200); });
      // power on: the fans spin
      if (S.posted) { fan.rotation.y += dt * 30; for (const f of gpuFans) f.rotation.z += dt * 25; }
      deck.highlight(state.mode === 'flat' ? (aimRay(null), deck.pickRay(_o, _d)) : -1);
      drawMon();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'idle' ? 'PC Build Bench  ·  pick Guided or Timed on the stand to your right' : S.held ? `Holding: ${S.held.name}  ·  aim at its slot and click (click elsewhere to put it back)` : S.ph === 'done' ? 'It boots!  ·  press a card on the right to build again' : 'Click a part to pick it up';
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ pb: [S.ph === 'build' ? 1 : S.ph === 'done' ? 2 : 0, STEPS.filter((s) => s[1]()).length, Math.round((S.best.timed || 0) * 10), Math.round((S.best.guided || 0) * 10)] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.pb;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) { st.pb = null; return; }
      if (!st.pb || st.pb.join() !== a.join()) state.dirtyBoard = true;
      st.pb = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? L.presence().pb : st.pb;
      if (!a) return { best: 0, text: '' };
      const b = a[2] || a[3];
      return { best: b ? 1e6 - b : 0, text: `${a[0] === 1 ? `${a[1]}/10 steps · ` : ''}${b ? `best ${fmtT(b / 10)}` : 'no build yet'}` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.85, 2.0, -0.2, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#10203a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Builders', 36, 80);
      g.fillStyle = '#c8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Fastest build that boots', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, -3.6, 2.6, Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'timed', label: 'Fastest timed build (+10 s a mistake)', low: true, fmt: 'time' }, { k: 'guided', label: 'Fastest guided build', low: true, fmt: 'time' }], { x: 3.4, z: 0.2, yaw: -0.4 });
    L.hints = [['Grip', 'grab a part; let go over its slot'], ['Trigger', 'point at a card or the power button']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Click a part', 'pick it up'], ['Click a slot', 'fit it'], ['Power', 'the green button, when you’re done']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { reset(null); drawDeck(); };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; if (S.held) { goHome(S.held); S.held = null; } };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 1.2, 1.7, 1.9); camera.lookAt(0, 0.95, 0.5); };
    reset(null); drawDeck();
    L.pcInternals = { S, P, SLOTS, STEPS, fit, pickUp, powerOn, reset, goHome, slotPos, deck, clickAt };
    MUSIC_THEMES.pcbuild = { gain: 0.55, bpm: 96, swing: 0.1, chords: ['Dm7', 'G7', 'Cmaj7', 'Am7'], comp: { inst: 'ep', at: [0, 6, 10], dur: 0.5 }, bass: { at: [0, 7, 10] }, drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'o-o-o-o-o-o-o-o-' }, cut: 3400 };
    return L;
  })();
