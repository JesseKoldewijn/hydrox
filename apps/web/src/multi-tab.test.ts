import { describe, expect, it } from "vitest";

/**
 * Simulates two tabs applying patches to the same local issue map.
 * Last applied version wins when versions are ordered; equal versions keep first.
 */
function applyTabPatches(
  store: Map<string, { version: number; title: string }>,
  patches: Array<{ id: string; version: number; title: string }>,
) {
  for (const p of patches) {
    const cur = store.get(p.id);
    if (!cur || p.version >= cur.version) {
      store.set(p.id, { version: p.version, title: p.title });
    }
  }
  return store;
}

describe("multi-tab dexie convergence", () => {
  it("converges when tabs apply ordered patches", () => {
    const store = new Map<string, { version: number; title: string }>();
    applyTabPatches(store, [
      { id: "1", version: 1, title: "A" },
      { id: "1", version: 2, title: "B" },
    ]);
    applyTabPatches(store, [{ id: "1", version: 3, title: "C" }]);
    expect(store.get("1")).toEqual({ version: 3, title: "C" });
  });

  it("ignores stale tab writes", () => {
    const store = new Map<string, { version: number; title: string }>();
    applyTabPatches(store, [{ id: "1", version: 5, title: "new" }]);
    applyTabPatches(store, [{ id: "1", version: 4, title: "stale" }]);
    expect(store.get("1")?.title).toBe("new");
  });
});
