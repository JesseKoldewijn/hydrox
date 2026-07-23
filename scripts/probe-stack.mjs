#!/usr/bin/env node
/**
 * Probe Hydrox stack readiness.
 * Usage:
 *   node scripts/probe-stack.mjs
 *   node scripts/probe-stack.mjs --require-api --require-web
 *   node scripts/probe-stack.mjs --http-only   # API+web only (prod compose: DB/S3 not published)
 *
 * Exit 0 only when all required probes pass.
 */
import { Redis } from "ioredis";
import postgres from "postgres";
import { S3Client, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";

const args = new Set(process.argv.slice(2));
const httpOnly = args.has("--http-only");
const requireApi = args.has("--require-api") || args.has("--full") || httpOnly;
const requireWeb = args.has("--require-web") || args.has("--full") || httpOnly;
const probeInfra = !httpOnly;

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://hydrox:hydrox@localhost:5432/hydrox";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "http://localhost:4566";
const S3_BUCKET = process.env.S3_BUCKET ?? "hydrox";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";
const WEB_URL = process.env.WEB_URL ?? "http://127.0.0.1:5173";

const results = [];

function ok(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function probePostgres() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    await sql`select 1 as n`;
    ok("postgres", DATABASE_URL.replace(/:[^:@/]+@/, ":***@"));
  } catch (err) {
    fail("postgres", err instanceof Error ? err.message : String(err));
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function probeRedis() {
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    connectTimeout: 3000,
  });
  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong === "PONG") ok("redis", REDIS_URL);
    else fail("redis", `unexpected ping: ${pong}`);
  } catch (err) {
    fail("redis", err instanceof Error ? err.message : String(err));
  } finally {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  }
}

async function probeS3() {
  const client = new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "test",
    },
  });
  try {
    try {
      await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
      await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    }
    ok("s3", `${S3_ENDPOINT}/${S3_BUCKET}`);
  } catch (err) {
    fail("s3", err instanceof Error ? err.message : String(err));
  }
}

async function probeHttp(name, url, expectJsonStatus) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      fail(name, `HTTP ${res.status} for ${url}`);
      return;
    }
    if (expectJsonStatus) {
      const body = await res.json();
      if (body.status !== expectJsonStatus && body.ok !== true) {
        fail(name, `unexpected body: ${JSON.stringify(body)}`);
        return;
      }
    }
    ok(name, url);
  } catch (err) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
}

if (probeInfra) {
  await probePostgres();
  await probeRedis();
  await probeS3();
}

if (requireApi) {
  await probeHttp("api.health", `${API_URL}/health`, "ok");
  await probeHttp("api.ready", `${API_URL}/ready`, "ready");
  await probeHttp("api.trpc.health", `${API_URL}/trpc/health.ping`);
}

if (requireWeb) {
  await probeHttp("web", WEB_URL);
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\nProbe summary: ${results.length - failed.length}/${results.length} passed`,
);
process.exit(failed.length === 0 ? 0 : 1);
