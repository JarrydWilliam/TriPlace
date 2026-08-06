import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useCommunityUpdates } from "@/hooks/use-community-updates";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLiveMembers } from "@/hooks/use-live-members";
import { useTheme } from "@/lib/theme-context";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SharedCommunityCard } from "@/components/ui/community-card";
import { PremiumEventCard } from "@/components/ui/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MapPin,
  Settings,
  Sun,
  Moon,
  CalendarDays,
  Plus,
  Clock,
  Star,
  Award,
  Users,
  TrendingUp,
  Heart,
  User as UserIcon,
  Mail,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  Edit,
  Trash2,
  Camera,
  Lock,
  Smartphone,
  AlertTriangle,
  Compass,
  X,
  Sparkles,
  Flame,
} from "lucide-react";
import { Community, Event, User } from "@shared/schema";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { PaywallModal } from "@/components/paywall-modal";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Link, useLocation as useRouterLocation } from "wouter";
import { ComponentLoadingSpinner } from "@/components/loading-spinner";
import { InlineErrorMessage } from "@/components/ui/error-message";
import { Logo } from "@/components/ui/logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShareQR } from "@/components/ui/share-qr";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { PWAInstall } from "@/components/ui/pwa-install";
import { AgentInsightsCard } from "@/components/ui/agent-insights";
import { VibePassport } from "@/components/ui/vibe-passport";

import { EventCalendar } from "@/components/ui/event-calendar";
import { EventDetailsModal } from "@/components/ui/event-details-modal";
import { MobileNav } from "@/components/layout/mobile-nav";

import { VibePageHeader } from "@/components/layout/vibe-page-header";
import { VibeEventCard } from "@/components/ui/vibe-event-card";
import { trackEvent } from "@/lib/telemetry";

// ── Module-level mini-components ──────────────────────────────────────────────
// Defined outside Dashboard so React hooks (useEffect) are called at the
// component level — not inside a .map() callback, which would violate Rules of Hooks.

/** Wraps SharedCommunityCard and fires community_card_viewed on first render */
function SuggestedCommunityCard({
  community,
  userId,
  onJoin,
}: {
  community: any;
  userId?: number;
  onJoin: () => void;
}) {
  useEffect(() => {
    trackEvent('community_card_viewed', {
      userId,
      metadata: { communityId: community.id, communityName: community.name },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);

  return (
    <div className="w-[270px] min-w-[270px] max-w-[270px] h-[220px] snap-start flex-shrink-0">
      <SharedCommunityCard
        community={community}
        joined={false}
        onJoin={onJoin}
      />
    </div>
  );
}

/** Empty state for Suggested Communities — fires empty_state_shown once on mount */
function SuggestedCommunitiesEmpty({
  userId,
  onExplore,
}: {
  userId?: number;
  onExplore: () => void;
}) {
  useEffect(() => {
    trackEvent('empty_state_shown', { userId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="glass-card bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs text-white/70">
      <span>You're in all recommended communities nearby.</span>
      <button onClick={onExplore} className="text-cyan-400 font-semibold hover:underline ml-2">
        Explore scenes →
      </button>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    latitude,
    longitude,
    locationName,
    loading: locationLoading,
  } = useGeolocation(user?.id);
  const [routerLocation, setRouterLocation] = useRouterLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateAvailable, markUpdatesApplied } = useCommunityUpdates();

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);


  const [showPaywall, setShowPaywall] = useState(false);
  const [showCommunityBanner, setShowCommunityBanner] = useState(false);
  const [rotationConfirm, setRotationConfirm] = useState<{
    newComm: any;
    oldComm: any;
  } | null>(null);

  const handleJoinClick = (community: any) => {
    // Track every tap — fired before the gate check so we capture intent even at limit
    trackEvent('community_join_tapped', {
      userId: user?.id,
      metadata: { communityId: community.id, communityName: community.name },
    });

    // Slot limit = 3 free base + 1 per $0.99 purchase, max 5
    const slotLimit = Math.min(3 + ((user as any)?.paymentTier ?? 0), 5);
    if (userActiveCommunities && userActiveCommunities.length >= slotLimit) {
      // Find the least active community to rotate out
      const leastActive = [...(userActiveCommunities as any[])].reduce(
        (least: any, current: any) => {
          const currScore = current.activityScore || 0;
          const leastScore = least.activityScore || 0;
          if (currScore < leastScore) return current;
          if (currScore > leastScore) return least;

          const currTime = current.lastActivityAt
            ? new Date(current.lastActivityAt).getTime()
            : 0;
          const leastTime = least.lastActivityAt
            ? new Date(least.lastActivityAt).getTime()
            : 0;
          if (currTime < leastTime) return current;
          if (currTime > leastTime) return least;

          return current.id < least.id ? current : least;
        }
      );
      trackEvent('rotation_dialog_shown', {
        userId: user?.id,
        metadata: {
          newCommunityId: community.id,
          newCommunityName: community.name,
          replacingCommunityId: leastActive.id,
          replacingCommunityName: leastActive.name,
        },
      });
      setRotationConfirm({ newComm: community, oldComm: leastActive });
    } else {
      joinCommunityMutation.mutate(community.id);
    }
  };

  // Listen for community updates from service worker
  useEffect(() => {
    const handleCommunityUpdate = () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/communities/recommended"],
      });
    };

    window.addEventListener("communities-updated", handleCommunityUpdate);

    return () => {
      window.removeEventListener("communities-updated", handleCommunityUpdate);
    };
  }, [queryClient]);

  // Show non-intrusive top floating glass pill notification when new location communities are available
  useEffect(() => {
    if (updateAvailable) {
      setShowCommunityBanner(true);
      markUpdatesApplied();
    }
  }, [updateAvailable, markUpdatesApplied]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    // Notify service worker to refresh community cache
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "REFRESH_COMMUNITIES",
      });
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "active-communities"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "events"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["/api/communities/recommended"],
      }),
    ]);
  };

  // Fetch user's active communities with activity scores
  const { data: userActiveCommunities, isLoading: userCommunitiesLoading } =
    useQuery({
      queryKey: ["/api/users", user?.id, "active-communities"],
      enabled: !!user?.id,
      queryFn: async () => {
        const response = await fetch(
          getApiUrl(`/api/users/${user?.id}/active-communities`)
        );
        if (!response.ok) throw new Error("Failed to fetch active communities");
        return response.json();
      },
    });

  // Get live member counts for user's communities
  const communityIds = userActiveCommunities?.map((c: any) => c.id) || [];
  const { getLiveCount } = useLiveMembers(communityIds);

  // Fetch geo-scoped trending communities
  const { data: trendingCommunities = [], isLoading: trendingCommunitiesLoading } = useQuery<any[]>({
    queryKey: ["/api/communities/trending", latitude, longitude],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (latitude) params.append("latitude", latitude.toString());
      if (longitude) params.append("longitude", longitude.toString());
      const res = await fetch(getApiUrl(`/api/communities/trending?${params.toString()}`));
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch events user has joined from communities
  const { data: userJoinedEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "events"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/users/${user?.id}/events`));
      if (!response.ok) throw new Error("Failed to fetch user events");
      return response.json();
    },
  });

  // Auto-populate events when user has location
  const autoPopulateEvents = useMutation({
    mutationFn: async (data: {
      userId: number;
      latitude: number;
      longitude: number;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/auto-populate-events",
        data
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.eventsAdded > 0) {
        toast({
          title: "Events Updated",
          description: `Found ${data.eventsAdded} new events in your communities`,
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/users", user?.id, "events"],
        });
      }
    },
    onError: (error) => {
      console.error("Failed to auto-populate events:", error);
      toast({
        title: "Sync Failed",
        description: "Could not update your events at this time.",
        variant: "destructive",
      });
    },
  });

  // Fetch trending/upcoming group events with strict location confinement
  const { data: trendingEvents, isLoading: trendingLoading } = useQuery({
    queryKey: ["/api/events/trending", user?.id, latitude, longitude],
    enabled: !!user?.id,
    queryFn: async () => {
      if (latitude && longitude) {
        const response = await fetch(
          getApiUrl(
            `/api/events/trending?userId=${user?.id}&latitude=${latitude}&longitude=${longitude}&radius=50`
          )
        );
        if (response.ok) return response.json();
      }

      // Location-restricted upcoming events query (falls back to user DB coordinates on backend)
      let upcomingUrl = `/api/events/upcoming?userId=${user?.id}&radius=50`;
      if (latitude && longitude) {
        upcomingUrl += `&latitude=${latitude}&longitude=${longitude}`;
      }
      const fallback = await fetch(getApiUrl(upcomingUrl));
      if (!fallback.ok) return [];
      return fallback.json();
    },
  });

  // Mark event attendance
  const markAttendanceMutation = useMutation({
    mutationFn: async ({
      eventId,
      userId,
    }: {
      eventId: number;
      userId: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/events/${eventId}/mark-attended`,
        { userId }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance Confirmed",
        description:
          "Thank you for confirming your attendance! This helps us recommend better events.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/communities/recommended"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-populate events when location is available (debounced to prevent spam)
  useEffect(() => {
    if (user?.id && latitude && longitude && !autoPopulateEvents.isPending) {
      const timer = setTimeout(() => {
        autoPopulateEvents.mutate({
          userId: user.id,
          latitude,
          longitude,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user?.id, latitude, longitude]);

  // Fetch recommended communities — does NOT require location (location is optional, improves ranking only)
  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useQuery({
    queryKey: ["/api/communities/recommended", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: user?.id?.toString() || "",
      });
      if (latitude) params.set("latitude", latitude.toString());
      if (longitude) params.set("longitude", longitude.toString());

      const response = await fetch(
        getApiUrl(`/api/communities/recommended?${params}`)
      );
      if (!response.ok) throw new Error("Failed to fetch recommendations");
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Join community with rotation mutation
  const joinCommunityMutation = useMutation({
    mutationFn: async (communityId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/communities/${communityId}/join`,
        {
          userId: user?.id,
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries with specific parameters
      queryClient.invalidateQueries({
        queryKey: ["/api/communities/recommended", user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "active-communities"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "communities"],
      });

      if (data.dropped) {
        toast({
          title: "Community Rotated",
          description: `Joined new community! ${data.dropped.name} was moved to discoveries to make room.`,
        });
      } else {
        toast({
          title: "Joined Community",
          description: "You've successfully joined this community!",
        });
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("requiresUpgrade")) {
        setShowPaywall(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to join community. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Derive live kudos count from actual received kudos this month
  const monthlyKudos = useQuery({
    queryKey: ["/api/users", user?.id, "kudos", "monthly"],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const response = await fetch(
          getApiUrl(`/api/users/${user?.id}/kudos/received`)
        );
        if (!response.ok) return 0;
        const kudos = await response.json();
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        return Array.isArray(kudos)
          ? kudos.filter((k: any) => new Date(k.createdAt) >= monthStart).length
          : 0;
      } catch (error) {
        console.error("Failed to fetch monthly kudos:", error);
        return 0;
      }
    },
    select: (data) => data ?? 0,
  });
  const kudosThisMonth = monthlyKudos.data ?? 0;



  // Color coding for communities
  const communityColors: Record<string, string> = {
    default: "from-cyan-500/20 to-indigo-500/20",
    sports: "from-cyan-500/20 to-blue-500/20",
    music: "from-violet-500/20 to-purple-500/20",
    art: "from-pink-500/20 to-rose-500/20",
    food: "from-amber-500/20 to-orange-500/20",
    tech: "from-cyan-500/20 to-teal-500/20",
    outdoors: "from-emerald-500/20 to-green-500/20",
    social: "from-indigo-500/20 to-violet-500/20",
  };

  useEffect(() => {
    if (!authLoading && !user) {
      setRouterLocation("/login");
    }
  }, [authLoading, user, setRouterLocation]);

  if (authLoading) {
    return <ComponentLoadingSpinner text="Loading your dashboard..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mobile-page-container bg-background min-h-[100dvh] safe-area-bottom pb-nav relative overflow-hidden">
      <PullToRefresh onRefresh={handleRefresh}>
        <div>
          {/* Header Mode="Home" matching design mockup: SameVibe + NYC pill + Bell */}
          <VibePageHeader mode="home" locationName={locationName || undefined} unreadCount={0} />
          <div className="max-w-md mx-auto px-4 pt-6 pb-32 space-y-7">
            {/* Sleek Non-Intrusive Floating Glass Pill Banner for New Communities */}
            <AnimatePresence>
              {showCommunityBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-cyan-950/90 border border-cyan-400/30 backdrop-blur-xl rounded-2xl p-3.5 flex items-center justify-between shadow-xl shadow-cyan-500/10 mb-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">
                        New Local Communities
                      </h4>
                      <p className="text-[11px] text-cyan-200/75">
                        Fresh recommendations updated for your area.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowCommunityBanner(false);
                        setRouterLocation("/discover");
                      }}
                      className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px] h-7 px-3 rounded-xl shadow-md transition-transform active:scale-95"
                    >
                      View
                    </Button>
                    <button
                      onClick={() => setShowCommunityBanner(false)}
                      className="text-white/40 hover:text-white p-1 transition-colors rounded-lg hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── SECTION 1: Upcoming Group Events (Event Cards Carousel) ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-display font-bold text-xl text-white tracking-tight">
                    Upcoming Group Events
                  </h2>
                </div>
                <Link href="/events">
                  <span className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer">
                    See All
                  </span>
                </Link>
              </div>

              <div className="flex gap-4 overflow-x-auto snap-x no-scrollbar pb-2">
                {Array.isArray(trendingEvents) && trendingEvents.length > 0 ? (
                  trendingEvents.map((evt: any) => (
                    <VibeEventCard
                      key={evt.id}
                      id={evt.id}
                      title={evt.title}
                      category={evt.category}
                      date={evt.date ? new Date(evt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "June 15"}
                      time={evt.date ? new Date(evt.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "6 PM"}
                      location={evt.location || "Central Park"}
                      imageUrl={evt.imageUrl || "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80"}
                      attendeeCount={evt.attendeeCount || 28}
                      attendees={evt.attendees || []}
                      actionLabel={evt.category === "creative" ? "Collab" : "Explore"}
                      onClick={() => setRouterLocation(`/events`)}
                    />
                  ))
                ) : (
                  <>
                    <VibeEventCard
                      id={1}
                      title="Local Adventurers: Hiking Trail Mix"
                      date="June 15"
                      time="6 PM"
                      location="Central Park"
                      imageUrl="https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80"
                      attendeeCount={28}
                      actionLabel="Explore"
                    />
                    <VibeEventCard
                      id={2}
                      title="Creative Collaborators: Gallery Night"
                      date="June 16"
                      time="7 PM"
                      location="SOHO"
                      imageUrl="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80"
                      attendeeCount={19}
                      actionLabel="Collab"
                    />
                  </>
                )}
              </div>
            </section>

            {/* ── SECTION 2: My Events (EventCalendar Widget) ── */}
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-bold text-xl text-white tracking-tight">
                    My Events
                  </h2>
                </div>
                <Badge variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-0">
                  {
                    (userJoinedEvents || []).filter(
                      (event: any) => {
                        const eventDate = new Date(event.date);
                        const now = new Date();
                        return (
                          eventDate.getMonth() === now.getMonth() &&
                          eventDate.getFullYear() === now.getFullYear()
                        );
                      }
                    ).length
                  } this month
                </Badge>
              </div>

              <div className="glass-card bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4">
                <EventCalendar
                  events={userJoinedEvents || []}
                  onEventClick={(event: any) => {
                    setSelectedEvent(event);
                    setIsEventModalOpen(true);
                  }}
                />
              </div>
            </section>

            {/* ── SECTION 3: Vibe with My Communities (Joined Communities Featured First) ── */}
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-display font-bold text-xl text-white tracking-tight">
                    Vibe with My Communities
                  </h2>
                </div>
                <Link href="/discover">
                  <span className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer">
                    See All
                  </span>
                </Link>
              </div>

              <div className="flex gap-4 overflow-x-auto snap-x no-scrollbar pb-2 pt-1">
                {Array.isArray(userActiveCommunities) && userActiveCommunities.length > 0 ? (
                  <>
                    {userActiveCommunities.map((community: any) => (
                      <div key={community.id} className="w-[270px] min-w-[270px] max-w-[270px] h-[220px] snap-start flex-shrink-0">
                        <SharedCommunityCard
                          community={community}
                          joined={true}
                          onJoin={() => {}}
                        />
                      </div>
                    ))}
                    
                    {/* Explicit $0.99 Expansion Slot Purchase Card */}
                    <div 
                      onClick={() => setShowPaywall(true)}
                      className="w-[270px] min-w-[270px] max-w-[270px] h-[220px] snap-start flex-shrink-0 cursor-pointer group"
                    >
                      <div className="w-full h-full rounded-3xl border border-dashed border-cyan-400/40 bg-slate-900/60 backdrop-blur-xl p-6 flex flex-col items-center justify-center text-center space-y-3 hover:border-cyan-400 hover:bg-slate-900/80 transition-all shadow-lg active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                          <Plus className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">Add Expansion Slot</h4>
                          <p className="text-xs text-cyan-300 font-semibold mt-0.5">$0.99 / month</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-snug px-2">
                          Expand active capacity beyond 3 free base slots (up to 5 max)
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={<Users className="w-6 h-6 text-muted-foreground" />}
                    title="It's a bit quiet here!"
                    description="Discover local communities to start connecting."
                    action={{
                      label: "Explore Communities",
                      onClick: () => setRouterLocation("/discover"),
                    }}
                  />
                )}
              </div>
            </section>

            {/* ── SECTION 4: Suggested Communities ── */}
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-bold text-xl text-white tracking-tight">
                    Suggested Communities
                  </h2>
                </div>
                <Link href="/discover">
                  <span className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer">
                    Explore All
                  </span>
                </Link>
              </div>

              {recommendationsLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Finding your perfect communities...
                </div>
              ) : recommendationsError ? (
                <InlineErrorMessage
                  message="Could not load community recommendations."
                  onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/communities/recommended", user?.id] })}
                />
              ) : Array.isArray(recommendations) && recommendations.filter((c: any) => !userActiveCommunities?.some((joinedC: any) => joinedC.id === c.id)).length > 0 ? (
                <div className="flex gap-4 overflow-x-auto snap-x no-scrollbar pb-2 pt-1">
                  {recommendations
                    .filter((c: any) => !userActiveCommunities?.some((joinedC: any) => joinedC.id === c.id))
                    .map((community: any) => {
                      // Fire community_card_viewed once per card rendered in this session
                      // useEffect is not available inside .map(); use a render-time side-effect
                      // via a tiny inline component so the rule-of-hooks constraint is respected.
                      return (
                        <SuggestedCommunityCard
                          key={community.id}
                          community={community}
                          userId={user?.id}
                          onJoin={() => handleJoinClick(community)}
                        />
                      );
                    })}
                </div>
              ) : (
                <SuggestedCommunitiesEmpty userId={user?.id} onExplore={() => setRouterLocation("/discover")} />
              )}
            </section>

            {/* ── SECTION 5: Trending Communities Near You ── */}
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <h2 className="font-display font-bold text-xl text-white tracking-tight">
                    Trending Communities Near You
                  </h2>
                </div>
                <Link href="/discover">
                  <span className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer">
                    Explore Trends
                  </span>
                </Link>
              </div>

              {trendingCommunitiesLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Loading local trending scenes...
                </div>
              ) : Array.isArray(trendingCommunities) && trendingCommunities.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto snap-x no-scrollbar pb-2 pt-1">
                  {trendingCommunities.map((community: any) => (
                    <div key={community.id} className="w-[270px] min-w-[270px] max-w-[270px] h-[220px] snap-start flex-shrink-0">
                      <SharedCommunityCard
                        community={community}
                        joined={userActiveCommunities?.some((c: any) => c.id === community.id)}
                        onJoin={() => handleJoinClick(community)}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {/* ── SECTION 5: Trending Local Events (Vertical List) ── */}
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-bold text-xl text-white tracking-tight">
                    Trending Local Events
                  </h2>
                </div>
                <Link href="/events">
                  <span className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer">
                    View all
                  </span>
                </Link>
              </div>

              {trendingLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Finding popular events...
                </div>
              ) : Array.isArray(trendingEvents) && trendingEvents.length > 0 ? (
                <div className="space-y-3">
                  {trendingEvents.slice(0, 3).map((event: any) => (
                    <VibeEventCard
                      key={event.id}
                      id={event.id}
                      title={event.title}
                      category={event.category}
                      date={event.date ? new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "June 15"}
                      time={event.date ? new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "6 PM"}
                      location={event.location || "Central Park"}
                      imageUrl={event.imageUrl || "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80"}
                      attendeeCount={event.attendeeCount || 28}
                      attendees={event.attendees || []}
                      actionLabel={event.category === "creative" ? "Collab" : "Explore"}
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsEventModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No trending events in your area yet
                </p>
              )}
            </section>

            {/* ── SECTION 6: My Vibe Passport ── */}
            <VibePassport
              userJoinedEvents={userJoinedEvents}
              userId={user.id}
            />
          </div>
        </div>
      </PullToRefresh>

        {/* Rotation Confirmation Dialog — SameVibe Community Swap Philosophy */}
        <AlertDialog
          open={!!rotationConfirm}
          onOpenChange={(open) => !open && setRotationConfirm(null)}
        >
          <AlertDialogContent className="glass-card bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-sm mx-auto shadow-2xl shadow-black/50 p-0 overflow-hidden">
            {/* Cyan top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500" />

            <div className="p-6 space-y-4">
              <AlertDialogHeader className="space-y-2">
                <AlertDialogTitle className="text-white text-xl font-extrabold tracking-tight">
                  Swap Communities?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-left">
                    {/* Philosophy copy */}
                    <p className="text-sm text-slate-300 leading-relaxed">
                      SameVibe keeps your world focused. You get{" "}
                      <span className="text-cyan-400 font-semibold">3 active communities</span>{" "}
                      so every group gets your real attention — not just a passive follow.
                    </p>

                    {/* Old → New community swap card */}
                    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Replacing (least active)</span>
                      </div>
                      <p className="text-sm font-bold text-white pl-4">{rotationConfirm?.oldComm?.name}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                        <span className="text-xs text-cyan-300 uppercase tracking-wide font-semibold">Joining</span>
                      </div>
                      <p className="text-sm font-bold text-white pl-4">{rotationConfirm?.newComm?.name}</p>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {rotationConfirm?.oldComm?.name} moves back to Suggested Communities. You can rejoin it anytime.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                {/* Primary: Swap & Join */}
                <AlertDialogAction
                  onClick={() => {
                    if (rotationConfirm) {
                      trackEvent('rotation_confirmed', {
                        userId: user?.id,
                        metadata: {
                          newCommunityId: rotationConfirm.newComm.id,
                          newCommunityName: rotationConfirm.newComm.name,
                          replacedCommunityId: rotationConfirm.oldComm.id,
                          replacedCommunityName: rotationConfirm.oldComm.name,
                        },
                      });
                      joinCommunityMutation.mutate(rotationConfirm.newComm.id);
                      setRotationConfirm(null);
                    }
                  }}
                  className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold rounded-xl h-12 text-sm transition-all active:scale-[0.98]"
                >
                  Swap &amp; Join
                </AlertDialogAction>

                {/* Upgrade option — only show when user has room to expand (paymentTier < 2) */}
                {((user as any)?.paymentTier ?? 0) < 2 && (
                  <button
                    onClick={() => {
                      trackEvent('upgrade_slot_tapped', { userId: user?.id });
                      setRotationConfirm(null);
                      setShowPaywall(true);
                    }}
                    className="w-full bg-transparent border border-cyan-400/40 hover:border-cyan-400 text-cyan-300 hover:text-cyan-100 font-semibold rounded-xl h-11 text-xs transition-all active:scale-[0.98] px-4"
                  >
                    Keep both communities — Add a slot for $0.99/mo
                  </button>
                )}

                {/* Cancel */}
                <AlertDialogCancel
                  className="w-full bg-transparent border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-semibold rounded-xl h-10 text-xs transition-all"
                  onClick={() => trackEvent('rotation_cancelled', { userId: user?.id })}
                >
                  Keep {rotationConfirm?.oldComm?.name}
                </AlertDialogCancel>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
      />

      {/* PWA Installation Prompt */}
      <PWAInstall />

      {/* Persistent bottom navigation */}
      <MobileNav />
      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
