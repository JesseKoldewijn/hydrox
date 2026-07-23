import { describe, expect, it } from "vitest";
import { issueKeySchema, PROTOCOL_VERSION } from "./common.js";

describe("@hydrox/contracts", () => {
  it("exports protocol version", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("validates Jira-style issue keys", () => {
    expect(issueKeySchema.parse("PROJ-123")).toBe("PROJ-123");
    expect(() => issueKeySchema.parse("proj-1")).toThrow();
  });
});
