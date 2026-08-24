import React, { useEffect, useState } from "react";
import { getIngredientAsset } from "./ingredientAssets.js";
import type { IngredientColor, TokenValue } from "./types.js";
import { INGREDIENT_META } from "./uiData.js";

export type IngredientTokenContext = "board" | "ai-board" | "market" | "modal" | "tooltip" | "bag" | "small" | "large";

interface IngredientTokenProps {
  color: IngredientColor;
  value: TokenValue;
  context: IngredientTokenContext;
  className?: string;
  decorative?: boolean;
}

function fallbackText(color: IngredientColor, value: TokenValue): string {
  return (import.meta as { env?: { DEV?: boolean } }).env?.DEV ? `[ ${color.toUpperCase()} ${value} ]` : `${color.slice(0, 1).toUpperCase()}${value}`;
}

export function IngredientToken({ color, value, context, className = "", decorative = false }: IngredientTokenProps) {
  const entry = getIngredientAsset({ color, value });
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(entry ? "loading" : "failed");
  const label = `${INGREDIENT_META[color].name}, value ${value}`;
  const classes = `ingredient-token ingredient-token--${context} ingredient-token--${color}${className ? ` ${className}` : ""}`;

  useEffect(() => setStatus(entry ? "loading" : "failed"), [entry?.asset]);

  if (context === "board" || context === "ai-board") {
    return <g className={`${classes} ingredient-token-svg`} data-ingredient-token="true" data-ingredient-color={color} data-ingredient-value={value} data-ingredient-context={context} data-asset-status={status} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label}>
      <circle r="21" className="human-token-backplate"/>
      {entry && status !== "failed"
        ? <image href={entry.asset} x="-27" y="-29" width="54" height="54" className="ingredient-token-art" onLoad={() => setStatus("loaded")} onError={() => setStatus("failed")}/>
        : <g className="ingredient-token-svg-fallback"><circle r="17"/><text y="-1">{color.slice(0, 1).toUpperCase()}</text><text y="11">{value}</text></g>}
      <circle cy="19" r="8" className="svg-chip-value-disc"/>
      <text y="22" className="svg-chip-value">{value}</text>
    </g>;
  }

  return <span className={classes} data-ingredient-token="true" data-ingredient-color={color} data-ingredient-value={value} data-ingredient-context={context} data-asset-status={status} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label}>
    {entry && status !== "failed"
      ? <img src={entry.asset} alt="" aria-hidden="true" onLoad={() => setStatus("loaded")} onError={() => setStatus("failed")}/>
      : <span className="ingredient-token-fallback" role="img" aria-label={label}>{fallbackText(color, value)}</span>}
    <b className="ingredient-token-value" aria-hidden="true">{value}</b>
  </span>;
}
