  // ================================================================ EVERYONE'S PHOTOS: the shared photo wall, and its hearts
  // A photo you take goes up on everyone's wall in the clubhouse (unless you switch that off in Photos). Anyone can give a
  // photo a heart; the ones with the most hearts make the "Best of all time" wall. Where the photos are kept:
  //  - on the Claude page: its database. Each person writes only their own photos (photos/<them>, with each picture
  //    under photos/<them>/pics) and their own hearts (likes/<them>); everyone reads all of it.
  //  - on your own website: photos.php next to the page (the pictures sit in a folder beside it).
  //  - with neither (your website without photos.php): passed straight to whoever is playing with you right now, and
  //    gone when you leave. Hearts then only last the visit, too.
  // The shared copy is a little smaller than the one on your own device (480x360), so the wall loads quickly.
  const PHOTOS = (() => {
    const PER = 24, SW = 480, SH = 360;
    const S = { mode: 'off', db: null, me: '', dev: '', ver: 0, note: '', mine: null, pollT: 0, p2p: null, ready: false };
    const all = new Map();       // id -> { id, by, n, t, pid, src? }
    const hearts = new Map();    // id -> count (php) or Set of who (db, p2p)
    const myHearts = new Set();
    const bump = () => { S.ver += 1; state.hudDirty = true; };
    const cleanN = (n) => (typeof n === 'string' ? n.replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, 24) : '') || 'Player';
    const newPid = () => Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36).padStart(3, '0');
    const okPid = (s) => typeof s === 'string' && /^[a-z0-9]{6,20}$/.test(s);
    const okImg = (s) => typeof s === 'string' && s.startsWith('data:image/jpeg;base64,') && s.length < 240000;
    const count = (id) => { const h = hearts.get(id); return h instanceof Set ? h.size : (h || 0); };
    // one write at a time (the database wants one at a time per document; this keeps them all in order)
    let chain = Promise.resolve();
    const queue = (fn) => (chain = chain.then(fn).catch((e) => { S.note = 'couldn’t reach the shared wall just now'; console.warn('photos', e); }));

    // the shared copy: smaller, a touch more squeezed
    function shrink(src) {
      return new Promise((res) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas'); c.width = SW; c.height = SH;
          c.getContext('2d').drawImage(im, 0, 0, SW, SH);
          res(c.toDataURL('image/jpeg', 0.78));
        };
        im.onerror = () => res('');
        im.src = src;
      });
    }

    // ---------------------------------------------------------------- what the walls and the album read
    function decorate(p) { return { id: p.id, by: p.by, n: p.n, t: p.t, hearts: count(p.id), hearted: myHearts.has(p.id), mine: p.by === S.me }; }
    function list() { return Array.from(all.values()).sort((a, b) => b.t - a.t).map(decorate); }
    function best(n) { return list().filter((p) => p.hearts > 0).sort((a, b) => b.hearts - a.hearts || b.t - a.t).slice(0, n || 6); }
    // the picture itself (a promise of something an <img> can show)
    function img(id) {
      const p = all.get(id); if (!p) return Promise.resolve('');
      if (p.src) return Promise.resolve(p.src);
      if (p.loading) return p.loading;
      if (S.mode === 'php') { p.src = `photos.php?img=${encodeURIComponent(id)}`; return Promise.resolve(p.src); }
      if (S.mode === 'db') {
        p.loading = S.db.doc(`photos/${p.by}/pics/${p.pid}`).get().then((d) => { const x = d.exists ? d.data() : null; p.src = x && okImg(x.img) ? x.img : ''; p.loading = null; return p.src; }).catch(() => { p.loading = null; return ''; });
        return p.loading;
      }
      return Promise.resolve('');
    }
    const has = (id) => all.has(id);

    // ---------------------------------------------------------------- putting mine up, taking them down, hearts
    // returns the shared id (or '' when there's nowhere to share to)
    async function share(src) {
      if (S.mode === 'off' || !src) return '';
      const small = await shrink(src); if (!small) return '';
      const n = cleanN(state.name), t = Date.now();
      if (S.mode === 'db') {
        const pid = newPid(), id = `${S.me}~${pid}`;
        all.set(id, { id, by: S.me, n, t, pid, src: small }); bump();
        queue(async () => {
          await S.db.doc(`photos/${S.me}/pics/${pid}`).set({ img: small, t });
          S.mine.push({ id: pid, t });
          // past my 24: the oldest with the fewest hearts goes
          while (S.mine.length > PER) {
            const gone = S.mine.filter((e) => e.id !== pid).sort((a, b) => count(`${S.me}~${a.id}`) - count(`${S.me}~${b.id}`) || a.t - b.t)[0];
            S.mine = S.mine.filter((e) => e !== gone);
            all.delete(`${S.me}~${gone.id}`);
            await S.db.doc(`photos/${S.me}/pics/${gone.id}`).delete();
          }
          await S.db.doc(`photos/${S.me}`).set({ n, list: S.mine.slice() });
        });
        return id;
      }
      if (S.mode === 'php') {
        try {
          const r = await fetch('photos.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'add', dev: S.dev, n, img: small }) });
          const j = r.ok ? await r.json() : null;
          if (!j || !j.ok || typeof j.id !== 'string') throw new Error('no');
          all.set(j.id, { id: j.id, by: S.me, n, t, pid: j.id, src: small }); bump();
          setTimeout(pull, 400);
          return j.id;
        } catch (e) { S.note = 'couldn’t put it on the shared wall just now'; return ''; }
      }
      if (S.mode === 'p2p') {
        const pid = newPid(), id = `${S.me}~${pid}`;
        all.set(id, { id, by: S.me, n, t, pid, src: small }); bump();
        S.p2p.send({ k: 'add', pid, n, t, img: small });
        return id;
      }
      return '';
    }
    function unshare(id) {
      const p = all.get(id); if (!p || p.by !== S.me) return;
      all.delete(id); hearts.delete(id); bump();
      if (S.mode === 'db') queue(async () => { S.mine = S.mine.filter((e) => e.id !== p.pid); await S.db.doc(`photos/${S.me}/pics/${p.pid}`).delete(); await S.db.doc(`photos/${S.me}`).set({ n: cleanN(state.name), list: S.mine.slice() }); });
      else if (S.mode === 'php') fetch('photos.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'del', dev: S.dev, id }) }).catch(() => {});
      else if (S.mode === 'p2p') S.p2p.send({ k: 'del', pid: p.pid });
    }
    function heart(id, on) {
      if (!all.has(id)) return false;
      const want = on === undefined ? !myHearts.has(id) : !!on;
      if (want === myHearts.has(id)) return want;
      if (want) myHearts.add(id); else myHearts.delete(id);
      const h = hearts.get(id);
      if (S.mode === 'php') hearts.set(id, Math.max(0, (h || 0) + (want ? 1 : -1)));
      else { const set = h instanceof Set ? h : new Set(); if (want) set.add(S.me || 'me'); else set.delete(S.me || 'me'); hearts.set(id, set); }
      bump();
      if (S.mode === 'db') queue(() => S.db.doc(`likes/${S.me}`).set({ ids: Array.from(myHearts).slice(-400) }));
      else if (S.mode === 'php') fetch('photos.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'like', dev: S.dev, id, on: want }) }).catch(() => {});
      else if (S.mode === 'p2p') S.p2p.send({ k: 'hearts', ids: Array.from(myHearts).slice(-200) });
      return want;
    }

    // ---------------------------------------------------------------- the Claude page's database
    async function startDb(db, uid) {
      Object.assign(S, { mode: 'db', db, me: uid });
      try { const d = await db.doc(`photos/${uid}`).get(); const x = d.exists ? d.data() : null; S.mine = x && Array.isArray(x.list) ? x.list.filter((e) => e && okPid(e.id)).map((e) => ({ id: e.id, t: Number(e.t) || 0 })) : []; } catch (e) { S.mine = []; }
      db.collection('photos').onSnapshot((snap) => {
        const seen = new Set();
        for (const d of snap.docs) {
          const by = d.id, x = d.data();
          if (!x || !Array.isArray(x.list)) continue;
          const n = cleanN(x.n);
          for (const e of x.list.slice(0, 40)) {
            if (!e || !okPid(e.id)) continue;
            const id = `${by}~${e.id}`; seen.add(id);
            const p = all.get(id);
            if (p) p.n = n; else all.set(id, { id, by, n, t: Number(e.t) || 0, pid: e.id });
          }
        }
        // (mine that are still on their way up stay)
        for (const [id, p] of all) if (!seen.has(id) && !(p.by === S.me && Date.now() - p.t < 20000)) all.delete(id);
        bump();
      }, () => { /* recovers on its own */ });
      let first = true;
      db.collection('likes').onSnapshot((snap) => {
        hearts.clear();
        for (const d of snap.docs) {
          const x = d.data(); if (!x || !Array.isArray(x.ids)) continue;
          for (const id of x.ids.slice(0, 400)) if (typeof id === 'string') { let s = hearts.get(id); if (!s) hearts.set(id, (s = new Set())); s.add(d.id); }
          if (first && d.id === uid) for (const id of x.ids) if (typeof id === 'string') myHearts.add(id);
        }
        // (my own hearts as I have them, even before the database catches up)
        for (const id of myHearts) { let s = hearts.get(id); if (!s) hearts.set(id, (s = new Set())); s.add(uid); }
        first = false;
        bump();
      }, () => { /* recovers on its own */ });
      S.ready = true; bump();
    }

    // ---------------------------------------------------------------- your own website: photos.php
    async function pull() {
      if (S.mode !== 'php') return;
      S.pollT = performance.now();
      try {
        const r = await fetch(`photos.php?op=list&dev=${S.dev}&t=${Date.now()}`, { cache: 'no-store' });
        const j = r.ok ? await r.json() : null;
        if (!j || !j.ok || !Array.isArray(j.photos)) return;
        const seen = new Set();
        for (const e of j.photos.slice(0, 600)) {
          if (!e || typeof e.id !== 'string' || !/^[a-z0-9]{6,40}$/.test(e.id)) continue;
          seen.add(e.id);
          const p = all.get(e.id), by = e.m ? S.me : `x${e.id}`;
          if (p) { p.n = cleanN(e.n); p.by = by; } else all.set(e.id, { id: e.id, by, n: cleanN(e.n), t: (Number(e.t) || 0) * 1000, pid: e.id });
          hearts.set(e.id, Number.isInteger(e.h) ? e.h : 0);
        }
        for (const id of Array.from(all.keys())) if (!seen.has(id)) all.delete(id);
        myHearts.clear(); if (Array.isArray(j.mine)) for (const id of j.mine) if (typeof id === 'string') myHearts.add(id);
        bump();
      } catch (e) { /* offline for now */ }
    }
    async function startPhp() {
      try {
        if (location.protocol !== 'http:' && location.protocol !== 'https:') return false;
        if (typeof prefs.deviceId !== 'string' || !/^[a-z0-9]{12,32}$/.test(prefs.deviceId)) { prefs.deviceId = Array.from({ length: 20 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join(''); savePrefs(); }
        const r = await fetch(`photos.php?op=list&dev=${prefs.deviceId}&t=${Date.now()}`, { cache: 'no-store' });
        const j = r.ok ? await r.json() : null;
        if (!j || !j.ok) return false;
        Object.assign(S, { mode: 'php', dev: prefs.deviceId, me: 'me' });
        await pull();
        S.ready = true;
        return true;
      } catch (e) { return false; }
    }

    // ---------------------------------------------------------------- nothing kept anywhere: straight to the people here now
    function startP2P(room) {
      const pics = room.pics; if (!pics) return false;
      Object.assign(S, { mode: 'p2p', p2p: pics, me: pics.self || 'me' });
      pics.on((m, from) => {
        if (!m || typeof m !== 'object' || typeof from !== 'string') return;
        if (m.k === 'add' && okPid(m.pid) && okImg(m.img)) {
          const id = `${from}~${m.pid}`;
          if (!all.has(id)) { all.set(id, { id, by: from, n: cleanN(m.n), t: Math.min(Date.now(), Number(m.t) || Date.now()), pid: m.pid, src: m.img }); bump(); }
        } else if (m.k === 'del' && okPid(m.pid)) { if (all.delete(`${from}~${m.pid}`)) bump(); }
        else if (m.k === 'hearts' && Array.isArray(m.ids)) {
          for (const s of hearts.values()) if (s instanceof Set) s.delete(from);
          for (const id of m.ids.slice(0, 200)) if (typeof id === 'string') { let s = hearts.get(id); if (!(s instanceof Set)) hearts.set(id, (s = new Set())); s.add(from); }
          bump();
        }
      });
      // someone new: send them what I've put up (the last 8) and my hearts
      pics.onJoin((peer) => {
        const mine = Array.from(all.values()).filter((p) => p.by === S.me && p.src).sort((a, b) => b.t - a.t).slice(0, 8);
        for (const p of mine) pics.send({ k: 'add', pid: p.pid, n: p.n, t: p.t, img: p.src }, peer);
        if (myHearts.size) pics.send({ k: 'hearts', ids: Array.from(myHearts).slice(-200) }, peer);
      });
      S.ready = true; bump();
      return true;
    }

    async function start() {
      try {
        if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
          const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
          const uid = user ? await user.id() : null;
          if (db && uid) { await startDb(db, uid); return; }
          return;   // (the Claude page, signed out: just your own)
        }
      } catch (e) { return; }
      if (await startPhp()) return;
      // the peer-to-peer room may still be on its way
      const wait = () => { if (S.mode !== 'off') return; if (state.room && state.room.pics) startP2P(state.room); else if (state.transport === 'p2p' && state.net !== 'solo') setTimeout(wait, 1500); };
      wait();
    }
    // while you're in the clubhouse (or the album's open), photos.php is asked now and then for what's new
    function tick(now, looking) { if (S.mode === 'php' && looking && now - S.pollT > 20000) pull(); }
    return { S, start, startDb, startP2P, share, unshare, heart, list, best, img, has, tick, pull, count, get mode() { return S.mode; }, get ver() { return S.ver; }, _add: (p) => { all.set(p.id, Object.assign({ pid: p.id, by: 'x' }, p)); bump(); }, _hearts: hearts, _all: all };
  })();
