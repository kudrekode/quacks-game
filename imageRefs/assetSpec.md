# Final UI Implementation Handoff

This document is the authoritative UI implementation brief for the game.

The core game already works.

The purpose of this pass is to:

- redesign the presentation layer
- reduce clutter
- make game state easier to understand
- improve visual polish
- add consistent interaction states
- add animation where it improves comprehension
- preserve the existing working game engine

Do **not** rewrite the rules engine unless investigation proves that a UI issue is actually caused by incorrect engine behaviour.

---

# Reference Material

Place the approved visual references under:

```text
/preDocs/ui/
```

Recommended filenames:

```text
/preDocs/ui/main-game-layout.png
/preDocs/ui/ui-asset-sheet.png
/preDocs/ui/states-animations-overlays.png
```

Treat these images as **design references**, not production assets.

Do not simply place the screenshots in the application.

Recreate the interface using:

- React
- CSS
- SVG
- HTML
- lightweight animation
- reusable components

The screenshots define:

- information hierarchy
- composition
- visual language
- interaction patterns
- general art direction

They are not pixel-perfect implementation requirements when usability or responsive layout requires adjustment.

---

# Primary UI Principle

The interface must answer these questions instantly:

1. What round is it?
2. What is my score?
3. What is the AI's score?
4. What is happening right now?
5. What can I do?
6. How close am I to exploding?
7. Where will my next ingredient potentially take me?
8. What resources do I have?
9. What did the AI just do?
10. What special effect is currently active?

Avoid presenting every piece of game information with equal visual importance.

Use hierarchy.

---

# Main Desktop Layout

Use a single-page game interface.

Conceptual structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ HEADER / SHARED GAME BOARD                                  │
│ Round | Score Track | Rat Tails | Fortune Card              │
├─────────────────────────────────────────────┬────────────────┤
│                                             │                │
│              HUMAN POT                     │    AI POT      │
│                                             │                │
│                                             │                │
│                                             │                │
├─────────────────────────────────────────────┼────────────────┤
│                MARKET / PURCHASES           │   GAME LOG     │
├─────────────────────────────────────────────┴────────────────┤
│ PLAYER ACTION BAR                                            │
│ Bag | Flask | Rubies | Draw | Stop                          │
└──────────────────────────────────────────────────────────────┘
```

The exact dimensions should be responsive.

---

# 1. Header / Shared Game Board

The top region replaces the need for the entire physical score board to occupy large amounts of screen space.

It must contain:

```text
Game title / logo
Round number
Round track
Human score
AI score
Score-track visualization
Rat-tail comparison
Current Fortune card
Help button
```

The **score track** should be compact but clearly communicate relative player positions.

It should visually approximate the function of the physical shared board without copying its artwork.

Example:

```text
SCORE

0 ── 10 ── 20 ── 30 ── 40 ── 50

        ● You
              ● AI
```

Markers should animate smoothly when scores change.

---

# 2. Human Pot

The human pot is the most important object on screen.

It should be significantly larger than the AI pot.

The track must show:

- pot spaces
- ingredient placements
- ruby spaces
- purchasing power
- victory-point rewards
- current droplet/start position
- current endpoint
- future reachable spaces

Placed ingredients should be actual interactive DOM/SVG elements.

Do not bake them into the background.

---

# 3. Human Status Rail

Display next to the human pot:

```text
Buying Power
Victory Points available this round
White-token risk
Rubies
Flask state
```

Use strong iconography.

### White risk

This is particularly important.

Always show something equivalent to:

```text
WHITE RISK

5 / 7

SAFE
```

As danger rises, visually increase urgency.

Examples:

```text
0–4 = normal
5 = caution
6 = high risk
7+ = exploded
```

Do not depend on colour alone.

Include text/state labels.

---

# 4. AI Board

Keep the AI board visible **side-by-side** rather than repeatedly opening and closing a drawer.

The previous auto-opening drawer behaviour was distracting and clunky.

The AI board should be smaller than the human board but persistent.

Display:

```text
AI score
AI pot
AI current position
AI white risk
AI rubies
AI flask state
recent AI actions
```

Do not expose hidden AI bag order.

The player should be able to visually compare progress without interacting with a drawer.

A manually expandable AI-detail panel may still exist for deeper inspection, but it should never auto-open.

---

# 5. AI Last Actions

Below or beside the AI pot, display a concise chronological strip such as:

```text
AI drew Green 2
AI drew Orange 1
AI used Flask
AI stopped
```

Use ingredient icons where useful.

Keep approximately the most recent 4–6 actions.

Allow expansion to full turn history if desired.

---

# 6. Market

The market should remain visible during normal play but should become visually dominant only during purchasing.

Each ingredient market item should show:

```text
ingredient icon
colour
value
purchase cost
short power summary
availability state
```

Example:

```text
GREEN 2

Move 2 spaces.

Cost: 8
```

Use original visual design.

---

# 7. Purchasing State

When purchasing becomes available, transition the market into a clear purchase mode.

Selected purchases appear in a dedicated area:

```text
SELECTED PURCHASES

Green 2       8
Blue 1        5

Total        13
Available    18

[ Confirm Purchase ]
```

States required:

```text
normal
hover
selected
unaffordable
disabled
confirmed
```

Do not let purchasing feel like an unrelated mini-interface.

Use the same visual language as the rest of the game.

---

# 8. Bottom Action Bar

The bottom bar contains the player's most immediate actions.

Example:

```text
Bag: 17

Flask: Ready

Rubies: ◆◆

[ DRAW INGREDIENT ]

[ STOP BREWING ]
```

The Draw and Stop buttons should be the strongest visual actions on screen.

Avoid scattering important actions around different panels.

---

# 9. Bag Composition

Bag composition can be shown because the physical player could inspect or remember which ingredients they own.

Do not reveal order.

Default display may show only:

```text
Bag
17 ingredients
```

A toggle or click expands:

```text
White 1 × 4
White 2 × 2
White 3 × 1

Orange 1 × 1
Green 1 × 2
Blue 1 × 1
Purple 1 × 1
```

Use miniature ingredient icons.

Provide:

```text
Show Bag Details
ON / OFF
```

Persist the preference locally.

---

# 10. Ingredient Hover / Click Behaviour

Every ingredient placed on the pot must be inspectable.

Desktop:

```text
hover
```

Touch/mobile:

```text
tap
```

Tooltip example:

```text
GREEN 2

Moves 2 spaces.

Effect:
If this ingredient finishes adjacent
to another qualifying ingredient,
resolve its Green effect.

Purchased for:
8
```

If the ingredient resolved a specific effect this turn, optionally show:

```text
Resolved this draw:
+1 Ruby
```

Never show only internal terms such as:

```text
Tier 1
```

Translate them into player-facing meaning.

---

# 11. Future Space Preview

This existing feature is useful and should remain.

When the player hovers or previews a reachable pot space, show:

```text
Space 18

Buying Power: 18
Victory Points: 3
Ruby: Yes
```

If drawing a particular ingredient would reach the space, preview the destination visually.

Never reveal what the next random ingredient actually will be.

---

# 12. Fortune Card

Always display the current Fortune card in the header area.

States:

```text
card back
revealing
revealed
active
triggered
used
expired
```

When revealed:

```text
FORTUNE

Lucky Brew

The first qualifying ingredient you draw
this round may be returned to your bag.

ACTIVE THIS ROUND
```

Use concise original/paraphrased wording.

Do not reproduce long commercial card text.

If an effect remains active, show a small persistent reminder.

---

# 13. Dice Roll

Dice resolution must be a distinct visual event.

Sequence:

```text
eligible player determined
↓
dice panel appears
↓
dice rolls
↓
result settles
↓
reward appears
↓
reward animates to appropriate counter
```

Example:

```text
BONUS DIE

Rolling...

[ dice animation ]

+1 Ruby
```

Do not silently modify resources.

---

# 14. Toast System

Implement reusable toast notifications.

Types:

```text
success
information
warning
error
rule trigger
```

Examples:

```text
+2 Victory Points

Flask restored

Careful — a White 2 or White 3
could cause an explosion.

Fortune effect triggered:
Cherry Bomb returned to bag.
```

Toasts should disappear automatically unless interaction is required.

Avoid excessive notification spam.

---

# 15. Ingredient Animation

Drawing should communicate physical causality.

Sequence:

```text
player presses DRAW
↓
bag reacts
↓
ingredient emerges
↓
ingredient becomes visible
↓
ingredient moves to destination
↓
ingredient lands
↓
special effect resolves
↓
risk + rewards update
↓
next decision becomes available
```

Keep the animation short.

Target approximately:

```text
500–900 ms
```

for the entire draw sequence in normal animation mode.

Provide reduced-motion support.

---

# 16. Ingredient Visual States

Required states:

```text
default
hover
just drawn
resolving effect
selected
returned to bag
disabled
invalid
```

Animation should explain state changes rather than merely decorate them.

---

# 17. Explosion State

Explosion should be visually obvious without being obnoxious.

Possible effects:

```text
pot shake
brief red/orange glow
skull pulse
risk meter switches to EXPLODED
short particle effect
```

Then immediately explain the consequence.

Example:

```text
POTION EXPLODED

White total: 8

You must choose between the eligible
round rewards according to the rules.
```

Use the actual engine-defined consequence.

---

# 18. Flask

Flask states:

```text
ready
eligible
hover
used
unavailable
refillable
```

If flask use can undo a draw, show a contextual action:

```text
Use Flask?

Return White 2 to your bag.

[ Use Flask ]
[ Keep Ingredient ]
```

Do not hide important timing decisions behind tiny icons.

---

# 19. Purple / Tier Rewards

Never display only:

```text
Tier 1
```

Show actual player-facing consequences.

Example:

```text
PURPLE REWARD

1 Purple
+1 Victory Point
```

If multiple thresholds exist:

```text
1 Purple   → +1 VP
2 Purple   → +1 VP + 1 Ruby
3+ Purple  → [actual reward]
```

Highlight the current applicable level.

---

# 20. Game Log

Keep the Game Log visible but visually secondary.

Recommended location:

right-hand lower panel.

Default to a compact height.

Support collapsing.

Example:

```text
Round 5 begins.

You drew Blue 1.

Blue effect resolved.

AI drew Green 2.

AI stopped at position 17.
```

Log messages should use human-readable language.

Avoid implementation terminology.

---

# 21. Round-End Summary

At the end of each round, show a compact summary before continuing.

Example:

```text
ROUND 5 COMPLETE

YOU
+4 VP
+1 Ruby
Purchased Green 2

AI
+3 VP
No Ruby
Purchased Blue 1

Rat tails next round:
You +2

[ Continue ]
```

This makes bookkeeping changes understandable.

---

# 22. End Game

Create a proper final result screen.

Example:

```text
GAME OVER

YOU                 AI
46                  41

YOU WIN

Rounds won: ...
Explosions: ...
Ingredients purchased: ...

[ Play Again ]
[ Return to Menu ]
```

Statistics are optional but encouraged.

---

# 23. Home Screen

Create a proper landing screen.

Example:

```text
THE QUACKS

[ New Game ]
[ Continue ]

Settings

Show Bag Composition     ON
Show AI Details          ON
Animations               Normal
Sound                     ON

[ How to Play ]
```

Do not overload the home screen.

---

# 24. Help / How to Play

Provide a rules/help modal.

Use concise explanations.

Allow direct navigation to:

```text
Goal
Brewing
Explosion
Flask
Buying
Rat Tails
Rubies
Fortune Cards
Ingredients
Final Round
```

Where possible, reuse ingredient definitions directly from game data.

---

# 25. Modal System

Implement a common modal component.

Uses:

```text
rules/help
confirmation
settings
game over
special decisions
```

Avoid multiple unrelated modal visual systems.

---

# 26. Interaction Hierarchy

Use this principle:

```text
Immediate decision
→ always visible

Important current state
→ always visible

Useful explanation
→ hover / tap

Secondary detail
→ collapsible

Debug information
→ development mode only
```

This is the primary defence against clutter.

---

# 27. Visual Style

Use the approved visual references.

Direction:

```text
dark apothecary workshop
deep teal
aged parchment
brass/gold trim
dark wood
glass
subtle magical glow
```

Keep the visual design elegant rather than cartoonish.

Ingredient colours should remain vivid.

Avoid excessive ornamental detail around small functional controls.

---

# 28. Asset Strategy

Do NOT implement the interface as one large image.

Create reusable SVG components for:

```text
ruby
flask
rat tail
victory point
buying power
bag
droplet
skull
fortune
round marker
score markers
ingredient tokens
dice faces
```

Create pot/track visuals using SVG where practical.

The underlying board may use SVG paths.

Ingredient positions should be calculated based on logical board positions.

This makes future animation much easier.

---

# 29. SVG Requirements

SVG assets should:

```text
use viewBox
scale cleanly
avoid unnecessary embedded raster images
use semantic filenames
support CSS state styling where useful
```

Prefer:

```text
/assets/icons/ruby.svg
/assets/icons/flask.svg
/assets/icons/rat-tail.svg

/assets/ingredients/green-1.svg
/assets/ingredients/green-2.svg
/assets/ingredients/green-3.svg
```

Where appropriate, implement SVGs directly as React components.

---

# 30. Animation Architecture

Do not spread arbitrary animation timing throughout components.

Create reusable motion primitives.

Conceptually:

```text
TokenDrawAnimation
TokenReturnAnimation
ScoreGainAnimation
RubyGainAnimation
DiceRollAnimation
CardRevealAnimation
ExplosionAnimation
MarkerMoveAnimation
ToastTransition
```

Animation must never modify rules state.

The engine changes state.

Animation visualizes that change.

---

# 31. AI Animation

The AI should not instantly teleport through its entire turn.

However, do not make the player wait through long animations.

Recommended:

```text
AI thinking       ~300 ms minimum presentation
AI draw           ~300–500 ms
AI effect         ~250 ms
AI next draw      ~300 ms
```

Allow animation speed preferences:

```text
Fast
Normal
Reduced
```

Do not force the AI panel open or closed.

---

# 32. Responsive Behaviour

Desktop is primary.

For narrower screens:

```text
shared header
human pot
human status
actions
AI summary
AI pot
market
log
```

The player pot remains the highest-priority element.

Avoid simply scaling the entire desktop UI down.

Reflow components.

---

# 33. Accessibility

Implement:

```text
keyboard focus
semantic buttons
tooltips on focus
screen-reader labels
reduced motion
high contrast where practical
non-colour state indicators
large touch targets
```

Ingredient colour must not be the only identifier.

Include icon/label/value.

---

# 34. Preserve Game Engine

This is extremely important.

Do not rewrite:

```text
bag mechanics
scoring
round sequencing
ingredient rules
AI decision logic
RNG
```

merely because the UI is being redesigned.

Use the current engine API.

If presentation requires new selectors or derived state, add selectors rather than duplicating rules.

Example:

```ts
getCurrentWhiteRisk(state);
getCurrentPotReward(state);
getVisibleBagComposition(state);
getCurrentFortuneEffect(state);
getAIRecentActions(state);
```

Selectors may calculate presentation data.

They must not change game state.

---

# 35. Known Gameplay Verification Items

Before or during implementation, separately verify these issues:

## Bag randomness

Audit whether every draw is properly random from the current bag state.

A returned ingredient must re-enter the eligible random pool.

The UI must never expose the future random draw.

Do not assume observed repeated Cherry Bomb draws prove a bug.

Verify through tests.

---

## Bonus die timing

Verify engine timing against:

```text
/docs/RULES_MODEL.md
/docs/ROUND_SEQUENCE.md
```

If timing is already correct, improve presentation only.

---

## Round 9

Ensure Round 9 still shows:

```text
white-token total
explosion threshold
current risk
current pot reward
relevant draw state
```

even if the interaction mechanics differ in the final round.

---

## Special draw modes

Ensure alternate brewing modes reuse the same core risk/status presentation.

Do not hide information unintentionally because a different UI component is rendered.

---

# 36. Component Structure

Recommended conceptual structure:

```text
<GameScreen>

  <SharedHeader />

  <GameWorkspace>

    <HumanArea>
      <HumanStatusRail />
      <PotBoard />
    </HumanArea>

    <AIArea>
      <AIStatus />
      <AIPotBoard />
      <AIRecentActions />
    </AIArea>

  </GameWorkspace>

  <MarketArea>
    <IngredientMarket />
    <PurchaseSummary />
    <GameLog />
  </MarketArea>

  <PlayerActionBar />

  <ToastLayer />
  <ModalLayer />

</GameScreen>
```

Do not force this exact implementation if the existing app has a better component structure.

---

# 37. Design Tokens

Create central design tokens.

Example categories:

```text
colors
spacing
radius
border
shadow
font
fontSize
zIndex
motionDuration
motionEasing
```

Avoid scattering hardcoded values.

Use CSS variables where practical.

---

# 38. Implementation Workflow

Proceed in this order.

## Phase 1 — Audit

Inspect:

```text
existing UI
existing engine APIs
existing state shape
approved reference images
```

Identify what can be reused.

---

## Phase 2 — Design System

Implement:

```text
tokens
typography
panels
buttons
icons
tooltip
popover
toast
modal
```

Create a temporary component gallery if useful.

---

## Phase 3 — Main Layout

Implement:

```text
shared header
human pot area
AI pot area
market
log
action bar
```

Match the approved layout before adding significant animation.

---

## Phase 4 — Interaction States

Implement:

```text
ingredient hover
future-space preview
bag composition
purchase states
fortune active state
risk display
```

---

## Phase 5 — Animation

Implement:

```text
draw
return
score
ruby
dice
fortune reveal
explosion
AI sequence
```

---

## Phase 6 — Secondary Screens

Implement:

```text
home
settings
help
round summary
game over
```

---

## Phase 7 — Responsive / Accessibility

Audit all main flows.

---

## Phase 8 — QA

Play complete games.

Verify both UI and underlying game behaviour.

---

# 39. Visual QA

Compare the implementation directly against:

```text
/preDocs/ui/main-game-layout.png
/preDocs/ui/ui-asset-sheet.png
/preDocs/ui/states-animations-overlays.png
```

Inspect at minimum:

```text
game start
normal brewing
high explosion risk
ingredient hover
fortune effect
flask use
AI turn
purchase phase
dice roll
explosion
round end
round 9
game end
```

Use screenshots where available.

Fix obvious visual discrepancies.

---

# 40. UX QA

During manual play ask:

```text
Can I instantly find the Draw button?

Can I instantly see my explosion risk?

Can I tell what the AI just did?

Can I understand why my resources changed?

Can I inspect any ingredient?

Can I understand the Fortune effect?

Can I understand what each purchase does?

Does anything unexpectedly open or close?

Does the screen feel cluttered?

Is information duplicated unnecessarily?
```

Remove or simplify components that fail this test.

---

# 41. Performance

Animations must remain smooth.

Avoid rendering the entire board tree unnecessarily for every state change.

Heavy AI computation must not block animation.

Use memoization/selectors appropriately.

---

# 42. Completion Criteria

This UI pass is complete when:

- existing game rules still work
- existing AI still works
- the human and AI boards remain simultaneously visible
- no AI drawer automatically opens/closes
- pot is visually dominant
- white-risk state is always understandable
- shared score/round board is clearly represented
- Fortune effect is understandable
- purchasing is clear
- ingredients have tooltips
- future spaces can be inspected
- bag composition is optional
- dice resolution is visible
- resource changes have feedback
- Round 9 remains understandable
- home screen exists
- help screen exists
- round-end summary exists
- game-end screen exists
- SVG/icon system is reusable
- animations explain state transitions
- reduced-motion mode works
- responsive layout works
- no commercial screenshots are shipped as production UI
- automated tests still pass
- complete manual game remains playable

---

# Codex Execution Prompt

Read this document completely before modifying the application.

Also inspect:

```text
/preDocs/ui/main-game-layout.png
/preDocs/ui/ui-asset-sheet.png
/preDocs/ui/states-animations-overlays.png
```

The existing game engine is already functional.

Your objective is to implement the UI redesign described here **without destabilizing the game logic**.

Start by auditing the existing component tree and engine/UI boundary.

Then:

1. create the shared design system
2. recreate the approved one-page layout
3. make the human and AI pots simultaneously visible
4. remove any automatic AI-panel opening/closing behaviour
5. implement the new status hierarchy
6. implement ingredient inspection
7. improve the market/purchasing flow
8. implement Fortune-card presentation
9. implement the bag-composition toggle
10. implement reusable toast/popover/modal systems
11. implement animation primitives
12. implement dice/card/resource animations
13. implement home/help/round-end/game-end screens
14. make the layout responsive
15. audit accessibility
16. run all existing automated tests
17. add UI/E2E tests where behaviour has changed
18. manually play a complete game
19. visually compare the application with the supplied reference designs
20. iterate until the UI feels cohesive and all gameplay remains correct

Do not make broad engine changes merely to simplify UI implementation.

If you find a genuine rules or engine bug, isolate it, add a regression test, fix it separately, and document it.

Do not stop after producing a rough approximation.

Continue until the redesigned interface is fully playable and internally consistent.
