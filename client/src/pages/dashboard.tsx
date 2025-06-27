import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useTheme } from "@/lib/theme-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Settings, Sun, Moon, CalendarDays, Plus, Clock, Star, Target, Award, Users, TrendingUp, Heart, User as UserIcon, Mail, Bell, Shield, HelpCircle, FileText, LogOut, Edit, Trash2, Camera, Lock, Smartphone, AlertTriangle, Home, Compass, PlusSquare, MessageCircle } from "lucide-react";
import { Community, Event, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ComponentLoadingSpinner } from "@/components/loading-spinner";
import { InlineErrorMessage } from "@/components/ui/error-message";
import { Logo } from "@/components/ui/logo";
import { ShareQR } from "@/components/ui/share-qr";
import { 
  MobileLayout, 
  MobileHeader, 
  MobileContent, 
  MobileBottomNav,
  MobileCard,
  MobileButton
} from "@/components/layout/mobile-layout";


export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude, locationName, loading: locationLoading } = useGeolocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Fetch user's active communities with activity scores
  const { data: userActiveCommunities, isLoading: userCommunitiesLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "active-communities"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.id}/active-communities`);
      if (!response.ok) throw new Error('Failed to fetch active communities');
      return response.json();
    }
  });

  // Fetch events user has joined from communities
  const { data: userJoinedEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "events"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.id}/events`);
      if (!response.ok) throw new Error('Failed to fetch user events');
      return response.json();
    }
  });

  // Auto-populate events when user has location
  const autoPopulateEvents = useMutation({
    mutationFn: async (data: { userId: number, latitude: number, longitude: number }) => {
      const response = await apiRequest("POST", "/api/auto-populate-events", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.eventsAdded > 0) {
        toast({
          title: "Events Updated",
          description: `Found ${data.eventsAdded} new events in your communities`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events"] });
      }
    },
    onError: (error) => {
      console.error("Error auto-populating events:", error);
    }
  });

  // Mark event attendance
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: number, userId: number }) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/mark-attended`, { userId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance Confirmed",
        description: "Thank you for confirming your attendance! This helps us recommend better events.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities/recommended"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Auto-populate events when location is available
  useEffect(() => {
    if (user?.id && latitude && longitude && !autoPopulateEvents.isPending) {
      autoPopulateEvents.mutate({
        userId: user.id,
        latitude,
        longitude
      });
    }
  }, [user?.id, latitude, longitude]);

  // Fetch recommended communities and users
  const { data: recommendations, isLoading: recommendationsLoading, error: recommendationsError } = useQuery({
    queryKey: ["/api/communities/recommended", latitude, longitude, user?.id],
    enabled: !!user && !!latitude && !!longitude,
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: user?.id?.toString() || '',
        latitude: latitude?.toString() || '',
        longitude: longitude?.toString() || ''
      });
      
      const response = await fetch(`/api/communities/recommended?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Join community with rotation mutation
  const joinCommunityMutation = useMutation({
    mutationFn: async (communityId: number) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/join`, {
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "active-communities"] });
      
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
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to join community. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch user's monthly kudos from database
  const { data: userKudos } = useQuery({
    queryKey: ["/api/users", user?.id, "kudos", "monthly"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.id}/kudos/monthly`);
      if (!response.ok) return { count: 0 };
      return response.json();
    }
  });

  // Fetch user's active challenges from database  
  const { data: userChallenges } = useQuery({
    queryKey: ["/api/users", user?.id, "challenges"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.id}/challenges`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Color coding for communities
  const communityColors = {
    wellness: "bg-purple-500",
    tech: "bg-blue-500", 
    arts: "bg-pink-500",
    fitness: "bg-green-500",
    music: "bg-yellow-500",
    food: "bg-orange-500",
    outdoor: "bg-emerald-500",
    social: "bg-indigo-500"
  };

  if (authLoading || locationLoading) {
    return <ComponentLoadingSpinner text="Loading your dashboard..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <MobileLayout hasBottomNav={true} className="bg-background">
      {/* Mobile Header */}
      <MobileHeader>
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold truncate">TriPlace</h1>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{locationName || 'Loading...'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <ShareQR />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleTheme}
            className="touch-target"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="touch-target"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/settings/profile')}>
                <UserIcon className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/settings/account')}>
                <Settings className="w-4 h-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/settings/notifications')}>
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/settings/security')}>
                <Shield className="w-4 h-4 mr-2" />
                Security
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/settings/support')}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Support
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </MobileHeader>

      {/* Mobile Content */}
      <MobileContent className="space-y-4">
        {/* User Profile Card */}
        <MobileCard className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Welcome back, {user.name?.split(' ')[0] || 'friend'}!</h2>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                <Heart className="w-4 h-4" />
                <span>{userKudos?.count || 0} Kudos this month</span>
              </div>
            </div>
          </div>
        </MobileCard>
        <Card className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Logo size="md" className="mr-2" />
                <Avatar className="w-16 h-16 border-4 border-white/20">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-white/20 text-white text-lg">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">Welcome to your third place, {user.name?.split(' ')[0] || 'friend'}!</h1>
                  <div className="flex items-center space-x-4 mt-1 text-white/80">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{locationName || 'Location loading...'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">💜 {userKudos?.count || 0} Kudos this month</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ShareQR />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleTheme}
                  className="text-white hover:bg-white/20"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                
                {/* Settings Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end">
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Profile Settings */}
                    <Link href="/settings/profile">
                      <DropdownMenuItem>
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                    </Link>

                    {/* Account Settings */}
                    <Link href="/settings/account">
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Account
                      </DropdownMenuItem>
                    </Link>

                    {/* Notifications */}
                    <Link href="/settings/notifications">
                      <DropdownMenuItem>
                        <Bell className="mr-2 h-4 w-4" />
                        Notifications
                      </DropdownMenuItem>
                    </Link>

                    {/* Community Preferences */}
                    <Link href="/settings/community">
                      <DropdownMenuItem>
                        <Users className="mr-2 h-4 w-4" />
                        Community Preferences
                      </DropdownMenuItem>
                    </Link>

                    {/* Security */}
                    <Link href="/settings/security">
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" />
                        Security
                      </DropdownMenuItem>
                    </Link>

                    <DropdownMenuSeparator />

                    {/* Support */}
                    <Link href="/settings/support">
                      <DropdownMenuItem>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Support
                      </DropdownMenuItem>
                    </Link>

                    {/* About / Legal */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FileText className="mr-2 h-4 w-4" />
                        About & Legal
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Terms of Service
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="mr-2 h-4 w-4" />
                          Privacy Policy
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          App Version 1.0.0
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <p className="text-white/90 text-sm italic">
                "TriPlace connects hearts and minds through shared experiences, building meaningful communities where every connection matters."
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          
          {/* Event Calendar Widget */}
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl text-gray-900 dark:text-white flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5" />
                  <span>Event Calendar</span>
                </CardTitle>
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setLocation("/create-event")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Partner Event Creation
                </Button>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="animate-pulse space-y-3">
                    {['event-1', 'event-2', 'event-3'].map(loadingId => (
                      <div key={`loading-${loadingId}`} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(userJoinedEvents) && userJoinedEvents.slice(0, 5).map((event: Event, index: number) => {
                      const communityColor = communityColors[event.category as keyof typeof communityColors] || "bg-gray-500";
                      return (
                        <div 
                          key={`dashboard-event-${event.id}-${event.title?.slice(0, 10)}-${index}`} 
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                          onClick={() => setSelectedEventId(event.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${communityColor}`} />
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{event.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {event.price && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                ${event.price}
                              </Badge>
                            )}
                            {/* Show attendance button for past events */}
                            {new Date(event.date) < new Date() ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (user?.id) {
                                    markAttendanceMutation.mutate({ eventId: event.id, userId: user.id });
                                  }
                                }}
                                disabled={markAttendanceMutation.isPending}
                                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                              >
                                ✓ Attended
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost">
                                👏 Kudos
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {(!Array.isArray(userJoinedEvents) || userJoinedEvents.length === 0) && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No joined events</p>
                        <p className="text-sm">Join events from your communities to see them here!</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Today's Suggestions / Discoveries Panel */}
          <div className="space-y-6">
            
            {/* Local Kudos Leaders */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span>Local Kudos Leaders</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">Sarah Chen</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">127 kudos this month</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Gold</Badge>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">Mike Torres</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">89 kudos this month</p>
                        </div>
                        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Silver</Badge>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">Emma Wilson</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">76 kudos this month</p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Bronze</Badge>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Weekly Challenges */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Weekly Challenges</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userChallenges?.length > 0 ? userChallenges.map((challenge: any) => (
                  <div key={challenge.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {challenge.title}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {challenge.current || 0}/{challenge.target || 0}
                      </span>
                    </div>
                    <Progress value={challenge.progress || 0} className="h-2" />
                  </div>
                )) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Complete your first community interactions to unlock challenges!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User's Active Communities */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>{user.name?.split(' ')[0] || 'Your'}'s Communities</span>
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {Array.isArray(userActiveCommunities) ? userActiveCommunities.length : 0}/5
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">

                {userCommunitiesLoading ? (
                  <div className="animate-pulse space-y-3">
                    {['community-1', 'community-2', 'community-3'].map(loadingId => (
                      <div key={`loading-${loadingId}`} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    ))}
                  </div>
                ) : Array.isArray(userActiveCommunities) && userActiveCommunities.length > 0 ? (
                  userActiveCommunities.map((community: any) => (
                    <div key={community.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${communityColors[community.category as keyof typeof communityColors] || 'bg-gray-500'}`} />
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {community.name}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Activity: {community.activityScore || 0}
                          </Badge>
                          <Link href={`/community/${community.id}`}>
                            <Button 
                              size="sm" 
                              className="bg-gradient-to-r from-emerald-400 to-yellow-400 hover:from-emerald-500 hover:to-yellow-500 text-white font-semibold px-3 py-1 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-lg group"
                            >
                              <span className="text-xs">Enter</span>
                              <div className="ml-1 transition-transform group-hover:translate-x-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                                </svg>
                              </div>
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {community.memberCount} members • {community.category}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Last active: {new Date(community.lastActivityAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400">Active</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      No communities yet
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Discover communities that evolve with your journey below
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discovery Suggestions */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Communities That Grow With You</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* High Match Members */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">🎯 High Match Members</h4>
                  {['member-a', 'member-b'].map((memberId) => (
                    <div key={`high-match-${memberId}`} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={`https://images.unsplash.com/photo-${memberId === 'member-a' ? '1500000000001' : '1500000000002'}?w=40&h=40&fit=crop&crop=face`} />
                        <AvatarFallback>{memberId === 'member-a' ? 'A' : 'B'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Alex Johnson
                        </p>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            🎯 92% Match
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        👏
                      </Button>
                    </div>
                  ))}
                </div>

                {/* New Communities */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">🔍 New Communities</h4>
                  {recommendationsLoading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Finding your perfect communities...</p>
                    </div>
                  ) : recommendationsError ? (
                    <InlineErrorMessage 
                      message="Unable to load community recommendations" 
                      onRetry={() => window.location.reload()}
                    />
                  ) : Array.isArray(recommendations) && recommendations.length > 0 ? (
                    recommendations.slice(0, 2).map((community: Community) => (
                      <div key={community.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm">🌟</span>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                            {community.name}
                          </h5>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {community.memberCount} members • {community.category}
                        </p>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => joinCommunityMutation.mutate(community.id)}
                            disabled={joinCommunityMutation.isPending}
                          >
                            {joinCommunityMutation.isPending ? "Joining..." : "Join Community"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => window.location.href = `/community/${community.id}`}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-sm">No communities found yet. Complete your quiz to get personalized recommendations!</p>
                    </div>
                  )}
                </div>

                {/* Trending Events */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">🔥 Trending Events</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm">🎉</span>
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                        Weekend Hiking Adventure
                      </h5>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Saturday • 15 attending • $0
                    </p>
                    <Button size="sm" variant="outline" className="w-full">
                      View Event
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>



          </div>
        </div>
        </MobileContent>
      </MobileLayout>
  );
}