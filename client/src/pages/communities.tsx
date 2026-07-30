import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, MapPin, Calendar, Sparkles, Sun, Moon } from "lucide-react";
import { Community, Event } from "@shared/schema";
import { useState } from "react";
import { Link } from "wouter";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/queryClient";

import { SharedCommunityCard } from "@/components/ui/community-card";
import { MobileNav } from "@/components/layout/mobile-nav";
import { VibePageHeader } from "@/components/layout/vibe-page-header";



export default function CommunitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude } = useGeolocation(user?.id);
  const queryClient = useQueryClient();


  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/events", "global"] })
    ]);
  };

  // Fetch user's joined communities only
  const { data: allCommunities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "communities"],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(getApiUrl(`/api/users/${user.id}/communities`));
      if (!response.ok) throw new Error("Failed to fetch communities");
      return response.json();
    }
  });

  // Fetch global/partner events
  const { data: partnerEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events", "global"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/events/global"));
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Get location display name from coordinates
  const getLocationDisplay = (locationString: string) => {
    if (!locationString) return "Location Unknown";
    const [lat, lon] = locationString.split(',').map(Number);
    if (!lat || !lon) return "Location Unknown";
    
    return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  };

  // Get community tags from description and category
  const getCommunityTags = (community: Community) => {
    const category = community.category?.toLowerCase() || "";
    const tags = [category];
    
    // Extract additional tags from description
    const description = community.description?.toLowerCase() || "";
    if (description.includes("tech")) tags.push("tech");
    if (description.includes("fitness") || description.includes("health") || description.includes("wellness")) tags.push("fitness");
    if (description.includes("outdoor") || description.includes("adventure")) tags.push("outdoor");
    if (description.includes("creative") || description.includes("art")) tags.push("arts");
    if (description.includes("food") || description.includes("cooking")) tags.push("food");
    if (description.includes("music")) tags.push("music");
    if (description.includes("business") || description.includes("entrepreneur")) tags.push("business");
    if (description.includes("social") || description.includes("friends")) tags.push("social");
    
    // Remove duplicates using filter and capitalize
    return tags.filter((tag, index) => tags.indexOf(tag) === index).map(t => t.charAt(0).toUpperCase() + t.slice(1));
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-pulse">
            <Logo size="xl" />
          </div>
          <p className="text-sm text-muted-foreground">Loading communities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground safe-area-bottom pb-nav relative overflow-hidden">
      <PullToRefresh onRefresh={handleRefresh}>
        <div>
          <VibePageHeader mode="detail" title="My Groups" />
          <div className="max-w-md mx-auto px-4 py-4 space-y-6">

        {/* Partner Events Section */}
        {partnerEvents && partnerEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Featured Partner Events</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {partnerEvents.slice(0, 3).map((event: Event) => (
                <Card key={event.id} className="glass-card hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Partner Event
                      </Badge>
                      {event.price && (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          ${event.price}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Communities Grid */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Vibe with My Communities</span>
          </h2>
        </div>

        {communitiesLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-card animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 skeleton rounded mb-3"></div>
                  <div className="h-4 skeleton rounded mb-2"></div>
                  <div className="h-4 skeleton rounded mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-5 w-16 skeleton rounded"></div>
                    <div className="h-5 w-20 skeleton rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : allCommunities?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <div className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center relative z-10 shadow-2xl">
                <Users className="w-8 h-8 text-primary/80" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              No Groups Yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
              You haven't joined any communities yet. Head to Discover to find your people!
            </p>
            <Link href="/discover">
              <button className="bg-primary text-white font-semibold px-6 py-3 rounded-full text-sm hover:opacity-90 transition-all">
                Discover Communities
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allCommunities?.map((community: Community) => (
              <div key={community.id} className="h-[220px]">
                <SharedCommunityCard
                  community={community}
                  joined={true}
                  onJoin={() => {}}
                />
              </div>
            ))}
          </div>
        )}

        {/* Smooth scroll fade at bottom */}
        <div className="h-8 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
        </div>
        </div>

      </PullToRefresh>

      {/* Persistent bottom navigation */}
      <MobileNav />
    </div>
  );
}