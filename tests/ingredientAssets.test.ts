import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getIngredientAsset, INGREDIENT_ASSET_MANIFEST, INGREDIENT_TOKEN_SET } from "../src/ingredientAssets.js";

const expectedTokens = [
  "black:1", "blue:1", "blue:2", "blue:4", "green:1", "green:2", "green:4", "orange:1",
  "purple:1", "red:1", "red:2", "red:4", "white:1", "white:2", "white:3", "yellow:1", "yellow:2", "yellow:4",
];

describe("ingredient asset manifest", () => {
  it("covers every legal base-game ingredient value", () => {
    expect(INGREDIENT_TOKEN_SET.map(token => `${token.color}:${token.value}`).sort()).toEqual(expectedTokens);
  });

  it("references an existing, viewBox-based SVG for every entry", () => {
    for (const { color, value } of INGREDIENT_TOKEN_SET) {
      const entry = getIngredientAsset({ color, value });
      expect(entry, `${color}:${value}`).toBeDefined();
      const absolute = resolve("public", entry!.asset.replace(/^\//, ""));
      expect(existsSync(absolute), absolute).toBe(true);
      const source = readFileSync(absolute, "utf8");
      expect(source, absolute).toMatch(/^<svg\b/);
      expect(source, absolute).toMatch(/viewBox="0 0 160 160"/);
    }
  });

  it("keeps ingredient asset paths out of rendering call sites", () => {
    const renderSources = readdirSync("src").filter(file => /\.(ts|tsx)$/.test(file) && file !== "ingredientAssets.ts");
    for (const file of renderSources) {
      const source = readFileSync(resolve("src", file), "utf8");
      expect(source, file).not.toContain("/assets/ui-pack1-svg/ingredients");
      expect(source, file).not.toContain("ingredientAsset(");
    }
    expect(Object.keys(INGREDIENT_ASSET_MANIFEST)).toHaveLength(8);
  });
});
