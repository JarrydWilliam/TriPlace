import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityFeedItem, User } from "@shared/schema";
import { Heart, MessageCircle, Calendar, Users as UsersIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItemProps {
  activity: ActivityFeedItem;
  onLike?: () => void;
  onComment?: () => void;
}

function ActivityItem({ activity, onLike, onComment }: ActivityItemProps) {
  const getActivityContent = () => {
    switch (activity.type) {
      case 'kudos_received':
        return {
          icon: <Heart className="h-4 w-4 text-accent" />,
          title: `Received kudos from ${activity.content.giverName || 'Someone'}`,
          description: activity.content.message || 'Thanks for being awesome!',
          color: 'border-accent/20'
        };
      case 'event_joined':
        return {
          icon: <Calendar className="h-4 w-4 text-blue-400" />,
          title: `Joined ${activity.content.eventName || 'an event'}`,
          description: activity.content.eventDescription || 'Looking forward to this event!',
          color: 'border-blue-400/20'
        };
      case 'community_joined':
        return {
          icon: <UsersIcon className="h-4 w-4 text-green-400" />,
          title: `Joined ${activity.content.communityName || 'a community'}`,
          description: activity.content.communityDescription || 'Excited to be part of this community!',
          color: 'border-green-400/20'
        };
      default:
        return {
          icon: <Heart className="h-4 w-4 text-gray-400" />,
          title: 'Activity',
          description: 'Something happened',
          color: 'border-gray-400/20'
        };
    }
  };

  const content = getActivityContent();
  const timeAgo = formatDistanceToNow(new Date(activity.createdAt!), { addSuffix: true });

  return (
    <div className={`flex space-x-3 p-4 bg-gray-700 dark:bg-gray-700 rounded-xl border-l-4 ${content.color}`}>
      <div className="flex-shrink-0">
        {content.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <span className="font-semibold text-white dark:text-white">{content.title}</span>
          <span className="text-gray-500 dark:text-gray-500 text-sm">{timeAgo}</span>
        </div>
        <p className="text-gray-300 dark:text-gray-300 text-sm mb-2">{content.description}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-400 dark:text-gray-400">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className="hover:text-accent dark:hover:text-accent p-0 h-auto"
          >
            <Heart className="h-4 w-4 mr-1" />
            <span>12</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onComment}
            className="hover:text-primary dark:hover:text-primary p-0 h-auto"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            <span>3</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ActivityFeedProps {
  activities: ActivityFeedItem[];
  loading?: boolean;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-white dark:text-white">Community Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex space-x-3 p-4 bg-gray-700 dark:bg-gray-700 rounded-xl">
                  <div className="w-4 h-4 bg-gray-600 dark:bg-gray-600 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-600 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-600 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl text-white dark:text-white">Community Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-gray-500 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 dark:text-gray-400">No recent activity</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                Join communities and attend events to see activity here
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onLike={() => console.log('Like activity', activity.id)}
                onComment={() => console.log('Comment on activity', activity.id)}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
