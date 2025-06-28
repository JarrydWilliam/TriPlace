// Environment variable validation and configuration
export const ENV = {
  // Firebase configuration
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  
  // Stripe configuration
  STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  
  // API configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  
  // Environment
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
} as const;

// Validate required environment variables
export function validateEnv() {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID', 
    'VITE_FIREBASE_APP_ID'
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    if (ENV.PROD) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Initialize environment validation
validateEnv();