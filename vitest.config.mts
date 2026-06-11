import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

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
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
