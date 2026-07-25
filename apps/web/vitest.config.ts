import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@dental-lab/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
      "@dental-lab/ui/styles.css": fileURLToPath(new URL(
        "../../packages/ui/src/styles.css",
        import.meta.url,
      )),
      "@dental-lab/ui": fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    hookTimeout: 15_000,
    testTimeout: 15_000,
  },
});
