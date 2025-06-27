import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  accent: '#FF6B35',
  success: '#30D158',
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
  const [theme, setThemeState] = useState<Theme>('system');
  
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme());

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    document.documentElement.className = isDark ? 'dark' : '';
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}