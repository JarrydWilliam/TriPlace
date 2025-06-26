import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { User } from "@shared/schema";
import { apiRequest } from "./queryClient";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
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
    // Set a maximum loading time to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth initialization timeout, proceeding with app');
      setLoading(false);
    }, 5000); // Reduced to 5 seconds for mobile

    // Check if Firebase is properly initialized
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      console.warn('Firebase auth not available, proceeding without authentication');
      clearTimeout(loadingTimeout);
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        clearTimeout(loadingTimeout);
        setFirebaseUser(firebaseUser);
        setAuthError(null);
        
        if (firebaseUser) {
          try {
            // Try to get existing user
            const response = await fetch(`/api/users/firebase/${firebaseUser.uid}`);
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
              const createdUser = await createResponse.json();
              setUser(createdUser);
            }
          } catch (error) {
            console.error('Error handling user authentication:', error);
            setAuthError('Authentication service temporarily unavailable');
          }
        } else {
          setUser(null);
        }
        
        setLoading(false);
      });

      return () => {
        clearTimeout(loadingTimeout);
        if (unsubscribe) unsubscribe();
      };
    } catch (error) {
      console.error('Failed to initialize Firebase auth:', error);
      setAuthError('Authentication service unavailable');
      setLoading(false);
      clearTimeout(loadingTimeout);
    }
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    firebaseUser,
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
