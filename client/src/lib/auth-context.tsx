import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleRedirectResult } from "./firebase";
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
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
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Handle redirect result
    handleRedirectResult().then((result) => {
      if (result) {
        // User signed in successfully
        console.log('User signed in via redirect');
      }
    }).catch((error) => {
      console.error('Error handling redirect result:', error);
    });

    return () => unsubscribe();
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
