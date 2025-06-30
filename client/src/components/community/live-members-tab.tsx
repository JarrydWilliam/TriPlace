import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, Clock } from 'lucide-react';

interface LiveMember {
  id: number;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastActiveAt: Date;
}

interface LiveMembersResponse {
  online: LiveMember[];
  offline: LiveMember[];
  totalLive: number;
}

interface LiveMembersTabProps {
  communityId: number;
}

export function LiveMembersTab({ communityId }: LiveMembersTabProps) {
  const { memberUpdates } = useWebSocket();
  
  const { data: membersData, isLoading, error, refetch } = useQuery<LiveMembersResponse>({
    queryKey: ['/api/communities', communityId, 'members', 'live'],
    queryFn: async () => {
      console.log('Fetching live members for community:', communityId);
      const response = await fetch(`/api/communities/${communityId}/members/live`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch live members:', response.status, errorText);
        throw new Error(`Failed to fetch live members: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log('Live members data received:', data);
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
    // Don't treat empty member lists as errors
    retryOnMount: false,
  });

  // Apply real-time updates from WebSocket
  const updatedMembers = membersData ? {
    ...membersData,
    online: membersData.online.map(member => ({
      ...member,
      isOnline: memberUpdates.has(member.id) ? memberUpdates.get(member.id)! : member.isOnline
    })).filter(member => member.isOnline),
    offline: [
      ...membersData.offline.map(member => ({
        ...member,
        isOnline: memberUpdates.has(member.id) ? memberUpdates.get(member.id)! : member.isOnline
      })).filter(member => !member.isOnline),
      ...membersData.online.map(member => ({
        ...member,
        isOnline: memberUpdates.has(member.id) ? memberUpdates.get(member.id)! : member.isOnline
      })).filter(member => !member.isOnline)
    ]
  } : null;

  const formatLastSeen = (lastActiveAt: Date) => {
    try {
      const now = new Date();
      const lastActive = new Date(lastActiveAt);
      const diffInMinutes = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="responsive-padding space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Loading live members...</p>
        </div>
      </div>
    );
  }

  // Only show error for actual network/database errors, not empty member lists
  if (error && !membersData) {
    return (
      <div className="responsive-padding space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="font-semibold text-lg mb-2 text-red-600 dark:text-red-400">Error Loading Members</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'Failed to load community members'}
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const onlineMembers = updatedMembers?.online || [];
  const offlineMembers = updatedMembers?.offline || [];
  const totalMembers = (updatedMembers?.online?.length || 0) + (updatedMembers?.offline?.length || 0);

  return (
    <div className="responsive-padding space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Live Member Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="font-medium text-gray-900 dark:text-white">
            {onlineMembers.length} Online
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Users className="w-4 h-4" />
        </Button>
      </div>

      {/* Online Members */}
      {onlineMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Online Members</span>
          </h3>
          <div className="space-y-3">
            {onlineMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">🟢 Online</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Members */}
      {offlineMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span>Offline Members</span>
          </h3>
          <div className="space-y-3">
            {offlineMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10 opacity-75">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white text-sm">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 border-2 border-white dark:border-gray-800 rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Last active: {formatLastSeen(member.lastActiveAt)}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalMembers === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
            <Users className="w-10 h-10 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-gray-300">No Members Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            This community is waiting for its first members to join!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Members will appear here once they join the community
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/20"
            >
              <Users className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}