import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Settings, Calendar, Users, Heart, Star, Trophy, ArrowLeft, Home, Compass, PlusSquare, MessageCircle, User as UserIcon, Edit } from "lucide-react";
import { Community, Event, User } from "@shared/schema";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { 
  MobileLayout, 
  MobileHeader, 
  MobileContent, 
  MobileBottomNav,
  MobileCard,
  MobileButton
} from "@/components/layout/mobile-layout";

export default function ProfileMobile() {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Determine which user profile to show
  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id?.toString();

  // Fetch user profile data
  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/users", profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      return response.json();
    }
  });

  // Fetch user's communities
  const { data: userCommunities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["/api/users", profileUserId, "communities"],
    enabled: !!profileUserId,
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileUserId}/communities`);
      if (!response.ok) throw new Error('Failed to fetch user communities');
      return response.json();
    }
  });

  // Fetch user's events
  const { data: userEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/users", profileUserId, "events"],
    enabled: !!profileUserId,
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileUserId}/events`);
      if (!response.ok) throw new Error('Failed to fetch user events');
      return response.json();
    }
  });

  // Fetch user's kudos/achievements
  const { data: userKudos, isLoading: kudosLoading } = useQuery({
    queryKey: ["/api/users", profileUserId, "kudos"],
    enabled: !!profileUserId,
    queryFn: async () => {
      const response = await fetch(`/api/users/${profileUserId}/kudos`);
      if (!response.ok) throw new Error('Failed to fetch user kudos');
      return response.json();
    }
  });

  if (authLoading || profileLoading) {
    return (
      <MobileLayout>
        <MobileContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </MobileContent>
      </MobileLayout>
    );
  }

  if (!profileUser) {
    return (
      <MobileLayout>
        <MobileContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Profile Not Found</h1>
            <p className="text-muted-foreground">This user profile doesn't exist.</p>
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

  const displayName = profileUser.name || 'Anonymous User';
  const userInitials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase();

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
            <h1 className="text-lg font-semibold truncate">
              {isOwnProfile ? 'Your Profile' : `${displayName.split(' ')[0]}'s Profile`}
            </h1>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{profileUser.location || 'Location not set'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isOwnProfile && (
            <MobileButton 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/settings/profile')}
            >
              <Edit className="w-4 h-4" />
            </MobileButton>
          )}
          <MobileButton variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </MobileButton>
        </div>
      </MobileHeader>

      {/* Mobile Content */}
      <MobileContent className="space-y-4">
        {/* Profile Header Card */}
        <MobileCard className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20 border-2 border-primary/20">
              <AvatarImage src={profileUser.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{displayName}</h2>
              {profileUser.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profileUser.bio}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>{userKudos?.totalKudos || 0} Kudos</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>{userCommunities?.length || 0} Communities</span>
                </div>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <MobileCard className="text-center p-4">
            <div className="text-2xl font-bold text-primary">{userEvents?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Events Joined</div>
          </MobileCard>
          <MobileCard className="text-center p-4">
            <div className="text-2xl font-bold text-primary">{userKudos?.monthlyKudos || 0}</div>
            <div className="text-xs text-muted-foreground">This Month</div>
          </MobileCard>
        </div>

        {/* Interests */}
        {profileUser.interests && profileUser.interests.length > 0 && (
          <MobileCard>
            <h3 className="text-lg font-semibold mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profileUser.interests.map((interest: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
          </MobileCard>
        )}

        {/* Communities */}
        <MobileCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Communities</h3>
            <Badge variant="outline">{userCommunities?.length || 0}</Badge>
          </div>
          
          {communitiesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse bg-muted h-16 rounded-lg" />
              ))}
            </div>
          ) : userCommunities?.length > 0 ? (
            <div className="space-y-3">
              {userCommunities.slice(0, 3).map((community: Community) => (
                <MobileCard 
                  key={community.id} 
                  clickable 
                  padding={false}
                  className="p-3"
                  onClick={() => setLocation(`/community/${community.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-sm">
                        {community.category === 'wellness' ? '🧘' : 
                         community.category === 'tech' ? '💻' : 
                         community.category === 'arts' ? '🎨' : 
                         community.category === 'fitness' ? '💪' : 
                         community.category === 'music' ? '🎵' : 
                         community.category === 'food' ? '🍽️' : 
                         community.category === 'outdoor' ? '🌲' : '👥'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{community.name}</h4>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{community.memberCount || 0} members</span>
                        <span>•</span>
                        <Badge variant="secondary" className="text-xs">
                          {community.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </MobileCard>
              ))}
              {userCommunities.length > 3 && (
                <div className="text-center">
                  <MobileButton variant="ghost" size="sm">
                    View all {userCommunities.length} communities
                  </MobileButton>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No communities yet</p>
            </div>
          )}
        </MobileCard>

        {/* Recent Events */}
        <MobileCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Recent Events</h3>
            <Badge variant="outline">{userEvents?.length || 0}</Badge>
          </div>
          
          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse bg-muted h-16 rounded-lg" />
              ))}
            </div>
          ) : userEvents?.length > 0 ? (
            <div className="space-y-3">
              {userEvents.slice(0, 3).map((event: Event) => (
                <MobileCard 
                  key={event.id} 
                  padding={false}
                  className="p-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </MobileCard>
              ))}
              {userEvents.length > 3 && (
                <div className="text-center">
                  <MobileButton variant="ghost" size="sm">
                    View all {userEvents.length} events
                  </MobileButton>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No events yet</p>
            </div>
          )}
        </MobileCard>

        {/* Achievements */}
        <MobileCard>
          <h3 className="text-lg font-semibold mb-3">Achievements</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-lg border border-yellow-500/20">
              <Trophy className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Community Builder</div>
              <div className="text-xs text-muted-foreground">Joined 5+ communities</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
              <Heart className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Super Supporter</div>
              <div className="text-xs text-muted-foreground">50+ Kudos given</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
              <Star className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Event Enthusiast</div>
              <div className="text-xs text-muted-foreground">Attended 10+ events</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
              <MessageCircle className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Conversation Starter</div>
              <div className="text-xs text-muted-foreground">100+ messages sent</div>
            </div>
          </div>
        </MobileCard>

        {/* Account Info (only for own profile) */}
        {isOwnProfile && (
          <MobileCard>
            <h3 className="text-lg font-semibold mb-3">Account</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Member since</span>
                <span>{profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleDateString() : 'Recently'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate">{profileUser.email}</span>
              </div>
              <div className="pt-2 border-t">
                <MobileButton 
                  variant="secondary" 
                  fullWidth
                  onClick={() => setLocation('/settings/profile')}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </MobileButton>
              </div>
            </div>
          </MobileCard>
        )}
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
          className="flex-col space-y-1 text-primary"
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </MobileButton>
      </MobileBottomNav>
    </MobileLayout>
  );
}