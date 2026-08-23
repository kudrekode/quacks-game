import { FORTUNE_CARDS } from "./content.js";
import type { DecisionKind, GameState, IngredientColor, PendingDecision, Token } from "./types.js";
import { DECISION_CONTEXT, FORTUNE_COPY, INGREDIENT_META } from "./uiData.js";

export type EffectChoiceType = "TOKEN_CHOICE" | "KEEP_OR_RETURN" | "RETURN_TO_BAG" | "REWARD_CHOICE" | "CARD_CHOICE" | "CONFIRM_EFFECT";

export interface EffectChoiceOption {
  id: string;
  label: string;
  description: string;
  token?: Token;
  disabledReason?: string;
  returnsToBag?: boolean;
  movesToBoard?: boolean;
}

export interface EffectChoiceModel {
  type: EffectChoiceType;
  source: string;
  title: string;
  description: string;
  afterChoosing: string;
  choices: EffectChoiceOption[];
  confirmLabel: string;
  allowCancel: boolean;
  initialChoice?: string;
  debugConfirming: boolean;
}

export const FOCUSED_EFFECT_KINDS = new Set<DecisionKind>([
  "FORTUNE_CHOICE", "RAT_CHOICE", "BLUE_SELECT", "YELLOW_REMOVE", "WHITE_REPRIEVE",
  "RESTART", "STRONG_SELECT", "PURPLE_TIER", "EXPLOSION_CHOICE",
]);

export function isFocusedEffectDecision(pending?: PendingDecision): boolean {
  return Boolean(pending?.actor === "human" && FOCUSED_EFFECT_KINDS.has(pending.kind));
}

function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function tokenForOption(game: GameState, pending: PendingDecision, option: string): Token | undefined {
  if (option.startsWith("token:")) return game.tokens[option.slice(6)];
  if (option.startsWith("upgrade:")) return game.tokens[option.split(":")[1] ?? ""];
  if (pending.kind === "YELLOW_REMOVE") return game.tokens[String(pending.data.previousId ?? "")];
  if (pending.kind === "WHITE_REPRIEVE") return game.tokens[String(pending.data.tokenId ?? "")];
  return undefined;
}

function colorToken(option: string): { color: IngredientColor; value: Token["value"] } | undefined {
  const [color, valueText] = option.split(":");
  if (!(color && color in INGREDIENT_META)) return undefined;
  const value = Number(valueText);
  if (![1, 2, 3, 4].includes(value)) return undefined;
  return { color: color as IngredientColor, value: value as Token["value"] };
}

function optionCopy(game: GameState, pending: PendingDecision, option: string): EffectChoiceOption {
  const player = game.players[pending.actor];
  const effect = String(pending.data.effect ?? "");
  const token = tokenForOption(game, pending, option);
  const named = token ? `${INGREDIENT_META[token.color].name} ${token.value}` : undefined;
  if ((option.startsWith("token:") || option.startsWith("upgrade:")) && !token) return { id: option, label: "Unavailable ingredient", description: "This ingredient is no longer a legal revealed option.", disabledReason: "The engine token could not be resolved." };

  if (pending.kind === "BLUE_SELECT" || pending.kind === "STRONG_SELECT") {
    if (option === "none") return { id: option, label: "Return every ingredient", description: "Place nothing. Every revealed ingredient returns to your bag.", returnsToBag: true };
    return { id: option, label: named ?? "Revealed ingredient", description: "Place this ingredient next and resolve it normally. Every unselected ingredient returns to your bag.", token, movesToBoard: true };
  }
  if (pending.kind === "YELLOW_REMOVE" && token) {
    const nextWhite = Math.max(0, player.whiteTotal - token.value);
    if (option === "remove") return { id: option, label: `Return ${named}`, description: `Return it to your bag. White risk falls to ${nextWhite} / ${player.explosionThreshold}; the Mandrake stays in place.`, token, returnsToBag: true };
    return { id: option, label: `Keep ${named}`, description: `Leave it in the pot. White risk remains ${player.whiteTotal} / ${player.explosionThreshold}.`, token };
  }
  if (pending.kind === "WHITE_REPRIEVE" && token) {
    const placedWhite = player.whiteTotal + token.value;
    if (option === "return") return { id: option, label: "Return to bag", description: `Return ${named} without placing it. White risk remains ${player.whiteTotal} / ${player.explosionThreshold}.`, token, returnsToBag: true };
    return { id: option, label: "Keep ingredient", description: `Place ${named}. White risk becomes ${placedWhite} / ${player.explosionThreshold}${placedWhite > player.explosionThreshold ? ", causing an explosion" : ""}.`, token, movesToBoard: true };
  }
  if (pending.kind === "PURPLE_TIER") {
    const tier = Number(option.split(":")[1]);
    const copy = tier === 1 ? "+1 victory point" : tier === 2 ? "+1 victory point and +1 ruby" : "+2 victory points and advance your droplet 1 space";
    return { id: option, label: tier === 3 ? "3+ Purple" : `${tier} Purple`, description: copy };
  }
  if (pending.kind === "EXPLOSION_CHOICE") {
    if (option === "score") return { id: option, label: `Take ${player.roundBaseVP} victory points`, description: `Receive the final ${player.roundBaseVP} VP from your scoring space and forfeit ${player.roundCoins} buying power.` };
    return { id: option, label: `Keep ${player.roundCoins} buying power`, description: `Keep the final ${player.roundCoins} buying power and receive no base victory points from this scoring space.` };
  }
  if (pending.kind === "RESTART") {
    if (option === "restart") return { id: option, label: "Restart this brew", description: "Restore your round-opening pot and return this attempt's draws according to the engine snapshot." };
    return { id: option, label: "Continue this brew", description: "Keep the current pot and continue from its present state." };
  }
  if (option === "decline") return { id: option, label: "Decline", description: effect === "F09" ? "Return every previewed ingredient and make no upgrade." : "Skip this optional effect." };
  if (option === "droplet") return { id: option, label: "Advance droplet", description: effect === "F01" ? "Move your droplet forward 2 spaces." : "Move your droplet by the amount granted by this effect." };
  if (option === "rubies:3") return { id: option, label: "Gain 3 rubies", description: "Add three rubies to your supply." };
  if (option === "vp:4") return { id: option, label: "Gain 4 victory points", description: "Add four victory points immediately." };
  if (option === "remove:white:1") return { id: option, label: "Remove one White 1", description: "Permanently return one White 1 from your bag to the shared supply." };
  if (option === "rat-vp") return { id: option, label: `Gain ${game.roundState.ratTails[pending.actor]} victory points`, description: "Gain victory points equal to your current effective rat tails." };
  if (option.startsWith("exchange:")) {
    const amount = Number(option.split(":")[1]);
    return { id: option, label: amount ? `Trade ${amount} rat tail${amount === 1 ? "" : "s"}` : "Keep every rat tail", description: amount ? `Lose ${amount} rat tail${amount === 1 ? "" : "s"} and gain ${amount} ${amount === 1 ? "ruby" : "rubies"}.` : "Keep the full catch-up movement for this round." };
  }
  if (option.startsWith("upgrade:") && token) {
    const value = Number(option.split(":")[2]);
    return { id: option, label: `Upgrade ${named} to value ${value}`, description: "Exchange this revealed ingredient for the next supplied denomination. Other previews return to your bag.", token };
  }
  const ingredient = colorToken(option);
  if (ingredient) return { id: option, label: `${INGREDIENT_META[ingredient.color].name} ${ingredient.value}`, description: `Gain this value-${ingredient.value} ingredient after confirmation.`, token: { id: "", ...ingredient } };
  return { id: option, label: titleCase(option.replaceAll(":", " ")), description: "Resolve this legal engine-provided outcome." };
}

export function buildEffectChoiceModel(game: GameState, pending: PendingDecision): EffectChoiceModel {
  const effect = String(pending.data.effect ?? "");
  const fortune = FORTUNE_CARDS.find(card => card.id === effect);
  const type: EffectChoiceType = pending.kind === "BLUE_SELECT" || pending.kind === "STRONG_SELECT" ? "TOKEN_CHOICE"
    : pending.kind === "WHITE_REPRIEVE" ? "KEEP_OR_RETURN"
    : pending.kind === "YELLOW_REMOVE" ? "RETURN_TO_BAG"
    : pending.kind === "FORTUNE_CHOICE" || pending.kind === "RAT_CHOICE" ? "CARD_CHOICE"
    : pending.kind === "RESTART" ? "CONFIRM_EFFECT" : "REWARD_CHOICE";
  const title = pending.kind === "BLUE_SELECT" ? "Crow Skull"
    : pending.kind === "YELLOW_REMOVE" ? "Mandrake"
    : pending.kind === "WHITE_REPRIEVE" ? "You revealed"
    : pending.kind === "STRONG_SELECT" ? "Choose one"
    : pending.kind === "PURPLE_TIER" ? "Ghost's Breath"
    : pending.kind === "EXPLOSION_CHOICE" ? "Your pot exploded"
    : pending.kind === "RESTART" ? "Brew Again"
    : fortune?.title ?? (pending.kind === "RAT_CHOICE" ? "Rat-tail choice" : titleCase(pending.kind));
  const description = pending.kind === "BLUE_SELECT" ? "Crow Skull privately revealed ingredients from your live bag. Choose up to one to place."
    : pending.kind === "YELLOW_REMOVE" ? "Mandrake may return the immediately preceding white ingredient to your bag."
    : pending.kind === "WHITE_REPRIEVE" ? "This Fortune effect lets you return your first white draw instead of placing it."
    : pending.kind === "STRONG_SELECT" ? "Final Pinch revealed these ingredients. Choose up to one to place in your pot."
    : pending.kind === "PURPLE_TIER" ? `You have ${Number(pending.data.count ?? 0)} purple ingredient${Number(pending.data.count ?? 0) === 1 ? "" : "s"}. Choose one legal reward tier.`
    : pending.kind === "EXPLOSION_CHOICE" ? "An exploded pot receives either its victory points or its buying power, never both."
    : fortune ? (FORTUNE_COPY[fortune.id] ?? DECISION_CONTEXT[pending.kind]) : DECISION_CONTEXT[pending.kind];
  const afterChoosing = pending.kind === "BLUE_SELECT" || pending.kind === "STRONG_SELECT" ? "The selected ingredient resolves normally; every unselected reveal returns to the bag."
    : pending.kind === "YELLOW_REMOVE" || pending.kind === "WHITE_REPRIEVE" ? "The engine updates the pot, white risk, and bag only after you confirm."
    : pending.kind === "EXPLOSION_CHOICE" ? "The selected reward determines the scoring and purchasing steps that follow."
    : "The engine applies the selected legal outcome after confirmation.";
  return {
    type, source: fortune ? "Fortune card" : pending.kind === "EXPLOSION_CHOICE" ? "Round resolution" : "Ingredient effect",
    title, description, afterChoosing, choices: pending.options.map(option => optionCopy(game, pending, option)),
    confirmLabel: pending.kind === "YELLOW_REMOVE" ? "Confirm Mandrake choice" : pending.kind === "WHITE_REPRIEVE" ? "Confirm keep or return" : "Confirm choice",
    allowCancel: false,
    initialChoice: typeof pending.data.presentationSelectedChoice === "string" ? pending.data.presentationSelectedChoice : undefined,
    debugConfirming: pending.data.presentationConfirming === true,
  };
}

export function returnedTokensForChoice(game: GameState, pending: PendingDecision, choice: string): Token[] {
  const player = game.players[pending.actor];
  let ids: string[] = [];
  if (pending.kind === "YELLOW_REMOVE" && choice === "remove") ids = [String(pending.data.previousId ?? "")];
  if (pending.kind === "WHITE_REPRIEVE" && choice === "return") ids = [String(pending.data.tokenId ?? "")];
  if (pending.kind === "BLUE_SELECT" || pending.kind === "STRONG_SELECT") {
    const selectedId = choice.startsWith("token:") ? choice.slice(6) : undefined;
    ids = player.preview.filter(id => id !== selectedId);
  }
  if ((pending.kind === "FORTUNE_CHOICE" || pending.kind === "RAT_CHOICE") && String(pending.data.effect ?? "") === "F09") {
    const selectedId = choice.startsWith("upgrade:") ? choice.split(":")[1] : undefined;
    ids = player.preview.filter(id => id !== selectedId);
  }
  return ids.map(id => game.tokens[id]).filter((token): token is Token => Boolean(token));
}
