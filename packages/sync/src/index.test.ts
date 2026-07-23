import { describe, expect, it } from "vitest";
import { mergeFields } from "./index.js";

describe("mergeFields", () => {
  it("merges non-overlapping fields", () => {
    const result = mergeFields({
      server: { title: "A", statusId: "s1" },
      serverVersion: 1,
      patches: [
        { field: "title", value: "B", baseVersion: 1 },
        { field: "assigneeId", value: "u1", baseVersion: 1 },
      ],
    });
    expect(result.kind).toBe("merged");
    if (result.kind === "merged") {
      expect(result.fields.title).toBe("B");
      expect(result.fields.assigneeId).toBe("u1");
      expect(result.fields.statusId).toBe("s1");
      expect(result.version).toBe(2);
    }
  });

  it("surfaces same-field conflicts when base is stale", () => {
    const result = mergeFields({
      server: { title: "ServerTitle" },
      serverVersion: 3,
      patches: [{ field: "title", value: "LocalTitle", baseVersion: 2 }],
    });
    expect(result.kind).toBe("conflict");
    if (result.kind === "conflict") {
      expect(result.conflicts[0]?.field).toBe("title");
    }
  });
});
