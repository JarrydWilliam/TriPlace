import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Replit dev overlay — only in development; not bundled into the native app
    ...(mode !== "production" ? [runtimeErrorOverlay()] : []),
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
    // MUST match capacitor.config.ts webDir — this is what Capacitor loads on native iOS/Android
    outDir: resolve(process.cwd(), "dist", "public"),
    emptyOutDir: true,
  },
  server: {
    host: true, // Bind to 0.0.0.0 so phones on the same WiFi can connect
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
