# Fortune-Telling Card Catalogue

The deck contains one copy of each entry below (24 total), is shuffled by seeded RNG at setup, and reveals one card per round. `IMMEDIATE` cards resolve before rat placement. `ROUND` cards register modifiers/hooks that expire during cleanup. Text is intentionally paraphrased.

| ID | Title | Timing / affected | Structured effect |
|---|---|---|---|
| F01 | Forked Remedy | IMMEDIATE / each | Choose droplet +2 or gain purple-1; purple option legal only from round 3 and while supplied. |
| F02 | A Fuller Pot | IMMEDIATE / each | Move droplet +1. |
| F03 | A Ruby for the Poor | IMMEDIATE / tied fewest rubies | Gain ruby +1. Determine recipients from pre-effect counts simultaneously. |
| F04 | The Lightest Five | IMMEDIATE / all | Each draws five temporary tokens and sums printed values. All tied lowest gain blue-2; every non-lowest gains one ruby. Return all previews. Supply limits reward. |
| F05 | One Fine Choice | IMMEDIATE / each | Choose black-1, any available unlocked colored value-2, or three rubies. |
| F06 | Ruby Barter | IMMEDIATE / each | May pay one ruby once for an available value-1 token other than black/purple; color must be unlocked. |
| F07 | Rat Bargain | IMMEDIATE, after base rat count known / nonleaders | Use all tails, or exchange 1-3 effective tails for equal rubies; cannot exchange more than earned. Remaining tails set rat position. |
| F08 | Gifts of Chance | IMMEDIATE / each | Roll bonus die once and resolve. |
| F09 | Timely Upgrade | IMMEDIATE / each | Preview four. If at least one has a supplied next denomination of same color, may exchange one; otherwise gain green-1. Return previews. |
| F10 | Help for the Trailer | IMMEDIATE / tied fewest VP | Gain green-1; determine recipients simultaneously. |
| F11 | Roomier Cauldrons | ROUND / all | Explosion threshold is 9 this round. |
| F12 | Rat Swarm | ROUND, rat setup / nonleaders | Double computed rat-tail count. |
| F13 | Four Points or Less White | IMMEDIATE / each | Choose +4 VP or permanently return one owned white-1 to supply; removal option requires one in bag (not a placed token). |
| F14 | Rats Pay Back | IMMEDIATE, after rat count known / each | Choose any available unlocked colored value-4 or gain VP equal to effective rat tails. Leaders may choose chip or zero VP. |
| F15 | Exact Seven | evaluation B / each | If final white total is exactly 7, move droplet +1; explosion status irrelevant. |
| F16 | Ruby-Space Windfall | evaluation C / each | If scoring entry has ruby, gain +2 VP, even if exploded or choosing purchases. |
| F17 | Brighter Rubies | evaluation C / each | If scoring entry has ruby, gain one additional ruby (two total from the space), even if exploded. |
| F18 | Neighbor's Mishap | after brewing / each beneficiary | For every player who exploded, player to that player's left chooses an available unlocked colored value-2. In two-player mode this is the opponent. Resolve in start-player order. |
| F19 | First White Reprieve | brewing hook / each | On the first white token drawn for normal/selected placement, may return it to bag instead of placing it; no explosion contribution. One opportunity only even if declined. |
| F20 | Double Champion Roll | evaluation A / eligible rollers | Each eligible player rolls and resolves the die twice. |
| F21 | Brew Again | after fifth placement event / each | Once, choose continue or restore brewing-entry player snapshot, return round draws, reshuffle with next RNG state, and restart brewing. Fortune effects before brewing remain; chip-caused effects and flask use from failed attempt are undone. |
| F22 | Final Pinch | after voluntary stop / each non-exploded, start-player order | Preview up to five remaining bag tokens; choose zero/one to place and resolve normally, then return others. Selected white can cause explosion. |
| F23 | Pumpkin Festival | ROUND / all | Orange tokens move one additional track index. |
| F24 | Bottles Restored | end-round F / all | Refill every flask free before cleanup. |

## Common rules and edge cases

- Temporary previews never trigger ingredient effects, placement counts, or explosion checks. Their order is hidden from the opponent and logged only in the owning player's private replay view.
- Card rewards come from finite supply. If an exact reward is unavailable, that portion is lost; choices with no satisfiable result are illegal.
- Simultaneous comparisons use pre-effect snapshots. Player choices are collected, then applied in start-player order when shared supply conflicts.
- `F07` and `F14` calculate normal round rat count after `F12`; only one Fortune card is active, so the modifiers cannot coexist in the standard deck draw.
- `F09` uses denomination ladders white `1->2->3` and colored `1->2->4`; orange/black/purple have no higher base-game denomination. An exchange returns the old token to supply and takes the new one.
- `F21` rollback behavior and `F09` white upgrades are explicit project decisions; see `DECISIONS.md`.

## Required tests per card

Every card needs: normal resolution; every choice branch; tie case; insufficient-supply case; locked-color case where applicable; exploded/non-exploded case for round-end cards; deterministic RNG replay for previews/die/restart; and cleanup proving no modifier leaks into the next round. F07/F14 require leader and 0/1/3/4+ tail cases; F21 requires rollback of VP/rubies/droplet/flask/white total and chained blue placements; F22 requires decline, empty bag, chained effect, and newly caused explosion.
