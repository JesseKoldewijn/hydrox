import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Requires Compose infra (MySQL).
 * Skip when SKIP_STACK_PROBE=1.
 */
describe("stack probe", () => {
  it("probes mysql", async () => {
    if (process.env.SKIP_STACK_PROBE === "1") return;
    const script = resolve(process.cwd(), "../../scripts/probe-stack.mjs");
    const result = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: process.env,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PASS  mysql");
  });
});
