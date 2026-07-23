import { defineConfig } from "vite";
import { octane } from "@octanejs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [octane(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Keep Vite cache out of node_modules (Docker volume mounts can make those root-owned).
  cacheDir: path.resolve(__dirname, ".vite"),
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    outDir: "dist",
  },
});
