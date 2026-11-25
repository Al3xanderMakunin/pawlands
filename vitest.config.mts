import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@pawlands/config": `${rootDir}packages/config/src/index.ts`,
      "@pawlands/shared": `${rootDir}packages/shared/src/index.ts`,
      "@pawlands/game-data": `${rootDir}packages/game-data/src/index.ts`,
      "@pawlands/protocol": `${rootDir}packages/protocol/src/index.ts`,
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    pool: "threads",
    isolate: false,
    maxWorkers: 2,
  },
});
