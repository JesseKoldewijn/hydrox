import { Injectable, Inject } from "@nestjs/common";
import { Redis } from "ioredis";
import { REDIS, SYNC_CHANNEL } from "./redis.module.js";
import type { SyncPatchEvent } from "@hydrox/contracts";
import { EventEmitter } from "node:events";

@Injectable()
export class SyncBusService {
  private readonly local = new EventEmitter();
  private subscriber: Redis | null = null;

  constructor(@Inject(REDIS) private readonly redis: Redis) {
    this.subscriber = this.redis.duplicate();
    void this.subscriber.subscribe(SYNC_CHANNEL);
    this.subscriber.on("message", (channel: string, message: string) => {
      if (channel !== SYNC_CHANNEL) return;
      try {
        const event = JSON.parse(message) as SyncPatchEvent;
        this.local.emit("patch", event);
      } catch {
        // ignore malformed
      }
    });
  }

  async publish(event: SyncPatchEvent) {
    await this.redis.publish(SYNC_CHANNEL, JSON.stringify(event));
    this.local.emit("patch", event);
  }

  onPatch(handler: (event: SyncPatchEvent) => void) {
    this.local.on("patch", handler);
    return () => this.local.off("patch", handler);
  }
}
