import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for DOM testing (faster than jsdom)
    environment: "happy-dom",

    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Setup files to run before each test file
    setupFiles: ["./src/test/setup.ts"],

    // Include source and test files
    include: ["src/**/*.{test,spec}.{ts,tsx}"],

    // Exclude patterns
    exclude: ["node_modules", "dist", ".astro", "coverage", "e2e", "**/*.e2e.{test,spec}.{ts,tsx}"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules",
        "dist",
        ".astro",
        "src/test/**",
        "src/**/*.d.ts",
        "src/**/*.config.ts",
        "src/env.d.ts",
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/*.spec.tsx",
        "**/*.test.tsx",
      ],
      // Set thresholds when requested
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },

    // Enable TypeScript type checking
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.json",
    },
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
