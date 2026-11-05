import type { Action, Decision, Policy } from "./types";

/** Whether a rule written for some actions covers this one. Naming none means every action. */
function covers(listed: Action[], action: Action): boolean {
  return listed.length === 0 || listed.includes(action);
}

/**
 * Lets people act on what belongs to them: `forOwner("read", "update", "delete")`. It says nothing
 * about a resource nobody owns or a request from outside, so put the role rules before it.
 */
export function forOwner(...actions: Action[]): Policy {
  return (decision) => {
    const { actor, action, resource } = decision;
    if (!covers(actions, action) || actor === undefined || resource.ownerId == null)
      return undefined;
    if (actor.id === resource.ownerId) return true;
    return undefined;
  };
}

/** Lets a role act on anything of the type: `forRoles(["admin"])`, or with listed actions. */
export function forRoles(roles: string[], ...actions: Action[]): Policy {
  return (decision) => {
    if (!covers(actions, decision.action)) return undefined;
    if (decision.roles.some((role) => roles.includes(role))) return true;
    return undefined;
  };
}

/** Lets anyone signed in act, for a resource the whole product shares. */
export function forSignedIn(...actions: Action[]): Policy {
  return (decision) => {
    if (!covers(actions, decision.action) || decision.actor === undefined) return undefined;
    return true;
  };
}

/** Lets a signed-out visitor act too, for what is public: `forPublic("read")`. */
export function forPublic(...actions: Action[]): Policy {
  return (decision) => (covers(actions, decision.action) ? true : undefined);
}

/**
 * Denies before any allow is reached, for the exception a role rule can't express:
 * `unless((decision) => decision.roles.includes("frozen"), "update", "delete")`.
 */
export function unless(denyWhen: (decision: Decision) => boolean, ...actions: Action[]): Policy {
  return (decision) => {
    if (!covers(actions, decision.action) || !denyWhen(decision)) return undefined;
    return false;
  };
}
