import { Module } from "@nestjs/common";
import { WorkService } from "./work.service.js";
import { DbModule } from "../db/db.module.js";
import { RedisBusModule } from "../redis/redis-bus.module.js";
import { SyncService } from "./sync.service.js";

@Module({
  imports: [DbModule, RedisBusModule],
  providers: [WorkService, SyncService],
  exports: [WorkService, SyncService, RedisBusModule],
})
export class WorkModule {}
