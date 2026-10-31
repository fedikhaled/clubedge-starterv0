// The behaviour every Grants store must have, as one test suite. A new store — the app's own
// table, a directory service, a SaaS role API — is proven by passing this rather than by review,
// and stores can't drift apart on what assigning the same role twice means:
//
//   describeGrantStore("postgres", (userId) => createDbGrants(db));
//
// It runs in Vitest, which is why it is a separate entry (`@clubedge/authorization/conformance`)
// that only tests import.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Grants } from "./types";

export interface ConformanceOptions {
  /** Skip the whole suite, for example when the store's server isn't reachable. */
  skip?: boolean | string;
  /** Per-test timeout in milliseconds, for stores behind a network round trip. Default 30s. */
  timeoutMs?: number;
}

/**
 * Gives a store for a user who has no roles yet. The ids are UUIDs because the app's user ids are,
 * and the factory gets one before the test runs, so a store with a foreign key can create the user
 * it needs first.
 */
export type GrantStoreFactory = (userId: string) => Grants | Promise<Grants>;

export function describeGrantStore(
  provider: string,
  create: GrantStoreFactory,
  options: ConformanceOptions = {},
) {
  const suite = options.skip ? describe.skip : describe;
  const timeout = options.timeoutMs ?? 30_000;

  suite(`${provider} grants`, () => {
    /** A user per test: a store that keeps rows between tests never sees the same id twice. */
    const newUser = () => randomUUID();

    it(
      "gives a user no roles until one is assigned",
      async () => {
        const userId = newUser();
        const grants = await create(userId);
        await expect(grants.rolesOf(userId)).resolves.toEqual([]);
      },
      timeout,
    );

    it(
      "assigns a role, and assigning it again changes nothing",
      async () => {
        const userId = newUser();
        const grants = await create(userId);
        await grants.assign(userId, "admin");
        await grants.assign(userId, "admin");
        expect(await grants.rolesOf(userId)).toEqual(["admin"]);
      },
      timeout,
    );

    it(
      "keeps several roles for one user, named in a stable order",
      async () => {
        const userId = newUser();
        const grants = await create(userId);
        await grants.assign(userId, "staff");
        await grants.assign(userId, "admin");
        expect(await grants.rolesOf(userId)).toEqual(["admin", "staff"]);
      },
      timeout,
    );

    it(
      "keeps each user's roles apart",
      async () => {
        const [ada, grace] = [newUser(), newUser()];
        const grants = await create(ada);
        await create(grace);
        await grants.assign(ada, "admin");
        expect(await grants.rolesOf(ada)).toEqual(["admin"]);
        expect(await grants.rolesOf(grace)).toEqual([]);
      },
      timeout,
    );

    it(
      "revokes one role and leaves the others",
      async () => {
        const userId = newUser();
        const grants = await create(userId);
        await grants.assign(userId, "admin");
        await grants.assign(userId, "staff");
        await grants.revoke(userId, "admin");
        expect(await grants.rolesOf(userId)).toEqual(["staff"]);
      },
      timeout,
    );

    it(
      "changes nothing when asked to revoke a role the user never had",
      async () => {
        const userId = newUser();
        const grants = await create(userId);
        await grants.assign(userId, "admin");
        await grants.revoke(userId, "staff");
        expect(await grants.rolesOf(userId)).toEqual(["admin"]);
      },
      timeout,
    );

    it(
      "assigns a revoked role again",
      async () => {
        const userId = newUser();
        const grants = await create(userId);
        await grants.assign(userId, "admin");
        await grants.revoke(userId, "admin");
        await grants.assign(userId, "admin");
        expect(await grants.rolesOf(userId)).toEqual(["admin"]);
      },
      timeout,
    );
  });
}
