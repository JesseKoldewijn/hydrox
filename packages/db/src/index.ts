import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";

export function createDb(connectionString: string) {
  const pool = mysql.createPool(connectionString);
  return drizzle(pool, { schema, mode: "default" });
}

export type HydroxDb = ReturnType<typeof createDb>;

export * from "./schema.js";
