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

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    latitude,
    longitude,
    locationName,
    loading: locationLoading,
  } = useGeolocation(user?.id);
  const { updateAvailable, markUpdatesApplied } = useCommunityUpdates();
  const { isConnected } = useWebSocket();
  const { theme, toggleTheme } = useTheme();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setRouterLocation] = useRouterLocation();
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
  const communityColors = {
    wellness: "bg-purple-500",
    tech: "bg-blue-500",
    arts: "bg-pink-500",
    fitness: "bg-green-500",
    music: "bg-yellow-500",
    food: "bg-orange-500",
    outdoor: "bg-emerald-500",
    social: "bg-indigo-500",
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
    <div className="mobile-page-container bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-[100dvh] pb-28">
          
          {/* ── Premium Editorial Hero ── */}
          <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 pt-safe pb-4">
            <div className="max-w-lg mx-auto pt-4">
              {/* Top Row: Avatar & Settings */}
              <div className="flex items-center justify-between mb-6">
                <Avatar className="w-10 h-10 border border-border shadow-sm">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-white/10 text-white text-sm font-semibold">
                    {user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1">
                  <ShareQR />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground w-9 h-9 rounded-full"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="end">
                      <DropdownMenuLabel>Settings</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* Profile Settings */}
                      <DropdownMenuItem
                        onClick={() => setRouterLocation("/settings/profile")}
                      >
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>

                      {/* Account Settings */}
                      <DropdownMenuItem
                        onClick={() => setRouterLocation("/settings/account")}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Account
                      </DropdownMenuItem>

                      {/* Notifications */}
                      <DropdownMenuItem
                        onClick={() =>
                          setRouterLocation("/settings/notifications")
                        }
                      >
                        <Bell className="mr-2 h-4 w-4" />
                        Notifications
                      </DropdownMenuItem>

                      {/* Community Preferences */}
                      <DropdownMenuItem
                        onClick={() => setRouterLocation("/settings/community")}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Community Preferences
                      </DropdownMenuItem>

                      {/* Security */}
                      <DropdownMenuItem
                        onClick={() => setRouterLocation("/settings/security")}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Security
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* Support */}
                      <DropdownMenuItem
                        onClick={() => setRouterLocation("/settings/support")}
                      >
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Support
                      </DropdownMenuItem>

                      {/* About / Legal */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <FileText className="mr-2 h-4 w-4" />
                          About & Legal
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            onClick={() => setRouterLocation("/terms")}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Terms of Service
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRouterLocation("/privacy")}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Privacy Policy
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            App Version 1.0.0
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => signOut()}
                        className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Editorial Greeting */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">
                  {new Date().getHours() < 12 
                    ? "Good morning" 
                    : new Date().getHours() < 17 
                      ? "Good afternoon" 
                      : "Good evening"}, {user.name?.split(" ")[0] || "there"}
                </p>
                <h1 className="text-2xl font-bold text-foreground">
                  Your scene awaits
                </h1>
                
                {/* Location display */}
                <div className="flex items-center gap-1.5 text-primary mt-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">{locationName || "Detecting..."}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

          <div className="grid-responsive">
            {/* Event Calendar Widget */}
            <div className="lg:col-span-2">
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">My Events</h2>
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
            </div>

            {/* Today's Suggestions / Discoveries Panel */}
            <div className="lg:col-span-2 space-y-8">
              {/* User's Active Communities */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">
                      My Communities
                    </h2>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-0">
                    {Array.isArray(userActiveCommunities)
                      ? userActiveCommunities.length
                      : 0}{" "}
                    joined
                  </Badge>
                </div>
                
                {/* Community cards */}
                <div className="space-y-3">
                  {userCommunitiesLoading ? (
                    <div className="animate-pulse space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-20 bg-white/5 rounded-2xl" />
                      ))}
                    </div>
                  ) : Array.isArray(userActiveCommunities) &&
                    userActiveCommunities.length > 0 ? (
                    userActiveCommunities.map((community: any) => (
                      <SharedCommunityCard
                        key={community.id}
                        community={community}
                        joined={true}
                        onJoin={() => {}}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={<Users className="w-6 h-6 text-gray-500" />}
                      title="It's a bit quiet here!"
                      description="Your social circle is a blank canvas. Discover local communities below to start connecting."
                      action={{
                        label: "Explore Communities",
                        onClick: () => setRouterLocation("/discover"),
                      }}
                    />
                  )}
                </div>
              </section>

              {/* Discovery Suggestions */}
              <section className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Trending Local Events</h2>
                  </div>
                  <Link href="/events">
                    <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
                  </Link>
                </div>
                
                <div className="space-y-3">
                    {trendingLoading ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Finding popular events...
                        </p>
                      </div>
                    ) : Array.isArray(trendingEvents) && trendingEvents.length > 0 ? (
                      trendingEvents.slice(0, 3).map((event: any) => (
                        <PremiumEventCard
                          key={event.id}
                          event={event}
                          onClick={() => setRouterLocation(`/community/${event.communityId || ""}`)}
                        />
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">
                          No trending events in your area yet
                        </p>
                      </div>
                    )}
                </div>
              </section>

              {/* New Communities */}
              <section className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">New Communities</h2>
                  </div>
                  <Link href="/discover">
                    <span className="text-xs text-primary hover:underline cursor-pointer">Explore</span>
                  </Link>
                </div>
                
                <div className="space-y-3">
                    {recommendationsLoading ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Finding your perfect communities...
                        </p>
                      </div>
                    ) : recommendationsError ? (
                      <InlineErrorMessage
                        message="Unable to load community recommendations"
                        onRetry={() =>
                          queryClient.invalidateQueries({
                            queryKey: [
                              "/api/communities/recommended",
                              user?.id,
                            ],
                          })
                        }
                      />
                    ) : Array.isArray(recommendations) &&
                      recommendations.length > 0 ? (
                      recommendations
                        .slice(0, 5)
                        .map((community: Community) => (
                          <SharedCommunityCard
                            key={community.id}
                            community={community}
                            joined={false}
                            joining={joinCommunityMutation.isPending}
                            onJoin={() => handleJoinClick(community)}
                          />
                        ))
                    ) : (
                      <EmptyState
                        icon={<Users className="w-6 h-6 text-gray-500" />}
                        title="You're all caught up!"
                        description="You've joined all available communities."
                        action={{
                          label: "Explore Communities",
                          onClick: () => setRouterLocation("/discover"),
                        }}
                      />
                    )}
                  </div>
              </section>

              {/* My Activity & Challenges */}
              <section className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">My Activity & Challenges</h2>
                  </div>
                </div>
                
                <div className="space-y-5">
                  {/* Streak Card */}
                  <StreakCard userId={user.id} />
                  
                  {/* Weekly Challenges */}
                  <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-4">
                    {currentChallenges.length > 0 ? (
                      <div className="space-y-4">
                        {currentChallenges.map((challenge) => (
                          <div key={challenge.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">
                                {challenge.title}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {challenge.current}/{challenge.target}
                              </span>
                            </div>
                            <Progress
                              value={challenge.progress}
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No active challenges</p>
                        <p className="text-xs mt-1">
                          Stay active to unlock weekly challenges!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
        </div>

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
      </PullToRefresh>

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
