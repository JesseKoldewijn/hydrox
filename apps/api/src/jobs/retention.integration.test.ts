import { beforeAll, describe, expect, it } from "vitest";
import { createDb, auditEvents, organizations } from "@hydrox/db";
import { eq, sql } from "drizzle-orm";
import { RetentionJobsService } from "./jobs.module.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "mysql://hydrox:hydrox@127.0.0.1:3306/hydrox";

describe("retention jobs", () => {
  const db = createDb(DATABASE_URL);
  const jobs = new RetentionJobsService(db as never);

  beforeAll(async () => {
    await db.execute(sql`select 1`);
  });

  it("purges audit events older than retention window", async () => {
    const orgId = crypto.randomUUID();
    const oldId = crypto.randomUUID();
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await db.insert(organizations).values({
      id: orgId,
      name: "Retention Org",
      slug: `ret-${orgId.slice(0, 8)}`,
    });
    await db.insert(auditEvents).values({
      id: oldId,
      organizationId: orgId,
      action: "test.old",
      entityType: "issue",
      entityId: crypto.randomUUID(),
      metadata: { test: true },
    });
    await db.execute(
      sql`update audit_events set created_at = ${oldDate} where id = ${oldId}`,
    );
    const result = await jobs.purgeAuditEvents();
    expect(result.ok).toBe(true);
    const rows = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.id, oldId))
      .limit(1);
    expect(rows.length).toBe(0);
  });

  it("runs soft-delete force purge", async () => {
    const result = await jobs.runRetentionNow(true);
    expect(result.soft.ok).toBe(true);
    expect(result.soft.force).toBe(true);
  });
});
