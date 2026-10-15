import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/domain/**/*.ts",
        "src/persistence/**/*.ts",
        "src/portability/**/*.ts",
        "src/reporting/**/*.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      thresholds: { lines: 95, branches: 90, functions: 95, statements: 95 },
    },
  },
});
