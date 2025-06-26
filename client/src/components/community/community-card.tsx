import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Community } from "@shared/schema";
import { Users, MapPin } from "lucide-react";

interface CommunityCardProps {
  community: Community;
  onJoin?: () => void;
  onView?: () => void;
  isMember?: boolean;
  loading?: boolean;
}

export function CommunityCard({ 
  community, 
  onJoin, 
  onView, 
  isMember = false, 
  loading = false 
}: CommunityCardProps) {
  const getActivityBadge = (memberCount: number) => {
    if (memberCount > 1000) return { label: "Very Active", variant: "default" as const, color: "bg-accent/20 text-accent" };
    if (memberCount > 100) return { label: "Active", variant: "secondary" as const, color: "bg-green-500/20 text-green-400" };
    return { label: "Growing", variant: "outline" as const, color: "bg-blue-500/20 text-blue-400" };
  };

  const activityBadge = getActivityBadge(community.memberCount || 0);

  return (
    <Card 
      className="bg-gray-700 border-gray-600 hover:bg-gray-650 transition-colors cursor-pointer dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-650"
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-12 h-12 rounded-xl">
            <AvatarImage src={community.image || undefined} alt={community.name} />
            <AvatarFallback className="bg-primary text-white rounded-xl">
              {community.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white dark:text-white mb-1 truncate">
              {community.name}
            </h4>
            <p className="text-gray-400 dark:text-gray-400 text-sm mb-2 line-clamp-2">
              {community.description}
            </p>
            
            <div className="flex items-center justify-between text-sm mb-3">
              <div className="flex items-center text-gray-500 dark:text-gray-500">
                <Users className="h-4 w-4 mr-1" />
                <span>{community.memberCount || 0} members</span>
              </div>
              
              {community.location && (
                <div className="flex items-center text-gray-500 dark:text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="truncate">{community.location}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <Badge 
                variant={activityBadge.variant}
                className={activityBadge.color}
              >
                {activityBadge.label}
              </Badge>
              
              {onJoin && (
                <Button
                  size="sm"
                  variant={isMember ? "outline" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoin();
                  }}
                  disabled={loading}
                  className={isMember 
                    ? "border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white" 
                    : "bg-primary hover:bg-primary/90"
                  }
                >
                  {loading ? "..." : (isMember ? "Joined" : "Join")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
