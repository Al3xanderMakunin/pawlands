import { expect, test } from "@playwright/test";

test.describe("Language Selection", () => {
  test("switches UI between English and Russian and persists selection", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Choose your feline")).toBeVisible();

    await expect(page.getByRole("button", { name: "RU", exact: true })).toHaveCount(0);
    await page.getByRole("dialog", { name: "Choose your feline" })
      .getByRole("button", { name: "Account Settings" }).click();

    const settings = page.getByRole("dialog", { name: /Account Settings|Настройки аккаунта/ });
    const ruButton = settings.getByRole("button", { name: "RU", exact: true });
    await ruButton.click();

    await expect(ruButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Выберите своего кота")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Выбор мира" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Войти: Деревня Дубовой Лапы" })
    ).toBeVisible();

    await settings.getByRole("button", { name: "Закрыть" }).click();

    // Enter world and verify HUD is localized in Russian
    await page.getByRole("button", { name: "Войти: Деревня Дубовой Лапы" }).click();

    const header = page.locator("header");
    await expect(header).toContainText("Деревня Дубовой Лапы");
    await expect(header).toContainText("Безопасная зона");
    await expect(header).toContainText("Офлайн-режим");
    await expect(header).toContainText("Кошка • сыт");
    await expect(header).toContainText("Груз: 2.5/20 кг (легко)");
    await expect(header.getByRole("button", { name: "RU", exact: true })).toHaveCount(0);
    await header.getByRole("button", { name: "Настройки аккаунта" }).click();
    await expect(ruButton).toHaveAttribute("aria-pressed", "true");
    await expect(header.getByRole("button", { name: "Сменить кота" })).toBeVisible();

    // Reload and verify Russian persists via localStorage
    await page.reload();
    await expect(page.getByText("Выберите своего кота")).toBeVisible();

    // Switch back to English
    await page.getByRole("dialog", { name: "Выберите своего кота" })
      .getByRole("button", { name: "Настройки аккаунта" }).click();
    await settings.getByRole("button", { name: "EN", exact: true }).click();
    await settings.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Choose your feline")).toBeVisible();
  });
});
