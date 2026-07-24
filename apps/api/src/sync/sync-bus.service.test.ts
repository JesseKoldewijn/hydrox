import { describe, expect, it, vi } from "vitest";
import { SyncBusService } from "./sync-bus.service.js";

describe("SyncBusService", () => {
  it("fans out patches in-process", async () => {
    const bus = new SyncBusService();
    const seen: string[] = [];
    const off = bus.onPatch((event) => {
      seen.push(event.entityId);
    });
    await bus.publish({
      type: "entity.patch",
      entityType: "issue",
      entityId: "issue-1",
      version: 1,
      fields: { title: "Hello" },
      deletedAt: null,
      updatedAt: new Date(),
      updatedById: null,
    });
    expect(seen).toEqual(["issue-1"]);
    off();
  });

  it("unsubscribe stops delivery", async () => {
    const bus = new SyncBusService();
    const handler = vi.fn();
    const off = bus.onPatch(handler);
    off();
    await bus.publish({
      type: "entity.patch",
      entityType: "issue",
      entityId: "issue-2",
      version: 1,
      fields: {},
      deletedAt: null,
      updatedAt: new Date(),
      updatedById: null,
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
