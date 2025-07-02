import { ScrapedEvent } from '../types/scraperTypes';

export class FallbackEventScraper {
  // Generate realistic sample events when web scraping fails
  async generateSampleEvents(location: string, keywords: string[], communityCategory?: string): Promise<ScrapedEvent[]> {
    console.log(`Generating sample events for ${location} with keywords: ${keywords.join(', ')}`);
    
    const baseEvents = [
      {
        title: "Tech Innovation Meetup",
        description: "Join local innovators and entrepreneurs for networking and tech talks about the latest in AI, blockchain, and startup culture.",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        location: `${location} Tech Hub`,
        category: "Technology",
        sourceUrl: "https://example.com/events/tech-meetup",
        organizerName: "Tech Community",
        price: 0,
        attendeeCount: 45
      },
      {
        title: "Creative Arts Workshop",
        description: "Hands-on workshop for artists, designers, and creative professionals. Learn new techniques and connect with fellow creatives.",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        location: `${location} Arts Center`,
        category: "Arts & Culture",
        sourceUrl: "https://example.com/events/arts-workshop",
        organizerName: "Creative Collective",
        price: 25,
        attendeeCount: 32
      },
      {
        title: "Wellness & Mindfulness Circle",
        description: "Weekly gathering for meditation, wellness practices, and holistic health discussions in a supportive community environment.",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        location: `${location} Community Center`,
        category: "Health & Wellness",
        sourceUrl: "https://example.com/events/wellness-circle",
        organizerName: "Wellness Warriors",
        price: 15,
        attendeeCount: 28
      },
      {
        title: "Entrepreneurship Networking Night",
        description: "Connect with fellow entrepreneurs, share ideas, and learn from successful business leaders in the local startup ecosystem.",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        location: `${location} Business District`,
        category: "Business & Professional",
        sourceUrl: "https://example.com/events/entrepreneur-night",
        organizerName: "Startup Community",
        price: 20,
        attendeeCount: 67
      },
      {
        title: "Outdoor Adventure Group Hike",
        description: "Join us for a scenic group hike with fellow outdoor enthusiasts. All skill levels welcome for this community adventure.",
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
        location: `${location} Nature Trails`,
        category: "Outdoor & Recreation",
        sourceUrl: "https://example.com/events/group-hike",
        organizerName: "Adventure Seekers",
        price: 0,
        attendeeCount: 23
      }
    ];

    // Filter events based on keywords and community category
    const relevantEvents = baseEvents.filter(event => {
      const eventText = `${event.title} ${event.description} ${event.category}`.toLowerCase();
      const keywordMatch = keywords.some(keyword => eventText.includes(keyword.toLowerCase()));
      const categoryMatch = communityCategory ? eventText.includes(communityCategory.toLowerCase()) : true;
      
      return keywordMatch || categoryMatch;
    });

    // If no relevant events found, return first 2 events as general community events
    return relevantEvents.length > 0 ? relevantEvents.slice(0, 3) : baseEvents.slice(0, 2);
  }
}