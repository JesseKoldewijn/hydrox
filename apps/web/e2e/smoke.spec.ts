import { test, expect, type Page } from "@playwright/test";

async function registerFreshUser(page: Page) {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await page.goto("/");
  await expect(page.getByTestId("auth-screen")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("auth-toggle").click();
  await page.getByTestId("auth-display-name").fill(`User ${suffix}`);
  await page.getByTestId("auth-email").fill(`u${suffix}@hydrox.test`);
  await page.getByTestId("auth-username").fill(`user_${suffix}`);
  await page.getByTestId("auth-password").fill("password123");
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("board-view")).toBeVisible({ timeout: 30_000 });
  return suffix;
}

async function createSyncedIssue(page: Page, title: string) {
  await page.getByTestId("issue-title-input").fill(title);
  await page.getByTestId("create-issue-submit").click();
  const card = page.locator('[data-testid="issue-card"]').filter({ hasText: title });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () => card.getAttribute("data-pending"), { timeout: 20_000 })
    .toBe("false");
  return card;
}

test.describe("hydrox e2e", () => {
  test("landing shows brand on auth screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Hydrox").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("auth-screen")).toBeVisible();
  });

  test("register reaches board shell", async ({ page }) => {
    await registerFreshUser(page);
    await expect(page.getByTestId("nav-board")).toBeVisible();
  });

  test("create issue syncs to server key", async ({ page }) => {
    await registerFreshUser(page);
    const title = `E2E issue ${Date.now()}`;
    await page.getByTestId("issue-title-input").fill(title);
    await page.getByTestId("create-issue-submit").click();

    const card = page.locator('[data-testid="issue-card"]').filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // LOCAL-pending must resolve to a real project key after sync.push
    await expect
      .poll(async () => card.getAttribute("data-issue-key"), { timeout: 20_000 })
      .toMatch(/^[A-Z][A-Z0-9]+-\d+$/);

    await expect(card).toHaveAttribute("data-pending", "false");
    await expect(card.getByTestId("syncing-pill")).toHaveCount(0);
  });

  test("drag issue across board columns", async ({ page }) => {
    await registerFreshUser(page);
    const title = `Drag me ${Date.now()}`;
    await page.getByTestId("issue-title-input").fill(title);
    await page.getByTestId("create-issue-submit").click();

    const card = page.locator('[data-testid="issue-card"]').filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => card.getAttribute("data-pending"), { timeout: 20_000 })
      .toBe("false");

    const done = page.getByTestId("column-Done");
    await expect(done).toBeVisible();
    await done.scrollIntoViewIfNeeded();
    await card.dragTo(done, { targetPosition: { x: 40, y: 60 } });
    await expect(done.locator('[data-testid="issue-card"]').filter({ hasText: title })).toBeVisible(
      {
        timeout: 10_000,
      },
    );
    await expect
      .poll(
        async () =>
          done
            .locator('[data-testid="issue-card"]')
            .filter({ hasText: title })
            .getAttribute("data-pending"),
        { timeout: 15_000 },
      )
      .toBe("false");
  });

  test("responsive shell keeps board usable at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await registerFreshUser(page);
    await expect(page.getByTestId("board-columns")).toBeVisible();
    await expect(page.getByTestId("create-issue-form")).toBeVisible();
    await expect(page.getByTestId("bottom-nav-board")).toBeVisible();
    await expect(page.getByTestId("nav-menu")).toBeVisible();
    await page.getByTestId("nav-menu").click();
    await expect(page.getByTestId("nav-drawer")).toBeVisible();
    await expect(page.getByTestId("nav-drawer").getByTestId("drawer-nav-settings")).toBeVisible();
    await page.getByTestId("nav-drawer-close").click();
    await expect(page.getByTestId("nav-drawer")).toHaveCount(0);

    const title = `Mobile ${Date.now()}`;
    const card = await createSyncedIssue(page, title);
    await card.click();
    await expect(page.getByTestId("issue-detail")).toBeVisible();
    await expect(page.locator(".issue-modal")).toBeVisible();
    await page.getByTestId("issue-detail-close").click();
    await expect(page.getByTestId("issue-detail")).toHaveCount(0);
  });
});
