// Mulberry32 — a simple, fast, seedable 32-bit PRNG
let state = 0;
const SEED_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const SEED_LENGTH = 6;
const MAX_SEED_VALUE = SEED_ALPHABET.length ** SEED_LENGTH - 1;

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0;
  return Math.abs(Math.floor(seed)) % (MAX_SEED_VALUE + 1);
}

export function setSeed(seed: number) {
  state = normalizeSeed(seed) | 0;
}

export function random(): number {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getSeed(): number {
  return state;
}

export function formatSeed(seed: number): string {
  let value = normalizeSeed(seed);
  let code = "";

  for (let i = 0; i < SEED_LENGTH; i += 1) {
    code = SEED_ALPHABET[value % SEED_ALPHABET.length] + code;
    value = Math.floor(value / SEED_ALPHABET.length);
  }

  return code;
}

export function parseSeed(seedCode: string): number | null {
  const normalized = seedCode.trim().toUpperCase();
  if (!new RegExp(`^[A-Z]{${SEED_LENGTH}}$`).test(normalized)) {
    return null;
  }

  let value = 0;
  for (const ch of normalized) {
    value = value * SEED_ALPHABET.length + (ch.charCodeAt(0) - 65);
  }

  return value;
}

export function generateSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED_VALUE + 1));
}
