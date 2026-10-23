import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "./build",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    // MUI-heavy first renders can pass 5s when the whole suite runs in parallel
    testTimeout: 15000,
    setupFiles: "./src/test/setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/services/**",
        "src/hooks/api/**",
        "src/hooks/services/**",
        "src/utils/**",
      ],
    },
  },
});
