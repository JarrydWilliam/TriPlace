import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocationProvider } from './contexts/LocationContext';

// Screens converted to web components
import LoginScreen from '../../src/screens/LoginScreen';
import OnboardingScreen from '../../src/screens/OnboardingScreen';
import DashboardScreen from '../../src/screens/DashboardScreen';
import CommunitiesScreen from '../../src/screens/CommunitiesScreen';
import CommunityDetailScreen from '../../src/screens/CommunityDetailScreen';
import MessagesScreen from '../../src/screens/MessagesScreen';
import ProfileScreen from '../../src/screens/ProfileScreen';
import CreateEventScreen from '../../src/screens/CreateEventScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AppNavigator() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <Router>
      <Routes>
        {user ? (
          user.hasCompletedOnboarding ? (
            <>
              <Route path="/" element={<DashboardScreen />} />
              <Route path="/communities" element={<CommunitiesScreen />} />
              <Route path="/community/:id" element={<CommunityDetailScreen />} />
              <Route path="/messages" element={<MessagesScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/create-event" element={<CreateEventScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/onboarding" element={<OnboardingScreen />} />
              <Route path="*" element={<Navigate to="/onboarding" replace />} />
            </>
          )
        ) : (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            <AppNavigator />
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}