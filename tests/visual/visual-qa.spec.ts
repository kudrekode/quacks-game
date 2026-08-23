import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const screenshotDir = resolve("tests/visual/screenshots");
const states = ["home", "empty-pot", "brewing", "ingredients", "mid-track", "high-risk", "dense-pot", "ai-brewing", "ai-stopped", "purchasing", "fortune", "tooltip", "toast", "round9", "round-summary"] as const;
const playerBrewingStates = new Set(["empty-pot", "brewing", "ingredients", "mid-track", "high-risk", "dense-pot", "ai-stopped", "round9"]);

test.beforeAll(async () => mkdir(screenshotDir, { recursive: true }));

for (const state of states) {
  test(`capture ${state}`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
    await page.goto(`/?debugState=${state}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#root > *")).toBeVisible();
    await page.waitForTimeout(350);
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
    expect(browserErrors).toEqual([]);
    await page.screenshot({ path: resolve(screenshotDir, `${state}.png`), fullPage: true });
  });
}

test("capture brewing at a narrow desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto("/?debugState=brewing", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Draw ingredient" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(screenshotDir, "brewing-narrow.png"), fullPage: true });
});
