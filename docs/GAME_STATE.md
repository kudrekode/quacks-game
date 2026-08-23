# Serializable Game State

Conceptual TypeScript notation is descriptive, not a required framework.

```ts
type GameState = {
  schemaVersion: number; gameId: string; config: GameConfig;
  phase: Phase; round: number; startPlayerId: PlayerId;
  players: PlayerState[]; supply: BagState; market: MarketState;
  fortuneDeck: CardId[]; fortuneDiscard: CardId[];
  activeFortune?: CardId; roundState: RoundState;
  rng: RandomState; pendingDecision?: PendingDecision;
  log: GameLogEntry[]; revision: number; result?: GameResult;
};

type PlayerState = {
  id: PlayerId; controller: "human"|"ai"; score: number; rubies: number;
  dropletIndex: number; ratIndex?: number; flaskFull: boolean;
  bag: BagState; pot: PlacedToken[]; placementOrder: TokenId[];
  preview: TokenId[]; exploded: boolean; stopped: boolean;
  whiteTotal: number; explosionThreshold: number;
  roundCoins: number; roundBaseVP: number; explosionChoice?: "score"|"buy";
  boughtColors: IngredientColor[]; retained: TokenId[];
};

type BagState = { owner: PlayerId|"supply"; tokenIds: TokenId[] };
type Token = { id: TokenId; color: IngredientColor; value: 1|2|3|4 };
type PlacedToken = {
  tokenId: TokenId; trackIndex: number; ordinal: number;
  baseMovement: number; movementModifiers: EffectRef[]; sourceEventId: string;
};
type BoardPosition = { trackIndex: number; coins: number; vp: number; ruby: boolean };
```

```ts
type IngredientDefinition = {
  id: string; color: IngredientColor; set: 0|1|2|3|4;
  values: number[]; prices: Record<number,number>; unlockRound: number;
  effects: IngredientEffect[];
};
type IngredientEffect = {
  id: string; timing: EffectTiming; optional: boolean;
  evaluate(context: EffectContext): DomainEvent[]|PendingDecision;
};
type FortuneCard = {
  id: CardId; timing: "IMMEDIATE"|"ROUND"; effectIds: string[];
  shortTitle: string; shortText: string;
};
type MarketState = {
  unlockedColors: IngredientColor[];
  priceBookIds: Record<IngredientColor,string>;
};
```

```ts
type RoundState = {
  number: number; startOrder: PlayerId[]; activeModifiers: EffectRef[];
  scoringEntries: Record<PlayerId,number>; bonusDieWinners: PlayerId[];
  brewingEntrySnapshots?: Record<PlayerId,PlayerRoundSnapshot>;
  finalRoundCommitments?: Record<PlayerId,"draw"|"stop">;
  finalTieBreakIndices?: Record<PlayerId,number>;
};
type RandomState = {
  algorithm: "xoshiro128**"; seed: string; words: [number,number,number,number];
  drawsConsumed: number;
};
type GameLogEntry = {
  seq: number; eventId: string; round: number; phase: Phase;
  type: string; actor?: PlayerId; publicPayload: JsonValue;
  privatePayloadByPlayer?: Record<PlayerId,JsonValue>;
  rngBefore?: number; rngAfter?: number; causedBy?: string;
};
```

## Ownership and visibility

Public: scores, rubies, droplet/rat/flask, pots, placed tokens, purchases, known aggregate bag composition, supply counts, round, market, Fortune discard/active card, phase, decisions after commitment, and public log. Private to owner until returned/selected: previewed tokens and an uncommitted round-9 draw. Never observable: future RNG values, a precomputed bag order, unrevealed Fortune IDs/order, AI rollouts using hidden branches, or opponent private previews.

The engine may show each player their own known bag composition because ownership/purchases/draws make it derivable; it must label it as counts, not draw order. AI receives an information-set projection, not `GameState` itself.

## Invariants

- Token IDs partition exactly across supply, player bags, pots, previews, retained, and explicitly discarded/exchanged locations.
- `rubies >= 0`, `score >= 0`, `0 <= dropletIndex <= 52`, unique placement ordinals, and legal track indices.
- `whiteTotal` equals printed white values currently placed.
- `fortuneDeck + fortuneDiscard + activeFortune` contains 24 unique IDs.
- `revision` increases per accepted action; log sequence is contiguous.
- Serialization includes pending continuation in data form, never a closure.

## Determinism

All randomness uses the serialized PRNG: Fortune shuffle, bag/preview samples, die, AI tie-breaking, and Monte Carlo rollout seeds. Domain commands contain player choices only; events record results. Replaying config + seed + commands with a fixed engine/AI version must reproduce state hashes at every revision. Store `rulesVersion` and `aiVersion` in `GameConfig` so future changes do not silently alter old saves.
