import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { User } from "@shared/schema";
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
import {
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  Heart,
  Bookmark,
  Users,
  Activity,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useParams } from "wouter";
import { Logo } from "@/components/ui/logo";
import { ReportBlockMenu } from "@/components/safety/report-block-menu";
import { InlineEmptyState } from "@/components/ui/empty-state";

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
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [signalCooldown, setSignalCooldown] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    location: "",
  });

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = !userId || userId === currentUser?.id?.toString();
  const targetUserId = isOwnProfile ? currentUser?.id : parseInt(userId!);

  // Fetch profile user data (for viewing other users)
  const { data: profileUser, isLoading: profileUserLoading } = useQuery<User>({
    queryKey: ["/api/users", targetUserId],
    enabled: !!targetUserId && !isOwnProfile,
  });

  // Use current user for own profile, profile user for others
  const user = isOwnProfile ? currentUser : profileUser;

  // Fetch user communities
  const { data: userCommunities = [], isLoading: communitiesLoading } =
    useQuery<any[]>({
      queryKey: ["/api/users", targetUserId, "communities"],
      enabled: !!targetUserId,
    });

  // Fetch user events
  const { data: userEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/users", targetUserId, "events"],
    enabled: !!targetUserId,
  });

  // Fetch current user events for "Connect After Event" validation
  const { data: currentUserEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/users", currentUser?.id, "events"],
    enabled: !!currentUser?.id && !isOwnProfile,
  });

  const sharedEvents = currentUserEvents.filter((ce: any) =>
    userEvents.some((ue: any) => ue.id === ce.id)
  );
  const canConnectAfterEvent = sharedEvents.length > 0;

  // Fetch user kudos
  const { data: userKudos = [], isLoading: kudosLoading } = useQuery<any[]>({
    queryKey: ["/api/users", targetUserId, "kudos", "received"],
    enabled: !!targetUserId,
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: typeof editForm) => {
      if (!currentUser) throw new Error("No user found");
      const response = await apiRequest(
        "PATCH",
        `/api/users/${currentUser.id}`,
        updates
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  // Explicit AI Connection Signal Mutation
  const connectionSignalMutation = useMutation({
    mutationFn: async (signalType: string) => {
      if (!targetUserId || !currentUser) return;
      const response = await apiRequest(
        "POST",
        `/api/users/${targetUserId}/connection-signal`,
        {
          sourceUserId: currentUser.id,
          signalType: "explicit_interest", // The backend will learn from this
          detail: signalType,
        }
      );
      return response.json();
    },
    onSuccess: () => {
      setSignalCooldown(true);
      setTimeout(() => setSignalCooldown(false), 3000);
      toast({
        title: "Interest Registered",
        description: "Your signal has been securely sent.",
      });
    },
    onError: () => {
      toast({
        title: "Slow Down",
        description: "You're sending too many signals. Please wait a moment.",
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

  if (authLoading || (!isOwnProfile && profileUserLoading)) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
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
    <div className="mobile-page-container relative bg-background">
      {/* Rich ambient bokeh */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="flex min-h-[100dvh]">
        <Sidebar />

        <main className="flex-1 pb-28 md:pb-8">
          <TopBar />

          <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 relative z-10">
            {/* Profile Header */}
            <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage
                      src={user.avatar || undefined}
                      alt={user.name}
                    />
                    <AvatarFallback className="bg-primary text-white text-2xl">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name" className="text-foreground">
                            Name
                          </Label>
                          <Input
                            id="name"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="bg-muted/30 border-white/10 text-foreground focus:border-primary"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bio" className="text-foreground">
                            Bio
                          </Label>
                          <Textarea
                            id="bio"
                            value={editForm.bio}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                bio: e.target.value,
                              }))
                            }
                            placeholder="Tell us about yourself..."
                            className="bg-muted/30 border-white/10 text-foreground min-h-[100px] focus:border-primary"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location" className="text-foreground">
                            Location
                          </Label>
                          <Input
                            id="location"
                            value={editForm.location}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                location: e.target.value,
                              }))
                            }
                            placeholder="Your city, state"
                            className="bg-muted/30 border-white/10 text-foreground focus:border-primary"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleSave}
                            disabled={updateProfileMutation.isPending}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {updateProfileMutation.isPending
                              ? "Saving..."
                              : "Save"}
                          </Button>
                          <Button
                            onClick={handleCancel}
                            variant="outline"
                            className="border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-1">
                          {user.name}
                        </h2>
                        <p className="text-muted-foreground mb-3 leading-relaxed">
                          {user.bio || "No bio available"}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground/80 mb-4 font-medium">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{user.location || "Location not set"}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>
                              Joined{" "}
                              {user.createdAt
                                ? format(new Date(user.createdAt), "MMMM yyyy")
                                : "Recently"}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && isOwnProfile && (
                    <Button
                      onClick={handleEditClick}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}

                  {!isOwnProfile && (
                    <div className="flex flex-col gap-2 mt-4 md:mt-0">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() =>
                            connectionSignalMutation.mutate("interested")
                          }
                          disabled={
                            connectionSignalMutation.isPending || signalCooldown
                          }
                          className="bg-primary hover:bg-primary/90 flex-1"
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          {signalCooldown ? "Sent" : "Interested"}
                        </Button>
                        <ReportBlockMenu
                          targetUserId={targetUserId!}
                          currentUserId={currentUser?.id}
                        />
                      </div>
                      <Button
                        onClick={() => connectionSignalMutation.mutate("save")}
                        variant="outline"
                        disabled={
                          connectionSignalMutation.isPending || signalCooldown
                        }
                        className="border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground flex-1 sm:flex-none"
                      >
                        <Bookmark className="h-4 w-4 mr-2" />
                        {signalCooldown ? "Saved" : "Save Profile"}
                      </Button>
                      {canConnectAfterEvent && (
                        <Button
                          onClick={() =>
                            connectionSignalMutation.mutate("connect_after")
                          }
                          variant="outline"
                          disabled={
                            connectionSignalMutation.isPending || signalCooldown
                          }
                          className="border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground w-full sm:w-auto"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {signalCooldown ? "Connected" : "Connect After Event"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {userStats.communities}
                  </div>
                  <div className="text-muted-foreground text-sm">Communities</div>
                </CardContent>
              </Card>
              <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-accent">
                    {userStats.events}
                  </div>
                  <div className="text-muted-foreground text-sm">Events Attended</div>
                </CardContent>
              </Card>
              <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-secondary">
                    {userStats.kudos}
                  </div>
                  <div className="text-muted-foreground text-sm">Kudos Received</div>
                </CardContent>
              </Card>
            </div>

            {/* Interests */}
            <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  My Interests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.interests && user.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest: string, index: number) => (
                      <Badge
                        key={interest}
                        variant="secondary"
                        className={
                          interestColors[index % interestColors.length]
                        }
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <InlineEmptyState
                    icon={<Heart className="w-5 h-5 text-gray-500" />}
                    title="No interests yet"
                    description="Complete your onboarding to add interests."
                  />
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {communitiesLoading || eventsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="border-l-4 border-white/10 pl-4 py-2">
                            <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-white/10 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {userCommunities.slice(0, 3).map((community: any) => (
                        <div
                          key={`community-${community.id}`}
                          className="border-l-4 border-primary pl-4 py-2"
                        >
                          <p className="font-medium text-foreground">
                            Joined {community.name}
                          </p>
                          <p className="text-muted-foreground/80 text-sm">Community</p>
                        </div>
                      ))}
                      {userEvents.slice(0, 3).map((event: any) => (
                        <div
                          key={`event-${event.id}`}
                          className="border-l-4 border-accent pl-4 py-2"
                        >
                          <p className="font-medium text-foreground">
                            Registered for {event.title}
                          </p>
                          <p className="text-muted-foreground/80 text-sm">Event</p>
                        </div>
                      ))}
                      {userKudos.slice(0, 2).map((kudos: any) => (
                        <div
                          key={`kudos-${kudos.id}`}
                          className="border-l-4 border-green-500 pl-4 py-2"
                        >
                          <p className="font-medium text-foreground">
                            Received kudos
                          </p>
                          <p className="text-muted-foreground/80 text-sm">
                            {kudos.message || "Thanks for being awesome!"}
                          </p>
                        </div>
                      ))}
                      {userCommunities.length === 0 &&
                        userEvents.length === 0 &&
                        userKudos.length === 0 && (
                          <InlineEmptyState
                            icon={
                              <Activity className="w-5 h-5 text-muted-foreground" />
                            }
                            title="No recent activity"
                            description="Join communities and attend events to see activity here."
                          />
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
