import { Module } from "@nestjs/common";
import { SyncBusService } from "./sync-bus.service.js";
import { RedisModule } from "./redis.module.js";

@Module({
  imports: [RedisModule],
  providers: [SyncBusService],
  exports: [SyncBusService, RedisModule],
})
export class RedisBusModule {}
