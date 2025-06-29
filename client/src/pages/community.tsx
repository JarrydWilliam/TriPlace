import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Send, Heart, Calendar, Users, MapPin, MessageCircle, Clock, Star, ChevronDown, Award } from "lucide-react";
import { Community, Event, User, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { format, parseISO } from "date-fns";

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
  const [newMessage, setNewMessage] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "dynamic-info"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "messages"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "members"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "events"] }),
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

  // Fetch community members with match scores
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "members"],
    enabled: !!communityId && !!latitude && !!longitude,
    queryFn: async () => {
      const params = new URLSearchParams({
        latitude: latitude?.toString() || '',
        longitude: longitude?.toString() || '',
        userInterests: user?.interests?.join(',') || ''
      });
      const response = await fetch(`/api/communities/${communityId}/members?${params}`);
      if (!response.ok) throw new Error('Failed to fetch members');
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

  // Send kudos mutation
  const sendKudosMutation = useMutation({
    mutationFn: async (receiverId: number) => {
      const response = await apiRequest("POST", "/api/kudos", {
        receiverId,
        giverId: user?.id,
        type: "community_appreciation",
        message: "Great community member!"
      });
      if (!response.ok) throw new Error("Failed to send kudos");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Kudos sent!",
        description: "Your appreciation has been shared",
      });
    }
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
        
        {/* Minimalist Header - Only Community Title */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 sm:mb-6">
          <div className="responsive-padding border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{community.name}</h1>
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Details</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-3">
                  <p className="text-gray-600 dark:text-gray-400">{community.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{community.memberCount} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{community.category}</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
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

            {/* Chat Tab */}
            <TabsContent value="chat" className="mt-0">
              <div className="responsive-padding space-y-4">
                {/* Message Input */}
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Share with the community..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 min-h-[44px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    size="sm"
                    className="min-w-[44px] h-[44px]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {/* Messages Feed */}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : messages?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages?.map((message: any) => (
                      <div key={message.id} className="flex space-x-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={message.sender?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400 text-white text-xs">
                            {formatDisplayName(message.sender?.name).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {formatDisplayName(message.sender?.name)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(parseISO(message.createdAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                            <p className="text-gray-900 dark:text-white text-sm">{message.content}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resonateMutation.mutate(message.id)}
                              className="text-xs h-auto p-1"
                            >
                              <Heart className="w-3 h-3 mr-1" />
                              {message.resonateCount || 0}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-0">
              <div className="responsive-padding space-y-4 max-h-[70vh] overflow-y-auto">
                {scrapedEventsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : scrapedEvents?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No events found for this community yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scrapedEvents?.map((event: any) => (
                      <Card key={event.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{event.title}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{event.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{format(parseISO(event.date), 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{event.location}</span>
                                </div>
                                {event.price && (
                                  <span className="font-medium">${event.price}</span>
                                )}
                              </div>
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
              <div className="responsive-padding space-y-4 max-h-[70vh] overflow-y-auto">
                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : members?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No members found in your area yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {members?.map((member: any) => (
                      <Card key={member.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400 text-white">
                                  {formatDisplayName(member.name).charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {formatDisplayName(member.name)}
                                </h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  {member.matchPercentage && (
                                    <Badge variant="secondary" className="text-xs">
                                      {member.matchPercentage}% match
                                    </Badge>
                                  )}
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {member.location ? `${member.location.toFixed(1)} mi away` : 'Nearby'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendKudosMutation.mutate(member.id)}
                              disabled={sendKudosMutation.isPending || member.id === user?.id}
                            >
                              <Star className="w-3 h-3 mr-1" />
                              Kudos
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
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