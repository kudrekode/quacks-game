# Product Specification

## Product

A polished, deterministic browser adaptation of the standard base game *The Quacks of Quedlinburg* for exactly two participants: one human and one strong, non-cheating AI. The experience is local, single-device, desktop-first, responsive, and playable without an account, server, or network connection.

The implementation must preserve the supplied rules while using original presentation, names, short paraphrased card copy, icons, SVG shapes, and procedural boards. `RULES_MODEL.md` is authoritative for behavior; this document defines product boundaries.

## Version-one goals

- Complete nine-round game with seeded randomness and replayable decisions.
- Standard starting bags, finite shared supply, round unlocks, scoring, rat tails, flask, rubies, bonus die, buying, end-game conversion, and tie resolution.
- Default ingredient set 1 plus the always-used orange and two-player black books.
- All 24 standard Fortune-Telling cards.
- Human-readable explanations for every automatic effect and AI action.
- Strong practical AI for brewing and purchases without access to hidden order or future random values.
- Save/resume in local browser storage, new-game seed entry, and exportable replay record.
- Keyboard, reduced-motion, contrast, screen-reader, and touch-friendly controls.

## Core experience

The human can always determine: current round and phase; whose decision is pending; the public pot and score state; current white total and explosion threshold; the reward at the next scoring space; remaining known bag composition; what changed; and the legal consequences of drawing, stopping, using the flask, buying, or spending rubies. Hidden draw order is never exposed.

The game may serialize AI thought summaries such as risk estimate and purchase rationale, but never display or compute using unavailable future draws.

## In scope

- Exactly two players, human versus AI.
- Local browser play and deterministic replay.
- Base-board front side only.
- Ingredient set 1: orange, black (two-player face), green 1, blue 1, red 1, yellow 1, purple 1.
- Architecture capable of later loading sets 2-4; catalogue data for those sets is retained in `INGREDIENTS.md` but they need not be selectable in v1.
- Standard shuffled 24-card Fortune deck, one card per round.
- Headless simulation using the same engine as the UI.
- Original visual/audio treatment and optional lightweight animations.

## Out of scope

- Expansions, overflow bowl, witches, locoweed, test-tube board side, or a fifth player.
- More than one human, more than one AI, difficulty levels, tutorials requiring altered rules, house rules, online multiplayer, accounts, backend, chat, monetization, leaderboards, or reproduction of supplied commercial art.
- Shipping any image from `preDocs`.

## Product quality gates

1. All games terminate and can be replayed from initial seed plus ordered decisions.
2. Every state mutation originates in the game engine; the UI cannot award resources directly.
3. No illegal action is presented as enabled or accepted by the reducer.
4. AI decisions are reproducible under a fixed AI budget/configuration and seed.
5. Rules tests, full-round integration tests, 1,000+ headless AI-vs-AI games, and browser end-to-end tests pass.
6. A rules audit against all files listed in `RULES_SOURCES.md` has no unexplained discrepancy.

