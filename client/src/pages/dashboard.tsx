import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { CommunityCard } from "@/components/community/community-card";
import { EventCard } from "@/components/events/event-card";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Settings, RefreshCw } from "lucide-react";
import { Community, Event, ActivityFeedItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { latitude, longitude, error: locationError, loading: locationLoading } = useGeolocation();

  // Fetch user's communities
  const { data: userCommunities = [], isLoading: userCommunitiesLoading } = useQuery<Community[]>({
    queryKey: ['/api/users', user?.id, 'communities'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Fetch recommended communities with geolocation
  const { data: recommendedCommunities = [], isLoading: communitiesLoading } = useQuery<Community[]>({
    queryKey: [
      '/api/communities/recommended', 
      user?.interests?.join(','),
      latitude,
      longitude
    ],
    enabled: !!user?.interests?.length,
    refetchInterval: 60000, // Refresh every minute for location-based updates
  });

  // Auto-refresh communities when user location changes
  useEffect(() => {
    if (latitude && longitude && user) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/communities/recommended'] 
      });
    }
  }, [latitude, longitude, user, queryClient]);

  // Auto-refresh when user completes onboarding
  useEffect(() => {
    if (user?.onboardingCompleted) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/communities/recommended'] 
      });
    }
  }, [user?.onboardingCompleted, queryClient]);

  // Fetch upcoming events
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events/upcoming'],
    enabled: !!user,
  });

  // Fetch user activity feed
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<ActivityFeedItem[]>({
    queryKey: ['/api/users', user?.id, 'activity'],
    enabled: !!user,
  });

  // Join community mutation
  const joinCommunityMutation = useMutation({
    mutationFn: async (communityId: number) => {
      const response = await apiRequest('POST', `/api/communities/${communityId}/join`, {
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities'] });
      toast({
        title: "Joined community!",
        description: "You're now part of this community.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join community. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Register for event mutation
  const registerEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await apiRequest('POST', `/api/events/${eventId}/register`, {
        userId: user?.id,
        status: 'interested'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Registered for event!",
        description: "You'll receive updates about this event.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to register for event. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-900">
      <div className="flex min-h-screen">
        <Sidebar />
        
        <main className="flex-1 pb-20 md:pb-0">
          <TopBar />
          
          <div className="p-4 md:p-6 space-y-6">
            {/* Your Communities Block */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                      🧠 Your Communities
                    </CardTitle>
                    <p className="text-gray-400 text-sm mt-1">These are the spaces you helped create.</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    Create New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {userCommunitiesLoading ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-gray-700 rounded-xl p-4 h-32"></div>
                      </div>
                    ))}
                  </div>
                ) : userCommunities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">
                      You haven't joined any communities yet. Explore recommendations below!
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(userCommunities as Community[]).map((community: Community, index) => (
                      <CommunityCard
                        key={community.id}
                        community={community}
                        onView={() => console.log('Enter community chat', community.id)}
                        isMember={true}
                        hasNewActivity={index % 2 === 0}
                        nearbyUserCount={Math.floor(Math.random() * 8) + 2}
                        onFavorite={() => console.log('Favorited', community.name)}
                        onPin={() => console.log('Pinned', community.name)}
                        isPinned={index === 0}
                        isFavorited={index === 1}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Your Vibe - Adaptive Tracker */}
            <Card className="bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                      📈 Your Vibe
                    </CardTitle>
                    <p className="text-gray-400 text-sm mt-1">🔄 Tracks how your community vibe has changed</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">Your top 3 interests this month:</h4>
                    <div className="flex flex-wrap gap-2">
                      {user.interests?.slice(0, 3).map((interest, index) => (
                        <Badge key={interest} variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          #{index + 1} {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-600 pt-4">
                    <h4 className="text-white font-medium mb-2">Explore new communities like these...</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {(recommendedCommunities as Community[]).slice(0, 2).map((community: Community, index) => (
                        <CommunityCard
                          key={community.id}
                          community={community}
                          onJoin={() => joinCommunityMutation.mutate(community.id)}
                          onView={() => console.log('View community', community.id)}
                          loading={joinCommunityMutation.isPending}
                          hasNewActivity={Math.random() > 0.5}
                          nearbyUserCount={Math.floor(Math.random() * 15) + 3}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Communities */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white">
                    Discover New Communities
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    See All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {communitiesLoading ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-gray-700 rounded-xl p-4 h-32"></div>
                      </div>
                    ))}
                  </div>
                ) : recommendedCommunities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">
                      No communities found. Try updating your interests in your profile.
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {(recommendedCommunities as Community[]).slice(2, 6).map((community: Community, index) => (
                      <CommunityCard
                        key={community.id}
                        community={community}
                        onJoin={() => joinCommunityMutation.mutate(community.id)}
                        onView={() => console.log('View community', community.id)}
                        loading={joinCommunityMutation.isPending}
                        hasNewActivity={index % 3 === 0} // Show activity for every 3rd community
                        nearbyUserCount={Math.floor(Math.random() * 20) + 5}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white dark:text-white">
                    Upcoming Events Near You
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                      Filter
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Map View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-gray-700 dark:bg-gray-700 rounded-xl p-4 h-32"></div>
                      </div>
                    ))}
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 dark:text-gray-400">
                      No upcoming events found. Check back later!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.slice(0, 6).map((event: Event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onRegister={() => registerEventMutation.mutate(event.id)}
                        onToggleInterested={() => console.log('Toggle interested', event.id)}
                        onView={() => console.log('View event', event.id)}
                        loading={registerEventMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <ActivityFeed 
              activities={activities} 
              loading={activitiesLoading}
            />
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
