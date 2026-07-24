import { describe, expect, it } from "vitest";
import { issueKeySchema, issuePrioritySchema, PROTOCOL_VERSION } from "./common.js";
import { createIssueInputSchema, updateIssueInputSchema } from "./domain.js";

describe("@hydrox/contracts", () => {
  it("exports protocol version", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("validates Jira-style issue keys", () => {
    expect(issueKeySchema.parse("PROJ-123")).toBe("PROJ-123");
    expect(() => issueKeySchema.parse("proj-1")).toThrow();
  });

  it("validates issue priority", () => {
    expect(issuePrioritySchema.parse("medium")).toBe("medium");
    expect(() => issuePrioritySchema.parse("urgent")).toThrow();
  });

  it("accepts priority and labels on create/update", () => {
    const created = createIssueInputSchema.parse({
      projectId: "11111111-1111-4111-8111-111111111111",
      type: "story",
      title: "Hello",
      priority: "high",
      labelIds: ["22222222-2222-4222-8222-222222222222"],
    });
    expect(created.priority).toBe("high");
    const updated = updateIssueInputSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      baseVersion: 1,
      priority: "lowest",
      parentIssueId: null,
    });
    expect(updated.priority).toBe("lowest");
  });
});
