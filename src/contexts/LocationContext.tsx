import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Location from 'expo-location';

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
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      setError('Failed to request location permission');
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setError('Location permission denied');
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });

      const { latitude, longitude, accuracy, timestamp } = locationResult.coords;
      
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          setLocation({
            latitude,
            longitude,
            accuracy: accuracy || 0,
            timestamp,
            city: place.city || undefined,
            state: place.region || undefined,
            country: place.country || undefined,
          });
        } else {
          setLocation({
            latitude,
            longitude,
            accuracy: accuracy || 0,
            timestamp,
          });
        }
      } catch (reverseError) {
        setLocation({
          latitude,
          longitude,
          accuracy: accuracy || 0,
          timestamp,
        });
      }
    } catch (err) {
      setError('Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
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