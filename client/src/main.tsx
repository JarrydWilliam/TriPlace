import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { logDeploymentStatus } from "./lib/deployment-checks";
import { initializeProductionFeatures, setupPerformanceMonitoring } from "./lib/production-deployment";
import { initializeProduction } from "./lib/production-config";

// Initialize production configuration
initializeProduction();

// Log deployment status on app start
logDeploymentStatus();

// Initialize production features
initializeProductionFeatures();
setupPerformanceMonitoring();

// Register production-ready service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = import.meta.env.PROD ? '/update-worker.js' : '/sw.js';
    
    navigator.serviceWorker.register(swPath)
      .then((registration) => {
        console.log('Service Worker registered:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available, prompt user to update
                if (confirm('New version available! Refresh to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'UPDATE_AVAILABLE') {
            console.log('Update available:', event.data.message);
          }
        });
        
        // Check for updates periodically in production
        if (import.meta.env.PROD) {
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        }
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
