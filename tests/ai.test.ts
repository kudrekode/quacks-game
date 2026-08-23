import { describe, expect, it } from "vitest";
import { evaluateMonteCarloDecision, exactExplosionProbability, monteCarloCommand, playMonteCarloGame } from "../src/ai.js";
import { createGame, dispatch, observe } from "../src/engine.js";

describe("information-set Monte Carlo AI", () => {
  it("is deterministic and always returns a legal action", () => {
    const state = createGame({ seed: "mc-deterministic" });
    const pending = state.pendingDecision!;
    const observation = observe(state, pending.actor);
    const first = evaluateMonteCarloDecision(observation, pending, "ai-seed", { brewingRollouts: 80 });
    const second = evaluateMonteCarloDecision(observation, pending, "ai-seed", { brewingRollouts: 80 });
    expect(first).toEqual(second);
    expect(pending.options).toContain(first.choice);
    expect(() => dispatch(state, monteCarloCommand(state, { brewingRollouts: 40 }))).not.toThrow();
  });

  it("calculates immediate explosion risk from the exact remaining multiset", () => {
    const state = createGame({ seed: "mc-risk" });
    const player = state.players.human;
    player.whiteTotal = 6;
    const observation = observe(state, "human");
    const unsafe = player.bag.filter((id) => state.tokens[id]?.color === "white" && state.tokens[id]!.value + 6 > 7).length;
    expect(exactExplosionProbability(observation, "human")).toBe(unsafe / player.bag.length);
  });

  it("cannot evaluate another player's hidden decision", () => {
    const state = createGame({ seed: "mc-redaction" });
    const pending = { ...state.pendingDecision!, actor: "ai" as const };
    expect(() => evaluateMonteCarloDecision(observe(state, "human"), pending, "seed", { brewingRollouts: 4 })).toThrow(/own redacted observation/);
  });

  it("completes a deterministic game without illegal actions", () => {
    const game = playMonteCarloGame(createGame({ seed: "mc-complete", controllers: { human: "ai", ai: "ai" } }), { brewingRollouts: 12, purchaseRollouts: 4 });
    expect(game.phase).toBe("GAME_OVER");
    expect(game.result?.winners.length).toBeGreaterThan(0);
  });

  it("preserves round-nine coins for final conversion", () => {
    const state = createGame({ seed: "mc-final-coins" });
    const observation = observe(state, "human");
    observation.round = 9;
    const pending = { id: "purchase", actor: "human" as const, kind: "PURCHASE" as const, prompt: "Buy", options: ["none", "buy:orange:1"], data: {} };
    expect(evaluateMonteCarloDecision(observation, pending, "seed", { purchaseRollouts: 4 }).choice).toBe("none");
  });
});
