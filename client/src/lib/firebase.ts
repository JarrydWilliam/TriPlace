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
    return result;
  } catch (error) {
    console.error('Redirect result error:', error);
    return null;
  }
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
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        throw new Error('Sign-in was cancelled. Please try again.');
      case 'auth/popup-blocked':
        throw new Error('Popup was blocked by your browser. Please allow popups and try again.');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your connection and try again.');
      case 'auth/unauthorized-domain':
        throw new Error('This domain is not authorized for Google sign-in.');
      default:
        throw new Error('Unable to sign in with Google. Please try again.');
    }
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!auth) {
    throw new Error('Authentication service not available');
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('An account with this email already exists.');
      case 'auth/weak-password':
        throw new Error('Password should be at least 6 characters.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      default:
        throw new Error('Unable to create account. Please try again.');
    }
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!auth) {
    throw new Error('Authentication service not available');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email.');
      case 'auth/wrong-password':
        throw new Error('Incorrect password.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later.');
      default:
        throw new Error('Unable to sign in. Please check your credentials.');
    }
  }
};

export const resetPassword = async (email: string) => {
  if (!auth) {
    throw new Error('Authentication service not available');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      default:
        throw new Error('Unable to send password reset email. Please try again.');
    }
  }
};

export const signOutUser = async () => {
  if (!auth) return;
  
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
  }
};