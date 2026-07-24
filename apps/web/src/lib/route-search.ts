export const APP_TABS = [
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

export type AppTab = (typeof APP_TABS)[number];

export type SidebarMode = "expanded" | "collapsed";

export type SwimlaneMode = "none" | "epic" | "assignee";

export type AppSearch = {
  /** Only present when collapsed — omitted means expanded (cleaner URLs). */
  sidebar?: "collapsed";
  issue?: string;
};

export type BoardSearch = {
  assignee?: string;
  issueType?: string;
  label?: string;
  component?: string;
  swimlane?: "epic" | "assignee";
};

export function isAppTab(value: string): value is AppTab {
  return (APP_TABS as readonly string[]).includes(value);
}

export function tabPath(tab: AppTab): `/${AppTab}` {
  return `/${tab}`;
}

export function parseAppSearch(search: Record<string, unknown>): AppSearch {
  const out: AppSearch = {};
  if (search.sidebar === "collapsed") out.sidebar = "collapsed";
  if (typeof search.issue === "string" && search.issue.trim()) {
    out.issue = search.issue.trim();
  }
  return out;
}

export function parseBoardSearch(search: Record<string, unknown>): BoardSearch {
  const out: BoardSearch = {};
  if (typeof search.assignee === "string" && search.assignee) {
    out.assignee = search.assignee;
  }
  const issueType =
    typeof search.issueType === "string"
      ? search.issueType
      : typeof search.type === "string"
        ? search.type
        : undefined;
  if (issueType) out.issueType = issueType;
  if (typeof search.label === "string" && search.label) out.label = search.label;
  if (typeof search.component === "string" && search.component) {
    out.component = search.component;
  }
  if (search.swimlane === "epic" || search.swimlane === "assignee") {
    out.swimlane = search.swimlane;
  }
  return out;
}

export function sidebarMode(search: AppSearch): SidebarMode {
  return search.sidebar === "collapsed" ? "collapsed" : "expanded";
}

export function swimlaneMode(search: BoardSearch): SwimlaneMode {
  return search.swimlane ?? "none";
}
