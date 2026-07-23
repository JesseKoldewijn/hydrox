import { Injectable } from "@nestjs/common";
import { Router } from "@nest-native/trpc";
import { HealthRouter } from "./health.router.js";
import { AuthRouter } from "./auth.router.js";
import { SyncRouter } from "./sync.router.js";
import { WorkRouter } from "./work.router.js";
import { NotifyRouter } from "./notify.router.js";
import { AdminRouter } from "./admin.router.js";

/**
 * Root composition router — nest-native discovers nested routers via providers.
 * AppRouter type is emitted to src/@generated/server.ts via autoSchemaFile.
 */
@Router()
@Injectable()
export class AppRouter {
  constructor(
    private readonly health: HealthRouter,
    private readonly auth: AuthRouter,
    private readonly sync: SyncRouter,
    private readonly work: WorkRouter,
    private readonly notify: NotifyRouter,
    private readonly admin: AdminRouter,
  ) {}
}
