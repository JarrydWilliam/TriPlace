import { ScrapedEvent } from '../types/scraperTypes.js';

export class PredictHQScraper {
  async scrapeEvents(location: string, keywords: string[], radius: number = 50): Promise<ScrapedEvent[]> {
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const qParams = new URLSearchParams({
        'place.name': location,
        'active.gte': todayISO,
        'limit': '15',
        'sort': 'start',
        'category': 'community,festivals,expos,conferences,concerts,performing-arts,sports'
      });
      
      if (keywords && keywords.length > 0) {
        qParams.append('q', keywords.join(' OR '));
      }

      const url = `https://api.predicthq.com/v1/events/?${qParams.toString()}`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (process.env.PREDICTHQ_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.PREDICTHQ_API_KEY}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.warn(`PredictHQ API returned ${response.status}: ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      if (!data || !data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((event: any): ScrapedEvent => {
        const phqLabel = event.phq_labels && event.phq_labels.length > 0 ? event.phq_labels[0] : 'default';
        const lat = event.geo?.geometry?.coordinates?.[1];
        const lon = event.geo?.geometry?.coordinates?.[0];
        
        return {
          title: event.title,
          description: event.description ?? `${phqLabel} event in ${location}.`,
          date: new Date(event.start.local || event.start),
          location: event.entities?.[0]?.formatted_address ?? (lat && lon ? `${lat}, ${lon}` : location),
          latitude: lat,
          longitude: lon,
          category: this.mapPHQCategory(phqLabel),
          sourceUrl: `https://predicthq.com/events/${event.id}`,
          sourceName: 'PredictHQ',
          isExternal: true,
          source: 'local'
        };
      });
    } catch (error) {
      console.error('PredictHQScraper: Error fetching from PredictHQ:', error);
      return [];
    }
  }

  private mapPHQCategory(label: string): string {
    const map: Record<string, string> = {
      community: 'Community',
      festivals: 'Entertainment',
      sports: 'Sports',
      concerts: 'Music',
      'performing-arts': 'Entertainment',
      expos: 'Business',
      conferences: 'Business'
    };
    return map[label.toLowerCase()] || 'Community';
  }
}
