import type { RandomState } from "./types.js";

function xmur3(input: string): () => number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function createRandomState(seed: string): RandomState {
  const seedFn = xmur3(seed);
  const words: [number, number, number, number] = [seedFn(), seedFn(), seedFn(), seedFn()];
  if (words.every((word) => word === 0)) words[0] = 1;
  return { algorithm: "xoshiro128**", seed, words, drawsConsumed: 0 };
}

function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

export function nextUint32(state: RandomState): number {
  const [s0, s1, s2, s3] = state.words;
  const result = Math.imul(rotateLeft(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
  const t = (s1 << 9) >>> 0;
  state.words = [
    (s0 ^ s3) >>> 0,
    (s1 ^ s2) >>> 0,
    (s2 ^ s0 ^ t) >>> 0,
    rotateLeft((s3 ^ s1) >>> 0, 11),
  ];
  state.drawsConsumed += 1;
  return result;
}

export function randomInt(state: RandomState, maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error("maxExclusive must be positive");
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  let value: number;
  do value = nextUint32(state); while (value >= limit);
  return value % maxExclusive;
}

export function shuffle<T>(state: RandomState, values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(state, i + 1);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export function drawRandom<T>(state: RandomState, values: T[]): T {
  if (values.length === 0) throw new Error("Cannot draw from an empty collection");
  const index = randomInt(state, values.length);
  const [value] = values.splice(index, 1);
  if (value === undefined) throw new Error("Random draw failed");
  return value;
}
