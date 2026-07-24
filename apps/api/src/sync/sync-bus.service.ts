import { Injectable } from "@nestjs/common";
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

  constructor() {
    this.local.setMaxListeners(100);
  }

  async publish(event: SyncPatchEvent) {
    this.local.emit("patch", normalizePatch(event));
  }

  onPatch(handler: (event: SyncPatchEvent) => void) {
    this.local.on("patch", handler);
    return () => this.local.off("patch", handler);
  }
}
