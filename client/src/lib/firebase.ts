import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { ERROR_MESSAGES } from "./production-config";

// Firebase configuration with provided credentials
const firebaseConfig = {
  apiKey: "AIzaSyDvvOMs_7vBWRiLm4HsqV9_SB7-xdGaIJI",
  authDomain: "triplace-v2.firebaseapp.com",
  projectId: "triplace-v2",
  storageBucket: "triplace-v2.firebasestorage.app",
  messagingSenderId: "779102688787",
  appId: "1:779102688787:web:176d1dc6c4f165b01e91e6",
  measurementId: "G-EYXMFMMXCY"
};

// Firebase configuration is now hardcoded with provided credentials

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
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
      case 'auth/unauthorized-domain':
        throw new Error('This domain is not authorized for authentication. Please contact support.');
      default:
        throw new Error('Authentication failed. Please try again or contact support.');
    }
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error('Unable to sign out. Please try again.');
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error: any) {
    // Handle specific Firebase auth errors
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email. Please sign up first.');
      case 'auth/wrong-password':
        throw new Error('Incorrect password. Please try again.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later.');
      case 'auth/network-request-failed':
        throw new Error(ERROR_MESSAGES.NETWORK);
      default:
        throw new Error('Sign-in failed. Please check your credentials and try again.');
    }
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Send email verification
    await sendEmailVerification(result.user);
    return result;
  } catch (error: any) {
    // Handle specific Firebase auth errors
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('An account with this email already exists. Please sign in instead.');
      case 'auth/weak-password':
        throw new Error('Password should be at least 6 characters long.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      case 'auth/network-request-failed':
        throw new Error(ERROR_MESSAGES.NETWORK);
      default:
        throw new Error('Sign-up failed. Please try again.');
    }
  }
};
