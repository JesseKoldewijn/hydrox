import { describe, expect, it, beforeAll } from "vitest";
import { createDb, users } from "@hydrox/db";
import { eq } from "drizzle-orm";
import { Redis } from "ioredis";
import { S3Client, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { mergeFields } from "@hydrox/sync";
import { formatIssueKey } from "@hydrox/domain";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://hydrox:hydrox@localhost:5432/hydrox";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "http://localhost:4566";

describe("infra integration", () => {
  const db = createDb(DATABASE_URL);
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
  });

  it("writes and reads postgres", async () => {
    const id = crypto.randomUUID();
    await db.insert(users).values({
      id,
      email: `it-${id.slice(0, 8)}@hydrox.test`,
      username: `u_${id.slice(0, 8)}`,
      displayName: "Integration User",
    });
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    expect(row?.displayName).toBe("Integration User");
  });

  it("publishes and receives redis messages", async () => {
    const channel = "hydrox:itest";
    const payload = `ping-${Date.now()}`;
    const sub = redis.duplicate();
    await sub.connect();
    await sub.subscribe(channel);
    const received = new Promise<string>((resolve) => {
      sub.on("message", (_ch, message) => resolve(message));
    });
    await redis.publish(channel, payload);
    await expect(received).resolves.toBe(payload);
    await sub.quit();
  }, 10_000);

  it("ensures s3 bucket exists", async () => {
    const client = new S3Client({
      region: "us-east-1",
      endpoint: S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "test",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "test",
      },
    });
    const bucket = process.env.S3_BUCKET ?? "hydrox";
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    }
    expect(bucket).toBe("hydrox");
  });

  it("domain + sync helpers still hold against live stack", () => {
    expect(formatIssueKey("HYDX", 1)).toBe("HYDX-1");
    const merged = mergeFields({
      server: { title: "A" },
      serverVersion: 1,
      patches: [{ field: "title", value: "B", baseVersion: 1 }],
    });
    expect(merged.kind).toBe("merged");
  });
});
