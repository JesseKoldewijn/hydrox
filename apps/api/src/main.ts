import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { existsSync } from "node:fs";
import type { Server as HttpServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppModule } from "./app.module.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, "../../..");
const webRoot = join(monorepoRoot, "apps/web");
const webDist = join(webRoot, "dist");

async function registerViteDev(app: NestFastifyApplication) {
  // Nest Fastify already registers middie — use app.use(), never @fastify/middie.
  const { createServer } = await import("vite");
  const httpServer = app.getHttpServer() as HttpServer;
  const vite = await createServer({
    configFile: join(webRoot, "vite.config.ts"),
    root: webRoot,
    cacheDir: join(webRoot, ".vite"),
    server: {
      middlewareMode: true,
      // Attach HMR websocket to Nest's HTTP server (Vite 8+: server.ws).
      ws: { server: httpServer },
    },
    // Avoid Vite SPA fallback capturing /trpc, /health, /ready.
    appType: "custom",
  });

  app.use((req: { url?: string }, res: unknown, next: (err?: unknown) => void) => {
    const path = (req.url ?? "").split("?")[0] ?? "";
    if (
      path.startsWith("/trpc") ||
      path === "/health" ||
      path === "/ready" ||
      path.startsWith("/health/") ||
      path.startsWith("/ready/")
    ) {
      return next();
    }
    return vite.middlewares(req, res, next);
  });

  // Transform and serve index.html for document navigations.
  const fastify = app.getHttpAdapter().getInstance();
  fastify.get("/", async (_req, reply) => {
    const { readFileSync } = await import("node:fs");
    const template = readFileSync(join(webRoot, "index.html"), "utf-8");
    const html = await vite.transformIndexHtml("/", template);
    return reply.type("text/html").send(html);
  });

  console.log(`Vite middleware mounted from ${webRoot}`);
}

async function registerStaticProd(app: NestFastifyApplication) {
  const fastify = app.getHttpAdapter().getInstance();
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

  // Init so Nest registers its middie clone and HTTP server exists for Vite HMR.
  await app.init();

  if (isDev) {
    await registerViteDev(app);
  } else {
    await registerStaticProd(app);
  }

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Hydrox listening on http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
