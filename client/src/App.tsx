import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProductionWrapper } from "@/components/production-ready";

import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import Landing from "@/pages/landing";
import DashboardMobile from "@/pages/dashboard-mobile";
import DashboardDesktop from "@/pages/dashboard";
import OnboardingMobile from "@/pages/onboarding-mobile";
import OnboardingDesktop from "@/pages/onboarding";
import ProfileMobile from "@/pages/profile-mobile";
import ProfileDesktop from "@/pages/profile";
import MessagingMobile from "@/pages/messaging-mobile";
import MessagingDesktop from "@/pages/messaging";
import CommunityPage from "@/pages/community";
import CreateEventMobile from "@/pages/create-event-mobile";
import CreateEventDesktop from "@/pages/create-event";
import ProfileSettings from "@/pages/settings/profile";
import AccountSettings from "@/pages/settings/account";
import NotificationSettings from "@/pages/settings/notifications";
import CommunitySettings from "@/pages/settings/community";
import SecuritySettings from "@/pages/settings/security";
import SupportSettings from "@/pages/settings/support";
import NotFound from "@/pages/not-found";

// Responsive component wrappers
function Dashboard() {
  const isMobile = useIsMobile();
  return isMobile ? <DashboardMobile /> : <DashboardDesktop />;
}

function Onboarding() {
  const isMobile = useIsMobile();
  return isMobile ? <OnboardingMobile /> : <OnboardingDesktop />;
}

function Profile() {
  const isMobile = useIsMobile();
  return isMobile ? <ProfileMobile /> : <ProfileDesktop />;
}

function Messaging() {
  const isMobile = useIsMobile();
  return isMobile ? <MessagingMobile /> : <MessagingDesktop />;
}

function CreateEvent() {
  const isMobile = useIsMobile();
  return isMobile ? <CreateEventMobile /> : <CreateEventDesktop />;
}

function Router() {
  const { user, firebaseUser, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

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
      <div className="min-h-screen">
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
    <div className="min-h-screen">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/:userId" component={Profile} />
        <Route path="/messaging" component={Messaging} />
        <Route path="/messages" component={Messaging} />
        <Route path="/community/:communityId" component={CommunityPage} />
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
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <ProductionWrapper>
              <Router />
              <Toaster />
            </ProductionWrapper>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
