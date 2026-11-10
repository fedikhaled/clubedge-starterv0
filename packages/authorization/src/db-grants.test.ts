import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { users, type Database } from "@clubedge/db";
import { describeGrantStore } from "./conformance";
import { createDbGrants } from "./db-grants";
import { userRoles } from "./schema";

const folder = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** A PostgreSQL (PGlite) with the app's and the authorization migrations applied. */
async function database() {
  const client = await PGlite.create();
  const db = drizzle({ client });
  await migrate(db, { migrationsFolder: folder("../../db/drizzle") });
  await migrate(db, {
    migrationsFolder: folder("../drizzle"),
    migrationsTable: "__drizzle_migrations_authorization",
  });
  // The query builder is the same as the postgres.js driver's that the app uses.
  return { client, db: db as unknown as Database };
}

let client: PGlite;
let db: Database;

// One database for the file: starting PGlite and migrating takes more than the default hook
// timeout on a busy CI runner.
beforeAll(async () => {
  ({ client, db } = await database());
}, 60_000);

afterAll(async () => {
  await client.close();
});

// A role names a user, so the store's users exist before their roles can.
describeGrantStore("postgres", async (userId) => {
  await db.insert(users).values({ id: userId, email: `${userId}@example.com` });
  return createDbGrants(db);
});

describe("postgres grants", () => {
  it("drops a user's roles when the user goes", async () => {
    const userId = randomUUID();
    await db.insert(users).values({ id: userId, email: `${userId}@example.com` });
    const grants = createDbGrants(db);
    await grants.assign(userId, "admin");
    expect(await grants.rolesOf(userId)).toEqual(["admin"]);

    await db.delete(users).where(eq(users.id, userId));
    const left = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    expect(left).toEqual([]);
  });

  it("keeps one row when a role is assigned twice", async () => {
    const userId = randomUUID();
    await db.insert(users).values({ id: userId, email: `${userId}@example.com` });
    const grants = createDbGrants(db);
    await grants.assign(userId, "admin");
    await grants.assign(userId, "admin");
    const rows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    expect(rows).toEqual([{ role: "admin" }]);
  });
});
