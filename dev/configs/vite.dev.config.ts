/**
 * Development-specific Vite Configuration
 * Contains development-only plugins and settings excluded from production
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { DEBUG_CONFIG } from './debug.config';

export const devViteConfig = defineConfig({
  plugins: [
    react(),
    // Development-only plugins
    ...(DEBUG_CONFIG.FEATURES.ENABLE_COMPONENT_BOUNDARIES ? [
      // Add error boundary plugin for development
      {
        name: 'dev-error-boundary',
        transformIndexHtml(html) {
          return html.replace(
            '<div id="root"></div>',
            `<div id="root"></div>
            <script>
              window.addEventListener('error', function(e) {
                console.error('Global error caught:', e.error);
              });
            </script>`
          );
        }
      }
    ] : [])
  ],
  
  define: {
    // Development-only global variables
    __DEV_MODE__: JSON.stringify(true),
    __DEBUG_PANEL__: JSON.stringify(DEBUG_CONFIG.FEATURES.SHOW_DEBUG_PANEL),
    __API_LOGGING__: JSON.stringify(DEBUG_CONFIG.LOGGING.LOG_API_REQUESTS),
    __WS_LOGGING__: JSON.stringify(DEBUG_CONFIG.LOGGING.LOG_WEBSOCKET_EVENTS)
  },

  server: {
    // Development server configuration
    port: 3000,
    host: true,
    open: DEBUG_CONFIG.DEV_ENV.ENABLE_HOT_RELOAD,
    cors: DEBUG_CONFIG.API.ENABLE_CORS_DEBUG,
    
    // Development-specific middleware
    middlewareMode: false,
    
    // Enhanced error overlay for development
    hmr: {
      overlay: true,
      clientPort: 3000
    }
  },

  build: {
    // Development build settings (faster builds, more debugging info)
    sourcemap: true,
    minify: false,
    target: 'es2020',
    
    rollupOptions: {
      // Exclude dev folder from production builds
      external: [/^dev\//],
      
      output: {
        // More readable output for debugging
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash', 'date-fns']
        }
      }
    }
  },

  optimizeDeps: {
    // Development dependency optimization
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query'
    ],
    exclude: [
      // Exclude dev utilities from optimization
      'dev/*'
    ]
  },

  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        // Development-specific SCSS options
        sourceMap: true
      }
    }
  },

  // Development-only environment variables
  envPrefix: ['VITE_', 'DEV_'],
  
  // Enhanced logging for development
  logLevel: DEBUG_CONFIG.LOGGING.LEVEL as any,
  
  // Development-specific path resolution
  resolve: {
    alias: {
      '@dev': '/dev',
      '@dev-utils': '/dev/utils',
      '@dev-components': '/dev/components'
    }
  }
});

export default devViteConfig;