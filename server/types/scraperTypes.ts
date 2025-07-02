export interface ScrapedEvent {
  title: string;
  description: string;
  date: Date;
  location: string;
  category: string;
  sourceUrl: string;
  organizerName?: string | null;
  price?: number | null;
  attendeeCount?: number | null;
  source: 'eventbrite' | 'meetup' | 'ticketmaster' | 'seatgeek' | 'facebook' | 'instagram' | 'local';
  imageUrl?: string;
  tags?: string[];
}

export interface ScraperConfig {
  location: string;
  keywords: string[];
  radius: number;
  maxEvents: number;
}

export interface CommunityMatchCriteria {
  communityId: number;
  keywords: string[];
  category: string;
  locationRadius: number;
  minRelevanceScore: number;
}