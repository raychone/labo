import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const publicAssetsDir = fileURLToPath(new URL("../../assets", import.meta.url));

export default defineConfig({
  publicDir: publicAssetsDir,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("react") || id.includes("react-router")) {
            return "vendor-react";
          }

          if (id.includes("@tanstack")) {
            return "vendor-query";
          }

          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("/zod/")) {
            return "vendor-forms";
          }

          return undefined;
        },
      },
    },
  },
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
  server: {
    port: 3000,
  },
});
