import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, DollarSign, Users, Globe, Handshake, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ScrollablePageWrapper } from "@/components/ui/scrollable-page-wrapper";

interface EventCreationData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  price: number;
  maxAttendees: number;
  eventType: "community-coordinated" | "brand-partnership";
  brandPartnerName?: string;
  revenueSharePercentage: number;
  targetCommunities: string[];
}

export default function CreateEventPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState<EventCreationData>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    category: "",
    price: 0,
    maxAttendees: 50,
    eventType: "community-coordinated",
    revenueSharePercentage: 7, // Default 7% platform fee
    targetCommunities: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventCreationData) => {
      const response = await fetch("/api/events/create-global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventData,
          creatorId: user?.id,
          isGlobal: true,
          isPaid: eventData.price > 0
        }),
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Created Successfully",
        description: "Your event has been submitted for review and will be distributed to matching communities.",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error Creating Event",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = "Event title is required";
    if (!formData.description.trim()) newErrors.description = "Event description is required";
    if (!formData.date) newErrors.date = "Event date is required";
    if (!formData.time) newErrors.time = "Event time is required";
    if (!formData.location.trim()) newErrors.location = "Event location is required";
    if (!formData.category) newErrors.category = "Event category is required";
    if (formData.price < 0) newErrors.price = "Price cannot be negative";
    if (formData.maxAttendees < 1) newErrors.maxAttendees = "Must allow at least 1 attendee";
    
    if (formData.eventType === "brand-partnership" && !formData.brandPartnerName?.trim()) {
      newErrors.brandPartnerName = "Brand partner name is required for brand partnerships";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createEventMutation.mutate(formData);
    }
  };

  const updateFormData = (field: keyof EventCreationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <ScrollablePageWrapper>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo size="md" />
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/dashboard")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Global Event</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Create revenue-generating events that will be distributed across matching communities. 
            Perfect for coordinated community activities and ethical brand partnerships.
          </p>
        </div>

        {/* Revenue Sharing Info */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Revenue Sharing Model</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  TriPlace takes a {formData.revenueSharePercentage}% platform fee from paid events. 
                  Revenue helps maintain platform quality and supports community growth initiatives.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Event Type</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.eventType === "community-coordinated" 
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950" 
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
                onClick={() => updateFormData("eventType", "community-coordinated")}
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-purple-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Community-Coordinated</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Events organized by community members for multiple communities
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.eventType === "brand-partnership" 
                    ? "border-green-500 bg-green-50 dark:bg-green-950" 
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
                onClick={() => updateFormData("eventType", "brand-partnership")}
              >
                <div className="flex items-center space-x-3">
                  <Handshake className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Ethical Brand Partnership</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sponsored events with values-aligned brand partners
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {formData.eventType === "brand-partnership" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand Partner Name *
                </label>
                <Input
                  value={formData.brandPartnerName || ""}
                  onChange={(e) => updateFormData("brandPartnerName", e.target.value)}
                  placeholder="Enter brand partner name"
                  className={errors.brandPartnerName ? "border-red-500" : ""}
                />
                {errors.brandPartnerName && (
                  <p className="text-red-500 text-sm mt-1">{errors.brandPartnerName}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details Form */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => updateFormData("title", e.target.value)}
                    placeholder="Enter event title"
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <Select value={formData.category} onValueChange={(value) => updateFormData("category", value)}>
                    <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fitness">Fitness & Wellness</SelectItem>
                      <SelectItem value="social">Social & Networking</SelectItem>
                      <SelectItem value="education">Education & Learning</SelectItem>
                      <SelectItem value="culture">Arts & Culture</SelectItem>
                      <SelectItem value="outdoor">Outdoor & Adventure</SelectItem>
                      <SelectItem value="food">Food & Culinary</SelectItem>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="business">Business & Professional</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  placeholder="Describe your event, what attendees can expect, and why communities should host it"
                  rows={4}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateFormData("date", e.target.value)}
                    className={errors.date ? "border-red-500" : ""}
                  />
                  {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time *
                  </label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => updateFormData("time", e.target.value)}
                    className={errors.time ? "border-red-500" : ""}
                  />
                  {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location *
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => updateFormData("location", e.target.value)}
                  placeholder="Enter event location or 'Virtual' for online events"
                  className={errors.location ? "border-red-500" : ""}
                />
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ticket Price ($)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => updateFormData("price", parseFloat(e.target.value) || 0)}
                    placeholder="0 for free events"
                    className={errors.price ? "border-red-500" : ""}
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Attendees
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.maxAttendees}
                    onChange={(e) => updateFormData("maxAttendees", parseInt(e.target.value) || 50)}
                    className={errors.maxAttendees ? "border-red-500" : ""}
                  />
                  {errors.maxAttendees && <p className="text-red-500 text-sm mt-1">{errors.maxAttendees}</p>}
                </div>
              </div>

              {/* Platform Fee Display */}
              {formData.price > 0 && (
                <Card className="bg-gray-50 dark:bg-gray-800">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Revenue Breakdown</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Ticket Price:</span>
                        <span>${formData.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Platform Fee ({formData.revenueSharePercentage}%):</span>
                        <span>-${(formData.price * formData.revenueSharePercentage / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Your Revenue per Ticket:</span>
                        <span>${(formData.price * (100 - formData.revenueSharePercentage) / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Terms Notice */}
              <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">Event Review Process</h3>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        All global events are reviewed to ensure they align with community values. 
                        Events will be automatically distributed to matching communities based on category and interests.
                        You'll receive confirmation within 24 hours.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/dashboard")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createEventMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {createEventMutation.isPending ? "Creating..." : "Create Global Event"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}