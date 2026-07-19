import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { User } from "@shared/schema";
import { apiRequest, getApiUrl } from "./queryClient";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
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
  const [authError, setAuthError] = useState<string | null>(null);

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
      setAuthError(null);
      
      if (firebaseUser) {
        try {
          // Add an abort controller to prevent infinite hanging if the network or service worker gets stuck
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          try {
            // Try to get existing user
            const token = await firebaseUser.getIdToken();
            const response = await fetch(getApiUrl(`/api/users/firebase/${firebaseUser.uid}`), {
              signal: controller.signal,
              headers: { "Authorization": `Bearer ${token}` }
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
                dateOfBirth: sessionStorage.getItem('pendingDOB') || null,
                termsVersion: sessionStorage.getItem('pendingTermsVersion') || null,
              };
              
              const createResponse = await apiRequest('POST', '/api/users', newUserData);
              if (createResponse.ok) {
                const createdUser = await createResponse.json();
                setUser(createdUser);
                // Clear the session storage
                sessionStorage.removeItem('pendingDOB');
                sessionStorage.removeItem('pendingTermsVersion');
              } else {
                const errorData = await createResponse.json().catch(() => null);
                // If the backend rejects the user creation (e.g. under 18, missing EULA)
                // we must sign them out of Firebase so they aren't stuck in a ghost state.
                await auth.signOut();
                setFirebaseUser(null);
                setUser(null);
                throw new Error(errorData?.message || "Failed to create user profile. Please check your eligibility and try again.");
              }
            } else {
              throw new Error(`Server returned ${response.status}: Unable to load profile.`);
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (error: any) {
          // Authentication error - user will remain null, but we expose the error
          console.error("Auth fetch failed:", error);
          setAuthError(error.message || "Failed to load your profile. Please try again later.");
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
      setAuthError(null);
    } catch (error) {
      // Sign out error - will clear state regardless
      setUser(null);
      setFirebaseUser(null);
      setAuthError(null);
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch(getApiUrl(`/api/users/firebase/${firebaseUser.uid}`), {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setAuthError(null);
        } else {
          setAuthError(`Failed to refresh profile: ${response.status}`);
        }
      } catch (error: any) {
        console.error('Failed to refresh user:', error);
        setAuthError(error.message || "Failed to refresh profile.");
      }
    }
  };

  const value = {
    firebaseUser,
    user,
    loading,
    authError,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
