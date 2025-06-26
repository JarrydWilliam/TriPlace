import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { ENV } from "./env";
import { ERROR_MESSAGES } from "./production-config";

// Validate Firebase configuration
if (!ENV.FIREBASE_API_KEY || !ENV.FIREBASE_PROJECT_ID || !ENV.FIREBASE_APP_ID) {
  throw new Error("Missing required Firebase configuration. Please check your environment variables.");
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
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    // Handle specific Firebase auth errors
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        throw new Error('Sign-in was cancelled. Please try again.');
      case 'auth/popup-blocked':
        throw new Error('Popup was blocked by your browser. Please allow popups and try again.');
      case 'auth/network-request-failed':
        throw new Error(ERROR_MESSAGES.NETWORK);
      case 'auth/too-many-requests':
        throw new Error('Too many sign-in attempts. Please try again later.');
      default:
        throw new Error('Unable to sign in. Please try again.');
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
