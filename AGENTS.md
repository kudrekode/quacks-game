# Quacks Game — Agent Guide

## Purpose

This repository is a local, browser-based two-player board-game adaptation: human versus AI. It combines a deterministic rules engine, seeded RNG, and original React/SVG presentation. Keep game logic separate from rendering, and do not reuse the commercial reference art.

## Start here

`docs/` is the durable project map. Read the relevant source of truth before changing behavior:

| Concern | Source of truth |
| --- | --- |
| Normative rules and invariants | `docs/RULES_MODEL.md` |
| Phase transitions and decision ordering | `docs/ROUND_SEQUENCE.md` |
| Fortune-card behavior | `docs/FORTUNE_CARDS.md` |
| Serializable state, replay, and information boundaries | `docs/GAME_STATE.md` |
| Board geometry, scoring spaces, and rat tails | `docs/BOARD_MODEL.md` |
| Ingredient supply, effects, and unlocks | `docs/INGREDIENTS.md` |
| UI, accessibility, and original-art direction | `docs/UI_SPEC.md` |
| Asset provenance and restrictions | `docs/ASSET_POLICY.md` |
| AI constraints | `docs/AI_DESIGN.md` |
| Required coverage and QA | `docs/TEST_PLAN.md` |
| Resolved ambiguities | `docs/DECISIONS.md` |

When documents disagree, `docs/RULES_MODEL.md` wins. Record a new rules interpretation in `docs/DECISIONS.md`; do not silently choose one.

## Repository map

- `src/engine.ts` is the game reducer: setup, legal decisions, effects, phase changes, logging, serialization, and validation.
- `src/types.ts`, `src/content.ts`, and `src/rng.ts` define state/contracts, content tables, and seeded xoshiro RNG.
- `src/ai.ts` and `src/ai.worker.ts` select legal AI decisions from redacted observations.
- `src/App.tsx`, `src/HumanPotBoard.tsx`, `src/RoundResolution.tsx`, and `src/EffectChoiceModal.tsx` are the main React presentation layers.
- `src/debugStates.ts` contains deterministic development fixtures selected with `?debugState=<name>` in Vite development mode.
- `src/uiAssets.ts`, `src/ingredientAssets.ts`, `src/GameIcon.tsx`, and `src/IngredientToken.tsx` centrally resolve UI and ingredient assets.
- `public/assets/` contains production SVG/raster assets. `preDocs/` and `imageRefs/` are references, not production art.
- Unit tests live in `tests/*.test.ts`; visual QA is `tests/visual/visual-qa.spec.ts` and writes reviewed PNGs to `tests/visual/screenshots/`.

The project currently uses a flat `src/` layout; do not assume the aspirational folder layout in `docs/IMPLEMENTATION_PLAN.md` already exists.

## Architecture rules

- Put rules, validation, token ownership, and phase transitions in the engine—not React components.
- Render engine state and `pendingDecision.options`; UI must not award resources or invent legal actions.
- Route every special choice through the shared pending-decision mechanism. Preserve decision IDs and stale-decision rejection.
- Keep RNG seeded, serialized, and consumed only by named engine/AI events. UI and animations must never add gameplay randomness.
- AI must use `observe(...)`/redacted state only. Never reveal or inspect a future bag order, private preview, or hidden opponent information.
- Keep board placement/geometry data-driven. Rules use track indices; engine code must not depend on pixels, SVG, or DOM positions.
- Use the central asset manifests/components. Missing ingredient assets need a visible fallback and tests—not a silent broken icon.

## Change safely

Before changing behavior:

1. Classify the issue as engine/state, AI, UI, or asset rendering.
2. Do not rewrite engine behavior to repair a presentation issue.
3. For confirmed rules bugs, add a deterministic regression test with a fixed seed or fixture.
4. Preserve replayability, token conservation, phase ordering, and public/private information boundaries.
5. Update the governing docs only when rules, state behavior, phase order, Fortune cards, or a major interaction pattern changes.

High-risk areas include Fortune-card decisions and cleanup, flask/restart rollback, preview/select/return effects, round transitions (especially rounds 6 and 9), exploded-pot D/E choices, finite shared supply, and AI redaction. Treat these as engine-first changes with focused tests.

## Engine and AI boundaries

Commands carry only a decision ID and a selected legal option. Let `dispatch` validate and advance the state; do not mutate `GameState` from a caller. Preserve invariant validation and event/log semantics when refactoring the reducer.

Use the public observation projection at every human/AI boundary. Private preview data is intentionally limited to its owner; UI status copy and AI summaries must not leak it. Keep worker communication to observations, pending decisions, deterministic seeds, and reports.

If content data changes, review `src/content.ts`, rules documents, finite supply tests, and all affected asset/market representations together. UI labels may be richer, but they must remain a presentation of engine-defined values and legal options.

## Commands and verification

Use only scripts defined in `package.json`:

```bash
npm test             # all Vitest unit/integration tests
npm run typecheck    # TypeScript checks for source and app configs
npm run build        # production TypeScript and Vite build
npm run visual:qa    # Playwright debug-state capture and assertions
npm run simulate     # headless AI-vs-AI simulation
npm run benchmark:ai # AI benchmark
```

Run `npm test` for engine, content, RNG, or AI work; add deterministic cases for altered rules. Run `npm run typecheck` and `npm run build` for source changes. For any UI, styling, asset, or responsive change, run `npm run visual:qa` and inspect the generated screenshots yourself—passing Playwright only establishes structural checks, not visual fidelity.

Visual fixtures are in `src/debugStates.ts`; screenshots are in `tests/visual/screenshots/`. Use the corresponding files as review evidence, and use `imageRefs/` only as non-production visual references. Never claim a reference match without rendering and inspecting the target state.

When adding a visual state, add both its `DebugStateName` fixture and its Playwright coverage. Check more than layout: the visual suite covers console/page errors, control visibility, overflow, modal bounds, asset loading, and context-specific ingredient rendering. Inspect responsive captures such as the 1280, 1440, and 1600 brewing screenshots when altering the main layout.

## Test focus by layer

- Engine/content/RNG: extend the relevant `tests/engine.test.ts`, `tests/effects.test.ts`, `tests/content.test.ts`, or `tests/rng.test.ts` case; assert state, logs, and legal decisions as applicable.
- AI: retain reproducibility, legal-action selection, and redaction coverage in `tests/ai.test.ts`.
- Effect-choice UI: preserve preview privacy and shared-choice behavior covered by `tests/effectChoices.test.ts` and visual effect fixtures.
- Ingredient rendering: retain manifest coverage and fallback behavior in `tests/ingredientAssets.test.ts`.
- Styling/UI: use the visual suite and inspect generated PNGs; do not use screenshots as a substitute for engine regression tests.

`docs/TEST_PLAN.md` describes desired broader checks (property tests, large simulations, accessibility, and release soak). Treat it as the target test plan; only list or run package scripts that actually exist in `package.json`.

## Assets and documentation

- Production assets belong under `public/assets/` and must remain original under `docs/ASSET_POLICY.md`.
- Do not import, ship, trace, crop, recolor, or derive production art from `preDocs/`; do not ship temporary material from `tmp/`.
- Preserve text/symbol/value affordances: ingredient identity cannot rely on color alone.
- Update relevant docs for material rules/state/UI changes, but not trivial CSS-only adjustments.

## Git hygiene

Make focused changes, inspect `git diff` before handoff, and leave unrelated working-tree changes intact. Do not revert approved UI work merely to simplify a task.

No nested `AGENTS.md` files are needed today: engine, AI, UI, and assets are tightly connected in the current flat `src/` structure. Reconsider local instructions only after a real directory boundary with distinct, durable rules is introduced.

When starting from a dirty worktree, identify existing changes before editing. Keep generated screenshots scoped to the visual-QA task that produced them and call out any intentional fixture updates at handoff.

Do not introduce a repository workflow requirement unless existing project configuration establishes it. Prefer small, reviewable commits when the user asks you to commit.
