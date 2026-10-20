  // ================================================================ RECORDS: all-time high scores for each game
  // A game says what its records are (RECORDS.def), and reports a result when one's set (RECORDS.add). The top five
  // of each are kept on this device, with who set them, and friends in the same game share their bests (so their
  // records show up on your board too). Each game shows its records on a board beside its kiosk, and in a browser
  // a Records button lists them.
  const RECORDS = (() => {
    const TOP = 5;
    const store = () => { prefs.records = prefs.records && typeof prefs.records === 'object' ? prefs.records : {}; return prefs.records; };
    const listOf = (L, k) => { const s = store(); s[L.id] = s[L.id] || {}; const a = s[L.id][k]; return Array.isArray(a) ? a.filter((e) => Array.isArray(e) && Number.isFinite(e[0]) && typeof e[1] === 'string') : []; };
    const fmtTime = (v) => { const m = Math.floor(v / 60), s = v - m * 60; return m ? `${m}:${s.toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)} s`; };
    const FMT = {
      time: fmtTime,
      m: (v) => `${Math.round(v)} m`,
      yd: (v) => `${Math.round(v)} yd`,
      ms: (v) => `${Math.round(v)} ms`,
      int: (v) => `${Math.round(v)}`,
    };
    // defs: [{ k, label, low (lower is better), fmt ('time' | 'm' | 'yd' | 'ms' | 'int' | a function), unit }]
    // (at: where the board stands, for a game without a kiosk to stand it by)
    function def(L, defs, at) {
      L.recDefs = defs; L.recAt = at || null;
      if (L.kioskAt || at) build(L); else L.recPending = true;
      L.recHud = { label: () => '\u{1F3C6} Records', run: () => showPanel(L) };
    }
    const better = (d, a, b) => (d.low ? a < b : a > b);
    const fmtOf = (d) => (typeof d.fmt === 'function' ? d.fmt : FMT[d.fmt || 'int'] || FMT.int);
    // a result for record k: returns its place (1 = a new record) or 0
    function add(L, k, value, who) {
      const d = (L.recDefs || []).find((x) => x.k === k);
      if (!d || !Number.isFinite(value)) return 0;
      if (d.low ? value <= 0 : value <= 0 && !d.zeroOk) return 0;
      const name = who || state.name || 'You';
      const list = listOf(L, k);
      const prev = list[0];
      list.push([Math.round(value * 100) / 100, String(name).slice(0, 24), Date.now()]);
      list.sort((a, b) => (d.low ? a[0] - b[0] : b[0] - a[0]) || a[2] - b[2]);
      const kept = list.slice(0, TOP);
      store()[L.id][k] = kept;
      savePrefs();
      const place = kept.findIndex((e) => e[1] === String(name).slice(0, 24) && e[0] === Math.round(value * 100) / 100) + 1;
      if (!who && place === 1 && (!prev || better(d, value, prev[0]))) {
        showToast(`\u{1F3C6} New record! ${d.label}: ${fmtOf(d)(value)}`); sfx('fanfare', 0.7);
      }
      if (L.recBoard) L.recBoard.key = '';
      if (!who && place > 0) SHARED.soon();
      return place;
    }
    // my best for each record in this game (sent to friends)
    function mine(L) {
      if (!L.recDefs) return null;
      const me = state.name || 'You', out = [];
      for (const d of L.recDefs) { const e = listOf(L, d.k).find((x) => x[1] === me); if (e) out.push([d.k, e[0]]); }
      return out.length ? out : null;
    }
    // a friend's bests: add them to the board if they make it
    function merge(L, name, list) {
      if (!L.recDefs || !Array.isArray(list) || typeof name !== 'string' || !name) return;
      for (const e of list.slice(0, 8)) {
        if (!Array.isArray(e) || typeof e[0] !== 'string' || !Number.isFinite(e[1])) continue;
        const d = L.recDefs.find((x) => x.k === e[0]); if (!d) continue;
        const cur = listOf(L, d.k);
        // only their best counts: skip it if they're already on with as good a score, else it replaces theirs
        if (cur.some((x) => x[1] === name && !better(d, e[1], x[0]))) continue;
        const mineList = cur.filter((x) => x[1] !== name);
        store()[L.id][d.k] = mineList; add(L, d.k, e[1], name);
      }
    }
    // the board beside the kiosk
    function build(L) {
      L.recPending = false;
      const k = L.recAt || L.kioskAt, rx = Math.cos(k.yaw), rz = -Math.sin(k.yaw), fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
      const n = L.recDefs.length, H = Math.min(1.9, 0.55 + 0.38 * n), W = 1.4;
      const off = L.recAt ? 0 : 1.55, x = k.x - rx * off - fx * 0.05, z = k.z - rz * off - fz * 0.05, y0 = (L.recAt && L.recAt.y) || 0;
      const ct = canvasTexture(512, Math.round(512 * H / W));
      const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, H + 0.08, 0.05), lam(0x3a2a1a)); frame.position.set(x - fx * 0.03, y0 + 0.75 + H / 2, z - fz * 0.03); frame.rotation.y = k.yaw; L.group.add(frame);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: ct.tex })); face.position.set(x, y0 + 0.75 + H / 2, z); face.rotation.y = k.yaw; L.group.add(face);
      for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.78, 6), lam(0x3a2a1a)); leg.position.set(x + rx * s * (W / 2 - 0.12) - fx * 0.03, y0 + 0.39, z + rz * s * (W / 2 - 0.12) - fz * 0.03); L.group.add(leg); }
      L.recBoard = { ct, key: '', hpx: Math.round(512 * H / W), face };
    }
    function draw(L) {
      const b = L.recBoard; if (!b) return;
      const data = L.recDefs.map((d) => listOf(L, d.k));
      const key = JSON.stringify(data) + (state.name || '');
      if (key === b.key) return; b.key = key;
      const g = b.ct.g, H = b.hpx;
      g.fillStyle = '#16102a'; g.fillRect(0, 0, 512, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.strokeRect(3, 3, 506, H - 6);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 34px ${DISPLAY}`; g.fillText('\u{1F3C6} RECORDS', 256, 44);
      const n = L.recDefs.length, block = (H - 62) / n, rows = clamp(Math.floor((block - 40) / 26), 1, 5);
      L.recDefs.forEach((d, i) => {
        const y0 = 62 + i * block, lh = clamp((block - 46) / rows, 24, 46), fs = Math.round(lh * 0.74);
        g.textAlign = 'left'; g.fillStyle = '#8be0ff'; g.font = `700 ${Math.round(Math.min(30, lh * 0.75))}px ${BODY}`; g.fillText(d.label, 22, y0 + 26, 470);
        const list = data[i];
        if (!list.length) { g.fillStyle = '#7a6a9a'; g.font = `400 ${fs}px ${BODY}`; g.fillText('No record yet: be the first!', 22, y0 + 34 + lh); return; }
        list.slice(0, rows).forEach((e, r) => {
          const y = y0 + 34 + lh * (r + 1), me = e[1] === (state.name || 'You');
          g.fillStyle = r === 0 ? '#ffd23f' : me ? '#ffffff' : '#d8d0f0'; g.font = `${r === 0 ? 800 : 500} ${fs}px ${BODY}`;
          g.textAlign = 'left'; g.fillText(`${r + 1}. ${e[1]}`, 30, y, 300);
          g.textAlign = 'right'; g.fillText(fmtOf(d)(e[0]), 490, y);
        });
      });
      b.ct.tex.needsUpdate = true;
    }
    // the browser's list
    let panel = null;
    function showPanel(L) {
      SHARED.pull();
      if (!panel) {
        panel = document.createElement('div');
        Object.assign(panel.style, { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(22,16,42,0.96)', color: '#fff', border: '3px solid #ffd23f', borderRadius: '16px', padding: '18px 24px', font: '15px system-ui, sans-serif', zIndex: 50, minWidth: '280px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' });
        panel.addEventListener('pointerdown', (e) => { e.stopPropagation(); panel.hidden = true; });
        document.body.appendChild(panel);
      }
      if (!panel.hidden && panel.dataset.lv === L.id) { panel.hidden = true; return; }
      panel.dataset.lv = L.id;
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
      let html = `<div style="font-weight:800;font-size:20px;color:#ffd23f;margin-bottom:8px">\u{1F3C6} ${esc(L.meta.name)} records</div>`;
      for (const d of L.recDefs) {
        const list = listOf(L, d.k);
        html += `<div style="color:#8be0ff;font-weight:700;margin-top:10px">${esc(d.label)}</div>`;
        html += list.length ? list.map((e, r) => `<div style="display:flex;justify-content:space-between;gap:18px"><span>${r + 1}. ${esc(e[1])}</span><span style="font-weight:700">${esc(fmtOf(d)(e[0]))}</span></div>`).join('') : '<div style="color:#9a8aba">No record yet: be the first!</div>';
      }
      html += `<div style="color:#9a8aba;font-size:12px;margin-top:12px">${SHARED.mode === 'off' ? 'Records on this device (and friends you play with)' : 'Shared board: everyone\u2019s records'} \u00B7 Tap to close</div>`;
      panel.innerHTML = html; panel.hidden = false;
    }
    function hidePanel() { if (panel) panel.hidden = true; }
    // ---------------------------------------------------------------- the shared board
    // Everyone's bests in one place, for every device: on the Claude page through its database (one document per
    // person, which only they can write), or on your own website through records.php sitting next to the page (one
    // entry per device). Each player's document holds their best for every record: { n: name, b: { "game.key": value } }.
    // Without either, the boards are just this device's (plus friends met in the room).
    const SHARED = (() => {
      const S = { mode: 'off', db: null, uid: '', dev: '', pushT: 0, timer: 0, lastPush: '', note: '' };
      const byId = () => { const m = {}; for (const L of LEVELS) if (L && L.recDefs) m[L.id] = L; return m; };
      // all my bests, as one map
      function myBests() {
        const me = state.name || 'You', b = {};
        for (const L of LEVELS) {
          if (!L || !L.recDefs) continue;
          for (const d of L.recDefs) { const e = listOf(L, d.k).find((x) => x[1] === me); if (e) b[`${L.id}.${d.k}`] = e[0]; }
        }
        return b;
      }
      // put everyone's bests onto the boards
      function absorb(players) {
        const levels = byId();
        for (const p of players) {
          if (!p || typeof p.n !== 'string' || !p.n || !p.b || typeof p.b !== 'object') continue;
          const name = p.n.slice(0, 24);
          for (const [key, v] of Object.entries(p.b).slice(0, 400)) {
            const dot = key.indexOf('.'); if (dot < 0 || !Number.isFinite(v)) continue;
            const L = levels[key.slice(0, dot)]; if (!L) continue;
            merge(L, name, [[key.slice(dot + 1), v]]);
          }
        }
      }
      async function push() {
        S.timer = 0;
        const b = myBests(), body = { n: (state.name || 'Player').slice(0, 24), b };
        const key = JSON.stringify(body);
        if (key === S.lastPush || !Object.keys(b).length) return;
        try {
          if (S.mode === 'db') await S.db.doc(`records/${S.uid}`).set(Object.assign({ t: Date.now() }, body));
          else if (S.mode === 'php') { const r = await fetch('records.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ id: S.dev }, body)) }); if (!r.ok) throw new Error(String(r.status)); }
          else return;
          S.lastPush = key;
        } catch (e) { S.note = 'couldn\u2019t save to the shared board just now'; }
      }
      // a moment after a new result (several in a row go up together)
      function soon() { if (S.mode === 'off' || S.timer) return; S.timer = setTimeout(push, 2500); }
      async function pull() {
        if (S.mode !== 'php') return;
        try { const r = await fetch(`records.php?t=${Date.now()}`, { cache: 'no-store' }); const j = await r.json(); if (j && j.ok && j.players && typeof j.players === 'object') absorb(Object.values(j.players)); } catch (e) { /* offline for now */ }
      }
      async function start() {
        // the Claude page: its database, one document per signed-in person
        try {
          if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
            const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
            const uid = user ? await user.id() : null;
            if (db && uid) {
              Object.assign(S, { mode: 'db', db, uid });
              db.collection('records').onSnapshot((snap) => absorb(snap.docs.map((d) => d.data())), () => { /* falls back on its own */ });
              setTimeout(push, 4000);
              return;
            }
          }
        } catch (e) { /* not on the Claude page */ }
        // your own website: records.php next to the page
        if (location.protocol === 'http:' || location.protocol === 'https:') {
          try {
            const r = await fetch(`records.php?t=${Date.now()}`, { cache: 'no-store' });
            const j = r.ok ? await r.json() : null;
            if (j && j.ok) {
              prefs.deviceId = typeof prefs.deviceId === 'string' && /^[a-z0-9]{12,32}$/.test(prefs.deviceId) ? prefs.deviceId : Array.from({ length: 20 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
              savePrefs();
              Object.assign(S, { mode: 'php', dev: prefs.deviceId });
              if (j.players) absorb(Object.values(j.players));
              setInterval(pull, 60000);
              setTimeout(push, 4000);
            }
          } catch (e) { /* no records.php here */ }
        }
      }
      return { start, soon, pull, push, absorb, myBests, get mode() { return S.mode; }, S };
    })();
    return { def, add, mine, merge, build, draw, hidePanel, list: listOf, fmtTime, shared: SHARED };
  })();
