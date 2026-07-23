import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppModule } from "./app.module.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, "../../..");
const webRoot = join(monorepoRoot, "apps/web");
const webDist = join(webRoot, "dist");

async function registerSpa(app: NestFastifyApplication, isDev: boolean) {
  const fastify = app.getHttpAdapter().getInstance();

  if (isDev) {
    const middie = (await import("@fastify/middie")).default;
    const { createServer } = await import("vite");
    await fastify.register(middie);
    const vite = await createServer({
      configFile: join(webRoot, "vite.config.ts"),
      root: webRoot,
      server: { middlewareMode: true },
      appType: "spa",
    });
    fastify.use(vite.middlewares);
    console.log(`Vite middleware mounted from ${webRoot}`);
    return;
  }

  if (!existsSync(webDist)) {
    console.warn(
      `Web dist not found at ${webDist}; SPA static serving disabled`,
    );
    return;
  }

  const fastifyStatic = (await import("@fastify/static")).default;
  await fastify.register(fastifyStatic, {
    root: webDist,
    wildcard: false,
  });
  // SPA fallback without setNotFoundHandler (Nest owns that):
  // unknown GET paths without a file extension return index.html.
  fastify.addHook("onRequest", async (req, reply) => {
    if (req.method !== "GET" && req.method !== "HEAD") return;
    const url = (req.url.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
    if (
      url.startsWith("/trpc") ||
      url === "/health" ||
      url === "/ready" ||
      url.includes(".")
    ) {
      return;
    }
    if (url === "/") return; // @fastify/static serves index.html
    return reply.sendFile("index.html");
  });
  console.log(`Serving SPA from ${webDist}`);
}

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== "production";
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      routerOptions: { maxParamLength: 5000 },
    }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  const origin = process.env.WEB_ORIGIN ?? true;
  await fastify.register(cors, {
    origin,
    credentials: true,
  });
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? "hydrox-dev-cookie-secret-change-me",
  });

  await registerSpa(app, isDev);

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Hydrox listening on http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
