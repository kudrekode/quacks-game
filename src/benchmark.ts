import { baselineCommand, monteCarloCommand, type MonteCarloConfig } from "./ai.js";
import { createGame, dispatch } from "./engine.js";
import type { GameState, PlayerId } from "./types.js";

export interface BenchmarkResult {
  games: number;
  monteCarloWins: number;
  baselineWins: number;
  ties: number;
  monteCarloAverageVP: number;
  baselineAverageVP: number;
  winRate: number;
  confidence95: [number, number];
  elapsedMs: number;
  illegalActions: number;
}

function other(id: PlayerId): PlayerId { return id === "human" ? "ai" : "human"; }

export function playPolicyMatch(seed: string, monteCarloActor: PlayerId, startPlayerId: PlayerId, config: Partial<MonteCarloConfig>): GameState {
  let state = createGame({ seed, startPlayerId, controllers: { human: "ai", ai: "ai" } });
  for (let guard = 0; guard < 5000 && state.phase !== "GAME_OVER"; guard += 1) {
    const pending = state.pendingDecision;
    if (!pending) throw new Error("A policy match reached a state without a decision");
    state = dispatch(state, pending.actor === monteCarloActor ? monteCarloCommand(state, config) : baselineCommand(state));
  }
  if (state.phase !== "GAME_OVER") throw new Error("Policy match did not terminate");
  return state;
}

export function benchmarkPolicies(pairs: number, config: Partial<MonteCarloConfig> = { brewingRollouts: 64, purchaseRollouts: 16 }): BenchmarkResult {
  const started = Date.now();
  let monteCarloWins = 0, baselineWins = 0, ties = 0, monteCarloVP = 0, baselineVP = 0, illegalActions = 0;
  for (let pair = 0; pair < pairs; pair += 1) {
    for (const monteCarloActor of ["human", "ai"] as const) {
      try {
        const state = playPolicyMatch(`paired-${pair}`, monteCarloActor, pair % 2 ? "ai" : "human", config);
        const rival = other(monteCarloActor);
        monteCarloVP += state.players[monteCarloActor].score;
        baselineVP += state.players[rival].score;
        if (state.result!.winners.length > 1) ties += 1;
        else if (state.result!.winners[0] === monteCarloActor) monteCarloWins += 1;
        else baselineWins += 1;
      } catch { illegalActions += 1; }
    }
  }
  const games = pairs * 2;
  const decisiveEquivalent = monteCarloWins + ties * .5;
  const winRate = decisiveEquivalent / games;
  const margin = 1.96 * Math.sqrt(Math.max(.000001, winRate * (1 - winRate) / games));
  return {
    games, monteCarloWins, baselineWins, ties,
    monteCarloAverageVP: monteCarloVP / games,
    baselineAverageVP: baselineVP / games,
    winRate,
    confidence95: [Math.max(0, winRate - margin), Math.min(1, winRate + margin)],
    elapsedMs: Date.now() - started,
    illegalActions,
  };
}

if (process.argv[1]?.includes("benchmark")) {
  const pairs = Math.max(1, Number(process.argv[2] ?? 100));
  console.log(JSON.stringify(benchmarkPolicies(pairs), null, 2));
}
