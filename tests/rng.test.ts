import { describe, expect, it } from "vitest";
import { createRandomState, nextUint32, randomInt, shuffle } from "../src/rng.js";

describe("deterministic RNG", () => {
  it("reproduces a fixed stream and survives serialization", () => {
    const a = createRandomState("apothecary");
    const b = createRandomState("apothecary");
    expect(Array.from({ length: 20 }, () => nextUint32(a))).toEqual(Array.from({ length: 20 }, () => nextUint32(b)));
    const restored = JSON.parse(JSON.stringify(a));
    expect(nextUint32(restored)).toBe(nextUint32(a));
  });

  it("generates bounded values and deterministic shuffles", () => {
    const state = createRandomState("bounds");
    for (let i = 0; i < 1000; i += 1) expect(randomInt(state, 7)).toBeGreaterThanOrEqual(0);
    const a = createRandomState("shuffle");
    const b = createRandomState("shuffle");
    expect(shuffle(a, [1,2,3,4,5,6])).toEqual(shuffle(b, [1,2,3,4,5,6]));
  });
});
