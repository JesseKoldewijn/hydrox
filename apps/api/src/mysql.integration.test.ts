import { beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@hydrox/db";
import { sql } from "drizzle-orm";
import { AuthService } from "./auth/auth.service.js";
import { SyncBusService } from "./sync/sync-bus.service.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "mysql://hydrox:hydrox@127.0.0.1:3306/hydrox";

describe("mysql integration", () => {
  const db = createDb(DATABASE_URL);
  const auth = new AuthService(db as never);

  beforeAll(async () => {
    await db.execute(sql`select 1`);
  });

  it("registers a password user", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const result = await auth.register({
      email: `u-${suffix}@example.com`,
      username: `user_${suffix}`,
      password: "password123",
      displayName: "Test User",
    });
    expect(result.token).toBeTruthy();
    expect(result.user.username).toBe(`user_${suffix}`);
    const me = await auth.userFromToken(result.token);
    expect(me?.email).toBe(`u-${suffix}@example.com`);
  });

  it("sync bus is in-memory", async () => {
    const bus = new SyncBusService();
    let got = "";
    bus.onPatch((e) => {
      got = e.entityId;
    });
    await bus.publish({
      type: "entity.patch",
      entityType: "issue",
      entityId: "00000000-0000-4000-8000-0000000000ab",
      version: 2,
      fields: { title: "x" },
      deletedAt: null,
      updatedAt: new Date(),
      updatedById: null,
    });
    expect(got).toBe("00000000-0000-4000-8000-0000000000ab");
  });
});
