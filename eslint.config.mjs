import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// Architecture boundaries. Shared packages stay framework-agnostic so any app (Next.js today,
// other frameworks later) can reuse them; apps reach providers only through src/server.
const frameworkImports = {
  group: ["next", "next/*", "@tanstack/*", "react", "react-dom", "react/*", "server-only"],
  message: "Shared packages must stay framework-agnostic. Accept dependencies as arguments.",
};
const appImports = {
  group: ["@/*", "**/apps/**"],
  message: "Packages must not import application code.",
};
// Every provider's SDK, so an app can only reach a provider through its composition root. A
// pattern without a slash matches any path's last segment, so bare package names go in `paths`.
const providerMessage = "Use the composition root in src/server instead of a provider SDK.";
const providerSdks = {
  paths: [
    "@electric-sql/pglite",
    "bullmq",
    "drizzle-orm",
    "firebase-admin",
    "ioredis",
    "inngest",
    "node-appwrite",
    "nodemailer",
    "pg-boss",
    "postgres",
    "redis",
    "stripe",
  ].map((name) => ({ name, message: providerMessage })),
  patterns: [{ group: ["@aws-sdk/*", "@supabase/*", "drizzle-orm/*"], message: providerMessage }],
};

// A provider's own package is as much a dependency as its SDK: swapping one means swapping the
// other, and only the composition root should know which one the app uses.
const providerPackages = {
  group: [
    "@clubedge/auth-*",
    "@clubedge/cache-*",
    "@clubedge/email-*",
    "@clubedge/jobs-*",
    "@clubedge/observability-*",
    "@clubedge/payments-*",
    "@clubedge/push-*",
    "@clubedge/storage-*",
  ],
  message: "Import what src/server exposes, not the provider package.",
};

export default defineConfig([
  ...tseslint.configs.recommended,
  {
    // Every file a package can ship, not just .ts: a .tsx or .cjs inside a package is as
    // framework-bound as a .ts one.
    files: ["packages/*/**/*.{ts,tsx,mjs,cjs}"],
    ignores: ["packages/ui/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [frameworkImports, appImports] }],
    },
  },
  // clubedge:if shell!=none
  {
    // The mobile app's own screens, such as its update notice, are React, like the shared UI.
    files: ["packages/mobile/**/*.{ts,tsx,mjs,cjs}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [appImports] }],
    },
  },
  // clubedge:end
  {
    files: ["packages/core/**/*.{ts,tsx,mjs,cjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            frameworkImports,
            appImports,
            {
              group: ["@clubedge/*"],
              message: "@clubedge/core must not depend on other packages.",
            },
          ],
        },
      ],
    },
  },
  {
    // The composition root is where a provider gets chosen: src/server for the server-rendered
    // apps, src/variants for the Vite SPA, whose wiring lives there.
    files: ["apps/*/src/**/*.{ts,tsx}"],
    ignores: ["apps/*/src/server/**", "apps/*/src/variants/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: providerSdks.paths, patterns: [...providerSdks.patterns, providerPackages] },
      ],
    },
  },
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/.output/**",
    "**/dist/**",
    "**/.nitro/**",
    "**/.tanstack/**",
    "**/routeTree.gen.ts",
    "**/.turbo/**",
    ".pnpm-store/**",
    "out/**",
    "build/**",
    "**/next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
    // clubedge:if shell!=none
    // The web app's build for the mobile app, and the native projects it is copied into.
    "**/dist-app/**",
    "apps/shell/android/**",
    "apps/shell/ios/**",
    // clubedge:end
    // clubedge:if mobile!=none
    // The native app's generated Android and iOS projects, and Expo's working files.
    "apps/mobile/android/**",
    "apps/mobile/ios/**",
    "apps/expo/android/**", // clubedge:only starter-repository
    "apps/expo/ios/**", // clubedge:only starter-repository
    "**/.expo/**",
    "**/expo-env.d.ts",
    // clubedge:end
  ]),
]);
