import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  source: 'gps' | 'ip' | null;
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    source: null,
  });

  useEffect(() => {
    let hasGPSAttempted = false;

    // Step 1: Try high-accuracy GPS first (mobile-optimized)
    const tryGPSLocation = () => {
      if (!navigator.geolocation) {
        tryIPLocation();
        return;
      }

      hasGPSAttempted = true;
      
      const handleSuccess = (position: GeolocationPosition) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          source: 'gps',
        });
      };

      const handleError = (error: GeolocationPositionError) => {
        console.log('GPS failed, trying IP fallback:', error.message);
        tryIPLocation();
      };

      // Mobile-optimized GPS settings
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000, // Give more time for mobile GPS
        maximumAge: 300000, // Cache for 5 minutes
      });
    };

    // Step 2: IP-based fallback for reliability
    const tryIPLocation = async () => {
      try {
        // Use ipapi.co for IP-based geolocation
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            error: hasGPSAttempted ? 'Using approximate location based on IP address' : null,
            loading: false,
            source: 'ip',
          });
        } else {
          throw new Error('IP location service unavailable');
        }
      } catch (ipError) {
        setLocation(prev => ({
          ...prev,
          error: 'Location services unavailable. Please enable location access for better recommendations.',
          loading: false,
        }));
      }
    };

    // Start with GPS, fallback to IP if needed
    tryGPSLocation();
  }, []);

  return location;
}