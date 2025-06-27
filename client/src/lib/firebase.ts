import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { ENV } from "./env";
import { ERROR_MESSAGES } from "./production-config";

// Validate required Firebase configuration for live deployment
if (!ENV.FIREBASE_API_KEY || !ENV.FIREBASE_PROJECT_ID || !ENV.FIREBASE_APP_ID) {
  throw new Error('Firebase configuration missing. Please provide VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID environment variables.');
}

const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: `${ENV.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: `${ENV.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: ENV.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    // Configure Google provider for mobile compatibility
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    // Add mobile-specific configuration
    googleProvider.addScope('email');
    googleProvider.addScope('profile');

    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    // Enhanced error handling for mobile devices
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        throw new Error('Sign-in was cancelled. Please try again.');
      case 'auth/popup-blocked':
        throw new Error('Popup was blocked. Please allow popups and try again.');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your internet connection and try again.');
      case 'auth/too-many-requests':
        throw new Error('Too many sign-in attempts. Please wait a moment and try again.');
      case 'auth/configuration-not-found':
        throw new Error('Authentication not configured. Please contact support.');
      case 'auth/invalid-api-key':
        throw new Error('Authentication configuration error. Please contact support.');
      case 'auth/unauthorized-domain':
        throw new Error('Domain not authorized for sign-in. Please contact support.');
      case 'auth/cancelled-popup-request':
        throw new Error('Sign-in interrupted. Please try again.');
      case 'auth/user-disabled':
        throw new Error('Your account has been disabled. Please contact support.');
      case 'auth/operation-not-allowed':
        throw new Error('Google sign-in is not enabled. Please contact support.');
      default:
        console.error('Detailed Firebase error:', error);
        if (error.message?.toLowerCase().includes('firebase')) {
          throw new Error('Authentication service temporarily unavailable. Please try again.');
        }
        throw new Error('Unable to sign in with Google. Please try again or contact support.');
    }
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw new Error('Unable to sign out. Please try again.');
  }
};
