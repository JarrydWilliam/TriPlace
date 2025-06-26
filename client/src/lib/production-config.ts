// Production configuration and constants
export const PRODUCTION_CONFIG = {
  // API endpoints
  API_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  
  // Cache durations (in milliseconds)
  CACHE_DURATIONS: {
    USER_DATA: 5 * 60 * 1000,          // 5 minutes
    COMMUNITIES: 10 * 60 * 1000,       // 10 minutes
    EVENTS: 5 * 60 * 1000,             // 5 minutes
    RECOMMENDATIONS: 15 * 60 * 1000,   // 15 minutes
    LOCATION: 30 * 60 * 1000,          // 30 minutes
  },
  
  // Geolocation settings
  GEOLOCATION: {
    TIMEOUT: 15000,                    // 15 seconds
    MAXIMUM_AGE: 10 * 60 * 1000,       // 10 minutes
    HIGH_ACCURACY: true,
    FALLBACK_ENABLED: true,
  },
  
  // Community matching
  MATCHING: {
    MIN_INTEREST_OVERLAP: 0.7,         // 70% minimum
    DEFAULT_RADIUS_MILES: 50,
    EXPANDED_RADIUS_MILES: 100,
    AI_ENABLED: true,
    FALLBACK_ALGORITHM: true,
  },
  
  // UI/UX settings
  UI: {
    DEBOUNCE_DELAY: 300,               // 300ms
    LOADING_DELAY: 200,                // Show loading after 200ms
    TOAST_DURATION: 5000,              // 5 seconds
    MAX_COMMUNITIES_DISPLAY: 20,
    MAX_EVENTS_DISPLAY: 10,
  },
  
  // Performance thresholds
  PERFORMANCE: {
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,   // 5MB
    MAX_MESSAGE_LENGTH: 1000,
    MAX_BIO_LENGTH: 500,
    MAX_INTERESTS: 20,
  },
  
  // Feature flags
  FEATURES: {
    AI_MATCHING: true,
    GEOLOCATION_EXPANSION: true,
    REAL_TIME_UPDATES: true,
    ANALYTICS: true,
    ERROR_REPORTING: true,
  },
} as const;

// Production error messages
export const ERROR_MESSAGES = {
  NETWORK: "Unable to connect. Please check your internet connection and try again.",
  TIMEOUT: "Request timed out. Please try again.",
  AUTHENTICATION: "Please sign in to continue.",
  LOCATION_DENIED: "Location access is required for community recommendations.",
  LOCATION_UNAVAILABLE: "Unable to determine your location. Using approximate location instead.",
  GENERIC: "Something went wrong. Please try again.",
  QUOTA_EXCEEDED: "Service temporarily unavailable. Please try again later.",
  MAINTENANCE: "TriPlace is currently undergoing maintenance. Please try again soon.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: "Profile updated successfully!",
  COMMUNITY_JOINED: "Welcome to the community!",
  EVENT_REGISTERED: "You're registered for the event!",
  MESSAGE_SENT: "Message sent!",
  KUDOS_GIVEN: "Kudos sent!",
  SETTINGS_SAVED: "Settings saved successfully!",
} as const;