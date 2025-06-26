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

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
