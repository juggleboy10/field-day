  // ================================================================ LOADER: each place is built the first time you go there
  // The page carries every place's code, but only the clubhouse runs at startup. The rest sit in the page as text
  // (<script type="text/plain" data-fd="js/games/hoops.js">) and the list of which files each place needs is in
  // #fd-manifest (written by tools/manifest.py). Going to a place runs its files, once, as ordinary scripts: they see
  // everything the core defines, just as if they had been there from the start.
  // A page built with --single has no such list: everything is already there, and all of this does nothing.
  //   ?eager in the address builds every place at startup, the old way. The tests (?test) do too, unless ?lazy is there.
  const LOADER = (() => {
    let places = null;
    try { const el = document.getElementById('fd-manifest'); if (el) places = JSON.parse(el.textContent).places; } catch (e) { places = null; }
    const q = new URLSearchParams(location.search);
    const S = { want: -1, ran: new Set(), eager: !places || q.has('eager') || (q.has('test') && !q.has('lazy')), failed: new Set() };
    const filesFor = (i) => (places && LEVEL_META[i] && places[LEVEL_META[i].id]) || [];
    function run(file) {
      if (S.ran.has(file)) return;
      S.ran.add(file);
      const src = document.querySelector(`script[data-fd="${file}"]`);
      if (!src) throw new Error(`missing ${file}`);
      const s = document.createElement('script');
      s.textContent = `${src.textContent}\n//# sourceURL=${file}`;
      document.head.appendChild(s);     // (runs right here)
      s.remove(); src.remove();
    }
    // things the core told every place while this one wasn't there yet
    function settle(L) {
      if (L.setColor) L.setColor(PLAYER_COLORS[state.colorIdx].hex);
      CAMERA.levelLoaded(L);
    }
    // Build place i now, if it isn't. True if it's there afterwards.
    function sync(i) {
      if (LEVELS[i]) return true;
      if (!LEVEL_META[i] || S.failed.has(i)) return false;
      window.__fdLazy = !S.eager;  // (an error in here is this place's problem, not a reason to stop the whole game)
      try { for (const f of filesFor(i)) run(f); } catch (e) { console.error(e); }
      window.__fdLazy = false;
      if (!LEVELS[i]) { S.failed.add(i); return false; }
      try { settle(LEVELS[i]); } catch (e) { console.error(e); }
      return true;
    }
    function all() { for (let i = 0; i < LEVEL_META.length; i++) sync(i); }
    // Go to a place that isn't built: say so, give the screen a moment to show it, build, then go.
    function go(i) {
      if (S.want === i) return;
      S.want = i;
      const name = LEVEL_META[i].name;
      showToast(`Loading ${name}…`);
      setTimeout(() => {
        if (S.want !== i) return;
        S.want = -1;
        if (sync(i)) switchLevel(i);
        else { showToast(`${name} couldn’t load. Try reloading the page.`); syncLevelPicker(); }
      }, 40);
    }
    // at startup: everything (eager), or just the place you were last in
    function boot() {
      if (S.eager) { all(); return; }
      if (!sync(state.level)) state.level = HUB_IDX;
    }
    return { S, sync, all, go, boot, filesFor, get want() { return S.want; }, set want(v) { S.want = v; }, get eager() { return S.eager; } };
  })();
