import { and, eq } from "drizzle-orm";
import type { Database } from "@clubedge/db";
import { userRoles } from "./schema";
import type { Grants } from "./types";

/** The roles in the app's own tables, so every replica of the app sees the same ones. */
export function createDbGrants(db: Database): Grants {
  return {
    async rolesOf(userId) {
      const rows = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, userId));
      return rows.map((row) => row.role).sort();
    },
    async assign(userId, role) {
      await db.insert(userRoles).values({ userId, role }).onConflictDoNothing();
    },
    async revoke(userId, role) {
      await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)));
    },
  };
}
