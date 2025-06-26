import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Simple, safe service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered');
        
        // Simple update check
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker && newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('New version available! Refresh to update?')) {
              window.location.reload();
            }
          }
        });
        
        // Check for updates every 5 minutes
        setInterval(() => {
          registration.update();
        }, 300000);
      })
      .catch(() => {
        console.log('Service Worker registration failed');
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
