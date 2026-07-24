import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { and, inArray, isNotNull, lt } from "drizzle-orm";
import { AUDIT_RETENTION_DAYS } from "@hydrox/contracts";
import { auditEvents, issues, projects, comments, attachments, type HydroxDb } from "@hydrox/db";
import { DB } from "../db/db.module.js";
import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";

@Injectable()
export class RetentionJobsService {
  private readonly logger = new Logger(RetentionJobsService.name);

  constructor(@Inject(DB) private readonly db: HydroxDb) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduled() {
    await this.purgeAuditEvents();
    await this.purgeSoftDeleted(false);
  }

  async purgeAuditEvents() {
    const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await this.db.delete(auditEvents).where(lt(auditEvents.createdAt, cutoff));
    this.logger.log(`Purged audit events older than ${AUDIT_RETENTION_DAYS} days`);
    return { ok: true as const, cutoff };
  }

  /** Hard-delete soft-deleted rows older than 30 days (or immediately if force). */
  async purgeSoftDeleted(force: boolean) {
    const cutoff = force ? new Date() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Soft-deleted issues still referenced by live child rows — clear children first.
    const doomedIssues = await this.db
      .select({ id: issues.id })
      .from(issues)
      .where(and(isNotNull(issues.deletedAt), lt(issues.deletedAt, cutoff)));
    const issueIds = doomedIssues.map((r) => r.id);
    if (issueIds.length) {
      await this.db.delete(attachments).where(inArray(attachments.issueId, issueIds));
      await this.db.delete(comments).where(inArray(comments.issueId, issueIds));
    }

    await this.db
      .delete(comments)
      .where(and(isNotNull(comments.deletedAt), lt(comments.deletedAt, cutoff)));
    await this.db
      .delete(attachments)
      .where(and(isNotNull(attachments.deletedAt), lt(attachments.deletedAt, cutoff)));
    await this.db
      .delete(issues)
      .where(and(isNotNull(issues.deletedAt), lt(issues.deletedAt, cutoff)));
    await this.db
      .delete(projects)
      .where(and(isNotNull(projects.deletedAt), lt(projects.deletedAt, cutoff)));
    this.logger.log(`Soft-delete purge (force=${force}) complete`);
    return { ok: true as const, force, cutoff: cutoff.toISOString() };
  }

  /** Test/admin helper: run both purge passes once. */
  async runRetentionNow(force = false) {
    const audit = await this.purgeAuditEvents();
    const soft = await this.purgeSoftDeleted(force);
    return { audit, soft };
  }
}

@Module({
  imports: [DbModule],
  providers: [RetentionJobsService],
  exports: [RetentionJobsService],
})
export class JobsModule {}
