import type { SyncConflict } from "@hydrox/contracts";

export type FieldConflict = {
  field: string;
  localValue: unknown;
  serverValue: unknown;
  localVersion: number;
  serverVersion: number;
};

export type MergeResult =
  | {
      kind: "merged";
      fields: Record<string, unknown>;
      version: number;
    }
  | {
      kind: "conflict";
      mergedFields: Record<string, unknown>;
      conflicts: FieldConflict[];
      version: number;
    };

/**
 * Field-level merge: non-overlapping fields merge; same-field conflicts surface.
 * Local patches that match server values are treated as already applied.
 */
export function mergeFields(input: {
  server: Record<string, unknown>;
  serverVersion: number;
  patches: Array<{ field: string; value: unknown; baseVersion: number }>;
}): MergeResult {
  const fields = { ...input.server };
  const conflicts: FieldConflict[] = [];
  const touched = new Set<string>();

  for (const patch of input.patches) {
    if (touched.has(patch.field)) {
      // last patch wins locally within the same push batch until conflict check
    }
    touched.add(patch.field);

    const serverValue = input.server[patch.field];
    const stale = patch.baseVersion < input.serverVersion;
    const diverged =
      stale && !deepEqual(serverValue, patch.value) && input.server[patch.field] !== undefined
        ? !deepEqual(serverValue, getBaseExpectation(input.server, patch))
        : false;

    // Conflict when client based on older version and server field differs from what client expected
    if (stale && !deepEqual(serverValue, patch.value)) {
      // If server already equals the patch, treat as no-op success
      if (deepEqual(serverValue, patch.value)) {
        fields[patch.field] = patch.value;
        continue;
      }
      // If the field wasn't in server or equals client's base assumption via unchanged
      // Heuristic: conflict if server changed the field since baseVersion conceptually
      // (we approximate: values differ and base is stale)
      conflicts.push({
        field: patch.field,
        localValue: patch.value,
        serverValue,
        localVersion: patch.baseVersion,
        serverVersion: input.serverVersion,
      });
      continue;
    }

    fields[patch.field] = patch.value;
  }

  const version = input.serverVersion + 1;
  if (conflicts.length > 0) {
    return {
      kind: "conflict",
      mergedFields: fields,
      conflicts,
      version: input.serverVersion,
    };
  }
  return { kind: "merged", fields, version };
}

function getBaseExpectation(
  _server: Record<string, unknown>,
  _patch: { field: string; value: unknown; baseVersion: number },
): unknown {
  return undefined;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (Array.isArray(a) || Array.isArray(b)) return false;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) {
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}

export function toSyncConflict(
  entityType: SyncConflict["entityType"],
  entityId: string,
  conflicts: FieldConflict[],
): SyncConflict {
  return { entityType, entityId, conflicts };
}

/**
 * Resolve conflicts with user choices: field -> 'local' | 'server'
 */
export function applyConflictResolutions(input: {
  server: Record<string, unknown>;
  local: Record<string, unknown>;
  conflicts: FieldConflict[];
  resolutions: Record<string, "local" | "server">;
  serverVersion: number;
}): { fields: Record<string, unknown>; version: number } {
  const fields = { ...input.server };
  for (const c of input.conflicts) {
    const choice = input.resolutions[c.field] ?? "server";
    fields[c.field] =
      choice === "local" ? input.local[c.field] ?? c.localValue : c.serverValue;
  }
  // Apply non-conflict local fields already in local
  for (const [k, v] of Object.entries(input.local)) {
    if (!input.conflicts.some((c) => c.field === k)) {
      fields[k] = v;
    }
  }
  return { fields, version: input.serverVersion + 1 };
}
