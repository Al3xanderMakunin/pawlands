import { expect, test } from "@playwright/test";

test.describe("Archetype Selection", () => {
  test("displays all feline archetypes with default Cat stats", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Choose your feline")).toBeVisible();

    const header = page.locator("header");
    await expect(header).toContainText("100/100");
    await expect(header).toContainText("120/120");
    await expect(header).toContainText("100%");
    await expect(header).toContainText("Cat • well_fed");
    await expect(header).toContainText("Carry: 2.5/20 kg (light)");

    await expect(page.getByRole("button", { name: /Tomcat/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Cat\b/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Kitten/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter Oakpaw Village" })).toBeVisible();
  });

  test("updates survival HUD stats when switching archetypes and entering world", async ({
    page,
  }) => {
    await page.goto("/");

    const header = page.locator("header");
    const tomcatBtn = page.getByRole("button", { name: /Tomcat/i });
    const catBtn = page.getByRole("button", { name: /^Cat\b/i });
    const kittenBtn = page.getByRole("button", { name: /Kitten/i });

    await tomcatBtn.click();
    await expect(tomcatBtn).toHaveClass(/border-amber-400/);
    await expect(header).toContainText("120/120");
    await expect(header).toContainText("100/100");
    await expect(header).toContainText("Tomcat • well_fed");
    await expect(header).toContainText("Carry: 2.5/25 kg (light)");

    await kittenBtn.click();
    await expect(kittenBtn).toHaveClass(/border-amber-400/);
    await expect(header).toContainText("80/80");
    await expect(header).toContainText("140/140");
    await expect(header).toContainText("Kitten • well_fed");
    await expect(header).toContainText("Carry: 2.5/12 kg (light)");

    await catBtn.click();
    await expect(catBtn).toHaveClass(/border-amber-400/);
    await expect(header).toContainText("Cat • well_fed");
    await expect(header).toContainText("Carry: 2.5/20 kg (light)");

    await page.getByRole("button", { name: "Enter Oakpaw Village" }).click();
    await expect(page.getByText("Choose your feline")).toBeHidden();

    await page.getByRole("button", { name: "Change Cat" }).click();
    await expect(page.getByText("Choose your feline")).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply" })).toBeVisible();
  });
});
