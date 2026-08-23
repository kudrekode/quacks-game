# UI Specification

## Information architecture

Desktop layout uses three persistent regions: human pot/workbench (largest); AI public pot/status; shared score, round, active Fortune, market, phase, and log. On narrow screens, shared status stays sticky and player panels stack; the current decision card remains visible without horizontal scrolling.

The visual hierarchy is: pending choice -> risk and next reward -> pot -> shared progress -> market/log. A modal may explain a rule but must not hide the state needed to decide.

## Human panel

Show original procedural pot track, droplet, temporary rat, placed tokens with color plus numeric value, scoring-space highlight, coins/VP/ruby on that space, white total as `x / threshold`, exact known bag composition counts, flask state, rubies, score, purchased tokens, and legal actions. `Draw again` displays explosion probability from the known multiset and a plain-language consequence; do not reveal next token.

Flask appears only enabled immediately after an eligible draw. Optional token effects use focused choice trays and a clear decline action. Empty supply/locked colors explain why they are unavailable.

## AI panel

Show full public pot, placed values/order, score, rubies, droplet/rat/flask, public bag composition, purchase, explosion/stop state, and a short status such as “weighing risk,” “stops at 19 coins,” or “buys red 2 + orange 1.” Do not show private previews or rollout internals. Use a minimum readable delay for animation but provide instant/skip animation settings.

## Shared panel

- Absolute scores and a compact 1-50 looping track with rat boundaries and lap badges.
- Round 1-9 with yellow/purple/round-6 milestones.
- Active Fortune title, paraphrased effect, timing badge, and resolved choices.
- Market grouped by color with book effect summary, costs, values, remaining supply, and unlock state.
- Current phase and start-player indicator.
- Chronological log with cause chains (“Yellow returned white 2, reducing white total 7 -> 5”).

## Interaction states

Every pending decision card states: what happened; who decides; all legal actions; expected immediate consequence; and confirm/cancel behavior. Buttons are disabled only with an adjacent reason. State changes animate from source to destination, then the log entry appears; reduced motion replaces travel with a brief highlight. Round 9 uses “Choose secretly” then a simultaneous reveal beat.

End game shows final score, round-9 pot-distance tiebreak, conversions, winner/shared victory, seed, replay/new-game controls, and a compact round-by-round graph.

## Accessibility and responsiveness

- Never encode ingredient identity by color alone: pair color with unique symbol/pattern and printed value.
- WCAG AA contrast, visible focus, semantic headings/landmarks, descriptive labels, live-region log summaries, and no focus loss after engine transitions.
- Full keyboard operation; Escape closes only non-destructive overlays; confirmation for abandoning a game.
- 44px touch targets, text zoom to 200%, no essential hover interactions.
- User settings: reduced motion, sound/mute, animation speed, high contrast, and risk-percentage display.

## Original art direction

An atmospheric apothecary workbench: deep ink, warm parchment, smoky teal glass, brass linework, ruby highlights, and restrained paper texture. Tokens are original SVG medallions with abstract ingredient symbols. Layout and illustration must not trace the supplied boards or cards.

