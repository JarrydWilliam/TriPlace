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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Firebase auth state changed:', firebaseUser?.email);
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          console.log('Fetching user data for Firebase UID:', firebaseUser.uid);
          // Try to get existing user
          const response = await fetch(`/api/users/firebase/${firebaseUser.uid}`);
          console.log('User fetch response status:', response.status);
          
          if (response.ok) {
            const userData = await response.json();
            console.log('Found existing user:', userData.email);
            setUser(userData);
          } else if (response.status === 404) {
            console.log('Creating new user...');
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
              console.log('Created new user:', createdUser.email);
              setUser(createdUser);
            } else {
              const errorText = await createResponse.text();
              console.error('Failed to create user:', errorText);
            }
          } else {
            console.error('Unexpected response status:', response.status);
          }
        } catch (error) {
          console.error('Error handling user authentication:', error);
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
