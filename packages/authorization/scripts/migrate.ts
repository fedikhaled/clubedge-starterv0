import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "@clubedge/db";
import { requireDirectDatabaseUrl } from "@clubedge/db/load-env";

const db = createDb({ url: requireDirectDatabaseUrl("run authorization migrations") });
try {
  await migrate(db, {
    migrationsFolder: "./drizzle",
    migrationsTable: "__drizzle_migrations_authorization",
  });
  console.info("Authorization migrations applied.");
} finally {
  await db.$client.end();
}
