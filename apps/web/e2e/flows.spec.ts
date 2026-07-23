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

test.describe("issue detail + attachments", () => {
  test("open issue, comment, upload attachment, soft-delete", async ({ page }) => {
    await registerFreshUser(page);
    const title = `Detail ${Date.now()}`;
    const card = await createSyncedIssue(page, title);
    await card.click();
    await expect(page.getByTestId("issue-detail")).toBeVisible();
    await expect(page.getByTestId("issue-detail-key")).toHaveText(/^[A-Z]/);

    await page.getByTestId("issue-comment-input").fill("Looks good");
    await page.getByTestId("issue-comment-submit").click();
    await expect(page.getByTestId("issue-comments")).toContainText("Looks good", {
      timeout: 10_000,
    });

    await page.getByTestId("attachment-upload").setInputFiles({
      name: "note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello-hydrox"),
    });
    await expect(page.getByTestId("issue-attachments")).toContainText("note.txt", {
      timeout: 15_000,
    });

    await page.getByTestId("issue-detail-delete").click();
    await expect(page.getByTestId("issue-detail")).toHaveCount(0);
    await expect(card).toHaveCount(0);
  });
});

test.describe("settings roles + purge", () => {
  test("create custom role and run purge", async ({ page }) => {
    await registerFreshUser(page);
    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-view")).toBeVisible();
    await page.getByTestId("role-name-input").fill("Board editors");
    await page.getByTestId("create-role-submit").click();
    await expect(page.getByTestId("role-created-message")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("custom-roles-list")).toContainText("Board editors");

    await page.getByTestId("trigger-purge").click();
    await expect(page.getByTestId("purge-message")).toContainText("Purge ok", {
      timeout: 15_000,
    });
  });
});

test.describe("conflict UI", () => {
  test("shows conflict dialog from Dexie and resolves", async ({ page }) => {
    await registerFreshUser(page);
    await page.evaluate(async () => {
      const db = (window as any).__hydroxDb;
      await db.conflicts.put({
        id: crypto.randomUUID(),
        entityType: "issue",
        entityId: crypto.randomUUID(),
        conflicts: [
          {
            field: "title",
            localValue: "Local title",
            serverValue: "Server title",
            localVersion: 1,
            serverVersion: 2,
          },
        ],
      });
    });
    await expect(page.getByTestId("conflict-dialog")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("conflict-choice-title").selectOption("server");
    await page.evaluate(async () => {
      const db = (window as any).__hydroxDb;
      await db.conflicts.clear();
    });
    await expect(page.getByTestId("conflict-dialog")).toHaveCount(0);
  });
});

test.describe("multi-tab sync", () => {
  test("second tab sees issue after sync", async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await registerFreshUser(pageA);

    // Share session with tab B via localStorage token
    const token = await pageA.evaluate(() => localStorage.getItem("hydrox_token"));
    await pageB.goto("/");
    await pageB.evaluate((t) => {
      if (t) localStorage.setItem("hydrox_token", t);
    }, token);
    await pageB.reload();
    await expect(pageB.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(pageB.getByTestId("board-view")).toBeVisible({ timeout: 30_000 });

    const title = `MultiTab ${Date.now()}`;
    await createSyncedIssue(pageA, title);
    await expect(
      pageB.locator('[data-testid="issue-card"]').filter({ hasText: title }),
    ).toBeVisible({ timeout: 30_000 });

    await context.close();
  });
});
