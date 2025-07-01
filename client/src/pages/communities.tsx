import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, MapPin, Calendar, Sparkles, Sun, Moon, ChevronUp } from "lucide-react";
import { Community, Event } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme-context";

export default function CommunitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude } = useGeolocation(user?.id);
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/events", "global"] })
    ]);
  };

  // Show/hide back to top button on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      setShowBackToTop(scrollContainerRef.current.scrollTop > 400);
    };
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const handleBackToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Fetch all communities
  const { data: allCommunities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["/api/communities"],
    queryFn: async () => {
      const response = await fetch("/api/communities");
      if (!response.ok) throw new Error("Failed to fetch communities");
      const communities = await response.json();
      
      // Fetch live member counts for each community
      const communitiesWithLiveCounts = await Promise.all(
        communities.map(async (community: Community) => {
          try {
            const memberCountResponse = await fetch(`/api/communities/${community.id}/live-members-count`);
            if (memberCountResponse.ok) {
              const memberData = await memberCountResponse.json();
              return {
                ...community,
                liveMemberCount: memberData.liveMembers,
                totalMemberCount: memberData.totalMembers
              };
            }
          } catch (error) {
            console.error(`Failed to fetch member count for community ${community.id}:`, error);
          }
          return {
            ...community,
            liveMemberCount: 0,
            totalMemberCount: community.memberCount || 0
          };
        })
      );
      
      return communitiesWithLiveCounts;
    }
  });

  // Fetch global/partner events
  const { data: partnerEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events", "global"],
    queryFn: async () => {
      const response = await fetch("/api/events/global");
      if (!response.ok) throw new Error("Failed to fetch partner events");
      return response.json();
    }
  });

  // Get location display name from coordinates
  const getLocationDisplay = (locationString: string) => {
    if (!locationString) return "Location Unknown";
    const [lat, lon] = locationString.split(',').map(Number);
    if (!lat || !lon) return "Location Unknown";
    
    // Simple location approximation - in production, you'd use reverse geocoding
    if (lat > 40 && lat < 42 && lon > -112 && lon < -111) return "Ogden, Utah";
    if (lat > 40 && lat < 41 && lon > -74 && lon < -73) return "New York, NY";
    if (lat > 37 && lat < 38 && lon > -123 && lon < -122) return "San Francisco, CA";
    return "Your Area";
  };

  // Get community tags from description and category
  const getCommunityTags = (community: Community) => {
    const tags = [community.category];
    
    // Extract additional tags from description
    const description = community.description?.toLowerCase() || "";
    if (description.includes("tech")) tags.push("Tech");
    if (description.includes("fitness") || description.includes("health")) tags.push("Fitness");
    if (description.includes("outdoor") || description.includes("adventure")) tags.push("Outdoors");
    if (description.includes("creative") || description.includes("art")) tags.push("Creative");
    if (description.includes("food") || description.includes("cooking")) tags.push("Food");
    if (description.includes("music")) tags.push("Music");
    if (description.includes("business") || description.includes("entrepreneur")) tags.push("Business");
    
    // Remove duplicates using filter
    return tags.filter((tag, index) => tags.indexOf(tag) === index);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="mobile-page-container bg-gray-50 dark:bg-gray-900">
      <div
        ref={scrollContainerRef}
        className="container-responsive responsive-padding safe-area-top safe-area-bottom max-w-6xl mx-auto overflow-y-auto min-h-screen relative"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        
        {/* Header with Back Button and Theme Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Communities</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="p-2"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        {/* Partner Events Section */}
        {partnerEvents && partnerEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Featured Partner Events</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {partnerEvents.slice(0, 3).map((event: Event) => (
                <Card key={event.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
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
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Discover Communities
          </h2>
        </div>

        {communitiesLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : allCommunities?.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No Communities Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Communities will appear here as they're created based on user interests and locations.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allCommunities?.map((community: Community) => (
              <Link key={community.id} href={`/community/${community.id}`}>
                <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer h-full">
                  <CardContent className="p-6">
                    {/* Community Icon */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center text-xl">
                        {community.category === "Fitness and Health" && "💪"}
                        {community.category === "Technology" && "💻"}
                        {community.category === "Outdoor Activities" && "🏔️"}
                        {community.category === "Creative Arts" && "🎨"}
                        {community.category === "Food and Cooking" && "🍳"}
                        {community.category === "Music" && "🎵"}
                        {community.category === "Business" && "💼"}
                        {!["Fitness and Health", "Technology", "Outdoor Activities", "Creative Arts", "Food and Cooking", "Music", "Business"].includes(community.category) && "🌟"}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                          <Users className="w-3 h-3" />
                          <span>{community.liveMemberCount} / {community.totalMemberCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Community Info */}
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {community.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {community.description}
                    </p>

                    {/* Location */}
                    <div className="flex items-center space-x-1 mb-3 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span>{getLocationDisplay(community.location || "")}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {getCommunityTags(community).slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Smooth scroll fade at bottom */}
        <div className="h-8 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent pointer-events-none"></div>

        {showBackToTop && (
          <button
            onClick={handleBackToTop}
            className="fixed bottom-6 right-6 z-50 bg-primary text-white rounded-full shadow-lg p-3 flex items-center justify-center hover:bg-primary/90 transition-all"
            aria-label="Back to Top"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        )}
      </div>
    </PullToRefresh>
  );
}