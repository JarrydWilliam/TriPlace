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
import { Purchases } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";
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
import DeleteAccount from "@/pages/delete-account";
import { AppUpdater } from "@/components/ui/app-updater";
import { GlobalScrollWrapper } from "@/components/ui/global-scroll-wrapper";
import { PwaUpdateChecker } from "@/components/ui/pwa-update-checker";
import { BackToTop } from "@/components/ui/back-to-top";
import { PostEventFlow } from "@/components/safety/post-event-flow";
import { ThemeProvider } from "@/lib/theme-context";
import AdminMetrics from "@/pages/admin/metrics";

function AdminRoute() {
  const { user } = useAuth();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
    return (
      <div className="min-h-[100dvh] bg-[#080612] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-white/50 text-sm">This page is restricted to administrators.</p>
        </div>
      </div>
    );
  }
  return <AdminMetrics />;
}

function Router() {
  const { user, firebaseUser, loading } = useAuth();
  const [location, setLocation] = useLocation();



  useEffect(() => {
    const initRevenueCat = async () => {
      if (!Capacitor.isNativePlatform()) return;
      const rcKey = import.meta.env.VITE_REVENUECAT_API_KEY;
      if (!rcKey) {
        // Skip RevenueCat initialization if the key is not configured.
        // Never fall back to a test/hardcoded key in production.
        console.warn('[SameVibe] VITE_REVENUECAT_API_KEY not set — RevenueCat disabled.');
        return;
      }
      try {
        await Purchases.configure({ apiKey: rcKey });
        if (user?.id) {
          await Purchases.logIn({ appUserID: String(user.id) });
        }
      } catch (error) {
        console.error("RevenueCat Init Error:", error);
      }
    };
    if (user) {
      initRevenueCat();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && firebaseUser && user) {
      const needsOnboarding = !user.onboardingCompleted;
      const needsProfileSetup = !user.name || user.name === user.email?.split('@')[0];
      const isGoogleUser = firebaseUser.providerId === 'google.com' || firebaseUser.providerData.some(p => p.providerId === 'google.com');
      
      const requiresProfile = !isGoogleUser && needsProfileSetup;
      
      const publicRoutes = ['/terms', '/privacy', '/delete-account'];
      const isPublicRoute = publicRoutes.includes(location);

      if (!isPublicRoute) {
        if (requiresProfile && location !== '/profile-setup') {
          setLocation('/profile-setup');
        } else if (!requiresProfile && needsOnboarding && location !== '/onboarding') {
          setLocation('/onboarding');
        } else if (!requiresProfile && !needsOnboarding && ['/', '', '/login', '/signup', '/onboarding', '/profile-setup'].includes(location)) {
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
      <div className="min-h-[100dvh] bg-[#080612] flex items-center justify-center relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full opacity-20 blur-[100px] bg-primary/40 pointer-events-none" />
        
        <div className="flex flex-col items-center gap-6 relative z-10">
          {/* Pulsing Logo Circle */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full border border-primary/30 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/40 rounded-full flex items-center justify-center backdrop-blur-xl shadow-[0_0_40px_rgba(255,107,53,0.3)] overflow-hidden">
              <img src="/logo.png" alt="SameVibe" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">SameVibe</h1>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
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
      <Route path="/delete-account" component={DeleteAccount} />
      <Route path="/admin/metrics" component={AdminRoute} />
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
        <div className="dark min-h-[100dvh] bg-background text-foreground antialiased selection:bg-primary/30">
          <AuthProvider>
            <ThemeProvider>
              <TooltipProvider>
                <GlobalScrollWrapper>
                  <Toaster />
                  <AppUpdater />
                  <PwaUpdateChecker />
                  <BackToTop />
                  <PostEventFlow />
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
