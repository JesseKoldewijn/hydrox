import { Module } from "@nestjs/common";
import { Redis } from "ioredis";

export const REDIS = Symbol("HYDROX_REDIS");
export const SYNC_CHANNEL = "hydrox:sync";

@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? "redis://localhost:6379";
        return new Redis(url, { maxRetriesPerRequest: null });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
