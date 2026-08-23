# Ingredient Catalogue

## Shared token model and supply

Every token has stable `id`, `color`, `value`, and `owner/location`. Movement value is normally its printed value; effects may modify movement without changing printed value or white explosion contribution.

Base component totals are: white `1x20, 2x8, 3x4`; orange `1x22`; green `1x15, 2x8, 4x13`; blue `1x12, 2x8, 4x10`; red `1x12, 2x8, 4x10`; yellow `1x13, 2x8, 4x10`; purple `1x17`; black `1x17`. Supply is finite. For a two-player setup, subtract each player's starting tokens: white `1x4,2x2,3x1`, orange `1x1`, green `1x1`. White tokens are never purchasable. Round 6 consumes one additional white-1 per player.

Availability by round: orange, black, green, blue, red in round 1; yellow from round 2; purple from round 3. A color unavailable by round cannot be selected from a Fortune effect.

## Default set 1 (v1 rules)

| Color | Values and prices | Timing | Exact modular effect |
|---|---|---|---|
| White, cherry bomb | 1/2/3; not sold | after placement | Add printed value to white total. Explosion occurs when total exceeds current threshold (normally 7). No movement power. |
| Orange, pumpkin | 1: 3 | placement | No base power. Pumpkin Party changes effective movement to 2 for this round. |
| Blue, crow skull 1 | 1:5, 2:10, 4:19 | immediate after blue placement | Privately draw up to printed value tokens from remaining bag without effects. Choose zero or one; return the rest unseen to the bag. If chosen, place it as the next chip and resolve it normally, including chained blue effects. |
| Red, toadstool 1 | 1:6, 2:10, 4:16 | placement calculation | Count orange chips already in pot, excluding the red being placed: 0 => +0 movement; 1-2 => +1; 3+ => +2. |
| Yellow, mandrake 1 | 1:8, 2:12, 4:18 | after yellow placement | If the immediately preceding placed chip is white, player may return that white token to the bag. Its space stays empty; subtract its value from white total. The yellow stays where placed. |
| Green, garden spider 1 | 1:4, 2:8, 4:14 | evaluation B | Gain one ruby for each green token among the last two tokens in placement order (maximum two), regardless of gaps/value/explosion. |
| Purple, ghost's breath 1 | 1:9 | evaluation B | Choose a tier no higher than count: tier1 = 1 VP; tier2 = 1 VP + 1 ruby; tier3+ = 2 VP + move droplet 1. Only one tier resolves. |
| Black, moth (2-player) | 1:10 | evaluation B | Compare black count with opponent. Equal count => move droplet 1; greater => move droplet 1 and gain ruby 1; fewer => nothing. Equality at zero does not qualify because no black token was drawn. |

All optional ingredient actions require an explicit human decision or deterministic AI decision. Explosion never suppresses ingredient effects.

## Sets 2-4 (catalogued for extensibility, not selectable in v1)

Effects implement the same `IngredientEffect` interface and never branch in UI code.

| Color/set | Prices (1/2/4) | Effect |
|---|---:|---|
| Blue 2 | 5/10/19 | A blue value `n` protects the next `n` placed chips: if one causes explosion, player may still take both D and E (never bonus die). New blue protection replaces, not adds; count the blue placement as activation, not protected draw. |
| Blue 3 | 4/8/14 | On placement on a ruby track entry, gain one ruby. |
| Blue 4 | 5/10/20 | On ruby entry, gain VP equal to printed value. |
| Red 2 | 4/8/14 | Set aside when drawn. After brewing, any stored red tokens may be placed in chosen order or retained for later; they may be returned to bag at any time. |
| Red 3 | 5/9/15 | If immediately preceded by white, add that white token's printed value to red movement. |
| Red 4 | 7/11/17 | Once any red is already in pot, subsequently drawn white-1 tokens move one extra; explosion value remains 1. |
| Yellow 2 | 9/13/19 | Next placed token moves twice its normal effective movement; effect does not stack and is consumed by the next placement. |
| Yellow 3 | 8/12/18 | First yellow drawn raises threshold to 8; third raises it to 9. Values irrelevant. |
| Yellow 4 | 8/12/18 | First/second/third yellow placed gets +1/+2/+3 movement; later yellow gets none. |
| Green 2 | 6/11/18 | Each qualifying last-two green grants: value1 orange-1; value2 choice blue-1/red-1; value4 choice yellow-1/purple-1, subject to unlocked color and supply. |
| Green 3 | 6/11/21 | If final white total exactly 7, move the last placed chip by total printed value of all green tokens; clamp at end and recompute scoring entry. |
| Green 4 | 4/8/14 | For each qualifying last-two green, may pay one ruby to move droplet one. |
| Purple 2 | 1:12 | Exchange exactly 1/2/3 drawn purple for the corresponding single tier: (black-1,1VP,1 ruby); (green-1,blue-2,3VP,droplet+1); (yellow-4,6VP,1 ruby,droplet+2). May choose a lower tier; supply limits each granted token. |
| Purple 3 | 1:10 | Per purple, award 0/1/2/3 VP when its printed coin field is 0-9/10-19/20-29/30+. |
| Purple 4 | 1:11 | Choose one tier up to count: upgrade one same-color token 1->2, 2->4, or 1->4. Exchange with supply; current placement/scoring is unchanged. |

## Effect API requirements

Effects receive immutable `EffectContext` (round, card modifiers, player/public state, supply, source token, placement history) and emit validated domain events plus zero or more decisions. Preview draws use the same bag RNG but do not trigger effects until selected. Returned, discarded, stored, bagged, placed, previewed, and supplied are distinct token locations; conservation applies across all.

