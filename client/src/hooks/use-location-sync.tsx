import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  source: 'gps' | 'ip' | 'none';
  location?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export function useLocationSync(user: any, location: GeolocationData | null) {
  const updateLocationMutation = useMutation({
    mutationFn: async (locationData: GeolocationData) => {
      const response = await apiRequest('PATCH', '/api/users/current/location', {
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
        location: locationData.location || `${locationData.latitude}, ${locationData.longitude}`
      });
      return response.json();
    },
    onError: (error) => {
      console.warn('Failed to sync location:', error);
    }
  });

  useEffect(() => {
    if (user && location && !updateLocationMutation.isPending) {
      updateLocationMutation.mutate(location);
    }
  }, [user?.id, location?.latitude, location?.longitude]);

  return updateLocationMutation;
}