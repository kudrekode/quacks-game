import { describe, expect, it } from "vitest";
import { createRandomState, drawRandom, nextUint32, randomInt, shuffle } from "../src/rng.js";

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

  it("samples uniformly from the live collection", () => {
    const state = createRandomState("uniform-live-bag");
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 20_000; i += 1) {
      const value = drawRandom(state, [0, 1, 2, 3]);
      counts[value]! += 1;
    }
    for (const count of counts) expect(count).toBeGreaterThan(4_750);
    for (const count of counts) expect(count).toBeLessThan(5_250);
  });

  it("can draw a returned token again but never draws a removed token", () => {
    const state = createRandomState("return-to-pool");
    const bag = ["returned"];
    expect(drawRandom(state, bag)).toBe("returned");
    expect(bag).toEqual([]);
    bag.push("returned");
    expect(drawRandom(state, bag)).toBe("returned");
    expect(bag).not.toContain("returned");
  });

  it("lets a bag-modifying decision change a later outcome without changing the seed", () => {
    const shared = createRandomState("branch-0");
    drawRandom(shared, ["first"]);
    const returnedBranch = structuredClone(shared);
    const removedBranch = structuredClone(shared);
    expect(drawRandom(returnedBranch, ["returned", "new"])).toBe("returned");
    expect(drawRandom(removedBranch, ["new"])).toBe("new");
    expect(returnedBranch.drawsConsumed).toBe(removedBranch.drawsConsumed);
  });
});
