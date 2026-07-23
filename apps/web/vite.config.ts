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
  server: {
    // When Nest mounts Vite in middleware mode, HMR attaches to the Nest port.
    port: 3000,
    strictPort: false,
  },
  build: {
    outDir: "dist",
  },
});
