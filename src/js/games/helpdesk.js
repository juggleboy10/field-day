  // ================================================================ LEVEL: HELP DESK TICKETS (study hall)
  // You're on the help desk. Customers walk up with a problem; for each one, pick the most likely cause and then the
  // right fix, the way the A+ troubleshooting questions work. Six customers a shift. Quick right answers score more,
  // and the customer tells you how it went.
  // VR: touch an answer card on the counter (or point and pull the trigger). Browser: aim and click, or press 1-4.
  const helpdesk = (() => {
    const L = newLevel(51);
    const G = L.group;
    const rand = mulberry32(5151);
    L.grabless = true;
    L.bounds = { minX: -5.6, maxX: 5.6, minZ: 0.2, maxZ: 3.6 };
    L.env = STUDY.env();
    const hall = STUDY.room(G, rand, { w: 12, d: 10, z: -1, h: 4.4 });
    const SPOT_Z = 0.62, SHIFT = 6, STEPT = 30;
    // ---------------------------------------------------------------- the tickets
    // [domain, what the customer says, [cause step], [fix step], what to remember]; a step is [prompt or '', [answers], right]
    // (the right answer is listed first; they're shuffled when shown)
    const CAUSE = 'What’s the most likely cause?', FIX = 'What do you do?';
    const TICKETS = [
      ['c1t', 'My laptop says it’s charging, but the battery dies after about twenty minutes. It’s four years old.',
        ['', ['The battery has worn out', 'The screen resolution is too high', 'The Wi-Fi card is failing', 'It has too many browser tabs open']],
        ['', ['Replace the battery', 'Reinstall Windows', 'Replace the keyboard', 'Turn off Bluetooth']], 'Lithium-ion batteries lose capacity with age and charge cycles.'],
      ['c1n', 'I can’t get on the internet at all. Someone told me to run ipconfig: it says 169.254.10.4.',
        ['', ['The PC couldn’t reach a DHCP server', 'The DNS server is down', 'The browser is out of date', 'The monitor cable is loose']],
        ['', ['Check the network link, then ipconfig /release and /renew', 'Clear the browser cache', 'Replace the monitor', 'Uninstall the antivirus']], '169.254.x.x is APIPA: no DHCP answer. Check the connection first.'],
      ['c1t', 'Everything I print smears when I run my thumb over it.',
        ['', ['The fuser isn’t melting the toner on', 'The toner is low', 'The print driver is wrong', 'The paper tray is overfilled']],
        ['', ['Replace the fuser assembly', 'Shake the toner cartridge', 'Reinstall the driver', 'Print in draft mode']], 'Toner that rubs off = fuser. Faded prints = low toner.'],
      ['c1t', 'My PC turns itself off after twenty minutes of gaming. It’s fine for email.',
        ['', ['It’s overheating', 'The monitor is failing', 'The keyboard is broken', 'The internet is too slow']],
        ['', ['Clean the dust out, check the fans spin and the cooler is seated', 'Add a second monitor', 'Reinstall the game', 'Change the desktop wallpaper']], 'Shutdowns under load usually mean heat: dust, a dead fan or old thermal paste.'],
      ['c1n', 'I can’t open any websites by name, but if I type 8.8.8.8 into the ping command it replies fine.',
        ['', ['Name resolution (DNS) isn’t working', 'The network cable is unplugged', 'The PC has no IP address', 'The web browser needs updating']],
        ['', ['Check the DNS server settings, then ipconfig /flushdns', 'Replace the network card', 'Reinstall Windows', 'Turn off the firewall for good']], 'IP works but names don’t: DNS.'],
      ['c1t', 'My computer has started clicking and grinding, and files take forever to open.',
        ['', ['The hard drive is failing', 'The RAM is too slow', 'The power supply is too big', 'The mouse needs new batteries']],
        ['', ['Back up the data right away, then replace the drive', 'Defragment the drive', 'Run Disk Cleanup', 'Add more RAM']], 'A clicking hard drive is dying: save the data first.'],
      ['c1m', 'My phone’s back has started bulging and the case won’t close properly. It’s warm, too.',
        ['', ['The battery is swelling', 'The case is the wrong size', 'The screen protector is peeling', 'It has too many apps']],
        ['', ['Power it off and have the battery replaced, then recycle the old one safely', 'Press the case shut', 'Charge it to 100%', 'Factory-reset it']], 'A swollen lithium-ion battery can catch fire: stop using it.'],
      ['c1m', 'My laptop screen is so dark I can only see the picture if I shine a flashlight on it. Brightness is all the way up.',
        ['', ['The backlight has failed', 'The video driver is out of date', 'The hard drive is full', 'The keyboard light is off']],
        ['', ['Replace the backlight (or the display panel)', 'Reinstall the video driver', 'Delete some files', 'Turn on the keyboard light']], 'A picture with no light behind it is the backlight.'],
      ['c2s', 'My browser keeps opening pop-ups, and my home page changed to some search site by itself.',
        ['', ['Malware: adware or a browser hijacker', 'The screen is failing', 'The Wi-Fi password changed', 'The hard drive is full']],
        ['', ['Quarantine it, remove the malware, update and scan, then show the user what to avoid', 'Buy a new computer', 'Just delete the browser history', 'Replace the mouse']], 'Investigate, quarantine, disable System Restore, remediate, update and scan, re-enable System Restore, educate.'],
      ['c2t', 'Every secure website I visit says its certificate isn’t valid. It started after the PC was unplugged for a month.',
        ['', ['The system date and time are wrong', 'Every website’s certificate expired', 'The monitor is broken', 'The keyboard layout changed']],
        ['', ['Set the correct date and time (sync with a time server)', 'Turn off the antivirus', 'Reinstall the browser', 'Replace the network card']], 'A wrong clock makes good certificates look expired or not yet valid.'],
      ['c2t', 'Since I updated my graphics driver yesterday, Windows crashes to a blue screen.',
        ['', ['The new driver', 'A failing keyboard', 'A full recycle bin', 'The wallpaper']],
        ['', ['Boot into Safe Mode and roll back the driver', 'Replace the graphics card', 'Reinstall Office', 'Format the drive']], 'Undo the most recent change first.'],
      ['c2s', 'All my files have strange new extensions and there’s a note on screen asking for Bitcoin!',
        ['', ['Ransomware', 'A failing monitor', 'A full hard drive', 'Spyware that only watches']],
        ['', ['Disconnect it from the network now and follow the incident response plan', 'Pay the ransom', 'Keep restarting until it goes away', 'Email the note to coworkers']], 'Isolate first so it can’t spread. Good backups are the cure.'],
      ['c2o', 'I can’t copy a 6 GB video onto my brand-new 64 GB USB stick. It says the file is too large.',
        ['', ['The stick is formatted FAT32, which can’t hold files over 4 GB', 'The stick is too small', 'The video is corrupted', 'The USB port is USB 2.0']],
        ['', ['Back it up, then reformat the stick as exFAT (or NTFS)', 'Buy a bigger stick', 'Rename the file', 'Run chkdsk on the stick']], 'FAT32 has a 4 GB file size limit; exFAT and NTFS don’t.'],
      ['c2t', 'My PC takes about five minutes to start up, and loads of little icons appear by the clock.',
        ['', ['Too many programs run at startup', 'The CPU is too fast', 'The screen is too big', 'The mouse driver is old']],
        ['', ['Disable the startup apps you don’t need (Task Manager > Startup)', 'Replace the CPU', 'Turn off the firewall', 'Plug in a second monitor']], 'Startup apps slow the boot down.'],
      ['c1n', 'Our Wi-Fi is really slow in my apartment. There are about thirty other networks showing up.',
        ['', ['Interference from neighbours on the same channel', 'The router’s power cable', 'DHCP is turned on', 'The laptop’s screen brightness']],
        ['', ['Move to a less crowded channel, or use the 5 GHz band', 'Turn off DHCP', 'Replace the power cable', 'Lower the screen brightness']], 'On 2.4 GHz, only channels 1, 6 and 11 don’t overlap.'],
      ['c2s', 'I got an email from “IT Support” saying my mailbox is full and I need to reply with my password.',
        ['', ['It’s a phishing email', 'Their mailbox really is full', 'It’s a normal IT request', 'It’s a software update']],
        ['', ['Don’t reply or click anything; report it to the security team', 'Reply with the password', 'Forward it to everyone', 'Click the link to check']], 'Real IT never asks for your password.'],
      ['c1h', 'I added a new stick of RAM and now my PC just beeps and shows nothing.',
        ['', ['The new memory isn’t seated or isn’t the right type', 'The monitor is broken', 'Windows needs updating', 'The network is down']],
        ['', ['Reseat it, and check it’s the type the board takes (DDR4 or DDR5)', 'Replace the monitor', 'Reinstall Windows', 'Reset the router']], 'Beep codes at POST often point at memory.'],
      ['c2o', 'I need to join my laptop to the company domain, but there’s no option for it in Settings.',
        ['', ['It’s running Windows Home edition', 'The laptop has no Wi-Fi', 'The domain is full', 'The mouse is unplugged']],
        ['', ['Upgrade it to Windows Pro (or Enterprise)', 'Reinstall Windows Home', 'Buy a new mouse', 'Turn off the firewall']], 'Home can’t join a domain; Pro, Enterprise and Education can.'],
      ['c2s', 'Someone I didn’t know followed me straight through the badge door this morning.',
        ['What’s that called?', ['Tailgating', 'Phishing', 'Shoulder surfing', 'Whaling']],
        ['What should the company do?', ['Train people not to hold the door, and add an access control vestibule', 'Nothing, it’s polite', 'Turn off the badge readers', 'Give everyone the door code']], 'Tailgating beats physical security by following someone in.'],
      ['c1v', 'My virtual machine won’t start. It says hardware virtualization is turned off.',
        ['', ['Intel VT-x or AMD-V is disabled in the BIOS/UEFI', 'The VM needs more monitors', 'The hard drive is full of photos', 'The hypervisor is Type 1']],
        ['', ['Turn on virtualization in the BIOS/UEFI settings', 'Reinstall the VM’s OS', 'Buy a new hard drive', 'Disable Secure Boot']], 'Hypervisors need the CPU’s virtualization extensions.'],
      ['c2p', 'The laser printer needs new toner. What should I do with the old cartridge?',
        ['Where do you check how to handle it?', ['Its Safety Data Sheet (SDS)', 'The Windows help', 'The printer’s warranty card', 'The company website']],
        ['And then?', ['Recycle it the way the SDS and local rules say', 'Put it in the regular trash', 'Shake out the leftover toner', 'Burn it']], 'Toner and batteries need proper disposal: check the SDS.'],
      ['c2p', 'Oh no, I just spilled coffee all over my laptop keyboard!',
        ['What comes first?', ['Power it off and unplug it straight away', 'Keep typing to see if it works', 'Dry it with a hair dryer while it’s on', 'Restart it']],
        ['Then what?', ['Remove the battery if you can, let it dry, and get it checked', 'Charge it up', 'Put it in the freezer', 'Run Windows Update']], 'Power off first: liquid plus power shorts things out.'],
      ['c1h', 'My new graphics card is in, but the PC won\u2019t even turn on now. It was fine with the old one.',
        ['', ['The power supply can\u2019t give the new card enough power', 'The monitor is too old', 'Windows needs activating', 'The keyboard is unplugged']],
        ['', ['Check the card\u2019s PCIe power cables, and fit a bigger power supply if it\u2019s underpowered', 'Reinstall Windows', 'Replace the monitor', 'Clear the browser cache']], 'Graphics cards need their own power connectors, and enough watts from the PSU.'],
      ['c1t', 'My PC\u2019s clock is wrong every time I turn it on, and it\u2019s about eight years old.',
        ['', ['The CMOS battery on the motherboard is dead', 'The hard drive is failing', 'Windows Update is broken', 'The power supply is too strong']],
        ['', ['Replace the CMOS battery (a CR2032 coin cell)', 'Replace the hard drive', 'Reinstall Windows', 'Swap the power supply']], 'A dead CMOS battery loses the time and BIOS settings when the PC is unplugged.'],
      ['c1t', 'The printer says it\u2019s jammed, but I can\u2019t see any paper stuck inside.',
        ['', ['A scrap of paper is caught deeper in, or a sensor is dirty', 'The printer driver is the wrong version', 'The toner is the wrong colour', 'The Wi-Fi is down']],
        ['', ['Power it off, open every door and tray, remove any scraps and clean the rollers', 'Reinstall Windows', 'Buy a new printer', 'Print from a different program']], 'Check the whole paper path, and clean or replace worn pickup rollers.'],
      ['c1t', 'Pages come out of the laser printer with a line down the same place on every sheet.',
        ['', ['A scratch or dirt on the imaging drum', 'The wrong paper size in Windows', 'Low Wi-Fi signal', 'An old print driver']],
        ['', ['Replace the drum (or the toner cartridge it\u2019s part of)', 'Reinstall the driver', 'Move the printer nearer the router', 'Change the paper size']], 'A repeating mark at the same spot points to the drum or another roller.'],
      ['c1n', 'My laptop connects to the office Wi-Fi but says "No internet". Everyone else is fine.',
        ['', ['The laptop has a wrong static IP or DNS setting', 'The office internet is down', 'The screen is too dim', 'The battery is low']],
        ['', ['Set the adapter to get its IP and DNS automatically (DHCP)', 'Restart the office router', 'Turn up the brightness', 'Plug in the charger']], 'If it\u2019s only one device, look at that device\u2019s settings first.'],
      ['c1m', 'My phone\u2019s screen turns on and off by itself and taps things I didn\u2019t touch.',
        ['', ['The digitizer (the touch layer) is faulty', 'The battery is new', 'The SIM card is loose', 'The Wi-Fi is too fast']],
        ['', ['Remove the case and screen protector to check, then replace the screen/digitizer if it continues', 'Factory-reset straight away', 'Replace the SIM', 'Turn off Wi-Fi']], 'Ghost touches usually come from the digitizer, or a cheap screen protector.'],
      ['c2o', 'I deleted an important file from my Windows PC an hour ago. Can I get it back?',
        ['Where do you look first?', ['The Recycle Bin', 'Device Manager', 'Disk Management', 'The BIOS']],
        ['It\u2019s not there either. What next?', ['Restore it from a backup or File History (Previous Versions)', 'Defragment the drive', 'Run chkdsk /f', 'Reinstall Windows']], 'Deleted files go to the Recycle Bin first; then backups.'],
      ['c2t', 'Every time I open a program, Windows asks "Do you want to allow this app to make changes?"',
        ['What is that prompt?', ['User Account Control (UAC)', 'A virus warning', 'Windows Firewall', 'BitLocker']],
        ['What should you tell them?', ['It\u2019s normal for apps that need admin rights: only say Yes to ones you trust', 'Turn off all security', 'Reinstall the program', 'Delete the program']], 'UAC asks before anything gets administrator rights.'],
      ['c2s', 'A caller says they\u2019re from Microsoft and need remote access to fix a virus on my PC.',
        ['', ['A tech-support scam (social engineering)', 'A real Microsoft engineer', 'An automatic Windows update', 'A printer problem']],
        ['', ['Hang up, don\u2019t give access, and report it', 'Let them connect to check', 'Give them your password only', 'Pay for the fix']], 'Microsoft doesn\u2019t cold-call users. Never give remote access to an unknown caller.'],
      ['c2s', 'I found a USB stick in the car park labelled "Salaries 2026". Can I plug it in to see whose it is?',
        ['', ['No: it could be a baiting attack loaded with malware', 'Yes, it\u2019s just a lost stick', 'Only on a Mac', 'Only if it\u2019s USB-C']],
        ['', ['Hand it to IT or security unopened', 'Plug it into a coworker\u2019s PC', 'Format it and keep it', 'Open the files to find the owner']], 'Dropping infected USB sticks is a classic social engineering trick.'],
      ['c2o', 'My Mac is almost out of disk space and I don\u2019t know what\u2019s using it.',
        ['Where do you look?', ['Storage settings (About This Mac / System Settings > Storage)', 'Time Machine', 'FileVault', 'Keychain Access']],
        ['Then what?', ['Remove large unneeded files or apps, and empty the Trash', 'Turn off FileVault', 'Reinstall macOS', 'Delete the System folder']], 'The storage view breaks down what\u2019s using the space.'],
      ['c2p', 'A user wants you to install their personal copy of some software on a company laptop.',
        ['What should you check first?', ['The company\u2019s software and licensing policy', 'How fast the laptop is', 'The user\u2019s favourite colour', 'Whether the screen is big enough']],
        ['If it isn\u2019t allowed?', ['Explain the policy politely and point them to the approved request process', 'Install it anyway', 'Ignore the request', 'Install a cracked copy']], 'Licences and acceptable use policies (AUPs) decide what can be installed.'],
    ];
    const NAMES = ['Priya', 'Marcus', 'Ellen', 'Tomas', 'Grace', 'Dev', 'Aiko', 'Sam', 'Fatima', 'Leo', 'Nora', 'Kwame'];
    const COLS = ['#ffb04a', '#7ab0ff', '#ff8a7a', '#8bd450', '#d88aff', '#ffd23f', '#4fc3f7', '#ff9ad0'];

    // ---------------------------------------------------------------- the desk
    addBox(G, 3.2, 1.05, 0.5, lam(0x2f6fd0), 0, 0.525, -0.3);
    addBox(G, 3.3, 0.05, 0.62, lam(0xe8e0d0), 0, 1.07, -0.3);
    makePlate(G, '\u{1F6E0}️  HELP DESK', 1.6, 0.26, new V3(0, 0.8, -0.04), 0, { bg: '#2f6fd0', fg: '#ffffff', size: 0.6 });
    // a "take a number" sign and a door the customers come through
    addBox(G, 1.4, 2.4, 0.08, lam(0x8a5a3a), 4.6, 1.2, -5.88);
    addBox(G, 0.06, 0.06, 0.1, lam(0xd8b040), 4.15, 1.1, -5.82);
    makePlate(G, 'CUSTOMERS', 1.2, 0.2, new V3(4.6, 2.6, -5.86), 0, { bg: '#2f6fd0', fg: '#ffffff', size: 0.6 });
    // the ticket monitor on the counter, angled to you
    addBox(G, 0.06, 0.22, 0.06, lam(0x2a2a2a), -1.15, 1.2, -0.38);
    const mon = STUDY.screen(G, 1024, 640, 0.9, 0.56, -1.15, 1.58, -0.4, 0.35, 0x1a1a1a);
    // the customer's speech bubble
    const bubble = STUDY.screen(G, 1024, 420, 1.7, 0.7, 0, 2.3, -1.3, 0, 0xffffff);
    // the answer cards lie on the counter, tilted up to you
    const deck = STUDY.cards(G, { n: 4, w: 0.56, h: 0.28 });
    const CARD_AT = [[-0.31, 1.37, -0.22], [0.31, 1.37, -0.22], [-0.31, 1.14, 0.08], [0.31, 1.14, 0.08]];
    CARD_AT.forEach(([x, y, z], i) => deck.place(i, x, y, z, 0, -0.75));

    // ---------------------------------------------------------------- the customer
    const cust = { g: null, x: 4.4, z: -5.2, tx: 0, tz: -1.0, walk: 0, mood: 0, name: '' };
    function newCustomer() {
      if (cust.g) G.remove(cust.g);
      const k = Math.floor(rand() * 64);
      cust.g = buildAvatar(COLS[k % COLS.length], k % 4, (k >> 2) % 4, true, k % 3, (k >> 1) % 6);
      cust.g.rotation.y = Math.PI;
      G.add(cust.g);
      cust.x = 4.4; cust.z = -5.2; cust.tx = 0; cust.tz = -1.0; cust.name = NAMES[Math.floor(rand() * NAMES.length)];
    }

    // ---------------------------------------------------------------- the shift
    const S = { ph: 'idle', n: 0, step: 0, score: 0, right: 0, t0: 0, tk: null, last: null, best: 0, list: [], revealT: 0, opts: null };
    try { if (Number.isInteger(prefs.deskBest)) S.best = prefs.deskBest; } catch (e) { /* none */ }
    L.desk = S;
    const timeLeft = () => Math.max(0, STEPT - (performance.now() - S.t0) / 1000);
    function menuCards() {
      deck.set(0, 'Start a shift', 'mode', { sub: 'Six customers', big: 48 });
      deck.set(1, 'Core 1 only', 'mode', { sub: 'Hardware and networks', big: 48 });
      deck.set(2, 'Core 2 only', 'mode', { sub: 'Software and security', big: 48 });
      deck.set(3, 'Practice', 'mode', { sub: 'Every ticket, no score kept', big: 48 });
    }
    function startShift(kind) {
      const pool = TICKETS.filter((t) => (kind === 'c1' ? t[0].startsWith('c1') : kind === 'c2' ? t[0].startsWith('c2') : true));
      S.list = pool.slice().sort(() => rand() - 0.5).slice(0, kind === 'practice' ? pool.length : SHIFT);
      Object.assign(S, { ph: 'walk', kind, n: 0, score: 0, right: 0, last: null, summary: null });
      nextCustomer();
      sfx('whistle', 0.5);
      forcePresence(); state.dirtyBoard = true;
    }
    L.startShift = startShift;
    function nextCustomer() {
      if (S.n >= S.list.length) { endShift(); return; }
      S.tk = S.list[S.n]; S.n += 1; S.step = 0; S.ph = 'walk'; S.last = null;
      newCustomer();
      for (let i = 0; i < 4; i++) deck.show(i, false);
    }
    function ask() {
      const st = S.tk[2 + S.step];   // [cause] is tk[2], [fix] is tk[3]
      const ans = st[1], order = [0, 1, 2, 3].sort(() => rand() - 0.5);
      S.opts = { prompt: st[0] || (S.step === 0 ? CAUSE : FIX), a: order.map((i) => ans[i]), c: order.indexOf(0) };
      S.opts.a.forEach((t, i) => { deck.set(i, t, 'idle', { big: 40 }); deck.show(i, true); });
      S.ph = 'ask'; S.t0 = performance.now();
    }
    function answer(i) {
      if (S.ph !== 'ask') return;
      const ok = i === S.opts.c, tl = timeLeft();
      if (ok) { const pts = 100 + Math.round(50 * tl / STEPT); S.score += pts; S.right += 1; STUDY.right(); spawnFloat(`+${pts}`, new V3(0, 1.9, -0.9), '#8bd450'); }
      else STUDY.wrong();
      S.last = { ok, pts: ok ? 100 + Math.round(50 * tl / STEPT) : 0, timeout: i < 0 };
      for (let k = 0; k < 4; k++) deck.look(k, k === S.opts.c ? 'right' : k === i ? 'wrong' : 'dim');
      cust.mood = ok ? 1 : -1;
      S.ph = 'reveal'; S.revealT = 0;
      forcePresence(); state.dirtyBoard = true;
    }
    L.answer = answer;
    function advance() {
      if (S.step === 0) { S.step = 1; ask(); return; }
      // done with this customer: off they go
      S.ph = 'leave'; cust.tx = 4.4; cust.tz = -5.2;
      for (let i = 0; i < 4; i++) deck.show(i, false);
    }
    function endShift() {
      S.ph = 'idle';
      const isBest = S.kind !== 'practice' && S.score > S.best;
      if (isBest) { S.best = S.score; prefs.deskBest = S.best; savePrefs(); }
      if (S.kind !== 'practice') RECORDS.add(L, 'shift', S.score);
      const of = S.list.length * 2;
      S.summary = { score: S.score, right: S.right, of, best: isBest, kind: S.kind };
      showToast(`Shift over: ${S.right} of ${of} right, ${S.score} points${isBest ? ' (your best!)' : ''}`);
      sfx(S.right >= of - 1 ? 'fanfare' : 'chime', 0.8);
      if (cust.g) { G.remove(cust.g); cust.g = null; }
      menuCards(); for (let i = 0; i < 4; i++) deck.show(i, true);
      forcePresence(); state.dirtyBoard = true;
    }
    L.endShift = endShift;
    function onPick(i) {
      if (S.ph === 'idle') { startShift(['all', 'c1', 'c2', 'practice'][i]); return; }
      if (S.ph === 'ask') answer(i);
      else if (S.ph === 'reveal' && S.revealT > 0.7) advance();
    }
    const input = STUDY.input(L, deck, { onPick, onMiss: () => { if (S.ph === 'reveal' && S.revealT > 0.7) advance(); }, enabled: () => state.level === L.idx });
    L.throwLabel = () => (S.ph === 'reveal' ? 'Next' : 'Answer');

    // ---------------------------------------------------------------- drawing
    function drawBubble() {
      const key = `${S.ph}|${S.n}|${S.step}|${S.last ? S.last.ok : ''}|${S.summary ? S.summary.score : ''}`;
      if (key === bubble.key) return; bubble.key = key;
      const g = bubble.g, W = 1024, H = 420;
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#1a2a4a';
      if (S.ph === 'idle') {
        g.fillStyle = '#2f6fd0'; g.font = `900 84px ${DISPLAY}`; g.fillText('HELP DESK TICKETS', W / 2, 110);
        g.fillStyle = '#1a2a4a'; g.font = `400 34px ${BODY}`;
        if (S.summary) { const s = S.summary; g.font = `800 56px ${DISPLAY}`; g.fillText(`${s.right} of ${s.of} right  ·  ${s.score} points`, W / 2, 220); g.font = `400 32px ${BODY}`; g.fillText(s.kind === 'practice' ? 'Practice round' : s.best ? 'Your best shift yet!' : `Your best: ${S.best}`, W / 2, 280); }
        else STUDY.wrap(g, 'Customers bring you their problems. For each, pick the likely cause, then the fix. Quick right answers score more.', W / 2, 190, W - 120, 44);
        g.fillStyle = '#6a7a9a'; g.font = `700 30px ${BODY}`; g.fillText('Touch a card on the counter to start', W / 2, 380);
        bubble.tex.needsUpdate = true; return;
      }
      if (S.ph === 'walk' || !S.tk) { g.fillStyle = '#9aa0b8'; g.font = `700 40px ${BODY}`; g.fillText(`Next customer: ${cust.name}…`, W / 2, 220); bubble.tex.needsUpdate = true; return; }
      g.textAlign = 'left'; g.fillStyle = '#2f6fd0'; g.font = `800 34px ${BODY}`; g.fillText(`${cust.name}:`, 40, 60);
      if ((S.ph === 'reveal' && S.step === 1) || S.ph === 'leave') {
        const ok = S.last && S.last.ok;
        g.fillStyle = ok ? '#2a8a2a' : '#b02a2a'; g.font = `800 48px ${BODY}`;
        g.fillText(ok ? 'That fixed it, thank you!' : 'Hmm, that didn’t help…', 40, 140, W - 80);
        g.fillStyle = '#4a5a7a'; g.font = `400 34px ${BODY}`; g.textAlign = 'left';
        STUDY.wrap(g, `Remember: ${S.tk[4]}`, 40, 220, W - 80, 44, 4);
      } else {
        g.fillStyle = '#1a2a4a';
        const s = STUDY.fit(g, `“${S.tk[1]}”`, W - 80, 4, 64, 26, 400);
        STUDY.wrap(g, `“${S.tk[1]}”`, 40, 120, W - 80, s * 1.2, 4);
      }
      bubble.tex.needsUpdate = true;
    }
    function drawMon() {
      const t = S.ph === 'ask' ? Math.ceil(timeLeft()) : 0;
      const key = `${S.ph}|${S.n}|${S.step}|${t}|${S.score}`;
      if (key === mon.key) return; mon.key = key;
      const g = mon.g, W = 1024, H = 640;
      g.fillStyle = '#10203a'; g.fillRect(0, 0, W, H);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `900 64px ${DISPLAY}`; g.fillText(S.ph === 'idle' ? 'TICKET QUEUE' : `TICKET #${1040 + S.n}`, 40, 90);
      g.textAlign = 'right'; g.fillStyle = '#ffffff'; g.font = `900 64px ${DISPLAY}`; g.fillText(String(S.score), W - 40, 90);
      g.textAlign = 'left';
      if (S.ph === 'idle') { g.fillStyle = '#c8d8f0'; g.font = `400 40px ${BODY}`; STUDY.wrap(g, 'No open tickets. Start a shift with the cards on the counter.', 40, 200, W - 80, 52); mon.tex.needsUpdate = true; return; }
      g.fillStyle = '#9ab0d0'; g.font = `700 36px ${BODY}`; g.fillText(`Customer ${S.n} of ${S.list.length}  ·  ${APLUS.DOMAINS[S.tk[0]].exam}: ${APLUS.DOMAINS[S.tk[0]].name}`, 40, 160, W - 80);
      if (S.ph === 'ask' || S.ph === 'reveal') {
        g.fillStyle = '#ffffff'; g.font = `800 64px ${BODY}`; STUDY.wrap(g, S.opts.prompt, 40, 280, W - 80, 72, 2);
        g.fillStyle = '#9ab0d0'; g.font = `700 34px ${BODY}`; g.fillText(`Step ${S.step + 1} of 2`, 40, 450);
        if (S.ph === 'ask') { const f = timeLeft() / STEPT; g.fillStyle = '#24365a'; g.fillRect(40, 500, W - 80, 24); g.fillStyle = f > 0.3 ? '#4fc3f7' : '#ff6a6a'; g.fillRect(40, 500, (W - 80) * f, 24); }
        else { g.fillStyle = S.last.ok ? '#8bd450' : '#ff6a6a'; g.font = `900 60px ${DISPLAY}`; g.fillText(S.last.ok ? `Right! +${S.last.pts}` : S.last.timeout ? 'Out of time' : 'Not quite', 40, 540); g.fillStyle = '#6a80a8'; g.font = `400 28px ${BODY}`; g.fillText('Touch any card to carry on', 40, 600); }
      }
      mon.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    function stand() { S.slot = STUDY.slotOf(L); STUDY.standAt(STUDY.SLOT_X[S.slot] * 0.5, state.mode === 'vr' ? SPOT_Z : 1.45, 0, -0.1); }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      hall.tick();
      if (!here) { input.hide(); return; }
      if (STUDY.slotOf(L) !== S.slot) stand();
      // the customer walks to the counter, waits, and walks off
      if (cust.g) {
        const dx = cust.tx - cust.x, dz = cust.tz - cust.z, d = Math.hypot(dx, dz);
        if (d > 0.02) { const sp = Math.min(d, 1.6 * dt); cust.x += dx / d * sp; cust.z += dz / d * sp; cust.walk += dt * 9; cust.g.rotation.y = Math.atan2(-dx, -dz) + 0; }
        else { cust.g.rotation.y = S.ph === 'leave' ? cust.g.rotation.y : Math.PI; }
        const bob = d > 0.02 ? Math.abs(Math.sin(cust.walk)) * 0.04 : 0;
        const happy = S.ph === 'reveal' && cust.mood > 0 ? Math.abs(Math.sin(now / 120)) * 0.05 : 0;
        cust.g.position.set(cust.x, 1.62 + bob + happy, cust.z);
        cust.g.rotation.z = S.ph === 'reveal' && cust.mood < 0 ? Math.sin(now / 150) * 0.08 : 0;
        if (S.ph === 'walk' && d <= 0.02) ask();
        if (S.ph === 'leave' && d <= 0.02) nextCustomer();
      }
      if (S.ph === 'ask' && timeLeft() <= 0) answer(-1);
      if (S.ph === 'reveal') { S.revealT += dt; if (S.revealT > (S.last.ok ? 3 : 6)) advance(); }
      input.tick(dt);
      drawBubble(); drawMon();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'idle' ? 'Help Desk  ·  aim at a card on the counter and click (or press 1-4)' : S.ph === 'ask' ? `${Math.ceil(timeLeft())} s  ·  ${S.opts.prompt}  ·  click an answer or press 1-4` : `${S.score} points  ·  customer ${S.n} of ${S.list.length}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ hd: [S.score, S.best, S.ph === 'idle' ? 0 : 1, S.n] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.hd;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6)) { st.hd = null; return; }
      if (!st.hd || st.hd[0] !== a[0] || st.hd[1] !== a[1]) state.dirtyBoard = true;
      st.hd = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? L.presence().hd : st.hd;
      if (!a) return { best: 0, text: '' };
      return { best: a[1], text: `${a[2] ? `${a[0]} now · ` : ''}best ${a[1]}` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.85, 2.0, -0.6, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#10203a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Employee of the month', 36, 80, W - 72);
      g.fillStyle = '#c8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Best shift score', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 3.8, 2.6, -Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'shift', label: 'Best shift (six customers)' }], { x: 5.75, z: 0.6, yaw: -Math.PI / 2 });
    L.hudActions = [{ label: () => (S.ph === 'idle' ? 'Start shift' : 'End shift'), run: () => { if (S.ph === 'idle') startShift('all'); else endShift(); } }];
    L.hints = [['Touch a card', 'on the counter to answer'], ['Point + trigger', 'works too']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Aim + click', 'pick an answer card'], ['1-4', 'answer by number']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { S.ph = 'idle'; S.summary = null; if (cust.g) { G.remove(cust.g); cust.g = null; } menuCards(); for (let i = 0; i < 4; i++) deck.show(i, true); bubble.key = ''; mon.key = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; S.ph = 'idle'; input.hide(); };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 1.5, 1.8, 2.2); camera.lookAt(0, 1.5, -1); };
    menuCards();
    L.deskInternals = { S, TICKETS, deck, answer, advance, startShift, endShift, onPick, cust, ask };
    MUSIC_THEMES.helpdesk = { gain: 0.5, bpm: 88, swing: 0.2, chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'], comp: { inst: 'ep', at: [0, 6, 11], dur: 0.8 }, bass: { at: [0, 8, 10] }, drums: { k: 'x.......x.......', s: '....x.......x...', h: 'o-o-o-o-o-o-o-o-' }, cut: 3200, crackle: 0.6 };
    return L;
  })();
