# Cauldron & Chance

This repository contains a deterministic rules engine, a stronger information-set Monte Carlo AI, and a responsive React interface for a local human-versus-AI game.

## Commands

```sh
npm install
npm run typecheck
npm run build
npm run test:run
npm run simulate -- 1000
npm run benchmark:ai -- 100
npm run dev
```

## Engine API

```ts
import {
  createGame,
  dispatch,
  monteCarloCommand,
  observe,
  replayGame,
  serialize,
} from "./src/index.js";

let state = createGame({ seed: "demo-001" });

while (state.phase !== "GAME_OVER") {
  // A UI or AI chooses only from state.pendingDecision.options.
  state = dispatch(state, monteCarloCommand(state));
}

const humanView = observe(state, "human");
const savedGame = serialize(state);
const replayed = replayGame({ seed: "demo-001" }, ["droplet", "DRAW"]);
```

`createGame` builds the exact two-player base/set-1 supply and shuffled 24-card Fortune deck. `dispatch` is immutable and rejects stale or illegal decisions. `observe` removes unrevealed Fortune order, opponent previews, and reducer snapshots. Serialization includes the PRNG state and pending continuation data. The browser AI runs in a Web Worker and receives only its redacted observation.

The app automatically saves in local storage and supports replay import/export, seeded new games, reduced motion, high contrast, risk visibility, keyboard controls, and responsive layouts.

Rules and implementation decisions live in [`docs/`](./docs/). The public exports are collected in [`src/index.ts`](./src/index.ts).
