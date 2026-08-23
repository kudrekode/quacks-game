import { describe, expect, it } from "vitest";
import { ALL_CARD_IDS, POT_TRACK, RAT_BOUNDARIES, countRatTails, createTokenRegistry } from "../src/content.js";

describe("content fixtures", () => {
  it("contains the exact 54 pot entries", () => {
    expect(POT_TRACK).toHaveLength(54);
    expect(POT_TRACK[0]).toEqual({ trackIndex: 0, coins: 0, vp: 0, ruby: false });
    expect(POT_TRACK[16]).toEqual({ trackIndex: 16, coins: 15, vp: 3, ruby: true });
    expect(POT_TRACK[32]).toEqual({ trackIndex: 32, coins: 23, vp: 8, ruby: false });
    expect(POT_TRACK[52]).toEqual({ trackIndex: 52, coins: 33, vp: 14, ruby: true });
    expect(POT_TRACK[53]).toEqual({ trackIndex: 53, coins: 35, vp: 15, ruby: false });
  });

  it("counts rat boundaries strictly between absolute scores", () => {
    expect(RAT_BOUNDARIES).toHaveLength(23);
    expect(countRatTails(0, 1)).toBe(0);
    expect(countRatTails(0, 2)).toBe(1);
    expect(countRatTails(4, 7)).toBe(1);
    expect(countRatTails(0, 50)).toBe(23);
    expect(countRatTails(49, 52)).toBe(1);
    expect(countRatTails(50, 52)).toBe(1);
  });

  it("creates all 215 unique component tokens and 24 cards", () => {
    const { tokens, supply } = createTokenRegistry();
    expect(Object.keys(tokens)).toHaveLength(215);
    expect(new Set(supply).size).toBe(215);
    expect(ALL_CARD_IDS).toHaveLength(24);
    expect(new Set(ALL_CARD_IDS).size).toBe(24);
  });
});
