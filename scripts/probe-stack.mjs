#!/usr/bin/env node
/**
 * Probe Hydrox stack readiness.
 * Usage:
 *   node scripts/probe-stack.mjs
 *   node scripts/probe-stack.mjs --require-api --require-web
 *   node scripts/probe-stack.mjs --http-only   # app HTTP only (prod: MySQL not published)
 *
 * Exit 0 only when all required probes pass.
 */
import mysql from "mysql2/promise";

const args = new Set(process.argv.slice(2));
const httpOnly = args.has("--http-only");
const requireApi = args.has("--require-api") || args.has("--full") || httpOnly;
const requireWeb = args.has("--require-web") || args.has("--full") || httpOnly;
const probeInfra = !httpOnly;

const DATABASE_URL = process.env.DATABASE_URL ?? "mysql://hydrox:hydrox@127.0.0.1:3306/hydrox";
const APP_URL =
  process.env.APP_URL ?? process.env.API_URL ?? process.env.WEB_URL ?? "http://127.0.0.1:3000";

const results = [];

function ok(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function probeMysql() {
  let conn;
  try {
    conn = await mysql.createConnection(DATABASE_URL);
    await conn.query("select 1 as n");
    ok("mysql", DATABASE_URL.replace(/:[^:@/]+@/, ":***@"));
  } catch (err) {
    fail("mysql", err instanceof Error ? err.message : String(err));
  } finally {
    await conn?.end().catch(() => {});
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
  await probeMysql();
}

if (requireApi) {
  await probeHttp("app.health", `${APP_URL}/health`, "ok");
  await probeHttp("app.ready", `${APP_URL}/ready`, "ready");
  await probeHttp("app.trpc.health", `${APP_URL}/trpc/health.ping`);
}

if (requireWeb) {
  await probeHttp("app.web", APP_URL);
}

const failed = results.filter((r) => !r.ok);
console.log(`\nProbe summary: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
