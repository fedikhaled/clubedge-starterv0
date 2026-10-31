import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@clubedge/db";

/**
 * Which user holds which role: one row per pair, so a user with no rows has no roles and deleting
 * the user deletes their roles.
 *
 * A role is plain text rather than an enum or a join table of role records, so a project adds
 * "moderator" with an INSERT and no migration. The policies name the roles they check; the app's
 * seed and its admin screens decide who holds them.
 */
export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
    // Which users hold a role, which is what an admin screen asks and what a broadcast job needs.
    index("user_roles_role_idx").on(table.role),
  ],
);

export type UserRoleRow = typeof userRoles.$inferSelect;
