import { test, expect, type Page } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

const ALL_TABS = [
  "board",
  "backlog",
  "sprints",
  "epics",
  "roadmap",
  "initiatives",
  "filters",
  "people",
  "releases",
  "dashboard",
  "activity",
  "notifications",
  "settings",
] as const;

const VIEW_BY_TAB: Record<(typeof ALL_TABS)[number], string> = {
  board: "board-view",
  backlog: "backlog-view",
  sprints: "sprints-view",
  epics: "epics-view",
  roadmap: "roadmap-view",
  initiatives: "initiatives-view",
  filters: "filters-view",
  people: "people-view",
  releases: "releases-view",
  dashboard: "dashboard-view",
  activity: "activity-view",
  notifications: "notifications-view",
  settings: "settings-view",
};

const PRIMARY = new Set(["board", "backlog", "sprints", "dashboard"]);

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
  return { suffix, email: `u${suffix}@hydrox.test`, password: "password123" };
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

async function goDesktopTab(page: Page, tab: (typeof ALL_TABS)[number]) {
  await page.getByTestId(`nav-${tab}`).click();
  await expect(page.getByTestId(VIEW_BY_TAB[tab])).toBeVisible({ timeout: 10_000 });
}

async function goMobileTab(page: Page, tab: (typeof ALL_TABS)[number]) {
  if (PRIMARY.has(tab)) {
    await page.getByTestId(`bottom-nav-${tab}`).click();
  } else {
    await page.getByTestId("bottom-nav-more").click();
    await expect(page.getByTestId("nav-drawer")).toBeVisible();
    await page.getByTestId(`drawer-nav-${tab}`).click();
  }
  await expect(page.getByTestId(VIEW_BY_TAB[tab])).toBeVisible({ timeout: 10_000 });
}

test.describe("desktop pages", () => {
  test.use({ viewport: DESKTOP });

  test("every tab loads its view", async ({ page }) => {
    await registerFreshUser(page);
    for (const tab of ALL_TABS) {
      await goDesktopTab(page, tab);
    }
  });

  test("search result opens issue modal", async ({ page }) => {
    await registerFreshUser(page);
    const title = `Searchable ${Date.now()}`;
    const card = await createSyncedIssue(page, title);
    const key = await card.getAttribute("data-issue-key");
    expect(key).toBeTruthy();

    await page.getByTestId("global-search").fill(key!);
    await expect(page.getByTestId("search-results")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("search-result").first().click();
    await expect(page.getByTestId("issue-detail")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("issue-detail-key")).toHaveText(key!);
    await page.getByTestId("issue-detail-close").click();
  });

  test("sprints lifecycle start and complete", async ({ page }) => {
    await registerFreshUser(page);
    const issueTitle = `Sprint issue ${Date.now()}`;
    await createSyncedIssue(page, issueTitle);

    await goDesktopTab(page, "sprints");
    await page.getByTestId("sprint-name-input").fill("Sprint Beta");
    await page.getByTestId("create-sprint-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("sprint-card")).toContainText("Sprint Beta", {
      timeout: 10_000,
    });
    await page.getByTestId("start-sprint").click();
    await expect(page.getByTestId("sprints-active")).toContainText("Sprint Beta", {
      timeout: 10_000,
    });

    await goDesktopTab(page, "backlog");
    await expect
      .poll(async () => page.getByTestId("backlog-target-sprint").inputValue(), {
        timeout: 10_000,
      })
      .not.toBe("");
    const row = page.locator('[data-testid="backlog-row"]').filter({ hasText: issueTitle });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByTestId("add-to-sprint").click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });

    await goDesktopTab(page, "sprints");
    await expect(page.getByTestId("sprint-issue")).toContainText(issueTitle, {
      timeout: 10_000,
    });
    await page.getByTestId("sprint-issue").getByRole("button").first().click();
    await expect(page.getByTestId("issue-detail")).toBeVisible();
    await page.getByTestId("issue-detail-close").click();

    await page.getByTestId("complete-sprint").click();
    await expect(page.getByTestId("sprints-closed")).toContainText("Sprint Beta", {
      timeout: 10_000,
    });
  });

  test("initiatives create and link epic", async ({ page }) => {
    await registerFreshUser(page);
    await goDesktopTab(page, "initiatives");
    await page.getByTestId("initiative-name").fill("Platform");
    await page.getByTestId("create-initiative-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("initiative-card")).toContainText("Platform", {
      timeout: 10_000,
    });

    await goDesktopTab(page, "epics");
    await page.getByTestId("epic-name-input").fill("Auth epic");
    await page.getByTestId("create-epic-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("epic-card")).toContainText("Auth epic", {
      timeout: 10_000,
    });

    await goDesktopTab(page, "initiatives");
    await page.getByTestId("link-epic").selectOption({ label: "Auth epic" });
    await page.getByTestId("link-initiative").selectOption({ label: "Platform" });
    await page.getByTestId("link-epic-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("initiative-card")).toContainText("Auth epic", {
      timeout: 10_000,
    });
  });

  test("activity and notifications views", async ({ page }) => {
    await registerFreshUser(page);
    await createSyncedIssue(page, `Activity ${Date.now()}`);
    await goDesktopTab(page, "activity");
    await expect(page.getByTestId("activity-view")).toBeVisible();
    // Activity may be empty or populated depending on server enrichment timing
    await expect(
      page.getByTestId("activity-timeline").or(page.getByTestId("activity-empty")),
    ).toBeVisible();

    await goDesktopTab(page, "notifications");
    await expect(page.getByTestId("notifications-empty")).toBeVisible();
    await expect(page.getByTestId("enable-push")).toBeVisible();
  });

  test("login after logout", async ({ page }) => {
    const creds = await registerFreshUser(page);
    await page.getByTestId("logout").click();
    await expect(page.getByTestId("auth-screen")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("auth-login").fill(creds.email);
    await page.getByTestId("auth-password").fill(creds.password);
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("board-view")).toBeVisible({ timeout: 30_000 });
  });

  test("light and dark theme keep form controls readable", async ({ page }) => {
    await registerFreshUser(page);
    const theme = page.getByTestId("theme-select");
    await theme.selectOption("light");
    await expect
      .poll(async () => page.locator("html").evaluate((el) => el.classList.contains("dark")))
      .toBe(false);
    await expect(page.getByTestId("issue-title-input")).toBeVisible();
    await expect(page.getByTestId("create-issue-type")).toBeVisible();

    const lightInputBg = await page
      .getByTestId("issue-title-input")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const lightSidebarBg = await page
      .locator(".sidebar")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(lightInputBg).not.toBe(lightSidebarBg);

    await theme.selectOption("dark");
    await expect
      .poll(async () => page.locator("html").evaluate((el) => el.classList.contains("dark")))
      .toBe(true);
    const darkInputBg = await page
      .getByTestId("issue-title-input")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const darkSidebarBg = await page
      .locator(".sidebar")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const darkFg = await page.locator("body").evaluate((el) => getComputedStyle(el).color);
    expect(darkInputBg).not.toBe(darkSidebarBg);
    const m = darkFg.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(m).toBeTruthy();
    const lum = (Number(m![1]) + Number(m![2]) + Number(m![3])) / 3;
    expect(lum).toBeGreaterThan(160);
  });

  test("sidebar collapse and issue modal use URL search params", async ({ page }) => {
    await registerFreshUser(page);
    await expect(page).toHaveURL(/\/board/);

    await page.getByTestId("sidebar-toggle").click();
    await expect(page).toHaveURL(/sidebar=collapsed/);
    await expect(page.getByTestId("app-shell")).toHaveAttribute("data-sidebar", "collapsed");

    await page.getByTestId("nav-backlog").click();
    await expect(page).toHaveURL(/\/backlog/);
    await expect(page).toHaveURL(/sidebar=collapsed/);
    await expect(page.getByTestId("backlog-view")).toBeVisible();

    await page.getByTestId("nav-board").click();
    await expect(page.getByTestId("board-view")).toBeVisible();
    const title = `Routed ${Date.now()}`;
    const card = await createSyncedIssue(page, title);
    await card.click();
    await expect(page.getByTestId("issue-detail")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/[?&]issue=/);
    await page.getByTestId("issue-detail-close").click();
    await expect(page.getByTestId("issue-detail")).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]issue=/);
  });

  test("board filters sync to query params", async ({ page }) => {
    test.setTimeout(60_000);
    await registerFreshUser(page);
    await page.getByTestId("filter-type").selectOption("bug");
    await expect(page).toHaveURL(/issueType=bug/);
    await page.reload();
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("board-view")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("filter-type")).toHaveValue("bug");
  });

  test("form validation blocks empty submits with clear errors", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("auth-screen")).toBeVisible({
      timeout: 20_000,
    });
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("auth-form").locator(".field-error").first()).toBeVisible();

    await registerFreshUser(page);
    await page.getByTestId("create-issue-submit").click();
    await expect(page.getByTestId("issue-title-error")).toBeVisible();
    await expect(page.getByTestId("issue-title-error")).toContainText("required");

    await goDesktopTab(page, "sprints");
    await page.getByTestId("create-sprint-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("create-sprint-form").locator(".field-error")).toBeVisible();

    await goDesktopTab(page, "filters");
    await page.getByTestId("save-filter").click();
    await expect(page.getByTestId("save-filter-form").locator(".field-error")).toBeVisible();
  });

  test("assignee and components show on cards and detail", async ({ page }) => {
    await registerFreshUser(page);

    await goDesktopTab(page, "releases");
    await page.getByTestId("component-name").fill("Frontend");
    await page.getByTestId("create-component-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("components-list")).toContainText("Frontend", {
      timeout: 10_000,
    });

    await goDesktopTab(page, "board");
    await expect(page.getByTestId("create-component-chip")).toContainText("Frontend", {
      timeout: 10_000,
    });
    await page.getByTestId("create-component-chip").click();
    const assignee = page.getByTestId("create-issue-assignee");
    await expect(assignee.locator("option")).not.toHaveCount(1, { timeout: 10_000 });
    const assigneeValue = await assignee.locator("option").nth(1).getAttribute("value");
    expect(assigneeValue).toBeTruthy();
    await assignee.selectOption(assigneeValue!);
    const title = `Owned ${Date.now()}`;
    const card = await createSyncedIssue(page, title);
    await expect(card.getByTestId("assignee-badge")).toBeVisible();
    await expect(card.getByTestId("component-chips")).toContainText("Frontend");

    await card.click();
    await expect(page.getByTestId("issue-detail")).toBeVisible();
    await expect(page.getByTestId("issue-detail-assignee")).toHaveValue(assigneeValue!);
    await expect(page.getByTestId("issue-component-chip")).toHaveClass(/active/);
    await page.getByTestId("issue-detail-close").click();
  });
});

test.describe("mobile pages", () => {
  test.use({ viewport: MOBILE });

  test("bottom nav and drawer reach every tab", async ({ page }) => {
    await registerFreshUser(page);
    await expect(page.getByTestId("bottom-nav-board")).toBeVisible();
    for (const tab of ALL_TABS) {
      await goMobileTab(page, tab);
    }
  });

  test("board create open close modal on phone", async ({ page }) => {
    await registerFreshUser(page);
    const title = `Phone ${Date.now()}`;
    const card = await createSyncedIssue(page, title);
    await card.click();
    await expect(page.getByTestId("issue-detail")).toBeVisible();
    await expect(page.locator(".issue-modal")).toBeVisible();
    await expect(page.getByTestId("issue-detail-save")).toBeVisible();
    await page.getByTestId("issue-detail-close").click();
    await expect(page.getByTestId("issue-detail")).toHaveCount(0);
  });

  test("backlog sprint assign via drawer navigation", async ({ page }) => {
    await registerFreshUser(page);
    const title = `Mobile backlog ${Date.now()}`;
    await createSyncedIssue(page, title);

    await goMobileTab(page, "sprints");
    await page.getByTestId("sprint-name-input").fill("Mobile Sprint");
    await page.getByTestId("create-sprint-form").locator("button[type=submit]").click();
    await expect(page.getByTestId("sprint-card")).toContainText("Mobile Sprint", {
      timeout: 10_000,
    });

    await goMobileTab(page, "backlog");
    await expect
      .poll(async () => page.getByTestId("backlog-target-sprint").inputValue(), {
        timeout: 10_000,
      })
      .not.toBe("");
    const row = page.locator('[data-testid="backlog-row"]').filter({ hasText: title });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByTestId("add-to-sprint").click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });
  });

  test("filters via more drawer", async ({ page }) => {
    await registerFreshUser(page);
    await goMobileTab(page, "filters");
    await page.getByTestId("filter-name-input").fill("Bugs");
    await page.getByTestId("filter-type-select").selectOption("bug");
    await page.getByTestId("save-filter").click();
    await expect(page.getByTestId("saved-filters-list")).toContainText("Bugs", {
      timeout: 10_000,
    });
    await page.getByTestId("apply-filter").first().click();
    await expect(page.getByTestId("filter-results")).toBeVisible({ timeout: 10_000 });
  });
});
