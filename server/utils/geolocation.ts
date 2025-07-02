export interface Coordinates {
  lat: number;
  lon: number;
}

export class GeolocationUtils {
  
  /**
   * Calculate distance between two coordinates in kilometers
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(coord2.lat - coord1.lat);
    const dLon = this.degreesToRadians(coord2.lon - coord1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degreesToRadians(coord1.lat)) * 
              Math.cos(this.degreesToRadians(coord2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert miles to kilometers
   */
  static milesToKm(miles: number): number {
    return miles * 1.60934;
  }

  /**
   * Convert kilometers to miles
   */
  static kmToMiles(km: number): number {
    return km * 0.621371;
  }

  /**
   * Parse location string to extract potential coordinates or city info
   */
  static parseLocationString(locationStr: string): {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: Coordinates;
  } {
    const parts = locationStr.split(',').map(part => part.trim());
    
    // Basic parsing - in production, you'd use a geocoding service
    return {
      city: parts[0] || undefined,
      state: parts[1] || undefined,
      country: parts[2] || undefined
    };
  }

  /**
   * Get approximate coordinates for major cities (fallback data)
   */
  static getCityCoordinates(cityName: string): Coordinates | null {
    const cityCoords: { [key: string]: Coordinates } = {
      'new york': { lat: 40.7128, lon: -74.0060 },
      'los angeles': { lat: 34.0522, lon: -118.2437 },
      'chicago': { lat: 41.8781, lon: -87.6298 },
      'houston': { lat: 29.7604, lon: -95.3698 },
      'phoenix': { lat: 33.4484, lon: -112.0740 },
      'philadelphia': { lat: 39.9526, lon: -75.1652 },
      'san antonio': { lat: 29.4241, lon: -98.4936 },
      'san diego': { lat: 32.7157, lon: -117.1611 },
      'dallas': { lat: 32.7767, lon: -96.7970 },
      'san jose': { lat: 37.3382, lon: -121.8863 },
      'austin': { lat: 30.2672, lon: -97.7431 },
      'jacksonville': { lat: 30.3322, lon: -81.6557 },
      'san francisco': { lat: 37.7749, lon: -122.4194 },
      'columbus': { lat: 39.9612, lon: -82.9988 },
      'indianapolis': { lat: 39.7684, lon: -86.1581 },
      'fort worth': { lat: 32.7555, lon: -97.3308 },
      'charlotte': { lat: 35.2271, lon: -80.8431 },
      'seattle': { lat: 47.6062, lon: -122.3321 },
      'denver': { lat: 39.7392, lon: -104.9903 },
      'washington': { lat: 38.9072, lon: -77.0369 },
      'boston': { lat: 42.3601, lon: -71.0589 },
      'el paso': { lat: 31.7619, lon: -106.4850 },
      'detroit': { lat: 42.3314, lon: -83.0458 },
      'nashville': { lat: 36.1627, lon: -86.7816 },
      'memphis': { lat: 35.1495, lon: -90.0490 },
      'portland': { lat: 45.5152, lon: -122.6784 },
      'oklahoma city': { lat: 35.4676, lon: -97.5164 },
      'las vegas': { lat: 36.1699, lon: -115.1398 },
      'louisville': { lat: 38.2527, lon: -85.7585 },
      'baltimore': { lat: 39.2904, lon: -76.6122 },
      'milwaukee': { lat: 43.0389, lon: -87.9065 },
      'albuquerque': { lat: 35.0844, lon: -106.6504 },
      'tucson': { lat: 32.2226, lon: -110.9747 },
      'fresno': { lat: 36.7378, lon: -119.7871 },
      'sacramento': { lat: 38.5816, lon: -121.4944 },
      'mesa': { lat: 33.4152, lon: -111.8315 },
      'kansas city': { lat: 39.0997, lon: -94.5786 },
      'atlanta': { lat: 33.7490, lon: -84.3880 },
      'long beach': { lat: 33.7701, lon: -118.1937 },
      'colorado springs': { lat: 38.8339, lon: -104.8214 },
      'raleigh': { lat: 35.7796, lon: -78.6382 },
      'omaha': { lat: 41.2565, lon: -95.9345 },
      'miami': { lat: 25.7617, lon: -80.1918 },
      'virginia beach': { lat: 36.8529, lon: -76.0142 },
      'oakland': { lat: 37.8044, lon: -122.2711 },
      'minneapolis': { lat: 44.9778, lon: -93.2650 },
      'tulsa': { lat: 36.1540, lon: -95.9928 },
      'arlington': { lat: 32.7357, lon: -97.1081 },
      'new orleans': { lat: 29.9511, lon: -90.0715 },
      'wichita': { lat: 37.6872, lon: -97.3301 },
      'cleveland': { lat: 41.4993, lon: -81.6944 },
      'tampa': { lat: 27.9506, lon: -82.4572 },
      'bakersfield': { lat: 35.3733, lon: -119.0187 },
      'aurora': { lat: 39.7294, lon: -104.8319 },
      'anaheim': { lat: 33.8366, lon: -117.9143 },
      'honolulu': { lat: 21.3099, lon: -157.8581 },
      'santa ana': { lat: 33.7455, lon: -117.8677 },
      'corpus christi': { lat: 27.8006, lon: -97.3964 },
      'riverside': { lat: 33.9533, lon: -117.3962 },
      'lexington': { lat: 38.0406, lon: -84.5037 },
      'stockton': { lat: 37.9577, lon: -121.2908 },
      'henderson': { lat: 36.0395, lon: -114.9817 },
      'saint paul': { lat: 44.9537, lon: -93.0900 },
      'st. louis': { lat: 38.6270, lon: -90.1994 },
      'cincinnati': { lat: 39.1031, lon: -84.5120 },
      'pittsburgh': { lat: 40.4406, lon: -79.9959 }
    };

    const normalizedCity = cityName.toLowerCase().trim();
    return cityCoords[normalizedCity] || null;
  }

  /**
   * Check if coordinates are within a radius of a center point
   */
  static isWithinRadius(center: Coordinates, point: Coordinates, radiusKm: number): boolean {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusKm;
  }
}