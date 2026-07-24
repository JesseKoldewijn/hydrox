import { Module } from "@nestjs/common";
import { SyncBusService } from "./sync-bus.service.js";

@Module({
  providers: [SyncBusService],
  exports: [SyncBusService],
})
export class SyncModule {}
