import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: ["**/*.int.test.ts", "e2e/**", "node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "int",
          include: ["**/*.int.test.ts"],
          exclude: ["node_modules/**"],
          // Only .env.test, never .env.local: integration tests must not reach Neon.
          env: parseEnv(readFileSync(".env.test", "utf8")) as Record<
            string,
            string
          >,
          fileParallelism: false,
        },
      },
    ],
  },
});
