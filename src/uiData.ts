import type { CardId, DecisionKind, IngredientColor } from "./types.js";

export const INGREDIENT_META: Record<IngredientColor, { name: string; symbol: string; note: string }> = {
  white: { name: "Cherry bomb", symbol: "✦", note: "Adds to explosion risk" },
  orange: { name: "Pumpkin", symbol: "●", note: "A steady one-space ingredient" },
  green: { name: "Garden spider", symbol: "⌁", note: "Rubies when among your last two" },
  blue: { name: "Crow skull", symbol: "◆", note: "Preview and choose from your bag" },
  red: { name: "Toadstool", symbol: "▲", note: "Moves farther beside pumpkins" },
  yellow: { name: "Mandrake", symbol: "✤", note: "May return the preceding white chip" },
  purple: { name: "Ghost's breath", symbol: "◒", note: "Tiered rewards at round end" },
  black: { name: "Night moth", symbol: "✣", note: "Competes with the rival pot" },
};

export const FORTUNE_COPY: Record<CardId, string> = {
  F01: "Choose a longer droplet stride or add a purple ingredient.",
  F02: "Both droplets move one space.",
  F03: "The brewer with the fewest rubies gains one.",
  F04: "The lightest five-chip sample earns a blue ingredient.",
  F05: "Choose a useful ingredient or three rubies.",
  F06: "Trade one ruby for a small ingredient.",
  F07: "Trade some rat tails for rubies before brewing.",
  F08: "Both brewers receive a bonus die result.",
  F09: "Preview four ingredients and upgrade one if possible.",
  F10: "The trailing brewer gains a green ingredient.",
  F11: "Pots explode only above nine white points this round.",
  F12: "Rat tails count double this round.",
  F13: "Choose four points or remove a small white ingredient.",
  F14: "Choose a strong ingredient or points from rat tails.",
  F15: "Exactly seven white points advances your droplet.",
  F16: "Ruby scoring spaces also award two points.",
  F17: "Ruby scoring spaces award a second ruby.",
  F18: "An opponent's explosion grants a medium ingredient.",
  F19: "The first white draw may be returned to the bag.",
  F20: "The round leader rolls the bonus die twice.",
  F21: "After five placements, you may restart the brew once.",
  F22: "After stopping, preview five and place up to one.",
  F23: "Pumpkins move one extra space this round.",
  F24: "All flasks refill at round end.",
};

export const DECISION_CONTEXT: Record<DecisionKind, string> = {
  FORTUNE_CHOICE: "The revealed fortune asks for your choice.",
  RAT_CHOICE: "Set your catch-up advantage before brewing.",
  BREW_ACTION: "Push your luck, bank this position, or undo the last eligible draw.",
  ROUND9_COMMIT: "Your choice stays secret until both brewers commit.",
  BLUE_SELECT: "A blue ingredient revealed a private selection.",
  YELLOW_REMOVE: "The yellow ingredient can clear the white chip immediately before it.",
  WHITE_REPRIEVE: "This is your first white draw under the current fortune.",
  RESTART: "Five ingredients are placed; you may restore your round-opening pot.",
  STRONG_SELECT: "Your final pinch may add one of these ingredients.",
  PURPLE_TIER: "Choose one reward tier allowed by your purple count.",
  EXPLOSION_CHOICE: "An exploded pot must forfeit either points or shopping.",
  PURCHASE: "Spend this round's coins on up to two different colors.",
  RUBY_ACTION: "Two rubies can advance your droplet or refill your flask.",
};

export const COLOR_ORDER: IngredientColor[] = ["orange", "green", "blue", "red", "yellow", "purple", "black"];

