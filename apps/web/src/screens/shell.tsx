/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { Link, Outlet, useRouterState } from "@octanejs/tanstack-router";
import { buttonVariants, cn } from "@hydrox/ui";
import { liveQuery } from "dexie";
import { trpc } from "../lib/trpc";
import { t } from "../i18n";
import { applyTheme, readTheme, watchSystemTheme, type ThemeMode } from "../theme";
import { ConflictDialog } from "../components/conflict-dialog";
import { SkeletonBlock } from "../components/skeleton";
import { pullAndSubscribe } from "../lib/sync-engine";
import { PriorityIcon, TypeChip } from "../components/issue-meta";
import { APP_TABS, isAppTab, type AppTab } from "../lib/route-search";
import { useAppSearch, useIssueNav, useSidebarNav } from "../lib/navigation";
import { WorkspaceContext } from "../lib/workspace";
import { useSession } from "../lib/session";
import { db, type LocalIssue } from "../lib/db";
import { IssueDetailPanel } from "./issue-detail";

const PRIMARY_TABS: AppTab[] = ["board", "backlog", "sprints", "dashboard"];

const TAB_SHORT: Record<AppTab, string> = {
  board: "Bd",
  backlog: "Bl",
  sprints: "Sp",
  epics: "Ep",
  roadmap: "Rm",
  initiatives: "In",
  filters: "Fi",
  people: "Pe",
  releases: "Re",
  dashboard: "Da",
  activity: "Ac",
  notifications: "No",
  settings: "Se",
};

export function AppShell() {
  const session = useSession();
  const user = session.user!;
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const tabSegment = pathname.replace(/^\//, "").split("/")[0] ?? "board";
  const tab: AppTab = isAppTab(tabSegment) ? tabSegment : "board";

  const appSearch = useAppSearch();
  const { openIssue, closeIssue } = useIssueNav();
  const { collapsed, toggleSidebar } = useSidebarNav();

  const [theme, setTheme] = useState<ThemeMode>(readTheme());
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [focusedIssue, setFocusedIssue] = useState<LocalIssue | null>(null);

  useEffect(() => watchSystemTheme(), []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const o = await (trpc as any).work.myOrgs.query();
        const firstOrg = o[0];
        if (!firstOrg) {
          setLoading(false);
          return;
        }
        setOrgId(firstOrg.id);
        const ws = await (trpc as any).work.workspaces.query({
          organizationId: firstOrg.id,
        });
        setWorkspaces(ws);
        const firstWs = ws[0];
        if (!firstWs) {
          setLoading(false);
          return;
        }
        let ps = await (trpc as any).work.projects.query({
          workspaceId: firstWs.id,
        });
        if (!ps.length) {
          const created = await (trpc as any).work.createProject.mutate({
            workspaceId: firstWs.id,
            organizationId: firstOrg.id,
            name: "Hydrox",
            key: "HYDX",
            description: "Default project",
          });
          ps = [created];
        }
        setProjects(ps);
        if (ps[0]) setProjectId(ps[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let off: (() => void) | undefined;
    void pullAndSubscribe(projectId).then((fn) => {
      off = fn;
    });
    return () => off?.();
  }, [projectId]);

  useEffect(() => {
    const issueId = appSearch.issue;
    if (!issueId) {
      setFocusedIssue(null);
      return;
    }
    const sub = liveQuery(() => db.issues.get(issueId)).subscribe({
      next: (row) => {
        if (!row || row.deletedAt) {
          setFocusedIssue(null);
          if (appSearch.issue === issueId) closeIssue();
          return;
        }
        setFocusedIssue(row);
      },
      error: (e) => console.error(e),
    });
    return () => sub.unsubscribe();
  }, [appSearch.issue]);

  useEffect(() => {
    if (!searchQ.trim()) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      void (trpc as any).work.searchIssues
        .query({ q: searchQ.trim(), projectId: projectId ?? undefined })
        .then((rows: any[]) => {
          setSearchResults(rows);
          setSearchOpen(true);
        });
    }, 200);
    return () => clearTimeout(handle);
  }, [searchQ, projectId]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.(".search-wrap")) return;
      setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [searchOpen]);

  function openIssueFromSearch(issue: { id: string; key: string }) {
    setSearchOpen(false);
    setSearchQ("");
    setSearchResults([]);
    setNavOpen(false);
    openIssue(issue.id);
  }

  const project = projects.find((p) => p.id === projectId);
  const firstWorkspace = workspaces.at(0);
  const contextLabel = [project?.key ?? "-", firstWorkspace?.name ?? "Workspace"].join(" · ");
  const sidebarCollapsed = collapsed;

  function navLink(id: AppTab, testIdPrefix: string) {
    return (
      <Link
        key={id}
        to={`/${id}`}
        search={(prev: Record<string, unknown>) => {
          const next: { sidebar?: "collapsed"; issue?: string } = {};
          if (prev.sidebar === "collapsed") next.sidebar = "collapsed";
          if (typeof prev.issue === "string" && prev.issue) next.issue = prev.issue;
          return next;
        }}
        class={cn("sidebar-nav-btn", tab === id && "active")}
        data-testid={`${testIdPrefix}-${id}`}
        title={t(`nav.${id}`)}
        aria-label={t(`nav.${id}`)}
        onClick={() => setNavOpen(false)}
      >
        <span class="sidebar-nav-short" aria-hidden="true">
          {TAB_SHORT[id]}
        </span>
        <span class="sidebar-nav-label">{t(`nav.${id}`)}</span>
      </Link>
    );
  }

  const desktopNav = <>{APP_TABS.map((id) => navLink(id, "nav"))}</>;
  const drawerNav = <>{APP_TABS.map((id) => navLink(id, "drawer-nav"))}</>;

  const themeSelect = (testId: string) => (
    <label class="control-field">
      <span class="control-label">Theme</span>
      <select
        class="control"
        aria-label="Theme"
        data-testid={testId}
        value={theme}
        onChange={(e: any) => {
          const v = e.currentTarget.value as ThemeMode;
          setTheme(v);
          applyTheme(v);
        }}
      >
        <option value="system">{t("theme.system")}</option>
        <option value="light">{t("theme.light")}</option>
        <option value="dark">{t("theme.dark")}</option>
      </select>
    </label>
  );

  return (
    <div
      class="hydrox-shell app-layout"
      data-testid="app-shell"
      data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}
    >
      <aside class="sidebar desktop-only" aria-label="Primary">
        <div class="sidebar-brand-row">
          <div class="sidebar-brand min-w-0">
            <div class="hydrox-brand text-lg text-foreground sidebar-brand-full">
              {t("app.name")}
            </div>
            <div class="hydrox-brand text-lg text-foreground sidebar-brand-mark" aria-hidden="true">
              H
            </div>
            <div class="mt-0.5 truncate text-[11px] text-muted-foreground sidebar-context">
              {contextLabel}
            </div>
          </div>
          <button
            type="button"
            class="sidebar-collapse-btn"
            data-testid="sidebar-toggle"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            onClick={() => toggleSidebar()}
          >
            {sidebarCollapsed ? "»" : "«"}
          </button>
        </div>
        <nav class="flex flex-1 flex-col gap-0.5">{desktopNav}</nav>
        <div class="sidebar-footer">
          {themeSelect("theme-select")}
          <div class="sidebar-user">{user.displayName}</div>
          <button
            class={buttonVariants.ghost + " w-full justify-start sidebar-logout"}
            type="button"
            data-testid="logout"
            onClick={() => void session.logout()}
            title="Log out"
            aria-label="Log out"
          >
            <span class="sidebar-nav-short" aria-hidden="true">
              Out
            </span>
            <span class="sidebar-nav-label">Log out</span>
          </button>
        </div>
      </aside>

      {navOpen ? (
        <div
          class="nav-drawer-root"
          data-testid="nav-drawer-root"
          role="presentation"
          onClick={() => setNavOpen(false)}
        >
          <aside
            class="nav-drawer"
            data-testid="nav-drawer"
            aria-label="Navigation"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div class="mb-3 flex items-start justify-between gap-2 px-1">
              <div>
                <div class="hydrox-brand text-lg">{t("app.name")}</div>
                <div class="mt-0.5 text-[11px] text-muted-foreground">{contextLabel}</div>
              </div>
              <button
                type="button"
                class={buttonVariants.ghost}
                data-testid="nav-drawer-close"
                onClick={() => setNavOpen(false)}
              >
                Close
              </button>
            </div>
            <nav class="flex flex-col gap-0.5">{drawerNav}</nav>
            <div class="sidebar-footer drawer-footer">
              {themeSelect("drawer-theme-select")}
              <button
                class={buttonVariants.ghost + " w-full justify-start"}
                type="button"
                onClick={() => void session.logout()}
              >
                Log out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div class="content-pane">
        <header class="topbar">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              class="menu-btn mobile-only"
              data-testid="nav-menu"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              Menu
            </button>
            <button
              type="button"
              class="menu-btn desktop-only"
              data-testid="sidebar-toggle-top"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => toggleSidebar()}
            >
              {sidebarCollapsed ? "Menu" : "Hide"}
            </button>
            <span class="hydrox-brand text-base mobile-only">{t("app.name")}</span>
            <div class="relative min-w-0 flex-1 search-wrap">
              <input
                class="control toolbar-input w-full"
                data-testid="global-search"
                placeholder="Search issues"
                value={searchQ}
                onInput={(e: any) => setSearchQ(e.currentTarget.value)}
                onFocus={() => searchResults.length && setSearchOpen(true)}
              />
              {searchOpen && searchQ.trim() ? (
                <div class="search-dropdown" data-testid="search-results">
                  {searchResults.length === 0 ? (
                    <div class="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        class="search-result"
                        data-testid="search-result"
                        onClick={() => openIssueFromSearch(r)}
                      >
                        <TypeChip type={r.type} />
                        <PriorityIcon priority={r.priority ?? "medium"} />
                        <span class="issue-key">{r.key}</span>
                        <span class="truncate">{r.title}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div class="flex items-center gap-2 desktop-only">
            <span class="text-xs text-muted-foreground">{user.displayName}</span>
          </div>
        </header>

        <main class="main-pane" data-view={tab}>
          {loading ? (
            <div class="space-y-3">
              <SkeletonBlock class="h-7 w-48" />
              <SkeletonBlock class="h-72 w-full" />
            </div>
          ) : !projectId || !orgId ? (
            <div class="empty-panel">
              <p class="text-sm">No project yet.</p>
            </div>
          ) : (
            <WorkspaceContext.Provider value={{ projectId, organizationId: orgId }}>
              <Outlet />
              {focusedIssue ? (
                <IssueDetailPanel
                  issue={focusedIssue}
                  organizationId={orgId}
                  projectId={projectId}
                  onClose={() => closeIssue()}
                  onOpenIssue={(id) => openIssue(id)}
                />
              ) : null}
            </WorkspaceContext.Provider>
          )}
        </main>

        <nav class="bottom-nav mobile-only" aria-label="Primary tabs">
          {PRIMARY_TABS.map((id) => (
            <Link
              key={id}
              to={`/${id}`}
              search={(prev: Record<string, unknown>) => {
                const next: {
                  sidebar?: "collapsed";
                  issue?: string;
                } = {};
                if (prev.sidebar === "collapsed") next.sidebar = "collapsed";
                if (typeof prev.issue === "string" && prev.issue) {
                  next.issue = prev.issue;
                }
                return next;
              }}
              class={cn("bottom-nav-btn", tab === id && "active")}
              data-testid={`bottom-nav-${id}`}
            >
              {t(`nav.${id}`)}
            </Link>
          ))}
          <button
            type="button"
            class={cn("bottom-nav-btn", !PRIMARY_TABS.includes(tab) && "active")}
            data-testid="bottom-nav-more"
            onClick={() => setNavOpen(true)}
          >
            More
          </button>
        </nav>
      </div>
      <ConflictDialog />
    </div>
  );
}
