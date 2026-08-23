# Ordered Implementation Plan

Each stage must leave a headless, tested vertical slice; UI work begins only after a complete legal game terminates headlessly.

1. **Repository and quality baseline**
   - TypeScript strict mode, formatter/linter, unit/property/browser test runners, CI, coverage, deterministic fixture format.
   - Establish `engine/`, `content/`, `ai/`, `ui/`, `workers/`, and `tests/` boundaries; forbid engine imports from UI.

2. **Deterministic RNG and event core**
   - Implement/test xoshiro state, shuffle/sample/die APIs, stream derivation for AI rollouts, serialization, state hashing, command/event log, revision and stale-command rejection.

3. **Domain data and board**
   - Token registry, location ledger, exact pot table, score/rat functions, round milestones, supply, set-1 definitions, full Fortune data.
   - Golden fixtures against `BOARD_MODEL.md` and component totals.

4. **Bag, player, and legal-action reducer**
   - Setup, draw/preview/return, placement/gaps/clamp, white total, explosion, flask transaction rollback, decision continuation, public/private projections.

5. **Round state machine**
   - Implement all phases in `ROUND_SEQUENCE.md`, start-order serialization, comparisons, bonus die, A-F evaluation, cleanup, final conversion, winner/ties.
   - Complete a no-special-effects nine-round game headlessly.

6. **Modular ingredient effects**
   - Orange/white then set-1 blue/red/yellow/green/purple/black; optional decisions and chained effects.
   - Keep generic timing hooks sufficient for sets 2-4; do not implement UI conditionals.

7. **All Fortune cards**
   - Implement 24 catalogue entries, brewing snapshot rollback, round modifiers, supply conflicts, private previews, and cleanup.
   - Run per-card matrix and complete-round integration fixtures.

8. **Complete headless game and audit**
   - Save/resume at every pending state, replay from commands, property tests, fuzz legal sequences, 1,000 random games, review logs against rule sequence.

9. **Baseline AI**
   - Legal heuristic stop/draw, purchase enumeration, resource and card choices, redacted observation type, paired-seed benchmark harness.

10. **Monte Carlo AI**
    - Multiset simulator, win-probability evaluator, memoization/common random numbers, adaptive budget, deterministic tie-breaks, Web Worker protocol and timeout fallback.
    - 10,000-game comparison, latency/strength gate, hidden-information adversarial tests.

11. **React UI shell**
    - Shared/human/AI layout, procedural pot and score tracks, market, Fortune, phase/pending decision card, log, settings. Subscribe to engine projections only.

12. **Interaction, animation, and persistence**
    - Draw/placement/flask/purchase animations, round-9 commit-reveal, animation skip/reduced motion, IndexedDB/localStorage versioned saves, replay export/import and migration failures with safe messaging.

13. **Accessibility and responsive polish**
    - Keyboard/focus/live regions, patterns/symbols, contrast, 200% zoom, mobile stacking, sound controls, performance budget, original visual QA.

14. **End-to-end and release audit**
    - Browser scenarios/screenshots, cross-browser smoke tests, asset import guard, bundle/offline check, save corruption recovery, rules-source checklist, simulation soak, and final sign-off of every acceptance gate.

## Recommended technical constraints

- Pure reducer/domain events; no timers, DOM, Date, or ambient randomness in engine.
- Content tables validated at startup with schemas.
- AI simulations clone minimized headless state, never UI state.
- Animation consumes events but never delays or determines reducer completion.
- Version every save, rule set, engine, content catalogue, and AI policy.

## Definition of done

The app is done only when a complete default game is playable without developer tools, every pending decision is explained, all tests in `TEST_PLAN.md` pass, simulations terminate with zero illegal actions, replays reproduce state hashes, no reference asset ships, and a final manual rules audit finds no undocumented interpretation.

