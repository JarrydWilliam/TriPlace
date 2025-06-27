import { useState, useEffect } from "react";

export interface GeolocationData {
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

export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const getLocation = async () => {
      try {
        // Try GPS first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              if (!mounted) return;
              
              const locationData: GeolocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
                source: 'gps'
              };

              // Try to get location name from coordinates
              try {
                const response = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${locationData.latitude}&longitude=${locationData.longitude}&localityLanguage=en`
                );
                if (response.ok) {
                  const data = await response.json();
                  locationData.location = `${data.city || data.locality || 'Unknown'}, ${data.principalSubdivision || data.countryName || ''}`;
                  locationData.city = data.city || data.locality;
                  locationData.state = data.principalSubdivision;
                  locationData.zipCode = data.postcode;
                }
              } catch (reverseGeoError) {
                console.warn('Reverse geocoding failed:', reverseGeoError);
              }

              setLocation(locationData);
              setLoading(false);
            },
            async (gpsError) => {
              console.warn('GPS location failed:', gpsError);
              
              // Fallback to IP-based location
              try {
                const response = await fetch('https://ipapi.co/json/');
                if (response.ok) {
                  const data = await response.json();
                  if (data.latitude && data.longitude && mounted) {
                    const locationData: GeolocationData = {
                      latitude: parseFloat(data.latitude),
                      longitude: parseFloat(data.longitude),
                      accuracy: 10000, // IP location is less accurate
                      timestamp: Date.now(),
                      source: 'ip',
                      location: `${data.city || 'Unknown'}, ${data.region || data.country_name || ''}`,
                      city: data.city,
                      state: data.region,
                      zipCode: data.postal
                    };
                    setLocation(locationData);
                  }
                }
              } catch (ipError) {
                console.error('IP location also failed:', ipError);
                setError('Unable to determine location');
              }
              
              if (mounted) {
                setLoading(false);
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            }
          );
        } else {
          setError('Geolocation not supported');
          setLoading(false);
        }
      } catch (err) {
        console.error('Geolocation error:', err);
        setError('Location access failed');
        setLoading(false);
      }
    };

    getLocation();

    return () => {
      mounted = false;
    };
  }, []);

  return { location, loading, error };
}