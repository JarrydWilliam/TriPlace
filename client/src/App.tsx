import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context-rebuilt";
import { ThemeProvider } from "@/lib/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { MobileNav } from "@/components/mobile-nav";

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
      // Implement proper authentication flow: login → quiz → dashboard
      const needsOnboarding = !user.onboardingCompleted;
      const isOnOnboardingPage = location === '/onboarding';
      const isOnDashboard = location === '/dashboard';
      
      if (needsOnboarding && !isOnOnboardingPage) {
        // Redirect to quiz if not completed
        setLocation('/onboarding');
      } else if (!needsOnboarding && (isOnOnboardingPage || location === '/')) {
        // Redirect to dashboard after quiz completion
        setLocation('/dashboard');
      }
    }
  }, [user, firebaseUser, loading, location, setLocation]);

  // Mobile-optimized loading state with shorter timeout
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream-50 dark:bg-slate-900 overflow-hidden">
        <div className="text-center">
          <div className="text-amber-800 dark:text-cyan-300 font-medium mb-2">
            TriPlace
          </div>
          <div className="text-sm text-amber-600 dark:text-cyan-400">
            Loading your digital third place...
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show public routes only
  if (!firebaseUser) {
    return (
      <div className="h-screen overflow-hidden">
        <Switch>
          <Route path="/" component={Landing} />
          <Route component={() => <Landing />} />
        </Switch>
      </div>
    );
  }

  // If authenticated but no user data, show loading
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream-50 dark:bg-slate-900 overflow-hidden">
        <div className="text-center">
          <div className="text-amber-800 dark:text-cyan-300 font-medium mb-2">
            Setting up your account...
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user routes
  return (
    <div className="min-h-screen overflow-x-hidden pb-20 md:pb-0">
      <Switch>
        <Route path="/" component={Dashboard} />
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
        <Route component={NotFound} />
      </Switch>
      <MobileNav />
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

              <Router />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
