import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// apps/vite is the self-hosted stack that replaces Next, so its server must send the headers
// apps/web (next.config.ts) and apps/start (src/start.ts) send. This keeps the three in step.
const expected = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
};

const server = () => readFileSync("apps/vite/server.mjs", "utf8");

describe("apps/vite/server.mjs", () => {
  it("sends the security headers of the Next and Start stacks", () => {
    const source = server();
    for (const [name, value] of Object.entries(expected)) {
      expect(source, `${name} is missing`).toContain(
        `${JSON.stringify(name)}: ${JSON.stringify(value)}`,
      );
    }
  });

  it("adds them to every response, not only to files it serves itself", () => {
    expect(server()).toContain(
      "editHeaders(response, (headers) => ({ ...securityHeaders, ...headers }));",
    );
  });
});
