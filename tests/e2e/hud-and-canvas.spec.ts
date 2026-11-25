import { expect, test } from "@playwright/test";

test.describe("Pawlands HUD & Phaser Canvas", () => {
  test("loads without uncaught errors and renders Phaser canvas", async ({ page }) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");

    await expect(page).toHaveTitle("Pawlands — 2D Pixel Survival RPG");

    const header = page.locator("header");
    await expect(header.getByRole("heading", { name: "Pawlands" })).toBeVisible();
    await expect(header.getByText("Oakpaw Village", { exact: true })).toBeVisible();
    await expect(header.getByText("Safe Zone")).toBeVisible();
    await expect(header.getByText("Offline Preview")).toBeVisible();

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("cycles touch controls mode from HUD quick action", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter Oakpaw Village" }).click();

    const touchBtn = page.getByRole("button", { name: /Touch:/i });
    await expect(touchBtn).toHaveText("Touch: AUTO");

    await touchBtn.click();
    await expect(touchBtn).toHaveText("Touch: ON");

    await touchBtn.click();
    await expect(touchBtn).toHaveText("Touch: OFF");

    await touchBtn.click();
    await expect(touchBtn).toHaveText("Touch: AUTO");
  });

  test("keeps HUD and canvas within viewport on mobile screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Pawlands" })).toBeVisible();
    await expect(page.getByText("Choose your feline")).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
