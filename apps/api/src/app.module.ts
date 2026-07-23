import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TrpcModule } from "@nest-native/trpc";
import { join } from "node:path";
import { HealthRouter } from "./trpc/health.router.js";
import { AuthRouter } from "./trpc/auth.router.js";
import { SyncRouter } from "./trpc/sync.router.js";
import { WorkRouter } from "./trpc/work.router.js";
import { NotifyRouter } from "./trpc/notify.router.js";
import { AdminRouter } from "./trpc/admin.router.js";
import { AppRouter } from "./trpc/app.router.js";
import { DbModule } from "./db/db.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { RedisBusModule } from "./redis/redis-bus.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { WorkModule } from "./work/work.module.js";
import { AuthService } from "./auth/auth.service.js";
import { extractToken, SESSION_COOKIE } from "./trpc/context.js";
import { HealthController } from "./health/health.controller.js";

function parseCookieHeader(header: unknown): Record<string, string> {
  if (typeof header !== "string" || !header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    out[key] = value;
  }
  return out;
}
@Module({
  imports: [
    ScheduleModule.forRoot(),
    DbModule,
    AuthModule,
    RedisModule,
    RedisBusModule,
    StorageModule,
    JobsModule,
    WorkModule,
    TrpcModule.forRootAsync({
      imports: [AuthModule],
      inject: [AuthService],
      useFactory: (auth: AuthService) => ({
        path: "/trpc",
        autoSchemaFile: join(process.cwd(), "src/@generated/server.ts"),
        createContext: async ({ req, res }: { req: any; res: any }) => {
          const cookies = {
            ...(req.cookies ?? {}),
            ...parseCookieHeader(req.headers?.cookie),
          };
          const token = extractToken({
            headers: req.headers ?? {},
            cookies,
          });
          const user = await auth.userFromToken(token);
          return {
            req: {
              headers: req.headers ?? {},
              cookies,
            },
            res: {
              setCookie: (name: string, value: string, opts?: Record<string, unknown>) => {
                if (typeof res?.setCookie === "function") {
                  res.setCookie(name, value, opts);
                  return;
                }
                // Node/Fastify raw reply or ServerResponse
                const reply = res?.raw ?? res;
                if (typeof reply?.setHeader === "function") {
                  const attrs = [
                    `${name}=${encodeURIComponent(value)}`,
                    `Path=${(opts?.path as string) ?? "/"}`,
                    "HttpOnly",
                    `SameSite=${(opts?.sameSite as string) ?? "Lax"}`,
                  ];
                  if (typeof opts?.maxAge === "number") {
                    attrs.push(`Max-Age=${opts.maxAge}`);
                  }
                  const prev = reply.getHeader?.("Set-Cookie");
                  const next = Array.isArray(prev)
                    ? [...prev, attrs.join("; ")]
                    : prev
                      ? [String(prev), attrs.join("; ")]
                      : attrs.join("; ");
                  reply.setHeader("Set-Cookie", next);
                }
              },
              clearCookie: (name: string) => {
                if (typeof res?.clearCookie === "function") {
                  res.clearCookie(name);
                  return;
                }
                const reply = res?.raw ?? res;
                if (typeof reply?.setHeader === "function") {
                  reply.setHeader(
                    "Set-Cookie",
                    `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
                  );
                }
              },
            },
            user,
            auth,
            sessionCookie: SESSION_COOKIE,
          };
        },
      }),
    }),
  ],
  providers: [
    AppRouter,
    HealthRouter,
    AuthRouter,
    SyncRouter,
    WorkRouter,
    NotifyRouter,
    AdminRouter,
  ],
  controllers: [HealthController],
})
export class AppModule {}
