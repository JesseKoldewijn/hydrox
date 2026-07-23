import { describe, expect, it } from "vitest";
import {
  formatIssueKey,
  parseIssueKey,
  rankBetween,
  resolveCapabilities,
} from "./index.js";

describe("issue keys", () => {
  it("formats and parses Jira-style keys", () => {
    expect(formatIssueKey("HYDX", 42)).toBe("HYDX-42");
    expect(parseIssueKey("HYDX-42")).toEqual({
      projectKey: "HYDX",
      number: 42,
    });
  });
});

describe("rankBetween", () => {
  it("produces a rank between two values", () => {
    const mid = rankBetween("a", "z");
    expect(mid > "a").toBe(true);
    expect(mid < "z").toBe(true);
  });
});

describe("permissions", () => {
  it("merges role, custom role, and overrides", () => {
    const caps = resolveCapabilities({
      projectRole: "viewer",
      overrides: ["board.edit"],
      customRoleCapabilities: ["issue.create"],
    });
    expect(caps.has("project.view")).toBe(true);
    expect(caps.has("board.edit")).toBe(true);
    expect(caps.has("issue.create")).toBe(true);
  });
});
