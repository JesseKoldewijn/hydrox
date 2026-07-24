/** @jsxImportSource octane */
import { useWorkspace } from "./lib/workspace";
import { BoardView } from "./screens/board";
import { BacklogView } from "./screens/backlog";
import { SprintsView } from "./screens/sprints";
import { EpicsView } from "./screens/epics";
import { RoadmapView } from "./screens/roadmap";
import { InitiativesView } from "./screens/initiatives";
import { FiltersView } from "./screens/filters";
import { PeopleView } from "./screens/people";
import { ReleasesView } from "./screens/releases";
import { DashboardView } from "./screens/dashboard";
import { ActivityView } from "./screens/activity";
import { SettingsView } from "./screens/settings";
import { NotificationsView } from "./screens/notifications";

export function BoardPage() {
  const ws = useWorkspace();
  return <BoardView projectId={ws.projectId} organizationId={ws.organizationId} />;
}

export function BacklogPage() {
  const ws = useWorkspace();
  return <BacklogView projectId={ws.projectId} organizationId={ws.organizationId} />;
}

export function SprintsPage() {
  const ws = useWorkspace();
  return <SprintsView projectId={ws.projectId} organizationId={ws.organizationId} />;
}

export function EpicsPage() {
  const ws = useWorkspace();
  return <EpicsView projectId={ws.projectId} organizationId={ws.organizationId} />;
}

export function RoadmapPage() {
  const ws = useWorkspace();
  return <RoadmapView projectId={ws.projectId} />;
}

export function InitiativesPage() {
  const ws = useWorkspace();
  return <InitiativesView organizationId={ws.organizationId} projectId={ws.projectId} />;
}

export function FiltersPage() {
  const ws = useWorkspace();
  return <FiltersView projectId={ws.projectId} />;
}

export function PeoplePage() {
  const ws = useWorkspace();
  return <PeopleView projectId={ws.projectId} organizationId={ws.organizationId} />;
}

export function ReleasesPage() {
  const ws = useWorkspace();
  return <ReleasesView projectId={ws.projectId} />;
}

export function DashboardPage() {
  const ws = useWorkspace();
  return <DashboardView projectId={ws.projectId} organizationId={ws.organizationId} />;
}

export function ActivityPage() {
  const ws = useWorkspace();
  return <ActivityView organizationId={ws.organizationId} />;
}

export function NotificationsPage() {
  return <NotificationsView />;
}

export function SettingsPage() {
  const ws = useWorkspace();
  return <SettingsView organizationId={ws.organizationId} projectId={ws.projectId} />;
}
