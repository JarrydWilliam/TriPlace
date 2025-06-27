import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Check for redirect result on page load
export const handleRedirectResult = async () => {
  if (!auth) return null;
  
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('Google redirect sign-in successful:', {
        uid: result.user?.uid,
        email: result.user?.email,
        displayName: result.user?.displayName
      });
    }
    return result;
  } catch (error: any) {
    console.error('Redirect result error:', error);
    return null;
  }
};

// Detect if device is mobile
const isMobileDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android|mobile|tablet/.test(userAgent);
};

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error('Authentication service not available');
  }

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    if (!result || !result.user) {
      throw new Error('Authentication failed');
    }

      return result;
    }
  } catch (error: any) {
    console.error('Google sign-in error details:', {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200)
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
        throw new Error('This domain is not authorized for Google sign-in. You need to add your current domain to Firebase Console → Authentication → Settings → Authorized domains.');
      case 'auth/operation-not-allowed':
        throw new Error('Google sign-in is not enabled in Firebase Console. Please contact support.');
      case 'auth/cancelled-popup-request':
        throw new Error('Another sign-in popup is already open. Please close it and try again.');
      case 'auth/web-storage-unsupported':
        throw new Error('Your browser does not support authentication. Please try a different browser.');
      case 'auth/admin-restricted-operation':
        throw new Error('This action is restricted. Please contact support.');
      case 'auth/invalid-credential':
        throw new Error('Invalid credentials. Please try again.');
      default:
        // For debugging - show the actual error in development
        const isDev = import.meta.env.DEV;
        if (isDev && error.code) {
          throw new Error(`Google sign-in failed: ${error.code} - ${error.message}`);
        }
        
        // Generic fallback for production
        throw new Error('Unable to sign in with Google. Please try again or use email sign-in.');
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
