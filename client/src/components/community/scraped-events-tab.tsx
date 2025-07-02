import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock, DollarSign } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: number;
  title: string;
  description: string;
  organizer: string;
  date: string;
  location: string;
  address: string;
  category: string;
  price: string;
  communityId: number;
  isGlobal: boolean;
}

interface ScrapedEventsTabProps {
  communityId: number;
}

export function ScrapedEventsTab({ communityId }: ScrapedEventsTabProps) {
  const { toast } = useToast();
  const [joiningEventId, setJoiningEventId] = useState<number | null>(null);

  const { data: events = [], isLoading, refetch } = useQuery<Event[]>({
    queryKey: ["/api/communities", communityId, "events"],
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/events`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
  });

  const handleJoinEvent = async (eventId: number, eventTitle: string) => {
    try {
      setJoiningEventId(eventId);
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 1 }),
      });

      if (!response.ok) {
        throw new Error('Failed to join event');
      }

      toast({
        title: "Event Joined!",
        description: `You've successfully joined "${eventTitle}". Check your dashboard calendar for details.`,
      });

      refetch();
    } catch (error) {
      // Handle join event error silently
      toast({
        title: "Error",
        description: "Failed to join event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoiningEventId(null);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy • h:mm a');
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) {
      return "Free";
    }
    return `$${numPrice}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
        <p className="text-muted-foreground mb-4">
          We're continuously discovering new events for this community.
          <br />
          Check back soon for upcoming activities!
        </p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="gap-2"
        >
          <Calendar className="h-4 w-4" />
          Refresh Events
        </Button>
      </div>
    );
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = format(parseISO(event.date), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const sortedDates = Object.keys(eventsByDate).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
            <Calendar className="h-4 w-4" />
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </div>
          
          {eventsByDate[date].map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatEventDate(event.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatPrice(event.price)}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {event.category}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {event.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.organizer}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleJoinEvent(event.id, event.title)}
                    disabled={joiningEventId === event.id}
                    className="gap-2"
                  >
                    {joiningEventId === event.id ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" />
                        Join Event
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}