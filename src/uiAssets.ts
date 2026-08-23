import type { IngredientColor, TokenValue } from "./types.js";

const PACK_1 = "/assets/ui-pack1-svg";
const BOARD = "/assets/main-game-board-svg";

export const CORE_ASSET = {
  vp: `${PACK_1}/core/victory-point.svg`,
  coin: `${PACK_1}/core/buying-power.svg`,
  ruby: `${PACK_1}/core/ruby.svg`,
  rat: `${PACK_1}/core/rat-tail.svg`,
  flask: `${PACK_1}/core/flask.svg`,
  bag: `${PACK_1}/core/bag.svg`,
  explosion: `${PACK_1}/core/skull.svg`,
  droplet: `${PACK_1}/core/droplet.svg`,
  round: `${PACK_1}/core/round-marker.svg`,
  fortune: `${PACK_1}/core/fortune-card.svg`,
  ai: `${BOARD}/score/ai-score-marker.svg`,
  stop: `${BOARD}/actions/stop-brewing.svg`,
} as const;

export const BOARD_ASSET = {
  brand: `${BOARD}/branding/potion-brew-mark.svg`,
  cauldron: `${BOARD}/board/cauldron-track.svg`,
  riskGauge: `${BOARD}/board/white-risk-gauge-frame.svg`,
  positionPlaque: `${BOARD}/board/current-position-plaque.svg`,
  humanMarker: `${BOARD}/score/human-score-marker.svg`,
  aiMarker: `${BOARD}/score/ai-score-marker.svg`,
  finishMarker: `${BOARD}/track/finish-crossed-spoons.svg`,
  cart: `${BOARD}/market/shopping-cart.svg`,
} as const;

const INGREDIENT_ART: Record<IngredientColor, string> = {
  white: "cherry-bomb",
  orange: "sunblossom",
  green: "verdant-leaf",
  blue: "aqua-droplet",
  red: "firecap",
  yellow: "sunblossom",
  purple: "nightshade",
  black: "nightshade",
};

export function ingredientAsset(color: IngredientColor, value: TokenValue): string {
  const artTier = value === 4 ? 3 : value;
  return `${PACK_1}/ingredients/${INGREDIENT_ART[color]}-${artTier}.svg`;
}
