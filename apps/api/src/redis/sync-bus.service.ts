import { Injectable, Inject } from "@nestjs/common";
import { Redis } from "ioredis";
import { REDIS, SYNC_CHANNEL } from "./redis.module.js";
import type { SyncPatchEvent } from "@hydrox/contracts";
import { EventEmitter } from "node:events";

function normalizePatch(event: SyncPatchEvent): SyncPatchEvent {
  return {
    type: "entity.patch",
    entityType: event.entityType,
    entityId: event.entityId,
    version: event.version,
    fields: event.fields ?? {},
    deletedAt: event.deletedAt ? new Date(event.deletedAt) : null,
    updatedAt: new Date(event.updatedAt),
    updatedById: event.updatedById ?? null,
  };
}

@Injectable()
export class SyncBusService {
  private readonly local = new EventEmitter();
  private subscriber: Redis | null = null;

  constructor(@Inject(REDIS) private readonly redis: Redis) {
    this.local.setMaxListeners(100);
    this.subscriber = this.redis.duplicate();
    void this.subscriber.subscribe(SYNC_CHANNEL);
    this.subscriber.on("message", (channel: string, message: string) => {
      if (channel !== SYNC_CHANNEL) return;
      try {
        const parsed = JSON.parse(message) as SyncPatchEvent;
        if (parsed?.type !== "entity.patch" || !parsed.entityId) return;
        this.local.emit("patch", normalizePatch(parsed));
      } catch {
        // ignore malformed
      }
    });
  }

  async publish(event: SyncPatchEvent) {
    const normalized = normalizePatch(event);
    // Serialize dates for Redis; fan-in via subscriber (avoids double local emit).
    const payload = JSON.stringify({
      ...normalized,
      updatedAt: normalized.updatedAt.toISOString(),
      deletedAt: normalized.deletedAt
        ? normalized.deletedAt.toISOString()
        : null,
    });
    await this.redis.publish(SYNC_CHANNEL, payload);
  }

  onPatch(handler: (event: SyncPatchEvent) => void) {
    this.local.on("patch", handler);
    return () => this.local.off("patch", handler);
  }
}
