import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // db-relations.test.ts makes real network round-trips to Postgres
    // (Neon), including a possible compute cold-start on the first query —
    // the 5s default is too tight for that, even though the pure-logic
    // suite finishes in milliseconds either way.
    testTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
    },
  },
});
