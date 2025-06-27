import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Send, Heart, Calendar, Users, MapPin, Pin, MessageCircle, Clock, Star, MoreHorizontal, Plus, ArrowLeft, Home, Compass, PlusSquare, User as UserIcon } from "lucide-react";
import { Community, Event, User, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { 
  MobileLayout, 
  MobileHeader, 
  MobileContent, 
  MobileBottomNav,
  MobileCard,
  MobileButton,
  MobileInput
} from "@/components/layout/mobile-layout";

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

export default function CommunityMobile() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude } = useGeolocation();
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
    location: "",
    price: ""
  });
  const [, setLocation] = useLocation();

  // Fetch community data
  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["/api/communities", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}`);
      if (!response.ok) throw new Error('Failed to fetch community');
      return response.json();
    }
  });

  // Fetch community messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "messages"],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchInterval: 500, // Real-time messaging
  });

  // Fetch community events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "events"],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    }
  });

  // Fetch community members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/communities", communityId, "members"],
    enabled: !!communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${communityId}/members`);
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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Resonate message mutation
  const resonateMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("POST", `/api/messages/${messageId}/resonate`);
      if (!response.ok) throw new Error("Failed to resonate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "messages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resonate with message.",
        variant: "destructive",
      });
    },
  });

  // Join event mutation
  const joinEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/register`);
      if (!response.ok) throw new Error("Failed to join event");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You've joined the event!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "events"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/events`, eventData);
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event created successfully!",
      });
      setShowCreateEvent(false);
      setEventForm({ title: "", description: "", date: "", location: "", price: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "events"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading || communityLoading) {
    return (
      <MobileLayout>
        <MobileContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-muted-foreground">Loading community...</p>
          </div>
        </MobileContent>
      </MobileLayout>
    );
  }

  if (!community) {
    return (
      <MobileLayout>
        <MobileContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Community Not Found</h1>
            <p className="text-muted-foreground">The community you're looking for doesn't exist.</p>
            <MobileButton 
              className="mt-4"
              onClick={() => setLocation('/dashboard')}
            >
              Back to Dashboard
            </MobileButton>
          </div>
        </MobileContent>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hasBottomNav={true} className="bg-background">
      {/* Mobile Header */}
      <MobileHeader>
        <div className="flex items-center space-x-3">
          <MobileButton 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4" />
          </MobileButton>
          <Logo size="sm" />
          <div className="flex flex-col flex-1">
            <h1 className="text-lg font-semibold truncate">{community.name}</h1>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{community.memberCount || 0} members</span>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">{community.category}</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <MobileButton variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </MobileButton>
        </div>
      </MobileHeader>

      {/* Mobile Content with Tabs */}
      <MobileContent className="p-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          {/* Tab List */}
          <div className="px-4 pt-4 pb-2 border-b">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="feed" className="text-xs">
                <MessageCircle className="w-4 h-4 mr-1" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="events" className="text-xs">
                <Calendar className="w-4 h-4 mr-1" />
                Events
              </TabsTrigger>
              <TabsTrigger value="members" className="text-xs">
                <Users className="w-4 h-4 mr-1" />
                Members
              </TabsTrigger>
              <TabsTrigger value="highlights" className="text-xs">
                <Star className="w-4 h-4 mr-1" />
                Highlights
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {/* Live Feed Tab */}
            <TabsContent value="feed" className="h-full flex flex-col m-0 p-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse bg-muted h-16 rounded-lg" />
                    ))}
                  </div>
                ) : messages?.length > 0 ? (
                  messages.map((message: any) => (
                    <MobileCard key={message.id} className="p-3">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={message.sender?.avatar} />
                          <AvatarFallback className="text-xs">
                            {formatDisplayName(message.sender?.name).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {formatDisplayName(message.sender?.name)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center space-x-3 mt-2">
                            <MobileButton
                              variant="ghost"
                              size="sm"
                              onClick={() => resonateMutation.mutate(message.id)}
                              className="text-xs"
                            >
                              <Heart className="w-3 h-3 mr-1" />
                              {message.resonateCount || 0}
                            </MobileButton>
                          </div>
                        </div>
                      </div>
                    </MobileCard>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Be the first to start the conversation!</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-background">
                <div className="flex items-center space-x-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Share your thoughts..."
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                    rows={1}
                  />
                  <MobileButton
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </MobileButton>
                </div>
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="h-full overflow-y-auto m-0 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Community Events</h3>
                <MobileButton
                  size="sm"
                  onClick={() => setShowCreateEvent(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create
                </MobileButton>
              </div>

              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-muted h-24 rounded-lg" />
                  ))}
                </div>
              ) : events?.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event: any) => (
                    <MobileCard key={event.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          <div className="flex items-center space-x-4 mt-3 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{event.location}</span>
                            </div>
                            {event.price && (
                              <div className="flex items-center space-x-1">
                                <span>${event.price}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <MobileButton
                          size="sm"
                          onClick={() => joinEventMutation.mutate(event.id)}
                          disabled={joinEventMutation.isPending}
                        >
                          Join
                        </MobileButton>
                      </div>
                    </MobileCard>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No events yet</p>
                  <p className="text-sm">Create the first community event!</p>
                </div>
              )}
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="h-full overflow-y-auto m-0 p-4 space-y-4">
              <h3 className="text-lg font-semibold">Community Members</h3>

              {membersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse bg-muted h-16 rounded-lg" />
                  ))}
                </div>
              ) : members?.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member: any) => (
                    <MobileCard key={member.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>
                              {formatDisplayName(member.name).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{formatDisplayName(member.name)}</h4>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{member.matchPercentage || 85}% match</span>
                              <span>•</span>
                              <span>{member.distance || 12} miles away</span>
                            </div>
                          </div>
                        </div>
                        <MobileButton size="sm" variant="secondary">
                          <Heart className="w-4 h-4 mr-1" />
                          Kudos
                        </MobileButton>
                      </div>
                    </MobileCard>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No members found</p>
                  <p className="text-sm">Invite friends to join this community!</p>
                </div>
              )}
            </TabsContent>

            {/* Highlights Tab */}
            <TabsContent value="highlights" className="h-full overflow-y-auto m-0 p-4 space-y-4">
              <h3 className="text-lg font-semibold">Community Highlights</h3>
              
              <div className="space-y-4">
                <MobileCard className="p-4">
                  <h4 className="font-medium mb-2">🎯 Weekly Challenge</h4>
                  <p className="text-sm text-muted-foreground">Attend 2 community events this week</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>1/2</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '50%' }} />
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <h4 className="font-medium mb-2">🏆 Top Contributors</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Sarah M.</span>
                      <Badge variant="secondary">24 Kudos</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Mike T.</span>
                      <Badge variant="secondary">18 Kudos</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Alex K.</span>
                      <Badge variant="secondary">15 Kudos</Badge>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <h4 className="font-medium mb-2">📊 Community Stats</h4>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{community.memberCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Members</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{events?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">Events</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{messages?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">Messages</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">94%</div>
                      <div className="text-xs text-muted-foreground">Activity</div>
                    </div>
                  </div>
                </MobileCard>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </MobileContent>

      {/* Create Event Dialog */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Community Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Enter event title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Describe your event"
              />
            </div>
            <div>
              <Label htmlFor="date">Date & Time</Label>
              <Input
                id="date"
                type="datetime-local"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="Event location"
              />
            </div>
            <div>
              <Label htmlFor="price">Price (optional)</Label>
              <Input
                id="price"
                value={eventForm.price}
                onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })}
                placeholder="0.00"
                type="number"
                step="0.01"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <MobileButton
                variant="secondary"
                onClick={() => setShowCreateEvent(false)}
              >
                Cancel
              </MobileButton>
              <MobileButton
                onClick={() => createEventMutation.mutate(eventForm)}
                disabled={!eventForm.title || !eventForm.description || createEventMutation.isPending}
              >
                Create Event
              </MobileButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav>
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/dashboard')}
          className="flex-col space-y-1"
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/communities')}
          className="flex-col space-y-1"
        >
          <Compass className="w-5 h-5" />
          <span className="text-xs">Explore</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/create-event')}
          className="flex-col space-y-1"
        >
          <PlusSquare className="w-5 h-5" />
          <span className="text-xs">Create</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/messaging')}
          className="flex-col space-y-1"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs">Messages</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/profile')}
          className="flex-col space-y-1"
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </MobileButton>
      </MobileBottomNav>
    </MobileLayout>
  );
}