let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicPlaying = false;
let musicTimeout: ReturnType<typeof setTimeout> | null = null;
let currentAmbiance: string = "town";

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType,
  dest: GainNode,
  startTime: number,
  volume = 0.3,
  detune = 0,
) {
  const c = getCtx();
  const osc = c.createOscillator();
  const env = c.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;

  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(env);
  env.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playNoise(
  duration: number,
  dest: GainNode,
  startTime: number,
  volume = 0.1,
  filterFreq = 800,
) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;

  const env = c.createGain();
  env.gain.setValueAtTime(volume, startTime);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  noise.connect(filter);
  filter.connect(env);
  env.connect(dest);
  noise.start(startTime);
  noise.stop(startTime + duration + 0.05);
}

// --- Sound Effects ---

export function sfxStep() {
  const c = getCtx();
  playNoise(0.06, sfxGain!, c.currentTime, 0.04, 400 + Math.random() * 200);
}

export function sfxPickup() {
  const c = getCtx();
  const t = c.currentTime;
  playTone(523, 0.08, "sine", sfxGain!, t, 0.3);
  playTone(659, 0.08, "sine", sfxGain!, t + 0.06, 0.3);
  playTone(784, 0.12, "sine", sfxGain!, t + 0.12, 0.25);
}

export function sfxHit() {
  const c = getCtx();
  const t = c.currentTime;
  playNoise(0.12, sfxGain!, t, 0.25, 2000);
  playTone(120, 0.1, "sawtooth", sfxGain!, t, 0.2);
}

export function sfxPlayerHurt() {
  const c = getCtx();
  const t = c.currentTime;
  playTone(200, 0.15, "sawtooth", sfxGain!, t, 0.2);
  playTone(150, 0.2, "sawtooth", sfxGain!, t + 0.1, 0.15);
  playNoise(0.15, sfxGain!, t, 0.15, 1500);
}

export function sfxEnemyDeath() {
  const c = getCtx();
  const t = c.currentTime;
  playTone(300, 0.1, "square", sfxGain!, t, 0.15);
  playTone(200, 0.15, "square", sfxGain!, t + 0.08, 0.12);
  playTone(100, 0.3, "square", sfxGain!, t + 0.18, 0.1);
  playNoise(0.25, sfxGain!, t + 0.05, 0.1, 1000);
}

export function sfxLevelUp() {
  const c = getCtx();
  const t = c.currentTime;
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    playTone(freq, 0.2, "sine", sfxGain!, t + i * 0.1, 0.25);
    playTone(freq * 1.5, 0.15, "triangle", sfxGain!, t + i * 0.1, 0.1);
  });
}

export function sfxQuestAccept() {
  const c = getCtx();
  const t = c.currentTime;
  playTone(392, 0.15, "triangle", sfxGain!, t, 0.2);
  playTone(523, 0.15, "triangle", sfxGain!, t + 0.12, 0.2);
  playTone(659, 0.25, "triangle", sfxGain!, t + 0.24, 0.18);
}

export function sfxQuestComplete() {
  const c = getCtx();
  const t = c.currentTime;
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    playTone(freq, 0.18, "sine", sfxGain!, t + i * 0.08, 0.2);
  });
}

export function sfxTalk() {
  const c = getCtx();
  const t = c.currentTime;
  const baseFreq = 180 + Math.random() * 60;
  for (let i = 0; i < 3; i++) {
    playTone(
      baseFreq + Math.random() * 80,
      0.06,
      "triangle",
      sfxGain!,
      t + i * 0.07,
      0.12,
    );
  }
}

export function sfxUseItem() {
  const c = getCtx();
  const t = c.currentTime;
  playTone(440, 0.1, "sine", sfxGain!, t, 0.2);
  playTone(660, 0.15, "sine", sfxGain!, t + 0.08, 0.15);
}

export function sfxDoorOpen() {
  const c = getCtx();
  const t = c.currentTime;
  playNoise(0.2, sfxGain!, t, 0.08, 600);
  playTone(220, 0.15, "triangle", sfxGain!, t + 0.05, 0.1);
  playTone(330, 0.2, "triangle", sfxGain!, t + 0.15, 0.08);
}

export function sfxDeath() {
  const c = getCtx();
  const t = c.currentTime;
  playTone(300, 0.3, "sawtooth", sfxGain!, t, 0.2);
  playTone(200, 0.4, "sawtooth", sfxGain!, t + 0.2, 0.18);
  playTone(100, 0.6, "sawtooth", sfxGain!, t + 0.5, 0.15);
  playTone(50, 1.0, "sine", sfxGain!, t + 0.8, 0.1);
}

export function sfxTabComplete() {
  const c = getCtx();
  const t = c.currentTime;
  playTone(880, 0.04, "sine", sfxGain!, t, 0.12);
  playTone(1100, 0.06, "sine", sfxGain!, t + 0.03, 0.1);
}

// --- Ambient Music ---
// Melancholy classical motifs inspired by Chopin's Prelude in E minor (Op. 28 No. 4).
// Each ambiance has its own set of phrases built from descending chromatic lines,
// sustained chords, and sighing resolutions — adapted to fit the mood of each room.

// Frequencies for specific notes (Hz). Using actual pitches for musical accuracy.
const N = {
  B2: 123.5, C3: 130.8, D3: 146.8, Eb3: 155.6, E3: 164.8, F3: 174.6,
  Fs3: 185.0, G3: 196.0, Ab3: 207.7, A3: 220.0, Bb3: 233.1, B3: 246.9,
  C4: 261.6, Cs4: 277.2, D4: 293.7, Eb4: 311.1, E4: 329.6, F4: 349.2,
  Fs4: 370.0, G4: 392.0, Ab4: 415.3, A4: 440.0, Bb4: 466.2, B4: 493.9,
  C5: 523.3, Cs5: 554.4, D5: 587.3, Eb5: 622.3, E5: 659.3, F5: 698.5,
  G5: 784.0, A5: 880.0, B5: 987.8,
};

interface Phrase {
  melody: { freq: number; dur: number; vol?: number }[];
  chords: { freqs: number[]; time: number; dur: number; vol?: number }[];
}

// Town — wistful, like remembering something gentle. Key of G major / E minor.
const TOWN_PHRASES: Phrase[] = [
  {
    melody: [
      { freq: N.B4, dur: 1.2 }, { freq: N.A4, dur: 0.8 }, { freq: N.G4, dur: 1.0 },
      { freq: N.Fs4, dur: 0.6 }, { freq: N.E4, dur: 1.8 },
    ],
    chords: [
      { freqs: [N.E3, N.B3, N.E4], time: 0, dur: 3.0, vol: 0.04 },
      { freqs: [N.C3, N.G3, N.E4], time: 2.8, dur: 2.5, vol: 0.035 },
    ],
  },
  {
    melody: [
      { freq: N.E5, dur: 0.6 }, { freq: N.D5, dur: 0.6 }, { freq: N.B4, dur: 1.0 },
      { freq: N.A4, dur: 0.8 }, { freq: N.G4, dur: 1.5 },
    ],
    chords: [
      { freqs: [N.G3, N.D4, N.B4], time: 0, dur: 2.5, vol: 0.04 },
      { freqs: [N.E3, N.B3, N.G4], time: 2.2, dur: 2.8, vol: 0.035 },
    ],
  },
  {
    melody: [
      { freq: N.G4, dur: 1.5 }, { freq: N.A4, dur: 0.5 }, { freq: N.B4, dur: 1.0 },
      { freq: N.A4, dur: 0.8 }, { freq: N.G4, dur: 0.6 }, { freq: N.E4, dur: 1.6 },
    ],
    chords: [
      { freqs: [N.C3, N.E3, N.G3], time: 0, dur: 2.0, vol: 0.04 },
      { freqs: [N.A3, N.E4], time: 1.8, dur: 2.0, vol: 0.03 },
      { freqs: [N.E3, N.B3], time: 3.5, dur: 2.5, vol: 0.035 },
    ],
  },
];

// Dungeon — Chopin Prelude No.4 feel: slow chromatic descent over held chords.
const DUNGEON_PHRASES: Phrase[] = [
  {
    melody: [
      { freq: N.B4, dur: 1.5 }, { freq: N.Bb4, dur: 1.0 }, { freq: N.A4, dur: 1.0 },
      { freq: N.Ab4, dur: 1.0 }, { freq: N.G4, dur: 2.0 },
    ],
    chords: [
      { freqs: [N.E3, N.B3, N.E4], time: 0, dur: 3.5, vol: 0.04 },
      { freqs: [N.C3, N.E3, N.A3], time: 3.0, dur: 3.5, vol: 0.035 },
    ],
  },
  {
    melody: [
      { freq: N.E5, dur: 1.2 }, { freq: N.Eb5, dur: 0.8 }, { freq: N.D5, dur: 0.8 },
      { freq: N.Cs5, dur: 0.8 }, { freq: N.C5, dur: 0.6 }, { freq: N.B4, dur: 2.2 },
    ],
    chords: [
      { freqs: [N.A3, N.E4], time: 0, dur: 2.5, vol: 0.035 },
      { freqs: [N.E3, N.G3, N.B3], time: 2.2, dur: 4.0, vol: 0.04 },
    ],
  },
  {
    melody: [
      { freq: N.G4, dur: 1.8 }, { freq: N.Fs4, dur: 1.0 }, { freq: N.F4, dur: 1.0 },
      { freq: N.E4, dur: 2.5 },
    ],
    chords: [
      { freqs: [N.C3, N.G3, N.E4], time: 0, dur: 3.0, vol: 0.04 },
      { freqs: [N.B2, N.E3, N.B3], time: 2.8, dur: 3.5, vol: 0.035 },
    ],
  },
];

// Cave — sparse, echoing. Longer silences. Dripping water motif.
const CAVE_PHRASES: Phrase[] = [
  {
    melody: [
      { freq: N.E4, dur: 2.5 }, { freq: N.D4, dur: 1.5 }, { freq: N.B3, dur: 3.0 },
    ],
    chords: [
      { freqs: [N.E3, N.B3], time: 0, dur: 5.0, vol: 0.03 },
    ],
  },
  {
    melody: [
      { freq: N.B4, dur: 2.0 }, { freq: N.A4, dur: 1.5 },
      { freq: N.E4, dur: 3.0 },
    ],
    chords: [
      { freqs: [N.A3, N.E4], time: 0, dur: 3.0, vol: 0.025 },
      { freqs: [N.E3, N.B3], time: 2.5, dur: 4.0, vol: 0.03 },
    ],
  },
  {
    melody: [
      { freq: N.G4, dur: 1.0, vol: 0.06 }, { freq: N.Fs4, dur: 1.5 },
      { freq: N.E4, dur: 1.5 }, { freq: N.D4, dur: 2.5 },
    ],
    chords: [
      { freqs: [N.G3, N.D4], time: 0, dur: 2.5, vol: 0.025 },
      { freqs: [N.D3, N.A3], time: 2.0, dur: 4.5, vol: 0.03 },
    ],
  },
];

// Boss — tense, minor, rhythmic pulse underneath descending lines.
const BOSS_PHRASES: Phrase[] = [
  {
    melody: [
      { freq: N.E5, dur: 0.5 }, { freq: N.Eb5, dur: 0.5 }, { freq: N.D5, dur: 0.5 },
      { freq: N.Cs5, dur: 0.5 }, { freq: N.C5, dur: 0.5 }, { freq: N.B4, dur: 0.5 },
      { freq: N.Bb4, dur: 0.5 }, { freq: N.A4, dur: 1.5 },
    ],
    chords: [
      { freqs: [N.E3, N.B3, N.E4], time: 0, dur: 2.5, vol: 0.045 },
      { freqs: [N.A3, N.E4, N.A4], time: 2.0, dur: 3.0, vol: 0.04 },
    ],
  },
  {
    melody: [
      { freq: N.B4, dur: 0.4 }, { freq: N.E5, dur: 0.4 }, { freq: N.B4, dur: 0.4 },
      { freq: N.A4, dur: 0.4 }, { freq: N.G4, dur: 0.4 }, { freq: N.Fs4, dur: 0.4 },
      { freq: N.E4, dur: 2.0 },
    ],
    chords: [
      { freqs: [N.E3, N.G3, N.B3], time: 0, dur: 2.0, vol: 0.04 },
      { freqs: [N.B2, N.Fs3, N.B3], time: 1.8, dur: 3.0, vol: 0.045 },
    ],
  },
  {
    melody: [
      { freq: N.A4, dur: 0.6 }, { freq: N.B4, dur: 0.6 }, { freq: N.C5, dur: 0.6 },
      { freq: N.B4, dur: 0.6 }, { freq: N.A4, dur: 0.6 }, { freq: N.G4, dur: 0.6 },
      { freq: N.E4, dur: 1.8 },
    ],
    chords: [
      { freqs: [N.A3, N.C4, N.E4], time: 0, dur: 2.5, vol: 0.04 },
      { freqs: [N.E3, N.B3, N.E4], time: 2.2, dur: 3.0, vol: 0.04 },
    ],
  },
];

// Forest/Crypt — resolution theme. The Prelude's final chords: quiet, accepting.
const FOREST_PHRASES: Phrase[] = [
  {
    melody: [
      { freq: N.E5, dur: 1.5 }, { freq: N.D5, dur: 1.0 }, { freq: N.B4, dur: 1.0 },
      { freq: N.G4, dur: 1.5 }, { freq: N.E4, dur: 2.0 },
    ],
    chords: [
      { freqs: [N.E3, N.G3, N.B3, N.E4], time: 0, dur: 4.0, vol: 0.04 },
      { freqs: [N.C3, N.E3, N.G3, N.C4], time: 3.5, dur: 3.5, vol: 0.035 },
    ],
  },
  {
    melody: [
      { freq: N.B4, dur: 2.0 }, { freq: N.A4, dur: 1.0 }, { freq: N.G4, dur: 1.0 },
      { freq: N.Fs4, dur: 0.8 }, { freq: N.E4, dur: 2.5 },
    ],
    chords: [
      { freqs: [N.G3, N.B3, N.D4], time: 0, dur: 3.0, vol: 0.035 },
      { freqs: [N.E3, N.B3, N.E4], time: 2.5, dur: 4.5, vol: 0.04 },
    ],
  },
  {
    melody: [
      { freq: N.G4, dur: 1.0 }, { freq: N.B4, dur: 1.0 }, { freq: N.E5, dur: 2.0 },
      { freq: N.D5, dur: 0.8 }, { freq: N.B4, dur: 2.5 },
    ],
    chords: [
      { freqs: [N.E3, N.B3, N.G4], time: 0, dur: 3.5, vol: 0.04 },
      { freqs: [N.G3, N.D4, N.B4], time: 3.0, dur: 4.0, vol: 0.035 },
    ],
  },
];

const PHRASE_SETS: Record<string, Phrase[]> = {
  town: TOWN_PHRASES,
  dungeon: DUNGEON_PHRASES,
  cave: CAVE_PHRASES,
  boss: BOSS_PHRASES,
  forest: FOREST_PHRASES,
};

let phraseCount = 0;

function playPhrase(phrase: Phrase, t: number, ambiance: string) {
  // Melody — played on a soft triangle wave, like a distant piano
  let offset = 0;
  for (const note of phrase.melody) {
    const noteTime = t + offset;
    const vol = note.vol ?? 0.07;
    playTone(note.freq, note.dur * 0.8, "triangle", musicGain!, noteTime, vol);
    // Ghost octave below for warmth
    playTone(note.freq / 2, note.dur * 0.6, "sine", musicGain!, noteTime, vol * 0.25);
    offset += note.dur;
  }

  // Sustained chords — soft sine pads
  for (const chord of phrase.chords) {
    const chordTime = t + chord.time;
    const vol = chord.vol ?? 0.035;
    for (const freq of chord.freqs) {
      playTone(freq, chord.dur, "sine", musicGain!, chordTime, vol);
    }
  }
}

function playMusicPhrase(ambiance: string) {
  if (!musicPlaying) return;
  const c = getCtx();
  const t = c.currentTime;

  const phrases = PHRASE_SETS[ambiance] || PHRASE_SETS.dungeon;
  const phrase = phrases[phraseCount % phrases.length];

  // Low pedal tone — like a held sustain pedal
  const rootFreq = ambiance === "boss" ? N.E3 / 2 : N.E3;
  playTone(rootFreq, 7.0, "sine", musicGain!, t, 0.025);

  playPhrase(phrase, t + 0.5, ambiance);

  // Ambiance textures
  if (ambiance === "cave" || ambiance === "dungeon") {
    if (Math.random() > 0.4) {
      const dripTime = t + 4 + Math.random() * 3;
      playTone(1800 + Math.random() * 400, 0.03, "sine", musicGain!, dripTime, 0.02);
      playTone(1200 + Math.random() * 200, 0.06, "sine", musicGain!, dripTime + 0.04, 0.012);
    }
  }

  if (ambiance === "boss") {
    for (let i = 0; i < 8; i++) {
      const beatTime = t + i * 0.55;
      playTone(N.E3 / 2, 0.1, "sawtooth", musicGain!, beatTime, 0.03);
    }
  }

  if (ambiance === "town" && Math.random() > 0.5) {
    const bellTime = t + 2 + Math.random() * 3;
    playTone(N.E5, 1.2, "sine", musicGain!, bellTime, 0.015);
  }

  phraseCount++;
  const nextDelay = ambiance === "cave"
    ? 6000 + Math.random() * 3000
    : ambiance === "boss"
      ? 3500 + Math.random() * 1500
      : 5000 + Math.random() * 2500;
  musicTimeout = setTimeout(() => playMusicPhrase(currentAmbiance), nextDelay);
}

export function startMusic(ambiance: string) {
  getCtx();
  currentAmbiance = ambiance;
  if (!musicPlaying) {
    musicPlaying = true;
    playMusicPhrase(ambiance);
  }
}

export function changeAmbiance(ambiance: string) {
  currentAmbiance = ambiance;
  phraseCount = 0;
}

export function stopMusic() {
  musicPlaying = false;
  if (musicTimeout) {
    clearTimeout(musicTimeout);
    musicTimeout = null;
  }
}

export function setMusicVolume(vol: number) {
  if (musicGain) musicGain.gain.value = vol;
}

export function setSfxVolume(vol: number) {
  if (sfxGain) sfxGain.gain.value = vol;
}
