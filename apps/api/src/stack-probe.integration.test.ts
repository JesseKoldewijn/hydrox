import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function runProbe(args: string[] = []) {
  return new Promise<{ code: number; stdout: string; stderr: string }>(
    (resolve) => {
      const child = spawn(
        process.execPath,
        [path.join(root, "scripts/probe-stack.mjs"), ...args],
        {
          cwd: root,
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => {
        stdout += String(d);
      });
      child.stderr.on("data", (d) => {
        stderr += String(d);
      });
      child.on("close", (code) => {
        resolve({ code: code ?? 1, stdout, stderr });
      });
    },
  );
}

/**
 * Requires Compose infra (postgres/redis/localstack).
 * Optionally probes a live API when API_URL responds on /health.
 */
describe("stack probe", () => {
  it("probes postgres, redis, and s3", async () => {
    const result = await runProbe([]);
    expect(result.code, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("PASS  postgres");
    expect(result.stdout).toContain("PASS  redis");
    expect(result.stdout).toContain("PASS  s3");
  });

  it("probes api health/ready when API is reachable", async () => {
    const apiUrl = process.env.API_URL ?? "http://127.0.0.1:3001";
    const health = await fetch(`${apiUrl}/health`).catch(() => null);
    if (!health?.ok) {
      console.warn(`API not reachable at ${apiUrl}/health — skip HTTP probes`);
      return;
    }
    const result = await runProbe(["--require-api"]);
    expect(result.code, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("PASS  api.health");
    expect(result.stdout).toContain("PASS  api.ready");
  });
});
