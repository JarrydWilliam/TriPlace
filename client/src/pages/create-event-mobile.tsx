import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Home, Compass, PlusSquare, MessageCircle, User as UserIcon, Calendar, MapPin, DollarSign, Users, Clock, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
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

export default function CreateEventMobile() {
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude, locationName } = useGeolocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    address: "",
    category: "",
    price: "",
    maxAttendees: "",
    isGlobal: false,
    eventType: "community-coordinated" as "community-coordinated" | "brand-partnership",
    brandPartnerName: ""
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const endpoint = eventData.isGlobal ? "/api/events/create-global" : "/api/events";
      const response = await apiRequest("POST", endpoint, eventData);
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: eventForm.isGlobal 
          ? "Global event created and sent for review!" 
          : "Event created successfully!",
      });
      setEventForm({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        address: "",
        category: "",
        price: "",
        maxAttendees: "",
        isGlobal: false,
        eventType: "community-coordinated",
        brandPartnerName: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setLocation('/dashboard');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!eventForm.title || !eventForm.description || !eventForm.date || !eventForm.location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const eventData = {
      ...eventForm,
      date: new Date(`${eventForm.date}T${eventForm.time || '12:00'}`).toISOString(),
      price: eventForm.price ? parseFloat(eventForm.price) : 0,
      maxAttendees: eventForm.maxAttendees ? parseInt(eventForm.maxAttendees) : null,
      organizer: user?.name || 'Anonymous',
      latitude: latitude?.toString(),
      longitude: longitude?.toString(),
    };

    createEventMutation.mutate(eventData);
  };

  if (authLoading) {
    return (
      <MobileLayout>
        <MobileContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </MobileContent>
      </MobileLayout>
    );
  }

  if (!user) {
    return null;
  }

  const categories = [
    "wellness", "tech", "arts", "fitness", "music", "food", "outdoor", "social", "education", "business"
  ];

  const platformFee = eventForm.price ? (parseFloat(eventForm.price) * 0.07).toFixed(2) : "0.00";
  const creatorEarnings = eventForm.price ? (parseFloat(eventForm.price) * 0.93).toFixed(2) : "0.00";

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
            <h1 className="text-lg font-semibold">Create Event</h1>
            <div className="text-xs text-muted-foreground">
              {eventForm.isGlobal ? 'Global Event' : 'Community Event'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <MobileButton
            onClick={handleSubmit}
            disabled={createEventMutation.isPending || !eventForm.title || !eventForm.description}
            size="sm"
          >
            <Save className="w-4 h-4 mr-1" />
            {createEventMutation.isPending ? 'Creating...' : 'Create'}
          </MobileButton>
        </div>
      </MobileHeader>

      {/* Mobile Content */}
      <MobileContent className="space-y-4">
        {/* Event Type Selection */}
        <MobileCard>
          <h3 className="text-lg font-semibold mb-3">Event Type</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="community"
                name="eventScope"
                checked={!eventForm.isGlobal}
                onChange={() => setEventForm({ ...eventForm, isGlobal: false })}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <Label htmlFor="community" className="font-medium">Community Event</Label>
                <p className="text-sm text-muted-foreground">Visible to your active communities</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="global"
                name="eventScope"
                checked={eventForm.isGlobal}
                onChange={() => setEventForm({ ...eventForm, isGlobal: true })}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <Label htmlFor="global" className="font-medium">Global Event</Label>
                <p className="text-sm text-muted-foreground">Distributed across matching communities (requires review)</p>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* Global Event Type */}
        {eventForm.isGlobal && (
          <MobileCard>
            <h3 className="text-lg font-semibold mb-3">Global Event Category</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="community-coordinated"
                  name="eventType"
                  checked={eventForm.eventType === "community-coordinated"}
                  onChange={() => setEventForm({ ...eventForm, eventType: "community-coordinated" })}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <Label htmlFor="community-coordinated" className="font-medium">Community-Coordinated</Label>
                  <p className="text-sm text-muted-foreground">Self-organized community event</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="brand-partnership"
                  name="eventType"
                  checked={eventForm.eventType === "brand-partnership"}
                  onChange={() => setEventForm({ ...eventForm, eventType: "brand-partnership" })}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <Label htmlFor="brand-partnership" className="font-medium">Ethical Brand Partnership</Label>
                  <p className="text-sm text-muted-foreground">Sponsored by aligned brands</p>
                </div>
              </div>
            </div>
          </MobileCard>
        )}

        {/* Brand Partner Name */}
        {eventForm.isGlobal && eventForm.eventType === "brand-partnership" && (
          <MobileCard>
            <Label htmlFor="brandPartnerName" className="text-sm font-medium">Brand Partner Name *</Label>
            <Input
              id="brandPartnerName"
              value={eventForm.brandPartnerName}
              onChange={(e) => setEventForm({ ...eventForm, brandPartnerName: e.target.value })}
              placeholder="Enter brand partner name"
              className="mt-2"
            />
          </MobileCard>
        )}

        {/* Basic Event Info */}
        <MobileCard>
          <h3 className="text-lg font-semibold mb-3">Event Details</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
              <Input
                id="title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Enter event title"
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Describe your event..."
                className="mt-2 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-sm font-medium">Category *</Label>
              <select
                id="category"
                value={eventForm.category}
                onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                className="mt-2 w-full p-2 border border-border rounded-lg bg-background"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </MobileCard>

        {/* Date & Time */}
        <MobileCard>
          <h3 className="text-lg font-semibold mb-3">When</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date" className="text-sm font-medium">Date *</Label>
              <Input
                id="date"
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="time" className="text-sm font-medium">Time</Label>
              <Input
                id="time"
                type="time"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        </MobileCard>

        {/* Location */}
        <MobileCard>
          <h3 className="text-lg font-semibold mb-3">Where</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location" className="text-sm font-medium">Location Name *</Label>
              <Input
                id="location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="e.g., Central Park, Coffee Shop"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="address" className="text-sm font-medium">Full Address</Label>
              <Input
                id="address"
                value={eventForm.address}
                onChange={(e) => setEventForm({ ...eventForm, address: e.target.value })}
                placeholder="Street address, city, state"
                className="mt-2"
              />
            </div>
            {locationName && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Your location: {locationName}</span>
              </div>
            )}
          </div>
        </MobileCard>

        {/* Pricing & Capacity */}
        <MobileCard>
          <h3 className="text-lg font-semibold mb-3">Event Settings</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="price" className="text-sm font-medium">Ticket Price</Label>
              <div className="relative mt-2">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={eventForm.price}
                  onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Leave empty for free events</p>
            </div>

            {eventForm.price && parseFloat(eventForm.price) > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Revenue Breakdown</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Ticket Price:</span>
                    <span>${eventForm.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee (7%):</span>
                    <span>-${platformFee}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Your Earnings:</span>
                    <span>${creatorEarnings}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="maxAttendees" className="text-sm font-medium">Max Attendees</Label>
              <div className="relative mt-2">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="maxAttendees"
                  type="number"
                  value={eventForm.maxAttendees}
                  onChange={(e) => setEventForm({ ...eventForm, maxAttendees: e.target.value })}
                  placeholder="Unlimited"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Leave empty for unlimited capacity</p>
            </div>
          </div>
        </MobileCard>

        {/* Preview */}
        <MobileCard>
          <h3 className="text-lg font-semibold mb-3">Preview</h3>
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h4 className="font-medium">{eventForm.title || 'Event Title'}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {eventForm.description || 'Event description will appear here...'}
            </p>
            <div className="flex items-center space-x-4 mt-3 text-xs text-muted-foreground">
              {eventForm.date && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(eventForm.date).toLocaleDateString()}</span>
                </div>
              )}
              {eventForm.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>{eventForm.location}</span>
                </div>
              )}
              {eventForm.price && parseFloat(eventForm.price) > 0 && (
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-3 h-3" />
                  <span>${eventForm.price}</span>
                </div>
              )}
            </div>
            {eventForm.category && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {eventForm.category}
              </Badge>
            )}
          </div>
        </MobileCard>
      </MobileContent>

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
          className="flex-col space-y-1 text-primary"
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