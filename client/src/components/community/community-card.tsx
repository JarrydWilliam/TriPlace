import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Community } from "@shared/schema";
import { Users, MapPin, MessageCircle, Calendar } from "lucide-react";

interface CommunityCardProps {
  community: Community;
  onJoin?: () => void;
  onView?: () => void;
  isMember?: boolean;
  loading?: boolean;
  hasNewActivity?: boolean;
  nearbyUserCount?: number;
}

export function CommunityCard({ 
  community, 
  onJoin, 
  onView, 
  isMember = false, 
  loading = false,
  hasNewActivity = false,
  nearbyUserCount = 0
}: CommunityCardProps) {
  // Get emoji based on community category
  const getCommunityEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'wellness': '🧘',
      'tech': '💻',
      'fitness': '🏃',
      'arts': '🎨',
      'music': '🎵',
      'food': '🍕',
      'outdoor': '🏔️',
      'gaming': '🎮',
      'business': '💼',
      'social': '🎉',
      'education': '📚',
      'sports': '⚽'
    };
    return emojiMap[category] || '🌟';
  };

  const communityEmoji = getCommunityEmoji(community.category);

  return (
    <Card 
      className="relative bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-lg"
      onClick={onView}
    >
      {/* Activity Badge */}
      {hasNewActivity && (
        <div className="absolute -top-1 -right-1 z-10">
          <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 flex items-center gap-1 animate-pulse">
            <MessageCircle className="h-3 w-3" />
            New!
          </div>
        </div>
      )}

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with Emoji and Title */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{communityEmoji}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-sm mb-1 truncate">
                  {community.name}
                </h4>
                <p className="text-gray-400 text-xs line-clamp-1">
                  {community.description}
                </p>
              </div>
            </div>
          </div>

          {/* Nearby Users Avatars */}
          {nearbyUserCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, nearbyUserCount))].map((_, i) => (
                  <Avatar key={i} className="w-6 h-6 border-2 border-gray-800">
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {String.fromCharCode(65 + i)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {nearbyUserCount} nearby
              </span>
            </div>
          )}

          {/* Metadata Row */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{community.memberCount || 0}</span>
              </div>
              {community.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-20">{community.location}</span>
                </div>
              )}
            </div>
            
            {/* Activity Status */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400">Active</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            {onJoin ? (
              <Button
                size="sm"
                variant={isMember ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin();
                }}
                disabled={loading}
                className={`w-full text-xs ${
                  isMember 
                    ? "border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white" 
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {loading ? "..." : (isMember ? "Joined" : "Join")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs text-gray-400 hover:text-white hover:bg-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                Open
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
