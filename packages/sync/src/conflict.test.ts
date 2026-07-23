import { describe, expect, it } from "vitest";
import { applyConflictResolutions, mergeFields } from "./index.js";

describe("multi-field conflict resolution", () => {
  it("resolves mixed local/server choices", () => {
    const merged = applyConflictResolutions({
      server: { title: "S", statusId: "todo" },
      local: { title: "L", statusId: "doing" },
      conflicts: [
        {
          field: "title",
          localValue: "L",
          serverValue: "S",
          localVersion: 1,
          serverVersion: 2,
        },
        {
          field: "statusId",
          localValue: "doing",
          serverValue: "todo",
          localVersion: 1,
          serverVersion: 2,
        },
      ],
      resolutions: { title: "local", statusId: "server" },
      serverVersion: 2,
    });
    expect(merged.fields.title).toBe("L");
    expect(merged.fields.statusId).toBe("todo");
    expect(merged.version).toBe(3);
  });

  it("merges non-overlapping patches without conflict", () => {
    const result = mergeFields({
      server: { title: "A", assigneeId: null },
      serverVersion: 5,
      patches: [
        { field: "assigneeId", value: "u1", baseVersion: 5 },
        { field: "storyPoints", value: 3, baseVersion: 5 },
      ],
    });
    expect(result.kind).toBe("merged");
  });
});
