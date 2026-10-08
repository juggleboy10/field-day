  // ================================================================ team helpers (laser tag + soccer)
  function pickTeam(L) {
    // counts teams straight from everyone's latest presence, so it works the moment you arrive
    const n = [0, 0];
    for (const rec of remotes.values()) {
      if (rec.lv !== L.idx || !rec.inGame || !rec.pres) continue;
      const a = rec.pres[L.teamKey];
      const t = Array.isArray(a) ? a[0] : -1;
      if (t === 0 || t === 1) n[t]++;
    }
    return n[0] === n[1] ? Math.floor(Math.random() * 2) : n[0] < n[1] ? 0 : 1;
  }

  // Shortly after arriving, if one team has two more players than the other, the player on the
  // bigger team with the highest peer label moves over. Everyone runs the same rule, so only one moves.
  function autoBalance(L, me, now, switchTeam) {
    if (!L.enteredAt || now - L.enteredAt > 5000 || me.team < 0 || now < (L.balanceT || 0)) return;
    L.balanceT = now + 400;
    const members = [[], []];
    members[me.team].push(state.myPeer);
    for (const rec of remotes.values()) {
      if (rec.lv !== L.idx || !rec.inGame) continue;
      const st = rec.lvState[L.id];
      if (st && (st.team === 0 || st.team === 1)) members[st.team].push(rec.peer);
    }
    const big = members[me.team], small = members[1 - me.team];
    if (big.length - small.length < 2) return;
    big.sort();
    if (big[big.length - 1] === state.myPeer) switchTeam(true);
  }

