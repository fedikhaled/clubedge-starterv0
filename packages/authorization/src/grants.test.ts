import { describe, expect, it } from "vitest";
import { describeGrantStore } from "./conformance";
import { createMemoryGrants } from "./grants";

describeGrantStore("memory", () => createMemoryGrants());

describe("memory grants", () => {
  it("starts from the roles it is given", async () => {
    const grants = createMemoryGrants({ ada: ["admin", "staff"] });
    expect(await grants.rolesOf("ada")).toEqual(["admin", "staff"]);
    expect(await grants.rolesOf("grace")).toEqual([]);
  });

  it("hands out a copy, so a caller cannot edit the roles it holds", async () => {
    const grants = createMemoryGrants({ ada: ["admin"] });
    const roles = await grants.rolesOf("ada");
    (roles as string[]).push("superuser");
    expect(await grants.rolesOf("ada")).toEqual(["admin"]);
  });
});
