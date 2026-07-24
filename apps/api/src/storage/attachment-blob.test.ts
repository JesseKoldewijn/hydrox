import { describe, expect, it } from "vitest";

describe("attachment blob encoding", () => {
  it("round-trips base64", () => {
    const original = Buffer.from("hydrox-attachment-bytes");
    const dataBase64 = original.toString("base64");
    const restored = Buffer.from(dataBase64, "base64");
    expect(restored.equals(original)).toBe(true);
    expect(restored.length).toBe(original.length);
  });
});
