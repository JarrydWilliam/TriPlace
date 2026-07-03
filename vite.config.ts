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
    rollupOptions: {
      // Capacitor native plugins are not bundleable for web — they're injected at runtime
      // by the native Capacitor bridge. Externalizing them prevents build errors while
      // the existing isNativePlatform() guards ensure they're only called on native.
      external: [
        "@revenuecat/purchases-capacitor",
        "@capacitor-firebase/authentication",
      ],
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
