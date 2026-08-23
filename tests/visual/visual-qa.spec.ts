import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const screenshotDir = resolve("tests/visual/screenshots");
const states = ["home", "empty-pot", "brewing", "ingredients", "mid-track", "high-risk", "dense-pot", "ai-brewing", "purchasing", "fortune", "tooltip", "toast", "round9", "round-summary"] as const;

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
    expect(browserErrors).toEqual([]);
    await page.screenshot({ path: resolve(screenshotDir, `${state}.png`), fullPage: true });
  });
}
