import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveMembersTab } from "@/components/community/live-members-tab";
import { ScrapedEventsTab } from "@/components/community/scraped-events-tab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Send, Heart, Calendar, Users, MapPin, MessageCircle, Clock, Star, ChevronDown, Award, ArrowLeft, Pin, Sun, Moon } from "lucide-react";
import { Community, Event, User, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { CommunityPosts } from "@/components/ui/community-posts";

import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { useTheme } from "@/lib/theme-context";

// Helper function to format name as "First Name + Last Initial"
const formatDisplayName = (fullName: string | null | undefined): string => {
  if (!fullName || fullName.trim() === '') return 'Anonymous';
  
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0];
  }
  
  const firstName = nameParts[0];
  const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
};

// Events Display Component
interface EventsDisplayProps {
  communityId: number;
}

function EventsDisplay({ communityId }: EventsDisplayProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [joiningEventId, setJoiningEventId] = useState<number | null>(null);

  // Get user's joined events to filter them out
  const { data: userJoinedEvents = [] } = useQuery<Event[]>({
    queryKey: ["/api/users", user?.id, "events"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/events`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allEvents = [], isLoading, refetch } = useQuery<Event[]>({
    queryKey: ["/api/communities", communityId, "events"],
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/events`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
  });

  // Filter out events the user has already joined
  const events = allEvents.filter(event => 
    !userJoinedEvents.some(joinedEvent => joinedEvent.id === event.id)
  );

  const handleJoinEvent = async (eventId: number, eventTitle: string) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join events.",
        variant: "destructive",
      });
      return;
    }

    try {
      setJoiningEventId(eventId);
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id,
          status: "going"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join event');
      }

      toast({
        title: "Event Joined!",
        description: `You've successfully joined "${eventTitle}". Check your dashboard calendar.`,
      });

      // Invalidate both community events and user events queries
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "events"] });
      
      refetch();
    } catch (error) {
      console.error('Error joining event:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoiningEventId(null);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    const now = new Date();
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
      <div className="responsive-padding space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardHeader>
              <div className="h-4 bg-white/10 rounded w-3/4"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-white/10 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="responsive-padding text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-white/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-white">No Events Found</h3>
        <p className="text-white/60 mb-4">
          We're continuously discovering new events for this community.
          <br />
          Check back soon for upcoming activities!
        </p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="gap-2 border-white/10 text-white hover:bg-white/10"
        >
          <Calendar className="h-4 w-4" />
          Refresh Events
        </Button>
      </div>
    );
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateStr = typeof event.date === 'string' ? event.date : event.date.toISOString();
    const date = format(parseISO(dateStr), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const sortedDates = Object.keys(eventsByDate).sort();

  return (
    <div className="responsive-padding space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
      {sortedDates.map((date) => (
        <div key={date} className="space-y-3">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </h3>
          {eventsByDate[date].map((event) => (
            <Card key={event.id} className="glass-card border-white/5 hover:bg-white/10 transition-colors">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-semibold text-white truncate pr-2">
                        {event.title}
                      </h4>
                      <Badge variant="secondary" className="flex-shrink-0 bg-white/10 text-white">
                        {formatPrice(event.price ?? "0")}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-white/70 mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-white/50 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatEventDate(typeof event.date === 'string' ? event.date : event.date.toISOString())}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>by {event.organizer}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleJoinEvent(event.id, event.title)}
                    disabled={joiningEventId === event.id}
                    className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium transition-colors"
                    size="sm"
                  >
                    {joiningEventId === event.id ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3 mr-2" />
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

export default function CommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude } = useGeolocation(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const [newMessage, setNewMessage] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "dynamic-info"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "messages"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "members"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "scraped-events"] })
    ]);
  };

  // Fetch community details with dynamic member count
  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "dynamic-info", latitude, longitude, user?.id],
    enabled: !!communityId && !!latitude && !!longitude && !!user?.id,
    queryFn: async () => {
      const params = new URLSearchParams({
        latitude: latitude?.toString() || '',
        longitude: longitude?.toString() || '',
        userId: user?.id?.toString() || ''
      });
      const response = await fetch(`/api/communities/${communityId}/dynamic-info?${params}`);
      if (!response.ok) throw new Error('Community not found');
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch community messages/feed
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "messages"],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchInterval: 500,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/messages`, {
        content,
        senderId: user?.id
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/communities", communityId, "messages"] });
      
      const previousMessages = queryClient.getQueryData(["/api/communities", communityId, "messages"]);
      
      const optimisticMessage = {
        id: Date.now(),
        content,
        senderId: user?.id,
        receiverId: user?.id,
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: {
          id: user?.id,
          name: user?.name,
          avatar: user?.avatar,
          email: user?.email
        },
        resonateCount: 0
      };
      
      queryClient.setQueryData(["/api/communities", communityId, "messages"], (old: any) => 
        old ? [optimisticMessage, ...old] : [optimisticMessage]
      );
      
      return { previousMessages };
    },
    onSuccess: (data) => {
      setNewMessage("");
      queryClient.setQueryData(["/api/communities", communityId, "messages"], (old: any) => {
        if (!old) return [data];
        const filtered = old.filter((msg: any) => msg.id !== Date.now() && msg.id < 1000000000000);
        return [data, ...filtered];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "messages"] });
    },
    onError: (err, content, context) => {
      queryClient.setQueryData(["/api/communities", communityId, "messages"], context?.previousMessages);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Like/Resonate message mutation
  const resonateMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("POST", `/api/messages/${messageId}/resonate`, {
        userId: user?.id
      });
      if (!response.ok) throw new Error("Failed to resonate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "messages"] });
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  if (authLoading || communityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center glass-panel">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center glass-panel">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Community Not Found</h1>
          <p className="text-white/60">The community you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-page-container">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Main Glass Layout */}
        <div className="glass-panel border-0 bg-transparent min-h-screen">
          <div className="container-responsive responsive-padding safe-area-top safe-area-bottom max-w-6xl mx-auto">

          {/* Minimal Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="p-2 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 text-white hover:bg-white/10"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>

          {/* Glass Card Container for Content */}
          <Card className="glass-card border-white/5 overflow-hidden">
            <div className="w-full">
              {/* Glass Tabs */}
              <div className="grid w-full grid-cols-4 rounded-none bg-white/5 border-b border-white/10">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`flex items-center justify-center py-4 px-4 rounded-none border-b-2 transition-all duration-300 ${
                    activeTab === "chat" 
                      ? "border-primary text-primary bg-primary/5" 
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Chat</span>
                </button>
                <button
                  onClick={() => setActiveTab("events")}
                  className={`flex items-center justify-center py-4 px-4 rounded-none border-b-2 transition-all duration-300 ${
                    activeTab === "events" 
                      ? "border-primary text-primary bg-primary/5" 
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Events</span>
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`flex items-center justify-center py-4 px-4 rounded-none border-b-2 transition-all duration-300 ${
                    activeTab === "members" 
                      ? "border-primary text-primary bg-primary/5" 
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Members</span>
                </button>
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`flex items-center justify-center py-4 px-4 rounded-none border-b-2 transition-all duration-300 ${
                    activeTab === "posts" 
                      ? "border-primary text-primary bg-primary/5" 
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Pin className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Board</span>
                </button>
              </div>

              {/* Conditionally render active tab content */}
              {activeTab === "chat" && (
              <div className="mt-0 h-[70vh] flex flex-col relative">
                {/* Chat Header with Community Status */}
                <div className="responsive-padding border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold shadow-lg">
                          {community.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1a2e]"></div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{community.name}</h3>
                        <p className="text-xs text-white/60">{community.memberCount} members online</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-300 border border-green-500/30">
                      Active
                    </Badge>
                  </div>
                </div>

                {/* Messages Container with Custom Scroll */}
                <div className="flex-1 overflow-y-auto responsive-padding space-y-4 custom-scrollbar">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : messages?.length === 0 ? (
                    <div className="text-center py-12 text-white/40">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <MessageCircle className="w-8 h-8 text-primary/60" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2 text-white">Welcome to {community.name}!</h3>
                      <p>Be the first to start the conversation</p>
                    </div>
                  ) : (
                    messages?.map((message: any) => (
                      <div key={message.id} className="group">
                        <div className="flex space-x-3">
                          <button className="flex-shrink-0 hover:scale-105 transition-transform mt-1">
                            <Avatar className="w-8 h-8 ring-2 ring-white/10 shadow-sm">
                              <AvatarImage src={message.sender?.avatar} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold text-xs">
                                {formatDisplayName(message.sender?.name).charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                          <div className="flex-1 min-w-0">
                            {/* Glass Message Bubble */}
                            <div className="glass-card rounded-2xl rounded-tl-sm p-3 hover:bg-white/10 transition-all duration-200 group-hover:scale-[1.01]">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-semibold text-white text-xs">
                                  {formatDisplayName(message.sender?.name)}
                                </span>
                                <span className="text-[10px] text-white/40">
                                  {format(parseISO(message.createdAt), 'h:mm a')}
                                </span>
                              </div>
                              <p className="text-white/90 text-sm leading-relaxed">{message.content}</p>
                              
                              {/* Message Actions */}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <div className="flex items-center space-x-4">
                                  <button
                                    onClick={() => resonateMutation.mutate(message.id)}
                                    className="flex items-center space-x-1.5 text-xs text-white/40 hover:text-red-400 transition-colors group/resonate"
                                    disabled={resonateMutation.isPending}
                                  >
                                    <Heart className={`w-3 h-3 group-hover/resonate:scale-110 transition-transform ${message.resonateCount > 0 ? 'fill-red-400 text-red-400' : ''}`} />
                                    {message.resonateCount > 0 && <span className="font-medium">{message.resonateCount}</span>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Glass Input Area */}
                <div className="responsive-padding border-t border-white/10 bg-black/20 backdrop-blur-md">
                  <div className="flex items-end space-x-2 py-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Textarea
                          placeholder={`Message ${community.name}...`}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="min-h-[44px] max-h-32 resize-none rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:ring-2 focus:ring-primary/50 focus:border-transparent pr-12 text-sm glass-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <div className="absolute bottom-2 right-3 text-[10px] text-white/30">
                          {newMessage.length}/500
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      size="sm"
                      className="min-w-[44px] h-[44px] rounded-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-primary/25 transition-all duration-200"
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              )}

              {/* Events Tab */}
              {activeTab === "events" && (
                <div className="mt-0">
                  <EventsDisplay communityId={communityId ? parseInt(communityId) : 0} />
                </div>
              )}

              {/* Members Tab */}
              {activeTab === "members" && (
                <div className="mt-0">
                  <LiveMembersTab communityId={communityId ? parseInt(communityId) : 0} />
                </div>
              )}
              
              {/* Board (Posts) Tab */}
              {activeTab === "posts" && (
                <div className="mt-4 responsive-padding max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <CommunityPosts communityId={communityId ? parseInt(communityId) : 0} />
                </div>
              )}
            </div>
            </Card>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}