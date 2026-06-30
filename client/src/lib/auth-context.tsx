import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { User } from "@shared/schema";
import { apiRequest, getApiUrl } from "./queryClient";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fallback timeout: if Firebase fails to initialize or onAuthStateChanged hangs
    // due to iOS WKWebView IndexedDB issues, we force the loading state to false
    // so the app isn't permanently stuck on the loading screen.
    const fallbackTimeout = setTimeout(() => {
      console.warn("Firebase onAuthStateChanged timed out. Forcing loading to false.");
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(fallbackTimeout);
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Add an abort controller to prevent infinite hanging if the network or service worker gets stuck
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          try {
            // Try to get existing user
            const response = await fetch(getApiUrl(`/api/users/firebase/${firebaseUser.uid}`), {
              signal: controller.signal
            });
            
            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
            } else if (response.status === 404) {
              // Create new user
              const newUserData = {
                firebaseUid: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                avatar: firebaseUser.photoURL,
                interests: [],
              };
              
              const createResponse = await apiRequest('POST', '/api/users', newUserData);
              if (createResponse.ok) {
                const createdUser = await createResponse.json();
                setUser(createdUser);
              }
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (error) {
          // Authentication error - user will remain null
          console.error("Auth fetch failed:", error);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      // Sign out error - will clear state regardless
      setUser(null);
      setFirebaseUser(null);
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      try {
        const response = await fetch(getApiUrl(`/api/users/firebase/${firebaseUser.uid}`));
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  };

  const value = {
    firebaseUser,
    user,
    loading,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
