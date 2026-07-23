import { describe, expect, it } from "vitest";

/**
 * Integration tests expect Compose infra (Postgres/Redis).
 * Run via: yarn test:integration (after docker:up)
 */
describe("api integration placeholder", () => {
  it("skips when DATABASE_URL is unset", () => {
    if (!process.env.DATABASE_URL) {
      expect(true).toBe(true);
      return;
    }
    expect(process.env.DATABASE_URL).toContain("postgres");
  });
});
