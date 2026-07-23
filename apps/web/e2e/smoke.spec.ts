import { test, expect } from "@playwright/test";

test.describe("hydrox smoke", () => {
  test("landing shows brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Hydrox")).toBeVisible({ timeout: 15_000 });
  });

  test("can register and reach app shell", async ({ page }) => {
    const suffix = Date.now().toString(36);
    await page.goto("/");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.locator('input').nth(0).fill(`User ${suffix}`);
    await page.locator('input').nth(1).fill(`u${suffix}@hydrox.test`);
    await page.locator('input').nth(2).fill(`user_${suffix}`);
    await page.locator('input[type="password"]').fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Board")).toBeVisible({ timeout: 20_000 });
  });
});
