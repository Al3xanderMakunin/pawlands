import { expect, test } from "@playwright/test";

test.describe("World Selection", () => {
  test("allows selecting a starting map before entering the game", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "World Selection" })).toBeVisible();

    const header = page.locator("header");
    await expect(header.getByText("Oakpaw Village", { exact: true })).toBeVisible();

    const worldSection = page.locator("section");
    const woodsBtn = worldSection.getByRole("button", { name: /Whispering Woods/i });
    await woodsBtn.click();
    await expect(woodsBtn).toHaveAttribute("aria-pressed", "true");
    await expect(header.getByText("Whispering Woods", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter Whispering Woods" })).toBeVisible();

    const ridgeBtn = worldSection.getByRole("button", { name: /Clawpeak Ridge/i });
    await ridgeBtn.click();
    await expect(ridgeBtn).toHaveAttribute("aria-pressed", "true");
    await expect(header.getByText("Clawpeak Ridge", { exact: true })).toBeVisible();
    await expect(header.getByText("PvP", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Enter Clawpeak Ridge" }).click();
    await expect(page.getByRole("heading", { name: "World Selection" })).toBeHidden();
    await expect(header.getByText("Clawpeak Ridge", { exact: true })).toBeVisible();
  });

  test("displays Russian title 'Выбор мира' when Russian language is active", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "RU", exact: true }).last().click();
    await expect(page.getByRole("heading", { name: "Выбор мира" })).toBeVisible();

    const worldSection = page.locator("section");
    const cryptBtn = worldSection.getByRole("button", { name: /Затонувший Склеп/i });
    await cryptBtn.click();
    await expect(cryptBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Войти: Затонувший Склеп" })).toBeVisible();
  });
});
