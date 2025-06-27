import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalPWAPrompt } from "@/components/ui/global-pwa-prompt";
import { useEffect } from "react";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Profile from "@/pages/profile";
import Messaging from "@/pages/messaging";
import Community from "@/pages/community";
import CreateEvent from "@/pages/create-event";
import ProfileSettings from "@/pages/settings/profile";
import AccountSettings from "@/pages/settings/account";
import NotificationSettings from "@/pages/settings/notifications";
import CommunitySettings from "@/pages/settings/community";
import SecuritySettings from "@/pages/settings/security";
import SupportSettings from "@/pages/settings/support";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, firebaseUser, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && firebaseUser && user) {
      // Check if user needs to complete onboarding
      const needsOnboarding = !user.onboardingCompleted;
      const isOnOnboardingPage = location === '/onboarding';
      
      if (needsOnboarding && !isOnOnboardingPage) {
        setLocation('/onboarding');
      } else if (!needsOnboarding && isOnOnboardingPage) {
        setLocation('/dashboard');
      }
    }
  }, [user, firebaseUser, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 overflow-hidden">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/onboarding" component={Onboarding} />
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
        <Route path="/communities" component={Dashboard} />
        <Route path="/kudos" component={Dashboard} />
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <GlobalPWAPrompt />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
