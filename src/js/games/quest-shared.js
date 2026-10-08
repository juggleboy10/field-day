  // ================================================================ QUESTS
  const speckle = (g, rand, n, a, b) => { for (let k = 0; k < n; k++) { g.fillStyle = rand() < 0.5 ? a : b; g.fillRect(rand() * 256, rand() * 256, 2, 2); } };
  const unitBox = boxg(1, 1, 1);
  const unitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const unitCone = new THREE.ConeGeometry(1, 1, 7);
  const unitBlob = new THREE.IcosahedronGeometry(1, 0);
  const RAIL_GLASS = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.18, depthWrite: false });
  // scatter props across the world outside the playable ground
  function scatter(ctx, n, x0, x1, z0, z1, keepOut, fn) {
    for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) {
      const x = x0 + ctx.rand() * (x1 - x0), z = z0 + ctx.rand() * (z1 - z0);
      if (ctx.playable(x, z, -keepOut)) continue;
      fn(x, z); k++;
    }
  }
  function ring(ctx, n, rMin, rMax, cz, fn) {
    for (let k = 0; k < n; k++) { const a = ctx.rand() * Math.PI * 2, r = rMin + ctx.rand() * (rMax - rMin); fn(Math.cos(a) * r, cz + Math.sin(a) * r, a); }
  }

