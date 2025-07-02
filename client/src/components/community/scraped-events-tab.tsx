import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Clock, ExternalLink, Users, RefreshCw } from "lucide-react";
import { Event } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";

interface ScrapedEventsTabProps {
  communityId: number;
}

export function ScrapedEventsTab({ communityId }: ScrapedEventsTabProps) {
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch web-scraped events for this community
  const { data: scrapedEvents, isLoading: scrapedEventsLoading, refetch } = useQuery({
    queryKey: ["/api/communities", communityId, "scraped-events"],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/scraped-events`);
      if (!response.ok) throw new Error('Failed to fetch scraped events');
      const events = await response.json();
      
      // Sort events by date/time
      return events.sort((a: Event, b: Event) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
  });

  // Trigger web scraping for this specific community
  const triggerScrapingMutation = useMutation({
    mutationFn: async () => {
      if (!latitude || !longitude) {
        throw new Error('Location data is required');
      }
      
      const response = await apiRequest("POST", `/api/web-scrape/community/${communityId}`, {
        latitude,
        longitude
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Events Updated",
        description: `Found ${data.eventCount} new events for this community`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "scraped-events"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Join event mutation
  const joinEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/register`, {
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Joined",
        description: "You've successfully joined this event. Check your dashboard calendar!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Join",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="responsive-padding space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Community Events</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Events automatically discovered from local sources
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            triggerScrapingMutation.mutate();
            refetch();
          }}
          disabled={triggerScrapingMutation.isPending || !latitude || !longitude}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${triggerScrapingMutation.isPending ? 'animate-spin' : ''}`} />
          <span>Refresh Events</span>
        </Button>
      </div>

      {/* Events List */}
      {scrapedEventsLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : scrapedEvents?.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No events found for this community yet.</p>
          <p className="text-sm mt-1">Events are automatically discovered from Eventbrite, Meetup, and Ticketmaster.</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => triggerScrapingMutation.mutate()}
            disabled={triggerScrapingMutation.isPending || !latitude || !longitude}
            className="mt-4"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${triggerScrapingMutation.isPending ? 'animate-spin' : ''}`} />
            Search for Events
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {scrapedEvents?.map((event: any) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {event.category || 'Event'}
                      </Badge>
                      {event.price && event.price > 0 && (
                        <Badge variant="outline" className="text-xs">
                          ${event.price}
                        </Badge>
                      )}
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {event.title}
                    </h4>
                    
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{format(parseISO(event.date), 'MMM d, yyyy • h:mm a')}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                      
                      {event.attendeeCount && (
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{event.attendeeCount} attending</span>
                        </div>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => joinEventMutation.mutate(event.id)}
                      disabled={joinEventMutation.isPending}
                      className="whitespace-nowrap"
                    >
                      Join Event
                    </Button>
                    
                    {event.sourceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="whitespace-nowrap"
                      >
                        <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Details
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}