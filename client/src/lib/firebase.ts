import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from "firebase/auth";
import { ERROR_MESSAGES } from "./production-config";

// Safely detect Capacitor native context without hard dependency
// Once @capacitor/core is installed, this will properly detect iOS/Android
const isNativePlatform = (): boolean => {
  try {
    // @ts-ignore — dynamic check, Capacitor may not be installed yet
    return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
};

// Firebase configuration — loaded from environment variables
// Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID,
// VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_STORAGE_BUCKET in your .env file.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDvvOMs_7vBWRiLm4HsqV9_SB7-xdGaIJI",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "triplace-v2"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "triplace-v2",
  storageBucket: `${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "triplace-v2"}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "779102688787",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:779102688787:web:176d1dc6c4f165b01e91e6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-EYXMFMMXCY",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    // Capacitor native (iOS/Android) requires redirect — popups don't work in WKWebView/WebView
    if (isNativePlatform()) {
      await signInWithRedirect(auth, googleProvider);
      const result = await getRedirectResult(auth);
      return result;
    }
    // Standard browser: use popup for better UX
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    switch (error.code) {
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
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
