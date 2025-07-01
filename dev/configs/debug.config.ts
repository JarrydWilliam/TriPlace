/**
 * Debug Configuration for Development Environment
 * Contains all debug settings and development-only configuration options
 */

export const DEBUG_CONFIG = {
  // Logging levels
  LOGGING: {
    LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
    ENABLE_CONSOLE: process.env.NODE_ENV === 'development',
    ENABLE_FILE_LOGGING: false,
    LOG_API_REQUESTS: true,
    LOG_WEBSOCKET_EVENTS: true,
    LOG_DATABASE_QUERIES: false,
  },

  // Development features
  FEATURES: {
    SHOW_DEBUG_PANEL: true,
    ENABLE_MOCK_DATA: false,
    ENABLE_API_MOCKING: false,
    SHOW_PERFORMANCE_METRICS: true,
    ENABLE_COMPONENT_BOUNDARIES: true,
  },

  // Database development settings
  DATABASE: {
    ENABLE_QUERY_LOGGING: false,
    AUTO_SEED_ON_START: false,
    CLEAR_ON_RESTART: false,
  },

  // WebSocket debugging
  WEBSOCKET: {
    LOG_CONNECTIONS: true,
    LOG_MESSAGES: false,
    ENABLE_DEBUG_EVENTS: true,
  },

  // API debugging
  API: {
    LOG_REQUEST_BODY: false,
    LOG_RESPONSE_DATA: false,
    ENABLE_CORS_DEBUG: false,
    SIMULATE_SLOW_RESPONSES: false,
  },

  // UI debugging
  UI: {
    SHOW_COMPONENT_NAMES: false,
    HIGHLIGHT_UPDATES: false,
    SHOW_QUERY_STATUS: true,
    ENABLE_ACCESSIBILITY_CHECKS: true,
  }
};

// Development-only environment variables
export const DEV_ENV = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  SHOW_WARNINGS: true,
  ENABLE_HOT_RELOAD: true,
  SKIP_AUTH_IN_DEV: false,
};

// Debug utilities configuration
export const DEBUG_UTILS = {
  COLORS: {
    INFO: '\x1b[36m',    // Cyan
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m',   // Red
    SUCCESS: '\x1b[32m', // Green
    RESET: '\x1b[0m',    // Reset
  },
  PREFIXES: {
    API: '[API]',
    DB: '[DB]',
    WS: '[WebSocket]',
    UI: '[UI]',
    AUTH: '[Auth]',
  }
};