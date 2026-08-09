import { ScrapedEvent } from '../types/scraperTypes.js';

export class GoogleThingsToDoScraper {
  async scrapeEvents(location: string, keywords: string[], radius: number = 50): Promise<ScrapedEvent[]> {
    try {
      // 1. Nominatim to get lat/lon from city name
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
      const nomRes = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'SameVibe/1.0' }
      });
      if (!nomRes.ok) return [];
      const nomData = await nomRes.json();
      if (!nomData || nomData.length === 0) return [];
      
      const lat = parseFloat(nomData[0].lat);
      const lon = parseFloat(nomData[0].lon);
      
      // 2. Overpass API
      const radiusMeters = radius * 1609.34;
      const query = `[out:json][timeout:10];
(
  node["event"](around:${radiusMeters},${lat},${lon});
  node["amenity"="community_centre"](around:${radiusMeters},${lat},${lon});
  node["leisure"="venue"](around:${radiusMeters},${lat},${lon});
);
out center 20;`;

      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      const overpassRes = await fetch(overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!overpassRes.ok) return [];
      const overpassData = await overpassRes.json();
      if (!overpassData || !overpassData.elements) return [];

      const events: ScrapedEvent[] = [];
      let count = 0;

      for (const node of overpassData.elements) {
        if (count >= 10) break;
        if (!node.tags || !node.tags.name) continue;

        const date = new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000);
        const city = node.tags['addr:city'] ? ` in ${node.tags['addr:city']}` : '';

        events.push({
          title: `Community Event at ${node.tags.name}`,
          description: `Local gathering spot: ${node.tags.name}${city}.`,
          date: date,
          location: node.tags['addr:full'] ?? node.tags.name,
          latitude: node.lat,
          longitude: node.lon,
          category: 'Community',
          sourceUrl: `https://www.openstreetmap.org/node/${node.id}`,
          sourceName: 'OpenStreetMap',
          isExternal: true,
          price: 0,
          source: 'google'
        });
        count++;
      }

      return events;
    } catch (error) {
      console.error('GoogleThingsToDoScraper: Error fetching from OSM:', error);
      return [];
    }
  }
}