# AI Design

## Contract

One strong AI uses exactly the legal-action API available to a human. Its input is an immutable `Observation` containing its own bag composition and private previews, all public state, current legal actions, and no future RNG, unrevealed Fortune order, opponent preview, or engine-only bag order. Tests must make constructing a cheating observation impossible by type/interface boundary.

## Brewing policy

For each `STOP` versus `DRAW` decision, estimate action value with information-set Monte Carlo:

1. Derive the remaining multiset from the AI's owned bag minus tokens already placed/previewed.
2. Sample without replacement from that multiset using rollout-local RNG, never the live game RNG.
3. Simulate legal ingredient chains, flask choices, explosion, scoring/buying, likely future bag quality, and a lightweight model of the human's public strategy.
4. Evaluate expected probability of winning, not only current coin value.

Utility combines estimated terminal win/tie probability with bounded shaping for low-rollout stability: current VP differential; round/rounds remaining; explosion probability and consequence; expected pot movement; purchase breakpoints; immediate VP; rubies and flask; droplet/rat position; color synergy; white dilution; opponent public position; and future draw quality. Shaping weight decays toward zero in late rounds and whenever terminal rollouts are affordable.

Use exact multiset probability for near-term explosion risk. A draw branches on token type/value, not token identity. `STOP` value includes best legal explosion choice and purchase plan. `DRAW` includes optimal flask use after safe bad draws where permitted.

## Purchase and resource policy

Enumerate every legal basket: buy none; every single available token within budget; every pair of different colors within budget. Evaluate the post-purchase bag over remaining rounds using cached rollouts or a learned/offline value table. Consider price breakpoint waste, red-orange synergy, blue selection, green end-position likelihood, future yellow/purple unlocks, black relative count, explosion dilution, and opponent's black/public purchases.

Enumerate ruby action sequences (droplet advances and flask refill) and Fortune/ingredient choices through the same value function. Never reserve a token, spend beyond budget, select locked colors, or assume infinite supply.

## Opponent model

Use only public state. Begin with a calibrated heuristic policy; update behavioral parameters from observed stop thresholds and purchases, not hidden draws. For round 9 commitments, decide from pre-commit state and do not inspect the human commitment/reveal.

## Performance

- Target 50-150 ms routine decisions and at most 500 ms high-impact purchase/late-round decisions on a typical desktop.
- Adaptive rollouts: 500-2,000 for brewing, 1,000-5,000 for purchase candidates, reduced on low-end devices.
- Memoize multiset draw distributions keyed by sorted counts, threshold, white total, position, flask, effect state, round, and scoring context.
- Use common random numbers when comparing actions to reduce variance.
- Run headless simulation in a Web Worker; return best-so-far on deadline.
- Deterministic tie-break: utility, then lower variance, then lexicographic action ID using an AI seed stream derived from game seed.

## Evaluation

Compare against random, always-stop-at-risk-0, threshold heuristics, greedy-purchase, and previous AI versions across paired seeds and swapped first player. Report win rate with confidence interval, average VP, explosion rate by round, decision latency percentiles, illegal-action count (must be zero), and hidden-information audit. Strength gate: statistically outperform the best baseline over at least 10,000 paired games without exceeding latency budget.

