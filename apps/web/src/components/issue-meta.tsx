/** @jsxImportSource octane */

export const ISSUE_TYPES = ["story", "bug", "task", "sub_task"] as const;
export const PRIORITIES = ["highest", "high", "medium", "low", "lowest"] as const;

const PRIORITY_MARK: Record<string, string> = {
  highest: "⇈",
  high: "↑",
  medium: "–",
  low: "↓",
  lowest: "⇊",
};

const TYPE_LABEL: Record<string, string> = {
  story: "Story",
  bug: "Bug",
  task: "Task",
  sub_task: "Sub-task",
};

export function priorityMark(priority: string) {
  return PRIORITY_MARK[priority] ?? "–";
}

export function typeLabel(type: string) {
  return TYPE_LABEL[type] ?? type;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function TypeChip(props: { type: string }) {
  return (
    <span class={`type-chip type-${props.type}`} data-testid="type-chip">
      {typeLabel(props.type)}
    </span>
  );
}

export function PriorityIcon(props: { priority: string }) {
  return (
    <span
      class={`priority-icon priority-${props.priority}`}
      title={props.priority}
      data-testid="priority-icon"
      aria-label={`Priority ${props.priority}`}
    >
      {priorityMark(props.priority)}
    </span>
  );
}

export function AssigneeBadge(props: { name?: string | null; compact?: boolean }) {
  if (!props.name) {
    return (
      <span class="assignee-badge unassigned" data-testid="assignee-badge" title="Unassigned">
        <span class="assignee-avatar">?</span>
        {props.compact ? null : <span class="assignee-name">Unassigned</span>}
      </span>
    );
  }
  return (
    <span class="assignee-badge" data-testid="assignee-badge" title={props.name}>
      <span class="assignee-avatar">{initials(props.name)}</span>
      {props.compact ? null : <span class="assignee-name">{props.name}</span>}
    </span>
  );
}

export function ComponentChips(props: { names: string[] }) {
  if (!props.names.length) return null;
  return (
    <div class="component-chips" data-testid="component-chips">
      {props.names.map((name) => (
        <span class="component-chip" key={name} title={name}>
          {name}
        </span>
      ))}
    </div>
  );
}

export function IssuePeopleMeta(props: {
  assigneeName?: string | null;
  componentNames?: string[];
  compact?: boolean;
}) {
  const components = props.componentNames ?? [];
  return (
    <div class="issue-people-meta" data-testid="issue-people-meta">
      <ComponentChips names={components} />
      <AssigneeBadge name={props.assigneeName} compact={props.compact} />
    </div>
  );
}
