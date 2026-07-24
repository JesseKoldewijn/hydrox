import { describe, expect, it } from "vitest";
import { deepEqual } from "@hydrox/sync";

describe("web sync helpers", () => {
  it("uses shared deepEqual", () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
  });
});
