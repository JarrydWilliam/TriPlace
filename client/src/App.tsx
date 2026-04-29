import { Switch, Route, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { useEffect } from "react";
import { registerForPushNotifications } from "./lib/push-notifications";
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
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Reveal from "@/pages/reveal";
import Discover from "@/pages/discover";
import { AppUpdater } from "@/components/ui/app-updater";
import { GlobalScrollWrapper } from "@/components/ui/global-scroll-wrapper";
import { PwaUpdateChecker } from "@/components/ui/pwa-update-checker";
import { BackToTop } from "@/components/ui/back-to-top";

function Router() {
  const { user, firebaseUser, loading } = useAuth();
  const [location, setLocation] = useLocation();



  useEffect(() => {
    if (!loading && firebaseUser && user) {
      const needsOnboarding = !user.onboardingCompleted;
      const needsProfileSetup = !user.name || user.name === user.email?.split('@')[0];
      const isGoogleUser = firebaseUser.providerId === 'google.com' || firebaseUser.providerData.some(p => p.providerId === 'google.com');
      
      // Only redirect if user is on landing page or explicitly needs redirection
      if (location === '/' || location === '') {
        if (!isGoogleUser && needsProfileSetup) {
          setLocation('/profile-setup');
        } else if (needsOnboarding) {
          setLocation('/onboarding');
        } else {
          setLocation('/dashboard');
        }
      }
      
      // Handle completion redirects only
      else if (!needsOnboarding && location === '/onboarding') {
        setLocation('/dashboard');
      } else if (!needsProfileSetup && location === '/profile-setup') {
        if (needsOnboarding) {
          setLocation('/onboarding');
        } else {
          setLocation('/dashboard');
        }
      }
      // Register for push notifications on native devices
      if (user.onboardingCompleted) {
        registerForPushNotifications(user.id).catch(console.error);
      }
    }
  }, [user, firebaseUser, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <AnimatePresence mode="wait">
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
      <Route path="/discover" component={Discover} />
      <Route path="/reveal" component={Reveal} />
      <Route path="/communities" component={Communities} />
      <Route path="/kudos" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Force Dark Mode for High-End Feel */}
        <div className="dark min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
          <AuthProvider>
            <ThemeProvider defaultTheme="dark" storageKey="triplace-theme">
              <TooltipProvider>
                <GlobalScrollWrapper>
                  <Toaster />
                  <AppUpdater />
                  <PwaUpdateChecker />
                  <BackToTop />
                  <Router />
                </GlobalScrollWrapper>
              </TooltipProvider>
            </ThemeProvider>
          </AuthProvider>
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
