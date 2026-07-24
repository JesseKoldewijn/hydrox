import Dexie, { type Table } from "dexie";

export type LocalIssue = {
  id: string;
  projectId: string;
  key: string;
  type: string;
  title: string;
  description: string | null;
  statusId: string;
  assigneeId: string | null;
  reporterId: string | null;
  epicId: string | null;
  parentIssueId: string | null;
  sprintId: string | null;
  priority: string;
  backlogRank: string;
  storyPoints: number | null;
  dueDate: string | null;
  originalEstimateMinutes: number | null;
  remainingEstimateMinutes: number | null;
  fixVersionId: string | null;
  labelIds: string[];
  componentIds: string[];
  version: number;
  updatedAt: string;
  deletedAt: string | null;
  pending?: boolean;
};

export type SyncQueueItem = {
  id?: number;
  opId: string;
  idempotencyKey: string;
  entityType: string;
  entityId: string;
  op: "create" | "update" | "delete" | "restore";
  patches: Array<{ field: string; value: unknown; baseVersion: number }>;
  payload?: Record<string, unknown>;
  clientTimestamp: string;
};

export type LocalConflict = {
  id: string;
  entityType: string;
  entityId: string;
  conflicts: Array<{
    field: string;
    localValue: unknown;
    serverValue: unknown;
    localVersion: number;
    serverVersion: number;
  }>;
};

export class HydroxDB extends Dexie {
  issues!: Table<LocalIssue, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  conflicts!: Table<LocalConflict, string>;
  meta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("hydrox");
    this.version(1).stores({
      issues: "id, projectId, statusId, sprintId, backlogRank, key",
      syncQueue: "++id, opId, entityId",
      conflicts: "id, entityId",
      meta: "key",
    });
    this.version(2).stores({
      issues:
        "id, projectId, statusId, sprintId, backlogRank, key, priority, epicId, parentIssueId",
      syncQueue: "++id, opId, entityId",
      conflicts: "id, entityId",
      meta: "key",
    });
    this.version(3).stores({
      issues:
        "id, projectId, statusId, sprintId, backlogRank, key, priority, epicId, parentIssueId, fixVersionId",
      syncQueue: "++id, opId, entityId",
      conflicts: "id, entityId",
      meta: "key",
    });
  }
}

export const db = new HydroxDB();
