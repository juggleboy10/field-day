  // ================================================================ SPATIAL VOICE CHAT
  // Opt-in. Your microphone goes straight to the other players (peer-to-peer), and each voice plays from that
  // player's head: louder up close, quieter across the room, and from the correct side in your headset.
  // Only people in the same place as you are heard. Works when Field Day runs on its own site.
  const VOICE = { enabled: prefs.voice === true, muted: false, stream: null, track: null, peers: new Map(), master: null, starting: false, selfAn: null, selfBuf: null, selfTalkT: 0, lastTick: 0, resumeT: 0 };
  const voiceAvailable = () => !!(state.room && state.room.voice && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  function voiceMaster() {
    const c = snd.ctx;
    if (!c) return null;
    if (!VOICE.master) { VOICE.master = c.createGain(); VOICE.master.gain.value = 1.0; VOICE.master.connect(c.destination); }
    return VOICE.master;
  }
  async function voiceStart() {
    if (VOICE.stream || VOICE.starting || !voiceAvailable()) return;
    VOICE.starting = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      if (!VOICE.enabled) { stream.getTracks().forEach((t) => t.stop()); return; }
      VOICE.stream = stream;
      VOICE.track = stream.getAudioTracks()[0] || null;
      if (VOICE.track) VOICE.track.enabled = !VOICE.muted;
      state.room.voice.add(stream);
      selfMeter();
      showToast(state.mode === 'vr' ? 'Voice chat on. Click the left stick to mute' : 'Voice chat on. Press M to mute');
    } catch (e) {
      VOICE.enabled = false;
      prefs.voice = false; savePrefs();
      showToast('Couldn\u2019t use your microphone. Check the browser\u2019s permission for this site');
    } finally {
      VOICE.starting = false;
      state.hudDirty = true;
      forcePresence();
    }
  }
  // a level meter on your own mic (not played anywhere), so the others can tell when you're talking
  function selfMeter() {
    const c = snd.ctx;
    if (!c || !VOICE.stream || VOICE.selfAn) return;
    try { const src = c.createMediaStreamSource(VOICE.stream), an = c.createAnalyser(); an.fftSize = 512; src.connect(an); VOICE.selfAn = an; VOICE.selfBuf = new Float32Array(512); } catch (e) { /* ignore */ }
  }
  const level = (an, buf) => { an.getFloatTimeDomainData(buf); let sum = 0; for (let i = 0; i < buf.length; i += 4) sum += buf[i] * buf[i]; return Math.sqrt(sum / (buf.length / 4)); };
  const selfTalking = (now) => !!VOICE.stream && !VOICE.muted && now - VOICE.selfTalkT < 700;
  function voiceStop() {
    if (!VOICE.stream) return;
    VOICE.selfAn = null;
    try { if (state.room && state.room.voice) state.room.voice.remove(VOICE.stream); } catch (e) { /* ignore */ }
    VOICE.stream.getTracks().forEach((t) => t.stop());
    VOICE.stream = null; VOICE.track = null;
    forcePresence();
  }
  function setVoice(on) {
    VOICE.enabled = on;
    prefs.voice = on;
    savePrefs();
    if (on) { ensureAudio(); voiceStart(); } else { voiceStop(); showToast('Voice chat off'); }
    state.hudDirty = true;
  }
  function setMuted(m) {
    VOICE.muted = m;
    if (VOICE.track) VOICE.track.enabled = !m;
    showToast(m ? 'Mic muted' : 'Mic on');
    state.hudDirty = true;
    forcePresence();
  }
  // someone else's voice arrives
  function voiceAttach(peerId, stream) {
    ensureAudio();
    const c = snd.ctx, out = voiceMaster();
    if (!c || !out || !stream) return;
    voiceDetach(peerId);
    // Chrome only feeds remote WebRTC audio into Web Audio when the stream is also playing in a (muted) element
    const el = new Audio();
    el.srcObject = stream; el.muted = true;
    try { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* ignore */ }
    const src = c.createMediaStreamSource(stream);
    const panner = c.createPanner();
    panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
    panner.refDistance = 1.2; panner.maxDistance = 40; panner.rolloffFactor = 1.3;
    const gain = c.createGain(); gain.gain.value = 0;
    const an = c.createAnalyser(); an.fftSize = 512;
    src.connect(an); src.connect(panner); panner.connect(gain); gain.connect(out);
    VOICE.peers.set(peerId, { stream, el, src, panner, gain, an, buf: new Float32Array(512), speakT: 0, on: false, dead: false });
    const tr = stream.getAudioTracks()[0];
    if (tr) tr.addEventListener('ended', () => { const v = VOICE.peers.get(peerId); if (v && v.stream === stream) v.dead = true; });
  }
  // Voice can fail quietly between two players: the stream gets lost while both connections are being set up at once,
  // or it arrives but never plays. Everyone shares whether their mic is on and whether they're talking right now; if
  // someone's talking and nothing is reaching us for a few seconds (or their voice never arrived), we ask them to send
  // it to us again. Both ends then set the voice up afresh, the same as a refresh would, without anyone refreshing.
  function voiceWatch(now) {
    const dt = Math.min(0.5, (now - (VOICE.lastTick || now)) / 1000);
    VOICE.lastTick = now;
    const room = state.room;
    if (!room || !room.voice || !room.voice.ask) return;
    for (const rec of remotes.values()) {
      const pr = rec.pres || {};
      if (pr.vo !== 1) { rec.vMiss = 0; rec.vNoneT = 0; continue; }
      const v = VOICE.peers.get(rec.peer);
      const hearing = !!v && !v.dead && now - v.speakT < 1500;
      if (hearing) rec.vMiss = 0;
      else if (pr.vt === 1) rec.vMiss = (rec.vMiss || 0) + dt;
      if (v && !v.dead) rec.vNoneT = 0; else if (!rec.vNoneT) rec.vNoneT = now;
      const lost = (rec.vMiss || 0) > 2.5 || (rec.vNoneT && now - rec.vNoneT > 5000);
      if (lost && now - (rec.vAskT || -1e9) > 8000) {
        rec.vAskT = now; rec.vMiss = 0; rec.vNoneT = 0;
        VOICE.asks = (VOICE.asks || 0) + 1;
        try { room.voice.ask(rec.peer); } catch (e) { /* ignore */ }
        if (v) { try { const pl = v.el.play(); if (pl && pl.catch) pl.catch(() => {}); } catch (e) { /* ignore */ } }
      }
    }
  }
  // they asked us to send our voice again
  function voiceResend(peerId) {
    const room = state.room;
    if (!VOICE.stream || !room || !room.voice || !room.voice.resend) return;
    room.voice.resend(VOICE.stream, peerId);
  }
  function voiceDetach(peerId) {
    const v = VOICE.peers.get(peerId);
    if (!v) return;
    try { v.src.disconnect(); v.panner.disconnect(); v.gain.disconnect(); } catch (e) { /* ignore */ }
    v.el.srcObject = null;
    VOICE.peers.delete(peerId);
    const s = speakSprites.get(peerId);
    if (s) { scene.remove(s); speakSprites.delete(peerId); }
  }
  // little sound waves over whoever is talking
  const speakMat = new THREE.SpriteMaterial({
    map: canvasTexture(128, 64, (g) => {
      g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round';
      for (let k = 0; k < 5; k++) { const h = [14, 30, 44, 30, 14][k]; g.beginPath(); g.moveTo(24 + k * 20, 32 - h / 2); g.lineTo(24 + k * 20, 32 + h / 2); g.stroke(); }
    }).tex, color: 0x8bd450, transparent: true, depthWrite: false,
  });
  const speakSprites = new Map();
  const _vf = new V3(), _vu = new V3(), _vp = new V3(), _vq = new Q4();
  function setParam(p, v, t) { if (p && p.setTargetAtTime) p.setTargetAtTime(v, t, 0.05); else if (p) p.value = v; }
  function voiceTick(now) {
    const c = snd.ctx;
    if (VOICE.enabled && !VOICE.stream && !VOICE.starting && voiceAvailable() && state.mode !== 'menu' && c) voiceStart();
    // our own talking (for the others' check), and theirs
    if (VOICE.stream && !VOICE.selfAn) selfMeter();
    if (VOICE.selfAn && level(VOICE.selfAn, VOICE.selfBuf) > 0.02) VOICE.selfTalkT = now;
    const talk = selfTalking(now);
    if (talk !== !!VOICE.talkSent) { VOICE.talkSent = talk; forcePresence(); }
    voiceWatch(now);
    // the browser can pause sound (leaving VR, switching apps): start it again so voices keep playing
    if (c && c.state === 'suspended' && VOICE.peers.size && now - VOICE.resumeT > 3000) { VOICE.resumeT = now; try { c.resume(); } catch (e) { /* ignore */ } }
    if (!c || !VOICE.peers.size) return;
    // the listener is your head
    camera.getWorldPosition(_vp); camera.getWorldQuaternion(_vq);
    _vf.set(0, 0, -1).applyQuaternion(_vq); _vu.set(0, 1, 0).applyQuaternion(_vq);
    const Ls = c.listener, t = c.currentTime;
    if (Ls.positionX) {
      setParam(Ls.positionX, _vp.x, t); setParam(Ls.positionY, _vp.y, t); setParam(Ls.positionZ, _vp.z, t);
      setParam(Ls.forwardX, _vf.x, t); setParam(Ls.forwardY, _vf.y, t); setParam(Ls.forwardZ, _vf.z, t);
      setParam(Ls.upX, _vu.x, t); setParam(Ls.upY, _vu.y, t); setParam(Ls.upZ, _vu.z, t);
    } else if (Ls.setPosition) { Ls.setPosition(_vp.x, _vp.y, _vp.z); Ls.setOrientation(_vf.x, _vf.y, _vf.z, _vu.x, _vu.y, _vu.z); }
    // each voice comes from that player's head, if they're here with you
    for (const [peerId, v] of VOICE.peers) {
      const rec = remotes.get(peerId);
      const here = !!(rec && rec.lv === state.level && rec.hasH && state.mode !== 'menu');
      if (here) {
        const p = rec.cur.h.pos;
        if (v.panner.positionX) { setParam(v.panner.positionX, p.x, t); setParam(v.panner.positionY, p.y, t); setParam(v.panner.positionZ, p.z, t); }
        else if (v.panner.setPosition) v.panner.setPosition(p.x, p.y, p.z);
      }
      if (here !== v.on) { v.on = here; setParam(v.gain.gain, here ? 1 : 0, t); }
      // speaking?
      v.lvl = level(v.an, v.buf);
      if (v.lvl > 0.02) v.speakT = now;
      let spr = speakSprites.get(peerId);
      const talking = here && now - v.speakT < 260;
      if (talking && !spr) { spr = new THREE.Sprite(speakMat); spr.scale.set(0.22, 0.11, 1); scene.add(spr); speakSprites.set(peerId, spr); }
      if (spr) {
        spr.visible = talking;
        if (talking) { spr.position.copy(rec.cur.h.pos); spr.position.y += 0.42 + Math.sin(now * 0.02) * 0.01; }
      }
    }
  }
  // VR: click the left thumbstick to mute or unmute
  let stickClickPrev = false;
  function voiceVrButtons() {
    if (state.mode !== 'vr' || !VOICE.stream) { stickClickPrev = false; return; }
    const gp = vrHands.left && vrHands.left.source && vrHands.left.source.gamepad;
    const pressed = !!(gp && gp.buttons && gp.buttons[3] && gp.buttons[3].pressed);
    if (pressed && !stickClickPrev) setMuted(!VOICE.muted);
    stickClickPrev = pressed;
  }

