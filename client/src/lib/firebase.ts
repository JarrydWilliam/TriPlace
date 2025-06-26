import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

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

    console.log('Firebase environment check:', {
      hasApiKey: !!apiKey,
      hasProjectId: !!projectId,
      hasAppId: !!appId,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'missing',
      projectId: projectId || 'missing'
    });

    if (apiKey && projectId && appId) {
      const firebaseConfig = {
        apiKey,
        authDomain: `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: `${projectId}.firebasestorage.app`,
        appId,
      };
      
      console.log('Initializing Firebase with config:', {
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId
      });
      
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      googleProvider = new GoogleAuthProvider();
      
      // Configure Google provider with proper settings
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      
      isFirebaseInitialized = true;
      console.log('Firebase initialized successfully');
    } else {
      console.error('Firebase environment variables missing:', {
        VITE_FIREBASE_API_KEY: !!apiKey,
        VITE_FIREBASE_PROJECT_ID: !!projectId,
        VITE_FIREBASE_APP_ID: !!appId
      });
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
  console.log('Starting Google sign-in process...');
  
  // Check if Firebase is properly configured
  if (!isFirebaseInitialized) {
    console.error('Firebase not initialized');
    throw new Error('Authentication is not available. Please contact support for assistance.');
  }

  // Validate Google provider is properly initialized
  if (!googleProvider) {
    console.error('Google provider not available');
    throw new Error('Google authentication is not properly configured. Please try again.');
  }

  try {
    console.log('Attempting Google sign-in with popup...');
    
    // Clear any existing custom parameters and set fresh ones
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, googleProvider);
    
    console.log('Google sign-in successful:', {
      uid: result.user?.uid,
      email: result.user?.email,
      displayName: result.user?.displayName
    });
    
    // Validate the result
    if (!result || !result.user) {
      throw new Error('Authentication failed. Please try again.');
    }

    return result;
  } catch (error: any) {
    console.error('Google sign-in error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      customData: error.customData
    });
    
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
      case 'auth/operation-not-allowed':
        throw new Error('Google sign-in is not enabled. Please contact support.');
      case 'auth/cancelled-popup-request':
        throw new Error('Another sign-in popup is already open. Please close it and try again.');
      case 'auth/web-storage-unsupported':
        throw new Error('Your browser does not support authentication. Please try a different browser.');
      case 'auth/admin-restricted-operation':
        throw new Error('This action is restricted. Please contact support.');
      default:
        // For debugging - show the actual error in development
        const isDev = import.meta.env.DEV;
        if (isDev) {
          throw new Error(`Google sign-in failed: ${error.code} - ${error.message}`);
        }
        
        if (error.message?.includes('Firebase') || error.message?.includes('auth/')) {
          throw new Error('Authentication service error. Please try again or contact support.');
        }
        throw new Error('Unable to sign in with Google. Please try again.');
    }
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!isFirebaseInitialized) {
    throw new Error('Authentication is not available. Please contact support for assistance.');
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('An account with this email already exists. Please sign in instead.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      case 'auth/weak-password':
        throw new Error('Password should be at least 6 characters long.');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your connection and try again.');
      case 'auth/too-many-requests':
        throw new Error('Too many attempts. Please try again later.');
      default:
        throw new Error('Unable to create account. Please try again.');
    }
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!isFirebaseInitialized) {
    throw new Error('Authentication is not available. Please contact support for assistance.');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email. Please sign up first.');
      case 'auth/wrong-password':
        throw new Error('Incorrect password. Please try again.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled. Please contact support.');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your connection and try again.');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later.');
      default:
        throw new Error('Unable to sign in. Please check your credentials and try again.');
    }
  }
};

export const resetPassword = async (email: string) => {
  if (!isFirebaseInitialized) {
    throw new Error('Authentication is not available. Please contact support for assistance.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email address.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your connection and try again.');
      default:
        throw new Error('Unable to send reset email. Please try again.');
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
