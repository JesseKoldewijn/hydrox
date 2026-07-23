import { Injectable } from "@nestjs/common";
import { Input, Mutation, Query, Router, TrpcContext } from "@nest-native/trpc";
import { z } from "zod";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { pushSubscriptions, type HydroxDb } from "@hydrox/db";
import { Inject } from "@nestjs/common";
import { DB } from "../db/db.module.js";
import { WorkService } from "../work/work.service.js";
import type { TrpcContext as Ctx } from "./context.js";

@Router("notify")
@Injectable()
export class NotifyRouter {
  constructor(
    @Inject(DB) private readonly db: HydroxDb,
    private readonly work: WorkService,
  ) {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT ?? "mailto:admin@hydrox.local",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    }
  }

  @Query({
    output: z.object({ publicKey: z.string().nullable() }),
  })
  vapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
  }

  @Mutation({
    input: z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    }),
  })
  async subscribePush(
    @Input()
    input: { endpoint: string; keys: { p256dh: string; auth: string } },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.db.insert(pushSubscriptions).values({
      userId: ctx.user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    });
    return { ok: true as const };
  }

  @Query()
  async list(@TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listNotifications(ctx.user.id);
  }

  @Mutation({
    input: z.object({
      userId: z.string().uuid(),
      organizationId: z.string().uuid(),
      title: z.string(),
      body: z.string().optional(),
      type: z.string().default("info"),
    }),
  })
  async sendInApp(
    @Input()
    input: {
      userId: string;
      organizationId: string;
      title: string;
      body?: string;
      type: string;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const n = await this.work.createNotification({
      userId: input.userId,
      organizationId: input.organizationId,
      type: input.type,
      title: input.title,
      body: input.body,
    });

    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const subs = await this.db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, input.userId));
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({ title: input.title, body: input.body }),
          );
        } catch {
          // ignore dead subscriptions in v0
        }
      }
    }

    return n;
  }
}
