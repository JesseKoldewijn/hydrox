import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import path from "node:path";

const url =
  process.env.DATABASE_URL ?? "postgres://hydrox:hydrox@localhost:5432/hydrox";

async function main() {
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "drizzle",
  );
  await migrate(db, { migrationsFolder });
  await client.end();
  console.log("Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
