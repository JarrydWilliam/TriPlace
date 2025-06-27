import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Send, Heart, Calendar, Users, MapPin, Pin, MessageCircle, Clock, Star, MoreHorizontal, Plus, ArrowLeft, Home, Compass, PlusSquare, User as UserIcon } from "lucide-react";
import { Community, Event, User, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
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

export default function Community() {
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude, locationName, loading: locationLoading } = useGeolocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { communityId } = useParams();
  const [, setLocation] = useLocation();
  
  const [selectedTab, setSelectedTab] = useState("feed");
  const [newMessage, setNewMessage] = useState("");
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventPrice, setEventPrice] = useState("");

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

  if (authLoading || communityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading community...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Community Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">The community you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <MobileLayout hasBottomNav={true} className="bg-background">
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
            <h1 className="text-lg font-semibold truncate">{community?.name || 'Community'}</h1>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{community?.memberCount || 0} members</span>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">{community?.category}</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <MobileButton variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </MobileButton>
        </div>
      </MobileHeader>

      <MobileContent className="space-y-4">
        <MobileCard className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-2xl">
              🌟
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{community.name}</h2>
              <p className="text-muted-foreground mt-1">{community.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{community.memberCount} members</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{community.category}</span>
                </div>
              </div>
            </div>
          </div>
        </MobileCard>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feed" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Feed</span>
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

          <TabsContent value="feed" className="space-y-4">
            <MobileCard>
              <div className="space-y-4">
                <h3 className="font-semibold">Community Feed</h3>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    💜 Be kind, stay curious, and help others thrive
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Input
                    placeholder="Share something with the community..."
                    value={newMessage}
                    onChange={(e) => setNewMessage((e.target as HTMLInputElement).value)}
                    className="flex-1"
                  />
                  <MobileButton 
                    size="sm"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </MobileButton>
                </div>
              </div>
            </MobileCard>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <MobileCard>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Community Events</h3>
                  <MobileButton 
                    size="sm"
                    onClick={() => setShowCreateEvent(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create
                  </MobileButton>
                </div>
                <p className="text-muted-foreground text-sm">No events scheduled yet. Create the first one!</p>
              </div>
            </MobileCard>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <MobileCard>
              <div className="space-y-4">
                <h3 className="font-semibold">Community Members</h3>
                <p className="text-muted-foreground text-sm">Loading members...</p>
              </div>
            </MobileCard>
          </TabsContent>

          <TabsContent value="highlights" className="space-y-4">
            <MobileCard>
              <div className="space-y-4">
                <h3 className="font-semibold">Community Highlights</h3>
                <p className="text-muted-foreground text-sm">Recent achievements and milestones will appear here.</p>
              </div>
            </MobileCard>
          </TabsContent>
        </Tabs>
      </MobileContent>

      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Community Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Describe your event"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Where will this happen?"
              />
            </div>
            <div>
              <Label htmlFor="price">Price (optional)</Label>
              <Input
                id="price"
                type="number"
                value={eventPrice}
                onChange={(e) => setEventPrice(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <MobileButton 
              className="w-full"
              disabled={!eventTitle || !eventDate || !eventTime}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Create Event
            </MobileButton>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}