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
  const openDetail = page.getByTestId("issue-detail");
  if (await openDetail.count()) {
    await page.getByTestId("issue-detail-close").click();
    await expect(openDetail).toHaveCount(0);
  }
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

test.describe("jira core parity", () => {
  test("sub-task, link, backlog to sprint, filter, search", async ({ page }) => {
    await registerFreshUser(page);
    const parentTitle = `Parent ${Date.now()}`;
    const parentCard = await createSyncedIssue(page, parentTitle);
    await parentCard.click();
    await expect(page.getByTestId("issue-detail")).toBeVisible();

    await page.getByTestId("subtask-title-input").fill("Child sub-task");
    await page.getByTestId("subtask-create").click();
    await expect(page.getByTestId("issue-subtasks")).toContainText("Child sub-task", {
      timeout: 15_000,
    });

    const siblingTitle = `Sibling ${Date.now()}`;
    await page.getByTestId("issue-detail-close").click();
    const siblingCard = await createSyncedIssue(page, siblingTitle);
    const searchKey = await siblingCard.getAttribute("data-issue-key");
    await siblingCard.click();
    const linkTarget = page.getByTestId("link-target");
    await expect(linkTarget.locator("option")).not.toHaveCount(1, { timeout: 10_000 });
    const optionValue = await linkTarget
      .locator("option")
      .filter({ hasText: parentTitle })
      .first()
      .getAttribute("value");
    expect(optionValue).toBeTruthy();
    await linkTarget.selectOption(optionValue!);
    await page.getByTestId("link-create").click();
    await expect(page.getByTestId("issue-links")).toContainText("relates_to", {
      timeout: 10_000,
    });

    await page.getByTestId("issue-detail-close").click();
    await expect(page.getByTestId("issue-detail")).toHaveCount(0);
    await page.getByTestId("nav-backlog").click();
    await expect(page.getByTestId("backlog-view")).toBeVisible();
    await page.getByTestId("create-sprint-inline").locator("input").fill("Sprint Alpha");
    await page.getByTestId("create-sprint-inline").locator("button[type=submit]").click();
    await expect
      .poll(async () => page.getByTestId("backlog-target-sprint").inputValue(), {
        timeout: 10_000,
      })
      .not.toBe("");
    const row = page.locator('[data-testid="backlog-row"]').filter({ hasText: parentTitle });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByTestId("add-to-sprint").click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });

    await page.getByTestId("nav-filters").click();
    await expect(page.getByTestId("filters-view")).toBeVisible();
    await page.getByTestId("filter-name-input").fill("Stories");
    await page.getByTestId("save-filter").click();
    await expect(page.getByTestId("saved-filters-list")).toContainText("Stories", {
      timeout: 10_000,
    });
    await page.getByTestId("apply-filter").first().click();
    await expect(page.getByTestId("filter-results")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("nav-board").click();
    if (searchKey) {
      await page.getByTestId("global-search").fill(searchKey);
      await expect(page.getByTestId("search-results")).toContainText(searchKey, {
        timeout: 10_000,
      });
    }

    await page.getByTestId("nav-people").click();
    await expect(page.getByTestId("people-view")).toBeVisible();
    await expect(page.getByTestId("members-list")).toBeVisible();
  });

  test("create bug with priority and open epics tab", async ({ page }) => {
    await registerFreshUser(page);
    await page.getByTestId("create-issue-type").selectOption("bug");
    await page.getByTestId("create-issue-priority").selectOption("high");
    await createSyncedIssue(page, `Bug ${Date.now()}`);
    await expect(page.getByTestId("type-chip").first()).toContainText("Bug");

    await page.getByTestId("nav-epics").click();
    await expect(page.getByTestId("epics-view")).toBeVisible();
    await page.getByTestId("epic-name-input").fill("Epic One");
    await page.getByTestId("create-epic-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("epics-list")).toContainText("Epic One", {
      timeout: 10_000,
    });
  });

  test("releases, dashboard, roadmap, bulk edit, swimlanes", async ({ page }) => {
    await registerFreshUser(page);

    await page.getByTestId("nav-releases").click();
    await expect(page.getByTestId("releases-view")).toBeVisible();
    await page.getByTestId("version-name").fill("1.0.0");
    await page.getByTestId("create-version-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("versions-list")).toContainText("1.0.0", {
      timeout: 10_000,
    });
    await page.getByTestId("component-name").fill("API");
    await page.getByTestId("create-component-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("components-list")).toContainText("API", {
      timeout: 10_000,
    });
    await page.getByTestId("template-name").fill("Bug shell");
    await page.getByTestId("create-template-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("templates-list")).toContainText("Bug shell", {
      timeout: 10_000,
    });

    await page.getByTestId("nav-dashboard").click();
    await expect(page.getByTestId("dashboard-view")).toBeVisible();
    await page.getByTestId("dashboard-name").fill("Ops");
    await page.getByTestId("create-dashboard-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("gadget-grid")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("gadget-card").first()).toBeVisible();

    await page.getByTestId("nav-epics").click();
    await page.getByTestId("epic-name-input").fill("Roadmap Epic");
    await page.getByTestId("create-epic-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("epic-card")).toContainText("Roadmap Epic", {
      timeout: 10_000,
    });
    await page.getByTestId("nav-roadmap").click();
    await expect(page.getByTestId("roadmap-view")).toBeVisible();
    await expect(page.getByTestId("roadmap-list")).toContainText("Roadmap Epic", {
      timeout: 10_000,
    });

    await page.getByTestId("nav-board").click();
    await createSyncedIssue(page, `Bulk A ${Date.now()}`);
    await createSyncedIssue(page, `Bulk B ${Date.now()}`);
    await page.getByTestId("swimlane-mode").selectOption("assignee");
    await expect(page.getByTestId("swimlane").first()).toBeVisible();

    await page.getByTestId("nav-backlog").click();
    const checks = page.getByTestId("bulk-check");
    await expect(checks.first()).toBeVisible({ timeout: 10_000 });
    await checks.nth(0).check();
    await checks.nth(1).check();
    await page.getByTestId("bulk-priority").selectOption("high");
    await page.getByTestId("bulk-apply").click();
    await expect(page.getByTestId("bulk-edit-bar")).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

test.describe("multi-tab sync", () => {
  test("second tab sees issue after sync", async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await registerFreshUser(pageA);

    // Same browser context already shares localStorage session with page B.
    await pageB.goto("/board");
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
