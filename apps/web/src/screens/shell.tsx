/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
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

export function AppShell(props: {
  user: SessionUser;
  onLogout: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("board");
  const [theme, setTheme] = useState<ThemeMode>(readTheme());
  const [orgs, setOrgs] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stop = watchSystemTheme();
    return stop;
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const o = await (trpc as any).work.myOrgs.query();
      setOrgs(o);
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
      const ps = await (trpc as any).work.projects.query({
        workspaceId: firstWs.id,
      });
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
      setLoading(false);
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

  async function ensureProject() {
    if (!orgId || !workspaces[0]) return;
    const created = await (trpc as any).work.createProject.mutate({
      workspaceId: workspaces[0].id,
      organizationId: orgId,
      name: "Hydrox",
      key: "HYDX",
      description: "Default project",
    });
    setProjects([created]);
    setProjectId(created.id);
  }

  return (
    <div class="hydrox-shell">
      <header class="flex items-center justify-between border-b border-border px-4 py-3 backdrop-blur">
        <div class="flex items-center gap-6">
          <span class="hydrox-brand text-2xl font-bold text-primary">
            {t("app.name")}
          </span>
          <nav class="flex gap-2 text-sm">
            {(
              [
                "board",
                "backlog",
                "sprints",
                "initiatives",
                "activity",
                "notifications",
                "settings",
              ] as Tab[]
            ).map((id) => (
              <button
                key={id}
                type="button"
                class={tab === id ? buttonVariants.secondary : buttonVariants.ghost}
                onClick={() => setTab(id)}
              >
                {t(`nav.${id}`)}
              </button>
            ))}
          </nav>
        </div>
        <div class="flex items-center gap-2">
          <select
            class="rounded-md border border-border bg-background px-2 py-1 text-sm"
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
          <span class="text-sm text-muted-foreground">{props.user.displayName}</span>
          <button class={buttonVariants.ghost} type="button" onClick={() => void props.onLogout()}>
            Log out
          </button>
        </div>
      </header>

      <main class="mx-auto w-full max-w-7xl p-4">
        {loading ? (
          <div class="space-y-3">
            <SkeletonBlock class="h-8 w-64" />
            <SkeletonBlock class="h-72 w-full" />
          </div>
        ) : !projectId ? (
          <div class="rounded-lg border border-border bg-card p-6">
            <p class="mb-3">No project yet.</p>
            <button class={buttonVariants.default} type="button" onClick={() => void ensureProject()}>
              Create HYDX project
            </button>
          </div>
        ) : (
          <>
            {tab === "board" ? <BoardView projectId={projectId} /> : null}
            {tab === "backlog" ? <BacklogView projectId={projectId} /> : null}
            {tab === "sprints" ? <SprintsView projectId={projectId} /> : null}
            {tab === "initiatives" && orgId ? (
              <InitiativesView organizationId={orgId} projectId={projectId} />
            ) : null}
            {tab === "activity" && orgId ? <ActivityView organizationId={orgId} /> : null}
            {tab === "notifications" ? <NotificationsView /> : null}
            {tab === "settings" && orgId ? (
              <SettingsView organizationId={orgId} projectId={projectId} />
            ) : null}
          </>
        )}
      </main>
      <ConflictDialog />
    </div>
  );
}
