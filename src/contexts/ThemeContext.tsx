import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
}

const lightColors: ThemeColors = {
  primary: '#007AFF',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  accent: '#FF6B35',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

const darkColors: ThemeColors = {
  primary: '#0A84FF',
  background: '#1C1C1E',
  surface: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  accent: '#FF6B35',
  success: '#32D74B',
  warning: '#FF9F0A',
  error: '#FF453A',
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((savedTheme) => {
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme as Theme);
      }
    });
  }, []);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const isDark = theme === 'system' 
    ? systemColorScheme === 'dark'
    : theme === 'dark';

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{
      theme,
      isDark,
      colors,
      setTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}