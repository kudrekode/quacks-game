import type { IngredientColor, TokenValue } from "./types.js";

const INGREDIENT_ROOT = "/assets/ui-pack1-svg/ingredients";

export interface IngredientAssetEntry {
  asset: string;
  sourceTier: 1 | 2 | 3;
}

type IngredientAssetManifest = Record<IngredientColor, Partial<Record<TokenValue, IngredientAssetEntry>>>;

export const INGREDIENT_ASSET_MANIFEST: IngredientAssetManifest = {
  white: {
    1: { asset: `${INGREDIENT_ROOT}/cherry-bomb-1.svg`, sourceTier: 1 },
    2: { asset: `${INGREDIENT_ROOT}/cherry-bomb-2.svg`, sourceTier: 2 },
    3: { asset: `${INGREDIENT_ROOT}/cherry-bomb-3.svg`, sourceTier: 3 },
  },
  orange: {
    1: { asset: `${INGREDIENT_ROOT}/sunblossom-1.svg`, sourceTier: 1 },
  },
  green: {
    1: { asset: `${INGREDIENT_ROOT}/verdant-leaf-1.svg`, sourceTier: 1 },
    2: { asset: `${INGREDIENT_ROOT}/verdant-leaf-2.svg`, sourceTier: 2 },
    4: { asset: `${INGREDIENT_ROOT}/verdant-leaf-3.svg`, sourceTier: 3 },
  },
  blue: {
    1: { asset: `${INGREDIENT_ROOT}/aqua-droplet-1.svg`, sourceTier: 1 },
    2: { asset: `${INGREDIENT_ROOT}/aqua-droplet-2.svg`, sourceTier: 2 },
    4: { asset: `${INGREDIENT_ROOT}/aqua-droplet-3.svg`, sourceTier: 3 },
  },
  red: {
    1: { asset: `${INGREDIENT_ROOT}/firecap-1.svg`, sourceTier: 1 },
    2: { asset: `${INGREDIENT_ROOT}/firecap-2.svg`, sourceTier: 2 },
    4: { asset: `${INGREDIENT_ROOT}/firecap-3.svg`, sourceTier: 3 },
  },
  yellow: {
    1: { asset: `${INGREDIENT_ROOT}/sunblossom-1.svg`, sourceTier: 1 },
    2: { asset: `${INGREDIENT_ROOT}/sunblossom-2.svg`, sourceTier: 2 },
    4: { asset: `${INGREDIENT_ROOT}/sunblossom-3.svg`, sourceTier: 3 },
  },
  purple: {
    1: { asset: `${INGREDIENT_ROOT}/nightshade-1.svg`, sourceTier: 1 },
  },
  black: {
    1: { asset: `${INGREDIENT_ROOT}/nightshade-1.svg`, sourceTier: 1 },
  },
};

export const INGREDIENT_TOKEN_SET = (Object.entries(INGREDIENT_ASSET_MANIFEST) as Array<[IngredientColor, Partial<Record<TokenValue, IngredientAssetEntry>>]>).flatMap(([color, values]) =>
  (Object.keys(values) as unknown as TokenValue[]).map(value => ({ color, value: Number(value) as TokenValue })),
);

export function getIngredientAsset({ color, value }: { color: IngredientColor; value: TokenValue }): IngredientAssetEntry | undefined {
  return INGREDIENT_ASSET_MANIFEST[color]?.[value];
}
