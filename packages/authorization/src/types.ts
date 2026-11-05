import type { Result } from "@clubedge/core";

/**
 * Who is asking: the signed-in user's id, and nothing else. The app's user record and its auth
 * session both satisfy this, so no adapter stands between a route and a decision.
 */
export interface Actor {
  readonly id: string;
}

/** What they want to do. Naming every request with one of these keeps a policy readable. */
export type Action = "read" | "create" | "update" | "delete";

/** What they want to do it to. */
export interface Resource {
  /** "document", "task", ... The authorizer runs the policies written for this type. */
  readonly type: string;
  readonly id?: string;
  /**
   * Whose it is, when it is someone's. A rule like `forOwner()` only works with it, so read the
   * owner from the row you loaded rather than taking it from the request.
   */
  readonly ownerId?: string | null;
}

/** One policy's input, with the actor's roles already resolved. */
export interface Decision {
  readonly actor: Actor | undefined;
  readonly roles: readonly string[];
  readonly action: Action;
  readonly resource: Resource;
}

/**
 * A policy's answer: `true` allows and stops, `false` denies and stops, `undefined` means "not my
 * business" and lets the next policy decide.
 */
export type Verdict = boolean | undefined;

/**
 * A rule about one request. Policies stay synchronous because the roles are looked up once, before
 * any of them run: a rule that needs more than the decision should carry it in the resource.
 */
export type Policy = (decision: Decision) => Verdict;

/** Policies, grouped by the resource type they cover. `"*"` covers every type. */
export type Policies = Record<string, Policy[]>;

/** The roles each user holds, as one store per app: `createDbGrants`, or `createMemoryGrants`. */
export interface Grants {
  /** The user's roles, in a stable order, and empty for a user with none. */
  rolesOf(userId: string): Promise<readonly string[]>;
  /** Gives the user the role. Assigning one they already have changes nothing. */
  assign(userId: string, role: string): Promise<void>;
  /** Takes the role away. Revoking one they never had changes nothing. */
  revoke(userId: string, role: string): Promise<void>;
}

/** Why a request was refused, in the two kinds an app answers differently: 401, or 403. */
export type Refusal = "signed_out" | "denied";

/** The app's authorization layer, as its composition root hands it to routes and screens. */
export interface Authorizer {
  /** Whether to allow the request, for a screen that hides an action rather than blocks it. */
  can(action: Action, resource: Resource, actor?: Actor): Promise<boolean>;
  /**
   * The decision, or the refusal. On success the caller gets the roles that were looked up, so it
   * does not ask for them again.
   */
  require(action: Action, resource: Resource, actor?: Actor): Promise<Result<Decision, Refusal>>;
  /** The actor's roles, empty when signed out. */
  roles(actor?: Actor): Promise<readonly string[]>;
}
