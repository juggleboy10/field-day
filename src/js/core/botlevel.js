  // ================================================================ BOTLV: how good the bots are, game by game
  // A game with bots calls BOTLV.on(L) and reads its bots' skill with BOTLV.pick(L, [easy, normal, hard]) (or
  // BOTLV.get(L): 0 easy, 1 normal, 2 hard). Normal is how the bots always played. Each game remembers its own level
  // (prefs.botLv[game id] = { v, t }), changed with the "Bots:" button (in a browser) or on the watch (VR). Friends in
  // the same game share it: whoever changed it last wins, so everyone's bots (and whoever runs them) agree.
  const BOTLV = (() => {
    const NAMES = ['Easy', 'Normal', 'Hard'];
    const store = () => (prefs.botLv && typeof prefs.botLv === 'object' ? prefs.botLv : (prefs.botLv = {}));
    const ok = (v) => Number.isInteger(v) && v >= 0 && v <= 2;
    function on(L, opts) {
      const o = opts || {};
      L.botLv = { def: ok(o.def) ? o.def : 1, onChange: o.onChange || null, note: o.note || '' };
      L.botHud = { label: () => `Bots: ${NAMES[get(L)]} ▸`, run: () => cycle(L) };
    }
    function get(L) {
      if (!L || !L.botLv) return 1;
      const e = store()[L.id];
      return e && ok(e.v) ? e.v : L.botLv.def;
    }
    const pick = (L, arr) => arr[get(L)];
    // a number between the three: easy at 0, normal at 1, hard at 2 (for blending)
    const name = (L) => NAMES[get(L)];
    function set(L, v, t, who) {
      if (!L.botLv || !ok(v)) return;
      const before = get(L);
      store()[L.id] = { v, t: t || Date.now() };
      savePrefs();
      if (L.botLv.onChange && before !== v) L.botLv.onChange(v);
      state.hudDirty = true; forcePresence();
      if (state.level === L.idx) showToast(`Bots: ${NAMES[v]}${who ? ` (${who} changed it)` : ''}${!who && L.botLv.note ? `. ${L.botLv.note}` : ''}`);
    }
    function cycle(L) { set(L, (get(L) + 1) % 3); sfx('click', 0.6); }
    // what I tell friends here: my level for this game, and when I set it
    function mine(L) { const e = store()[L.id]; return L.botLv ? [get(L), e && Number.isFinite(e.t) ? e.t : 0] : null; }
    // a friend's: theirs wins if they set it more recently than I did
    function read(rec, a) {
      const L = curLevel();
      if (!L.botLv || rec.lv !== state.level || !Array.isArray(a) || a.length !== 2 || !ok(a[0]) || !Number.isFinite(a[1]) || a[1] <= 0) return;
      const e = store()[L.id], t = e && Number.isFinite(e.t) ? e.t : 0;
      if (a[1] > t && a[0] !== get(L)) set(L, a[0], a[1], rec.name);
      else if (a[1] > t) store()[L.id] = { v: a[0], t: a[1] };
    }
    return { NAMES, on, get, pick, name, set, cycle, mine, read };
  })();
