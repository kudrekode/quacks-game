import React from "react";
import { IngredientToken, type IngredientTokenContext } from "./IngredientToken.js";
import { getIngredientAsset, INGREDIENT_TOKEN_SET } from "./ingredientAssets.js";
import { INGREDIENT_META } from "./uiData.js";

const CONTEXTS: Array<{ context: IngredientTokenContext; label: string }> = [
  { context: "board", label: "Board" },
  { context: "ai-board", label: "AI board" },
  { context: "market", label: "Market" },
  { context: "modal", label: "Modal" },
  { context: "tooltip", label: "Tooltip" },
  { context: "bag", label: "Bag" },
];

function GalleryToken({ color, value, context }: { color: (typeof INGREDIENT_TOKEN_SET)[number]["color"]; value: (typeof INGREDIENT_TOKEN_SET)[number]["value"]; context: IngredientTokenContext }) {
  if (context === "board" || context === "ai-board") {
    return <svg className="asset-gallery-svg" viewBox="-36 -36 72 72" aria-label={`${context} rendering`}><IngredientToken color={color} value={value} context={context}/></svg>;
  }
  return <IngredientToken color={color} value={value} context={context}/>;
}

export function IngredientAssetGallery() {
  return <main className="ingredient-asset-gallery">
    <header><span className="eyebrow">Development visual audit</span><h1>Ingredient asset gallery</h1><p>Every legal base-game token rendered through the same manifest and component in each functional context.</p></header>
    <div className="asset-gallery-head" aria-hidden="true"><span>Ingredient</span>{CONTEXTS.map(item => <span key={item.context}>{item.label}</span>)}</div>
    <section className="asset-gallery-grid" aria-label="Ingredient rendering matrix">
      {INGREDIENT_TOKEN_SET.map(({ color, value }) => <article className="asset-gallery-row" key={`${color}:${value}`} data-gallery-token={`${color}:${value}`}>
        <div className="asset-gallery-name"><b>{INGREDIENT_META[color].name} {value}</b><small>{color} / value {value}</small><code>{getIngredientAsset({ color, value })?.asset ?? "MISSING"}</code></div>
        {CONTEXTS.map(item => <div className={`asset-gallery-cell asset-gallery-${item.context}`} key={item.context} data-gallery-context={item.context}><GalleryToken color={color} value={value} context={item.context}/></div>)}
      </article>)}
    </section>
  </main>;
}
