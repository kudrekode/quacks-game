import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const screenshotDir = resolve("tests/visual/screenshots");
const states = ["home", "empty-pot", "brewing", "ingredients", "mid-track", "high-risk", "dense-pot", "ai-brewing", "ai-stopped", "purchasing", "fortune", "tooltip", "toast", "round9", "round-summary", "resolution-bonus", "resolution-rewards", "resolution-purchase", "resolution-purchase-selected", "resolution-ruby", "resolution-complete", "effect-crow-skull", "effect-mandrake", "effect-keep-return", "effect-multi-reveal", "effect-disabled", "effect-selected", "effect-confirmation", "effect-returned"] as const;
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
