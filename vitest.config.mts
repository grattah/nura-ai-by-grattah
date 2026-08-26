import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

// Integration tests need BRANCH_DB_URL. Loaded here rather than in a setup file
// so it is available while the config itself is evaluated.
loadEnv({ path: ".env.local", quiet: true });

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Mirror tsconfig's "@/*": "./*"
      { find: /^@\/(.*)$/, replacement: `${root}$1` },
      // Stub the `server-only` marker so route handlers load under Vitest.
      {
        find: /^server-only$/,
        replacement: `${root}test/stubs/server-only.ts`,
      },
    ],
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "test/integration/**/*.test.ts"],
    // Integration tests share one branch database. Running files in parallel
    // would have several transactions competing for the same fixture rows.
    fileParallelism: false,
    testTimeout: 20_000,
    setupFiles: ["./test/setup.ts"],
  },
});
