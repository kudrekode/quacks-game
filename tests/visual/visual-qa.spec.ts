import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const screenshotDir = resolve("tests/visual/screenshots");
const states = ["home", "empty-pot", "brewing", "ingredients", "mid-track", "high-risk", "dense-pot", "ai-brewing", "ai-stopped", "purchasing", "fortune", "fortune-back", "fortune-mid-flip", "fortune-revealed", "fortune-reminder", "tooltip", "toast", "round9", "round-summary", "resolution-bonus", "resolution-rewards", "resolution-purchase", "resolution-purchase-selected", "resolution-ruby", "resolution-complete", "effect-crow-skull", "effect-mandrake", "effect-keep-return", "effect-multi-reveal", "effect-disabled", "effect-selected", "effect-confirmation", "effect-returned", "asset-orange-human", "asset-orange-ai", "asset-blue-modal", "asset-green-modal", "asset-purple-tooltip", "asset-gallery"] as const;
const playerBrewingStates = new Set(["empty-pot", "brewing", "ingredients", "mid-track", "high-risk", "dense-pot", "ai-stopped", "round9"]);

test.beforeAll(async () => mkdir(screenshotDir, { recursive: true }));

for (const state of states) {
  test(`capture ${state}`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
    await page.goto(`/?debugState=${state}`, { waitUntil: "domcontentloaded" });
    expect(browserErrors).toEqual([]);
    await expect(page.locator("#root > *")).toBeVisible();
    await page.waitForTimeout(350);
    if (state === "resolution-bonus") await page.waitForTimeout(650);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (playerBrewingStates.has(state)) {
      const draw = page.getByRole("button", { name: "Draw ingredient" });
      const stop = page.getByRole("button", { name: "Stop brewing" });
      await expect(draw).toBeVisible();
      await expect(stop).toBeVisible();
      const viewportHeight = page.viewportSize()?.height ?? 0;
      const controlsFit = await Promise.all([draw, stop].map(async (control) => {
        const box = await control.boundingBox();
        return box !== null && box.y + box.height <= viewportHeight;
      }));
      expect(controlsFit).toEqual([true, true]);
    }
    if (state === "ai-brewing") await expect(page.getByRole("heading", { name: "AI is brewing..." })).toBeVisible();
    if (state === "ai-stopped") await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
    if (state.startsWith("fortune-") && state !== "fortune-reminder") {
      const reveal = page.getByRole("dialog", { name: "Fortune-Telling Card" });
      await expect(reveal).toBeVisible();
      await expect(page.getByRole("button", { name: "Draw ingredient" })).toHaveCount(0);
      if (state === "fortune-revealed") {
        await expect(page.getByRole("button", { name: "Continue to brewing" })).toBeVisible();
        await expect(reveal.locator(".fortune-card-front")).toHaveCSS("opacity", "1");
        await expect(reveal.locator(".fortune-card-back")).toHaveCSS("opacity", "0");
      }
      else await expect(page.getByRole("button", { name: "Continue to brewing" })).toHaveCount(0);
    }
    if (state === "fortune-reminder") {
      await expect(page.locator(".fortune-summary")).toContainText("First White Reprieve");
      await expect(page.getByRole("button", { name: "Draw ingredient" })).toBeVisible();
    }
    if (state.startsWith("resolution-") || state === "purchasing" || state === "round-summary") {
      await expect(page.getByRole("dialog", { name: /Round 5 resolution/i })).toBeVisible();
      const shell = await page.locator(".resolution-shell").boundingBox();
      const viewport = page.viewportSize();
      expect(shell !== null && viewport !== null && shell.y >= 0 && shell.y + shell.height <= viewport.height).toBe(true);
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
    }
    if (state === "resolution-purchase-selected") await expect(page.getByText("Garden spider 2")).toBeVisible();
    if (state.startsWith("effect-") && state !== "effect-returned") {
      const dialog = page.locator(".effect-choice-modal");
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      const viewport = page.viewportSize();
      expect(box !== null && viewport !== null && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height).toBe(true);
    }
    if (state === "effect-returned") await expect(page.getByText("Cherry bomb 1 is back in your live bag.")).toBeVisible();
    if (state === "asset-orange-human") await expect(page.locator('.human-board [data-ingredient-token][data-ingredient-color="orange"][data-ingredient-context="board"]')).toHaveAttribute("data-asset-status", "loaded");
    if (state === "asset-orange-ai") await expect(page.locator('.ai-board [data-ingredient-token][data-ingredient-color="orange"][data-ingredient-context="ai-board"]')).toHaveAttribute("data-asset-status", "loaded");
    if (state === "asset-blue-modal") await expect(page.locator('.effect-choice-modal [data-ingredient-token][data-ingredient-color="blue"]')).toHaveCount(3);
    if (state === "asset-green-modal") await expect(page.locator('.effect-choice-modal [data-ingredient-token][data-ingredient-color="green"]')).toHaveCount(3);
    if (state === "asset-purple-tooltip") await expect(page.locator('.inspect-popover [data-ingredient-token][data-ingredient-color="purple"]')).toHaveAttribute("data-asset-status", "loaded");
    if (state === "asset-gallery") {
      await expect(page.locator("[data-ingredient-token]" )).toHaveCount(108);
      await expect(page.locator('[data-ingredient-token][data-asset-status="failed"]')).toHaveCount(0);
    }
    expect(browserErrors).toEqual([]);
    const resolutionCapture = state.startsWith("resolution-") || state === "purchasing" || state === "round-summary";
    await page.screenshot({ path: resolve(screenshotDir, `${state}.png`), fullPage: !resolutionCapture });
  });
}

test("capture brewing at a narrow desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto("/?debugState=brewing", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Draw ingredient" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(screenshotDir, "brewing-narrow.png"), fullPage: true });
});

for (const viewport of [{ width: 1600, height: 1000 }, { width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`compact brewing fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
    await page.setViewportSize(viewport);
    await page.goto("/?debugState=brewing", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(350);

    const draw = page.getByRole("button", { name: "Draw ingredient" });
    const stop = page.getByRole("button", { name: "Stop brewing" });
    await expect(draw).toBeVisible();
    await expect(stop).toBeVisible();
    expect(await draw.count()).toBe(1);
    expect(await stop.count()).toBe(1);
    const humanBoard = page.locator(".human-board .human-pot-board");
    await expect(humanBoard).toBeVisible();
    await expect(page.locator(".ai-board")).toBeVisible();
    await expect(page.locator(".brewing-reference-bar")).toBeVisible();
    expect(await page.locator(".market-panel").count()).toBe(0);
    expect(await page.getByRole("button", { name: "Confirm purchase" }).count()).toBe(0);

    const pageMetrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    }));
    expect(pageMetrics.scrollWidth, JSON.stringify(pageMetrics)).toBeLessThanOrEqual(pageMetrics.viewportWidth);
    expect(pageMetrics.scrollHeight, JSON.stringify(pageMetrics)).toBeLessThanOrEqual(pageMetrics.viewportHeight);
    for (const locator of [draw, stop, humanBoard, page.locator(".ai-board"), page.locator(".brewing-reference-bar")]) {
      const box = await locator.boundingBox();
      expect(box !== null && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height).toBe(true);
    }

    const bookButton = page.locator(".ingredient-book-reference button").first();
    await bookButton.click();
    await expect(page.getByRole("dialog", { name: /ingredient book/i })).toBeVisible();
    await expect(page.getByText("Purchasing is available during end-of-round resolution.")).toBeVisible();
    await page.getByRole("button", { name: /Close .* ingredient book/i }).click();
    expect(browserErrors).toEqual([]);
    await page.screenshot({ path: resolve(screenshotDir, `brewing-${viewport.width}x${viewport.height}.png`), fullPage: false });
  });
}

test("compact references open without moving the game board", async ({ page }) => {
  await page.goto("/?debugState=brewing", { waitUntil: "domcontentloaded" });
  const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);

  await page.locator(".reference-bag").click();
  await expect(page.getByRole("dialog", { name: "Bag composition" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(initialHeight);
  await page.screenshot({ path: resolve(screenshotDir, "reference-bag.png"), fullPage: false });
  await page.getByRole("button", { name: "Close Bag composition" }).click();

  await page.locator(".ingredient-book-reference button").first().click();
  await expect(page.getByRole("dialog", { name: /ingredient book/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(initialHeight);
  await page.screenshot({ path: resolve(screenshotDir, "reference-ingredient-book.png"), fullPage: false });
  await page.getByRole("button", { name: /Close .* ingredient book/i }).click();

  await page.getByRole("button", { name: "Full log" }).click();
  await expect(page.getByRole("dialog", { name: "Full brew log" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(initialHeight);
  await page.screenshot({ path: resolve(screenshotDir, "reference-full-log.png"), fullPage: false });
});

test("effect choice supports keyboard selection, undo, confirmation, and engine-owned return", async ({ page }) => {
  await page.goto("/?debugState=effect-crow-skull", { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog", { name: "Crow Skull" });
  await expect(dialog).toBeVisible();
  const choices = dialog.getByRole("radio");
  const confirm = dialog.locator(".effect-choice-actions .button-primary");
  await expect(confirm).toBeDisabled();

  await choices.first().focus();
  await page.keyboard.press("Shift+Tab");
  await expect(choices.last()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const selected = choices.nth(1);
  await expect(selected).toHaveAttribute("aria-checked", "true");
  await expect(confirm).toBeEnabled();
  await selected.press("Space");
  await expect(selected).toHaveAttribute("aria-checked", "false");
  await expect(confirm).toBeDisabled();

  await selected.press("Space");
  await confirm.click();
  await expect(confirm).toHaveText("Resolving effect...");
  await expect(dialog).toBeHidden();
  await expect(page.getByText("2 revealed ingredients are back in your live bag.")).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(screenshotDir, "effect-return-animation-end.png"), fullPage: false });
});

test("illegal effect option is visible, explained, and disabled", async ({ page }) => {
  await page.goto("/?debugState=effect-disabled", { waitUntil: "domcontentloaded" });
  const unavailable = page.getByRole("radio", { name: /Unavailable ingredient/ });
  await expect(unavailable).toBeDisabled();
  await expect(unavailable).toContainText("engine token could not be resolved");
});

test("multi-token effect modal fits a 1280x800 desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?debugState=effect-multi-reveal", { waitUntil: "domcontentloaded" });
  const modal = page.locator(".effect-choice-modal");
  await expect(modal).toBeVisible();
  const box = await modal.boundingBox();
  expect(box !== null && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1280 && box.y + box.height <= 800).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  await page.screenshot({ path: resolve(screenshotDir, "effect-multi-reveal-1280x800.png"), fullPage: false });
});

test("resolution presentation advances from bonus to purchasing", async ({ page }) => {
  await page.goto("/?debugState=resolution-bonus", { waitUntil: "domcontentloaded" });
  const rewardsButton = page.getByRole("button", { name: "Continue to rewards" });
  await expect(rewardsButton).toBeEnabled({ timeout: 2_000 });
  await rewardsButton.click();
  await expect(page.getByRole("heading", { name: "Round rewards" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to purchasing" }).click();
  await expect(page.getByRole("heading", { name: "Purchase ingredients" })).toBeVisible();
});

test("purchase selection and RNG state survive a resolution refresh", async ({ page }) => {
  await page.goto("/?debugState=resolution-purchase", { waitUntil: "domcontentloaded" });
  const greenTwo = page.locator(".resolution-ingredient").filter({ hasText: "Garden spider" }).filter({ hasText: "Value 2" });
  await greenTwo.click();
  await expect(page.getByText("Garden spider 2")).toBeVisible();
  const rngBefore = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("cauldron-and-chance/save-v1") ?? "null");
    return JSON.parse(save.state).rng;
  });
  await page.evaluate(() => history.replaceState(null, "", "/"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue game" }).click();
  await expect(page.getByText("Garden spider 2")).toBeVisible();
  const rngAfter = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("cauldron-and-chance/save-v1") ?? "null");
    return JSON.parse(save.state).rng;
  });
  expect(rngAfter).toEqual(rngBefore);
});

for (const round of [1, 2, 5, 8, 9]) {
  test(`Fortune reveal fixture is available in round ${round}`, async ({ page }) => {
    await page.goto(`/?debugState=fortune-revealed&debugRound=${round}`, { waitUntil: "domcontentloaded" });
    const dialog = page.getByRole("dialog", { name: "Fortune-Telling Card" });
    await expect(dialog).toContainText(`Round ${round} begins`);
    await expect(dialog.getByRole("button", { name: "Continue to brewing" })).toBeVisible();
  });
}

test("a real completed round enters the next Fortune reveal before brewing", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("cauldron-and-chance/settings-v2", JSON.stringify({ fastAI: true, reducedMotion: false }));
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Game seed").fill("fortune-flow-797");
  await page.getByRole("button", { name: "New game" }).click();

  const roundOneReveal = page.getByRole("dialog", { name: "Fortune-Telling Card" });
  await expect(roundOneReveal).toBeVisible();
  await expect(roundOneReveal).toHaveAttribute("data-stage", "drawing");
  await expect(page.getByRole("button", { name: "Draw ingredient" })).toHaveCount(0);
  const continueButton = page.getByRole("button", { name: "Continue to brewing" });
  await expect(continueButton).toBeVisible({ timeout: 2_500 });
  await expect(roundOneReveal).toContainText("Roomier Cauldrons");
  await continueButton.click();

  await expect(page.getByRole("button", { name: "Draw ingredient" })).toBeVisible();
  await expect(page.locator(".fortune-summary")).toContainText("Roomier Cauldrons");
  await page.screenshot({ path: resolve(screenshotDir, "fortune-brewing-reminder-live.png"), fullPage: false });
  await page.getByRole("button", { name: "Stop brewing" }).click();

  const roundResolution = page.getByRole("dialog", { name: /Round 1 resolution/i });
  await expect(roundResolution).toBeVisible({ timeout: 20_000 });
  const actions = [
    "Continue to rewards",
    "Continue to purchasing",
    "Continue to ruby actions",
    "Finish without buying",
    "Finish ruby actions",
  ];
  for (let guard = 0; guard < 100; guard += 1) {
    const beginNext = page.getByRole("button", { name: "Begin round 2" });
    if (await beginNext.isVisible()) break;
    let acted = false;
    for (const name of actions) {
      const button = page.getByRole("button", { name, exact: true });
      if (await button.isVisible() && await button.isEnabled()) {
        await button.click();
        acted = true;
        break;
      }
    }
    if (!acted) await page.waitForTimeout(200);
  }

  const beginRoundTwo = page.getByRole("button", { name: "Begin round 2" });
  await expect(beginRoundTwo).toBeVisible({ timeout: 20_000 });
  await beginRoundTwo.click();
  const roundTwoReveal = page.getByRole("dialog", { name: "Fortune-Telling Card" });
  await expect(roundTwoReveal).toBeVisible();
  await expect(roundTwoReveal).toContainText("Round 2 begins");
  await expect(roundTwoReveal).toHaveAttribute("data-stage", "drawing");
  await expect(page.getByRole("button", { name: "Draw ingredient" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue to brewing" })).toBeVisible({ timeout: 2_500 });
  await expect(roundTwoReveal).toContainText("Pumpkin Festival");
});

test("reduced motion still blocks on a dedicated Fortune reveal", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("cauldron-and-chance/settings-v2", JSON.stringify({ reducedMotion: true }));
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Game seed").fill("fortune-reduced-motion");
  await page.getByRole("button", { name: "New game" }).click();
  const reveal = page.getByRole("dialog", { name: "Fortune-Telling Card" });
  await expect(reveal).toBeVisible();
  await expect(page.getByRole("button", { name: "Draw ingredient" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue to brewing" })).toBeVisible({ timeout: 750 });
});

test("every gallery ingredient loads and has non-zero dimensions", async ({ page }) => {
  await page.goto("/?debugState=asset-gallery", { waitUntil: "domcontentloaded" });
  const tokens = page.locator("[data-ingredient-token]");
  await expect(tokens).toHaveCount(108);
  await expect(page.locator('[data-ingredient-token][data-asset-status="loaded"]')).toHaveCount(108);
  const metrics = await tokens.evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    const image = element.querySelector("img");
    const svgImage = element.querySelector("image");
    return {
      width: box.width,
      height: box.height,
      imageLoaded: image instanceof HTMLImageElement ? image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 : true,
      svgImageVisible: svgImage instanceof SVGGraphicsElement ? svgImage.getBBox().width > 0 && svgImage.getBBox().height > 0 : true,
    };
  }));
  expect(metrics.every(metric => metric.width > 0 && metric.height > 0 && metric.imageLoaded && metric.svgImageVisible)).toBe(true);
});

test("ingredient load failure shows a readable development fallback", async ({ page }) => {
  await page.route("**/aqua-droplet-2.svg", route => route.abort());
  await page.goto("/?debugState=asset-gallery", { waitUntil: "domcontentloaded" });
  const blueTwo = page.locator('[data-gallery-token="blue:2"]');
  await expect(blueTwo.locator('[data-asset-status="failed"]')).toHaveCount(6);
  await expect(blueTwo.getByText("[ BLUE 2 ]").first()).toBeVisible();
});

test("modal ingredient remains visible through focus, hover, and selection", async ({ page }) => {
  await page.goto("/?debugState=asset-blue-modal", { waitUntil: "domcontentloaded" });
  const option = page.getByRole("radio").nth(1);
  const token = option.locator('[data-ingredient-token][data-ingredient-color="blue"]');
  await expect(token).toHaveAttribute("data-asset-status", "loaded");
  const before = await token.boundingBox();
  await option.hover();
  await option.focus();
  await option.click();
  await expect(option).toHaveAttribute("aria-checked", "true");
  await expect(token).toBeVisible();
  await expect(token).toHaveAttribute("data-asset-status", "loaded");
  const after = await token.boundingBox();
  expect(before && after && before.width > 0 && before.height > 0 && after.width > 0 && after.height > 0).toBe(true);
});
