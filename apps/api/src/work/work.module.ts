import { Module } from "@nestjs/common";
import { WorkService } from "./work.service.js";
import { DbModule } from "../db/db.module.js";
import { SyncModule } from "../sync/sync.module.js";
import { SyncService } from "./sync.service.js";

@Module({
  imports: [DbModule, SyncModule],
  providers: [WorkService, SyncService],
  exports: [WorkService, SyncService, SyncModule],
})
export class WorkModule {}
