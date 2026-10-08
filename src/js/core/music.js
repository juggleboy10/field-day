  // ================================================================ LO-FI MUSIC: a quiet, generative soundtrack themed to each place
  // Every place has a recipe: tempo, swing, four chords, and which instruments play chords, arpeggios, a lead,
  // bass and drums. Notes are scheduled a moment ahead on the audio clock and run through a soft lo-fi chain
  // (low-pass, gentle saturation, a little pitch wobble, vinyl crackle), kept well under the sound effects.
  const MUSIC_LEVEL = 0.12;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // chords as MIDI notes; the first note of each is the bass root
  const CH = {
    Fmaj7: [41, 57, 60, 64, 67], Em7: [40, 55, 59, 62, 64], Dm9: [38, 53, 57, 60, 64], Cmaj7: [36, 55, 59, 60, 64],
    C6: [36, 52, 55, 57, 60], Am7: [45, 55, 57, 60, 64], Dm7: [38, 53, 57, 60, 62], G7: [43, 53, 55, 59, 62],
    Am9: [45, 55, 59, 60, 64], Fmaj9: [41, 57, 60, 64, 67], G6: [43, 55, 59, 62, 64], Cadd9: [36, 55, 60, 62, 64],
    Dm: [38, 57, 62, 65, 69], C: [36, 55, 60, 64, 67], Bb: [34, 58, 62, 65, 70], Am: [45, 57, 60, 64, 69], F: [41, 57, 60, 65, 69], Gsus: [43, 55, 60, 62, 67],
    Gmaj7: [43, 54, 59, 62, 66], Em9: [40, 55, 59, 62, 66], D9: [38, 54, 57, 60, 64],
    Bbmaj7: [46, 57, 62, 65, 69], Ebmaj7: [39, 55, 58, 62, 65], Cm9: [36, 55, 58, 62, 63], Bb6: [46, 55, 58, 62, 65], Abmaj7: [44, 55, 60, 63, 67], Fm9: [41, 56, 60, 63, 67], G7sus: [43, 53, 58, 60, 65],
    Cmaj9: [36, 55, 59, 62, 64], B7sus: [47, 57, 59, 64, 66], E7: [40, 56, 59, 62, 68], Ebdim: [39, 54, 57, 60, 63],
    G: [43, 55, 59, 62, 67], 'C7': [36, 52, 55, 58, 64], 'A7': [45, 55, 61, 64, 67], D7: [38, 54, 57, 60, 66], D: [38, 54, 57, 62, 66], A: [45, 57, 61, 64, 69], Bm: [35, 54, 59, 62, 66], 'F#m': [42, 57, 61, 66, 69], E: [40, 56, 59, 64, 68],
  };
  // ---------------------------------------------------------------- songs: public-domain tunes, played by our own synths
  // A melody is note names with lengths in sixteenths ("C5:4 R:2 ..."); every song's melody fills its chords exactly.
  const NOTE_I = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function mel(str) {
    const ev = new Map();
    let at = 0;
    for (const tok of str.trim().split(/\s+/)) {
      const [n, l] = tok.split(':'), len = Number(l);
      if (n !== 'R') { const m = /^([A-G])(#?)(\d)$/.exec(n); ev.set(at, { m: 12 * (Number(m[3]) + 1) + NOTE_I[m[1]] + (m[2] ? 1 : 0), len }); }
      at += len;
    }
    return { ev, len: at };
  }
  const SONGS = {
    // Take Me Out to the Ball Game (1908): a ballpark organ waltz
    ballgame: { title: 'Take Me Out to the Ball Game', barSteps: 12, bpm: 150, swing: 0, gain: 0.85, cut: 4200, crackle: 0.5, melInst: 'organ', melV: 0.95,
      // the whole chorus, 32 bars of waltz
      chords: ['C', 'C', 'C', 'G7', 'C', 'C', 'C', 'G7', 'A7', 'A7', 'Dm', 'Dm', 'D7', 'D7', 'G7', 'G7',
        'C', 'C', 'C', 'G7', 'G7', 'C7', 'F', 'F', 'F', 'D7', 'C', 'D7', 'F', 'G7', 'C', 'C'],
      melody: mel(
        // take me out to the ball game, take me out with the crowd
        'C5:8 C6:4 A5:4 G5:4 E5:4 G5:12 D5:12 C5:8 C6:4 A5:4 G5:4 E5:4 G5:20 R:4 ' +
        // buy me some peanuts and Cracker Jack, I don't care if I never get back, let me
        'A5:4 G#5:4 A5:4 E5:4 F5:4 G5:4 A5:8 F5:4 D5:12 A5:8 A5:4 A5:4 B5:4 C6:4 D6:4 B5:4 A5:4 G5:4 E5:4 D5:4 ' +
        // root, root, root for the home team, if they don't win it's a shame, for it's
        'C5:8 C6:4 A5:4 G5:4 E5:4 G5:12 D5:12 D5:4 C5:4 D5:4 E5:4 F5:4 G5:4 A5:16 A5:4 B5:4 ' +
        // one, two, three strikes you're out at the old ball game
        'C6:12 C6:12 C6:4 B5:4 A5:4 G5:4 F#5:4 G5:4 A5:12 B5:12 C6:20 R:4'),
      comp: { inst: 'organ', at: [4, 8], dur: 0.22 }, bass: { at: [0] }, drums: { k: 'o...........', h: '....-...-...' } },
    // Ode to Joy (Beethoven)
    ode: { title: 'Ode to Joy', barSteps: 16, bpm: 104, swing: 0, gain: 0.9, cut: 3800, crackle: 0.7, melInst: 'ep', melV: 1,
      chords: ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'C', 'G', 'C', 'G', 'G', 'C', 'G', 'C', 'C'],
      melody: mel('E5:4 E5:4 F5:4 G5:4 G5:4 F5:4 E5:4 D5:4 C5:4 C5:4 D5:4 E5:4 E5:6 D5:2 D5:8 E5:4 E5:4 F5:4 G5:4 G5:4 F5:4 E5:4 D5:4 C5:4 C5:4 D5:4 E5:4 D5:6 C5:2 C5:8 D5:4 D5:4 E5:4 C5:4 D5:4 E5:2 F5:2 E5:4 C5:4 D5:4 E5:2 F5:2 E5:4 D5:4 C5:4 D5:4 G4:8 E5:4 E5:4 F5:4 G5:4 G5:4 F5:4 E5:4 D5:4 C5:4 C5:4 D5:4 E5:4 D5:6 C5:2 C5:8'),
      comp: { inst: 'ep', at: [0, 8], dur: 0.45 }, bass: { at: [0, 8] }, drums: { k: 'o.......o.......', h: '....-.......-...' } },
    // Fur Elise (Beethoven), in 3/8
    elise: { title: 'F\u00fcr Elise', barSteps: 6, bpm: 76, swing: 0, gain: 0.95, cut: 4000, crackle: 0.8, melInst: 'ep', melV: 1,
      chords: ['Am', 'Am', 'Am', 'E', 'Am', 'Am', 'Am', 'E', 'Am'],
      melody: mel('R:4 E5:1 D#5:1 E5:1 D#5:1 E5:1 B4:1 D5:1 C5:1 A4:2 R:1 C4:1 E4:1 A4:1 B4:2 R:1 E4:1 G#4:1 B4:1 C5:2 R:1 E4:1 E5:1 D#5:1 E5:1 D#5:1 E5:1 B4:1 D5:1 C5:1 A4:2 R:1 C4:1 E4:1 A4:1 B4:2 R:1 E4:1 C5:1 B4:1 A4:4 R:2'),
      bass: { at: [0] } },
    // In the Hall of the Mountain King (Grieg): plucked strings over a low B
    mountain: { title: 'In the Hall of the Mountain King', barSteps: 16, bpm: 116, swing: 0, gain: 0.95, cut: 3600, crackle: 0.6, melInst: 'pizz', melV: 1.1,
      chords: ['Bm', 'Bm', 'Bm', 'Bm', 'Bm', 'Bm', 'Bm', 'Bm'],
      melody: mel('B3:2 C#4:2 D4:2 E4:2 F#4:2 D4:2 F#4:4 F4:2 C#4:2 F4:4 E4:2 C4:2 E4:4 B3:2 C#4:2 D4:2 E4:2 F#4:2 D4:2 F#4:2 B4:2 A4:2 F#4:2 D4:2 F#4:2 A4:8 B4:2 C#5:2 D5:2 E5:2 F#5:2 D5:2 F#5:4 F5:2 C#5:2 F5:4 E5:2 C5:2 E5:4 B4:2 C#5:2 D5:2 E5:2 F#5:2 D5:2 F#5:2 B5:2 A5:2 F#5:2 D5:2 F#5:2 A5:8'),
      bass: { at: [0, 4, 8, 12] }, drums: { k: 'o...o...o...o...' } },
    // The Entertainer (Joplin, 1902): the intro, then both strains; the notes are Joplin's, read from a published transcription
    entertainer: { title: 'The Entertainer', barSteps: 4, bpm: 92, swing: 0, gain: 0.95, cut: 4600, crackle: 0.9, melInst: 'piano', melV: 1.05,
      chords: ["C", "C", "C", "C", "C", "C", "G7", "G7", "C", "C7", "F", "C", "C", "G7", "C", "C", "C", "C7", "F", "C", "D7", "D7", "G", "G", "C", "C7", "F", "C", "C", "G7", "C", "C", "C", "C7", "F", "Fm", "C", "G7", "C", "C", "C", "C7", "F", "C", "C", "G7", "C", "C", "C", "C7", "F", "C", "D7", "D7", "G", "G", "C", "C7", "F", "C", "C", "G7", "C", "C", "C", "C7", "F", "Fm", "C", "G7", "C", "C", "C", "C", "C", "C7", "F", "Fm", "C", "C", "C", "C", "C", "C", "D7", "D7", "G", "G", "C", "C", "C", "C7", "F", "Fm", "C", "C7", "F", "Cdim", "C", "Am", "D7", "G7", "C", "C", "C", "C", "C", "C7", "F", "Fm", "C", "C", "C", "C", "C", "C", "D7", "D7", "G", "G", "C", "C", "C", "C7", "F", "Fm", "C", "C7", "F", "Cdim", "C", "Am", "D7", "G7", "C", "C"],
      melody: mel('D6:1 E6:1 C6:1 A5:2 B5:1 G5:2 D5:1 E5:1 C5:1 A4:2 B4:1 G4:2 D4:1 E4:1 C4:1 A3:2 B3:1 A3:1 G#3:1 G3:2 R:2 G4:2 D4:1 D#4:1 E4:1 C5:2 E4:1 C5:2 E4:1 C5:6 C5:1 D5:1 D#5:1 E5:1 C5:1 D5:1 E5:2 B4:1 D5:2 C5:6 D4:1 D#4:1 E4:1 C5:2 E4:1 C5:2 E4:1 C5:7 A4:1 G4:1 F#4:1 A4:1 C5:1 E5:2 D5:1 C5:1 A4:1 D5:6 D4:1 D#4:1 E4:1 C5:2 E4:1 C5:2 E4:1 C5:6 C5:1 D5:1 D#5:1 E5:1 C5:1 D5:1 E5:2 B4:1 D5:2 C5:6 C5:1 D5:1 E5:1 C5:1 D5:1 E5:2 C5:1 D5:1 C5:1 E5:1 C5:1 D5:1 E5:2 C5:1 D5:1 C5:1 E5:1 C5:1 D5:1 E5:2 B4:1 D5:2 C5:6 D4:1 D#4:1 E4:1 C5:2 E4:1 C5:2 E4:1 C5:6 C5:1 D5:1 D#5:1 E5:1 C5:1 D5:1 E5:2 B4:1 D5:2 C5:6 D4:1 D#4:1 E4:1 C5:2 E4:1 C5:2 E4:1 C5:7 A4:1 G4:1 F#4:1 A4:1 C5:1 E5:2 D5:1 C5:1 A4:1 D5:6 D4:1 D#4:1 E4:1 C5:2 E4:1 C5:2 E4:1 C5:6 C5:1 D5:1 D#5:1 E5:1 C5:1 D5:1 E5:2 B4:1 D5:2 C5:6 C5:1 D5:1 E5:1 C5:1 D5:1 E5:2 C5:1 D5:1 C5:1 E5:1 C5:1 D5:1 E5:2 C5:1 D5:1 C5:1 E5:1 C5:1 D5:1 E5:2 B4:1 D5:2 C5:5 E4:1 F4:1 F#4:1 G4:2 A4:1 G4:2 E4:1 F4:1 F#4:1 G4:2 A4:1 G4:2 E4:1 C4:1 G3:1 A3:1 B3:1 C4:1 D4:1 E4:1 D4:1 C4:1 D4:1 G3:5 E4:1 F4:1 F#4:1 G4:2 A4:1 G4:2 E4:1 F4:1 F#4:1 G4:2 A4:1 G4:2 G4:1 A4:1 A#4:1 B4:1 B4:2 B4:2 A4:1 F#4:1 D4:1 G4:5 E5:1 F5:1 F#5:1 G5:2 A5:1 G5:2 E5:1 F5:1 F#5:1 G5:2 A5:1 G5:2 E5:1 C5:1 G4:1 A4:1 B4:1 C5:1 D5:1 E5:1 D5:1 C5:1 D5:1 C5:5 G4:1 F#4:1 G4:1 C5:2 A4:1 C5:2 A4:1 C5:1 A4:1 G4:1 C5:1 E5:1 G5:2 E5:1 C5:1 G4:1 A4:2 C5:2 E5:1 D5:2 C5:5 R:1 E4:1 F4:1 F#4:1 G4:2 A4:1 G4:2 E4:1 F4:1 F#4:1 G4:2 A4:1 G4:2 E4:1 C4:1 G3:1 A3:1 B3:1 C4:1 D4:1 E4:1 D4:1 C4:1 D4:1 G3:5 E4:1 F4:1 F#4:1 G4:2 A4:1 G4:2 E4:1 F4:1 F#4:1 G4:2 A4:1 G4:2 G4:1 A4:1 A#4:1 B4:1 B4:2 B4:2 A4:1 F#4:1 D4:1 G4:5 E5:1 F5:1 F#5:1 G5:2 A5:1 G5:2 E5:1 F5:1 F#5:1 G5:2 A5:1 G5:2 E5:1 C5:1 G4:1 A4:1 B4:1 C5:1 D5:1 E5:1 D5:1 C5:1 D5:1 C5:5 G4:1 F#4:1 G4:1 C5:2 A4:1 C5:2 A4:1 C5:1 A4:1 G4:1 C5:1 E5:1 G5:2 E5:1 C5:1 G4:1 A4:2 C5:2 E5:1 D5:2 C5:5 R:4'),
      comp: { inst: 'piano', at: [2], dur: 0.2 }, bass: { at: [0] } },
    // Maple Leaf Rag (Joplin, 1899), in its original A-flat: A A B B A C C
    mapleleaf: { title: 'Maple Leaf Rag', barSteps: 4, bpm: 104, swing: 0, gain: 0.95, cut: 4600, crackle: 0.9, melInst: 'piano', melV: 1.05,
      chords: ["Ab", "Ab", "Eb7", "Eb7", "Ab", "Ab", "Eb7", "Eb7", "E", "Eb", "E", "Eb", "Eb", "Eb", "Eb", "Eb", "Abdim", "Abdim", "Ab", "Ab", "E", "Ab", "Ab", "Ab", "Abdim", "Abdim", "Ab", "Ab", "E", "Ab", "Ab", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Ab", "Ab", "Eb7", "Eb7", "E", "Eb", "E", "Eb", "Eb", "Eb", "Eb", "Eb", "Abdim", "Abdim", "Ab", "Ab", "E", "Ab", "Ab", "Ab", "Abdim", "Abdim", "Ab", "Ab", "E", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Eb7", "Eb7", "Ab", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Eb7", "Eb7", "Ab", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Eb7", "Eb7", "Ab", "Ab", "Ab", "G7", "F", "F", "Bbm", "Bbm", "Bb7", "Eb7", "Ab", "Ab", "Eb7", "Eb7", "Eb7", "Eb7", "Ab", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Eb7", "Eb7", "Ab", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Eb7", "Eb7", "Ab", "Ab", "Ab", "G7", "F", "F", "Bbm", "Bbm", "Bb7", "Eb7", "Ab", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Ab", "Ab", "Eb7", "Eb7", "E", "Eb", "E", "Eb", "Eb", "Eb", "Eb", "Eb", "Abdim", "Abdim", "Ab", "Ab", "E", "Ab", "Ab", "Ab", "Abdim", "Abdim", "Ab", "Ab", "E", "Ab", "Ab", "Ab", "Db", "Db", "Db", "Db", "Ab", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Eb7", "Eb7", "Ab", "Ab", "Ab", "Ab", "Db", "Db", "Db", "Db", "Ab", "Ab", "Ab", "Ab", "E", "E", "Eb", "Eb", "Eb", "Eb", "Ab", "Ab", "Db", "Db", "Db", "Db", "Ab", "Ab", "Ab", "Ab", "Eb7", "Eb7", "Eb7", "Eb7", "Ab", "Ab", "Ab", "Ab", "Db", "Db", "Db", "Db", "Ab", "Ab", "Ab", "Ab", "E", "E", "Eb", "Eb", "Eb", "Eb", "Ab", "Ab"],
      melody: mel('R:1 G#4:1 D#5:1 G#4:1 C5:1 D#5:2 G#4:1 D#5:1 G4:1 A#4:1 D#5:5 R:1 G#4:1 D#5:1 G#4:1 C5:1 D#5:2 G#4:1 D#5:1 G4:1 A#4:1 D#5:5 R:1 G#4:1 B4:1 E5:1 R:1 D#5:2 D#5:1 R:1 G#4:1 B4:1 E5:1 R:1 D#5:3 G#4:1 B4:1 D#5:1 G#5:1 G#5:1 B5:1 D#6:1 G#6:1 G#4:1 B4:1 D#5:1 G#5:1 G#5:1 B5:1 D#6:1 G#6:1 G#5:2 G#5:2 G#5:2 G#5:1 G#5:2 D#5:1 F5:1 C5:1 D#5:1 F5:3 G#4:1 A#4:1 B4:1 G#4:1 A#4:1 C5:2 G#4:1 C5:1 G#4:1 A#4:2 G#4:2 R:2 G#5:2 G#5:2 G#5:2 G#5:1 G#5:2 D#5:1 F5:1 C5:1 D#5:1 F5:3 G#4:1 A#4:1 B4:1 G#4:1 A#4:1 C5:2 G#4:1 C5:1 G#4:1 A#4:2 G#4:2 R:3 G#4:1 D#5:1 G#4:1 C5:1 D#5:2 G#4:1 D#5:1 G4:1 A#4:1 D#5:5 R:1 G#4:1 D#5:1 G#4:1 C5:1 D#5:2 G#4:1 D#5:1 G4:1 A#4:1 D#5:5 R:1 G#4:1 B4:1 E5:1 R:1 D#5:2 D#5:1 R:1 G#4:1 B4:1 E5:1 R:1 D#5:3 G#4:1 B4:1 D#5:1 G#5:1 G#5:1 B5:1 D#6:1 G#6:1 G#4:1 B4:1 D#5:1 G#5:1 G#5:1 B5:1 D#6:1 G#6:1 G#5:2 G#5:2 G#5:2 G#5:1 G#5:2 D#5:1 F5:1 C5:1 D#5:1 F5:3 G#4:1 A#4:1 B4:1 G#4:1 A#4:1 C5:2 G#4:1 C5:1 G#4:1 A#4:2 G#4:2 R:2 G#5:2 G#5:2 G#5:2 G#5:1 G#5:2 D#5:1 F5:1 C5:1 D#5:1 F5:3 G#4:1 A#4:1 B4:1 G#4:1 A#4:1 C5:2 G#4:1 C5:1 G#4:1 A#4:2 G#4:2 R:3 G5:1 D#6:1 G5:1 A#5:1 D6:2 G5:1 C#6:1 G5:1 A#5:1 C6:2 D#5:1 A#5:1 D#5:1 R:1 C5:1 G#5:1 C5:1 D#5:1 F5:2 D#5:1 G#5:1 C5:1 D#5:1 F5:2 C5:1 F5:2 R:1 D#5:1 G5:1 A#4:1 C#5:1 F5:2 D#5:1 G5:1 A#4:1 C#5:1 F5:2 C#5:1 F5:2 R:1 C5:1 G#5:1 C5:1 D#5:1 F5:2 D#5:1 G#5:1 C5:1 D#5:1 F5:2 C5:1 F5:2 R:1 G5:1 D#6:1 G5:1 A#5:1 D6:2 G5:1 C#6:1 G5:1 A#5:1 C6:2 D#5:1 A#5:1 D#5:1 R:1 C5:1 G#5:1 C5:1 D#5:1 F5:2 D#5:1 G#5:2 G#5:2 G5:2 F#5:2 R:1 F4:1 A4:1 C5:1 F5:1 C5:1 A4:1 F4:1 R:1 F4:1 A#4:1 C#5:1 F5:2 C#5:2 C5:2 R:1 C5:2 A#4:3 R:1 G#4:1 C5:1 D#5:1 G#5:2 R:3 G5:1 D#6:1 G5:1 A#5:1 D6:2 G5:1 C#6:1 G5:1 A#5:1 C6:2 D#5:1 A#5:1 D#5:1 R:1 C5:1 G#5:1 C5:1 D#5:1 F5:2 D#5:1 G#5:1 C5:1 D#5:1 F5:2 C5:1 F5:2 R:1 D#5:1 G5:1 A#4:1 C#5:1 F5:2 D#5:1 G5:1 A#4:1 C#5:1 F5:2 C#5:1 F5:2 R:1 C5:1 G#5:1 C5:1 D#5:1 F5:2 D#5:1 G#5:1 C5:1 D#5:1 F5:2 C5:1 F5:2 R:1 G5:1 D#6:1 G5:1 A#5:1 D6:2 G5:1 C#6:1 G5:1 A#5:1 C6:2 D#5:1 A#5:1 D#5:1 R:1 C5:1 G#5:1 C5:1 D#5:1 F5:2 D#5:1 G#5:2 G#5:2 G5:2 F#5:2 R:1 F4:1 A4:1 C5:1 F5:1 C5:1 A4:1 F4:1 R:1 F4:1 A#4:1 C#5:1 F5:2 C#5:2 C5:2 R:1 C5:2 A#4:3 R:1 G#4:1 C5:1 D#5:1 G#5:2 R:3 G#4:1 D#5:1 G#4:1 C5:1 D#5:2 G#4:1 D#5:1 G4:1 A#4:1 D#5:5 R:1 G#4:1 D#5:1 G#4:1 C5:1 D#5:2 G#4:1 D#5:1 G4:1 A#4:1 D#5:5 R:1 G#4:1 B4:1 E5:1 R:1 D#5:2 D#5:1 R:1 G#4:1 B4:1 E5:1 R:1 D#5:3 G#4:1 B4:1 D#5:1 G#5:1 G#5:1 B5:1 D#6:1 G#6:1 G#4:1 B4:1 D#5:1 G#5:1 G#5:1 B5:1 D#6:1 G#6:1 G#5:2 G#5:2 G#5:2 G#5:1 G#5:2 D#5:1 F5:1 C5:1 D#5:1 F5:3 G#4:1 A#4:1 B4:1 G#4:1 A#4:1 C5:2 G#4:1 C5:1 G#4:1 A#4:2 G#4:2 R:2 G#5:2 G#5:2 G#5:2 G#5:1 G#5:2 D#5:1 F5:1 C5:1 D#5:1 F5:3 G#4:1 A#4:1 B4:1 G#4:1 A#4:1 C5:2 G#4:1 C5:1 G#4:1 A#4:2 G#4:2 R:2 G#5:2 F5:2 G#5:2 F5:2 G#5:2 A#5:1 C6:2 A#5:1 G#5:1 F5:1 D#5:1 F5:2 C5:5 R:1 D#5:1 F5:1 C5:1 D#5:1 F5:2 C5:1 D#5:1 F5:2 A#4:5 R:1 C#5:1 F5:1 A#4:1 C#5:1 F5:2 C5:1 C5:1 D#5:1 F5:1 C5:1 D#5:1 F5:2 C5:2 D#5:1 F5:1 C5:1 D#5:1 F5:2 D#5:1 G#5:2 F5:2 G#5:2 F5:2 G#5:2 A#5:1 C6:2 A#5:1 G#5:1 F5:1 G#5:2 F5:2 D#5:1 G#5:2 C5:2 D#5:1 F5:1 C5:1 D#5:1 F5:2 G#4:2 A#4:1 G#4:2 G#4:2 A#4:1 G#4:2 A#4:1 C5:1 G#4:1 A#4:1 C5:2 G#4:2 A#4:1 C5:1 G#4:2 A#4:3 G#4:2 D#5:2 D#5:2 D#5:2 G#5:2 F5:2 G#5:2 F5:2 G#5:2 A#5:1 C6:2 A#5:1 G#5:1 F5:1 D#5:1 F5:2 C5:5 R:1 D#5:1 F5:1 C5:1 D#5:1 F5:2 C5:1 D#5:1 F5:2 A#4:5 R:1 C#5:1 F5:1 A#4:1 C#5:1 F5:2 C5:1 C5:1 D#5:1 F5:1 C5:1 D#5:1 F5:2 C5:2 D#5:1 F5:1 C5:1 D#5:1 F5:2 D#5:1 G#5:2 F5:2 G#5:2 F5:2 G#5:2 A#5:1 C6:2 A#5:1 G#5:1 F5:1 G#5:2 F5:2 D#5:1 G#5:2 C5:2 D#5:1 F5:1 C5:1 D#5:1 F5:2 G#4:2 A#4:1 G#4:2 G#4:2 A#4:1 G#4:2 A#4:1 C5:1 G#4:1 A#4:1 C5:2 G#4:2 A#4:1 C5:1 G#4:2 A#4:3 G#5:2 R:2 G#5:2 R:2'),
      comp: { inst: 'piano', at: [2], dur: 0.2 }, bass: { at: [0] } },
    // The Sunrise fanfare from Also sprach Zarathustra (Strauss, 1896): the C-G-C nature motif three times, then again an octave up,
    // each ending on the major third that falls to the minor
    zarathustra: { title: '2001: Also sprach Zarathustra', barSteps: 16, bpm: 56, swing: 0, gain: 1, cut: 5200, crackle: 0.2, melInst: 'brass', melV: 1.25,
      chords: ['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C'],
      melody: mel('C4:4 G4:4 C5:8 R:16 C4:4 G4:4 C5:8 R:16 C4:4 G4:4 C5:8 E5:8 D#5:8 C5:4 G5:4 C6:8 R:16 C5:4 G5:4 C6:8 R:16 C5:4 G5:4 C6:8 E6:8 D#6:8'),
      pad: { inst: 'pad' }, bass: { at: [0] }, drums: { k: 'o...........o.oo' } },
  };
  // a chord the table doesn't have is built from its name: root plus major, m, 7, dim
  const CHORD_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function genChord(name) {
    const m = /^([A-G])([b#]?)(.*)$/.exec(name);
    if (!m) return CH.C;
    const root = (CHORD_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, q = m[3], bass = 36 + root, r3 = 48 + root;
    const dim = q.startsWith('dim'), minor = !dim && q.startsWith('m') && !q.startsWith('maj'), seventh = dim || q.includes('7');
    const third = dim || minor ? 3 : 4, fifth = dim ? 6 : 7, sev = dim ? 9 : q.includes('maj7') ? 11 : 10;
    return seventh ? [bass, r3 + third, r3 + fifth, r3 + sev, r3 + 12 + third] : [bass, r3, r3 + third, r3 + fifth, r3 + 12];
  }
  for (const sg of Object.values(SONGS)) for (const n of sg.chords) if (!CH[n]) CH[n] = genChord(n);
  // the jukebox's choices: the clubhouse's own lo-fi, then the songs
  const JUKEBOX = [{ id: 'hub', title: 'Clubhouse lo-fi' }, ...Object.keys(SONGS).map((k) => ({ id: 'song_' + k, title: SONGS[k].title }))];
  const JUKE = { sel: 'hub', seq: 0 };
  const P = (s) => s.split('').map((c) => (c === 'x' ? 1 : c === 'o' ? 0.55 : c === '-' ? 0.3 : 0));
  const MUSIC_THEMES = {
    hub: { gain: 0.82, bpm: 78, swing: 0.16, chords: ['Ebmaj7', 'Dm7', 'Cm9', 'Bb6'], comp: { inst: 'ep', at: [0, 10], dur: 1.6 }, lead: { inst: 'ep', p: 0.18 }, bass: { at: [0, 7, 10] }, drums: { k: 'x......x..x.....', s: '....x.......x...', h: 'o-o-o-o-o-o-o-o-' }, cut: 3200, crackle: 1 },
    hoops: { bpm: 80, swing: 0.2, chords: ['Fmaj7', 'Em7', 'Dm9', 'Cmaj7'], comp: { inst: 'ep', at: [0, 6, 11], dur: 0.9 }, lead: { inst: 'ep', p: 0.2 }, bass: { at: [0, 3, 8, 10] }, drums: { k: 'x.....x...x.....', s: '....x.......x..o', h: 'x-x-x-o-x-x-x-o-' }, cut: 3600, crackle: 1 },
    baseball: { bpm: 84, swing: 0.12, chords: ['C6', 'Am7', 'Dm7', 'G7'], comp: { inst: 'organ', at: [0, 8], dur: 1.8 }, lead: { inst: 'organ', p: 0.16, up: 12 }, bass: { walk: true }, drums: { k: 'x.......x.......', s: '....o.......o...', b: 'o.-.o.-.o.-.o.-.' }, cut: 3400, crackle: 0.8 },
    discgolf: { bpm: 72, swing: 0.1, chords: ['Am9', 'Fmaj9', 'Cadd9', 'G6'], arp: { inst: 'guitar', every: 2, order: [1, 2, 3, 4, 3, 2, 3, 4] }, lead: { inst: 'guitar', p: 0.08, up: 12 }, bass: { at: [0, 8] }, drums: { k: 'x.........x.....', sh: '-o-o-o-o-o-o-o-o' }, cut: 3000, crackle: 1.1 },
    dungeon: { gain: 2.2, bpm: 66, swing: 0, chords: ['Dm', 'C', 'Bb', 'C'], arp: { inst: 'harp', every: 2, order: [1, 2, 3, 4, 2, 3, 4, 3] }, pad: { inst: 'drone' }, bass: { at: [0] }, drums: { k: 'x.......o.......', b: '........x.......' }, cut: 2600, crackle: 0.7 },
    lasertag: { bpm: 90, swing: 0, chords: ['Am', 'F', 'C', 'Gsus'], arp: { inst: 'synth', every: 1, order: [1, 2, 3, 4, 3, 2, 1, 2] }, pad: { inst: 'pad' }, bass: { at: [0, 3, 6, 8, 11, 14] }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '-o-o-o-o-o-o-o-o' }, cut: 3800, crackle: 0.6 },
    soccer: { gain: 0.82, bpm: 88, swing: 0.14, chords: ['Gmaj7', 'Em9', 'Am7', 'D9'], comp: { inst: 'ep', at: [0, 3, 8, 11], dur: 0.6 }, lead: { inst: 'ep', p: 0.14, up: 12 }, bass: { at: [0, 6, 10] }, drums: { k: 'x.....x.x.......', s: '....x.......x...', sh: 'o-o-o-o-o-o-o-o-' }, cut: 3800, crackle: 0.9 },
    minigolf: { gain: 0.82, bpm: 80, swing: 0.12, chords: ['Cmaj7', 'Fmaj7', 'Em7', 'Am7'], arp: { inst: 'marimba', every: 2, order: [1, 3, 2, 4, 3, 2, 4, 3] }, lead: { inst: 'marimba', p: 0.1, up: 12 }, bass: { at: [0, 7, 10] }, drums: { k: 'x.........x.....', c: '...o..o....o..o.', sh: '-o-o-o-o-o-o-o-o' }, cut: 3600, crackle: 0.9 },
    bowling: { bpm: 92, swing: 0.32, chords: ['Dm7', 'G7', 'Cmaj7', 'Am7'], comp: { inst: 'ep', at: [2, 7, 14], dur: 0.35 }, lead: { inst: 'vibes', p: 0.16, up: 12 }, bass: { walk: true }, drums: { r: 'x.-ox.-ox.-ox.-o', b: '....o.......o...', k: 'o.........o.....' }, cut: 3400, crackle: 1 },
    karts: { gain: 0.82, bpm: 96, swing: 0.08, chords: ['Fmaj7', 'G6', 'Em7', 'Am7'], arp: { inst: 'pluck', every: 2, order: [1, 2, 3, 2, 4, 3, 2, 3] }, pad: { inst: 'pad' }, bass: { at: [0, 3, 6, 10, 12] }, drums: { k: 'x..x..x...x.....', s: '....x.......x...', h: 'x-x-x-x-x-x-x-x-' }, cut: 4200, crackle: 0.6 },
    siege: { bpm: 80, swing: 0.06, chords: ['Cm9', 'Abmaj7', 'Fm9', 'G7sus'], arp: { inst: 'synth', every: 1, order: [1, 3, 2, 4, 1, 3, 2, 4] }, pad: { inst: 'pad' }, bass: { at: [0, 6, 10] }, drums: { k: 'x.....x...x.....', s: '....x.......x...', h: '-.o.-.o.-.o.-.o.' }, cut: 3000, crackle: 0.6 },
    hexwood: { gain: 2.4, bpm: 70, swing: 0.08, chords: ['Em9', 'Cmaj9', 'Am9', 'B7sus'], arp: { inst: 'musicbox', every: 2, order: [2, 4, 3, 4, 2, 3, 4, 3], up: 12 }, pad: { inst: 'flute' }, bass: { at: [0] }, drums: {}, cut: 3600, crackle: 0.8 },
    paintball: { gain: 0.85, bpm: 112, swing: 0.08, chords: ['Am7', 'Fmaj7', 'Cmaj7', 'G6'], comp: { inst: 'guitar', at: [0, 3, 6, 10, 12], dur: 0.2 }, lead: { inst: 'synth', p: 0.16, up: 0 }, bass: { at: [0, 3, 8, 11, 14] }, drums: { k: 'o..o..o.o..o..o.', s: '....x.......x...', h: '-.-.-.-.-.-.-.-.' }, cut: 4200, crackle: 0.5 },
    dodgeball: { gain: 0.9, bpm: 132, swing: 0.05, chords: ['C', 'Am', 'F', 'G'], comp: { inst: 'guitar', at: [0, 3, 6, 10, 12], dur: 0.25 }, bass: { at: [0, 4, 8, 12] }, drums: { k: 'x...x...x...x.x.', s: '....x.......x...', h: 'x-x-x-x-x-x-x-x-' }, lead: { inst: 'marimba', p: 0.35, up: 12 }, cut: 5200, crackle: 0.1 },
    parkour: { gain: 0.9, bpm: 126, swing: 0.04, chords: ['Am', 'F', 'C', 'G'], comp: { inst: 'guitar', at: [0, 3, 6, 10, 12], dur: 0.25 }, arp: { inst: 'pluck', every: 2, order: [1, 2, 3, 2, 4, 3, 2, 3] }, bass: { at: [0, 3, 6, 8, 11, 14] }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x-x-x-x-x-x-x-x-' }, lead: { inst: 'marimba', p: 0.3, up: 12 }, cut: 5200, crackle: 0.15 },
    pickleball: { gain: 0.9, bpm: 92, swing: 0.16, chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'], comp: { inst: 'guitar', at: [0, 6, 10], dur: 0.3 }, lead: { inst: 'marimba', p: 0.2, up: 12 }, bass: { at: [0, 8, 11] }, drums: { k: 'o.......o.o.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, cut: 4600, crackle: 0.5 },
    charades: { gain: 0.9, bpm: 96, swing: 0.22, chords: ['Fmaj7', 'Dm7', 'G7', 'Cmaj7'], comp: { inst: 'ep', at: [2, 7, 14], dur: 0.4 }, lead: { inst: 'vibes', p: 0.18, up: 12 }, bass: { walk: true }, drums: { r: 'x.-ox.-ox.-ox.-o', b: '....o.......o...', k: 'o.......o.......' }, cut: 3600, crackle: 0.9 },
    hideseek: { bpm: 84, swing: 0.18, chords: ['Am', 'Dm', 'E7', 'Am'], arp: { inst: 'pizz', every: 2, order: [1, 0, 3, 0, 2, 0, 4, 0] }, lead: { inst: 'pizz', p: 0.12, up: 12 }, bass: { walk: true, short: true }, drums: { b: '....o.......o...', sh: '-.-.-.-.-.-.-.-.' }, cut: 3000, crackle: 1 },
  };

  for (const [k, sg] of Object.entries(SONGS)) MUSIC_THEMES['song_' + k] = sg;
  MUSIC_THEMES.baseball = SONGS.ballgame;   // the sandlot plays the ballgame song
  const MUSIC = { on: prefs.music !== false, theme: null, voice: null, chain: null, crackle: null, analyser: null, step: 0, nextT: 0, startT: 0, beat: -1, notes: 0 };
  function musicChain() {
    const c = snd.ctx;
    if (MUSIC.chain || !c) return MUSIC.chain;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.5;
    const sat = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    sat.curve = curve;
    const out = c.createGain(); out.gain.value = MUSIC.on ? MUSIC_LEVEL : 0;
    const an = c.createAnalyser(); an.fftSize = 1024;
    lp.connect(sat); sat.connect(out); out.connect(snd.master); out.connect(an);
    // vinyl crackle: soft hiss with the odd pop, looping
    const len = Math.floor(c.sampleRate * 3), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let lpS = 0;
    for (let i = 0; i < len; i++) { lpS += (Math.random() * 2 - 1 - lpS) * 0.05; d[i] = lpS * 0.35 + (Math.random() < 0.0004 ? (Math.random() - 0.5) * 1.6 : 0); }
    const cr = c.createBufferSource(); cr.buffer = buf; cr.loop = true;
    const crG = c.createGain(); crG.gain.value = 0.05;
    cr.connect(crG); crG.connect(lp);
    cr.start();
    MUSIC.chain = { lp, out, crG };
    MUSIC.analyser = an;
    return MUSIC.chain;
  }
  function setMusicOn(on, quiet) {
    MUSIC.on = on;
    if (MUSIC.chain) { const g = MUSIC.chain.out.gain, t = snd.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(on ? MUSIC_LEVEL : 0, t + 0.6); }
    if (on) { MUSIC.nextT = 0; }
    prefs.music = on;
    savePrefs();
    if (!quiet) showToast(on ? 'Music on' : 'Music off');
    state.hudDirty = true;
  }
  function musicTheme(id) {
    if (id === 'hub' && JUKE.sel !== 'hub') id = JUKE.sel;
    const c = snd.ctx;
    if (!c || (MUSIC.theme === id && MUSIC.voice)) return;
    MUSIC.theme = id;
    const ch = musicChain();
    const T = MUSIC_THEMES[id] || MUSIC_THEMES.hub;
    // crossfade: the old voice fades out while the new one fades in
    if (MUSIC.voice) { const old = MUSIC.voice, t = c.currentTime; old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + 1.5); setTimeout(() => old.disconnect(), 2000); }
    const v = c.createGain();
    v.gain.setValueAtTime(0, c.currentTime);
    v.gain.linearRampToValueAtTime(T.gain || 1, c.currentTime + 2.0);
    v.connect(ch.lp);
    MUSIC.voice = v;
    ch.lp.frequency.setTargetAtTime(T.cut || 3400, c.currentTime, 0.5);
    ch.crG.gain.setTargetAtTime(0.05 * (T.crackle == null ? 1 : T.crackle), c.currentTime, 0.5);
    MUSIC.step = 0;
    MUSIC.nextT = 0;
  }
  // a slow tape wobble, a few cents either way
  const wobble = (t) => Math.sin(t * 1.9) * 7 + Math.sin(t * 0.37) * 5 + (Math.random() - 0.5) * 5;
  function envGain(c, t, a, peak, dec, sus, end, rel) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0001), t + a + dec);
    g.gain.setValueAtTime(Math.max(peak * sus, 0.0001), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
    return g;
  }
  function osc(c, type, f, t, stop, det) {
    const o = c.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.setValueAtTime(det || 0, t);
    o.start(t); o.stop(stop);
    return o;
  }
  // instruments: each schedules one note at time t into dest
  const INST = {
    ep(c, d, t, m, dur, v) {
      const f = mtof(m), w = wobble(t), end = t + dur;
      const g = envGain(c, t, 0.008, 0.11 * v, 0.6, 0.45, end, 0.5);
      const car = osc(c, 'sine', f, t, end + 0.6, w), mod = osc(c, 'sine', f, t, end + 0.6, w);
      const mg = c.createGain(); mg.gain.setValueAtTime(f * 1.8, t); mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.35);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(d);
    },
    organ(c, d, t, m, dur, v) {
      const f = mtof(m), w = wobble(t), end = t + dur;
      const g = envGain(c, t, 0.03, 0.06 * v, 0.2, 0.85, end, 0.15);
      for (const [mul, amp] of [[1, 1], [2, 0.5], [3, 0.28], [4, 0.12]]) { const o = osc(c, 'sine', f * mul, t, end + 0.2, w), a = c.createGain(); a.gain.value = amp; o.connect(a); a.connect(g); }
      g.connect(d);
    },
    guitar(c, d, t, m, dur, v) { INST.pluck(c, d, t, m, Math.max(dur, 0.9), v * 1.1, 2600, 1.4); },
    harp(c, d, t, m, dur, v) { INST.pluck(c, d, t, m, Math.max(dur, 1.4), v, 2200, 2.0); },
    pizz(c, d, t, m, dur, v) { INST.pluck(c, d, t, m, 0.18, v * 1.2, 1800, 0.25); },
    pluck(c, d, t, m, dur, v, bright, decay) {
      const f = mtof(m), w = wobble(t), end = t + (dur || 0.4);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + (decay || 0.8));
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(bright || 3000, t); lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 200), t + 0.25);
      const a = osc(c, 'triangle', f, t, end + (decay || 0.8), w), b = osc(c, 'sawtooth', f, t, end + (decay || 0.8), w + 4);
      const bg = c.createGain(); bg.gain.value = 0.35;
      a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g); g.connect(d);
    },
    marimba(c, d, t, m, dur, v) {
      const f = mtof(m), w = wobble(t);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      const h = c.createGain(); h.gain.setValueAtTime(0.04 * v, t); h.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc(c, 'sine', f, t, t + 0.6, w).connect(g); osc(c, 'sine', f * 4, t, t + 0.1, w).connect(h);
      g.connect(d); h.connect(d);
    },
    vibes(c, d, t, m, dur, v) {
      const f = mtof(m), w = wobble(t);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      const trem = c.createGain(); trem.gain.value = 1;
      const l = osc(c, 'sine', 5.5, t, t + 1.5), lg = c.createGain(); lg.gain.value = 0.3; l.connect(lg); lg.connect(trem.gain);
      osc(c, 'sine', f, t, t + 1.5, w).connect(trem); trem.connect(g); g.connect(d);
    },
    musicbox(c, d, t, m, dur, v) {
      const f = mtof(m), w = wobble(t);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      const h = c.createGain(); h.gain.setValueAtTime(0.025 * v, t); h.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc(c, 'sine', f, t, t + 1.9, w).connect(g); osc(c, 'sine', f * 3.01, t, t + 0.5, w).connect(h);
      g.connect(d); h.connect(d);
    },
    synth(c, d, t, m, dur, v) {
      const f = mtof(m), w = wobble(t);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
      osc(c, 'square', f, t, t + 0.3, w).connect(lp); lp.connect(g); g.connect(d);
    },
    pad(c, d, t, m, dur, v) {
      const f = mtof(m), end = t + dur;
      const g = envGain(c, t, 0.9, 0.022 * v, 0.5, 0.9, end, 1.0);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      for (const det of [-9, 9]) osc(c, 'sawtooth', f, t, end + 1.1, det + wobble(t)).connect(lp);
      lp.connect(g); g.connect(d);
    },
    drone(c, d, t, m, dur, v) { INST.pad(c, d, t, m - 12, dur, v * 1.3); },
    flute(c, d, t, m, dur, v) {
      const f = mtof(m), end = t + dur;
      const g = envGain(c, t, 0.5, 0.03 * v, 0.4, 0.85, end, 0.9);
      const o = osc(c, 'sine', f, t, end + 1, wobble(t));
      const vib = osc(c, 'sine', 4.8, t, end + 1), vg = c.createGain(); vg.gain.value = f * 0.006; vib.connect(vg); vg.connect(o.frequency);
      o.connect(g); g.connect(d);
    },
    bass(c, d, t, m, dur, v) {
      const f = mtof(m), end = t + dur;
      const g = envGain(c, t, 0.01, 0.16 * v, 0.25, 0.6, end, 0.12);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      osc(c, 'sine', f, t, end + 0.2).connect(g); osc(c, 'triangle', f, t, end + 0.2).connect(lp); lp.connect(g); g.connect(d);
    },
    // an upright piano that's seen some bars: a sharp strike, a quick decay, and a second string a touch out of tune
    piano(c, d, t, m, dur, v) {
      const f = mtof(m), end = t + Math.min(dur, 0.9);
      const g = envGain(c, t, 0.004, 0.13 * v, 0.45, 0.16, end, 0.14);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(1500, t + 0.35);
      osc(c, 'triangle', f, t, end + 0.3, 0).connect(lp); osc(c, 'sine', f, t, end + 0.3, -8).connect(lp); osc(c, 'sine', f * 2, t, end + 0.3, 7).connect(lp);
      lp.connect(g); g.connect(d);
    },
    // a trumpet-ish blast: two detuned saws that open up as they sound
    brass(c, d, t, m, dur, v) {
      const f = mtof(m), end = t + dur;
      const g = envGain(c, t, 0.07, 0.06 * v, 0.25, 0.85, end, 0.4);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.1; lp.frequency.setValueAtTime(800, t); lp.frequency.exponentialRampToValueAtTime(3400, t + 0.3);
      osc(c, 'sawtooth', f, t, end + 0.5, 5).connect(lp); osc(c, 'sawtooth', f, t, end + 0.5, -6).connect(lp);
      lp.connect(g); g.connect(d);
    },
  };
  function drum(c, d, t, kind, v) {
    if (kind === 'k') {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(d); o.start(t); o.stop(t + 0.32);
      return;
    }
    const spec = { s: [1800, 0.8, 0.16, 0.09], h: [8000, 1.2, 0.035, 0.03], sh: [6200, 1.5, 0.07, 0.022], b: [2600, 0.5, 0.28, 0.04], r: [5200, 2, 0.4, 0.022], c: [420, 3, 0.12, 0.08] }[kind];
    if (!spec || !snd.noise) return;
    const [freq, q, len, amp] = spec;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = snd.noise; src.playbackRate.value = 0.9 + Math.random() * 0.2;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(amp * v, t + (kind === 'b' ? 0.02 : 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f); f.connect(g); g.connect(d);
    src.start(t, Math.random() * 1.2); src.stop(t + len + 0.02);
    if (kind === 's') { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = 190; og.gain.setValueAtTime(0.05 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(og); og.connect(d); o.start(t); o.stop(t + 0.08); }
    if (kind === 'c') { const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(190, t + 0.1); og.gain.setValueAtTime(0.07 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); o.connect(og); og.connect(d); o.start(t); o.stop(t + 0.15); }
  }
  const mrand = mulberry32(777);
  function musicTick() {
    const c = snd.ctx;
    if (!c || c.state !== 'running' || !MUSIC.on || !MUSIC.voice) return;
    const T = MUSIC_THEMES[MUSIC.theme] || MUSIC_THEMES.hub;
    const STEP = 60 / T.bpm / 4, d = MUSIC.voice;
    if (MUSIC.nextT < c.currentTime) { MUSIC.nextT = c.currentTime + 0.05; if (!MUSIC.step) MUSIC.startT = MUSIC.nextT; }
    while (MUSIC.nextT < c.currentTime + 0.2) {
      const BS = T.barSteps || 16, pos = T.melody ? MUSIC.step % T.melody.len : MUSIC.step;
      const s = pos % BS, bar = Math.floor(pos / BS);
      const t = MUSIC.nextT + (s % 2 ? (T.swing || 0) * STEP : 0);
      const chord = CH[T.chords[bar % T.chords.length]];
      const nextChord = CH[T.chords[(bar + 1) % T.chords.length]];
      // drums
      for (const [kind, pat] of Object.entries(T.drums || {})) { const v = P(pat)[s]; if (v) drum(c, d, t, kind, v * (0.85 + mrand() * 0.3)); }
      // bass: set hits, or a walking line on the beats
      if (T.bass) {
        if (T.bass.walk) {
          if (s % 4 === 0) { const q = s / 4, root = chord[0], tgt = nextChord[0]; const notes = [root, root + 7, root + 4 + (mrand() < 0.5 ? 0 : -1), tgt + (tgt > root ? -1 : 1)]; INST.bass(c, d, t, notes[q], T.bass.short ? STEP * 1.2 : STEP * 3.4, 0.9); }
        } else if (T.bass.at.includes(s)) INST.bass(c, d, t, chord[0] + (s >= 8 && mrand() < 0.25 ? 7 : 0), STEP * (s === 0 ? 5 : 2.5), s === 0 ? 1 : 0.8);
      }
      // chords
      if (T.comp && T.comp.at.includes(s)) for (const m of chord.slice(1)) INST[T.comp.inst](c, d, t + mrand() * 0.012, m, STEP * 4 * T.comp.dur, 0.75 + mrand() * 0.2);
      if (T.pad && s === 0) for (const m of chord.slice(1, 4)) INST[T.pad.inst](c, d, t, m, STEP * (BS - 1), 1);
      if (T.arp && s % T.arp.every === 0) {
        const k = T.arp.order[(s / T.arp.every) % T.arp.order.length];
        if (k) INST[T.arp.inst](c, d, t, chord[k] + (T.arp.up || 0), STEP * T.arp.every * 1.5, 0.8 + mrand() * 0.25);
      }
      // a song's melody, note for note
      if (T.melody) { const e = T.melody.ev.get(pos); if (e) INST[T.melInst](c, d, t, e.m, STEP * e.len * 0.92, T.melV || 1); }
      // a lazy lead that wanders over the chord tones now and then
      if (T.lead && s % 2 === 0 && mrand() < T.lead.p) INST[T.lead.inst](c, d, t, chord[1 + Math.floor(mrand() * 4)] + 12 + (T.lead.up || 0), STEP * (mrand() < 0.5 ? 2 : 4), 0.55 + mrand() * 0.2);
      MUSIC.step += 1;
      MUSIC.notes += 1;
      MUSIC.nextT += STEP;
    }
    MUSIC.beat = Math.floor((c.currentTime - MUSIC.startT) / (60 / T.bpm));
  }

