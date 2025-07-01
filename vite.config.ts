import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [
    // Only include production plugins here
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client/src"),
      "@shared": path.resolve(process.cwd(), "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },
  root: path.resolve(process.cwd(), "client"),
  build: {
    outDir: path.resolve(process.cwd(), "dist/public"),
    emptyOutDir: true,
    minify: true,
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
