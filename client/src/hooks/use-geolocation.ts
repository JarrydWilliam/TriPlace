import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  source: 'gps' | 'ip' | null;
  locationName: string | null;
  warning?: string | null;
}

export function useGeolocation(userId?: number, onError?: (error: string) => void) {
  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    source: null,
    locationName: null,
    warning: null,
  });

  useEffect(() => {
    let hasGPSAttempted = false;

    // Step 1: Try high-accuracy GPS first (mobile-optimized)
    const tryGPSLocation = () => {
      if (!navigator.geolocation) {
        tryIPLocation('Geolocation not supported by browser');
        return;
      }

      hasGPSAttempted = true;
      
      const handleSuccess = async (position: GeolocationPosition) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Try to get human-readable address
        let locationName = 'GPS Location';
        try {
          const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          const data = await response.json();
          if (data.city && data.principalSubdivision && data.postcode) {
            locationName = `${data.city}, ${data.principalSubdivision}, ${data.postcode}`;
          } else if (data.locality && data.principalSubdivision) {
            locationName = `${data.locality}, ${data.principalSubdivision}`;
          }
        } catch (error) {
          // Use coordinates if reverse geocoding fails
        }
        
        setLocation({
          latitude: lat,
          longitude: lon,
          error: null,
          loading: false,
          source: 'gps',
          locationName,
          warning: null,
        });

        // Update user location in backend for dynamic community matching
        if (userId) {
          try {
            const response = await fetch('/api/users/current/location', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                latitude: lat,
                longitude: lon,
                location: locationName
              })
            });
            if (!response.ok) {
              console.error('Failed to update user location:', response.status);
            } else {
              console.log('Location updated successfully for user:', userId);
            }
          } catch (error) {
            console.error('Error updating user location:', error);
          }
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        let errorMsg = 'Location access denied. Using approximate location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access denied by user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        tryIPLocation(errorMsg);
      };

      // Mobile-optimized GPS settings
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000, // Give more time for mobile GPS
        maximumAge: 300000, // Cache for 5 minutes
      });
    };

    // Step 2: IP-based fallback for reliability
    const tryIPLocation = async (gpsErrorMsg?: string) => {
      try {
        // Use ipapi.co for IP-based geolocation
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
          const locationName = `${data.city}, ${data.region}` || 'IP Location';
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            error: null,
            loading: false,
            source: 'ip',
            locationName,
            warning: gpsErrorMsg || 'Using approximate location based on IP address',
          });

          // Update user location in backend for IP-based location
          if (userId) {
            try {
              const response = await fetch('/api/users/current/location', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: userId,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  location: locationName
                })
              });
              if (!response.ok) {
                console.error('Failed to update IP location:', response.status);
              } else {
                console.log('IP location updated successfully for user:', userId);
              }
            } catch (error) {
              console.error('Error updating IP location:', error);
            }
          }
        } else {
          throw new Error('IP location service unavailable');
        }
      } catch (ipError) {
        setLocation((prev: GeolocationState) => ({
          ...prev,
          error: 'Location services unavailable. Please enable location access for better recommendations.',
          loading: false,
          locationName: null,
          warning: null,
        }));
        if (onError) onError('Location services unavailable. Please enable location access.');
      }
    };

    // Start with GPS, fallback to IP if needed
    tryGPSLocation();
  }, []);

  return location;
}