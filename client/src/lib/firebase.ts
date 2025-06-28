import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
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
