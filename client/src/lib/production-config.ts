// Production configuration for live deployment
export const PRODUCTION_CONFIG = {
  // App metadata
  app: {
    name: "TriPlace",
    version: "1.0.0",
    environment: import.meta.env.PROD ? "production" : "development",
    deploymentTimestamp: Date.now(),
  },

  // API configuration
  api: {
    baseUrl: import.meta.env.PROD ? window.location.origin : "http://localhost:5000",
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // Database configuration
  database: {
    connectionPooling: true,
    queryTimeout: 30000,
    maxConnections: 20,
  },

  // Authentication configuration
  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    tokenRefreshInterval: 60 * 60 * 1000, // 1 hour
    requireEmailVerification: false, // Set to true for production if needed
  },

  // PWA configuration
  pwa: {
    enableOfflineMode: true,
    cacheStrategy: "networkFirst",
    backgroundSync: true,
    updateNotifications: true,
  },

  // Performance settings
  performance: {
    enableMetrics: import.meta.env.PROD,
    lazyLoadImages: true,
    prefetchRoutes: true,
    compressionEnabled: true,
  },

  // Security settings
  security: {
    enableCSP: import.meta.env.PROD,
    secureCookies: import.meta.env.PROD,
    httpsOnly: import.meta.env.PROD,
    rateLimiting: import.meta.env.PROD,
  },

  // Feature flags
  features: {
    aiMatching: true,
    eventScraping: true,
    communityRotation: true,
    globalEvents: true,
    kudosSystem: true,
    messaging: true,
    geolocation: true,
    darkMode: true,
    pwaInstallation: true,
  },

  // UI settings
  ui: {
    animationsEnabled: true,
    toastDuration: 4000,
    loadingTimeout: 10000,
    infiniteScrollThreshold: 0.8,
  },

  // Analytics and monitoring
  monitoring: {
    errorReporting: import.meta.env.PROD,
    performanceTracking: import.meta.env.PROD,
    userAnalytics: false, // Privacy-focused, disabled by default
    crashReporting: import.meta.env.PROD,
  },
};

// Error messages optimized for production
export const ERROR_MESSAGES = {
  NETWORK: "Connection issue. Please check your internet and try again.",
  AUTH: "Authentication failed. Please try signing in again.",
  PERMISSION: "Permission denied. Please contact support if this continues.",
  NOT_FOUND: "The requested resource was not found.",
  SERVER: "Server temporarily unavailable. Please try again in a moment.",
  VALIDATION: "Please check your input and try again.",
  RATE_LIMIT: "Too many requests. Please wait a moment before trying again.",
  OFFLINE: "You're currently offline. Some features may be limited.",
  UPDATE_REQUIRED: "A new version is available. Please refresh the page.",
};

// Production optimizations
export function applyProductionOptimizations() {
  if (!import.meta.env.PROD) return;

  // Disable console logs in production
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  
  // Keep error and warn for debugging
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    if (PRODUCTION_CONFIG.monitoring.errorReporting) {
      originalError(...args);
    }
  };
  
  console.warn = (...args) => {
    if (PRODUCTION_CONFIG.monitoring.errorReporting) {
      originalWarn(...args);
    }
  };
}

// Initialize production configuration
export function initializeProduction() {
  applyProductionOptimizations();
  
  // Set global error handler
  window.addEventListener('error', (event) => {
    if (PRODUCTION_CONFIG.monitoring.crashReporting) {
      console.error('Global error:', event.error);
    }
  });

  // Set unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    if (PRODUCTION_CONFIG.monitoring.crashReporting) {
      console.error('Unhandled promise rejection:', event.reason);
    }
  });
}