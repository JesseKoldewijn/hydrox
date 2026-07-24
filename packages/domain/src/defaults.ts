export const DEFAULT_WORKFLOW_STATUSES = [
  { name: "To Do", category: "todo" as const, position: 0, color: "#94a3b8" },
  {
    name: "In Progress",
    category: "in_progress" as const,
    position: 1,
    color: "#3b82f6",
  },
  { name: "Done", category: "done" as const, position: 2, color: "#22c55e" },
];
