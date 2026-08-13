import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const publicAssetsDir = fileURLToPath(new URL("../../assets", import.meta.url));

export default defineConfig({
  publicDir: publicAssetsDir,
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
  server: {
    port: 3000,
  },
});
