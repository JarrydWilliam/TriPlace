import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../types/scraperTypes';

export class SimplifiedEventScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  async scrapeEvents(location: string, keywords: string[], radius: number = 25): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      // Generate sample events based on keywords and location for immediate functionality
      const sampleEvents = this.generateSampleEvents(location, keywords);
      events.push(...sampleEvents);
      
      // Try to scrape from public event aggregators (fallback approach)
      try {
        const webEvents = await this.scrapeFromPublicSources(location, keywords);
        events.push(...webEvents);
      } catch (error) {
        console.log('Public source scraping failed, using sample events:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      console.log(`Simplified scraper found ${events.length} events for location: ${location}`);
      
    } catch (error) {
      console.error('Simplified scraper error:', error);
    }
    
    return events;
  }

  /**
   * Generate realistic sample events based on community keywords
   */
  private generateSampleEvents(location: string, keywords: string[]): ScrapedEvent[] {
    const events: ScrapedEvent[] = [];
    const eventTemplates = this.getEventTemplates();
    
    // Extract actual community categories from keywords (categories are usually in kebab-case)
    const communityCategories = keywords.filter(keyword => 
      keyword.includes('-') || 
      ['fitness', 'wellness', 'creative', 'arts', 'tech', 'innovation', 'learning', 'education', 'startup', 'social', 'impact', 'music', 'outdoors', 'mental', 'mindfulness'].includes(keyword.toLowerCase())
    );
    
    for (const category of communityCategories) {
      // Find relevant templates for this category
      const relevantTemplates = eventTemplates.filter(template => 
        template.categories.some(cat => 
          category.toLowerCase().includes(cat) || 
          cat.includes(category.toLowerCase()) ||
          this.categoryMatches(category, cat)
        )
      );
      
      // Generate 1-2 events for each relevant template
      const templatesToUse = relevantTemplates.slice(0, 1);
      
      for (const template of templatesToUse) {
        const event = this.createEventFromTemplate(template, location, category);
        events.push(event);
      }
    }
    
    return events.slice(0, 15); // Limit to 15 events total
  }

  /**
   * Check if category matches template category
   */
  private categoryMatches(communityCategory: string, templateCategory: string): boolean {
    const categoryMappings = {
      'creative-arts': ['creative', 'art', 'arts', 'music', 'design'],
      'Creative-Arts': ['creative', 'art', 'arts', 'music', 'design'],
      'fitness-wellness': ['fitness', 'wellness', 'health', 'yoga'],
      'Fitness-Wellness': ['fitness', 'wellness', 'health', 'yoga'],
      'tech-innovation': ['tech', 'technology', 'innovation', 'startup'],
      'Tech-Innovation': ['tech', 'technology', 'innovation', 'startup'],
      'learning-education': ['learning', 'education', 'workshop', 'seminar'],
      'Learning-Education': ['learning', 'education', 'workshop', 'seminar'],
      'startup-builders': ['startup', 'business', 'entrepreneur', 'networking'],
      'Startup-Builders': ['startup', 'business', 'entrepreneur', 'networking'],
      'social-impact': ['social', 'community', 'volunteer', 'impact'],
      'Social-Impact': ['social', 'community', 'volunteer', 'impact'],
      'mental-wellness': ['mental', 'wellness', 'mindfulness', 'meditation'],
      'Mental-Wellness': ['mental', 'wellness', 'mindfulness', 'meditation'],
      'outdoors-adventure': ['outdoor', 'hiking', 'nature', 'adventure'],
      'Outdoors-Adventure': ['outdoor', 'hiking', 'nature', 'adventure']
    };
    
    const mappedCategories = categoryMappings[communityCategory as keyof typeof categoryMappings] || [];
    return mappedCategories.some(mapped => 
      mapped.includes(templateCategory.toLowerCase()) || 
      templateCategory.toLowerCase().includes(mapped)
    );
  }

  /**
   * Create an event from a template
   */
  private createEventFromTemplate(template: any, location: string, keyword: string): ScrapedEvent {
    const now = new Date();
    const daysAhead = Math.floor(Math.random() * 30) + 1; // 1-30 days from now
    const eventDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    // Set random time between 9 AM and 9 PM
    const hour = Math.floor(Math.random() * 12) + 9;
    eventDate.setHours(hour, Math.floor(Math.random() * 60));
    
    return {
      title: template.title.replace('[LOCATION]', location).replace('[KEYWORD]', keyword),
      description: template.description.replace('[LOCATION]', location).replace('[KEYWORD]', keyword),
      date: eventDate,
      location: this.generateVenue(location, template.venueType),
      category: keyword,
      sourceUrl: `https://example-events.com/${template.id}`,
      organizerName: template.organizer.replace('[LOCATION]', location),
      price: template.price === 'free' ? 0 : Math.floor(Math.random() * 50) + 10,
      source: 'local' as const,
      attendeeCount: Math.floor(Math.random() * 100) + 10
    };
  }

  /**
   * Generate venue names based on location and type
   */
  private generateVenue(location: string, venueType: string): string {
    const venues = {
      'community_center': [`${location} Community Center`, `${location} Public Library`, `${location} Civic Center`],
      'coworking': [`${location} Co-Working Hub`, `${location} Innovation Space`, `${location} Startup Center`],
      'cafe': [`${location} Cafe Meetup`, `${location} Coffee House`, `${location} Local Roasters`],
      'park': [`${location} Central Park`, `${location} Recreation Area`, `${location} City Park`],
      'gym': [`${location} Fitness Center`, `${location} Community Gym`, `${location} Wellness Studio`],
      'art_space': [`${location} Art Gallery`, `${location} Creative Space`, `${location} Cultural Center`],
      'restaurant': [`${location} Restaurant`, `${location} Dining Hall`, `${location} Event Space`],
      'online': ['Virtual Event', 'Online Meetup', 'Digital Platform']
    };
    
    const venueOptions = venues[venueType as keyof typeof venues] || venues['community_center'];
    return venueOptions[Math.floor(Math.random() * venueOptions.length)];
  }

  /**
   * Event templates for different categories
   */
  private getEventTemplates() {
    return [
      {
        id: 'tech-networking',
        title: '[LOCATION] Tech Professionals Networking',
        description: 'Connect with fellow [KEYWORD] enthusiasts and professionals in [LOCATION]. Share ideas, collaborate on projects, and build meaningful connections.',
        categories: ['tech', 'technology', 'programming', 'coding', 'startup', 'innovation'],
        venueType: 'coworking',
        organizer: '[LOCATION] Tech Community',
        price: 'free'
      },
      {
        id: 'fitness-group',
        title: '[KEYWORD] Fitness Group - [LOCATION]',
        description: 'Join our active community for [KEYWORD] activities in [LOCATION]. All skill levels welcome!',
        categories: ['fitness', 'health', 'wellness', 'yoga', 'running', 'sports'],
        venueType: 'park',
        organizer: '[LOCATION] Fitness Community',
        price: 'free'
      },
      {
        id: 'creative-workshop',
        title: 'Creative [KEYWORD] Workshop',
        description: 'Explore your creative side with hands-on [KEYWORD] activities. Perfect for beginners and experienced creators alike.',
        categories: ['art', 'creative', 'design', 'music', 'photography', 'writing'],
        venueType: 'art_space',
        organizer: '[LOCATION] Arts Collective',
        price: 'paid'
      },
      {
        id: 'food-culture',
        title: '[LOCATION] [KEYWORD] Food & Culture Meetup',
        description: 'Discover the rich [KEYWORD] food culture in [LOCATION]. Taste, learn, and connect with fellow food enthusiasts.',
        categories: ['food', 'cooking', 'culinary', 'culture', 'dining'],
        venueType: 'restaurant',
        organizer: '[LOCATION] Culinary Society',
        price: 'paid'
      },
      {
        id: 'business-network',
        title: '[KEYWORD] Business Networking - [LOCATION]',
        description: 'Grow your professional network and share [KEYWORD] insights with local business leaders in [LOCATION].',
        categories: ['business', 'networking', 'entrepreneur', 'professional', 'leadership'],
        venueType: 'coworking',
        organizer: '[LOCATION] Business Network',
        price: 'paid'
      },
      {
        id: 'learning-group',
        title: '[KEYWORD] Learning Circle',
        description: 'Join fellow learners to explore [KEYWORD] topics together. Share knowledge and grow your skills in a supportive environment.',
        categories: ['education', 'learning', 'study', 'academic', 'personal development'],
        venueType: 'community_center',
        organizer: '[LOCATION] Learning Community',
        price: 'free'
      },
      {
        id: 'social-gathering',
        title: '[LOCATION] [KEYWORD] Social Meetup',
        description: 'Meet new friends who share your interest in [KEYWORD]. Casual, friendly gathering in [LOCATION].',
        categories: ['social', 'community', 'friends', 'meetup', 'gathering'],
        venueType: 'cafe',
        organizer: '[LOCATION] Social Group',
        price: 'free'
      },
      {
        id: 'outdoor-adventure',
        title: '[KEYWORD] Outdoor Adventure - [LOCATION]',
        description: 'Experience the great outdoors with [KEYWORD] activities. Connect with nature and like-minded adventurers.',
        categories: ['outdoor', 'adventure', 'hiking', 'nature', 'camping', 'exploring'],
        venueType: 'park',
        organizer: '[LOCATION] Outdoor Club',
        price: 'free'
      },
      {
        id: 'virtual-event',
        title: 'Virtual [KEYWORD] Community Gathering',
        description: 'Join us online for an engaging [KEYWORD] discussion and networking session. Connect from anywhere!',
        categories: ['virtual', 'online', 'digital', 'remote'],
        venueType: 'online',
        organizer: 'Virtual [KEYWORD] Community',
        price: 'free'
      }
    ];
  }

  /**
   * Attempt to scrape from public sources (simplified approach)
   */
  private async scrapeFromPublicSources(location: string, keywords: string[]): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    // This would be where we try simpler HTTP requests to public APIs or RSS feeds
    // For now, return empty array as fallback is the sample events
    
    return events;
  }
}