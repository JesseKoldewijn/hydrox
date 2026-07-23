import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";
import path from "node:path";

const url =
  process.env.DATABASE_URL ?? "mysql://hydrox:hydrox@127.0.0.1:3306/hydrox";

async function main() {
  const connection = await mysql.createConnection(url);
  const db = drizzle(connection);
  const migrationsFolder = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "drizzle",
  );
  await migrate(db, { migrationsFolder });
  await connection.end();
  console.log("Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
