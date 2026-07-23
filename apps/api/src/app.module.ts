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
          const cookies = req.cookies ?? {};
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
              setCookie: (name: string, value: string, opts?: object) => {
                if (typeof res.setCookie === "function") {
                  res.setCookie(name, value, opts);
                } else if (typeof res.cookie === "function") {
                  res.cookie(name, value, opts);
                }
              },
              clearCookie: (name: string) => {
                if (typeof res.clearCookie === "function") {
                  res.clearCookie(name);
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
})
export class AppModule {}
