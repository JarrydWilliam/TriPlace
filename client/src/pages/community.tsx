import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveMembersTab } from "@/components/community/live-members-tab";
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
import { Link } from "wouter";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { format, parseISO } from "date-fns";
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

export default function CommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude } = useGeolocation(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const [newMessage, setNewMessage] = useState("");

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

  // Fetch web-scraped events for this community
  const { data: scrapedEvents, isLoading: scrapedEventsLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "scraped-events"],
    enabled: !!communityId && !!latitude && !!longitude,
    queryFn: async () => {
      if (!latitude || !longitude) return [];
      
      const response = await fetch(`/api/communities/${communityId}/scraped-events?latitude=${latitude}&longitude=${longitude}`);
      if (!response.ok) throw new Error('Failed to fetch scraped events');
      const events = await response.json();
      
      // Sort events by date/time
      return events.sort((a: Event, b: Event) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
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

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
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
        
        {/* Clean Header with Back Button and Community Title */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 sm:mb-6">
          <div className="responsive-padding border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="p-2">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{community.name}</h1>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="p-2"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-none bg-transparent">
              <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="members" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Users className="w-4 h-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger value="kudos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Award className="w-4 h-4 mr-2" />
                Kudos
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab - Instagram-style Messaging */}
            <TabsContent value="chat" className="mt-0 h-[70vh] flex flex-col">
              {/* Chat Header with Community Status */}
              <div className="responsive-padding border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {community.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{community.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{community.memberCount} members online</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{community.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{community.memberCount} members</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{community.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </Badge>
                </div>
              </div>

              {/* Messages Container with Scroll */}
              <div className="flex-1 overflow-y-auto responsive-padding space-y-4 bg-gray-50 dark:bg-gray-900">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Welcome to {community.name}!</h3>
                    <p>Be the first to start the conversation</p>
                  </div>
                ) : (
                  messages?.map((message: any) => (
                    <div key={message.id} className="group">
                      <div className="flex space-x-3">
                        <button className="flex-shrink-0 hover:scale-105 transition-transform">
                          <Avatar className="w-10 h-10 ring-2 ring-white dark:ring-gray-800 shadow-sm">
                            <AvatarImage src={message.sender?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 via-blue-400 to-cyan-400 text-white font-semibold">
                              {formatDisplayName(message.sender?.name).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                          {/* Message Bubble */}
                          <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 group-hover:scale-[1.02]">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                {formatDisplayName(message.sender?.name)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {format(parseISO(message.createdAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{message.content}</p>
                            
                            {/* Message Actions */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center space-x-4">
                                <button
                                  onClick={() => resonateMutation.mutate(message.id)}
                                  className="flex items-center space-x-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors group/resonate"
                                  disabled={resonateMutation.isPending}
                                >
                                  <Heart className="w-4 h-4 group-hover/resonate:scale-110 transition-transform" />
                                  <span className="font-medium">{message.resonateCount || 0} resonates</span>
                                </button>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                                <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                  Reply
                                </button>
                                <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                  Share
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

              {/* Enhanced Message Input */}
              <div className="responsive-padding border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-end space-x-3 py-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Textarea
                        placeholder={`Message ${community.name}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="min-h-[44px] max-h-32 resize-none rounded-2xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                        {newMessage.length}/500
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    size="sm"
                    className="min-w-[44px] h-[44px] rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 pb-2">
                  Press Enter to send • Shift+Enter for new line
                </div>
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-0">
              <div className="responsive-padding space-y-4 max-h-[70vh] overflow-y-auto">
                
                {/* Web-scraped Events Section */}
                {scrapedEventsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : scrapedEvents?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No events found for this community yet.</p>
                    <p className="text-sm mt-1">Events are automatically discovered from local sources.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scrapedEvents?.map((event: any) => (
                      <Card key={event.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {event.category || 'Event'}
                                </Badge>
                                {event.sourceUrl && (
                                  <Badge variant="outline" className="text-xs">
                                    External
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{event.title}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{event.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{format(new Date(event.date), 'MMM d, h:mm a')}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{event.location}</span>
                                </div>
                                {event.price && event.price !== "0" && (
                                  <span className="font-medium text-green-600 dark:text-green-400">${event.price}</span>
                                )}
                                {event.attendeeCount && (
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-3 h-3" />
                                    <span>{event.attendeeCount} attending</span>
                                  </div>
                                )}
                              </div>
                              {event.organizerName && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Organized by {event.organizerName}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => joinEventMutation.mutate({ eventId: event.id, userId: user?.id! })}
                              disabled={joinEventMutation.isPending}
                              className="ml-3 flex-shrink-0"
                            >
                              Join Event
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="mt-0">
              <LiveMembersTab communityId={communityId ? parseInt(communityId) : 0} />
            </TabsContent>

            {/* Kudos Tab */}
            <TabsContent value="kudos" className="mt-0">
              <div className="responsive-padding space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Community kudos and achievements coming soon!</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PullToRefresh>
  );
}