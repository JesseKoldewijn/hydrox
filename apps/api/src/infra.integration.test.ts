import { describe, expect, it } from "vitest";
import { createDb } from "@hydrox/db";
import { sql } from "drizzle-orm";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "mysql://hydrox:hydrox@127.0.0.1:3306/hydrox";

describe("infra mysql", () => {
  const db = createDb(DATABASE_URL);

  it("connects and selects", async () => {
    const result = await db.execute(sql`select 1 as n`);
    expect(result).toBeTruthy();
  });
});
