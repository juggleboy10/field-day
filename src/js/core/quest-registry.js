  // ================================================================ QUEST REGISTRY: enemies, projectiles, weapons
  // ai: melee | ranged | flyer | kamikaze | charger | turret | boss
  // The first three keep their original codes (0, 1, 2) so older pages still understand each other.
  const ENEMIES = [];
  const ENEMY = {};
  function defEnemy(name, o) { o.name = name; o.code = ENEMIES.length; ENEMIES.push(o); ENEMY[name] = o.code; return o.code; }
  const cyl = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s || 10);
  const sph = (r, a, b) => new THREE.SphereGeometry(r, a || 12, b || 10);
  const boxg = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
  const glowEye = (hex) => new THREE.MeshBasicMaterial({ color: hex });

  defEnemy('goblin', { hp: 3, r: 0.42, h: 1.35, speed: 1.7, ai: 'melee', reach: 1.15, windup: 0.55, cool: 1.3, dmg: 1,
    mesh(g, arm, M) {
      const skin = M(0x6f9440), dark = M(0x3e5a26), cloth = M(0x5a3b2a);
      g.add(at(new THREE.Mesh(cyl(0.2, 0.28, 0.55), cloth), 0, 0.62, 0));
      const head = at(new THREE.Mesh(sph(0.22), skin), 0, 1.07, 0); head.scale.set(1, 0.9, 1); g.add(head);
      for (const sx of [-1, 1]) {
        const ear = at(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), skin), sx * 0.24, 1.12, 0.02); ear.rotation.z = -sx * 1.25;
        g.add(ear, at(new THREE.Mesh(sph(0.035, 6, 5), glowEye(0xffe14a)), sx * 0.08, 1.1, -0.19), at(new THREE.Mesh(cyl(0.07, 0.06, 0.38, 6), dark), sx * 0.11, 0.19, 0));
      }
      arm.position.set(0.28, 0.82, 0);
      const fore = at(new THREE.Mesh(cyl(0.05, 0.05, 0.4, 6), skin), 0, -0.15, -0.05); fore.rotation.x = 0.4;
      const club = at(new THREE.Mesh(cyl(0.08, 0.04, 0.6, 7), M(0x6b4a2a)), 0, -0.15, -0.42); club.rotation.x = Math.PI / 2 - 0.3;
      arm.add(fore, club);
    } });
  defEnemy('archer', { hp: 2, r: 0.36, h: 1.75, speed: 1.4, ai: 'ranged', windup: 0.75, cool: 2.6, proj: 'arrow', keep: [4.5, 8],
    mesh(g, arm, M) {
      const bone = M(0xe2dccb), dark = M(0x2a2630);
      g.add(at(new THREE.Mesh(cyl(0.05, 0.05, 0.7, 6), bone), 0, 1.05, 0));
      const ribs = at(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), bone), 0, 1.15, 0); ribs.scale.set(1, 1.1, 0.7);
      g.add(ribs, at(new THREE.Mesh(boxg(0.28, 0.1, 0.14), bone), 0, 0.72, 0), at(new THREE.Mesh(sph(0.16), bone), 0, 1.55, 0));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.04, 6, 5), glowEye(0x8fd0ff)), sx * 0.06, 1.57, -0.13), at(new THREE.Mesh(cyl(0.035, 0.03, 0.7, 6), bone), sx * 0.1, 0.36, 0));
      arm.position.set(-0.22, 1.3, 0);
      const bow = at(new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 5, 16, Math.PI * 0.9), M(0x5a3a22)), 0, 0, -0.3); bow.rotation.set(0, Math.PI / 2, Math.PI / 2 + Math.PI * 0.05);
      const limb = at(new THREE.Mesh(cyl(0.03, 0.03, 0.35, 6), bone), 0, 0, -0.15); limb.rotation.x = Math.PI / 2;
      arm.add(limb, bow);
      g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 10, 1, true), dark), 0, 1.68, 0));
    } });
  defEnemy('warden', { hp: 19, perPlayer: 8, r: 0.95, h: 3.0, speed: 0.95, ai: 'boss', reach: 3.3, windup: 1.3, cool: 4.2, dmg: 2, boss: { slam: true, summon: 'goblin', every: 11000 }, death: 'The Warden crumbles!',
    mesh(g, arm, M) {
      const stone = M(0x6d6876), dark = M(0x48444f), glow = M(0x301000, 0xff6a1a);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(boxg(0.5, 1.1, 0.55), dark), sx * 0.42, 0.55, 0));
      g.add(at(new THREE.Mesh(boxg(1.6, 1.25, 0.95), stone), 0, 1.75, 0), at(new THREE.Mesh(boxg(0.42, 0.42, 0.1), glow), 0, 1.85, -0.48), at(new THREE.Mesh(boxg(0.62, 0.52, 0.55), stone), 0, 2.65, 0));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(boxg(0.12, 0.06, 0.04), glow), sx * 0.14, 2.7, -0.28));
      arm.position.set(0, 2.1, 0);
      for (const sx of [-1, 1]) arm.add(at(new THREE.Mesh(boxg(0.42, 1.25, 0.45), stone), sx * 1.05, -0.45, 0), at(new THREE.Mesh(boxg(0.6, 0.5, 0.6), dark), sx * 1.05, -1.2, 0));
    } });
  defEnemy('bat', { hp: 1, r: 0.32, h: 0.4, fly: 2.3, speed: 3.4, ai: 'flyer', reach: 0.95, windup: 0.3, cool: 1.6, dmg: 1,
    mesh(g, arm, M) {
      const fur = M(0x3a2e3e), wing = M(0x5a4a60);
      g.add(at(new THREE.Mesh(sph(0.13), fur), 0, 0, 0));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.025, 6, 5), glowEye(0xff4a4a)), sx * 0.05, 0.04, -0.11));
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.05, 3), wing); w.rotation.z = sx * Math.PI / 2; w.scale.set(1, 1, 2.2);
        const hold = new THREE.Group(); hold.position.x = sx * 0.12; w.position.x = sx * 0.16; hold.add(w); hold.userData.side = sx;
        arm.add(hold);
      }
      arm.userData.flap = true;
    } });
  defEnemy('brute', { hp: 7, r: 0.62, h: 2.1, speed: 1.15, ai: 'melee', reach: 1.6, windup: 0.9, cool: 2.2, dmg: 2,
    mesh(g, arm, M) {
      const skin = M(0x8a7a5a), cloth = M(0x5a3b2a), dark = M(0x3a3226);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.16, 0.14, 0.7), dark), sx * 0.22, 0.35, 0));
      g.add(at(new THREE.Mesh(cyl(0.42, 0.5, 0.9), cloth), 0, 1.15, 0), at(new THREE.Mesh(sph(0.42), skin), 0, 1.6, 0), at(new THREE.Mesh(sph(0.26), skin), 0, 2.0, -0.05));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.04, 6, 5), glowEye(0xffd04a)), sx * 0.09, 2.03, -0.27), at(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), M(0xe8e0c8)), sx * 0.1, 1.86, -0.24));
      arm.position.set(0.5, 1.6, 0);
      arm.add(at(new THREE.Mesh(cyl(0.12, 0.1, 0.6), skin), 0, -0.25, -0.1), at(new THREE.Mesh(cyl(0.16, 0.08, 0.9, 8), M(0x6b4a2a)), 0, -0.3, -0.62));
      arm.children[1].rotation.x = Math.PI / 2 - 0.2;
    } });
  defEnemy('drone', { hp: 2, r: 0.42, h: 0.5, fly: 2.6, speed: 2.3, ai: 'flyer', ranged: true, proj: 'laser', windup: 0.6, cool: 2.3, keep: [4, 7],
    mesh(g, arm, M) {
      const shell = M(0xc8ccd8), dark = M(0x2a2e3a);
      const body = new THREE.Mesh(sph(0.24, 14, 10), shell); body.scale.set(1, 0.6, 1); g.add(body);
      g.add(at(new THREE.Mesh(cyl(0.09, 0.09, 0.06, 12), glowEye(0xff3a3a)), 0, -0.02, -0.22));
      g.children[1].rotation.x = Math.PI / 2;
      for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
        g.add(at(new THREE.Mesh(boxg(0.04, 0.04, 0.42), dark), x / 2, 0.02, z / 2));
        const rotor = at(new THREE.Mesh(cyl(0.13, 0.13, 0.015, 12), M(0x4fc3f7, 0x0a2a40)), x, 0.05, z);
        arm.add(rotor);
      }
      arm.userData.spin = true;
    } });
  defEnemy('trooper', { hp: 3, r: 0.4, h: 1.85, speed: 1.5, ai: 'ranged', proj: 'laser', burst: 3, windup: 0.6, cool: 2.8, keep: [5, 9],
    mesh(g, arm, M) {
      const plate = M(0xe4e6ee), dark = M(0x3a3e4e);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(boxg(0.16, 0.8, 0.2), dark), sx * 0.15, 0.4, 0));
      g.add(at(new THREE.Mesh(boxg(0.55, 0.6, 0.32), plate), 0, 1.15, 0), at(new THREE.Mesh(boxg(0.32, 0.28, 0.3), plate), 0, 1.62, 0));
      g.add(at(new THREE.Mesh(boxg(0.26, 0.06, 0.04), glowEye(0xff3a5a)), 0, 1.64, -0.16));
      arm.position.set(0.3, 1.3, 0);
      arm.add(at(new THREE.Mesh(boxg(0.1, 0.12, 0.6), dark), 0, -0.05, -0.28), at(new THREE.Mesh(boxg(0.04, 0.04, 0.1), glowEye(0xff3a5a)), 0, -0.02, -0.6));
    } });
  defEnemy('crusher', { hp: 4, r: 0.6, h: 1.5, speed: 1.6, ai: 'charger', reach: 1.3, windup: 0.45, cool: 2.4, dmg: 2,
    mesh(g, arm, M) {
      const plate = M(0xf2a23a), dark = M(0x2a2a32);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.3, 0.3, 0.2, 14), dark), sx * 0.45, 0.3, 0));
      g.children.forEach((c) => { c.rotation.z = Math.PI / 2; });
      g.add(at(new THREE.Mesh(boxg(0.9, 0.8, 1.0), plate), 0, 0.85, 0), at(new THREE.Mesh(boxg(0.6, 0.1, 0.06), glowEye(0xff3a3a)), 0, 1.05, -0.51));
      arm.position.set(0, 0.7, -0.55);
      arm.add(at(new THREE.Mesh(boxg(1.0, 0.5, 0.2), dark), 0, 0, 0));
    } });
  defEnemy('turret', { hp: 6, r: 0.55, h: 1.4, speed: 0, ai: 'turret', proj: 'laser', burst: 4, windup: 0.8, cool: 3.2,
    mesh(g, arm, M) {
      const base = M(0x4a4e5e), head = M(0xd8dae4);
      g.add(at(new THREE.Mesh(cyl(0.45, 0.6, 0.6, 12), base), 0, 0.3, 0));
      arm.position.set(0, 1.0, 0);
      arm.add(at(new THREE.Mesh(sph(0.36, 14, 10), head), 0, 0, 0), at(new THREE.Mesh(boxg(0.12, 0.12, 0.7), base), 0, 0, -0.4), at(new THREE.Mesh(sph(0.07, 8, 6), glowEye(0xff3a3a)), 0, 0.05, -0.33));
    } });
  defEnemy('overseer', { hp: 21, perPlayer: 8, r: 1.15, h: 1.6, fly: 3.4, speed: 0.9, ai: 'boss', reach: 3.0, windup: 1.0, cool: 3.6, dmg: 2, proj: 'laser', boss: { barrage: 7, summon: 'drone', every: 12000 }, death: 'The Overseer goes dark!',
    mesh(g, arm, M) {
      const shell = M(0x2e3242), plate = M(0xc8ccd8), eye = glowEye(0xff2a4a);
      const body = new THREE.Mesh(sph(0.95, 18, 14), shell); body.scale.set(1, 0.8, 1); g.add(body);
      g.add(at(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.08, 8, 32), plate), 0, 0, 0));
      g.children[1].rotation.x = Math.PI / 2;
      g.add(at(new THREE.Mesh(sph(0.3, 14, 10), eye), 0, 0.05, -0.75));
      arm.position.set(0, 0, 0);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; arm.add(at(new THREE.Mesh(boxg(0.18, 0.18, 0.5), plate), Math.cos(a) * 1.25, -0.2, Math.sin(a) * 1.25)); }
      arm.userData.spin = true;
    } });
  defEnemy('slime', { hp: 4, r: 0.55, h: 0.9, speed: 1.0, ai: 'melee', reach: 1.05, windup: 0.6, cool: 1.6, dmg: 1, split: 'minislime',
    mesh(g, arm, M) {
      const goo = new THREE.MeshLambertMaterial({ color: 0x6adf6a, emissive: 0x0a3a0a, transparent: true, opacity: 0.85 });
      const b = new THREE.Mesh(sph(0.5, 16, 12), goo); b.scale.set(1, 0.75, 1); b.position.y = 0.38; arm.add(b);
      for (const sx of [-1, 1]) arm.add(at(new THREE.Mesh(sph(0.06, 8, 6), glowEye(0x102010)), sx * 0.15, 0.55, -0.38));
      arm.userData.squish = true;
      void M;
    } });
  // hunched, ragged and hungry: the Hexwood's answer to the slimes
  defEnemy('ghoul', { hp: 4, r: 0.5, h: 1.55, speed: 1.05, ai: 'melee', reach: 1.25, windup: 0.65, cool: 1.7, dmg: 1, split: 'crawler',
    mesh(g, arm, M) {
      const skin = M(0x7d8a6a), dark = M(0x3a4232), rag = M(0x4a3a30), bone = M(0xcfc9ae), sore = M(0x5a2a2a);
      const torso = at(new THREE.Mesh(cyl(0.2, 0.32, 0.85), rag), 0, 0.82, 0.04); torso.rotation.x = -0.38; g.add(torso);
      const hump = at(new THREE.Mesh(sph(0.27, 10, 8), skin), 0, 1.2, 0.2); hump.scale.set(1.15, 0.8, 1); g.add(hump);
      const head = at(new THREE.Mesh(sph(0.19, 10, 8), skin), 0, 1.24, -0.24); head.scale.set(0.9, 1.15, 1); g.add(head);
      const jaw = at(new THREE.Mesh(boxg(0.17, 0.06, 0.12), dark), 0, 1.09, -0.3); g.add(jaw);
      for (let k = -2; k <= 2; k++) g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.07, 4), bone), k * 0.032, 1.12, -0.35));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.04, 6, 5), glowEye(0xd8ff4a)), sx * 0.075, 1.27, -0.37), at(new THREE.Mesh(cyl(0.065, 0.05, 0.62, 6), dark), sx * 0.13, 0.31, 0.02));
      // tattered cloth hanging from the waist, and a sore on the back
      for (const [x, z] of [[-0.2, 0.05], [0.2, 0.1], [0, 0.28]]) { const strip = at(new THREE.Mesh(boxg(0.12, 0.34, 0.03), rag), x, 0.5, z); strip.rotation.z = x * 0.6; g.add(strip); }
      g.add(at(new THREE.Mesh(sph(0.07, 6, 5), sore), 0.1, 1.32, 0.35));
      // the long clawed arm that swings
      arm.position.set(0.34, 1.1, -0.05);
      const upper = at(new THREE.Mesh(cyl(0.06, 0.045, 0.62, 6), skin), 0, -0.28, -0.08); upper.rotation.x = 0.35;
      const hand = at(new THREE.Mesh(sph(0.075, 6, 5), dark), 0, -0.56, -0.22);
      arm.add(upper, hand);
      for (let k = -1; k <= 1; k++) { const claw = at(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.2, 5), bone), k * 0.045, -0.6, -0.36); claw.rotation.x = -Math.PI / 2; arm.add(claw); }
      g.add(at(new THREE.Mesh(cyl(0.05, 0.04, 0.62, 6), skin), -0.34, 0.8, -0.1));
    } });
  defEnemy('crawler', { hp: 1, r: 0.3, h: 0.45, speed: 2.1, ai: 'melee', reach: 0.8, windup: 0.4, cool: 1.3, dmg: 1,
    mesh(g, arm, M) {
      const skin = M(0x8a9478), dark = M(0x2e3328);
      const body = at(new THREE.Mesh(sph(0.2, 10, 8), skin), 0, 0.25, 0); body.scale.set(1, 0.5, 1.25); g.add(body);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.03, 6, 5), glowEye(0xff4a3a)), sx * 0.07, 0.3, -0.24));
      for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, z = ((i >> 1) - 1) * 0.15; const leg = at(new THREE.Mesh(cyl(0.012, 0.008, 0.38, 4), dark), s * 0.24, 0.14, z); leg.rotation.z = s * 1.05; g.add(leg); }
      arm.userData.squish = true;
    } });
  defEnemy('minislime', { hp: 1, r: 0.32, h: 0.5, speed: 1.6, ai: 'melee', reach: 0.85, windup: 0.45, cool: 1.4, dmg: 1,
    mesh(g, arm, M) {
      const goo = new THREE.MeshLambertMaterial({ color: 0x9aef7a, emissive: 0x0a3a0a, transparent: true, opacity: 0.85 });
      const b = new THREE.Mesh(sph(0.28, 12, 10), goo); b.scale.set(1, 0.75, 1); b.position.y = 0.21; arm.add(b);
      for (const sx of [-1, 1]) arm.add(at(new THREE.Mesh(sph(0.035, 6, 5), glowEye(0x102010)), sx * 0.08, 0.3, -0.22));
      arm.userData.squish = true;
      void M;
    } });
  defEnemy('wisp', { hp: 1, r: 0.32, h: 0.4, fly: 1.7, speed: 3.0, ai: 'kamikaze', reach: 1.1, windup: 0.5, cool: 1, dmg: 1, blast: 1.9,
    mesh(g, arm) {
      const core = new THREE.Mesh(sph(0.16, 12, 10), glowEye(0xb8f0ff));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0x7ad8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.scale.set(0.9, 0.9, 1);
      g.add(core, glow);
      arm.userData.pulse = glow;
    } });
  defEnemy('imp', { hp: 2, r: 0.38, h: 1.2, speed: 1.9, ai: 'ranged', proj: 'fire', windup: 0.7, cool: 2.4, keep: [4, 8],
    mesh(g, arm, M) {
      const skin = M(0xc2412d), dark = M(0x5a1a14);
      g.add(at(new THREE.Mesh(cyl(0.16, 0.22, 0.5), skin), 0, 0.55, 0), at(new THREE.Mesh(sph(0.2), skin), 0, 0.98, 0));
      for (const sx of [-1, 1]) {
        const horn = at(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), dark), sx * 0.12, 1.17, 0); horn.rotation.z = -sx * 0.4;
        g.add(horn, at(new THREE.Mesh(sph(0.035, 6, 5), glowEye(0xffe14a)), sx * 0.07, 1.0, -0.17), at(new THREE.Mesh(cyl(0.05, 0.04, 0.32, 6), dark), sx * 0.09, 0.16, 0));
        const w = at(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.04, 3), dark), sx * 0.26, 0.75, 0.12); w.rotation.z = sx * Math.PI / 2; w.scale.set(1, 1, 2);
        g.add(w);
      }
      arm.position.set(0.22, 0.72, -0.05);
      arm.add(at(new THREE.Mesh(sph(0.09, 8, 6), glowEye(0xff9a3a)), 0, 0, -0.18));
    } });
  defEnemy('hexwarden', { hp: 21, perPlayer: 8, r: 0.9, h: 2.6, speed: 1.0, ai: 'boss', reach: 3.0, windup: 1.1, cool: 3.6, dmg: 2, proj: 'fire', boss: { slam: true, barrage: 6, summon: 'wisp', every: 10000 }, death: 'The Hexwarden fades into the mist!',
    mesh(g, arm, M) {
      const robe = M(0x3a1d4a), trim = M(0x8a3abf), skin = M(0x9ad0a0);
      g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.0, 14, 1, true), robe), 0, 1.0, 0), at(new THREE.Mesh(sph(0.3), skin), 0, 2.2, 0));
      g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 12), robe), 0, 2.75, 0), at(new THREE.Mesh(cyl(0.6, 0.6, 0.04, 20), robe), 0, 2.35, 0));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.05, 6, 5), glowEye(0xd0ff6a)), sx * 0.1, 2.24, -0.26));
      g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.04, 6, 24), trim), 0, 0.05, 0));
      g.children[g.children.length - 1].rotation.x = Math.PI / 2;
      arm.position.set(0.55, 1.7, -0.1);
      arm.add(at(new THREE.Mesh(cyl(0.03, 0.03, 1.6, 6), M(0x4a3020)), 0, -0.3, -0.2), at(new THREE.Mesh(sph(0.12, 10, 8), glowEye(0xb06aff)), 0, 0.52, -0.2));
    } });

  // projectiles enemies throw at you
  const PROJ = {
    arrow: { code: 0, speed: 10, gravity: 3, color: 0xcfc6a8, glow: 0, size: 0.6, dmg: 1 },
    laser: { code: 1, speed: 13, gravity: 0, color: 0xff3a5a, glow: 0xff3a5a, size: 0.45, dmg: 1 },
    fire: { code: 2, speed: 9, gravity: 1.2, color: 0xff8a2a, glow: 0xff8a2a, size: 0.2, dmg: 1 },
  };
  const PROJ_BY_CODE = Object.values(PROJ).sort((a, b) => a.code - b.code);

  // weapons (grip at the origin, pointing along -Z)
  function makeGunMesh(color, len, bulk) {
    const g = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color: 0x2a2e3e, emissive: 0x000000 });
    const trim = new THREE.MeshLambertMaterial({ color: 0xd8dce8, emissive: 0x000000 });
    const glow = new THREE.MeshBasicMaterial({ color });
    g.add(at(new THREE.Mesh(boxg(0.05 * bulk, 0.08 * bulk, len), body), 0, 0.03, -len / 2 + 0.05));
    const grip = at(new THREE.Mesh(boxg(0.04, 0.11, 0.05), body), 0, -0.04, 0.02); grip.rotation.x = 0.3; g.add(grip);
    g.add(at(new THREE.Mesh(boxg(0.052 * bulk, 0.02, len * 0.8), glow), 0, 0.07 * bulk, -len / 2 + 0.05));
    const muzzle = at(new THREE.Mesh(cyl(0.022 * bulk, 0.028 * bulk, 0.05, 10), trim), 0, 0.03, -len + 0.03); muzzle.rotation.x = Math.PI / 2; g.add(muzzle);
    g.userData.mats = [body, trim];
    g.userData.glow = glow;
    g.userData.len = len;
    return g;
  }
  const SPELLS = [
    { name: 'Fireball', color: 0xff7a2a, hex: '#ff7a2a' },
    { name: 'Frost shard', color: 0x8ad8ff, hex: '#8ad8ff' },
    { name: 'Chain lightning', color: 0xe8e06a, hex: '#e8e06a' },
  ];
  function makeWandMesh() {
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x5a3a24, emissive: 0x000000 });
    const band = new THREE.MeshLambertMaterial({ color: 0xc9a23a, emissive: 0x000000 });
    const shaft = at(new THREE.Mesh(cyl(0.012, 0.018, 0.42, 8), wood), 0, 0, -0.17); shaft.rotation.x = Math.PI / 2;
    const grip = at(new THREE.Mesh(cyl(0.02, 0.02, 0.12, 8), band), 0, 0, 0.04); grip.rotation.x = Math.PI / 2;
    const tip = at(new THREE.Mesh(sph(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: SPELLS[0].color })), 0, 0, -0.4);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: SPELLS[0].color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.z = -0.4; glow.scale.set(0.14, 0.14, 1);
    g.add(shaft, grip, tip, glow);
    g.userData.mats = [wood, band];
    g.userData.tip = tip;
    g.userData.tipGlow = glow;
    return g;
  }
  const TOOL_MESH = {
    pistol: () => makeGunMesh(0x4fc3f7, 0.3, 1),
    scatter: () => makeGunMesh(0xffb020, 0.42, 1.35),
    rail: () => makeGunMesh(0xb388ff, 0.62, 1.1),
    plasma: () => makeGunMesh(0x6aff8a, 0.5, 1.6),
    wand: () => makeWandMesh(),
  };
  // what each weapon's shot looks like, for sending to other players
  const WEAPON_FX = ['bolt', 'pistol', 'scatter', 'rail', 'plasma', 'fire', 'frost', 'storm'];
  const WEAPON_FX_COLOR = { bolt: 0x9aa0b0, pistol: 0x4fc3f7, scatter: 0xffb020, rail: 0xb388ff, plasma: 0x6aff8a, fire: 0xff7a2a, frost: 0x8ad8ff, storm: 0xe8e06a };

