import { expect, test } from "@playwright/test";

test.describe("Authentication & Registration", () => {
  test("registers a new account, persists session, and signs out", async ({ page }) => {
    const mockUser = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "whisker@pawlands.gg",
      username: "Whisker_01",
      createdAt: "2026-11-25T10:00:00.000Z",
    };

    await page.route("**/api/v1/auth/register", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ token: "mock-jwt-token", user: mockUser }),
      });
    });

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: mockUser }),
      });
    });

    await page.route("**/api/v1/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/");

    await page.getByRole("button", { name: "Sign in or Register" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Register" }).click();
    await dialog.getByLabel("Email").fill("whisker@pawlands.gg");
    await dialog.getByLabel("Username").fill("Whisker_01");
    await dialog.getByLabel("Password", { exact: true }).fill("password123");
    await dialog.getByLabel("Confirm Password").fill("password123");
    await dialog.getByRole("button", { name: "Create Account" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("@Whisker_01").first()).toBeVisible();

    // Reload and verify session restores from localStorage + /me
    await page.reload();
    await expect(page.getByText("@Whisker_01").last()).toBeVisible();

    // Sign out
    await page.getByRole("button", { name: "Sign Out" }).last().click();
    await expect(page.getByRole("button", { name: "Sign in or Register" })).toBeVisible();
  });

  test("shows Google sign-in button and restores session from OAuth callback fragment", async ({
    page,
  }) => {
    const mockGoogleUser = {
      id: "22222222-2222-4222-8222-222222222222",
      email: "mittens@example.com",
      username: "Mittens_Cat",
      createdAt: "2026-11-25T10:00:00.000Z",
    };

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: mockGoogleUser }),
      });
    });

    await page.goto("/#auth_token=mock-google-jwt");
    await expect(page.getByText("@Mittens_Cat").first()).toBeVisible();

    await page.getByRole("button", { name: "Sign Out" }).last().click();
    await page.getByRole("button", { name: "Sign in or Register" }).click();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });
});
