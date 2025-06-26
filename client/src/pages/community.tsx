import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Send, Heart, Calendar, Users, MapPin, Pin, MessageCircle, Clock, Star, MoreHorizontal } from "lucide-react";
import { Community, Event, User, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useParams } from "wouter";

export default function CommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude } = useGeolocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedTab, setSelectedTab] = useState("feed");

  // Fetch community details
  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["/api/communities", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}`);
      if (!response.ok) throw new Error('Community not found');
      return response.json();
    }
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
    refetchInterval: 3000, // Refresh every 3 seconds for real-time feel
  });

  // Fetch community members with match scores
  const { data: communityMembers, isLoading: communityMembersLoading } = useQuery({
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

  // Fetch community events
  const { data: communityEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "events"],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    }
  });

  // Fetch community members with high match scores
  const { data: members, isLoading: membersMatchLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "members", latitude, longitude],
    enabled: !!communityId && !!latitude && !!longitude,
    queryFn: async () => {
      const params = new URLSearchParams({
        latitude: latitude?.toString() || '',
        longitude: longitude?.toString() || ''
      });
      const response = await fetch(`/api/communities/${communityId}/members?${params}`);
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/messages`, {
        content,
        senderId: user?.id
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "messages"] });
      toast({
        title: "Message sent!",
        description: "Your message has been posted to the community",
      });
    },
    onError: () => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        
        {/* Community Header */}
        <Card className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                  🌟
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{community.name}</h1>
                  <p className="text-white/80 mt-1">{community.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-white/70">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{community.memberCount} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{community.category}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Active Community
                </Badge>
              </div>
            </div>
            
            {/* Pinned Announcement */}
            <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Pin className="w-4 h-4" />
                <span className="font-medium">Pinned Announcement</span>
              </div>
              <p className="text-white/90 text-sm">
                Weekly meetup this Friday @7PM at Liberty Park! Join us for group activities and networking. 🎉
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Community Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feed" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Live Feed</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Events</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="highlights" className="flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Highlights</span>
            </TabsTrigger>
          </TabsList>

          {/* Live Messaging Feed */}
          <TabsContent value="feed" className="space-y-4">
            <Card className="bg-white dark:bg-gray-900 border-none shadow-lg overflow-hidden">
              <CardContent className="p-0">
                
                {/* Instagram-style Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Community Chat</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Everyone's here to connect</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                          {community?.memberCount || 0} online
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex flex-col space-y-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Instagram-style Message Feed */}
                <div className="h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 scroll-smooth" style={{ 
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgb(156 163 175) transparent'
                }}>
                  {messagesLoading ? (
                    <div className="p-4 space-y-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex space-x-3 animate-pulse">
                          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded-full w-20" />
                            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-2xl w-48" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {messages?.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <MessageCircle className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Welcome to the community chat</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                            This is where your community comes together. Share thoughts, ask questions, and connect with like-minded people.
                          </p>
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 max-w-xs mx-auto">
                            <p className="text-xs text-purple-700 dark:text-purple-300">
                              💜 Be kind, stay curious, and help others thrive
                            </p>
                          </div>
                        </div>
                      ) : (
                        messages?.map((message: Message & { sender: User, resonateCount: number }) => (
                          <div key={message.id} className="flex space-x-3 group hover:bg-white/50 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-colors">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={message.sender?.avatar || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                {message.sender?.name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline space-x-2 mb-1">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                  {message.sender?.name || 'Anonymous'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                  {new Date(message.createdAt!).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 max-w-xs shadow-sm border border-gray-100 dark:border-gray-700 relative">
                                <p className="text-gray-900 dark:text-white text-sm leading-relaxed break-words">
                                  {message.content}
                                </p>
                                {/* Message reactions preview */}
                                {message.resonateCount > 0 && (
                                  <div className="absolute -bottom-2 -right-1 bg-white dark:bg-gray-700 rounded-full px-2 py-1 shadow-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs">💜</span>
                                      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                        {message.resonateCount}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-3 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => resonateMutation.mutate(message.id)}
                                  className="h-7 px-3 text-xs text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-all"
                                >
                                  <Heart className="w-3 h-3 mr-1" />
                                  Resonate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                                >
                                  Reply
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                                >
                                  Share
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Instagram-style Message Input */}
                <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-end space-x-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={user?.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex items-end space-x-2">
                      <div className="flex-1 relative">
                        <Textarea
                          placeholder="Message the community..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (newMessage.trim()) {
                                handleSendMessage();
                              }
                            }
                          }}
                          className="min-h-[40px] max-h-32 resize-none border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-colors pr-12"
                          rows={1}
                        />
                        <div className="absolute right-3 bottom-2 flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <span className="text-sm">😊</span>
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        className="h-8 w-8 p-0 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {sendMessageMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 text-white" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Press Enter to send • Shift+Enter for new line
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {newMessage.length}/1000
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Community Events */}
          <TabsContent value="events" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Community Events</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {communityEvents?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No upcoming events</p>
                        <p className="text-sm">Check back later for community activities!</p>
                      </div>
                    ) : (
                      communityEvents?.map((event: Event) => (
                        <div key={event.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {event.title}
                            </h3>
                            {event.price && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                ${event.price}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {event.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              RSVP
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Member Highlights */}
          <TabsContent value="members" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>People You Match With</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {communityMembersLoading ? (
                  <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex space-x-3 p-3">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members?.members?.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No matching members found</p>
                        <p className="text-sm">Members will appear as more people join the community!</p>
                      </div>
                    ) : (
                      members?.members?.map((member: User & { matchPercentage: number }) => (
                        <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback>
                              {member.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {member.name || 'Anonymous'}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                🎯 {member.matchPercentage || 75}% Match
                              </Badge>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {member.location || 'Nearby'}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => sendKudosMutation.mutate(member.id)}
                          >
                            👏
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Community Highlights */}
          <TabsContent value="highlights" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span>Community Highlights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Recent Activity */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                      Recent Activity
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-purple-700 dark:text-purple-300">
                        🎉 5 new members joined this week
                      </p>
                      <p className="text-purple-700 dark:text-purple-300">
                        📅 3 events scheduled for next week
                      </p>
                      <p className="text-purple-700 dark:text-purple-300">
                        💬 42 messages posted today
                      </p>
                    </div>
                  </div>

                  {/* Top Contributors */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Top Contributors
                    </h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map((rank) => (
                        <div key={rank} className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">
                            {rank}
                          </div>
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">U{rank}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            Top Member {rank}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}