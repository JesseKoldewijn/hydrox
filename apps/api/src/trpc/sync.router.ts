import { Injectable } from "@nestjs/common";
import {
  Input,
  Mutation,
  Query,
  Router,
  Subscription,
  TrpcContext,
} from "@nest-native/trpc";
import { z } from "zod";
import {
  syncPatchEventSchema,
  syncPullRequestSchema,
  syncPushRequestSchema,
  syncPushResultSchema,
} from "@hydrox/contracts";
import { SyncService } from "../work/sync.service.js";
import type { TrpcContext as Ctx } from "./context.js";
import { observable } from "@trpc/server/observable";

@Router("sync")
@Injectable()
export class SyncRouter {
  constructor(private readonly sync: SyncService) {}

  @Mutation({
    input: syncPushRequestSchema,
    output: syncPushResultSchema,
  })
  async push(
    @Input() input: z.infer<typeof syncPushRequestSchema>,
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.sync.push(ctx.user.id, input.ops);
  }

  @Query({ input: syncPullRequestSchema })
  async pull(
    @Input() input: z.infer<typeof syncPullRequestSchema>,
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.sync.pull(input.since, input.projectIds);
  }

  @Subscription({
    output: syncPatchEventSchema,
  })
  onPatch(@TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return observable<z.infer<typeof syncPatchEventSchema>>((emit) => {
      const off = this.sync.onPatches((event) => {
        emit.next(event);
      });
      return () => off();
    });
  }
}
