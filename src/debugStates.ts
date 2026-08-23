import { createGame } from "./engine.js";
import type { GameLogEntry, GameState, IngredientColor, PendingDecision, PlacedToken, TokenValue } from "./types.js";

export type DebugStateName = "empty-pot" | "brewing" | "ingredients" | "mid-track" | "high-risk" | "dense-pot" | "ai-brewing" | "ai-stopped" | "purchasing" | "fortune" | "tooltip" | "toast" | "round9" | "round-summary" | "resolution-bonus" | "resolution-rewards" | "resolution-purchase" | "resolution-purchase-selected" | "resolution-ruby" | "resolution-complete";

const validStates = new Set<DebugStateName>(["empty-pot", "brewing", "ingredients", "mid-track", "high-risk", "dense-pot", "ai-brewing", "ai-stopped", "purchasing", "fortune", "tooltip", "toast", "round9", "round-summary", "resolution-bonus", "resolution-rewards", "resolution-purchase", "resolution-purchase-selected", "resolution-ruby", "resolution-complete"]);

export function debugStateFromLocation(): DebugStateName | "home" | undefined {
  if (!(import.meta as { env?: { DEV?: boolean } }).env?.DEV) return undefined;
  const value = new URLSearchParams(window.location.search).get("debugState");
  if (value === "home") return "home";
  return validStates.has(value as DebugStateName) ? value as DebugStateName : undefined;
}

function removeEverywhere(state: GameState, id: string): void {
  state.supply = state.supply.filter((tokenId) => tokenId !== id);
  for (const player of Object.values(state.players)) {
    player.bag = player.bag.filter((tokenId) => tokenId !== id);
    player.preview = player.preview.filter((tokenId) => tokenId !== id);
    player.pot = player.pot.filter((placed) => placed.tokenId !== id);
    player.placementOrder = player.placementOrder.filter((tokenId) => tokenId !== id);
  }
}

function take(state: GameState, color: IngredientColor, value: TokenValue): string {
  const available = new Set([...state.supply, ...state.players.human.bag, ...state.players.ai.bag]);
  const id = Object.values(state.tokens).find((token) => available.has(token.id) && token.color === color && token.value === value)?.id;
  if (!id) throw new Error(`Missing debug token ${color}:${value}`);
  removeEverywhere(state, id);
  return id;
}

function fillPot(state: GameState, actor: "human" | "ai", recipe: Array<[IngredientColor, TokenValue]>): void {
  const player = state.players[actor];
  player.pot = [];
  player.placementOrder = [];
  let trackIndex = player.ratIndex ?? player.dropletIndex;
  recipe.forEach(([color, value], ordinal) => {
    const id = take(state, color, value);
    trackIndex += value;
    const placed: PlacedToken = { tokenId: id, trackIndex, ordinal, baseMovement: value, effectiveMovement: value, source: "draw" };
    player.pot.push(placed);
    player.placementOrder.push(id);
  });
  player.placementEvents = recipe.length;
  player.whiteTotal = recipe.reduce((sum, [color, value]) => sum + (color === "white" ? value : 0), 0);
}

function pending(actor: "human" | "ai", kind: PendingDecision["kind"], options: string[]): PendingDecision {
  return { id: `debug-${kind.toLowerCase()}`, actor, kind, prompt: "Debug presentation fixture", options, data: {} };
}

function logEntry(state: GameState, seq: number, type: string, actor: "human" | "ai", payload: Record<string, unknown>): GameLogEntry {
  return { seq, eventId: `debug-e${seq + 1}`, round: state.round, phase: state.phase, type, actor, publicPayload: payload };
}

function setActiveFortune(state: GameState, card: NonNullable<GameState["activeFortune"]>): void {
  if (state.activeFortune === card) return;
  const targetIndex = state.fortuneDeck.indexOf(card);
  if (targetIndex >= 0) state.fortuneDeck.splice(targetIndex, 1);
  if (state.activeFortune) state.fortuneDeck.push(state.activeFortune);
  state.activeFortune = card;
}

export function createDebugGame(name: DebugStateName): GameState {
  const state = createGame({ seed: `visual-${name}`, fortuneDeck: Array.from({ length: 24 }, (_, index) => `F${String(index + 1).padStart(2, "0")}` as `F${number}`) });
  state.round = name === "round9" ? 9 : name === "dense-pot" ? 8 : 5;
  state.phase = name === "purchasing" ? "EVAL_E" : "BREWING";
  setActiveFortune(state, "F11");
  state.players.human.score = 32;
  state.players.ai.score = 24;
  state.players.human.rubies = 3;
  state.players.ai.rubies = 2;
  state.roundState.ratTails = { human: 0, ai: 3 };

  fillPot(state, "human", [["green", 1], ["blue", 2], ["white", 1], ["orange", 1], ["purple", 1], ["white", 2]]);
  fillPot(state, "ai", [["purple", 1], ["white", 1], ["orange", 1], ["blue", 1]]);
  state.players.human.flaskFull = true;
  state.players.ai.flaskFull = false;
  state.pendingDecision = pending("human", "BREW_ACTION", ["DRAW", "STOP", "USE_FLASK"]);

  state.log = [
    logEntry(state, 0, "ROUND_STARTED", "human", { round: state.round }),
    logEntry(state, 1, "TOKEN_PLACED", "human", { color: "green", value: 1, trackIndex: 1 }),
    logEntry(state, 2, "TOKEN_PLACED", "ai", { color: "purple", value: 1, trackIndex: 1 }),
    logEntry(state, 3, "TOKEN_PLACED", "human", { color: "blue", value: 2, trackIndex: 3 }),
    logEntry(state, 4, "TOKEN_PLACED", "human", { color: "orange", value: 1, trackIndex: 5 }),
  ];

  if (name === "brewing") fillPot(state, "human", [["green", 1], ["blue", 2], ["orange", 1]]);
  if (name === "empty-pot") fillPot(state, "human", []);
  if (name === "mid-track") fillPot(state, "human", [["green", 2], ["blue", 2], ["orange", 1], ["white", 1], ["red", 2], ["yellow", 1], ["purple", 1], ["green", 4], ["white", 2], ["orange", 1]]);
  if (name === "high-risk") {
    fillPot(state, "human", [["green", 1], ["white", 3], ["blue", 1], ["white", 2], ["orange", 1], ["white", 1]]);
    state.players.human.whiteTotal = 6;
    const dangerBag = [take(state, "white", 3), take(state, "white", 2), take(state, "orange", 1), take(state, "green", 1)];
    state.players.human.bag.push(...dangerBag);
  }
  if (name === "dense-pot") fillPot(state, "human", [["orange", 1], ["green", 1], ["blue", 1], ["red", 1], ["yellow", 1], ["purple", 1], ["black", 1], ["white", 1], ["green", 2], ["blue", 2], ["red", 2], ["yellow", 2], ["white", 2], ["green", 4], ["blue", 4], ["red", 4], ["yellow", 4], ["green", 4]]);
  if (name === "ai-brewing") state.pendingDecision = pending("ai", "BREW_ACTION", ["DRAW", "STOP"]);
  if (name === "ai-stopped") {
    state.players.ai.stopped = true;
    state.pendingDecision = pending("human", "BREW_ACTION", ["DRAW", "STOP", "USE_FLASK"]);
    state.log.push(logEntry(state, 5, "PLAYER_STOPPED", "ai", { trackIndex: state.players.ai.pot.at(-1)?.trackIndex ?? 0 }));
  }
  if (name === "purchasing") {
    state.players.human.roundCoins = 18;
    state.pendingDecision = pending("human", "PURCHASE", ["none", "buy:green:1", "buy:blue:1", "buy:orange:1", "buy:red:1", "buy:green:1+blue:1", "buy:orange:1+red:1"]);
  }
  const resolutionFixture = name.startsWith("resolution-");
  if (resolutionFixture) {
    state.players.human.stopped = true;
    state.players.ai.stopped = true;
    state.players.human.scoringIndex = 12;
    state.players.ai.scoringIndex = 9;
    state.players.human.roundBaseVP = 3;
    state.players.ai.roundBaseVP = 2;
    state.players.human.roundCoins = 17;
    state.players.ai.roundCoins = 13;
    state.roundState.bonusDieWinners = ["human"];
    state.log.push(logEntry(state, 5, "DIE_ROLLED", "human", { face: "ruby", rngBefore: state.rng.drawsConsumed, rngAfter: state.rng.drawsConsumed + 1 }));
  }
  if (name === "resolution-bonus") {
    state.phase = "EVAL_E";
    state.pendingDecision = pending("human", "PURCHASE", ["none", "buy:green:1", "buy:green:2", "buy:blue:1", "buy:blue:2", "buy:orange:1", "buy:red:1", "buy:green:2+blue:1"]);
  }
  if (name === "resolution-rewards") {
    state.phase = "EVAL_E";
    state.pendingDecision = pending("human", "PURCHASE", ["none", "buy:green:1", "buy:green:2", "buy:blue:1", "buy:blue:2", "buy:orange:1", "buy:red:1", "buy:green:2+blue:1"]);
  }
  if (name === "resolution-purchase" || name === "resolution-purchase-selected") {
    state.phase = "EVAL_E";
    state.pendingDecision = pending("human", "PURCHASE", ["none", "buy:green:1", "buy:green:2", "buy:blue:1", "buy:blue:2", "buy:orange:1", "buy:red:1", "buy:green:2+blue:1", "buy:orange:1+red:1"]);
  }
  if (name === "resolution-ruby") {
    state.phase = "EVAL_F";
    state.players.human.flaskFull = false;
    state.pendingDecision = pending("human", "RUBY_ACTION", ["done", "droplet", "flask"]);
  }
  if (name === "resolution-complete") state.pendingDecision = pending("human", "BREW_ACTION", ["DRAW", "STOP"]);
  if (name === "round9") {
    state.pendingDecision = pending("human", "ROUND9_COMMIT", ["DRAW", "STOP"]);
    state.roundState.finalCommitments = {};
  }
  if (name === "fortune") setActiveFortune(state, "F15");
  return state;
}
