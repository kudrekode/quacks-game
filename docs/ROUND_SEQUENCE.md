# Machine-Oriented Round Sequence

| Phase | Entry | Automatic work | Legal decisions | Exit -> next | Exceptions |
|---|---|---|---|---|---|
| `ROUND_OPEN` | setup/previous cleanup | apply round unlock/add-white milestone; reset round fields | none | milestone events done -> `FORTUNE` | R2 yellow, R3 purple, R6 white-1 |
| `FORTUNE` | open complete | reveal next card; register immediate or duration effect | card-defined choices | all choices committed/resolved -> `RAT_SETUP` | reward color must be unlocked |
| `RAT_SETUP` | Fortune ready | calculate leaders, tails, rat anchors | F07/F14 choices | all rat positions fixed -> `BREWING` | no rats in R1; F12 doubles |
| `BREWING` | anchors fixed | initialize white total/threshold/placement histories | draw, stop; flask after eligible draw; ingredient/card choices | both finally stopped -> `POST_BREW` | R9 commit/reveal lockstep; F19; F21 |
| `POST_BREW` | ordinary brewing done | resolve post-stop hooks in start order | F22 preview/place; future stored-token actions | no pending placements -> `EVAL_A` | a post-stop chip may explode |
| `EVAL_A` | scoring entries captured | find farthest non-exploded; roll/resolve die | none | rolls complete -> `EVAL_B` | F20 two rolls |
| `EVAL_B` | A complete | resolve black, green, purple and B hooks | optional tier/effect choices | all players/colors complete -> `EVAL_C` | explosion irrelevant |
| `EVAL_C` | B complete | award ruby-field rewards and C hooks | none | awards complete -> `EXPLOSION_CHOICE` | explosion irrelevant; F16/F17 |
| `EXPLOSION_CHOICE` | C complete | mark non-exploded eligible for both | exploded choose score or buy | every exploded chose -> `EVAL_D` | protected future blue may grant both |
| `EVAL_D` | choices fixed | award base scoring VP to eligible | none | complete -> `EVAL_E` | card/effect VP already retained |
| `EVAL_E` | D complete | set eligible coin budgets | buy 0-2 distinct colors | each ends shopping -> `EVAL_F` | round 9 coins later convertible |
| `EVAL_F` | shopping complete | apply free refill hook | repeatedly droplet+1 or flask refill for 2 rubies; finish | all finish -> `ROUND_CLEANUP` | F24 free refill |
| `ROUND_CLEANUP` | F complete | return tokens, clear transient state, rotate start | none | R1-8 -> next `ROUND_OPEN`; R9 -> `FINAL_CONVERSION` | retain R9 tie-break snapshot |
| `FINAL_CONVERSION` | R9 cleanup boundary | convert 5 coins/2 rubies to VP; determine winner | only if UI exposes dominated resource choices | awards complete -> `GAME_OVER` | preserve final pot distance |

## Brewing micro-transition

`AWAIT_ACTION -> DRAW_RNG -> PLACE -> RESOLVE_IMMEDIATE_EFFECTS -> CHECK_EXPLOSION -> (AWAIT_FLASK_OR_ACTION | FORCED_STOP)`. Preview effects insert `PREVIEW_RNG -> AWAIT_SELECTION -> RETURN_UNSELECTED -> PLACE_SELECTED`. Flask rollback returns to `AWAIT_ACTION`. No UI animation is a game phase.

## Ordering guarantees

Start-player order is snapshotted at round entry and used throughout evaluation and shared-supply conflicts. Comparisons described as simultaneous snapshot their inputs before awards. A pending decision includes `decisionId`, `actor`, exact `legalActions`, and `continuation`; stale or duplicate submissions are rejected.

