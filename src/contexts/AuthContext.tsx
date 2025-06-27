import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  hasCompletedOnboarding: boolean;
  interests: string[];
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  };
  communities: string[];
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await firestore()
          .collection('users')
          .doc(firebaseUser.uid)
          .get();
          
        if (userDoc.exists) {
          const userData = userDoc.data();
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || userData?.displayName || '',
            photoURL: firebaseUser.photoURL || userData?.photoURL,
            hasCompletedOnboarding: userData?.hasCompletedOnboarding || false,
            interests: userData?.interests || [],
            location: userData?.location,
            communities: userData?.communities || [],
            createdAt: userData?.createdAt?.toDate() || new Date(),
          });
        } else {
          const newUser = {
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL,
            hasCompletedOnboarding: false,
            interests: [],
            communities: [],
            createdAt: new Date(),
          };
          
          await firestore()
            .collection('users')
            .doc(firebaseUser.uid)
            .set(newUser);
            
          setUser({ id: firebaseUser.uid, ...newUser });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    await auth().signInWithEmailAndPassword(email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const { user: firebaseUser } = await auth().createUserWithEmailAndPassword(email, password);
    await firebaseUser.updateProfile({ displayName });
  };

  const signOut = async () => {
    await auth().signOut();
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    await firestore()
      .collection('users')
      .doc(user.id)
      .update(updates);
      
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}