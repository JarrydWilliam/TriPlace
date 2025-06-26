import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { useEffect } from "react";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Profile from "@/pages/profile";
import Messaging from "@/pages/messaging";
import Community from "@/pages/community";
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/profile" component={Profile} />
      <Route path="/messaging" component={Messaging} />
      <Route path="/messages" component={Messaging} />
      <Route path="/community/:communityId" component={Community} />
      <Route path="/discover" component={Dashboard} />
      <Route path="/communities" component={Dashboard} />
      <Route path="/kudos" component={Dashboard} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
