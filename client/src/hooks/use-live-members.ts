import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './use-websocket';
import { useAuth } from './use-auth';
import { useEffect, useState } from 'react';

interface LiveMemberData {
  communityId: number;
  liveCount: number;
}

export function useLiveMembers(communityIds: number[]) {
  const { user } = useAuth();
  const { isConnected, memberUpdates } = useWebSocket();
  const [liveCounts, setLiveCounts] = useState<Map<number, number>>(new Map());

  // Fetch initial live member counts for all communities
  const { data: liveData, refetch } = useQuery({
    queryKey: ['/api/communities/live-counts'],
    queryFn: async () => {
      const results = await Promise.all(
        communityIds.map(async (id) => {
          const response = await fetch(`/api/communities/${id}/members/live`);
          const data = await response.json();
          return { communityId: id, liveCount: data.totalLive || 0 };
        })
      );
      return results;
    },
    enabled: communityIds.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update live counts from API data
  useEffect(() => {
    if (liveData) {
      const newCounts = new Map<number, number>();
      liveData.forEach(({ communityId, liveCount }) => {
        newCounts.set(communityId, liveCount);
      });
      setLiveCounts(newCounts);
    }
  }, [liveData]);

  // Update activity when user comes online
  useEffect(() => {
    if (user && isConnected) {
      // Send heartbeat to update user activity
      fetch(`/api/users/${user.id}/activity`, { method: 'POST' });
    }
  }, [user, isConnected]);

  return {
    getLiveCount: (communityId: number) => liveCounts.get(communityId) || 0,
    refetchLiveCounts: refetch,
    isConnected
  };
}