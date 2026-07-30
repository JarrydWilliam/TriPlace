import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useCommunityUpdates } from "@/hooks/use-community-updates";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLiveMembers } from "@/hooks/use-live-members";
import { useTheme } from "@/lib/theme-context";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  Target,
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
import { motion } from "framer-motion";
import { ShareQR } from "@/components/ui/share-qr";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { PWAInstall } from "@/components/ui/pwa-install";
import { AgentInsightsCard } from "@/components/ui/agent-insights";
import { StreakCard } from "@/components/ui/streak-card";

import { EventCalendar } from "@/components/ui/event-calendar";
import { EventDetailsModal } from "@/components/ui/event-details-modal";
import { MobileNav } from "@/components/layout/mobile-nav";

import { VibePageHeader } from "@/components/layout/vibe-page-header";
import { VibeEventCard } from "@/components/ui/vibe-event-card";

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
  const [rotationConfirm, setRotationConfirm] = useState<{
    newComm: any;
    oldComm: any;
  } | null>(null);

  const handleJoinClick = (community: any) => {
    if (userActiveCommunities && userActiveCommunities.length >= 5) {
      // Find the least active community
      const leastActive = userActiveCommunities.reduce(
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

  // Show update notification when new location-aware communities are available
  useEffect(() => {
    if (updateAvailable) {
      toast({
        title: "New Communities Available",
        description:
          "Location-aware communities have been updated. Refreshing your recommendations.",
        duration: 3000,
      });
      markUpdatesApplied();
    }
  }, [updateAvailable, markUpdatesApplied, toast]);

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

  // Fetch trending events — location optional for sort ranking
  const { data: trendingEvents, isLoading: trendingLoading } = useQuery({
    queryKey: ["/api/events/trending", latitude, longitude],
    enabled: !!user?.id,
    queryFn: async () => {
      // Use trending endpoint when location available, fall back to global upcoming
      if (latitude && longitude) {
        const response = await fetch(
          getApiUrl(
            `/api/events/trending?latitude=${latitude}&longitude=${longitude}&radius=50`
          )
        );
        if (response.ok) return response.json();
      }
      // Fallback: show global upcoming events without location filter
      const fallback = await fetch(
        getApiUrl(`/api/events/upcoming?userId=${user?.id}`)
      );
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

  const currentChallenges: Array<{
    id: string;
    title: string;
    progress: number;
    target: number;
    current: number;
  }> = [
    {
      id: "join-events",
      title: "Join 3 community events this week",
      current: Array.isArray(userJoinedEvents)
        ? userJoinedEvents.filter((event: any) => {
            const eventDate = new Date(event.date);
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            return eventDate >= weekStart;
          }).length
        : 0,
      target: 3,
      progress: Math.min(
        100,
        ((Array.isArray(userJoinedEvents)
          ? userJoinedEvents.filter((event: any) => {
              const eventDate = new Date(event.date);
              const weekStart = new Date();
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              return eventDate >= weekStart;
            }).length
          : 0) /
          3) *
          100
      ),
    },
    {
      id: "send-messages",
      title: "Send 5 community messages",
      // Message count will be computed from actual community messages when available
      current: 0,
      target: 5,
      progress: 0,
    },
    {
      id: "join-communities",
      title: "Join 2 new communities",
      current: Array.isArray(userActiveCommunities)
        ? Math.min(userActiveCommunities.length, 2)
        : 0,
      target: 2,
      progress: Array.isArray(userActiveCommunities)
        ? Math.min(100, (userActiveCommunities.length / 2) * 100)
        : 0,
    },
  ];

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
          <VibePageHeader mode="home" locationName={locationName || "NYC"} unreadCount={6} />

          <div className="max-w-md mx-auto px-4 pt-6 pb-32 space-y-7">
            {/* ── SECTION 1: Vibe with Your Community (Event Cards Carousel) ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl text-white tracking-tight">
                  Vibe with Your Community
                </h2>
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

              {eventsLoading ? (
                <div className="animate-pulse space-y-3">
                  {["event-1", "event-2"].map((loadingId) => (
                    <div
                      key={`loading-${loadingId}`}
                      className="h-16 bg-muted/30 rounded-xl"
                    />
                  ))}
                </div>
              ) : (
                <EventCalendar
                  events={userJoinedEvents || []}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                    setIsEventModalOpen(true);
                  }}
                />
              )}
            </section>

            {/* ── SECTION 3: Trending Local Events (Vertical List) ── */}
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

            {/* ── SECTION 4: New Communities (Vertical List) ── */}
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-bold text-xl text-white tracking-tight">
                    New Communities
                  </h2>
                </div>
                <Link href="/discover">
                  <span className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer">
                    Explore
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
              ) : Array.isArray(recommendations) && recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.slice(0, 5).map((community: any) => (
                    <SharedCommunityCard
                      key={community.id}
                      community={community}
                      joined={userActiveCommunities?.some((c: any) => c.id === community.id) || false}
                      onJoin={() => handleJoinClick(community)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    You've joined all available communities
                  </p>
                  <Button
                    onClick={() => setRouterLocation("/discover")}
                    className="bg-primary text-primary-foreground text-xs rounded-full px-4 py-2"
                  >
                    Explore
                  </Button>
                </div>
              )}
            </section>

            {/* ── SECTION 5: My Communities (Horizontal Carousel) ── */}
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl text-white tracking-tight">
                  My Communities
                </h2>
                <Link href="/discover">
                  <span className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer">
                    See All
                  </span>
                </Link>
              </div>

              <div className="flex gap-4 overflow-x-auto snap-x no-scrollbar pb-2 pt-1">
                {Array.isArray(userActiveCommunities) && userActiveCommunities.length > 0 ? (
                  userActiveCommunities.map((community: any) => (
                    <div key={community.id} className="w-[270px] min-w-[270px] max-w-[270px] h-[220px] snap-start flex-shrink-0">
                      <SharedCommunityCard
                        community={community}
                        joined={true}
                        onJoin={() => {}}
                      />
                    </div>
                  ))
                ) : Array.isArray(recommendations) && recommendations.length > 0 ? (
                  recommendations.map((community: any) => (
                    <div key={community.id} className="w-[270px] min-w-[270px] max-w-[270px] h-[220px] snap-start flex-shrink-0">
                      <SharedCommunityCard
                        community={community}
                        joined={false}
                        onJoin={() => handleJoinClick(community)}
                      />
                    </div>
                  ))
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

            {/* ── SECTION 6: My Activity & Challenges ── */}
            <section className="pt-4 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-bold text-xl text-white tracking-tight">
                    My Activity & Challenges
                  </h2>
                </div>
              </div>

              <div className="space-y-5">
                <StreakCard userId={user.id} />

                {/* Weekly Challenges */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Weekly Challenges</h3>
                  {currentChallenges.length > 0 ? (
                    <div className="space-y-3">
                      {currentChallenges.map((challenge) => (
                        <div
                          key={challenge.id}
                          className="glass-card bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">
                              {challenge.title}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {challenge.current}/{challenge.target}
                            </span>
                          </div>
                          <Progress value={challenge.progress} className="h-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-6 text-center space-y-2">
                      <Target className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium text-foreground">
                        No active challenges
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stay active to unlock weekly challenges!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </PullToRefresh>

        {/* Rotation Confirmation Dialog */}
        <AlertDialog
          open={!!rotationConfirm}
          onOpenChange={(open) => !open && setRotationConfirm(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Community Limit Reached</AlertDialogTitle>
              <AlertDialogDescription>
                You already have five communities. Adding{" "}
                <strong>{rotationConfirm?.newComm?.name}</strong> will replace{" "}
                <strong>{rotationConfirm?.oldComm?.name}</strong>, which you
                have interacted with the least.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (rotationConfirm) {
                    joinCommunityMutation.mutate(rotationConfirm.newComm.id);
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Replace and Join
              </AlertDialogAction>
            </AlertDialogFooter>
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
