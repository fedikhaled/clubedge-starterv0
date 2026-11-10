import type { Grants } from "./types";

/**
 * Roles held in this process, for tests and the demo build. A deployed app wants
 * `createDbGrants`: these roles disappear on restart and differ per replica.
 */
export function createMemoryGrants(initial: Record<string, string[]> = {}): Grants {
  const assigned = new Map<string, Set<string>>(
    Object.entries(initial).map(([userId, roles]) => [userId, new Set(roles)]),
  );
  return {
    async rolesOf(userId) {
      return [...(assigned.get(userId) ?? [])].sort();
    },
    async assign(userId, role) {
      const roles = assigned.get(userId) ?? new Set<string>();
      roles.add(role);
      assigned.set(userId, roles);
    },
    async revoke(userId, role) {
      assigned.get(userId)?.delete(role);
    },
  };
}
