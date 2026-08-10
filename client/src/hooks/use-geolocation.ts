import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { getApiUrl } from '@/lib/queryClient';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  source: 'gps' | 'ip' | null;
  locationName: string | null;
}

export function useGeolocation(userId?: number, enabled = true) {
  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: enabled,
    source: null,
    locationName: null,
  });

  const [trigger, setTrigger] = useState(0);

  const refresh = () => setTrigger(prev => prev + 1);

  // Helper to fire backend web scrapers for current location on demand
  const triggerAutoScrape = async (lat: number, lon: number) => {
    try {
      await fetch(getApiUrl('/api/events/auto-scrape'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
    } catch (err) {
      console.error('[Geolocation] Auto-scrape trigger error:', err);
    }
  };

  useEffect(() => {
    if (!enabled && trigger === 0) {
      setLocation(prev => ({ ...prev, loading: false }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true }));
    let hasGPSAttempted = false;

    // Step 1: Try high-accuracy GPS first (instant, maximumAge: 0)
    const tryGPSLocation = async () => {
      hasGPSAttempted = true;
      
      const handleSuccess = async (lat: number, lon: number) => {
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
        });

        // Update user location in backend for dynamic community matching
        if (userId) {
          try {
            await fetch(getApiUrl('/api/users/current/location'), {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                latitude: lat,
                longitude: lon,
                location: locationName
              })
            });
          } catch (error) {
            console.error('Error updating user location:', error);
          }
        }

        // Instantly trigger web scrapers for user's location on app open/location detect
        void triggerAutoScrape(lat, lon);
      };

      const handleError = () => {
        tryIPLocation();
      };

      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.requestPermissions();
          if (perm.location !== 'granted') {
            handleError();
            return;
          }
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0, // Instant real-time GPS position (no stale cache)
          });
          await handleSuccess(position.coords.latitude, position.coords.longitude);
        } else {
          if (!navigator.geolocation) {
            tryIPLocation();
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => handleSuccess(pos.coords.latitude, pos.coords.longitude),
            handleError,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0, // Instant real-time GPS position (no stale cache)
            }
          );
        }
      } catch (err) {
        handleError();
      }
    };

    // Step 2: IP-based fallback for reliability
    const tryIPLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
          const locationName = `${data.city}, ${data.region}` || 'IP Location';
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            error: hasGPSAttempted ? 'Using approximate location based on IP address' : null,
            loading: false,
            source: 'ip',
            locationName,
          });

          if (userId) {
            try {
              await fetch(getApiUrl('/api/users/current/location'), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: userId,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  location: locationName
                })
              });
            } catch (error) {
              console.error('Error updating IP location:', error);
            }
          }

          // Trigger scrapers for IP location
          void triggerAutoScrape(data.latitude, data.longitude);
        } else {
          throw new Error('IP location service unavailable');
        }
      } catch (ipError) {
        setLocation(prev => ({
          ...prev,
          error: 'Location services unavailable. Please enable location access for better recommendations.',
          loading: false,
          locationName: null,
        }));
      }
    };

    // Initial instant location fetch + scraper trigger on app load
    tryGPSLocation();

    // 5-minute recurring interval timer to update location & trigger web scrapers continuously while app is open
    const INTERVAL_5_MINS = 5 * 60 * 1000;
    const intervalId = setInterval(() => {
      tryGPSLocation();
    }, INTERVAL_5_MINS);

    return () => clearInterval(intervalId);
  }, [userId, trigger]);

  return { ...location, refresh };
}