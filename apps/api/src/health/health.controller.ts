import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { HydroxDb } from "@hydrox/db";
import { PROTOCOL_VERSION } from "@hydrox/contracts";

@Controller()
export class HealthController {
  constructor(@Inject(DB) private readonly db: HydroxDb) {}

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

  /** Readiness: MySQL is reachable. */
  @Get("ready")
  async ready() {
    const checks: Record<string, "ok" | "error"> = {
      mysql: "error",
    };

    try {
      await this.db.execute(sql`select 1`);
      checks.mysql = "ok";
    } catch {
      checks.mysql = "error";
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
