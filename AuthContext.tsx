import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

interface User {
  id: number;
  firebaseUid: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  interests: string[];
  onboardingCompleted: boolean;
  quizAnswers?: any;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign In
    GoogleSignin.configure({
      webClientId: 'AIzaSyDvvOMs_7vBWRiLm4HsqV9_SB7-xdGaIJI', // Your Firebase web client ID
    });

    // Initialize auth state
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check for cached user
      const cachedUser = await AsyncStorage.getItem('user');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }

      // Listen to Firebase auth state changes
      const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          await handleAuthenticatedUser(firebaseUser);
        } else {
          setUser(null);
          await AsyncStorage.removeItem('user');
        }
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Auth initialization error:', error);
      setLoading(false);
    }
  };

  const handleAuthenticatedUser = async (firebaseUser: any) => {
    try {
      // Try to get existing user from your backend
      const response = await fetch(`https://your-replit-app.replit.app/api/users/firebase/${firebaseUser.uid}`);
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      } else if (response.status === 404) {
        // Create new user
        const newUserData = {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          avatar: firebaseUser.photoURL,
          interests: [],
        };
        
        const createResponse = await fetch('https://your-replit-app.replit.app/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUserData),
        });
        
        if (createResponse.ok) {
          const createdUser = await createResponse.json();
          setUser(createdUser);
          await AsyncStorage.setItem('user', JSON.stringify(createdUser));
        }
      }
    } catch (error) {
      console.error('Error handling authenticated user:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Get the user's ID token
      const { idToken } = await GoogleSignin.signIn();
      
      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      
      // Sign-in the user with the credential
      await auth().signInWithCredential(googleCredential);
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
      setUser(null);
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}