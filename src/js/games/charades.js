  // ================================================================ LEVEL: CHARADES LOUNGE
  const charades = (() => {
    const L = newLevel(13);
    const G = L.group;
    const rand = mulberry32(2626);
    const R = { minX: -10, maxX: 10, minZ: -8, maxZ: 8, H: 4.6 };
    L.bounds = R;
    L.env = {
      sky: skyTexture([[0, '#1a1426'], [1, '#1a1426']]),
      bg: 0x1a1426, fog: [0x1a1426, 30, 80], hemi: [0xffe2c8, 0x3a2a3a, 0.62],
      sun: [0xffd8b0, 0.25], sunDir: new V3(0.2, 1, 0.3), ambient: [0x5a4a5a, 0.45], sprite: null,
    };
    // the prompts: silly, original, no brands or titles. "phrase|key words": a typed guess needs the key words
    const PROMPTS = {
      'Silly action': ['brushing a lion\'s teeth|lion teeth', 'walking a very stubborn dog|walk dog', 'chasing a runaway pancake|chase pancake', 'stepping on a toy brick|step brick', 'sneezing while holding soup|sneeze soup', 'opening a jar of pickles|open jar', 'running for the bus|run bus', 'getting a brain freeze|brain freeze', 'carrying way too many grocery bags|grocery bags', 'stuck in a revolving door|revolving door', 'eating spaghetti with no hands|spaghetti', 'popping bubble wrap|bubble wrap', 'running away from a bee|bee', 'riding a unicycle|unicycle', 'juggling flaming torches|juggle torch', 'making a snow angel|snow angel', 'hiccuping during a speech|hiccup', 'trying to catch a fly|catch fly', 'walking on hot sand|hot sand', 'a statue that has to sneeze|statue sneeze', 'blowing up a giant balloon|balloon', 'trying to fold a fitted sheet|fold sheet', 'a zombie doing yoga|zombie yoga', 'a robot learning to dance|robot dance', 'taking a selfie with a bear|selfie bear', 'ironing a shirt that is on fire|iron shirt', 'a superhero who is afraid of heights|superhero heights', 'losing a staring contest|staring contest', 'trying to stay awake in class|stay awake'],
      'Animal': ['a penguin learning to fly|penguin fly', 'a cat that sees a cucumber|cat cucumber', 'a kangaroo with hiccups|kangaroo', 'an octopus doing the dishes|octopus dishes', 'a giraffe at the dentist|giraffe', 'a flamingo trying to sit down|flamingo', 'a snake putting on socks|snake socks', 'a chicken crossing the road|chicken road', 'a monkey stealing a banana|monkey banana', 'a dinosaur making its bed|dinosaur bed', 'a frog at a disco|frog', 'a crab doing ballet|crab', 'an elephant on a skateboard|elephant skateboard', 'a sloth in a hurry|sloth', 'a bear waking up from a nap|bear', 'an owl reading a book|owl book', 'a dog chasing its tail|dog tail', 'a gorilla at the gym|gorilla gym', 'a turtle in a race|turtle race', 'a bat hanging upside down|bat', 'a peacock showing off|peacock', 'a duck in a rainstorm|duck rain', 'a hamster on a wheel|hamster wheel', 'a seal balancing a ball|seal ball'],
      'Job': ['a chef flipping pancakes way too high|chef pancake', 'a firefighter rescuing a cat|firefighter cat', 'an astronaut floating in space|astronaut', 'a magician who lost the rabbit|magician rabbit', 'a dentist with a scared patient|dentist', 'a lifeguard who cannot swim|lifeguard', 'a pilot in turbulence|pilot', 'a mail carrier chased by a dog|mail dog', 'a barber giving a terrible haircut|haircut', 'a waiter carrying ten plates|waiter plates', 'a detective looking for clues|detective', 'a DJ at a wild party|dj', 'a ballet dancer with a cramp|ballet', 'a clown in a tiny car|clown car', 'a farmer milking a cow|milk cow', 'a teacher with a noisy class|teacher', 'a scientist whose experiment explodes|scientist', 'a photographer chasing a bird|photographer', 'a painter painting a giraffe|painter giraffe', 'a referee who keeps tripping|referee'],
      'Sport': ['bowling a strike|bowling strike', 'a golfer stuck in the sand|golf sand', 'sumo wrestling|sumo', 'synchronized swimming|synchronized swim', 'a goalie diving for the ball|goalie', 'playing tennis with a giant racket|tennis', 'doing the limbo|limbo', 'a slam dunk|slam dunk', 'weightlifting a car|weightlifting', 'arm wrestling|arm wrestling', 'skydiving|skydiving', 'a pole vault|pole vault', 'archery|archery', 'karate chopping a board|karate', 'rock climbing|rock climbing', 'a figure skating spin|figure skating', 'dodgeball|dodgeball', 'tug of war|tug war', 'a three-legged race|three legged race', 'surfing a giant wave|surf'],
      'Thing': ['a volcano erupting|volcano', 'popcorn popping|popcorn', 'a washing machine|washing machine', 'a tornado|tornado', 'an umbrella blowing inside out|umbrella', 'a melting snowman|snowman', 'a jack in the box|jack box', 'a rocket launch|rocket', 'a roller coaster|roller coaster', 'a garden sprinkler|sprinkler', 'an alarm clock that will not stop|alarm clock', 'a toaster|toaster', 'a windmill|windmill', 'a lighthouse|lighthouse', 'a spring toy going down the stairs|spring stairs', 'a hot air balloon|hot air balloon', 'a vending machine that eats your money|vending machine', 'a ceiling fan|ceiling fan', 'a pinball machine|pinball', 'a runaway shopping cart|shopping cart'],
    };
    const CATS = Object.keys(PROMPTS);
    L.PROMPTS = PROMPTS;
    L.CATS = CATS;

    // ---------------------------------------------------------------- the room
    const wood = canvasTexture(256, 256, (g) => {
      for (let i = 0; i < 8; i++) { const s = 120 + Math.floor(rand() * 40); g.fillStyle = `rgb(${s + 30},${s - 10},${s - 50})`; g.fillRect(0, i * 32, 256, 30); g.fillStyle = 'rgba(60,30,10,0.4)'; g.fillRect(0, i * 32 + 30, 256, 2); g.fillRect(Math.floor(rand() * 256), i * 32, 2, 30); }
    }).tex;
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(5, 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), new THREE.MeshLambertMaterial({ map: wood }));
    floor.rotation.x = -Math.PI / 2; G.add(floor);
    const wallMat = lam(0x3a2a44), trimMat = lam(0x6b2a3a);
    for (const [x, z, w, d] of [[0, R.minZ, 20, 0.3], [0, R.maxZ, 20, 0.3], [R.minX, 0, 0.3, 16], [R.maxX, 0, 0.3, 16]]) {
      addBox(G, w, R.H, d, wallMat, x, R.H / 2, z);
      addBox(G, w + 0.02, 0.9, d + 0.06, trimMat, x, 0.45, z);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), lam(0x241a2c)); ceil.rotation.x = Math.PI / 2; ceil.position.y = R.H; G.add(ceil);
    // the stage: a low platform, velvet curtains, footlights and a spotlight
    const STAGE = { x0: -4.5, x1: 4.5, z0: -7.7, z1: -3.2 };
    L.STAGE = STAGE;
    addBox(G, 9, 0.12, 4.5, lam(0x5a3a28), 0, 0.06, -5.45);
    addBox(G, 9.2, 0.14, 0.12, lam(0xd8b45a), 0, 0.07, -3.18);
    const velvet = lam(0x9a1f2e);
    for (let k = 0; k < 18; k++) { const c = addCyl(G, 0.22, 0.22, R.H - 0.2, 8, velvet, -4.25 + k * 0.5, (R.H - 0.2) / 2, -7.6); c.scale.z = 0.5; }
    for (const sx of [-1, 1]) { const side = addBox(G, 1.2, R.H - 0.3, 0.3, velvet, sx * 5.2, (R.H - 0.3) / 2, -5.2); side.rotation.y = sx * 0.4; }
    addBox(G, 10.4, 0.5, 0.3, lam(0x6b1520), 0, R.H - 0.35, -7.4);
    const glow = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffd08a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    for (let k = 0; k < 9; k++) { const s = new THREE.Sprite(glow); s.position.set(-4 + k, 0.2, -3.28); s.scale.set(0.5, 0.35, 1); G.add(s); }
    const spot = new THREE.SpotLight(0xfff0d8, 1.4, 14, 0.55, 0.5, 1.2);
    spot.position.set(0, R.H - 0.2, -1.5); spot.target.position.set(0, 0, -5.2);
    G.add(spot, spot.target);
    const roomLight = new THREE.PointLight(0xffd8b0, 0.7, 22, 1.4); roomLight.position.set(0, 3.8, 3); G.add(roomLight);
    // string lights over the audience
    for (let k = 0; k < 16; k++) { const s = new THREE.Sprite(glow); s.position.set(-8 + k * 1.07, 3.7 - Math.sin((k / 15) * Math.PI) * 0.4, 1.5); s.scale.set(0.3, 0.3, 1); G.add(s); }

    // ---------------------------------------------------------------- audience: red couches on the left, blue on the right
    const TEAM_COL = ['#ff5c6a', '#4f8cff'], TEAM_NAME = ['Red', 'Blue'];
    L.TEAM_COL = TEAM_COL; L.TEAM_NAME = TEAM_NAME;
    const SEATS = [[], []];
    for (const team of [0, 1]) {
      const sx = team === 0 ? -1 : 1, fab = lam(team === 0 ? 0xb83a4a : 0x3a5ab8), dark = lam(team === 0 ? 0x8a2a36 : 0x2a428a);
      for (const [row, z] of [[0, 1.4], [1, 3.6]]) {
        const cx = sx * 3.6;
        addBox(G, 4.2, 0.45, 0.9, fab, cx, 0.225, z);
        addBox(G, 4.2, 0.85, 0.25, dark, cx, 0.42, z + 0.4);
        for (const ax of [-1, 1]) addBox(G, 0.25, 0.65, 0.9, dark, cx + ax * 2.0, 0.33, z);
        for (const k of [-1.3, 0, 1.3]) SEATS[team].push(new V3(cx + k, 0, z + 0.05));
        void row;
      }
    }
    L.SEATS = SEATS;
    // a popcorn cart, because of course
    addBox(G, 0.9, 0.9, 0.6, lam(0xc23b4a), -8.6, 0.45, 6.6);
    const pc = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.45), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    pc.position.set(-8.6, 1.2, 6.6); G.add(pc);
    for (let k = 0; k < 30; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), lam(0xfff2c8)); p.position.set(-8.6 + (rand() - 0.5) * 0.6, 0.95 + rand() * 0.35, 6.6 + (rand() - 0.5) * 0.35); G.add(p); }
    for (const [x, z] of [[-9.2, -6.8], [9.2, -6.8], [9.2, 7.2]]) {
      addCyl(G, 0.3, 0.24, 0.55, 10, lam(0xc46a3a), x, 0.275, z);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), lam(0x4e8a3a)); leaf.position.set(x, 1.0, z); leaf.scale.set(1, 1.3, 1); G.add(leaf);
    }

    // ---------------------------------------------------------------- the card dispenser and a stand for the pens
    const DISP = new V3(-3.2, 0, -5.0);
    L.DISP = DISP;
    addBox(G, 0.7, 1.0, 0.5, lam(0x2b2d42), DISP.x, 0.5 + 0.12, DISP.z);
    addBox(G, 0.6, 0.06, 0.4, lam(0xffd23f), DISP.x, 1.15, DISP.z);
    makePlate(G, 'Draw a card', 0.9, 0.18, new V3(DISP.x, 1.42, DISP.z + 0.02), 0, { bg: '#2b2d42', fg: '#ffd23f', size: 0.6 });
    // a little stack of cards on top
    for (let k = 0; k < 6; k++) addBox(G, 0.3, 0.008, 0.2, lam(k % 2 ? 0xf4f2ec : 0xe8e4d8), DISP.x, 1.19 + k * 0.009, DISP.z);
    const PEN_STAND = new V3(3.0, 0, -4.6);
    addBox(G, 0.8, 0.9, 0.5, lam(0x2b2d42), PEN_STAND.x, 0.45 + 0.12, PEN_STAND.z);
    makePlate(G, '3D pens', 0.7, 0.16, new V3(PEN_STAND.x, 1.28, PEN_STAND.z + 0.02), 0, { bg: '#2b2d42', fg: '#8bd450', size: 0.6 });
    L.PEN_STAND = PEN_STAND;
    // the big board over the stage, and a guess board on the side wall
    L.board = makeBoard(G, 720, 460, 3.6, 2.3, 0, 2.95, -7.35, 0);
    const guessBoard = makeBoard(G, 720, 500, 2.4, 1.67, R.minX + 0.2, 2.2, 0.5, Math.PI / 2);
    L.guessBoard = guessBoard;
    makeKiosk(L, 8.4, 5.6, -Math.PI * 0.75);
    const sign = makeBoard(G, 720, 500, 2.2, 1.53, R.maxX - 0.2, 2.1, 0.5, -Math.PI / 2);
    function drawSign() {
      const g = sign.g, W = 720;
      g.fillStyle = '#241a2c'; g.fillRect(0, 0, W, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Charades', 36, 76);
      let y = 120;
      for (const [label, body] of [
        ['Acting', 'On your turn, take a card from the dispenser. Act it out, or draw in the air with a 3D pen. Press Got it! when your team says it.'],
        ['Guessing', 'Shout it out with voice chat, or type a guess in a browser (press Enter). The category is on the big board.'],
        ['The pen', 'VR: grab a pen, hold the trigger to draw; A or X changes colour, B or Y undoes. Browser: E takes a pen, hold Space to draw, R colour, Z undo.'],
      ]) {
        g.fillStyle = '#ff9ad0'; g.font = `700 24px ${BODY}`; g.fillText(label, 36, y); y += 31;
        g.fillStyle = '#f2e8f8'; g.font = `400 24px ${BODY}`; y = wrapText(g, body, 36, y, 648, 30) + 10;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);

    // ================================================================ 3D PENS: draw in the air
    // Each player's drawing is a log of points and pen-lifts. Everyone gets a rolling window of the newest
    // entries, so drawings stay small on the network however much you draw.
    const PEN_COLORS = ['#ff4d6a', '#ffd23f', '#4fc3f7', '#8bd450', '#b388ff', '#ffffff'];
    const PEN_NAMES = ['Red', 'Yellow', 'Blue', 'Green', 'Purple', 'White'];
    const BRK = 99999, UNDO = 99998, WINDOW = 120, MAX_POINTS = 1800, STEP = 0.022;
    TOOL_MESH.pen = () => {
      const g = new THREE.Group();
      const bodyM = new THREE.MeshLambertMaterial({ color: 0xf4f2ec, emissive: 0x000000 });
      const capM = new THREE.MeshLambertMaterial({ color: 0x2b2d42, emissive: 0x000000 });
      const tipM = new THREE.MeshBasicMaterial({ color: PEN_COLORS[0] });
      const body = new THREE.Mesh(cyl(0.013, 0.013, 0.13, 10), bodyM); body.rotation.x = Math.PI / 2; body.position.z = -0.05;
      const cap = new THREE.Mesh(cyl(0.014, 0.014, 0.03, 10), capM); cap.rotation.x = Math.PI / 2; cap.position.z = 0.03;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 10), tipM); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.13;
      g.add(body, cap, tip);
      g.userData.mats = [bodyM, capM];
      g.userData.tip = tipM;
      return g;
    };
    const pens = [];
    for (let k = 0; k < 4; k++) pens.push(makeTool(L, new V3(PEN_STAND.x - 0.3 + k * 0.2, 1.06, PEN_STAND.z), new Q4(), 'pen'));
    // two more on the coffee tables by the couches, for doodling while you watch
    for (const sx of [-1, 1]) {
      addBox(G, 0.8, 0.45, 0.5, lam(0x5a3a28), sx * 3.6, 0.225, -0.2);
      pens.push(makeTool(L, new V3(sx * 3.6, 0.5, -0.2), new Q4(), 'pen'));
    }
    L.pens = pens;

    // ---------------------------------------------------------------- what's drawn, by whom
    const drawings = new Map();   // peer -> { gen, seen, strokes: [{ c, pts: [V3] }] }
    const mine = { gen: 1, log: [], base: 0, color: 0, drawing: false, hand: null, last: null, points: 0 };
    L.myDrawing = mine;
    L.drawings = drawings;
    const myStrokes = () => { let d = drawings.get(state.myPeer); if (!d) { d = { gen: mine.gen, seen: 0, strokes: [] }; drawings.set(state.myPeer, d); } return d; };
    let dirty = true;
    function pushEntry(e) { mine.log.push(e); if (mine.log.length > WINDOW * 3) { const cut = mine.log.length - WINDOW * 2; mine.log.splice(0, cut); mine.base += cut; } forcePresence(); }
    function penStart() {
      if (mine.points >= MAX_POINTS) { showToast('Your drawing is full. Clear it to draw more'); return; }
      mine.drawing = true; mine.last = null;
      pushEntry([BRK, mine.color, 0]);
      myStrokes().strokes.push({ c: mine.color, pts: [] });
    }
    function penStop() { mine.drawing = false; mine.last = null; }
    function penPoint(p) {
      if (!mine.drawing || mine.points >= MAX_POINTS) return;
      if (mine.last && mine.last.distanceTo(p) < STEP) return;
      const q = [Math.round(p.x * 100), Math.round(p.y * 100), Math.round(p.z * 100)];
      pushEntry(q);
      const s = myStrokes().strokes;
      if (!s.length) s.push({ c: mine.color, pts: [] });
      s[s.length - 1].pts.push(new V3(q[0] / 100, q[1] / 100, q[2] / 100));
      mine.last = p.clone();
      mine.points += 1;
      dirty = true;
    }
    function penUndo() {
      const s = myStrokes().strokes;
      if (!s.length) return;
      const gone = s.pop();
      mine.points -= gone.pts.length;
      pushEntry([UNDO, 0, 0]);
      dirty = true;
      tone(500, 300, 0.08, 'triangle', 0.1);
    }
    function clearMine() {
      mine.gen += 1; mine.log = []; mine.base = 0; mine.points = 0; mine.drawing = false;
      const d = myStrokes(); d.strokes = []; d.gen = mine.gen;
      dirty = true;
      forcePresence();
    }
    L.clearMyDrawing = clearMine;
    function nextColor() {
      mine.color = (mine.color + 1) % PEN_COLORS.length;
      for (const t of pens) if (t.held && t.held.peer === state.myPeer) t.g.children[0].userData.tip.color.set(PEN_COLORS[mine.color]);
      showToast(`Pen: ${PEN_NAMES[mine.color]}`);
      tone(700 + mine.color * 90, 0, 0.06, 'sine', 0.1);
    }

    // ---------------------------------------------------------------- drawing it: thin tubes, one batch per colour
    const segGeo = new THREE.CylinderGeometry(0.016, 0.016, 1, 6, 1, true);   // thick enough to read from the couches
    segGeo.translate(0, 0.5, 0);
    const CAP = 3000;
    const batches = PEN_COLORS.map((c) => { const m = new THREE.InstancedMesh(segGeo, new THREE.MeshBasicMaterial({ color: c }), CAP); m.count = 0; m.frustumCulled = false; G.add(m); return m; });
    const _m4 = new THREE.Matrix4(), _q4 = new Q4(), _sc = new V3(), _dir = new V3();
    const YUP = new V3(0, 1, 0);
    function rebuild() {
      const n = PEN_COLORS.map(() => 0);
      for (const d of drawings.values()) for (const s of d.strokes) {
        const b = batches[s.c] || batches[0], ci = s.c in n ? s.c : 0;
        for (let i = 1; i < s.pts.length && n[ci] < CAP; i++) {
          const a = s.pts[i - 1], c = s.pts[i];
          _dir.subVectors(c, a);
          const len = _dir.length();
          if (len < 1e-4) continue;
          _q4.setFromUnitVectors(YUP, _dir.multiplyScalar(1 / len));
          _m4.compose(a, _q4, _sc.set(1, len, 1));
          b.setMatrixAt(n[ci]++, _m4);
        }
      }
      batches.forEach((b, i) => { b.count = n[i]; b.instanceMatrix.needsUpdate = true; });
      dirty = false;
    }

    // ---------------------------------------------------------------- holding a pen
    const myPen = () => pens.find((t) => t.held && t.held.peer === state.myPeer);
    const _tip = new V3(), _cq = new Q4(), _cp = new V3(), _fw = new V3();
    function tipOf(t, out) { return out.set(0, 0, -0.15).applyQuaternion(t.quat).add(t.pos); }
    L.onTrigger = (t) => { if (t.kind === 'pen') penStart(); };
    L.onTriggerEnd = (t) => { if (t.kind === 'pen') penStop(); };
    L.onToolGrab = (t) => { if (t.kind === 'pen') t.g.children[0].userData.tip.color.set(PEN_COLORS[mine.color]); };
    // browser: the pen sits in front of you; hold Space to draw where you're looking
    L.deskSwing = () => { if (myPen()) penStart(); };
    L.deskRelease = () => penStop();
    L.deskHand = (side, mh) => {
      if (state.mode !== 'flat') return false;
      const t = pens.find((x) => x.held && x.held.peer === state.myPeer && x.held.side === side);
      if (!t) return false;
      camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
      mh.pos.set(0.14, -0.16, -0.34).applyQuaternion(_cq).add(_cp);
      _fw.set(0, 0, -1.3).applyQuaternion(_cq).add(_cp).sub(mh.pos).normalize();
      mh.quat.setFromUnitVectors(FWD, _fw);
      mh.ok = true;
      return true;
    };
    const btnPrev = { left: [false, false], right: [false, false] };
    function penUpdate(dt, now) {
      const t = myPen();
      if (!t) { mine.drawing = false; }
      else if (mine.drawing) {
        if (state.mode === 'vr') penPoint(tipOf(t, _tip));
        else { camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp); penPoint(_tip.set(0, 0, -1.3).applyQuaternion(_cq).add(_cp)); }
      }
      // VR: A or X changes colour, B or Y undoes, on the hand holding the pen
      if (t && state.mode === 'vr') {
        const side = t.held.side, gp = vrHands[side].source && vrHands[side].source.gamepad;
        const b4 = !!(gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed), b5 = !!(gp && gp.buttons && gp.buttons[5] && gp.buttons[5].pressed);
        if (b4 && !btnPrev[side][0]) nextColor();
        if (b5 && !btnPrev[side][1]) penUndo();
        btnPrev[side] = [b4, b5];
      }
      if (dirty) rebuild();
    }
    L.onKey = (code) => {
      if (state.mode !== 'flat') return;
      if (code === 'KeyR' && myPen()) nextColor();
      else if (code === 'KeyZ') penUndo();
    };

    // ---------------------------------------------------------------- sync
    function drawPresence() {
      const start = Math.max(0, mine.log.length - WINDOW);
      const flat = [];
      for (let i = start; i < mine.log.length; i++) flat.push(...mine.log[i]);
      return [mine.gen, mine.base + start, ...flat];
    }
    function readDrawing(peer, a) {
      if (peer === state.myPeer) return;   // never replay my own drawing back onto itself
      if (!Array.isArray(a) || a.length < 2 || (a.length - 2) % 3 !== 0 || !a.every((x) => Number.isInteger(x) && Math.abs(x) < 1e7)) return;
      let d = drawings.get(peer);
      if (!d) { d = { gen: a[0], seen: 0, strokes: [] }; drawings.set(peer, d); }
      if (d.gen !== a[0]) { d.gen = a[0]; d.seen = 0; d.strokes = []; dirty = true; }
      const start = a[1], n = (a.length - 2) / 3;
      for (let k = 0; k < n; k++) {
        const idx = start + k;
        if (idx < d.seen) continue;
        const e0 = a[2 + k * 3], e1 = a[3 + k * 3], e2 = a[4 + k * 3];
        if (e0 === BRK) d.strokes.push({ c: clamp(e1, 0, PEN_COLORS.length - 1), pts: [] });
        else if (e0 === UNDO) d.strokes.pop();
        else {
          if (!d.strokes.length) d.strokes.push({ c: 0, pts: [] });
          const s = d.strokes[d.strokes.length - 1];
          if (s.pts.length < MAX_POINTS) s.pts.push(new V3(e0 / 100, e1 / 100, e2 / 100));
        }
        d.seen = idx + 1;
        dirty = true;
      }
    }
    L.readDrawing = readDrawing;
    function forgetDrawingsOfAbsent() {
      for (const peer of Array.from(drawings.keys())) {
        if (peer === state.myPeer) continue;
        const rec = remotes.get(peer);
        if (!rec || rec.lv !== L.idx) { drawings.delete(peer); dirty = true; }
      }
    }
    L.update = (dt, now) => { penUpdate(dt, now); if (now - (L._forgetT || 0) > 1000) { L._forgetT = now; forgetDrawingsOfAbsent(); } };
    L.presence = () => ({ chd: drawPresence() });
    L.readPresence = (rec, pres) => { if (pres.chd) readDrawing(rec.peer, pres.chd); };
    L.penInternals = { penStart, penStop, penPoint, penUndo, nextColor, clearMine, PEN_COLORS };

    // ================================================================ THE GAME: teams, rounds, secret cards, guesses
    const ACT_S = 90, PICK_S = 25, REVEAL_S = 5, FINAL_S = 10;
    const EVC = { START: 1, UP: 2, GOT: 3, TIMEUP: 4, FINAL: 5, ENDED: 6, SKIP: 7 };
    const CH = { gid: 0, ph: 0, round: 0, maxRounds: 6, actor: '', team: 0, endAt: 0, cat: -1, word: '', score: [0, 0], teams: new Map(), order: [[], []], turn: [0, 0], ev: [0, 0, '', ''], guessedBy: '' };
    L.ch = CH;
    const me = { card: null, used: new Set(), skips: 0, guessSeq: 0, guess: null, req: null, reqSeq: 0, reports: [], repSeq: 0, lastPh: -1, lastRound: 0 };
    L.chMe = me;
    const herePeersCH = () => {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    };
    const chHost = () => herePeersCH()[0] === state.myPeer;
    const nameOfCH = (p) => (p === state.myPeer ? state.name : (remotes.get(p) || {}).name || 'Someone');
    const myTeam = () => (CH.teams.has(state.myPeer) ? CH.teams.get(state.myPeer) : -1);
    const iAmActor = () => CH.actor === state.myPeer && (CH.ph === 1 || CH.ph === 2);

    // ---------------------------------------------------------------- matching a guess against the card
    const STOP = new Set(['a', 'an', 'the', 'some', 'someone', 'person', 'is', 'its', 'it', 'of', 'to', 'my', 'your']);
    const normCH = (s) => String(s).toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
    const stemCH = (w) => (w.length > 5 && w.endsWith('ing') ? w.slice(0, -3) : w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
    function lev(a, b) {
      if (Math.abs(a.length - b.length) > 3) return 9;
      const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
      for (let j = 1; j <= b.length; j++) d[0][j] = j;
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      return d[a.length][b.length];
    }
    function guessMatches(guess, word, keys) {
      const g = normCH(guess), w = normCH(word);
      if (!g || !w) return false;
      // a silly card: say the key words (in any order, typos forgiven) or the whole phrase
      if (keys && keys.length) {
        if (g === w) return true;
        const gw = g.split(' ').map(stemCH);
        return keys.every((kw) => { const x = stemCH(normCH(kw)); return gw.some((y) => y === x || (x.length >= 5 && lev(x, y) <= 1) || (x.length >= 8 && lev(x, y) <= 2)); });
      }
      if (g === w || lev(g, w) <= (w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0)) return true;
      const gw = g.split(' ').filter((x) => !STOP.has(x)).map(stemCH);
      const ww = w.split(' ').filter((x) => !STOP.has(x)).map(stemCH);
      return ww.length > 0 && ww.every((x) => gw.some((y) => y === x || (x.length >= 6 && lev(x, y) <= 1)));
    }
    L.guessMatches = guessMatches;

    // ---------------------------------------------------------------- rules (host)
    function announceCH(code, a, b) { CH.ev = [CH.ev[0] + 1, code, a || '', b || '']; showEventCH(CH.ev); forcePresence(); }
    function balanceTeams() {
      const here = herePeersCH();
      for (const p of Array.from(CH.teams.keys())) if (!here.includes(p)) CH.teams.delete(p);
      for (const p of here) if (!CH.teams.has(p)) { const n0 = [...CH.teams.values()].filter((t) => t === 0).length, n1 = CH.teams.size - n0; CH.teams.set(p, n0 <= n1 ? 0 : 1); }
      CH.order = [here.filter((p) => CH.teams.get(p) === 0), here.filter((p) => CH.teams.get(p) === 1)];
    }
    function nextActor(team) {
      const list = CH.order[team].length ? CH.order[team] : CH.order[1 - team];
      const t = CH.order[team].length ? team : 1 - team;
      const p = list[CH.turn[t] % list.length];
      CH.turn[t] += 1;
      return { p, t };
    }
    function startRoundCH(now) {
      balanceTeams();
      const { p, t } = nextActor(CH.round % 2 === 1 ? 1 : 0);
      Object.assign(CH, { actor: p, team: t, ph: 1, endAt: now + PICK_S * 1000, cat: -1, word: '', guessedBy: '' });
      CH.round += 1;
      announceCH(EVC.UP, p, String(t));
    }
    function startGameCH(now) {
      balanceTeams();
      Object.assign(CH, { gid: CH.gid + 1, round: 0, score: [0, 0], turn: [0, 0], maxRounds: Math.max(6, Math.min(12, herePeersCH().length * 2)) });
      announceCH(EVC.START, '', '');
      startRoundCH(now);
    }
    function endRoundCH(now, guesser) {
      CH.ph = 3; CH.endAt = now + REVEAL_S * 1000; CH.guessedBy = guesser || '';
      if (guesser !== undefined && guesser !== null) { CH.score[CH.team] += 1; announceCH(EVC.GOT, guesser, String(CH.team)); }
      else announceCH(EVC.TIMEUP, '', '');
    }
    function hostReport(from, r) {
      // reports come from the actor's page: [seq, code, value]
      if (from !== CH.actor) return;
      const now = performance.now();
      if (r[1] === 1 && CH.ph === 1) { CH.cat = clamp(r[2] | 0, 0, CATS.length - 1); CH.ph = 2; CH.endAt = now + ACT_S * 1000; forcePresence(); }
      else if (r[1] === 2 && CH.ph === 2) endRoundCH(now, typeof r[2] === 'string' && r[2] ? r[2] : '');
      else if (r[1] === 3 && CH.ph === 2) { CH.cat = clamp(r[2] | 0, 0, CATS.length - 1); announceCH(EVC.SKIP, CH.actor, ''); }
      else if (r[1] === 4 && (CH.ph === 3 || CH.ph === 2) && typeof r[2] === 'string') { CH.word = r[2].slice(0, 40); forcePresence(); }
    }
    function hostRequestCH(from, req) {
      if (!Array.isArray(req) || req.length !== 3 || req[1] !== CH.gid) return;
      const now = performance.now();
      if (req[0] === 1 && (CH.ph === 0 || CH.ph === 4)) startGameCH(now);
      else if (req[0] === 2 && (CH.ph === 1 || CH.ph === 2 || CH.ph === 3)) { CH.ph = 0; announceCH(EVC.ENDED, '', ''); }
      else if (req[0] === 3 && (CH.ph === 0 || CH.ph === 4)) { balanceTeams(); CH.teams.set(from, 1 - (CH.teams.get(from) || 0)); balanceTeams(); forcePresence(); state.dirtyBoard = true; }
    }
    function hostTickCH(now) {
      if (me.req && me.req.join() !== me.lastOwnReq) { me.lastOwnReq = me.req.join(); hostRequestCH(state.myPeer, me.req); }
      for (const r of me.reports) if (r[0] > (me.ownRepSeen || 0)) { me.ownRepSeen = r[0]; hostReport(state.myPeer, r); }
      if (CH.ph === 0 || CH.ph === 4) { balanceTeams(); if (CH.ph === 4 && now > CH.endAt) { CH.ph = 0; forcePresence(); } return; }
      // the actor left: move on
      if (!herePeersCH().includes(CH.actor)) { endRoundCH(now, null); return; }
      if (CH.ph === 1 && now > CH.endAt) { CH.endAt = now + 3000; }   // the actor's page will draw for them
      if (CH.ph === 2 && now > CH.endAt) endRoundCH(now, null);
      if (CH.ph === 3 && now > CH.endAt) {
        if (CH.round >= CH.maxRounds) { CH.ph = 4; CH.endAt = now + FINAL_S * 1000; announceCH(EVC.FINAL, '', ''); }
        else startRoundCH(now);
      }
    }

    // ---------------------------------------------------------------- the actor's side: drawing a card, skipping, got it
    function report(code, value) {
      me.reports.push([++me.repSeq, code, value]);
      if (me.reports.length > 4) me.reports.shift();
      forcePresence();
    }
    function drawCard() {
      if (!iAmActor()) { showToast(CH.ph === 0 ? 'Start a game first' : 'It\u2019s not your turn to act'); return; }
      // truly random, and not one you've had recently (remembered between visits)
      let recent = [];
      try { recent = JSON.parse(localStorage.getItem('field-day-charades-recent') || '[]'); } catch (e) { recent = []; }
      if (!Array.isArray(recent)) recent = [];
      let cat, entry, tries = 0;
      do { cat = Math.floor(Math.random() * CATS.length); const list = PROMPTS[CATS[cat]]; entry = list[Math.floor(Math.random() * list.length)]; tries++; } while ((me.used.has(entry) || recent.includes(entry)) && tries < 80);
      me.used.add(entry);
      recent.push(entry); if (recent.length > 60) recent = recent.slice(-60);
      try { localStorage.setItem('field-day-charades-recent', JSON.stringify(recent)); } catch (e) { /* fine */ }
      const [word, keyText] = entry.split('|');
      me.card = { cat, word, keys: keyText ? keyText.split(' ') : [] };
      drawCardFace();
      sfx('click', 0.8);
      if (CH.ph === 1) report(1, cat); else report(3, cat);
      showToast(`Your card: ${word}`);
    }
    function skipCard() {
      if (!iAmActor() || CH.ph !== 2) return;
      if (me.skips >= 2) { showToast('No skips left this turn'); return; }
      me.skips += 1;
      drawCard();
    }
    function gotIt(guesser) {
      if (!iAmActor() || CH.ph !== 2 || !me.card) return;
      report(2, guesser || state.myPeer);
      report(4, me.card.word);
    }
    L.chActions = { drawCard, skipCard, gotIt };

    // the card: its face for the actor, its back for everyone else
    const cardFace = canvasTexture(512, 320);
    function drawCardFace() {
      const g = cardFace.g;
      g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, 512, 320);
      g.fillStyle = '#c23b4a'; g.fillRect(0, 0, 512, 64);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffffff'; g.font = `700 34px ${BODY}`; g.fillText(me.card ? CATS[me.card.cat] : '', 256, 34);
      // the phrase, wrapped onto as many lines as it needs
      g.fillStyle = '#1b1932'; g.font = `800 44px ${DISPLAY}`;
      const words = (me.card ? me.card.word : '').split(' '), lines = [];
      let line = '';
      for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 470 && line) { lines.push(line); line = w; } else line = t; }
      if (line) lines.push(line);
      const top = 190 - ((lines.length - 1) * 50) / 2;
      lines.forEach((l, k) => g.fillText(l, 256, top + k * 50, 480));
      cardFace.tex.needsUpdate = true;
    }
    const cardBackTex = canvasTexture(256, 160, (g) => { g.fillStyle = '#c23b4a'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#ffd23f'; g.font = `800 90px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 128, 84); }).tex;
    const myCard = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.125), new THREE.MeshBasicMaterial({ map: cardFace.tex, side: THREE.DoubleSide }));
    myCard.visible = false; scene.add(myCard);
    const otherCard = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.125), new THREE.MeshBasicMaterial({ map: cardBackTex, side: THREE.DoubleSide }));
    otherCard.visible = false; G.add(otherCard);

    // ---------------------------------------------------------------- guessing (browser: type and press Enter)
    const guessBox = document.createElement('input');
    guessBox.type = 'text'; guessBox.maxLength = 40; guessBox.placeholder = 'Type a guess and press Enter';
    guessBox.setAttribute('aria-label', 'Your guess');
    Object.assign(guessBox.style, { position: 'absolute', left: '50%', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', width: 'min(420px, 80vw)', padding: '10px 14px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.4)', background: 'rgba(20,16,32,0.85)', color: '#fff', font: `500 18px ${BODY}`, display: 'none', zIndex: '4', pointerEvents: 'auto' });
    (ui.hud || document.body).appendChild(guessBox);
    guessBox.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const t = guessBox.value.trim(); if (t) sendGuess(t); guessBox.value = ''; }
      else if (e.key === 'Escape') guessBox.blur();
    });
    function sendGuess(text) {
      me.guess = [++me.guessSeq, text.slice(0, 40)];
      bubbleFor(state.myPeer, text, performance.now());
      addGuessFeed(state.myPeer, text, false);
      forcePresence();
    }
    L.sendGuess = sendGuess;
    // speech bubbles over people's heads
    const bubbles = new Map();
    function bubbleFor(peer, text, now) {
      let b = bubbles.get(peer);
      if (!b) { const c = canvasTexture(512, 128); b = { c, s: new THREE.Sprite(new THREE.SpriteMaterial({ map: c.tex, transparent: true, depthWrite: false })), until: 0 }; b.s.scale.set(0.9, 0.225, 1); G.add(b.s); bubbles.set(peer, b); }
      const g = b.c.g;
      g.clearRect(0, 0, 512, 128);
      rr(g, 6, 8, 500, 96, 40); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
      g.beginPath(); g.moveTo(230, 104); g.lineTo(256, 124); g.lineTo(282, 104); g.fill();
      g.fillStyle = '#1b1932'; g.font = `700 40px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 58, 470);
      b.c.tex.needsUpdate = true;
      b.until = now + 4500;
    }
    const feed = [];
    function addGuessFeed(peer, text, ok) { feed.push({ who: nameOfCH(peer), text, ok, team: CH.teams.get(peer) }); if (feed.length > 9) feed.shift(); drawGuessBoard(); }
    function drawGuessBoard() {
      const g = guessBoard.g, W = 720;
      g.fillStyle = '#241a2c'; g.fillRect(0, 0, W, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 50px ${DISPLAY}`; g.fillText('Guesses', 32, 64);
      feed.forEach((f, i) => {
        const y = 118 + i * 42;
        g.fillStyle = f.team === 1 ? '#6a9aff' : f.team === 0 ? '#ff7a86' : '#d8c8e8'; g.font = `700 26px ${BODY}`; g.fillText(f.who, 32, y, 220);
        g.fillStyle = f.ok ? '#8bd450' : '#f2e8f8'; g.font = `${f.ok ? 800 : 400} 28px ${BODY}`; g.fillText(`${f.text}${f.ok ? '  \u2714' : ''}`, 270, y, 420);
      });
      guessBoard.tex.needsUpdate = true;
    }
    drawGuessBoard();

    // ---------------------------------------------------------------- what happened, for everyone
    function showEventCH(ev) {
      const [, code, a, b] = ev;
      if (code === EVC.START) { showToast('Charades! Teams are on the board'); sfx('fanfare', 0.6); }
      else if (code === EVC.UP) { const t = Number(b); showToast(a === state.myPeer ? 'You\u2019re up! Draw a card at the dispenser' : `${TEAM_NAME[t]} team: ${nameOfCH(a)} is acting`); sfx('chime', 0.7); }
      else if (code === EVC.GOT) { showToast(`${a === CH.actor ? 'Got it' : nameOfCH(a) + ' got it'}! Point to ${TEAM_NAME[Number(b)]}`); sfx('cheer', 0.8); }
      else if (code === EVC.TIMEUP) { showToast('Time\u2019s up!'); sfx('buzzer', 0.6); }
      else if (code === EVC.SKIP) showToast(`${nameOfCH(a)} skipped a card`);
      else if (code === EVC.FINAL) { const [r, bl] = CH.score; showToast(r === bl ? `It\u2019s a tie, ${r} to ${bl}!` : `${r > bl ? 'Red' : 'Blue'} team wins ${Math.max(r, bl)} to ${Math.min(r, bl)}!`); sfx('fanfare', 0.9); }
      else if (code === EVC.ENDED) showToast('Charades ended');
      state.dirtyBoard = true; state.hudDirty = true;
    }

    // ---------------------------------------------------------------- per frame
    const _hp = new V3();
    function seatMe() {
      camera.getWorldPosition(_hp);
      let spot, yaw = 0;
      if (iAmActor()) spot = new V3(0, 0, -4.4);
      else {
        const t = myTeam() < 0 ? 0 : myTeam();
        const idx = Math.max(0, CH.order[t].indexOf(state.myPeer));
        spot = SEATS[t][idx % SEATS[t].length];
      }
      dolly.position.x += spot.x - _hp.x; dolly.position.z += spot.z - _hp.z;
      if (state.mode !== 'vr') { state.yaw = iAmActor() ? Math.PI : yaw; state.pitch = -0.05; }
    }
    const baseUpdateCH = L.update, basePresenceCH = L.presence, baseReadCH = L.readPresence;
    L.update = (dt, now) => {
      baseUpdateCH(dt, now);
      if (chHost()) hostTickCH(now);
      // new round or phase: take your place, tidy up
      if (CH.round !== me.lastRound) {
        me.lastRound = CH.round;
        me.card = null; me.skips = 0; clearMine();
        if ((CH.ph === 1 || CH.ph === 2) && state.mode !== 'menu') seatMe();
      }
      if (CH.ph !== me.lastPh) {
        if (CH.ph === 3 && CH.actor === state.myPeer && me.card) report(4, me.card.word);
        me.lastPh = CH.ph;
        state.hudDirty = true; state.dirtyBoard = true;
      }
      // the actor's page draws a card for them if they dawdle
      if (CH.ph === 1 && iAmActor() && !me.card && now > CH.endAt) drawCard();
      // cards in hands
      const actorRec = remotes.get(CH.actor);
      myCard.visible = iAmActor() && !!me.card && state.level === L.idx;
      if (myCard.visible) {
        const hand = myHands.left.ok && state.mode === 'vr' ? myHands.left : null;
        if (hand) { myCard.position.set(0, 0.06, -0.06).applyQuaternion(hand.quat).add(hand.pos); camera.getWorldQuaternion(_cqCH); myCard.quaternion.copy(_cqCH); }
        else { camera.getWorldQuaternion(_cqCH); camera.getWorldPosition(_hp); myCard.position.set(-0.17, -0.12, -0.4).applyQuaternion(_cqCH).add(_hp); myCard.quaternion.copy(_cqCH); }
      }
      otherCard.visible = !!actorRec && CH.actor !== state.myPeer && CH.ph === 2 && actorRec.hasL;
      if (otherCard.visible) { otherCard.position.copy(actorRec.cur.l.pos).add(_hp.set(0, 0.08, 0)); otherCard.quaternion.copy(actorRec.cur.l.quat); }
      // bubbles follow heads and fade
      for (const [peer, b] of bubbles) {
        const head = peer === state.myPeer ? null : remotes.get(peer);
        b.s.visible = now < b.until && (peer !== state.myPeer) && head && head.lv === L.idx && head.hasH;
        if (b.s.visible) b.s.position.copy(head.cur.h.pos).add(_hp.set(0, 0.55, 0));
      }
      // the guess box shows for guessers during a turn
      const guessing = state.mode === 'flat' && state.level === L.idx && CH.ph === 2 && !iAmActor();
      guessBox.style.display = guessing ? 'block' : 'none';
      if (!guessing && document.activeElement === guessBox) guessBox.blur();
      updateStatusCH(now);
      if (now - (L._boardT || 0) > 250) { L._boardT = now; state.dirtyBoard = true; }
    };
    const _cqCH = new Q4();
    let statusKeyCH = '';
    function updateStatusCH(now) {
      if (!ui.status) return;
      const show = state.mode === 'flat' && state.level === L.idx && CH.ph > 0;
      if (!show) { if (statusKeyCH) { ui.status.hidden = true; statusKeyCH = ''; } return; }
      const n = Math.max(0, Math.ceil((CH.endAt - now) / 1000));
      const a = `Red ${CH.score[0]}, Blue ${CH.score[1]}`;
      const b = CH.ph === 1 ? (iAmActor() ? 'Draw a card!' : `${nameOfCH(CH.actor)} is choosing`) : CH.ph === 2 ? `${CATS[CH.cat] || ''} \u00b7 ${n}s` : CH.ph === 3 ? (CH.word ? `It was: ${CH.word}` : 'Round over') : 'Final';
      const c = iAmActor() && me.card ? `Your card: ${me.card.word}` : '';
      const key = `${a}|${b}|${c}`;
      if (key === statusKeyCH) return;
      statusKeyCH = key;
      ui.status.hidden = false;
      ui.status.replaceChildren();
      for (const [txt, col] of [[a, '#ffd23f'], [b, null], [c, '#8bd450']]) { if (!txt) continue; const s = document.createElement('span'); s.textContent = txt; if (col) s.style.color = col; ui.status.append(s); }
    }

    // ---------------------------------------------------------------- the big board
    L.rowFor = (st, isMe) => { const t = isMe ? myTeam() : (st.chTeam ?? -1); return { team: t, text: t < 0 ? '' : TEAM_NAME[t] }; };
    L.sortRows = (a, b) => (a.team - b.team);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460, now = performance.now();
      g.fillStyle = '#241a2c'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      // scores
      g.font = `800 64px ${DISPLAY}`;
      g.fillStyle = TEAM_COL[0]; g.fillText(String(CH.score[0]), 110, 70);
      g.fillStyle = TEAM_COL[1]; g.fillText(String(CH.score[1]), W - 110, 70);
      g.font = `700 24px ${BODY}`; g.fillStyle = TEAM_COL[0]; g.fillText('RED', 110, 118); g.fillStyle = TEAM_COL[1]; g.fillText('BLUE', W - 110, 118);
      g.fillStyle = '#ffd23f'; g.font = `800 54px ${DISPLAY}`; g.fillText('Charades', W / 2, 70);
      let big = '', small = '';
      if (CH.ph === 0) { big = 'Press Start game'; small = `${herePeersCH().length} here \u00b7 teams pick themselves`; }
      else if (CH.ph === 1) { big = `${nameOfCH(CH.actor)} is up`; small = `${TEAM_NAME[CH.team]} team \u00b7 drawing a card`; }
      else if (CH.ph === 2) { big = CATS[CH.cat] || ''; small = `${nameOfCH(CH.actor)} is acting for ${TEAM_NAME[CH.team]} \u00b7 ${Math.max(0, Math.ceil((CH.endAt - now) / 1000))}s`; }
      else if (CH.ph === 3) { big = CH.word ? `It was: ${CH.word}` : 'Round over'; small = CH.guessedBy ? `${CH.guessedBy === CH.actor ? 'Got it' : nameOfCH(CH.guessedBy) + ' got it'}!` : 'Time ran out'; }
      else { const [r, b] = CH.score; big = r === b ? 'A tie!' : `${r > b ? 'Red' : 'Blue'} wins!`; small = `${r} to ${b}`; }
      g.fillStyle = '#ffffff'; g.font = `800 72px ${DISPLAY}`; g.fillText(big, W / 2, 230, W - 80);
      g.fillStyle = '#d8c8e8'; g.font = `400 30px ${BODY}`; g.fillText(small, W / 2, 300, W - 80);
      if (CH.ph >= 1 && CH.ph <= 3) { g.fillStyle = '#9a8ab0'; g.font = `400 24px ${BODY}`; g.fillText(`Round ${CH.round} of ${CH.maxRounds}`, W / 2, 380); }
      void rows;
      L.board.tex.needsUpdate = true;
    };

    // ---------------------------------------------------------------- buttons
    function request(kind) { me.req = [kind, CH.gid, ++me.reqSeq]; if (chHost()) { me.lastOwnReq = me.req.join(); hostRequestCH(state.myPeer, me.req); } forcePresence(); }
    makeButton(L, new V3(DISP.x + 0.7, 1.0, DISP.z + 0.1), 0xffd23f, 'Draw a card', () => drawCard(), { faceYaw: 0 });
    // these sit at the front of the stage and face back toward the actor
    makeButton(L, new V3(1.4, 1.0, -3.6), 0x8bd450, 'Got it!', () => gotIt(), { faceYaw: Math.PI });
    makeButton(L, new V3(2.1, 1.0, -3.6), 0xff9a5c, 'Skip card', () => skipCard(), { faceYaw: Math.PI });
    makeButton(L, new V3(-1.4, 1.0, -3.6), 0x4fc3f7, 'Start game', () => request(1), { faceYaw: Math.PI });
    makeButton(L, new V3(-2.1, 1.0, -3.6), 0x9a90b0, 'Clear drawing', () => clearMine(), { faceYaw: Math.PI });
    makeButton(L, new V3(0, 1.0, 5.6), 0xb388ff, 'Switch team', () => request(3), { faceYaw: Math.PI });
    L.hudActions = [
      { label: () => 'Start game', run: () => request(1), show: () => CH.ph === 0 || CH.ph === 4 },
      { label: () => 'Switch team', run: () => request(3), show: () => CH.ph === 0 || CH.ph === 4 },
      { label: () => 'Got it!', run: () => gotIt(), show: () => iAmActor() && CH.ph === 2 },
      { label: () => 'Skip card', run: () => skipCard(), show: () => iAmActor() && CH.ph === 2 },
      { label: () => 'Clear drawing', run: () => clearMine() },
      { label: () => 'End game', run: () => request(2), show: () => CH.ph >= 1 && CH.ph <= 3 },
    ];
    L.hintsFor = () => {
      const pen = pens.some((t) => t.held && t.held.peer === state.myPeer);
      if (pen) return [['Hold Space', 'draw'], ['R', 'colour'], ['Z', 'undo'], ['E', 'put the pen down']];
      if (CH.ph === 2 && !iAmActor()) return [['Type', 'your guess, then Enter'], ['Drag', 'look']];
      return [['WASD', 'move'], ['Drag', 'look'], ['E', 'take a pen or press a button']];
    };

    // ---------------------------------------------------------------- network
    L.presence = () => {
      const p = basePresenceCH();
      if (me.guess) p.chg = me.guess.slice();
      if (me.req) p.chq = me.req.slice();
      if (me.reports.length) p.chr = me.reports.map((r) => r.slice());
      if (chHost()) {
        p.chs = [CH.gid, CH.ph, CH.round, CH.maxRounds, CH.team, Math.max(0, Math.round((CH.endAt - performance.now()) / 100)), CH.cat + 1, CH.score[0], CH.score[1]];
        p.cha = CH.actor; p.chw = CH.ph >= 3 ? CH.word : ''; p.chb = CH.guessedBy;
        p.cht = [...CH.teams.entries()].slice(0, 16);
        p.che = CH.ev.slice();
      }
      return p;
    };
    const intCH = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    L.readPresence = (rec, pres, st) => {
      baseReadCH(rec, pres, st);
      const host = chHost();
      // guesses: everyone shows them; the actor checks their own team's
      if (Array.isArray(pres.chg) && pres.chg.length === 2 && intCH(pres.chg[0], 0, 1e9) && typeof pres.chg[1] === 'string' && pres.chg[0] > (st.gSeq || 0)) {
        st.gSeq = pres.chg[0];
        if (st.gInit) {
          const text = pres.chg[1].slice(0, 40);
          const correct = iAmActor() && CH.ph === 2 && me.card && CH.teams.get(rec.peer) === CH.team && guessMatches(text, me.card.word, me.card.keys);
          bubbleFor(rec.peer, text, performance.now());
          addGuessFeed(rec.peer, text, correct);
          if (correct) gotIt(rec.peer);
        }
      }
      st.gInit = true;
      if (host) {
        if (Array.isArray(pres.chq) && pres.chq.join() !== st.lastReq) { st.lastReq = pres.chq.join(); if (st.reqInit) hostRequestCH(rec.peer, pres.chq); }
        st.reqInit = true;
        if (Array.isArray(pres.chr)) for (const r of pres.chr.slice(-4)) { if (!Array.isArray(r) || r.length !== 3 || !intCH(r[0], 0, 1e9) || r[0] <= (st.repSeq || 0)) continue; st.repSeq = r[0]; hostReport(rec.peer, r); }
      } else if (rec.peer === herePeersCH()[0] && Array.isArray(pres.chs) && pres.chs.length === 9 && pres.chs.every((x) => intCH(x, 0, 1e9))) {
        const s = pres.chs;
        Object.assign(CH, { gid: s[0], ph: Math.min(s[1], 4), round: s[2], maxRounds: s[3], team: s[4] ? 1 : 0, cat: s[6] >= 1 && s[6] <= CATS.length ? s[6] - 1 : -1, score: [s[7], s[8]] });
        const left = performance.now() + s[5] * 100;
        if (Math.abs(left - CH.endAt) > 400) CH.endAt = left;
        if (typeof pres.cha === 'string') CH.actor = pres.cha.slice(0, 64);
        CH.word = typeof pres.chw === 'string' ? pres.chw.slice(0, 40) : '';
        CH.guessedBy = typeof pres.chb === 'string' ? pres.chb.slice(0, 64) : '';
        if (Array.isArray(pres.cht)) { CH.teams = new Map(pres.cht.filter((e) => Array.isArray(e) && typeof e[0] === 'string' && (e[1] === 0 || e[1] === 1))); CH.order = [herePeersCH().filter((p) => CH.teams.get(p) === 0), herePeersCH().filter((p) => CH.teams.get(p) === 1)]; }
        const ev = pres.che;
        if (Array.isArray(ev) && ev.length === 4 && intCH(ev[0], 0, 1e9) && ev[0] !== CH.ev[0]) { const fresh = CH.ev[0] !== 0; CH.ev = ev.slice(); if (fresh) showEventCH(ev); }
      }
      st.chTeam = CH.teams.has(rec.peer) ? CH.teams.get(rec.peer) : -1;
    };
    L.clampPlayer = (p) => {
      // the actor stays on the stage; everyone else stays off it during a turn
      const B = R, m = 0.3;
      let x = clamp(p.x, B.minX + m, B.maxX - m), z = clamp(p.z, B.minZ + m, B.maxZ - m);
      if (CH.ph === 1 || CH.ph === 2) {
        if (iAmActor()) { x = clamp(x, STAGE.x0 + 0.3, STAGE.x1 - 0.3); z = clamp(z, STAGE.z0 + 0.3, STAGE.z1 - 0.1); }
        else if (z < STAGE.z1 + 0.6 && Math.abs(x) < STAGE.x1 + 0.5) z = STAGE.z1 + 0.6;
      }
      return [x - p.x, z - p.z];
    };
    L.spawn = () => { dolly.position.set((Math.random() - 0.5) * 3, 0, 6.2); state.yaw = 0; };
    L.onExit = () => { guessBox.style.display = 'none'; myCard.visible = false; if (ui.status) ui.status.hidden = true; statusKeyCH = ''; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0001) * 0.3; camera.position.set(Math.sin(a) * 4, 2.6, 6.5); camera.lookAt(0, 1.4, -5); };
    L.chInternals = { CH, hostTickCH, startGameCH, guessMatches, drawCard, gotIt, sendGuess, EVC };
    return L;
  })();

