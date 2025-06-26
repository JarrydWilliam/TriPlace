import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Critical: Ensure DOM is ready before React initialization
function initializeApp() {
  try {
    // Safari reload handling - ensure proper initialization
    if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
      // Clear any potential cache flags on successful load
      if (document.readyState === 'complete') {
        sessionStorage.removeItem('triplace-reload-flag');
      }
      
      // Ensure DOM elements are properly initialized
      if (!document.getElementById("root")) {
        console.warn('Safari reload detected - DOM not ready');
        setTimeout(() => {
          if (!document.getElementById("root")) {
            window.location.reload();
          } else {
            initializeApp();
          }
        }, 100);
        return;
      }
    }

    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error('Root element not found');
      document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: system-ui; background: #0f172a; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center;"><div><h2>TriPlace</h2><p>Initializing...</p></div></div>';
      setTimeout(() => window.location.reload(), 3000);
      return;
    }

    // Clear any existing content
    rootElement.innerHTML = '';
    
    // Initialize React app
    const root = createRoot(rootElement);
    root.render(<App />);
    
    // Register service worker after app is running
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { 
        updateViaCache: 'none' 
      }).then(() => {
        // Force service worker update
        navigator.serviceWorker.ready.then(registration => {
          registration.update();
        });
      }).catch(() => {
        console.log('Service Worker registration failed');
      });
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui; background: #0f172a; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div>
          <h2>TriPlace</h2>
          <p>Loading issue detected. Refreshing...</p>
          <script>setTimeout(() => window.location.reload(), 2000);</script>
        </div>
      </div>
    `;
  }
}

// Ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
