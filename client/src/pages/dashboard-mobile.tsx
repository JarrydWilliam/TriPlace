import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useTheme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Settings, Sun, Moon, CalendarDays, Plus, Clock, Star, Target, Award, Users, TrendingUp, Heart, User as UserIcon, Mail, Bell, Shield, HelpCircle, Home, Compass, PlusSquare, MessageCircle } from "lucide-react";
import { Community, Event, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

export default function DashboardMobile() {
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude, locationName, loading: locationLoading } = useGeolocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

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

  // Fetch recommended communities
  const { data: recommendedCommunities, isLoading: recommendedLoading } = useQuery({
    queryKey: ["/api/communities/recommended", latitude, longitude],
    enabled: !!latitude && !!longitude && !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/communities/recommended?lat=${latitude}&lon=${longitude}&userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch recommended communities');
      return response.json();
    }
  });

  // Join community mutation
  const joinCommunityMutation = useMutation({
    mutationFn: async (communityId: number) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/join-with-rotation`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "active-communities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities/recommended"] });
      
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

  // Sample data for demo purposes
  const monthlyKudos = 32;
  const currentChallenges = [
    { id: "challenge-1", title: "🎯 Attend 2 events this week", progress: 50, target: 2, current: 1 },
    { id: "challenge-2", title: "📢 Post in 3 communities", progress: 33, target: 3, current: 1 },
    { id: "challenge-3", title: "🤝 Meet 1 new 90% match member", progress: 0, target: 1, current: 0 }
  ];

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
          <MobileButton 
            variant="ghost" 
            size="sm"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </MobileButton>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MobileButton variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </MobileButton>
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
                <span>{monthlyKudos} Kudos this month</span>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* Your Communities */}
        <MobileCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{user.name?.split(' ')[0] || 'Your'}'s Communities</h3>
            <Badge variant="secondary">{userActiveCommunities?.length || 0}/5</Badge>
          </div>
          
          {userCommunitiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-muted h-16 rounded-lg" />
              ))}
            </div>
          ) : userActiveCommunities?.length > 0 ? (
            <div className="space-y-3">
              {userActiveCommunities.map((community: Community & { activityScore: number, lastActivityAt: Date }) => (
                <MobileCard 
                  key={community.id} 
                  clickable 
                  padding={false}
                  onClick={() => setLocation(`/community/${community.id}`)}
                  className="p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-lg">{community.category === 'wellness' ? '🧘' : community.category === 'tech' ? '💻' : community.category === 'arts' ? '🎨' : community.category === 'fitness' ? '💪' : community.category === 'music' ? '🎵' : community.category === 'food' ? '🍽️' : community.category === 'outdoor' ? '🌲' : '👥'}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium truncate">{community.name}</h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{community.memberCount || 0} members</span>
                          <span>•</span>
                          <span>Activity: {community.activityScore}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {community.category}
                      </Badge>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No communities yet</p>
              <p className="text-sm">Join communities below to get started!</p>
            </div>
          )}
        </MobileCard>

        {/* Event Calendar */}
        <MobileCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Your Events</h3>
            <MobileButton 
              size="sm" 
              variant="secondary"
              onClick={() => setLocation('/create-event')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Create
            </MobileButton>
          </div>
          
          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse bg-muted h-20 rounded-lg" />
              ))}
            </div>
          ) : userJoinedEvents?.length > 0 ? (
            <div className="space-y-3">
              {userJoinedEvents.slice(0, 3).map((event: Event) => (
                <MobileCard 
                  key={event.id} 
                  clickable 
                  padding={false}
                  className="p-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-lg flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium truncate">{event.title}</h4>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No events yet</p>
              <p className="text-sm">Join events from your communities!</p>
            </div>
          )}
        </MobileCard>

        {/* Communities That Grow With You */}
        <MobileCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Communities That Grow With You</h3>
            <Badge variant="outline">AI Matched</Badge>
          </div>
          
          {recommendedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-muted h-24 rounded-lg" />
              ))}
            </div>
          ) : recommendedCommunities?.length > 0 ? (
            <div className="space-y-3">
              {recommendedCommunities.slice(0, 3).map((community: Community) => (
                <MobileCard 
                  key={community.id} 
                  padding={false}
                  className="p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg flex items-center justify-center">
                        <span className="text-lg">{community.category === 'wellness' ? '🧘' : community.category === 'tech' ? '💻' : community.category === 'arts' ? '🎨' : community.category === 'fitness' ? '💪' : community.category === 'music' ? '🎵' : community.category === 'food' ? '🍽️' : community.category === 'outdoor' ? '🌲' : '👥'}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{community.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{community.description}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
                          <Users className="w-3 h-3" />
                          <span>{community.memberCount || 0} members</span>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs">
                            {community.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <MobileButton
                      size="sm"
                      onClick={() => joinCommunityMutation.mutate(community.id)}
                      disabled={joinCommunityMutation.isPending}
                      className="ml-2"
                    >
                      Join
                    </MobileButton>
                  </div>
                </MobileCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recommendations yet</p>
              <p className="text-sm">Complete your profile for better matches!</p>
            </div>
          )}
        </MobileCard>

        {/* Weekly Challenges */}
        <MobileCard>
          <h3 className="text-lg font-semibold mb-4">Weekly Challenges</h3>
          <div className="space-y-4">
            {currentChallenges.map((challenge) => (
              <div key={challenge.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{challenge.title}</span>
                  <span className="text-xs text-muted-foreground">{challenge.current}/{challenge.target}</span>
                </div>
                <Progress value={challenge.progress} className="h-2" />
              </div>
            ))}
          </div>
        </MobileCard>
      </MobileContent>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav>
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/dashboard')}
          className="flex-col space-y-1 text-primary"
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/communities')}
          className="flex-col space-y-1"
        >
          <Compass className="w-5 h-5" />
          <span className="text-xs">Explore</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/create-event')}
          className="flex-col space-y-1"
        >
          <PlusSquare className="w-5 h-5" />
          <span className="text-xs">Create</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/messaging')}
          className="flex-col space-y-1"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs">Messages</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/profile')}
          className="flex-col space-y-1"
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </MobileButton>
      </MobileBottomNav>
    </MobileLayout>
  );
}