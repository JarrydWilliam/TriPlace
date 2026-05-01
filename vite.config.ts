import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { resolve } from "path";

export default defineConfig({
      plugins: [
              react(),
              runtimeErrorOverlay(),
            ],
      resolve: {
              alias: {
                        "@": resolve(process.cwd(), "client", "src"),
                        "@shared": resolve(process.cwd(), "shared"),
                        "@assets": resolve(process.cwd(), "attached_assets"),
              },
      },
      root: resolve(process.cwd(), "client"),
      build: {
              outDir: resolve(process.cwd(), "dist"),
              emptyOutDir: true,
      },
      server: {
              fs: {
                        strict: true,
                        deny: ["**/.*"],
              },
      },
});
