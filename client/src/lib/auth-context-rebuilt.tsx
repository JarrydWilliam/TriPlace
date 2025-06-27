import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest } from "./queryClient";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Device detection for mobile redirect vs desktop popup
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      // Try to get existing user
      const response = await apiRequest("GET", `/api/users/firebase/${firebaseUser.uid}`);
      if (response.ok) {
        const userData = await response.json();
        return userData;
      }

      // Create new user if doesn't exist
      const createResponse = await apiRequest("POST", "/api/users", {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
        avatar: firebaseUser.photoURL,
        onboardingCompleted: false
      });

      if (createResponse.ok) {
        const newUser = await createResponse.json();
        return newUser;
      }

      console.error("Failed to create user");
      return null;
    } catch (error) {
      console.error("Error fetching/creating user:", error);
      return null;
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await fetchOrCreateUser(firebaseUser);
      setUser(userData);
    }
  };

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        const userData = await fetchOrCreateUser(firebaseUser);
        if (mounted) {
          setUser(userData);
          setLoading(false);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    // Handle redirect results for mobile authentication
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          // Auth state change will handle user creation
          console.log("Redirect authentication successful");
        }
      } catch (error: any) {
        console.error("Redirect authentication error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          console.error("Domain not authorized. Please add this domain to Firebase Auth settings.");
        }
      }
    };

    handleRedirectResult();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      if (isMobileDevice()) {
        // Use redirect for mobile devices
        await signInWithRedirect(auth, provider);
      } else {
        // Use popup for desktop
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          console.log("Google sign-in successful");
        }
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error("This domain is not authorized. Please contact support.");
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error("Popup was blocked. Please allow popups and try again.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Sign-in was cancelled.");
      } else {
        throw new Error("Google sign-in failed. Please try again.");
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        console.log("Email sign-in successful");
      }
    } catch (error: any) {
      console.error("Email sign-in error:", error);
      
      if (error.code === 'auth/user-not-found') {
        throw new Error("No account found with this email address.");
      } else if (error.code === 'auth/wrong-password') {
        throw new Error("Incorrect password.");
      } else if (error.code === 'auth/invalid-email') {
        throw new Error("Invalid email address.");
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error("Too many failed attempts. Please try again later.");
      } else {
        throw new Error("Sign-in failed. Please try again.");
      }
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        // Update display name
        await updateProfile(result.user, { displayName: name });
        console.log("Email sign-up successful");
      }
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error("An account with this email already exists.");
      } else if (error.code === 'auth/weak-password') {
        throw new Error("Password should be at least 6 characters.");
      } else if (error.code === 'auth/invalid-email') {
        throw new Error("Invalid email address.");
      } else {
        throw new Error("Sign-up failed. Please try again.");
      }
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      if (error.code === 'auth/user-not-found') {
        throw new Error("No account found with this email address.");
      } else if (error.code === 'auth/invalid-email') {
        throw new Error("Invalid email address.");
      } else {
        throw new Error("Password reset failed. Please try again.");
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("Sign-out error:", error);
      throw new Error("Sign-out failed. Please try again.");
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}