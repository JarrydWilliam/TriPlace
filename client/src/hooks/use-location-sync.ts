import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export function useLocationSync() {
  const { user } = useAuth();
  const { latitude, longitude, locationName } = useGeolocation();

  useEffect(() => {
    if (user?.id && latitude && longitude) {
      const syncLocation = async () => {
        try {
          await apiRequest("PUT", `/api/users/${user.id}/location`, {
            latitude,
            longitude,
            locationName
          });
        } catch (error) {
          console.log('Failed to sync location:', error);
        }
      };

      syncLocation();
    }
  }, [user?.id, latitude, longitude, locationName]);
}