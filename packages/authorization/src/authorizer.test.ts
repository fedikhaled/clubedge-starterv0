import { describe, expect, it } from "vitest";
import { createAuthorizer } from "./authorizer";
import { createMemoryGrants } from "./grants";
import { forOwner, forPublic, forRoles, forSignedIn, unless } from "./policies";
import type { Actor, Policies, Resource } from "./types";

const ada: Actor = { id: "ada" };
const grace: Actor = { id: "grace" };
const frozen: Actor = { id: "frozen" };

const grants = createMemoryGrants({
  [ada.id]: ["staff"],
  [grace.id]: ["admin"],
  [frozen.id]: ["staff", "frozen"],
});

const policies: Policies = {
  "*": [unless((decision) => decision.roles.includes("frozen"), "update", "delete")],
  document: [forRoles(["admin"], "delete"), forOwner("read", "update", "delete")],
  post: [forPublic("read"), forSignedIn("create")],
};

const authorizer = createAuthorizer({ grants, policies });

const document = (ownerId?: string): Resource => ({ type: "document", id: "doc-1", ownerId });

describe("the authorizer", () => {
  it("denies a resource its policies never mention", async () => {
    expect(await authorizer.can("read", { type: "invoice", id: "inv-1" }, grace)).toBe(false);
    expect(await authorizer.require("read", { type: "invoice" }, grace)).toEqual({
      ok: false,
      error: "denied",
    });
  });

  it("lets the owner read, update and delete their own", async () => {
    expect(await authorizer.can("read", document(ada.id), ada)).toBe(true);
    expect(await authorizer.can("update", document(ada.id), ada)).toBe(true);
    expect(await authorizer.can("delete", document(ada.id), ada)).toBe(true);
  });

  it("denies someone else's, even to a member of staff", async () => {
    expect(await authorizer.can("read", document(grace.id), ada)).toBe(false);
    expect(await authorizer.can("update", document(grace.id), ada)).toBe(false);
  });

  it("lets a role reach beyond ownership, only for the actions it names", async () => {
    expect(await authorizer.can("delete", document(ada.id), grace)).toBe(true);
    // Admin is a delete rule: reaching into someone's document to edit it is still a no.
    expect(await authorizer.can("update", document(ada.id), grace)).toBe(false);
  });

  it("denies what a first rule blocks before a later one allows", async () => {
    // The frozen account owns the document and is staff, so two rules would let it through.
    expect(await authorizer.can("update", document(frozen.id), frozen)).toBe(false);
    expect(await authorizer.can("delete", document(frozen.id), frozen)).toBe(false);
    expect(await authorizer.can("read", document(frozen.id), frozen)).toBe(true);
  });

  it("refuses a request from nobody, as a sign-in rather than a no", async () => {
    expect(await authorizer.require("read", document(ada.id))).toEqual({
      ok: false,
      error: "signed_out",
    });
    expect(await authorizer.can("read", document(ada.id))).toBe(false);
  });

  it("applies the rules for a shared resource to everyone", async () => {
    const post: Resource = { type: "post", id: "post-1" };
    expect(await authorizer.can("read", post)).toBe(true);
    expect(await authorizer.can("create", post)).toBe(false);
    expect(await authorizer.can("create", post, ada)).toBe(true);
    // ...and nothing else: a post belongs to no one, so even its author cannot edit it.
    expect(await authorizer.can("update", post, ada)).toBe(false);
  });

  it("hands back the roles it looked up, so the caller asks once", async () => {
    const allowed = await authorizer.require("read", document(ada.id), ada);
    expect(allowed.ok).toBe(true);
    if (!allowed.ok) return;
    expect(allowed.value.roles).toEqual(["staff"]);
    expect(allowed.value.actor).toBe(ada);
    expect(allowed.value.action).toBe("read");
  });

  it("reads roles for a signed-in actor and none for an anonymous one", async () => {
    expect(await authorizer.roles(grace)).toEqual(["admin"]);
    expect(await authorizer.roles()).toEqual([]);
  });

  it("lets the store decide live, after a role changes", async () => {
    const own = document(ada.id);
    expect(await authorizer.can("update", own, grace)).toBe(false);
    await grants.assign(grace.id, "staff");
    expect(await authorizer.can("update", own, grace)).toBe(false);
    await grants.assign(grace.id, "admin");
    expect(await authorizer.can("delete", own, grace)).toBe(true);
    await grants.revoke(grace.id, "admin");
    expect(await authorizer.can("delete", own, grace)).toBe(false);
  });
});
