/**
 * Format a Jira-style issue key: PROJECTKEY-N
 */
export function formatIssueKey(projectKey: string, number: number): string {
  if (!/^[A-Z][A-Z0-9]+$/.test(projectKey)) {
    throw new Error(`Invalid project key: ${projectKey}`);
  }
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`Issue number must be a positive integer`);
  }
  return `${projectKey}-${number}`;
}

export function parseIssueKey(key: string): { projectKey: string; number: number } {
  const match = /^([A-Z][A-Z0-9]+)-(\d+)$/.exec(key);
  if (!match) {
    throw new Error(`Invalid issue key: ${key}`);
  }
  return {
    projectKey: match[1]!,
    number: Number(match[2]),
  };
}

/**
 * Lexicographic rank between two ranks (fractional indexing).
 */
export function rankBetween(before: string | null, after: string | null): string {
  const MIN = "a";
  const MAX = "z";
  const a = before ?? MIN;
  const b = after ?? MAX;
  if (a >= b) {
    return `${a}i`;
  }
  // Midpoint in last differing char space using simple mid-string
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const ca = a.charCodeAt(i) || 96; // 'a'-1
  const cb = b.charCodeAt(i) || 123; // 'z'+1
  if (cb - ca > 1) {
    const mid = String.fromCharCode(Math.floor((ca + cb) / 2));
    return a.slice(0, i) + mid;
  }
  return `${a}n`;
}

export type Capability =
  | "project.view"
  | "project.edit"
  | "board.edit"
  | "issue.create"
  | "issue.edit"
  | "issue.delete"
  | "sprint.manage"
  | "workflow.manage"
  | "members.manage"
  | "roles.manage"
  | "attachments.manage"
  | "purge.trigger";

const PROJECT_ROLE_CAPS: Record<string, Capability[]> = {
  admin: [
    "project.view",
    "project.edit",
    "board.edit",
    "issue.create",
    "issue.edit",
    "issue.delete",
    "sprint.manage",
    "workflow.manage",
    "members.manage",
    "roles.manage",
    "attachments.manage",
    "purge.trigger",
  ],
  member: ["project.view", "board.edit", "issue.create", "issue.edit", "attachments.manage"],
  viewer: ["project.view"],
};

export function capabilitiesForProjectRole(role: string): Set<Capability> {
  return new Set(PROJECT_ROLE_CAPS[role] ?? ["project.view"]);
}

export function resolveCapabilities(input: {
  projectRole: string | null;
  overrides: Capability[];
  customRoleCapabilities: Capability[];
}): Set<Capability> {
  const caps = input.projectRole
    ? capabilitiesForProjectRole(input.projectRole)
    : new Set<Capability>();
  for (const c of input.customRoleCapabilities) caps.add(c);
  for (const c of input.overrides) caps.add(c);
  return caps;
}

export function hasCapability(caps: Set<Capability>, required: Capability): boolean {
  return caps.has(required);
}

export * from "./defaults.js";
