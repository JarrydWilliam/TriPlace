import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, Auth } from "firebase/auth";

// Mobile-optimized Firebase configuration
let auth: Auth | any;
let googleProvider: GoogleAuthProvider | any;
let isFirebaseInitialized = false;

// Initialize Firebase with proper error handling for mobile
function initializeFirebase() {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const appId = import.meta.env.VITE_FIREBASE_APP_ID;

    if (apiKey && projectId && appId) {
      const firebaseConfig = {
        apiKey,
        authDomain: `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: `${projectId}.firebasestorage.app`,
        appId,
      };
      
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      googleProvider = new GoogleAuthProvider();
      isFirebaseInitialized = true;
      console.log('Firebase initialized successfully');
    } else {
      console.warn('Firebase environment variables missing');
      createAuthFallback();
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    createAuthFallback();
  }
}

// Create fallback auth object that won't crash the app
function createAuthFallback() {
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: any) => {
      // Call callback immediately with null user
      setTimeout(() => callback(null), 0);
      return () => {}; // Return unsubscribe function
    },
    signOut: () => Promise.resolve()
  };
  googleProvider = {};
  isFirebaseInitialized = false;
}

// Initialize on module load
initializeFirebase();

export { auth, googleProvider, isFirebaseInitialized };

export const signInWithGoogle = async () => {
  // Check if Firebase is properly configured
  if (!isFirebaseInitialized) {
    throw new Error('Authentication is not available. Please contact support for assistance.');
  }

  try {
    // Configure Google provider for better user experience
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

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
        throw new Error('Network error. Please check your connection and try again.');
      case 'auth/too-many-requests':
        throw new Error('Too many sign-in attempts. Please try again later.');
      case 'auth/configuration-not-found':
        throw new Error('Authentication not properly configured. Please contact support.');
      case 'auth/invalid-api-key':
        throw new Error('Authentication configuration error. Please contact support.');
      case 'auth/unauthorized-domain':
        throw new Error('This domain is not authorized for sign-in. Please contact support.');
      default:
        if (error.message?.includes('Firebase')) {
          throw new Error('Authentication service error. Please try again or contact support.');
        }
        throw new Error('Unable to sign in with Google. Please try again.');
    }
  }
};

export const signOutUser = async () => {
  try {
    if (auth && auth.signOut) {
      await auth.signOut();
    }
  } catch (error) {
    console.error('Sign-out error:', error);
    throw new Error('Unable to sign out. Please try again.');
  }
};
