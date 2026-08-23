# Rules and Product Test Plan

## Unit tests

- **RNG:** fixed vectors, serialization/resume, unbiased bounded sample, separate live/rollout streams, identical replay hashes.
- **Bag/token conservation:** draw, preview, return, flask rollback, exchange, purchase, round cleanup, round-6 additions, removal card, empty bag.
- **Placement:** values 1-4, gaps, droplet/rat anchor, every movement modifier, removal without collapse, end clamp/spoon, scoring-entry lookup for all 54 entries.
- **Explosion:** totals 6/7/8, threshold 9, removed white, flask prohibition after explosion, post-stop explosion, explosion effects still resolve.
- **Set 1 ingredients:** every value, optional decline, blue chain/return, red orange bands, yellow preceding-white only, last-two green by ordinal, purple tiers/lower tier, black 0/equal/greater/fewer.
- **Evaluation:** farthest by track index when coin values repeat, die ties/faces, A-F order, ruby while exploded, explosion score/buy choice, two-color purchasing, finite supply, lost coins.
- **Economy:** costs, unlocks, direct card rewards, no negative supply/rubies, repeated droplet spending, flask refill.
- **Rat tails:** every listed boundary, ties/leaders, scores 0/50/over50, double/count exchange, rat clamp/removal.
- **Fortune:** matrix required at end of `FORTUNE_CARDS.md`, including modifier cleanup.
- **Final:** round-9 commitment privacy, purchase/conversion resource accounting, 5:1 and 2:1 floors, score tie, pot-distance tie, shared win.

## Integration scenarios

1. Seeded full round with chained blue -> selected yellow -> white removal -> stop -> A-F -> cleanup.
2. Both players explode; each chooses a different D/E branch; verify ruby/card rewards remain.
3. Repeated coin value but different pot indices selects correct die winner.
4. Shared-supply contention resolves in start order and rotates next round.
5. Round 2/3/6 milestones and all nine distinct Fortune reveals.
6. Round 9 simultaneous commitments where changing hidden opponent action cannot affect AI decision.
7. Restart card restores exactly brewing-entry state while consuming a deterministic new shuffle.
8. Save at every phase/pending choice, reload, continue to byte-equivalent final state.

## Property/invariant tests

Generate legal command sequences and assert after every event: one token/one location; total physical token count conserved except explicit base setup transfers; no negative rubies/supply; finite integer scores/indices; white total recomputes; legal phase transition; no duplicate event resolution; no illegal AI purchase; observation redaction; Fortune uniqueness; and eventual termination under a forced-progress policy.

Use mutation tests targeting `>7` versus `>=7`, scoring space after last chip, same-color pair rejection, explosion A exclusion, and end conversion floors.

## Simulation

Run at least 10,000 seeded AI-vs-AI games in CI nightly and 1,000 in release CI. Set maximum commands/events per phase and game; any breach dumps seed, command log, and state hash. Track result distribution, average length, first-player advantage, card frequencies, explosions, supply exhaustion, and AI latency. Replay a random sample through a second event-reducer implementation or state-hash oracle.

## Browser end-to-end

- New game, seeded setup, draw/stop/flask, all choice trays, purchase, ruby actions, save/resume, replay, game over.
- Desktop and mobile breakpoints, keyboard-only flow, screen-reader names/live regions, 200% zoom, high contrast, reduced motion.
- Visual snapshots for empty/filled/exploded pot, market locked/unlocked, repeated-score comparison, and game-over tie.
- Assert UI cannot dispatch an action absent from engine `legalActions` and stale double-clicks are rejected.

## Acceptance

Zero invariant/illegal-action failures; deterministic fixtures stable; all 24 cards and seven default colors covered; 1,000-game release simulation terminates; accessibility checks have no serious/critical violations; and manual rules audit signs off every row in the round sequence.

