import { test, expect } from "@playwright/test";

test.describe("hydrox smoke", () => {
  test("landing shows brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Hydrox")).toBeVisible({ timeout: 15_000 });
  });
});
