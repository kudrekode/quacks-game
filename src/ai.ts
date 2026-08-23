import { PRICE_BOOK } from "./content.js";
import { dispatch, observe } from "./engine.js";
import type { Command, GameState, Observation, PendingDecision, PlayerId } from "./types.js";

function tokenUtility(observation: Observation, tokenId: string): number {
  const token = observation.tokens[tokenId];
  if (!token) return -100;
  const colorBonus = token.color === "blue" ? 1.4 : token.color === "red" ? 1.1 : token.color === "black" ? 0.8 : token.color === "green" ? 0.6 : token.color === "white" ? -token.value * 2 : 0.4;
  return token.value * 2 + colorBonus;
}

function explosionProbability(observation: Observation, actor: PlayerId): number {
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

export function chooseBaseline(observation: Observation, pending: PendingDecision): string {
  const player = observation.players[pending.actor];
  const options = pending.options;
  if (pending.kind === "BREW_ACTION") {
    const risk = explosionProbability(observation, pending.actor);
    const last = player.pot.at(-1);
    if (options.includes("USE_FLASK") && last && observation.tokens[last.tokenId]?.color === "white" && player.whiteTotal >= 6) return "USE_FLASK";
    const lateCaution = observation.round >= 7 ? 0.24 : 0.38;
    if (options.includes("DRAW") && risk <= lateCaution && player.bag.length > 0) return "DRAW";
    return "STOP";
  }
  if (pending.kind === "ROUND9_COMMIT") return explosionProbability(observation, pending.actor) <= 0.22 ? "DRAW" : "STOP";
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

export function baselineCommand(state: GameState): Command {
  const pending = state.pendingDecision;
  if (!pending) throw new Error("No pending decision");
  const choice = chooseBaseline(observe(state, pending.actor), pending);
  return { type: "RESOLVE_DECISION", decisionId: pending.id, choice };
}

export function playBaselineGame(initial: GameState, maxDecisions = 5000): GameState {
  let state = initial;
  for (let i = 0; i < maxDecisions && state.phase !== "GAME_OVER"; i += 1) state = dispatch(state, baselineCommand(state));
  if (state.phase !== "GAME_OVER") throw new Error(`Game did not terminate after ${maxDecisions} decisions`);
  return state;
}
