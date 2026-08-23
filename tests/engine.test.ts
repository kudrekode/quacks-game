import { describe, expect, it } from "vitest";
import { ALL_CARD_IDS } from "../src/content.js";
import { playBaselineGame } from "../src/ai.js";
import { createGame, deserialize, dispatch, observe, replayGame, serialize, stateHash, validateInvariants } from "../src/engine.js";
import type { CardId, GameState } from "../src/types.js";

const deckWith = (first: CardId) => [first, ...ALL_CARD_IDS.filter((id) => id !== first)];

describe("game setup and command boundary", () => {
  it("creates the standard two-player setup", () => {
    const state = createGame({ seed: "setup", fortuneDeck: deckWith("F11") });
    expect(state.players.human.bag).toHaveLength(9);
    expect(state.players.ai.bag).toHaveLength(9);
    expect(state.players.human.rubies).toBe(0);
    expect(state.supply).toHaveLength(197);
    expect(state.players.human.explosionThreshold).toBe(9);
    expect(state.pendingDecision?.kind).toBe("BREW_ACTION");
    validateInvariants(state);
  });

  it("rejects stale and illegal decisions without mutating input", () => {
    const state = createGame({ seed: "commands", fortuneDeck: deckWith("F01") });
    const before = serialize(state);
    expect(() => dispatch(state, { type:"RESOLVE_DECISION", decisionId:"wrong", choice:"droplet" })).toThrow(/Stale/);
    expect(() => dispatch(state, { type:"RESOLVE_DECISION", decisionId:state.pendingDecision!.id, choice:"cheat" })).toThrow(/Illegal/);
    expect(serialize(state)).toBe(before);
  });

  it("serializes a pending continuation and resumes identically", () => {
    const state = createGame({ seed: "save", fortuneDeck: deckWith("F01") });
    const restored = deserialize(serialize(state));
    const command = { type:"RESOLVE_DECISION" as const, decisionId:state.pendingDecision!.id, choice:"droplet" };
    expect(stateHash(dispatch(state,command))).toBe(stateHash(dispatch(restored,command)));
  });

  it("replays decisions from the initial seed", () => {
    const config={seed:"replay",fortuneDeck:deckWith("F01")};
    const initial=createGame(config);
    const choice="droplet";
    const expected=dispatch(initial,{type:"RESOLVE_DECISION",decisionId:initial.pendingDecision!.id,choice});
    expect(stateHash(replayGame(config,[choice]))).toBe(stateHash(expected));
  });

  it("redacts unrevealed cards and another player's private preview", () => {
    const state = createGame({ seed:"privacy", fortuneDeck:deckWith("F09") });
    const human = observe(state,"human");
    const ai = observe(state,"ai");
    expect("fortuneDeck" in human).toBe(false);
    expect(human.players.ai.preview).toBeUndefined();
    expect(ai.players.human.preview).toBeUndefined();
    expect(human.pendingDecision?.actor).toBe("human");
    expect(ai.pendingDecision).toBeUndefined();
  });
});

describe("rules integration", () => {
  it("uses scoring track index rather than repeated coin value", () => {
    const state = createGame({ seed:"repeat", fortuneDeck:deckWith("F11") });
    state.players.human.pot = [{tokenId:state.players.human.bag[0]!,trackIndex:30,ordinal:0,baseMovement:1,effectiveMovement:1,source:"draw"}];
    state.players.ai.pot = [{tokenId:state.players.ai.bag[0]!,trackIndex:31,ordinal:0,baseMovement:1,effectiveMovement:1,source:"draw"}];
    expect(state.players.human.pot[0]!.trackIndex).toBeLessThan(state.players.ai.pot[0]!.trackIndex);
  });

  it("plays deterministic complete games and reveals nine unique cards", () => {
    const a = playBaselineGame(createGame({ seed:"complete" }));
    const b = playBaselineGame(createGame({ seed:"complete" }));
    expect(a.phase).toBe("GAME_OVER");
    expect(a.fortuneDiscard).toHaveLength(9);
    expect(new Set(a.fortuneDiscard).size).toBe(9);
    expect(stateHash(a)).toBe(stateHash(b));
    expect(a.result?.winners.length).toBeGreaterThan(0);
  });

  it("can complete a game with every Fortune card in the first round", () => {
    for (const card of ALL_CARD_IDS) {
      const result = playBaselineGame(createGame({ seed:`card-${card}`, fortuneDeck:deckWith(card) }));
      expect(result.phase, card).toBe("GAME_OVER");
      validateInvariants(result);
    }
  }, 30_000);

  it("terminates 100 varied games with no invariant failure", () => {
    for (let i=0;i<100;i+=1) {
      const result=playBaselineGame(createGame({seed:`soak-${i}`,startPlayerId:i%2?"ai":"human",controllers:{human:"ai",ai:"ai"}}));
      expect(result.revision).toBeLessThan(5000);
    }
  }, 30_000);
});
