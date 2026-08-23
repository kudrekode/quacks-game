# Board Model

## Separation of concerns

The engine uses integer track indices. Rendering coordinates live in a UI-only layout table keyed by those indices. No rule may inspect pixels, angles, DOM position, or SVG coordinates.

## Pot track

`trackIndex` is distance along the spiral. Index 0 is the initial droplet space. A chip of effective movement `n` is placed `n` indices after the current anchor (the rat stone for the first chip when active, otherwise the droplet; then the preceding placed chip). Gaps remain empty. Removing a chip never collapses gaps. The scoring entry is the index immediately after the last placed chip. If movement reaches/passes the end, clamp the chip to index 52 and use the spoon entry at index 53.

Each tuple below is `trackIndex: coins/VP/ruby`. This transcription is mechanically corroborated by the supplied player-board image; index 53 is the spoon reward stated by the rulebook.

```text
 0: 0/0/-    1: 1/0/-    2: 2/0/-    3: 3/0/-    4: 4/0/-
 5: 5/0/R    6: 6/1/-    7: 7/1/-    8: 8/1/-    9: 9/1/R
10:10/2/-   11:11/2/-   12:12/2/-   13:13/2/R   14:14/3/-
15:15/3/-   16:15/3/R   17:16/3/-   18:16/4/-   19:17/4/-
20:17/4/R   21:18/4/-   22:18/5/-   23:19/5/-   24:19/5/R
25:20/5/-   26:20/6/-   27:21/6/-   28:21/6/R   29:22/7/-
30:22/7/R   31:23/7/-   32:23/8/-   33:24/8/-   34:24/8/R
35:25/9/-   36:25/9/R   37:26/9/-   38:26/10/-  39:27/10/-
40:27/10/R  41:28/11/-  42:28/11/R  43:29/11/-  44:29/12/-
45:30/12/-  46:30/12/R  47:31/12/-  48:31/13/-  49:32/13/-
50:32/13/R  51:33/14/-  52:33/14/R  53:35/15/- (spoon)
```

The scoring entry, not the last chip's entry, supplies coins, VP, and the phase-C ruby. For bonus-die comparison use scoring `trackIndex`, not coin value; this resolves repeated coin values. Ingredient rules referring to fields 0-9, 10-19, etc. use the printed `coins` value of the chip's position.

Droplet movement increments its `trackIndex` by one, clamped at 52. It never moves placed chips and does not change the current round's scoring entry. Rat position is `min(52, dropletIndex + ratTailCount)` and is temporary.

## Main scoring track

Store VP as an unbounded non-negative integer. Rendering maps it to `displaySpace = ((vp - 1) mod 50) + 1` for positive VP and uses the seal side/lap indicator separately. This avoids rules depending on marker pixels and supports theoretical scores above 99.

A rat tail lies between score `s` and `s+1` after these spaces:

```text
[1, 4, 7, 10, 12, 14, 16, 18, 20, 22, 24, 26,
 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48]
```

For a trailing player at `p` and lead score `L`, count boundaries `b` such that `p <= b < L`; for scores beyond 50, repeat each boundary at `b + 50*k`. Tied leaders receive zero. The Rat Infestation card doubles the resulting count. A Good Start then exchanges up to three of those effective tails for the same number of rubies.

## Round track

Rounds are integers 1-9. Round 2 unlocks yellow; round 3 unlocks purple; round 6 adds one white value-1 chip to every bag; round 9 enables simultaneous reveal presentation and final conversion. The nine hanging panels are reminders, not mutable game spaces.

## Bonus die

Six equiprobable faces: `VP_1` twice, `VP_2`, `RUBY_1`, `DROPLET_1`, `ORANGE_1`. Resolve every roll immediately and log its RNG result. A missing orange supply means that face grants nothing.

## Render model

Recommended UI data: `{trackIndex, normalizedX, normalizedY, tangentAngle}` for each pot cell; `{score, perimeterT}` for 1-50; and semantic overlays for chips, droplet, rat, ruby, coins, and VP. Coordinates may be tuned freely as long as ordering and labels remain data-driven.

