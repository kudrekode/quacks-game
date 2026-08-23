Prompt 1 — Rules Research and Formal Specification

You are the lead game-systems analyst and software architect for this project.

Your task in this stage is NOT to build the game.

Your task is to inspect the supplied reference material under /preDocs, reconstruct the complete base-game rules accurately, resolve ambiguities, and produce an implementation-grade specification that another coding agent can follow without needing to reinterpret the original material.

Do not create the application yet.

Do not create React components.

Do not implement the game engine.

Spend this stage understanding and specifying the game correctly.

AUTHORITATIVE SOURCE MATERIAL

Use the /preDocs directory as the primary source of truth.

The supplied material includes:

/preDocs/Quacksalber\_\_Rules_English_v1

This contains the complete English rules.

Treat this as the primary authoritative rules source.

/preDocs/Fortune-telling-Cards

This contains visual references for the Fortune-Telling cards, including German originals and English translations.

Use these to derive:

the complete standard Fortune-Telling deck
timing
game-state effects
duration
affected players
edge cases
implementation requirements

Do not reproduce large amounts of copyrighted card wording verbatim.

Convert each card into concise structured game logic and short original/paraphrased UI text.

/preDocs/Deluxified_Tokens_Quacks_of_Quindilburg_all_Sheets

This contains visual references for ingredient/potion tokens.

Use it to understand:

token colours
denomination/value markings
visual differentiation
relative physical appearance

Do NOT extract or redistribute these images as production assets.

Use them only as references.

Production assets should eventually use original SVG/icon artwork that conveys the same game information without reproducing the commercial artwork.

/preDocs/mainBoard

This is a visual reference for the shared/main game board.

Use it to understand:

score progression
round tracking
rat-tail relationships
shared board information
spatial hierarchy
information that must remain visible during play

Do not copy the artwork directly.

Derive a functional digital representation.

/preDocs/individualBoard

This is a visual reference for each player's individual board/pot.

Use it to understand:

pot track structure
printed space values
ruby spaces
scoring positions
droplet positioning
ingredient placement
flask/ruby areas
other player-state information

Do not use the original board image as a production asset.

Reconstruct its mechanics as structured data and later render it with original visuals.

SOURCE PRIORITY

When sources appear to disagree, use this order:

/preDocs/Quacksalber\_\_Rules_English_v1
English translations in /preDocs/Fortune-telling-Cards
structural evidence visible in /preDocs/individualBoard
structural evidence visible in /preDocs/mainBoard
other supplied /preDocs references

If ambiguity remains after inspecting all supplied files, research only authoritative or highly reliable external clarifications.

Do not silently guess.

Document uncertainty.

OUTPUT

Create:

/docs
CODEX_PROMPTS.md
PRODUCT_SPEC.md
RULES_MODEL.md
ROUND_SEQUENCE.md
GAME_STATE.md
BOARD_MODEL.md
INGREDIENTS.md
FORTUNE_CARDS.md
AI_DESIGN.md
UI_SPEC.md
TEST_PLAN.md
RULES_SOURCES.md
DECISIONS.md
IMPLEMENTATION_PLAN.md
ASSET_POLICY.md

Copy these two Codex prompts into:

/docs/CODEX_PROMPTS.md

so future agents understand the development process.

PRODUCT_SPEC.md

Define the initial product as:

A polished browser implementation of the standard base game, initially supporting one human player versus one strong AI player.

Initial version:

2 players
1 human
1 AI
standard nine-round game
standard base-game setup
standard base-game scoring
standard Fortune-Telling cards
standard ingredient rules required by the default/base configuration
no expansions unless required by the supplied base-game rules
local browser play
no online multiplayer
no accounts
no backend required

Document what is in scope and explicitly out of scope.

RULES_MODEL.md

This must be the authoritative technical description of the rules.

Write the game as a state machine.

Document every phase in exact order.

Include:

game setup
initial bag contents
round setup
Fortune-Telling phase
rat tails
brewing
drawing
placement
stopping
explosions
flask use
ingredient powers
bonus die
rubies
scoring
buying
droplet movement
flask refill
round cleanup
final-round differences
end-game conversion
winner determination
ties

Explicitly document which decisions belong to:

human player
AI player
automatic game engine

Every transition must be unambiguous.

ROUND_SEQUENCE.md

Create a concise machine-oriented sequence for one complete round.

For every phase specify:

phase name
entry conditions
automatic actions
legal player actions
exit conditions
next phase
special round-specific exceptions

The implementation agent should be able to turn this directly into game-engine transitions.

GAME_STATE.md

Design the complete serializable game state.

Include types conceptually equivalent to:

GameState
PlayerState
BagState
Token
PlacedToken
IngredientDefinition
IngredientEffect
FortuneCard
RoundState
MarketState
BoardPosition
RandomState
GameLogEntry

For each object define:

fields
meaning
invariants
ownership
hidden versus public information

The complete game must be reproducible using:

initial seed + player decisions

Therefore include deterministic seeded random-number-generator state.

BOARD_MODEL.md

Reverse-engineer the mechanical structure visible in:

/preDocs/mainBoard
/preDocs/individualBoard

Represent boards as data, not screenshots.

Document:

every relevant pot position
printed purchasing values
printed scoring values
ruby positions
movement semantics
droplet interactions
scoring track
round track
rat-tail calculations

If a coordinate system will later be required for rendering, separate:

logical board position

from:

render coordinates

The game engine must never depend on pixels.

INGREDIENTS.md

Create a complete structured catalogue of the ingredient system required for the initial game.

For every token type record:

colour
value
purchase price
availability
pot movement
special power
timing
dependencies
edge cases

Determine the correct initial ingredient book/configuration from the supplied base-game rules.

If the rules provide multiple ingredient-book sets, identify:

which set is appropriate as the initial/default implementation
how the other sets differ
how the engine should be structured so they can be added later

Ingredient powers should eventually be implementable through modular effects rather than UI-specific conditionals.

FORTUNE_CARDS.md

Inspect every relevant supplied Fortune-Telling card.

Create a structured catalogue.

For every card specify:

id
short original/paraphrased title
timing
effect
affected players
duration
state changes
interaction with other rules
edge cases
test cases required

Do not merely write prose summaries.

Express effects precisely enough to implement.

AI_DESIGN.md

Design one AI opponent.

There are no difficulty levels in version one.

The AI should attempt to play as strongly as practical.

It must never cheat.

It may know:

its own bag composition
tokens already drawn
public information
opponent public state
scores
market
round
legal rules

It may NOT know:

future RNG output
future token order
unrevealed Fortune cards
other hidden information unavailable to a human player

The primary brewing decision is:

STOP
versus
DRAW AGAIN

Design an AI using Monte Carlo simulation / expected-value analysis where practical.

The AI should evaluate not merely immediate purchasing power but approximate probability of ultimately winning the game.

Evaluation should consider:

current VP differential
round number
rounds remaining
explosion probability
bag composition
expected movement
purchasing power
ingredient synergy
rubies
flask state
rat tails
opponent position
long-term bag quality

Design purchase AI that enumerates legal purchases and evaluates their expected future value.

Specify performance strategies such as:

memoization
cached probability distributions
adaptive rollout counts
headless simulation
optional Web Worker execution
UI_SPEC.md

Design the digital interface from the mechanics rather than copying the physical artwork.

The game should clearly show:

Human:

pot
bag
drawn ingredients
risk/explosion total
purchasing power
current scoring value
rubies
flask
droplet
score

AI:

visible pot state
score
rubies
public ingredient information
current action/state

Shared:

round
score track
Fortune card
market
ingredient costs
active phase
game log

The human should always be able to answer:

What just happened?
What can I do now?
Why did that happen?
What happens if I draw again?

Design for desktop first but make the layout responsive.

ASSET_POLICY.md

The supplied visual files are reference material.

Do not plan to ship extracted commercial board or token artwork.

Production UI should instead use:

original SVG tokens
CSS
procedural shapes
original iconography
original board rendering
original backgrounds/textures

The visual direction may evoke:

historical apothecaries
alchemy
potion brewing
glass bottles
brass instruments
parchment
European market stalls

but should not reproduce the commercial visual design.

TEST_PLAN.md

Build an exhaustive rules-oriented test plan.

Include unit tests for:

bag draws
token conservation
seeded randomness
pot movement
explosions
flask use
scoring
purchasing
rubies
droplet movement
rat tails
Fortune cards
every implemented ingredient power
final round
final scoring
ties

Include complete-round integration tests.

Include end-to-end scenarios.

Include property/invariant tests.

Important invariants include:

a token cannot exist in two places simultaneously
bag token count is conserved
rubies cannot become negative
scores cannot become NaN
AI cannot make illegal purchases
AI cannot access hidden future randomness
all games terminate
phase transitions must be legal

Plan headless AI-vs-AI simulation for thousands of games.

DECISIONS.md

Every ambiguous rule interpretation must be recorded here.

For each:

Question
Source evidence
Decision
Reasoning
Implementation consequence

Never silently resolve ambiguity inside source code.

IMPLEMENTATION_PLAN.md

Produce an ordered implementation plan.

Recommended overall order:

deterministic RNG
domain types
board model
bag mechanics
player state
game state machine
ingredient effects
Fortune cards
scoring
purchasing
complete headless game
rule tests
simple baseline AI
Monte Carlo AI
AI self-play
React UI
animations
persistence
accessibility
Playwright tests
visual polish
final rules audit

Break larger areas into concrete implementation tasks.

SPECIFICATION QUALITY GATE

Before finishing this stage, perform a complete audit.

Ask:

Is every rule required for a complete game represented?
Can all nine rounds be played from this documentation alone?
Are all required ingredients documented?
Are all relevant Fortune cards documented?
Are board spaces represented mechanically?
Are final-round rules explicit?
Are scoring and purchasing order explicit?
Are hidden-information boundaries explicit?
Could a competent engineer implement the game without reopening the rulebook?

If not, continue researching and refining.

Do not implement the game during this stage.

The stage is complete only when /docs forms an internally consistent implementation specification.

At the end, provide a concise report containing:

documents created
rules sources inspected
ambiguities discovered
decisions made
remaining uncertainties
recommended next step

Begin by inspecting /preDocs.
