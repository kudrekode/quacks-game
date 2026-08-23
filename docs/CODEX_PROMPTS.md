# Codex Development Prompts

## Supplied Prompt 1 - rules research and formal specification

Canonical source: `preDocs/prompt_1.md`.

Use the supplied `/preDocs` rulebook, Fortune translations, token sheets, main board, and individual board in that priority order. Do not build application code in this stage. Reconstruct the complete standard base-game rules; resolve or document every ambiguity; model setup, all nine rounds, boards, ingredients, Fortune cards, deterministic serializable state, strong non-cheating AI, UI, tests, assets, sources, decisions, and ordered implementation. The initial product is exactly one human versus one strong AI in a polished local browser app, with no expansion, accounts, backend, or online multiplayer. Supplied art is reference-only and must be replaced with original SVG/CSS/procedural visuals. Finish only when the `/docs` package lets an engineer implement a full game without reopening the rulebook.

The full supplied text is intentionally retained at its canonical path rather than silently edited. This document and the other files in `/docs` are its completed output.

## Prompt 2 status

No second Codex prompt was present in `preDocs` on 2026-08-23. The phrase “Copy these two Codex prompts” in Prompt 1 therefore cannot be completed literally without inventing missing source material. The following is a clearly labeled recommended handoff prompt, not claimed to be supplied text.

## Recommended Prompt 2 - implementation handoff

You are the lead game-engine and frontend engineer. Build the browser game specified by every file in `/docs`.

Treat `RULES_MODEL.md` as normative behavior, `ROUND_SEQUENCE.md` as the transition contract, `GAME_STATE.md` as the serialization/information-boundary contract, and `BOARD_MODEL.md`, `INGREDIENTS.md`, and `FORTUNE_CARDS.md` as content data. Apply every recorded decision in `DECISIONS.md`; do not create silent rule interpretations. Follow `IMPLEMENTATION_PLAN.md` in order: deterministic headless engine and exhaustive tests first, AI second, React UI last. The UI may dispatch only engine-provided legal actions. The AI receives only its redacted information-set observation and may never inspect future RNG or hidden opponent data.

Implement exactly two players (human versus one strong AI), nine rounds, base front-side board, ingredient set 1, all 24 Fortune cards, local save/replay, responsive accessible UI, and original production visuals. Do not implement expansions, online features, accounts, or a backend. Never import or ship assets from `/preDocs` or `/tmp`.

Before finishing, run all unit, property, integration, simulation, type, build, accessibility, and browser tests in `TEST_PLAN.md`; complete at least 1,000 release simulations; replay fixed seeds to matching state hashes; visually inspect desktop/mobile/reduced-motion states; and audit all phases/cards/effects against the docs. Report implemented scope, test evidence, any recorded new decision, and remaining risk.
