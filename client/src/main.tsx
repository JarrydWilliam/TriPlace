import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Critical: Ensure DOM is ready before React initialization
function initializeApp() {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error('Root element not found');
      document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: system-ui;">TriPlace is loading...</div>';
      return;
    }

    // Initialize React app
    const root = createRoot(rootElement);
    root.render(<App />);
    
    // Register service worker after app is running
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        console.log('Service Worker registration failed');
      });
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui;">
        <h2>TriPlace</h2>
        <p>Loading issue detected. Refreshing...</p>
        <script>setTimeout(() => window.location.reload(), 2000);</script>
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
