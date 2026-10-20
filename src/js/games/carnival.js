  // ================================================================ CARNIVAL: shared scenery for the fairground games
  // A summer evening at the fair: string lights, striped booths, a Ferris wheel turning in the distance.
  // Every carnival game pays out tickets (skeeball.addTickets), spent at the Skee-Ball prize counter.
  const CARNIVAL = (() => {
    const env = () => ({
      sky: skyTexture([[0, '#141038'], [0.45, '#3a2a6a'], [0.5, '#ff9a6a'], [0.53, '#4a2a4a'], [1, '#1a1020']]),
      bg: 0x2a1a48, fog: [0x2a1a48, 40, 140], hemi: [0xffe0d0, 0x403050, 0.8],
      sun: [0xffd8b0, 0.55], sunDir: new V3(-0.3, 0.6, -0.8), ambient: [0x5a4060, 0.45], sprite: null,
    });
    const bulbM = [0xffd23f, 0xff4d8a, 0x4fc3f7, 0x8bd450, 0xffffff].map((c) => new THREE.MeshBasicMaterial({ color: c }));
    const glowM = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffd8a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    // a sagging string of coloured bulbs from a to b
    function lights(G, a, b, n) {
      for (let i = 0; i <= n; i++) {
        const u = i / n, p = new V3().lerpVectors(a, b, u); p.y -= Math.sin(u * Math.PI) * 0.5;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), bulbM[i % bulbM.length]); m.position.copy(p); G.add(m);
        if (i % 3 === 0) { const s = new THREE.Sprite(glowM); s.position.copy(p); s.scale.set(0.5, 0.5, 1); G.add(s); }
      }
    }
    function backdrop(G, rand, o) {
      const opt = o || {};
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), lam(0x3a5a2a)); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.01; G.add(grass);
      const path = new THREE.Mesh(new THREE.PlaneGeometry(opt.pathW || 16, opt.pathD || 12), lam(0x8a7058)); path.rotation.x = -Math.PI / 2; path.position.set(0, 0, opt.pathZ || 1); G.add(path);
      // the Ferris wheel
      const wheel = new THREE.Group(); wheel.position.set(opt.wheelX || -22, 13, opt.wheelZ || -38); G.add(wheel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(10, 0.18, 6, 48), lam(0xf4f2ec)); wheel.add(rim);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 10, 0.12), lam(0xd8d0c8)); sp.position.set(Math.cos(a) * 5, Math.sin(a) * 5, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), bulbM[k % bulbM.length]); b.position.set(Math.cos(a) * 10, Math.sin(a) * 10, 0.2); wheel.add(b);
        const gond = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), lam([0xe5453a, 0x4fc3f7, 0xffd23f, 0x8bd450][k % 4])); gond.userData.a = a; wheel.add(gond);
      }
      for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 15, 0.4), lam(0xd8d0c8)); leg.position.set(wheel.position.x + sx * 3.5, 6.5, wheel.position.z); leg.rotation.z = sx * 0.24; G.add(leg); }
      // tents in the distance
      for (let k = 0; k < 7; k++) {
        const x = -40 + k * 13 + rand() * 4, z = -26 - rand() * 10, r = 2.5 + rand() * 1.5;
        if (Math.abs(x - wheel.position.x) < 8) continue;
        const cols = [[0xe5453a, 0xf4f2ec], [0x4a7ad8, 0xffd23f], [0x8bd450, 0xf4f2ec]][k % 3];
        const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3, 12), lam(cols[0])); body.position.set(x, 1.5, z); G.add(body);
        const top = new THREE.Mesh(new THREE.ConeGeometry(r * 1.15, 2.6, 12), lam(cols[1])); top.position.set(x, 4.3, z); G.add(top);
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), new THREE.MeshLambertMaterial({ color: cols[0], side: THREE.DoubleSide })); fl.position.set(x + 0.3, 6, z); G.add(fl);
      }
      // poles with strings of lights over the walkway
      const PW = (opt.pathW || 16) / 2 + 0.4, z0 = (opt.pathZ || 1) - (opt.pathD || 12) / 2, z1 = (opt.pathZ || 1) + (opt.pathD || 12) / 2;
      for (const [x, z] of [[-PW, z0], [PW, z0], [-PW, z1], [PW, z1]]) addCyl(G, 0.06, 0.08, 4.2, 6, lam(0x3a2a2a), x, 2.1, z);
      lights(G, new V3(-PW, 4.1, z0), new V3(PW, 4.1, z1), 26);
      lights(G, new V3(PW, 4.1, z0), new V3(-PW, 4.1, z1), 26);
      lights(G, new V3(-PW, 4.1, z0), new V3(-PW, 4.1, z1), 14);
      lights(G, new V3(PW, 4.1, z0), new V3(PW, 4.1, z1), 14);
      // a popcorn cart
      const px = opt.cartX !== undefined ? opt.cartX : PW - 1.2, pz = z1 - 1.2;
      addBox(G, 1.0, 0.8, 0.6, lam(0xe5453a), px, 0.6, pz); addBox(G, 0.9, 0.6, 0.5, new THREE.MeshLambertMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.6 }), px, 1.3, pz); addBox(G, 1.1, 0.08, 0.7, lam(0xf4f2ec), px, 1.64, pz);
      for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 14), lam(0x2a2a2a)); w.position.set(px + sx * 0.4, 0.22, pz + 0.32); G.add(w); }
      return {
        tick(dt) {
          wheel.rotation.z += dt * 0.08;
          for (const c of wheel.children) if (c.userData.a !== undefined) { const a = c.userData.a; c.position.set(Math.cos(a) * 10, Math.sin(a) * 10 - 0.9, 0); c.rotation.z = -wheel.rotation.z; }
        },
      };
    }
    // a striped booth: counter at the front (z + d/2 side), awning, back wall and sign. (x, z) is the centre.
    function booth(G, x, z, w, d, title, colA, colB) {
      const stripe = canvasTexture(128, 32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? colB : colA; g.fillRect(i * 16, 0, 16, 32); } g.fillStyle = colA; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(i * 16 + 8, 32, 8, 0, Math.PI); g.fill(); } });
      stripe.tex.wrapS = THREE.RepeatWrapping; stripe.tex.repeat.set(Math.max(1, Math.round(w / 1.6)), 1);
      const H = 2.9;
      const awn = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.3, 1.2), new THREE.MeshLambertMaterial({ map: stripe.tex, side: THREE.DoubleSide })); awn.position.set(x, H + 0.3, z + d / 2 - 0.3); awn.rotation.x = -1.05; G.add(awn);
      const val = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.3, 0.3), new THREE.MeshLambertMaterial({ map: stripe.tex, side: THREE.DoubleSide })); val.position.set(x, H - 0.1, z + d / 2 + 0.21); G.add(val);
      const wallM = lam(new THREE.Color(colB).getHex());
      addBox(G, w, H, 0.08, wallM, x, H / 2, z - d / 2);
      for (const sx of [-1, 1]) { addBox(G, 0.08, H, d, wallM, x + sx * w / 2, H / 2, z); addCyl(G, 0.06, 0.06, H + 0.4, 6, lam(0xf4f2ec), x + sx * (w / 2 + 0.05), (H + 0.4) / 2, z + d / 2); }
      addBox(G, w, 1.0, 0.4, lam(0x6a3a1a), x, 0.5, z + d / 2 - 0.2);
      addBox(G, w + 0.1, 0.06, 0.5, lam(0xd8a050), x, 1.03, z + d / 2 - 0.2);
      makePlate(G, title, Math.min(w, 3.2), 0.45, new V3(x, H + 0.5, z + d / 2 - 0.05), 0, { bg: colA, fg: '#ffffff', size: 0.62 });
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0x5a3a2a)); fl.rotation.x = -Math.PI / 2; fl.position.set(x, 0.005, z); G.add(fl);
      lights(G, new V3(x - w / 2, H + 0.05, z + d / 2 + 0.2), new V3(x + w / 2, H + 0.05, z + d / 2 + 0.2), Math.round(w * 3));
    }
    const tickets = (n, at) => { if (typeof skeeball !== 'undefined' && skeeball.addTickets) skeeball.addTickets(n, at); };
    // a prize stand (the Skee-Ball prizes, the same tickets) in another carnival game; call .tick() each frame
    const prizeStand = (L, x, z, yaw) => (typeof skeeball !== 'undefined' && skeeball.makePrizeStand ? skeeball.makePrizeStand(L, x, z, yaw) : { tick() {} });
    return { env, backdrop, booth, lights, tickets, prizeStand };
  })();
