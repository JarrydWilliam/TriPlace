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
import CompleteProfile from "@/pages/complete-profile";
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
import Events from "@/pages/events";
import DeleteAccount from "@/pages/delete-account";
import Safety from "@/pages/safety";
import AdminMetrics from "@/pages/admin/metrics";
import ModerationDashboard from "@/pages/admin/moderation-dashboard";
import GrowthDashboard from "@/pages/admin/growth-dashboard";
import SubmitEvent from "@/pages/submit-event";

import { AppUpdater } from "@/components/ui/app-updater";
import { GlobalScrollWrapper } from "@/components/ui/global-scroll-wrapper";
import { PwaUpdateChecker } from "@/components/ui/pwa-update-checker";
import { BackToTop } from "@/components/ui/back-to-top";
import { PostEventFlow } from "@/components/safety/post-event-flow";
import { ThemeProvider } from "@/lib/theme-context";
import { useOtaUpdate } from "@/hooks/use-ota-update";
import { FeatureFlagsProvider } from "@/hooks/use-feature-flags";

/** Activates OTA update checks — must be inside AuthProvider/Toaster context */
function OtaUpdateActivator() {
  useOtaUpdate();
  return null;
}

import { isAdmin } from "@/lib/is-admin";

function AdminRoute() {
  const { user } = useAuth();

  if (!user || !isAdmin(user.email)) {
    return (
      <div className="min-h-[100dvh] bg-[#080612] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-white/50 text-sm">
            This page is restricted to administrators.
          </p>
        </div>
      </div>
    );
  }

  return <AdminMetrics />;
}

function GrowthAdminRoute() {
  const { user } = useAuth();

  if (!user || !isAdmin(user.email)) {
    return (
      <div className="min-h-[100dvh] bg-[#080612] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-white/50 text-sm">
            This page is restricted to administrators.
          </p>
        </div>
      </div>
    );
  }

  return <GrowthDashboard />;
}

function Router() {
  const { user, firebaseUser, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const initRevenueCat = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      const rcKey = import.meta.env.VITE_REVENUECAT_API_KEY;

      if (!rcKey) {
        console.warn(
          "[SameVibe] VITE_REVENUECAT_API_KEY not set — RevenueCat disabled.",
        );
        return;
      }

      try {
        await Purchases.configure({ apiKey: rcKey });

        if (user?.id) {
          await Purchases.logIn({
            appUserID: String(user.id),
          });
        }
      } catch (error) {
        console.error("RevenueCat Init Error:", error);
      }
    };

    if (user) {
      void initRevenueCat();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && firebaseUser && user) {
      const needsOnboarding = !user.onboardingCompleted;
      const needsProfileSetup =
        !user.name || user.name === user.email?.split("@")[0];

      const isSocialUser =
        firebaseUser.providerId === "google.com" ||
        firebaseUser.providerId === "apple.com" ||
        firebaseUser.providerData.some(
          (provider) =>
            provider.providerId === "google.com" ||
            provider.providerId === "apple.com",
        );

      const requiresProfile = !isSocialUser && needsProfileSetup;
      const needsCompliance = false;

      const publicRoutes = ["/terms", "/privacy", "/delete-account", "/safety"];
      const isPublicRoute = publicRoutes.includes(location);

      if (!isPublicRoute) {
        if (needsCompliance && location !== "/complete-profile") {
          setLocation("/complete-profile");
        } else if (
          !needsCompliance &&
          requiresProfile &&
          location !== "/profile-setup"
        ) {
          setLocation("/profile-setup");
        } else if (
          !needsCompliance &&
          !requiresProfile &&
          needsOnboarding &&
          location !== "/onboarding"
        ) {
          setLocation("/onboarding");
        } else if (
          !needsCompliance &&
          !requiresProfile &&
          !needsOnboarding &&
          [
            "/",
            "",
            "/login",
            "/signup",
            "/onboarding",
            "/profile-setup",
            "/complete-profile",
          ].includes(location)
        ) {
          setLocation("/dashboard");
        }
      }

      if (user.onboardingCompleted) {
        registerForPushNotifications(user.id).catch(console.error);
      }
    }
  }, [user, firebaseUser, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#080612] flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full opacity-20 blur-[100px] bg-primary/40 pointer-events-none" />

        <div className="flex flex-col items-center gap-4 relative z-10 text-center px-4">
          <div className="w-18 h-18 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-center p-3">
            <img
              src="/logo.png"
              alt="SameVibe"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <h1 className="text-xl font-bold tracking-tight text-white font-display">
              SameVibe
            </h1>
            <p className="text-xs font-medium text-cyan-400/80 tracking-wide">
              Find your people, Find your Vibe
            </p>

            <div className="flex items-center gap-1 mt-2">
              <div
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
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
        <Route path="/complete-profile" component={CompleteProfile} />
        <Route path="/reveal" component={Reveal} />

        {/* Protected Main Routes */}
        <Route path="/profile" component={Profile} />
        <Route path="/profile/:userId" component={Profile} />
        <Route path="/messaging" component={Messaging} />
        <Route path="/messages" component={Messaging} />
        <Route path="/community/:communityId" component={Community} />
        <Route path="/create-event" component={CreateEvent} />
        <Route path="/settings/profile" component={ProfileSettings} />
        <Route path="/settings/account" component={AccountSettings} />
        <Route
          path="/settings/notifications"
          component={NotificationSettings}
        />
        <Route path="/settings/community" component={CommunitySettings} />
        <Route path="/settings/security" component={SecuritySettings} />
        <Route path="/settings/support" component={SupportSettings} />
        <Route path="/discover" component={Discover} />
        <Route path="/events" component={Events} />
        <Route path="/communities" component={Communities} />
        <Route path="/kudos" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/delete-account" component={DeleteAccount} />
        <Route path="/safety" component={Safety} />
        <Route path="/admin/metrics" component={AdminRoute} />
        <Route path="/admin/moderation" component={ModerationDashboard} />
        <Route path="/admin/growth" component={GrowthAdminRoute} />
        <Route path="/submit-event" component={SubmitEvent} />

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
        <div className="dark min-h-[100dvh] bg-background text-foreground antialiased selection:bg-primary/30">
          <AuthProvider>
            <ThemeProvider>
              <TooltipProvider>
                <FeatureFlagsProvider>
                  <GlobalScrollWrapper>
                    <Toaster />
                    <AppUpdater />
                    <PwaUpdateChecker />
                    <BackToTop />
                    <PostEventFlow />
                    <OtaUpdateActivator />
                    <Router />
                  </GlobalScrollWrapper>
                </FeatureFlagsProvider>
              </TooltipProvider>
            </ThemeProvider>
          </AuthProvider>
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;