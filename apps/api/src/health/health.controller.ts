import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { DB } from "../db/db.module.js";
import type { HydroxDb } from "@hydrox/db";
import { REDIS } from "../redis/redis.module.js";
import { PROTOCOL_VERSION } from "@hydrox/contracts";

@Controller()
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: HydroxDb,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Liveness: process is up. */
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "hydrox-api",
      protocolVersion: PROTOCOL_VERSION,
      time: new Date().toISOString(),
    };
  }

  /** Readiness: Postgres + Redis are reachable. */
  @Get("ready")
  async ready() {
    const checks: Record<string, "ok" | "error"> = {
      postgres: "error",
      redis: "error",
    };

    try {
      await this.db.execute(sql`select 1`);
      checks.postgres = "ok";
    } catch {
      checks.postgres = "error";
    }

    try {
      const pong = await this.redis.ping();
      checks.redis = pong === "PONG" ? "ok" : "error";
    } catch {
      checks.redis = "error";
    }

    const ready = Object.values(checks).every((v) => v === "ok");
    const body = {
      status: ready ? "ready" : "not_ready",
      checks,
      time: new Date().toISOString(),
    };
    if (!ready) {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
