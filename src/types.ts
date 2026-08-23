export const PLAYER_IDS = ["human", "ai"] as const;
export type PlayerId = (typeof PLAYER_IDS)[number];
export type Controller = "human" | "ai";
export type IngredientColor =
  | "white"
  | "orange"
  | "green"
  | "blue"
  | "red"
  | "yellow"
  | "purple"
  | "black";
export type TokenValue = 1 | 2 | 3 | 4;
export type CardId = `F${number}`;

export type Phase =
  | "ROUND_OPEN"
  | "FORTUNE"
  | "RAT_SETUP"
  | "BREWING"
  | "POST_BREW"
  | "EVAL_A"
  | "EVAL_B"
  | "EVAL_C"
  | "EVAL_EXPLOSION_CHOICE"
  | "EVAL_D"
  | "EVAL_E"
  | "EVAL_F"
  | "ROUND_CLEANUP"
  | "FINAL_CONVERSION"
  | "GAME_OVER";

export interface Token {
  id: string;
  color: IngredientColor;
  value: TokenValue;
}

export interface PlacedToken {
  tokenId: string;
  trackIndex: number;
  ordinal: number;
  baseMovement: number;
  effectiveMovement: number;
  source: "draw" | "blue" | "fortune";
}

export interface RandomState {
  algorithm: "xoshiro128**";
  seed: string;
  words: [number, number, number, number];
  drawsConsumed: number;
}

export interface PlayerSnapshot {
  score: number;
  rubies: number;
  dropletIndex: number;
  flaskFull: boolean;
  bag: string[];
  pot: PlacedToken[];
  placementOrder: string[];
  preview: string[];
  whiteTotal: number;
  exploded: boolean;
  stopped: boolean;
  placementEvents: number;
  firstWhiteSeen: boolean;
  restartUsed: boolean;
  restartPending: boolean;
}

export interface PlayerState {
  id: PlayerId;
  controller: Controller;
  score: number;
  rubies: number;
  dropletIndex: number;
  ratIndex?: number;
  flaskFull: boolean;
  bag: string[];
  pot: PlacedToken[];
  placementOrder: string[];
  preview: string[];
  exploded: boolean;
  stopped: boolean;
  voluntaryStop: boolean;
  whiteTotal: number;
  explosionThreshold: number;
  roundCoins: number;
  roundBaseVP: number;
  scoringIndex: number;
  explosionChoice?: "score" | "buy";
  boughtColors: IngredientColor[];
  placementEvents: number;
  firstWhiteSeen: boolean;
  restartUsed: boolean;
  restartPending: boolean;
  brewingSnapshot?: PlayerSnapshot;
  flaskSnapshot?: PlayerSnapshot;
}

export type DecisionKind =
  | "FORTUNE_CHOICE"
  | "RAT_CHOICE"
  | "BREW_ACTION"
  | "ROUND9_COMMIT"
  | "BLUE_SELECT"
  | "YELLOW_REMOVE"
  | "WHITE_REPRIEVE"
  | "RESTART"
  | "STRONG_SELECT"
  | "PURPLE_TIER"
  | "EXPLOSION_CHOICE"
  | "PURCHASE"
  | "RUBY_ACTION";

export interface PendingDecision {
  id: string;
  actor: PlayerId;
  kind: DecisionKind;
  prompt: string;
  options: string[];
  data: Record<string, unknown>;
}

export interface DecisionTask {
  kind: DecisionKind;
  actor: PlayerId;
  data: Record<string, unknown>;
}

export interface RoundState {
  startOrder: PlayerId[];
  activeModifiers: CardId[];
  tasks: DecisionTask[];
  brewingCursor: number;
  evaluationCursor: number;
  ratTails: Record<PlayerId, number>;
  bonusDieWinners: PlayerId[];
  finalCommitments: Partial<Record<PlayerId, "draw" | "stop">>;
  finalTieBreakIndices: Partial<Record<PlayerId, number>>;
  postBrewPrepared: boolean;
  fortunePrepared: boolean;
  ratPrepared: boolean;
  evalBPrepared: boolean;
  explosionPrepared: boolean;
  purchasePrepared: boolean;
  rubyPrepared: boolean;
  revealQueue: PlayerId[];
}

export interface GameConfig {
  seed: string;
  startPlayerId: PlayerId;
  controllers: Record<PlayerId, Controller>;
  rulesVersion: "base-set1-v1";
  aiVersion: "baseline-v1" | "monte-carlo-v1";
  fortuneDeck?: CardId[];
}

export interface GameLogEntry {
  seq: number;
  eventId: string;
  round: number;
  phase: Phase;
  type: string;
  actor?: PlayerId;
  publicPayload: Record<string, unknown>;
  privatePayloadByPlayer?: Partial<Record<PlayerId, Record<string, unknown>>>;
  rngBefore?: number;
  rngAfter?: number;
}

export interface GameResult {
  winners: PlayerId[];
  scores: Record<PlayerId, number>;
  tieBreakIndices: Record<PlayerId, number>;
}

export interface GameState {
  schemaVersion: 1;
  gameId: string;
  config: GameConfig;
  phase: Phase;
  round: number;
  startPlayerId: PlayerId;
  players: Record<PlayerId, PlayerState>;
  tokens: Record<string, Token>;
  supply: string[];
  unlockedColors: IngredientColor[];
  fortuneDeck: CardId[];
  fortuneDiscard: CardId[];
  activeFortune?: CardId;
  roundState: RoundState;
  rng: RandomState;
  pendingDecision?: PendingDecision;
  log: GameLogEntry[];
  revision: number;
  nextDecision: number;
  result?: GameResult;
}

export interface Command {
  type: "RESOLVE_DECISION";
  decisionId: string;
  choice: string;
}

export interface Observation {
  revision: number;
  phase: Phase;
  round: number;
  viewer: PlayerId;
  players: Record<PlayerId, Omit<PlayerState, "brewingSnapshot" | "flaskSnapshot" | "preview"> & { preview?: string[] }>;
  tokens: Record<string, Token>;
  supplyCounts: Record<string, number>;
  unlockedColors: IngredientColor[];
  activeFortune?: CardId;
  fortuneDiscard: CardId[];
  pendingDecision?: PendingDecision;
  result?: GameResult;
}
