# Authoritative Rules Model

This is the normative behavior specification for version one. Where another document differs, this file wins; unresolved interpretations are listed in `DECISIONS.md`.

## Actors and authority

- **Engine** owns setup, finite supply, RNG, draws, placement, thresholds, comparisons, automatic rewards, validation, phase transitions, logging, cleanup, and winner calculation.
- **Human** chooses among surfaced legal actions: optional card/effect branches, draw/stop, flask, preview selection, explosion reward, purchases, and ruby spending.
- **AI** makes the same choices for its seat from the same legal-action interface and information boundary. It never mutates state directly.

## State machine

`SETUP -> ROUND_OPEN -> FORTUNE -> RAT_SETUP -> BREWING -> POST_BREW -> EVAL_A -> EVAL_B -> EVAL_C -> EVAL_EXPLOSION_CHOICE -> EVAL_D -> EVAL_E -> EVAL_F -> ROUND_CLEANUP -> (ROUND_OPEN | FINAL_CONVERSION) -> GAME_OVER`.

Decision substates suspend the current phase until every required choice has a valid response. In the digital two-player adaptation, nominally simultaneous choices may be serialized without exposing hidden information or the other seat's uncommitted choice.

## Setup

1. Create all component tokens and shared supply from `INGREDIENTS.md`.
2. Each player receives four white-1, two white-2, one white-3, one orange-1, one green-1, a full flask, droplet at pot index 0, rat off-board, zero rubies, and score 0. The authoritative setup does not grant a starting ruby.
3. Load set-1 green/blue/red plus orange and the two-player black rule. Yellow and purple are locked.
4. Shuffle all 24 Fortune cards using seeded RNG. Select/start with a configured first player (the physical rule is most recent cook); this setup input is part of the replay.
5. Set round to 1. All bag orders are hidden and generated only when draws require randomness; never persist a human-visible future order.

## Round opening and Fortune

At the start of rounds 2 and 3 unlock yellow and purple respectively. At round 6, before Fortune resolution, transfer one white-1 from supply to each bag. Reveal exactly one Fortune card and resolve/register it per `FORTUNE_CARDS.md`. The holder/start player changes only during cleanup.

## Rat setup

From round 2 onward, find maximum absolute VP. Every player tied at maximum gets zero tails. Others count rat boundaries strictly between their score and the maximum using `BOARD_MODEL.md`. Apply the active card and card choices. Put rat at droplet index plus final tail count, clamped at 52. Rat tails affect only this round and do not alter droplet or score.

## Brewing

Players start from the rat if it is ahead of the droplet, else the droplet. On a player's decision:

- `DRAW`: seeded RNG selects uniformly among tokens currently in that player's bag. Remove it from bag, determine movement modifiers, place it relative to the preceding placed chip (or start anchor), then resolve immediate effects. Add white printed value to `whiteTotal` when a white token remains placed. If `whiteTotal > threshold`, mark exploded and force stop after all effects of that placement.
- `STOP`: mark voluntarily stopped. No more ordinary draws.
- `USE_FLASK`: only immediately after a non-exploding ordinary placement, with a full flask. Return that last token to bag, undo its placement and all effects through an event transaction rollback, mark flask empty, then allow drawing/stopping. A flask cannot return a token that caused an explosion, a preview-only token, or an earlier token.

After every surviving placement the player may use the flask (when legal), then draw or stop. Empty bag forces stop. Players never inspect bag contents/order during physical play; the UI may show composition counts already known to the owner but not future order.

Blue-1 preview draws remove a uniform sample without replacement; selected token is placed as the next placement and can chain. Unselected previews return before the next action. Yellow-1 may remove the immediately preceding white token without moving other chips; undo its white total only, not unrelated effects already resolved.

Round 9 uses the same decisions and RNG but presents synchronized reveal beats: each active player commits draw or empty hand/stop before either reveal is shown. This prevents using the opponent's current reveal to decide. AI evaluation receives only the pre-commit public state.

## Post-brew hooks

After ordinary brewing ends, resolve active Fortune hooks in their specified order. A placed post-brew token uses full placement/explosion/effect rules. When all players are finally stopped, capture each scoring entry as the space after the last placed chip (or start anchor if none), with end clamping.

## Evaluation A-F

### A: bonus die

Exclude exploded players. Compare scoring `trackIndex`; all tied farthest roll once (twice under F20). Resolve each face immediately in start-player order. Reaching the spoon qualifies if not exploded.

### B: black, green, purple, then applicable Fortune effects

Resolve effects in start-player order and color order black -> green -> purple, using final placement history. Each optional choice suspends evaluation. Explosion does not suppress these effects. Set-1 black equality requires at least one black token for the acting player.

### C: scoring-space rubies and card hooks

Every player whose scoring entry has a ruby gains one, regardless of explosion. Resolve F16/F17 here. This step is unconditional and precedes the exploded reward choice.

### Explosion choice, D and E

Each exploded player normally chooses exactly one of:

- `SCORE`: receive the VP on the scoring entry in D; no purchase budget in E.
- `BUY`: receive no base scoring VP in D; use the scoring entry's coins in E.

Non-exploded players receive both. Fortune and ingredient VP already gained are never revoked. A qualifying set-2 blue protection (future extension) permits both D and E while still excluding bonus die.

### D: victory points

In start-player order, eligible players add scoring-entry VP. Scores remain absolute integers; a physical 50-point lap has no rule effect.

### E: purchases

In start-player order, an eligible player may buy zero, one, or two supplied tokens with total cost no greater than their coin budget. If buying two, colors must differ. Only unlocked market colors/values are legal; white is never sold. Transfer purchases directly to bag. Unspent coins vanish. Supply contention is resolved by this order. In round 9 this phase still exists: coins may instead be converted to VP during final conversion; buying ingredients has no future value but remains rules-legal unless the product elects to hide dominated actions with an explanation.

### F: ruby actions

In start-player order, repeatedly choose while affordable: pay two rubies to move droplet one space, or pay two to refill an empty flask. Either, both, or neither may be used; droplet may be moved multiple times. F24 refills all flasks for free. These actions do not change the just-scored entry.

## Cleanup

Return every normally placed/drawn token to its owner's bag; retained tokens from non-default future effects follow their own location rule. Clear pot, placement history, previews, rat, white total, threshold modifiers, explosion/stopped flags, budgets, and round-scoped effects. Preserve bag ownership, VP, rubies, droplet, flask state, supply, logs, RNG, and Fortune discard. Rotate start player. If round <9 increment and open next round; otherwise enter final conversion.

## Final conversion, winner, tie

After round 9 evaluation, each player independently gains `floor(unspentRound9Coins / 5)` VP and `floor(rubies / 2)` VP. Coins used to buy tokens are unavailable for conversion; rubies spent during F are unavailable. Implement conversion as explicit choices only if allowing suboptimal purchases/spending; the maximizing default is automatic and logged.

Highest final VP wins. If tied, compare the final-round scoring `trackIndex` (furthest-filled pot), including exploded pots. If still tied, declare a shared victory. Preserve final-round placement/scoring snapshot through winner calculation even though normal pot cleanup occurs afterward.

## Global invariants

- Every token has exactly one location and one owner or supply owner.
- RNG consumption occurs only through named events and is serialized.
- Ruby and supply counts never become negative; scores and indices are finite integers.
- A phase changes only through a listed transition; pending decisions block unrelated actions.
- Automatic effects are idempotent per event id.
- A complete game reveals exactly nine distinct Fortune cards and terminates.
