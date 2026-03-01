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

const SCALES: Record<string, number[]> = {
  town: [261, 294, 330, 349, 392, 440, 494],
  dungeon: [220, 247, 261, 294, 330, 349, 415],
  cave: [196, 220, 233, 261, 294, 311, 370],
  forest: [261, 294, 330, 392, 440, 523, 587],
  boss: [196, 233, 261, 294, 349, 370, 415],
};

// Recurring melodic baselines per ambiance — each has 3-4 short motifs
// that cycle and repeat, giving each room a recognizable identity.
// Notes are scale indices; durations in beats (1 beat ≈ 0.45s).
interface Motif {
  notes: number[];    // indices into the room's scale
  durations: number[];
  octaves: number[];  // 1 = base, 2 = octave up
}

const BASELINES: Record<string, Motif[]> = {
  town: [
    { notes: [0, 2, 4, 2],    durations: [1, 1, 1.5, 0.5], octaves: [1, 1, 1, 1] },
    { notes: [4, 3, 2, 0],    durations: [1, 0.5, 0.5, 2], octaves: [1, 1, 1, 1] },
    { notes: [0, 4, 5, 4, 2], durations: [0.5, 0.5, 1, 0.5, 1.5], octaves: [1, 1, 1, 1, 1] },
    { notes: [5, 4, 2, 0, 0], durations: [0.5, 0.5, 1, 0.5, 1.5], octaves: [2, 1, 1, 1, 1] },
  ],
  dungeon: [
    { notes: [0, 2, 3, 1],       durations: [1.5, 0.5, 1, 1],     octaves: [1, 1, 1, 1] },
    { notes: [5, 3, 2, 0],       durations: [0.5, 1, 0.5, 2],     octaves: [1, 1, 1, 1] },
    { notes: [0, 1, 3, 5, 3, 0], durations: [1, 0.5, 0.5, 0.5, 0.5, 1.5], octaves: [1, 1, 1, 1, 1, 1] },
  ],
  cave: [
    { notes: [0, 3, 2, 0],          durations: [2, 1, 1, 2],         octaves: [1, 1, 1, 1] },
    { notes: [4, 3, 1, 0],          durations: [1, 1.5, 0.5, 2],     octaves: [1, 1, 1, 1] },
    { notes: [0, 1, 0, 3, 4],       durations: [1, 0.5, 1, 1, 1.5],  octaves: [1, 1, 1, 1, 1] },
    { notes: [5, 4, 3, 1, 0],       durations: [0.5, 0.5, 1, 1, 2],  octaves: [1, 1, 1, 1, 1] },
  ],
  forest: [
    { notes: [0, 2, 3, 5, 3],    durations: [0.5, 0.5, 1, 0.5, 1.5], octaves: [1, 1, 1, 1, 1] },
    { notes: [5, 3, 2, 0],       durations: [1, 0.5, 1, 1.5],        octaves: [2, 1, 1, 1] },
    { notes: [0, 3, 5, 3, 2, 0], durations: [0.5, 0.5, 0.5, 0.5, 0.5, 1.5], octaves: [1, 1, 2, 1, 1, 1] },
  ],
  boss: [
    { notes: [0, 0, 2, 3, 0],       durations: [0.5, 0.5, 0.5, 0.5, 2], octaves: [1, 1, 1, 1, 1] },
    { notes: [5, 4, 3, 2, 0, 0],    durations: [0.5, 0.5, 0.5, 0.5, 0.5, 1.5], octaves: [1, 1, 1, 1, 1, 1] },
    { notes: [0, 3, 5, 6, 5, 3, 0], durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], octaves: [1, 1, 1, 1, 1, 1, 1] },
  ],
};

let phraseCount = 0;

function playBaseline(ambiance: string, t: number, scale: number[]) {
  const motifs = BASELINES[ambiance] || BASELINES.dungeon;
  const motif = motifs[phraseCount % motifs.length];

  const beatLen = ambiance === "boss" ? 0.35 : 0.45;
  let offset = 0;

  for (let i = 0; i < motif.notes.length; i++) {
    const idx = Math.min(motif.notes[i], scale.length - 1);
    const freq = scale[idx] * motif.octaves[i];
    const dur = motif.durations[i] * beatLen;
    const noteTime = t + offset;

    playTone(freq, dur * 0.85, "triangle", musicGain!, noteTime, 0.07);

    // subtle harmony on longer notes
    if (dur > 0.8) {
      playTone(freq * 0.5, dur, "sine", musicGain!, noteTime, 0.03);
    }

    offset += dur;
  }
}

function playMusicPhrase(ambiance: string) {
  if (!musicPlaying) return;
  const c = getCtx();
  const t = c.currentTime;
  const scale = SCALES[ambiance] || SCALES.dungeon;

  // Low drone
  const droneFreq = scale[0] / 2;
  playTone(droneFreq, 5.0, "sine", musicGain!, t, 0.05);
  playTone(droneFreq * 1.5, 5.0, "sine", musicGain!, t, 0.02, 3);

  // Play the recurring baseline motif
  playBaseline(ambiance, t + 0.3, scale);

  // Scattered ambient notes between baseline repeats
  if (Math.random() > 0.4) {
    const extraCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < extraCount; i++) {
      const noteIdx = Math.floor(Math.random() * scale.length);
      const freq = scale[noteIdx] * (Math.random() > 0.75 ? 2 : 1);
      const noteTime = t + 2.5 + Math.random() * 2.5;
      const dur = 0.4 + Math.random() * 0.5;
      playTone(freq, dur, "sine", musicGain!, noteTime, 0.03 + Math.random() * 0.03);
    }
  }

  // Ambiance-specific texture
  if (ambiance === "cave" || ambiance === "dungeon") {
    if (Math.random() > 0.4) {
      const dripTime = t + 3 + Math.random() * 3;
      playTone(1800 + Math.random() * 400, 0.03, "sine", musicGain!, dripTime, 0.025);
      playTone(1200 + Math.random() * 200, 0.05, "sine", musicGain!, dripTime + 0.03, 0.015);
    }
  }

  if (ambiance === "boss") {
    for (let i = 0; i < 6; i++) {
      const beatTime = t + i * 0.7;
      playTone(55, 0.12, "sawtooth", musicGain!, beatTime, 0.04);
      if (i % 2 === 1) {
        playNoise(0.06, musicGain!, beatTime + 0.35, 0.025, 500);
      }
    }
  }

  if (ambiance === "town" && Math.random() > 0.6) {
    const bellTime = t + 1 + Math.random() * 3;
    playTone(1047, 0.8, "sine", musicGain!, bellTime, 0.02);
    playTone(1568, 0.5, "sine", musicGain!, bellTime, 0.01);
  }

  phraseCount++;
  const nextDelay = 4000 + Math.random() * 2500;
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
