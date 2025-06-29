import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, MapPin, ArrowLeft, ChevronDown, Info, Star, Clock } from "lucide-react";
import { Community, Event } from "@shared/schema";
import { useState } from "react";
import { useParams } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

export default function CommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude } = useGeolocation(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("scraped-events");
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId] });
    queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "scraped-events"] });
  };

  // Fetch community details
  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["/api/communities", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}`);
      if (!response.ok) throw new Error('Failed to fetch community');
      return response.json();
    }
  });

  // Fetch scraped events for this community
  const { data: scrapedEvents, isLoading: scrapedEventsLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "scraped-events"],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/scraped-events`);
      if (!response.ok) throw new Error('Failed to fetch scraped events');
      return response.json();
    }
  });

  // Fetch global partner events
  const { data: partnerEvents, isLoading: partnerEventsLoading } = useQuery({
    queryKey: ["/api/events/global"],
    queryFn: async () => {
      const response = await fetch('/api/events/global');
      if (!response.ok) throw new Error('Failed to fetch partner events');
      return response.json();
    }
  });

  // Event registration mutation
  const joinEventMutation = useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: number, userId: number }) => {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "attending" }),
      });
      if (!response.ok) throw new Error("Failed to join event");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Joined",
        description: "You've successfully joined this event! It will appear in your dashboard calendar.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleJoinEvent = (eventId: number) => {
    if (!user?.id) return;
    joinEventMutation.mutate({ eventId, userId: user.id });
  };

  // Helper function to format date
  const formatEventDate = (dateInput: string | Date) => {
    if (!dateInput) return 'Date TBD';
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to sort events by date
  const sortEventsByDate = (events: Event[]) => {
    return events?.sort((a, b) => {
      const dateA = new Date(a.date || '');
      const dateB = new Date(b.date || '');
      return dateA.getTime() - dateB.getTime();
    }) || [];
  };

  // Filter partner events relevant to this community
  const getRelevantPartnerEvents = () => {
    if (!partnerEvents || !community) return [];
    
    return partnerEvents.filter((event: Event) => {
      const eventCategories = event.category?.toLowerCase() || '';
      const communityCategory = community.category?.toLowerCase() || '';
      const communityName = community.name?.toLowerCase() || '';
      
      return eventCategories.includes(communityCategory) || 
             eventCategories.includes(communityName) ||
             event.title?.toLowerCase().includes(communityCategory) ||
             event.description?.toLowerCase().includes(communityCategory);
    });
  };

  if (authLoading || communityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Community Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">The community you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="mobile-page-container bg-gray-50 dark:bg-gray-900">
      <div className="container-responsive responsive-padding safe-area-top safe-area-bottom max-w-6xl mx-auto">
        
        {/* Clean Community Header */}
        <Card className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 border shadow-sm">
          <CardContent className="responsive-padding">
            <div className="flex items-center justify-between">
              {/* Back Button + Community Title */}
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{community.name}</h1>
                </div>
              </div>
              
              {/* Community Info Dropdown */}
              <div className="relative">
                <Collapsible open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      <Info className="w-4 h-4" />
                      <span>Info</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isInfoOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="absolute right-0 top-full mt-2 z-50">
                    <Card className="w-80 bg-white dark:bg-gray-800 border shadow-lg">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">About</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{community.description}</p>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{community.memberCount} members</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{community.category}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Community Rules</h4>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <li>• Be respectful and inclusive</li>
                              <li>• Share relevant content only</li>
                              <li>• Help others grow and learn</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Community Events</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-2 mx-4 mb-4">
                <TabsTrigger value="scraped-events" className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Local Events</span>
                </TabsTrigger>
                <TabsTrigger value="featured-events" className="flex items-center space-x-2">
                  <Star className="w-4 h-4" />
                  <span>Featured</span>
                </TabsTrigger>
              </TabsList>

              {/* Local Scraped Events Tab */}
              <TabsContent value="scraped-events" className="px-4 pb-4">
                {scrapedEventsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2" />
                        <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortEventsByDate(scrapedEvents || []).length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Local Events Found</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          We couldn't find any events matching this community's interests in your area yet.
                        </p>
                      </div>
                    ) : (
                      sortEventsByDate(scrapedEvents || []).map((event: Event) => (
                        <Card key={event.id} className="border hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{event.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                  {event.description}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatEventDate(event.date || '')}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{event.location}</span>
                                  </div>
                                </div>
                                {event.price && (
                                  <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                    ${event.price}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <Badge variant="outline" className="text-xs">
                                {event.category}
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => handleJoinEvent(event.id)}
                                disabled={joinEventMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {joinEventMutation.isPending ? "Joining..." : "Join Event"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Featured Partner Events Tab */}
              <TabsContent value="featured-events" className="px-4 pb-4">
                {partnerEventsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2" />
                        <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getRelevantPartnerEvents().length === 0 ? (
                      <div className="text-center py-12">
                        <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Featured Events</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          No partner events are currently available for this community.
                        </p>
                      </div>
                    ) : (
                      sortEventsByDate(getRelevantPartnerEvents()).map((event: Event) => (
                        <Card key={event.id} className="border-2 border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-white">{event.title}</h4>
                                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    Featured
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                  {event.description}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatEventDate(event.date || '')}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{event.location}</span>
                                  </div>
                                </div>
                                {event.price && (
                                  <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                    ${event.price}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <Badge variant="outline" className="text-xs">
                                {event.category}
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => handleJoinEvent(event.id)}
                                disabled={joinEventMutation.isPending}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              >
                                {joinEventMutation.isPending ? "Joining..." : "Join Event"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PullToRefresh>
  );
}