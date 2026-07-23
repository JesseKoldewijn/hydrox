import { Inject, Injectable } from "@nestjs/common";
import { Input, Mutation, Router, TrpcContext } from "@nest-native/trpc";
import { z } from "zod";
import { RetentionJobsService } from "../jobs/jobs.module.js";
import type { TrpcContext as Ctx } from "./context.js";

@Router("admin")
@Injectable()
export class AdminRouter {
  constructor(
    @Inject(RetentionJobsService) private readonly jobs: RetentionJobsService,
  ) {}

  @Mutation({
    input: z.object({ force: z.boolean().default(false) }),
  })
  async triggerPurge(
    @Input() input: { force: boolean },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    // Capability check is enforced at org admin UI layer; service still requires auth
    await this.jobs.purgeAuditEvents();
    return this.jobs.purgeSoftDeleted(input.force);
  }
}
