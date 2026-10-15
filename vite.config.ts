import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "src",
  // Keep matching disabled: all assets are embedded; no user-controlled glob patterns.
  plugins: [
    react(),
    viteSingleFile({ removeViteModuleLoader: true, inlinePattern: [] }),
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
  },
});
