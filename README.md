# Quacks Game Engine

This repository currently contains the deterministic headless implementation stage. It intentionally has no React or browser UI yet.

## Commands

```sh
npm install
npm run typecheck
npm run build
npm run test:run
npm run simulate -- 1000
```

## Engine API

```ts
import {
  baselineCommand,
  createGame,
  dispatch,
  observe,
  replayGame,
  serialize,
} from "./src/index.js";

let state = createGame({ seed: "demo-001" });

while (state.phase !== "GAME_OVER") {
  // A UI or AI chooses only from state.pendingDecision.options.
  state = dispatch(state, baselineCommand(state));
}

const humanView = observe(state, "human");
const savedGame = serialize(state);
const replayed = replayGame({ seed: "demo-001" }, ["droplet", "DRAW"]);
```

`createGame` builds the exact two-player base/set-1 supply and shuffled 24-card Fortune deck. `dispatch` is immutable and rejects stale or illegal decisions. `observe` removes unrevealed Fortune order, opponent previews, and reducer snapshots. Serialization includes the PRNG state and pending continuation data.

Rules and implementation decisions live in [`docs/`](./docs/). The public exports are collected in [`src/index.ts`](./src/index.ts).
