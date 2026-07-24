import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // Keep CI focused on deps/files; export cleanup can be a follow-up.
  rules: {
    files: "error",
    dependencies: "error",
    unlisted: "error",
    binaries: "error",
    unresolved: "error",
    exports: "off",
    types: "off",
    nsExports: "off",
    nsTypes: "off",
    enumMembers: "off",
    duplicates: "warn",
  },
  workspaces: {
    ".": {
      entry: ["scripts/**/*.{js,mjs,cjs,ts}"],
      project: ["scripts/**/*.{js,mjs,cjs,ts}"],
      ignoreDependencies: ["vitest"],
    },
    "apps/api": {
      entry: ["src/**/*.integration.test.ts", "vitest*.ts"],
      project: ["src/**/*.ts", "vitest*.ts"],
      ignore: ["src/@generated/**"],
      // Vite middleware loads apps/web's config; these are required at runtime.
      ignoreDependencies: [
        "@octanejs/vite-plugin",
        "@tailwindcss/vite",
        "tailwindcss",
        "@hydrox/trpc",
      ],
    },
    "apps/web": {
      entry: ["src/router.tsx", "scripts/**/*.ts", "e2e/**/*.ts"],
      project: ["src/**/*.{ts,tsx}", "e2e/**/*.ts", "scripts/**/*.ts", "*.config.ts"],
      // Octane ecosystem plugins / reserved shared packages (not always direct imports).
      ignoreDependencies: [
        "@hydrox/contracts",
        "@hydrox/trpc",
        "@octanejs/base-ui",
        "@octanejs/dexie",
        "@octanejs/i18next",
        "superjson",
        "tailwindcss",
      ],
    },
    "packages/config": {
      entry: [],
      project: [],
    },
    "packages/contracts": {
      project: ["src/**/*.ts"],
    },
    "packages/db": {
      project: ["src/**/*.ts"],
    },
    "packages/domain": {
      entry: ["src/**/*.test.ts"],
      project: ["src/**/*.ts"],
      ignoreDependencies: ["@hydrox/contracts"],
    },
    "packages/sync": {
      entry: ["src/**/*.test.ts"],
      project: ["src/**/*.ts"],
    },
    "packages/trpc": {
      project: ["src/**/*.ts"],
    },
    "packages/ui": {
      project: ["src/**/*.{ts,tsx,css}"],
    },
  },
  ignore: ["apps/api/src/@generated/**"],
  compilers: {
    css: (text: string) =>
      [...text.matchAll(/(?<=@)(?:import|plugin)[^;]+;|@theme[^}]+}/g)]
        .map((m) => m[0] ?? "")
        .join("\n"),
  },
};

export default config;
