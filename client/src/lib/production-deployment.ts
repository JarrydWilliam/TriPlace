// Production deployment configuration and checks
export const DEPLOYMENT_CONFIG = {
  // Cache busting for production updates
  version: Date.now().toString(),
  
  // Production API endpoints
  api: {
    baseUrl: import.meta.env.PROD ? '' : 'http://localhost:5000',
    timeout: 30000,
  },
  
  // PWA update handling
  pwa: {
    updateInterval: 60000, // Check for updates every minute
    forceUpdateOnLoad: import.meta.env.PROD,
  },
  
  // Service worker configuration
  serviceWorker: {
    updateViaCache: 'none' as const,
    skipWaiting: true,
  },
  
  // Performance settings
  performance: {
    enableMetrics: import.meta.env.PROD,
    reportingInterval: 300000, // 5 minutes
  }
};

// Force refresh function for production updates
export function forceAppUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
}

// Check for app updates
export async function checkForUpdates() {
  if (!import.meta.env.PROD) return false;
  
  try {
    const response = await fetch('/api/version', { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (response.ok) {
      const serverVersion = await response.text();
      const clientVersion = DEPLOYMENT_CONFIG.version;
      
      if (serverVersion !== clientVersion) {
        console.log('New version available, updating app...');
        return true;
      }
    }
  } catch (error) {
    console.log('Update check failed:', error);
  }
  
  return false;
}

// Initialize production deployment features
export function initializeProductionFeatures() {
  if (!import.meta.env.PROD) return;
  
  // Disable right-click context menu in production
  document.addEventListener('contextmenu', e => e.preventDefault());
  
  // Disable developer tools shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
    }
  });
  
  // Set up automatic update checking
  setInterval(async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      forceAppUpdate();
    }
  }, DEPLOYMENT_CONFIG.pwa.updateInterval);
}

// Performance monitoring for production
export function setupPerformanceMonitoring() {
  if (!DEPLOYMENT_CONFIG.performance.enableMetrics) return;
  
  // Monitor core web vitals
  if ('performance' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('Navigation timing:', {
            loadTime: entry.loadEventEnd - entry.fetchStart,
            domReady: entry.domContentLoadedEventEnd - entry.fetchStart,
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }
}