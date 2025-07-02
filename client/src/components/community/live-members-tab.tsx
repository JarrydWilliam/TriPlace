import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
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
  const { user } = useAuth();
  
  const { data: membersData, isLoading, refetch } = useQuery<LiveMembersResponse>({
    queryKey: ['/api/communities', communityId, 'members', 'live', user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) {
        params.append('userId', user.id.toString());
      }
      const response = await fetch(`/api/communities/${communityId}/members/live?${params}`);
      if (!response.ok) throw new Error('Failed to fetch live members');
      return response.json();
    },
    enabled: !!communityId && !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
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
          <div className="animate-pulse mx-auto mb-3 flex justify-center">
            <Logo size="md" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Loading live members...</p>
        </div>
      </div>
    );
  }

  const onlineMembers = updatedMembers?.online || [];
  const offlineMembers = updatedMembers?.offline || [];

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
      {onlineMembers.length === 0 && offlineMembers.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No members found in this community</p>
          <p className="text-sm mt-1">Members will appear here when they join</p>
        </div>
      )}
    </div>
  );
}