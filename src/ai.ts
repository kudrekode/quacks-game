import { POT_TRACK, PRICE_BOOK } from "./content.js";
import { dispatch, observe } from "./engine.js";
import { createRandomState, randomInt } from "./rng.js";
import type {
  Command, GameState, IngredientColor, Observation, PendingDecision, PlayerId,
  RandomState, Token, TokenValue,
} from "./types.js";

export interface MonteCarloConfig {
  brewingRollouts: number;
  purchaseRollouts: number;
  riskTolerance: number;
}

export interface AIDecisionReport {
  choice: string;
  candidates: Array<{ choice: string; utility: number; variance: number }>;
  rollouts: number;
  risk?: number;
  summary: string;
}

export const DEFAULT_MONTE_CARLO_CONFIG: Readonly<MonteCarloConfig> = {
  brewingRollouts: 900,
  purchaseRollouts: 120,
  riskTolerance: 0.34,
};

interface BrewSample {
  position: number;
  white: number;
  exploded: boolean;
  flaskFull: boolean;
  bag: Token[];
  orangeCount: number;
  lastColor?: IngredientColor;
  lastValue?: TokenValue;
  threshold: number;
}

function tokenUtility(observation: Observation, tokenId: string): number {
  const token = observation.tokens[tokenId];
  if (!token) return -100;
  const colorBonus = token.color === "blue" ? 1.4 : token.color === "red" ? 1.1 : token.color === "black" ? 0.8 : token.color === "green" ? 0.6 : token.color === "white" ? -token.value * 2 : 0.4;
  return token.value * 2 + colorBonus;
}

export function exactExplosionProbability(observation: Observation, actor: PlayerId): number {
  const player = observation.players[actor];
  if (player.bag.length === 0) return 1;
  let unsafe = 0;
  for (const id of player.bag) {
    const token = observation.tokens[id];
    if (token?.color === "white" && player.whiteTotal + token.value > player.explosionThreshold) unsafe += 1;
  }
  return unsafe / player.bag.length;
}

function purchaseUtility(choice: string): number {
  if (choice === "none") return 0;
  let utility = 0;
  for (const part of choice.slice(4).split("+")) {
    const [color, valueText] = part.split(":");
    const value = Number(valueText) as 1 | 2 | 4;
    const cost = PRICE_BOOK[color as keyof typeof PRICE_BOOK]?.[value] ?? 99;
    const synergy = color === "blue" ? 3 : color === "red" ? 2.5 : color === "black" ? 2 : color === "purple" ? 1.8 : 1;
    utility += value * 4 + synergy - cost * 0.2;
  }
  return utility;
}

function drawAt<T>(rng: RandomState, values: T[]): T | undefined {
  if (!values.length) return undefined;
  const index = randomInt(rng, values.length);
  return values.splice(index, 1)[0];
}

function movement(token: Token, sample: BrewSample, activeFortune?: string): number {
  let amount = token.value;
  if (token.color === "orange" && activeFortune === "F23") amount += 1;
  if (token.color === "red") amount += sample.orangeCount >= 3 ? 2 : sample.orangeCount >= 1 ? 1 : 0;
  return amount;
}

function placeSample(sample: BrewSample, token: Token, activeFortune?: string): void {
  sample.position = Math.min(52, sample.position + movement(token, sample, activeFortune));
  if (token.color === "yellow" && sample.lastColor === "white") {
    sample.white = Math.max(0, sample.white - (sample.lastValue ?? 0));
  }
  if (token.color === "white") sample.white += token.value;
  if (token.color === "orange") sample.orangeCount += 1;
  sample.lastColor = token.color;
  sample.lastValue = token.value;
  sample.exploded = sample.white > sample.threshold;
}

function scoringUtility(observation: Observation, actor: PlayerId, sample: BrewSample): number {
  const player = observation.players[actor];
  const opponent = observation.players[actor === "human" ? "ai" : "human"];
  const entry = POT_TRACK[Math.min(53, sample.position + 1)] ?? POT_TRACK.at(-1)!;
  const vp = entry.vp;
  const purchasePotential = entry.coins / 5;
  const explosionPenalty = sample.exploded ? Math.min(vp, purchasePotential) + 2.5 : 0;
  const scoreDiff = player.score - opponent.score;
  const remaining = 10 - observation.round;
  const bagQuality = sample.bag.reduce((sum, token) => sum + (token.color === "white" ? -token.value * 0.18 : token.value * 0.11), 0);
  const shaped = scoreDiff * 0.16 + vp * (observation.round >= 7 ? 1.15 : 0.8) + purchasePotential * Math.max(0.25, remaining * 0.12) + sample.position * 0.08 + bagQuality - explosionPenalty;
  return 1 / (1 + Math.exp(-shaped / 7));
}

function makeSample(observation: Observation, actor: PlayerId): BrewSample {
  const player = observation.players[actor];
  const anchor = player.pot.at(-1)?.trackIndex ?? player.ratIndex ?? player.dropletIndex;
  return {
    position: anchor,
    white: player.whiteTotal,
    exploded: player.exploded,
    flaskFull: player.flaskFull,
    bag: player.bag.map((id) => observation.tokens[id]).filter((token): token is Token => token !== undefined),
    orangeCount: player.pot.filter((placed) => observation.tokens[placed.tokenId]?.color === "orange").length,
    lastColor: player.placementOrder.length ? observation.tokens[player.placementOrder.at(-1)!]?.color : undefined,
    lastValue: player.placementOrder.length ? observation.tokens[player.placementOrder.at(-1)!]?.value : undefined,
    threshold: player.explosionThreshold,
  };
}

function rollBlue(sample: BrewSample, source: Token, rng: RandomState, activeFortune?: string): void {
  const shown: Token[] = [];
  for (let i = 0; i < source.value; i += 1) {
    const token = drawAt(rng, sample.bag);
    if (token) shown.push(token);
  }
  const safe = shown.filter((token) => token.color !== "white" || sample.white + token.value <= sample.threshold);
  const chosen = [...safe].sort((a, b) => movement(b, sample, activeFortune) - movement(a, sample, activeFortune))[0];
  for (const token of shown) if (token !== chosen) sample.bag.push(token);
  if (chosen) {
    placeSample(sample, chosen, activeFortune);
    if (chosen.color === "blue" && !sample.exploded) rollBlue(sample, chosen, rng, activeFortune);
  }
}

function sampleOneDraw(sample: BrewSample, rng: RandomState, activeFortune?: string): void {
  const token = drawAt(rng, sample.bag);
  if (!token) return;
  if (token.color === "white" && sample.white + token.value > sample.threshold && sample.flaskFull) {
    sample.flaskFull = false;
    sample.bag.push(token);
    return;
  }
  placeSample(sample, token, activeFortune);
  if (token.color === "blue" && !sample.exploded) rollBlue(sample, token, rng, activeFortune);
}

function simulateDraw(observation: Observation, actor: PlayerId, seed: string, rollout: number, config: MonteCarloConfig): number {
  const rng = createRandomState(`${seed}/brew/${observation.revision}/${rollout}`);
  const sample = makeSample(observation, actor);
  sampleOneDraw(sample, rng, observation.activeFortune);
  while (!sample.exploded && sample.bag.length) {
    const unsafe = sample.bag.filter((token) => token.color === "white" && sample.white + token.value > sample.threshold).length / sample.bag.length;
    const target = config.riskTolerance - Math.max(0, observation.round - 6) * 0.025;
    if (unsafe > target || sample.position >= 52) break;
    sampleOneDraw(sample, rng, observation.activeFortune);
  }
  return scoringUtility(observation, actor, sample);
}

function stats(values: number[]): { utility: number; variance: number } {
  const utility = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const variance = values.reduce((sum, value) => sum + (value - utility) ** 2, 0) / Math.max(1, values.length);
  return { utility, variance };
}

function parsePurchase(observation: Observation, choice: string): Token[] {
  if (choice === "none") return [];
  return choice.slice(4).split("+").map((part) => {
    const [color, value] = part.split(":");
    return { id: `candidate-${part}`, color: color as IngredientColor, value: Number(value) as TokenValue };
  }).filter((token) => observation.unlockedColors.includes(token.color));
}

function purchaseRollout(observation: Observation, actor: PlayerId, choice: string, seed: string, rollout: number): number {
  const player = observation.players[actor];
  const bag = [...player.bag.map((id) => observation.tokens[id]).filter((token): token is Token => Boolean(token)), ...parsePurchase(observation, choice)];
  const rng = createRandomState(`${seed}/purchase/${observation.revision}/${rollout}`);
  const sample: BrewSample = {
    position: player.dropletIndex, white: 0, exploded: false, flaskFull: true,
    bag: [...bag], orangeCount: 0, threshold: 7,
  };
  while (sample.bag.length && !sample.exploded) sampleOneDraw(sample, rng);
  const whiteWeight = bag.reduce((sum, token) => sum + (token.color === "white" ? token.value : 0), 0) / Math.max(1, bag.length);
  const endRewards = bag.filter((token) => token.color === "green").length * .25 + bag.filter((token) => token.color === "purple").length * .4;
  return sample.position - player.dropletIndex - whiteWeight * 1.8 + endRewards + purchaseUtility(choice) * 0.1;
}

function choosePurchaseMonteCarlo(observation: Observation, pending: PendingDecision, seed: string, config: MonteCarloConfig): AIDecisionReport {
  const candidates = pending.options.map((choice) => {
    const values = Array.from({ length: config.purchaseRollouts }, (_, rollout) => purchaseRollout(observation, pending.actor, choice, seed, rollout));
    const sampled = stats(values);
    return { choice, utility: sampled.utility + purchaseUtility(choice) * .28, variance: sampled.variance };
  }).sort((a, b) => b.utility - a.utility || a.variance - b.variance || a.choice.localeCompare(b.choice));
  const choice = observation.round === 9 && pending.options.includes("none") ? "none" : (candidates[0]?.choice ?? "none");
  const summary = observation.round === 9
    ? "Saved the final-round coins for end-game point conversion."
    : "Compared every legal basket by sampled future bag quality.";
  return { choice, candidates, rollouts: config.purchaseRollouts * candidates.length, summary };
}

function chooseStrategicRule(observation: Observation, pending: PendingDecision): string {
  const effect = String(pending.data.effect ?? "");
  if (effect === "F13" && observation.round >= 6 && pending.options.includes("vp:4")) return "vp:4";
  if (effect === "F05" || effect === "F18") {
    for (const preferred of ["blue:2", "red:2", "green:2", "black:1", "rubies:3"]) if (pending.options.includes(preferred)) return preferred;
  }
  if (effect === "F06") {
    for (const preferred of ["blue:1", "red:1", "green:1", "orange:1", "decline"]) if (pending.options.includes(preferred)) return preferred;
  }
  if (effect === "F14") {
    for (const preferred of ["blue:4", "red:4", "yellow:4", "green:4", "rat-vp"]) if (pending.options.includes(preferred)) return preferred;
  }
  return chooseBaseline(observation, pending);
}

export function chooseBaseline(observation: Observation, pending: PendingDecision): string {
  const player = observation.players[pending.actor];
  const options = pending.options;
  if (pending.kind === "BREW_ACTION") {
    const risk = exactExplosionProbability(observation, pending.actor);
    const last = player.pot.at(-1);
    if (options.includes("USE_FLASK") && last && observation.tokens[last.tokenId]?.color === "white" && player.whiteTotal >= 6) return "USE_FLASK";
    const lateCaution = observation.round >= 7 ? 0.24 : 0.38;
    if (options.includes("DRAW") && risk <= lateCaution && player.bag.length > 0) return "DRAW";
    return "STOP";
  }
  if (pending.kind === "ROUND9_COMMIT") return exactExplosionProbability(observation, pending.actor) <= 0.22 ? "DRAW" : "STOP";
  if (pending.kind === "BLUE_SELECT" || pending.kind === "STRONG_SELECT") {
    const tokens = options.filter((x) => x.startsWith("token:"));
    const best = tokens.sort((a,b) => tokenUtility(observation,b.slice(6))-tokenUtility(observation,a.slice(6)))[0];
    return best && tokenUtility(observation,best.slice(6)) > 0 ? best : "none";
  }
  if (pending.kind === "YELLOW_REMOVE") return "remove";
  if (pending.kind === "WHITE_REPRIEVE") return "return";
  if (pending.kind === "RESTART") return player.whiteTotal >= 6 || player.pot.length < 3 ? "restart" : "continue";
  if (pending.kind === "PURPLE_TIER") return options.at(-1) ?? options[0] ?? "";
  if (pending.kind === "EXPLOSION_CHOICE") return observation.round <= 5 ? "buy" : (player.roundBaseVP >= Math.floor(player.roundCoins / 5) ? "score" : "buy");
  if (pending.kind === "PURCHASE") return [...options].sort((a,b) => purchaseUtility(b)-purchaseUtility(a))[0] ?? "none";
  if (pending.kind === "RUBY_ACTION") {
    if (options.includes("flask") && !player.flaskFull) return "flask";
    if (options.includes("droplet")) return "droplet";
    return "done";
  }
  if (options.includes("remove:white:1")) return "remove:white:1";
  if (options.includes("droplet")) return "droplet";
  if (options.includes("rat-vp") && observation.round >= 7) return "rat-vp";
  const tokenOptions = options.filter((x) => /^(orange|green|blue|red|yellow|purple|black):/.test(x));
  if (tokenOptions.length) return tokenOptions.sort((a,b) => Number(b.split(":")[1])-Number(a.split(":")[1]))[0] ?? options[0] ?? "";
  if (options.includes("vp:4") && observation.round >= 5) return "vp:4";
  if (options.includes("rubies:3")) return "rubies:3";
  return options[0] ?? "";
}

export function evaluateMonteCarloDecision(
  observation: Observation,
  pending: PendingDecision,
  seed: string,
  partialConfig: Partial<MonteCarloConfig> = {},
): AIDecisionReport {
  if (pending.actor !== observation.viewer) throw new Error("AI can only evaluate its own redacted observation");
  if (!pending.options.length) throw new Error("Decision has no legal options");
  const config = { ...DEFAULT_MONTE_CARLO_CONFIG, ...partialConfig };
  if (pending.kind === "PURCHASE") return choosePurchaseMonteCarlo(observation, pending, seed, config);
  if (pending.kind === "BREW_ACTION" || pending.kind === "ROUND9_COMMIT") {
    const risk = exactExplosionProbability(observation, pending.actor);
    const player = observation.players[pending.actor];
    const stopSample = makeSample(observation, pending.actor);
    const stop = stats(Array.from({ length: config.brewingRollouts }, () => scoringUtility(observation, pending.actor, stopSample)));
    const candidates = pending.options.map((choice) => {
      if (choice === "STOP") return { choice, ...stop };
      if (choice === "USE_FLASK") {
        const utility = stop.utility + (player.whiteTotal >= 5 ? 0.025 : -0.015);
        return { choice, utility, variance: 0 };
      }
      const values = Array.from({ length: config.brewingRollouts }, (_, rollout) => simulateDraw(observation, pending.actor, seed, rollout, config));
      return { choice, ...stats(values) };
    }).sort((a, b) => b.utility - a.utility || a.variance - b.variance || a.choice.localeCompare(b.choice));
    const baseline = chooseBaseline(observation, pending);
    const byChoice = new Map(candidates.map((candidate) => [candidate.choice, candidate]));
    const stopCandidate = byChoice.get("STOP");
    const drawCandidate = byChoice.get("DRAW");
    let choice = baseline;
    // The calibrated baseline is the rollout prior: Monte Carlo may take an
    // extra calculated risk, but noise is not allowed to veto a known-safe draw.
    if (baseline === "STOP" && drawCandidate && stopCandidate && risk <= .3 && drawCandidate.utility > stopCandidate.utility + .018) choice = "DRAW";
    if (baseline === "DRAW" && observation.round >= 7 && risk >= .2 && drawCandidate && stopCandidate && drawCandidate.utility < stopCandidate.utility - .06) choice = "STOP";
    return {
      choice, candidates,
      rollouts: config.brewingRollouts, risk,
      summary: `${Math.round(risk * 100)}% immediate explosion risk; sampled ${config.brewingRollouts} continuations.`,
    };
  }
  const choice = chooseStrategicRule(observation, pending);
  return { choice, candidates: pending.options.map((option) => ({ choice: option, utility: option === choice ? 1 : 0, variance: 0 })), rollouts: 0, summary: "Applied the deterministic strategic policy for this rules choice." };
}

export function baselineCommand(state: GameState): Command {
  const pending = state.pendingDecision;
  if (!pending) throw new Error("No pending decision");
  const choice = chooseBaseline(observe(state, pending.actor), pending);
  return { type: "RESOLVE_DECISION", decisionId: pending.id, choice };
}

export function monteCarloCommand(state: GameState, config?: Partial<MonteCarloConfig>): Command {
  const pending = state.pendingDecision;
  if (!pending) throw new Error("No pending decision");
  const report = evaluateMonteCarloDecision(observe(state, pending.actor), pending, `${state.config.seed}/ai/${pending.actor}`, config);
  return { type: "RESOLVE_DECISION", decisionId: pending.id, choice: report.choice };
}

export function playBaselineGame(initial: GameState, maxDecisions = 5000): GameState {
  let state = initial;
  for (let i = 0; i < maxDecisions && state.phase !== "GAME_OVER"; i += 1) state = dispatch(state, baselineCommand(state));
  if (state.phase !== "GAME_OVER") throw new Error(`Game did not terminate after ${maxDecisions} decisions`);
  return state;
}

export function playMonteCarloGame(initial: GameState, config?: Partial<MonteCarloConfig>, maxDecisions = 5000): GameState {
  let state = initial;
  for (let i = 0; i < maxDecisions && state.phase !== "GAME_OVER"; i += 1) state = dispatch(state, monteCarloCommand(state, config));
  if (state.phase !== "GAME_OVER") throw new Error(`Game did not terminate after ${maxDecisions} decisions`);
  return state;
}
