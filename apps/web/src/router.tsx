import { createRootRoute, createRoute, createRouter, redirect } from "@octanejs/tanstack-router";
import { AppShell } from "./screens/shell";
import { AuthGate } from "./screens/auth-gate";
import {
  ActivityPage,
  BacklogPage,
  BoardPage,
  DashboardPage,
  EpicsPage,
  FiltersPage,
  InitiativesPage,
  NotificationsPage,
  PeoplePage,
  ReleasesPage,
  RoadmapPage,
  SettingsPage,
  SprintsPage,
} from "./pages";
import { parseAppSearch, parseBoardSearch } from "./lib/route-search";

const rootRoute = createRootRoute({
  component: AuthGate,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  validateSearch: (search: Record<string, unknown>) => parseAppSearch(search),
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/board" });
  },
});

const boardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/board",
  validateSearch: (search: Record<string, unknown>) => parseBoardSearch(search),
  component: BoardPage,
});

const backlogRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/backlog",
  component: BacklogPage,
});

const sprintsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/sprints",
  component: SprintsPage,
});

const epicsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/epics",
  component: EpicsPage,
});

const roadmapRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/roadmap",
  component: RoadmapPage,
});

const initiativesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/initiatives",
  component: InitiativesPage,
});

const filtersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/filters",
  component: FiltersPage,
});

const peopleRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/people",
  component: PeoplePage,
});

const releasesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/releases",
  component: ReleasesPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const activityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/activity",
  component: ActivityPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/notifications",
  component: NotificationsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    boardRoute,
    backlogRoute,
    sprintsRoute,
    epicsRoute,
    roadmapRoute,
    initiativesRoute,
    filtersRoute,
    peopleRoute,
    releasesRoute,
    dashboardRoute,
    activityRoute,
    notificationsRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@octanejs/tanstack-router" {
  interface Register {
    router: typeof router;
  }
}
