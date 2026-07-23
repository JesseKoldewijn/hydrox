/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants, cn } from "@hydrox/ui";
import type { SessionUser } from "../lib/session";
import { trpc } from "../lib/trpc";
import { t } from "../i18n";
import { applyTheme, readTheme, watchSystemTheme, type ThemeMode } from "../theme";
import { BoardView } from "./board";
import { BacklogView } from "./backlog";
import { SprintsView } from "./sprints";
import { InitiativesView } from "./initiatives";
import { ActivityView } from "./activity";
import { SettingsView } from "./settings";
import { NotificationsView } from "./notifications";
import { ConflictDialog } from "../components/conflict-dialog";
import { SkeletonBlock } from "../components/skeleton";
import { pullAndSubscribe } from "../lib/sync-engine";

type Tab =
  | "board"
  | "backlog"
  | "sprints"
  | "initiatives"
  | "activity"
  | "notifications"
  | "settings";

const TABS: Tab[] = [
  "board",
  "backlog",
  "sprints",
  "initiatives",
  "activity",
  "notifications",
  "settings",
];

export function AppShell(props: {
  user: SessionUser;
  onLogout: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("board");
  const [theme, setTheme] = useState<ThemeMode>(readTheme());
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const project = projects.find((p) => p.id === projectId);
  const firstWorkspace = workspaces.at(0);
  const contextLabel = [project?.key ?? "-", firstWorkspace?.name ?? "Workspace"].join(" · ");

  return (
    <div class="hydrox-shell app-layout" data-testid="app-shell">
      <aside class="sidebar" aria-label="Primary">
        <div class="mb-3 px-2 pt-1">
          <div class="hydrox-brand text-lg text-foreground">{t("app.name")}</div>
          <div class="mt-0.5 truncate text-[11px] text-muted-foreground">
            {contextLabel}
          </div>
        </div>
        <nav class="flex flex-1 flex-col gap-0.5">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              class={cn("sidebar-nav-btn", tab === id && "active")}
              data-testid={`nav-${id}`}
              onClick={() => setTab(id)}
            >
              {t(`nav.${id}`)}
            </button>
          ))}
        </nav>
        <div class="mt-auto space-y-2 border-t border-border pt-3">
          <select
            class="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            aria-label="Theme"
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
          <div class="px-1 text-[11px] text-muted-foreground">{props.user.displayName}</div>
          <button
            class={buttonVariants.ghost + " w-full justify-start"}
            type="button"
            data-testid="logout"
            onClick={() => void props.onLogout()}
          >
            Log out
          </button>
        </div>
      </aside>

      <div class="content-pane">
        <header class="topbar">
          <div class="flex min-w-0 items-center gap-3">
            <span class="hydrox-brand text-base md:hidden">{t("app.name")}</span>
            <div class="mobile-nav" aria-label="Mobile navigation">
              {TABS.map((id) => (
                <button
                  key={id}
                  type="button"
                  class={cn("mobile-nav-btn", tab === id && "active")}
                  onClick={() => setTab(id)}
                >
                  {t(`nav.${id}`)}
                </button>
              ))}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select
              class="rounded-md border border-border bg-background px-2 py-1 text-xs md:hidden"
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
            <span class="hidden text-xs text-muted-foreground sm:inline">
              {props.user.displayName}
            </span>
            <button
              class={buttonVariants.ghost + " md:hidden"}
              type="button"
              onClick={() => void props.onLogout()}
            >
              Log out
            </button>
          </div>
        </header>

        <main class="main-pane">
          {loading ? (
            <div class="space-y-3">
              <SkeletonBlock class="h-7 w-48" />
              <SkeletonBlock class="h-72 w-full" />
            </div>
          ) : !projectId ? (
            <div class="rounded-md border border-border bg-card p-5">
              <p class="mb-3 text-sm">No project yet.</p>
            </div>
          ) : (
            <>
              {tab === "board" && orgId ? (
                <BoardView projectId={projectId} organizationId={orgId} />
              ) : null}
              {tab === "backlog" ? <BacklogView projectId={projectId} /> : null}
              {tab === "sprints" ? <SprintsView projectId={projectId} /> : null}
              {tab === "initiatives" && orgId ? (
                <InitiativesView organizationId={orgId} projectId={projectId} />
              ) : null}
              {tab === "activity" && orgId ? (
                <ActivityView organizationId={orgId} />
              ) : null}
              {tab === "notifications" ? <NotificationsView /> : null}
              {tab === "settings" && orgId ? (
                <SettingsView organizationId={orgId} projectId={projectId} />
              ) : null}
            </>
          )}
        </main>
      </div>
      <ConflictDialog />
    </div>
  );
}
