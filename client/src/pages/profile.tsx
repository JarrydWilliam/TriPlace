import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { MapPin, Calendar, Edit, Save, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const interestColors = [
  "bg-primary/20 text-primary",
  "bg-green-500/20 text-green-400",
  "bg-blue-500/20 text-blue-400",
  "bg-pink-500/20 text-pink-400",
  "bg-orange-500/20 text-orange-400",
  "bg-purple-500/20 text-purple-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-yellow-500/20 text-yellow-400",
];

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    location: "",
  });

  // Fetch user communities
  const { data: userCommunities = [], isLoading: communitiesLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'communities'],
    enabled: !!user,
  });

  // Fetch user events
  const { data: userEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'events'],
    enabled: !!user,
  });

  // Fetch user kudos
  const { data: userKudos = [], isLoading: kudosLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'kudos', 'received'],
    enabled: !!user,
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: typeof editForm) => {
      if (!user) throw new Error("No user found");
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditing(false);
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = () => {
    if (user) {
      setEditForm({
        name: user.name,
        bio: user.bio || "",
        location: user.location || "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({ name: "", bio: "", location: "" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userStats = {
    communities: userCommunities.length,
    events: userEvents.length,
    kudos: userKudos.length,
  };

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-900">
      <div className="flex min-h-screen">
        <Sidebar />
        
        <main className="flex-1 pb-20 md:pb-0">
          <TopBar />
          
          <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            {/* Profile Header */}
            <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                    <AvatarFallback className="bg-primary text-white text-2xl">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name" className="text-white dark:text-white">Name</Label>
                          <Input
                            id="name"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bio" className="text-white dark:text-white">Bio</Label>
                          <Textarea
                            id="bio"
                            value={editForm.bio}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Tell us about yourself..."
                            className="bg-gray-700 border-gray-600 text-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location" className="text-white dark:text-white">Location</Label>
                          <Input
                            id="location"
                            value={editForm.location}
                            onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="Your city, state"
                            className="bg-gray-700 border-gray-600 text-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleSave}
                            disabled={updateProfileMutation.isPending}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {updateProfileMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            onClick={handleCancel}
                            variant="outline"
                            className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-bold text-white dark:text-white mb-2">{user.name}</h2>
                        <p className="text-gray-400 dark:text-gray-400 mb-2">
                          {user.bio || "No bio available"}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 dark:text-gray-400 mb-4">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{user.location || "Location not set"}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Joined {user.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'Recently'}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {!isEditing && (
                    <Button
                      onClick={handleEditClick}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.communities}</div>
                  <div className="text-gray-400 dark:text-gray-400 text-sm">Communities</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{userStats.events}</div>
                  <div className="text-gray-400 dark:text-gray-400 text-sm">Events Attended</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-secondary">{userStats.kudos}</div>
                  <div className="text-gray-400 dark:text-gray-400 text-sm">Kudos Received</div>
                </CardContent>
              </Card>
            </div>

            {/* Interests */}
            <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl text-white dark:text-white">My Interests</CardTitle>
              </CardHeader>
              <CardContent>
                {user.interests && user.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <Badge 
                        key={interest}
                        variant="secondary" 
                        className={interestColors[index % interestColors.length]}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 dark:text-gray-400">
                      No interests added yet. Complete your onboarding to add interests.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl text-white dark:text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {communitiesLoading || eventsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="border-l-4 border-gray-600 dark:border-gray-600 pl-4 py-2">
                            <div className="h-4 bg-gray-600 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-600 dark:bg-gray-600 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {userCommunities.slice(0, 3).map((community: any) => (
                        <div key={`community-${community.id}`} className="border-l-4 border-primary pl-4 py-2">
                          <p className="font-medium text-white dark:text-white">Joined {community.name}</p>
                          <p className="text-gray-400 dark:text-gray-400 text-sm">Community</p>
                        </div>
                      ))}
                      {userEvents.slice(0, 3).map((event: any) => (
                        <div key={`event-${event.id}`} className="border-l-4 border-accent pl-4 py-2">
                          <p className="font-medium text-white dark:text-white">Registered for {event.title}</p>
                          <p className="text-gray-400 dark:text-gray-400 text-sm">Event</p>
                        </div>
                      ))}
                      {userKudos.slice(0, 2).map((kudos: any) => (
                        <div key={`kudos-${kudos.id}`} className="border-l-4 border-green-500 pl-4 py-2">
                          <p className="font-medium text-white dark:text-white">Received kudos</p>
                          <p className="text-gray-400 dark:text-gray-400 text-sm">
                            {kudos.message || "Thanks for being awesome!"}
                          </p>
                        </div>
                      ))}
                      {userCommunities.length === 0 && userEvents.length === 0 && userKudos.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-gray-400 dark:text-gray-400">
                            No recent activity. Join communities and attend events to see activity here.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
