import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocationProvider } from './contexts/LocationContext';

// Screens converted to web components
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DashboardScreen from './screens/DashboardScreen';
import CommunitiesScreen from './screens/CommunitiesScreen';
import CommunityDetailScreen from './screens/CommunityDetailScreen';
import MessagesScreen from './screens/MessagesScreen';
import ProfileScreen from './screens/ProfileScreen';
import CreateEventScreen from './screens/CreateEventScreen';

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