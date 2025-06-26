import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useTheme } from "@/lib/theme-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Settings, Sun, Moon, CalendarDays, Plus, Clock, Star, Target, Award, Users, TrendingUp, Heart, User as UserIcon, Mail, Bell, Shield, HelpCircle, FileText, LogOut, Edit, Trash2, Camera, Lock, Smartphone, AlertTriangle } from "lucide-react";
import { Community, Event, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude, locationName, loading: locationLoading } = useGeolocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Fetch user's communities for events
  const { data: userCommunities, isLoading: userCommunitiesLoading } = useQuery({
    queryKey: ["/api/communities/user", user?.id],
    enabled: !!user?.id,
  });

  // Fetch upcoming events in user's communities
  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events/upcoming"],
    enabled: !!user,
  });

  // Fetch recommended communities and users
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["/api/communities/recommended", latitude, longitude, user?.id],
    enabled: !!user && !!latitude && !!longitude,
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: user?.id?.toString() || '',
        latitude: latitude?.toString() || '',
        longitude: longitude?.toString() || ''
      });
      
      const response = await fetch(`/api/communities/recommended?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sample data for demo purposes
  const monthlyKudos = 32;
  const currentChallenges = [
    { id: 1, title: "🎯 Attend 2 events this week", progress: 50, target: 2, current: 1 },
    { id: 2, title: "📢 Post in 3 communities", progress: 33, target: 3, current: 1 },
    { id: 3, title: "🤝 Meet 1 new 90% match member", progress: 0, target: 1, current: 0 }
  ];

  // Color coding for communities
  const communityColors = {
    wellness: "bg-purple-500",
    tech: "bg-blue-500", 
    arts: "bg-pink-500",
    fitness: "bg-green-500",
    music: "bg-yellow-500",
    food: "bg-orange-500",
    outdoor: "bg-emerald-500",
    social: "bg-indigo-500"
  };

  if (authLoading || locationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        
        {/* User Banner */}
        <Card className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16 border-4 border-white/20">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-white/20 text-white text-lg">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">Welcome back, {user.name}!</h1>
                  <div className="flex items-center space-x-4 mt-1 text-white/80">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{locationName || 'Location loading...'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">💜 {monthlyKudos} Kudos this month</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleTheme}
                  className="text-white hover:bg-white/20"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                
                {/* Settings Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end">
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Profile Settings */}
                    <Link href="/settings/profile">
                      <DropdownMenuItem>
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                    </Link>

                    {/* Account Settings */}
                    <Link href="/settings/account">
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Account
                      </DropdownMenuItem>
                    </Link>

                    {/* Notifications */}
                    <Link href="/settings/notifications">
                      <DropdownMenuItem>
                        <Bell className="mr-2 h-4 w-4" />
                        Notifications
                      </DropdownMenuItem>
                    </Link>

                    {/* Community Preferences */}
                    <Link href="/settings/community">
                      <DropdownMenuItem>
                        <Users className="mr-2 h-4 w-4" />
                        Community Preferences
                      </DropdownMenuItem>
                    </Link>

                    {/* Security */}
                    <Link href="/settings/security">
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" />
                        Security
                      </DropdownMenuItem>
                    </Link>

                    <DropdownMenuSeparator />

                    {/* Support */}
                    <Link href="/settings/support">
                      <DropdownMenuItem>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Support
                      </DropdownMenuItem>
                    </Link>

                    {/* About / Legal */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FileText className="mr-2 h-4 w-4" />
                        About & Legal
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Terms of Service
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="mr-2 h-4 w-4" />
                          Privacy Policy
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          App Version 1.0.0
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <p className="text-white/90 text-sm italic">
                "TriPlace connects hearts and minds through shared experiences, building meaningful communities where every connection matters."
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Event Calendar Widget */}
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl text-gray-900 dark:text-white flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5" />
                  <span>Event Calendar</span>
                </CardTitle>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Create Event
                </Button>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(upcomingEvents) && upcomingEvents.slice(0, 5).map((event: Event) => {
                      const communityColor = communityColors[event.category as keyof typeof communityColors] || "bg-gray-500";
                      return (
                        <div 
                          key={event.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                          onClick={() => setSelectedEventId(event.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${communityColor}`} />
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{event.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {event.price && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                ${event.price}
                              </Badge>
                            )}
                            <Button size="sm" variant="ghost">
                              👏 Kudos
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {(!Array.isArray(upcomingEvents) || upcomingEvents.length === 0) && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No upcoming events in your communities</p>
                        <p className="text-sm">Join more communities to see events!</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Today's Suggestions / Discoveries Panel */}
          <div className="space-y-6">
            
            {/* Weekly Challenges */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Weekly Challenges</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentChallenges.map((challenge) => (
                  <div key={challenge.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {challenge.title}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {challenge.current}/{challenge.target}
                      </span>
                    </div>
                    <Progress value={challenge.progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Discovery Suggestions */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Today's Discoveries</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* High Match Members */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">🎯 High Match Members</h4>
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={`https://images.unsplash.com/photo-${1500000000000 + i}?w=40&h=40&fit=crop&crop=face`} />
                        <AvatarFallback>U{i}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Alex Johnson
                        </p>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            🎯 92% Match
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        👏
                      </Button>
                    </div>
                  ))}
                </div>

                {/* New Communities */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">🔍 New Communities</h4>
                  {Array.isArray(recommendations) && recommendations.slice(0, 2).map((community: Community) => (
                    <div key={community.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm">🌟</span>
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                          {community.name}
                        </h5>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {community.memberCount} members • {community.category}
                      </p>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          Join Community
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => window.location.href = `/community/${community.id}`}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trending Events */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">🔥 Trending Events</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm">🎉</span>
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                        Weekend Hiking Adventure
                      </h5>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Saturday • 15 attending • $0
                    </p>
                    <Button size="sm" variant="outline" className="w-full">
                      View Event
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Kudos Leaderboard */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                  <Award className="w-5 h-5" />
                  <span>Local Kudos Leaders</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((rank) => (
                  <div key={rank} className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold">
                      {rank}
                    </div>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={`https://images.unsplash.com/photo-${1500000000000 + rank}?w=32&h=32&fit=crop&crop=face`} />
                      <AvatarFallback>U{rank}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        User {rank}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        💜 {50 - rank * 10} kudos
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}