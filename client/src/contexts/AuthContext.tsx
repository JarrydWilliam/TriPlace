import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
    // Check for existing session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      // This would integrate with Firebase Auth
      // For now, creating a mock user for development
      const mockUser: User = {
        id: '1',
        email,
        displayName: email.split('@')[0],
        hasCompletedOnboarding: false,
        interests: [],
        communities: [],
        createdAt: new Date(),
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      // This would integrate with Firebase Auth
      const mockUser: User = {
        id: Date.now().toString(),
        email,
        displayName,
        hasCompletedOnboarding: false,
        interests: [],
        communities: [],
        createdAt: new Date(),
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
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