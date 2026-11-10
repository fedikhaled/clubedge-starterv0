import { defineConfig } from "drizzle-kit";
import { requireDirectDatabaseUrl } from "@clubedge/db/load-env";

// Roles keep their own migration history, separate from the app's tables in @clubedge/db, so a
// project that grows its own way can drop this module without untangling the app's migrations.
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  migrations: { table: "__drizzle_migrations_authorization" },
  dbCredentials: { url: requireDirectDatabaseUrl("run drizzle-kit") },
});
