import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
// import { ThemeProvider } from "@/lib/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { useEffect } from "react";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import ProfileSetup from "@/pages/profile-setup";
import Profile from "@/pages/profile";
import Messaging from "@/pages/messaging";
import Community from "@/pages/community";
import Communities from "@/pages/communities";
import CreateEvent from "@/pages/create-event";
import ProfileSettings from "@/pages/settings/profile";
import AccountSettings from "@/pages/settings/account";
import NotificationSettings from "@/pages/settings/notifications";
import CommunitySettings from "@/pages/settings/community";
import SecuritySettings from "@/pages/settings/security";
import SupportSettings from "@/pages/settings/support";
import NotFound from "@/pages/not-found";
import { AppUpdater } from "@/components/ui/app-updater";

function Router() {
  const { user, firebaseUser, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && firebaseUser && user) {
      const needsOnboarding = !user.onboardingCompleted;
      const needsProfileSetup = !user.name || user.name === user.email?.split('@')[0];
      const isGoogleUser = firebaseUser.providerId === 'google.com' || firebaseUser.providerData.some(p => p.providerId === 'google.com');
      
      // Email users need profile setup if they don't have a proper name
      if (!isGoogleUser && needsProfileSetup && location !== '/profile-setup') {
        setLocation('/profile-setup');
      } else if (needsOnboarding && location !== '/onboarding' && location !== '/profile-setup') {
        setLocation('/onboarding');
      } else if (!needsOnboarding && !needsProfileSetup && (location === '/onboarding' || location === '/profile-setup')) {
        setLocation('/dashboard');
      }
    }
  }, [user, firebaseUser, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/messaging" component={Messaging} />
      <Route path="/messages" component={Messaging} />
      <Route path="/community/:communityId" component={Community} />
      <Route path="/create-event" component={CreateEvent} />
      <Route path="/settings/profile" component={ProfileSettings} />
      <Route path="/settings/account" component={AccountSettings} />
      <Route path="/settings/notifications" component={NotificationSettings} />
      <Route path="/settings/community" component={CommunitySettings} />
      <Route path="/settings/security" component={SecuritySettings} />
      <Route path="/settings/support" component={SupportSettings} />
      <Route path="/discover" component={Dashboard} />
      <Route path="/communities" component={Communities} />
      <Route path="/kudos" component={Dashboard} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppUpdater />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
