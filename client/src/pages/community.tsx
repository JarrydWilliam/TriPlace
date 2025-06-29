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
import { Send, Heart, Calendar, Users, MapPin, Pin, MessageCircle, Clock, Star, MoreHorizontal, Plus } from "lucide-react";
import { Community, Event, User, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

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
  const [selectedTab, setSelectedTab] = useState("feed");
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    price: ""
  });

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "dynamic-info"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "messages"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "members"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "events"] })
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
    refetchInterval: 30000, // Refresh every 30 seconds for dynamic updates
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
    refetchInterval: 500, // Refresh every 500ms for instant feel
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale for fresh updates
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
      // Invalidate user events query to update dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to join event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Event scraping mutation
  const scrapeEventsMutation = useMutation({
    mutationFn: async () => {
      if (!latitude || !longitude) throw new Error('Location required for event scraping');
      return apiRequest("POST", `/api/communities/${communityId}/scrape-events`, {
        latitude,
        longitude
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Events Updated",
        description: data.message || "Successfully found new events for this community"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "scraped-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "events"] });
    },
    onError: () => {
      toast({
        title: "Event Scraping Failed",
        description: "Unable to find new events at this time. Please try again later.",
        variant: "destructive"
      });
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
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/communities", communityId, "messages"] });
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(["/api/communities", communityId, "messages"]);
      
      // Optimistically update to the new value
      const optimisticMessage = {
        id: Date.now(), // Temporary ID
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
      
      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onSuccess: (data) => {
      setNewMessage("");
      // Immediately update with real data from server
      queryClient.setQueryData(["/api/communities", communityId, "messages"], (old: any) => {
        if (!old) return [data];
        // Replace the optimistic message with the real one
        const filtered = old.filter((msg: any) => msg.id !== Date.now() && msg.id < 1000000000000);
        return [data, ...filtered];
      });
      // Also invalidate to ensure we have latest data
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "messages"] });
    },
    onError: (err, content, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
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

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/events`, {
        ...eventData,
        organizerId: user?.id,
        communityId: parseInt(communityId!),
        date: new Date(`${eventData.date}T${eventData.time}`).toISOString()
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Created",
        description: "Your event has been added to the community"
      });
      setShowCreateEvent(false);
      setEventForm({ title: "", description: "", date: "", time: "", location: "", price: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "events"] });
    },
    onError: () => {
      toast({
        title: "Failed to Create Event",
        description: "Unable to create event. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateEvent = () => {
    if (!eventForm.title.trim() || !eventForm.date || !eventForm.time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createEventMutation.mutate(eventForm);
  };

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
        
        {/* Community Header */}
        <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="responsive-padding">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Logo size="md" className="mr-2" />
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
              <div className="flex items-center space-x-3">
                <div className="text-center">
                  <Button 
                    size="lg" 
                    className="bg-green-500 hover:bg-green-600 text-white border-2 border-green-400 hover:border-green-300 font-bold px-8 py-4 text-lg shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-105 rounded-xl"
                  >
                    <Users className="w-6 h-6 mr-2" />
                    Join Community Chat
                  </Button>
                  <p className="text-white/80 text-sm mt-1">Start connecting with members</p>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Active Community
                </Badge>
              </div>
            </div>
            
            {/* Compact Pinned Announcement */}
            <Collapsible open={isPinnedOpen} onOpenChange={setIsPinnedOpen} className="mt-3">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm text-white h-auto"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Pin className="w-3 h-3 text-purple-300 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">Friday 7PM - Liberty Park</span>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 text-xs px-1.5 py-0.5 flex-shrink-0">
                      New
                    </Badge>
                  </div>
                  <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ml-2 ${isPinnedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
                  <h4 className="text-white font-medium text-sm mb-2">Weekly Community Meetup</h4>
                  <p className="text-white/90 text-sm leading-relaxed mb-3">
                    Join us this Friday at 7PM at Liberty Park for group activities, networking, and community building. All skill levels welcome! 🎉
                  </p>
                  <div className="space-y-2 text-xs text-white/70 mb-3">
                    <div>📍 Liberty Park - Main Pavilion</div>
                    <div>🕰️ Friday, 7:00 PM - 9:00 PM</div>
                    <div>👥 Expected: 15-20 members</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs h-7">
                      Add to Calendar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/70 hover:text-white text-xs h-7">
                      Share
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/70 hover:text-white text-xs h-7">
                      Get Directions
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
            <Card className="bg-white dark:bg-gray-900 border-none shadow-lg overflow-hidden h-[calc(100vh-20rem)]">
              <CardContent className="p-0 h-full flex flex-col">
                
                {/* Instagram-style Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
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
                          {community?.onlineMembers || 0} online
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
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 scroll-smooth" style={{ 
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
                            <Link href={`/profile/${message.sender?.id}`} className="flex-shrink-0">
                              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all">
                                <AvatarImage src={message.sender?.avatar || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                  {message.sender?.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline space-x-2 mb-1">
                                <Link href={`/profile/${message.sender?.id}`} className="hover:underline">
                                  <span className="font-medium text-gray-900 dark:text-white text-sm cursor-pointer">
                                    {formatDisplayName(message.sender?.name)}
                                  </span>
                                </Link>
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
                <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex-shrink-0">
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Community Events</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setShowCreateEvent(true)}
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                    <Button
                      onClick={() => scrapeEventsMutation.mutate()}
                      disabled={scrapeEventsMutation.isPending || !latitude || !longitude}
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    >
                      {scrapeEventsMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Calendar className="w-4 h-4 mr-2" />
                      )}
                      Find Events
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(eventsLoading || scrapedEventsLoading) ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Scraped Events Section */}
                    {scrapedEvents && scrapedEvents.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
                          Local {community?.category} Events
                        </h3>
                        {scrapedEvents.map((event: Event) => (
                          <div key={`scraped-${event.id}`} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {event.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                  External Event
                                </Badge>
                                {event.price && event.price !== "0" && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    ${event.price}
                                  </Badge>
                                )}
                              </div>
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
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                onClick={() => {
                                  if (user?.id) {
                                    joinEventMutation.mutate({ eventId: event.id, userId: user.id });
                                  }
                                }}
                                disabled={joinEventMutation.isPending}
                              >
                                {joinEventMutation.isPending ? "Joining..." : "Join Event"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Community Created Events Section */}
                    {communityEvents && communityEvents.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
                          Community Events
                        </h3>
                        {communityEvents.map((event: Event) => (
                          <div key={`community-${event.id}`} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {event.title}
                              </h4>
                              {event.price && event.price !== "0" && (
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
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (user?.id) {
                                    joinEventMutation.mutate({ eventId: event.id, userId: user.id });
                                  }
                                }}
                                disabled={joinEventMutation.isPending}
                              >
                                {joinEventMutation.isPending ? "Joining..." : "Join Event"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No Events State */}
                    {(!scrapedEvents || scrapedEvents.length === 0) && (!communityEvents || communityEvents.length === 0) && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No events found</p>
                        <p className="text-sm">Click "Find Events" to discover local {community?.category.toLowerCase()} events!</p>
                      </div>
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

      {/* Create Event Dialog */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Community Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={eventForm.title}
                onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your event..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={eventForm.location}
                onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Event location"
              />
            </div>
            
            <div>
              <Label htmlFor="price">Price (optional)</Label>
              <Input
                id="price"
                type="number"
                value={eventForm.price}
                onChange={(e) => setEventForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateEvent(false)}
                disabled={createEventMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateEvent}
                disabled={createEventMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                {createEventMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}