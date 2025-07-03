import { ScrapedEvent, CommunityMatchCriteria } from '../types/scraperTypes';
import { Community } from '@shared/schema';

export class CommunityMatcher {
  
  /**
   * Match scraped events to relevant communities based on criteria
   */
  matchEventsTocommunities(events: ScrapedEvent[], communities: Community[]): Array<{
    communityId: number;
    events: ScrapedEvent[];
    matchScores: number[];
  }> {
    const matches: Array<{
      communityId: number;
      events: ScrapedEvent[];
      matchScores: number[];
    }> = [];

    for (const community of communities) {
      const matchedEvents: ScrapedEvent[] = [];
      const matchScores: number[] = [];

      for (const event of events) {
        const score = this.calculateRelevanceScore(event, community);
        
        // Only include events with relevance score >= 0.7 (70%) - STRICTER MATCHING
        if (score >= 0.7) {
          matchedEvents.push(event);
          matchScores.push(score);
        }
      }

      if (matchedEvents.length > 0) {
        matches.push({
          communityId: community.id,
          events: matchedEvents,
          matchScores: matchScores
        });
      }
    }

    return matches;
  }

  /**
   * Calculate relevance score between event and community (0-1 scale)
   */
  private calculateRelevanceScore(event: ScrapedEvent, community: Community): number {
    let score = 0;
    let factors = 0;

    // 1. Category/Topic matching (40% weight)
    const categoryScore = this.calculateCategoryMatch(event, community);
    score += categoryScore * 0.4;
    factors++;

    // 2. Keyword matching in title/description (30% weight)
    const keywordScore = this.calculateKeywordMatch(event, community);
    score += keywordScore * 0.3;
    factors++;

    // 3. Community name relevance (20% weight)
    const nameScore = this.calculateNameMatch(event, community);
    score += nameScore * 0.2;
    factors++;

    // 4. Event source credibility (10% weight)
    const sourceScore = this.calculateSourceScore(event);
    score += sourceScore * 0.1;
    factors++;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private calculateCategoryMatch(event: ScrapedEvent, community: Community): number {
    const eventCategory = event.category.toLowerCase();
    const communityCategory = community.category.toLowerCase();
    const communityName = community.name.toLowerCase();

    // Direct category match
    if (eventCategory === communityCategory) {
      return 1.0;
    }

    // Category keywords matching
    const categoryKeywords = this.getCategoryKeywords(communityCategory);
    const eventKeywords = this.getCategoryKeywords(eventCategory);
    
    const intersection = categoryKeywords.filter(keyword => 
      eventKeywords.includes(keyword) || 
      communityName.includes(keyword) ||
      event.title.toLowerCase().includes(keyword)
    );

    return intersection.length / Math.max(categoryKeywords.length, 1);
  }

  private calculateKeywordMatch(event: ScrapedEvent, community: Community): number {
    const eventText = `${event.title} ${event.description}`.toLowerCase();
    const communityKeywords = this.extractKeywords(community.name + ' ' + community.description);
    
    let matches = 0;
    for (const keyword of communityKeywords) {
      if (eventText.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    return matches / Math.max(communityKeywords.length, 1);
  }

  private calculateNameMatch(event: ScrapedEvent, community: Community): number {
    const eventTitle = event.title.toLowerCase();
    const communityWords = community.name.toLowerCase().split(' ');
    
    let matches = 0;
    for (const word of communityWords) {
      if (word.length > 3 && eventTitle.includes(word)) {
        matches++;
      }
    }

    return matches / Math.max(communityWords.length, 1);
  }

  private calculateSourceScore(event: ScrapedEvent): number {
    // Score based on event source reliability
    const sourceScores = {
      'eventbrite': 0.9,
      'meetup': 0.95,
      'ticketmaster': 0.85,
      'seatgeek': 0.85,
      'bandsintown': 0.8,
      'reddit': 0.65,
      'google': 0.75,
      'facebook': 0.7,
      'instagram': 0.6,
      'local': 0.8
    };

    return sourceScores[event.source] || 0.5;
  }

  private getCategoryKeywords(category: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'technology': ['tech', 'software', 'programming', 'coding', 'developer', 'startup', 'innovation', 'ai', 'digital'],
      'fitness': ['fitness', 'workout', 'gym', 'health', 'wellness', 'exercise', 'yoga', 'running', 'sports'],
      'art': ['art', 'creative', 'design', 'music', 'painting', 'photography', 'theater', 'dance', 'culture'],
      'food': ['food', 'cooking', 'culinary', 'restaurant', 'dining', 'chef', 'recipe', 'wine', 'coffee'],
      'business': ['business', 'entrepreneur', 'startup', 'networking', 'professional', 'career', 'leadership', 'finance'],
      'education': ['education', 'learning', 'workshop', 'seminar', 'training', 'course', 'academic', 'study'],
      'social': ['social', 'community', 'networking', 'meetup', 'friends', 'connect', 'gathering', 'party'],
      'outdoors': ['outdoor', 'hiking', 'nature', 'adventure', 'camping', 'climbing', 'biking', 'trail'],
      'entertainment': ['entertainment', 'show', 'concert', 'comedy', 'movie', 'festival', 'performance', 'music'],
      'lifestyle': ['lifestyle', 'wellness', 'mindfulness', 'personal', 'growth', 'self-care', 'hobby']
    };

    return keywordMap[category.toLowerCase()] || [category];
  }

  private extractKeywords(text: string): string[] {
    // Extract meaningful keywords from community name/description
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    const words = text.toLowerCase().split(/\s+/).filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    
    return Array.from(new Set(words)); // Remove duplicates
  }

  /**
   * Filter events by geographic proximity (50-mile radius)
   */
  filterByLocation(events: ScrapedEvent[], userLocation: { lat: number, lon: number }, radiusMiles: number = 50): ScrapedEvent[] {
    return events.filter(event => {
      const eventDistance = this.calculateEventDistance(event, userLocation);
      
      // Only include events within the specified radius
      if (eventDistance <= radiusMiles) {
        return true;
      }
      
      // Also include events if location contains user's city/state
      const userLocationName = this.getLocationName(userLocation);
      const eventLocation = event.location.toLowerCase();
      
      return eventLocation.includes(userLocationName.toLowerCase());
    });
  }

  /**
   * Calculate distance between user and event location
   */
  private calculateEventDistance(event: ScrapedEvent, userLocation: { lat: number, lon: number }): number {
    // Extract coordinates from event location if possible
    const eventCoords = this.extractCoordinatesFromLocation(event.location);
    
    if (eventCoords) {
      return this.calculateDistance(userLocation, eventCoords);
    }
    
    // Fallback: estimate distance based on city matching
    const userCity = this.getLocationName(userLocation);
    const eventLocation = event.location.toLowerCase();
    
    if (eventLocation.includes(userCity.toLowerCase())) {
      return 0; // Same city
    }
    
    // Return a high value for unknown locations to exclude them
    return 100; // Miles
  }

  /**
   * Extract coordinates from location string
   */
  private extractCoordinatesFromLocation(location: string): { lat: number, lon: number } | null {
    // Major cities coordinate lookup
    const cityCoordinates: { [key: string]: { lat: number, lon: number } } = {
      'new york': { lat: 40.7128, lon: -74.0060 },
      'los angeles': { lat: 34.0522, lon: -118.2437 },
      'chicago': { lat: 41.8781, lon: -87.6298 },
      'houston': { lat: 29.7604, lon: -95.3698 },
      'phoenix': { lat: 33.4484, lon: -112.0740 },
      'san francisco': { lat: 37.7749, lon: -122.4194 },
      'seattle': { lat: 47.6062, lon: -122.3321 },
      'denver': { lat: 39.7392, lon: -104.9903 },
      'austin': { lat: 30.2672, lon: -97.7431 },
      'salt lake city': { lat: 40.7608, lon: -111.8910 },
      'portland': { lat: 45.5152, lon: -122.6784 },
      'atlanta': { lat: 33.7490, lon: -84.3880 },
      'miami': { lat: 25.7617, lon: -80.1918 },
      'boston': { lat: 42.3601, lon: -71.0589 },
      'washington': { lat: 38.9072, lon: -77.0369 }
    };
    
    const locationLower = location.toLowerCase();
    
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (locationLower.includes(city)) {
        return coords;
      }
    }
    
    return null;
  }

  /**
   * Calculate distance between two coordinates in miles
   */
  private calculateDistance(point1: { lat: number, lon: number }, point2: { lat: number, lon: number }): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lon - point1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getLocationName(location: { lat: number, lon: number }): string {
    const majorCities = [
      { name: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
      { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
      { name: 'Houston', lat: 29.7604, lon: -95.3698 },
      { name: 'Phoenix', lat: 33.4484, lon: -112.0740 },
      { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
      { name: 'Seattle', lat: 47.6062, lon: -122.3321 },
      { name: 'Denver', lat: 39.7392, lon: -104.9903 },
      { name: 'Austin', lat: 30.2672, lon: -97.7431 },
      { name: 'Salt Lake City', lat: 40.7608, lon: -111.8910 }
    ];
    
    let closestCity = 'Unknown Location';
    let minDistance = Infinity;
    
    for (const city of majorCities) {
      const distance = this.calculateDistance(location, city);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city.name;
      }
    }
    
    return closestCity;
  }

  /**
   * Remove duplicate events based on title and date
   */
  deduplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
    const seen = new Set<string>();
    const uniqueEvents: ScrapedEvent[] = [];

    for (const event of events) {
      const key = `${event.title.toLowerCase()}-${event.date.toDateString()}-${event.location.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(event);
      }
    }

    return uniqueEvents;
  }

  /**
   * Filter out past events
   */
  filterUpcomingEvents(events: ScrapedEvent[]): ScrapedEvent[] {
    const now = new Date();
    return events.filter(event => event.date > now);
  }
}