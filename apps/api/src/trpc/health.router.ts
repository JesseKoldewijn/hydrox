import { Injectable } from "@nestjs/common";
import { Query, Router } from "@nest-native/trpc";
import { z } from "zod";
import { PROTOCOL_VERSION } from "@hydrox/contracts";

@Router("health")
@Injectable()
export class HealthRouter {
  @Query({
    output: z.object({
      ok: z.boolean(),
      protocolVersion: z.number(),
      time: z.string(),
    }),
  })
  ping() {
    return {
      ok: true,
      protocolVersion: PROTOCOL_VERSION,
      time: new Date().toISOString(),
    };
  }
}
