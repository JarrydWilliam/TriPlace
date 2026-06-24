import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, deleteUser } from "firebase/auth";
import { ERROR_MESSAGES } from "./production-config";

// Safely detect Capacitor native context without hard dependency
const isNativePlatform = (): boolean => {
  try {
    // @ts-ignore — dynamic check, Capacitor may not be installed yet
    return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
};

// Validate required Firebase env vars at startup — fail fast with clear message
// rather than shipping secrets in the JS bundle as hardcoded fallbacks.
const requiredVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
] as const;

const missing = requiredVars.filter((key) => !import.meta.env[key]);
if (missing.length > 0 && import.meta.env.PROD) {
  // In production, throw clearly so CI catches it before reaching users
  throw new Error(
    `[SameVibe] Missing required Firebase environment variables: ${missing.join(", ")}. ` +
    `Set them in your .env file or Codemagic environment variable groups.`
  );
}

// Firebase configuration — all values come from environment variables only.
// Copy .env.example → .env and fill in your Firebase project values.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? "",
  authDomain:        `${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "samevibe-app"}.firebaseapp.com`,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? "samevibe-app",
  storageBucket:     `${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET  ?? "samevibe-app"}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? "",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     ?? "",
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

export const deleteFirebaseAccount = async () => {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    await deleteUser(user);
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('For your security, please sign out and sign back in before deleting your account.');
    }
    throw new Error('Unable to delete authentication account. Please contact support.');
  }
};
