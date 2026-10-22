  // ================================================================ LEVEL: COMMAND LINE DOJO (study hall)
  // The terminal on the wall gives you a task ("show this PC's IP settings"); three command blocks fly at you and you
  // strike the one that does it. The command types itself into the terminal with its output. Three strikes (a wrong
  // block or a missed one) and the round is over; your score earns a belt, white to black.
  // Windows, Linux or both: the commands from the A+ Core 2 objectives.
  // VR: slice or punch the block (or point and pull the trigger). Browser: aim and click, or press 1-3.
  const cmddojo = (() => {
    const L = newLevel(52);
    const G = L.group;
    const rand = mulberry32(5252);
    L.grabless = true;
    L.bounds = { minX: -5.6, maxX: 5.6, minZ: -3.5, maxZ: 3.6 };
    L.env = STUDY.env();
    const hall = STUDY.room(G, rand, { w: 12, d: 10, z: -1, h: 4.8 });
    const SPOT_Z = 2.0, LANES = [-0.58, 0, 0.58], BY = 1.3, Z0 = -5.2;
    // [os, the task, the command, a line of what it prints, group (commands in one group are never offered together)]
    const CMDS = [
      ['win', 'Show this PC\u2019s IP address, subnet mask and gateway', 'ipconfig', 'IPv4 Address. . . . : 192.168.1.20'],
      ['win', 'Check whether you can reach another computer', 'ping', 'Reply from 8.8.8.8: bytes=32 time=12ms TTL=117', 'reach'],
      ['win', 'Show every router hop on the way to a website', 'tracert', '  1    <1 ms    192.168.1.1', 'reach'],
      ['win', 'Ask DNS which IP address a name belongs to', 'nslookup', 'Address:  93.184.216.34'],
      ['win', 'List this PC\u2019s network connections and listening ports', 'netstat', '  TCP    0.0.0.0:3389    LISTENING'],
      ['win', 'Check a disk for file system errors', 'chkdsk', 'Windows has scanned the file system and found no problems.'],
      ['win', 'Scan and repair protected Windows system files', 'sfc /scannow', 'Windows Resource Protection did not find any integrity violations.'],
      ['win', 'Manage disks and partitions from the command line', 'diskpart', 'DISKPART>'],
      ['win', 'Put a new file system on a drive (it wipes it)', 'format', 'Format complete.'],
      ['win', 'Apply new Group Policy settings right now', 'gpupdate /force', 'Computer Policy update has completed successfully.'],
      ['win', 'Show which Group Policy settings were applied', 'gpresult /r', 'Applied Group Policy Objects'],
      ['win', 'Copy whole folders reliably, with retries', 'robocopy', 'Files :  120   Copied :  120', 'copy'],
      ['win', 'Restart this PC from the command line', 'shutdown /r', 'You are about to be signed out.'],
      ['win', 'List the programs and processes running', 'tasklist', 'chrome.exe     4120 Console   1   212,844 K'],
      ['win', 'End a process that\u2019s stuck', 'taskkill', 'SUCCESS: The process "app.exe" with PID 4120 has been terminated.'],
      ['win', 'Map a shared folder to a drive letter', 'net use', 'The command completed successfully.'],
      ['win', 'Create or change user accounts', 'net user', 'The command completed successfully.'],
      ['win', 'Show this computer\u2019s name', 'hostname', 'WS-ACCT-07'],
      ['win', 'Show which version and build of Windows this is', 'winver', '(About Windows: Version 24H2)'],
      ['win', 'Show which user you\u2019re signed in as', 'whoami', 'corp\\jsmith'],
      ['win', 'List the files in this folder', 'dir', '03/14  09:12   <DIR>   Documents'],
      ['win', 'Make a new folder', 'md', '(a new folder appears)'],
      ['win', 'Delete an empty folder', 'rmdir', '(the folder is gone)'],
      ['lin', 'List the files in this directory', 'ls', 'Desktop  Documents  notes.txt'],
      ['lin', 'Show which directory you\u2019re in', 'pwd', '/home/sam'],
      ['lin', 'Copy a file', 'cp', '(notes.txt copied)'],
      ['lin', 'Move or rename a file', 'mv', '(notes.txt is now todo.txt)'],
      ['lin', 'Delete a file', 'rm', '(notes.txt is gone)'],
      ['lin', 'Change a file\u2019s permissions', 'chmod', '-rwxr-xr-x  1 sam sam  220 backup.sh'],
      ['lin', 'Change who owns a file', 'chown', '-rw-r--r--  1 alex staff 220 report.txt'],
      ['lin', 'Run one command as the superuser (root)', 'sudo', '[sudo] password for sam:'],
      ['lin', 'Switch to another user account', 'su', 'Password:'],
      ['lin', 'Install software on Ubuntu or Debian', 'apt', 'Setting up htop (3.3.0) ...'],
      ['lin', 'Install software on Fedora or Red Hat', 'dnf', 'Installed: htop-3.3.0  Complete!'],
      ['lin', 'List the running processes (a snapshot)', 'ps', '  PID TTY    TIME CMD\n 4120 pts/0  0:00 bash', 'proc'],
      ['lin', 'Watch processes and CPU use, live', 'top', 'Tasks: 182 total,  1 running', 'proc'],
      ['lin', 'Search inside files for some text', 'grep', 'notes.txt: call the printer guy'],
      ['lin', 'Search for files by name', 'find', './Documents/report.txt'],
      ['lin', 'Look up the DNS records for a name', 'dig', ';; ANSWER SECTION: example.com. 300 IN A 93.184.216.34'],
      ['lin', 'Show network interfaces and their addresses', 'ip addr', 'inet 192.168.1.30/24 brd 192.168.1.255'],
      ['lin', 'Show how much space is free on each drive', 'df -h', '/dev/sda1   98G   41G   52G  45% /'],
      ['lin', 'Show how much space a folder takes up', 'du', '1.2G    ./Videos'],
      ['lin', 'Print a file\u2019s contents to the screen', 'cat', 'Remember: back up on Fridays'],
      ['lin', 'Edit a text file in the terminal', 'nano', '  GNU nano 7.2     notes.txt'],
      ['lin', 'Read the manual page for a command', 'man', 'LS(1)          User Commands          LS(1)'],
      ['lin', 'Change your password', 'passwd', 'passwd: password updated successfully'],
    ];
    const MODES = [{ id: 'win', name: 'Windows', sub: 'ipconfig, chkdsk, gpupdate\u2026' }, { id: 'lin', name: 'Linux', sub: 'ls, chmod, sudo, grep\u2026' }, { id: 'mix', name: 'Both', sub: 'Mixed, and you say which' }];
    const BELTS = [[0, 'White', '#f4f2ec'], [5, 'Yellow', '#ffd23f'], [10, 'Orange', '#ff9a3a'], [15, 'Green', '#3aa86a'], [20, 'Blue', '#3a6ad8'], [25, 'Brown', '#8a5a2a'], [30, 'Black', '#1a1a1a']];
    const gong = () => { tone(110, 104, 1.6, 'sine', 0.3); tone(220, 214, 1.1, 'triangle', 0.08); tone(331, 325, 0.8, 'sine', 0.06); };
    const beltOf = (n) => BELTS.filter((b) => n >= b[0]).pop();

    // ---------------------------------------------------------------- the dojo: mats, a banner, the terminal
    for (let i = 0; i < 6; i++) addBox(G, 2.6, 0.02, 1.3, lam(i % 2 ? 0xb8c88a : 0xc8d89a), 0, 0.01, 2.6 - i * 1.32);
    for (let i = 0; i <= 6; i++) addBox(G, 2.62, 0.022, 0.04, lam(0x2a3a1a), 0, 0.012, 3.25 - i * 1.32);
    makePlate(G, '\u{1F94B}  COMMAND LINE DOJO', 3.4, 0.42, new V3(0, 3.82, -5.86), 0, { bg: '#b02a2a', fg: '#ffffff', size: 0.6 });
    const term = STUDY.screen(G, 1024, 560, 4.0, 2.19, 0, 2.42, -5.85, 0, 0x2a2a2a);
    // the blocks
    const deck = STUDY.cards(G, { n: 3, w: 0.5, h: 0.3, numbered: true });
    const blk = [0, 1, 2].map(() => ({ z: Z0, vx: 0, vy: 0, spin: 0, st: 'off', t: 0, y: BY, x: 0 }));

    // ---------------------------------------------------------------- the round
    const S = { ph: 'menu', mode: 'win', score: 0, strikes: 0, task: null, c: -1, waveT: 0, speed: 1.0, lines: [], best: {}, hover: 0, gap: 0 };
    try { if (prefs.dojoBest && typeof prefs.dojoBest === 'object') S.best = Object.assign({}, prefs.dojoBest); } catch (e) { /* none */ }
    L.dojo = S;
    const promptOf = (os) => (os === 'lin' ? 'sam@dojo:~$ ' : 'C:\\Users\\sam> ');
    function showMenu() {
      S.ph = 'menu';
      MODES.forEach((m, i) => { deck.set(i, m.name, 'mode', { sub: m.sub, big: 56 }); deck.show(i, true); blk[i].st = 'menu'; blk[i].x = LANES[i]; blk[i].y = BY; blk[i].z = SPOT_Z - 1.6; });
    }
    function startRound(mode) {
      Object.assign(S, { ph: 'play', mode, score: 0, strikes: 0, speed: 1.0, lines: [], recent: [] });
      gong();
      wave();
      forcePresence(); state.dirtyBoard = true;
    }
    L.startRound = startRound;
    function wave() {
      const pool = CMDS.filter((c) => S.mode === 'mix' || c[0] === S.mode);
      let task; let n = 0;
      do { task = pool[Math.floor(rand() * pool.length)]; } while (S.recent.includes(task[2]) && n++ < 30);
      S.recent.push(task[2]); if (S.recent.length > 12) S.recent.shift();
      // two wrong commands: never from the task's group; in "Both", one is from the other OS
      const others = pool.filter((c) => c !== task && !(task[4] && c[4] === task[4]) && c[2] !== task[2]).sort(() => rand() - 0.5);
      let wrong = others.slice(0, 2);
      if (S.mode === 'mix') { const a = others.find((c) => c[0] !== task[0]), b = others.find((c) => c[0] === task[0]); wrong = [a, b].filter(Boolean); }
      const opts = [task].concat(wrong).sort(() => rand() - 0.5);
      S.task = task; S.c = opts.indexOf(task); S.opts = opts;
      opts.forEach((o, i) => {
        deck.set(i, S.mode === 'mix' ? `${o[2]}` : o[2], 'idle', { mono: true, big: 60, sub: S.mode === 'mix' ? (o[0] === 'win' ? 'Windows' : 'Linux') : undefined });
        deck.show(i, false);
        Object.assign(blk[i], { st: 'wait', z: Z0 - i * 0.25, x: LANES[i], y: BY + (i === 1 ? 0.06 : 0), t: 0, vx: 0, vy: 0, spin: 0 });
      });
      // a moment to read the task before the blocks come
      S.ph = 'play'; S.hover = 0; S.readT = Math.max(1.3, 2.2 - S.score * 0.04);
      termKey = '';
    }
    function typeLine(text) { for (const l of String(text).split('\n')) S.lines.push(l); while (S.lines.length > 7) S.lines.shift(); termKey = ''; }
    function strike(i, how) {
      if (S.ph === 'menu') { startRound(MODES[i].id); return; }
      if (S.ph !== 'play' || blk[i].st !== 'in') return;
      const ok = i === S.c;
      // the struck block flies off; the others drop
      blk.forEach((b, k) => { if (b.st !== 'in') return; if (k === i) Object.assign(b, { st: 'fly', vx: (rand() - 0.5) * 3, vy: 2.5, spin: 12, t: 0 }); else Object.assign(b, { st: 'drop', vx: 0, vy: 0, spin: 2, t: 0 }); });
      if (ok) {
        S.score += 1; S.speed = Math.min(2.2, 1 + S.score * 0.05);
        STUDY.right(); if (how === 'touch') sfx('swish', 0.5);
        typeLine(`${promptOf(S.task[0])}${S.task[2]}`); typeLine(S.task[3]);
        deck.look(i, 'right');
        const nb = beltOf(S.score);
        if (nb[0] === S.score && S.score > 0) { showToast(`${nb[1]} belt!`); gong(); }
      } else {
        S.strikes += 1; STUDY.wrong();
        typeLine(`${promptOf(S.opts[i][0])}${S.opts[i][2]}`); typeLine(`  \u2717 Not that one: ${S.task[2]} does it.`);
        deck.look(i, 'wrong'); deck.look(S.c, 'right');
      }
      S.last = { ok }; S.ph = 'gap'; S.gap = ok ? 0.7 : 1.6;
      forcePresence(); state.dirtyBoard = true;
    }
    L.strike = strike;
    function missed() {
      S.strikes += 1; STUDY.wrong();
      typeLine(`${promptOf(S.task[0])}\u2026`); typeLine(`  \u2717 Too slow: it was ${S.task[2]}.`);
      blk.forEach((b) => { if (b.st === 'in') Object.assign(b, { st: 'drop', vy: 0, spin: 2, t: 0 }); });
      deck.look(S.c, 'right');
      S.last = { ok: false }; S.ph = 'gap'; S.gap = 1.6;
      forcePresence();
    }
    function endRound() {
      const prev = S.best[S.mode] || 0, isBest = S.score > prev;
      if (isBest) { S.best[S.mode] = S.score; prefs.dojoBest = Object.assign({}, S.best); savePrefs(); }
      RECORDS.add(L, S.mode, S.score);
      const b = beltOf(S.score);
      showToast(`Three strikes! ${S.score} commands: ${b[1]} belt${isBest ? ' (your best!)' : ''}`);
      sfx(S.score >= 15 ? 'fanfare' : 'chime', 0.8);
      S.summary = { score: S.score, belt: b, mode: S.mode, best: isBest };
      showMenu();
      forcePresence(); state.dirtyBoard = true;
    }
    L.endRound = endRound;
    const input = STUDY.input(L, deck, { onPick: (i, how) => strike(i, how), minSpeed: 1.0, enabled: () => state.level === L.idx && (S.ph === 'play' || S.ph === 'menu') });
    L.throwLabel = () => 'Strike';

    // ---------------------------------------------------------------- the terminal
    let termKey = '';
    function drawTerm() {
      const key = `${S.ph}|${S.score}|${S.strikes}|${S.task ? S.task[1] : ''}|${S.lines.length}|${S.lines[S.lines.length - 1] || ''}|${S.summary ? S.summary.score : ''}`;
      if (key === termKey) return; termKey = key;
      const g = term.g, W = 1024, H = 560, mono = 'ui-monospace, Menlo, Consolas, "Courier New", monospace';
      g.fillStyle = '#0a0f0a'; g.fillRect(0, 0, W, H);
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      if (S.ph === 'menu') {
        g.fillStyle = '#8bff6a'; g.font = `700 40px ${mono}`;
        g.fillText('> COMMAND LINE DOJO', 40, 80);
        g.fillStyle = '#c8f0c0'; g.font = `400 30px ${mono}`;
        STUDY.wrap(g, 'Read the task. Strike the command that does it. Three strikes and you\u2019re out.', 40, 150, W - 80, 40);
        if (S.summary) {
          const s = S.summary;
          g.fillStyle = s.belt[2] === '#1a1a1a' ? '#ffffff' : s.belt[2]; g.font = `700 48px ${mono}`; g.fillText(`${s.score} commands: ${s.belt[1]} belt`, 40, 330);
          g.fillStyle = '#c8f0c0'; g.font = `400 28px ${mono}`; g.fillText(s.best ? 'Your best yet!' : `Best (${MODES.find((m) => m.id === s.mode).name}): ${S.best[s.mode] || 0}`, 40, 380);
        }
        g.fillStyle = '#ffd23f'; g.font = `700 30px ${mono}`; g.fillText('Strike a block to pick: Windows, Linux or Both', 40, 500, W - 80);
        term.tex.needsUpdate = true; return;
      }
      // the task, the belt, the strikes
      g.fillStyle = '#16301a'; g.fillRect(0, 0, W, 136);
      g.fillStyle = '#ffd23f'; g.font = `700 28px ${mono}`; g.fillText(`# Task (${S.task && S.task[0] === 'lin' ? 'Linux' : 'Windows'}):`, 30, 38);
      g.fillStyle = '#ffffff'; g.font = `700 50px ${BODY}`; g.fillText(S.task ? S.task[1] : '', 30, 106, W - 60);
      const b = beltOf(S.score);
      g.textAlign = 'right'; g.fillStyle = b[2] === '#1a1a1a' ? '#ffffff' : b[2]; g.font = `700 28px ${mono}`; g.fillText(`${b[1]} belt \u00B7 ${S.score}  ` + '\u2716'.repeat(S.strikes) + '\u25CB'.repeat(Math.max(0, 3 - S.strikes)), W - 30, 38);
      g.textAlign = 'left'; g.font = `400 38px ${mono}`;
      const shown = S.lines.slice(-6);
      shown.forEach((l, i) => { g.fillStyle = /^\s*\u2717/.test(l) ? '#ff8a7a' : /[$>] /.test(l) ? '#8bff6a' : '#c8d8c8'; g.fillText(l, 30, 190 + i * 56, W - 60); });
      if (S.ph === 'play' && shown.length < 7) { g.fillStyle = '#8bff6a'; g.fillText(`${promptOf(S.task[0])}_`, 30, 190 + shown.length * 56); }
      term.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    function stand() { S.slot = STUDY.slotOf(L); STUDY.standAt(STUDY.SLOT_X[S.slot] * 0.6, state.mode === 'vr' ? SPOT_Z : SPOT_Z + 0.5, 0, -0.04); }
    const STOP_Z = () => SPOT_Z - 0.55;
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      hall.tick();
      if (!here) { input.hide(); return; }
      if (STUDY.slotOf(L) !== S.slot) stand();
      const ox = STUDY.SLOT_X[S.slot || 0] * 0.6;
      // blocks fly in and wait at arm's length; strike before the timer runs out
      let waiting = false;
      blk.forEach((b, i) => {
        if (b.st === 'in') {
          const v = 1.6 * S.speed;
          b.z = Math.min(STOP_Z(), b.z + v * dt);
          if (b.z >= STOP_Z() - 1e-3) waiting = true;
        } else if (b.st === 'fly' || b.st === 'drop') {
          b.t += dt; b.vy -= 9.8 * dt * (b.st === 'drop' ? 0.6 : 1); b.y += b.vy * dt; b.x += b.vx * dt;
          if (b.t > 0.9) { b.st = 'off'; deck.show(i, false); }
        }
        if (b.st !== 'off') {
          deck.place(i, ox + b.x, b.y, b.z, 0, 0);
          deck.cards[i].grp.rotation.z = b.st === 'fly' || b.st === 'drop' ? b.t * b.spin : 0;
          deck.cards[i].grp.rotation.x = b.st === 'menu' || b.st === 'in' ? Math.sin(now / 300 + i) * 0.05 : b.t * b.spin * 0.3;
        }
      });
      if (S.ph === 'play' && S.readT > 0) {
        S.readT -= dt;
        if (S.readT <= 0) blk.forEach((b, i) => { if (b.st === 'wait') { b.st = 'in'; deck.show(i, true); } });
      } else if (S.ph === 'play') {
        if (waiting) { S.hover += dt; if (S.hover > Math.max(2.2, 5 - S.score * 0.12)) missed(); }
      } else if (S.ph === 'gap') {
        S.gap -= dt;
        if (S.gap <= 0) { if (S.strikes >= 3) endRound(); else wave(); }
      }
      input.tick(dt);
      drawTerm();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'menu' ? 'Command Line Dojo  \u00B7  aim at a block and click (or press 1-3)' : `${S.score} commands  \u00B7  ${3 - S.strikes} strikes left  \u00B7  click the right command (or 1-3)`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ cd: [S.score, Math.max(0, ...Object.values(S.best).map(Number).filter(Number.isFinite)), S.ph === 'menu' ? 0 : 1] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.cd;
      if (!Array.isArray(a) || a.length !== 3 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e5)) { st.cd = null; return; }
      if (!st.cd || st.cd[0] !== a[0] || st.cd[1] !== a[1]) state.dirtyBoard = true;
      st.cd = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? L.presence().cd : st.cd;
      if (!a) return { best: 0, text: '' };
      return { best: a[1], text: `${a[2] ? `${a[0]} now \u00B7 ` : ''}${beltOf(a[1])[1]} belt (${a[1]})` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.85, 2.0, -0.8, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#0a0f0a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#b02a2a'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#8bff6a'; g.font = `800 56px ${DISPLAY}`; g.fillText('Senseis', 36, 80);
      g.fillStyle = '#c8f0c0'; g.font = `400 24px ${BODY}`; g.fillText('Most commands before three strikes', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 3.6, 3.0, -Math.PI * 0.75);
    RECORDS.def(L, MODES.map((m) => ({ k: m.id, label: `${m.name}: most commands` })), { x: 5.75, z: 0.2, yaw: -Math.PI / 2 });
    L.hudActions = [{ label: () => (S.ph === 'menu' ? 'Start: Windows' : 'End round'), run: () => { if (S.ph === 'menu') startRound('win'); else { S.strikes = 3; endRound(); } } }];
    L.hints = [['Slice or punch', 'the block with the right command'], ['Point + trigger', 'works too']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Aim + click', 'strike a block'], ['1-3', 'strike by number']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { S.summary = null; S.lines = []; showMenu(); termKey = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; showMenu(); input.hide(); };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 1.7, 3.0); camera.lookAt(0, 1.8, -3); };
    showMenu();
    L.dojoInternals = { S, CMDS, blk, deck, strike, missed, wave, startRound, endRound, beltOf, MODES };
    MUSIC_THEMES.cmddojo = { gain: 0.6, bpm: 100, swing: 0.05, chords: ['Am', 'Em', 'F', 'G'], arp: { inst: 'pluck', every: 2, order: [1, 3, 2, 4, 1, 3, 2, 4] }, bass: { at: [0, 6, 10] }, drums: { k: 'x.....x...x.....', s: '....x.......x...', h: '-o-o-o-o-o-o-o-o' }, cut: 3400 };
    return L;
  })();
