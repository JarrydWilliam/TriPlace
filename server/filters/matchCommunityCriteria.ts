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
        
        // Only include events with relevance score >= 0.5 (50%)
        if (score >= 0.5) {
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
      'facebook': 0.7,
      'local': 0.6
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
    
    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Filter events by geographic proximity
   */
  filterByLocation(events: ScrapedEvent[], userLocation: { lat: number, lon: number }, radiusKm: number = 40): ScrapedEvent[] {
    return events.filter(event => {
      // For now, use simple location string matching
      // In production, you'd use proper geocoding and distance calculation
      const eventLocation = event.location.toLowerCase();
      
      // Basic location filtering - this would be enhanced with actual geocoding
      return eventLocation.length > 0; // Basic validation
    });
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