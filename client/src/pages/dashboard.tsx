import { useAuth } from "@/hooks/use-auth";
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
import { MapPin, Settings } from "lucide-react";
import { Community, Event, ActivityFeedItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recommended communities
  const { data: recommendedCommunities = [], isLoading: communitiesLoading } = useQuery({
    queryKey: ['/api/communities/recommended', user?.interests?.join(',')],
    enabled: !!user?.interests?.length,
  });

  // Fetch upcoming events
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events/upcoming'],
    enabled: !!user,
  });

  // Fetch user activity feed
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
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
            {/* Location Status */}
            <Card className="bg-gradient-to-r from-primary to-secondary border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5" />
                    <div>
                      <p className="font-semibold">
                        You're in {user.location || "San Francisco"}
                      </p>
                      <p className="text-sm opacity-90">
                        Showing events within 50 miles
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 border-0 text-white"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Communities */}
            <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white dark:text-white">
                    Recommended Communities
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
                        <div className="bg-gray-700 dark:bg-gray-700 rounded-xl p-4 h-32"></div>
                      </div>
                    ))}
                  </div>
                ) : recommendedCommunities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 dark:text-gray-400">
                      No communities found. Try updating your interests in your profile.
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {recommendedCommunities.slice(0, 4).map((community: Community) => (
                      <CommunityCard
                        key={community.id}
                        community={community}
                        onJoin={() => joinCommunityMutation.mutate(community.id)}
                        onView={() => console.log('View community', community.id)}
                        loading={joinCommunityMutation.isPending}
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
