import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Every release tag is a version a generated project records as clubedge.starterRef and
// `pnpm clubedge upgrade` reports, so one tag has to describe the whole workspace. A package left
// at an older version would be released under a version it never had.
const manifests = [
  "package.json",
  ...["apps", "packages"].flatMap((folder) =>
    readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) =>
        ["package.json", "pyproject.toml"]
          .map((file) => `${folder}/${entry.name}/${file}`)
          .filter((path) => existsSync(path)),
      ),
  ),
];

/** Its version, from the manifest of either language's workspace. */
function version(path: string) {
  const text = readFileSync(path, "utf8");
  // pyproject.toml is TOML, where the project version is the only such line.
  if (path.endsWith(".toml")) return /^version = "([^"]*)"$/m.exec(text)?.[1];
  return (JSON.parse(text) as { version?: string }).version;
}

describe("the workspace versions", () => {
  it("all match the root package.json", () => {
    const current = version("package.json");
    const stale = manifests
      .filter((path) => path !== "package.json")
      .map((path) => [path, version(path)] as const)
      .filter(([, found]) => found !== current);
    expect(stale, `these are not on ${current}: ${stale.map(([path]) => path).join(", ")}`).toEqual(
      [],
    );
  });
});
