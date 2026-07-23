import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION } from "@hydrox/contracts";

describe("api smoke", () => {
  it("shares protocol version with contracts", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
