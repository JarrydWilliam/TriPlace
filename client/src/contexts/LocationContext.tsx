import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  city?: string;
  state?: string;
  country?: string;
}

interface LocationContextType {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state !== 'denied';
    } catch (error) {
      console.error('Permission check error:', error);
      return true; // Assume permission is available
    }
  };

  const getCurrentLocation = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          }
        );
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      };

      // Reverse geocoding would happen here in a real implementation
      // For now, we'll set basic location data
      setLocation(locationData);
    } catch (error: any) {
      let errorMessage = 'Failed to get location';
      
      if (error.code === 1) {
        errorMessage = 'Location access denied';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable';
      } else if (error.code === 3) {
        errorMessage = 'Location request timeout';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-request location on mount
    requestPermission().then((hasPermission) => {
      if (hasPermission) {
        getCurrentLocation();
      }
    });
  }, []);

  return (
    <LocationContext.Provider value={{
      location,
      loading,
      error,
      requestPermission,
      getCurrentLocation,
    }}>
      {children}
    </LocationContext.Provider>
  );
}