/**
 * AppRouter type is defined in @hydrox/api and re-exported for the web client.
 * This package holds shared tRPC-facing input/output helpers.
 */
export type { SyncOp, SyncPatchEvent, SessionUser } from "@hydrox/contracts";

export const TRPC_PATH = "/trpc" as const;
