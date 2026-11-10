import { err, ok } from "@clubedge/core";
import type {
  Action,
  Actor,
  Authorizer,
  Decision,
  Grants,
  Policies,
  Refusal,
  Resource,
} from "./types";

/**
 * The one place that answers "may this user do this?", in an order anyone can read.
 *
 * A request runs through the `"*"` policies, then those for its resource type, and the first with
 * an opinion decides. Nothing having an opinion denies it, so a table someone adds today is
 * already protected — which is the failure mode a starter has to survive: code that checks the
 * session but never asks whether this user may touch this row.
 *
 *   const authorizer = createAuthorizer({
 *     grants,
 *     policies: {
 *       document: [forRoles(["admin"]), forOwner("read", "update", "delete")],
 *     },
 *   });
 *   const allowed = await authorizer.require("update", document, actor);
 *   if (!allowed.ok) return errorResponse(allowed.error);
 */
export function createAuthorizer(config: { grants: Grants; policies: Policies }): Authorizer {
  const { grants, policies } = config;

  async function evaluate(
    action: Action,
    resource: Resource,
    actor?: Actor,
  ): Promise<{ allowed: boolean; decision: Decision }> {
    const roles = actor === undefined ? [] : await grants.rolesOf(actor.id);
    const decision: Decision = { actor, roles, action, resource };
    for (const policy of [...(policies["*"] ?? []), ...(policies[resource.type] ?? [])]) {
      const verdict = policy(decision);
      if (verdict !== undefined) return { allowed: verdict, decision };
    }
    return { allowed: false, decision };
  }

  return {
    can: async (action, resource, actor) => (await evaluate(action, resource, actor)).allowed,

    require: async (action, resource, actor) => {
      const { allowed, decision } = await evaluate(action, resource, actor);
      if (allowed) return ok(decision);
      // Nobody to allow is a different answer from a person refused: one is a sign-in, the other
      // is a "no", and an app maps them to 401 and 403.
      return err<Refusal>(actor === undefined ? "signed_out" : "denied");
    },

    roles: async (actor) => (actor === undefined ? [] : grants.rolesOf(actor.id)),
  };
}
