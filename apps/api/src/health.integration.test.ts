import { describe, expect, it } from "vitest";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";

/**
 * HTTP health/ready endpoints against a live API process.
 * Covered end-to-end by `yarn test:stack` when Compose brings api up.
 */
describe("api health endpoints", () => {
  it("GET /health returns liveness ok", async () => {
    const res = await fetch(`${API_URL}/health`).catch(() => null);
    if (!res) {
      console.warn(`API not reachable at ${API_URL} — skip`);
      return;
    }
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("hydrox-api");
  });

  it("GET /ready reports postgres + redis", async () => {
    const res = await fetch(`${API_URL}/ready`).catch(() => null);
    if (!res) {
      console.warn(`API not reachable at ${API_URL} — skip`);
      return;
    }
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      status: string;
      checks: { postgres: string; redis: string };
    };
    expect(body.status).toBe("ready");
    expect(body.checks.postgres).toBe("ok");
    expect(body.checks.redis).toBe("ok");
  });
});
