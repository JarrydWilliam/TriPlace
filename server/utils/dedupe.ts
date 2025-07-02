import { ScrapedEvent } from '../types/scraperTypes';

export class DeduplicationUtils {
  
  /**
   * Remove duplicate events using multiple criteria
   */
  static deduplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
    const uniqueEvents: ScrapedEvent[] = [];
    const seenEvents = new Set<string>();

    for (const event of events) {
      const signature = this.generateEventSignature(event);
      
      if (!seenEvents.has(signature)) {
        seenEvents.add(signature);
        uniqueEvents.push(event);
      }
    }

    return uniqueEvents;
  }

  /**
   * Generate a unique signature for an event
   */
  private static generateEventSignature(event: ScrapedEvent): string {
    // Normalize title
    const normalizedTitle = event.title.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Normalize location
    const normalizedLocation = event.location.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Use date string for consistency
    const dateString = event.date.toISOString().split('T')[0]; // YYYY-MM-DD format

    return `${normalizedTitle}-${normalizedLocation}-${dateString}`;
  }

  /**
   * Find similar events and merge them
   */
  static mergeSimilarEvents(events: ScrapedEvent[]): ScrapedEvent[] {
    const mergedEvents: ScrapedEvent[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < events.length; i++) {
      if (processed.has(i)) continue;

      const currentEvent = events[i];
      const similarEvents = [currentEvent];
      processed.add(i);

      // Find similar events
      for (let j = i + 1; j < events.length; j++) {
        if (processed.has(j)) continue;

        const otherEvent = events[j];
        if (this.areEventsSimilar(currentEvent, otherEvent)) {
          similarEvents.push(otherEvent);
          processed.add(j);
        }
      }

      // Merge similar events into one
      const mergedEvent = this.mergeEvents(similarEvents);
      mergedEvents.push(mergedEvent);
    }

    return mergedEvents;
  }

  /**
   * Check if two events are similar enough to be considered duplicates
   */
  private static areEventsSimilar(event1: ScrapedEvent, event2: ScrapedEvent): boolean {
    // Check title similarity
    const titleSimilarity = this.calculateStringSimilarity(
      event1.title.toLowerCase(), 
      event2.title.toLowerCase()
    );

    // Check date proximity (same day)
    const dateDiff = Math.abs(event1.date.getTime() - event2.date.getTime());
    const sameDay = dateDiff < 24 * 60 * 60 * 1000; // 24 hours

    // Check location similarity
    const locationSimilarity = this.calculateStringSimilarity(
      event1.location.toLowerCase(),
      event2.location.toLowerCase()
    );

    return titleSimilarity > 0.8 && sameDay && locationSimilarity > 0.6;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i] + 1,     // deletion
            matrix[j][i - 1] + 1,     // insertion
            matrix[j - 1][i - 1] + 1  // substitution
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Merge multiple similar events into one comprehensive event
   */
  private static mergeEvents(events: ScrapedEvent[]): ScrapedEvent {
    if (events.length === 1) return events[0];

    // Use the first event as base
    const baseEvent = events[0];
    
    // Merge data from all events
    const mergedEvent: ScrapedEvent = {
      ...baseEvent,
      // Use the longest/most descriptive title
      title: events.reduce((longest, event) => 
        event.title.length > longest.length ? event.title : longest, baseEvent.title
      ),
      // Use the longest description
      description: events.reduce((longest, event) => 
        event.description.length > longest.length ? event.description : longest, baseEvent.description
      ),
      // Use the earliest date
      date: events.reduce((earliest, event) => 
        event.date < earliest ? event.date : earliest, baseEvent.date
      ),
      // Prefer paid events over free ones for price
      price: events.find(event => event.price && event.price > 0)?.price || baseEvent.price,
      // Sum attendee counts if available
      attendeeCount: events.reduce((sum, event) => 
        sum + (event.attendeeCount || 0), 0) || null,
      // Combine source URLs
      sourceUrl: baseEvent.sourceUrl, // Keep primary source
      // Prefer most credible organizer
      organizerName: events.find(event => 
        event.source === 'meetup' || event.source === 'eventbrite'
      )?.organizerName || baseEvent.organizerName
    };

    return mergedEvent;
  }
}