  // ---------------------------------------------------------------- sound (synthesized)
  const snd = { ctx: null, master: null, noise: null };
  function ensureAudio() {
    try {
      if (!snd.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        snd.ctx = new AC();
        snd.master = snd.ctx.createGain();
        snd.master.gain.value = 0.6;
        snd.master.connect(snd.ctx.destination);
        const len = Math.floor(snd.ctx.sampleRate * 1.6);
        snd.noise = snd.ctx.createBuffer(1, len, snd.ctx.sampleRate);
        const d = snd.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (snd.ctx.state === 'suspended') snd.ctx.resume();
    } catch (e) { /* audio is optional */ }
  }
  function tone(freq, freqEnd, dur, type, vol, delay) {
    const c = snd.ctx;
    if (!c || c.state !== 'running' || !(vol >= 0.002)) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(snd.master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noiseBurst(dur, vol, freq, q, attack, delay) {
    const c = snd.ctx;
    if (!c || c.state !== 'running' || !snd.noise || !(vol >= 0.002)) return;
    const t0 = c.currentTime + (delay || 0);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = snd.noise;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(snd.master);
    src.start(t0); src.stop(t0 + dur + 0.03);
  }
  function sfx(kind, vol) {
    const v = vol == null ? 1 : vol;
    switch (kind) {
      case 'floor': tone(115, 55, 0.14, 'sine', 0.9 * v); noiseBurst(0.05, 0.25 * v, 700, 0.8); break;
      case 'grass': tone(90, 60, 0.08, 'sine', 0.35 * v); noiseBurst(0.06, 0.15 * v, 900, 0.7); break;
      case 'rim': tone(640, 610, 0.35, 'triangle', 0.3 * v); tone(1230, 1200, 0.25, 'sine', 0.12 * v); break;
      case 'board': tone(190, 150, 0.12, 'square', 0.1 * v); noiseBurst(0.06, 0.3 * v, 1200, 1); break;
      case 'wall': noiseBurst(0.12, 0.35 * v, 2600, 0.7); break;
      case 'net': noiseBurst(0.1, 0.2 * v, 1800, 0.6); break;
      case 'ball': tone(260, 180, 0.08, 'sine', 0.35 * v); break;
      case 'swish': noiseBurst(0.38, 0.32 * v, 3400, 0.6); break;
      case 'chime': tone(784, 0, 0.3, 'sine', 0.22 * v); tone(1175, 0, 0.45, 'sine', 0.22 * v, 0.11); break;
      case 'grab': tone(420, 540, 0.07, 'sine', 0.14 * v); break;
      case 'reset': tone(300, 620, 0.22, 'triangle', 0.18 * v); break;
      case 'click': tone(640, 520, 0.05, 'square', 0.07 * v); break;
      case 'bat': noiseBurst(0.08, 0.9 * v, 2300, 0.9); tone(1500, 900, 0.07, 'square', 0.12 * v); tone(420, 300, 0.1, 'triangle', 0.3 * v); break;
      case 'thump': tone(95, 55, 0.2, 'sine', 0.6 * v); noiseBurst(0.12, 0.3 * v, 500, 0.7); break;
      case 'beep': tone(880, 0, 0.09, 'sine', 0.16 * v); break;
      case 'beep2': tone(1320, 0, 0.14, 'sine', 0.2 * v); break;
      case 'mitt': tone(300, 190, 0.06, 'sine', 0.5 * v); noiseBurst(0.04, 0.3 * v, 1500, 0.8); break;
      case 'cheer': noiseBurst(1.6, 0.35 * v, 1400, 0.35, 0.35); noiseBurst(1.3, 0.2 * v, 2600, 0.5, 0.25, 0.1); break;
      case 'chains':
        for (let i = 0; i < 7; i++) tone(1700 + Math.random() * 1600, 0, 0.18 + Math.random() * 0.2, 'triangle', 0.05 * v, Math.random() * 0.35);
        noiseBurst(0.45, 0.12 * v, 5200, 0.8);
        break;
      case 'disc': tone(170, 110, 0.1, 'sine', 0.4 * v); noiseBurst(0.06, 0.15 * v, 900, 0.8); break;
      case 'leaves': noiseBurst(0.3, 0.3 * v, 3200, 0.5, 0.03); break;
      case 'wood': tone(230, 170, 0.09, 'triangle', 0.35 * v); break;
      case 'whoosh': noiseBurst(0.18, 0.12 * v, 900, 0.6, 0.06); break;
      case 'clang': tone(1250, 1100, 0.25, 'triangle', 0.18 * v); tone(2600, 2500, 0.15, 'sine', 0.08 * v); noiseBurst(0.05, 0.25 * v, 3500, 1); break;
      case 'hit': tone(160, 90, 0.12, 'square', 0.12 * v); noiseBurst(0.08, 0.4 * v, 900, 0.7); break;
      case 'hurt': tone(220, 110, 0.25, 'sawtooth', 0.12 * v); noiseBurst(0.12, 0.25 * v, 500, 0.6); break;
      case 'shoot': tone(520, 180, 0.12, 'triangle', 0.25 * v); noiseBurst(0.08, 0.2 * v, 2200, 0.8); break;
      case 'arrow': noiseBurst(0.22, 0.14 * v, 1800, 0.8, 0.05); break;
      case 'coin': tone(1320, 0, 0.08, 'sine', 0.18 * v); tone(1980, 0, 0.16, 'sine', 0.15 * v, 0.06); break;
      case 'potion': tone(300, 600, 0.25, 'sine', 0.2 * v); tone(450, 900, 0.25, 'sine', 0.12 * v, 0.1); break;
      case 'gate': noiseBurst(1.1, 0.4 * v, 220, 0.5, 0.15); tone(70, 55, 1.0, 'sawtooth', 0.08 * v); break;
      case 'slam': tone(70, 35, 0.6, 'sine', 0.9 * v); noiseBurst(0.5, 0.6 * v, 260, 0.5); break;
      case 'poof': noiseBurst(0.3, 0.3 * v, 1300, 0.5, 0.02); tone(400, 120, 0.25, 'triangle', 0.1 * v); break;
      case 'growl': tone(110, 80, 0.35, 'sawtooth', 0.07 * v); break;
      case 'creak': tone(300, 420, 0.4, 'triangle', 0.05 * v); break;
      case 'roar': tone(90, 60, 0.9, 'sawtooth', 0.14 * v); noiseBurst(0.9, 0.3 * v, 400, 0.4, 0.2); break;
      case 'laser': tone(1700, 380, 0.13, 'square', 0.07 * v); tone(2400, 900, 0.1, 'sine', 0.08 * v); break;
      case 'zap': tone(880, 1760, 0.09, 'sine', 0.16 * v); break;
      case 'tagged': tone(240, 80, 0.5, 'sawtooth', 0.13 * v); noiseBurst(0.3, 0.2 * v, 700, 0.6); break;
      case 'kick': tone(150, 70, 0.11, 'sine', 0.9 * v); noiseBurst(0.05, 0.3 * v, 1100, 0.8); break;
      case 'whistle': tone(2600, 2550, 0.18, 'sine', 0.12 * v); tone(2700, 2650, 0.3, 'sine', 0.12 * v, 0.2); break;
      case 'buzzer': tone(185, 0, 0.7, 'square', 0.1 * v); break;
      case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0, 0.5, 'triangle', 0.16 * v, i * 0.13)); break;
    }
  }

